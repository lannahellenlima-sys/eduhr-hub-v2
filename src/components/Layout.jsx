import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, GraduationCap, FileText,
  Calendar, BarChart3, CheckSquare, Settings, ChevronRight
} from 'lucide-react'
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
    ]
  },
]

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar no-print">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <GraduationCap size={18} color="white" />
          </div>
          <div>
            <p className="brand-name">EduHR Hub</p>
            <span className="brand-sub">Gestão de RH</span>
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
            <div className="user-avatar">LH</div>
            <div>
              <p className="user-name">Lanna Hellen</p>
              <span className="user-role">Recursos Humanos</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar no-print">
          <span className="topbar-title">Folha de Pagamento — IES</span>
          <div className="topbar-secure">
            <span className="secure-dot" />
            Sessão segura · LGPD
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>

        <footer className="page-footer no-print">
          <p>Aviso LGPD — Uso restrito e confidencial conforme Lei nº 13.709/2018.</p>
        </footer>
      </div>
    </div>
  )
}
