import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FechamentoMensal from './pages/FechamentoMensal'
import ColaboradoresLista from './pages/ColaboradoresLista'
import ColaboradorFicha from './pages/ColaboradorFicha'
import ColaboradorNovo from './pages/ColaboradorNovo'
import ProfessoresLista from './pages/ProfessoresLista'
import ProfessorFicha from './pages/ProfessorFicha'
import ProfessorNovo from './pages/ProfessorNovo'
import FolhaAdministrativo from './pages/FolhaAdministrativo'
import FolhaDocente from './pages/FolhaDocente'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="colaboradores" element={<ColaboradoresLista />} />
          <Route path="colaboradores/novo" element={<ColaboradorNovo />} />
          <Route path="colaboradores/:id" element={<ColaboradorFicha />} />
          <Route path="professores" element={<ProfessoresLista />} />
          <Route path="professores/novo" element={<ProfessorNovo />} />
          <Route path="professores/:id" element={<ProfessorFicha />} />
          <Route path="folha-administrativo" element={<FolhaAdministrativo />} />
          <Route path="folha-docente" element={<FolhaDocente />} />
          <Route path="fechamento" element={<FechamentoMensal />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
