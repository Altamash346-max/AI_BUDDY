import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { TrendingUp, CheckCircle, Circle, Map, Trophy } from 'lucide-react'
import { StatusDonut, RoadmapBars } from '../components/ProgressCharts'

export default function ProgressPage() {
  const [roadmaps, setRoadmaps] = useState([])
  const [selectedRoadmap, setSelectedRoadmap] = useState(null)
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(false)
  const [roadmapStats, setRoadmapStats] = useState([])

  useEffect(() => {
    api.get('/roadmap/me').then(r => {
      const rms = r.data?.data || []
      setRoadmaps(rms)
      if (rms.length > 0) loadTopics(rms[0])
      Promise.all(rms.map(rm =>
        api.get(`/progress/roadmap/${rm._id}`)
          .then(res => ({ id: rm._id, name: rm.subject, completed: res.data?.data?.completedCount || 0, total: res.data?.data?.totalCount || 0 }))
          .catch(() => ({ id: rm._id, name: rm.subject, completed: 0, total: 0 }))
      )).then(setRoadmapStats)
    }).catch(() => {})
  }, [])

  const loadTopics = async (roadmap) => {
    setSelectedRoadmap(roadmap)
    setLoading(true)
    try {
      const res = await api.get(`/roadmap/${roadmap._id}`)
      const data = res.data?.data
      setTopics(data?.topics || [])
    } catch { setTopics([]) }
    finally { setLoading(false) }
  }

  const handleMark = async (topicId, nowCompleted) => {
    try {
      // Backend only supports POST /progress/complete (mark done — no undo)
      if (nowCompleted) {
        await api.post('/progress/complete', { topicId })
      }
      // Topic model uses status field ('completed' | 'current' | 'locked')
      setTopics(ts => ts.map(t =>
        t._id === topicId
          ? { ...t, status: nowCompleted ? 'completed' : 'current' }
          : t
      ))
      toast.success(nowCompleted ? 'Topic completed! 🎉' : 'Topic marked incomplete')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    }
  }

  const completed = topics.filter(t => t.status === 'completed').length
  const total = topics.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  // Keep the selected roadmap's bar in sync with local topic updates
  const barData = roadmapStats.map(d =>
    d.id === selectedRoadmap?._id && !loading ? { ...d, completed, total } : d
  )

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">📈 Progress Tracker</h1>
        <p className="page-subtitle">Track your learning journey and milestone completions</p>
      </div>

      {roadmaps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <h3 className="empty-title">No Roadmaps to Track</h3>
          <p className="empty-desc">Create a roadmap first to start tracking your progress</p>
          <a href="/roadmap" className="btn btn-primary btn-lg"><Map size={16} /> Go to Roadmaps</a>
        </div>
      ) : (
        <>
        {/* Charts */}
        <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
          <StatusDonut topics={topics} />
          <RoadmapBars
            data={barData}
            selectedId={selectedRoadmap?._id}
            onSelect={id => { const rm = roadmaps.find(r => r._id === id); if (rm) loadTopics(rm) }}
          />
        </div>

        <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
          {/* Roadmap Selector */}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Your Roadmaps</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {roadmaps.map(rm => (
                <div
                  key={rm._id}
                  className="card"
                  style={{
                    padding: '16px 20px',
                    cursor: 'pointer',
                    borderColor: selectedRoadmap?._id === rm._id ? 'var(--border-accent)' : 'var(--border-subtle)',
                    background: selectedRoadmap?._id === rm._id ? 'rgba(139,92,246,0.08)' : 'var(--bg-card)',
                  }}
                  onClick={() => loadTopics(rm)}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Map size={18} color={selectedRoadmap?._id === rm._id ? 'var(--accent-purple)' : 'var(--text-muted)'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{rm.subject}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{rm.level} · {rm.goal}</div>
                    </div>
                    {selectedRoadmap?._id === rm._id && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-purple)' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Detail */}
          <div>
            {selectedRoadmap && (
              <>
                {/* Stats */}
                <div className="card card-p" style={{ marginBottom: 20, background: 'var(--grad-dark)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{selectedRoadmap.subject}</h3>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Trophy size={18} color={pct === 100 ? '#f59e0b' : 'var(--text-muted)'} />
                      <span style={{ fontSize: 22, fontWeight: 800, background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: 10 }}>
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>{completed} completed</span>
                    <span>{total - completed} remaining</span>
                  </div>
                  {pct === 100 && (
                    <div style={{ marginTop: 12, padding: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>
                      🏆 Roadmap Complete! Congratulations!
                    </div>
                  )}
                </div>

                {/* Topic List */}
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Topics</h3>
                {loading ? (
                  <div className="ai-loader"><div className="ai-orbs"><div className="ai-orb" /><div className="ai-orb" /><div className="ai-orb" /></div></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {topics.map((topic, i) => (
                      <div
                        key={topic._id}
                        className="card"
                        style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', borderColor: topic.status === 'completed' ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)' }}
                        onClick={() => handleMark(topic._id, topic.status !== 'completed')}
                      >
                        {topic.status === 'completed'
                          ? <CheckCircle size={20} color="#10b981" />
                          : <Circle size={20} color="var(--text-muted)" />
                        }
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: topic.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: topic.status === 'completed' ? 'line-through' : 'none' }}>
                          {topic.title}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{i + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  )
}
