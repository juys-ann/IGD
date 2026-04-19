/**
 * BehavioralForesight.jsx — Sprint 8 (IGD-022 + IGD-023)
 * v3: BrowsingGate added + Goals moved from localStorage → IndexedDB
 */
import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  TrendingUp, TrendingDown, Minus, Target, Sparkles,
  Star, Plus, Trash2, AlertCircle, Feather,
} from 'lucide-react'
import { db, addGoal, deleteGoal, getAllGoals } from '../db'
import {
  computeTrajectory, scoreGoalProbability,
  retrieveResilienceMoments, generateActivePrompt,
} from '../services/foresight/foresight'
import { EMOTION_COLORS } from '../services/nlp/emotionClassifier'
import BrowsingGate from '../components/BrowsingGate'

// ── SVG Trajectory Chart ──────────────────────────────────────────────────────
const CHART_W = 560
const CHART_H = 160
const PAD     = { top: 16, right: 16, bottom: 28, left: 32 }

function scaleX(x, total) {
  return PAD.left + (x / Math.max(total - 1, 1)) * (CHART_W - PAD.left - PAD.right)
}
function scaleY(score) {
  return PAD.top + (1 - score) * (CHART_H - PAD.top - PAD.bottom)
}
function toPath(points, total) {
  return points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${scaleX(p.x, total)} ${scaleY(p.score)}`
  ).join(' ')
}

function TrajectoryChart({ trajectory }) {
  if (!trajectory) return null
  const { historical, projection, optimized } = trajectory
  const total    = historical.length + projection.length - 1
  const histPath = toPath(historical, total)
  const lastHist = historical[historical.length - 1]
  const projPath = toPath([lastHist, ...projection], total)
  const optPath  = toPath([lastHist, ...optimized],  total)
  const fmtShort = (iso) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%" style={{ overflow: 'visible' }}>
      {[0.25, 0.5, 0.75].map((y) => (
        <line key={y} x1={PAD.left} x2={CHART_W - PAD.right}
          y1={scaleY(y)} y2={scaleY(y)} stroke="#e8d5b7" strokeWidth="1" strokeDasharray="4 3" />
      ))}
      {[0.25, 0.5, 0.75].map((y) => (
        <text key={y} x={PAD.left - 4} y={scaleY(y) + 3}
          textAnchor="end" fontSize="9" fill="#b09070">{Math.round(y * 100)}</text>
      ))}
      <line x1={scaleX(lastHist.x, total)} x2={scaleX(lastHist.x, total)}
        y1={PAD.top} y2={CHART_H - PAD.bottom}
        stroke="#c27a2a" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
      <text x={scaleX(lastHist.x, total)} y={CHART_H - PAD.bottom + 12}
        textAnchor="middle" fontSize="9" fill="#c27a2a" fontWeight="600">Today</text>
      <path d={histPath} fill="none" stroke="#9a7550" strokeWidth="2" strokeLinejoin="round" />
      <path d={optPath}  fill="none" stroke="#c27a2a" strokeWidth="1.5"
        strokeDasharray="5 3" strokeLinejoin="round" opacity="0.7" />
      <path d={projPath} fill="none" stroke="#6366f1" strokeWidth="2"
        strokeDasharray="6 3" strokeLinejoin="round" />
      {historical.map((p, i) => (
        <circle key={i} cx={scaleX(p.x, total)} cy={scaleY(p.score)} r="3"
          fill={EMOTION_COLORS[p.dominant] ?? '#9a7550'} stroke="#fdf8f2" strokeWidth="1.5">
          <title>{p.title} — {Math.round(p.score * 100)}%</title>
        </circle>
      ))}
      <circle
        cx={scaleX(projection[projection.length - 1].x, total)}
        cy={scaleY(projection[projection.length - 1].score)}
        r="4" fill="#6366f1" stroke="#fdf8f2" strokeWidth="1.5" />
      {historical.length > 0 && (
        <text x={scaleX(historical[0].x, total)} y={CHART_H - PAD.bottom + 12}
          textAnchor="middle" fontSize="9" fill="#b09070">
          {fmtShort(historical[0].date)}
        </text>
      )}
      {projection.length > 0 && (
        <text x={scaleX(projection[projection.length - 1].x, total)} y={CHART_H - PAD.bottom + 12}
          textAnchor="middle" fontSize="9" fill="#6366f1">
          {fmtShort(projection[projection.length - 1].date)}
        </text>
      )}
    </svg>
  )
}

// ── Probability ring ──────────────────────────────────────────────────────────
function ProbabilityRing({ score }) {
  const r    = 36
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#c27a2a' : '#ef4444'
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e8d5b7" strokeWidth="7" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x="44" y="44" textAnchor="middle" dominantBaseline="middle"
        fontSize="16" fontWeight="700" fill={color}>{score}%</text>
      <text x="44" y="58" textAnchor="middle" fontSize="8" fill="#9a7550">likely</text>
    </svg>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BehavioralForesight() {
  const entries = useLiveQuery(
    () => db.journals.orderBy('timestamp').reverse().toArray(), []
  )
  const goals = useLiveQuery(() => getAllGoals(), []) ?? []

  const [newGoal,         setNewGoal]         = useState('')
  const [dismissedPrompt, setDismissedPrompt] = useState(false)

  const trajectory        = useMemo(() => computeTrajectory(entries ?? []), [entries])
  const resilienceMoments = useMemo(() => retrieveResilienceMoments(entries ?? []), [entries])
  const recentMood        = entries?.[0]?.mood ?? null
  const activePrompt      = useMemo(
    () => generateActivePrompt(entries ?? [], recentMood), [entries, recentMood]
  )

  const pathConfig = {
    rising:  { icon: TrendingUp,   color: '#10b981', label: 'Rising',
      desc: 'Your emotional tone has been trending upward.' },
    falling: { icon: TrendingDown, color: '#ef4444', label: 'Falling',
      desc: 'Your recent entries show a downward trend.' },
    stable:  { icon: Minus,        color: '#c27a2a', label: 'Stable',
      desc: 'Your emotional tone has been consistent.' },
  }
  const path     = pathConfig[trajectory?.currentPath ?? 'stable']
  const PathIcon = path.icon
  const hasData  = entries && entries.length >= 2

  const handleAddGoal = async () => {
    if (!newGoal.trim()) return
    const prob = scoreGoalProbability(trajectory, newGoal)
    await addGoal({ text: newGoal.trim(), probability: prob })
    setNewGoal('')
  }

  return (
    <BrowsingGate
      feature="Behavioral Foresight"
      description="See where your current patterns are taking you — projected trajectories, goal probability scores, and your personal resilience archive."
      icon={TrendingUp}
    >
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold"
            style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
            Behavioral Foresight
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9a7550' }}>
            Where your patterns are taking you — and where you could go.
          </p>
        </div>

        {!hasData ? (
          <div className="rounded-2xl border p-12 flex flex-col items-center gap-4 text-center"
            style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
            <AlertCircle size={32} style={{ color: '#d4b896' }} />
            <p className="text-sm font-medium" style={{ color: '#9a7550' }}>Not enough data yet</p>
            <p className="text-xs max-w-xs leading-relaxed" style={{ color: '#b09070' }}>
              Write at least 2 journal entries and your behavioral trajectory,
              goals, and motivational insights will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Active Prompt */}
            {activePrompt?.triggered && !dismissedPrompt && (
              <div className="rounded-2xl p-5 flex items-start gap-4 relative"
                style={{ background: '#f4ecd8', border: '1px solid #d4b896' }}>
                <Sparkles size={20} style={{ color: '#c27a2a', flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: '#9a7550' }}>
                    A message from your past self
                  </p>
                  <p className="text-sm leading-relaxed"
                    style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
                    {activePrompt.text}
                  </p>
                  {activePrompt.source && (
                    <p className="text-[11px] mt-2" style={{ color: '#b09070' }}>
                      — from your entry: <em>{activePrompt.source.title}</em>
                    </p>
                  )}
                </div>
                <button onClick={() => setDismissedPrompt(true)}
                  className="text-[11px] shrink-0 mt-0.5" style={{ color: '#b09070' }}>
                  Dismiss
                </button>
              </div>
            )}

            {/* Trajectory Chart */}
            <div className="rounded-2xl border p-5 space-y-4"
              style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <PathIcon size={15} style={{ color: path.color }} />
                  <h2 className="text-sm font-semibold" style={{ color: '#7a4f2a' }}>
                    Future Trajectory
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${path.color}22`, color: path.color }}>
                    {path.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px]" style={{ color: '#b09070' }}>
                  <span className="flex items-center gap-1">
                    <span className="w-6 border-t-2 border-stone-400 inline-block" /> History
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-6 border-t-2 border-indigo-400 inline-block"
                      style={{ borderStyle: 'dashed' }} /> Projection
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-6 border-t-2 inline-block"
                      style={{ borderStyle: 'dashed', borderColor: '#c27a2a' }} /> Optimised
                  </span>
                </div>
              </div>
              <TrajectoryChart trajectory={trajectory} />
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { label: 'Total Entries',       value: trajectory.totalEntries },
                  { label: 'Writing Consistency', value: `${Math.round(trajectory.consistency * 100)}%` },
                  { label: 'Trend Slope',
                    value: trajectory.slope > 0 ? `+${trajectory.slope}` : `${trajectory.slope}` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center rounded-xl py-2"
                    style={{ background: '#f4ecd8' }}>
                    <p className="text-base font-semibold" style={{ color: '#3b2a1a' }}>{value}</p>
                    <p className="text-[10px]" style={{ color: '#9a7550' }}>{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px]" style={{ color: '#9a7550' }}>{path.desc}</p>
            </div>

            {/* Goals */}
            <div className="rounded-2xl border p-5 space-y-4"
              style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
              <div className="flex items-center gap-2">
                <Target size={15} style={{ color: '#c27a2a' }} />
                <h2 className="text-sm font-semibold" style={{ color: '#7a4f2a' }}>Goal Tracker</h2>
                <span className="text-[11px]" style={{ color: '#b09070' }}>
                  — probability scored from your writing patterns
                </span>
              </div>
              <div className="flex gap-2">
                <input type="text" value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddGoal() }}
                  placeholder="Add a goal (e.g. 'feel more confident at work')"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: '#f4ecd8', border: '1px solid #d4b896', color: '#3b2a1a' }}
                />
                <button onClick={handleAddGoal} disabled={!newGoal.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  style={{ background: '#c27a2a', color: '#fff' }}>
                  <Plus size={14} /> Add
                </button>
              </div>
              {goals.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: '#b09070' }}>
                  No goals yet. Add one above to see your probability score.
                </p>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-4 p-3 rounded-xl"
                      style={{ background: '#f4ecd8', border: '1px solid #e8d5b7' }}>
                      <ProbabilityRing score={goal.probability} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#3b2a1a' }}>{goal.text}</p>
                        <p className="text-[11px] mt-1" style={{ color: '#9a7550' }}>
                          {goal.probability >= 70
                            ? 'Your current trajectory strongly supports this goal.'
                            : goal.probability >= 40
                            ? "You're on the way — keep writing consistently."
                            : 'This goal needs more intentional focus in your entries.'}
                        </p>
                      </div>
                      <button onClick={() => deleteGoal(goal.id)}
                        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-100 transition-colors"
                        style={{ color: '#b09070' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resilience Moments */}
            {resilienceMoments.length > 0 && (
              <div className="rounded-2xl border p-5 space-y-4"
                style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
                <div className="flex items-center gap-2">
                  <Star size={15} style={{ color: '#c27a2a' }} />
                  <h2 className="text-sm font-semibold" style={{ color: '#7a4f2a' }}>
                    Your Resilience Archive
                  </h2>
                  <span className="text-[11px]" style={{ color: '#b09070' }}>
                    — breakthrough moments from your journals
                  </span>
                </div>
                <div className="space-y-3">
                  {resilienceMoments.map((moment, i) => (
                    <div key={i} className="rounded-xl p-4"
                      style={{ background: '#f4ecd8', border: '1px solid #e8d5b7' }}>
                      <div className="flex items-start gap-2">
                        <Feather size={13} className="shrink-0 mt-0.5" style={{ color: '#c27a2a' }} />
                        <p className="text-sm leading-relaxed italic"
                          style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
                          "{moment.quote}"
                        </p>
                      </div>
                      <p className="text-[11px] mt-2 ml-5" style={{ color: '#9a7550' }}>
                        — {moment.title} ·{' '}
                        {new Date(moment.date).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </BrowsingGate>
  )
}
