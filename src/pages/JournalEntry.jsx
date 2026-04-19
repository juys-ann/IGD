/**
 * JournalEntry.jsx — Task 3 Full Redesign
 *
 * Full-page Word-style layout wiring together ALL existing components:
 *   3.1 useAutoTitle         — auto-increments "Journal N" on new entry
 *   3.2 JournalCoverPicker   — cover color/image modal before first write
 *   3.3 JournalRibbon (Page) — orientation, rule style, page color
 *   3.4 JournalRibbon (Writing) — ink color, font, size, bold/italic
 *   3.5 JournalRibbon (Insert) + ElementLayer — photos, stickies, stickers
 *   3.6 Emotion banner       — shown below page after every autosave
 *
 * Layout:
 *   [Ribbon toolbar — tabs + save controls]
 *   [Notification bar — emotion banner + memory whisper]
 *   [Left panel: entry list | Center: writing page with ElementLayer]
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Loader2, Feather, Clock, BookOpen, ChevronRight,
} from 'lucide-react'
import {
  saveEntry, updateEntry, getLatestEntry, getEntryById,
  addGraphLink, deleteGraphLinksByJournal, getLatestJournalForEntity, db,
} from '../db'
import { extractEntities }   from '../services/nlp/entityExtractor'
import { classifyEmotions }  from '../services/nlp/emotionClassifier'
import { sanitizeText, sanitizeTitle } from '../services/security/sanitizer'
import { useAuth }           from '../context/AuthContext'
import BrowsingGate          from '../components/BrowsingGate'
import JournalRibbon         from '../components/JournalRibbon'
import JournalCoverPicker    from '../components/JournalCoverPicker'
import ElementLayer          from '../components/ElementLayer'
import { useAutoTitle }      from '../hooks/useAutoTitle'
import { getTextareaStyle, DEFAULT_WRITING_STYLE } from '../components/WritingToolbar'
import { getPagePattern } from '../components/PageStyleToolbar'

// ── Constants ─────────────────────────────────────────────────────────────────
const EMOTION_COLORS = {
  Joy: '#f59e0b', Sadness: '#6366f1', Anxiety: '#ef4444',
  Anger: '#dc2626', Resilience: '#10b981', Ambition: '#8b5cf6',
  Calm: '#06b6d4', Nostalgia: '#d97706',
}

const SAVE_STATUS = {
  idle:    { text: '',             Icon: null,       cls: '' },
  pending: { text: 'Unsaved…',    Icon: Loader2,    cls: 'text-amber-500' },
  saving:  { text: 'Saving…',     Icon: Loader2,    cls: 'text-stone-400' },
  saved:   { text: 'Saved',       Icon: null,       cls: 'text-teal-500' },
  error:   { text: 'Save failed', Icon: null,       cls: 'text-rose-500' },
}

const DEFAULT_PAGE_STYLE = {
  orientation: 'portrait',
  ruleStyle:   'blank',
  pageColor:   '#ffffff',
}

const SS_NEW     = 'isNewSession'
const SS_LAST_ID = 'lastActiveEntry'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Entry list item ───────────────────────────────────────────────────────────
function EntryItem({ entry, isActive, onClick }) {
  return (
    <button
      onClick={() => onClick(entry)}
      className="w-full text-left px-3 py-3 rounded-xl transition-all"
      style={{
        background: isActive ? '#e8d5b7' : 'transparent',
        border:     isActive ? '1px solid #c4a882' : '1px solid transparent',
      }}
    >
      <p className="text-xs font-semibold leading-snug line-clamp-2"
        style={{ color: isActive ? '#3b2a1a' : '#7a5c3a' }}>
        {entry.title || 'Untitled Entry'}
      </p>
      <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: '#b09070' }}>
        <Clock size={9} /> {fmtDate(entry.timestamp)}
      </p>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function JournalEntry() {
  const { state: navState } = useLocation()
  const { requireAuth } = useAuth()

  // ── Core entry state ───────────────────────────────────────────────────────
  const [content,     setContent]     = useState('')
  const [saveStatus,  setSaveStatus]  = useState('idle')
  const [currentId,   setCurrentId]   = useState(null)
  const [isLoading,   setIsLoading]   = useState(true)
  const [memoryMatch, setMemoryMatch] = useState(null)
  const [detectedEmotions, setDetectedEmotions] = useState([])
  const [showEmotionBanner, setShowEmotionBanner] = useState(false)

  // ── Task 3.1: auto-title ───────────────────────────────────────────────────
  // newEntryKey bumps each time "New Entry" is clicked → re-runs useAutoTitle
  const [newEntryKey, setNewEntryKey] = useState(0)
  const isEditingExisting = !!currentId && !!navState?.entryId
  const { title, setTitle, isLoading: titleLoading } = useAutoTitle(
    isEditingExisting ? -1 : newEntryKey
  )

  // ── Task 3.2: cover picker ─────────────────────────────────────────────────
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const [coverColor, setCoverColor] = useState(null)
  const [coverImage, setCoverImage] = useState(null)

  // ── Task 3.3: page style ───────────────────────────────────────────────────
  const [pageStyle, setPageStyle] = useState(DEFAULT_PAGE_STYLE)

  // ── Task 3.4: writing style ────────────────────────────────────────────────
  const [writingStyle, setWritingStyle] = useState(DEFAULT_WRITING_STYLE)

  // ── Task 3.5: elements (photos, stickies, stickers) ───────────────────────
  const [elements, setElements] = useState([])

  // ── Ribbon tab state ───────────────────────────────────────────────────────
  const [activeRibbonTab, setActiveRibbonTab] = useState(null)

  const debounceRef = useRef(null)
  const activeIdRef = useRef(null)
  const textareaRef = useRef(null)

  // Live entry list for left panel
  const allEntries = useLiveQuery(
    () => db.journals.orderBy('timestamp').reverse().toArray(), []
  )

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
          if (entry) {
            sessionStorage.setItem(SS_LAST_ID, String(entry.id))
            sessionStorage.removeItem(SS_NEW)
          }
        } else if (sessionStorage.getItem(SS_NEW) === 'true') {
          // blank slate — useAutoTitle handles title
        } else {
          const lastId = sessionStorage.getItem(SS_LAST_ID)
          entry = lastId ? await getEntryById(Number(lastId)) : null
          if (!entry) entry = await getLatestEntry()
          if (entry) sessionStorage.setItem(SS_LAST_ID, String(entry.id))
        }
        if (entry) {
          setTitle(entry.title === 'Untitled Entry' ? '' : entry.title)
          setContent(entry.content ?? '')
          setCurrentId(entry.id)
          activeIdRef.current = entry.id
          if (entry.emotions?.length) setDetectedEmotions(entry.emotions.slice(0, 3))
          // Restore cover + styles if saved on the entry
          if (entry.coverColor) setCoverColor(entry.coverColor)
          if (entry.coverImage) setCoverImage(entry.coverImage)
          if (entry.pageStyle)  setPageStyle({ ...DEFAULT_PAGE_STYLE, ...entry.pageStyle })
          if (entry.writingStyle) setWritingStyle({ ...DEFAULT_WRITING_STYLE, ...entry.writingStyle })
          if (entry.elements)  setElements(entry.elements)
        }
      } catch (err) {
        console.error('JournalEntry load error:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [navState?.entryId])

  // ── Memory whisper ──────────────────────────────────────────────────────────
  const checkProactiveConnections = useCallback(async (text) => {
    const entities = extractEntities(text)
    if (!entities.length) { setMemoryMatch(null); return }
    for (const entity of entities) {
      try {
        const previous = await getLatestJournalForEntity(entity.entityName, entity.type)
        if (previous && previous.id !== activeIdRef.current) {
          setMemoryMatch({
            entityName: entity.entityName,
            type:       entity.type,
            date:       new Date(previous.timestamp).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            }),
          })
          return
        }
      } catch (err) { console.error(err) }
    }
    setMemoryMatch(null)
  }, [])

  // ── Persist ─────────────────────────────────────────────────────────────────
  const persist = useCallback(async (nextTitle, nextContent, extra = {}) => {
    if (!nextContent.trim()) return
    setSaveStatus('saving')
    const cleanTitle   = sanitizeTitle(nextTitle)
    const cleanContent = sanitizeText(nextContent)
    const emotions     = classifyEmotions(cleanContent).slice(0, 5)
    setDetectedEmotions(emotions.slice(0, 3))

    // Task 3.6: show emotion banner after save
    if (emotions.length > 0) {
      setShowEmotionBanner(true)
      setTimeout(() => setShowEmotionBanner(false), 6000)
    }

    const id = activeIdRef.current
    try {
      let savedId = id
      const payload = {
        title:        cleanTitle || 'Untitled Entry',
        content:      cleanContent,
        emotions,
        ...extra, // coverColor, coverImage, pageStyle, writingStyle, elements
      }
      if (id) {
        await updateEntry(id, payload)
      } else {
        savedId = await saveEntry({ ...payload, source: 'written' })
        setCurrentId(savedId)
        activeIdRef.current = savedId
      }
      if (savedId) {
        sessionStorage.setItem(SS_LAST_ID, String(savedId))
        sessionStorage.removeItem(SS_NEW)
        await deleteGraphLinksByJournal(savedId)
        const entities = extractEntities(cleanContent)
        for (const entity of entities) await addGraphLink({ journalId: savedId, ...entity })
      }
      setSaveStatus('saved')
    } catch (err) {
      console.error('Persist error:', err)
      setSaveStatus('error')
    }
    setTimeout(() => setSaveStatus('idle'), 2500)
  }, [])

  // Build the "extra" fields for persist from current style state
  const getExtra = useCallback(() => ({
    coverColor, coverImage, pageStyle, writingStyle, elements,
  }), [coverColor, coverImage, pageStyle, writingStyle, elements])

  const scheduleAutoSave = useCallback((t, c) => {
    setSaveStatus('pending')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const authed = await requireAuth()
      if (authed) persist(t, c, getExtra())
      else setSaveStatus('idle')
    }, 1000)
  }, [persist, requireAuth, getExtra])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleContentChange = (e) => {
    const val = e.target.value
    setContent(val)
    scheduleAutoSave(title, val)
    checkProactiveConnections(val)
  }
  const handleTitleChange = (val) => {
    setTitle(val)
    scheduleAutoSave(val, content)
  }
  const handleManualSave = async () => {
    const authed = await requireAuth()
    if (!authed) return
    clearTimeout(debounceRef.current)
    persist(title, content, getExtra())
  }

  // Task 3.1 — New entry: bump key so useAutoTitle recalculates
  const handleNewEntry = () => {
    clearTimeout(debounceRef.current)
    sessionStorage.setItem(SS_NEW, 'true')
    sessionStorage.removeItem(SS_LAST_ID)
    setContent(''); setCurrentId(null)
    activeIdRef.current = null
    setCoverColor(null); setCoverImage(null)
    setPageStyle(DEFAULT_PAGE_STYLE)
    setWritingStyle(DEFAULT_WRITING_STYLE)
    setElements([])
    setSaveStatus('idle'); setMemoryMatch(null); setDetectedEmotions([])
    setShowEmotionBanner(false)
    setNewEntryKey(k => k + 1)       // triggers useAutoTitle
    setShowCoverPicker(true)         // Task 3.2: show cover picker for new entry
    setTimeout(() => textareaRef.current?.focus(), 80)
  }

  const handleSelectEntry = (entry) => {
    clearTimeout(debounceRef.current)
    sessionStorage.setItem(SS_LAST_ID, String(entry.id))
    sessionStorage.removeItem(SS_NEW)
    setTitle(entry.title === 'Untitled Entry' ? '' : entry.title)
    setContent(entry.content ?? '')
    setCurrentId(entry.id)
    activeIdRef.current = entry.id
    setDetectedEmotions(entry.emotions?.slice(0, 3) ?? [])
    setCoverColor(entry.coverColor ?? null)
    setCoverImage(entry.coverImage ?? null)
    setPageStyle(entry.pageStyle ? { ...DEFAULT_PAGE_STYLE, ...entry.pageStyle } : DEFAULT_PAGE_STYLE)
    setWritingStyle(entry.writingStyle ? { ...DEFAULT_WRITING_STYLE, ...entry.writingStyle } : DEFAULT_WRITING_STYLE)
    setElements(entry.elements ?? [])
    setMemoryMatch(null); setSaveStatus('idle'); setShowEmotionBanner(false)
  }

  // Task 3.5 — insert element
  const handleInsert = useCallback((type, data) => {
    const newEl = {
      id:   `${type}-${Date.now()}`,
      type,
      x: 40, y: 40,
      ...(type === 'photo'   ? { src: data.src, width: 200 }       : {}),
      ...(type === 'sticky'  ? { color: data.color, text: '' }      : {}),
      ...(type === 'sticker' ? { emoji: data.emoji, size: 38 }      : {}),
    }
    setElements(prev => {
      const next = [...prev, newEl]
      // persist with new element immediately
      setTimeout(() => persist(title, content, { ...getExtra(), elements: next }), 0)
      return next
    })
  }, [title, content, getExtra, persist])

  // Page dimensions based on orientation
  const isLandscape = pageStyle.orientation === 'landscape'
  const pageWidth   = isLandscape ? '900px' : '680px'
  const pageMaxW    = isLandscape ? '900px' : '680px'

  const { text: statusText, Icon: StatusIcon, cls: statusCls } = SAVE_STATUS[saveStatus]
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <BrowsingGate
      feature="My Journal"
      description="Your private journaling space — write, reflect, and track your emotional growth."
      icon={Feather}
    >
      {/* Task 3.2 — Cover picker modal */}
      {showCoverPicker && (
        <JournalCoverPicker
          onConfirm={({ coverColor: c, coverImage: i }) => {
            setCoverColor(c); setCoverImage(i)
            setShowCoverPicker(false)
          }}
          onSkip={() => setShowCoverPicker(false)}
        />
      )}

      <div className="flex flex-col" style={{ height: 'calc(100vh - 48px)', overflow: 'hidden' }}>

        {/* ── RIBBON (Tasks 3.2–3.5) ────────────────────────────────────── */}
        <JournalRibbon
          activeTab={activeRibbonTab}
          onTabChange={setActiveRibbonTab}

          coverColor={coverColor}
          coverImage={coverImage}
          onCoverChange={({ coverColor: c, coverImage: i }) => {
            setCoverColor(c); setCoverImage(i)
            scheduleAutoSave(title, content)
          }}
          onOpenCoverModal={() => setShowCoverPicker(true)}

          pageStyle={pageStyle}
          onPageStyleChange={(s) => { setPageStyle(s); scheduleAutoSave(title, content) }}

          writingStyle={writingStyle}
          onWritingStyleChange={(s) => { setWritingStyle(s); scheduleAutoSave(title, content) }}

          onInsert={handleInsert}

          saveStatus={saveStatus}
          statusText={statusText}
          StatusIcon={StatusIcon}
          statusCls={statusCls}
          wordCount={wordCount}
          currentId={currentId}
          content={content}
          isEditingExisting={isEditingExisting}
          onManualSave={handleManualSave}
          onNewEntry={handleNewEntry}
        />

        {/* ── NOTIFICATION BAR (Task 3.6 + memory whisper) ─────────────── */}
        {(showEmotionBanner && detectedEmotions.length > 0) || memoryMatch ? (
          <div
            className="shrink-0 flex items-center gap-4 px-5 py-2 flex-wrap"
            style={{ background: '#fffdf9', borderBottom: '1px solid #f0e8d8' }}
          >
            {/* Task 3.6 — Emotion banner */}
            {showEmotionBanner && detectedEmotions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-medium" style={{ color: '#9a7550' }}>
                  Based on this entry, you felt:
                </span>
                {detectedEmotions.map(({ theme, score }) => (
                  <span
                    key={theme}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: `${EMOTION_COLORS[theme]}20`, color: EMOTION_COLORS[theme] }}
                  >
                    {theme} {Math.round(score * 100)}%
                  </span>
                ))}
              </div>
            )}
            {showEmotionBanner && memoryMatch && (
              <div className="w-px h-4 shrink-0" style={{ background: '#e8d5b7' }} />
            )}
            {/* Memory whisper */}
            {memoryMatch && (
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#9a7550' }}>
                <span>💡</span>
                <span>
                  You wrote about{' '}
                  <strong style={{ color: '#3b2a1a' }}>{memoryMatch.entityName}</strong>
                  {' '}on {memoryMatch.date}
                </span>
              </div>
            )}
          </div>
        ) : null}

        {/* ── MAIN AREA: entry list + writing page ─────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* Left panel — entry list */}
          <div
            className="w-52 shrink-0 flex flex-col border-r overflow-hidden"
            style={{ background: '#f4ecd8', borderColor: '#e8d5b7' }}
          >
            <div className="px-3 pt-3 pb-1 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider px-1"
                style={{ color: '#b09070' }}>
                Entries
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
              {isLoading ? (
                <div className="flex justify-center pt-8">
                  <Loader2 size={16} className="animate-spin" style={{ color: '#d4b896' }} />
                </div>
              ) : !allEntries?.length ? (
                <div className="text-center pt-8 px-3">
                  <Feather size={22} className="mx-auto mb-2" style={{ color: '#d4b896' }} />
                  <p className="text-[11px]" style={{ color: '#b09070' }}>No entries yet.</p>
                </div>
              ) : (
                allEntries.map((entry) => (
                  <EntryItem
                    key={entry.id}
                    entry={entry}
                    isActive={entry.id === currentId}
                    onClick={handleSelectEntry}
                  />
                ))
              )}
            </div>
          </div>

          {/* Writing area */}
          <div
            className="flex-1 overflow-y-auto flex flex-col items-center py-8 px-4"
            style={{ background: '#e8e0d4' }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={22} className="animate-spin" style={{ color: '#d4b896' }} />
              </div>
            ) : (
              <div
                className="w-full flex flex-col shadow-xl"
                style={{
                  maxWidth:      pageMaxW,
                  width:         pageWidth,
                  minHeight:     '100%',
                  background:    pageStyle.pageColor,
                  borderRadius:  '3px',
                  border:        '1px solid #ddd6c8',
                  boxShadow:     '0 4px 32px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
                  // Task 3.2 — cover strip at top
                  borderTop:     (coverColor || coverImage)
                    ? `6px solid ${coverColor ?? 'transparent'}`
                    : '1px solid #ddd6c8',
                  backgroundImage: coverImage
                    ? undefined
                    : undefined,
                  transition: 'max-width 0.3s ease, border-top 0.2s ease',
                }}
              >
                {/* Cover image banner */}
                {coverImage && (
                  <div
                    className="w-full shrink-0"
                    style={{
                      height: '80px',
                      backgroundImage:    `url(${coverImage})`,
                      backgroundSize:     'cover',
                      backgroundPosition: 'center',
                      borderRadius:       '3px 3px 0 0',
                    }}
                  />
                )}

                {/* Page header */}
                <div
                  className="px-10 pt-8 pb-3 shrink-0 flex items-center justify-between"
                  style={{ borderBottom: '1px solid #f0ece4' }}
                >
                  {/* Task 3.1 — editable title with auto-increment */}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder={titleLoading ? 'Loading…' : 'Entry title…'}
                    maxLength={80}
                    className="flex-1 bg-transparent outline-none font-semibold"
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize:   '1.3rem',
                      color:      '#2d2010',
                    }}
                  />
                  {currentId && (
                    <span className="text-[10px] font-mono ml-4 shrink-0" style={{ color: '#d4c4a8' }}>
                      #{currentId}
                    </span>
                  )}
                </div>

                {/* Writing area with ElementLayer (Task 3.5) */}
                <div className="flex-1 px-10 py-6 relative">
                  <ElementLayer elements={elements} onChange={setElements}>
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={handleContentChange}
                      placeholder="Begin writing… your thoughts are saved automatically."
                      className="w-full bg-transparent outline-none resize-none"
                      style={{
                        minHeight:  '520px',
                        // Task 3.3 — page background pattern
                        ...getPagePattern(pageStyle.ruleStyle),
                        // Task 3.4 — writing style
                        ...getTextareaStyle(writingStyle),
                      }}
                    />
                  </ElementLayer>
                </div>

                {/* Page footer */}
                <div
                  className="px-10 py-3 shrink-0 flex items-center justify-between"
                  style={{ borderTop: '1px solid #f0ece4' }}
                >
                  <span className="text-[11px] flex items-center gap-1.5" style={{ color: '#c4b09a' }}>
                    <BookOpen size={10} />
                    {wordCount} {wordCount === 1 ? 'word' : 'words'}
                  </span>
                  <span className="text-[10px] flex items-center gap-1" style={{ color: '#c4b09a' }}>
                    <ChevronRight size={10} />
                    {saveStatus === 'saved'   ? 'All changes saved'
                      : saveStatus === 'pending' ? 'Unsaved changes'
                      : 'Inter-Generational Dialogue'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </BrowsingGate>
  )
}
