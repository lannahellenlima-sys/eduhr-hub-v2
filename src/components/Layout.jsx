import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, GraduationCap, FileText,
  Calendar, BarChart3, CheckSquare, LogOut, History,
  BookOpen, TrendingUp, ChevronDown, ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import './Layout.css'

export default function Layout() {
  const { user, signOut } = useAuth()
  const [academicoAberto, setAcademicoAberto] = useState(false)
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'RH'

  return (
    <div className="layout">
      <aside className="sidebar no-print">
        <div className="sidebar-brand" style={{ gap: 10 }}>
          <img src="/logo-unisulma.png" alt="Unisulma" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <p className="brand-name">Uni<span style={{ color: '#FFB640' }}>RH</span></p>
            <span className="brand-sub">Gestão de Pessoas</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Dashboard */}
          <div className="nav-group">
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={14} /> Dashboard
            </NavLink>
          </div>

          {/* Cadastros */}
          <div className="nav-group">
            <span className="nav-group-label">Cadastros</span>
            <NavLink to="/colaboradores" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Users size={14} /> Colaboradores</NavLink>
            <NavLink to="/professores" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><GraduationCap size={14} /> Professores</NavLink>
          </div>

          {/* Folha */}
          <div className="nav-group">
            <span className="nav-group-label">Folha</span>
            <NavLink to="/folha-administrativo" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><FileText size={14} /> Folha Administrativo</NavLink>
            <NavLink to="/folha-docente" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><FileText size={14} /> Folha Docente</NavLink>
          </div>

          {/* Módulo Acadêmico — expansível */}
          <div className="nav-group">
            <span className="nav-group-label">Acadêmico</span>
            <button
              onClick={() => setAcademicoAberto(a => !a)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '7px 8px', borderRadius: 6, border: 'none',
                background: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.7)',
                fontSize: 13, fontFamily: 'var(--font)', fontWeight: 500,
                marginBottom: 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={14} /> Gestão de CH
              </div>
              {academicoAberto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {academicoAberto && (
              <div style={{ paddingLeft: 12 }}>
                <NavLink to="/academico" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ fontSize: 12 }}>
                  <LayoutDashboard size={12} /> Dashboard acadêmico
                </NavLink>
                <NavLink to="/academico/matrizes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ fontSize: 12 }}>
                  <BookOpen size={12} /> Matrizes curriculares
                </NavLink>
                <NavLink to="/academico/distribuicao" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ fontSize: 12 }}>
                  <GraduationCap size={12} /> Distribuição de CH
                </NavLink>
                <NavLink to="/academico/projecao" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ fontSize: 12 }}>
                  <TrendingUp size={12} /> Projeção financeira
                </NavLink>
              </div>
            )}
          </div>

          {/* Gestão */}
          <div className="nav-group">
            <span className="nav-group-label">Gestão</span>
            <NavLink to="/ferias" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Calendar size={14} /> Calendário de Férias</NavLink>
            <NavLink to="/relatorios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><BarChart3 size={14} /> Relatórios</NavLink>
            <NavLink to="/fechamento" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><CheckSquare size={14} /> Fechamento Mensal</NavLink>
            <NavLink to="/historico" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><History size={14} /> Histórico</NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar" style={{ background: '#FEF3C7', color: '#D97706' }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'Usuário'}</p>
              <span className="user-role">Recursos Humanos</span>
            </div>
            <button onClick={signOut} title="Sair" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', padding: 4, flexShrink: 0 }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar no-print">
          <span className="topbar-title">UniRH · Unisulma</span>
          <div className="topbar-secure">
            <span className="secure-dot" />
            Sessão segura · LGPD
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
        <footer className="page-footer no-print">
          <p>UniRH · Unisulma — Uso restrito e confidencial conforme Lei nº 13.709/2018 (LGPD).</p>
        </footer>
      </div>
    </div>
  )
}
