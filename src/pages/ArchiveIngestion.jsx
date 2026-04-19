import { useState, useRef, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  UploadCloud, Feather, FolderOpen, Trash2, Eye,
  Smile, Meh, Frown, Zap, Moon,
  Loader2, Inbox, FileX, RefreshCw, BookOpen,
} from 'lucide-react'
import { db, deleteEntry, saveEntry, updateEntry } from '../db'
import {
  isSupported, extractText, extractMetadata,
  countWords, getExtension, ACCEPTED_MIME,
} from '../services/ingestion/fileParser'
import ConfirmationModal from '../components/ConfirmationModal'
import UploadProgressBar from '../components/UploadProgressBar'
import SuccessReport     from '../components/SuccessReport'
import MemoryViewerModal from '../components/MemoryViewerModal'
import { useAuth }       from '../context/AuthContext'
import BrowsingGate      from '../components/BrowsingGate'
import { EMOTION_COLORS } from '../services/nlp/emotionClassifier'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function wordCount(text) {
  return text?.trim() ? text.trim().split(/\s+/).length : 0
}

const MOOD_EMOJI = {
  joyful: '😊', calm: '😌', energised: '⚡', neutral: '😐', low: '😔',
}

// ── Journal Card (grid item) ───────────────────────────────────────────────────
function JournalCard({ entry, onView, onDelete }) {
  const topEmotions = (entry.emotions ?? []).slice(0, 2)
  const words       = wordCount(entry.content)
  const isUploaded  = entry.source === 'uploaded'

  return (
    <div
      onClick={() => onView(entry)}
      className="group relative flex flex-col rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg overflow-hidden"
      style={{ background: '#f4ecd8', border: '1px solid #d4b896', minHeight: '180px' }}
    >
      {/* Source stripe at top */}
      <div
        className="h-1.5 w-full shrink-0"
        style={{ background: isUploaded ? '#9a7550' : '#c27a2a' }}
      />

      {/* Card body */}
      <div className="flex-1 flex flex-col p-4 gap-2">

        {/* Source badge + mood */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: isUploaded ? '#e8d5b780' : '#c27a2a22',
              color:      isUploaded ? '#9a7550'   : '#c27a2a',
            }}
          >
            {isUploaded ? 'Uploaded' : 'Written'}
          </span>
          {entry.mood && (
            <span className="text-base" title={entry.mood}>
              {MOOD_EMOJI[entry.mood] ?? '📝'}
            </span>
          )}
        </div>

        {/* Title */}
        <p
          className="text-sm font-semibold leading-snug line-clamp-2"
          style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}
        >
          {entry.title || 'Untitled Entry'}
        </p>

        {/* Snippet */}
        {entry.content && (
          <p className="text-[11px] leading-relaxed line-clamp-3 flex-1"
            style={{ color: '#9a7550' }}>
            {entry.content.slice(0, 120)}
          </p>
        )}

        {/* Emotion chips */}
        {topEmotions.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {topEmotions.map(({ theme }) => (
              <span
                key={theme}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: `${EMOTION_COLORS[theme]}25`,
                  color:       EMOTION_COLORS[theme],
                }}
              >
                {theme}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 mt-auto"
          style={{ borderTop: '1px solid #e8d5b7' }}>
          <span className="text-[11px]" style={{ color: '#b09070' }}>
            {fmtDate(entry.timestamp)}
          </span>
          <span className="text-[11px]" style={{ color: '#b09070' }}>
            {words > 0 ? `${words} words` : ''}
          </span>
        </div>
      </div>

      {/* Hover action buttons */}
      <div
        className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onView(entry)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: '#e8d5b7', color: '#7a4f2a' }}
          aria-label="View"
        >
          <Eye size={12} />
        </button>
        <button
          onClick={() => onDelete(entry)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: '#fce7e7', color: '#c0392b' }}
          aria-label="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({ onFiles, isProcessing }) {
  const [isDragging, setDragging] = useState(false)
  const [rejected,   setRejected] = useState([])
  const inputRef = useRef(null)

  const handleFiles = useCallback((rawFiles) => {
    const good = [], bad = []
    rawFiles.forEach((f) => (isSupported(f) ? good : bad).push(f))
    setRejected(bad.map((f) => f.name))
    if (good.length) onFiles(good)
    if (bad.length) setTimeout(() => setRejected([]), 5000)
  }, [onFiles])

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files)) }}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed p-8 flex flex-col items-center gap-3 transition-all duration-200 select-none cursor-pointer"
        style={{
          borderColor: isDragging ? '#c27a2a' : '#d4b896',
          background:  isDragging ? '#f4ecd8' : '#fdf8f2',
          opacity:     isProcessing ? 0.6 : 1,
          cursor:      isProcessing ? 'not-allowed' : 'pointer',
        }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: isDragging ? '#e8d5b7' : '#f4ecd8' }}>
          {isProcessing
            ? <Loader2 size={22} className="animate-spin" style={{ color: '#c27a2a' }} />
            : <UploadCloud size={22} style={{ color: isDragging ? '#c27a2a' : '#9a7550' }} />}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: '#3b2a1a' }}>
            {isProcessing ? 'Processing…' : isDragging ? 'Release to upload' : 'Upload Past Journals'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#9a7550' }}>
            .txt or .docx · parsed locally
          </p>
        </div>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED_MIME} className="hidden"
          onChange={(e) => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
          disabled={isProcessing} />
      </div>

      {rejected.length > 0 && (
        <div className="rounded-xl px-4 py-3 space-y-1"
          style={{ background: '#fce7e7', border: '1px solid #f5c6c6' }}>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#c0392b' }}>
            <FileX size={13} />
            {rejected.length} unsupported {rejected.length === 1 ? 'file' : 'files'} skipped
          </div>
          {rejected.map((name, i) => (
            <p key={i} className="text-xs font-mono pl-5" style={{ color: '#e74c3c' }}>
              {name} — <span style={{ color: '#c0392b' }}>use .txt or .docx</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ label, count, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
      style={active
        ? { background: '#f4ecd8', color: '#7a4f2a', border: '1px solid #d4b896' }
        : { background: 'transparent', color: '#9a7550', border: '1px solid transparent' }
      }
    >
      <Icon size={14} />
      {label}
      {count > 0 && (
        <span
          className="text-[11px] font-mono px-1.5 py-0.5 rounded-full"
          style={{
            background: active ? '#e8d5b7' : '#f4ecd8',
            color:      active ? '#7a4f2a' : '#9a7550',
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ArchiveIngestion() {
  const { requireAuth } = useAuth()

  const allEntries = useLiveQuery(
    () => db.journals.orderBy('timestamp').reverse().toArray(), []
  )

  const [activeTab,    setActiveTab]    = useState('written')  // 'written' | 'uploaded'
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress,     setProgress]     = useState({ current: 0, total: 0, label: '' })
  const [report,       setReport]       = useState(null)
  const [viewEntry,    setViewEntry]    = useState(null)
  const [pendingDelete,setPendingDelete]= useState(null)
  const [isDeleting,   setIsDeleting]   = useState(false)
  const [overwriteModal,setOverwriteModal]= useState(null)
  const overwriteResolverRef = useRef(null)

  // Separate written vs uploaded
  const writtenEntries  = allEntries?.filter((e) => e.source === 'written' || (!e.source && !e.fileType)) ?? []
  const uploadedEntries = allEntries?.filter((e) => e.source === 'uploaded' || e.fileType) ?? []
  const displayedEntries = activeTab === 'written' ? writtenEntries : uploadedEntries
  const isLoading = allEntries === undefined

  // ── Overwrite modal ───────────────────────────────────────────────────────
  const askOverwrite = useCallback((fileName) => {
    return new Promise((resolve) => {
      overwriteResolverRef.current = resolve
      setOverwriteModal({ fileName })
    })
  }, [])

  const handleOverwriteConfirm = () => { overwriteResolverRef.current?.(true);  setOverwriteModal(null) }
  const handleOverwriteSkip    = () => { overwriteResolverRef.current?.(false); setOverwriteModal(null) }

  // ── File processor ────────────────────────────────────────────────────────
  const processFiles = useCallback(async (files) => {
    const authed = await requireAuth()
    if (!authed) return

    setIsProcessing(true)
    setReport(null)
    setProgress({ current: 0, total: files.length, label: 'Starting…' })

    const results = []
    let totalWords = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setProgress({ current: i, total: files.length, label: `Parsing ${file.name}` })
      try {
        const rawText = await extractText(file)
        const { title, timestamp, detectedDate } = extractMetadata(file, rawText)
        const words = countWords(rawText)
        const existing = await db.journals.where('title').equals(title).first()

        if (existing) {
          const shouldOverwrite = await askOverwrite(file.name)
          if (shouldOverwrite) {
            await updateEntry(existing.id, { title, content: rawText, mood: existing.mood })
            totalWords += words
            results.push({ name: file.name, status: 'saved', words, detectedDate, overwritten: true })
          } else {
            results.push({ name: file.name, status: 'skipped', words: 0, detectedDate: false, error: 'Skipped (duplicate)' })
          }
        } else {
          // Mark as 'uploaded' so it appears in the Uploaded tab
          await saveEntry({ title, content: rawText, mood: null, timestamp, source: 'uploaded' })
          totalWords += words
          results.push({ name: file.name, status: 'saved', words, detectedDate })
        }
      } catch (err) {
        results.push({ name: file.name, status: 'error', words: 0, detectedDate: false, error: err.message })
      }
    }

    setProgress({ current: files.length, total: files.length, label: 'Done!' })
    setReport({
      saved:      results.filter((r) => r.status === 'saved').length,
      skipped:    results.filter((r) => r.status !== 'saved').length,
      totalWords,
      files:      results,
    })
    setTimeout(() => { setIsProcessing(false); setProgress({ current: 0, total: 0, label: '' }) }, 600)

    // Auto-switch to Uploaded tab after a successful upload
    if (results.some((r) => r.status === 'saved')) setActiveTab('uploaded')
  }, [askOverwrite, requireAuth])

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteClick = (entry) => {
    if (viewEntry?.id === entry.id) setViewEntry(null)
    setPendingDelete(entry)
  }
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setIsDeleting(true)
    try { await deleteEntry(pendingDelete.id) }
    catch (err) { console.error(err) }
    finally { setIsDeleting(false); setPendingDelete(null) }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <BrowsingGate
      feature="Memory Archive"
      description="All your journals in one place — written entries and uploaded archives, searchable and organised."
      icon={FolderOpen}
    >
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold"
          style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
          Memory Archive
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9a7550' }}>
          All your journals in one place — written in the app or uploaded from past files.
        </p>
      </div>

      {/* Drop zone */}
      <DropZone onFiles={processFiles} isProcessing={isProcessing} />

      {/* Progress + report */}
      {isProcessing && progress.total > 0 && (
        <div className="rounded-2xl border px-6 py-5"
          style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
          <UploadProgressBar current={progress.current} total={progress.total} label={progress.label} />
        </div>
      )}
      {!isProcessing && report && (
        <SuccessReport report={report} onClose={() => setReport(null)} />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Tab
          label="Written Journals"
          count={writtenEntries.length}
          icon={Feather}
          active={activeTab === 'written'}
          onClick={() => setActiveTab('written')}
        />
        <Tab
          label="Uploaded Archives"
          count={uploadedEntries.length}
          icon={FolderOpen}
          active={activeTab === 'uploaded'}
          onClick={() => setActiveTab('uploaded')}
        />
      </div>

      {/* Grid */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin" style={{ color: '#d4b896' }} />
        </div>
      )}

      {!isLoading && displayedEntries.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-3 rounded-2xl border"
          style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
          {activeTab === 'written'
            ? <Feather size={32} style={{ color: '#d4b896' }} />
            : <FolderOpen size={32} style={{ color: '#d4b896' }} />}
          <p className="text-sm font-medium" style={{ color: '#9a7550' }}>
            {activeTab === 'written'
              ? 'No written journals yet'
              : 'No uploaded archives yet'}
          </p>
          <p className="text-xs" style={{ color: '#b09070' }}>
            {activeTab === 'written'
              ? 'Head to My Journal to start writing.'
              : 'Upload .txt or .docx files above.'}
          </p>
        </div>
      )}

      {!isLoading && displayedEntries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedEntries.map((entry) => (
            <JournalCard
              key={entry.id}
              entry={entry}
              onView={setViewEntry}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <MemoryViewerModal
        entry={viewEntry}
        onClose={() => setViewEntry(null)}
        onSaved={(updated) => setViewEntry(updated)}
      />
      <ConfirmationModal
        isOpen={!!pendingDelete}
        title="Delete this memory?"
        message="Are you sure you want to permanently delete this memory? This action cannot be undone."
        confirmLabel={isDeleting ? 'Deleting…' : 'Yes, delete it'}
        cancelLabel="Keep it"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmationModal
        isOpen={!!overwriteModal}
        title="File already exists"
        message={`"${overwriteModal?.fileName}" already exists in your archive. Overwrite it?`}
        confirmLabel={<span className="flex items-center gap-1.5"><RefreshCw size={12} /> Yes, overwrite</span>}
        cancelLabel="Skip this file"
        onConfirm={handleOverwriteConfirm}
        onCancel={handleOverwriteSkip}
      />
    </div>
    </BrowsingGate>
  )
}
