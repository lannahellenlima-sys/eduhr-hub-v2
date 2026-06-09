import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap, BookOpen, DollarSign, AlertTriangle,
  TrendingUp, Users, Clock, ChevronRight, BarChart3
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtH = (v) => `${(v || 0).toFixed(1)}h`

export default function DashboardAcademico() {
  const navigate = useNavigate()
  const [semestre, setSemestre] = useState('2025.1')
  const [semestreAnterior, setSemestreAnterior] = useState('2024.2')
  const [stats, setStats] = useState(null)
  const [alertas, setAlertas] = useState([])
  const [porCurso, setPorCurso] = useState([])
  const [loading, setLoading] = useState(true)
  const SEMESTRES = ['2024.1','2024.2','2025.1','2025.2','2026.1','2026.2']

  useEffect(() => { loadDashboard() }, [semestre])

  async function loadDashboard() {
    setLoading(true)
    try {
      // Dados do semestre atual
      const { data: dist } = await supabase.from('distribuicao_semestral').select('*').eq('semestre', semestre).eq('status', 'ativo')
      const { data: ativ } = await supabase.from('atividades_complementares').select('*').eq('semestre', semestre).eq('status', 'ativo')
      const { data: profs } = await supabase.from('professores').select('id, nome, titulacao, curso_principal').eq('ativo', true)
      const { data: distAnterior } = await supabase.from('distribuicao_semestral').select('*').eq('semestre', semestreAnterior).eq('status', 'ativo')

      const d = dist || []
      const a = ativ || []
      const p = profs || []
      const da = distAnterior || []

      // Professores com disciplinas
      const profsComDisc = new Set(d.map(x => x.professor_nome))
      const profsSemDisc = p.filter(x => !profsComDisc.has(x.nome))

      // Disciplinas sem professor
      const { data: todasDisc } = await supabase
        .from('disciplinas_matriz')
        .select('*, matrizes_curriculares(curso)')
        .eq('ativo', true)

      // CH e financeiro total
      const chMensalTotal = d.reduce((s, x) => s + (x.ch_mensal || 0), 0)
      const chSemanalTotal = d.reduce((s, x) => s + (x.ch_semanal || 0), 0)
      const custoMensalDisc = d.reduce((s, x) => s + (x.valor_mensal || 0), 0)
      const custoMensalAtiv = a.reduce((s, x) => s + (x.valor_mensal || 0), 0)
      const custoMensal = custoMensalDisc + custoMensalAtiv
      const custoSemestral = d.reduce((s, x) => s + (x.valor_semestral || 0), 0) + a.reduce((s, x) => s + (x.valor_semestral || 0), 0)

      // Comparativo com semestre anterior
      const custoAnterior = da.reduce((s, x) => s + (x.valor_mensal || 0), 0)
      const variacaoCusto = custoAnterior > 0 ? ((custoMensalDisc - custoAnterior) / custoAnterior * 100) : 0

      // Sobrecarga (>20h/sem)
      const profCH = d.reduce((acc, x) => {
        if (!acc[x.professor_nome]) acc[x.professor_nome] = { nome: x.professor_nome, ch: 0 }
        acc[x.professor_nome].ch += (x.ch_semanal || 0)
        return acc
      }, {})
      const sobrecarga = Object.values(profCH).filter(x => x.ch > 20)

      // Por curso
      const cursoMap = d.reduce((acc, x) => {
        if (!acc[x.curso]) acc[x.curso] = { curso: x.curso, profs: new Set(), disciplinas: 0, chMensal: 0, custoMensal: 0 }
        acc[x.curso].profs.add(x.professor_nome)
        acc[x.curso].disciplinas++
        acc[x.curso].chMensal += (x.ch_mensal || 0)
        acc[x.curso].custoMensal += (x.valor_mensal || 0)
        return acc
      }, {})
      const cursos = Object.values(cursoMap).map(c => ({ ...c, profs: c.profs.size })).sort((a, b) => b.custoMensal - a.custoMensal)

      // Alertas
      const novosAlertas = []
      if (profsSemDisc.length > 0) novosAlertas.push({ tipo: 'amber', msg: `${profsSemDisc.length} professor(es) sem disciplinas atribuídas`, link: '/academico/distribuicao' })
      if (sobrecarga.length > 0) novosAlertas.push({ tipo: 'red', msg: `${sobrecarga.length} professor(es) com sobrecarga (>20h/sem): ${sobrecarga.map(x => x.nome.split(' ')[0]).join(', ')}`, link: '/academico/distribuicao' })
      if (variacaoCusto > 10) novosAlertas.push({ tipo: 'amber', msg: `Custo docente aumentou ${variacaoCusto.toFixed(1)}% em relação a ${semestreAnterior}`, link: '/academico/projecao' })

      setStats({ profsAtivos: p.length, profsComDisc: profsComDisc.size, profsSemDisc: profsSemDisc.length, chMensalTotal, chSemanalTotal, custoMensal, custoSemestral, variacaoCusto, totalDisciplinas: d.length, sobrecarga: sobrecarga.length })
      setAlertas(novosAlertas)
      setPorCurso(cursos)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Dashboard Acadêmico</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>Indicadores executivos de carga horária e custo docente</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="form-select" style={{ width: 'auto' }} value={semestre} onChange={e => setSemestre(e.target.value)}>
            {SEMESTRES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {alertas.map((a, i) => (
            <div key={i} className={`alert alert-${a.tipo}`} style={{ cursor: 'pointer' }} onClick={() => navigate(a.link)}>
              <AlertTriangle size={15} />
              <span style={{ flex: 1 }}>{a.msg}</span>
              <ChevronRight size={14} style={{ opacity: .5 }} />
            </div>
          ))}
        </div>
      )}

      {/* Cards principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Docentes ativos', valor: stats?.profsAtivos, sub: `${stats?.profsComDisc} com disciplinas`, cor: 'var(--blue)', icon: GraduationCap },
          { label: 'Disciplinas distribuídas', valor: stats?.totalDisciplinas, sub: `Semestre ${semestre}`, cor: 'var(--blue)', icon: BookOpen },
          { label: 'CH semanal total', valor: fmtH(stats?.chSemanalTotal), sub: `${fmtH(stats?.chMensalTotal)}/mês`, cor: 'var(--green)', icon: Clock },
          { label: 'Custo mensal projetado', valor: fmt(stats?.custoMensal), sub: stats?.variacaoCusto !== 0 ? `${stats?.variacaoCusto > 0 ? '+' : ''}${stats?.variacaoCusto?.toFixed(1)}% vs ${semestreAnterior}` : 'vs semestre anterior', cor: 'var(--blue)', icon: DollarSign },
          { label: 'Custo semestral projetado', valor: fmt(stats?.custoSemestral), sub: 'Disciplinas + atividades', cor: 'var(--purple)', icon: TrendingUp },
          { label: 'Sobrecarga docente', valor: stats?.sobrecarga, sub: stats?.sobrecarga > 0 ? 'Professores >20h/sem' : 'Nenhuma sobrecarga', cor: stats?.sobrecarga > 0 ? 'var(--red)' : 'var(--green)', icon: AlertTriangle },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{c.label}</span>
              <c.icon size={14} color={c.cor} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.cor }}>{c.valor}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Por curso */}
      {porCurso.length > 0 && (
        <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={14} color="var(--blue)" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Impacto financeiro por curso</span>
          </div>
          <table className="table">
            <thead><tr>
              <th>Curso</th><th>Professores</th><th>Disciplinas</th><th>CH Mensal</th><th>Custo Mensal</th>
              <th>% do total</th>
            </tr></thead>
            <tbody>
              {porCurso.map(c => (
                <tr key={c.curso}>
                  <td style={{ fontWeight: 500 }}>{c.curso}</td>
                  <td>{c.profs}</td>
                  <td>{c.disciplinas}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmtH(c.chMensal)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{fmt(c.custoMensal)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--gray-100)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${stats?.custoMensal > 0 ? (c.custoMensal / stats.custoMensal * 100) : 0}%`, height: '100%', background: 'var(--blue)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--gray-500)', width: 36 }}>
                        {stats?.custoMensal > 0 ? (c.custoMensal / stats.custoMensal * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Módulos acadêmicos</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))' }}>
          {[
            { icon: BookOpen, label: 'Matrizes curriculares', desc: 'Cadastrar e versionar matrizes', link: '/academico/matrizes' },
            { icon: GraduationCap, label: 'Distribuição de CH', desc: 'Atribuir disciplinas por semestre', link: '/academico/distribuicao' },
            { icon: DollarSign, label: 'Projeção financeira', desc: 'Custo e remuneração docente', link: '/academico/projecao' },
            { icon: BarChart3, label: 'Relatórios acadêmicos', desc: 'CH, comparativos e impacto', link: '/academico/relatorios' },
          ].map((a, i) => (
            <div key={i} onClick={() => navigate(a.link)} style={{
              padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
              borderRight: i < 3 ? '1px solid var(--gray-100)' : 'none', transition: 'background .1s'
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <a.icon size={16} color="var(--blue)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{a.desc}</div>
              </div>
              <ChevronRight size={13} style={{ marginLeft: 'auto', color: 'var(--gray-300)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
