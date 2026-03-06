import { NextRequest, NextResponse } from 'next/server'

const ARRIVY_AUTH_KEY = process.env.ARRIVY_AUTH_KEY || '0a27a7e3-e6b5'
const ARRIVY_AUTH_TOKEN = process.env.ARRIVY_AUTH_TOKEN || '5730gWxBjDzbQDEeFh3zrs'

// GET /api/photos?url=<arrivy_file_path>
// Proxies Arrivy photos through our app (they require auth headers)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const photoPath = searchParams.get('url')

  if (!photoPath) {
    return NextResponse.json({ error: 'url param required' }, { status: 400 })
  }

  // Only allow Arrivy URLs
  const fullUrl = photoPath.startsWith('http') ? photoPath : `https://app.arrivy.com${photoPath}`
  if (!fullUrl.includes('arrivy.com')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const resp = await fetch(fullUrl, {
      headers: {
        'X-Auth-Key': ARRIVY_AUTH_KEY,
        'X-Auth-Token': ARRIVY_AUTH_TOKEN,
      },
    })

    if (!resp.ok) {
      return NextResponse.json({ error: `Arrivy returned ${resp.status}` }, { status: resp.status })
    }

    const contentType = resp.headers.get('content-type') || 'image/jpeg'
    const buffer = await resp.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
