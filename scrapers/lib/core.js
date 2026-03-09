// scrapers/lib/core.js
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export function normalizeText(str = '') {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

export function fingerprint(title, venue, date) {
  const raw = [normalizeText(title), normalizeText(venue || ''), date ? String(date).slice(0, 10) : ''].join('|')
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

export async function isKnown(fp) {
  const { data } = await supabase.from('happenings').select('id').eq('fingerprint', fp).maybeSingle()
  return !!data
}

export async function insertHappening(event) {
  const fp = fingerprint(event.title, event.venue, event.date)
  if (await isKnown(fp)) return { inserted: false, reason: 'duplicate' }
  const { error } = await supabase.from('happenings').insert({
    fingerprint: fp, title: event.title, venue: event.venue || null,
    neighborhood: event.neighborhood || null, date: event.date || null,
    time_display: event.timeDisplay || null, datetime_start: event.datetimeStart || null,
    category: event.category || null, description: event.description || null,
    image_url: event.imageUrl || null, source_url: event.sourceUrl,
    source_name: event.sourceName, editorial_score: event.editorialScore || null,
    editorial_notes: event.editorialNotes || null, status: 'pending_review'
  })
  if (error) throw new Error(`Insert failed: ${error.message}`)
  return { inserted: true, fingerprint: fp }
}

export async function startRun(sourceName) {
  try {
    const { data, error } = await supabase
      .from('scrape_runs')
      .insert({ source_name: sourceName, status: 'running' })
      .select('id')
      .single()

    if (error) {
      console.error(`[scrape_runs] startRun failed for "${sourceName}": ${error.message}`)
      return null
    }

    const runId = data?.id ?? null
    if (!runId) {
      console.error(`[scrape_runs] startRun returned no id for "${sourceName}"`)
      return null
    }

    return runId
  } catch (err) {
    console.error(`[scrape_runs] startRun threw for "${sourceName}":`, err)
    return null
  }
}

export async function finishRun(runId, { found, newCount, error } = {}) {
  if (!runId) {
    console.error('[scrape_runs] finishRun called without a valid runId, skipping update')
    return
  }

  await supabase.from('scrape_runs').update({
    finished_at: new Date().toISOString(), events_found: found || 0,
    events_new: newCount || 0, status: error ? 'error' : 'success', error_msg: error || null
  }).eq('id', runId)
}
