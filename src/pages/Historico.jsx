import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Download, Clock, User, FileText, Users, GraduationCap, Calendar, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'

const MODULO_CONFIG = {
  folha: { label: 'Folha', icon: FileText, cor: 'var(--blue)', badge: 'badge-blue' },
  colaborador: { label: 'Colaborador', icon: Users, cor: 'var(--green)', badge: 'badge-green' },
  professor: { label: 'Professor', icon: GraduationCap, cor: 'var(--purple)', badge: 'badge-purple' },
  ferias: { label: 'Férias', icon: Calendar, cor: 'var(--amber)', badge: 'badge-amber' },
  documentos: { label: 'Documentos', icon: FileText, cor: 'var(--red)', badge: 'badge-red' },
}

const ACAO_CONFIG = {
  fechar_folha: { label: 'Fechamento', badge: 'badge-green' },
  reabrir_folha: { label: 'Reabertura', badge: 'badge-amber' },
  enviar_financeiro: { label: 'Envio ao Financeiro', badge: 'badge-purple' },
  alterar_salario: { label: 'Alteração salarial', badge: 'badge-blue' },
  cadastrar_colaborador: { label: 'Novo colaborador', badge: 'badge-green' },
  cadastrar_professor: { label: 'Novo professor', badge: 'badge-green' },
  programar_ferias: { label: 'Férias programadas', badge: 'badge-blue' },
  doc_pendente_notificado: { label: 'Notificação enviada', badge: 'badge-amber' },
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function Historico() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroModulo, setFiltroModulo] = useState('todos')
  const [filtroAcao, setFiltroAcao] = useState('todas')
  const [pagina, setPagina] = useState(0)
  const POR_PAGINA = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)

    if (filtroModulo !== 'todos') q = q.eq('modulo', filtroModulo)
    if (filtroAcao !== 'todas') q = q.eq('acao', filtroAcao)
    if (busca) q = q.ilike('descricao', `%${busca}%`)

    const { data } = await q
    setLogs(data || [])
    setLoading(false)
  }, [filtroModulo, filtroAcao, busca, pagina])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Stats rápidos
  const [stats, setStats] = useState({ total: 0, hoje: 0, semana: 0 })
  useEffect(() => {
    async function loadStats() {
      const { count: total } = await supabase.from('audit_log').select('id', { count: 'exact' })
      const hoje = new Date().toISOString().split('T')[0]
      const { count: countHoje } = await supabase.from('audit_log').select('id', { count: 'exact' }).gte('created_at', hoje)
      const semana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { count: countSemana } = await supabase.from('audit_log').select('id', { count: 'exact' }).gte('created_at', semana)
      setStats({ total: total || 0, hoje: countHoje || 0, semana: countSemana || 0 })
    }
    loadStats()
  }, [])

  function exportCSV() {
    if (!logs.length) return
    const headers = 'Data/Hora;Módulo;Ação;Descrição;Referência;Usuário'
    const rows = logs.map(l =>
      `${formatDateTime(l.created_at)};${l.modulo};${l.acao};${l.descricao};${l.referencia_nome || ''};${l.usuario_email || ''}`
    ).join('\n')
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'historico_auditoria.csv'; a.click()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Histórico de Auditoria</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            Registro de todas as ações realizadas na plataforma
          </p>
        </div>
        <button className="btn" onClick={exportCSV}>
          <Download size={13} /> Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Total registros</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)' }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Hoje</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{stats.hoje}</div>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Últimos 7 dias</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-700)' }}>{stats.semana}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Buscar por descrição ou referência..."
            value={busca}
            onChange={e => { setBusca(e.target.value); setPagina(0) }}
          />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={filtroModulo} onChange={e => { setFiltroModulo(e.target.value); setPagina(0) }}>
          <option value="todos">Todos os módulos</option>
          {Object.entries(MODULO_CONFIG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filtroAcao} onChange={e => { setFiltroAcao(e.target.value); setPagina(0) }}>
          <option value="todas">Todas as ações</option>
          {Object.entries(ACAO_CONFIG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </div>

      {/* Timeline / Tabela */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <Shield size={32} strokeWidth={1} />
            <p>Nenhum registro encontrado.</p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Módulo</th>
                  <th>Ação</th>
                  <th>Descrição</th>
                  <th>Usuário</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const modulo = MODULO_CONFIG[log.modulo]
                  const acao = ACAO_CONFIG[log.acao]
                  const ModuloIcon = modulo?.icon || FileText
                  return (
                    <tr key={log.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={12} color="var(--gray-400)" />
                          <span style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
                            {formatDateTime(log.created_at)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ModuloIcon size={13} color={modulo?.cor || 'var(--gray-500)'} />
                          <span className={`badge ${modulo?.badge || 'badge-gray'}`} style={{ fontSize: 10 }}>
                            {modulo?.label || log.modulo}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${acao?.badge || 'badge-gray'}`} style={{ fontSize: 10 }}>
                          {acao?.label || log.acao}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--gray-700)', maxWidth: 380 }}>
                        {log.descricao}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <User size={12} color="var(--gray-400)" />
                          <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                            {log.usuario_email || '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Paginação */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                Página {pagina + 1} — {logs.length} registros
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>← Anterior</button>
                <button className="btn btn-sm" disabled={logs.length < POR_PAGINA} onClick={() => setPagina(p => p + 1)}>Próxima →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
