import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { User, Upload, Zap, Code, Briefcase, BookOpen, FileText, X, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { startJob, clearJob, useJob } from '../utils/jobs'

const UPLOAD_JOB = 'resume-upload'

export default function ProfilePage() {
  const { user } = useAuth()
  const uploadJob = useJob(UPLOAD_JOB)
  const uploading = uploadJob?.status === 'running'
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resumeFile, setResumeFile] = useState(null)
  const [linkedinFile, setLinkedinFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const resumeRef = useRef()
  const linkedinRef = useRef()

  useEffect(() => {
    setLoading(true)
    api.get('/interview/profile')
      .then(r => setProfile(r.data?.data || null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) setResumeFile(file)
  }

  // A resume, a LinkedIn PDF, or both. Uploading again replaces the current profile.
  const handleUpload = (e) => {
    e.preventDefault()
    if (!resumeFile && !linkedinFile) return toast.error('Select your resume or LinkedIn PDF')

    const formData = new FormData()
    if (resumeFile) formData.append('resume', resumeFile)
    if (linkedinFile) formData.append('linkedin', linkedinFile)

    startJob(UPLOAD_JOB, () => api.post('/interview/profile/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data?.data), { doneMessage: '🎉 Profile updated from your documents!' })
  }

  useEffect(() => {
    if (uploadJob?.status === 'done') {
      setProfile(uploadJob.result)
      setResumeFile(null)
      setLinkedinFile(null)
      clearJob(UPLOAD_JOB)
    } else if (uploadJob?.status === 'error') {
      clearJob(UPLOAD_JOB)
    }
  }, [uploadJob])

  const handleDelete = async () => {
    if (!window.confirm('Delete your uploaded resume and the skills extracted from it?')) return
    setDeleting(true)
    try {
      await api.delete('/interview/profile')
      setProfile(null)
      toast.success('Resume deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete the resume')
    } finally {
      setDeleting(false)
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const SKILL_COLORS = ['badge-purple', 'badge-cyan', 'badge-emerald', 'badge-amber', 'badge-rose']

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">👤 Your Profile</h1>
        <p className="page-subtitle">Upload your resume — AI will automatically extract your skills, projects, and experience</p>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
        {/* Left - User Card + Current Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Avatar Card */}
          <div className="card card-p" style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80,
              borderRadius: '50%',
              background: 'var(--grad-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, color: 'white',
              margin: '0 auto 16px',
              boxShadow: '0 0 30px rgba(139,92,246,0.4)',
            }}>
              {initials}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{user?.name}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge-purple"><Zap size={11} /> AI Buddy Member</span>
              {profile && (
                <span className="badge badge-emerald">
                  <CheckCircle size={11} /> Profile Active
                </span>
              )}
            </div>
            {profile && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 14, color: 'var(--accent-rose)' }}
                onClick={handleDelete}
                disabled={deleting || uploading}
              >
                <Trash2 size={13} /> {deleting ? 'Deleting…' : 'Delete uploaded resume'}
              </button>
            )}
          </div>

          {/* Profile Data */}
          {loading ? (
            <div className="ai-loader"><div className="ai-orbs"><div className="ai-orb"/><div className="ai-orb"/><div className="ai-orb"/></div><p className="ai-loader-text">Loading profile...</p></div>
          ) : profile ? (
            <>
              {/* Skills */}
              {profile.parsedSkills?.length > 0 && (
                <div className="card card-p">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Code size={16} color="var(--accent-purple)" />
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>Extracted Skills</h3>
                    <span className="badge badge-purple">{profile.parsedSkills.length}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {profile.parsedSkills.map((s, i) => (
                      <span key={s} className={`badge ${SKILL_COLORS[i % SKILL_COLORS.length]}`}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {profile.parsedExperience?.length > 0 && (
                <div className="card card-p">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Briefcase size={16} color="#ec4899" />
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>Experience</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {profile.parsedExperience.map((exp, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-purple)', marginTop: 7, flexShrink: 0 }} />
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{exp}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {profile.parsedProjects?.length > 0 && (
                <div className="card card-p">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Code size={16} color="#06b6d4" />
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>Projects</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {profile.parsedProjects.map((proj, i) => (
                      <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{proj.name}</div>
                        {proj.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.5 }}>{proj.description}</p>}
                        {proj.techUsed?.length > 0 && (
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {proj.techUsed.map(t => (
                              <span key={t} className="badge badge-cyan" style={{ fontSize: 10 }}>{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {profile.parsedEducation?.length > 0 && (
                <div className="card card-p">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <BookOpen size={16} color="#10b981" />
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>Education</h3>
                  </div>
                  {profile.parsedEducation.map((edu, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', marginTop: 7, flexShrink: 0 }} />
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{edu}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="card card-p" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <AlertCircle size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No profile yet. Upload your resume to get started!</p>
            </div>
          )}
        </div>

        {/* Right - Upload Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card card-p">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={18} color="var(--accent-purple)" />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{profile ? 'Replace Resume' : 'Upload Resume'}</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {profile ? 'A new upload replaces your current profile' : 'AI will automatically extract your skills & experience'}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Resume Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => resumeRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent-purple)' : resumeFile ? '#10b981' : 'var(--border-accent)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'rgba(139,92,246,0.05)' : resumeFile ? 'rgba(16,185,129,0.05)' : 'transparent',
                  transition: 'var(--transition)',
                }}
              >
                <input
                  ref={resumeRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  style={{ display: 'none' }}
                  onChange={e => setResumeFile(e.target.files[0])}
                />
                {resumeFile ? (
                  <>
                    <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 14, color: '#10b981', fontWeight: 600 }}>{resumeFile.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {(resumeFile.size / 1024).toFixed(0)} KB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setResumeFile(null) }}
                      style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, margin: '8px auto 0' }}
                    >
                      <X size={12} /> Remove
                    </button>
                  </>
                ) : (
                  <>
                    <FileText size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Drop your resume here or <span style={{ color: 'var(--accent-purple)' }}>browse</span>
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Supports PDF, DOCX, TXT</p>
                  </>
                )}
              </div>

              {/* LinkedIn (optional) */}
              <div className="form-group">
                <label className="form-label">LinkedIn PDF (optional, or use it on its own)</label>
                <div
                  onClick={() => linkedinRef.current?.click()}
                  style={{
                    border: `1px dashed ${linkedinFile ? '#10b981' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: linkedinFile ? 'rgba(16,185,129,0.05)' : 'var(--bg-glass)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <input
                    ref={linkedinRef}
                    type="file"
                    accept=".pdf,.txt"
                    style={{ display: 'none' }}
                    onChange={e => setLinkedinFile(e.target.files[0])}
                  />
                  <Upload size={15} color={linkedinFile ? '#10b981' : 'var(--text-muted)'} />
                  <span style={{ fontSize: 13, color: linkedinFile ? '#10b981' : 'var(--text-muted)', flex: 1 }}>
                    {linkedinFile ? linkedinFile.name : 'Add LinkedIn profile PDF (optional)'}
                  </span>
                  {linkedinFile && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setLinkedinFile(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={uploading || (!resumeFile && !linkedinFile)}>
                {uploading ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="ai-orbs" style={{ gap: 5 }}>
                      <div className="ai-orb" style={{ width: 7, height: 7 }} />
                      <div className="ai-orb" style={{ width: 7, height: 7 }} />
                      <div className="ai-orb" style={{ width: 7, height: 7 }} />
                    </div>
                    AI is parsing your resume...
                  </div>
                ) : (
                  <><Zap size={18} /> Parse Resume with AI</>
                )}
              </button>
            </form>
          </div>

          {/* How it works */}
          <div className="card card-p" style={{ background: 'var(--grad-dark)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color="var(--accent-purple)" /> How It Works
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { step: '1', text: 'Upload your resume (PDF, DOCX or TXT) and/or your LinkedIn "Save to PDF" export' },
                { step: '2', text: 'Gemini AI extracts your skills, experience & projects' },
                { step: '3', text: 'Your profile is used to personalize interview questions' },
                { step: '4', text: 'Get better, more relevant AI responses across all features' },
              ].map(({ step, text }) => (
                <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{step}</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, paddingTop: 2 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
