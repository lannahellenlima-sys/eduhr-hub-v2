import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
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
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/colaboradores" replace />} />
        <Route path="colaboradores" element={<ColaboradoresLista />} />
        <Route path="colaboradores/novo" element={<ColaboradorNovo />} />
        <Route path="colaboradores/:id" element={<ColaboradorFicha />} />
        <Route path="professores" element={<ProfessoresLista />} />
        <Route path="professores/novo" element={<ProfessorNovo />} />
        <Route path="professores/:id" element={<ProfessorFicha />} />
        <Route path="folha-administrativo" element={<FolhaAdministrativo />} />
        <Route path="folha-docente" element={<FolhaDocente />} />
      </Route>
    </Routes>
  )
}
