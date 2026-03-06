import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/annotations?review_id=4
export async function GET(req: NextRequest) {
  const reviewId = req.nextUrl.searchParams.get('review_id')
  if (!reviewId) {
    return NextResponse.json({ error: 'review_id required' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('photo_annotations')
    .select('*')
    .eq('review_id', Number(reviewId))
    .order('created_at', { ascending: false })

  if (error) {
    // Table doesn't exist yet — return empty gracefully
    if (error.code === '42P01') {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

// POST /api/annotations — upsert annotation for a photo
// Body: { photo_result_id, review_id, verdict?, bounding_boxes?, notes?, annotated_by? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { photo_result_id, review_id, verdict, bounding_boxes, notes, annotated_by } = body

    if (!photo_result_id || !review_id) {
      return NextResponse.json({ error: 'photo_result_id and review_id required' }, { status: 400 })
    }

    // Check if table exists first
    const { error: tableCheck } = await sb.from('photo_annotations').select('id').limit(0)
    if (tableCheck?.code === '42P01') {
      return NextResponse.json({
        error: 'photo_annotations table not created yet. Run migration SQL in Supabase Dashboard.',
        migration_url: 'https://survey-review-bot.vercel.app/api/migrate',
      }, { status: 503 })
    }

    // Upsert: check if annotation exists for this photo
    const { data: existing } = await sb
      .from('photo_annotations')
      .select('id')
      .eq('photo_result_id', photo_result_id)
      .limit(1)
      .single()

    if (existing) {
      // Update
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (verdict !== undefined) updates.verdict = verdict
      if (bounding_boxes !== undefined) updates.bounding_boxes = bounding_boxes
      if (notes !== undefined) updates.notes = notes
      if (annotated_by !== undefined) updates.annotated_by = annotated_by

      const { data, error } = await sb
        .from('photo_annotations')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    } else {
      // Insert
      const { data, error } = await sb
        .from('photo_annotations')
        .insert({
          photo_result_id,
          review_id,
          verdict: verdict || null,
          bounding_boxes: bounding_boxes || [],
          notes: notes || null,
          annotated_by: annotated_by || 'james',
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
