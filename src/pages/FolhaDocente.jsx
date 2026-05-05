import { useState, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Trash2,
  Download, Lock, Unlock, CheckCircle, AlertCircle, Send, Calculator
} from 'lucide-react'
import {
  useLancamentosDocenteCLT, useLancamentosDocenteContrato,
  saveLancamentoDocenteCLT, saveLancamentoDocenteContrato,
  deleteLancamentoDocente, exportarCSVDocente,
  calcLiquidoDocenteCLT, calcTotalDocenteContrato,
  calcValorMensalAula, calcHorasMensais, FATOR_HORAS_MENSAIS
} from '../hooks/useFolhaDocente'
import { useFolhasMensais, atualizarStatusFolha, criarFolha } from '../hooks/useFolhaAdm'
import { formatDate, formatMoeda } from '../lib/utils'
import toast from 'react-hot-toast'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const STATUS_BADGE = { aberta: 'badge-blue', em_conferencia: 'badge-amber', fechada: 'badge-green', enviada_financeiro: 'badge-purple' }
const STATUS_LABEL = { aberta: 'Aberta', em_conferencia: 'Em conferência', fechada: 'Fechada', enviada_financeiro: 'Enviada ao Financeiro' }
const VINCULOS_CONTRATO = ['Contrato', 'Horista', 'PJ']

export default function FolhaDocente() {
  const { data: folhas, loading: loadingFolhas, refetch: refetchFolhas } = useFolhasMensais('docente')
  const [folhaIdx, setFolhaIdx] = useState(0)
  const [aba, setAba] = useState('Docente CLT')

  const folhaAtual = folhas[folhaIdx] || null
  const folhaId = folhaAtual?.id

  const { data: clt, refetch: refetchCLT } = useLancamentosDocenteCLT(folhaId)
  const { data: contrato, refetch: refetchContrato } = useLancamentosDocenteContrato(folhaId)

  const totalCLT = useMemo(() => clt.reduce((s, l) => s + calcLiquidoDocenteCLT(l), 0), [clt])
  const totalContrato = useMemo(() => contrato.reduce((s, l) => s + calcTotalDocenteContrato(l), 0), [contrato])
  const totalGeral = totalCLT + totalContrato
  const pendentes = [...clt, ...contrato].filter(l => l.status === 'rascunho').length
  const isFechada = folhaAtual?.status === 'fechada' || folhaAtual?.status === 'enviada_financeiro'
  const mesLabel = folhaAtual ? `${MESES[folhaAtual.mes - 1]}_${folhaAtual.ano}` : ''

  async function handleFechar() {
    if (pendentes > 0) { toast.error(`Há ${pendentes} lançamento(s) em rascunho. Valide todos antes de fechar.`); return }
    if (!confirm('Confirma o fechamento da folha docente?')) return
    const ok = await atualizarStatusFolha(folhaId, 'fechada', 'Lanna Hellen')
    if (ok) refetchFolhas()
  }

  async function handleReabrir() {
    if (!confirm('Deseja reabrir esta folha?')) return
    const ok = await atualizarStatusFolha(folhaId, 'aberta')
    if (ok) refetchFolhas()
  }

  async function handleEnviarFinanceiro() {
    if (!confirm('Confirma o envio da folha docente ao Financeiro?')) return
    const ok = await atualizarStatusFolha(folhaId, 'enviada_financeiro')
    if (ok) refetchFolhas()
  }

  if (loadingFolhas) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Folha Docente</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            {folhaAtual ? `${MESES[folhaAtual.mes - 1]}/${folhaAtual.ano}` : 'Selecione uma competência'}
            {' · '}Fator mensal: <strong>{FATOR_HORAS_MENSAIS}×</strong> as horas semanais
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isFechada && pendentes === 0 && folhaAtual && (
            <button className="btn" style={{ color: 'var(--green)', borderColor: '#A8D575', background: 'var(--green-light)' }} onClick={handleFechar}>
              <Lock size={13} /> Fechar folha
            </button>
          )}
          {folhaAtual?.status === 'fechada' && (
            <>
              <button className="btn" onClick={handleReabrir}><Unlock size={13} /> Reabrir</button>
              <button className="btn btn-primary" onClick={handleEnviarFinanceiro}><Send size={13} /> Enviar ao Financeiro</button>
            </>
          )}
          <button className="btn" onClick={() => exportarCSVDocente(clt, contrato, mesLabel)}>
            <Download size={13} /> Exportar CSV
          </button>
          <button className="btn btn-primary" onClick={async () => {
            const mes = ((folhaAtual?.mes || 0) % 12) + 1
            const ano = mes === 1 ? (folhaAtual?.ano || new Date().getFullYear()) + 1 : (folhaAtual?.ano || new Date().getFullYear())
            const id = await criarFolha(mes, ano, 'docente')
            if (id) { await refetchFolhas(); setFolhaIdx(0) }
          }}><Plus size={13} /> Nova competência</button>
        </div>
      </div>

      {/* Seletor de competência */}
      {folhas.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button className="btn btn-sm" disabled={folhaIdx >= folhas.length - 1} onClick={() => setFolhaIdx(i => i + 1)}>
            <ChevronLeft size={14} />
          </button>
          <div className="card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{MESES[(folhaAtual?.mes || 1) - 1]}/{folhaAtual?.ano}</span>
            <span className={`badge ${STATUS_BADGE[folhaAtual?.status] || 'badge-gray'}`}>{STATUS_LABEL[folhaAtual?.status] || '—'}</span>
            {folhaAtual?.data_fechamento && (
              <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                Fechada em {formatDate(folhaAtual.data_fechamento)} por {folhaAtual.fechada_por}
              </span>
            )}
          </div>
          <button className="btn btn-sm" disabled={folhaIdx <= 0} onClick={() => setFolhaIdx(i => i - 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Totais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 8, marginBottom: 16 }}>
        <div className="card" style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Docente CLT</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{formatMoeda(totalCLT)}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{clt.length} lançamento{clt.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="card" style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Contrato / Horista / PJ</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{formatMoeda(totalContrato)}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{contrato.length} lançamento{contrato.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="card" style={{ padding: '10px 14px', background: 'var(--blue)', border: 'none' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Total Docente</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white', fontFamily: 'var(--mono)' }}>{formatMoeda(totalGeral)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{clt.length + contrato.length} docentes</div>
        </div>
      </div>

      {/* Alertas */}
      {pendentes > 0 && !isFechada && (
        <div className="alert alert-amber" style={{ marginBottom: 12 }}>
          <AlertCircle size={16} />
          <span><strong>{pendentes} lançamento(s) em rascunho</strong> — valide todos antes de fechar.</span>
        </div>
      )}
      {isFechada && (
        <div className="alert alert-green" style={{ marginBottom: 12 }}>
          <CheckCircle size={16} />
          <span>Folha <strong>{STATUS_LABEL[folhaAtual?.status]}</strong> — lançamentos bloqueados para edição.</span>
        </div>
      )}

      {/* Abas */}
      <div className="tabs">
        {['Docente CLT', 'Contrato / Horista / PJ'].map(a => (
          <button key={a} className={`tab-btn ${aba === a ? 'active' : ''}`} onClick={() => setAba(a)}>
            {a}
            <span className="badge badge-gray" style={{ marginLeft: 6, padding: '1px 6px' }}>
              {a === 'Docente CLT' ? clt.length : contrato.length}
            </span>
          </button>
        ))}
      </div>

      {!folhaId ? (
        <div className="empty-state"><p>Nenhuma folha disponível. Crie uma nova competência.</p></div>
      ) : (
        <>
          {aba === 'Docente CLT' && (
            <TabelaDocenteCLT data={clt} folhaId={folhaId} locked={isFechada} onSaved={refetchCLT} />
          )}
          {aba === 'Contrato / Horista / PJ' && (
            <TabelaDocenteContrato data={contrato} folhaId={folhaId} locked={isFechada} onSaved={refetchContrato} />
          )}
        </>
      )}
    </div>
  )
}

// ── Badge de status ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = { validado: 'badge-green', aprovado: 'badge-green', rascunho: 'badge-amber', cancelado: 'badge-red' }
  const label = { validado: 'Validado', aprovado: 'Aprovado', rascunho: 'Rascunho', cancelado: 'Cancelado' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{label[status] || status}</span>
}

// ── Exibição de horas ────────────────────────────────────────────────
function HoraCell({ hSem, valorH }) {
  if (!hSem) return <span style={{ color: 'var(--gray-300)' }}>—</span>
  const mensal = calcHorasMensais(hSem)
  const valor = calcValorMensalAula(hSem, valorH)
  return (
    <div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{hSem}h/sem → {mensal.toFixed(1)}h/mês</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>{formatMoeda(valor)}</div>
    </div>
  )
}

// ── Tabela Docente CLT ───────────────────────────────────────────────
function TabelaDocenteCLT({ data, folhaId, locked, onSaved }) {
  const [editing, setEditing] = useState(null)
  const novo = {
    folha_id: folhaId, docente_nome: '', salario_fixo: 0, ajuda_custo: 0,
    valor_hora_teorica: 0, horas_semanais_teoricas: 0,
    valor_hora_pratica: 0, horas_semanais_praticas: 0,
    reposicao: 0, plano_saude: 0, farmacia: 0, adiantamento: 0,
    observacoes: '', status: 'rascunho'
  }

  return (
    <div>
      {!locked && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...novo })}>
            <Plus size={13} /> Novo lançamento CLT
          </button>
        </div>
      )}
      <div className="card">
        {data.length === 0
          ? <div className="empty-state" style={{ padding: 32 }}><p>Nenhum docente CLT lançado.</p></div>
          : <>
            <table className="table">
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Sal. Fixo</th>
                  <th>Ajuda Custo</th>
                  <th>H. Teóricas</th>
                  <th>H. Práticas</th>
                  <th>Reposição</th>
                  <th>Descontos</th>
                  <th>Líquido</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{l.docente_nome}</div>
                      {l.observacoes && <div style={{ fontSize: 11, color: 'var(--amber)' }}>{l.observacoes}</div>}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {l.salario_fixo > 0 ? formatMoeda(l.salario_fixo) : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {l.ajuda_custo > 0 ? formatMoeda(l.ajuda_custo) : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td><HoraCell hSem={l.horas_semanais_teoricas} valorH={l.valor_hora_teorica} /></td>
                    <td><HoraCell hSem={l.horas_semanais_praticas} valorH={l.valor_hora_pratica} /></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {l.reposicao > 0 ? formatMoeda(l.reposicao) : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)' }}>
                      {(l.plano_saude + l.farmacia + l.adiantamento) > 0
                        ? `-${formatMoeda(l.plano_saude + l.farmacia + l.adiantamento)}`
                        : <span style={{ color: 'var(--gray-300)' }}>—</span>
                      }
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>
                      {formatMoeda(calcLiquidoDocenteCLT(l))}
                    </td>
                    <td><StatusBadge status={l.status} /></td>
                    <td>
                      {!locked && <button className="btn btn-sm" onClick={() => setEditing(l)}>Editar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--gray-50)' }}>
                  <td colSpan={7} style={{ padding: '8px 14px', fontWeight: 600, fontSize: 12 }}>Total Docente CLT</td>
                  <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>
                    {formatMoeda(data.reduce((s, l) => s + calcLiquidoDocenteCLT(l), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </>
        }
      </div>
      {editing && (
        <ModalDocenteCLT
          lancamento={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onSaved() }}
        />
      )}
    </div>
  )
}

// ── Modal Edição CLT ─────────────────────────────────────────────────
function ModalDocenteCLT({ lancamento, onClose, onSaved }) {
  const [form, setForm] = useState({ ...lancamento })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const liquido = calcLiquidoDocenteCLT(form)
  const valTeorica = calcValorMensalAula(form.horas_semanais_teoricas, form.valor_hora_teorica)
  const valPratica = calcValorMensalAula(form.horas_semanais_praticas, form.valor_hora_pratica)

  async function handleSave() {
    setSaving(true)
    const ok = await saveLancamentoDocenteCLT(form, form.id || null)
    setSaving(false)
    if (ok) onSaved()
  }

  async function handleDelete() {
    if (!form.id || !confirm('Excluir este lançamento?')) return
    const ok = await deleteLancamentoDocente('lancamentos_docente_clt', form.id)
    if (ok) onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{form.id ? 'Editar — Docente CLT' : 'Novo lançamento — Docente CLT'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nome do docente *</label>
            <input className="form-input" value={form.docente_nome} onChange={e => set('docente_nome', e.target.value)} />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Salário fixo (contabilidade)</label>
              <input className="form-input" type="number" step="0.01" value={form.salario_fixo} onChange={e => set('salario_fixo', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Ajuda de custo</label>
              <input className="form-input" type="number" step="0.01" value={form.ajuda_custo} onChange={e => set('ajuda_custo', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Horas teóricas */}
          <div style={{ background: 'var(--gray-50)', borderRadius: 7, padding: 12, marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Horas teóricas</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Valor da hora (R$)</label>
                <input className="form-input" type="number" step="0.01" value={form.valor_hora_teorica} onChange={e => set('valor_hora_teorica', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Horas semanais</label>
                <input className="form-input" type="number" step="0.1" value={form.horas_semanais_teoricas} onChange={e => set('horas_semanais_teoricas', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            {valTeorica > 0 && (
              <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4, display: 'flex', gap: 12 }}>
                <span><Calculator size={11} style={{ verticalAlign: 'middle' }} /> {form.horas_semanais_teoricas}h/sem × {FATOR_HORAS_MENSAIS} = {calcHorasMensais(form.horas_semanais_teoricas).toFixed(1)}h/mês</span>
                <strong>= {formatMoeda(valTeorica)}</strong>
              </div>
            )}
          </div>

          {/* Horas práticas */}
          <div style={{ background: 'var(--gray-50)', borderRadius: 7, padding: 12, marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Horas práticas</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Valor da hora (R$)</label>
                <input className="form-input" type="number" step="0.01" value={form.valor_hora_pratica} onChange={e => set('valor_hora_pratica', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Horas semanais</label>
                <input className="form-input" type="number" step="0.1" value={form.horas_semanais_praticas} onChange={e => set('horas_semanais_praticas', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            {valPratica > 0 && (
              <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4, display: 'flex', gap: 12 }}>
                <span><Calculator size={11} style={{ verticalAlign: 'middle' }} /> {form.horas_semanais_praticas}h/sem × {FATOR_HORAS_MENSAIS} = {calcHorasMensais(form.horas_semanais_praticas).toFixed(1)}h/mês</span>
                <strong>= {formatMoeda(valPratica)}</strong>
              </div>
            )}
          </div>

          {/* Outros acréscimos */}
          <div className="form-group">
            <label className="form-label">Reposição de aulas</label>
            <input className="form-input" type="number" step="0.01" value={form.reposicao} onChange={e => set('reposicao', parseFloat(e.target.value) || 0)} />
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Descontos</div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Plano de saúde</label>
              <input className="form-input" type="number" step="0.01" value={form.plano_saude} onChange={e => set('plano_saude', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Farmácia</label>
              <input className="form-input" type="number" step="0.01" value={form.farmacia} onChange={e => set('farmacia', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Adiantamento</label>
              <input className="form-input" type="number" step="0.01" value={form.adiantamento} onChange={e => set('adiantamento', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Resumo */}
          <div style={{ background: 'var(--blue-light)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--blue)', marginBottom: 6 }}>
              <span>Ajuda custo + Teóricas + Práticas + Reposição</span>
              <span>{formatMoeda((form.ajuda_custo || 0) + valTeorica + valPratica + (form.reposicao || 0))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>
              <span>Descontos (plano + farmácia + adiantamento)</span>
              <span>-{formatMoeda((form.plano_saude || 0) + (form.farmacia || 0) + (form.adiantamento || 0))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(24,95,165,.2)', paddingTop: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>Líquido folha</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{formatMoeda(liquido)}</span>
            </div>
            {form.salario_fixo > 0 && (
              <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 6 }}>
                Salário fixo ({formatMoeda(form.salario_fixo)}) vai direto para contabilidade e não integra este líquido.
              </div>
            )}
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {['rascunho', 'validado', 'aprovado'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <input className="form-input" value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {form.id && <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={12} /> Excluir</button>}
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.docente_nome}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tabela Docente Contrato / Horista / PJ ───────────────────────────
function TabelaDocenteContrato({ data, folhaId, locked, onSaved }) {
  const [editing, setEditing] = useState(null)
  const novo = {
    folha_id: folhaId, docente_nome: '', vinculo: 'Contrato',
    inicio_contrato: '', encerramento_contrato: '',
    preceptoria: 0, coordenacao: 0,
    valor_hora_teorica: 0, horas_semanais_teoricas: 0,
    valor_hora_pratica: 0, horas_semanais_praticas: 0,
    observacoes: '', status: 'rascunho'
  }

  const VINCULO_BADGE = { Contrato: 'badge-blue', Horista: 'badge-amber', PJ: 'badge-purple' }

  return (
    <div>
      {!locked && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...novo })}>
            <Plus size={13} /> Novo lançamento
          </button>
        </div>
      )}
      <div className="card">
        {data.length === 0
          ? <div className="empty-state" style={{ padding: 32 }}><p>Nenhum docente por contrato lançado.</p></div>
          : <>
            <table className="table">
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Vínculo</th>
                  <th>Vigência</th>
                  <th>Preceptoria / Coord.</th>
                  <th>H. Teóricas</th>
                  <th>H. Práticas</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{l.docente_nome}</div>
                      {l.observacoes && <div style={{ fontSize: 11, color: 'var(--amber)' }}>{l.observacoes}</div>}
                    </td>
                    <td><span className={`badge ${VINCULO_BADGE[l.vinculo] || 'badge-gray'}`}>{l.vinculo}</span></td>
                    <td style={{ fontSize: 11 }}>
                      <div>{formatDate(l.inicio_contrato)}</div>
                      {l.encerramento_contrato && <div style={{ color: 'var(--gray-400)' }}>até {formatDate(l.encerramento_contrato)}</div>}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {(l.preceptoria + l.coordenacao) > 0
                        ? formatMoeda(l.preceptoria + l.coordenacao)
                        : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td><HoraCell hSem={l.horas_semanais_teoricas} valorH={l.valor_hora_teorica} /></td>
                    <td><HoraCell hSem={l.horas_semanais_praticas} valorH={l.valor_hora_pratica} /></td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>
                      {formatMoeda(calcTotalDocenteContrato(l))}
                    </td>
                    <td><StatusBadge status={l.status} /></td>
                    <td>
                      {!locked && <button className="btn btn-sm" onClick={() => setEditing(l)}>Editar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--gray-50)' }}>
                  <td colSpan={6} style={{ padding: '8px 14px', fontWeight: 600, fontSize: 12 }}>Total Contrato / Horista / PJ</td>
                  <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>
                    {formatMoeda(data.reduce((s, l) => s + calcTotalDocenteContrato(l), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </>
        }
      </div>
      {editing && (
        <ModalDocenteContrato
          lancamento={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onSaved() }}
        />
      )}
    </div>
  )
}

// ── Modal Edição Contrato ────────────────────────────────────────────
function ModalDocenteContrato({ lancamento, onClose, onSaved }) {
  const [form, setForm] = useState({ ...lancamento })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const valTeorica = calcValorMensalAula(form.horas_semanais_teoricas, form.valor_hora_teorica)
  const valPratica = calcValorMensalAula(form.horas_semanais_praticas, form.valor_hora_pratica)
  const total = calcTotalDocenteContrato(form)

  async function handleSave() {
    setSaving(true)
    const ok = await saveLancamentoDocenteContrato(form, form.id || null)
    setSaving(false)
    if (ok) onSaved()
  }

  async function handleDelete() {
    if (!form.id || !confirm('Excluir este lançamento?')) return
    const ok = await deleteLancamentoDocente('lancamentos_docente_contrato', form.id)
    if (ok) onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{form.id ? 'Editar — Docente Contrato' : 'Novo lançamento — Docente Contrato'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Nome do docente *</label>
              <input className="form-input" value={form.docente_nome} onChange={e => set('docente_nome', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Vínculo</label>
              <select className="form-select" value={form.vinculo} onChange={e => set('vinculo', e.target.value)}>
                {VINCULOS_CONTRATO.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Início do contrato</label>
              <input className="form-input" type="date" value={form.inicio_contrato || ''} onChange={e => set('inicio_contrato', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Encerramento</label>
              <input className="form-input" type="date" value={form.encerramento_contrato || ''} onChange={e => set('encerramento_contrato', e.target.value)} />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Preceptoria</label>
              <input className="form-input" type="number" step="0.01" value={form.preceptoria} onChange={e => set('preceptoria', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Coordenação</label>
              <input className="form-input" type="number" step="0.01" value={form.coordenacao} onChange={e => set('coordenacao', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Horas teóricas */}
          <div style={{ background: 'var(--gray-50)', borderRadius: 7, padding: 12, marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Horas teóricas</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Valor da hora (R$)</label>
                <input className="form-input" type="number" step="0.01" value={form.valor_hora_teorica} onChange={e => set('valor_hora_teorica', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Horas semanais</label>
                <input className="form-input" type="number" step="0.1" value={form.horas_semanais_teoricas} onChange={e => set('horas_semanais_teoricas', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            {valTeorica > 0 && (
              <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>
                {form.horas_semanais_teoricas}h/sem × {FATOR_HORAS_MENSAIS} = {calcHorasMensais(form.horas_semanais_teoricas).toFixed(1)}h/mês = <strong>{formatMoeda(valTeorica)}</strong>
              </div>
            )}
          </div>

          {/* Horas práticas */}
          <div style={{ background: 'var(--gray-50)', borderRadius: 7, padding: 12, marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Horas práticas</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Valor da hora (R$)</label>
                <input className="form-input" type="number" step="0.01" value={form.valor_hora_pratica} onChange={e => set('valor_hora_pratica', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Horas semanais</label>
                <input className="form-input" type="number" step="0.1" value={form.horas_semanais_praticas} onChange={e => set('horas_semanais_praticas', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            {valPratica > 0 && (
              <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>
                {form.horas_semanais_praticas}h/sem × {FATOR_HORAS_MENSAIS} = {calcHorasMensais(form.horas_semanais_praticas).toFixed(1)}h/mês = <strong>{formatMoeda(valPratica)}</strong>
              </div>
            )}
          </div>

          {/* Resumo */}
          <div style={{ background: 'var(--blue-light)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--blue)', marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {(form.preceptoria || 0) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Preceptoria</span><span>{formatMoeda(form.preceptoria)}</span></div>}
              {(form.coordenacao || 0) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Coordenação</span><span>{formatMoeda(form.coordenacao)}</span></div>}
              {valTeorica > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Horas teóricas</span><span>{formatMoeda(valTeorica)}</span></div>}
              {valPratica > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Horas práticas</span><span>{formatMoeda(valPratica)}</span></div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(24,95,165,.2)', paddingTop: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{formatMoeda(total)}</span>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {['rascunho', 'validado', 'aprovado'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <input className="form-input" value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {form.id && <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={12} /> Excluir</button>}
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.docente_nome}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
