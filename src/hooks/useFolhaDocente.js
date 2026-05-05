import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const FATOR_HORAS_MENSAIS = 4.5

// ── Cálculos ────────────────────────────────────────────────────────
export function calcHorasMensais(horasSemanais) {
  return (horasSemanais || 0) * FATOR_HORAS_MENSAIS
}

export function calcValorMensalAula(horasSemanais, valorHora) {
  return calcHorasMensais(horasSemanais) * (valorHora || 0)
}

export function calcLiquidoDocenteCLT(l) {
  const valTeorica = calcValorMensalAula(l.horas_semanais_teoricas, l.valor_hora_teorica)
  const valPratica = calcValorMensalAula(l.horas_semanais_praticas, l.valor_hora_pratica)
  return (l.ajuda_custo || 0) + valTeorica + valPratica + (l.reposicao || 0)
    - (l.plano_saude || 0) - (l.farmacia || 0) - (l.adiantamento || 0)
}

export function calcTotalDocenteContrato(l) {
  const valTeorica = calcValorMensalAula(l.horas_semanais_teoricas, l.valor_hora_teorica)
  const valPratica = calcValorMensalAula(l.horas_semanais_praticas, l.valor_hora_pratica)
  return (l.preceptoria || 0) + (l.coordenacao || 0) + valTeorica + valPratica
}

// ── Docente CLT ──────────────────────────────────────────────────────
export function useLancamentosDocenteCLT(folhaId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!folhaId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('lancamentos_docente_clt')
      .select('*').eq('folha_id', folhaId).order('docente_nome')
    if (error) toast.error('Erro ao carregar docentes CLT')
    else setData(data || [])
    setLoading(false)
  }, [folhaId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function saveLancamentoDocenteCLT(payload, id = null) {
  if (id) {
    const { error } = await supabase.from('lancamentos_docente_clt')
      .update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Erro ao salvar'); return false }
  } else {
    const { error } = await supabase.from('lancamentos_docente_clt').insert(payload)
    if (error) { toast.error('Erro ao criar lançamento'); return false }
  }
  toast.success('Lançamento salvo!')
  return true
}

// ── Docente Contrato ─────────────────────────────────────────────────
export function useLancamentosDocenteContrato(folhaId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!folhaId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('lancamentos_docente_contrato')
      .select('*').eq('folha_id', folhaId).order('docente_nome')
    if (error) toast.error('Erro ao carregar docentes contrato')
    else setData(data || [])
    setLoading(false)
  }, [folhaId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function saveLancamentoDocenteContrato(payload, id = null) {
  if (id) {
    const { error } = await supabase.from('lancamentos_docente_contrato')
      .update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Erro ao salvar'); return false }
  } else {
    const { error } = await supabase.from('lancamentos_docente_contrato').insert(payload)
    if (error) { toast.error('Erro ao criar lançamento'); return false }
  }
  toast.success('Lançamento salvo!')
  return true
}

export async function deleteLancamentoDocente(tabela, id) {
  const { error } = await supabase.from(tabela).delete().eq('id', id)
  if (error) { toast.error('Erro ao excluir'); return false }
  toast.success('Excluído!')
  return true
}

// ── Exportação CSV Docente ───────────────────────────────────────────
export function exportarCSVDocente(clt, contrato, mesLabel) {
  const linhasCLT = clt.map(l => ({
    Tipo: 'CLT',
    Nome: l.docente_nome,
    'Salário Fixo': l.salario_fixo,
    'Ajuda de Custo': l.ajuda_custo,
    'H.Teóricas/sem': l.horas_semanais_teoricas,
    'Valor H.Teórica': l.valor_hora_teorica,
    'Val.Teórico Mensal': calcValorMensalAula(l.horas_semanais_teoricas, l.valor_hora_teorica).toFixed(2),
    'H.Práticas/sem': l.horas_semanais_praticas,
    'Valor H.Prática': l.valor_hora_pratica,
    'Val.Prático Mensal': calcValorMensalAula(l.horas_semanais_praticas, l.valor_hora_pratica).toFixed(2),
    Reposição: l.reposicao,
    'Plano de Saúde': l.plano_saude,
    Farmácia: l.farmacia,
    Adiantamento: l.adiantamento,
    Líquido: calcLiquidoDocenteCLT(l).toFixed(2),
    Status: l.status,
  }))

  const linhasContrato = contrato.map(l => ({
    Tipo: l.vinculo,
    Nome: l.docente_nome,
    'Salário Fixo': '',
    'Ajuda de Custo': '',
    'H.Teóricas/sem': l.horas_semanais_teoricas,
    'Valor H.Teórica': l.valor_hora_teorica,
    'Val.Teórico Mensal': calcValorMensalAula(l.horas_semanais_teoricas, l.valor_hora_teorica).toFixed(2),
    'H.Práticas/sem': l.horas_semanais_praticas,
    'Valor H.Prática': l.valor_hora_pratica,
    'Val.Prático Mensal': calcValorMensalAula(l.horas_semanais_praticas, l.valor_hora_pratica).toFixed(2),
    Reposição: '',
    'Plano de Saúde': '',
    Farmácia: '',
    Adiantamento: '',
    Líquido: calcTotalDocenteContrato(l).toFixed(2),
    Status: l.status,
  }))

  const dados = [...linhasCLT, ...linhasContrato]
  if (!dados.length) { toast.error('Nenhum dado para exportar'); return }
  const headers = Object.keys(dados[0]).join(';')
  const rows = dados.map(r => Object.values(r).join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `Folha_Docente_${mesLabel}.csv`; a.click()
  URL.revokeObjectURL(url)
  toast.success('Exportado!')
}
