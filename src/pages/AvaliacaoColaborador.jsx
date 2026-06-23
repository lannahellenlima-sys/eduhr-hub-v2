import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Download, Edit2, Trash2, Star, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const PERIODOS = ['2024.1','2024.2','2025.1','2025.2','2026.1','2026.2']

const DIMENSOES = [
  { key: 'qualidade_trabalho', label: 'Qualidade do trabalho', desc: 'Precisão, organização e atenção aos detalhes' },
  { key: 'produtividade', label: 'Produtividade', desc: 'Volume e ritmo de entrega das tarefas' },
  { key: 'pontualidade_assiduidade', label: 'Pontualidade e assiduidade', desc: 'Cumprimento de horários e frequência' },
  { key: 'iniciativa_proatividade', label: 'Iniciativa e proatividade', desc: 'Antecipação de problemas e proposta de soluções' },
  { key: 'trabalho_equipe', label: 'Trabalho em equipe', desc: 'Colaboração, comunicação e relacionamento interpessoal' },
  { key: 'conhecimento_tecnico', label: 'Conhecimento técnico', desc: 'Domínio das ferramentas e processos do cargo' },
  { key: 'comprometimento', label: 'Comprometimento', desc: 'Dedicação, responsabilidade e foco nos resultados' },
  { key: 'comunicacao', label: 'Comunicação', desc: 'Clareza e objetividade na comunicação oral e escrita' },
]

const STATUS_LABELS = { rascunho: 'Rascunho', finalizada: 'Finalizada', homologada: 'Homologada' }
const STATUS_CORES = { rascunho: 'badge-gray', finalizada: 'badge-blue', homologada: 'badge-green' }

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
          background: 'none', border: 'none',
          cursor: readOnly ? 'default' : 'pointer',
          fontSize: 22, color: n <= (valor || 0) ? '#FFB640' : '#D1D5DB', padding: 2
        }}>★</button>
      ))}
    </div>
  )
}

export default function AvaliacaoColaborador() {
  const { user } = useAuth()
  const [avaliacoes, setAvaliacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('2025.1')
  const [busca, setBusca] = useState('')
  const [visao, setVisao] = useState('lista')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [colaboradores, setColaboradores] = useState([])

  const fetchAvaliacoes = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('avaliacoes_colaborador')
      .select('*')
      .eq('periodo', periodo)
      .order('colaborador_nome')
    if (busca) q = q.ilike('colaborador_nome', `%${busca}%`)
    const { data } = await q
    setAvaliacoes(data || [])
    setLoading(false)
  }, [periodo, busca])

  useEffect(() => { fetchAvaliacoes() }, [fetchAvaliacoes])

  useEffect(() => {
    supabase.from('colaboradores').select('id, nome, funcao, departamento').eq('ativo', true).order('nome')
      .then(({ data }) => setColaboradores(data || []))
  }, [])

  async function handleDelete(id) {
    if (!confirm('Excluir esta avaliação?')) return
    await supabase.from('avaliacoes_colaborador').delete().eq('id', id)
    toast.success('Excluído!')
    fetchAvaliacoes()
  }

  function exportarCSV() {
    const headers = 'Colaborador;Função;Departamento;' + DIMENSOES.map(d => d.label).join(';') + ';Média;Conceito;Status'
    const rows = avaliacoes.map(a =>
      `${a.colaborador_nome};${a.funcao || ''};${a.departamento || ''};` +
      DIMENSOES.map(d => a[d.key] || 0).join(';') +
      `;${(a.media_geral || 0).toFixed(2)};${conceito(a.media_geral)};${a.status}`
    ).join('\n')
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `avaliacao_adm_${periodo}.csv`; a.click()
    toast.success('Exportado!')
  }

  // Stats
  const mediaGeral = avaliacoes.length > 0 ? avaliacoes.reduce((s, a) => s + (a.media_geral || 0), 0) / avaliacoes.length : 0
  const finalizadas = avaliacoes.filter(a => a.status !== 'rascunho').length
  const excelentes = avaliacoes.filter(a => (a.media_geral || 0) >= 4.5).length
  const emDesenvolvimento = avaliacoes.filter(a => (a.media_geral || 0) < 3).length

  // Ranking
  const ranking = [...avaliacoes].filter(a => a.media_geral).sort((a, b) => (b.media_geral || 0) - (a.media_geral || 0))

  // Médias por dimensão
  const mediasDimensao = DIMENSOES.map(d => ({
    ...d,
    media: avaliacoes.length > 0
      ? avaliacoes.reduce((s, a) => s + (a[d.key] || 0), 0) / avaliacoes.length
      : 0
  })).sort((a, b) => a.media - b.media)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Avaliação de Desempenho — Administrativo</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            Ciclo semestral · 8 dimensões · média calculada automaticamente
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total avaliações', valor: avaliacoes.length, cor: 'var(--blue)' },
          { label: 'Finalizadas', valor: finalizadas, cor: 'var(--green)' },
          { label: 'Média geral', valor: mediaGeral.toFixed(2), cor: 'var(--blue)' },
          { label: 'Conceito geral', valor: conceito(mediaGeral), cor: mediaGeral >= 4 ? 'var(--green)' : mediaGeral >= 3 ? 'var(--amber)' : 'var(--red)' },
          { label: 'Excelentes', valor: excelentes, cor: 'var(--green)' },
          { label: 'Em desenvolvimento', valor: emDesenvolvimento, cor: emDesenvolvimento > 0 ? 'var(--red)' : 'var(--gray-400)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: s.cor }}>{s.valor}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-select" style={{ width: 'auto' }} value={periodo} onChange={e => setPeriodo(e.target.value)}>
          {PERIODOS.map(p => <option key={p}>{p}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Buscar colaborador..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 3, background: 'var(--gray-100)', borderRadius: 8, padding: 3 }}>
          {[['lista','Lista'],['ranking','Ranking'],['dimensoes','Por Dimensão']].map(([v,l]) => (
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
          <p>Nenhuma avaliação para {periodo}. Clique em "Nova avaliação"!</p>
        </div>
      ) : visao === 'lista' ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Colaborador</th><th>Função</th><th>Departamento</th>
                <th>Média</th><th>Conceito</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {avaliacoes.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.colaborador_nome}</td>
                  <td style={{ fontSize: 12 }}>{a.funcao || '—'}</td>
                  <td style={{ fontSize: 12 }}>{a.departamento || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: 'var(--gray-100)', borderRadius: 3 }}>
                        <div style={{ width: `${((a.media_geral || 0) / 5) * 100}%`, height: '100%', background: (a.media_geral || 0) >= 4 ? 'var(--green)' : (a.media_geral || 0) >= 3 ? 'var(--amber)' : 'var(--red)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{(a.media_geral || 0).toFixed(2)}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${corConceito(a.media_geral)}`} style={{ fontSize: 10 }}>{conceito(a.media_geral)}</span></td>
                  <td><span className={`badge ${STATUS_CORES[a.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{STATUS_LABELS[a.status] || a.status}</span></td>
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

      ) : visao === 'ranking' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ranking.map((a, i) => (
            <div key={a.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--blue-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 16, color: i < 3 ? 'white' : 'var(--blue)'
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{a.colaborador_nome}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{a.funcao} · {a.departamento}</div>
              </div>
              <Estrelas valor={Math.round(a.media_geral || 0)} readOnly />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--blue)' }}>{(a.media_geral || 0).toFixed(2)}</div>
                <span className={`badge ${corConceito(a.media_geral)}`} style={{ fontSize: 10 }}>{conceito(a.media_geral)}</span>
              </div>
            </div>
          ))}
        </div>

      ) : (
        // Por dimensão
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Média por dimensão — {periodo}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mediasDimensao.map(d => (
                <div key={d.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>{d.label}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: d.media >= 4 ? 'var(--green)' : d.media >= 3 ? 'var(--amber)' : 'var(--red)' }}>
                      {d.media.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(d.media / 5) * 100}%`, height: '100%', borderRadius: 4,
                      background: d.media >= 4 ? 'var(--green)' : d.media >= 3 ? '#F59E0B' : 'var(--red)',
                      transition: 'width .4s'
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{d.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pontos de atenção */}
          {mediasDimensao[0]?.media < 3.5 && (
            <div className="alert alert-amber">
              <TrendingUp size={15} />
              <div>
                <strong>Dimensão mais crítica:</strong> {mediasDimensao[0].label} — média {mediasDimensao[0].media.toFixed(2)}
                <div style={{ fontSize: 12, marginTop: 2 }}>Recomenda-se plano de desenvolvimento para esta competência.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <ModalAvaliacao
          dados={editando}
          colaboradores={colaboradores}
          periodo={periodo}
          userEmail={user?.email}
          onClose={() => { setModal(false); setEditando(null) }}
          onSaved={() => { setModal(false); setEditando(null); fetchAvaliacoes() }}
        />
      )}
    </div>
  )
}

function ModalAvaliacao({ dados, colaboradores, periodo, userEmail, onClose, onSaved }) {
  const isEdit = !!dados?.id
  const [form, setForm] = useState({
    periodo: dados?.periodo || periodo,
    colaborador_id: dados?.colaborador_id || '',
    colaborador_nome: dados?.colaborador_nome || '',
    funcao: dados?.funcao || '',
    departamento: dados?.departamento || '',
    qualidade_trabalho: dados?.qualidade_trabalho || 0,
    produtividade: dados?.produtividade || 0,
    pontualidade_assiduidade: dados?.pontualidade_assiduidade || 0,
    iniciativa_proatividade: dados?.iniciativa_proatividade || 0,
    trabalho_equipe: dados?.trabalho_equipe || 0,
    conhecimento_tecnico: dados?.conhecimento_tecnico || 0,
    comprometimento: dados?.comprometimento || 0,
    comunicacao: dados?.comunicacao || 0,
    pontos_fortes: dados?.pontos_fortes || '',
    pontos_melhoria: dados?.pontos_melhoria || '',
    metas_proximo_periodo: dados?.metas_proximo_periodo || '',
    observacoes: dados?.observacoes || '',
    status: dados?.status || 'rascunho',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const media = DIMENSOES.reduce((s, d) => s + (parseFloat(form[d.key]) || 0), 0) / DIMENSOES.length

  function onSelectColaborador(id) {
    const c = colaboradores.find(x => x.id === id)
    set('colaborador_id', id)
    if (c) {
      set('colaborador_nome', c.nome)
      set('funcao', c.funcao || '')
      set('departamento', c.departamento || '')
    }
  }

  async function handleSave() {
    if (!form.colaborador_nome) { toast.error('Selecione o colaborador.'); return }
    setSaving(true)
    const payload = {
      ...form,
      colaborador_id: form.colaborador_id || null,
      avaliador_email: userEmail || 'RH',
      conceito: conceito(media),
      media_geral: parseFloat(media.toFixed(4)),
    }
    DIMENSOES.forEach(d => { payload[d.key] = parseFloat(form[d.key]) || null })

    if (isEdit) {
      const { error } = await supabase.from('avaliacoes_colaborador').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', dados.id)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      toast.success('Avaliação atualizada!')
    } else {
      const { error } = await supabase.from('avaliacoes_colaborador').insert(payload)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      toast.success('Avaliação registrada!')
    }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar avaliação' : 'Nova avaliação administrativa'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          {/* Identificação */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Período *</label>
              <select className="form-select" value={form.periodo} onChange={e => set('periodo', e.target.value)}>
                {PERIODOS.map(p => <option key={p}>{p}</option>)}
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
            <label className="form-label">Colaborador *</label>
            <select className="form-select" value={form.colaborador_id} onChange={e => onSelectColaborador(e.target.value)}>
              <option value="">Selecione...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome} — {c.funcao}</option>)}
            </select>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Função</label>
              <input className="form-input" value={form.funcao} onChange={e => set('funcao', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Departamento</label>
              <input className="form-input" value={form.departamento} onChange={e => set('departamento', e.target.value)} />
            </div>
          </div>

          {/* Dimensões */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
            Avaliação por competência (1 a 5 estrelas)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DIMENSOES.map(d => (
              <div key={d.key} style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 8 }}>{d.desc}</span>
                  </div>
                  <Estrelas valor={form[d.key]} onChange={v => set(d.key, v)} />
                </div>
              </div>
            ))}
          </div>

          {/* Resultado */}
          {media > 0 && (
            <div style={{ background: 'var(--blue)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>Média geral</div>
                <div style={{ color: 'white', fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)' }}>{media.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, marginBottom: 4 }}>Conceito</div>
                <span style={{ background: '#FFB640', color: 'var(--blue)', padding: '5px 14px', borderRadius: 20, fontWeight: 700, fontSize: 14 }}>
                  {conceito(media)}
                </span>
              </div>
            </div>
          )}

          {/* Feedback */}
          <div className="form-group">
            <label className="form-label">Pontos fortes</label>
            <textarea className="form-textarea" value={form.pontos_fortes} onChange={e => set('pontos_fortes', e.target.value)} placeholder="Principais competências e contribuições..." />
          </div>
          <div className="form-group">
            <label className="form-label">Pontos de melhoria</label>
            <textarea className="form-textarea" value={form.pontos_melhoria} onChange={e => set('pontos_melhoria', e.target.value)} placeholder="Aspectos que precisam ser desenvolvidos..." />
          </div>
          <div className="form-group">
            <label className="form-label">Metas para o próximo período</label>
            <textarea className="form-textarea" value={form.metas_proximo_periodo} onChange={e => set('metas_proximo_periodo', e.target.value)} placeholder="Objetivos e metas acordados..." />
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Registrar avaliação'}
          </button>
        </div>
      </div>
    </div>
  )
}
