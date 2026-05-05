import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const DIAS_BASE = 30
const SEMANAS_MES = 4.5

// ── Cálculos ────────────────────────────────────────────────────────
export function calcLiquidoCLT(l) {
  const brutoReaj = l.salario_bruto * (1 + (l.reajuste_pct || 0) / 100)
  const prop = (brutoReaj * (l.dias_trabalhados || 30)) / DIAS_BASE
  const acrescimos = (l.ajuda_custo || 0) + (l.vale_refeicao || 0) + (l.gratificacao || 0) + (l.ats || 0)
  const descontos = (l.farmacia || 0) + (l.adiantamento || 0) + (l.plano_saude || 0)
  return prop + acrescimos - descontos
}

export function calcTotalGratificacao(l) {
  return l.valor_bruto * (1 + (l.reajuste_pct || 0) / 100) + (l.ajuda_custo || 0)
}

export function calcTotalCoordenador(l) {
  return l.valor * (1 + (l.reajuste_pct || 0) / 100) - (l.plano_saude || 0)
}

export function calcTotalSocio(l) {
  const brutoReaj = l.salario_base * (1 + (l.reajuste_pct || 0) / 100)
  const prop = (brutoReaj * (l.dias_trabalhados || 30)) / DIAS_BASE
  const acrescimos = (l.ats || 0) + (l.gratificacao || 0) + (l.sociedade || 0)
  const descontos = (l.farmacia || 0) + (l.plano_saude || 0) + (l.adiantamento || 0)
  return prop + acrescimos - descontos
}

// ── Folhas mensais ──────────────────────────────────────────────────
export function useFolhasMensais(tipo = 'administrativo') {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('folhas_mensais')
      .select('*')
      .eq('tipo', tipo)
      .order('ano', { ascending: false })
      .order('mes', { ascending: false })
    if (error) toast.error('Erro ao carregar folhas')
    else setData(data || [])
    setLoading(false)
  }, [tipo])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function criarFolha(mes, ano, tipo) {
  const { data, error } = await supabase
    .from('folhas_mensais')
    .insert({ mes, ano, tipo, status: 'aberta' })
    .select('id').single()
  if (error) { toast.error('Erro ao criar folha'); return null }
  toast.success('Folha criada!')
  return data.id
}

export async function atualizarStatusFolha(id, status, fechadaPor = null) {
  const payload = { status, updated_at: new Date().toISOString() }
  if (fechadaPor) { payload.data_fechamento = new Date().toISOString().split('T')[0]; payload.fechada_por = fechadaPor }
  const { error } = await supabase.from('folhas_mensais').update(payload).eq('id', id)
  if (error) { toast.error('Erro ao atualizar status'); return false }
  toast.success(`Folha ${status === 'fechada' ? 'fechada' : 'atualizada'}!`)
  return true
}

// ── CLT ─────────────────────────────────────────────────────────────
export function useLancamentosCLT(folhaId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!folhaId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('lancamentos_adm_clt')
      .select('*')
      .eq('folha_id', folhaId)
      .order('colaborador_nome')
    if (error) toast.error('Erro ao carregar lançamentos CLT')
    else setData(data || [])
    setLoading(false)
  }, [folhaId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function saveLancamentoCLT(payload, id = null) {
  if (id) {
    const { error } = await supabase.from('lancamentos_adm_clt').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Erro ao salvar'); return false }
  } else {
    const { error } = await supabase.from('lancamentos_adm_clt').insert(payload)
    if (error) { toast.error('Erro ao criar lançamento'); return false }
  }
  toast.success('Lançamento salvo!')
  return true
}

export async function deleteLancamento(tabela, id) {
  const { error } = await supabase.from(tabela).delete().eq('id', id)
  if (error) { toast.error('Erro ao excluir'); return false }
  toast.success('Excluído!')
  return true
}

// ── Gratificações ───────────────────────────────────────────────────
export function useLancamentosGratificacoes(folhaId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!folhaId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('lancamentos_gratificacoes')
      .select('*').eq('folha_id', folhaId).order('colaborador_nome')
    if (error) toast.error('Erro ao carregar gratificações')
    else setData(data || [])
    setLoading(false)
  }, [folhaId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function saveLancamentoGratificacao(payload, id = null) {
  if (id) {
    const { error } = await supabase.from('lancamentos_gratificacoes').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Erro ao salvar'); return false }
  } else {
    const { error } = await supabase.from('lancamentos_gratificacoes').insert(payload)
    if (error) { toast.error('Erro ao criar'); return false }
  }
  toast.success('Salvo!')
  return true
}

// ── Coordenadores ───────────────────────────────────────────────────
export function useLancamentosCoordenadores(folhaId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!folhaId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('lancamentos_coordenadores')
      .select('*').eq('folha_id', folhaId).order('nome')
    if (error) toast.error('Erro ao carregar coordenadores')
    else setData(data || [])
    setLoading(false)
  }, [folhaId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function saveLancamentoCoordenador(payload, id = null) {
  if (id) {
    const { error } = await supabase.from('lancamentos_coordenadores').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Erro ao salvar'); return false }
  } else {
    const { error } = await supabase.from('lancamentos_coordenadores').insert(payload)
    if (error) { toast.error('Erro ao criar'); return false }
  }
  toast.success('Salvo!')
  return true
}

// ── Sócios ──────────────────────────────────────────────────────────
export function useLancamentosSocios(folhaId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!folhaId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('lancamentos_socios')
      .select('*').eq('folha_id', folhaId).order('nome')
    if (error) toast.error('Erro ao carregar sócios')
    else setData(data || [])
    setLoading(false)
  }, [folhaId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function saveLancamentoSocio(payload, id = null) {
  if (id) {
    const { error } = await supabase.from('lancamentos_socios').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Erro ao salvar'); return false }
  } else {
    const { error } = await supabase.from('lancamentos_socios').insert(payload)
    if (error) { toast.error('Erro ao criar'); return false }
  }
  toast.success('Salvo!')
  return true
}

// ── Vale-Alimentação ────────────────────────────────────────────────
export function useLancamentosValeAlim(folhaId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!folhaId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('lancamentos_vale_alim')
      .select('*').eq('folha_id', folhaId).order('colaborador_nome')
    if (error) toast.error('Erro ao carregar vale-alimentação')
    else setData(data || [])
    setLoading(false)
  }, [folhaId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function saveLancamentoValeAlim(payload, id = null) {
  if (id) {
    const { error } = await supabase.from('lancamentos_vale_alim').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Erro ao salvar'); return false }
  } else {
    const { error } = await supabase.from('lancamentos_vale_alim').insert(payload)
    if (error) { toast.error('Erro ao criar'); return false }
  }
  toast.success('Salvo!')
  return true
}

// ── Exportação CSV ──────────────────────────────────────────────────
export function exportarCSV(dados, nomeArquivo) {
  if (!dados.length) { toast.error('Nenhum dado para exportar'); return }
  const headers = Object.keys(dados[0]).join(';')
  const rows = dados.map(r => Object.values(r).join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = nomeArquivo + '.csv'; a.click()
  URL.revokeObjectURL(url)
  toast.success('Exportado!')
}
