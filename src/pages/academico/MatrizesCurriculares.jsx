import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, BookOpen, Edit2, Trash2, ChevronDown, ChevronRight, Upload, FileText, Download, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

const TURNOS = ['Matutino', 'Vespertino', 'Noturno', 'Integral', 'EAD']
const MODALIDADES = ['Presencial', 'EAD', 'Híbrido']
const TIPOS_DISC = ['regular', 'adaptacao', 'dependencia', 'especial', 'ferias', 'isolada', 'optativa']
const SEMESTRES = ['2024.1','2024.2','2025.1','2025.2','2026.1','2026.2']

export default function MatrizesCurriculares() {
  const { user } = useAuth()
  const [matrizes, setMatrizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandida, setExpandida] = useState(null)
  const [disciplinas, setDisciplinas] = useState({})
  const [arquivos, setArquivos] = useState({})
  const [modalMatriz, setModalMatriz] = useState(false)
  const [modalDisc, setModalDisc] = useState(null)
  const [editMatriz, setEditMatriz] = useState(null)
  const [editDisc, setEditDisc] = useState(null)
  const [uploadingPDF, setUploadingPDF] = useState(null)
  const [importandoXLS, setImportandoXLS] = useState(null)

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

  async function fetchArquivos(matrizId) {
    const { data } = await supabase.from('uploads_arquivos').select('*').eq('pessoa_id', matrizId).eq('tipo_pessoa', 'matriz').order('created_at', { ascending: false })
    setArquivos(prev => ({ ...prev, [matrizId]: data || [] }))
  }

  function toggleExpand(id) {
    if (expandida === id) { setExpandida(null); return }
    setExpandida(id)
    if (!disciplinas[id]) fetchDisciplinas(id)
    fetchArquivos(id)
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

  // Upload PDF
  async function handleUploadPDF(e, matriz) {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') { toast.error('Apenas PDF!'); return }
    if (file.size > 20 * 1024 * 1024) { toast.error('Máximo 20MB!'); return }
    setUploadingPDF(matriz.id)
    try {
      const path = `matrizes/${matriz.id}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
      const { error: upErr } = await supabase.storage.from('eduhr').upload(path, file, { contentType: 'application/pdf' })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('eduhr').getPublicUrl(path)
      await supabase.from('uploads_arquivos').insert({
        tipo_pessoa: 'matriz', pessoa_id: matriz.id,
        pessoa_nome: `${matriz.curso} — Versão ${matriz.versao}`,
        tipo_documento: 'Matriz Curricular PDF',
        nome_arquivo: file.name, url_arquivo: urlData.publicUrl,
        tamanho_bytes: file.size, mime_type: file.type,
        uploaded_by: user?.email || 'RH'
      })
      toast.success('PDF da matriz enviado!')
      fetchArquivos(matriz.id)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao enviar PDF.')
    } finally {
      setUploadingPDF(null)
      e.target.value = ''
    }
  }

  // Import Excel
  async function handleImportExcel(e, matriz) {
    const file = e.target.files[0]
    if (!file) return
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
    if (!isExcel) { toast.error('Envie um arquivo Excel (.xlsx) ou CSV!'); return }
    setImportandoXLS(matriz.id)
    try {
      // Lê o arquivo como texto (CSV) ou usa xlsx
      const text = await file.text()
      const linhas = text.split('\n').filter(l => l.trim())
      if (linhas.length < 2) { toast.error('Planilha vazia ou sem dados!'); setImportandoXLS(null); return }

      // Detecta separador
      const sep = linhas[0].includes(';') ? ';' : ','
      const headers = linhas[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ''))

      // Mapeia colunas
      const idxNome = headers.findIndex(h => h.includes('nome') || h.includes('disciplina'))
      const idxPeriodo = headers.findIndex(h => h.includes('período') || h.includes('periodo') || h.includes('semestre'))
      const idxCH = headers.findIndex(h => h.includes('ch') || h.includes('carga') || h.includes('horas'))
      const idxCodigo = headers.findIndex(h => h.includes('código') || h.includes('codigo') || h.includes('cod'))
      const idxTipo = headers.findIndex(h => h.includes('tipo'))
      const idxTeorica = headers.findIndex(h => h.includes('teórica') || h.includes('teorica'))
      const idxPratica = headers.findIndex(h => h.includes('prática') || h.includes('pratica'))

      if (idxNome === -1 || idxPeriodo === -1) {
        toast.error('Planilha precisa ter colunas "nome" e "período"!')
        setImportandoXLS(null)
        return
      }

      const registros = []
      for (let i = 1; i < linhas.length; i++) {
        const cols = linhas[i].split(sep).map(c => c.trim().replace(/"/g, ''))
        const nome = cols[idxNome]
        const periodo = parseInt(cols[idxPeriodo])
        if (!nome || !periodo) continue
        registros.push({
          matriz_id: matriz.id,
          nome,
          periodo,
          codigo: idxCodigo >= 0 ? cols[idxCodigo] || null : null,
          ch_semestral: idxCH >= 0 ? parseInt(cols[idxCH]) || 60 : 60,
          ch_teorica: idxTeorica >= 0 ? parseInt(cols[idxTeorica]) || 0 : 0,
          ch_pratica: idxPratica >= 0 ? parseInt(cols[idxPratica]) || 0 : 0,
          ch_estagio: 0,
          tipo: idxTipo >= 0 && TIPOS_DISC.includes(cols[idxTipo]) ? cols[idxTipo] : 'regular',
          ativo: true,
        })
      }

      if (registros.length === 0) { toast.error('Nenhuma disciplina válida encontrada!'); setImportandoXLS(null); return }

      const { error } = await supabase.from('disciplinas_matriz').insert(registros)
      if (error) throw error
      toast.success(`${registros.length} disciplina(s) importada(s) com sucesso!`)
      fetchDisciplinas(matriz.id)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao importar planilha.')
    } finally {
      setImportandoXLS(null)
      e.target.value = ''
    }
  }

  async function deleteArquivo(arq, matrizId) {
    if (!confirm(`Excluir "${arq.nome_arquivo}"?`)) return
    try {
      const path = arq.url_arquivo.split('/eduhr/')[1]
      if (path) await supabase.storage.from('eduhr').remove([path])
      await supabase.from('uploads_arquivos').delete().eq('id', arq.id)
      toast.success('Arquivo excluído!')
      fetchArquivos(matrizId)
    } catch { toast.error('Erro ao excluir.') }
  }

  function downloadModelo() {
    const csv = 'codigo;nome;periodo;ch_semestral;ch_teorica;ch_pratica;tipo\nDIR-101;Introdução ao Direito;1;60;60;0;regular\nDIR-102;Teoria do Estado;1;60;60;0;regular\nDIR-201;Direito Civil I;2;80;80;0;regular'
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'modelo_matriz.csv'; a.click()
  }

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
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>Cadastro, versionamento e upload das matrizes por curso</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={downloadModelo}>
            <Download size={13} /> Modelo CSV
          </button>
          <button className="btn btn-primary" onClick={() => { setEditMatriz(null); setModalMatriz(true) }}>
            <Plus size={13} /> Nova matriz
          </button>
        </div>
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
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', gap: 10 }} onClick={() => toggleExpand(m.id)}>
                  {expandida === m.id ? <ChevronDown size={16} color="var(--gray-400)" /> : <ChevronRight size={16} color="var(--gray-400)" />}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                    {/* Upload PDF */}
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 7, border: '1px solid var(--gray-200)',
                      background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                      color: 'var(--gray-700)', opacity: uploadingPDF === m.id ? .6 : 1
                    }}>
                      <FileText size={11} color="var(--red)" />
                      {uploadingPDF === m.id ? 'Enviando...' : 'PDF'}
                      <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleUploadPDF(e, m)} disabled={uploadingPDF === m.id} />
                    </label>
                    {/* Import Excel */}
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 7, border: '1px solid var(--gray-200)',
                      background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                      color: 'var(--gray-700)', opacity: importandoXLS === m.id ? .6 : 1
                    }}>
                      <FileSpreadsheet size={11} color="var(--green)" />
                      {importandoXLS === m.id ? 'Importando...' : 'Importar CSV'}
                      <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleImportExcel(e, m)} disabled={importandoXLS === m.id} />
                    </label>
                    <button className="btn btn-sm" onClick={() => { setEditMatriz(m); setModalMatriz(true) }}><Edit2 size={11} /></button>
                    <button className="btn btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteMatriz(m.id)}><Trash2 size={11} /></button>
                    <button className="btn btn-sm btn-primary" onClick={() => { setModalDisc(m.id); setEditDisc(null) }}>
                      <Plus size={11} /> Disciplina
                    </button>
                  </div>
                </div>

                {expandida === m.id && (
                  <div style={{ borderTop: '1px solid var(--gray-100)' }}>
                    {/* Arquivos PDF */}
                    {arquivos[m.id]?.length > 0 && (
                      <div style={{ padding: '10px 14px', background: '#fafafa', borderBottom: '1px solid var(--gray-100)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 8 }}>
                          Documentos anexados
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {arquivos[m.id].map(arq => (
                            <div key={arq.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'white', border: '1px solid var(--gray-200)', borderRadius: 7 }}>
                              <FileText size={14} color="var(--red)" />
                              <span style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{arq.nome_arquivo}</span>
                              <a href={arq.url_arquivo} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ padding: '2px 6px' }}>Ver</a>
                              <button className="btn btn-sm" style={{ padding: '2px 6px', color: 'var(--red)' }} onClick={() => deleteArquivo(arq, m.id)}>✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Disciplinas */}
                    {!disciplinas[m.id] ? (
                      <div style={{ padding: 20, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
                    ) : disciplinas[m.id].length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--gray-400)' }}>
                        Nenhuma disciplina. Clique em "+ Disciplina" ou importe um CSV.
                      </div>
                    ) : (
                      <table className="table">
                        <thead><tr>
                          <th>Cód.</th><th>Disciplina</th><th>Período</th><th>CH Semestral</th>
                          <th>Teórica</th><th>Prática</th><th>Estágio</th><th>CH Semanal</th><th>CH Mensal</th><th>Tipo</th><th></th>
                        </tr></thead>
                        <tbody>
                          {[...new Set(disciplinas[m.id].map(d => d.periodo))].sort((a,b) => a-b).map(per =>
                            disciplinas[m.id].filter(d => d.periodo === per).map((d, i, arr) => (
                              <tr key={d.id}>
                                {i === 0 && (
                                  <td rowSpan={arr.length} style={{ background: 'var(--blue-light)', fontWeight: 700, fontSize: 12, color: 'var(--blue)', width: 70, textAlign: 'center' }}>
                                    {per}º sem
                                  </td>
                                )}
                                <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{d.codigo || '—'}</td>
                                <td style={{ fontWeight: 500 }}>{d.nome}</td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{d.ch_semestral}h</td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{d.ch_teorica}h</td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{d.ch_pratica}h</td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{d.ch_estagio}h</td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{(d.ch_semestral / 18.75).toFixed(1)}h</td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)' }}>{((d.ch_semestral / 18.75) * 4.5).toFixed(1)}h</td>
                                <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{d.tipo}</span></td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-sm" onClick={() => { setEditDisc(d); setModalDisc(m.id) }}><Edit2 size={11} /></button>
                                    <button className="btn btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteDisc(d.id, m.id)}><Trash2 size={11} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: 'var(--gray-50)' }}>
                            <td colSpan={3} style={{ padding: '8px 14px', fontWeight: 600, fontSize: 12 }}>Total — {disciplinas[m.id].length} disciplinas</td>
                            <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700 }}>{disciplinas[m.id].reduce((s, d) => s + (d.ch_semestral || 0), 0)}h</td>
                            <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12 }}>{disciplinas[m.id].reduce((s, d) => s + (d.ch_teorica || 0), 0)}h</td>
                            <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12 }}>{disciplinas[m.id].reduce((s, d) => s + (d.ch_pratica || 0), 0)}h</td>
                            <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12 }}>{disciplinas[m.id].reduce((s, d) => s + (d.ch_estagio || 0), 0)}h</td>
                            <td colSpan={4} />
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

      {modalMatriz && <ModalMatriz dados={editMatriz} onClose={() => setModalMatriz(false)} onSaved={() => { setModalMatriz(false); fetchMatrizes() }} />}
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
      if (error) { toast.error('Erro. Versão pode já existir para este curso.'); setSaving(false); return }
    } else {
      const { error } = await supabase.from('matrizes_curriculares').insert(form)
      if (error) { toast.error('Erro. Versão pode já existir para este curso.'); setSaving(false); return }
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
          <div className="form-group">
            <label className="form-label">Curso *</label>
            <input className="form-input" value={form.curso} onChange={e => set('curso', e.target.value)} placeholder="Ex: Direito, Administração..." />
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
    codigo: dados?.codigo || '', nome: dados?.nome || '',
    periodo: dados?.periodo || 1, ch_semestral: dados?.ch_semestral || 60,
    ch_teorica: dados?.ch_teorica || 0, ch_pratica: dados?.ch_pratica || 0,
    ch_estagio: dados?.ch_estagio || 0, tipo: dados?.tipo || 'regular',
    pre_requisitos: dados?.pre_requisitos || '', ementa: dados?.ementa || '',
    ativo: dados?.ativo !== false,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

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
            <input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} />
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
              <div><span style={{ fontSize: 11, color: 'var(--blue)' }}>CH Semanal</span><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)' }}>{chSemanal}h/sem</div></div>
              <div><span style={{ fontSize: 11, color: 'var(--blue)' }}>CH Mensal</span><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)' }}>{chMensal}h/mês</div></div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Pré-requisitos</label>
            <input className="form-input" value={form.pre_requisitos} onChange={e => set('pre_requisitos', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Ementa</label>
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
