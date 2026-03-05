import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/reviews — Python bot pushes review results here
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      project_id,
      customer_name,
      state,
      ai_disposition,
      ai_completeness,
      ai_confidence,
      total_photos,
      missing_categories,
      quality_flags,
      action_items,
      extracted_data,
      drive_folder_url,
      arrivy_task_id,
      photos,
    } = body

    // Upsert survey record
    const { data: surveyData } = await sb
      .from('surveys')
      .upsert({
        qb_record_id: project_id,
        customer_name,
        state,
        survey_status: 'Submitted',
        arrivy_task_id,
      }, { onConflict: 'qb_record_id' })
      .select('id')
      .single()

    // Insert review
    const { data: review, error: reviewErr } = await sb
      .from('reviews')
      .insert({
        survey_id: surveyData?.id || null,
        qb_record_id: project_id,
        customer_name,
        state,
        review_date: new Date().toISOString().split('T')[0],
        disposition: ai_disposition || 'FLAG_FOR_REVIEW',
        completeness_score: Math.round((ai_completeness || 0) * 100),
        overall_confidence: Math.round((ai_confidence || 0) * 100),
        total_photos: total_photos || 0,
        missing_categories: missing_categories || [],
        quality_flags: quality_flags || [],
        action_items: action_items || [],
        extracted_data: extracted_data || {},
        drive_folder_url,
      })
      .select('id')
      .single()

    if (reviewErr) {
      return NextResponse.json({ error: reviewErr.message }, { status: 500 })
    }

    const reviewId = review!.id

    // Insert photo results
    if (photos?.length) {
      const photoRows = photos.map((p: Record<string, unknown>) => ({
        review_id: reviewId,
        category_key: p.category_key,
        arrivy_label: p.arrivy_label,
        photo_index: p.photo_index || 1,
        file_size_kb: p.file_size_kb,
        quality_score: p.ai_quality_score,
        confirmed: p.ai_confirmed ?? true,
        design_ready: p.ai_design_ready ?? true,
        issues: p.ai_issues || [],
        extracted_data: p.ai_extracted_data || {},
        vision_skipped: p.ai_quality_score == null,
        arrivy_file_id: p.arrivy_file_id,
        photo_url: p.photo_url,
      }))

      const { error: photoErr } = await sb.from('photo_results').insert(photoRows)
      if (photoErr) {
        console.error('Photo insert error:', photoErr.message)
      }
    }

    return NextResponse.json({ id: reviewId, status: 'ok' })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// GET /api/reviews — list recent reviews
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const disposition = searchParams.get('disposition')

  let query = sb
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (disposition) {
    query = query.eq('disposition', disposition)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
