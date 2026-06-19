import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, AlertTriangle, CheckCircle, Clock, Download, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate } from '../lib/utils'
import toast from 'react-hot-toast'

const TIPOS = [
  { value: 'licenca_medica', label: 'Licença médica', cor: 'badge-red' },
  { value: 'licenca_maternidade', label: 'Licença maternidade', cor: 'badge-purple' },
  { value: 'licenca_paternidade', label: 'Licença paternidade', cor: 'badge-blue' },
  { value: 'afastamento_inss', label: 'Afastamento INSS', cor: 'badge-amber' },
  { value: 'acidente_trabalho', label: 'Acidente de trabalho', cor: 'badge-red' },
  { value: 'licenca_nao_remunerada', label: 'Licença não remunerada', cor: 'badge-gray' },
  { value: 'suspensao', label: 'Suspensão disciplinar', cor: 'badge-red' },
  { value: 'licenca_adotante', label: 'Licença adotante', cor: 'badge-purple' },
  { value: 'outro', label: 'Outro', cor: 'badge-gray' },
]

const ORGAO_PAGADOR = [
  { value: 'empresa', label: 'Empresa (integral)' },
  { value: 'inss', label: 'INSS (a partir do 16º dia)' },
  { value: 'ambos', label: 'Empresa + INSS' },
]

function diasEntre(ini, fim) {
  if (!ini || !fim) return null
  const d1 = new Date(ini + 'T00:00:00')
  const d2 = new Date(fim + 'T00:00:00')
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1
}

export default function Afastamentos() {
  const { user } = useAuth()
  const [afastamentos, setAfastamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('ativo')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [colaboradores, setColaboradores] = useState([])
  const [professores, setProfessores] = useState([])

  const fetchAfastamentos = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('afastamentos').select('*').order('data_inicio', { ascending: false })
    if (filtroStatus !== 'todos') q = q.eq('status', filtroStatus)
    if (filtroTipo !== 'todos') q = q.eq('tipo', filtroTipo)
    if (busca) q = q.ilike('pessoa_nome', `%${busca}%`)
    const { data } = await q
    setAfastamentos(data || [])
    setLoading(false)
  }, [filtroStatus, filtroTipo, busca])

  useEffect(() => { fetchAfastamentos() }, [fetchAfastamentos])

  useEffect(() => {
    supabase.from('colaboradores').select('id, nome').eq('ativo', true).order('nome').then(({ data }) => setColaboradores(data || []))
    supabase.from('professores').select('id, nome').eq('ativo', true).order('nome').then(({ data }) => setProfessores(data || []))
  }, [])

  async function handleDelete(id) {
    if (!confirm('Excluir este registro de afastamento?')) return
    await supabase.from('afastamentos').delete().eq('id', id)
    toast.success('Excluído!')
    fetchAfastamentos()
  }

  async function encerrar(id) {
    await supabase.from('afastamentos').update({ status: 'encerrado', updated_at: new Date().toISOString() }).eq('id', id)
    toast.success('Afastamento encerrado!')
    fetchAfastamentos()
  }

  function exportarCSV() {
    const headers = 'Nome;Tipo;Início;Fim;Dias;Órgão pagador;CID;Status'
    const rows = afastamentos.map(a =>
      `${a.pessoa_nome};${TIPOS.find(t => t.value === a.tipo)?.label || a.tipo};${formatDate(a.data_inicio)};${a.data_fim ? formatDate(a.data_fim) : 'Em andamento'};${a.dias_afastamento || '—'};${a.orgao_pagador};${a.cid || ''};${a.status}`
    ).join('\n')
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'afastamentos.csv'; a.click()
  }

  // Stats
  const ativos = afastamentos.filter(a => a.status === 'ativo').length
  const inss = afastamentos.filter(a => a.status === 'ativo' && (a.orgao_pagador === 'inss' || a.orgao_pagador === 'ambos')).length
  const maternidade = afastamentos.filter(a => a.status === 'ativo' && a.tipo === 'licenca_maternidade').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Afastamentos e Licenças</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            Licenças médicas, maternidade, INSS, acidente de trabalho e demais afastamentos
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={exportarCSV}><Download size={13} /> CSV</button>
          <button className="btn btn-primary" onClick={() => { setEditando(null); setModal(true) }}>
            <Plus size={13} /> Novo afastamento
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Em afastamento', valor: ativos, cor: 'var(--red)', icon: AlertTriangle },
          { label: 'Pagos pelo INSS', valor: inss, cor: 'var(--amber)', icon: Clock },
          { label: 'Licença maternidade', valor: maternidade, cor: 'var(--purple)', icon: CheckCircle },
          { label: 'Total registros', valor: afastamentos.length, cor: 'var(--blue)', icon: Clock },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.cor }}>{s.valor}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          <option value="ativo">Em andamento</option>
          <option value="encerrado">Encerrado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Lista */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : afastamentos.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <CheckCircle size={32} strokeWidth={1} />
            <p>Nenhum afastamento registrado.</p>
          </div>
        ) : (
          <table className="table">
            <thead><tr>
              <th>Nome</th><th>Tipo</th><th>Início</th><th>Fim</th><th>Dias</th>
              <th>Órgão pagador</th><th>CID</th><th>Impacto folha</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {afastamentos.map(a => {
                const tipo = TIPOS.find(t => t.value === a.tipo)
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.pessoa_nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{a.tipo_pessoa === 'colaborador' ? 'Colaborador' : 'Professor'}</div>
                    </td>
                    <td><span className={`badge ${tipo?.cor || 'badge-gray'}`} style={{ fontSize: 10 }}>{tipo?.label || a.tipo}</span></td>
                    <td style={{ fontSize: 12 }}>{formatDate(a.data_inicio)}</td>
                    <td style={{ fontSize: 12 }}>{a.data_fim ? formatDate(a.data_fim) : <span style={{ color: 'var(--amber)' }}>Em andamento</span>}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{a.dias_afastamento || '—'}</td>
                    <td style={{ fontSize: 12 }}>
                      <span className={`badge ${a.orgao_pagador === 'inss' ? 'badge-amber' : a.orgao_pagador === 'ambos' ? 'badge-purple' : 'badge-blue'}`} style={{ fontSize: 10 }}>
                        {ORGAO_PAGADOR.find(o => o.value === a.orgao_pagador)?.label || a.orgao_pagador}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{a.cid || '—'}</td>
                    <td>
                      <span className={`badge ${a.impacto_folha ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: 10 }}>
                        {a.impacto_folha ? 'Impacta folha' : 'Sem impacto'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${a.status === 'ativo' ? 'badge-red' : a.status === 'encerrado' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                        {a.status === 'ativo' ? 'Em andamento' : a.status === 'encerrado' ? 'Encerrado' : 'Cancelado'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {a.status === 'ativo' && (
                          <button className="btn btn-sm" style={{ color: 'var(--green)', fontSize: 11 }} onClick={() => encerrar(a.id)}>Encerrar</button>
                        )}
                        <button className="btn btn-sm" onClick={() => { setEditando(a); setModal(true) }}><Edit2 size={11} /></button>
                        <button className="btn btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(a.id)}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ModalAfastamento
          dados={editando}
          colaboradores={colaboradores}
          professores={professores}
          userEmail={user?.email}
          onClose={() => { setModal(false); setEditando(null) }}
          onSaved={() => { setModal(false); setEditando(null); fetchAfastamentos() }}
        />
      )}
    </div>
  )
}

function ModalAfastamento({ dados, colaboradores, professores, userEmail, onClose, onSaved }) {
  const isEdit = !!dados?.id
  const [form, setForm] = useState({
    tipo_pessoa: dados?.tipo_pessoa || 'colaborador',
    pessoa_id: dados?.pessoa_id || '',
    pessoa_nome: dados?.pessoa_nome || '',
    tipo: dados?.tipo || 'licenca_medica',
    data_inicio: dados?.data_inicio || '',
    data_fim: dados?.data_fim || '',
    dias_afastamento: dados?.dias_afastamento || '',
    cid: dados?.cid || '',
    orgao_pagador: dados?.orgao_pagador || 'empresa',
    impacto_ferias: dados?.impacto_ferias || false,
    impacto_folha: dados?.impacto_folha !== false,
    dias_sem_remuneracao: dados?.dias_sem_remuneracao || 0,
    observacoes: dados?.observacoes || '',
    status: dados?.status || 'ativo',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Calcula dias automaticamente
  useEffect(() => {
    const dias = diasEntre(form.data_inicio, form.data_fim)
    if (dias) set('dias_afastamento', dias)
  }, [form.data_inicio, form.data_fim])

  // Preenche nome ao selecionar pessoa
  function onSelectPessoa(id) {
    const lista = form.tipo_pessoa === 'colaborador' ? colaboradores : professores
    const p = lista.find(x => x.id === id)
    set('pessoa_id', id)
    if (p) set('pessoa_nome', p.nome)
  }

  // Regras automáticas por tipo
  useEffect(() => {
    if (form.tipo === 'licenca_maternidade') {
      set('orgao_pagador', 'inss')
      set('impacto_folha', false)
    } else if (form.tipo === 'acidente_trabalho') {
      set('orgao_pagador', 'inss')
      set('impacto_ferias', false)
    } else if (form.tipo === 'licenca_nao_remunerada') {
      set('orgao_pagador', 'empresa')
      set('impacto_folha', false)
    }
  }, [form.tipo])

  async function handleSave() {
    if (!form.pessoa_nome || !form.tipo || !form.data_inicio) {
      toast.error('Preencha pessoa, tipo e data de início.')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      pessoa_id: form.pessoa_id || null,
      data_fim: form.data_fim || null,
      dias_afastamento: form.dias_afastamento ? parseInt(form.dias_afastamento) : null,
      dias_sem_remuneracao: parseInt(form.dias_sem_remuneracao) || 0,
      cid: form.cid || null,
      observacoes: form.observacoes || null,
      registrado_por: userEmail || 'RH',
    }
    if (isEdit) {
      const { error } = await supabase.from('afastamentos').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', dados.id)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      toast.success('Afastamento atualizado!')
    } else {
      const { error } = await supabase.from('afastamentos').insert(payload)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      toast.success('Afastamento registrado!')
    }
    onSaved()
  }

  const lista = form.tipo_pessoa === 'colaborador' ? colaboradores : professores

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar afastamento' : 'Registrar afastamento'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          {/* Pessoa */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Tipo de vínculo *</label>
              <select className="form-select" value={form.tipo_pessoa} onChange={e => { set('tipo_pessoa', e.target.value); set('pessoa_id', ''); set('pessoa_nome', '') }}>
                <option value="colaborador">Colaborador</option>
                <option value="professor">Professor</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Selecionar {form.tipo_pessoa}</label>
              <select className="form-select" value={form.pessoa_id} onChange={e => onSelectPessoa(e.target.value)}>
                <option value="">Selecione...</option>
                {lista.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="form-input" value={form.pessoa_nome} onChange={e => set('pessoa_nome', e.target.value)} placeholder="Ou digite manualmente" />
          </div>

          {/* Tipo e datas */}
          <div className="form-group">
            <label className="form-label">Tipo de afastamento *</label>
            <select className="form-select" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Data início *</label>
              <input className="form-input" type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data fim (previsão)</label>
              <input className="form-input" type="date" value={form.data_fim} onChange={e => set('data_fim', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Dias afastamento</label>
              <input className="form-input" type="number" value={form.dias_afastamento} onChange={e => set('dias_afastamento', e.target.value)} />
            </div>
          </div>

          {/* Licença médica */}
          {(form.tipo === 'licenca_medica' || form.tipo === 'afastamento_inss' || form.tipo === 'acidente_trabalho') && (
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">CID (código)</label>
                <input className="form-input" value={form.cid} onChange={e => set('cid', e.target.value)} placeholder="Ex: M54.5" />
              </div>
              <div className="form-group">
                <label className="form-label">Órgão pagador</label>
                <select className="form-select" value={form.orgao_pagador} onChange={e => set('orgao_pagador', e.target.value)}>
                  {ORGAO_PAGADOR.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Impactos */}
          <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 2 }}>Impactos</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.impacto_folha} onChange={e => set('impacto_folha', e.target.checked)} />
              Impacta folha de pagamento (desconto proporcional)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.impacto_ferias} onChange={e => set('impacto_ferias', e.target.checked)} />
              Suspende contagem do período aquisitivo de férias
            </label>
            {form.tipo === 'licenca_nao_remunerada' && (
              <div className="form-group">
                <label className="form-label">Dias sem remuneração</label>
                <input className="form-input" type="number" value={form.dias_sem_remuneracao} onChange={e => set('dias_sem_remuneracao', e.target.value)} />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="ativo">Em andamento</option>
              <option value="encerrado">Encerrado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
