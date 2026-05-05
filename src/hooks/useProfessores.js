import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ── Lista de professores ────────────────────────────────────────────
export function useProfessores() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async (search = '') => {
    setLoading(true)
    let q = supabase
      .from('professores')
      .select('id, ficha_numero, nome, cpf, email, titulacao, plano, vinculo, curso_principal, data_admissao, valor_hora_teorica, ativo')
      .order('nome')
    if (search) q = q.ilike('nome', `%${search}%`)
    const { data, error } = await q
    if (error) toast.error('Erro ao carregar professores')
    else setData(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

// ── Professor individual ────────────────────────────────────────────
export function useProfessor(id) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('professores').select('*').eq('id', id).single()
    if (error) toast.error('Erro ao carregar professor')
    else setData(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

// ── Histórico de plano docente ──────────────────────────────────────
export function useHistoricoPlano(professorId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!professorId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('historico_plano_docente')
      .select('*')
      .eq('professor_id', professorId)
      .order('data_vigencia', { ascending: false })
    if (error) toast.error('Erro ao carregar histórico de plano')
    else setData(data || [])
    setLoading(false)
  }, [professorId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function addHistoricoPlano(payload) {
  const { error } = await supabase.from('historico_plano_docente').insert(payload)
  if (error) { toast.error('Erro ao salvar progressão'); return false }
  toast.success('Progressão registrada!')
  return true
}

// ── Disciplinas do semestre ─────────────────────────────────────────
export function useDisciplinas(professorId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!professorId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('disciplinas_professor')
      .select('*')
      .eq('professor_id', professorId)
      .order('semestre', { ascending: false })
    if (error) toast.error('Erro ao carregar disciplinas')
    else setData(data || [])
    setLoading(false)
  }, [professorId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function addDisciplina(payload) {
  const { error } = await supabase.from('disciplinas_professor').insert(payload)
  if (error) { toast.error('Erro ao adicionar disciplina'); return false }
  toast.success('Disciplina adicionada!')
  return true
}

export async function deleteDisciplina(id) {
  const { error } = await supabase.from('disciplinas_professor').delete().eq('id', id)
  if (error) { toast.error('Erro ao remover disciplina'); return false }
  toast.success('Disciplina removida!')
  return true
}

// ── Atividades gratificadas ─────────────────────────────────────────
export function useAtividades(professorId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!professorId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('atividades_gratificadas_professor')
      .select('*')
      .eq('professor_id', professorId)
      .order('created_at')
    if (error) toast.error('Erro ao carregar atividades')
    else setData(data || [])
    setLoading(false)
  }, [professorId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function toggleAtividade(id, ativo) {
  const { error } = await supabase
    .from('atividades_gratificadas_professor')
    .update({ ativo: !ativo })
    .eq('id', id)
  if (error) { toast.error('Erro ao atualizar atividade'); return false }
  toast.success(ativo ? 'Atividade encerrada' : 'Atividade ativada')
  return true
}

export async function addAtividade(payload) {
  const { error } = await supabase.from('atividades_gratificadas_professor').insert(payload)
  if (error) { toast.error('Erro ao adicionar atividade'); return false }
  toast.success('Atividade adicionada!')
  return true
}

// ── Contratos ───────────────────────────────────────────────────────
export function useContratos(professorId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!professorId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('contratos_professor')
      .select('*')
      .eq('professor_id', professorId)
      .order('data_inicio', { ascending: false })
    if (error) toast.error('Erro ao carregar contratos')
    else setData(data || [])
    setLoading(false)
  }, [professorId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function addContrato(payload) {
  const { error } = await supabase.from('contratos_professor').insert(payload)
  if (error) { toast.error('Erro ao adicionar contrato'); return false }
  toast.success('Contrato registrado!')
  return true
}

export async function renovarContrato(id, novaDataFim, semestre) {
  const { data: contrato } = await supabase.from('contratos_professor').select('renovacoes').eq('id', id).single()
  const { error } = await supabase
    .from('contratos_professor')
    .update({ data_fim: novaDataFim, semestre, renovacoes: (contrato?.renovacoes || 0) + 1, status: 'ativo', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) { toast.error('Erro ao renovar contrato'); return false }
  toast.success('Contrato renovado!')
  return true
}

// ── Documentos professor ────────────────────────────────────────────
export function useDocumentosProfessor(professorId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!professorId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('documentos_professor')
      .select('*')
      .eq('professor_id', professorId)
      .order('tipo')
    if (error) toast.error('Erro ao carregar documentos')
    else setData(data || [])
    setLoading(false)
  }, [professorId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function updateDocProfessorStatus(id, status) {
  const { error } = await supabase
    .from('documentos_professor')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) { toast.error('Erro ao atualizar documento'); return false }
  toast.success('Documento atualizado!')
  return true
}

export async function addDocumentoProfessor(payload) {
  const { error } = await supabase.from('documentos_professor').insert(payload)
  if (error) { toast.error('Erro ao adicionar documento'); return false }
  toast.success('Documento adicionado!')
  return true
}

// ── Salvar / atualizar professor ────────────────────────────────────
export async function saveProfessor(data, id = null) {
  const payload = { ...data, updated_at: new Date().toISOString() }
  if (id) {
    const { error } = await supabase.from('professores').update(payload).eq('id', id)
    if (error) { toast.error('Erro ao salvar professor'); return null }
    toast.success('Professor atualizado!')
    return id
  } else {
    const { data: created, error } = await supabase
      .from('professores').insert(payload).select('id').single()
    if (error) { toast.error('Erro ao criar professor'); return null }
    toast.success('Professor cadastrado!')
    return created.id
  }
}

// ── Upload de foto ──────────────────────────────────────────────────
export async function uploadFotoProf(file, professorId) {
  const ext = file.name.split('.').pop()
  const path = `fotos-prof/${professorId}.${ext}`
  const { error } = await supabase.storage.from('eduhr').upload(path, file, { upsert: true })
  if (error) { toast.error('Erro ao enviar foto'); return null }
  const { data } = supabase.storage.from('eduhr').getPublicUrl(path)
  return data.publicUrl
}

// ── Alerta de contratos vencendo ────────────────────────────────────
export async function contratosVencendo(dias = 30) {
  const limite = new Date()
  limite.setDate(limite.getDate() + dias)
  const { data, error } = await supabase
    .from('contratos_professor')
    .select('*, professores(nome, email, curso_principal)')
    .eq('status', 'ativo')
    .lte('data_fim', limite.toISOString().split('T')[0])
    .order('data_fim')
  if (error) return []
  return data || []
}
