import { useState, useEffect, useCallback } from 'react'
import { Plus, Download, Search, GraduationCap, BookOpen, Edit2, Trash2, DollarSign, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const SEMESTRES = ['2024.1','2024.2','2025.1','2025.2','2026.1','2026.2']
const TURNOS = ['Matutino', 'Vespertino', 'Noturno', 'Integral']
const TIPOS_DISC = ['regular', 'adaptacao', 'dependencia', 'especial', 'ferias', 'isolada', 'optativa']
const MODALIDADES = ['Presencial', 'EAD', 'Híbrido']
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const SEMANAS_LETIVAS = 18.75
const FATOR_MENSAL = 4.5

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function DistribuicaoSemestral() {
  const [semestre, setSemestre] = useState('2025.1')
  const [visao, setVisao] = useState('professor')
  const [busca, setBusca] = useState('')
  const [dados, setDados] = useState([])
  const [atividades, setAtividades] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalAtiv, setModalAtiv] = useState(false)
  const [editando, setEditando] = useState(null)
  const [professores, setProfessores] = useState([])
  const [disciplinasMatriz, setDisciplinasMatriz] = useState([])
  const [valoresHora, setValoresHora] = useState([])

  const fetchDados = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('distribuicao_semestral').select('*').eq('semestre', semestre).eq('status', 'ativo').order('professor_nome')
    if (busca) q = q.or(`professor_nome.ilike.%${busca}%,curso.ilike.%${busca}%,disciplina_nome.ilike.%${busca}%`)
    const { data } = await q
    setDados(data || [])

    const { data: atv } = await supabase.from('atividades_complementares').select('*').eq('semestre', semestre).eq('status', 'ativo').order('professor_nome')
    setAtividades(atv || [])
    setLoading(false)
  }, [semestre, busca])

  useEffect(() => { fetchDados() }, [fetchDados])

  useEffect(() => {
    supabase.from('professores').select('id, nome, titulacao, valor_hora_teorica, valor_hora_pratica, curso_principal').eq('ativo', true).order('nome').then(({ data }) => setProfessores(data || []))
    supabase.from('disciplinas_matriz').select('*, matrizes_curriculares(curso, versao, status)').eq('ativo', true).order('nome').then(({ data }) => setDisciplinasMatriz(data || []))
    supabase.from('historico_valor_hora').select('*').eq('vigente', true).then(({ data }) => setValoresHora(data || []))
  }, [])

  // Agrupa por professor
  const porProfessor = dados.reduce((acc, d) => {
    if (!acc[d.professor_nome]) acc[d.professor_nome] = { nome: d.professor_nome, titulacao: d.professor_titulacao, disciplinas: [], atividades: [] }
    acc[d.professor_nome].disciplinas.push(d)
    return acc
  }, {})
  atividades.forEach(a => {
    if (!porProfessor[a.professor_nome]) porProfessor[a.professor_nome] = { nome: a.professor_nome, titulacao: '', disciplinas: [], atividades: [] }
    porProfessor[a.professor_nome].atividades.push(a)
  })

  // Agrupa por curso
  const porCurso = dados.reduce((acc, d) => {
    if (!acc[d.curso]) acc[d.curso] = { curso: d.curso, disciplinas: [] }
    acc[d.curso].disciplinas.push(d)
    return acc
  }, {})

  // Totais
  const chSemanalTotal = dados.reduce((s, d) => s + (d.ch_semanal || 0), 0)
  const chMensalTotal = dados.reduce((s, d) => s + (d.ch_mensal || 0), 0)
  const custoMensalTotal = dados.reduce((s, d) => s + (d.valor_mensal || 0), 0) + atividades.reduce((s, a) => s + (a.valor_mensal || 0), 0)
  const custoSemestralTotal = dados.reduce((s, d) => s + (d.valor_semestral || 0), 0) + atividades.reduce((s, a) => s + (a.valor_semestral || 0), 0)

  async function handleDelete(id) {
    if (!confirm('Excluir este lançamento?')) return
    await supabase.from('distribuicao_semestral').delete().eq('id', id)
    toast.success('Excluído!')
    fetchDados()
  }

  async function handleDeleteAtiv(id) {
    if (!confirm('Excluir esta atividade?')) return
    await supabase.from('atividades_complementares').delete().eq('id', id)
    toast.success('Excluído!')
    fetchDados()
  }

  function exportarCSV() {
    const headers = 'Professor;Titulação;Curso;Disciplina;Turma;Período;Turno;CH Semestral;CH Semanal;CH Mensal;Valor H/h;Valor Mensal;Valor Semestral;Modalidade'
    const rows = dados.map(d =>
      `${d.professor_nome};${d.professor_titulacao};${d.curso};${d.disciplina_nome};${d.turma||''};${d.periodo||''};${d.turno||''};${d.ch_semestral};${(d.ch_semanal||0).toFixed(2)};${(d.ch_mensal||0).toFixed(2)};${d.professor_valor_hora||0};${(d.valor_mensal||0).toFixed(2)};${(d.valor_semestral||0).toFixed(2)};${d.modalidade}`
    ).join('\n')
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `Distribuicao_${semestre}.csv`; a.click()
    toast.success('Exportado!')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Distribuição de CH</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            Atribuição de disciplinas por professor — {SEMANAS_LETIVAS} semanas letivas · fator {FATOR_MENSAL}×
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={exportarCSV}><Download size={13} /> CSV</button>
          <button className="btn" onClick={() => { setEditando(null); setModalAtiv(true) }}>
            <Plus size={13} /> Atividade complementar
          </button>
          <button className="btn btn-primary" onClick={() => { setEditando(null); setModalAberto(true) }}>
            <Plus size={13} /> Nova disciplina
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-select" style={{ width: 'auto' }} value={semestre} onChange={e => setSemestre(e.target.value)}>
          {SEMESTRES.map(s => <option key={s}>{s}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Buscar professor, curso ou disciplina..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 3, background: 'var(--gray-100)', borderRadius: 8, padding: 3 }}>
          {[['professor', 'Por Professor'], ['curso', 'Por Curso']].map(([v, l]) => (
            <button key={v} onClick={() => setVisao(v)} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 12, fontFamily: 'var(--font)', fontWeight: 500,
              background: visao === v ? 'white' : 'transparent',
              color: visao === v ? 'var(--gray-900)' : 'var(--gray-500)',
              boxShadow: visao === v ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'CH semanal total', valor: `${chSemanalTotal.toFixed(1)}h/sem`, cor: 'var(--blue)' },
          { label: 'CH mensal total', valor: `${chMensalTotal.toFixed(1)}h/mês`, cor: 'var(--blue)' },
          { label: 'Custo mensal', valor: fmt(custoMensalTotal), cor: 'var(--green)' },
          { label: 'Custo semestral', valor: fmt(custoSemestralTotal), cor: 'var(--green)' },
          { label: 'Professores', valor: Object.keys(porProfessor).length, cor: 'var(--blue)' },
          { label: 'Disciplinas', valor: dados.length, cor: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: s.cor }}>{s.valor}</div>
          </div>
        ))}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : Object.keys(porProfessor).length === 0 && dados.length === 0 ? (
        <div className="card empty-state" style={{ padding: 48 }}>
          <BookOpen size={32} strokeWidth={1} />
          <p>Nenhum lançamento para {semestre}. Clique em "Nova disciplina"!</p>
        </div>
      ) : visao === 'professor' ? (
        Object.values(porProfessor).map(grupo => {
          const chSem = grupo.disciplinas.reduce((s, d) => s + (d.ch_semanal || 0), 0)
          const chMes = grupo.disciplinas.reduce((s, d) => s + (d.ch_mensal || 0), 0)
          const custoDisc = grupo.disciplinas.reduce((s, d) => s + (d.valor_mensal || 0), 0)
          const custoAtiv = grupo.atividades.reduce((s, a) => s + (a.valor_mensal || 0), 0)
          const custoTotal = custoDisc + custoAtiv
          const sobrecarga = chSem > 20

          return (
            <div key={grupo.nome} style={{ marginBottom: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: sobrecarga ? 'var(--red)' : 'var(--blue)',
                borderRadius: '8px 8px 0 0', flexWrap: 'wrap', gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GraduationCap size={16} color="white" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{grupo.nome}</span>
                  {grupo.titulacao && <span className="badge" style={{ background: 'rgba(255,255,255,.2)', color: 'white', fontSize: 10 }}>{grupo.titulacao}</span>}
                  {sobrecarga && <span className="badge" style={{ background: '#ffeeee', color: 'var(--red)', fontSize: 10 }}>⚠ Sobrecarga</span>}
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase' }}>CH Mensal</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#FFB640' }}>{chMes.toFixed(1)}h</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase' }}>Valor Mensal</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#FFB640' }}>{fmt(custoTotal)}</div>
                  </div>
                </div>
              </div>
              <div className="card" style={{ borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                {grupo.disciplinas.length > 0 && (
                  <table className="table">
                    <thead><tr>
                      <th>Disciplina</th><th>Curso</th><th>Turma</th><th>Per.</th><th>Turno</th>
                      <th>CH Sem.</th><th>CH/sem</th><th>CH/mês</th><th>H/h</th><th>Valor/mês</th><th>Valor sem.</th><th>Tipo</th><th></th>
                    </tr></thead>
                    <tbody>
                      {grupo.disciplinas.map(d => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 500 }}>{d.disciplina_nome}</td>
                          <td style={{ fontSize: 12 }}>{d.curso}</td>
                          <td style={{ fontSize: 12 }}>{d.turma || '—'}</td>
                          <td style={{ fontSize: 12 }}>{d.periodo ? `${d.periodo}º` : '—'}</td>
                          <td style={{ fontSize: 12 }}>{d.turno || '—'}</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{d.ch_semestral}h</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{(d.ch_semanal||0).toFixed(2)}h</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{(d.ch_mensal||0).toFixed(2)}h</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(d.professor_valor_hora)}</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>{fmt(d.valor_mensal)}</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(d.valor_semestral)}</td>
                          <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{d.tipo_disciplina}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-sm" onClick={() => { setEditando(d); setModalAberto(true) }}><Edit2 size={11} /></button>
                              <button className="btn btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(d.id)}><Trash2 size={11} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--gray-50)' }}>
                        <td colSpan={6} style={{ padding: '8px 14px', fontWeight: 600, fontSize: 12 }}>Subtotal disciplinas</td>
                        <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>{chSem.toFixed(2)}h</td>
                        <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>{chMes.toFixed(2)}h</td>
                        <td />
                        <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{fmt(custoDisc)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                )}
                {/* Atividades complementares */}
                {grupo.atividades.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--gray-100)' }}>
                    <div style={{ padding: '6px 14px', background: 'var(--gray-50)', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
                      Atividades complementares
                    </div>
                    <table className="table">
                      <tbody>
                        {grupo.atividades.map(a => (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 500 }}>{a.descricao || a.tipo}</td>
                            <td><span className="badge badge-purple" style={{ fontSize: 10 }}>{a.tipo.replace(/_/g, ' ')}</span></td>
                            <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{a.ch_mensal > 0 ? `${a.ch_mensal}h/mês` : '—'}</td>
                            <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>{fmt(a.valor_mensal)}</td>
                            <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(a.valor_semestral)}</td>
                            <td colSpan={8} />
                            <td>
                              <button className="btn btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDeleteAtiv(a.id)}><Trash2 size={11} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--gray-50)' }}>
                          <td colSpan={3} style={{ padding: '8px 14px', fontWeight: 600, fontSize: 12 }}>Total atividades</td>
                          <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{fmt(custoAtiv)}</td>
                          <td colSpan={9} />
                        </tr>
                        <tr style={{ background: 'var(--blue-light)' }}>
                          <td colSpan={3} style={{ padding: '8px 14px', fontWeight: 700, fontSize: 13, color: 'var(--blue)' }}>TOTAL GERAL — {grupo.nome}</td>
                          <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: 'var(--blue)' }}>{fmt(custoTotal)}</td>
                          <td colSpan={9} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                {grupo.atividades.length === 0 && grupo.disciplinas.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--gray-100)', padding: '8px 14px', background: 'var(--blue-light)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>TOTAL — {grupo.nome}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{fmt(custoTotal)}/mês</span>
                  </div>
                )}
              </div>
            </div>
          )
        })
      ) : (
        // VISÃO POR CURSO
        Object.values(porCurso).map(grupo => {
          const chMes = grupo.disciplinas.reduce((s, d) => s + (d.ch_mensal || 0), 0)
          const custo = grupo.disciplinas.reduce((s, d) => s + (d.valor_mensal || 0), 0)
          return (
            <div key={grupo.curso} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#1a3a6e', borderRadius: '8px 8px 0 0', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BookOpen size={16} color="white" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{grupo.curso}</span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,.2)', color: 'white', fontSize: 10 }}>{grupo.disciplinas.length} disciplinas</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase' }}>CH Mensal</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#FFB640' }}>{chMes.toFixed(1)}h</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase' }}>Custo Mensal</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#FFB640' }}>{fmt(custo)}</div>
                  </div>
                </div>
              </div>
              <div className="card" style={{ borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                <table className="table">
                  <thead><tr>
                    <th>Professor</th><th>Titulação</th><th>Disciplina</th><th>Turma</th><th>Per.</th>
                    <th>CH Sem.</th><th>CH/mês</th><th>Valor/mês</th><th></th>
                  </tr></thead>
                  <tbody>
                    {grupo.disciplinas.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 500, fontSize: 12 }}>{d.professor_nome}</td>
                        <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{d.professor_titulacao}</span></td>
                        <td style={{ fontWeight: 500 }}>{d.disciplina_nome}</td>
                        <td style={{ fontSize: 12 }}>{d.turma || '—'}</td>
                        <td style={{ fontSize: 12 }}>{d.periodo ? `${d.periodo}º` : '—'}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{d.ch_semestral}h</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{(d.ch_mensal||0).toFixed(2)}h</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>{fmt(d.valor_mensal)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm" onClick={() => { setEditando(d); setModalAberto(true) }}><Edit2 size={11} /></button>
                            <button className="btn btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(d.id)}><Trash2 size={11} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--blue-light)' }}>
                      <td colSpan={6} style={{ padding: '8px 14px', fontWeight: 700, color: 'var(--blue)' }}>Total — {grupo.curso}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{chMes.toFixed(2)}h</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{fmt(custo)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )
        })
      )}

      {modalAberto && (
        <ModalLancamento dados={editando} semestre={semestre} professores={professores} disciplinasMatriz={disciplinasMatriz} valoresHora={valoresHora} onClose={() => { setModalAberto(false); setEditando(null) }} onSaved={() => { setModalAberto(false); setEditando(null); fetchDados() }} />
      )}
      {modalAtiv && (
        <ModalAtividade semestre={semestre} professores={professores} onClose={() => setModalAtiv(false)} onSaved={() => { setModalAtiv(false); fetchDados() }} />
      )}
    </div>
  )
}

function ModalLancamento({ dados, semestre, professores, disciplinasMatriz, valoresHora, onClose, onSaved }) {
  const isEdit = !!dados?.id
  const [form, setForm] = useState({
    semestre: dados?.semestre || semestre,
    professor_id: dados?.professor_id || '',
    professor_nome: dados?.professor_nome || '',
    professor_titulacao: dados?.professor_titulacao || '',
    professor_valor_hora: dados?.professor_valor_hora || '',
    disciplina_id: dados?.disciplina_id || '',
    disciplina_nome: dados?.disciplina_nome || '',
    curso: dados?.curso || '',
    periodo: dados?.periodo || '',
    turno: dados?.turno || '',
    turma: dados?.turma || '',
    ch_semestral: dados?.ch_semestral || 60,
    semanas: dados?.semanas || 18.75,
    tipo_disciplina: dados?.tipo_disciplina || 'regular',
    modalidade: dados?.modalidade || 'Presencial',
    sala: dados?.sala || '',
    dia_semana: dados?.dia_semana || '',
    horario_inicio: dados?.horario_inicio || '',
    horario_fim: dados?.horario_fim || '',
    observacoes: dados?.observacoes || '',
    status: dados?.status || 'ativo',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Cálculos automáticos
  const chSemanal = form.ch_semestral && form.semanas ? (form.ch_semestral / form.semanas).toFixed(2) : 0
  const chMensal = chSemanal ? (chSemanal * 4.5).toFixed(2) : 0
  const valorMensal = chMensal && form.professor_valor_hora ? (chMensal * form.professor_valor_hora).toFixed(2) : 0
  const valorSemestral = form.ch_semestral && form.professor_valor_hora ? (form.ch_semestral * form.professor_valor_hora).toFixed(2) : 0

  // Ao selecionar professor — preenche titulação e valor hora
  function onSelectProfessor(profId) {
    const prof = professores.find(p => p.id === profId)
    if (!prof) return
    set('professor_id', profId)
    set('professor_nome', prof.nome)
    set('professor_titulacao', prof.titulacao || '')
    // Busca valor hora pelo semestre e titulação
    const vh = valoresHora.find(v => v.titulacao === prof.titulacao)
    set('professor_valor_hora', vh?.valor_hora_teorica || prof.valor_hora_teorica || '')
    if (prof.curso_principal && !form.curso) set('curso', prof.curso_principal)
  }

  // Ao selecionar disciplina da matriz
  function onSelectDisc(discId) {
    const disc = disciplinasMatriz.find(d => d.id === discId)
    if (!disc) return
    set('disciplina_id', discId)
    set('disciplina_nome', disc.nome)
    set('ch_semestral', disc.ch_semestral)
    set('periodo', disc.periodo)
    set('tipo_disciplina', disc.tipo)
    if (disc.matrizes_curriculares?.curso) set('curso', disc.matrizes_curriculares.curso)
  }

  async function handleSave() {
    if (!form.professor_nome || !form.disciplina_nome || !form.curso) {
      toast.error('Preencha professor, disciplina e curso.')
      return
    }
    setSaving(true)
    const payload = {
      semestre: form.semestre,
      professor_id: form.professor_id || null,
      professor_nome: form.professor_nome,
      professor_titulacao: form.professor_titulacao,
      professor_valor_hora: parseFloat(form.professor_valor_hora) || null,
      disciplina_id: form.disciplina_id || null,
      disciplina_nome: form.disciplina_nome,
      curso: form.curso,
      periodo: form.periodo ? parseInt(form.periodo) : null,
      turno: form.turno || null,
      turma: form.turma || null,
      ch_semestral: parseFloat(form.ch_semestral) || 0,
      semanas: parseFloat(form.semanas) || 18.75,
      tipo_disciplina: form.tipo_disciplina,
      modalidade: form.modalidade,
      sala: form.sala || null,
      dia_semana: form.dia_semana || null,
      horario_inicio: form.horario_inicio || null,
      horario_fim: form.horario_fim || null,
      observacoes: form.observacoes || null,
      status: form.status,
    }
    if (isEdit) {
      const { error } = await supabase.from('distribuicao_semestral').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', dados.id)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      toast.success('Atualizado!')
    } else {
      const { error } = await supabase.from('distribuicao_semestral').insert(payload)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      toast.success('Lançamento criado!')
    }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar lançamento' : 'Nova atribuição de disciplina'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          {/* Semestre */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Semestre *</label>
              <select className="form-select" value={form.semestre} onChange={e => set('semestre', e.target.value)}>
                {SEMESTRES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Semanas letivas</label>
              <input className="form-input" type="number" step="0.25" value={form.semanas} onChange={e => set('semanas', e.target.value)} />
            </div>
          </div>

          {/* Professor */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Professor</div>
          <div className="form-group">
            <label className="form-label">Selecionar professor cadastrado</label>
            <select className="form-select" value={form.professor_id} onChange={e => onSelectProfessor(e.target.value)}>
              <option value="">Selecione...</option>
              {professores.map(p => <option key={p.id} value={p.id}>{p.nome} — {p.titulacao}</option>)}
            </select>
          </div>
          <div className="form-grid-3">
            <div className="form-group" style={{ gridColumn: '1/2' }}>
              <label className="form-label">Nome do professor *</label>
              <input className="form-input" value={form.professor_nome} onChange={e => set('professor_nome', e.target.value)} placeholder="Ou digite manualmente" />
            </div>
            <div className="form-group">
              <label className="form-label">Titulação</label>
              <select className="form-select" value={form.professor_titulacao} onChange={e => {
                set('professor_titulacao', e.target.value)
                const vh = valoresHora.find(v => v.titulacao === e.target.value)
                if (vh) set('professor_valor_hora', vh.valor_hora_teorica)
              }}>
                <option value="">Selecione</option>
                <option value="Especialista">Especialista</option>
                <option value="Mestre">Mestre</option>
                <option value="Doutor">Doutor</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Valor hora-aula (R$)</label>
              <input className="form-input" type="number" step="0.01" value={form.professor_valor_hora} onChange={e => set('professor_valor_hora', e.target.value)} placeholder="Ex: 49,90" />
            </div>
          </div>

          {/* Disciplina */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Disciplina</div>
          <div className="form-group">
            <label className="form-label">Selecionar da matriz curricular</label>
            <select className="form-select" value={form.disciplina_id} onChange={e => onSelectDisc(e.target.value)}>
              <option value="">Selecione ou preencha abaixo...</option>
              {[...new Set(disciplinasMatriz.map(d => d.matrizes_curriculares?.curso))].filter(Boolean).sort().map(curso => (
                <optgroup key={curso} label={curso}>
                  {disciplinasMatriz.filter(d => d.matrizes_curriculares?.curso === curso).map(d => (
                    <option key={d.id} value={d.id}>{d.nome} — {d.ch_semestral}h ({d.periodo}º período)</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Nome da disciplina *</label>
              <input className="form-input" value={form.disciplina_nome} onChange={e => set('disciplina_nome', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Curso *</label>
              <input className="form-input" value={form.curso} onChange={e => set('curso', e.target.value)} />
            </div>
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">CH Semestral (h) *</label>
              <input className="form-input" type="number" step="5" value={form.ch_semestral} onChange={e => set('ch_semestral', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Período</label>
              <input className="form-input" type="number" min="1" max="12" value={form.periodo} onChange={e => set('periodo', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Turma</label>
              <input className="form-input" value={form.turma} onChange={e => set('turma', e.target.value)} placeholder="Ex: DIR-A" />
            </div>
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Turno</label>
              <select className="form-select" value={form.turno} onChange={e => set('turno', e.target.value)}>
                <option value="">Selecione</option>
                {TURNOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo disciplina</label>
              <select className="form-select" value={form.tipo_disciplina} onChange={e => set('tipo_disciplina', e.target.value)}>
                {TIPOS_DISC.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Modalidade</label>
              <select className="form-select" value={form.modalidade} onChange={e => set('modalidade', e.target.value)}>
                {MODALIDADES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Cálculo automático */}
          {form.ch_semestral > 0 && (
            <div style={{ background: 'var(--blue-light)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 8, textTransform: 'uppercase' }}>Cálculo automático</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: `CH Semanal (÷${form.semanas})`, valor: `${chSemanal}h/sem` },
                  { label: `CH Mensal (×4,5)`, valor: `${chMensal}h/mês` },
                  { label: `Valor mensal`, valor: fmt(valorMensal) },
                  { label: `Valor semestral`, valor: fmt(valorSemestral) },
                ].map(c => (
                  <div key={c.label}>
                    <div style={{ fontSize: 10, color: 'var(--blue)', opacity: .7 }}>{c.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)' }}>{c.valor}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Horário */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Horário e local (opcional)</div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Dia da semana</label>
              <select className="form-select" value={form.dia_semana} onChange={e => set('dia_semana', e.target.value)}>
                <option value="">Selecione</option>
                {DIAS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Início</label>
              <input className="form-input" type="time" value={form.horario_inicio} onChange={e => set('horario_inicio', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Fim</label>
              <input className="form-input" type="time" value={form.horario_fim} onChange={e => set('horario_fim', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Sala / Ambiente</label>
            <input className="form-input" value={form.sala} onChange={e => set('sala', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar lançamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalAtividade({ semestre, professores, onClose, onSaved }) {
  const TIPOS = [
    { value: 'supervisao_estagio', label: 'Supervisão de estágio' },
    { value: 'preceptoria_estagio', label: 'Preceptoria de estágio' },
    { value: 'preceptoria_extensao', label: 'Preceptoria de extensão' },
    { value: 'orientacao_tcc', label: 'Orientação de TCC' },
    { value: 'coordenacao_projeto', label: 'Coordenação de projeto' },
    { value: 'bolsa_institucional', label: 'Bolsa institucional' },
    { value: 'outro', label: 'Outra atividade' },
  ]
  const [form, setForm] = useState({
    semestre, professor_id: '', professor_nome: '',
    tipo: 'supervisao_estagio', descricao: '',
    valor_mensal: '', valor_semestral: '', ch_mensal: '', status: 'ativo',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.professor_nome || !form.tipo) { toast.error('Preencha professor e tipo.'); return }
    setSaving(true)
    const { error } = await supabase.from('atividades_complementares').insert({
      ...form,
      professor_id: form.professor_id || null,
      valor_mensal: parseFloat(form.valor_mensal) || 0,
      valor_semestral: parseFloat(form.valor_semestral) || 0,
      ch_mensal: parseFloat(form.ch_mensal) || 0,
      descricao: form.descricao || null,
    })
    if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
    toast.success('Atividade registrada!')
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nova atividade complementar</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Professor *</label>
            <select className="form-select" value={form.professor_id} onChange={e => {
              const prof = professores.find(p => p.id === e.target.value)
              set('professor_id', e.target.value)
              if (prof) set('professor_nome', prof.nome)
            }}>
              <option value="">Selecione...</option>
              {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <input className="form-input" style={{ marginTop: 6 }} placeholder="Ou digite o nome" value={form.professor_nome} onChange={e => set('professor_nome', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de atividade *</label>
            <select className="form-select" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input className="form-input" value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Detalhes da atividade..." />
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">CH mensal (h)</label>
              <input className="form-input" type="number" step="0.5" value={form.ch_mensal} onChange={e => set('ch_mensal', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Valor mensal (R$)</label>
              <input className="form-input" type="number" step="0.01" value={form.valor_mensal} onChange={e => set('valor_mensal', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Valor semestral (R$)</label>
              <input className="form-input" type="number" step="0.01" value={form.valor_semestral} onChange={e => set('valor_semestral', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</button>
        </div>
      </div>
    </div>
  )
}
