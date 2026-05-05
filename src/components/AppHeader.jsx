import { useState } from 'react'
import { PanelLeftOpen, PanelLeftClose, LogOut, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PAGE_TITLES = {
  '/dashboard':              'Dashboard',
  '/dashboard/system-check': 'Engine Status',
  '/archive':                'Archive',
  '/echo':                   'The Echo Chamber',
  '/journal':                'My Journal',
  '/radar':                  'Life Insights',
  '/foresight':              'Behavioral Foresight',
  '/profile':                'Profile & Settings',
}

export default function AppHeader({ sidebarOpen, onToggleSidebar }) {
  const { pathname }              = useLocation()
  const { lock, authState }       = useAuth()
  const title                     = PAGE_TITLES[pathname] ?? 'Inter-Generational Dialogue'
  const isUnlocked                = authState === 'unlocked'

  // Task 1.3 — confirmation popover state
  const [confirmingLock, setConfirmingLock] = useState(false)

  const handleLockClick = () => {
    setConfirmingLock(true)
  }

  const handleConfirmLock = () => {
    setConfirmingLock(false)
    lock()
  }

  const handleCancelLock = () => {
    setConfirmingLock(false)
  }

  return (
    <header
      className="h-12 flex items-center gap-3 px-4 shrink-0 border-b relative"
      style={{ background: 'rgba(253,248,242,0.80)', borderColor: '#ede5d8', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-amber-100"
        style={{ color: '#9a7550' }}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </button>

      {/* Page title */}
      <h2
        className="text-sm font-semibold flex-1"
        style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}
      >
        {title}
      </h2>

      {/* Lock button — only shown when signed in */}
      {isUnlocked && (
        <div className="relative">
          <button
            onClick={handleLockClick}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-amber-100"
            style={{ color: '#9a7550' }}
            title="Lock journal"
            aria-label="Lock journal"
          >
            <LogOut size={15} />
          </button>

          {/* Inline confirmation popover */}
          {confirmingLock && (
            <>
              {/* Backdrop to close on outside click */}
              <div
                className="fixed inset-0 z-40"
                onClick={handleCancelLock}
                aria-hidden="true"
              />

              {/* Popover */}
              <div
                className="absolute right-0 top-10 z-50 rounded-2xl p-4 shadow-xl w-56"
                style={{
                  background: '#f4ecd8',
                  border: '1px solid #d4b896',
                  animation: 'popIn 0.15s ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold" style={{ color: '#3b2a1a' }}>
                    Lock your journal?
                  </p>
                  <button onClick={handleCancelLock} style={{ color: '#b09070' }}>
                    <X size={12} />
                  </button>
                </div>
                <p className="text-[11px] mb-3 leading-relaxed" style={{ color: '#9a7550' }}>
                  You'll need your password to return to your memories.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelLock}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: '#e8d5b7', color: '#7a4f2a' }}
                  >
                    Stay
                  </button>
                  <button
                    onClick={handleConfirmLock}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{ background: '#3b2a1a', color: '#fdf8f2' }}
                  >
                    Lock it
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes popIn {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </header>
  )
}
