import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ColaboradoresLista from './pages/ColaboradoresLista'
import ColaboradorFicha from './pages/ColaboradorFicha'
import ColaboradorNovo from './pages/ColaboradorNovo'
import ProfessoresLista from './pages/ProfessoresLista'
import ProfessorFicha from './pages/ProfessorFicha'
import ProfessorNovo from './pages/ProfessorNovo'
import FolhaAdministrativo from './pages/FolhaAdministrativo'
import FolhaDocente from './pages/FolhaDocente'
import FechamentoMensal from './pages/FechamentoMensal'
import CalendarioFerias from './pages/CalendarioFerias'
import Relatorios from './pages/Relatorios'
import Historico from './pages/Historico'
// Módulo Acadêmico
import DashboardAcademico from './pages/academico/DashboardAcademico'
import MatrizesCurriculares from './pages/academico/MatrizesCurriculares'
import DistribuicaoSemestral from './pages/academico/DistribuicaoSemestral'
import ProjecaoFinanceira from './pages/academico/ProjecaoFinanceira'

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
          <Route path="ferias" element={<CalendarioFerias />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="historico" element={<Historico />} />
          {/* Módulo Acadêmico */}
          <Route path="academico" element={<DashboardAcademico />} />
          <Route path="academico/matrizes" element={<MatrizesCurriculares />} />
          <Route path="academico/distribuicao" element={<DistribuicaoSemestral />} />
          <Route path="academico/projecao" element={<ProjecaoFinanceira />} />
          <Route path="academico/relatorios" element={<ProjecaoFinanceira />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
