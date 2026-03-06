import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/surveys/[id]/analyze — queue a survey for analysis
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

    // Check if already queued
    const { data: existing } = await sb
      .from('analysis_queue')
      .select('id, status')
      .eq('qb_record_id', qbRecordId)
      .in('status', ['pending', 'running'])
      .limit(1)

    if (existing?.length) {
      return NextResponse.json({
        status: 'already_queued',
        queue_id: existing[0].id,
        message: `Survey #${qbRecordId} is already ${existing[0].status}`,
      })
    }

    // Insert into queue
    const { data, error } = await sb
      .from('analysis_queue')
      .insert({
        qb_record_id: qbRecordId,
        customer_name: body.customer_name || 'Unknown',
        state: body.state || null,
        arrivy_task_id: body.arrivy_task_id || null,
        status: 'pending',
        requested_by: 'dashboard',
      })
      .select('id')
      .single()

    if (error) {
      // If table doesn't exist yet, return helpful message
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'Queue table not created yet. Run supabase-queue.sql in the Supabase Dashboard.',
        }, { status: 503 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'queued',
      queue_id: data!.id,
      message: `Survey #${qbRecordId} queued for analysis`,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
