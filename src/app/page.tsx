import Nav from '@/components/nav'
import { createClient } from '@supabase/supabase-js'
import type { Review } from '@/lib/types'
import DashboardClient from '@/components/dashboard-client'

async function getDashboardData() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [reviewsRes, feedbackRes, surveysRes] = await Promise.all([
    sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(200),
    sb.from('feedback').select('review_id, human_disposition, created_at').order('created_at', { ascending: false }),
    sb.from('surveys').select('qb_record_id, survey_submitted_date, survey_status, created_at, updated_at').order('created_at', { ascending: false }).limit(200),
  ])

  const reviews = (reviewsRes.data || []) as Review[]
  const feedback = feedbackRes.data || []
  const surveys = surveysRes.data || []

  // Feedback lookup
  const feedbackByReview = new Map<number, { human_disposition: string | null; created_at: string }>()
  for (const f of feedback) {
    if (!feedbackByReview.has(f.review_id)) feedbackByReview.set(f.review_id, f)
  }

  // Survey lookup for submission dates
  const surveyByQB = new Map<number, { survey_submitted_date: string | null }>()
  for (const s of surveys) {
    surveyByQB.set(s.qb_record_id, s)
  }

  // Stats
  const total = reviews.length
  const approved = reviews.filter(r => r.disposition === 'APPROVE').length
  const flagged = reviews.filter(r => r.disposition === 'FLAG_FOR_REVIEW').length
  const rejected = reviews.filter(r => r.disposition === 'REJECT').length
  const avgComplete = total ? Math.round(reviews.reduce((s, r) => s + (r.completeness_score || 0), 0) / total) : 0

  // Pipeline
  const reviewed = reviews.filter(r => feedbackByReview.has(r.id)).length
  const readyForReview = total - reviewed
  const processing = surveys.filter(s => s.survey_status === 'running' || s.survey_status === 'queued_for_analysis').length

  // Review time (submission → review created_at)
  const reviewTimes: number[] = []
  for (const r of reviews) {
    const survey = surveyByQB.get(r.qb_record_id)
    if (survey?.survey_submitted_date) {
      const parts = survey.survey_submitted_date.split('-')
      const submitted = new Date(+parts[0], +parts[1] - 1, +parts[2])
      const reviewed = new Date(r.created_at)
      const hours = (reviewed.getTime() - submitted.getTime()) / (1000 * 60 * 60)
      if (hours > 0 && hours < 720) reviewTimes.push(hours) // skip outliers
    }
  }
  const avgReviewTimeHrs = reviewTimes.length ? Math.round(reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length) : null

  // Bot accuracy (vs human feedback)
  let agreements = 0
  let disagreements = 0
  const accuracyDetails: { reviewId: number; bot: string; human: string; agreed: boolean }[] = []
  for (const r of reviews) {
    const fb = feedbackByReview.get(r.id)
    if (fb?.human_disposition) {
      const agreed = r.disposition === fb.human_disposition
      if (agreed) agreements++
      else disagreements++
      accuracyDetails.push({ reviewId: r.id, bot: r.disposition, human: fb.human_disposition, agreed })
    }
  }
  const totalJudged = agreements + disagreements
  const accuracyRate = totalJudged > 0 ? Math.round((agreements / totalJudged) * 100) : null

  // Volume by date (last 30 days)
  const volumeByDate: Record<string, number> = {}
  for (const r of reviews) {
    const d = r.review_date || r.created_at.split('T')[0]
    volumeByDate[d] = (volumeByDate[d] || 0) + 1
  }

  return {
    stats: { total, approved, flagged, rejected, avgComplete, processing, readyForReview, reviewed: reviewed },
    avgReviewTimeHrs,
    accuracyRate,
    totalJudged,
    agreements,
    disagreements,
    accuracyDetails,
    volumeByDate,
    reviews,
  }
}

export const revalidate = 30

export default async function Dashboard() {
  const data = await getDashboardData()

  return (
    <>
      <Nav />
      <DashboardClient data={data} />
    </>
  )
}
