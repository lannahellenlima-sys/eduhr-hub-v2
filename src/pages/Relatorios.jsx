import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, GraduationCap, ClipboardList, BookOpen, Calendar,
  Wallet, IdCard, Cake, Clock, AlertTriangle, FilePlus, ArrowUpDown,
  Building2, Library, BadgeDollarSign, ScrollText, PiggyBank, Gift,
  RefreshCw, Users, FileText, Download, Search, ChevronRight
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate, formatMoeda, tempoServico } from '../lib/utils'

const GRUPOS = [
  {
    titulo: 'Projeções e simulações',
    cor: 'var(--blue)',
    itens: [
      { id: 'previsao-reajuste-adm', titulo: 'Previsão de reajuste — Administrativo', desc: 'Simulação financeira de reajustes salariais antes da aplicação na folha.', icon: TrendingUp, destaque: true },
      { id: 'previsao-reajuste-doc', titulo: 'Previsão de reajuste — Docente', desc: 'Simulação por percentual geral, plano docente, titulação ou vínculo.', icon: GraduationCap, destaque: true },
      { id: 'previsao-mensal', titulo: 'Previsão mensal da folha', desc: 'Consolidação por competência: ADM, gratificações, coordenação, docente e benefícios.', icon: Wallet, destaque: true },
    ]
  },
  {
    titulo: 'Férias e provisões',
    cor: 'var(--green)',
    itens: [
      { id: 'provisao-ferias', titulo: 'Provisão de férias', desc: 'Provisionamento contábil de férias por colaborador.', icon: PiggyBank },
      { id: 'provisao-13', titulo: 'Provisão de 13º salário', desc: 'Provisionamento mensal do décimo terceiro.', icon: Gift },
      { id: 'encargos', titulo: 'Encargos estimados', desc: 'INSS patronal, FGTS, RAT e Sistema S sobre a folha.', icon: BadgeDollarSign },
    ]
  },
  {
    titulo: 'Cadastrais e operacionais',
    cor: 'var(--purple)',
    itens: [
      { id: 'inicio-colaboradores', titulo: 'Data de início dos colaboradores', desc: 'Admissão, tempo de vínculo e situação funcional.', icon: Calendar },
      { id: 'aniversariantes', titulo: 'Aniversariantes do mês', desc: 'Lista de aniversariantes por mês.', icon: Cake },
      { id: 'tempo-de-casa', titulo: 'Tempo de casa', desc: 'Tempo de vínculo em anos e meses por colaborador.', icon: Clock },
      { id: 'contratos-vencer', titulo: 'Contratos a vencer', desc: 'Contratos determinados próximos do término.', icon: AlertTriangle },
      { id: 'contratos-docentes', titulo: 'Controle de contratos docentes', desc: 'Semestres renovados e alertas de encerramento.', icon: RefreshCw, destaque: true },
      { id: 'documentos-pendentes', titulo: 'Documentos pendentes', desc: 'Documentos faltantes ou vencidos por pessoa.', icon: FilePlus },
      { id: 'alteracoes-salariais', titulo: 'Alterações salariais', desc: 'Histórico de alterações salariais registradas.', icon: ArrowUpDown },
      { id: 'colaboradores-setor', titulo: 'Colaboradores por setor', desc: 'Distribuição por departamento administrativo.', icon: Building2 },
      { id: 'docentes-curso', titulo: 'Docentes por curso', desc: 'Distribuição docente por curso.', icon: Library },
    ]
  },
  {
    titulo: 'Acadêmico',
    cor: '#534AB7',
    itens: [
      { id: 'disciplinas-professor', titulo: 'Disciplinas por professor', desc: 'Turmas, CH e cursos de cada docente no semestre.', icon: BookOpen, destaque: true },
      { id: 'ch-semanal', titulo: 'Carga horária semanal', desc: 'Horas-aula semanais com estimativa mensal (×4,5).', icon: Clock },
    ]
  },
]

export default function Relatorios() {
  const [ativo, setAtivo] = useState(null)
  const [busca, setBusca] = useState('')

  const itensFiltrados = busca
    ? GRUPOS.flatMap(g => g.itens.filter(i => i.titulo.toLowerCase().includes(busca.toLowerCase()) || i.desc.toLowerCase().includes(busca.toLowerCase())).map(i => ({ ...i, grupo: g.titulo })))
    : null

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Relatórios</h1>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
          Análises, projeções e exportações — dados em tempo real do Supabase
        </p>
      </div>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
        <input
          className="form-input"
          style={{ paddingLeft: 32 }}
          placeholder="Buscar relatório..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* Se há busca */}
      {itensFiltrados && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 10, marginBottom: 16 }}>
          {itensFiltrados.map(item => (
            <RelatorioCard key={item.id} item={item} onClick={() => setAtivo(item.id)} ativo={ativo === item.id} />
          ))}
          {itensFiltrados.length === 0 && <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Nenhum relatório encontrado.</p>}
        </div>
      )}

      {/* Painel do relatório ativo */}
      {ativo && <PainelRelatorio id={ativo} onClose={() => setAtivo(null)} />}

      {/* Grupos */}
      {!busca && GRUPOS.map(grupo => (
        <div key={grupo.titulo} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 4, height: 16, borderRadius: 2, background: grupo.cor }} />
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{grupo.titulo}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 10 }}>
            {grupo.itens.map(item => (
              <RelatorioCard key={item.id} item={item} onClick={() => setAtivo(ativo === item.id ? null : item.id)} ativo={ativo === item.id} cor={grupo.cor} />
            ))}
          </div>
          {ativo && grupo.itens.find(i => i.id === ativo) && (
            <div style={{ marginTop: 10 }}>
              <PainelRelatorio id={ativo} onClose={() => setAtivo(null)} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RelatorioCard({ item, onClick, ativo, cor }) {
  const Icon = item.icon
  return (
    <div
      onClick={onClick}
      style={{
        background: ativo ? 'var(--blue-light)' : 'white',
        border: `1px solid ${ativo ? 'var(--blue)' : 'var(--gray-200)'}`,
        borderRadius: 9, padding: '12px 14px', cursor: 'pointer',
        transition: 'all .15s', display: 'flex', alignItems: 'flex-start', gap: 12
      }}
      onMouseEnter={e => { if (!ativo) e.currentTarget.style.borderColor = 'var(--gray-300)' }}
      onMouseLeave={e => { if (!ativo) e.currentTarget.style.borderColor = 'var(--gray-200)' }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        background: ativo ? 'var(--blue)' : 'var(--blue-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Icon size={16} color={ativo ? 'white' : cor || 'var(--blue)'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: ativo ? 'var(--blue)' : 'var(--gray-900)', lineHeight: 1.3 }}>
          {item.titulo}
          {item.destaque && <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px' }}>Destaque</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 3, lineHeight: 1.4 }}>{item.desc}</div>
      </div>
      <ChevronRight size={13} style={{ color: 'var(--gray-300)', flexShrink: 0, marginTop: 2, transform: ativo ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
    </div>
  )
}

// Painel dinâmico de cada relatório
function PainelRelatorio({ id, onClose }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [pct, setPct] = useState(5)
  const [mes, setMes] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    loadData()
  }, [id, mes])

  async function loadData() {
    setLoading(true)
    try {
      if (id === 'inicio-colaboradores' || id === 'tempo-de-casa') {
        const { data } = await supabase.from('colaboradores').select('nome, funcao, departamento, data_admissao, vinculo, ativo').order('data_admissao')
        setData(data || [])
      } else if (id === 'aniversariantes') {
        const { data } = await supabase.from('colaboradores').select('nome, data_nascimento, funcao, departamento').not('data_nascimento', 'is', null).order('data_nascimento')
        setData((data || []).filter(c => c.data_nascimento && new Date(c.data_nascimento + 'T00:00:00').getMonth() + 1 === mes))
      } else if (id === 'documentos-pendentes') {
        const { data: dc } = await supabase.from('documentos_colaborador').select('tipo, colaborador_id, status').eq('status', 'pendente')
        const { data: dp } = await supabase.from('documentos_professor').select('tipo, professor_id, status').eq('status', 'pendente')
        setData([...(dc || []).map(d => ({ ...d, origem: 'Colaborador' })), ...(dp || []).map(d => ({ ...d, origem: 'Professor' }))])
      } else if (id === 'alteracoes-salariais') {
        const { data } = await supabase.from('historico_salarial').select('*, colaboradores(nome)').order('created_at', { ascending: false }).limit(50)
        setData(data || [])
      } else if (id === 'contratos-docentes' || id === 'contratos-vencer') {
        const { data } = await supabase.from('contratos_professor').select('*, professores(nome, curso_principal)').eq('status', 'ativo').order('data_fim')
        setData(data || [])
      } else if (id === 'colaboradores-setor') {
        const { data } = await supabase.from('colaboradores').select('departamento, vinculo').eq('ativo', true)
        const agrupado = (data || []).reduce((acc, c) => { acc[c.departamento] = (acc[c.departamento] || 0) + 1; return acc }, {})
        setData(Object.entries(agrupado).map(([dep, total]) => ({ departamento: dep, total })).sort((a, b) => b.total - a.total))
      } else if (id === 'docentes-curso') {
        const { data } = await supabase.from('professores').select('curso_principal, titulacao, plano').eq('ativo', true)
        const agrupado = (data || []).reduce((acc, p) => { acc[p.curso_principal] = (acc[p.curso_principal] || 0) + 1; return acc }, {})
        setData(Object.entries(agrupado).map(([curso, total]) => ({ curso, total })).sort((a, b) => b.total - a.total))
      } else if (id === 'disciplinas-professor' || id === 'ch-semanal') {
        const { data } = await supabase.from('disciplinas_professor').select('*, professores(nome, titulacao, plano)').order('semestre', { ascending: false })
        setData(data || [])
      } else if (id === 'previsao-reajuste-adm') {
        const { data } = await supabase.from('colaboradores').select('nome, funcao, departamento, salario_base, vinculo').eq('ativo', true).order('nome')
        setData(data || [])
      } else if (id === 'previsao-reajuste-doc') {
        const { data } = await supabase.from('professores').select('nome, plano, titulacao, vinculo, valor_hora_teorica, curso_principal').eq('ativo', true).order('nome')
        setData(data || [])
      } else {
        setData([])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function exportCSV() {
    if (!data.length) return
    const headers = Object.keys(data[0]).join(';')
    const rows = data.map(r => Object.values(r).map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${id}.csv`; a.click()
  }

  const MESES_LIST = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ padding: '10px 14px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {GRUPOS.flatMap(g => g.itens).find(i => i.id === id)?.titulo}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {id === 'aniversariantes' && (
            <select className="form-select" style={{ padding: '4px 8px', fontSize: 12 }} value={mes} onChange={e => setMes(parseInt(e.target.value))}>
              {MESES_LIST.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          )}
          {(id === 'previsao-reajuste-adm' || id === 'previsao-reajuste-doc') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--gray-500)' }}>Reajuste %:</label>
              <input type="number" step="0.5" value={pct} onChange={e => setPct(parseFloat(e.target.value) || 0)}
                style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--gray-200)', fontSize: 12 }} />
            </div>
          )}
          <button className="btn btn-sm" onClick={exportCSV}><Download size={12} /> CSV</button>
          <button className="btn btn-sm" onClick={onClose}>Fechar ✕</button>
        </div>
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        : data.length === 0
        ? <div className="empty-state" style={{ padding: 24 }}><p>Nenhum dado encontrado.</p></div>
        : <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                {id === 'inicio-colaboradores' && <><th>Nome</th><th>Função</th><th>Departamento</th><th>Vínculo</th><th>Admissão</th><th>Situação</th></>}
                {id === 'tempo-de-casa' && <><th>Nome</th><th>Função</th><th>Admissão</th><th>Tempo de casa</th><th>Situação</th></>}
                {id === 'aniversariantes' && <><th>Nome</th><th>Função</th><th>Departamento</th><th>Nascimento</th></>}
                {id === 'documentos-pendentes' && <><th>Tipo documento</th><th>Origem</th><th>Status</th></>}
                {id === 'alteracoes-salariais' && <><th>Colaborador</th><th>Tipo</th><th>Anterior</th><th>Novo</th><th>%</th><th>Vigência</th><th>Observações</th></>}
                {(id === 'contratos-docentes' || id === 'contratos-vencer') && <><th>Professor</th><th>Curso</th><th>Tipo</th><th>Semestre</th><th>Início</th><th>Fim</th><th>Renovações</th></>}
                {id === 'colaboradores-setor' && <><th>Departamento</th><th>Total</th></>}
                {id === 'docentes-curso' && <><th>Curso</th><th>Total docentes</th></>}
                {(id === 'disciplinas-professor' || id === 'ch-semanal') && <><th>Professor</th><th>Semestre</th><th>Disciplina</th><th>Turma</th><th>H.Teóricas/sem</th><th>H.Práticas/sem</th><th>Total/sem</th><th>Est. mensal</th></>}
                {id === 'previsao-reajuste-adm' && <><th>Colaborador</th><th>Função</th><th>Salário atual</th><th>Reajuste ({pct}%)</th><th>Novo salário</th><th>Diferença/mês</th></>}
                {id === 'previsao-reajuste-doc' && <><th>Professor</th><th>Plano</th><th>H/h atual</th><th>Reajuste ({pct}%)</th><th>Novo H/h</th><th>Curso</th></>}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {id === 'inicio-colaboradores' && <>
                    <td style={{ fontWeight: 500 }}>{row.nome}</td><td>{row.funcao}</td><td>{row.departamento}</td>
                    <td><span className="badge badge-blue">{row.vinculo}</span></td>
                    <td style={{ fontSize: 12 }}>{formatDate(row.data_admissao)}</td>
                    <td><span className={`badge ${row.ativo ? 'badge-green' : 'badge-gray'}`}>{row.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  </>}
                  {id === 'tempo-de-casa' && <>
                    <td style={{ fontWeight: 500 }}>{row.nome}</td><td>{row.funcao}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(row.data_admissao)}</td>
                    <td style={{ fontWeight: 500 }}>{tempoServico(row.data_admissao)}</td>
                    <td><span className={`badge ${row.ativo ? 'badge-green' : 'badge-gray'}`}>{row.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  </>}
                  {id === 'aniversariantes' && <>
                    <td style={{ fontWeight: 500 }}>{row.nome}</td><td>{row.funcao}</td><td>{row.departamento}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(row.data_nascimento)}</td>
                  </>}
                  {id === 'documentos-pendentes' && <>
                    <td style={{ fontWeight: 500 }}>{row.tipo}</td>
                    <td><span className={`badge ${row.origem === 'Colaborador' ? 'badge-blue' : 'badge-purple'}`}>{row.origem}</span></td>
                    <td><span className="badge badge-amber">Pendente</span></td>
                  </>}
                  {id === 'alteracoes-salariais' && <>
                    <td style={{ fontWeight: 500 }}>{row.colaboradores?.nome}</td>
                    <td><span className="badge badge-blue">{row.tipo}</span></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{row.salario_anterior ? formatMoeda(row.salario_anterior) : '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{formatMoeda(row.novo_salario)}</td>
                    <td style={{ fontSize: 12, color: row.percentual > 0 ? 'var(--green)' : 'var(--gray-500)' }}>{row.percentual ? `+${row.percentual}%` : '—'}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(row.data_vigencia)}</td>
                    <td style={{ fontSize: 11, color: 'var(--gray-500)', maxWidth: 200 }}>{row.observacoes || '—'}</td>
                  </>}
                  {(id === 'contratos-docentes' || id === 'contratos-vencer') && <>
                    <td style={{ fontWeight: 500 }}>{row.professores?.nome}</td>
                    <td style={{ fontSize: 12 }}>{row.professores?.curso_principal}</td>
                    <td><span className="badge badge-blue">{row.tipo}</span></td>
                    <td style={{ fontSize: 12 }}>{row.semestre || '—'}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(row.data_inicio)}</td>
                    <td style={{ fontSize: 12 }}>{row.data_fim ? formatDate(row.data_fim) : '—'}</td>
                    <td style={{ fontSize: 12 }}>{row.renovacoes || 0}</td>
                  </>}
                  {id === 'colaboradores-setor' && <>
                    <td style={{ fontWeight: 500 }}>{row.departamento}</td>
                    <td style={{ fontWeight: 700, color: 'var(--blue)' }}>{row.total}</td>
                  </>}
                  {id === 'docentes-curso' && <>
                    <td style={{ fontWeight: 500 }}>{row.curso}</td>
                    <td style={{ fontWeight: 700, color: 'var(--blue)' }}>{row.total}</td>
                  </>}
                  {(id === 'disciplinas-professor' || id === 'ch-semanal') && <>
                    <td style={{ fontWeight: 500 }}>{row.professores?.nome}</td>
                    <td><span className="badge badge-blue">{row.semestre}</span></td>
                    <td>{row.disciplina}</td>
                    <td style={{ fontSize: 12 }}>{row.turma || '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{row.horas_semanais_teoricas}h</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{row.horas_semanais_praticas}h</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{((row.horas_semanais_teoricas || 0) + (row.horas_semanais_praticas || 0)).toFixed(1)}h</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{(((row.horas_semanais_teoricas || 0) + (row.horas_semanais_praticas || 0)) * 4.5).toFixed(1)}h</td>
                  </>}
                  {id === 'previsao-reajuste-adm' && <>
                    <td style={{ fontWeight: 500 }}>{row.nome}</td>
                    <td style={{ fontSize: 12 }}>{row.funcao}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{formatMoeda(row.salario_base)}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)' }}>+{formatMoeda(row.salario_base * pct / 100)}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{formatMoeda(row.salario_base * (1 + pct / 100))}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)' }}>+{formatMoeda(row.salario_base * pct / 100)}</td>
                  </>}
                  {id === 'previsao-reajuste-doc' && <>
                    <td style={{ fontWeight: 500 }}>{row.nome}</td>
                    <td><span className="badge badge-purple">{row.plano}</span></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{row.valor_hora_teorica ? `R$ ${row.valor_hora_teorica.toFixed(2)}/h` : '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)' }}>+{row.valor_hora_teorica ? `R$ ${(row.valor_hora_teorica * pct / 100).toFixed(2)}/h` : '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{row.valor_hora_teorica ? `R$ ${(row.valor_hora_teorica * (1 + pct / 100)).toFixed(2)}/h` : '—'}</td>
                    <td style={{ fontSize: 12 }}>{row.curso_principal}</td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  )
}
