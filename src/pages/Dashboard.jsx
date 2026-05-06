import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, GraduationCap, FileText, AlertCircle,
  AlertTriangle, CheckCircle, TrendingUp, Calendar,
  ChevronRight, Clock
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate, formatMoeda } from '../lib/utils'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalColaboradores: 0,
    colaboradoresAtivos: 0,
    totalProfessores: 0,
    professoresAtivos: 0,
    docsColabPendentes: 0,
    docsProfPendentes: 0,
    contratosVencendo: 0,
    folhaAdmStatus: null,
    folhaDocStatus: null,
    totalFolhaAdm: 0,
    totalFolhaDoc: 0,
    lancamentosRascunhoAdm: 0,
    lancamentosRascunhoDoc: 0,
  })
  const [alertas, setAlertas] = useState([])

  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      try {
        // Colaboradores
        const { data: colabs } = await supabase.from('colaboradores').select('id, ativo')
        const totalColaboradores = colabs?.length || 0
        const colaboradoresAtivos = colabs?.filter(c => c.ativo).length || 0

        // Professores
        const { data: profs } = await supabase.from('professores').select('id, ativo')
        const totalProfessores = profs?.length || 0
        const professoresAtivos = profs?.filter(p => p.ativo).length || 0

        // Docs pendentes colaboradores
        const { count: docsColabPendentes } = await supabase
          .from('documentos_colaborador').select('id', { count: 'exact' }).eq('status', 'pendente')

        // Docs pendentes professores
        const { count: docsProfPendentes } = await supabase
          .from('documentos_professor').select('id', { count: 'exact' }).eq('status', 'pendente')

        // Contratos vencendo em 30 dias
        const limite = new Date()
        limite.setDate(limite.getDate() + 30)
        const { count: contratosVencendo } = await supabase
          .from('contratos_professor')
          .select('id', { count: 'exact' })
          .eq('status', 'ativo')
          .lte('data_fim', limite.toISOString().split('T')[0])

        // Folha administrativa atual
        const { data: folhaAdm } = await supabase
          .from('folhas_mensais')
          .select('*')
          .eq('mes', mesAtual).eq('ano', anoAtual).eq('tipo', 'administrativo')
          .single()

        // Folha docente atual
        const { data: folhaDoc } = await supabase
          .from('folhas_mensais')
          .select('*')
          .eq('mes', mesAtual).eq('ano', anoAtual).eq('tipo', 'docente')
          .single()

        // Totais folha ADM
        let totalFolhaAdm = 0
        let lancamentosRascunhoAdm = 0
        if (folhaAdm) {
          const { data: clt } = await supabase.from('lancamentos_adm_clt').select('salario_bruto, reajuste_pct, dias_trabalhados, ajuda_custo, vale_refeicao, gratificacao, ats, farmacia, adiantamento, plano_saude, status').eq('folha_id', folhaAdm.id)
          const { data: grat } = await supabase.from('lancamentos_gratificacoes').select('valor_bruto, reajuste_pct, ajuda_custo, status').eq('folha_id', folhaAdm.id)
          const { data: coord } = await supabase.from('lancamentos_coordenadores').select('valor, reajuste_pct, plano_saude, status').eq('folha_id', folhaAdm.id)
          const { data: socios } = await supabase.from('lancamentos_socios').select('salario_base, reajuste_pct, dias_trabalhados, ats, gratificacao, sociedade, farmacia, plano_saude, adiantamento, status').eq('folha_id', folhaAdm.id)
          const { data: vale } = await supabase.from('lancamentos_vale_alim').select('valor_lancado, status').eq('folha_id', folhaAdm.id)

          const calcCLT = l => {
            const b = l.salario_bruto * (1 + (l.reajuste_pct || 0) / 100)
            const prop = b * (l.dias_trabalhados || 30) / 30
            return prop + (l.ajuda_custo || 0) + (l.vale_refeicao || 0) + (l.gratificacao || 0) + (l.ats || 0) - (l.farmacia || 0) - (l.adiantamento || 0) - (l.plano_saude || 0)
          }

          totalFolhaAdm = (clt || []).reduce((s, l) => s + calcCLT(l), 0)
            + (grat || []).reduce((s, l) => s + l.valor_bruto * (1 + (l.reajuste_pct || 0) / 100) + (l.ajuda_custo || 0), 0)
            + (coord || []).reduce((s, l) => s + l.valor * (1 + (l.reajuste_pct || 0) / 100) - (l.plano_saude || 0), 0)
            + (socios || []).reduce((s, l) => {
              const b = l.salario_base * (1 + (l.reajuste_pct || 0) / 100)
              return s + b * (l.dias_trabalhados || 30) / 30 + (l.ats || 0) + (l.gratificacao || 0) + (l.sociedade || 0) - (l.farmacia || 0) - (l.plano_saude || 0) - (l.adiantamento || 0)
            }, 0)
            + (vale || []).reduce((s, l) => s + (l.valor_lancado || 0), 0)

          lancamentosRascunhoAdm = [...(clt || []), ...(grat || []), ...(coord || []), ...(socios || []), ...(vale || [])].filter(l => l.status === 'rascunho').length
        }

        // Totais folha Docente
        let totalFolhaDoc = 0
        let lancamentosRascunhoDoc = 0
        if (folhaDoc) {
          const { data: docCLT } = await supabase.from('lancamentos_docente_clt').select('ajuda_custo, valor_hora_teorica, horas_semanais_teoricas, valor_hora_pratica, horas_semanais_praticas, reposicao, plano_saude, farmacia, adiantamento, status').eq('folha_id', folhaDoc.id)
          const { data: docContr } = await supabase.from('lancamentos_docente_contrato').select('preceptoria, coordenacao, valor_hora_teorica, horas_semanais_teoricas, valor_hora_pratica, horas_semanais_praticas, status').eq('folha_id', folhaDoc.id)

          totalFolhaDoc = (docCLT || []).reduce((s, l) => s + (l.ajuda_custo || 0) + (l.horas_semanais_teoricas || 0) * 4.5 * (l.valor_hora_teorica || 0) + (l.horas_semanais_praticas || 0) * 4.5 * (l.valor_hora_pratica || 0) + (l.reposicao || 0) - (l.plano_saude || 0) - (l.farmacia || 0) - (l.adiantamento || 0), 0)
            + (docContr || []).reduce((s, l) => s + (l.preceptoria || 0) + (l.coordenacao || 0) + (l.horas_semanais_teoricas || 0) * 4.5 * (l.valor_hora_teorica || 0) + (l.horas_semanais_praticas || 0) * 4.5 * (l.valor_hora_pratica || 0), 0)

          lancamentosRascunhoDoc = [...(docCLT || []), ...(docContr || [])].filter(l => l.status === 'rascunho').length
        }

        // Montar alertas
        const novosAlertas = []
        if ((docsColabPendentes || 0) > 0) novosAlertas.push({ tipo: 'amber', icon: 'doc', msg: `${docsColabPendentes} documento(s) pendente(s) de colaboradores`, link: '/colaboradores' })
        if ((docsProfPendentes || 0) > 0) novosAlertas.push({ tipo: 'amber', icon: 'doc', msg: `${docsProfPendentes} documento(s) pendente(s) de professores`, link: '/professores' })
        if ((contratosVencendo || 0) > 0) novosAlertas.push({ tipo: 'red', icon: 'contrato', msg: `${contratosVencendo} contrato(s) docente(s) vencendo nos próximos 30 dias`, link: '/professores' })
        if (lancamentosRascunhoAdm > 0) novosAlertas.push({ tipo: 'amber', icon: 'folha', msg: `${lancamentosRascunhoAdm} lançamento(s) em rascunho na Folha Administrativa`, link: '/folha-administrativo' })
        if (lancamentosRascunhoDoc > 0) novosAlertas.push({ tipo: 'amber', icon: 'folha', msg: `${lancamentosRascunhoDoc} lançamento(s) em rascunho na Folha Docente`, link: '/folha-docente' })
        if (folhaAdm?.status === 'fechada') novosAlertas.push({ tipo: 'green', icon: 'ok', msg: `Folha Administrativa de ${MESES[mesAtual - 1]} fechada`, link: '/folha-administrativo' })
        if (folhaDoc?.status === 'fechada') novosAlertas.push({ tipo: 'green', icon: 'ok', msg: `Folha Docente de ${MESES[mesAtual - 1]} fechada`, link: '/folha-docente' })

        setAlertas(novosAlertas)
        setStats({
          totalColaboradores, colaboradoresAtivos,
          totalProfessores, professoresAtivos,
          docsColabPendentes: docsColabPendentes || 0,
          docsProfPendentes: docsProfPendentes || 0,
          contratosVencendo: contratosVencendo || 0,
          folhaAdmStatus: folhaAdm?.status || null,
          folhaDocStatus: folhaDoc?.status || null,
          totalFolhaAdm, totalFolhaDoc,
          lancamentosRascunhoAdm, lancamentosRascunhoDoc,
        })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  const totalFolha = stats.totalFolhaAdm + stats.totalFolhaDoc
  const mesLabel = `${MESES[mesAtual - 1]}/${anoAtual}`

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--gray-900)' }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
          Visão geral — competência {mesLabel}
        </p>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {alertas.map((a, i) => (
            <div
              key={i}
              className={`alert alert-${a.tipo}`}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(a.link)}
            >
              {a.tipo === 'green' ? <CheckCircle size={15} /> : a.tipo === 'red' ? <AlertTriangle size={15} /> : <AlertCircle size={15} />}
              <span style={{ flex: 1 }}>{a.msg}</span>
              <ChevronRight size={14} style={{ opacity: .5 }} />
            </div>
          ))}
        </div>
      )}

      {/* Cards folha */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Folha Administrativa</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{formatMoeda(stats.totalFolhaAdm)}</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FolhaStatusBadge status={stats.folhaAdmStatus} />
            {stats.lancamentosRascunhoAdm > 0 && <span style={{ fontSize: 11, color: 'var(--amber)' }}>{stats.lancamentosRascunhoAdm} rascunho(s)</span>}
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Folha Docente</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{formatMoeda(stats.totalFolhaDoc)}</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FolhaStatusBadge status={stats.folhaDocStatus} />
            {stats.lancamentosRascunhoDoc > 0 && <span style={{ fontSize: 11, color: 'var(--amber)' }}>{stats.lancamentosRascunhoDoc} rascunho(s)</span>}
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', background: 'var(--blue)', border: 'none' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Total Geral</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white', fontFamily: 'var(--mono)' }}>{formatMoeda(totalFolha)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 6 }}>{mesLabel}</div>
        </div>
      </div>

      {/* Grid principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Colaboradores */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={15} color="var(--blue)" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Colaboradores</span>
            </div>
            <button className="btn btn-sm" onClick={() => navigate('/colaboradores')}>Ver todos</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
            <StatCell label="Total" valor={stats.totalColaboradores} cor="var(--blue)" />
            <StatCell label="Ativos" valor={stats.colaboradoresAtivos} cor="var(--green)" />
            <StatCell label="Docs pendentes" valor={stats.docsColabPendentes} cor={stats.docsColabPendentes > 0 ? 'var(--amber)' : 'var(--gray-400)'} />
          </div>
        </div>

        {/* Professores */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={15} color="var(--blue)" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Professores</span>
            </div>
            <button className="btn btn-sm" onClick={() => navigate('/professores')}>Ver todos</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
            <StatCell label="Total" valor={stats.totalProfessores} cor="var(--blue)" />
            <StatCell label="Ativos" valor={stats.professoresAtivos} cor="var(--green)" />
            <StatCell label="Contratos vencendo" valor={stats.contratosVencendo} cor={stats.contratosVencendo > 0 ? 'var(--red)' : 'var(--gray-400)'} />
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Ações rápidas</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0 }}>
          {[
            { icon: Users, label: 'Novo colaborador', link: '/colaboradores/novo', cor: 'var(--blue)' },
            { icon: GraduationCap, label: 'Novo professor', link: '/professores/novo', cor: 'var(--purple)' },
            { icon: FileText, label: 'Folha Administrativa', link: '/folha-administrativo', cor: 'var(--blue)' },
            { icon: FileText, label: 'Folha Docente', link: '/folha-docente', cor: 'var(--blue)' },
          ].map((a, i) => (
            <div
              key={i}
              onClick={() => navigate(a.link)}
              style={{
                padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 10, borderRight: i < 3 ? '1px solid var(--gray-100)' : 'none',
                transition: 'background .1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <a.icon size={15} color={a.cor} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--gray-700)', fontWeight: 500 }}>{a.label}</span>
              <ChevronRight size={13} style={{ marginLeft: 'auto', color: 'var(--gray-300)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCell({ label, valor, cor }) {
  return (
    <div style={{ padding: '14px 16px', borderRight: '1px solid var(--gray-100)' }}>
      <div style={{ fontSize: 10, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: cor }}>{valor}</div>
    </div>
  )
}

function FolhaStatusBadge({ status }) {
  if (!status) return <span className="badge badge-gray">Não iniciada</span>
  const map = { aberta: 'badge-blue', em_conferencia: 'badge-amber', fechada: 'badge-green', enviada_financeiro: 'badge-purple' }
  const label = { aberta: 'Aberta', em_conferencia: 'Em conferência', fechada: 'Fechada', enviada_financeiro: 'Enviada ao Financeiro' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{label[status] || status}</span>
}
