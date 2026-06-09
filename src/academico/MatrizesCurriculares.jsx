import { useState, useEffect, useCallback } from 'react'
import { Plus, BookOpen, Edit2, Trash2, ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const TURNOS = ['Matutino', 'Vespertino', 'Noturno', 'Integral', 'EAD']
const MODALIDADES = ['Presencial', 'EAD', 'Híbrido']
const TIPOS_DISC = ['regular', 'adaptacao', 'dependencia', 'especial', 'ferias', 'isolada', 'optativa']
const SEMESTRES = ['2024.1','2024.2','2025.1','2025.2','2026.1','2026.2']

export default function MatrizesCurriculares() {
  const [matrizes, setMatrizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandida, setExpandida] = useState(null)
  const [disciplinas, setDisciplinas] = useState({})
  const [modalMatriz, setModalMatriz] = useState(false)
  const [modalDisc, setModalDisc] = useState(null) // matrizId
  const [editMatriz, setEditMatriz] = useState(null)
  const [editDisc, setEditDisc] = useState(null)

  const fetchMatrizes = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('matrizes_curriculares').select('*').order('curso').order('versao', { ascending: false })
    setMatrizes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMatrizes() }, [fetchMatrizes])

  async function fetchDisciplinas(matrizId) {
    const { data } = await supabase.from('disciplinas_matriz').select('*').eq('matriz_id', matrizId).order('periodo').order('nome')
    setDisciplinas(prev => ({ ...prev, [matrizId]: data || [] }))
  }

  function toggleExpand(id) {
    if (expandida === id) { setExpandida(null); return }
    setExpandida(id)
    if (!disciplinas[id]) fetchDisciplinas(id)
  }

  async function deleteMatriz(id) {
    if (!confirm('Excluir esta matriz? As disciplinas também serão excluídas.')) return
    await supabase.from('matrizes_curriculares').delete().eq('id', id)
    toast.success('Matriz excluída!')
    fetchMatrizes()
  }

  async function deleteDisc(id, matrizId) {
    if (!confirm('Excluir esta disciplina?')) return
    await supabase.from('disciplinas_matriz').delete().eq('id', id)
    toast.success('Disciplina excluída!')
    fetchDisciplinas(matrizId)
  }

  // Agrupa matrizes por curso
  const porCurso = matrizes.reduce((acc, m) => {
    if (!acc[m.curso]) acc[m.curso] = []
    acc[m.curso].push(m)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Matrizes Curriculares</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>Cadastro e versionamento das matrizes por curso</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditMatriz(null); setModalMatriz(true) }}>
          <Plus size={13} /> Nova matriz
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : Object.keys(porCurso).length === 0 ? (
        <div className="card empty-state" style={{ padding: 48 }}>
          <BookOpen size={32} strokeWidth={1} />
          <p>Nenhuma matriz cadastrada. Clique em "Nova matriz"!</p>
        </div>
      ) : (
        Object.entries(porCurso).map(([curso, versoes]) => (
          <div key={curso} style={{ marginBottom: 16 }}>
            <div style={{ padding: '8px 14px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{curso}</span>
              <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 8 }}>{versoes.length} versão(ões)</span>
            </div>
            {versoes.map(m => (
              <div key={m.id} className="card" style={{ marginBottom: 8, overflow: 'hidden' }}>
                {/* Header da matriz */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', gap: 10 }} onClick={() => toggleExpand(m.id)}>
                  {expandida === m.id ? <ChevronDown size={16} color="var(--gray-400)" /> : <ChevronRight size={16} color="var(--gray-400)" />}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Versão {m.versao}</span>
                      <span className={`badge ${m.status === 'ativa' ? 'badge-green' : m.status === 'em_revisao' ? 'badge-amber' : 'badge-gray'}`}>
                        {m.status === 'ativa' ? 'Ativa' : m.status === 'em_revisao' ? 'Em revisão' : 'Inativa'}
                      </span>
                      <span className="badge badge-blue">{m.turno}</span>
                      <span className="badge badge-gray">{m.modalidade}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                      {m.carga_horaria_total}h totais · {m.duracao_semestres} semestres · Implantação {m.ano_implantacao}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm" onClick={() => { setEditMatriz(m); setModalMatriz(true) }}><Edit2 size={11} /></button>
                    <button className="btn btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteMatriz(m.id)}><Trash2 size={11} /></button>
                    <button className="btn btn-sm btn-primary" onClick={() => { setModalDisc(m.id); setEditDisc(null) }}>
                      <Plus size={11} /> Disciplina
                    </button>
                  </div>
                </div>

                {/* Disciplinas expandidas */}
                {expandida === m.id && (
                  <div style={{ borderTop: '1px solid var(--gray-100)' }}>
                    {!disciplinas[m.id] ? (
                      <div style={{ padding: 20, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
                    ) : disciplinas[m.id].length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--gray-400)' }}>
                        Nenhuma disciplina cadastrada. Clique em "+ Disciplina".
                      </div>
                    ) : (
                      <table className="table">
                        <thead><tr>
                          <th>Código</th><th>Disciplina</th><th>Período</th><th>CH Semestral</th>
                          <th>CH Teórica</th><th>CH Prática</th><th>CH Estágio</th><th>Tipo</th><th></th>
                        </tr></thead>
                        <tbody>
                          {/* Agrupa por período */}
                          {[...new Set(disciplinas[m.id].map(d => d.periodo))].sort((a,b) => a-b).map(per => (
                            disciplinas[m.id].filter(d => d.periodo === per).map((d, i) => (
                              <tr key={d.id}>
                                {i === 0 && (
                                  <td rowSpan={disciplinas[m.id].filter(x => x.periodo === per).length}
                                    style={{ background: 'var(--gray-50)', fontWeight: 700, fontSize: 12, color: 'var(--blue)', width: 60 }}>
                                    {per}º sem
                                  </td>
                                )}
                                <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{d.codigo || '—'}</td>
                                <td style={{ fontWeight: 500 }}>{d.nome}</td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{d.ch_semestral}h</td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{d.ch_teorica}h</td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{d.ch_pratica}h</td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{d.ch_estagio}h</td>
                                <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{d.tipo}</span></td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-sm" onClick={() => { setEditDisc(d); setModalDisc(m.id) }}><Edit2 size={11} /></button>
                                    <button className="btn btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteDisc(d.id, m.id)}><Trash2 size={11} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: 'var(--gray-50)' }}>
                            <td colSpan={3} style={{ padding: '8px 14px', fontWeight: 600, fontSize: 12 }}>Total</td>
                            <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                              {disciplinas[m.id].reduce((s, d) => s + (d.ch_semestral || 0), 0)}h
                            </td>
                            <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12 }}>
                              {disciplinas[m.id].reduce((s, d) => s + (d.ch_teorica || 0), 0)}h
                            </td>
                            <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12 }}>
                              {disciplinas[m.id].reduce((s, d) => s + (d.ch_pratica || 0), 0)}h
                            </td>
                            <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12 }}>
                              {disciplinas[m.id].reduce((s, d) => s + (d.ch_estagio || 0), 0)}h
                            </td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}

      {/* Modal Matriz */}
      {modalMatriz && <ModalMatriz dados={editMatriz} onClose={() => setModalMatriz(false)} onSaved={() => { setModalMatriz(false); fetchMatrizes() }} />}

      {/* Modal Disciplina */}
      {modalDisc && <ModalDisciplina matrizId={modalDisc} dados={editDisc} onClose={() => { setModalDisc(null); setEditDisc(null) }} onSaved={() => { fetchDisciplinas(modalDisc); setModalDisc(null); setEditDisc(null) }} />}
    </div>
  )
}

function ModalMatriz({ dados, onClose, onSaved }) {
  const isEdit = !!dados?.id
  const [form, setForm] = useState({
    curso: dados?.curso || '', versao: dados?.versao || '',
    ano_implantacao: dados?.ano_implantacao || new Date().getFullYear(),
    carga_horaria_total: dados?.carga_horaria_total || '',
    duracao_semestres: dados?.duracao_semestres || 8,
    turno: dados?.turno || 'Noturno', modalidade: dados?.modalidade || 'Presencial',
    status: dados?.status || 'ativa', observacoes: dados?.observacoes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.curso || !form.versao) { toast.error('Preencha curso e versão.'); return }
    setSaving(true)
    if (isEdit) {
      const { error } = await supabase.from('matrizes_curriculares').update({ ...form, updated_at: new Date().toISOString() }).eq('id', dados.id)
      if (error) { toast.error('Erro ao salvar. Versão pode já existir para este curso.'); setSaving(false); return }
    } else {
      const { error } = await supabase.from('matrizes_curriculares').insert(form)
      if (error) { toast.error('Erro ao salvar. Versão pode já existir para este curso.'); setSaving(false); return }
    }
    toast.success(isEdit ? 'Matriz atualizada!' : 'Matriz criada!')
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar matriz' : 'Nova matriz curricular'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Curso *</label>
              <input className="form-input" value={form.curso} onChange={e => set('curso', e.target.value)} placeholder="Ex: Direito, Administração..." />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Versão *</label>
              <select className="form-select" value={form.versao} onChange={e => set('versao', e.target.value)}>
                <option value="">Selecione</option>
                {SEMESTRES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ano implantação</label>
              <input className="form-input" type="number" value={form.ano_implantacao} onChange={e => set('ano_implantacao', e.target.value)} />
            </div>
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">CH total (h)</label>
              <input className="form-input" type="number" value={form.carga_horaria_total} onChange={e => set('carga_horaria_total', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Duração (semestres)</label>
              <input className="form-input" type="number" min="1" max="12" value={form.duracao_semestres} onChange={e => set('duracao_semestres', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="ativa">Ativa</option>
                <option value="em_revisao">Em revisão</option>
                <option value="inativa">Inativa</option>
              </select>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Turno</label>
              <select className="form-select" value={form.turno} onChange={e => set('turno', e.target.value)}>
                {TURNOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Modalidade</label>
              <select className="form-select" value={form.modalidade} onChange={e => set('modalidade', e.target.value)}>
                {MODALIDADES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}

function ModalDisciplina({ matrizId, dados, onClose, onSaved }) {
  const isEdit = !!dados?.id
  const [form, setForm] = useState({
    codigo: dados?.codigo || '',
    nome: dados?.nome || '',
    periodo: dados?.periodo || 1,
    ch_semestral: dados?.ch_semestral || 60,
    ch_teorica: dados?.ch_teorica || 0,
    ch_pratica: dados?.ch_pratica || 0,
    ch_estagio: dados?.ch_estagio || 0,
    tipo: dados?.tipo || 'regular',
    pre_requisitos: dados?.pre_requisitos || '',
    ementa: dados?.ementa || '',
    ativo: dados?.ativo !== false,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Calcula CH semanal estimada (÷ 18,75 semanas)
  const chSemanal = form.ch_semestral ? (form.ch_semestral / 18.75).toFixed(1) : 0
  const chMensal = chSemanal ? (chSemanal * 4.5).toFixed(1) : 0

  async function handleSave() {
    if (!form.nome || !form.periodo || !form.ch_semestral) { toast.error('Preencha nome, período e CH semestral.'); return }
    setSaving(true)
    const payload = { ...form, matriz_id: matrizId, periodo: parseInt(form.periodo), ch_semestral: parseInt(form.ch_semestral), ch_teorica: parseInt(form.ch_teorica) || 0, ch_pratica: parseInt(form.ch_pratica) || 0, ch_estagio: parseInt(form.ch_estagio) || 0 }
    if (isEdit) {
      const { error } = await supabase.from('disciplinas_matriz').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', dados.id)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
    } else {
      const { error } = await supabase.from('disciplinas_matriz').insert(payload)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
    }
    toast.success(isEdit ? 'Disciplina atualizada!' : 'Disciplina adicionada!')
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar disciplina' : 'Nova disciplina'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Código</label>
              <input className="form-input" value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="Ex: DIR-301" />
            </div>
            <div className="form-group">
              <label className="form-label">Período *</label>
              <input className="form-input" type="number" min="1" max="12" value={form.periodo} onChange={e => set('periodo', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nome da disciplina *</label>
            <input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo da disciplina" />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS_DISC.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">CH Semestral (h) *</label>
              <input className="form-input" type="number" value={form.ch_semestral} onChange={e => set('ch_semestral', e.target.value)} />
            </div>
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">CH Teórica</label>
              <input className="form-input" type="number" value={form.ch_teorica} onChange={e => set('ch_teorica', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">CH Prática</label>
              <input className="form-input" type="number" value={form.ch_pratica} onChange={e => set('ch_pratica', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">CH Estágio</label>
              <input className="form-input" type="number" value={form.ch_estagio} onChange={e => set('ch_estagio', e.target.value)} />
            </div>
          </div>
          {form.ch_semestral > 0 && (
            <div style={{ background: 'var(--blue-light)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 24 }}>
              <div><span style={{ fontSize: 11, color: 'var(--blue)' }}>CH Semanal (÷18,75)</span><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)' }}>{chSemanal}h/sem</div></div>
              <div><span style={{ fontSize: 11, color: 'var(--blue)' }}>CH Mensal (×4,5)</span><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)' }}>{chMensal}h/mês</div></div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Pré-requisitos</label>
            <input className="form-input" value={form.pre_requisitos} onChange={e => set('pre_requisitos', e.target.value)} placeholder="Ex: DIR-201, ADM-101..." />
          </div>
          <div className="form-group">
            <label className="form-label">Ementa (resumo)</label>
            <textarea className="form-textarea" value={form.ementa} onChange={e => set('ementa', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}
