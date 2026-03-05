import Nav from '@/components/nav'
import ReviewTable from '@/components/review-table'
import { createClient } from '@supabase/supabase-js'
import type { Review } from '@/lib/types'

async function getReviews() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await sb
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  return (data || []) as Review[]
}

export const revalidate = 30

export default async function ReviewsPage() {
  const reviews = await getReviews()

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold">All <span className="text-[#f97316]">Reviews</span></h1>
          <p className="text-xs text-[#555] mt-1">{reviews.length} reviews total</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <ReviewTable reviews={reviews} />
        </div>
      </main>
    </>
  )
}
