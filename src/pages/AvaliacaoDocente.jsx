import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Star, Download, Edit2, Trash2, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const SEMESTRES = ['2024.1','2024.2','2025.1','2025.2','2026.1','2026.2']

const DIMENSOES = [
  { key: 'didatica', label: 'Didática e metodologia' },
  { key: 'pontualidade', label: 'Pontualidade e frequência' },
  { key: 'cumprimento_conteudo', label: 'Cumprimento do conteúdo' },
  { key: 'relacionamento_alunos', label: 'Relacionamento com alunos' },
  { key: 'atualizacao_conhecimento', label: 'Atualização do conhecimento' },
  { key: 'planejamento', label: 'Planejamento e organização' },
  { key: 'uso_metodologias', label: 'Uso de metodologias ativas' },
]

function conceito(media) {
  if (!media) return '—'
  if (media >= 4.5) return 'Excelente'
  if (media >= 4.0) return 'Ótimo'
  if (media >= 3.0) return 'Bom'
  if (media >= 2.0) return 'Regular'
  return 'Insatisfatório'
}

function corConceito(media) {
  if (!media) return 'badge-gray'
  if (media >= 4.5) return 'badge-green'
  if (media >= 4.0) return 'badge-blue'
  if (media >= 3.0) return 'badge-amber'
  return 'badge-red'
}

function Estrelas({ valor, onChange, readOnly }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => !readOnly && onChange?.(n)} style={{
          background: 'none', border: 'none', cursor: readOnly ? 'default' : 'pointer',
          fontSize: 20, color: n <= (valor || 0) ? '#FFB640' : '#D1D5DB', padding: 2
        }}>★</button>
      ))}
    </div>
  )
}

export default function AvaliacaoDocente() {
  const { user } = useAuth()
  const [avaliacoes, setAvaliacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [semestre, setSemestre] = useState('2025.1')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [professores, setProfessores] = useState([])
  const [visao, setVisao] = useState('lista') // 'lista' | 'ranking'

  const fetchAvaliacoes = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('avaliacoes_docente').select('*').eq('semestre', semestre).order('professor_nome')
    if (busca) q = q.ilike('professor_nome', `%${busca}%`)
    const { data } = await q
    setAvaliacoes(data || [])
    setLoading(false)
  }, [semestre, busca])

  useEffect(() => { fetchAvaliacoes() }, [fetchAvaliacoes])

  useEffect(() => {
    supabase.from('professores').select('id, nome, titulacao, curso_principal').eq('ativo', true).order('nome').then(({ data }) => setProfessores(data || []))
  }, [])

  async function handleDelete(id) {
    if (!confirm('Excluir esta avaliação?')) return
    await supabase.from('avaliacoes_docente').delete().eq('id', id)
    toast.success('Excluído!')
    fetchAvaliacoes()
  }

  function exportarCSV() {
    const headers = 'Professor;Curso;Didática;Pontualidade;Conteúdo;Relacionamento;Atualização;Planejamento;Metodologias;Média;Conceito;Status'
    const rows = avaliacoes.map(a =>
      `${a.professor_nome};${a.curso || ''};${a.didatica||0};${a.pontualidade||0};${a.cumprimento_conteudo||0};${a.relacionamento_alunos||0};${a.atualizacao_conhecimento||0};${a.planejamento||0};${a.uso_metodologias||0};${(a.media_geral||0).toFixed(2)};${conceito(a.media_geral)};${a.status}`
    ).join('\n')
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `avaliacoes_${semestre}.csv`; a.click()
  }

  const mediaGeral = avaliacoes.length > 0 ? avaliacoes.reduce((s, a) => s + (a.media_geral || 0), 0) / avaliacoes.length : 0
  const finalizadas = avaliacoes.filter(a => a.status === 'finalizada' || a.status === 'homologada').length
  const excelentes = avaliacoes.filter(a => (a.media_geral || 0) >= 4.5).length

  // Ranking
  const ranking = [...avaliacoes].filter(a => a.media_geral).sort((a, b) => (b.media_geral || 0) - (a.media_geral || 0))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Avaliação de Desempenho Docente</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            Ciclo semestral de avaliação — 7 dimensões com média automática
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={exportarCSV}><Download size={13} /> CSV</button>
          <button className="btn btn-primary" onClick={() => { setEditando(null); setModal(true) }}>
            <Plus size={13} /> Nova avaliação
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total avaliações', valor: avaliacoes.length, cor: 'var(--blue)' },
          { label: 'Finalizadas', valor: finalizadas, cor: 'var(--green)' },
          { label: 'Média geral', valor: mediaGeral.toFixed(2), cor: 'var(--blue)' },
          { label: 'Conceito geral', valor: conceito(mediaGeral), cor: mediaGeral >= 4 ? 'var(--green)' : mediaGeral >= 3 ? 'var(--amber)' : 'var(--red)' },
          { label: 'Excelentes', valor: excelentes, cor: 'var(--green)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.cor }}>{s.valor}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-select" style={{ width: 'auto' }} value={semestre} onChange={e => setSemestre(e.target.value)}>
          {SEMESTRES.map(s => <option key={s}>{s}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Buscar professor..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 3, background: 'var(--gray-100)', borderRadius: 8, padding: 3 }}>
          {[['lista','Lista'],['ranking','Ranking']].map(([v,l]) => (
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

      {/* Conteúdo */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : avaliacoes.length === 0 ? (
        <div className="card empty-state" style={{ padding: 48 }}>
          <Star size={32} strokeWidth={1} />
          <p>Nenhuma avaliação para {semestre}. Clique em "Nova avaliação"!</p>
        </div>
      ) : visao === 'lista' ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead><tr>
              <th>Professor</th><th>Curso</th>
              {DIMENSOES.map(d => <th key={d.key} style={{ fontSize: 10 }}>{d.label.split(' ')[0]}</th>)}
              <th>Média</th><th>Conceito</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {avaliacoes.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.professor_nome}</td>
                  <td style={{ fontSize: 12 }}>{a.curso || '—'}</td>
                  {DIMENSOES.map(d => (
                    <td key={d.key} style={{ fontFamily: 'var(--mono)', fontSize: 12, color: (a[d.key] || 0) >= 4 ? 'var(--green)' : (a[d.key] || 0) >= 3 ? 'var(--amber)' : 'var(--red)' }}>
                      {a[d.key] ? a[d.key].toFixed(1) : '—'}
                    </td>
                  ))}
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{a.media_geral ? a.media_geral.toFixed(2) : '—'}</td>
                  <td><span className={`badge ${corConceito(a.media_geral)}`} style={{ fontSize: 10 }}>{conceito(a.media_geral)}</span></td>
                  <td><span className={`badge ${a.status === 'homologada' ? 'badge-green' : a.status === 'finalizada' ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: 10 }}>{a.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm" onClick={() => { setEditando(a); setModal(true) }}><Edit2 size={11} /></button>
                      <button className="btn btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(a.id)}><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Ranking
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ranking.map((a, i) => (
            <div key={a.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--blue-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 16, color: i < 3 ? 'white' : 'var(--blue)'
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.professor_nome}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{a.curso}</div>
              </div>
              <Estrelas valor={Math.round(a.media_geral || 0)} readOnly />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--blue)' }}>{(a.media_geral || 0).toFixed(2)}</div>
                <span className={`badge ${corConceito(a.media_geral)}`} style={{ fontSize: 10 }}>{conceito(a.media_geral)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ModalAvaliacao
          dados={editando}
          professores={professores}
          semestre={semestre}
          userEmail={user?.email}
          onClose={() => { setModal(false); setEditando(null) }}
          onSaved={() => { setModal(false); setEditando(null); fetchAvaliacoes() }}
        />
      )}
    </div>
  )
}

function ModalAvaliacao({ dados, professores, semestre, userEmail, onClose, onSaved }) {
  const isEdit = !!dados?.id
  const [form, setForm] = useState({
    semestre: dados?.semestre || semestre,
    professor_id: dados?.professor_id || '',
    professor_nome: dados?.professor_nome || '',
    curso: dados?.curso || '',
    didatica: dados?.didatica || 0,
    pontualidade: dados?.pontualidade || 0,
    cumprimento_conteudo: dados?.cumprimento_conteudo || 0,
    relacionamento_alunos: dados?.relacionamento_alunos || 0,
    atualizacao_conhecimento: dados?.atualizacao_conhecimento || 0,
    planejamento: dados?.planejamento || 0,
    uso_metodologias: dados?.uso_metodologias || 0,
    pontos_fortes: dados?.pontos_fortes || '',
    pontos_melhoria: dados?.pontos_melhoria || '',
    observacoes: dados?.observacoes || '',
    status: dados?.status || 'rascunho',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const media = DIMENSOES.reduce((s, d) => s + (parseFloat(form[d.key]) || 0), 0) / DIMENSOES.length

  async function handleSave() {
    if (!form.professor_nome) { toast.error('Selecione o professor.'); return }
    setSaving(true)
    const payload = {
      ...form,
      professor_id: form.professor_id || null,
      avaliador_email: userEmail || 'RH',
      conceito: conceito(media),
    }
    DIMENSOES.forEach(d => { payload[d.key] = parseFloat(form[d.key]) || null })
    if (isEdit) {
      const { error } = await supabase.from('avaliacoes_docente').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', dados.id)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      toast.success('Avaliação atualizada!')
    } else {
      const { error } = await supabase.from('avaliacoes_docente').insert(payload)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      toast.success('Avaliação registrada!')
    }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar avaliação' : 'Nova avaliação docente'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Semestre</label>
              <select className="form-select" value={form.semestre} onChange={e => set('semestre', e.target.value)}>
                {SEMESTRES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="rascunho">Rascunho</option>
                <option value="finalizada">Finalizada</option>
                <option value="homologada">Homologada</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Professor *</label>
            <select className="form-select" value={form.professor_id} onChange={e => {
              const p = professores.find(x => x.id === e.target.value)
              set('professor_id', e.target.value)
              if (p) { set('professor_nome', p.nome); set('curso', p.curso_principal || '') }
            }}>
              <option value="">Selecione...</option>
              {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Curso</label>
            <input className="form-input" value={form.curso} onChange={e => set('curso', e.target.value)} />
          </div>

          {/* Dimensões */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 8 }}>Avaliação por dimensão (1 a 5 estrelas)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DIMENSOES.map(d => (
              <div key={d.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 8 }}>
                <span style={{ fontSize: 13 }}>{d.label}</span>
                <Estrelas valor={form[d.key]} onChange={v => set(d.key, v)} />
              </div>
            ))}
          </div>

          {/* Média */}
          {media > 0 && (
            <div style={{ background: 'var(--blue)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>MÉDIA GERAL</div>
                <div style={{ color: 'white', fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)' }}>{media.toFixed(2)}</div>
              </div>
              <span style={{ background: '#FFB640', color: 'var(--blue)', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>
                {conceito(media)}
              </span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Pontos fortes</label>
            <textarea className="form-textarea" value={form.pontos_fortes} onChange={e => set('pontos_fortes', e.target.value)} placeholder="Destaque os principais pontos positivos..." />
          </div>
          <div className="form-group">
            <label className="form-label">Pontos de melhoria</label>
            <textarea className="form-textarea" value={form.pontos_melhoria} onChange={e => set('pontos_melhoria', e.target.value)} placeholder="Indique os aspectos a desenvolver..." />
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Registrar avaliação'}
          </button>
        </div>
      </div>
    </div>
  )
}
