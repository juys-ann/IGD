import { Loader2, Pencil } from 'lucide-react'

export default function JournalTitleField({ value, onChange, onBlur, loading = false, placeholder = 'Journal title…' }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 rounded-lg animate-pulse" style={{
          width: '180px',
          background: 'linear-gradient(90deg, #e8d5b7 25%, #f4ecd8 50%, #e8d5b7 75%)',
          backgroundSize: '400% 100%',
          animation: 'shimmer 1.4s infinite',
        }} />
        <Loader2 size={14} className="animate-spin" style={{ color: '#d4b896' }} />
        <style>{`@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }`}</style>
      </div>
    )
  }

  return (
    <div className="relative flex items-center group">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={80}
        className="bg-transparent outline-none border-b-2 transition-colors duration-200 w-full"
        style={{
          fontFamily:  '"Playfair Display", Georgia, serif',
          fontSize:    '1.6rem',
          fontWeight:  700,
          color:       '#3b2a1a',
          borderColor: 'transparent',
          caretColor:  '#c27a2a',
        }}
        onFocus={(e)  => { e.target.style.borderColor = '#c27a2a' }}
        onBlur={(e)   => { e.target.style.borderColor = 'transparent'; onBlur?.() }}
      />
      <Pencil size={13} className="ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none flex-shrink-0" style={{ color: '#9a7550' }} />
      {value.length > 60 && (
        <span className="absolute -bottom-5 right-0 text-[10px]" style={{ color: value.length >= 78 ? '#c0392b' : '#b09070' }}>
          {value.length}/80
        </span>
      )}
    </div>
  )
}
