import React, { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const PermissaoContext = createContext({})

const PERMISSOES = {
  admin: {
    verColaboradores: true, editarColaboradores: true,
    verProfessores: true, editarProfessores: true,
    verFolha: true, editarFolha: true, verSalarios: true,
    verAcademico: true, editarAcademico: true,
    verRelatorios: true, verHistorico: true,
    gerenciarUsuarios: true, verTodosCursos: true,
  },
  direcao: {
    verColaboradores: true, editarColaboradores: false,
    verProfessores: true, editarProfessores: false,
    verFolha: true, editarFolha: false, verSalarios: true,
    verAcademico: true, editarAcademico: false,
    verRelatorios: true, verHistorico: true,
    gerenciarUsuarios: false, verTodosCursos: true,
  },
  rh: {
    verColaboradores: true, editarColaboradores: true,
    verProfessores: true, editarProfessores: true,
    verFolha: true, editarFolha: true, verSalarios: true,
    verAcademico: true, editarAcademico: true,
    verRelatorios: true, verHistorico: true,
    gerenciarUsuarios: false, verTodosCursos: true,
  },
  financeiro: {
    verColaboradores: false, editarColaboradores: false,
    verProfessores: false, editarProfessores: false,
    verFolha: true, editarFolha: false, verSalarios: true,
    verAcademico: false, editarAcademico: false,
    verRelatorios: true, verHistorico: false,
    gerenciarUsuarios: false, verTodosCursos: true,
  },
  coordenador: {
    verColaboradores: false, editarColaboradores: false,
    verProfessores: true, editarProfessores: false,
    verFolha: false, editarFolha: false, verSalarios: false,
    verAcademico: true, editarAcademico: true,
    verRelatorios: true, verHistorico: false,
    gerenciarUsuarios: false, verTodosCursos: false,
  },
}

export function PermissaoProvider({ children }) {
  const { user } = useAuth()
  const [perfil, setPerfil] = useState(null)
  const [loadingPerfil, setLoadingPerfil] = useState(true)

  useEffect(() => {
    if (!user) { setPerfil(null); setLoadingPerfil(false); return }
    supabase.from('perfis_usuario')
      .select('*').eq('email', user.email).eq('ativo', true).single()
      .then(({ data }) => {
        setPerfil(data || { perfil: 'rh', cursos_permitidos: null })
        setLoadingPerfil(false)
      })
  }, [user])

  function pode(permissao) {
    if (!perfil) return true
    return PERMISSOES[perfil.perfil]?.[permissao] ?? false
  }

  function podeCurso(curso) {
    if (!perfil) return true
    if (PERMISSOES[perfil.perfil]?.verTodosCursos) return true
    return perfil.cursos_permitidos?.includes(curso) ?? false
  }

  const perfilLabel = {
    admin: 'Administrador', direcao: 'Direção', rh: 'RH',
    financeiro: 'Financeiro', coordenador: 'Coordenador',
  }

  const value = {
    perfil, loadingPerfil, pode, podeCurso,
    perfilNome: perfilLabel[perfil?.perfil] || 'RH',
    cursosPermitidos: perfil?.cursos_permitidos || null,
    ehAdmin: perfil?.perfil === 'admin',
    ehCoordenador: perfil?.perfil === 'coordenador',
  }

  return React.createElement(PermissaoContext.Provider, { value }, children)
}

export function usePermissao() {
  return useContext(PermissaoContext)
}
