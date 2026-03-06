import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/surveys/[id]/analyze — upsert survey record + mark for analysis
// Uses the existing surveys table (survey_status = 'queued_for_analysis')
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const qbRecordId = parseInt(id)

  if (!qbRecordId) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  try {
    const body = await req.json().catch(() => ({}))

    // Check if already reviewed
    const { data: existingReview } = await sb
      .from('reviews')
      .select('id')
      .eq('qb_record_id', qbRecordId)
      .limit(1)

    if (existingReview?.length) {
      return NextResponse.json({
        status: 'already_reviewed',
        review_id: existingReview[0].id,
        message: `Survey #${qbRecordId} already has a review`,
      })
    }

    // Upsert into surveys table with status = 'queued_for_analysis'
    const { data, error } = await sb
      .from('surveys')
      .upsert({
        qb_record_id: qbRecordId,
        customer_name: body.customer_name || 'Unknown',
        state: body.state || null,
        arrivy_task_id: body.arrivy_task_id || null,
        survey_status: 'queued_for_analysis',
      }, { onConflict: 'qb_record_id' })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'queued',
      survey_id: data!.id,
      message: `Survey #${qbRecordId} queued for analysis. Run the bot on the Mac mini to process it.`,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
