import { useLiveQuery } from 'dexie-react-hooks'
import { BookMarked, MessageCircle, Share2, TrendingUp, Loader2 } from 'lucide-react'
import { db } from '../db'
import { useAuth } from '../context/AuthContext'

function StatTile({ icon: Icon, color, label, value, loading, hidden }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
      <Icon size={18} className={`${color} mb-3`} />
      <div className="text-2xl font-semibold text-stone-800 h-8 flex items-center">
        {hidden  ? <span className="text-stone-200 text-lg">—</span>
        : loading ? <Loader2 size={18} className="text-stone-300 animate-spin" />
        : value}
      </div>
      <div className="text-xs text-stone-400 mt-1">{label}</div>
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
    { icon: BookMarked,    color: 'text-teal-500',   label: 'Journal Entries', value: journalCount ?? 0 },
    { icon: Share2,        color: 'text-indigo-400', label: 'Memory Links',    value: graphCount   ?? 0 },
    { icon: MessageCircle, color: 'text-amber-400',  label: 'AI Messages',     value: messageCount ?? 0 },
    { icon: TrendingUp,    color: 'text-rose-400',   label: 'Conversations',   value: sessionCount ?? 0 },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <StatTile key={s.label} {...s} loading={isLoading} hidden={isBrowsing} />
      ))}
    </div>
  )
}
