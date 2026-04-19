import { ShieldCheck } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/dashboard':               { title: 'Dashboard',         sub: 'Your reflection space'       },
  '/dashboard/system-check':  { title: 'Engine Status',     sub: 'Environment diagnostics'     },
  '/archive':                 { title: 'Archive Ingestion',  sub: 'Your memory archive'         },
  '/echo':                    { title: 'The Echo Chamber',   sub: 'Reflect with your past self' },
  '/journal':                 { title: 'Journal Entry',      sub: 'Write & reflect'             },
  '/radar':                   { title: 'Life Insights',      sub: 'Patterns across your entries'},
}

export default function PrivacyHeader() {
  const { pathname } = useLocation()
  const page = pageTitles[pathname] ?? { title: 'Inter-Generational Dialogue', sub: '' }

  return (
    <header className="h-14 flex items-center justify-between px-8 bg-stone-50/90 backdrop-blur border-b border-stone-200 shrink-0 z-10">
      {/* Page title */}
      <div className="flex items-baseline gap-3">
        <h2 className="text-sm font-semibold text-stone-800">{page.title}</h2>
        {page.sub && (
          <>
            <span className="text-stone-300">/</span>
            <span className="text-xs text-stone-400">{page.sub}</span>
          </>
        )}
      </div>

      {/* Privacy Shield badge */}
      <div className="flex items-center gap-2 bg-stone-900 text-stone-100 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
        <ShieldCheck size={13} className="text-teal-400" strokeWidth={2.5} />
        <span>Local-Only Mode</span>
        <span className="relative flex h-1.5 w-1.5 ml-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500" />
        </span>
      </div>
    </header>
  )
}
