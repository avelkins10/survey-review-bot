'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import StatCard from './stat-card'
import DispositionBadge from './disposition-badge'
import type { Review, DispositionType } from '@/lib/types'
import { Activity, Clock, Target, TrendingUp, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react'

interface DashboardData {
  stats: {
    total: number
    approved: number
    flagged: number
    rejected: number
    avgComplete: number
    processing: number
    readyForReview: number
    reviewed: number
  }
  avgReviewTimeHrs: number | null
  accuracyRate: number | null
  totalJudged: number
  agreements: number
  disagreements: number
  accuracyDetails: { reviewId: number; bot: string; human: string; agreed: boolean }[]
  volumeByDate: Record<string, number>
  reviews: Review[]
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const { stats, avgReviewTimeHrs, accuracyRate, totalJudged, volumeByDate, reviews } = data

  // Build simple bar chart data (last 14 days)
  const today = new Date()
  const chartDays: { date: string; label: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    chartDays.push({
      date: dateStr,
      label: format(d, 'MMM d'),
      count: volumeByDate[dateStr] || 0,
    })
  }
  const maxCount = Math.max(...chartDays.map(d => d.count), 1)

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">
          Survey Review <span className="text-[#f97316]">Dashboard</span>
        </h1>
        <p className="text-xs text-[#555]">AI-powered site survey photo QC · KIN Home Solar</p>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 size={12} className="text-[#60a5fa]" />
            <div className="text-[10px] uppercase tracking-[2px] text-[#555]">Processing</div>
          </div>
          <div className="text-2xl font-bold text-[#60a5fa]">{stats.processing}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={12} className="text-[#f59e0b]" />
            <div className="text-[10px] uppercase tracking-[2px] text-[#555]">Ready for Review</div>
          </div>
          <div className="text-2xl font-bold text-[#f59e0b]">{stats.readyForReview}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={12} className="text-[#22c55e]" />
            <div className="text-[10px] uppercase tracking-[2px] text-[#555]">HITL Reviewed</div>
          </div>
          <div className="text-2xl font-bold text-[#22c55e]">{stats.reviewed}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={12} className="text-[#f97316]" />
            <div className="text-[10px] uppercase tracking-[2px] text-[#555]">Total Reviews</div>
          </div>
          <div className="text-2xl font-bold text-[#f97316]">{stats.total}</div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Bot Approved" value={stats.approved} color="#22c55e" />
        <StatCard label="Bot Flagged" value={stats.flagged} color="#f59e0b" />
        <StatCard label="Bot Rejected" value={stats.rejected} color="#ef4444" />
        <StatCard label="Avg Completeness" value={`${stats.avgComplete}%`} color="#818cf8" />
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={12} className="text-[#60a5fa]" />
            <div className="text-[10px] uppercase tracking-[2px] text-[#555]">Avg Review Time</div>
          </div>
          <div className="text-2xl font-bold text-[#60a5fa]">
            {avgReviewTimeHrs !== null ? (
              avgReviewTimeHrs < 24 ? `${avgReviewTimeHrs}h` : `${Math.round(avgReviewTimeHrs / 24)}d`
            ) : '—'}
          </div>
        </div>
      </div>

      {/* Bot Accuracy + Volume Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Bot Accuracy */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-[#f97316]" />
            <h3 className="text-[10px] uppercase tracking-[2px] text-[#f97316]">Bot Accuracy vs HITL</h3>
          </div>
          {totalJudged > 0 ? (
            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-bold" style={{
                  color: accuracyRate! >= 80 ? '#22c55e' : accuracyRate! >= 60 ? '#f59e0b' : '#ef4444'
                }}>
                  {accuracyRate}%
                </span>
                <span className="text-xs text-[#555]">agreement rate ({totalJudged} reviewed)</span>
              </div>
              {/* Accuracy bar */}
              <div className="w-full h-3 bg-[#1a1a1a] rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${accuracyRate}%`,
                    background: accuracyRate! >= 80 ? '#22c55e' : accuracyRate! >= 60 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span className="text-[#888]">Agreed: {data.agreements}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                  <span className="text-[#888]">Disagreed: {data.disagreements}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-[#555]">No HITL reviews yet</p>
              <p className="text-[10px] text-[#333] mt-1">Submit feedback on reviews to track accuracy</p>
            </div>
          )}
        </div>

        {/* Volume Chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-[#f97316]" />
            <h3 className="text-[10px] uppercase tracking-[2px] text-[#f97316]">Review Volume (14 days)</h3>
          </div>
          <div className="flex items-end gap-1 h-32">
            {chartDays.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="text-[9px] text-[#555] mb-1">{d.count || ''}</div>
                <div
                  className="w-full rounded-t transition-all hover:opacity-80"
                  style={{
                    height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 8 : 2)}%`,
                    background: d.count > 0 ? '#f97316' : '#1a1a1a',
                    minHeight: 2,
                  }}
                />
                <div className="text-[8px] text-[#333] mt-1 rotate-[-45deg] origin-top-left whitespace-nowrap">
                  {d.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disposition Breakdown */}
      <div className="card p-5 mb-8">
        <h3 className="text-[10px] uppercase tracking-[2px] text-[#f97316] mb-4">Disposition Breakdown</h3>
        {stats.total > 0 ? (
          <div>
            {/* Stacked bar */}
            <div className="w-full h-6 rounded-full overflow-hidden flex mb-3">
              {stats.approved > 0 && (
                <div style={{ width: `${(stats.approved / stats.total) * 100}%`, background: '#22c55e' }}
                     className="h-full transition-all" />
              )}
              {stats.flagged > 0 && (
                <div style={{ width: `${(stats.flagged / stats.total) * 100}%`, background: '#f59e0b' }}
                     className="h-full transition-all" />
              )}
              {stats.rejected > 0 && (
                <div style={{ width: `${(stats.rejected / stats.total) * 100}%`, background: '#ef4444' }}
                     className="h-full transition-all" />
              )}
            </div>
            <div className="flex gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#22c55e]" />
                <span className="text-[#888]">Approved: {stats.approved} ({Math.round((stats.approved / stats.total) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#f59e0b]" />
                <span className="text-[#888]">Flagged: {stats.flagged} ({Math.round((stats.flagged / stats.total) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#ef4444]" />
                <span className="text-[#888]">Rejected: {stats.rejected} ({Math.round((stats.rejected / stats.total) * 100)}%)</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#555]">No reviews yet</p>
        )}
      </div>

      {/* Recent Reviews Table */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Reviews</h2>
          <Link href="/reviews" className="text-[10px] text-[#f97316] hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#222] text-[10px] uppercase tracking-[2px] text-[#555]">
                <th className="text-left py-3 px-4">Project</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">State</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Bot Disposition</th>
                <th className="text-right py-3 px-4">Photos</th>
                <th className="text-right py-3 px-4">Flags</th>
              </tr>
            </thead>
            <tbody>
              {reviews.slice(0, 10).map(r => (
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
                    <DispositionBadge disposition={r.disposition as DispositionType} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#60a5fa]">{r.total_photos}</td>
                  <td className="py-3 px-4 text-right font-mono text-[#f59e0b]">{r.quality_flags?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
