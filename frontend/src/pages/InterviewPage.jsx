import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { MessageSquare, Zap, User, Code, Heart, Brain } from 'lucide-react'
import { Link } from 'react-router-dom'
import { startJob, clearJob, useJob } from '../utils/jobs'

const INTERVIEW_JOB = 'interview-generate'

// Items are { question, answer }; preps saved before answers existed hold plain strings
const toItem = (q, category) => (typeof q === 'string' ? { question: q, category } : { ...q, category })

const CATEGORY_CONFIG = {
  technical: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: Code, label: 'Technical' },
  projectBased: { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', icon: Brain, label: 'Project-Based' },
  behavioral: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: Heart, label: 'Behavioral' },
  culturalFit: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: MessageSquare, label: 'Cultural Fit' },
  default: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: MessageSquare, label: 'General' },
}

function QuestionCard({ question, index }) {
  const cat = CATEGORY_CONFIG[question.category] || CATEGORY_CONFIG.default
  const Icon = cat.icon
  return (
    <div className="interview-question-card">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <Icon size={15} color={cat.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Q{index + 1} · {cat.label}
            </span>
          </div>
          <p className="question-text">{question.question}</p>
          {question.answer && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>💡 Show expected answer</summary>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', lineHeight: 1.6 }}>{question.answer}</p>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InterviewPage() {
  const job = useJob(INTERVIEW_JOB)
  const loading = job?.status === 'running'
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(() => job?.meta || { company: '', role: '', jobDescription: '' })
  const [questions, setQuestions] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [history, setHistory] = useState([])

  useEffect(() => {
    api.get('/interview/profile').then(r => setProfile(r.data?.data)).catch(() => {})
    api.get('/interview/me').then(r => setHistory(r.data?.data || [])).catch(() => {})
  }, [])

  // Runs in the job store so switching pages mid-generation doesn't lose it
  const handleGenerate = (e) => {
    e.preventDefault()
    if (!form.company || !form.role) return toast.error('Company and role are required')
    setQuestions(null)
    startJob(INTERVIEW_JOB, () => api.post('/interview/generate', form).then(res => res.data?.data), {
      meta: form,
      doneMessage: '💼 Interview questions are ready!',
    })
  }

  useEffect(() => {
    if (job?.status === 'done') {
      // Backend returns the saved InterviewPrep doc; questions are in generatedQuestions
      setQuestions(job.result?.generatedQuestions || job.result)
      clearJob(INTERVIEW_JOB)
    } else if (job?.status === 'error') {
      clearJob(INTERVIEW_JOB)
    }
  }, [job])

  const allQs = questions
    ? [
        ...(questions.technical || []).map(q => toItem(q, 'technical')),
        ...(questions.projectBased || []).map(q => toItem(q, 'projectBased')),
        ...(questions.behavioral || []).map(q => toItem(q, 'behavioral')),
        ...(questions.culturalFit || []).map(q => toItem(q, 'culturalFit')),
      ]
    : []

  const filtered = activeTab === 'all'
    ? allQs
    : allQs.filter(q => q.category === activeTab)

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">💼 Interview Prep</h1>
        <p className="page-subtitle">AI-generated interview questions tailored to your profile and target role</p>
      </div>

      {/* Profile Warning */}
      {!profile && (
        <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span>⚠️</span>
          <p style={{ fontSize: 13, color: '#f59e0b' }}>
            Add your profile and skills for more personalized interview questions.{' '}
            <Link to="/profile" style={{ fontWeight: 600, textDecoration: 'underline' }}>Set up profile →</Link>
          </p>
        </div>
      )}

      <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
        {/* Form */}
        <div className="card card-p">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={18} color="#ec4899" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Generate Questions</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Powered by Gemini AI</p>
            </div>
          </div>
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Target Company *</label>
              <input
                className="form-input"
                placeholder="e.g. Google, Amazon, Startup..."
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Target Role *</label>
              <input
                className="form-input"
                placeholder="e.g. Software Engineer, Data Scientist..."
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Job Description (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Paste the job description for more targeted questions..."
                value={form.jobDescription}
                onChange={e => setForm(f => ({ ...f, jobDescription: e.target.value }))}
                rows={4}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="ai-orbs" style={{ gap: 5 }}>
                    <div className="ai-orb" style={{ width: 7, height: 7 }} />
                    <div className="ai-orb" style={{ width: 7, height: 7 }} />
                    <div className="ai-orb" style={{ width: 7, height: 7 }} />
                  </div>
                  Generating Questions...
                </div>
              ) : (
                <><Zap size={16} /> Generate Interview Questions</>
              )}
            </button>
          </form>

          {/* Stats */}
          {questions && (
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                { label: 'Technical', count: questions.technical?.length || 0, color: '#8b5cf6' },
                { label: 'Project-Based', count: questions.projectBased?.length || 0, color: '#06b6d4' },
                { label: 'Behavioral', count: questions.behavioral?.length || 0, color: '#10b981' },
                { label: 'Cultural Fit', count: questions.culturalFit?.length || 0, color: '#f59e0b' },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ padding: '10px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{count}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Questions Panel */}
        <div>
          {questions ? (
            <div className="slide-in-right">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: `All (${allQs.length})` },
                  { key: 'technical', label: `Technical (${questions.technical?.length || 0})` },
                  { key: 'projectBased', label: `Project-Based (${questions.projectBased?.length || 0})` },
                  { key: 'behavioral', label: `Behavioral (${questions.behavioral?.length || 0})` },
                  { key: 'culturalFit', label: `Cultural Fit (${questions.culturalFit?.length || 0})` },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    className={`tab${activeTab === key ? ' active' : ''}`}
                    onClick={() => setActiveTab(key)}
                    style={{ flex: 'none', fontSize: 13 }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {filtered.map((q, i) => <QuestionCard key={i} question={q} index={i} />)}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💼</div>
              <h3 className="empty-title">Questions Appear Here</h3>
              <p className="empty-desc">Fill in the form and generate your personalized interview questions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
