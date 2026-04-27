import { useLiveQuery } from 'dexie-react-hooks'
import { BookMarked, MessageCircle, Share2, TrendingUp, Loader2 } from 'lucide-react'
import { db } from '../db'
import { useAuth } from '../context/AuthContext'

function StatTile({ icon: Icon, color, label, value, loading, hidden }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#fff', border: '1px solid #e8d5b7', boxShadow: '0 1px 4px #d4b89618' }}
    >
      <Icon size={18} style={{ color, marginBottom: '12px' }} />
      <div className="text-2xl font-semibold h-8 flex items-center" style={{ color: '#3b2a1a' }}>
        {hidden
          ? <span style={{ color: '#e8d5b7', fontSize: '18px' }}>—</span>
          : loading
          ? <Loader2 size={18} className="animate-spin" style={{ color: '#d4b896' }} />
          : value}
      </div>
      <div className="text-xs mt-1" style={{ color: '#b09070' }}>{label}</div>
    </div>
  )
}

export default function StatsCard() {
  const { isBrowsing } = useAuth()

  const journalCount = useLiveQuery(() => db.journals.count(),     [], undefined)
  const messageCount = useLiveQuery(() => db.chatHistory.count(),  [], undefined)
  const graphCount   = useLiveQuery(() => db.graphLinks.count(),   [], undefined)
  const sessionCount = useLiveQuery(() => db.chatSessions.count(), [], undefined)

  const isLoading = journalCount === undefined

  const stats = [
    { icon: BookMarked,    color: '#0d9488', label: 'Journal Entries', value: journalCount ?? 0 },
    { icon: Share2,        color: '#818cf8', label: 'Memory Links',    value: graphCount   ?? 0 },
    { icon: MessageCircle, color: '#c27a2a', label: 'AI Messages',     value: messageCount ?? 0 },
    { icon: TrendingUp,    color: '#f43f5e', label: 'Conversations',   value: sessionCount ?? 0 },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <StatTile key={s.label} {...s} loading={isLoading} hidden={isBrowsing} />
      ))}
    </div>
  )
}
