'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Nav from '@/components/nav'
import DispositionBadge from '@/components/disposition-badge'
import type { Review, PhotoResult, Feedback, DispositionType } from '@/lib/types'
import { ArrowLeft, ExternalLink, Camera, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

const CATEGORY_LABELS: Record<string, string> = {
  panel_sticker: 'Panel Sticker', main_breaker: 'Main Breaker', utility_meter: 'Utility Meter',
  busbar: 'Busbar', msp_deadfront_on: 'MSP Dead-front On', msp_deadfront_off: 'MSP Dead-front Off',
  panel_schedule: 'Panel Schedule', meter_can: 'Meter Can', meter_wall: 'Meter Wall',
  proposed_equipment_location: 'Proposed Equipment Location', rafter_size: 'Rafter Size',
  rafter_spacing: 'Rafter Spacing', attic_360: 'Attic 360°', attic_slope: 'Attic Slope',
  roof_plane: 'Roof Plane', roof_slope: 'Roof Slope', eave_measurement: 'Eave Measurement',
  house_number_selfie: 'House Number', front_of_home: 'Front of Home', front_left_corner: 'Front Left Corner',
  front_right: 'Front Right', left_of_home: 'Left of Home', right_of_home: 'Right of Home',
  back_of_home: 'Back of Home', back_left: 'Back Left', back_right: 'Back Right', backyard: 'Backyard',
}

function catLabel(key: string) {
  return CATEGORY_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function ReviewDetail() {
  const { id } = useParams<{ id: string }>()
  const [review, setReview] = useState<Review | null>(null)
  const [photos, setPhotos] = useState<PhotoResult[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)

  // Feedback form
  const [fbName, setFbName] = useState('')
  const [fbDisp, setFbDisp] = useState('')
  const [fbConf, setFbConf] = useState(3)
  const [fbAICaught, setFbAICaught] = useState('')
  const [fbHumanCaught, setFbHumanCaught] = useState('')
  const [fbPatterns, setFbPatterns] = useState('')
  const [fbSaving, setFbSaving] = useState(false)
  const [fbSaved, setFbSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/reviews/${id}`).then(r => r.json()).then(d => {
      setReview(d.review)
      setPhotos(d.photos || [])
      setFeedback(d.feedback || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  async function submitFeedback() {
    setFbSaving(true)
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_id: Number(id),
        reviewer_name: fbName,
        human_disposition: fbDisp,
        confidence_rating: fbConf,
        ai_caught: fbAICaught,
        human_caught: fbHumanCaught,
        patterns: fbPatterns,
      }),
    })
    setFbSaving(false)
    setFbSaved(true)
  }

  if (loading) return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-20 text-center text-[#555]">Loading...</main>
    </>
  )

  if (!review) return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-20 text-center text-[#555]">Review not found</main>
    </>
  )

  const grouped = photos.reduce<Record<string, PhotoResult[]>>((acc, p) => {
    const key = p.category_key
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  const completeColor = review.completeness_score >= 90 ? '#22c55e' : review.completeness_score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Back + header */}
        <Link href="/reviews" className="inline-flex items-center gap-1 text-[#555] hover:text-[#999] text-xs mb-4">
          <ArrowLeft size={12} /> All Reviews
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              <span className="text-[#f97316]">#{review.qb_record_id}</span> {review.customer_name}
            </h1>
            <p className="text-xs text-[#555]">{review.state} · {review.review_date} · {review.total_photos} photos</p>
          </div>
          <div className="flex items-center gap-3">
            <DispositionBadge disposition={review.disposition as DispositionType} />
            {review.drive_folder_url && (
              <a href={review.drive_folder_url} target="_blank" rel="noopener noreferrer"
                 className="btn-ghost inline-flex items-center gap-1 text-xs">
                <ExternalLink size={12} /> Report
              </a>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <div className="text-[10px] uppercase tracking-[2px] text-[#555] mb-1">Completeness</div>
            <div className="text-2xl font-bold" style={{ color: completeColor }}>{review.completeness_score}%</div>
          </div>
          <div className="stat-card">
            <div className="text-[10px] uppercase tracking-[2px] text-[#555] mb-1">Confidence</div>
            <div className="text-2xl font-bold text-[#60a5fa]">{review.overall_confidence}%</div>
          </div>
          <div className="stat-card">
            <div className="text-[10px] uppercase tracking-[2px] text-[#555] mb-1">Photos</div>
            <div className="text-2xl font-bold text-[#f97316]">{review.total_photos}</div>
          </div>
          <div className="stat-card">
            <div className="text-[10px] uppercase tracking-[2px] text-[#555] mb-1">Quality Flags</div>
            <div className="text-2xl font-bold text-[#f59e0b]">{review.quality_flags?.length || 0}</div>
          </div>
        </div>

        {/* Missing + action items */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Missing categories */}
          <div className="card p-5">
            <h3 className="text-[10px] uppercase tracking-[2px] text-[#f97316] mb-3">Missing Categories</h3>
            {review.missing_categories?.length ? (
              <div className="flex flex-wrap gap-2">
                {review.missing_categories.map(c => (
                  <span key={c} className="badge" style={{ background: '#450a0a', color: '#f87171' }}>
                    <XCircle size={10} className="mr-1" />{catLabel(c)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#4ade80]">✅ All required categories present</p>
            )}
          </div>

          {/* Action items */}
          <div className="card p-5">
            <h3 className="text-[10px] uppercase tracking-[2px] text-[#f97316] mb-3">Action Items</h3>
            {review.action_items?.length ? (
              <div className="space-y-2">
                {review.action_items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-[#f97316] text-black text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[#ccc]">{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#4ade80]">✅ No action items</p>
            )}
          </div>
        </div>

        {/* Quality flags */}
        {review.quality_flags?.length > 0 && (
          <div className="card p-5 mb-8">
            <h3 className="text-[10px] uppercase tracking-[2px] text-[#f97316] mb-3">Quality Flags</h3>
            <div className="space-y-1">
              {review.quality_flags.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#fbbf24]">
                  <AlertTriangle size={12} /> {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo results grid */}
        <div className="mb-8">
          <h3 className="text-[10px] uppercase tracking-[2px] text-[#f97316] mb-4">
            Photo Analysis ({photos.length} photos)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(grouped).map(([cat, catPhotos]) => (
              <div key={cat} className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera size={13} className="text-[#f97316]" />
                    <span className="font-semibold text-sm">{catLabel(cat)}</span>
                  </div>
                  <span className="text-[10px] text-[#555]">{catPhotos.length} photo{catPhotos.length > 1 ? 's' : ''}</span>
                </div>
                <div className="p-4 space-y-3">
                  {catPhotos.map((p) => (
                    <div key={p.id} className="text-xs space-y-2">
                      {/* Photo image */}
                      {p.photo_url ? (
                        <a href={`/api/photos?url=${encodeURIComponent(p.photo_url)}`} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/photos?url=${encodeURIComponent(p.photo_url)}`}
                            alt={`${catLabel(cat)} #${p.photo_index}`}
                            className="w-full rounded-lg border border-[#222] hover:border-[#f97316] transition-colors cursor-pointer"
                            style={{ maxHeight: 240, objectFit: 'cover' }}
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-24 bg-[#0a0a0a] rounded-lg border border-[#222] flex items-center justify-center">
                          <Camera size={20} className="text-[#333]" />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {p.vision_skipped ? (
                          <span className="tag">Site photo (no vision)</span>
                        ) : (
                          <>
                            <span className="badge" style={{
                              background: (p.quality_score || 0) >= 8 ? '#14532d' : (p.quality_score || 0) >= 6 ? '#92400e' : '#991b1b',
                              color: (p.quality_score || 0) >= 8 ? '#4ade80' : (p.quality_score || 0) >= 6 ? '#fbbf24' : '#f87171',
                            }}>
                              Q: {p.quality_score}/10
                            </span>
                            {p.design_ready ? (
                              <span className="badge" style={{ background: '#14532d', color: '#4ade80' }}>
                                <CheckCircle size={10} className="mr-1" />Ready
                              </span>
                            ) : (
                              <span className="badge" style={{ background: '#991b1b', color: '#f87171' }}>
                                <XCircle size={10} className="mr-1" />Reshoot
                              </span>
                            )}
                          </>
                        )}
                        {p.file_size_kb && (
                          <span className="text-[#444]">{p.file_size_kb}KB</span>
                        )}
                      </div>
                      {p.issues?.length > 0 && (
                        <div className="text-[#fb923c] space-y-0.5">
                          {p.issues.map((issue, j) => (
                            <div key={j}>⚠ {issue}</div>
                          ))}
                        </div>
                      )}
                      {p.extracted_data && Object.keys(p.extracted_data).length > 0 && (
                        <div className="bg-[#0a0a0a] rounded p-2 mt-1 space-y-0.5">
                          {Object.entries(p.extracted_data).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="text-[#555]">{k.replace(/_/g, ' ')}</span>
                              <span className="text-white font-medium">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Extracted data summary */}
        {review.extracted_data && Object.keys(review.extracted_data).length > 0 && (
          <div className="card p-5 mb-8">
            <h3 className="text-[10px] uppercase tracking-[2px] text-[#f97316] mb-3">Extracted Data Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(review.extracted_data).map(([cat, data]) => (
                <div key={cat} className="bg-[#0a0a0a] rounded-lg p-4">
                  <div className="text-xs font-semibold text-[#f97316] mb-2">{catLabel(cat)}</div>
                  <div className="space-y-1 text-xs">
                    {Object.entries(data as Record<string, unknown>).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-[#555]">{k.replace(/_/g, ' ')}</span>
                        <span className="text-white">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous feedback */}
        {feedback.length > 0 && (
          <div className="card p-5 mb-8">
            <h3 className="text-[10px] uppercase tracking-[2px] text-[#f97316] mb-3">Design Team Feedback</h3>
            {feedback.map(fb => (
              <div key={fb.id} className="border-b border-[#1a1a1a] pb-3 mb-3 last:border-0 last:mb-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-sm">{fb.reviewer_name || 'Anonymous'}</span>
                  <span className="badge" style={{
                    background: fb.human_disposition === 'approve' ? '#14532d' : fb.human_disposition === 'reject' ? '#991b1b' : '#92400e',
                    color: fb.human_disposition === 'approve' ? '#4ade80' : fb.human_disposition === 'reject' ? '#f87171' : '#fbbf24',
                  }}>
                    {fb.human_disposition || 'No call'}
                  </span>
                  <span className="text-[10px] text-[#444]">Conf: {fb.confidence_rating}/5</span>
                </div>
                {fb.human_caught && <p className="text-xs text-[#888] mb-1">🧠 Human caught: {fb.human_caught}</p>}
                {fb.ai_caught && <p className="text-xs text-[#888] mb-1">🤖 AI caught: {fb.ai_caught}</p>}
                {fb.patterns && <p className="text-xs text-[#888]">📝 Pattern: {fb.patterns}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Feedback form */}
        {!fbSaved ? (
          <div className="card p-5 mb-8 border-[#f97316]/20">
            <h3 className="text-[10px] uppercase tracking-[2px] text-[#f97316] mb-4">Submit Feedback</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] uppercase tracking-[2px] text-[#555] block mb-1">Your Name</label>
                <input value={fbName} onChange={e => setFbName(e.target.value)} placeholder="e.g. Deven Smith" className="w-full" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[2px] text-[#555] block mb-1">Your Call</label>
                <div className="flex gap-2 mt-1">
                  {['approve', 'flag', 'reject'].map(d => (
                    <button key={d} onClick={() => setFbDisp(d)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                        fbDisp === d ? 'border-[#f97316] bg-[#f97316]/10 text-[#f97316]' : 'border-[#2a2a2a] text-[#555]'
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
              <input type="range" min={1} max={5} value={fbConf} onChange={e => setFbConf(Number(e.target.value))}
                className="accent-[#f97316]" />
              <span className="ml-2 text-lg font-bold text-[#f97316]">{fbConf}</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] uppercase tracking-[2px] text-[#555] block mb-1">What AI caught that you&apos;d have missed</label>
                <textarea value={fbAICaught} onChange={e => setFbAICaught(e.target.value)} rows={2} className="w-full" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[2px] text-[#555] block mb-1">What you caught that AI missed</label>
                <textarea value={fbHumanCaught} onChange={e => setFbHumanCaught(e.target.value)} rows={2} className="w-full" />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-[2px] text-[#555] block mb-1">Patterns to learn</label>
              <textarea value={fbPatterns} onChange={e => setFbPatterns(e.target.value)} rows={2} className="w-full"
                placeholder="e.g. We don't need lumber grade stamps in FL" />
            </div>
            <button onClick={submitFeedback} disabled={fbSaving} className="btn-primary">
              {fbSaving ? 'Saving...' : 'Submit Feedback'}
            </button>
          </div>
        ) : (
          <div className="card p-8 text-center mb-8">
            <CheckCircle size={32} className="mx-auto text-[#22c55e] mb-3" />
            <h3 className="font-bold text-lg text-[#22c55e]">Feedback Received</h3>
            <p className="text-xs text-[#555] mt-1">Thanks — this helps the AI improve.</p>
          </div>
        )}

        {/* Error */}
        {review.error && (
          <div className="card p-5 border-red-900/50 mb-8">
            <h3 className="text-[10px] uppercase tracking-[2px] text-red-400 mb-2">Error</h3>
            <p className="text-sm text-red-300">{review.error}</p>
          </div>
        )}
      </main>
    </>
  )
}
