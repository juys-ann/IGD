import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, MessageCircle,
  Cpu, Activity, Feather, User, TrendingUp,
} from 'lucide-react'
import { useProfile } from '../context/ProfileContext'

const NAV_ITEMS = [
  { to: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard',           end: true  },
  { to: '/journal',                icon: Feather,         label: 'My Journal',          end: false },
  { to: '/archive',                icon: FolderOpen,      label: 'Memory Archive',      end: false },
  { to: '/echo',                   icon: MessageCircle,   label: 'The Echo',            end: false },
  { to: '/radar',                  icon: Activity,        label: 'Life Insights',       end: false },
  { to: '/foresight',              icon: TrendingUp,      label: 'Behavioral Foresight',end: false },
  { to: '/dashboard/system-check', icon: Cpu,             label: 'Engine Status',       end: false },
]

export default function Sidebar() {
  const { profile } = useProfile()

  return (
    <aside
      className="w-60 h-screen flex flex-col overflow-hidden"
      style={{ background: '#f4ecd8', borderRight: '1px solid #d4b896' }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid #d4b896' }}>
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: '#b09070' }}>
          My Journal
        </p>
        <h1
          className="text-lg font-semibold leading-tight"
          style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}
        >
          Inter-Generational<br />Dialogue
        </h1>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#9a7550' }}>
          A private space for your memories.
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${isActive ? 'text-amber-900' : 'hover:bg-amber-100/60'}`
            }
            style={({ isActive }) => isActive
              ? { background: '#e8d5b7', color: '#7a4f2a' }
              : { color: '#7a5c3a' }
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className="shrink-0" style={{ color: isActive ? '#c27a2a' : '#9a7550' }} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Profile card at bottom */}
      <div className="px-3 pb-4">
        <NavLink
          to="/profile"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            borderRadius: '16px',
            background:  isActive ? '#e8d5b7' : 'rgba(0,0,0,0.04)',
            border:      '1px solid #d4b896',
            textDecoration: 'none',
          })}
        >
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
            style={{ background: '#e8d5b7', border: '1.5px solid #c4a882' }}
          >
            {profile.photo
              ? <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
              : <User size={16} style={{ color: '#9a7550' }} />
            }
          </div>
          {/* Name + label */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#3b2a1a' }}>
              {profile.name || 'Your Profile'}
            </p>
            <p className="text-[10px]" style={{ color: '#b09070' }}>Settings & Profile</p>
          </div>
        </NavLink>
      </div>
    </aside>
  )
}
