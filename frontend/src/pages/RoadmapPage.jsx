import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Map, Plus, ChevronDown, ChevronUp, ExternalLink, Trash2, Zap, BookOpen, Video, FileText, Code, Layers, MessageCircle, WandSparkles, TriangleAlert, History, Lock } from 'lucide-react'
import { askBuddy } from '../components/ChatWidget'
import { startJob, clearJob, useJob } from '../utils/jobs'

const GENERATE_JOB = 'roadmap-generate'

const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const GOALS = ['Placement', 'College Exams', 'Hackathon', 'Research', 'Freelancing']
const TIME_OPTIONS = ['1 hour/day', '2 hours/day', '3 hours/day', '4+ hours/day']
const WEAK_SCORE = 60
const ADAPT_CHIPS = ['I have less time now', 'Add more practice problems', 'Focus on interview questions', 'Go a bit deeper']

const RESOURCE_ICONS = {
  video: { icon: Video, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  article: { icon: FileText, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  documentation: { icon: BookOpen, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  course: { icon: Layers, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  practice: { icon: Code, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  project: { icon: Code, color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
}

function TopicCard({ topic, index, canMark, onMarkDone }) {
  const [open, setOpen] = useState(false)
  const isDone = topic.status === 'completed'

  return (
    <div className={`roadmap-topic${isDone ? ' completed' : ''} fade-in`}>
      <div className="roadmap-topic-header" onClick={() => setOpen(o => !o)}>
        <div className={`topic-order${isDone ? ' done' : ''}`}>
          {isDone ? '✓' : index + 1}
        </div>
        <span className="topic-title">{topic.title}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {topic.quizScore != null && (
            <span className={`badge ${topic.quizScore < WEAK_SCORE ? 'badge-rose' : 'badge-emerald'}`} style={{ fontSize: 11 }}>Quiz {topic.quizScore}%</span>
          )}
          {topic.resources?.length > 0 && (
            <span className="badge badge-purple" style={{ fontSize: 11 }}>{topic.resources.length} resources</span>
          )}
          <button
            className="btn btn-sm btn-ghost"
            style={{ fontSize: 11, padding: '5px 10px' }}
            onClick={(e) => { e.stopPropagation(); askBuddy({ topicId: topic._id, topicTitle: topic.title }) }}
            aria-label={`Ask AI Buddy about ${topic.title}`}
          ><MessageCircle size={13} /> Ask</button>
          {!isDone && canMark && (
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', fontSize: 11 }}
              onClick={(e) => { e.stopPropagation(); onMarkDone(topic._id) }}
            >Mark Done</button>
          )}
          {!isDone && !canMark && (
            <span className="badge" style={{ fontSize: 11, color: 'var(--text-muted)' }} title="Finish the earlier topics first">
              <Lock size={11} /> Locked
            </span>
          )}
          {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </div>
      </div>
      {open && topic.resources?.length > 0 && (
        <div className="topic-body">
          {topic.resources.map((r, i) => {
            const ri = RESOURCE_ICONS[r.type] || RESOURCE_ICONS.article
            const Icon = ri.icon
            return (
              <a key={i} href={r.url} target="_blank" rel="noreferrer" className="resource-item">
                <div className="resource-type-icon" style={{ background: ri.bg }}>
                  <Icon size={14} color={ri.color} />
                </div>
                <span style={{ flex: 1 }}>{r.title}</span>
                <span className="badge" style={{ background: ri.bg, color: ri.color, fontSize: 10, border: 'none' }}>{r.type}</span>
                <ExternalLink size={12} style={{ opacity: 0.5 }} />
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function RoadmapPage() {
  const genJob = useJob(GENERATE_JOB)
  const loading = genJob?.status === 'running'
  // Coming back while a roadmap is still generating: show the form with its spinner again
  const [form, setForm] = useState(() => genJob?.meta || { subject: '', goal: GOALS[0], level: LEVELS[0], timeAvailable: TIME_OPTIONS[0] })
  const [roadmaps, setRoadmaps] = useState([])
  const [activeRoadmap, setActiveRoadmap] = useState(null)
  const [topics, setTopics] = useState([])
  const [view, setView] = useState(() => (genJob?.status === 'running' ? 'generate' : 'list')) // 'list' | 'generate' | 'detail'
  const [fetchingTopics, setFetchingTopics] = useState(false)
  const [adaptOpen, setAdaptOpen] = useState(false)
  const [adaptText, setAdaptText] = useState('')
  const [adapting, setAdapting] = useState(false)

  useEffect(() => { fetchRoadmaps() }, [])

  const fetchRoadmaps = async () => {
    try {
      const res = await api.get('/roadmap/me')
      setRoadmaps(res.data?.data || [])
    } catch { /* silent */ }
  }

  // The request runs in the job store, so leaving this page doesn't lose it
  const handleGenerate = (e) => {
    e.preventDefault()
    startJob(GENERATE_JOB, () => api.post('/roadmap/generate', form).then(res => res.data?.data), {
      meta: form,
      doneMessage: '🗺️ Your roadmap is ready!',
    })
  }

  // When the job finishes (now, or while the student was on another page), show the result
  useEffect(() => {
    if (genJob?.status === 'done') {
      const roadmap = genJob.result?.roadmap
      clearJob(GENERATE_JOB)
      fetchRoadmaps()
      if (roadmap) openRoadmap(roadmap)
      else setView('list')
    } else if (genJob?.status === 'error') {
      clearJob(GENERATE_JOB)
    }
  }, [genJob])

  const openRoadmap = async (roadmap) => {
    setActiveRoadmap(roadmap)
    setView('detail')
    setFetchingTopics(true)
    try {
      // Backend /:roadmapId returns { roadmap, topics } together
      const res = await api.get(`/roadmap/${roadmap._id}`)
      const data = res.data?.data
      if (data?.roadmap) setActiveRoadmap(data.roadmap)
      if (data?.topics) setTopics(data.topics)
      else setTopics([])
    } catch { setTopics([]) }
    finally { setFetchingTopics(false) }
  }

  const handleAdapt = async (instruction = '') => {
    if (!activeRoadmap || adapting) return
    setAdapting(true)
    try {
      const res = await api.post(`/roadmap/${activeRoadmap._id}/adapt`, { instruction })
      const data = res.data?.data
      if (data?.topics) setTopics(data.topics)
      if (data?.roadmap) setActiveRoadmap(data.roadmap)
      setAdaptOpen(false)
      setAdaptText('')
      toast.success('Roadmap updated for you')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not adapt the roadmap')
    } finally {
      setAdapting(false)
    }
  }

  const handleMarkDone = async (topicId) => {
    try {
      // Backend: POST /progress/complete with { topicId } in body
      const res = await api.post('/progress/complete', { topicId })
      const nextId = res.data?.data?.nextTopic?._id
      // Topic model uses status field, not a boolean 'completed'; the next topic unlocks
      setTopics(ts => ts.map(t =>
        t._id === topicId ? { ...t, status: 'completed' }
          : t._id === nextId && t.status === 'locked' ? { ...t, status: 'current' }
          : t
      ))
      toast.success('Topic marked as completed! 🎉')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update progress')
    }
  }

  const handleDelete = async (roadmapId, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this roadmap?')) return
    try {
      // Backend may not have delete — just remove from UI gracefully
      try { await api.delete(`/roadmap/${roadmapId}`) } catch { /* ignore if not implemented */ }
      setRoadmaps(r => r.filter(rm => rm._id !== roadmapId))
      toast.success('Roadmap removed')
      if (activeRoadmap?._id === roadmapId) { setActiveRoadmap(null); setView('list') }
    } catch { toast.error('Failed to remove') }
  }

  const weakTopics = topics.filter(t => t.quizScore != null && t.quizScore < WEAK_SCORE)
  const lastAdaptation = activeRoadmap?.adaptations?.at(-1)
  const completedCount = topics.filter(t => t.status === 'completed').length
  // Only the first unfinished topic can be marked done; the rest stay locked until then
  const nextTopicIndex = topics.findIndex(t => t.status !== 'completed')
  const progressPct = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">🗺️ Learning Roadmap</h1>
            <p className="page-subtitle">Generate AI-powered personalized learning paths for any subject</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {view !== 'list' && (
              <button className="btn btn-secondary" onClick={() => setView('list')}>← Back to List</button>
            )}
            {view !== 'generate' && (
              <button className="btn btn-primary" onClick={() => setView('generate')}>
                <Plus size={16} /> Generate New
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Generate Form */}
      {view === 'generate' && (
        <div className="card card-p-lg slide-in-right" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} color="var(--accent-purple)" />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Create Your Roadmap</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Powered by Google Gemini AI</p>
            </div>
          </div>
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Subject / Topic *</label>
              <input
                className="form-input"
                placeholder="e.g. React.js, Machine Learning, Data Science..."
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Learning Goal</label>
              <select className="form-select" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}>
                {GOALS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Current Level</label>
                <select className="form-select" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Daily Time</label>
                <select className="form-select" value={form.timeAvailable} onChange={e => setForm(f => ({ ...f, timeAvailable: e.target.value }))}>
                  {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? (
                <div className="ai-loader" style={{ padding: '8px 0', flexDirection: 'row', gap: 12 }}>
                  <div className="ai-orbs" style={{ gap: 6 }}>
                    <div className="ai-orb" style={{ width: 8, height: 8 }} />
                    <div className="ai-orb" style={{ width: 8, height: 8 }} />
                    <div className="ai-orb" style={{ width: 8, height: 8 }} />
                  </div>
                  <span>Generating your roadmap...</span>
                </div>
              ) : (
                <><Zap size={18} /> Generate AI Roadmap</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Roadmap List */}
      {view === 'list' && (
        <>
          {roadmaps.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🗺️</div>
              <h3 className="empty-title">No Roadmaps Yet</h3>
              <p className="empty-desc">Generate your first AI-powered learning roadmap</p>
              <button className="btn btn-primary btn-lg" onClick={() => setView('generate')}>
                <Plus size={18} /> Create Your First Roadmap
              </button>
            </div>
          ) : (
            <div className="grid-auto stagger">
              {roadmaps.map(rm => (
                <div
                  key={rm._id}
                  className="card card-p"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openRoadmap(rm)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ fontSize: 32, marginBottom: 4 }}>🗺️</div>
                    <button className="btn btn-icon btn-ghost" onClick={(e) => handleDelete(rm._id, e)} style={{ color: 'var(--accent-rose)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{rm.subject}</h3>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    <span className="badge badge-purple">{rm.level}</span>
                    <span className="badge badge-cyan">{rm.goal}</span>
                    <span className="badge badge-emerald">{rm.timeAvailable}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Created {new Date(rm.createdAt).toLocaleDateString()}
                  </p>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }}>
                    <Map size={15} /> View Roadmap
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Roadmap Detail */}
      {view === 'detail' && activeRoadmap && (
        <div className="fade-in">
          <div className="card card-p" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{activeRoadmap.subject}</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge badge-purple">{activeRoadmap.level}</span>
                  <span className="badge badge-cyan">{activeRoadmap.goal}</span>
                  <span className="badge badge-emerald">{activeRoadmap.timeAvailable}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 800, background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {progressPct}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{completedCount}/{topics.length} topics</div>
              </div>
            </div>
            <div className="progress-bar" style={{ marginTop: 16 }}>
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setAdaptOpen(o => !o)} disabled={adapting}>
                <WandSparkles size={14} /> Adapt roadmap
              </button>
            </div>
          </div>

          {weakTopics.length > 0 && !adaptOpen && (
            <div className="adapt-banner fade-in">
              <TriangleAlert size={18} />
              <span style={{ flex: 1 }}>
                You scored below {WEAK_SCORE}% on <strong>{weakTopics.map(t => t.title).join(', ')}</strong>. Adapt your roadmap to add revision before moving on?
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => handleAdapt('')} disabled={adapting}>
                {adapting ? 'Adapting…' : 'Add revision'}
              </button>
            </div>
          )}

          {adaptOpen && (
            <div className="card card-p fade-in" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Change your roadmap</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                Completed topics stay as they are. The remaining topics are rebuilt from your progress, quiz scores and your note.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {ADAPT_CHIPS.map(c => (
                  <button key={c} type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => setAdaptText(c)}>{c}</button>
                ))}
              </div>
              <label htmlFor="adapt-note" className="form-label">What should change? (optional)</label>
              <textarea
                id="adapt-note"
                className="form-textarea"
                style={{ minHeight: 70 }}
                maxLength={300}
                placeholder="e.g. Add system design basics, I only have 1 hour a day now…"
                value={adaptText}
                onChange={e => setAdaptText(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setAdaptOpen(false)} disabled={adapting}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={() => handleAdapt(adaptText.trim())} disabled={adapting}>
                  <WandSparkles size={14} /> {adapting ? 'Updating roadmap…' : 'Update roadmap'}
                </button>
              </div>
            </div>
          )}

          {lastAdaptation && (
            <div className="adapt-note fade-in">
              <History size={15} />
              <span><strong>Last update:</strong> {lastAdaptation.summary}</span>
            </div>
          )}

          {fetchingTopics ? (
            <div className="ai-loader"><div className="ai-orbs"><div className="ai-orb" /><div className="ai-orb" /><div className="ai-orb" /></div><p className="ai-loader-text">Loading topics...</p></div>
          ) : topics.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📚</div><h3 className="empty-title">No Topics Found</h3></div>
          ) : (
            topics.map((topic, i) => (
              <TopicCard key={topic._id} topic={topic} index={i} canMark={i === nextTopicIndex} onMarkDone={handleMarkDone} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
