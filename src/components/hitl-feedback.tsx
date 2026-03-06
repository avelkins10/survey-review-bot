'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle, Save, Loader2 } from 'lucide-react'

interface FeedbackData {
  id?: number
  review_id: number
  reviewer_name: string | null
  human_disposition: string | null
  confidence_rating: number | null
  ai_caught: string | null
  human_caught: string | null
  patterns: string | null
}

interface Props {
  reviewId: number
  existingFeedback: FeedbackData | null
}

export default function HITLFeedback({ reviewId, existingFeedback }: Props) {
  const [name, setName] = useState(existingFeedback?.reviewer_name || '')
  const [disp, setDisp] = useState(existingFeedback?.human_disposition || '')
  const [conf, setConf] = useState(existingFeedback?.confidence_rating || 3)
  const [aiCaught, setAiCaught] = useState(existingFeedback?.ai_caught || '')
  const [humanCaught, setHumanCaught] = useState(existingFeedback?.human_disposition ? (existingFeedback?.human_caught || '') : '')
  const [patterns, setPatterns] = useState(existingFeedback?.patterns || '')
  const [feedbackId, setFeedbackId] = useState(existingFeedback?.id || null)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(existingFeedback?.id ? new Date() : null)
  const [dirty, setDirty] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Persist reviewer name in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('hitl_reviewer_name')
    if (saved && !name) setName(saved)
  }, [])

  useEffect(() => {
    if (name) localStorage.setItem('hitl_reviewer_name', name)
  }, [name])

  const save = useCallback(async () => {
    // Don't save if no meaningful input yet
    if (!disp && !aiCaught && !humanCaught && !patterns) return

    setSaving(true)
    try {
      if (feedbackId) {
        // Update existing
        const resp = await fetch('/api/feedback', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: feedbackId,
            review_id: reviewId,
            reviewer_name: name || null,
            human_disposition: disp || null,
            confidence_rating: conf,
            ai_caught: aiCaught || null,
            human_caught: humanCaught || null,
            patterns: patterns || null,
          }),
        })
        if (resp.ok) {
          setLastSaved(new Date())
          setDirty(false)
        }
      } else {
        // Create new
        const resp = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            review_id: reviewId,
            reviewer_name: name || null,
            human_disposition: disp || null,
            confidence_rating: conf,
            ai_caught: aiCaught || null,
            human_caught: humanCaught || null,
            patterns: patterns || null,
          }),
        })
        if (resp.ok) {
          const data = await resp.json()
          setFeedbackId(data.id)
          setLastSaved(new Date())
          setDirty(false)
        }
      }
    } catch (e) {
      console.error('Feedback save error:', e)
    }
    setSaving(false)
  }, [feedbackId, reviewId, name, disp, conf, aiCaught, humanCaught, patterns])

  // Debounced autosave on any change
  const triggerAutosave = useCallback(() => {
    setDirty(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(), 2000)
  }, [save])

  // Save on unmount / page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dirty) {
        // Fire-and-forget save
        navigator.sendBeacon('/api/feedback', new Blob([JSON.stringify({
          id: feedbackId,
          review_id: reviewId,
          reviewer_name: name || null,
          human_disposition: disp || null,
          confidence_rating: conf,
          ai_caught: aiCaught || null,
          human_caught: humanCaught || null,
          patterns: patterns || null,
        })], { type: 'application/json' }))
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [dirty, feedbackId, reviewId, name, disp, conf, aiCaught, humanCaught, patterns])

  return (
    <div className="card p-5 border-[#f97316]/30 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-[2px] text-[#f97316]">
          HITL Review {feedbackId ? '(saved)' : '(new)'}
        </h3>
        <div className="flex items-center gap-2 text-[10px]">
          {saving ? (
            <span className="text-[#60a5fa] flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Saving...</span>
          ) : lastSaved ? (
            <span className="text-[#22c55e] flex items-center gap-1"><CheckCircle size={10} /> Saved</span>
          ) : dirty ? (
            <span className="text-[#f59e0b]">Unsaved changes</span>
          ) : null}
          <button onClick={save} disabled={saving || !dirty} className="btn-ghost text-xs py-1 px-2 inline-flex items-center gap-1">
            <Save size={10} /> Save
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-[10px] uppercase tracking-[2px] text-[#555] block mb-1">Your Name</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); triggerAutosave() }}
            onBlur={save}
            placeholder="e.g. Deven Smith"
            className="w-full"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[2px] text-[#555] block mb-1">Your Call</label>
          <div className="flex gap-2 mt-1">
            {['approve', 'flag', 'reject'].map(d => (
              <button key={d} onClick={() => { setDisp(d); setDirty(true); setTimeout(save, 100) }}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                  disp === d ? 'border-[#f97316] bg-[#f97316]/10 text-[#f97316]' : 'border-[#2a2a2a] text-[#555] hover:border-[#444]'
                }`}>
                {d === 'approve' ? '✅' : d === 'reject' ? '❌' : '⚠️'} {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[10px] uppercase tracking-[2px] text-[#555] block mb-1">
          Confidence in AI (1=useless → 5=deploy)
        </label>
        <div className="flex items-center gap-2">
          <input type="range" min={1} max={5} value={conf}
            onChange={e => { setConf(Number(e.target.value)); triggerAutosave() }}
            onMouseUp={save}
            className="accent-[#f97316] flex-1" />
          <span className="text-lg font-bold text-[#f97316] w-6 text-center">{conf}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-[10px] uppercase tracking-[2px] text-[#555] block mb-1">What AI caught that you&apos;d have missed</label>
          <textarea value={aiCaught} onChange={e => { setAiCaught(e.target.value); triggerAutosave() }} onBlur={save} rows={2} className="w-full" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[2px] text-[#555] block mb-1">What you caught that AI missed</label>
          <textarea value={humanCaught} onChange={e => { setHumanCaught(e.target.value); triggerAutosave() }} onBlur={save} rows={2} className="w-full" />
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-[2px] text-[#555] block mb-1">Patterns to learn</label>
        <textarea value={patterns} onChange={e => { setPatterns(e.target.value); triggerAutosave() }} onBlur={save} rows={2} className="w-full"
          placeholder="e.g. We don't need lumber grade stamps in FL" />
      </div>
    </div>
  )
}
