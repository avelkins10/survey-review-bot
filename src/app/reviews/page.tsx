import Nav from '@/components/nav'
import { createClient } from '@supabase/supabase-js'
import type { Review } from '@/lib/types'
import ReviewsClient from '@/components/reviews-client'

async function getReviewsData() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [reviewsRes, feedbackRes] = await Promise.all([
    sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(200),
    sb.from('feedback').select('review_id, human_disposition, created_at').order('created_at', { ascending: false }),
  ])

  const reviews = (reviewsRes.data || []) as Review[]
  const feedback = feedbackRes.data || []

  // Build feedback lookup
  const feedbackByReview = new Map<number, { human_disposition: string | null; created_at: string }>()
  for (const f of feedback) {
    if (!feedbackByReview.has(f.review_id)) feedbackByReview.set(f.review_id, f)
  }

  // Enrich reviews with pipeline status
  const enriched = reviews.map(r => {
    const fb = feedbackByReview.get(r.id)
    return {
      ...r,
      pipeline_status: fb ? 'review_completed' as const : 'ready_for_review' as const,
      human_disposition: fb?.human_disposition || null,
      human_reviewed_at: fb?.created_at || null,
    }
  })

  return enriched
}

export const revalidate = 30

export default async function ReviewsPage() {
  const reviews = await getReviewsData()

  return (
    <>
      <Nav />
      <ReviewsClient reviews={reviews} />
    </>
  )
}
