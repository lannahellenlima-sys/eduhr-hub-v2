import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Printer, Camera, Plus, Mail,
  TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle
} from 'lucide-react'
import {
  useColaborador, useHistoricoSalarial, useDocumentos,
  updateDocumentoStatus, addDocumento, uploadFoto, saveColaborador
} from '../hooks/useColaboradores'
import ModalNovoSalario from '../components/ModalNovoSalario'
import ModalEmailNotificacao from '../components/ModalEmailNotificacao'
import { formatDate, tempoServico, formatMoeda, calcPercentual, docStatusBadge, docStatusLabel, tipoSalarioBadge } from '../lib/utils'
import toast from 'react-hot-toast'

const TABS = ['Dados', 'Histórico Salarial', 'Documentos']

export default function ColaboradorFicha() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Dados')
  const [modalSalario, setModalSalario] = useState(false)
  const [modalEmail, setModalEmail] = useState(false)
  const fotoRef = useRef()

  const { data: colab, loading, refetch: refetchColab } = useColaborador(id)
  const { data: historico, loading: loadingHist, refetch: refetchHist } = useHistoricoSalarial(id)
  const { data: docs, loading: loadingDocs, refetch: refetchDocs } = useDocumentos(id)

  const pendentes = docs.filter(d => d.status === 'pendente' || d.status === 'vencido')

  async function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    toast.loading('Enviando foto...')
    const url = await uploadFoto(file, id)
    if (url) {
      await saveColaborador({ foto_url: url }, id)
      refetchColab()
      toast.dismiss()
      toast.success('Foto atualizada!')
    } else {
      toast.dismiss()
    }
  }

  async function handleToggleDoc(docId, statusAtual) {
    const novoStatus = statusAtual === 'ok' ? 'pendente' : 'ok'
    const ok = await updateDocumentoStatus(docId, novoStatus)
    if (ok) refetchDocs()
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" />
    </div>
  )

  if (!colab) return (
    <div className="empty-state">
      <AlertCircle size={32} strokeWidth={1} />
      <p>Colaborador não encontrado.</p>
    </div>
  )

  return (
    <div>
      {/* Voltar */}
      <button className="btn btn-sm no-print" style={{ marginBottom: 14, color: 'var(--gray-500)' }} onClick={() => navigate('/colaboradores')}>
        <ChevronLeft size={14} /> Colaboradores
      </button>

      {/* Ações */}
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={13} /> Imprimir ficha
        </button>
        <input ref={fotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFoto} />
        <button className="btn" onClick={() => fotoRef.current?.click()}>
          <Camera size={13} /> {colab.foto_url ? 'Trocar foto' : 'Carregar foto'}
        </button>
        {pendentes.length > 0 && (
          <button className="btn" style={{ color: 'var(--amber)', borderColor: '#F5C07A', background: 'var(--amber-light)' }} onClick={() => setModalEmail(true)}>
            <Mail size={13} /> Notificar documentos pendentes ({pendentes.length})
          </button>
        )}
      </div>

      {/* Cabeçalho da ficha */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 16, alignItems: 'start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--gray-900)' }}>{colab.nome}</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            {colab.funcao} · {colab.departamento}
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${colab.ativo ? 'badge-green' : 'badge-gray'}`}>
              {colab.ativo ? 'Ativo' : 'Inativo'}
            </span>
            <span className="badge badge-blue">{colab.vinculo}</span>
            {pendentes.length > 0 && (
              <span className="badge badge-amber">
                <AlertCircle size={10} /> {pendentes.length} doc{pendentes.length > 1 ? 's' : ''} pendente{pendentes.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 6 }}>
            {colab.ficha_numero ? `Ficha nº ${colab.ficha_numero} · ` : ''}
            Admissão: {formatDate(colab.data_admissao)} · {tempoServico(colab.data_admissao)} de casa
          </p>
        </div>

        {/* Foto */}
        <div
          onClick={() => fotoRef.current?.click()}
          style={{
            width: 130, height: 160, border: '1px dashed var(--gray-300)', borderRadius: 8,
            overflow: 'hidden', cursor: 'pointer', background: 'var(--gray-50)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6
          }}
        >
          {colab.foto_url ? (
            <img src={colab.foto_url} alt={colab.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <>
              <Camera size={28} color="var(--gray-300)" />
              <span style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'center', lineHeight: 1.3 }}>
                Carregar foto<br />3x4
              </span>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs no-print">
        {TABS.map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
            {t === 'Documentos' && pendentes.length > 0 && (
              <span className="badge badge-amber" style={{ marginLeft: 6, padding: '1px 6px' }}>{pendentes.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── ABA DADOS ─────────────────────────────── */}
      {(tab === 'Dados') && (
        <div>
          <div className="secao">
            <div className="secao-header"><h3>Dados pessoais</h3></div>
            <div className="secao-grid">
              <Campo label="Nome completo" valor={colab.nome} />
              <Campo label="CPF" valor={colab.cpf} />
              <Campo label="RG" valor={colab.rg} />
              <Campo label="Data de nascimento" valor={formatDate(colab.data_nascimento)} />
              <Campo label="Estado civil" valor={colab.estado_civil} />
              <Campo label="Tipo sanguíneo" valor={colab.tipo_sanguineo} />
              <Campo label="Grau de instrução" valor={colab.grau_instrucao} />
              <Campo label="Naturalidade" valor={colab.naturalidade} />
              <Campo label="Nacionalidade" valor={colab.nacionalidade} />
              <Campo label="Telefone" valor={colab.telefone} />
              <Campo label="E-mail" valor={colab.email} />
              <Campo label="Endereço" valor={[colab.endereco, colab.bairro, colab.cidade && `${colab.cidade}/${colab.estado}`, colab.cep].filter(Boolean).join(', ')} full />
            </div>
          </div>

          <div className="secao">
            <div className="secao-header"><h3>Dados funcionais</h3></div>
            <div className="secao-grid">
              <Campo label="Função" valor={colab.funcao} />
              <Campo label="Departamento" valor={colab.departamento} />
              <Campo label="Vínculo" valor={colab.vinculo} />
              <Campo label="Regime de trabalho" valor={colab.regime_trabalho} />
              <Campo label="Data de admissão" valor={formatDate(colab.data_admissao)} />
              <Campo label="Tempo de casa" valor={tempoServico(colab.data_admissao)} />
              <Campo label="Salário atual" valor={formatMoeda(colab.salario_base)} />
              <Campo label="Centro de custo" valor={colab.centro_custo} />
            </div>
          </div>

          <div className="secao">
            <div className="secao-header"><h3>Dados bancários</h3></div>
            <div className="secao-grid">
              <Campo label="Banco" valor={colab.banco} />
              <Campo label="Agência" valor={colab.agencia} />
              <Campo label="Conta corrente" valor={colab.conta} />
              <Campo label="Chave PIX" valor={colab.pix} />
            </div>
          </div>

          <div className="secao">
            <div className="secao-header"><h3>Família</h3></div>
            <div className="secao-grid">
              <Campo label="Nome do pai" valor={colab.nome_pai} />
              <Campo label="Nome da mãe" valor={colab.nome_mae} />
              <Campo label="Cônjuge" valor={colab.conjuge} />
              <Campo label="Dependentes" valor={colab.dependentes} full />
            </div>
          </div>

          {/* Assinatura — só impressão */}
          <div className="secao print-only" style={{ marginTop: 24 }}>
            <div className="secao-grid">
              <div className="campo campo-full" style={{ padding: '24px 14px' }}>
                <span className="campo-label">Assinatura do colaborador</span>
                <div style={{ borderBottom: '1px solid #ccc', marginTop: 36, width: 260 }} />
                <span style={{ fontSize: 11, color: '#999' }}>{colab.nome} · Data: ___/___/______</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA HISTÓRICO SALARIAL ─────────────────── */}
      {tab === 'Histórico Salarial' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setModalSalario(true)}>
              <Plus size={13} /> Registrar alteração
            </button>
          </div>

          {loadingHist ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : historico.length === 0 ? (
            <div className="empty-state"><p>Nenhuma alteração salarial registrada.</p></div>
          ) : (
            historico.map((h, i) => {
              const pct = h.percentual
              const sobe = pct && pct > 0
              return (
                <div key={h.id} className="card" style={{ marginBottom: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-900)' }}>
                          {formatMoeda(h.novo_salario)}
                        </span>
                        {h.salario_anterior && (
                          <>
                            <span style={{ color: 'var(--gray-300)' }}>←</span>
                            <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>{formatMoeda(h.salario_anterior)}</span>
                          </>
                        )}
                        {pct && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                            background: sobe ? 'var(--green-light)' : 'var(--red-light)',
                            color: sobe ? 'var(--green)' : 'var(--red)'
                          }}>
                            {sobe ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {sobe ? '+' : ''}{pct}%
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 3 }}>
                        {formatDate(h.data_vigencia)}
                        {h.registrado_por && ` · Registrado por ${h.registrado_por}`}
                      </div>
                    </div>
                    <span className={`badge ${tipoSalarioBadge(h.tipo)}`}>{h.tipo}</span>
                  </div>
                  {h.observacoes && (
                    <div style={{
                      fontSize: 13, color: 'var(--gray-600)', background: 'var(--gray-50)',
                      borderRadius: 6, padding: '8px 12px', borderLeft: '3px solid var(--gray-200)'
                    }}>
                      {h.observacoes}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── ABA DOCUMENTOS ────────────────────────── */}
      {tab === 'Documentos' && (
        <div>
          {pendentes.length > 0 && (
            <div className="alert alert-amber" style={{ marginBottom: 12 }}>
              <AlertCircle size={16} />
              <div>
                <strong>{pendentes.length} documento{pendentes.length > 1 ? 's' : ''} pendente{pendentes.length > 1 ? 's' : ''}</strong>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  {pendentes.map(d => d.tipo).join(', ')}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, gap: 8 }}>
            <button className="btn btn-sm" onClick={() => setModalEmail(true)}>
              <Mail size={13} /> Notificar por e-mail
            </button>
            <AddDocButton colaboradorId={id} onAdded={refetchDocs} />
          </div>

          <div className="secao">
            <div className="secao-header"><h3>Documentos cadastrais</h3></div>
            {loadingDocs ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="spinner" /></div>
            ) : docs.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><p>Nenhum documento cadastrado.</p></div>
            ) : (
              docs.map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderBottom: '1px solid var(--gray-100)',
                  background: doc.status === 'pendente' ? '#FAEEDA33' : doc.status === 'vencido' ? '#FCEBEB33' : 'white'
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-800)' }}>{doc.tipo}</p>
                    {doc.descricao && <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>{doc.descricao}</p>}
                    {doc.data_validade && (
                      <p style={{ fontSize: 11, color: 'var(--gray-400)' }}>Válido até {formatDate(doc.data_validade)}</p>
                    )}
                    {doc.status === 'pendente' && doc.solicitado_em && (
                      <p style={{ fontSize: 11, color: 'var(--amber)' }}>Solicitado em {formatDate(doc.solicitado_em)}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge ${docStatusBadge(doc.status)}`}>{docStatusLabel(doc.status)}</span>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleToggleDoc(doc.id, doc.status)}
                      style={{ fontSize: 11 }}
                    >
                      {doc.status === 'ok' ? 'Marcar pendente' : 'Marcar OK'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modais */}
      {modalSalario && (
        <ModalNovoSalario
          colaboradorId={id}
          salarioAtual={colab.salario_base}
          onClose={() => setModalSalario(false)}
          onSaved={() => { refetchHist(); refetchColab() }}
        />
      )}
      {modalEmail && (
        <ModalEmailNotificacao
          colaborador={colab}
          documentosPendentes={pendentes}
          onClose={() => setModalEmail(false)}
        />
      )}
    </div>
  )
}

// Campo de exibição
function Campo({ label, valor, full }) {
  return (
    <div className={`campo ${full ? 'campo-full' : ''}`}>
      <span className="campo-label">{label}</span>
      <span className="campo-valor">{valor || '—'}</span>
    </div>
  )
}

// Botão para adicionar documento
function AddDocButton({ colaboradorId, onAdded }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ tipo: '', descricao: '', status: 'pendente', solicitado_em: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!form.tipo) return
    setSaving(true)
    const ok = await addDocumento({ ...form, colaborador_id: colaboradorId })
    setSaving(false)
    if (ok) { setOpen(false); setForm({ tipo: '', descricao: '', status: 'pendente', solicitado_em: new Date().toISOString().split('T')[0] }); onAdded() }
  }

  if (!open) return (
    <button className="btn btn-sm" onClick={() => setOpen(true)}>
      <Plus size={13} /> Adicionar documento
    </button>
  )

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Adicionar documento</h2>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}><Plus size={18} style={{ transform: 'rotate(45deg)' }} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Tipo de documento *</label>
            <input className="form-input" placeholder="ex: ASO, Diploma, CTPS..." value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input className="form-input" placeholder="Detalhe opcional..." value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Status inicial</label>
              <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="pendente">Pendente</option>
                <option value="ok">OK</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data solicitação</label>
              <input className="form-input" type="date" value={form.solicitado_em} onChange={e => setForm(f => ({ ...f, solicitado_em: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={() => setOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !form.tipo}>
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}
