import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// QuickBase config
const QB_TOKEN = process.env.QB_TOKEN || 'b6um6p_p3bs_0_cjsb26jc5f93zzdkmmkjfeg7d4r'
const QB_REALM = 'kin.quickbase.com'
const QB_TABLE = 'br9kwm8na'

const QB_FID = {
  record_id: 3,
  customer_name: 6,
  survey_status: 162,
  survey_submitted_date: 164,
  state: 189,
  arrivy_task_id: 2685,
}

interface QBSurvey {
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

// GET /api/surveys — pull submitted surveys from QB, enrich with review status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const statusFilter = searchParams.get('status') || 'Submitted'

  try {
    // 1. Query QuickBase for surveys
    const where = statusFilter === 'all'
      ? `{${QB_FID.survey_submitted_date}.OAF.'01-01-2025'}`
      : `{${QB_FID.survey_status}.EX.'${statusFilter}'}AND{${QB_FID.survey_submitted_date}.OAF.'01-01-2025'}`

    const qbResp = await fetch('https://api.quickbase.com/v1/records/query', {
      method: 'POST',
      headers: {
        'QB-Realm-Hostname': QB_REALM,
        'Authorization': `QB-USER-TOKEN ${QB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: QB_TABLE,
        select: Object.values(QB_FID),
        where,
        sortBy: [{ fieldId: QB_FID.survey_submitted_date, order: 'DESC' }],
        options: { top: limit },
      }),
    })

    if (!qbResp.ok) {
      const err = await qbResp.text()
      return NextResponse.json({ error: `QuickBase error: ${err}` }, { status: 502 })
    }

    const qbData = await qbResp.json()
    const records = qbData.data || []

    // 2. Get existing reviews from Supabase
    const qbIds = records.map((r: Record<string, { value: unknown }>) =>
      Number(r[String(QB_FID.record_id)]?.value || 0)
    ).filter((id: number) => id > 0)

    const { data: reviews } = await sb
      .from('reviews')
      .select('id, qb_record_id, disposition')
      .in('qb_record_id', qbIds)

    const reviewMap = new Map(
      (reviews || []).map(r => [r.qb_record_id, r])
    )

    // 3. Get queue status from surveys table
    const { data: queuedSurveys } = await sb
      .from('surveys')
      .select('qb_record_id, survey_status')
      .in('qb_record_id', qbIds)
      .eq('survey_status', 'queued_for_analysis')

    const queueMap = new Map(
      (queuedSurveys || []).map(q => [q.qb_record_id, 'pending'])
    )

    // 4. Build response
    const surveys: QBSurvey[] = records.map((r: Record<string, { value: unknown }>) => {
      const qbId = Number(r[String(QB_FID.record_id)]?.value || 0)
      const review = reviewMap.get(qbId)
      const queueStatus = queueMap.get(qbId)

      let reviewStatus: QBSurvey['review_status'] = 'not_reviewed'
      if (queueStatus === 'pending') reviewStatus = 'queued'
      else if (review) reviewStatus = 'reviewed'

      return {
        qb_record_id: qbId,
        customer_name: String(r[String(QB_FID.customer_name)]?.value || 'Unknown'),
        state: r[String(QB_FID.state)]?.value ? String(r[String(QB_FID.state)]?.value) : null,
        survey_status: String(r[String(QB_FID.survey_status)]?.value || ''),
        arrivy_task_id: r[String(QB_FID.arrivy_task_id)]?.value ? String(r[String(QB_FID.arrivy_task_id)]?.value) : null,
        survey_submitted_date: r[String(QB_FID.survey_submitted_date)]?.value ? String(r[String(QB_FID.survey_submitted_date)]?.value) : null,
        review_status: reviewStatus,
        review_id: review?.id || null,
        disposition: review?.disposition || null,
      }
    })

    return NextResponse.json(surveys)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
