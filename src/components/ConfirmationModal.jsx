import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * ConfirmationModal
 *
 * Props:
 *   isOpen    boolean      — controls visibility
 *   title     string       — modal heading
 *   message   string       — body copy (the warning)
 *   confirmLabel  string   — label for the destructive button (default: "Delete")
 *   cancelLabel   string   — label for the safe button   (default: "Cancel")
 *   onConfirm function     — called when user clicks the destructive button
 *   onCancel  function     — called when user clicks Cancel or the backdrop
 */
export default function ConfirmationModal({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  const cancelBtnRef = useRef(null)

  // Auto-focus the safe "Cancel" button so Enter doesn't accidentally confirm
  useEffect(() => {
    if (isOpen) cancelBtnRef.current?.focus()
  }, [isOpen])

  // Close on Escape key
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
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-desc"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                   w-full max-w-md bg-white rounded-2xl shadow-2xl p-6
                   animate-[fadeUp_0.2s_cubic-bezier(0.16,1,0.3,1)]"
      >
        {/* Close × */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg text-stone-400
                     hover:text-stone-700 hover:bg-stone-100 flex items-center
                     justify-center transition-colors"
          aria-label="Close"
        >
          <X size={15} />
        </button>

        {/* Icon + heading */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-rose-500" />
          </div>
          <div>
            <h2
              id="modal-title"
              className="text-base font-semibold text-stone-800 leading-tight"
            >
              {title}
            </h2>
            <p
              id="modal-desc"
              className="text-sm text-stone-500 mt-1 leading-relaxed"
            >
              {message}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-100 my-4" />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100
                       hover:bg-stone-200 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-rose-500
                       hover:bg-rose-600 rounded-lg transition-colors shadow-sm"
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
