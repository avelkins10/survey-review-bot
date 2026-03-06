'use client'

import { useEffect, useState, useCallback } from 'react'
import Nav from '@/components/nav'
import Link from 'next/link'
import { CheckCircle, XCircle, Clock, Brain, AlertTriangle, Eye, MessageSquare, RefreshCw, Loader2, ChevronDown } from 'lucide-react'

interface TrainingItem {
  id: string
  feedback_id: number
  review_id: number
  type: 'disposition_correction' | 'missed_issue' | 'false_flag' | 'pattern'
  source: string
  created_at: string
  bot_said: string
  human_said: string
  detail: string
  training_status: 'pending' | 'accepted' | 'declined'
  training_notes: string | null
  project_id: number | null
  customer_name: string | null
}

interface Stats {
  total: number
  pending: number
  accepted: number
  declined: number
  by_type: {
    disposition_corrections: number
    missed_issues: number
    false_flags: number
    patterns: number
  }
}

const TYPE_CONFIG = {
  disposition_correction: { label: 'Disposition Override', icon: AlertTriangle, color: '#f59e0b', bg: '#92400e' },
  missed_issue: { label: 'Bot Missed', icon: Eye, color: '#ef4444', bg: '#991b1b' },
  false_flag: { label: 'Bot Caught (Validated)', icon: CheckCircle, color: '#22c55e', bg: '#14532d' },
  pattern: { label: 'New Pattern', icon: Brain, color: '#818cf8', bg: '#312e81' },
}

const STATUS_CONFIG = {
  pending: { label: 'Pending Review', icon: Clock, color: '#f59e0b' },
  accepted: { label: 'Accepted', icon: CheckCircle, color: '#22c55e' },
  declined: { label: 'Declined', icon: XCircle, color: '#ef4444' },
}

export default function TrainingPage() {
  const [items, setItems] = useState<TrainingItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    const resp = await fetch(`/api/training?status=${filter}`)
    const data = await resp.json()
    setItems(data.items || [])
    setStats(data.stats || null)
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchData() }, [fetchData])

  async function updateStatus(item: TrainingItem, status: 'accepted' | 'declined') {
    setSavingId(item.id)
    const notes = noteInputs[item.id] || item.training_notes || null
    await fetch('/api/training', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedback_id: item.feedback_id,
        training_status: status,
        training_notes: notes,
      }),
    })
    // Update local state
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, training_status: status, training_notes: notes } : i
    ))
    setSavingId(null)
  }

  async function saveNotes(item: TrainingItem) {
    setSavingId(item.id)
    await fetch('/api/training', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedback_id: item.feedback_id,
        training_status: item.training_status,
        training_notes: noteInputs[item.id] || '',
      }),
    })
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, training_notes: noteInputs[item.id] || '' } : i
    ))
    setSavingId(null)
  }

  const filtered = typeFilter === 'all' ? items : items.filter(i => i.type === typeFilter)

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Training <span className="text-[#f97316]">Log</span>
            </h1>
            <p className="text-xs text-[#555]">
              What the bot has learned from HITL reviews · Accept or decline each lesson
            </p>
          </div>
          <button onClick={fetchData} className="btn-ghost inline-flex items-center gap-1.5 text-xs">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* How it works */}
        <div className="card p-4 mb-6 border-[#f97316]/20">
          <div className="flex items-start gap-3">
            <Brain size={16} className="text-[#f97316] mt-0.5 flex-shrink-0" />
            <div className="text-xs text-[#888]">
              <p className="text-[#ccc] font-medium mb-1">How the learning loop works:</p>
              <p>Every HITL review generates training items: disposition overrides, missed issues, validated catches, and new patterns.
              <strong className="text-[#f97316]"> Accept</strong> items to teach the bot. <strong className="text-[#ef4444]">Decline</strong> items that are wrong or not useful.
              Accepted items feed into the bot&apos;s vision prompts on future analyses.</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={12} className="text-[#f59e0b]" />
                <div className="text-[10px] uppercase tracking-[2px] text-[#555]">Pending</div>
              </div>
              <div className="text-2xl font-bold text-[#f59e0b]">{stats.pending}</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={12} className="text-[#22c55e]" />
                <div className="text-[10px] uppercase tracking-[2px] text-[#555]">Accepted</div>
              </div>
              <div className="text-2xl font-bold text-[#22c55e]">{stats.accepted}</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-1">
                <XCircle size={12} className="text-[#ef4444]" />
                <div className="text-[10px] uppercase tracking-[2px] text-[#555]">Declined</div>
              </div>
              <div className="text-2xl font-bold text-[#ef4444]">{stats.declined}</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-1">
                <Brain size={12} className="text-[#f97316]" />
                <div className="text-[10px] uppercase tracking-[2px] text-[#555]">Total Lessons</div>
              </div>
              <div className="text-2xl font-bold text-[#f97316]">{stats.total}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1">
            {(['all', 'pending', 'accepted', 'declined'] as const).map(s => {
              const sc = s === 'all' ? null : STATUS_CONFIG[s]
              return (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                    filter === s ? 'border-[#f97316] bg-[#f97316]/10 text-[#f97316]' : 'border-[#222] text-[#555] hover:border-[#444]'
                  }`}>
                  {s === 'all' ? 'All' : sc?.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {(['all', 'disposition_correction', 'missed_issue', 'false_flag', 'pattern'] as const).map(t => {
              const tc = t === 'all' ? null : TYPE_CONFIG[t]
              return (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors inline-flex items-center gap-1 ${
                    typeFilter === t ? 'border-[#f97316] bg-[#f97316]/10 text-[#f97316]' : 'border-[#222] text-[#555] hover:border-[#444]'
                  }`}>
                  {tc && <tc.icon size={9} />}
                  {t === 'all' ? 'All Types' : tc?.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Training items */}
        {loading ? (
          <div className="text-center py-16 text-[#555]">
            <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
            <p className="text-xs">Loading training data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#555]">
            <Brain size={32} className="mx-auto mb-3 text-[#333]" />
            <p className="text-sm">No training items found</p>
            <p className="text-xs mt-1">Submit HITL reviews on surveys to generate training data</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => {
              const tc = TYPE_CONFIG[item.type]
              const sc = STATUS_CONFIG[item.training_status]
              const Icon = tc.icon
              const expanded = expandedId === item.id

              return (
                <div key={item.id} className="card overflow-hidden">
                  {/* Header */}
                  <div
                    className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                  >
                    <span className="badge" style={{ background: tc.bg, color: tc.color }}>
                      <Icon size={10} className="mr-1" />{tc.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{item.detail.slice(0, 80)}{item.detail.length > 80 ? '...' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#555] mt-0.5">
                        {item.project_id && (
                          <Link href={`/reviews/${item.review_id}`} className="text-[#f97316] hover:underline" onClick={e => e.stopPropagation()}>
                            #{item.project_id}
                          </Link>
                        )}
                        <span>{item.customer_name}</span>
                        <span>·</span>
                        <span>{item.source}</span>
                        <span>·</span>
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className="badge" style={{ background: 'transparent', color: sc.color, border: `1px solid ${sc.color}33` }}>
                      <sc.icon size={10} className="mr-1" />{sc.label}
                    </span>
                    <ChevronDown size={14} className={`text-[#555] transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="px-4 py-3 border-t border-[#222] bg-[#0a0a0a]">
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-[2px] text-[#ef4444] mb-1">🤖 Bot Said</div>
                          <div className="text-sm bg-[#111] rounded p-2 border border-[#222]">{item.bot_said}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[2px] text-[#22c55e] mb-1">👤 Human Said</div>
                          <div className="text-sm bg-[#111] rounded p-2 border border-[#222]">{item.human_said}</div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-[10px] uppercase tracking-[2px] text-[#555] mb-1">Detail</div>
                        <div className="text-sm text-[#ccc]">{item.detail}</div>
                      </div>

                      {/* Notes */}
                      <div className="mb-4">
                        <div className="text-[10px] uppercase tracking-[2px] text-[#555] mb-1 flex items-center gap-1">
                          <MessageSquare size={9} /> Training Notes
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={noteInputs[item.id] ?? item.training_notes ?? ''}
                            onChange={e => setNoteInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Add notes to refine this lesson..."
                            className="flex-1 text-xs"
                            onBlur={() => {
                              if (noteInputs[item.id] !== undefined && noteInputs[item.id] !== (item.training_notes || '')) {
                                saveNotes(item)
                              }
                            }}
                          />
                          {savingId === item.id && <Loader2 size={14} className="animate-spin text-[#f97316]" />}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateStatus(item, 'accepted')}
                          disabled={savingId === item.id}
                          className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 ${
                            item.training_status === 'accepted'
                              ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]'
                              : 'border-[#222] text-[#555] hover:border-[#22c55e] hover:text-[#22c55e]'
                          }`}
                        >
                          <CheckCircle size={11} /> Accept — Bot Should Learn This
                        </button>
                        <button
                          onClick={() => updateStatus(item, 'declined')}
                          disabled={savingId === item.id}
                          className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 ${
                            item.training_status === 'declined'
                              ? 'border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]'
                              : 'border-[#222] text-[#555] hover:border-[#ef4444] hover:text-[#ef4444]'
                          }`}
                        >
                          <XCircle size={11} /> Decline — Wrong Lesson
                        </button>
                        <Link
                          href={`/reviews/${item.review_id}`}
                          className="btn-ghost text-xs py-1.5 px-3 ml-auto"
                        >
                          View Review →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
