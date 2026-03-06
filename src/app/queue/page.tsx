'use client'

import { useEffect, useState, useCallback } from 'react'
import Nav from '@/components/nav'
import DispositionBadge from '@/components/disposition-badge'
import type { DispositionType } from '@/lib/types'
import Link from 'next/link'
import { Play, RefreshCw, CheckCircle, Clock, Loader2, AlertTriangle, Search, Timer } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface QueueSurvey {
  qb_record_id: number
  customer_name: string
  state: string | null
  survey_status: string
  arrivy_task_id: string | null
  survey_submitted_date: string | null
  review_status: 'not_reviewed' | 'reviewed' | 'queued' | 'running'
  review_id: number | null
  disposition: string | null
}

const STATUS_CONFIG = {
  not_reviewed: { label: 'Awaiting Review', color: '#555', bg: '#1a1a1a', icon: Clock },
  queued: { label: 'Queued', color: '#f59e0b', bg: '#92400e', icon: Clock },
  running: { label: 'Analyzing...', color: '#60a5fa', bg: '#1e3a5f', icon: Loader2 },
  reviewed: { label: 'Reviewed', color: '#22c55e', bg: '#14532d', icon: CheckCircle },
}

export default function QueuePage() {
  const [surveys, setSurveys] = useState<QueueSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('Submitted')
  const [search, setSearch] = useState('')
  const [triggeringId, setTriggeringId] = useState<number | null>(null)

  const fetchSurveys = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const resp = await fetch(`/api/surveys?status=${filter}&limit=100`)
      if (!resp.ok) {
        const data = await resp.json()
        setError(data.error || 'Failed to load surveys')
        setSurveys([])
      } else {
        setSurveys(await resp.json())
      }
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchSurveys() }, [fetchSurveys])

  async function triggerAnalysis(survey: QueueSurvey) {
    setTriggeringId(survey.qb_record_id)
    try {
      const resp = await fetch(`/api/surveys/${survey.qb_record_id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: survey.customer_name,
          state: survey.state,
          arrivy_task_id: survey.arrivy_task_id,
        }),
      })
      const data = await resp.json()
      if (data.status === 'queued' || data.status === 'already_queued') {
        // Refresh to show updated status
        await fetchSurveys()
      } else if (data.error) {
        setError(data.error)
      }
    } catch {
      setError('Failed to trigger analysis')
    }
    setTriggeringId(null)
  }

  const filtered = search
    ? surveys.filter(s =>
        s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        String(s.qb_record_id).includes(search) ||
        (s.state || '').toLowerCase().includes(search.toLowerCase())
      )
    : surveys

  const counts = {
    total: surveys.length,
    awaiting: surveys.filter(s => s.review_status === 'not_reviewed').length,
    queued: surveys.filter(s => s.review_status === 'queued' || s.review_status === 'running').length,
    reviewed: surveys.filter(s => s.review_status === 'reviewed').length,
  }

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Survey <span className="text-[#f97316]">Queue</span>
            </h1>
            <p className="text-xs text-[#555]">Site surveys from QuickBase · Click &quot;Run Analysis&quot; to trigger AI review</p>
          </div>
          <button onClick={fetchSurveys} className="btn-ghost inline-flex items-center gap-1.5 text-xs">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="text-[10px] uppercase tracking-[2px] text-[#555] mb-1">Total</div>
            <div className="text-2xl font-bold text-[#60a5fa]">{counts.total}</div>
          </div>
          <div className="stat-card">
            <div className="text-[10px] uppercase tracking-[2px] text-[#555] mb-1">Awaiting Review</div>
            <div className="text-2xl font-bold text-[#f59e0b]">{counts.awaiting}</div>
          </div>
          <div className="stat-card">
            <div className="text-[10px] uppercase tracking-[2px] text-[#555] mb-1">In Queue</div>
            <div className="text-2xl font-bold text-[#818cf8]">{counts.queued}</div>
          </div>
          <div className="stat-card">
            <div className="text-[10px] uppercase tracking-[2px] text-[#555] mb-1">Reviewed</div>
            <div className="text-2xl font-bold text-[#22c55e]">{counts.reviewed}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1">
            {['Submitted', 'Approved', 'Scheduled', 'all'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30'
                    : 'text-[#555] border border-[#222] hover:border-[#444]'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, or state..."
              className="w-full pl-8 py-1.5 text-xs"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-900/50 text-red-300 text-sm mb-4">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-[#555]">
              <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
              <p className="text-xs">Loading surveys from QuickBase...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-[#555]">
              <p className="text-sm">No surveys found</p>
              <p className="text-xs mt-1">Try a different filter or search term</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#222] text-[10px] uppercase tracking-[2px] text-[#555]">
                    <th className="text-left py-3 px-4">Project</th>
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-left py-3 px-4">State</th>
                    <th className="text-left py-3 px-4">QB Status</th>
                    <th className="text-left py-3 px-4">Submitted</th>
                    <th className="text-left py-3 px-4">Review Status</th>
                    <th className="text-left py-3 px-4">Result</th>
                    <th className="text-right py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const sc = STATUS_CONFIG[s.review_status]
                    const Icon = sc.icon
                    return (
                      <tr key={s.qb_record_id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-[#f97316]">#{s.qb_record_id}</td>
                        <td className="py-3 px-4 font-medium">{s.customer_name}</td>
                        <td className="py-3 px-4 text-[#888]">{s.state || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="tag">{s.survey_status}</span>
                        </td>
                        <td className="py-3 px-4">
                          {s.survey_submitted_date ? (() => {
                            const submitted = new Date(s.survey_submitted_date)
                            const ago = formatDistanceToNow(submitted, { addSuffix: true })
                            const hoursAgo = (Date.now() - submitted.getTime()) / (1000 * 60 * 60)
                            const ageColor = hoursAgo > 48 ? '#ef4444' : hoursAgo > 24 ? '#f59e0b' : '#555'
                            return (
                              <div className="flex flex-col">
                                <span className="text-xs text-[#888]">{submitted.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: ageColor }}>
                                  <Timer size={9} />{ago}
                                </span>
                              </div>
                            )
                          })() : <span className="text-[#333]">—</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="badge gap-1"
                            style={{ background: sc.bg, color: sc.color }}
                          >
                            <Icon size={10} className={s.review_status === 'running' ? 'animate-spin' : ''} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {s.review_id ? (
                            <Link href={`/reviews/${s.review_id}`}>
                              <DispositionBadge disposition={s.disposition as DispositionType} />
                            </Link>
                          ) : (
                            <span className="text-[#333]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {s.review_status === 'not_reviewed' && s.arrivy_task_id ? (
                            <button
                              onClick={() => triggerAnalysis(s)}
                              disabled={triggeringId === s.qb_record_id}
                              className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                            >
                              {triggeringId === s.qb_record_id ? (
                                <><Loader2 size={11} className="animate-spin" /> Queuing...</>
                              ) : (
                                <><Play size={11} /> Run Analysis</>
                              )}
                            </button>
                          ) : s.review_status === 'queued' ? (
                            <span className="text-xs text-[#f59e0b]">In queue</span>
                          ) : s.review_status === 'running' ? (
                            <span className="text-xs text-[#60a5fa]">Analyzing...</span>
                          ) : s.review_status === 'reviewed' ? (
                            <Link href={`/reviews/${s.review_id}`} className="btn-ghost text-xs py-1.5 px-3">
                              View
                            </Link>
                          ) : !s.arrivy_task_id ? (
                            <span className="text-[10px] text-[#444]">No Arrivy ID</span>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
