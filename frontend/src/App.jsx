import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import useAuth from './contexts/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import VerifyCode from './pages/VerifyCode'
import ResetPassword from './pages/ResetPassword'
import Chat from './pages/Chat'
import Projects from './pages/Projects'
import Swipes from './pages/Swipes'
import Profile from './pages/Profile'
import Conversations from './pages/Conversations'
import TenantMembers from './pages/TenantMembers'
import Create from './pages/Create'
import DocumentEditor from './pages/DocumentEditor'
import Agents from './pages/Agents'
import AgentsCreate from './pages/AgentsCreate'
import ProjectFiles from './pages/ProjectFiles'
import Web from './pages/Web'
import Images from './pages/Images'
import Plans from './pages/Plans'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-neutral-text-secondary">Carregando...</div>
      </div>
    )
  }

  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-code" element={<VerifyCode />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <PrivateRoute>
                <Projects />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:projectId/files"
            element={
              <PrivateRoute>
                <ProjectFiles />
              </PrivateRoute>
            }
          />
          <Route
            path="/swipes"
            element={
              <PrivateRoute>
                <Swipes />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/conversations"
            element={
              <PrivateRoute>
                <Conversations />
              </PrivateRoute>
            }
          />
          <Route
            path="/create"
            element={
              <PrivateRoute>
                <Create />
              </PrivateRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <PrivateRoute>
                <Agents />
              </PrivateRoute>
            }
          />
          <Route
            path="/agents/new"
            element={
              <PrivateRoute>
                <AgentsCreate />
              </PrivateRoute>
            }
          />
          <Route
            path="/web"
            element={
              <PrivateRoute>
                <Web />
              </PrivateRoute>
            }
          />
          <Route
            path="/images"
            element={
              <PrivateRoute>
                <Images />
              </PrivateRoute>
            }
          />
          <Route
            path="/plans"
            element={
              <PrivateRoute>
                <Plans />
              </PrivateRoute>
            }
          />
          <Route
            path="/documents/new"
            element={
              <PrivateRoute>
                <DocumentEditor />
              </PrivateRoute>
            }
          />
          <Route
            path="/documents/:fileId/edit"
            element={
              <PrivateRoute>
                <DocumentEditor />
              </PrivateRoute>
            }
          />
          <Route
            path="/tenants/:tenantId/members"
            element={
              <PrivateRoute>
                <TenantMembers />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/chat" />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

