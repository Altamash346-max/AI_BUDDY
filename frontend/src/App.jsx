import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import RoadmapPage from './pages/RoadmapPage'
import QuizPage from './pages/QuizPage'
import InterviewPage from './pages/InterviewPage'
import StudyPlannerPage from './pages/StudyPlannerPage'
import ProfilePage from './pages/ProfilePage'
import ProgressPage from './pages/ProgressPage'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="ai-loader">
        <div className="ai-orbs">
          <div className="ai-orb" />
          <div className="ai-orb" />
          <div className="ai-orb" />
        </div>
        <p className="ai-loader-text">Initializing AI Buddy...</p>
      </div>
    </div>
  )

  if (!user) return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/study-planner" element={<StudyPlannerPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <>
      <div className="bg-animated">
        <div className="bg-orb" />
      </div>
      <div className="bg-grid" />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </>
  )
}
