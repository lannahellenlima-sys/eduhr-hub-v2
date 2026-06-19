import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Download, Edit2, Trash2, UserMinus, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate, formatMoeda } from '../lib/utils'
import toast from 'react-hot-toast'

const MOTIVOS = [
  { value: 'pedido_demissao', label: 'Pedido de demissão', cor: 'badge-blue' },
  { value: 'demissao_sem_justa_causa', label: 'Demissão sem justa causa', cor: 'badge-amber' },
  { value: 'demissao_justa_causa', label: 'Demissão por justa causa', cor: 'badge-red' },
  { value: 'termino_contrato', label: 'Término de contrato', cor: 'badge-gray' },
  { value: 'acordo_mutuo', label: 'Acordo mútuo (Art. 484-A)', cor: 'badge-purple' },
  { value: 'aposentadoria', label: 'Aposentadoria', cor: 'badge-green' },
  { value: 'falecimento', label: 'Falecimento', cor: 'badge-gray' },
  { value: 'outro', label: 'Outro', cor: 'badge-gray' },
]

// Direitos por motivo
const DIREITOS = {
  pedido_demissao: { aviso: true, fgts: false, saldoSalario: true, feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true },
  demissao_sem_justa_causa: { aviso: true, fgts: true, saldoSalario: true, feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true },
  demissao_justa_causa: { aviso: false, fgts: false, saldoSalario: true, feriasVencidas: true, feriasProporcionais: false, decimoTerceiro: false },
  termino_contrato: { aviso: true, fgts: true, saldoSalario: true, feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true },
  acordo_mutuo: { aviso: false, fgts: true, saldoSalario: true, feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true },
  aposentadoria: { aviso: false, fgts: false, saldoSalario: true, feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true },
  falecimento: { aviso: false, fgts: true, saldoSalario: true, feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true },
  outro: { aviso: false, fgts: false, saldoSalario: true, feriasVencidas: true, feriasProporcionais: true, decimoTerceiro: true },
}

export default function Rescisoes() {
  const { user } = useAuth()
  const [rescisoes, setRescisoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [colaboradores, setColaboradores] = useState([])

  const fetchRescisoes = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('rescisoes').select('*').order('data_desligamento', { ascending: false })
    if (busca) q = q.ilike('pessoa_nome', `%${busca}%`)
    const { data } = await q
    setRescisoes(data || [])
    setLoading(false)
  }, [busca])

  useEffect(() => { fetchRescisoes() }, [fetchRescisoes])

  useEffect(() => {
    supabase.from('colaboradores').select('id, nome, cpf, data_admissao, salario_base').order('nome').then(({ data }) => setColaboradores(data || []))
  }, [])

  async function handleDelete(id) {
    if (!confirm('Excluir este registro de rescisão?')) return
    await supabase.from('rescisoes').delete().eq('id', id)
    toast.success('Excluído!')
    fetchRescisoes()
  }

  function exportarCSV() {
    const headers = 'Nome;CPF;Admissão;Desligamento;Motivo;Total líquido;Homologado'
    const rows = rescisoes.map(r =>
      `${r.pessoa_nome};${r.cpf || ''};${formatDate(r.data_admissao)};${formatDate(r.data_desligamento)};${MOTIVOS.find(m => m.value === r.motivo)?.label || r.motivo};${r.total_liquido?.toFixed(2)};${r.homologado ? 'Sim' : 'Não'}`
    ).join('\n')
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'rescisoes.csv'; a.click()
  }

  const totalPago = rescisoes.reduce((s, r) => s + (r.total_liquido || 0), 0)
  const naoHomologadas = rescisoes.filter(r => !r.homologado).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Rescisões e Desligamentos</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            Controle de desligamentos com cálculo automático de verbas rescisórias
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={exportarCSV}><Download size={13} /> CSV</button>
          <button className="btn btn-primary" onClick={() => { setEditando(null); setModal(true) }}>
            <Plus size={13} /> Nova rescisão
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total rescisões', valor: rescisoes.length, cor: 'var(--blue)' },
          { label: 'Não homologadas', valor: naoHomologadas, cor: naoHomologadas > 0 ? 'var(--amber)' : 'var(--green)' },
          { label: 'Total em verbas', valor: formatMoeda(totalPago), cor: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.cor }}>{s.valor}</div>
          </div>
        ))}
      </div>

      {naoHomologadas > 0 && (
        <div className="alert alert-amber" style={{ marginBottom: 14 }}>
          <AlertTriangle size={15} />
          <span>{naoHomologadas} rescisão(ões) pendente(s) de homologação!</span>
        </div>
      )}

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
        <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {/* Lista */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : rescisoes.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <UserMinus size={32} strokeWidth={1} />
            <p>Nenhuma rescisão registrada.</p>
          </div>
        ) : (
          <table className="table">
            <thead><tr>
              <th>Nome</th><th>CPF</th><th>Admissão</th><th>Desligamento</th><th>Motivo</th>
              <th>Saldo sal.</th><th>Férias</th><th>13º prop.</th><th>Total líquido</th><th>Homologado</th><th></th>
            </tr></thead>
            <tbody>
              {rescisoes.map(r => {
                const motivo = MOTIVOS.find(m => m.value === r.motivo)
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.pessoa_nome}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{r.cpf || '—'}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(r.data_admissao)}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(r.data_desligamento)}</td>
                    <td><span className={`badge ${motivo?.cor || 'badge-gray'}`} style={{ fontSize: 10 }}>{motivo?.label || r.motivo}</span></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{formatMoeda(r.saldo_salario)}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{formatMoeda((r.ferias_vencidas || 0) + (r.ferias_proporcionais || 0) + (r.um_terco_ferias || 0))}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{formatMoeda(r.decimo_terceiro_proporcional)}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{formatMoeda(r.total_liquido)}</td>
                    <td>
                      <span className={`badge ${r.homologado ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 10 }}>
                        {r.homologado ? `Homologado ${r.data_homologacao ? formatDate(r.data_homologacao) : ''}` : 'Pendente'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm" onClick={() => { setEditando(r); setModal(true) }}><Edit2 size={11} /></button>
                        <button className="btn btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(r.id)}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--blue-light)' }}>
                <td colSpan={8} style={{ padding: '8px 14px', fontWeight: 700, color: 'var(--blue)' }}>TOTAL</td>
                <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{formatMoeda(totalPago)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {modal && (
        <ModalRescisao
          dados={editando}
          colaboradores={colaboradores}
          userEmail={user?.email}
          onClose={() => { setModal(false); setEditando(null) }}
          onSaved={() => { setModal(false); setEditando(null); fetchRescisoes() }}
        />
      )}
    </div>
  )
}

function ModalRescisao({ dados, colaboradores, userEmail, onClose, onSaved }) {
  const isEdit = !!dados?.id
  const [form, setForm] = useState({
    tipo_pessoa: dados?.tipo_pessoa || 'colaborador',
    pessoa_id: dados?.pessoa_id || '',
    pessoa_nome: dados?.pessoa_nome || '',
    cpf: dados?.cpf || '',
    data_admissao: dados?.data_admissao || '',
    data_desligamento: dados?.data_desligamento || '',
    motivo: dados?.motivo || 'pedido_demissao',
    tipo_aviso: dados?.tipo_aviso || 'trabalhado',
    dias_aviso: dados?.dias_aviso || 30,
    salario_base: dados?.salario_base || '',
    saldo_salario: dados?.saldo_salario || 0,
    ferias_vencidas: dados?.ferias_vencidas || 0,
    ferias_proporcionais: dados?.ferias_proporcionais || 0,
    um_terco_ferias: dados?.um_terco_ferias || 0,
    decimo_terceiro_proporcional: dados?.decimo_terceiro_proporcional || 0,
    aviso_previo: dados?.aviso_previo || 0,
    multa_fgts: dados?.multa_fgts || 0,
    outros_creditos: dados?.outros_creditos || 0,
    descontos: dados?.descontos || 0,
    homologado: dados?.homologado || false,
    data_homologacao: dados?.data_homologacao || '',
    observacoes: dados?.observacoes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const direitos = DIREITOS[form.motivo] || DIREITOS.outro

  // Total calculado
  const total = (
    parseFloat(form.saldo_salario || 0) +
    parseFloat(form.ferias_vencidas || 0) +
    parseFloat(form.ferias_proporcionais || 0) +
    parseFloat(form.um_terco_ferias || 0) +
    parseFloat(form.decimo_terceiro_proporcional || 0) +
    parseFloat(form.aviso_previo || 0) +
    parseFloat(form.multa_fgts || 0) +
    parseFloat(form.outros_creditos || 0) -
    parseFloat(form.descontos || 0)
  )

  function onSelectColaborador(id) {
    const c = colaboradores.find(x => x.id === id)
    set('pessoa_id', id)
    if (c) {
      set('pessoa_nome', c.nome)
      set('cpf', c.cpf || '')
      set('data_admissao', c.data_admissao || '')
      set('salario_base', c.salario_base || '')
    }
  }

  async function handleSave() {
    if (!form.pessoa_nome || !form.data_desligamento || !form.motivo) {
      toast.error('Preencha nome, data de desligamento e motivo.')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      pessoa_id: form.pessoa_id || null,
      data_admissao: form.data_admissao || null,
      data_homologacao: form.data_homologacao || null,
      salario_base: parseFloat(form.salario_base) || null,
      saldo_salario: parseFloat(form.saldo_salario) || 0,
      ferias_vencidas: parseFloat(form.ferias_vencidas) || 0,
      ferias_proporcionais: parseFloat(form.ferias_proporcionais) || 0,
      um_terco_ferias: parseFloat(form.um_terco_ferias) || 0,
      decimo_terceiro_proporcional: parseFloat(form.decimo_terceiro_proporcional) || 0,
      aviso_previo: parseFloat(form.aviso_previo) || 0,
      multa_fgts: parseFloat(form.multa_fgts) || 0,
      outros_creditos: parseFloat(form.outros_creditos) || 0,
      descontos: parseFloat(form.descontos) || 0,
      dias_aviso: parseInt(form.dias_aviso) || 30,
      registrado_por: userEmail || 'RH',
    }
    if (isEdit) {
      const { error } = await supabase.from('rescisoes').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', dados.id)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      toast.success('Rescisão atualizada!')
    } else {
      const { error } = await supabase.from('rescisoes').insert(payload)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      toast.success('Rescisão registrada!')
      // Inativa colaborador
      if (form.pessoa_id) {
        await supabase.from('colaboradores').update({ ativo: false }).eq('id', form.pessoa_id)
      }
    }
    onSaved()
  }

  const fmtM = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar rescisão' : 'Registrar rescisão'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          {/* Identificação */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>Identificação</div>
          <div className="form-group">
            <label className="form-label">Colaborador *</label>
            <select className="form-select" value={form.pessoa_id} onChange={e => onSelectColaborador(e.target.value)}>
              <option value="">Selecione ou preencha abaixo</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <input className="form-input" style={{ marginTop: 6 }} placeholder="Nome" value={form.pessoa_nome} onChange={e => set('pessoa_nome', e.target.value)} />
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">CPF</label>
              <input className="form-input" value={form.cpf} onChange={e => set('cpf', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data admissão</label>
              <input className="form-input" type="date" value={form.data_admissao} onChange={e => set('data_admissao', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data desligamento *</label>
              <input className="form-input" type="date" value={form.data_desligamento} onChange={e => set('data_desligamento', e.target.value)} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Motivo *</label>
              <select className="form-select" value={form.motivo} onChange={e => set('motivo', e.target.value)}>
                {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Salário base</label>
              <input className="form-input" type="number" step="0.01" value={form.salario_base} onChange={e => set('salario_base', e.target.value)} />
            </div>
          </div>

          {/* Aviso prévio */}
          {direitos.aviso && (
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Tipo aviso prévio</label>
                <select className="form-select" value={form.tipo_aviso} onChange={e => set('tipo_aviso', e.target.value)}>
                  <option value="trabalhado">Trabalhado</option>
                  <option value="indenizado">Indenizado</option>
                  <option value="dispensado">Dispensado pelo empregador</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dias aviso</label>
                <input className="form-input" type="number" value={form.dias_aviso} onChange={e => set('dias_aviso', e.target.value)} />
              </div>
            </div>
          )}

          {/* Verbas */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>Verbas rescisórias</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Saldo de salário</label>
              <input className="form-input" type="number" step="0.01" value={form.saldo_salario} onChange={e => set('saldo_salario', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Férias vencidas</label>
              <input className="form-input" type="number" step="0.01" value={form.ferias_vencidas} onChange={e => set('ferias_vencidas', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Férias proporcionais</label>
              <input className="form-input" type="number" step="0.01" value={form.ferias_proporcionais} onChange={e => set('ferias_proporcionais', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">1/3 férias</label>
              <input className="form-input" type="number" step="0.01" value={form.um_terco_ferias} onChange={e => set('um_terco_ferias', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">13º proporcional</label>
              <input className="form-input" type="number" step="0.01" value={form.decimo_terceiro_proporcional} onChange={e => set('decimo_terceiro_proporcional', e.target.value)} />
            </div>
            {direitos.aviso && (
              <div className="form-group">
                <label className="form-label">Aviso prévio (valor)</label>
                <input className="form-input" type="number" step="0.01" value={form.aviso_previo} onChange={e => set('aviso_previo', e.target.value)} />
              </div>
            )}
            {direitos.fgts && (
              <div className="form-group">
                <label className="form-label">Multa FGTS (40%)</label>
                <input className="form-input" type="number" step="0.01" value={form.multa_fgts} onChange={e => set('multa_fgts', e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Outros créditos</label>
              <input className="form-input" type="number" step="0.01" value={form.outros_creditos} onChange={e => set('outros_creditos', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Descontos</label>
              <input className="form-input" type="number" step="0.01" value={form.descontos} onChange={e => set('descontos', e.target.value)} />
            </div>
          </div>

          {/* Total */}
          <div style={{ background: 'var(--blue)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'white', fontWeight: 600 }}>Total Líquido</span>
            <span style={{ color: '#FFB640', fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)' }}>{fmtM(total)}</span>
          </div>

          {/* Homologação */}
          <div className="form-grid-2">
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
                <input type="checkbox" checked={form.homologado} onChange={e => set('homologado', e.target.checked)} />
                Rescisão homologada
              </label>
            </div>
            {form.homologado && (
              <div className="form-group">
                <label className="form-label">Data homologação</label>
                <input className="form-input" type="date" value={form.data_homologacao} onChange={e => set('data_homologacao', e.target.value)} />
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Registrar rescisão'}
          </button>
        </div>
      </div>
    </div>
  )
}
