import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  const id = params.id
  const body = await request.json()
  const status = body?.status
  if (!id || !status || !['published', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  const updates = { status, reviewed_at: new Date().toISOString() }
  if (status === 'published') updates.published_at = new Date().toISOString()
  const { error } = await supabase.from('happenings').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
