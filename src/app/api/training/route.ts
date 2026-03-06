import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TrainingItem {
  id: string // feedback_id + type
  feedback_id: number
  review_id: number
  type: 'disposition_correction' | 'missed_issue' | 'false_flag' | 'pattern'
  source: string // reviewer name
  created_at: string
  // What happened
  bot_said: string
  human_said: string
  detail: string
  // Review status
  training_status: 'pending' | 'accepted' | 'declined'
  training_notes: string | null
  // Context
  project_id: number | null
  customer_name: string | null
}

// GET /api/training — derive training items from feedback + reviews
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status') || 'all'

  // Fetch all feedback with their reviews
  const { data: feedbackData, error: fbErr } = await sb
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (fbErr) return NextResponse.json({ error: fbErr.message }, { status: 500 })

  // Get review data for context
  const reviewIds = [...new Set((feedbackData || []).map(f => f.review_id))]
  const { data: reviews } = reviewIds.length > 0
    ? await sb.from('reviews').select('id, qb_record_id, customer_name, disposition, quality_flags, action_items').in('id', reviewIds)
    : { data: [] }

  const reviewMap = new Map((reviews || []).map(r => [r.id, r]))

  const items: TrainingItem[] = []

  for (const fb of (feedbackData || [])) {
    const review = reviewMap.get(fb.review_id)
    if (!review) continue

    // Training metadata stored in per_photo._training (JSONB workaround — no DDL access)
    const trainingMeta = fb.per_photo?._training || {}

    const base = {
      feedback_id: fb.id,
      review_id: fb.review_id,
      source: fb.reviewer_name || 'Anonymous',
      created_at: fb.created_at,
      project_id: review.qb_record_id,
      customer_name: review.customer_name,
      training_status: (trainingMeta.status || 'pending') as TrainingItem['training_status'],
      training_notes: trainingMeta.notes || null,
    }

    // 1. Disposition correction (bot and human disagree)
    if (fb.human_disposition && fb.human_disposition.toLowerCase() !== review.disposition.toLowerCase()) {
      items.push({
        ...base,
        id: `${fb.id}_disp`,
        type: 'disposition_correction',
        bot_said: `Disposition: ${review.disposition}`,
        human_said: `Disposition: ${fb.human_disposition}`,
        detail: `Bot called ${review.disposition}, human corrected to ${fb.human_disposition}. ${review.quality_flags?.length || 0} quality flags on this review.`,
      })
    }

    // 2. Issues human caught that bot missed
    if (fb.human_caught && fb.human_caught.trim()) {
      items.push({
        ...base,
        id: `${fb.id}_missed`,
        type: 'missed_issue',
        bot_said: 'Not flagged',
        human_said: fb.human_caught,
        detail: `Bot missed: ${fb.human_caught}`,
      })
    }

    // 3. Issues bot caught that human wouldn't have (false positive check)
    if (fb.ai_caught && fb.ai_caught.trim()) {
      const aiCaught = fb.ai_caught.startsWith('[') ? JSON.parse(fb.ai_caught).join(', ') : fb.ai_caught
      if (aiCaught) {
        items.push({
          ...base,
          id: `${fb.id}_caught`,
          type: 'false_flag',
          bot_said: `Flagged: ${aiCaught}`,
          human_said: 'Confirmed useful',
          detail: `AI caught issues human would have missed: ${aiCaught}`,
        })
      }
    }

    // 4. Patterns / rules to learn
    if (fb.patterns && fb.patterns.trim()) {
      items.push({
        ...base,
        id: `${fb.id}_pattern`,
        type: 'pattern',
        bot_said: 'No rule exists',
        human_said: fb.patterns,
        detail: `New pattern to learn: ${fb.patterns}`,
      })
    }
  }

  // Filter by status
  const filtered = statusFilter === 'all' ? items : items.filter(i => i.training_status === statusFilter)

  // Summary stats
  const stats = {
    total: items.length,
    pending: items.filter(i => i.training_status === 'pending').length,
    accepted: items.filter(i => i.training_status === 'accepted').length,
    declined: items.filter(i => i.training_status === 'declined').length,
    by_type: {
      disposition_corrections: items.filter(i => i.type === 'disposition_correction').length,
      missed_issues: items.filter(i => i.type === 'missed_issue').length,
      false_flags: items.filter(i => i.type === 'false_flag').length,
      patterns: items.filter(i => i.type === 'pattern').length,
    }
  }

  return NextResponse.json({ items: filtered, stats })
}

// PATCH /api/training — update training status on a feedback item
export async function PATCH(req: NextRequest) {
  try {
    const { feedback_id, training_status, training_notes } = await req.json()

    if (!feedback_id) return NextResponse.json({ error: 'feedback_id required' }, { status: 400 })
    if (!['pending', 'accepted', 'declined'].includes(training_status)) {
      return NextResponse.json({ error: 'training_status must be pending|accepted|declined' }, { status: 400 })
    }

    // Store training metadata in per_photo._training (JSONB — no DDL needed)
    const { data: existing } = await sb.from('feedback').select('per_photo').eq('id', feedback_id).single()
    if (!existing) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })

    const perPhoto = existing.per_photo || {}
    perPhoto._training = {
      status: training_status,
      notes: training_notes || perPhoto._training?.notes || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await sb
      .from('feedback')
      .update({ per_photo: perPhoto })
      .eq('id', feedback_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ status: 'ok' })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
