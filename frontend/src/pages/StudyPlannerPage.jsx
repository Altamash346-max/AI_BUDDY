import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { BookOpen, Zap, Calendar, Target, CheckSquare } from 'lucide-react'

export default function StudyPlannerPage() {
  const [roadmaps, setRoadmaps] = useState([])
  const [selectedRoadmap, setSelectedRoadmap] = useState('')
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [myPlans, setMyPlans] = useState([])
  const [view, setView] = useState('generate') // 'generate' | 'detail'

  useEffect(() => {
    api.get('/roadmap/me').then(r => setRoadmaps(r.data?.data || [])).catch(() => {})
    // No /planner/my endpoint — plans are fetched per roadmap
  }, [])

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!selectedRoadmap) return toast.error('Please select a roadmap')
    setLoading(true)
    setPlan(null)
    try {
      const res = await api.post(`/planner/generate/${selectedRoadmap}`)
      setPlan(res.data?.data)
      toast.success('📅 Study plan created!')
      setView('detail')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate study plan')
    } finally {
      setLoading(false)
    }
  }

  const dailyTasks = plan?.dailyTasks || []
  const weeklyMilestones = plan?.weeklyMilestones || []

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">📅 Study Planner</h1>
            <p className="page-subtitle">AI-generated day-by-day study plans with weekly milestones</p>
          </div>
          {view === 'detail' && (
            <button className="btn btn-secondary" onClick={() => { setView('generate'); setPlan(null) }}>
              + New Plan
            </button>
          )}
        </div>
      </div>

      {view === 'generate' && (
        <div className="card card-p" style={{ maxWidth: 500, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={18} color="#10b981" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Generate Study Plan</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Based on your roadmap topics</p>
            </div>
          </div>

          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Select Your Roadmap</label>
              <select
                className="form-select"
                value={selectedRoadmap}
                onChange={e => setSelectedRoadmap(e.target.value)}
                required
              >
                <option value="">— Choose a roadmap —</option>
                {roadmaps.map(r => <option key={r._id} value={r._id}>{r.subject} ({r.level})</option>)}
              </select>
            </div>

            {roadmaps.length === 0 && (
              <div style={{ padding: '12px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  📍 You need to create a roadmap first.{' '}
                  <a href="/roadmap" style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>Generate one →</a>
                </p>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading || !selectedRoadmap}>
              {loading ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="ai-orbs" style={{ gap: 5 }}>
                    <div className="ai-orb" style={{ width: 7, height: 7 }} />
                    <div className="ai-orb" style={{ width: 7, height: 7 }} />
                    <div className="ai-orb" style={{ width: 7, height: 7 }} />
                  </div>
                  Creating Your Plan...
                </div>
              ) : (
                <><Zap size={16} /> Generate Study Plan</>
              )}
            </button>
          </form>

          {/* Previous plans */}
          {myPlans.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Previous Plans</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myPlans.slice(0, 3).map(p => (
                  <div
                    key={p._id}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'flex-start', cursor: 'pointer' }}
                    onClick={() => { setPlan(p); setView('detail') }}
                  >
                    <Calendar size={14} />
                    <span style={{ flex: 1 }}>Plan from {new Date(p.createdAt).toLocaleDateString()}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.dailyTasks?.length || 0} days</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'detail' && plan && (
        <div className="grid-2 fade-in" style={{ gap: 24, alignItems: 'flex-start' }}>
          {/* Daily Tasks */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckSquare size={16} color="#06b6d4" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Daily Tasks</h2>
              <span className="badge badge-cyan">{dailyTasks.length} days</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dailyTasks.map((task, i) => (
                <div key={i} className="card" style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 4 }}>{task.day}</div>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>{task.task}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Milestones */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={16} color="#f59e0b" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Weekly Milestones</h2>
              <span className="badge badge-amber">{weeklyMilestones.length} weeks</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {weeklyMilestones.map((m, i) => (
                <div key={i} className="card" style={{ padding: '18px 20px', background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎯</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{m.week}</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>{m.goal}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!plan && view !== 'generate' && (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3 className="empty-title">No Study Plan Yet</h3>
          <p className="empty-desc">Generate a plan from your roadmap to get started</p>
        </div>
      )}
    </div>
  )
}
