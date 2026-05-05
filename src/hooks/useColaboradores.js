import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ── Lista de colaboradores ──────────────────────────────────────────
export function useColaboradores() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async (search = '') => {
    setLoading(true)
    let q = supabase
      .from('colaboradores')
      .select('id, ficha_numero, nome, cpf, email, funcao, departamento, vinculo, salario_base, data_admissao, ativo')
      .order('nome')

    if (search) q = q.ilike('nome', `%${search}%`)

    const { data, error } = await q
    if (error) toast.error('Erro ao carregar colaboradores')
    else setData(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

// ── Colaborador individual (ficha completa) ─────────────────────────
export function useColaborador(id) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('id', id)
      .single()
    if (error) toast.error('Erro ao carregar colaborador')
    else setData(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

// ── Histórico salarial ──────────────────────────────────────────────
export function useHistoricoSalarial(colaboradorId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!colaboradorId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('historico_salarial')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .order('data_vigencia', { ascending: false })
    if (error) toast.error('Erro ao carregar histórico salarial')
    else setData(data || [])
    setLoading(false)
  }, [colaboradorId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function addHistoricoSalarial(payload) {
  const { error } = await supabase.from('historico_salarial').insert(payload)
  if (error) { toast.error('Erro ao salvar alteração salarial'); return false }
  toast.success('Alteração salarial registrada!')
  return true
}

// ── Documentos ──────────────────────────────────────────────────────
export function useDocumentos(colaboradorId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!colaboradorId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('documentos_colaborador')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .order('tipo')
    if (error) toast.error('Erro ao carregar documentos')
    else setData(data || [])
    setLoading(false)
  }, [colaboradorId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function updateDocumentoStatus(id, status) {
  const { error } = await supabase
    .from('documentos_colaborador')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) { toast.error('Erro ao atualizar documento'); return false }
  toast.success('Documento atualizado!')
  return true
}

export async function addDocumento(payload) {
  const { error } = await supabase.from('documentos_colaborador').insert(payload)
  if (error) { toast.error('Erro ao adicionar documento'); return false }
  toast.success('Documento adicionado!')
  return true
}

// ── Salvar / atualizar colaborador ──────────────────────────────────
export async function saveColaborador(data, id = null) {
  const payload = { ...data, updated_at: new Date().toISOString() }
  if (id) {
    const { error } = await supabase.from('colaboradores').update(payload).eq('id', id)
    if (error) { toast.error('Erro ao salvar colaborador'); return null }
    toast.success('Colaborador atualizado!')
    return id
  } else {
    const { data: created, error } = await supabase
      .from('colaboradores').insert(payload).select('id').single()
    if (error) { toast.error('Erro ao criar colaborador'); return null }
    toast.success('Colaborador cadastrado!')
    return created.id
  }
}

// ── Upload de foto ──────────────────────────────────────────────────
export async function uploadFoto(file, colaboradorId) {
  const ext = file.name.split('.').pop()
  const path = `fotos/${colaboradorId}.${ext}`
  const { error } = await supabase.storage
    .from('eduhr')
    .upload(path, file, { upsert: true })
  if (error) { toast.error('Erro ao enviar foto'); return null }
  const { data } = supabase.storage.from('eduhr').getPublicUrl(path)
  return data.publicUrl
}
