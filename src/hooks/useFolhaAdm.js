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

// ── Duplicar competência anterior ───────────────────────────────────
export async function duplicarFolha(folhaOrigemId, mesDestino, anoDestino) {
  // 1. Cria a nova folha
  const { data: novaFolha, error: errFolha } = await supabase
    .from('folhas_mensais')
    .insert({ mes: mesDestino, ano: anoDestino, tipo: 'administrativo', status: 'aberta' })
    .select('id').single()
  if (errFolha) { toast.error('Erro ao criar folha'); return null }
  const novaId = novaFolha.id

  // 2. Copia lançamentos CLT — zera descontos variáveis (farmácia, adiantamento)
  const { data: clt } = await supabase.from('lancamentos_adm_clt').select('*').eq('folha_id', folhaOrigemId)
  if (clt?.length) {
    const novoClt = clt.map(({ id, created_at, updated_at, ...l }) => ({
      ...l,
      folha_id: novaId,
      dias_trabalhados: 30,
      farmacia: 0,
      adiantamento: 0,
      observacoes: null,
      status: 'rascunho',
    }))
    await supabase.from('lancamentos_adm_clt').insert(novoClt)
  }

  // 3. Copia Gratificações
  const { data: grat } = await supabase.from('lancamentos_gratificacoes').select('*').eq('folha_id', folhaOrigemId)
  if (grat?.length) {
    const novoGrat = grat.map(({ id, created_at, updated_at, ...l }) => ({ ...l, folha_id: novaId, status: 'rascunho' }))
    await supabase.from('lancamentos_gratificacoes').insert(novoGrat)
  }

  // 4. Copia Coordenadores
  const { data: coord } = await supabase.from('lancamentos_coordenadores').select('*').eq('folha_id', folhaOrigemId)
  if (coord?.length) {
    const novoCoord = coord.map(({ id, created_at, updated_at, ...l }) => ({ ...l, folha_id: novaId, status: 'rascunho' }))
    await supabase.from('lancamentos_coordenadores').insert(novoCoord)
  }

  // 5. Copia Sócios
  const { data: socios } = await supabase.from('lancamentos_socios').select('*').eq('folha_id', folhaOrigemId)
  if (socios?.length) {
    const novoSocios = socios.map(({ id, created_at, updated_at, ...l }) => ({ ...l, folha_id: novaId, farmacia: 0, adiantamento: 0, status: 'rascunho' }))
    await supabase.from('lancamentos_socios').insert(novoSocios)
  }

  // 6. Copia Vale-Alimentação
  const { data: vale } = await supabase.from('lancamentos_vale_alim').select('*').eq('folha_id', folhaOrigemId)
  if (vale?.length) {
    const novoVale = vale.map(({ id, created_at, updated_at, ...l }) => ({ ...l, folha_id: novaId, status: 'rascunho' }))
    await supabase.from('lancamentos_vale_alim').insert(novoVale)
  }

  toast.success(`Folha ${mesDestino}/${anoDestino} criada com os lançamentos do mês anterior!`)
  return novaId
}

// ── Validar folha inteira (todos os lançamentos de uma vez) ──────────
export async function validarFolhaCompleta(folhaId) {
  const tabelas = [
    'lancamentos_adm_clt',
    'lancamentos_gratificacoes',
    'lancamentos_coordenadores',
    'lancamentos_socios',
    'lancamentos_vale_alim',
  ]
  for (const tabela of tabelas) {
    const { error } = await supabase
      .from(tabela)
      .update({ status: 'validado', updated_at: new Date().toISOString() })
      .eq('folha_id', folhaId)
      .eq('status', 'rascunho')
    if (error) { toast.error(`Erro ao validar ${tabela}`); return false }
  }
  toast.success('Todos os lançamentos foram validados!')
  return true
}

// ── Importar colaboradores ativos para a folha ───────────────────────
export async function importarColaboradoresParaFolha(folhaId) {
  // Busca todos os colaboradores ativos
  const { data: colaboradores, error: errColab } = await supabase
    .from('colaboradores')
    .select('id, nome, funcao, departamento, vinculo, salario_base')
    .eq('ativo', true)
    .order('nome')

  if (errColab || !colaboradores?.length) {
    toast.error('Nenhum colaborador ativo encontrado.')
    return 0
  }

  // Busca quem já está na folha
  const { data: jaExistentes } = await supabase
    .from('lancamentos_adm_clt')
    .select('colaborador_nome')
    .eq('folha_id', folhaId)

  const nomesExistentes = new Set((jaExistentes || []).map(l => l.colaborador_nome))

  // Filtra os que ainda não estão
  const novos = colaboradores.filter(c => !nomesExistentes.has(c.nome))

  if (!novos.length) {
    toast('Todos os colaboradores já estão na folha!', { icon: 'ℹ️' })
    return 0
  }

  // Cria lançamentos com salário base e valores zerados
  const lancamentos = novos.map(c => ({
    folha_id: folhaId,
    colaborador_nome: c.nome,
    funcao: c.funcao || '',
    departamento: c.departamento || '',
    vinculo: c.vinculo || 'CLT',
    salario_bruto: c.salario_base || 0,
    reajuste_pct: 0,
    dias_trabalhados: 30,
    ajuda_custo: 0,
    vale_refeicao: 0,
    gratificacao: 0,
    ats: 0,
    farmacia: 0,
    adiantamento: 0,
    plano_saude: 0,
    status: 'rascunho',
  }))

  const { error } = await supabase.from('lancamentos_adm_clt').insert(lancamentos)
  if (error) { toast.error('Erro ao importar colaboradores'); return 0 }

  toast.success(`${novos.length} colaborador(es) importado(s) para a folha!`)
  return novos.length
}

// ── Adicionar um único colaborador à folha aberta atual ──────────────
export async function adicionarColaboradorAFolhaAtual(colaborador) {
  // Busca a folha administrativa aberta mais recente
  const { data: folhas } = await supabase
    .from('folhas_mensais')
    .select('id, mes, ano')
    .eq('tipo', 'administrativo')
    .eq('status', 'aberta')
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .limit(1)

  if (!folhas?.length) {
    toast.error('Nenhuma folha administrativa aberta encontrada.')
    return false
  }

  const folha = folhas[0]

  // Verifica se já existe
  const { data: existe } = await supabase
    .from('lancamentos_adm_clt')
    .select('id')
    .eq('folha_id', folha.id)
    .eq('colaborador_nome', colaborador.nome)
    .limit(1)

  if (existe?.length) {
    toast(`${colaborador.nome} já está na folha de ${folha.mes}/${folha.ano}.`, { icon: 'ℹ️' })
    return false
  }

  const { error } = await supabase.from('lancamentos_adm_clt').insert({
    folha_id: folha.id,
    colaborador_nome: colaborador.nome,
    funcao: colaborador.funcao || '',
    departamento: colaborador.departamento || '',
    vinculo: colaborador.vinculo || 'CLT',
    salario_bruto: colaborador.salario_base || 0,
    reajuste_pct: 0,
    dias_trabalhados: 30,
    ajuda_custo: 0,
    vale_refeicao: 0,
    gratificacao: 0,
    ats: 0,
    farmacia: 0,
    adiantamento: 0,
    plano_saude: 0,
    status: 'rascunho',
  })

  if (error) { toast.error('Erro ao adicionar à folha.'); return false }
  toast.success(`${colaborador.nome} adicionado à folha de ${folha.mes}/${folha.ano}!`)
  return true
}
