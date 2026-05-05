import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Printer, Camera, Plus, Mail, Trash2,
  TrendingUp, TrendingDown, AlertCircle, AlertTriangle, CheckCircle, RefreshCw
} from 'lucide-react'
import {
  useProfessor, useHistoricoPlano, useDisciplinas, useAtividades,
  useContratos, useDocumentosProfessor,
  addHistoricoPlano, addDisciplina, deleteDisciplina,
  addAtividade, toggleAtividade,
  addContrato, renovarContrato,
  updateDocProfessorStatus, addDocumentoProfessor,
  uploadFotoProf, saveProfessor
} from '../hooks/useProfessores'
import ModalEmailNotificacao from '../components/ModalEmailNotificacao'
import { formatDate, tempoServico, formatMoeda, tipoSalarioBadge, docStatusBadge, docStatusLabel } from '../lib/utils'
import toast from 'react-hot-toast'

const TABS = ['Dados', 'Acadêmico', 'Histórico de Plano', 'Contratos', 'Documentos']
const PLANO_BADGE = { PI: 'badge-gray', PII: 'badge-blue', PIII: 'badge-purple' }
const ATIVIDADES_OPCOES = [
  'NDE — Núcleo Docente Estruturante',
  'CPA — Comissão Própria de Avaliação',
  'Orientação de TCC',
  'Coordenação de Extensão',
  'Supervisão de Estágio',
  'Outra',
]

export default function ProfessorFicha() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Dados')
  const [modalEmail, setModalEmail] = useState(false)
  const [modalPlano, setModalPlano] = useState(false)
  const [modalDisciplina, setModalDisciplina] = useState(false)
  const [modalAtividade, setModalAtividade] = useState(false)
  const [modalContrato, setModalContrato] = useState(false)
  const [modalRenovar, setModalRenovar] = useState(null)
  const fotoRef = useRef()

  const { data: prof, loading, refetch: refetchProf } = useProfessor(id)
  const { data: historico, refetch: refetchHist } = useHistoricoPlano(id)
  const { data: disciplinas, refetch: refetchDisc } = useDisciplinas(id)
  const { data: atividades, refetch: refetchAtiv } = useAtividades(id)
  const { data: contratos, refetch: refetchContr } = useContratos(id)
  const { data: docs, refetch: refetchDocs } = useDocumentosProfessor(id)

  const pendentes = docs.filter(d => d.status === 'pendente' || d.status === 'vencido')

  // Verifica contratos vencendo em 30 dias
  const contratoAtivo = contratos.find(c => c.status === 'ativo')
  const contratoVencendo = contratoAtivo?.data_fim && (() => {
    const fim = new Date(contratoAtivo.data_fim + 'T00:00:00')
    const diff = (fim - new Date()) / (1000 * 60 * 60 * 24)
    return diff <= 30 ? Math.ceil(diff) : null
  })()

  async function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    toast.loading('Enviando foto...')
    const url = await uploadFotoProf(file, id)
    if (url) {
      await saveProfessor({ foto_url: url }, id)
      refetchProf()
      toast.dismiss()
      toast.success('Foto atualizada!')
    } else toast.dismiss()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
  if (!prof) return <div className="empty-state"><AlertCircle size={32} strokeWidth={1} /><p>Professor não encontrado.</p></div>

  const chSemanalTotal = disciplinas
    .filter(d => d.semestre === disciplinas[0]?.semestre)
    .reduce((acc, d) => acc + (d.horas_semanais_teoricas || 0) + (d.horas_semanais_praticas || 0), 0)

  return (
    <div>
      <button className="btn btn-sm no-print" style={{ marginBottom: 14, color: 'var(--gray-500)' }} onClick={() => navigate('/professores')}>
        <ChevronLeft size={14} /> Professores
      </button>

      {/* Alertas */}
      {contratoVencendo !== null && contratoVencendo !== undefined && (
        <div className="alert alert-amber no-print" style={{ marginBottom: 12 }}>
          <AlertTriangle size={16} />
          <div>
            <strong>Contrato vence em {contratoVencendo} dias</strong>
            <div style={{ fontSize: 12 }}>Semestre {contratoAtivo?.semestre} — vencimento em {formatDate(contratoAtivo?.data_fim)}</div>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={13} /> Imprimir ficha
        </button>
        <input ref={fotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFoto} />
        <button className="btn" onClick={() => fotoRef.current?.click()}>
          <Camera size={13} /> {prof.foto_url ? 'Trocar foto' : 'Carregar foto'}
        </button>
        {pendentes.length > 0 && (
          <button className="btn" style={{ color: 'var(--amber)', borderColor: '#F5C07A', background: 'var(--amber-light)' }} onClick={() => setModalEmail(true)}>
            <Mail size={13} /> Notificar pendências ({pendentes.length})
          </button>
        )}
      </div>

      {/* Cabeçalho */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 16, alignItems: 'start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--gray-900)' }}>{prof.nome}</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            {prof.titulacao} · Plano {prof.plano} · {prof.curso_principal}
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${prof.ativo ? 'badge-green' : 'badge-gray'}`}>{prof.ativo ? 'Ativo' : 'Inativo'}</span>
            <span className="badge badge-blue">{prof.vinculo}</span>
            <span className={`badge ${PLANO_BADGE[prof.plano] || 'badge-gray'}`}>{prof.plano}</span>
            {pendentes.length > 0 && <span className="badge badge-amber"><AlertCircle size={10} />{pendentes.length} doc{pendentes.length > 1 ? 's' : ''} pendente{pendentes.length > 1 ? 's' : ''}</span>}
            {contratoVencendo !== null && contratoVencendo !== undefined && <span className="badge badge-amber"><AlertTriangle size={10} />Contrato vence em {contratoVencendo}d</span>}
          </div>
          <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 6 }}>
            {prof.ficha_numero ? `Ficha nº ${prof.ficha_numero} · ` : ''}
            {prof.data_admissao ? `Admissão: ${formatDate(prof.data_admissao)} · ${tempoServico(prof.data_admissao)} de casa` : ''}
          </p>
        </div>

        {/* Foto */}
        <div onClick={() => fotoRef.current?.click()} style={{
          width: 130, height: 160, border: '1px dashed var(--gray-300)', borderRadius: 8,
          overflow: 'hidden', cursor: 'pointer', background: 'var(--gray-50)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6
        }}>
          {prof.foto_url
            ? <img src={prof.foto_url} alt={prof.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <><Camera size={28} color="var(--gray-300)" /><span style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'center' }}>Carregar foto<br />3x4</span></>
          }
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs no-print">
        {TABS.map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
            {t === 'Documentos' && pendentes.length > 0 && <span className="badge badge-amber" style={{ marginLeft: 6, padding: '1px 6px' }}>{pendentes.length}</span>}
          </button>
        ))}
      </div>

      {/* ── ABA DADOS ──────────────────────────────── */}
      {tab === 'Dados' && (
        <div>
          <div className="secao">
            <div className="secao-header"><h3>Dados pessoais</h3></div>
            <div className="secao-grid">
              <Campo label="Nome completo" valor={prof.nome} />
              <Campo label="CPF" valor={prof.cpf} />
              <Campo label="RG" valor={prof.rg} />
              <Campo label="Data de nascimento" valor={formatDate(prof.data_nascimento)} />
              <Campo label="Estado civil" valor={prof.estado_civil} />
              <Campo label="Tipo sanguíneo" valor={prof.tipo_sanguineo} />
              <Campo label="Naturalidade" valor={prof.naturalidade} />
              <Campo label="Nacionalidade" valor={prof.nacionalidade} />
              <Campo label="Telefone" valor={prof.telefone} />
              <Campo label="E-mail institucional" valor={prof.email} />
              <Campo label="Endereço" valor={[prof.endereco, prof.bairro, prof.cidade && `${prof.cidade}/${prof.estado}`, prof.cep].filter(Boolean).join(', ')} full />
            </div>
          </div>
          <div className="secao">
            <div className="secao-header"><h3>Dados funcionais</h3></div>
            <div className="secao-grid">
              <Campo label="Plano docente" valor={prof.plano} />
              <Campo label="Titulação" valor={prof.titulacao} />
              <Campo label="Vínculo" valor={prof.vinculo} />
              <Campo label="Regime de trabalho" valor={prof.regime_trabalho} />
              <Campo label="Curso principal" valor={prof.curso_principal} />
              <Campo label="Admissão" valor={formatDate(prof.data_admissao)} />
              <Campo label="Valor hora teórica" valor={prof.valor_hora_teorica ? `R$ ${prof.valor_hora_teorica.toFixed(2)}/h` : '—'} />
              <Campo label="Valor hora prática" valor={prof.valor_hora_pratica ? `R$ ${prof.valor_hora_pratica.toFixed(2)}/h` : '—'} />
            </div>
          </div>
          <div className="secao">
            <div className="secao-header"><h3>Família</h3></div>
            <div className="secao-grid">
              <Campo label="Pai" valor={prof.nome_pai} />
              <Campo label="Mãe" valor={prof.nome_mae} />
              <Campo label="Cônjuge" valor={prof.conjuge} />
              <Campo label="Dependentes" valor={prof.dependentes} full />
            </div>
          </div>
          <div className="secao print-only" style={{ marginTop: 24 }}>
            <div className="secao-grid"><div className="campo campo-full" style={{ padding: '24px 14px' }}>
              <span className="campo-label">Assinatura do docente</span>
              <div style={{ borderBottom: '1px solid #ccc', marginTop: 36, width: 260 }} />
              <span style={{ fontSize: 11, color: '#999' }}>{prof.nome} · Data: ___/___/______</span>
            </div></div>
          </div>
        </div>
      )}

      {/* ── ABA ACADÊMICO ───────────────────────────── */}
      {tab === 'Acadêmico' && (
        <div>
          <div className="secao" style={{ marginBottom: 12 }}>
            <div className="secao-header"><h3>Dados acadêmicos</h3></div>
            <div className="secao-grid">
              <Campo label="Titulação" valor={prof.titulacao} />
              <Campo label="Área de atuação" valor={prof.area_atuacao} />
              <Campo label="Instituição de formação" valor={prof.instituicao_formacao} />
              <Campo label="Lattes" valor={prof.lattes} />
              <Campo label="Registro profissional" valor={prof.registro_profissional} />
            </div>
          </div>

          {/* Disciplinas do semestre */}
          <div className="secao" style={{ marginBottom: 12 }}>
            <div className="secao-header">
              <h3>Disciplinas do semestre</h3>
              <button className="btn btn-sm" onClick={() => setModalDisciplina(true)}><Plus size={12} /> Adicionar</button>
            </div>
            {disciplinas.length === 0
              ? <div className="empty-state" style={{ padding: 20 }}><p>Nenhuma disciplina cadastrada.</p></div>
              : <>
                <table className="table">
                  <thead><tr><th>Semestre</th><th>Disciplina</th><th>Turma</th><th>Curso</th><th>H.Teóricas</th><th>H.Práticas</th><th>Total/sem</th><th></th></tr></thead>
                  <tbody>
                    {disciplinas.map(d => (
                      <tr key={d.id}>
                        <td><span className="badge badge-blue">{d.semestre}</span></td>
                        <td style={{ fontWeight: 500 }}>{d.disciplina}</td>
                        <td>{d.turma || '—'}</td>
                        <td style={{ fontSize: 12 }}>{d.curso || '—'}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{d.horas_semanais_teoricas}h</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{d.horas_semanais_praticas}h</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{(d.horas_semanais_teoricas + d.horas_semanais_praticas).toFixed(1)}h</td>
                        <td>
                          <button className="btn btn-sm" style={{ color: 'var(--red)' }} onClick={async () => { if (await deleteDisciplina(d.id)) refetchDisc() }}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {chSemanalTotal > 0 && (
                  <div style={{ padding: '8px 14px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-100)', fontSize: 12, color: 'var(--gray-600)', display: 'flex', gap: 16 }}>
                    <span>Total semanal: <strong>{chSemanalTotal.toFixed(1)}h/sem</strong></span>
                    <span>Estimativa mensal: <strong>~{(chSemanalTotal * 4.5).toFixed(0)}h/mês</strong></span>
                    {prof.valor_hora_teorica && <span>Estimativa de pagamento: <strong>{formatMoeda(chSemanalTotal * 4.5 * prof.valor_hora_teorica)}</strong></span>}
                  </div>
                )}
              </>
            }
          </div>

          {/* Atividades gratificadas */}
          <div className="secao">
            <div className="secao-header">
              <h3>Atividades gratificadas</h3>
              <button className="btn btn-sm" onClick={() => setModalAtividade(true)}><Plus size={12} /> Adicionar</button>
            </div>
            {atividades.length === 0
              ? <div className="empty-state" style={{ padding: 20 }}><p>Nenhuma atividade gratificada cadastrada.</p></div>
              : atividades.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--gray-100)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{a.atividade}</p>
                    {a.data_inicio && <p style={{ fontSize: 11, color: 'var(--gray-400)' }}>Desde {formatDate(a.data_inicio)}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${a.ativo ? 'badge-green' : 'badge-gray'}`}>{a.ativo ? 'Ativo' : 'Encerrado'}</span>
                    <button className="btn btn-sm" onClick={async () => { if (await toggleAtividade(a.id, a.ativo)) refetchAtiv() }}>
                      {a.ativo ? 'Encerrar' : 'Reativar'}
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── ABA HISTÓRICO DE PLANO ──────────────────── */}
      {tab === 'Histórico de Plano' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setModalPlano(true)}>
              <Plus size={13} /> Registrar progressão / reajuste
            </button>
          </div>
          {historico.length === 0
            ? <div className="empty-state"><p>Nenhuma alteração de plano registrada.</p></div>
            : historico.map(h => (
              <div key={h.id} className="card" style={{ marginBottom: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {/* Plano */}
                      {h.plano_anterior && h.plano_anterior !== h.plano_novo && (
                        <><span className={`badge ${PLANO_BADGE[h.plano_anterior] || 'badge-gray'}`}>{h.plano_anterior}</span>
                          <span style={{ color: 'var(--gray-300)' }}>→</span></>
                      )}
                      <span className={`badge ${PLANO_BADGE[h.plano_novo] || 'badge-gray'}`}>{h.plano_novo}</span>
                      {/* Valor hora */}
                      <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>R$ {h.novo_valor_hora.toFixed(2)}/h</span>
                      {h.valor_hora_anterior && <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>← R$ {h.valor_hora_anterior.toFixed(2)}/h</span>}
                      {h.percentual && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                          background: h.percentual >= 0 ? 'var(--green-light)' : 'var(--red-light)',
                          color: h.percentual >= 0 ? 'var(--green)' : 'var(--red)'
                        }}>
                          {h.percentual >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {h.percentual >= 0 ? '+' : ''}{h.percentual}%
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 3 }}>
                      {formatDate(h.data_vigencia)}{h.registrado_por && ` · Registrado por ${h.registrado_por}`}
                    </div>
                  </div>
                  <span className={`badge ${tipoSalarioBadge(h.tipo)}`}>{h.tipo}</span>
                </div>
                {h.observacoes && (
                  <div style={{ fontSize: 13, color: 'var(--gray-600)', background: 'var(--gray-50)', borderRadius: 6, padding: '8px 12px', borderLeft: '3px solid var(--gray-200)' }}>
                    {h.observacoes}
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}

      {/* ── ABA CONTRATOS ──────────────────────────── */}
      {tab === 'Contratos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setModalContrato(true)}><Plus size={13} /> Novo contrato</button>
          </div>
          {contratos.length === 0
            ? <div className="empty-state"><p>Nenhum contrato registrado.</p></div>
            : contratos.map(c => {
              const vencendo = c.data_fim && (() => {
                const fim = new Date(c.data_fim + 'T00:00:00')
                const diff = (fim - new Date()) / (1000 * 60 * 60 * 24)
                return diff <= 30 && diff >= 0 ? Math.ceil(diff) : null
              })()
              return (
                <div key={c.id} className="card" style={{ marginBottom: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{c.tipo}</span>
                        {c.semestre && <span className="badge badge-blue">{c.semestre}</span>}
                        <span className={`badge ${c.status === 'ativo' ? 'badge-green' : 'badge-gray'}`}>{c.status}</span>
                        {vencendo !== null && <span className="badge badge-amber"><AlertTriangle size={10} />Vence em {vencendo}d</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        {formatDate(c.data_inicio)} → {c.data_fim ? formatDate(c.data_fim) : 'Indeterminado'}
                      </div>
                      {c.renovacoes > 0 && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{c.renovacoes} renovação{c.renovacoes > 1 ? 'ões' : ''}</div>}
                      {c.observacoes && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>{c.observacoes}</div>}
                    </div>
                    {c.status === 'ativo' && c.data_fim && (
                      <button className="btn btn-sm" onClick={() => setModalRenovar(c)}>
                        <RefreshCw size={12} /> Renovar
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {/* ── ABA DOCUMENTOS ─────────────────────────── */}
      {tab === 'Documentos' && (
        <div>
          {pendentes.length > 0 && (
            <div className="alert alert-amber" style={{ marginBottom: 12 }}>
              <AlertCircle size={16} />
              <div>
                <strong>{pendentes.length} documento{pendentes.length > 1 ? 's' : ''} pendente{pendentes.length > 1 ? 's' : ''}</strong>
                <div style={{ fontSize: 12, marginTop: 2 }}>{pendentes.map(d => d.tipo).join(', ')}</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
            <button className="btn btn-sm" onClick={() => setModalEmail(true)}><Mail size={13} /> Notificar por e-mail</button>
            <AddDocProfBtn professorId={id} onAdded={refetchDocs} />
          </div>
          <div className="secao">
            <div className="secao-header"><h3>Documentos docentes</h3></div>
            {docs.length === 0
              ? <div className="empty-state" style={{ padding: 24 }}><p>Nenhum documento cadastrado.</p></div>
              : docs.map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderBottom: '1px solid var(--gray-100)',
                  background: doc.status === 'pendente' ? '#FAEEDA33' : 'white'
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{doc.tipo}</p>
                    {doc.descricao && <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>{doc.descricao}</p>}
                    {doc.data_validade && <p style={{ fontSize: 11, color: 'var(--gray-400)' }}>Válido até {formatDate(doc.data_validade)}</p>}
                    {doc.status === 'pendente' && doc.solicitado_em && <p style={{ fontSize: 11, color: 'var(--amber)' }}>Solicitado em {formatDate(doc.solicitado_em)}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${docStatusBadge(doc.status)}`}>{docStatusLabel(doc.status)}</span>
                    <button className="btn btn-sm" onClick={async () => { if (await updateDocProfessorStatus(doc.id, doc.status === 'ok' ? 'pendente' : 'ok')) refetchDocs() }}>
                      {doc.status === 'ok' ? 'Marcar pendente' : 'Marcar OK'}
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── MODAIS ─────────────────────────────────── */}
      {modalPlano && <ModalHistoricoPlano professorId={id} planoAtual={prof.plano} titulacaoAtual={prof.titulacao} valorAtual={prof.valor_hora_teorica} onClose={() => setModalPlano(false)} onSaved={() => { refetchHist(); refetchProf() }} />}
      {modalDisciplina && <ModalDisciplina professorId={id} cursoDefault={prof.curso_principal} onClose={() => setModalDisciplina(false)} onSaved={refetchDisc} />}
      {modalAtividade && <ModalAtividade professorId={id} onClose={() => setModalAtividade(false)} onSaved={refetchAtiv} />}
      {modalContrato && <ModalContrato professorId={id} onClose={() => setModalContrato(false)} onSaved={refetchContr} />}
      {modalRenovar && <ModalRenovar contrato={modalRenovar} onClose={() => setModalRenovar(null)} onSaved={refetchContr} />}
      {modalEmail && <ModalEmailNotificacao colaborador={{ nome: prof.nome, email: prof.email }} documentosPendentes={pendentes} onClose={() => setModalEmail(false)} />}
    </div>
  )
}

function Campo({ label, valor, full }) {
  return (
    <div className={`campo ${full ? 'campo-full' : ''}`}>
      <span className="campo-label">{label}</span>
      <span className="campo-valor">{valor || '—'}</span>
    </div>
  )
}

// Modal: Progressão / reajuste de plano
function ModalHistoricoPlano({ professorId, planoAtual, titulacaoAtual, valorAtual, onClose, onSaved }) {
  const [form, setForm] = useState({ tipo: 'Reajuste tabela', plano_novo: planoAtual, titulacao_nova: titulacaoAtual, novo_valor_hora: '', data_vigencia: new Date().toISOString().split('T')[0], observacoes: '', registrado_por: 'Lanna Hellen' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const pct = form.novo_valor_hora && valorAtual ? (((parseFloat(form.novo_valor_hora) - valorAtual) / valorAtual) * 100).toFixed(1) : null

  async function handleSave() {
    setSaving(true)
    const ok = await addHistoricoPlano({ professor_id: professorId, tipo: form.tipo, plano_anterior: planoAtual, plano_novo: form.plano_novo, titulacao_anterior: titulacaoAtual, titulacao_nova: form.titulacao_nova, valor_hora_anterior: valorAtual, novo_valor_hora: parseFloat(form.novo_valor_hora), percentual: pct ? parseFloat(pct) : null, data_vigencia: form.data_vigencia, observacoes: form.observacoes || null, registrado_por: form.registrado_por })
    setSaving(false)
    if (ok) { onSaved(); onClose() }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Registrar progressão / reajuste</h2><button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Tipo</label><select className="form-select" value={form.tipo} onChange={e => set('tipo', e.target.value)}>{['Reajuste tabela', 'Progressão', 'Admissão', 'Correção', 'Outro'].map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Plano novo</label><select className="form-select" value={form.plano_novo} onChange={e => set('plano_novo', e.target.value)}>{['PI', 'PII', 'PIII'].map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Titulação nova</label><select className="form-select" value={form.titulacao_nova} onChange={e => set('titulacao_nova', e.target.value)}>{['Especialista', 'Mestre', 'Doutor'].map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Hora-aula anterior</label><input className="form-input" disabled value={valorAtual ? `R$ ${valorAtual.toFixed(2)}/h` : '—'} style={{ background: 'var(--gray-50)', color: 'var(--gray-400)' }} /></div>
            <div className="form-group"><label className="form-label">Novo valor hora-aula *</label><input className="form-input" type="number" step="0.01" placeholder="0,00" value={form.novo_valor_hora} onChange={e => set('novo_valor_hora', e.target.value)} /></div>
          </div>
          {pct && <div className={`alert ${parseFloat(pct) >= 0 ? 'alert-green' : 'alert-red'}`}><strong>Variação: {parseFloat(pct) >= 0 ? '+' : ''}{pct}%</strong></div>}
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Data de vigência *</label><input className="form-input" type="date" value={form.data_vigencia} onChange={e => set('data_vigencia', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Registrado por</label><input className="form-input" value={form.registrado_por} onChange={e => set('registrado_por', e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Descreva o motivo, decisão do conselho acadêmico, aprovações..." /></div>
        </div>
        <div className="modal-footer"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.novo_valor_hora}>{saving ? 'Salvando...' : 'Salvar'}</button></div>
      </div>
    </div>
  )
}

// Modal: Adicionar disciplina
function ModalDisciplina({ professorId, cursoDefault, onClose, onSaved }) {
  const [form, setForm] = useState({ semestre: '2025.1', disciplina: '', turma: '', curso: cursoDefault || '', horas_semanais_teoricas: 0, horas_semanais_praticas: 0 })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  async function handleSave() {
    if (!form.disciplina) return
    setSaving(true)
    const ok = await addDisciplina({ ...form, professor_id: professorId, horas_semanais_teoricas: parseFloat(form.horas_semanais_teoricas), horas_semanais_praticas: parseFloat(form.horas_semanais_praticas) })
    setSaving(false)
    if (ok) { onSaved(); onClose() }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Adicionar disciplina</h2><button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button></div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Semestre *</label><input className="form-input" value={form.semestre} onChange={e => set('semestre', e.target.value)} placeholder="2025.1" /></div>
            <div className="form-group"><label className="form-label">Turma</label><input className="form-input" value={form.turma} onChange={e => set('turma', e.target.value)} placeholder="DIR-A" /></div>
          </div>
          <div className="form-group"><label className="form-label">Disciplina *</label><input className="form-input" value={form.disciplina} onChange={e => set('disciplina', e.target.value)} placeholder="Nome da disciplina" /></div>
          <div className="form-group"><label className="form-label">Curso</label><input className="form-input" value={form.curso} onChange={e => set('curso', e.target.value)} /></div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Horas teóricas/sem</label><input className="form-input" type="number" step="0.5" value={form.horas_semanais_teoricas} onChange={e => set('horas_semanais_teoricas', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Horas práticas/sem</label><input className="form-input" type="number" step="0.5" value={form.horas_semanais_praticas} onChange={e => set('horas_semanais_praticas', e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.disciplina}>{saving ? 'Salvando...' : 'Adicionar'}</button></div>
      </div>
    </div>
  )
}

// Modal: Atividade gratificada
function ModalAtividade({ professorId, onClose, onSaved }) {
  const [form, setForm] = useState({ atividade: ATIVIDADES_OPCOES[0], data_inicio: new Date().toISOString().split('T')[0], observacoes: '' })
  const [saving, setSaving] = useState(false)
  async function handleSave() {
    setSaving(true)
    const ok = await addAtividade({ ...form, professor_id: professorId, ativo: true })
    setSaving(false)
    if (ok) { onSaved(); onClose() }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Adicionar atividade gratificada</h2><button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Atividade</label><select className="form-select" value={form.atividade} onChange={e => setForm(f => ({ ...f, atividade: e.target.value }))}>{ATIVIDADES_OPCOES.map(a => <option key={a}>{a}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Data de início</label><input className="form-input" type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
        </div>
        <div className="modal-footer"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Adicionar'}</button></div>
      </div>
    </div>
  )
}

// Modal: Novo contrato
function ModalContrato({ professorId, onClose, onSaved }) {
  const [form, setForm] = useState({ tipo: 'Determinado', semestre: '2025.1', data_inicio: new Date().toISOString().split('T')[0], data_fim: '', observacoes: '' })
  const [saving, setSaving] = useState(false)
  async function handleSave() {
    if (!form.data_inicio) return
    setSaving(true)
    const ok = await addContrato({ ...form, professor_id: professorId, status: 'ativo', renovacoes: 0, data_fim: form.data_fim || null })
    setSaving(false)
    if (ok) { onSaved(); onClose() }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Novo contrato</h2><button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button></div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Tipo</label><select className="form-select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>{['Determinado', 'Indeterminado', 'Experiência'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Semestre</label><input className="form-input" value={form.semestre} onChange={e => setForm(f => ({ ...f, semestre: e.target.value }))} placeholder="2025.1" /></div>
          </div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Data início *</label><input className="form-input" type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Data fim</label><input className="form-input" type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
        </div>
        <div className="modal-footer"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar contrato'}</button></div>
      </div>
    </div>
  )
}

// Modal: Renovar contrato
function ModalRenovar({ contrato, onClose, onSaved }) {
  const [form, setForm] = useState({ data_fim: '', semestre: '' })
  const [saving, setSaving] = useState(false)
  async function handleSave() {
    if (!form.data_fim) return
    setSaving(true)
    const ok = await renovarContrato(contrato.id, form.data_fim, form.semestre)
    setSaving(false)
    if (ok) { onSaved(); onClose() }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Renovar contrato</h2><button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button></div>
        <div className="modal-body">
          <div className="alert alert-amber"><AlertTriangle size={16} /><span>Renovação nº {(contrato.renovacoes || 0) + 1} · Contrato atual vence em {formatDate(contrato.data_fim)}</span></div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Novo semestre</label><input className="form-input" value={form.semestre} onChange={e => setForm(f => ({ ...f, semestre: e.target.value }))} placeholder="2025.2" /></div>
            <div className="form-group"><label className="form-label">Nova data fim *</label><input className="form-input" type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.data_fim}>{saving ? 'Renovando...' : 'Confirmar renovação'}</button></div>
      </div>
    </div>
  )
}

// Botão de adicionar documento
function AddDocProfBtn({ professorId, onAdded }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ tipo: '', descricao: '', status: 'pendente', solicitado_em: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  async function handleAdd() {
    if (!form.tipo) return
    setSaving(true)
    const ok = await addDocumentoProfessor({ ...form, professor_id: professorId })
    setSaving(false)
    if (ok) { setOpen(false); setForm({ tipo: '', descricao: '', status: 'pendente', solicitado_em: new Date().toISOString().split('T')[0] }); onAdded() }
  }
  if (!open) return <button className="btn btn-sm" onClick={() => setOpen(true)}><Plus size={13} /> Adicionar documento</button>
  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Adicionar documento</h2><button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Tipo *</label><input className="form-input" placeholder="ex: Diploma, Contrato, ASO..." value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="pendente">Pendente</option><option value="ok">OK</option></select></div>
            <div className="form-group"><label className="form-label">Data solicitação</label><input className="form-input" type="date" value={form.solicitado_em} onChange={e => setForm(f => ({ ...f, solicitado_em: e.target.value }))} /></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleAdd} disabled={saving || !form.tipo}>{saving ? 'Salvando...' : 'Adicionar'}</button></div>
      </div>
    </div>
  )
}
