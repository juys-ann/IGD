import { useState, useRef } from 'react'
import { X, Upload, Check } from 'lucide-react'

const COVER_COLORS = [
  '#c27a2a', '#9b2335', '#5b2d5e', '#1a3a5c', '#2d5a3d', '#3d4f60',
  '#d4956a', '#e8a0b0', '#a0c4d8', '#b5cfa0', '#d4c5a9', '#8b7355',
]

export default function JournalCoverPicker({ onConfirm, onSkip }) {
  const [selected,    setSelected]    = useState(null)
  const [uploadedImg, setUploadedImg] = useState(null)
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setUploadedImg(ev.target.result); setSelected(null) }
    reader.readAsDataURL(file)
  }

  const handleConfirm = () => {
    if (uploadedImg)     onConfirm({ coverColor: null,     coverImage: uploadedImg })
    else if (selected)   onConfirm({ coverColor: selected, coverImage: null })
    else                 onSkip()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(30,20,10,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#fdf8f2', borderRadius: 20, width: '100%', maxWidth: 480,
        border: '1px solid #d4b896', padding: '28px 32px',
      }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontWeight: 700, color: '#3b2a1a' }}>
              Choose a Cover
            </h2>
            <p style={{ fontSize: 12, color: '#9a7550', marginTop: 2 }}>Pick a colour or upload your own image</p>
          </div>
          <button onClick={onSkip} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#f4ecd8', color: '#9a7550' }}>
            <X size={14} />
          </button>
        </div>

        {/* Color grid */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          {COVER_COLORS.map((color) => (
            <button key={color} onClick={() => { setSelected(color); setUploadedImg(null) }}
              className="aspect-square rounded-xl transition-all"
              style={{
                background: color,
                border: selected === color ? '3px solid #c27a2a' : '2px solid transparent',
                transform: selected === color ? 'scale(1.1)' : 'scale(1)',
              }}>
              {selected === color && <Check size={14} color="#fff" style={{ margin: 'auto' }} />}
            </button>
          ))}
        </div>

        {/* Upload */}
        <button onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
          style={{
            background: uploadedImg ? '#e8f5e9' : '#f4ecd8',
            border: `1.5px dashed ${uploadedImg ? '#4caf50' : '#d4b896'}`,
            color: uploadedImg ? '#2e7d32' : '#9a7550', fontSize: 13,
          }}>
          <Upload size={14} />
          {uploadedImg ? 'Image uploaded ✓ — click to change' : 'Upload your own cover image'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {/* Preview */}
        {(selected || uploadedImg) && (
          <div className="mt-4 rounded-xl overflow-hidden" style={{ height: 80 }}>
            <div className="w-full h-full" style={
              uploadedImg
                ? { backgroundImage: `url(${uploadedImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: selected }
            } />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <button onClick={onSkip}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'transparent', border: '1px solid #d4b896', color: '#9a7550' }}>
            Skip for now
          </button>
          <button onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#c27a2a', color: '#fff' }}>
            {selected || uploadedImg ? 'Use this cover' : 'No cover'}
          </button>
        </div>
      </div>
    </div>
  )
}
