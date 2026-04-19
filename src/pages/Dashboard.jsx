import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, BookOpen, Sparkles, User, LayoutDashboard } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import StatsCard    from '../components/StatsCard'
import EmotionRadar from '../components/EmotionRadar'
import ThenVsNow    from '../components/ThenVsNow'
import BrowsingGate from '../components/BrowsingGate'
import { db }       from '../db'
import { aggregateEmotions } from '../services/nlp/emotionClassifier'
import { useEmbedding }      from '../context/EmbeddingContext'
import { useProfile }        from '../context/ProfileContext'

const MOOD_SCORE = { joyful: 5, energised: 4, calm: 3, neutral: 2, low: 1 }
const MOOD_HEX   = { joyful: '#f59e0b', energised: '#6366f1', calm: '#06b6d4', neutral: '#a8a29e', low: '#f43f5e' }

function MoodTimeline({ entries }) {
  const recent = [...entries].slice(0, 20).reverse()
  if (!recent.length) return null
  return (
    <div className="flex items-end gap-1 h-12">
      {recent.map((e, i) => {
        const score  = MOOD_SCORE[e.mood] ?? 2
        const height = `${(score / 5) * 100}%`
        const color  = MOOD_HEX[e.mood] ?? '#d4b896'
        return (
          <div key={i} className="flex-1 flex items-end"
            title={`${e.title || 'Untitled'} — ${e.mood ?? 'no mood'}`}>
            <div className="w-full rounded-sm transition-opacity hover:opacity-100 opacity-70"
              style={{ height, background: color }} />
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const { embedStatus, semanticSearch } = useEmbedding()
  const { profile } = useProfile()

  const entries = useLiveQuery(
    () => db.journals.orderBy('timestamp').reverse().toArray(), []
  )

  const emotionScores = useMemo(() => {
    if (!entries?.length) return {}
    return aggregateEmotions(entries)
  }, [entries])

  const [thenVsNow, setThenVsNow] = useState(null)

  useEffect(() => {
    if (!entries?.length || entries.length < 2 || embedStatus !== 'ready') return
    const findMatch = async () => {
      const latest = entries[0]
      if (!latest?.content) return
      try {
        const results = await semanticSearch(latest.content.slice(0, 500), 6)
        const match = results.find((r) => r.journalId !== latest.id)
        if (!match) return
        const pastEntry = await db.journals.get(match.journalId)
        if (pastEntry) setThenVsNow({ current: latest, past: pastEntry })
      } catch (err) {
        console.error('ThenVsNow lookup failed:', err)
      }
    }
    findMatch()
  }, [entries, embedStatus])

  const hasEntries = entries && entries.length > 0

  return (
    <BrowsingGate
      feature="Dashboard"
      description="Your personal reflection space — emotional landscape, memory connections, and journal stats."
      icon={LayoutDashboard}
    >
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
            style={{ background: '#e8d5b7', border: '2px solid #d4b896' }}
          >
            {profile.photo
              ? <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
              : <User size={22} style={{ color: '#b09070' }} />}
          </div>
          <div>
            <h1 className="text-2xl font-semibold"
              style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
              Welcome back, {profile.name || 'Jhoyce'}.
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#9a7550' }}>
              Your reflection space. Everything stored privately on your device.
            </p>
          </div>
        </div>

        {/* Stats */}
        <StatsCard />

        {/* Then vs Now */}
        {thenVsNow && (
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: '#c27a2a' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#7a4f2a' }}>
                A Memory Connection
              </h2>
              <span className="text-[11px]" style={{ color: '#b09070' }}>
                — similar entries found in your archive
              </span>
            </div>
            <ThenVsNow current={thenVsNow.current} past={thenVsNow.past} />
          </section>
        )}

        {/* Emotion Radar + Mood Timeline */}
        {hasEntries ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border p-5" style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} style={{ color: '#c27a2a' }} />
                <h2 className="text-sm font-semibold" style={{ color: '#7a4f2a' }}>Emotional Landscape</h2>
              </div>
              <EmotionRadar scores={emotionScores} />
            </div>

            <div className="rounded-2xl border p-5 flex flex-col gap-3" style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen size={14} style={{ color: '#c27a2a' }} />
                  <h2 className="text-sm font-semibold" style={{ color: '#7a4f2a' }}>Recent Mood</h2>
                </div>
                <span className="text-[11px]" style={{ color: '#b09070' }}>
                  Last {Math.min(entries.length, 20)} entries
                </span>
              </div>
              <MoodTimeline entries={entries} />
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                {Object.entries(MOOD_HEX).map(([mood, hex]) => (
                  <span key={mood} className="flex items-center gap-1.5 text-[11px] capitalize" style={{ color: '#9a7550' }}>
                    <span className="w-2 h-2 rounded-sm" style={{ background: hex }} />
                    {mood}
                  </span>
                ))}
              </div>
              {Object.keys(emotionScores).length > 0 && (() => {
                const top = Object.entries(emotionScores).sort((a, b) => b[1] - a[1])[0]
                return (
                  <div className="mt-auto pt-3 border-t text-[11px]" style={{ borderColor: '#e8d5b7', color: '#9a7550' }}>
                    Dominant tone: <strong style={{ color: '#3b2a1a' }}>{top[0]}</strong> ({Math.round(top[1] * 100)}%)
                  </div>
                )
              })()}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border p-10 flex flex-col items-center gap-3 text-center"
            style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
            <div className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: '#d4b896' }}>
              <TrendingUp size={22} style={{ color: '#d4b896' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#9a7550' }}>
              Your emotional landscape will appear here
            </p>
            <p className="text-xs max-w-xs" style={{ color: '#b09070' }}>
              Start writing journal entries and your emotional patterns will be visualised automatically.
            </p>
          </div>
        )}
      </div>
    </BrowsingGate>
  )
}
