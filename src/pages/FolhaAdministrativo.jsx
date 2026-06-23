import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Plus, Save, Trash2, Copy, CheckSquare,
  Download, Lock, Unlock, CheckCircle, AlertCircle, Send
} from 'lucide-react'
import {
  useFolhasMensais, useLancamentosCLT, useLancamentosGratificacoes,
  useLancamentosCoordenadores, useLancamentosSocios, useLancamentosValeAlim,
  saveLancamentoCLT, saveLancamentoGratificacao, saveLancamentoCoordenador,
  saveLancamentoSocio, saveLancamentoValeAlim,
  deleteLancamento, atualizarStatusFolha, criarFolha, duplicarFolha, validarFolhaCompleta,
  calcLiquidoCLT, calcTotalGratificacao, calcTotalCoordenador, calcTotalSocio,
  exportarCSV
} from '../hooks/useFolhaAdm'
import { formatDate, formatMoeda } from '../lib/utils'
import toast from 'react-hot-toast'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const STATUS_BADGE = { aberta: 'badge-blue', em_conferencia: 'badge-amber', fechada: 'badge-green', enviada_financeiro: 'badge-purple' }
const STATUS_LABEL = { aberta: 'Aberta', em_conferencia: 'Em conferência', fechada: 'Fechada', enviada_financeiro: 'Enviada ao Financeiro' }
const ABAS = ['ADM CLT', 'Gratificações', 'Coordenadores', 'Sócios / Diretores', 'Vale-Alimentação']

export default function FolhaAdministrativo() {
  const { data: folhas, loading: loadingFolhas, refetch: refetchFolhas } = useFolhasMensais('administrativo')
  const [folhaIdx, setFolhaIdx] = useState(0)
  const [aba, setAba] = useState('ADM CLT')

  const folhaAtual = folhas[folhaIdx] || null
  const folhaId = folhaAtual?.id

  const { data: clt, refetch: refetchCLT } = useLancamentosCLT(folhaId)
  const { data: grat, refetch: refetchGrat } = useLancamentosGratificacoes(folhaId)
  const { data: coord, refetch: refetchCoord } = useLancamentosCoordenadores(folhaId)
  const { data: socios, refetch: refetchSocios } = useLancamentosSocios(folhaId)
  const { data: vale, refetch: refetchVale } = useLancamentosValeAlim(folhaId)

  const totalCLT = useMemo(() => clt.reduce((s, l) => s + calcLiquidoCLT(l), 0), [clt])
  const totalGrat = useMemo(() => grat.reduce((s, l) => s + calcTotalGratificacao(l), 0), [grat])
  const totalCoord = useMemo(() => coord.reduce((s, l) => s + calcTotalCoordenador(l), 0), [coord])
  const totalSocios = useMemo(() => socios.reduce((s, l) => s + calcTotalSocio(l), 0), [socios])
  const totalVale = useMemo(() => vale.reduce((s, l) => s + (l.valor_lancado || 0), 0), [vale])
  const totalGeral = totalCLT + totalGrat + totalCoord + totalSocios + totalVale

  const pendentes = [...clt, ...grat, ...coord, ...socios, ...vale].filter(l => l.status === 'rascunho').length
  const isFechada = folhaAtual?.status === 'fechada' || folhaAtual?.status === 'enviada_financeiro'

  async function handleFechar() {
    // Valida automaticamente ao fechar se ainda houver rascunhos
    if (pendentes > 0) {
      const confirma = window.confirm(`Há ${pendentes} lançamento(s) em rascunho. Deseja validar todos e fechar a folha?`)
      if (!confirma) return
      await validarFolhaCompleta(folhaId)
    }
    if (!confirm('Confirma o fechamento desta folha? Após fechar, os lançamentos não poderão ser editados.')) return
    const ok = await atualizarStatusFolha(folhaId, 'fechada', 'Lanna Hellen')
    if (ok) refetchFolhas()
  }

  async function handleReabrir() {
    if (!confirm('Deseja reabrir esta folha?')) return
    const ok = await atualizarStatusFolha(folhaId, 'aberta')
    if (ok) refetchFolhas()
  }

  async function handleDuplicar() {
    if (!folhaAtual) return
    if (!confirm(`Duplicar a folha de ${MESES[folhaAtual.mes - 1]}/${folhaAtual.ano} para o próximo mês? Os lançamentos serão copiados e descontos variáveis (farmácia, adiantamento) zerados.`)) return
    const mesDestino = (folhaAtual.mes % 12) + 1
    const anoDestino = mesDestino === 1 ? folhaAtual.ano + 1 : folhaAtual.ano
    const id = await duplicarFolha(folhaAtual.id, mesDestino, anoDestino)
    if (id) { await refetchFolhas(); setFolhaIdx(0) }
  }

  async function handleValidarTodos() {
    if (!folhaId) return
    if (!confirm('Validar todos os lançamentos em rascunho desta folha de uma vez?')) return
    const ok = await validarFolhaCompleta(folhaId)
    if (ok) { refetchCLT(); refetchGrat(); refetchCoord(); refetchSocios(); refetchVale() }
  }

  async function handleEnviarFinanceiro() {
    if (!confirm('Confirma o envio da folha ao Financeiro?')) return
    const ok = await atualizarStatusFolha(folhaId, 'enviada_financeiro')
    if (ok) refetchFolhas()
  }

  function exportar() {
    const dados = clt.map(l => ({
      Nome: l.colaborador_nome, Função: l.funcao, Departamento: l.departamento,
      'Salário Bruto': l.salario_bruto, 'Reajuste %': l.reajuste_pct,
      'Dias Trabalhados': l.dias_trabalhados, 'Ajuda de Custo': l.ajuda_custo,
      'Vale-Refeição': l.vale_refeicao, Gratificação: l.gratificacao, ATS: l.ats,
      Farmácia: l.farmacia, Adiantamento: l.adiantamento, 'Plano de Saúde': l.plano_saude,
      Líquido: calcLiquidoCLT(l).toFixed(2), Status: l.status
    }))
    exportarCSV(dados, `Folha_ADM_${MESES[(folhaAtual?.mes || 1) - 1]}_${folhaAtual?.ano}`)
  }

  if (loadingFolhas) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Folha Administrativa</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            {folhaAtual ? `${MESES[folhaAtual.mes - 1]}/${folhaAtual.ano}` : 'Selecione uma competência'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isFechada && pendentes === 0 && folhaAtual && (
            <button className="btn" style={{ color: 'var(--green)', borderColor: '#A8D575', background: 'var(--green-light)' }} onClick={handleFechar}>
              <Lock size={13} /> Fechar folha
            </button>
          )}
          {folhaAtual?.status === 'fechada' && (
            <>
              <button className="btn" onClick={handleReabrir}><Unlock size={13} /> Reabrir</button>
              <button className="btn btn-primary" onClick={handleEnviarFinanceiro}><Send size={13} /> Enviar ao Financeiro</button>
            </>
          )}
          <button className="btn" onClick={exportar}><Download size={13} /> Exportar CSV</button>
          {folhaAtual && !isFechada && pendentes > 0 && (
            <button className="btn" style={{ color: "var(--green)", borderColor: "#A8D575", background: "var(--green-light)" }} onClick={handleValidarTodos}>
              <CheckSquare size={13} /> Validar todos
            </button>
          )}
          {folhaAtual && (
            <button className="btn" onClick={handleDuplicar}>
              <Copy size={13} /> Duplicar mês anterior
            </button>
          )}
          <button className="btn btn-primary" onClick={async () => {
            const mes = (folhaAtual?.mes % 12) + 1
            const ano = mes === 1 ? (folhaAtual?.ano || new Date().getFullYear()) + 1 : (folhaAtual?.ano || new Date().getFullYear())
            const id = await criarFolha(mes, ano, 'administrativo')
            if (id) { await refetchFolhas(); setFolhaIdx(0) }
          }}><Plus size={13} /> Nova competência</button>
        </div>
      </div>

      {/* Seletor de competência */}
      {folhas.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button className="btn btn-sm" disabled={folhaIdx >= folhas.length - 1} onClick={() => setFolhaIdx(i => i + 1)}>
            <ChevronLeft size={14} />
          </button>
          <div className="card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{MESES[(folhaAtual?.mes || 1) - 1]}/{folhaAtual?.ano}</span>
            <span className={`badge ${STATUS_BADGE[folhaAtual?.status] || 'badge-gray'}`}>{STATUS_LABEL[folhaAtual?.status] || '—'}</span>
            {folhaAtual?.data_fechamento && <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>Fechada em {formatDate(folhaAtual.data_fechamento)} por {folhaAtual.fechada_por}</span>}
          </div>
          <button className="btn btn-sm" disabled={folhaIdx <= 0} onClick={() => setFolhaIdx(i => i - 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Totais por categoria */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'ADM CLT', valor: totalCLT },
          { label: 'Gratificações', valor: totalGrat },
          { label: 'Coordenadores', valor: totalCoord },
          { label: 'Sócios / Diretores', valor: totalSocios },
          { label: 'Vale-Alimentação', valor: totalVale },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{formatMoeda(s.valor)}</div>
          </div>
        ))}
        <div className="card" style={{ padding: '10px 14px', background: 'var(--blue)', border: 'none' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Total Geral</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white', fontFamily: 'var(--mono)' }}>{formatMoeda(totalGeral)}</div>
        </div>
      </div>

      {/* Alertas */}
      {pendentes > 0 && !isFechada && (
        <div className="alert alert-amber" style={{ marginBottom: 12 }}>
          <AlertCircle size={16} />
          <span><strong>{pendentes} lançamento(s) em rascunho</strong> — valide todos antes de fechar a folha.</span>
        </div>
      )}
      {isFechada && (
        <div className="alert alert-green" style={{ marginBottom: 12 }}>
          <CheckCircle size={16} />
          <span>Folha <strong>{STATUS_LABEL[folhaAtual?.status]}</strong> — lançamentos bloqueados para edição.</span>
        </div>
      )}

      {/* Abas */}
      <div className="tabs">
        {ABAS.map(a => (
          <button key={a} className={`tab-btn ${aba === a ? 'active' : ''}`} onClick={() => setAba(a)}>{a}</button>
        ))}
      </div>

      {!folhaId ? (
        <div className="empty-state"><p>Nenhuma folha disponível. Crie uma nova competência.</p></div>
      ) : (
        <>
          {aba === 'ADM CLT' && <TabelaCLT data={clt} folhaId={folhaId} locked={isFechada} onSaved={refetchCLT} />}
          {aba === 'Gratificações' && <TabelaGrat data={grat} folhaId={folhaId} locked={isFechada} onSaved={refetchGrat} />}
          {aba === 'Coordenadores' && <TabelaCoord data={coord} folhaId={folhaId} locked={isFechada} onSaved={refetchCoord} />}
          {aba === 'Sócios / Diretores' && <TabelaSocios data={socios} folhaId={folhaId} locked={isFechada} onSaved={refetchSocios} />}
          {aba === 'Vale-Alimentação' && <TabelaVale data={vale} folhaId={folhaId} locked={isFechada} onSaved={refetchVale} />}
        </>
      )}
    </div>
  )
}

// ─── Componente genérico de status ──────────────────────────────────
function StatusBadge({ status }) {
  const map = { validado: 'badge-green', aprovado: 'badge-green', rascunho: 'badge-amber', em_conferencia: 'badge-blue', cancelado: 'badge-red' }
  const label = { validado: 'Validado', aprovado: 'Aprovado', rascunho: 'Rascunho', em_conferencia: 'Em conferência', cancelado: 'Cancelado' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{label[status] || status}</span>
}

// ─── Tabela CLT ──────────────────────────────────────────────────────
function TabelaCLT({ data, folhaId, locked, onSaved }) {
  const [editing, setEditing] = useState(null)

  const novo = { folha_id: folhaId, colaborador_nome: '', funcao: '', departamento: '', vinculo: 'CLT', salario_bruto: 0, reajuste_pct: 0, dias_trabalhados: 30, ajuda_custo: 0, vale_refeicao: 0, gratificacao: 0, ats: 0, farmacia: 0, adiantamento: 0, plano_saude: 0, status: 'rascunho' }

  return (
    <div>
      {!locked && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}><button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...novo })}><Plus size={13} /> Novo lançamento</button></div>}
      <div className="card">
        {data.length === 0
          ? <div className="empty-state" style={{ padding: 32 }}><p>Nenhum lançamento CLT.</p></div>
          : <table className="table">
            <thead><tr>
              <th>Colaborador</th><th>Função / Depto</th><th>Vínculo</th>
              <th>Bruto</th><th>Dias</th><th>Acréscimos</th><th>Descontos</th>
              <th>Líquido</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {data.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.colaborador_nome}</td>
                  <td style={{ fontSize: 12 }}><div>{l.funcao}</div><div style={{ color: 'var(--gray-400)' }}>{l.departamento}</div></td>
                  <td><span className="badge badge-blue">{l.vinculo}</span></td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{formatMoeda(l.salario_bruto)}{l.reajuste_pct > 0 && <span style={{ color: 'var(--green)', fontSize: 10 }}> +{l.reajuste_pct}%</span>}</td>
                  <td style={{ fontSize: 12 }}>{l.dias_trabalhados}d{l.observacoes && <div style={{ fontSize: 10, color: 'var(--amber)' }}>{l.observacoes}</div>}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)' }}>+{formatMoeda((l.ajuda_custo || 0) + (l.vale_refeicao || 0) + (l.gratificacao || 0) + (l.ats || 0))}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)' }}>-{formatMoeda((l.farmacia || 0) + (l.adiantamento || 0) + (l.plano_saude || 0))}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{formatMoeda(calcLiquidoCLT(l))}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>
                    {!locked && <button className="btn btn-sm" onClick={() => setEditing(l)}>Editar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--gray-50)' }}>
                <td colSpan={7} style={{ padding: '8px 14px', fontWeight: 600, fontSize: 12 }}>Total ADM CLT</td>
                <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{formatMoeda(data.reduce((s, l) => s + calcLiquidoCLT(l), 0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        }
      </div>
      {editing && <ModalEdicaoCLT lancamento={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onSaved() }} />}
    </div>
  )
}

// ─── Modal edição CLT ────────────────────────────────────────────────
function ModalEdicaoCLT({ lancamento, onClose, onSaved }) {
  const [form, setForm] = useState({ ...lancamento })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const liquido = calcLiquidoCLT(form)

  async function handleSave() {
    setSaving(true)
    const ok = await saveLancamentoCLT(form, form.id || null)
    setSaving(false)
    if (ok) onSaved()
  }

  async function handleDelete() {
    if (!form.id || !confirm('Excluir este lançamento?')) return
    const ok = await deleteLancamento('lancamentos_adm_clt', form.id)
    if (ok) onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{form.id ? 'Editar lançamento CLT' : 'Novo lançamento CLT'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Colaborador *</label><input className="form-input" value={form.colaborador_nome} onChange={e => set('colaborador_nome', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Vínculo</label><select className="form-select" value={form.vinculo} onChange={e => set('vinculo', e.target.value)}>{['CLT', 'CLT Horista'].map(v => <option key={v}>{v}</option>)}</select></div>
          </div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Função</label><input className="form-input" value={form.funcao} onChange={e => set('funcao', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Departamento</label><input className="form-input" value={form.departamento} onChange={e => set('departamento', e.target.value)} /></div>
          </div>
          <div className="form-grid-3">
            <div className="form-group"><label className="form-label">Salário bruto</label><input className="form-input" type="number" step="0.01" value={form.salario_bruto} onChange={e => set('salario_bruto', parseFloat(e.target.value) || 0)} /></div>
            <div className="form-group"><label className="form-label">Reajuste %</label><input className="form-input" type="number" step="0.1" value={form.reajuste_pct} onChange={e => set('reajuste_pct', parseFloat(e.target.value) || 0)} /></div>
            <div className="form-group"><label className="form-label">Dias trabalhados</label><input className="form-input" type="number" min="0" max="31" value={form.dias_trabalhados} onChange={e => set('dias_trabalhados', parseInt(e.target.value) || 30)} /></div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Acréscimos</div>
          <div className="form-grid-3" style={{ marginBottom: 12 }}>
            <div className="form-group"><label className="form-label">Ajuda de custo</label><input className="form-input" type="number" step="0.01" value={form.ajuda_custo} onChange={e => set('ajuda_custo', parseFloat(e.target.value) || 0)} /></div>
            <div className="form-group"><label className="form-label">Vale-refeição</label><input className="form-input" type="number" step="0.01" value={form.vale_refeicao} onChange={e => set('vale_refeicao', parseFloat(e.target.value) || 0)} /></div>
            <div className="form-group"><label className="form-label">Gratificação</label><input className="form-input" type="number" step="0.01" value={form.gratificacao} onChange={e => set('gratificacao', parseFloat(e.target.value) || 0)} /></div>
            <div className="form-group"><label className="form-label">ATS</label><input className="form-input" type="number" step="0.01" value={form.ats} onChange={e => set('ats', parseFloat(e.target.value) || 0)} /></div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Descontos</div>
          <div className="form-grid-3" style={{ marginBottom: 12 }}>
            <div className="form-group"><label className="form-label">Farmácia</label><input className="form-input" type="number" step="0.01" value={form.farmacia} onChange={e => set('farmacia', parseFloat(e.target.value) || 0)} /></div>
            <div className="form-group"><label className="form-label">Adiantamento</label><input className="form-input" type="number" step="0.01" value={form.adiantamento} onChange={e => set('adiantamento', parseFloat(e.target.value) || 0)} /></div>
            <div className="form-group"><label className="form-label">Plano de saúde</label><input className="form-input" type="number" step="0.01" value={form.plano_saude} onChange={e => set('plano_saude', parseFloat(e.target.value) || 0)} /></div>
          </div>
          <div style={{ background: 'var(--blue-light)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 500 }}>Líquido calculado</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{formatMoeda(liquido)}</span>
          </div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>{['rascunho', 'validado', 'aprovado', 'em_conferencia'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Observações</label><input className="form-input" value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer">
          {form.id && <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={12} /> Excluir</button>}
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.colaborador_nome}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Tabela Gratificações ────────────────────────────────────────────
function TabelaGrat({ data, folhaId, locked, onSaved }) {
  const [editing, setEditing] = useState(null)
  const novo = { folha_id: folhaId, colaborador_nome: '', atividade: '', inicio: '', valor_bruto: 0, reajuste_pct: 0, ajuda_custo: 0, status: 'rascunho' }
  return (
    <div>
      {!locked && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}><button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...novo })}><Plus size={13} /> Nova gratificação</button></div>}
      <div className="card">
        {data.length === 0 ? <div className="empty-state" style={{ padding: 32 }}><p>Nenhuma gratificação lançada.</p></div>
          : <table className="table">
            <thead><tr><th>Colaborador</th><th>Atividade</th><th>Início</th><th>Valor bruto</th><th>Ajuda custo</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.colaborador_nome}</td>
                  <td style={{ fontSize: 12 }}>{l.atividade}</td>
                  <td style={{ fontSize: 12 }}>{formatDate(l.inicio)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{formatMoeda(l.valor_bruto)}{l.reajuste_pct > 0 && <span style={{ color: 'var(--green)', fontSize: 10 }}> +{l.reajuste_pct}%</span>}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{formatMoeda(l.ajuda_custo)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{formatMoeda(calcTotalGratificacao(l))}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>{!locked && <button className="btn btn-sm" onClick={() => setEditing(l)}>Editar</button>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{ background: 'var(--gray-50)' }}><td colSpan={5} style={{ padding: '8px 14px', fontWeight: 600, fontSize: 12 }}>Total Gratificações</td><td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{formatMoeda(data.reduce((s, l) => s + calcTotalGratificacao(l), 0))}</td><td colSpan={2} /></tr></tfoot>
          </table>
        }
      </div>
      {editing && (
        <ModalSimples title={editing.id ? 'Editar gratificação' : 'Nova gratificação'} form={editing} campos={[
          { key: 'colaborador_nome', label: 'Colaborador *', type: 'text' },
          { key: 'atividade', label: 'Atividade *', type: 'text' },
          { key: 'inicio', label: 'Início', type: 'date' },
          { key: 'valor_bruto', label: 'Valor bruto', type: 'number' },
          { key: 'reajuste_pct', label: 'Reajuste %', type: 'number' },
          { key: 'ajuda_custo', label: 'Ajuda de custo', type: 'number' },
          { key: 'status', label: 'Status', type: 'select', options: ['rascunho', 'validado', 'aprovado'] },
        ]}
          onSave={async (f) => { const ok = await saveLancamentoGratificacao(f, f.id || null); if (ok) { setEditing(null); onSaved() } }}
          onDelete={async (id) => { const ok = await deleteLancamento('lancamentos_gratificacoes', id); if (ok) { setEditing(null); onSaved() } }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Tabela Coordenadores ─────────────────────────────────────────────
function TabelaCoord({ data, folhaId, locked, onSaved }) {
  const [editing, setEditing] = useState(null)
  const novo = { folha_id: folhaId, nome: '', atividade: '', inicio: '', valor: 0, reajuste_pct: 0, plano_saude: 0, status: 'rascunho' }
  return (
    <div>
      {!locked && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}><button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...novo })}><Plus size={13} /> Novo coordenador</button></div>}
      <div className="card">
        {data.length === 0 ? <div className="empty-state" style={{ padding: 32 }}><p>Nenhum coordenador lançado.</p></div>
          : <table className="table">
            <thead><tr><th>Nome</th><th>Atividade</th><th>Início</th><th>Valor</th><th>Plano de saúde</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.nome}</td>
                  <td style={{ fontSize: 12 }}>{l.atividade}</td>
                  <td style={{ fontSize: 12 }}>{formatDate(l.inicio)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{formatMoeda(l.valor)}{l.reajuste_pct > 0 && <span style={{ color: 'var(--green)', fontSize: 10 }}> +{l.reajuste_pct}%</span>}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)' }}>-{formatMoeda(l.plano_saude)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{formatMoeda(calcTotalCoordenador(l))}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>{!locked && <button className="btn btn-sm" onClick={() => setEditing(l)}>Editar</button>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{ background: 'var(--gray-50)' }}><td colSpan={5} style={{ padding: '8px 14px', fontWeight: 600, fontSize: 12 }}>Total Coordenadores</td><td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{formatMoeda(data.reduce((s, l) => s + calcTotalCoordenador(l), 0))}</td><td colSpan={2} /></tr></tfoot>
          </table>
        }
      </div>
      {editing && (
        <ModalSimples title={editing.id ? 'Editar coordenador' : 'Novo coordenador'} form={editing} campos={[
          { key: 'nome', label: 'Nome *', type: 'text' },
          { key: 'atividade', label: 'Atividade *', type: 'text' },
          { key: 'inicio', label: 'Início', type: 'date' },
          { key: 'valor', label: 'Valor', type: 'number' },
          { key: 'reajuste_pct', label: 'Reajuste %', type: 'number' },
          { key: 'plano_saude', label: 'Plano de saúde', type: 'number' },
          { key: 'status', label: 'Status', type: 'select', options: ['rascunho', 'validado', 'aprovado'] },
        ]}
          onSave={async (f) => { const ok = await saveLancamentoCoordenador(f, f.id || null); if (ok) { setEditing(null); onSaved() } }}
          onDelete={async (id) => { const ok = await deleteLancamento('lancamentos_coordenadores', id); if (ok) { setEditing(null); onSaved() } }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Tabela Sócios ───────────────────────────────────────────────────
function TabelaSocios({ data, folhaId, locked, onSaved }) {
  const [editing, setEditing] = useState(null)
  const novo = { folha_id: folhaId, nome: '', atividade: '', salario_base: 0, reajuste_pct: 0, dias_trabalhados: 30, ats: 0, gratificacao: 0, sociedade: 0, farmacia: 0, plano_saude: 0, adiantamento: 0, status: 'rascunho' }
  return (
    <div>
      {!locked && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}><button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...novo })}><Plus size={13} /> Novo sócio</button></div>}
      <div className="card">
        {data.length === 0 ? <div className="empty-state" style={{ padding: 32 }}><p>Nenhum sócio/diretor lançado.</p></div>
          : <table className="table">
            <thead><tr><th>Nome</th><th>Atividade</th><th>Salário base</th><th>Dias</th><th>Sociedade</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.nome}</td>
                  <td style={{ fontSize: 12 }}>{l.atividade}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{formatMoeda(l.salario_base)}</td>
                  <td style={{ fontSize: 12 }}>{l.dias_trabalhados}d</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{formatMoeda(l.sociedade)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{formatMoeda(calcTotalSocio(l))}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>{!locked && <button className="btn btn-sm" onClick={() => setEditing(l)}>Editar</button>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{ background: 'var(--gray-50)' }}><td colSpan={5} style={{ padding: '8px 14px', fontWeight: 600, fontSize: 12 }}>Total Sócios / Diretores</td><td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{formatMoeda(data.reduce((s, l) => s + calcTotalSocio(l), 0))}</td><td colSpan={2} /></tr></tfoot>
          </table>
        }
      </div>
      {editing && (
        <ModalSimples title={editing.id ? 'Editar sócio/diretor' : 'Novo sócio/diretor'} form={editing} campos={[
          { key: 'nome', label: 'Nome *', type: 'text' },
          { key: 'atividade', label: 'Atividade', type: 'text' },
          { key: 'salario_base', label: 'Salário base', type: 'number' },
          { key: 'reajuste_pct', label: 'Reajuste %', type: 'number' },
          { key: 'dias_trabalhados', label: 'Dias trabalhados', type: 'number' },
          { key: 'ats', label: 'ATS', type: 'number' },
          { key: 'gratificacao', label: 'Gratificação', type: 'number' },
          { key: 'sociedade', label: 'Sociedade', type: 'number' },
          { key: 'farmacia', label: 'Farmácia', type: 'number' },
          { key: 'plano_saude', label: 'Plano de saúde', type: 'number' },
          { key: 'adiantamento', label: 'Adiantamento', type: 'number' },
          { key: 'status', label: 'Status', type: 'select', options: ['rascunho', 'validado', 'aprovado'] },
        ]}
          onSave={async (f) => { const ok = await saveLancamentoSocio(f, f.id || null); if (ok) { setEditing(null); onSaved() } }}
          onDelete={async (id) => { const ok = await deleteLancamento('lancamentos_socios', id); if (ok) { setEditing(null); onSaved() } }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Tabela Vale-Alimentação ─────────────────────────────────────────
function TabelaVale({ data, folhaId, locked, onSaved }) {
  const [editing, setEditing] = useState(null)
  const novo = { folha_id: folhaId, colaborador_nome: '', funcao: '', valor_padrao: 600, valor_lancado: 600, status: 'rascunho' }
  return (
    <div>
      {!locked && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}><button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...novo })}><Plus size={13} /> Novo lançamento</button></div>}
      <div className="card">
        {data.length === 0 ? <div className="empty-state" style={{ padding: 32 }}><p>Nenhum lançamento de vale-alimentação.</p></div>
          : <table className="table">
            <thead><tr><th>Colaborador</th><th>Função</th><th>Valor padrão</th><th>Valor lançado</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.colaborador_nome}</td>
                  <td style={{ fontSize: 12 }}>{l.funcao}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--gray-400)' }}>{formatMoeda(l.valor_padrao)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{formatMoeda(l.valor_lancado)}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>{!locked && <button className="btn btn-sm" onClick={() => setEditing(l)}>Editar</button>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{ background: 'var(--gray-50)' }}><td colSpan={3} style={{ padding: '8px 14px', fontWeight: 600, fontSize: 12 }}>Total Vale-Alimentação</td><td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{formatMoeda(data.reduce((s, l) => s + (l.valor_lancado || 0), 0))}</td><td colSpan={2} /></tr></tfoot>
          </table>
        }
      </div>
      {editing && (
        <ModalSimples title={editing.id ? 'Editar vale-alimentação' : 'Novo vale-alimentação'} form={editing} campos={[
          { key: 'colaborador_nome', label: 'Colaborador *', type: 'text' },
          { key: 'funcao', label: 'Função', type: 'text' },
          { key: 'valor_padrao', label: 'Valor padrão', type: 'number' },
          { key: 'valor_lancado', label: 'Valor lançado', type: 'number' },
          { key: 'observacoes', label: 'Observações', type: 'text' },
          { key: 'status', label: 'Status', type: 'select', options: ['rascunho', 'validado', 'aprovado'] },
        ]}
          onSave={async (f) => { const ok = await saveLancamentoValeAlim(f, f.id || null); if (ok) { setEditing(null); onSaved() } }}
          onDelete={async (id) => { const ok = await deleteLancamento('lancamentos_vale_alim', id); if (ok) { setEditing(null); onSaved() } }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Modal genérico para formulários simples ──────────────────────────
function ModalSimples({ title, form: initialForm, campos, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ ...initialForm })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {campos.map(c => (
              <div key={c.key} className="form-group" style={c.full ? { gridColumn: '1/-1' } : {}}>
                <label className="form-label">{c.label}</label>
                {c.type === 'select'
                  ? <select className="form-select" value={form[c.key] || ''} onChange={e => set(c.key, e.target.value)}>{c.options.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}</select>
                  : <input className="form-input" type={c.type} step={c.type === 'number' ? '0.01' : undefined} value={form[c.key] || ''} onChange={e => set(c.key, c.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)} />
                }
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          {form.id && onDelete && <button className="btn btn-danger btn-sm" onClick={() => onDelete(form.id)}><Trash2 size={12} /> Excluir</button>}
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}
