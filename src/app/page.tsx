import Nav from '@/components/nav'
import StatCard from '@/components/stat-card'
import ReviewTable from '@/components/review-table'
import { createClient } from '@supabase/supabase-js'
import type { Review } from '@/lib/types'

async function getStats() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: reviews, error } = await sb
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !reviews) return { reviews: [] as Review[], stats: { total: 0, approved: 0, flagged: 0, rejected: 0, avgComplete: 0 } }

  const total = reviews.length
  const approved = reviews.filter(r => r.disposition === 'APPROVE').length
  const flagged = reviews.filter(r => r.disposition === 'FLAG_FOR_REVIEW').length
  const rejected = reviews.filter(r => r.disposition === 'REJECT').length
  const avgComplete = total ? Math.round(reviews.reduce((s, r) => s + (r.completeness_score || 0), 0) / total) : 0

  return { reviews: reviews as Review[], stats: { total, approved, flagged, rejected, avgComplete } }
}

export const revalidate = 30

export default async function Dashboard() {
  const { reviews, stats } = await getStats()

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">
            Survey Review <span className="text-[#f97316]">Dashboard</span>
          </h1>
          <p className="text-xs text-[#555]">AI-powered site survey photo QC · KIN Home Solar</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total Reviews" value={stats.total} color="#60a5fa" />
          <StatCard label="Approved" value={stats.approved} color="#22c55e" />
          <StatCard label="Needs Review" value={stats.flagged} color="#f59e0b" />
          <StatCard label="Rejected" value={stats.rejected} color="#ef4444" />
          <StatCard label="Avg Complete" value={`${stats.avgComplete}%`} color="#f97316" />
        </div>

        {/* Recent Reviews */}
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Reviews</h2>
            <span className="text-[10px] text-[#555] uppercase tracking-wider">Last 50</span>
          </div>
          <ReviewTable reviews={reviews} />
        </div>
      </main>
    </>
  )
}
