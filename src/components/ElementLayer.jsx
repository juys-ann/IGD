/**
 * ElementLayer — Task 3.5
 *
 * Renders draggable photo / sticky-note / sticker overlays on top of the
 * writing area. Elements are positioned absolutely within the parent's
 * relative container (set in JournalEntry), so they scroll naturally with
 * the page content — like stickers physically attached to paper.
 *
 * The textarea sits at z-index:1 underneath; elements are at z-index:10.
 * Drag is handled via window mousemove/mouseup so it works outside element bounds.
 */
import { useRef, useEffect } from 'react'

export default function ElementLayer({ elements, onChange }) {
  const dragging = useRef(null) // { id, startX, startY, origX, origY }

  // Global mouse tracking for drag
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const { id, startX, startY, origX, origY } = dragging.current
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      onChange((prev) => prev.map((el) =>
        el.id === id ? { ...el, x: Math.max(0, origX + dx), y: Math.max(0, origY + dy) } : el
      ))
    }
    const onUp = () => { dragging.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [onChange])

  const startDrag = (e, el) => {
    e.preventDefault()
    dragging.current = { id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y }
  }
  const del    = (id)        => onChange((p) => p.filter((el) => el.id !== id))
  const update = (id, patch) => onChange((p) => p.map((el) => el.id === id ? { ...el, ...patch } : el))

  if (!elements.length) return null

  return (
    <>
      {elements.map((el) => {
        // Position is absolute within the parent relative container
        const pos = { position: 'absolute', left: el.x, top: el.y, zIndex: 10 }

        /* ── Photo ── */
        if (el.type === 'photo') return (
          <div key={el.id} className="group" style={{ ...pos, width: el.width ?? 200, cursor: 'grab', userSelect: 'none' }}>
            <div style={{ position: 'relative' }} onMouseDown={(e) => startDrag(e, el)}>
              <img
                src={el.src}
                alt="attached"
                style={{ width: '100%', display: 'block', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.22)' }}
                draggable={false}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md"
                style={{ background: 'rgba(0,0,0,0.12)', fontSize: 11, color: '#fff', fontWeight: 600 }}>
                ⠿ drag
              </div>
            </div>
            <button onClick={() => del(el.id)}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: '#ef4444', color: '#fff' }}>✕</button>
            {/* Resize handle */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-60"
              style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '2px 0 4px 0' }}
              onMouseDown={(e) => {
                e.stopPropagation(); e.preventDefault()
                const origW = el.width ?? 200
                const sx = e.clientX
                const onM = (ev) => update(el.id, { width: Math.max(80, origW + ev.clientX - sx) })
                const onU = () => { window.removeEventListener('mousemove', onM); window.removeEventListener('mouseup', onU) }
                window.addEventListener('mousemove', onM); window.addEventListener('mouseup', onU)
              }}
            />
          </div>
        )

        /* ── Sticky note ── */
        if (el.type === 'sticky') return (
          <div key={el.id} className="group"
            style={{ ...pos, width: 180, minHeight: 150, background: el.color,
              boxShadow: '3px 5px 16px rgba(0,0,0,0.18)', borderRadius: '2px 2px 2px 24px',
              display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
            <div className="flex justify-between items-center px-2 pt-2 cursor-grab" onMouseDown={(e) => startDrag(e, el)}>
              <span style={{ color: 'rgba(0,0,0,0.3)', fontSize: 14 }}>⠿</span>
              <button onClick={() => del(el.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-black/40 hover:text-black/70 text-xs">✕</button>
            </div>
            <textarea
              value={el.text}
              onChange={(e) => update(el.id, { text: e.target.value })}
              placeholder="Write a note…"
              className="flex-1 bg-transparent outline-none resize-none px-2 pb-3 pt-1"
              style={{ fontFamily: '"Caveat", cursive', fontSize: 15, color: '#3b2a1a', lineHeight: 1.5, userSelect: 'text', cursor: 'text' }}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        )

        /* ── Sticker ── */
        if (el.type === 'sticker') return (
          <div key={el.id} className="group"
            style={{ ...pos, cursor: 'grab', userSelect: 'none', lineHeight: 1 }}
            onMouseDown={(e) => startDrag(e, el)}>
            <span style={{ fontSize: el.size ?? 38, display: 'block' }}>{el.emoji}</span>
            <button onClick={(e) => { e.stopPropagation(); del(el.id) }}
              className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: '#ef4444', color: '#fff' }}>✕</button>
          </div>
        )

        return null
      })}
    </>
  )
}
