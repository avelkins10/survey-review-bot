import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Auto-create tables via REST if they don't exist
// This is a bootstrap endpoint — call once after deploy
export async function POST() {
  try {
    // Check if reviews table exists by trying to query it
    const { error } = await sb.from('reviews').select('id').limit(1)

    if (error && error.code === '42P01') {
      // Table doesn't exist — need to run schema via SQL Editor
      return NextResponse.json({
        status: 'schema_needed',
        message: 'Tables do not exist yet. Run supabase-schema.sql in the Supabase Dashboard SQL Editor.',
        sql_url: `https://supabase.com/dashboard/project/qeuyupsztbhtwhuqksdm/sql`,
      }, { status: 503 })
    }

    if (error) {
      return NextResponse.json({ status: 'error', error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'ok', message: 'Schema exists and is ready.' })
  } catch (e: unknown) {
    return NextResponse.json({ status: 'error', error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}
