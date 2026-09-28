import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Brain, Zap, CheckCircle, XCircle, RotateCcw, Trophy, ChevronRight } from 'lucide-react'

export default function QuizPage() {
  const [roadmaps, setRoadmaps] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedRoadmap, setSelectedRoadmap] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingTopics, setLoadingTopics] = useState(false)

  useEffect(() => {
    api.get('/roadmap/me').then(r => setRoadmaps(r.data?.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedRoadmap) { setTopics([]); setSelectedTopic(''); return }
    setLoadingTopics(true)
    api.get(`/roadmap/${selectedRoadmap}`)
      .then(r => {
        const data = r.data?.data
        const tps = data?.topics || []
        setTopics(tps)
        setSelectedTopic('')
      })
      .catch(() => setTopics([]))
      .finally(() => setLoadingTopics(false))
  }, [selectedRoadmap])

  const handleGenerate = async () => {
    if (!selectedTopic) return toast.error('Please select a topic')
    setLoading(true)
    setQuiz(null); setAnswers({}); setSubmitted(false); setScore(0)
    try {
      const res = await api.post(`/quiz/${selectedTopic}/generate`)
      setQuiz(res.data?.data)
      toast.success('Quiz generated! 🧠')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (qi, optIdx) => {
    if (submitted) return
    setAnswers(a => ({ ...a, [qi]: optIdx }))
  }

  const handleSubmit = () => {
    if (!quiz) return
    const questions = quiz.questions || []
    let correct = 0
    questions.forEach((q, i) => {
      if (answers[i] === q.correctOptionIndex) correct++
    })
    setScore(correct)
    setSubmitted(true)

    // Save result
    if (quiz._id || selectedTopic) {
      const tid = selectedTopic
      api.post(`/quiz/${tid}/submit`, { answers, score: correct, total: questions.length }).catch(() => {})
    }
  }

  const handleReset = () => {
    setQuiz(null); setAnswers({}); setSubmitted(false); setScore(0)
  }

  const questions = quiz?.questions || []
  const total = questions.length
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">🧠 Quiz Practice</h1>
        <p className="page-subtitle">AI-generated multiple-choice quizzes to test your knowledge</p>
      </div>

      {/* Setup Card */}
      <div className="card card-p" style={{ marginBottom: 24, maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={18} color="#06b6d4" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Configure Quiz</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select a roadmap topic to quiz on</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Select Roadmap</label>
            <select
              className="form-select"
              value={selectedRoadmap}
              onChange={e => setSelectedRoadmap(e.target.value)}
            >
              <option value="">— Choose a roadmap —</option>
              {roadmaps.map(r => <option key={r._id} value={r._id}>{r.subject}</option>)}
            </select>
          </div>

          {selectedRoadmap && (
            <div className="form-group">
              <label className="form-label">Select Topic</label>
              {loadingTopics ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 10 }}>
                  <div className="spinner" style={{ width: 16, height: 16 }} /> Loading topics...
                </div>
              ) : (
                <select
                  className="form-select"
                  value={selectedTopic}
                  onChange={e => setSelectedTopic(e.target.value)}
                >
                  <option value="">— Choose a topic —</option>
                  {topics.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
                </select>
              )}
            </div>
          )}

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleGenerate}
            disabled={loading || !selectedTopic}
          >
            {loading ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="ai-orbs" style={{ gap: 5 }}>
                  <div className="ai-orb" style={{ width: 7, height: 7 }} />
                  <div className="ai-orb" style={{ width: 7, height: 7 }} />
                  <div className="ai-orb" style={{ width: 7, height: 7 }} />
                </div>
                Generating Quiz...
              </div>
            ) : (
              <><Zap size={16} /> Generate 5-Question Quiz</>
            )}
          </button>
        </div>
      </div>

      {/* Quiz Results */}
      {submitted && (
        <div className="card card-p fade-in" style={{ marginBottom: 24, background: pct >= 70 ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)', borderColor: pct >= 70 ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 48 }}>{pct >= 70 ? '🏆' : '📚'}</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: pct >= 70 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                {pct >= 70 ? 'Great Job!' : 'Keep Practicing!'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                You scored <strong>{score} out of {total}</strong> ({pct}%)
              </p>
            </div>
            <button className="btn btn-secondary" onClick={handleReset}>
              <RotateCcw size={16} /> Try Again
            </button>
          </div>
        </div>
      )}

      {/* Quiz Questions */}
      {quiz && (
        <div className="fade-in">
          {questions.map((q, qi) => (
            <div key={qi} className="quiz-question">
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {qi + 1}
                </div>
                <p className="quiz-question-text" style={{ margin: 0, paddingTop: 2 }}>{q.question}</p>
              </div>
              <div className="quiz-options">
                {q.options.map((opt, oi) => {
                  let cls = 'quiz-option'
                  if (submitted) {
                    if (oi === q.correctOptionIndex) cls += ' correct'
                    else if (answers[qi] === oi && oi !== q.correctOptionIndex) cls += ' wrong'
                  } else if (answers[qi] === oi) cls += ' selected'
                  return (
                    <button key={oi} className={cls} onClick={() => handleAnswer(qi, oi)}>
                      <span style={{ marginRight: 8, opacity: 0.6 }}>{['A', 'B', 'C', 'D'][oi]}.</span>
                      {opt}
                      {submitted && oi === q.correctOptionIndex && <CheckCircle size={16} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                      {submitted && answers[qi] === oi && oi !== q.correctOptionIndex && <XCircle size={16} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {!submitted && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={Object.keys(answers).length < total}
              >
                <Trophy size={18} />
                Submit Quiz ({Object.keys(answers).length}/{total} answered)
              </button>
            </div>
          )}
        </div>
      )}

      {!quiz && !loading && (
        <div className="empty-state">
          <div className="empty-icon">🧠</div>
          <h3 className="empty-title">Ready to Test Your Knowledge?</h3>
          <p className="empty-desc">Select a topic above to generate a personalized quiz with AI</p>
        </div>
      )}
    </div>
  )
}
