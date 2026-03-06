'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Check, X, Trash2, MessageSquare, Save, Loader2 } from 'lucide-react'

interface BoundingBox {
  x: number       // relative 0-1
  y: number       // relative 0-1
  width: number   // relative 0-1
  height: number  // relative 0-1
  label: string
  type: 'highlight' | 'issue'
}

interface Annotation {
  id?: number
  photo_result_id: number
  review_id: number
  verdict: 'accept' | 'decline' | null
  bounding_boxes: BoundingBox[]
  notes: string | null
}

interface Props {
  photoResultId: number
  reviewId: number
  photoUrl: string | null
  categoryKey: string
  categoryLabel: string
  qualityScore: number | null
  initialAnnotation?: Annotation | null
  onSaved?: (annotation: Annotation) => void
}

export default function PhotoAnnotator({
  photoResultId, reviewId, photoUrl, categoryLabel,
  qualityScore, initialAnnotation, onSaved
}: Props) {
  const [verdict, setVerdict] = useState<'accept' | 'decline' | null>(initialAnnotation?.verdict || null)
  const [boxes, setBoxes] = useState<BoundingBox[]>(initialAnnotation?.bounding_boxes || [])
  const [notes, setNotes] = useState(initialAnnotation?.notes || '')
  const [showNotes, setShowNotes] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [drawMode, setDrawMode] = useState(false)
  const [boxType, setBoxType] = useState<'highlight' | 'issue'>('issue')
  const imgRef = useRef<HTMLDivElement>(null)

  // Dirty check
  const isDirty = verdict !== (initialAnnotation?.verdict || null) ||
    JSON.stringify(boxes) !== JSON.stringify(initialAnnotation?.bounding_boxes || []) ||
    notes !== (initialAnnotation?.notes || '')

  const getRelCoords = useCallback((e: React.MouseEvent) => {
    if (!imgRef.current) return { x: 0, y: 0 }
    const rect = imgRef.current.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    }
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!drawMode) return
    e.preventDefault()
    const coords = getRelCoords(e)
    setDrawing(true)
    setDrawStart(coords)
    setCurrentBox(null)
  }, [drawMode, getRelCoords])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing || !drawStart) return
    const coords = getRelCoords(e)
    setCurrentBox({
      x: Math.min(drawStart.x, coords.x),
      y: Math.min(drawStart.y, coords.y),
      w: Math.abs(coords.x - drawStart.x),
      h: Math.abs(coords.y - drawStart.y),
    })
  }, [drawing, drawStart, getRelCoords])

  const onMouseUp = useCallback(() => {
    if (!drawing || !currentBox) {
      setDrawing(false)
      setDrawStart(null)
      return
    }
    // Minimum size check (avoid accidental clicks)
    if (currentBox.w > 0.02 && currentBox.h > 0.02) {
      const label = prompt('Label this region (e.g. "panel sticker", "unreadable area", "wrong component"):')
      if (label) {
        setBoxes(prev => [...prev, {
          x: currentBox.x,
          y: currentBox.y,
          width: currentBox.w,
          height: currentBox.h,
          label,
          type: boxType,
        }])
      }
    }
    setDrawing(false)
    setDrawStart(null)
    setCurrentBox(null)
  }, [drawing, currentBox, boxType])

  const removeBox = (index: number) => {
    setBoxes(prev => prev.filter((_, i) => i !== index))
  }

  const save = async () => {
    setSaving(true)
    try {
      const resp = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_result_id: photoResultId,
          review_id: reviewId,
          verdict,
          bounding_boxes: boxes,
          notes: notes || null,
        }),
      })
      if (resp.ok) {
        const data = await resp.json()
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        onSaved?.({ ...data, verdict, bounding_boxes: boxes, notes })
      }
    } catch {
      // silent
    }
    setSaving(false)
  }

  // Auto-save on verdict change
  useEffect(() => {
    if (verdict && verdict !== (initialAnnotation?.verdict || null)) {
      save()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdict])

  return (
    <div className="space-y-2">
      {/* Photo with canvas overlay */}
      <div
        ref={imgRef}
        className={`relative select-none ${drawMode ? 'cursor-crosshair' : 'cursor-default'}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { if (drawing) { setDrawing(false); setDrawStart(null); setCurrentBox(null) } }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photos?url=${encodeURIComponent(photoUrl)}`}
            alt={categoryLabel}
            className={`w-full rounded-lg border ${drawMode ? 'border-[#f97316]' : 'border-[#222]'} transition-colors`}
            style={{ maxHeight: 300, objectFit: 'cover' }}
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="w-full h-24 bg-[#0a0a0a] rounded-lg border border-[#222] flex items-center justify-center">
            <span className="text-[#333] text-xs">No image</span>
          </div>
        )}

        {/* Render saved bounding boxes */}
        {boxes.map((box, i) => (
          <div
            key={i}
            className="absolute border-2 rounded-sm group"
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
              borderColor: box.type === 'issue' ? '#ef4444' : '#22c55e',
              backgroundColor: box.type === 'issue' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            }}
          >
            <span
              className="absolute -top-5 left-0 text-[9px] px-1 rounded whitespace-nowrap"
              style={{
                backgroundColor: box.type === 'issue' ? '#991b1b' : '#14532d',
                color: box.type === 'issue' ? '#fca5a5' : '#86efac',
              }}
            >
              {box.label}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); removeBox(i) }}
              className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-600 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}

        {/* Current drawing box */}
        {currentBox && (
          <div
            className="absolute border-2 border-dashed rounded-sm pointer-events-none"
            style={{
              left: `${currentBox.x * 100}%`,
              top: `${currentBox.y * 100}%`,
              width: `${currentBox.w * 100}%`,
              height: `${currentBox.h * 100}%`,
              borderColor: boxType === 'issue' ? '#ef4444' : '#22c55e',
              backgroundColor: boxType === 'issue' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Accept / Decline */}
        <button
          onClick={() => setVerdict(verdict === 'accept' ? null : 'accept')}
          className={`text-[10px] py-1 px-2 rounded inline-flex items-center gap-1 border transition-colors ${
            verdict === 'accept'
              ? 'bg-green-900/50 border-green-700 text-green-300'
              : 'border-[#333] text-[#555] hover:border-green-800 hover:text-green-400'
          }`}
        >
          <Check size={10} /> Accept
        </button>
        <button
          onClick={() => setVerdict(verdict === 'decline' ? null : 'decline')}
          className={`text-[10px] py-1 px-2 rounded inline-flex items-center gap-1 border transition-colors ${
            verdict === 'decline'
              ? 'bg-red-900/50 border-red-700 text-red-300'
              : 'border-[#333] text-[#555] hover:border-red-800 hover:text-red-400'
          }`}
        >
          <X size={10} /> Decline
        </button>

        <div className="w-px h-4 bg-[#333] mx-1" />

        {/* Draw mode toggle */}
        <button
          onClick={() => setDrawMode(!drawMode)}
          className={`text-[10px] py-1 px-2 rounded inline-flex items-center gap-1 border transition-colors ${
            drawMode
              ? 'bg-[#f97316]/20 border-[#f97316] text-[#f97316]'
              : 'border-[#333] text-[#555] hover:border-[#f97316] hover:text-[#f97316]'
          }`}
        >
          ▢ {drawMode ? 'Drawing...' : 'Draw Box'}
        </button>

        {drawMode && (
          <select
            value={boxType}
            onChange={(e) => setBoxType(e.target.value as 'highlight' | 'issue')}
            className="text-[10px] py-1 px-1 bg-[#111] border border-[#333] rounded text-[#888]"
          >
            <option value="issue">🔴 Issue</option>
            <option value="highlight">🟢 Highlight</option>
          </select>
        )}

        {/* Notes toggle */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`text-[10px] py-1 px-2 rounded inline-flex items-center gap-1 border transition-colors ${
            notes ? 'border-blue-700 text-blue-300' : 'border-[#333] text-[#555] hover:border-blue-800'
          }`}
        >
          <MessageSquare size={9} /> Notes
        </button>

        {/* Score display */}
        {qualityScore !== null && (
          <span className="text-[10px] text-[#555] ml-auto">
            AI: {qualityScore}/10
          </span>
        )}

        {/* Save */}
        {isDirty && (
          <button
            onClick={save}
            disabled={saving}
            className="text-[10px] py-1 px-2 rounded inline-flex items-center gap-1 bg-[#f97316] text-black font-medium"
          >
            {saving ? <Loader2 size={9} className="animate-spin" /> : <Save size={9} />}
            Save
          </button>
        )}

        {saved && (
          <span className="text-[10px] text-green-400">✓ Saved</span>
        )}
      </div>

      {/* Notes field */}
      {showNotes && (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about this photo..."
          className="w-full text-xs p-2 bg-[#0a0a0a] border border-[#222] rounded-lg text-[#ccc] resize-none"
          rows={2}
        />
      )}

      {/* Box list */}
      {boxes.length > 0 && (
        <div className="space-y-1">
          {boxes.map((box, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span style={{ color: box.type === 'issue' ? '#f87171' : '#4ade80' }}>
                {box.type === 'issue' ? '🔴' : '🟢'}
              </span>
              <span className="text-[#888]">{box.label}</span>
              <button onClick={() => removeBox(i)} className="text-[#555] hover:text-red-400 ml-auto">
                <Trash2 size={9} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
