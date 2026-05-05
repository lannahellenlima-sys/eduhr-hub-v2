// Formata data ISO para DD/MM/YYYY
export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('pt-BR')
}

// Tempo de serviço desde data de admissão
export function tempoServico(iso) {
  if (!iso) return ''
  const start = new Date(iso + 'T00:00:00')
  const now = new Date()
  let anos = now.getFullYear() - start.getFullYear()
  let meses = now.getMonth() - start.getMonth()
  if (meses < 0) { anos--; meses += 12 }
  const parts = []
  if (anos > 0) parts.push(`${anos} ano${anos > 1 ? 's' : ''}`)
  if (meses > 0) parts.push(`${meses} mês${meses > 1 ? 'es' : ''}`)
  return parts.length ? parts.join(' e ') : 'Menos de 1 mês'
}

// Formata valor monetário
export function formatMoeda(valor) {
  if (valor == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

// Calcula percentual de variação
export function calcPercentual(anterior, novo) {
  if (!anterior || anterior === 0) return null
  return (((novo - anterior) / anterior) * 100).toFixed(1)
}

// Cores por status de documento
export function docStatusBadge(status) {
  const map = {
    ok: 'badge-green',
    pendente: 'badge-amber',
    vencido: 'badge-red',
  }
  return map[status] || 'badge-gray'
}

export function docStatusLabel(status) {
  const map = { ok: 'OK', pendente: 'Pendente', vencido: 'Vencido' }
  return map[status] || status
}

// Tipo de alteração salarial → badge
export function tipoSalarioBadge(tipo) {
  const map = {
    'Admissão': 'badge-gray',
    'Reajuste geral': 'badge-blue',
    'Promoção': 'badge-purple',
    'Progressão de plano': 'badge-purple',
    'Correção': 'badge-amber',
    'Outro': 'badge-gray',
  }
  return map[tipo] || 'badge-gray'
}
