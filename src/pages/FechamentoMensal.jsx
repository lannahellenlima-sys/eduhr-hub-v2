import { useState, useEffect, useCallback } from 'react'
import {
  Lock, Unlock, Send, Plus, CheckCircle, AlertCircle,
  ChevronRight, FileText, X
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate, formatMoeda } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const STATUS_BADGE = { aberta: 'badge-blue', em_conferencia: 'badge-amber', fechada: 'badge-green', enviada_financeiro: 'badge-purple' }
const STATUS_LABEL = { aberta: 'Aberta', em_conferencia: 'Em conferência', fechada: 'Fechada', enviada_financeiro: 'Enviada ao Financeiro' }

export default function FechamentoMensal() {
  const { user } = useAuth()
  const [folhas, setFolhas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalNova, setModalNova] = useState(false)
  const [modalFechar, setModalFechar] = useState(null)
  const [modalReabrir, setModalReabrir] = useState(null)
  const [justificativa, setJustificativa] = useState('')

  const fetchFolhas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('folhas_mensais')
      .select('*')
      .order('ano', { ascending: false })
      .order('mes', { ascending: false })
      .order('tipo')
    setFolhas(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchFolhas() }, [fetchFolhas])

  // Agrupa por mês/ano
  const grupos = folhas.reduce((acc, f) => {
    const key = `${f.ano}-${String(f.mes).padStart(2, '0')}`
    if (!acc[key]) acc[key] = { mes: f.mes, ano: f.ano, folhas: [] }
    acc[key].folhas.push(f)
    return acc
  }, {})

  async function fecharFolha() {
    if (!modalFechar) return
    const { error } = await supabase.from('folhas_mensais').update({
      status: 'fechada',
      data_fechamento: new Date().toISOString().split('T')[0],
      fechada_por: user?.email || 'RH',
      observacoes: justificativa || null,
      updated_at: new Date().toISOString()
    }).eq('id', modalFechar.id)
    if (error) { toast.error('Erro ao fechar folha'); return }
    toast.success('Folha fechada com sucesso!')
    setModalFechar(null)
    setJustificativa('')
    fetchFolhas()
  }

  async function reabrirFolha() {
    if (!modalReabrir) return
    if (justificativa.trim().length < 10) {
      toast.error('Justificativa obrigatória (mínimo 10 caracteres)')
      return
    }
    const { error } = await supabase.from('folhas_mensais').update({
      status: 'aberta',
      observacoes: `[REABERTA] ${justificativa}`,
      updated_at: new Date().toISOString()
    }).eq('id', modalReabrir.id)
    if (error) { toast.error('Erro ao reabrir folha'); return }
    toast.success('Folha reaberta — registrado no histórico')
    setModalReabrir(null)
    setJustificativa('')
    fetchFolhas()
  }

  async function enviarFinanceiro(id) {
    const { error } = await supabase.from('folhas_mensais').update({
      status: 'enviada_financeiro',
      updated_at: new Date().toISOString()
    }).eq('id', id)
    if (error) { toast.error('Erro ao enviar'); return }
    toast.success('Folha enviada ao Financeiro!')
    fetchFolhas()
  }

  // Resumo por mês
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()
  const folhasDoMes = folhas.filter(f => f.mes === mesAtual && f.ano === anoAtual)
  const todasFechadas = folhasDoMes.length > 0 && folhasDoMes.every(f => f.status === 'fechada' || f.status === 'enviada_financeiro')
  const algumRascunho = folhasDoMes.some(f => f.status === 'aberta' || f.status === 'em_conferencia')

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Fechamento Mensal</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            Controle das folhas por competência — após o fechamento, lançamentos ficam protegidos
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalNova(true)}>
          <Plus size={13} /> Nova folha
        </button>
      </div>

      {/* Status do mês atual */}
      {folhasDoMes.length > 0 && (
        <div className={`alert ${todasFechadas ? 'alert-green' : 'alert-amber'}`} style={{ marginBottom: 16 }}>
          {todasFechadas ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <div>
            <strong>{MESES[mesAtual - 1]}/{anoAtual}</strong>
            {todasFechadas
              ? ' — Todas as folhas fechadas ✓'
              : ` — ${folhasDoMes.filter(f => f.status === 'aberta').length} folha(s) ainda em aberto`
            }
          </div>
        </div>
      )}

      {/* Tabela de folhas agrupadas por mês */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : (
        Object.values(grupos).map(grupo => (
          <div key={`${grupo.ano}-${grupo.mes}`} style={{ marginBottom: 16 }}>
            {/* Header do grupo */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px', background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)', borderRadius: '8px 8px 0 0',
              borderBottom: 'none'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>
                {MESES[grupo.mes - 1]} / {grupo.ano}
              </span>
              {grupo.folhas.every(f => f.status === 'fechada' || f.status === 'enviada_financeiro') && (
                <span className="badge badge-green"><CheckCircle size={10} /> Concluído</span>
              )}
            </div>

            <div className="card" style={{ borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Fechada em</th>
                    <th>Responsável</th>
                    <th>Observações</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.folhas.map(f => (
                    <tr key={f.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={13} color="var(--gray-400)" />
                          <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                            {f.tipo === 'administrativo' ? 'Folha Administrativa' : 'Folha Docente'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {(f.status === 'fechada' || f.status === 'enviada_financeiro') && <Lock size={11} color="var(--gray-400)" />}
                          <span className={`badge ${STATUS_BADGE[f.status] || 'badge-gray'}`}>
                            {STATUS_LABEL[f.status] || f.status}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{f.data_fechamento ? formatDate(f.data_fechamento) : '—'}</td>
                      <td style={{ fontSize: 12 }}>{f.fechada_por || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--gray-500)', maxWidth: 200 }}>
                        {f.observacoes ? (
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {f.observacoes}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {f.status === 'aberta' && (
                            <button
                              className="btn btn-sm"
                              style={{ color: 'var(--green)', borderColor: '#A8D575', background: 'var(--green-light)' }}
                              onClick={() => { setModalFechar(f); setJustificativa('') }}
                            >
                              <Lock size={12} /> Fechar
                            </button>
                          )}
                          {f.status === 'fechada' && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => enviarFinanceiro(f.id)}
                              >
                                <Send size={12} /> Enviar ao Financeiro
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={() => { setModalReabrir(f); setJustificativa('') }}
                              >
                                <Unlock size={12} /> Reabrir
                              </button>
                            </>
                          )}
                          {f.status === 'enviada_financeiro' && (
                            <button
                              className="btn btn-sm"
                              onClick={() => { setModalReabrir(f); setJustificativa('') }}
                            >
                              <Unlock size={12} /> Reabrir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {folhas.length === 0 && !loading && (
        <div className="empty-state card" style={{ padding: 48 }}>
          <FileText size={32} strokeWidth={1} />
          <p>Nenhuma folha cadastrada. Crie a primeira!</p>
        </div>
      )}

      {/* Modal: Nova folha */}
      {modalNova && (
        <ModalNovaFolha
          onClose={() => setModalNova(false)}
          onSaved={() => { setModalNova(false); fetchFolhas() }}
        />
      )}

      {/* Modal: Fechar folha */}
      {modalFechar && (
        <div className="modal-overlay" onClick={() => setModalFechar(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar fechamento</h2>
              <button onClick={() => setModalFechar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-amber">
                <AlertCircle size={15} />
                <span>Após o fechamento, os lançamentos <strong>não poderão ser editados</strong> sem justificativa de reabertura.</span>
              </div>
              <div style={{ background: 'var(--gray-50)', borderRadius: 7, padding: '10px 14px', fontSize: 13 }}>
                <div><strong>{modalFechar.tipo === 'administrativo' ? 'Folha Administrativa' : 'Folha Docente'}</strong></div>
                <div style={{ color: 'var(--gray-500)', marginTop: 2 }}>{MESES[modalFechar.mes - 1]} / {modalFechar.ano}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Observações (opcional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Anotações sobre este fechamento..."
                  value={justificativa}
                  onChange={e => setJustificativa(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModalFechar(null)}>Cancelar</button>
              <button
                className="btn"
                style={{ color: 'var(--green)', borderColor: '#A8D575', background: 'var(--green-light)' }}
                onClick={fecharFolha}
              >
                <Lock size={13} /> Confirmar fechamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reabrir folha */}
      {modalReabrir && (
        <div className="modal-overlay" onClick={() => setModalReabrir(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reabrir folha</h2>
              <button onClick={() => setModalReabrir(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-red">
                <AlertCircle size={15} />
                <span>A reabertura será registrada no histórico com a justificativa informada.</span>
              </div>
              <div style={{ background: 'var(--gray-50)', borderRadius: 7, padding: '10px 14px', fontSize: 13 }}>
                <div><strong>{modalReabrir.tipo === 'administrativo' ? 'Folha Administrativa' : 'Folha Docente'}</strong></div>
                <div style={{ color: 'var(--gray-500)', marginTop: 2 }}>{MESES[modalReabrir.mes - 1]} / {modalReabrir.ano}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Justificativa * (mínimo 10 caracteres)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Descreva o motivo da reabertura..."
                  value={justificativa}
                  onChange={e => setJustificativa(e.target.value)}
                />
                <span style={{ fontSize: 11, color: justificativa.length < 10 ? 'var(--amber)' : 'var(--green)', marginTop: 4, display: 'block' }}>
                  {justificativa.length}/10 caracteres mínimos
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModalReabrir(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={reabrirFolha} disabled={justificativa.trim().length < 10}>
                <Unlock size={13} /> Reabrir folha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Modal: Nova folha
function ModalNovaFolha({ onClose, onSaved }) {
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()
  const [mes, setMes] = useState(mesAtual)
  const [ano, setAno] = useState(anoAtual)
  const [tipo, setTipo] = useState('administrativo')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const { data: existente } = await supabase
      .from('folhas_mensais')
      .select('id')
      .eq('mes', mes).eq('ano', ano).eq('tipo', tipo)
      .single()

    if (existente) {
      toast.error('Já existe uma folha para esta competência e tipo!')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('folhas_mensais').insert({
      mes, ano, tipo, status: 'aberta'
    })
    if (error) { toast.error('Erro ao criar folha'); setSaving(false); return }
    toast.success('Folha criada!')
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nova folha</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Mês</label>
              <select className="form-select" value={mes} onChange={e => setMes(parseInt(e.target.value))}>
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ano</label>
              <input className="form-input" type="number" value={ano} onChange={e => setAno(parseInt(e.target.value))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-select" value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="administrativo">Folha Administrativa</option>
              <option value="docente">Folha Docente</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Criando...' : 'Criar folha'}
          </button>
        </div>
      </div>
    </div>
  )
}
