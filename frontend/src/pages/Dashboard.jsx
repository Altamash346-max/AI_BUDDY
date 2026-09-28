import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { Map, Brain, MessageSquare, BookOpen, TrendingUp, Zap, ArrowRight, Star } from 'lucide-react'

const features = [
  { to: '/roadmap', icon: '🗺️', label: 'Roadmap Generator', desc: 'AI-powered personalized learning paths', color: '#8b5cf6', badge: 'Popular' },
  { to: '/quiz', icon: '🧠', label: 'Quiz Practice', desc: 'Test your knowledge with AI-generated quizzes', color: '#06b6d4', badge: 'New' },
  { to: '/interview', icon: '💼', label: 'Interview Prep', desc: 'AI interview questions tailored to your profile', color: '#ec4899', badge: '' },
  { to: '/study-planner', icon: '📅', label: 'Study Planner', desc: 'Day-by-day AI study plans with milestones', color: '#10b981', badge: '' },
  { to: '/progress', icon: '📈', label: 'Progress Tracker', desc: 'Track your learning milestones and completion', color: '#f59e0b', badge: '' },
  { to: '/profile', icon: '👤', label: 'Profile & Skills', desc: 'Manage your candidate profile and skills', color: '#f43f5e', badge: '' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ roadmaps: 0, quizzes: 0, topics: 0 })
  const [greeting, setGreeting] = useState('Good day')

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [roadmapsRes] = await Promise.allSettled([
          api.get('/roadmap/me'),
        ])
        if (roadmapsRes.status === 'fulfilled') {
          const roadmaps = roadmapsRes.value.data?.data || []
          setStats(s => ({ ...s, roadmaps: roadmaps.length }))
        }
      } catch { /* silent */ }
    }
    fetchStats()
  }, [])

  return (
    <div className="page-container fade-in">
      {/* Hero */}
      <div className="dashboard-hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>👋</span>
            <span className="badge badge-purple">
              <Zap size={12} />
              AI Powered
            </span>
          </div>
          <h1 className="dashboard-hero-title">
            {greeting}, {user?.name?.split(' ')[0] || 'Learner'}!
          </h1>
          <p className="dashboard-hero-subtitle">
            Ready to supercharge your learning today? Your AI companion is here to guide you through every step.
          </p>
          <div className="hero-actions">
            <Link to="/roadmap" className="btn btn-primary btn-lg">
              <Map size={18} /> Generate Roadmap
            </Link>
            <Link to="/quiz" className="btn btn-secondary btn-lg">
              <Brain size={18} /> Take a Quiz
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid stagger">
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <Map size={24} color="#8b5cf6" />
          </div>
          <div>
            <div className="stat-value">{stats.roadmaps}</div>
            <div className="stat-label">Learning Roadmaps</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(6,182,212,0.15)' }}>
            <Brain size={24} color="#06b6d4" />
          </div>
          <div>
            <div className="stat-value">∞</div>
            <div className="stat-label">AI Quiz Questions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <TrendingUp size={24} color="#10b981" />
          </div>
          <div>
            <div className="stat-value">AI</div>
            <div className="stat-label">Powered Learning</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Star size={24} color="#f59e0b" />
          </div>
          <div>
            <div className="stat-value">24/7</div>
            <div className="stat-label">Available Support</div>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>AI Features</h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Everything you need to accelerate your learning</p>
      </div>

      <div className="grid-3 stagger">
        {features.map(({ to, icon, label, desc, color, badge }) => (
          <Link key={to} to={to} className="feature-card" style={{ textDecoration: 'none' }}>
            <div className="feature-icon" style={{ background: `${color}20` }}>
              <span style={{ fontSize: 28 }}>{icon}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
              <h3 className="feature-title">{label}</h3>
              {badge && <span className="badge badge-purple" style={{ fontSize: 10 }}>{badge}</span>}
            </div>
            <p className="feature-desc">{desc}</p>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13, color, fontWeight: 600 }}>
              Explore <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Tips */}
      <div className="card card-p" style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Zap size={20} color="var(--accent-purple)" />
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Quick Start Guide</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { step: '1', title: 'Set Up Profile', desc: 'Add your skills and experience', link: '/profile' },
            { step: '2', title: 'Generate Roadmap', desc: 'Get your personalized learning path', link: '/roadmap' },
            { step: '3', title: 'Practice Quizzes', desc: 'Test your knowledge with AI', link: '/quiz' },
            { step: '4', title: 'Prep for Interviews', desc: 'AI-generated interview questions', link: '/interview' },
          ].map(({ step, title, desc, link }) => (
            <Link key={step} to={link} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', textDecoration: 'none', padding: '12px', borderRadius: 'var(--radius-md)', transition: 'var(--transition)', border: '1px solid transparent' }}
              className="btn-ghost">
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>{step}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
