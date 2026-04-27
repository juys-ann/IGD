import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AppHeader from './AppHeader'

// ── Reusable blob — same component pattern as LandingPage ─────────────────────
function Blob({ style }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{ filter: 'blur(80px)', ...style }}
    />
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#fdf8f2', position: 'relative' }}>

      {/* ── Atmospheric blob background — same as LandingPage ────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Top-left dominant warm blob */}
        <Blob style={{
          width: 700, height: 700,
          top: -220, left: -220,
          background: '#d4a96a',
          opacity: 0.38,
        }} />
        {/* Bottom-right amber blob */}
        <Blob style={{
          width: 560, height: 560,
          bottom: -180, right: -180,
          background: '#c27a2a',
          opacity: 0.24,
        }} />
        {/* Center-right soft accent */}
        <Blob style={{
          width: 380, height: 380,
          top: '30%', right: '5%',
          background: '#e8c49a',
          opacity: 0.22,
        }} />
        {/* Mid-left subtle warm */}
        <Blob style={{
          width: 300, height: 300,
          top: '60%', left: '15%',
          background: '#d4956a',
          opacity: 0.18,
        }} />
      </div>

      {/* Sidebar — slides in/out, sits above blobs */}
      <div
        className="shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
        style={{ width: sidebarOpen ? '240px' : '0px', position: 'relative', zIndex: 1 }}
      >
        <Sidebar />
      </div>

      {/* Main content — sits above blobs */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
        <AppHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((p) => !p)}
        />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
