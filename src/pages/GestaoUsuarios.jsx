import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Shield, Users, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { usePermissao } from '../hooks/usePermissao'
import toast from 'react-hot-toast'

const PERFIS = [
  { value: 'admin', label: 'Administrador', desc: 'Acesso total ao sistema', cor: 'badge-red' },
  { value: 'direcao', label: 'Direção', desc: 'Visualização completa, sem edição', cor: 'badge-purple' },
  { value: 'rh', label: 'RH', desc: 'Gestão de pessoas, folha e acadêmico', cor: 'badge-blue' },
  { value: 'financeiro', label: 'Financeiro', desc: 'Apenas folha e relatórios', cor: 'badge-green' },
  { value: 'coordenador', label: 'Coordenador', desc: 'Apenas módulo acadêmico — cursos atribuídos', cor: 'badge-amber' },
]

const PERMISSOES_LABEL = {
  admin: ['Acesso total', 'Gerencia usuários', 'Ver salários'],
  direcao: ['Visualiza tudo', 'Ver salários', 'Relatórios'],
  rh: ['Cadastros completos', 'Folha ADM e Docente', 'Módulo acadêmico', 'Ver salários'],
  financeiro: ['Folha de pagamento', 'Relatórios financeiros', 'Ver salários'],
  coordenador: ['Matrizes do curso', 'Distribuição de CH', 'Relatórios acadêmicos'],
}

export default function GestaoUsuarios() {
  const { pode, ehAdmin } = usePermissao()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [cursos, setCursos] = useState([])

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('perfis_usuario').select('*').order('nome')
    setUsuarios(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsuarios() }, [fetchUsuarios])

  useEffect(() => {
    supabase.from('matrizes_curriculares').select('curso').eq('status', 'ativa').then(({ data }) => {
      const cs = [...new Set((data || []).map(m => m.curso))].sort()
      setCursos(cs)
    })
  }, [])

  async function handleDelete(id) {
    if (!confirm('Remover acesso deste usuário?')) return
    await supabase.from('perfis_usuario').update({ ativo: false }).eq('id', id)
    toast.success('Acesso removido!')
    fetchUsuarios()
  }

  const filtrados = usuarios.filter(u =>
    u.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    u.email?.toLowerCase().includes(busca.toLowerCase())
  )

  if (!pode('gerenciarUsuarios') && !ehAdmin) {
    return (
      <div className="card empty-state" style={{ padding: 48 }}>
        <Shield size={32} strokeWidth={1} />
        <p>Acesso restrito — apenas administradores podem gerenciar usuários.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Gestão de Usuários</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            Controle de acesso por perfil — RH, Financeiro, Direção, Coordenação
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditando(null); setModal(true) }}>
          <Plus size={13} /> Novo usuário
        </button>
      </div>

      {/* Cards de perfil */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 10, marginBottom: 20 }}>
        {PERFIS.map(p => (
          <div key={p.value} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className={`badge ${p.cor}`}>{p.label}</span>
              <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                {usuarios.filter(u => u.perfil === p.value && u.ativo).length} usuário(s)
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>{p.desc}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {PERMISSOES_LABEL[p.value]?.map(perm => (
                <span key={perm} style={{ fontSize: 11, color: 'var(--gray-600)' }}>✓ {perm}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
        <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Buscar por nome ou e-mail..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {/* Lista */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}><p>Nenhum usuário encontrado.</p></div>
        ) : (
          <table className="table">
            <thead><tr>
              <th>Nome</th><th>E-mail</th><th>Perfil</th><th>Cursos permitidos</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {filtrados.map(u => {
                const perfil = PERFIS.find(p => p.value === u.perfil)
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.nome}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.email}</td>
                    <td><span className={`badge ${perfil?.cor || 'badge-gray'}`}>{perfil?.label || u.perfil}</span></td>
                    <td style={{ fontSize: 12 }}>
                      {u.perfil === 'coordenador'
                        ? u.cursos_permitidos?.join(', ') || 'Nenhum curso atribuído'
                        : <span style={{ color: 'var(--gray-400)' }}>Todos os cursos</span>
                      }
                    </td>
                    <td>
                      <span className={`badge ${u.ativo ? 'badge-green' : 'badge-gray'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => { setEditando(u); setModal(true) }}><Edit2 size={11} /></button>
                        <button className="btn btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(u.id)}><Trash2 size={11} /></button>
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
        <ModalUsuario
          dados={editando}
          cursos={cursos}
          onClose={() => { setModal(false); setEditando(null) }}
          onSaved={() => { setModal(false); setEditando(null); fetchUsuarios() }}
        />
      )}
    </div>
  )
}

function ModalUsuario({ dados, cursos, onClose, onSaved }) {
  const isEdit = !!dados?.id
  const [form, setForm] = useState({
    nome: dados?.nome || '',
    email: dados?.email || '',
    perfil: dados?.perfil || 'rh',
    cursos_permitidos: dados?.cursos_permitidos || [],
    ativo: dados?.ativo !== false,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function toggleCurso(curso) {
    setForm(f => ({
      ...f,
      cursos_permitidos: f.cursos_permitidos.includes(curso)
        ? f.cursos_permitidos.filter(c => c !== curso)
        : [...f.cursos_permitidos, curso]
    }))
  }

  async function handleSave() {
    if (!form.nome || !form.email) { toast.error('Preencha nome e e-mail.'); return }
    if (form.perfil === 'coordenador' && form.cursos_permitidos.length === 0) {
      toast.error('Atribua pelo menos um curso ao coordenador.')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      cursos_permitidos: form.perfil === 'coordenador' ? form.cursos_permitidos : null,
    }
    if (isEdit) {
      const { error } = await supabase.from('perfis_usuario').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', dados.id)
      if (error) { toast.error('Erro ao salvar.'); setSaving(false); return }
      toast.success('Usuário atualizado!')
    } else {
      const { error } = await supabase.from('perfis_usuario').insert(payload)
      if (error) { toast.error('Erro. E-mail pode já estar cadastrado.'); setSaving(false); return }
      toast.success('Usuário criado!')
    }
    onSaved()
  }

  const perfil = PERFIS.find(p => p.value === form.perfil)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar usuário' : 'Novo usuário'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome completo *</label>
              <input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">E-mail (mesmo do login) *</label>
            <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="usuario@unisulma.edu.br" />
          </div>
          <div className="form-group">
            <label className="form-label">Perfil de acesso *</label>
            <select className="form-select" value={form.perfil} onChange={e => set('perfil', e.target.value)}>
              {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>)}
            </select>
          </div>

          {/* Resumo do perfil */}
          {perfil && (
            <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                <span className={`badge ${perfil.cor}`}>{perfil.label}</span>
              </div>
              {PERMISSOES_LABEL[form.perfil]?.map(p => (
                <div key={p} style={{ color: 'var(--gray-600)' }}>✓ {p}</div>
              ))}
            </div>
          )}

          {/* Cursos para coordenador */}
          {form.perfil === 'coordenador' && cursos.length > 0 && (
            <div className="form-group">
              <label className="form-label">Cursos permitidos *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', padding: '8px', border: '1px solid var(--gray-200)', borderRadius: 7 }}>
                {cursos.map(curso => (
                  <label key={curso} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={form.cursos_permitidos.includes(curso)}
                      onChange={() => toggleCurso(curso)}
                    />
                    {curso}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} />
              Usuário ativo
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar usuário'}
          </button>
        </div>
      </div>
    </div>
  )
}
