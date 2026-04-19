import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  BookOpen, Calendar, Save, CheckCheck,
  Loader2, Smile, Meh, Frown, Zap, Moon, PenLine, Feather,
} from 'lucide-react'
import {
  saveEntry, updateEntry, getLatestEntry, getEntryById,
  addGraphLink, deleteGraphLinksByJournal, getLatestJournalForEntity,
} from '../db'
import { extractEntities }   from '../services/nlp/entityExtractor'
import { classifyEmotions }  from '../services/nlp/emotionClassifier'
import { sanitizeText, sanitizeTitle } from '../services/security/sanitizer'
import { useAuth }           from '../context/AuthContext'
import BrowsingGate          from '../components/BrowsingGate'

// ── Constants ─────────────────────────────────────────────────────────────────
const MOODS = [
  { key: 'joyful',    label: 'Joyful',    Icon: Smile,  color: 'text-amber-400',  ring: 'ring-amber-300',  bg: 'bg-amber-50'  },
  { key: 'calm',      label: 'Calm',      Icon: Moon,   color: 'text-teal-400',   ring: 'ring-teal-300',   bg: 'bg-teal-50'   },
  { key: 'energised', label: 'Energised', Icon: Zap,    color: 'text-indigo-400', ring: 'ring-indigo-300', bg: 'bg-indigo-50' },
  { key: 'neutral',   label: 'Neutral',   Icon: Meh,    color: 'text-stone-400',  ring: 'ring-stone-300',  bg: 'bg-stone-50'  },
  { key: 'low',       label: 'Low',       Icon: Frown,  color: 'text-rose-400',   ring: 'ring-rose-300',   bg: 'bg-rose-50'   },
]

const SAVE_STATUS = {
  idle:    { text: '',               Icon: null,       cls: '' },
  pending: { text: 'Changes pending…', Icon: Loader2,  cls: 'text-stone-400' },
  saving:  { text: 'Saving…',       Icon: Loader2,    cls: 'text-stone-400 animate-pulse' },
  saved:   { text: 'Saved',         Icon: CheckCheck, cls: 'text-teal-500' },
  error:   { text: 'Save failed',   Icon: Save,       cls: 'text-rose-500' },
}

const SS_NEW     = 'isNewSession'
const SS_LAST_ID = 'lastActiveEntry'

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

export default function JournalEntry() {
  const { state: navState } = useLocation()
  const { requireAuth } = useAuth()

  const [title,       setTitle]      = useState('')
  const [content,     setContent]    = useState('')
  const [mood,        setMood]       = useState(null)
  const [saveStatus,  setSaveStatus] = useState('idle')
  const [currentId,   setCurrentId]  = useState(null)
  const [isLoading,   setIsLoading]  = useState(true)
  const [justSaved,   setJustSaved]  = useState(false)
  const [memoryMatch, setMemoryMatch]= useState(null)
  const [detectedEmotions, setDetectedEmotions] = useState([])

  const debounceRef = useRef(null)
  const activeIdRef = useRef(null)

  useEffect(() => { activeIdRef.current = currentId }, [currentId])
  useEffect(() => () => clearTimeout(debounceRef.current), [])

  // ── Load entry ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        let entry = null
        if (navState?.entryId) {
          entry = await getEntryById(navState.entryId)
          if (entry) { sessionStorage.setItem(SS_LAST_ID, String(entry.id)); sessionStorage.removeItem(SS_NEW) }
        } else if (sessionStorage.getItem(SS_NEW) === 'true') {
          // blank slate requested
        } else {
          const lastId = sessionStorage.getItem(SS_LAST_ID)
          entry = lastId ? await getEntryById(Number(lastId)) : null
          if (!entry) entry = await getLatestEntry()
          if (entry) sessionStorage.setItem(SS_LAST_ID, String(entry.id))
        }
        if (entry) {
          setTitle(entry.title === 'Untitled Entry' ? '' : entry.title)
          setContent(entry.content ?? '')
          setMood(entry.mood ?? null)
          setCurrentId(entry.id)
          if (entry.emotions?.length) setDetectedEmotions(entry.emotions.slice(0, 3))
          setJustSaved(false)
        }
      } catch (err) {
        console.error('JournalEntry load error:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [navState?.entryId])

  // ── Proactive memory whisper ─────────────────────────────────────────────
  const checkProactiveConnections = useCallback(async (text) => {
    const entities = extractEntities(text)
    if (!entities.length) { setMemoryMatch(null); return }
    for (const entity of entities) {
      try {
        const previous = await getLatestJournalForEntity(entity.entityName, entity.type)
        if (previous && previous.id !== activeIdRef.current) {
          setMemoryMatch({
            entityName: entity.entityName,
            type: entity.type,
            date: new Date(previous.timestamp).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            }),
          })
          return
        }
      } catch (err) { console.error(err) }
    }
    setMemoryMatch(null)
  }, [])

  // ── Persist with sanitization (IAS: Input Validation) ────────────────────
  const persist = useCallback(async (nextTitle, nextContent, nextMood) => {
    if (!nextContent.trim()) return
    setSaveStatus('saving')

    // IAS: sanitize inputs before storage — strips XSS vectors
    const cleanTitle   = sanitizeTitle(nextTitle)
    const cleanContent = sanitizeText(nextContent)

    // Sprint 3: classify emotions locally
    const emotions = classifyEmotions(cleanContent).slice(0, 5)
    setDetectedEmotions(emotions.slice(0, 3))

    const id = activeIdRef.current

    try {
      let savedId = id
      if (id) {
        await updateEntry(id, { title: cleanTitle || 'Untitled Entry', content: cleanContent, mood: nextMood, emotions })
      } else {
        savedId = await saveEntry({ title: cleanTitle || 'Untitled Entry', content: cleanContent, mood: nextMood, emotions })
        setCurrentId(savedId)
        activeIdRef.current = savedId
      }

      if (savedId) {
        sessionStorage.setItem(SS_LAST_ID, String(savedId))
        sessionStorage.removeItem(SS_NEW)
        // Knowledge graph links
        await deleteGraphLinksByJournal(savedId)
        const entities = extractEntities(cleanContent)
        for (const entity of entities) await addGraphLink({ journalId: savedId, ...entity })
      }

      setSaveStatus('saved')
      setJustSaved(true)
    } catch (err) {
      console.error('Persist error:', err)
      setSaveStatus('error')
    }
    setTimeout(() => setSaveStatus('idle'), 2500)
  }, [])

  const scheduleAutoSave = useCallback((t, c, m) => {
    setSaveStatus('pending')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const authed = await requireAuth()
      if (authed) persist(t, c, m)
      else setSaveStatus('idle')
    }, 1000)
  }, [persist, requireAuth])

  const handleContentChange = (e) => {
    const val = e.target.value
    setContent(val)
    setJustSaved(false)
    scheduleAutoSave(title, val, mood)
    checkProactiveConnections(val)
  }
  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    setJustSaved(false)
    scheduleAutoSave(val, content, mood)
  }
  const handleMoodSelect = (key) => {
    const next = mood === key ? null : key
    setMood(next)
    scheduleAutoSave(title, content, next)
  }
  const handleManualSave = async () => {
    const authed = await requireAuth()
    if (!authed) return
    clearTimeout(debounceRef.current)
    persist(title, content, mood)
  }
  const handleNewEntry = () => {
    clearTimeout(debounceRef.current)
    sessionStorage.setItem(SS_NEW, 'true')
    sessionStorage.removeItem(SS_LAST_ID)
    setTitle(''); setContent(''); setMood(null); setCurrentId(null)
    activeIdRef.current = null
    setSaveStatus('idle'); setJustSaved(false); setMemoryMatch(null); setDetectedEmotions([])
  }

  const { text: statusText, Icon: StatusIcon, cls: statusCls } = SAVE_STATUS[saveStatus]
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const isEditingExisting = !!currentId && !!navState?.entryId

  // Emotion colour map
  const EMOTION_COLORS = { Joy: '#f59e0b', Sadness: '#6366f1', Anxiety: '#ef4444', Anger: '#dc2626', Resilience: '#10b981', Ambition: '#8b5cf6', Calm: '#06b6d4', Nostalgia: '#d97706' }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={22} className="text-stone-300 animate-spin" />
    </div>
  )

  return (
    <BrowsingGate
      feature="My Journal"
      description="Your private journaling space — write, reflect, and track your emotional growth over time."
      icon={Feather}
    >
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-stone-800">
            {isEditingExisting ? 'Editing Memory' : 'Journal Entry'}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-stone-400">
            <Calendar size={12} /><span>{todayLabel()}</span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium min-w-[110px] justify-end transition-opacity ${saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'} ${statusCls}`}>
          {StatusIcon && <StatusIcon size={13} className={saveStatus === 'saving' || saveStatus === 'pending' ? 'animate-spin' : ''} />}
          {statusText}
        </div>
      </div>

      {/* Saved banner */}
      {justSaved && !isEditingExisting && (
        <div className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-teal-700">
            <CheckCheck size={15} className="text-teal-500" />
            Entry saved to your archive.
          </div>
          <button onClick={handleNewEntry}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 px-3 py-1.5 rounded-lg transition-colors">
            <PenLine size={12} /> Start New Entry
          </button>
        </div>
      )}

      {/* Emotion detection badges (Sprint 3) */}
      {detectedEmotions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px]" style={{ color: '#9a7550' }}>Detected tones:</span>
          {detectedEmotions.map(({ theme, score }) => (
            <span key={theme}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full"
              style={{ background: `${EMOTION_COLORS[theme]}22`, color: EMOTION_COLORS[theme] }}>
              {theme} · {Math.round(score * 100)}%
            </span>
          ))}
        </div>
      )}

      {/* Memory whisper */}
      {memoryMatch && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-base mt-0.5">💡</span>
          <div>
            <p className="text-sm font-medium text-amber-800">
              Memory Match — <span className="capitalize">{memoryMatch.type}</span>: <strong>{memoryMatch.entityName}</strong>
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              You wrote about <strong>{memoryMatch.entityName}</strong> before, on {memoryMatch.date}.
            </p>
          </div>
        </div>
      )}

      {/* Writing card */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-3 border-b border-stone-50">
          <input type="text" placeholder="Give this entry a title…" value={title}
            onChange={handleTitleChange}
            className="w-full text-lg font-display font-semibold text-stone-800 placeholder-stone-200 bg-transparent outline-none" />
        </div>
        <div className="px-6 py-3 border-b border-stone-50 flex items-center gap-2">
          <span className="text-xs text-stone-300 mr-1">Mood</span>
          {MOODS.map(({ key, label, Icon, color, ring, bg }) => {
            const active = mood === key
            return (
              <button key={key} onClick={() => handleMoodSelect(key)} title={label}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${active ? `${bg} ring-2 ${ring}` : 'hover:bg-stone-50'}`}>
                <Icon size={16} className={active ? color : 'text-stone-300'} />
              </button>
            )
          })}
          {mood && <span className="ml-1 text-xs text-stone-400 capitalize">{mood}</span>}
        </div>
        <textarea
          placeholder="Begin writing… your thoughts will be saved automatically."
          value={content}
          onChange={handleContentChange}
          rows={14}
          className="w-full px-6 py-5 text-sm text-stone-700 leading-8 placeholder-stone-200 bg-transparent outline-none resize-none font-body"
        />
        <div className="flex items-center justify-between px-6 py-3 border-t border-stone-100 bg-stone-50/60">
          <div className="flex items-center gap-4 text-[11px] text-stone-300">
            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            <span>{content.length} chars</span>
            {currentId && <span className="flex items-center gap-1"><BookOpen size={10} /> Entry #{currentId}</span>}
          </div>
          <div className="flex items-center gap-2">
            {currentId && !isEditingExisting && (
              <button onClick={handleNewEntry}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors">
                <PenLine size={11} /> New
              </button>
            )}
            <button onClick={handleManualSave}
              disabled={saveStatus === 'saving' || !content.trim()}
              className="flex items-center gap-1.5 text-xs font-medium bg-stone-900 text-white px-4 py-1.5 rounded-lg hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <Save size={12} /> Save now
            </button>
          </div>
        </div>
      </div>
    </div>
    </BrowsingGate>
  )
}
