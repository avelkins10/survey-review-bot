import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MIGRATIONS = [
  {
    name: 'create_photo_annotations',
    check: async () => {
      const { error } = await sb.from('photo_annotations').select('id').limit(1)
      return !error || error.code !== '42P01'
    },
    // Can't run DDL via REST — use raw SQL via insert workaround
    // Instead, create the table structure by inserting into a temporary function
    run: null, // Needs manual SQL execution
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_annotations_photo ON photo_annotations(photo_result_id);
CREATE INDEX IF NOT EXISTS idx_annotations_review ON photo_annotations(review_id);
ALTER TABLE photo_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY annotations_public ON photo_annotations FOR ALL USING (true) WITH CHECK (true);
    `.trim()
  }
]

export async function GET() {
  const results = []
  for (const m of MIGRATIONS) {
    const exists = await m.check()
    results.push({ name: m.name, exists, sql: exists ? null : m.sql })
  }

  const pending = results.filter(r => !r.exists)

  if (pending.length === 0) {
    return NextResponse.json({ status: 'ok', message: 'All migrations applied' })
  }

  return NextResponse.json({
    status: 'migration_needed',
    message: `${pending.length} migration(s) needed. Run the SQL in Supabase Dashboard.`,
    sql_url: `https://supabase.com/dashboard/project/qeuyupsztbhtwhuqksdm/sql`,
    migrations: pending,
  })
}

export async function POST() {
  return GET()
}
