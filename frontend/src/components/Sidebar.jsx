import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Map, Brain, BookOpen, MessageSquare, User, TrendingUp,
  LogOut, Zap, ChevronRight, Sun, Moon, Square, RectangleHorizontal
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/roadmap', icon: Map, label: 'Roadmap', badge: 'AI' },
  { to: '/quiz', icon: Brain, label: 'Quiz', badge: 'AI' },
  { to: '/interview', icon: MessageSquare, label: 'Interview Prep', badge: 'AI' },
  { to: '/study-planner', icon: BookOpen, label: 'Study Planner', badge: 'AI' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { colorMode, shapeMode, toggleColorMode, toggleShapeMode } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out successfully')
      navigate('/login')
    } catch {
      toast.error('Logout failed')
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={22} color="white" />
          </div>
          <div>
            <div className="sidebar-logo-text">AI Buddy</div>
            <div className="sidebar-logo-sub">Powered by Gemini</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Main</div>
        {navItems.slice(0, 1).map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon className="nav-icon" />
            {label}
            {badge && <span className="nav-badge" style={{ marginLeft: 'auto' }}>{badge}</span>}
            <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
          </NavLink>
        ))}

        <div className="nav-section-title" style={{ marginTop: '8px' }}>AI Features</div>
        {navItems.slice(1, 5).map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon className="nav-icon" />
            {label}
            {badge && <span className="nav-badge">{badge}</span>}
          </NavLink>
        ))}

        <div className="nav-section-title" style={{ marginTop: '8px' }}>Account</div>
        {navItems.slice(5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon className="nav-icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {/* Theme Controls */}
        <div className="theme-controls">
          <button
            id="btn-toggle-color-mode"
            className="theme-btn"
            onClick={toggleColorMode}
            title={colorMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {colorMode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span>{colorMode === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <button
            id="btn-toggle-shape-mode"
            className="theme-btn"
            onClick={toggleShapeMode}
            title={shapeMode === 'rounded' ? 'Switch to Sharp Edges' : 'Switch to Rounded Edges'}
          >
            {shapeMode === 'rounded' ? <Square size={15} /> : <RectangleHorizontal size={15} />}
            <span>{shapeMode === 'rounded' ? 'Sharp' : 'Round'}</span>
          </button>
        </div>

        <div className="user-card" onClick={() => navigate('/profile')}>
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-email">{user?.email || ''}</div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', marginTop: '8px', justifyContent: 'center', color: '#ef4444' }}
          onClick={handleLogout}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}
