import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, GraduationCap, AlertCircle, AlertTriangle } from 'lucide-react'
import { useProfessores, contratosVencendo } from '../hooks/useProfessores'
import { supabase } from '../lib/supabase'
import { formatDate, tempoServico, formatMoeda } from '../lib/utils'

const PLANO_BADGE = { PI: 'badge-gray', PII: 'badge-blue', PIII: 'badge-purple' }
const TITULACAO_COR = { Especialista: '#6B7280', Mestre: '#185FA5', Doutor: '#534AB7' }

export default function ProfessoresLista() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('todos')
  const [filtroPlano, setFiltroPlano] = useState('todos')
  const { data: professores, loading } = useProfessores()
  const [filtrados, setFiltrados] = useState([])
  const [alertasContrato, setAlertasContrato] = useState([])

  useEffect(() => {
    contratosVencendo(30).then(setAlertasContrato)
  }, [])

  useEffect(() => {
    let list = professores
    if (search) list = list.filter(p =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.curso_principal && p.curso_principal.toLowerCase().includes(search.toLowerCase())) ||
      (p.titulacao && p.titulacao.toLowerCase().includes(search.toLowerCase()))
    )
    if (filtroAtivo === 'ativos') list = list.filter(p => p.ativo)
    if (filtroAtivo === 'inativos') list = list.filter(p => !p.ativo)
    if (filtroPlano !== 'todos') list = list.filter(p => p.plano === filtroPlano)
    setFiltrados(list)
  }, [professores, search, filtroAtivo, filtroPlano])

  const ativos = professores.filter(p => p.ativo).length
  const clt = professores.filter(p => p.vinculo === 'CLT').length
  const contrato = professores.filter(p => p.vinculo === 'Contrato' || p.vinculo === 'Horista').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--gray-900)' }}>Professores</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>Cadastro e gestão do corpo docente</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/professores/novo')}>
          <Plus size={14} /> Novo professor
        </button>
      </div>

      {/* Alerta de contratos vencendo */}
      {alertasContrato.length > 0 && (
        <div className="alert alert-amber" style={{ marginBottom: 14 }}>
          <AlertTriangle size={16} />
          <div>
            <strong>{alertasContrato.length} contrato{alertasContrato.length > 1 ? 's' : ''} vencendo nos próximos 30 dias</strong>
            <div style={{ fontSize: 12, marginTop: 3 }}>
              {alertasContrato.map(c => (
                <span key={c.id} style={{ marginRight: 12 }}>
                  {c.professores?.nome} — vence em {formatDate(c.data_fim)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', valor: professores.length, cor: 'var(--blue)' },
          { label: 'Ativos', valor: ativos, cor: 'var(--green)' },
          { label: 'CLT', valor: clt, cor: 'var(--blue)' },
          { label: 'Contrato / Horista', valor: contrato, cor: 'var(--amber)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '10px 16px', flex: 1, minWidth: 110 }}>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.cor }}>{s.valor}</div>
          </div>
        ))}
      </div>

      {/* Busca e filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Buscar por nome, curso ou titulação..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filtro ativo/inativo */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--gray-100)', borderRadius: 8, padding: 3 }}>
          {['todos', 'ativos', 'inativos'].map(f => (
            <button key={f} onClick={() => setFiltroAtivo(f)} style={{
              padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 12, fontFamily: 'var(--font)', fontWeight: 500,
              background: filtroAtivo === f ? 'white' : 'transparent',
              color: filtroAtivo === f ? 'var(--gray-900)' : 'var(--gray-500)',
              boxShadow: filtroAtivo === f ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
              textTransform: 'capitalize'
            }}>{f}</button>
          ))}
        </div>

        {/* Filtro plano */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--gray-100)', borderRadius: 8, padding: 3 }}>
          {['todos', 'PI', 'PII', 'PIII'].map(f => (
            <button key={f} onClick={() => setFiltroPlano(f)} style={{
              padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 12, fontFamily: 'var(--font)', fontWeight: 500,
              background: filtroPlano === f ? 'white' : 'transparent',
              color: filtroPlano === f ? 'var(--gray-900)' : 'var(--gray-500)',
              boxShadow: filtroPlano === f ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state"><GraduationCap size={32} strokeWidth={1} /><p>Nenhum professor encontrado.</p></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Titulação / Plano</th>
                <th>Curso</th>
                <th>Vínculo</th>
                <th>Hora-aula</th>
                <th>Situação</th>
                <th>Docs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/professores/${p.id}`)}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--gray-900)' }}>{p.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{p.ficha_numero ? `Ficha nº ${p.ficha_numero}` : ''}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <span className={`badge ${PLANO_BADGE[p.plano] || 'badge-gray'}`}>{p.plano}</span>
                      <span style={{ fontSize: 12, color: TITULACAO_COR[p.titulacao] || 'var(--gray-500)' }}>{p.titulacao}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{p.curso_principal}</td>
                  <td><span className="badge badge-blue">{p.vinculo}</span></td>
                  <td style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
                    {p.valor_hora_teorica ? `R$ ${p.valor_hora_teorica.toFixed(2)}/h` : '—'}
                  </td>
                  <td>
                    <span className={`badge ${p.ativo ? 'badge-green' : 'badge-gray'}`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <DocsBadgeProf professorId={p.id} />
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm" onClick={() => navigate(`/professores/${p.id}`)}>Ver ficha</button>
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

function DocsBadgeProf({ professorId }) {
  const [count, setCount] = useState(null)
  useEffect(() => {
    supabase
      .from('documentos_professor')
      .select('id', { count: 'exact' })
      .eq('professor_id', professorId)
      .eq('status', 'pendente')
      .then(({ count }) => setCount(count || 0))
  }, [professorId])
  if (count === null) return null
  if (count === 0) return <span className="badge badge-green">OK</span>
  return <span className="badge badge-amber"><AlertCircle size={10} />{count} pendente{count > 1 ? 's' : ''}</span>
}
