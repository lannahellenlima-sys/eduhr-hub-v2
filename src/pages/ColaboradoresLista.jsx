import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Users, AlertCircle } from 'lucide-react'
import { useColaboradores } from '../hooks/useColaboradores'
import { formatDate, tempoServico, pendenciasCount } from '../lib/utils'

export default function ColaboradoresLista() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('todos')
  const { data: colaboradores, loading, refetch } = useColaboradores()
  const [filtrados, setFiltrados] = useState([])

  useEffect(() => {
    let list = colaboradores
    if (search) list = list.filter(c =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.cpf && c.cpf.includes(search)) ||
      (c.departamento && c.departamento.toLowerCase().includes(search.toLowerCase()))
    )
    if (filtroAtivo === 'ativos') list = list.filter(c => c.ativo)
    if (filtroAtivo === 'inativos') list = list.filter(c => !c.ativo)
    setFiltrados(list)
  }, [colaboradores, search, filtroAtivo])

  const ativos = colaboradores.filter(c => c.ativo).length
  const inativos = colaboradores.filter(c => !c.ativo).length

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--gray-900)' }}>Colaboradores</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            Cadastro e gestão de pessoal administrativo
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/colaboradores/novo')}>
          <Plus size={14} /> Novo colaborador
        </button>
      </div>

      {/* Stats rápidos */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '10px 16px', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Total</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--blue)' }}>{colaboradores.length}</div>
        </div>
        <div className="card" style={{ padding: '10px 16px', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Ativos</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--green)' }}>{ativos}</div>
        </div>
        <div className="card" style={{ padding: '10px 16px', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Inativos</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--gray-400)' }}>{inativos}</div>
        </div>
      </div>

      {/* Busca e filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Buscar por nome, CPF ou setor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--gray-100)', borderRadius: 8, padding: 3 }}>
          {['todos', 'ativos', 'inativos'].map(f => (
            <button
              key={f}
              onClick={() => setFiltroAtivo(f)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12, fontFamily: 'var(--font)', fontWeight: 500,
                background: filtroAtivo === f ? 'white' : 'transparent',
                color: filtroAtivo === f ? 'var(--gray-900)' : 'var(--gray-500)',
                boxShadow: filtroAtivo === f ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                transition: 'all .15s', textTransform: 'capitalize'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state">
            <Users size={32} strokeWidth={1} />
            <p>{search ? 'Nenhum colaborador encontrado.' : 'Nenhum colaborador cadastrado.'}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Função</th>
                <th>Departamento</th>
                <th>Vínculo</th>
                <th>Admissão</th>
                <th>Situação</th>
                <th>Docs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/colaboradores/${c.id}`)}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--gray-900)' }}>{c.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{c.ficha_numero ? `Ficha nº ${c.ficha_numero}` : ''}</div>
                  </td>
                  <td>{c.funcao}</td>
                  <td>{c.departamento}</td>
                  <td><span className="badge badge-blue">{c.vinculo}</span></td>
                  <td style={{ fontSize: 12 }}>
                    <div>{formatDate(c.data_admissao)}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{tempoServico(c.data_admissao)}</div>
                  </td>
                  <td>
                    <span className={`badge ${c.ativo ? 'badge-green' : 'badge-gray'}`}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <DocsBadge colaboradorId={c.id} />
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm" onClick={() => navigate(`/colaboradores/${c.id}`)}>
                      Ver ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// Badge de pendências de documentos
import { supabase } from '../lib/supabase'
function DocsBadge({ colaboradorId }) {
  const [count, setCount] = useState(null)
  useEffect(() => {
    supabase
      .from('documentos_colaborador')
      .select('id', { count: 'exact' })
      .eq('colaborador_id', colaboradorId)
      .eq('status', 'pendente')
      .then(({ count }) => setCount(count || 0))
  }, [colaboradorId])

  if (count === null) return null
  if (count === 0) return <span className="badge badge-green">OK</span>
  return (
    <span className="badge badge-amber">
      <AlertCircle size={10} />
      {count} pendente{count > 1 ? 's' : ''}
    </span>
  )
}
