import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { review_id, reviewer_name, human_disposition, confidence_rating, ai_caught, human_caught, patterns, per_photo } = body

    if (!review_id) {
      return NextResponse.json({ error: 'review_id required' }, { status: 400 })
    }

    const { data, error } = await sb
      .from('feedback')
      .insert({
        review_id,
        reviewer_name,
        human_disposition,
        confidence_rating,
        ai_caught,
        human_caught,
        patterns,
        per_photo: per_photo || {},
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data!.id, status: 'ok' })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, review_id, reviewer_name, human_disposition, confidence_rating, ai_caught, human_caught, patterns, per_photo } = body

    if (!id && !review_id) {
      return NextResponse.json({ error: 'id or review_id required' }, { status: 400 })
    }

    const updateData = {
      reviewer_name,
      human_disposition,
      confidence_rating,
      ai_caught,
      human_caught,
      patterns,
      ...(per_photo !== undefined && { per_photo }),
    }

    if (id) {
      // Update by feedback ID
      const { data, error } = await sb
        .from('feedback')
        .update(updateData)
        .eq('id', id)
        .select('id')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ id: data!.id, status: 'ok' })
    } else {
      // Upsert — find existing by review_id, or create
      const { data: existing } = await sb
        .from('feedback')
        .select('id')
        .eq('review_id', review_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existing) {
        const { data, error } = await sb
          .from('feedback')
          .update(updateData)
          .eq('id', existing.id)
          .select('id')
          .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ id: data!.id, status: 'ok' })
      } else {
        const { data, error } = await sb
          .from('feedback')
          .insert({ review_id, ...updateData, per_photo: per_photo || {} })
          .select('id')
          .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ id: data!.id, status: 'ok' })
      }
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
