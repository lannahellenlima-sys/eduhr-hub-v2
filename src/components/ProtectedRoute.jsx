import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Enquanto verifica a sessão, mostra loading
  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: 12
    }}>
      <div className="spinner" />
      <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Verificando sessão...</p>
    </div>
  )

  // Se não tem usuário, redireciona para login salvando a página atual
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  return children
}
