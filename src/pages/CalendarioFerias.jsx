import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronLeft, ChevronRight, Calendar, Users, GraduationCap, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate, formatMoeda } from '../lib/utils'
import toast from 'react-hot-toast'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const STATUS_MAP = {
  programada: { label: 'Programada', badge: 'badge-blue', cor: '#185FA5' },
  em_gozo: { label: 'Em gozo', badge: 'badge-green', cor: '#3B6D11' },
  concluida: { label: 'Concluída', badge: 'badge-gray', cor: '#6B7280' },
  cancelada: { label: 'Cancelada', badge: 'badge-red', cor: '#A32D2D' },
}

export default function CalendarioFerias() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())
  const [ferias, setFerias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('todos')

  const fetchFerias = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('programacoes_ferias')
      .select('*')
      .order('data_inicio')
    setFerias(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchFerias() }, [fetchFerias])

  // Gera dias do mês
  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia = new Date(ano, mes + 1, 0)
  const diasNoMes = ultimoDia.getDate()
  const iniciaSemana = primeiroDia.getDay()

  // Filtra férias do mês atual visível
  const feriasFiltradas = ferias.filter(f => {
    if (filtroTipo !== 'todos' && f.tipo_pessoa !== filtroTipo) return false
    const ini = new Date(f.data_inicio + 'T00:00:00')
    const fim = new Date(f.data_fim + 'T00:00:00')
    const inicioMes = new Date(ano, mes, 1)
    const fimMes = new Date(ano, mes + 1, 0)
    return ini <= fimMes && fim >= inicioMes
  })

  // Eventos por dia
  function eventosDoDia(dia) {
    const data = new Date(ano, mes, dia)
    return feriasFiltradas.filter(f => {
      const ini = new Date(f.data_inicio + 'T00:00:00')
      const fim = new Date(f.data_fim + 'T00:00:00')
      return data >= ini && data <= fim
    })
  }

  // Próximas férias e alertas
  const proximas = ferias
    .filter(f => f.status === 'programada' && new Date(f.data_inicio + 'T00:00:00') >= hoje)
    .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio))
    .slice(0, 5)

  const vencendo = ferias.filter(f => {
    if (!f.periodo_aquisitivo_fim) return false
    const fim = new Date(f.periodo_aquisitivo_fim + 'T00:00:00')
    const diff = (fim - hoje) / (1000 * 60 * 60 * 24)
    return diff <= 60 && diff >= 0 && f.status !== 'concluida'
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Calendário de Férias</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            Programação e controle de férias de colaboradores e professores
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditando(null); setModalAberto(true) }}>
          <Plus size={13} /> Programar férias
        </button>
      </div>

      {/* Alertas de vencimento */}
      {vencendo.length > 0 && (
        <div className="alert alert-amber" style={{ marginBottom: 14 }}>
          <AlertTriangle size={15} />
          <div>
            <strong>{vencendo.length} período(s) aquisitivo(s) vencendo em até 60 dias</strong>
            <div style={{ fontSize: 12, marginTop: 2 }}>
              {vencendo.map(f => <span key={f.id} style={{ marginRight: 12 }}>{f.nome} — vence em {formatDate(f.periodo_aquisitivo_fim)}</span>)}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, alignItems: 'start' }}>

        {/* Calendário */}
        <div>
          {/* Navegação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button className="btn btn-sm" onClick={() => { if (mes === 0) { setMes(11); setAno(a => a - 1) } else setMes(m => m - 1) }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 15, fontWeight: 600, flex: 1, textAlign: 'center' }}>
              {MESES[mes]} {ano}
            </span>
            <button className="btn btn-sm" onClick={() => { if (mes === 11) { setMes(0); setAno(a => a + 1) } else setMes(m => m + 1) }}>
              <ChevronRight size={14} />
            </button>
            {/* Filtro tipo */}
            <div style={{ display: 'flex', gap: 3, background: 'var(--gray-100)', borderRadius: 7, padding: 3 }}>
              {[['todos','Todos'],['colaborador','ADM'],['professor','Doc']].map(([v,l]) => (
                <button key={v} onClick={() => setFiltroTipo(v)} style={{
                  padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontFamily: 'var(--font)', fontWeight: 500,
                  background: filtroTipo === v ? 'white' : 'transparent',
                  color: filtroTipo === v ? 'var(--gray-900)' : 'var(--gray-500)',
                  boxShadow: filtroTipo === v ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                }}>{l}</button>
              ))}
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            {/* Cabeçalho dias da semana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
              {DIAS_SEMANA.map(d => (
                <div key={d} style={{ padding: '6px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)' }}>{d}</div>
              ))}
            </div>

            {/* Dias */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {/* Células vazias antes do primeiro dia */}
              {Array.from({ length: iniciaSemana }).map((_, i) => (
                <div key={`empty-${i}`} style={{ minHeight: 80, borderRight: '1px solid var(--gray-100)', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }} />
              ))}

              {Array.from({ length: diasNoMes }).map((_, i) => {
                const dia = i + 1
                const eventos = eventosDoDia(dia)
                const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()
                return (
                  <div
                    key={dia}
                    style={{
                      minHeight: 80, padding: '4px 6px',
                      borderRight: '1px solid var(--gray-100)',
                      borderBottom: '1px solid var(--gray-100)',
                      background: isHoje ? 'var(--blue-light)' : 'white',
                      cursor: 'pointer'
                    }}
                    onClick={() => { setEditando({ data_inicio: `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}` }); setModalAberto(true) }}
                  >
                    <div style={{
                      fontSize: 12, fontWeight: isHoje ? 700 : 400,
                      color: isHoje ? 'var(--blue)' : 'var(--gray-700)',
                      marginBottom: 3
                    }}>{dia}</div>
                    {eventos.slice(0, 2).map(e => (
                      <div
                        key={e.id}
                        onClick={ev => { ev.stopPropagation(); setEditando(e); setModalAberto(true) }}
                        style={{
                          fontSize: 10, padding: '1px 4px', borderRadius: 3, marginBottom: 2,
                          background: STATUS_MAP[e.status]?.cor || '#185FA5',
                          color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                        title={e.nome}
                      >
                        {e.nome?.split(' ')[0]}
                      </div>
                    ))}
                    {eventos.length > 2 && <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>+{eventos.length - 2}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Painel lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Próximas férias */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Calendar size={13} color="var(--blue)" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Próximas férias</span>
            </div>
            {proximas.length === 0
              ? <div style={{ padding: 16, fontSize: 12, color: 'var(--gray-400)', textAlign: 'center' }}>Nenhuma programada</div>
              : proximas.map(f => (
                <div
                  key={f.id}
                  style={{ padding: '8px 14px', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
                  onClick={() => { setEditando(f); setModalAberto(true) }}
                >
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{f.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                    {formatDate(f.data_inicio)} → {formatDate(f.data_fim)} · {f.dias_corridos}d
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`badge ${STATUS_MAP[f.status]?.badge || 'badge-gray'}`} style={{ fontSize: 10 }}>
                      {STATUS_MAP[f.status]?.label}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Resumo do mês */}
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Resumo — {MESES[mes]}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Total no mês', valor: feriasFiltradas.length, cor: 'var(--blue)' },
                { label: 'Colaboradores', valor: feriasFiltradas.filter(f => f.tipo_pessoa === 'colaborador').length, cor: 'var(--green)' },
                { label: 'Professores', valor: feriasFiltradas.filter(f => f.tipo_pessoa === 'professor').length, cor: 'var(--purple)' },
                { label: 'Em gozo', valor: feriasFiltradas.filter(f => f.status === 'em_gozo').length, cor: 'var(--amber)' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: s.cor }}>{s.valor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lista tabular */}
      <div style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Todos os registros</h3>
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
            : ferias.length === 0
            ? <div className="empty-state" style={{ padding: 32 }}><p>Nenhuma férias programada.</p></div>
            : <table className="table">
              <thead><tr>
                <th>Nome</th><th>Tipo</th><th>Período</th><th>Dias</th>
                <th>Período aquisitivo</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {ferias.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 500 }}>{f.nome}</td>
                    <td><span className={`badge ${f.tipo_pessoa === 'colaborador' ? 'badge-blue' : 'badge-purple'}`}>{f.tipo_pessoa === 'colaborador' ? 'ADM' : 'Docente'}</span></td>
                    <td style={{ fontSize: 12 }}>{formatDate(f.data_inicio)} → {formatDate(f.data_fim)}</td>
                    <td style={{ fontSize: 12 }}>{f.dias_corridos}d</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      {f.periodo_aquisitivo_inicio ? `${formatDate(f.periodo_aquisitivo_inicio)} → ${formatDate(f.periodo_aquisitivo_fim)}` : '—'}
                    </td>
                    <td><span className={`badge ${STATUS_MAP[f.status]?.badge || 'badge-gray'}`}>{STATUS_MAP[f.status]?.label || f.status}</span></td>
                    <td><button className="btn btn-sm" onClick={() => { setEditando(f); setModalAberto(true) }}>Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
      </div>

      {/* Modal */}
      {modalAberto && (
        <ModalFerias
          dados={editando}
          onClose={() => { setModalAberto(false); setEditando(null) }}
          onSaved={() => { setModalAberto(false); setEditando(null); fetchFerias() }}
        />
      )}
    </div>
  )
}

// Modal de programação de férias
function ModalFerias({ dados, onClose, onSaved }) {
  const isEdit = dados?.id
  const [form, setForm] = useState({
    nome: dados?.nome || '',
    tipo_pessoa: dados?.tipo_pessoa || 'colaborador',
    data_inicio: dados?.data_inicio || '',
    data_fim: dados?.data_fim || '',
    dias_corridos: dados?.dias_corridos || 30,
    periodo_aquisitivo_inicio: dados?.periodo_aquisitivo_inicio || '',
    periodo_aquisitivo_fim: dados?.periodo_aquisitivo_fim || '',
    status: dados?.status || 'programada',
    observacoes: dados?.observacoes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Calcula dias automaticamente
  useEffect(() => {
    if (form.data_inicio && form.data_fim) {
      const ini = new Date(form.data_inicio + 'T00:00:00')
      const fim = new Date(form.data_fim + 'T00:00:00')
      const dias = Math.ceil((fim - ini) / (1000 * 60 * 60 * 24)) + 1
      if (dias > 0) set('dias_corridos', dias)
    }
  }, [form.data_inicio, form.data_fim])

  async function handleSave() {
    if (!form.nome || !form.data_inicio || !form.data_fim) {
      toast.error('Preencha nome, data início e data fim')
      return
    }
    setSaving(true)
    if (isEdit) {
      const { error } = await supabase.from('programacoes_ferias').update({ ...form, updated_at: new Date().toISOString() }).eq('id', dados.id)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      toast.success('Férias atualizada!')
    } else {
      const { error } = await supabase.from('programacoes_ferias').insert(form)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      toast.success('Férias programada!')
    }
    setSaving(false)
    onSaved()
  }

  async function handleDelete() {
    if (!confirm('Excluir este registro de férias?')) return
    await supabase.from('programacoes_ferias').delete().eq('id', dados.id)
    toast.success('Excluído!')
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar férias' : 'Programar férias'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome *</label>
              <input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome do colaborador ou professor" />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.tipo_pessoa} onChange={e => set('tipo_pessoa', e.target.value)}>
                <option value="colaborador">Colaborador (ADM)</option>
                <option value="professor">Professor (Docente)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_MAP).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Data início *</label>
              <input className="form-input" type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data fim *</label>
              <input className="form-input" type="date" value={form.data_fim} onChange={e => set('data_fim', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Dias corridos</label>
            <input className="form-input" type="number" value={form.dias_corridos} onChange={e => set('dias_corridos', parseInt(e.target.value) || 0)} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Período aquisitivo</div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Início aquisitivo</label>
              <input className="form-input" type="date" value={form.periodo_aquisitivo_inicio} onChange={e => set('periodo_aquisitivo_inicio', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Fim aquisitivo</label>
              <input className="form-input" type="date" value={form.periodo_aquisitivo_fim} onChange={e => set('periodo_aquisitivo_fim', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          {isEdit && <button className="btn btn-danger btn-sm" onClick={handleDelete}>Excluir</button>}
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}
