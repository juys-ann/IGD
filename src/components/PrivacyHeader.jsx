import { ShieldCheck } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/dashboard':              { title: 'Dashboard',           sub: 'Your reflection space'        },
  '/dashboard/system-check': { title: 'Engine Status',       sub: 'Environment diagnostics'      },
  '/archive':                { title: 'Archive Ingestion',   sub: 'Your memory archive'          },
  '/echo':                   { title: 'The Echo Chamber',    sub: 'Reflect with your past self'  },
  '/journal':                { title: 'Journal Entry',       sub: 'Write & reflect'              },
  '/radar':                  { title: 'Life Insights',       sub: 'Patterns across your entries' },
}

export default function PrivacyHeader() {
  const { pathname } = useLocation()
  const page = pageTitles[pathname] ?? { title: 'Inner Growth Diary', sub: '' }

  return (
    <header
      className="h-14 flex items-center justify-between px-8 shrink-0 z-10"
      style={{
        background: 'rgba(253,248,242,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e8d5b7',
      }}
    >
      {/* Page title */}
      <div className="flex items-baseline gap-3">
        <h2
          className="text-sm font-semibold"
          style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}
        >
          {page.title}
        </h2>
        {page.sub && (
          <>
            <span style={{ color: '#d4b896' }}>/</span>
            <span className="text-xs" style={{ color: '#b09070' }}>{page.sub}</span>
          </>
        )}
      </div>

      {/* Privacy Shield badge */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{ background: '#3b2a1a', color: '#fdf8f2' }}
      >
        <ShieldCheck size={13} style={{ color: '#4ade80' }} strokeWidth={2.5} />
        <span>Local-Only Mode</span>
        <span className="relative flex h-1.5 w-1.5 ml-0.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: '#4ade80' }}
          />
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{ background: '#22c55e' }}
          />
        </span>
      </div>
    </header>
  )
}
