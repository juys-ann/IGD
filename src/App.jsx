/**
 * src/App.jsx  (updated)
 *
 * Changes from original:
 *   - Imports ProtectedRoute (replaces per-page BrowsingGate pattern)
 *   - Wraps the entire <Layout> route in <ProtectedRoute> so auth is
 *     checked ONCE at the router level, not independently on each page.
 *   - Individual pages no longer need <BrowsingGate> wrappers.
 *
 * VaultModal still lives here — it handles the actual PIN entry UI
 * that ProtectedRoute triggers via requireAuth().
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AIProvider }        from './context/AIContext'
import { AuthProvider }      from './context/AuthContext'
import { EmbeddingProvider } from './context/EmbeddingContext'
import { ProfileProvider }   from './context/ProfileContext'
import Layout              from './components/Layout'
import ProtectedRoute      from './components/ProtectedRoute'   // ← NEW
import Dashboard           from './pages/Dashboard'
import ArchiveIngestion    from './pages/ArchiveIngestion'
import EchoChamber         from './pages/EchoChamber'
import JournalEntry        from './pages/JournalEntry'
import VaultModal          from './components/VaultModal'
import ProfilePage         from './pages/ProfilePage'
import LifeInsights        from './pages/LifeInsights'
import BehavioralForesight from './pages/BehavioralForesight'
import SystemCheck         from './pages/SystemCheck'

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <AIProvider>
          <EmbeddingProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                {/*
                 * ProtectedRoute wraps <Layout> so auth is enforced once,
                 * at the top level. Every child route is automatically protected.
                 * No individual page needs its own <BrowsingGate>.
                 */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard"              element={<Dashboard />} />
                  <Route path="dashboard/system-check" element={<SystemCheck />} />
                  <Route path="archive"                element={<ArchiveIngestion />} />
                  <Route path="echo"                   element={<EchoChamber />} />
                  <Route path="journal"                element={<JournalEntry />} />
                  <Route path="radar"                  element={<LifeInsights />} />
                  <Route path="foresight"              element={<BehavioralForesight />} />
                  <Route path="profile"                element={<ProfilePage />} />
                </Route>
              </Routes>
              <VaultModal />
            </BrowserRouter>
          </EmbeddingProvider>
        </AIProvider>
      </ProfileProvider>
    </AuthProvider>
  )
}
