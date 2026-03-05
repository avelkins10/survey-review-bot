import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [reviewRes, photosRes, feedbackRes] = await Promise.all([
    sb.from('reviews').select('*').eq('id', id).single(),
    sb.from('photo_results').select('*').eq('review_id', id).order('category_key'),
    sb.from('feedback').select('*').eq('review_id', id).order('created_at', { ascending: false }),
  ])

  if (reviewRes.error) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  return NextResponse.json({
    review: reviewRes.data,
    photos: photosRes.data || [],
    feedback: feedbackRes.data || [],
  })
}
