/**
 * EchoChamber.jsx — Sprint 5: Memory Resurrection
 * Now uses semantic vector search (Sprint 2/3 upgrade) instead of keyword matching.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles, SendHorizonal, Loader2, ShieldCheck,
  AlertTriangle, RefreshCw, Download, Cpu,
  Plus, MessageSquare, MoreHorizontal, X, Trash2,
  ChevronDown, ChevronUp, BookOpen, MessageCircle,
} from 'lucide-react'
import { useAI }        from '../context/AIContext'
import BrowsingGate     from '../components/BrowsingGate'
import { useEmbedding } from '../context/EmbeddingContext'
import {
  getAllEntries, db,
  createChatSession, deleteChatSession, renameChatSession, getAllChatSessions,
  saveChatMessage, loadSessionMessages, clearSessionMessages,
} from '../db'
import { buildManagedPrompt, getContextStats } from '../services/context/contextWindow'

// ── Session list item ─────────────────────────────────────────────────────────
function SessionItem({ session, isActive, onSelect, onDelete, onRename }) {
  const [editing,   setEditing]   = useState(false)
  const [editTitle, setEditTitle] = useState(session.title)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = () => {
    if (editTitle.trim() && editTitle !== session.title) onRename(session.id, editTitle.trim())
    setEditing(false)
  }

  return (
    <div
      onClick={() => !editing && onSelect(session)}
      className="group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
      style={isActive
        ? { background: '#e8d5b7', color: '#7a4f2a' }
        : { color: '#7a5c3a' }
      }
    >
      <MessageSquare size={12} className="shrink-0" style={{ color: isActive ? '#c27a2a' : '#9a7550' }} />

      {editing ? (
        <input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-xs rounded px-1.5 py-0.5 outline-none"
          style={{ background: '#f4ecd8', border: '1px solid #c4a882' }}
        />
      ) : (
        <span className="flex-1 text-xs font-medium truncate">{session.title}</span>
      )}

      {!editing && (
        <div className={`flex items-center gap-0.5 shrink-0 transition-opacity opacity-0 group-hover:opacity-100`}>
          <button onClick={(e) => { e.stopPropagation(); setEditing(true) }}
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ color: '#9a7550' }}>
            <MoreHorizontal size={10} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(session.id) }}
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ color: '#9a7550' }}>
            <X size={10} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EchoChamber() {
  const { workerStatus, workerError, downloadProgress, initWorker, generate } = useAI()
  const { embedStatus, semanticSearch, indexAll, indexingProgress }           = useEmbedding()

  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages,        setMessages]        = useState([])
  const [sessions,        setSessions]        = useState([])
  const [input,           setInput]           = useState('')
  const [entries,         setEntries]         = useState([])
  const [isGenerating,    setIsGenerating]    = useState(false)
  const [showContext,     setShowContext]      = useState(false)
  const [readyFlash,      setReadyFlash]      = useState(false)
  const [isResetting,     setIsResetting]     = useState(false)

  // Sprint 6: live context window stats for the UI indicator
  const contextStats = getContextStats(messages)

  const scrollRef  = useRef(null)
  const inputRef   = useRef(null)
  const prevStatus = useRef(workerStatus)

  // Load entries and kick off background indexing
  useEffect(() => {
    getAllEntries().then((all) => {
      setEntries(all)
      if (all.length > 0 && embedStatus === 'ready') {
        indexAll(all)
      }
    }).catch(console.error)
  }, [embedStatus])

  // Load sessions
  const refreshSessions = useCallback(async () => {
    const all = await getAllChatSessions()
    setSessions(all)
    if (!activeSessionId && all.length > 0) setActiveSessionId(all[0].id)
  }, [activeSessionId])

  useEffect(() => { refreshSessions() }, [])

  // Load messages for active session
  useEffect(() => {
    if (!activeSessionId) { setMessages([]); return }
    loadSessionMessages(activeSessionId)
      .then((rows) => setMessages(rows.map((r) => ({ role: r.role, text: r.text }))))
      .catch(console.error)
  }, [activeSessionId])

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (workerStatus === 'ready') inputRef.current?.focus() }, [workerStatus])

  useEffect(() => {
    if (prevStatus.current !== 'ready' && workerStatus === 'ready') {
      setReadyFlash(true)
      setTimeout(() => setReadyFlash(false), 3000)
    }
    prevStatus.current = workerStatus
  }, [workerStatus])

  // Session management
  const handleNewSession = async () => {
    const id = await createChatSession('New Conversation')
    await refreshSessions(); setActiveSessionId(id); setMessages([])
  }
  const handleDeleteSession = async (id) => {
    if (!window.confirm('Delete this conversation?')) return
    await deleteChatSession(id)
    const remaining = sessions.filter((s) => s.id !== id)
    setSessions(remaining)
    if (activeSessionId === id) { setActiveSessionId(remaining[0]?.id ?? null); setMessages([]) }
  }
  const handleRenameSession = async (id, title) => {
    await renameChatSession(id, title)
    setSessions((p) => p.map((s) => s.id === id ? { ...s, title } : s))
  }
  const handleResetChat = async () => {
    if (!activeSessionId || !window.confirm('Clear this conversation?')) return
    setIsResetting(true)
    await clearSessionMessages(activeSessionId)
    setMessages([])
    setIsResetting(false)
  }

  // ── Send — uses semantic search when embedding is ready, falls back to recency ──
  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isGenerating || workerStatus !== 'ready') return

    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = await createChatSession(trimmed.slice(0, 40))
      setActiveSessionId(sessionId)
      await refreshSessions()
    }

    // Semantic search if embedding worker is ready, otherwise fallback to recent entries
    let context = []
    if (embedStatus === 'ready') {
      const results = await semanticSearch(trimmed, 5)
      const ids     = results.map((r) => r.journalId)
      context       = entries.filter((e) => ids.includes(e.id))
                             .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
    } else {
      // Fallback: most recent 3 entries
      context = entries.slice(0, 3)
    }

    const contextIds = context.map((e) => e.id)
    setMessages((prev) => [...prev, { role: 'user', text: trimmed, context }, { role: 'assistant', thinking: true, text: '' }])
    setInput('')
    setIsGenerating(true)

    await saveChatMessage({ sessionId, role: 'user', text: trimmed, contextIds }).catch(console.error)

    try {
      // Sprint 6: build a context-managed prompt that handles sliding window,
      // importance scoring, and auto-summarisation for long sessions
      const currentMessages = messages.filter((m) => !m.thinking)
      const { prompt, meta } = buildManagedPrompt(trimmed, currentMessages, context)

      if (meta.triggered) {
        console.info(`[Sprint 6] Context summarised: ${meta.summarised} old turns compressed, ${meta.keptVerbatim} kept verbatim, ~${meta.estimatedTokens} tokens`)
      }

      const text = await generate(prompt, 200)

      setMessages((prev) => {
        const next = [...prev]
        const idx  = next.findLastIndex((m) => m.role === 'assistant' && m.thinking)
        if (idx !== -1) next[idx] = { role: 'assistant', text }
        else            next.push({ role: 'assistant', text })
        return next
      })

      await saveChatMessage({ sessionId, role: 'assistant', text, contextIds: [] }).catch(console.error)

      const session = sessions.find((s) => s.id === sessionId)
      if (session?.title === 'New Conversation') {
        const autoTitle = trimmed.slice(0, 40) + (trimmed.length > 40 ? '…' : '')
        await renameChatSession(sessionId, autoTitle)
        await refreshSessions()
      }
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev]
        const idx  = next.findLastIndex((m) => m.thinking)
        if (idx !== -1) next[idx] = { role: 'assistant', text: '⚠ Generation failed. Please try again.' }
        return next
      })
    } finally {
      setIsGenerating(false)
    }
  }, [input, isGenerating, workerStatus, entries, generate, activeSessionId, sessions, refreshSessions, semanticSearch, embedStatus])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const { pct, loadedMB, totalMB } = downloadProgress

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <BrowsingGate
      feature="The Echo Chamber"
      description="A conversation with who you used to be — powered by your own journal entries."
      icon={MessageCircle}
    >
    <div className="h-full flex flex-col gap-4" style={{ height: 'calc(100vh - 48px - 48px)' }}>

      {/* Page header row */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
            The Echo Chamber
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#9a7550' }}>
            A conversation with who you used to be.
          </p>
        </div>
        {indexingProgress && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#9a7550' }}>
            <Loader2 size={12} className="animate-spin" />
            Indexing memories… {indexingProgress.current}/{indexingProgress.total}
          </div>
        )}
      </div>

      {/* ── idle ── */}
      {workerStatus === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center rounded-2xl border"
          style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: '#f4ecd8' }}>
            <Cpu size={28} style={{ color: '#c27a2a' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
              Start The Echo
            </h2>
            <p className="text-xs mt-2 max-w-xs leading-relaxed" style={{ color: '#9a7550' }}>
              The first load downloads ~500 MB of model weights and caches them.
              Future sessions start instantly.
            </p>
          </div>
          <button onClick={initWorker} disabled={entries.length === 0}
            className="flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-full transition-colors disabled:cursor-not-allowed"
            style={{ background: '#c27a2a', color: '#fff' }}>
            <Sparkles size={15} />
            {entries.length === 0 ? 'Add journal entries first' : 'Begin Reflection'}
          </button>
          {entries.length > 0 && (
            <p className="text-[11px]" style={{ color: '#b09070' }}>
              {entries.length} memories ready · semantic search {embedStatus === 'ready' ? '✓ active' : 'loading…'}
            </p>
          )}
        </div>
      )}

      {/* ── loading ── */}
      {workerStatus === 'loading' && (
        <div className="flex-1 flex flex-col justify-center rounded-2xl border p-8 space-y-5"
          style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin shrink-0" style={{ color: '#c27a2a' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#3b2a1a' }}>Loading model…</p>
              <p className="text-xs mt-0.5" style={{ color: '#9a7550' }}>
                {pct > 0 ? `${loadedMB} of ${totalMB}` : 'Connecting…'}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]" style={{ color: '#b09070' }}>
              <span>Download progress</span><span className="font-mono">{pct}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#e8d5b7' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(pct, 2)}%`, background: '#c27a2a' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── error ── */}
      {workerStatus === 'error' && (
        <div className="flex-1 rounded-2xl border p-6 space-y-4"
          style={{ background: '#fff5f5', borderColor: '#fca5a5' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-rose-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-rose-800">Initialisation failed</p>
              <pre className="text-xs text-rose-600 mt-2 whitespace-pre-wrap font-mono bg-rose-100 rounded-lg p-3 overflow-x-auto">
                {workerError}
              </pre>
            </div>
          </div>
          <button onClick={initWorker}
            className="flex items-center gap-2 text-sm font-medium text-rose-700 border border-rose-300 bg-white hover:bg-rose-50 px-4 py-2 rounded-lg transition-colors">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* ── ready ── */}
      {workerStatus === 'ready' && (
        <div className="flex-1 flex gap-3 min-h-0">

          {/* Sessions sidebar */}
          <div className="w-48 shrink-0 flex flex-col gap-2 min-h-0">
            <button onClick={handleNewSession}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors shrink-0"
              style={{ background: '#c27a2a', color: '#fff' }}>
              <Plus size={13} /> New Conversation
            </button>
            <div className="flex-1 rounded-2xl border p-2 space-y-0.5 overflow-y-auto min-h-0"
              style={{ background: '#f4ecd8', borderColor: '#d4b896' }}>
              {sessions.length === 0 ? (
                <p className="text-[11px] text-center py-6 px-2" style={{ color: '#b09070' }}>
                  No conversations yet.
                </p>
              ) : sessions.map((s) => (
                <SessionItem key={s.id} session={s} isActive={s.id === activeSessionId}
                  onSelect={(s) => setActiveSessionId(s.id)}
                  onDelete={handleDeleteSession} onRename={handleRenameSession} />
              ))}
            </div>
          </div>

          {/* Chat panel — fills all remaining space */}
          <div className="flex-1 rounded-2xl border overflow-hidden flex flex-col min-h-0"
            style={{ background: '#ffffff', borderColor: '#d4b896' }}>

            {/* Ready flash */}
            {readyFlash && (
              <div className="px-5 py-2.5 text-xs font-medium flex items-center gap-2 shrink-0"
                style={{ background: '#f4ecd8', borderBottom: '1px solid #d4b896', color: '#7a4f2a' }}>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                The Echo is ready — {entries.length} memories loaded.
              </div>
            )}

            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{ borderBottom: '1px solid #e8d5b7' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #c27a2a, #8b6343)' }}>
                  <Sparkles size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
                    {sessions.find((s) => s.id === activeSessionId)?.title ?? 'The Echo'}
                  </p>
                  <p className="text-[11px]" style={{ color: '#9a7550' }}>
                    {embedStatus === 'ready' ? '✦ Semantic search active' : '✦ Keyword search'}
                    {' · '}{messages.filter((m) => !m.thinking).length} messages
                    {contextStats.isSummarising && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: '#c27a2a22', color: '#c27a2a' }}>
                        ✦ Context managed
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowContext((p) => !p)}
                  className="flex items-center gap-1 text-[11px] transition-colors"
                  style={{ color: '#9a7550' }}>
                  <BookOpen size={11} />
                  {showContext ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                <button onClick={handleResetChat}
                  disabled={isResetting || messages.length === 0}
                  className="text-[11px] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  style={{ color: '#9a7550' }}
                  title="Clear conversation">
                  {isResetting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                </button>
              </div>
            </div>

            {/* Messages — scrollable, fills remaining height */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 min-h-0">
              {messages.length === 0 && (
                <div className="flex justify-start">
                  <div className="max-w-md rounded-2xl rounded-tl-sm px-5 py-4 text-sm leading-relaxed"
                    style={{ background: '#f4ecd8', color: '#3b2a1a', border: '1px solid #d4b896', fontFamily: '"Playfair Display", Georgia, serif', lineHeight: '1.8' }}>
                    <p>I am here — a reflection of who you were, speaking through what you once wrote.</p>
                    <p className="mt-2 text-xs" style={{ color: '#9a7550' }}>Ask me anything about your past.</p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="max-w-lg rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed"
                      style={{ background: '#3b2a1a', color: '#fdf8f2' }}>
                      {msg.text}
                    </div>
                  ) : msg.thinking ? (
                    <div className="rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2"
                      style={{ background: '#f4ecd8', border: '1px solid #d4b896' }}>
                      <Loader2 size={13} className="animate-spin" style={{ color: '#9a7550' }} />
                      <span className="text-xs" style={{ color: '#9a7550' }}>Searching your memories…</span>
                    </div>
                  ) : (
                    <div className="max-w-lg rounded-2xl rounded-tl-sm px-5 py-4 text-sm leading-relaxed"
                      style={{ background: '#f4ecd8', color: '#3b2a1a', border: '1px solid #d4b896', fontFamily: '"Playfair Display", Georgia, serif', lineHeight: '1.8' }}>
                      {msg.text}
                    </div>
                  )}

                  {showContext && msg.role === 'user' && msg.context?.length > 0 && (
                    <div className="max-w-lg w-full mt-1 space-y-1">
                      <p className="text-[10px] uppercase tracking-wider px-1" style={{ color: '#b09070' }}>
                        {msg.context.length} {msg.context.length === 1 ? 'memory' : 'memories'} retrieved
                      </p>
                      {msg.context.map((e) => (
                        <div key={e.id} className="rounded-lg px-3 py-2"
                          style={{ background: '#f4ecd8', border: '1px solid #d4b896' }}>
                          <p className="text-[11px] font-medium truncate" style={{ color: '#7a4f2a' }}>{e.title}</p>
                          <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: '#9a7550' }}>
                            {(e.content ?? '').slice(0, 120)}…
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* Input bar */}
            <div className="flex items-end gap-3 px-4 py-3 shrink-0"
              style={{ borderTop: '1px solid #e8d5b7', background: '#fdf8f2' }}>
              <textarea ref={inputRef} rows={1} value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isGenerating}
                placeholder="Ask your past self something…"
                className="flex-1 rounded-xl px-4 py-2.5 text-sm resize-none outline-none disabled:opacity-50"
                style={{ background: '#f4ecd8', border: '1px solid #d4b896', color: '#3b2a1a', minHeight: '42px', maxHeight: '120px' }}
              />
              <button onClick={handleSend} disabled={!input.trim() || isGenerating}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 disabled:cursor-not-allowed"
                style={{ background: input.trim() && !isGenerating ? '#c27a2a' : '#e8d5b7', color: '#fff' }}
                aria-label="Send">
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </BrowsingGate>
  )
}
