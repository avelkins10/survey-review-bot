import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/migrate — create photo_annotations table if missing
// Uses Supabase service role to check + insert test rows
export async function POST() {
  try {
    // Check if table exists
    const { error: checkErr } = await sb.from('photo_annotations').select('id').limit(1)

    if (checkErr && checkErr.code === '42P01') {
      // Table doesn't exist — we need DDL which can't run via REST
      // Return the SQL for manual execution
      return NextResponse.json({
        status: 'migration_needed',
        message: 'photo_annotations table does not exist. Run the SQL below in Supabase Dashboard SQL Editor.',
        sql_url: 'https://supabase.com/dashboard/project/qeuyupsztbhtwhuqksdm/sql',
        sql: `
CREATE TABLE IF NOT EXISTS photo_annotations (
  id SERIAL PRIMARY KEY,
  photo_result_id INTEGER NOT NULL REFERENCES photo_results(id) ON DELETE CASCADE,
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  verdict TEXT CHECK (verdict IN ('accept', 'decline')),
  bounding_boxes JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  annotated_by TEXT DEFAULT 'james',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_annotations_review ON photo_annotations(review_id);
CREATE INDEX IF NOT EXISTS idx_annotations_photo ON photo_annotations(photo_result_id);
        `.trim()
      })
    }

    if (checkErr) {
      return NextResponse.json({ status: 'error', error: checkErr.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'ok', message: 'photo_annotations table exists' })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}
