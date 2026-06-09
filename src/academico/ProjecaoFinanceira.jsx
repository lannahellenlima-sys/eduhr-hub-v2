import { useState, useEffect, useCallback } from 'react'
import { Download, TrendingUp, DollarSign, BarChart3, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const SEMESTRES = ['2024.1','2024.2','2025.1','2025.2','2026.1','2026.2']
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const RELATORIOS = [
  { id: 'por_professor', titulo: 'CH por professor', desc: 'Carga horária e remuneração individual' },
  { id: 'por_curso', titulo: 'CH por curso', desc: 'Impacto financeiro por curso' },
  { id: 'comparativo', titulo: 'Comparativo entre semestres', desc: 'Variação de CH e custo' },
  { id: 'sem_professor', titulo: 'Disciplinas sem professor', desc: 'Disciplinas da matriz não atribuídas' },
  { id: 'prof_sem_disc', titulo: 'Professores sem disciplinas', desc: 'Professores ativos sem atribuição' },
  { id: 'sobrecarga', titulo: 'Relatório de sobrecarga', desc: 'Professores acima de 20h/sem' },
  { id: 'financeiro', titulo: 'Relatório RH/Contabilidade', desc: 'Remuneração para envio ao RH e financeiro' },
]

export default function ProjecaoFinanceira() {
  const [relatorio, setRelatorio] = useState('por_professor')
  const [semestre, setSemestre] = useState('2025.1')
  const [semestreComp, setSemestreComp] = useState('2024.2')
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchRelatorio = useCallback(async () => {
    setLoading(true)
    try {
      if (relatorio === 'por_professor') {
        const { data: dist } = await supabase.from('distribuicao_semestral').select('*').eq('semestre', semestre).eq('status', 'ativo').order('professor_nome')
        const { data: atv } = await supabase.from('atividades_complementares').select('*').eq('semestre', semestre).eq('status', 'ativo')
        const mapa = {}
        ;(dist || []).forEach(d => {
          if (!mapa[d.professor_nome]) mapa[d.professor_nome] = { nome: d.professor_nome, titulacao: d.professor_titulacao, valorHora: d.professor_valor_hora, disciplinas: 0, chSemanal: 0, chMensal: 0, valorMensalDisc: 0, valorSemestralDisc: 0, valorAtiv: 0 }
          mapa[d.professor_nome].disciplinas++
          mapa[d.professor_nome].chSemanal += (d.ch_semanal || 0)
          mapa[d.professor_nome].chMensal += (d.ch_mensal || 0)
          mapa[d.professor_nome].valorMensalDisc += (d.valor_mensal || 0)
          mapa[d.professor_nome].valorSemestralDisc += (d.valor_semestral || 0)
        })
        ;(atv || []).forEach(a => {
          if (!mapa[a.professor_nome]) mapa[a.professor_nome] = { nome: a.professor_nome, titulacao: '', valorHora: 0, disciplinas: 0, chSemanal: 0, chMensal: 0, valorMensalDisc: 0, valorSemestralDisc: 0, valorAtiv: 0 }
          mapa[a.professor_nome].valorAtiv += (a.valor_mensal || 0)
        })
        setDados(Object.values(mapa).sort((a, b) => a.nome.localeCompare(b.nome)))

      } else if (relatorio === 'por_curso') {
        const { data } = await supabase.from('distribuicao_semestral').select('*').eq('semestre', semestre).eq('status', 'ativo').order('curso')
        const mapa = {}
        ;(data || []).forEach(d => {
          if (!mapa[d.curso]) mapa[d.curso] = { curso: d.curso, professores: new Set(), disciplinas: 0, chMensal: 0, valorMensal: 0, valorSemestral: 0 }
          mapa[d.curso].professores.add(d.professor_nome)
          mapa[d.curso].disciplinas++
          mapa[d.curso].chMensal += (d.ch_mensal || 0)
          mapa[d.curso].valorMensal += (d.valor_mensal || 0)
          mapa[d.curso].valorSemestral += (d.valor_semestral || 0)
        })
        const totalMensal = Object.values(mapa).reduce((s, c) => s + c.valorMensal, 0)
        setDados(Object.values(mapa).map(c => ({ ...c, professores: c.professores.size, pct: totalMensal > 0 ? (c.valorMensal / totalMensal * 100) : 0 })).sort((a, b) => b.valorMensal - a.valorMensal))

      } else if (relatorio === 'comparativo') {
        const { data: atual } = await supabase.from('distribuicao_semestral').select('*').eq('semestre', semestre).eq('status', 'ativo')
        const { data: anterior } = await supabase.from('distribuicao_semestral').select('*').eq('semestre', semestreComp).eq('status', 'ativo')
        const mapaAtual = {}
        ;(atual || []).forEach(d => {
          if (!mapaAtual[d.professor_nome]) mapaAtual[d.professor_nome] = { chMensal: 0, valor: 0 }
          mapaAtual[d.professor_nome].chMensal += (d.ch_mensal || 0)
          mapaAtual[d.professor_nome].valor += (d.valor_mensal || 0)
        })
        const mapaAnterior = {}
        ;(anterior || []).forEach(d => {
          if (!mapaAnterior[d.professor_nome]) mapaAnterior[d.professor_nome] = { chMensal: 0, valor: 0 }
          mapaAnterior[d.professor_nome].chMensal += (d.ch_mensal || 0)
          mapaAnterior[d.professor_nome].valor += (d.valor_mensal || 0)
        })
        const todos = new Set([...Object.keys(mapaAtual), ...Object.keys(mapaAnterior)])
        const comp = [...todos].map(nome => {
          const a = mapaAtual[nome] || { chMensal: 0, valor: 0 }
          const b = mapaAnterior[nome] || { chMensal: 0, valor: 0 }
          return { nome, chAtual: a.chMensal, chAnterior: b.chMensal, varCH: a.chMensal - b.chMensal, valorAtual: a.valor, valorAnterior: b.valor, varValor: a.valor - b.valor }
        }).sort((a, b) => Math.abs(b.varValor) - Math.abs(a.varValor))
        setDados(comp)

      } else if (relatorio === 'sobrecarga') {
        const { data } = await supabase.from('distribuicao_semestral').select('*').eq('semestre', semestre).eq('status', 'ativo')
        const mapa = {}
        ;(data || []).forEach(d => {
          if (!mapa[d.professor_nome]) mapa[d.professor_nome] = { nome: d.professor_nome, titulacao: d.professor_titulacao, chSemanal: 0, disciplinas: 0 }
          mapa[d.professor_nome].chSemanal += (d.ch_semanal || 0)
          mapa[d.professor_nome].disciplinas++
        })
        setDados(Object.values(mapa).filter(p => p.chSemanal > 20).sort((a, b) => b.chSemanal - a.chSemanal))

      } else if (relatorio === 'financeiro') {
        const { data: dist } = await supabase.from('distribuicao_semestral').select('*').eq('semestre', semestre).eq('status', 'ativo').order('professor_nome')
        const { data: atv } = await supabase.from('atividades_complementares').select('*').eq('semestre', semestre).eq('status', 'ativo')
        const mapa = {}
        ;(dist || []).forEach(d => {
          if (!mapa[d.professor_nome]) mapa[d.professor_nome] = { nome: d.professor_nome, titulacao: d.professor_titulacao, valorHora: d.professor_valor_hora, chMensal: 0, valorDisc: 0, valorAtiv: 0 }
          mapa[d.professor_nome].chMensal += (d.ch_mensal || 0)
          mapa[d.professor_nome].valorDisc += (d.valor_mensal || 0)
        })
        ;(atv || []).forEach(a => {
          if (mapa[a.professor_nome]) mapa[a.professor_nome].valorAtiv += (a.valor_mensal || 0)
        })
        setDados(Object.values(mapa).map(p => ({ ...p, totalMensal: p.valorDisc + p.valorAtiv })).sort((a, b) => a.nome.localeCompare(b.nome)))

      } else if (relatorio === 'prof_sem_disc') {
        const { data: profs } = await supabase.from('professores').select('id, nome, titulacao, curso_principal').eq('ativo', true)
        const { data: dist } = await supabase.from('distribuicao_semestral').select('professor_nome').eq('semestre', semestre).eq('status', 'ativo')
        const comDisc = new Set((dist || []).map(d => d.professor_nome))
        setDados((profs || []).filter(p => !comDisc.has(p.nome)))
      } else {
        setDados([])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [relatorio, semestre, semestreComp])

  useEffect(() => { fetchRelatorio() }, [fetchRelatorio])

  function exportarCSV() {
    if (!dados.length) return
    const headers = Object.keys(dados[0]).filter(k => k !== 'professores' || typeof dados[0][k] !== 'object').join(';')
    const rows = dados.map(r => Object.entries(r).map(([k, v]) => typeof v === 'number' ? v.toFixed(2) : v).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${relatorio}_${semestre}.csv`; a.click()
    toast.success('Exportado!')
  }

  const rel = RELATORIOS.find(r => r.id === relatorio)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Relatórios Acadêmicos</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>Projeção financeira e análises de carga horária</p>
        </div>
        <button className="btn" onClick={exportarCSV}><Download size={13} /> Exportar CSV</button>
      </div>

      {/* Seleção de relatório */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 8, marginBottom: 16 }}>
        {RELATORIOS.map(r => (
          <div key={r.id} onClick={() => setRelatorio(r.id)} style={{
            padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${relatorio === r.id ? 'var(--blue)' : 'var(--gray-200)'}`,
            background: relatorio === r.id ? 'var(--blue-light)' : 'white',
            transition: 'all .15s'
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: relatorio === r.id ? 'var(--blue)' : 'var(--gray-900)' }}>{r.titulo}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 'auto' }} value={semestre} onChange={e => setSemestre(e.target.value)}>
          {SEMESTRES.map(s => <option key={s}>{s}</option>)}
        </select>
        {relatorio === 'comparativo' && (
          <>
            <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>vs</span>
            <select className="form-select" style={{ width: 'auto' }} value={semestreComp} onChange={e => setSemestreComp(e.target.value)}>
              {SEMESTRES.map(s => <option key={s}>{s}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Resultado */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{rel?.titulo} — {semestre}</span>
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{dados.length} registro(s)</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : dados.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}><p>Nenhum dado encontrado para este relatório.</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  {relatorio === 'por_professor' && <><th>Professor</th><th>Titulação</th><th>Disciplinas</th><th>CH Semanal</th><th>CH Mensal</th><th>H/h</th><th>Valor disc./mês</th><th>Valor ativid./mês</th><th>Total/mês</th></>}
                  {relatorio === 'por_curso' && <><th>Curso</th><th>Professores</th><th>Disciplinas</th><th>CH Mensal</th><th>Custo Mensal</th><th>Custo Semestral</th><th>% do total</th></>}
                  {relatorio === 'comparativo' && <><th>Professor</th><th>CH {semestreComp}</th><th>CH {semestre}</th><th>Variação CH</th><th>Valor {semestreComp}</th><th>Valor {semestre}</th><th>Variação R$</th></>}
                  {relatorio === 'sobrecarga' && <><th>Professor</th><th>Titulação</th><th>CH Semanal</th><th>Disciplinas</th><th>Excesso</th></>}
                  {relatorio === 'financeiro' && <><th>Professor</th><th>Titulação</th><th>H/h</th><th>CH Mensal</th><th>Valor disciplinas</th><th>Valor atividades</th><th>Total mensal</th></>}
                  {relatorio === 'prof_sem_disc' && <><th>Professor</th><th>Titulação</th><th>Curso principal</th></>}
                </tr>
              </thead>
              <tbody>
                {dados.map((row, i) => (
                  <tr key={i}>
                    {relatorio === 'por_professor' && <>
                      <td style={{ fontWeight: 500 }}>{row.nome}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{row.titulacao}</span></td>
                      <td>{row.disciplinas}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{row.chSemanal.toFixed(2)}h</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{row.chMensal.toFixed(2)}h</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(row.valorHora)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(row.valorMensalDisc)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(row.valorAtiv)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green)' }}>{fmt(row.valorMensalDisc + row.valorAtiv)}</td>
                    </>}
                    {relatorio === 'por_curso' && <>
                      <td style={{ fontWeight: 500 }}>{row.curso}</td>
                      <td>{row.professores}</td>
                      <td>{row.disciplinas}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{row.chMensal.toFixed(2)}h</td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmt(row.valorMensal)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(row.valorSemestral)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 80, height: 6, background: 'var(--gray-100)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${row.pct}%`, height: '100%', background: 'var(--blue)', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11 }}>{row.pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </>}
                    {relatorio === 'comparativo' && <>
                      <td style={{ fontWeight: 500 }}>{row.nome}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{row.chAnterior.toFixed(2)}h</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{row.chAtual.toFixed(2)}h</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: row.varCH > 0 ? 'var(--green)' : row.varCH < 0 ? 'var(--red)' : 'var(--gray-500)', fontWeight: 600 }}>
                        {row.varCH > 0 ? '+' : ''}{row.varCH.toFixed(2)}h
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(row.valorAnterior)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(row.valorAtual)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: row.varValor > 0 ? 'var(--green)' : row.varValor < 0 ? 'var(--red)' : 'var(--gray-500)' }}>
                        {row.varValor > 0 ? '+' : ''}{fmt(row.varValor)}
                      </td>
                    </>}
                    {relatorio === 'sobrecarga' && <>
                      <td style={{ fontWeight: 500 }}>{row.nome}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{row.titulacao}</span></td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--red)' }}>{row.chSemanal.toFixed(2)}h/sem</td>
                      <td>{row.disciplinas}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)' }}>+{(row.chSemanal - 20).toFixed(2)}h acima do limite</td>
                    </>}
                    {relatorio === 'financeiro' && <>
                      <td style={{ fontWeight: 500 }}>{row.nome}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{row.titulacao}</span></td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(row.valorHora)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{row.chMensal.toFixed(2)}h</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(row.valorDisc)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(row.valorAtiv)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green)' }}>{fmt(row.totalMensal)}</td>
                    </>}
                    {relatorio === 'prof_sem_disc' && <>
                      <td style={{ fontWeight: 500 }}>{row.nome}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{row.titulacao}</span></td>
                      <td style={{ fontSize: 12 }}>{row.curso_principal || '—'}</td>
                    </>}
                  </tr>
                ))}
              </tbody>
              {/* Totais */}
              {(relatorio === 'por_professor' || relatorio === 'financeiro') && (
                <tfoot>
                  <tr style={{ background: 'var(--blue-light)' }}>
                    <td colSpan={relatorio === 'por_professor' ? 8 : 6} style={{ padding: '8px 14px', fontWeight: 700, color: 'var(--blue)' }}>TOTAL GERAL</td>
                    <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>
                      {fmt(dados.reduce((s, r) => s + (relatorio === 'por_professor' ? (r.valorMensalDisc + r.valorAtiv) : r.totalMensal), 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
