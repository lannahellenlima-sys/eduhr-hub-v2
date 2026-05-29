import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, GraduationCap, FileText,
  Calendar, BarChart3, CheckSquare, LogOut, History
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import './Layout.css'

const navGroups = [
  {
    label: null,
    items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }]
  },
  {
    label: 'Cadastros',
    items: [
      { to: '/colaboradores', icon: Users, label: 'Colaboradores' },
      { to: '/professores', icon: GraduationCap, label: 'Professores' },
    ]
  },
  {
    label: 'Folha',
    items: [
      { to: '/folha-administrativo', icon: FileText, label: 'Folha Administrativo' },
      { to: '/folha-docente', icon: FileText, label: 'Folha Docente' },
    ]
  },
  {
    label: 'Gestão',
    items: [
      { to: '/ferias', icon: Calendar, label: 'Calendário de Férias' },
      { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
      { to: '/fechamento', icon: CheckSquare, label: 'Fechamento Mensal' },
      { to: '/historico', icon: History, label: 'Histórico' },
    ]
  },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'RH'

  return (
    <div className="layout">
      <aside className="sidebar no-print">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <GraduationCap size={18} color="white" />
          </div>
          <div>
            <p className="brand-name">UniRH</p>
            <span className="brand-sub">Gestão de Pessoas · Unisulma</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group, gi) => (
            <div key={gi} className="nav-group">
              {group.label && <span className="nav-group-label">{group.label}</span>}
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={14} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || 'Usuário'}
              </p>
              <span className="user-role">Recursos Humanos</span>
            </div>
            <button
              onClick={signOut}
              title="Sair"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 4, flexShrink: 0 }}
            >
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

        <main className="page-content">
          <Outlet />
        </main>

        <footer className="page-footer no-print">
          <p>UniRH · Unisulma — Uso restrito e confidencial conforme Lei nº 13.709/2018 (LGPD).</p>
        </footer>
      </div>
    </div>
  )
}
