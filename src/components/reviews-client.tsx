'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import DispositionBadge from './disposition-badge'
import type { Review, DispositionType } from '@/lib/types'
import { CheckCircle, AlertTriangle, Clock, Search, ArrowRight } from 'lucide-react'

interface EnrichedReview extends Review {
  pipeline_status: 'ready_for_review' | 'review_completed'
  human_disposition: string | null
  human_reviewed_at: string | null
}

const PIPELINE_TABS = [
  { key: 'all', label: 'All', icon: null },
  { key: 'ready_for_review', label: 'Ready for Review', icon: AlertTriangle, color: '#f59e0b' },
  { key: 'review_completed', label: 'Review Completed', icon: CheckCircle, color: '#22c55e' },
] as const

export default function ReviewsClient({ reviews }: { reviews: EnrichedReview[] }) {
  const [tab, setTab] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filtered = reviews.filter(r => {
    if (tab !== 'all' && r.pipeline_status !== tab) return false
    if (search) {
      const q = search.toLowerCase()
      return r.customer_name.toLowerCase().includes(q) ||
        String(r.qb_record_id).includes(q) ||
        (r.state || '').toLowerCase().includes(q)
    }
    return true
  })

  const counts = {
    all: reviews.length,
    ready_for_review: reviews.filter(r => r.pipeline_status === 'ready_for_review').length,
    review_completed: reviews.filter(r => r.pipeline_status === 'review_completed').length,
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">All <span className="text-[#f97316]">Reviews</span></h1>
          <p className="text-xs text-[#555] mt-1">{reviews.length} reviews total</p>
        </div>
      </div>

      {/* Pipeline Tabs */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          {PIPELINE_TABS.map(t => {
            const Icon = t.icon
            const count = counts[t.key as keyof typeof counts]
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                  tab === t.key
                    ? 'bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30'
                    : 'text-[#555] border border-[#222] hover:border-[#444]'
                }`}
              >
                {Icon && <Icon size={11} />}
                {t.label}
                <span className="text-[10px] opacity-60">({count})</span>
              </button>
            )
          })}
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

      {/* Table */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#555]">
            <p className="text-sm">No reviews found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#222] text-[10px] uppercase tracking-[2px] text-[#555]">
                  <th className="text-left py-3 px-4">Project</th>
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">State</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Pipeline</th>
                  <th className="text-left py-3 px-4">Bot</th>
                  <th className="text-left py-3 px-4">Human</th>
                  <th className="text-center py-3 px-4">Match</th>
                  <th className="text-right py-3 px-4">Complete</th>
                  <th className="text-right py-3 px-4">Photos</th>
                  <th className="text-right py-3 px-4">Flags</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const matched = r.human_disposition
                    ? r.disposition === r.human_disposition
                    : null

                  return (
                    <tr key={r.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/reviews/${r.id}`} className="text-[#f97316] hover:underline font-mono text-xs">
                          #{r.qb_record_id}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-medium">{r.customer_name}</td>
                      <td className="py-3 px-4 text-[#888]">{r.state || '—'}</td>
                      <td className="py-3 px-4 text-[#888] text-xs">
                        {format(new Date(r.review_date), 'MMM d')}
                      </td>
                      <td className="py-3 px-4">
                        {r.pipeline_status === 'review_completed' ? (
                          <span className="badge gap-1" style={{ background: '#14532d', color: '#22c55e' }}>
                            <CheckCircle size={10} /> Reviewed
                          </span>
                        ) : (
                          <span className="badge gap-1" style={{ background: '#92400e', color: '#f59e0b' }}>
                            <Clock size={10} /> Awaiting HITL
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <DispositionBadge disposition={r.disposition as DispositionType} />
                      </td>
                      <td className="py-3 px-4">
                        {r.human_disposition ? (
                          <DispositionBadge disposition={r.human_disposition as DispositionType} />
                        ) : (
                          <span className="text-[#333]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {matched === null ? (
                          <span className="text-[#333]">—</span>
                        ) : matched ? (
                          <span className="text-[#22c55e] text-xs font-medium">✓ Match</span>
                        ) : (
                          <span className="text-[#ef4444] text-xs font-medium flex items-center justify-center gap-1">
                            <ArrowRight size={10} /> Differs
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span style={{
                          color: r.completeness_score >= 90 ? '#22c55e' : r.completeness_score >= 60 ? '#f59e0b' : '#ef4444'
                        }}>
                          {r.completeness_score}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#60a5fa]">{r.total_photos}</td>
                      <td className="py-3 px-4 text-right font-mono text-[#f59e0b]">{r.quality_flags?.length || 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
