import { useState } from 'react'
import { X } from 'lucide-react'
import { addHistoricoSalarial } from '../hooks/useColaboradores'
import { formatMoeda } from '../lib/utils'

const TIPOS = ['Reajuste geral', 'Promoção', 'Progressão de plano', 'Correção', 'Outro']

export default function ModalNovoSalario({ colaboradorId, salarioAtual, onClose, onSaved }) {
  const [form, setForm] = useState({
    tipo: 'Reajuste geral',
    novo_salario: '',
    data_vigencia: new Date().toISOString().split('T')[0],
    observacoes: '',
    registrado_por: 'Lanna Hellen',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const percentual = form.novo_salario && salarioAtual
    ? (((parseFloat(form.novo_salario) - salarioAtual) / salarioAtual) * 100).toFixed(1)
    : null

  async function handleSave() {
    if (!form.novo_salario || !form.data_vigencia) return
    setSaving(true)
    const ok = await addHistoricoSalarial({
      colaborador_id: colaboradorId,
      tipo: form.tipo,
      salario_anterior: salarioAtual,
      novo_salario: parseFloat(form.novo_salario),
      percentual: percentual ? parseFloat(percentual) : null,
      data_vigencia: form.data_vigencia,
      observacoes: form.observacoes || null,
      registrado_por: form.registrado_por,
    })
    setSaving(false)
    if (ok) { onSaved(); onClose() }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Registrar alteração salarial</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Tipo de alteração</label>
            <select className="form-select" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Salário anterior</label>
              <input className="form-input" value={formatMoeda(salarioAtual)} disabled style={{ background: 'var(--gray-50)', color: 'var(--gray-400)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Novo salário *</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.novo_salario}
                onChange={e => set('novo_salario', e.target.value)}
              />
            </div>
          </div>

          {percentual && (
            <div className={`alert ${parseFloat(percentual) >= 0 ? 'alert-green' : 'alert-red'}`} style={{ fontSize: 13 }}>
              Variação: <strong>{parseFloat(percentual) >= 0 ? '+' : ''}{percentual}%</strong>
              {' '}({parseFloat(percentual) >= 0 ? '+' : ''}{formatMoeda(parseFloat(form.novo_salario) - salarioAtual)})
            </div>
          )}

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Data de vigência *</label>
              <input
                className="form-input"
                type="date"
                value={form.data_vigencia}
                onChange={e => set('data_vigencia', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Registrado por</label>
              <input
                className="form-input"
                value={form.registrado_por}
                onChange={e => set('registrado_por', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Observações / justificativa</label>
            <textarea
              className="form-textarea"
              placeholder="Descreva o motivo da alteração, aprovações necessárias, referências a documentos de autorização..."
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !form.novo_salario || !form.data_vigencia}
          >
            {saving ? 'Salvando...' : 'Salvar alteração'}
          </button>
        </div>
      </div>
    </div>
  )
}
