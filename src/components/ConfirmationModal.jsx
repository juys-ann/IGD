import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * ConfirmationModal
 *
 * Props:
 *   isOpen        boolean
 *   title         string
 *   message       string
 *   confirmLabel  string   (default: "Delete")
 *   cancelLabel   string   (default: "Cancel")
 *   onConfirm     function
 *   onCancel      function
 */
export default function ConfirmationModal({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel  = 'Cancel',
  onConfirm,
  onCancel,
}) {
  const cancelBtnRef = useRef(null)

  useEffect(() => {
    if (isOpen) cancelBtnRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onCancel?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(59,42,26,0.45)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-desc"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-2xl shadow-2xl p-6"
        style={{
          background: '#f4ecd8',
          border: '1px solid #d4b896',
          animation: 'fadeUp 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Close × */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: '#9a7550', background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = '#e8d5b7'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          aria-label="Close"
        >
          <X size={15} />
        </button>

        {/* Icon + heading */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#fce7e7' }}
          >
            <AlertTriangle size={18} style={{ color: '#e53e3e' }} />
          </div>
          <div>
            <h2
              id="modal-title"
              className="text-base font-semibold leading-tight"
              style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              {title}
            </h2>
            <p
              id="modal-desc"
              className="text-sm mt-1 leading-relaxed"
              style={{ color: '#9a7550' }}
            >
              {message}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-4" style={{ borderTop: '1px solid #e8d5b7' }} />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ background: '#e8d5b7', color: '#7a4f2a', border: 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = '#d4b896'}
            onMouseLeave={e => e.currentTarget.style.background = '#e8d5b7'}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ background: '#9b2335', color: '#fff', border: 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = '#7f1d1d'}
            onMouseLeave={e => e.currentTarget.style.background = '#9b2335'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 12px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  )
}
