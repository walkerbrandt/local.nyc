// scrapers/lib/firecrawl.js
const FIRECRAWL_API = 'https://api.firecrawl.dev/v1'

const EXTRACTION_PROMPT = `You are extracting NYC cultural events from markdown content.
Return JSON only with this shape: {"events":[{"title":"","venue":"","date":"","time":"","description":"","url":"","image_url":""}]}
Extract all upcoming events, performances, screenings, concerts, talks, openings, and happenings.
For each event extract the title, venue, date, time, description, and URL when available.
Only extract actual events with specific dates — not general info pages or evergreen content.
Focus on one-time or limited-run events rather than ongoing exhibitions.`

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function callClaudeWithRetry(payload, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (data.type === 'error' && data.error?.type === 'overloaded_error') {
      console.log(`  [Claude] Overloaded, retrying in 10s (attempt ${i + 1}/${retries})`)
      await sleep(10000)
      continue
    }
    return data
  }
  console.log(`  [Claude] All retries failed, skipping source`)
  return null
}

export async function scrapeWithFirecrawl(url, sourceName) {
  console.log(`  [Firecrawl] Scraping ${sourceName}: ${url}`)

  const res = await fetch(`${FIRECRAWL_API}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
    },
    body: JSON.stringify({
      url,
      waitFor: 3000,
      onlyMainContent: false,
      formats: ['markdown']
    })
  })

  const data = await res.json()

  if (!data.success) {
    console.log(`  [Firecrawl] Failed for ${sourceName}:`, data.error || 'unknown error')
    return []
  }

  const markdown = data.markdown || data.data?.markdown || ''
  if (!markdown) {
    console.log(`  [Firecrawl] No markdown returned for ${sourceName}`)
    return []
  }

  const truncatedMarkdown = markdown.slice(0, 15000)

  const aiData = await callClaudeWithRetry({
    model: 'claude-sonnet-4-5',
    max_tokens: 1200,
    system: EXTRACTION_PROMPT,
    messages: [{ role: 'user', content: `Source: ${sourceName}\nURL: ${url}\n\nMarkdown:\n${truncatedMarkdown}` }]
  })

  if (!aiData) return []

  const text = aiData.content?.[0]?.text || '{}'
  const clean = text.replace(/```json|```/g, '').trim()
  let parsed = {}
  try {
    parsed = JSON.parse(clean)
  } catch {
    parsed = {}
  }

  const events = parsed.events || []
  console.log(`  [Firecrawl] Found ${events.length} events from ${sourceName}`)

  return events.map(e => ({
    title:       e.title,
    venue:       e.venue || null,
    date:        parseDate(e.date),
    timeDisplay: e.time || null,
    description: e.description ? e.description.slice(0, 400) : null,
    sourceUrl:   normalizeUrl(e.url, url),
    sourceName,
    imageUrl:    e.image_url || null,
  })).filter(e => e.title && e.title.length > 2)
}

function parseDate(raw) {
  if (!raw) return null
  try {
    const d = new Date(raw)
    if (isNaN(d)) return null
    return d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

function normalizeUrl(url, baseUrl) {
  if (!url) return baseUrl
  if (url.startsWith('http')) return url
  try {
    const base = new URL(baseUrl)
    return `${base.origin}${url.startsWith('/') ? '' : '/'}${url}`
  } catch {
    return baseUrl
  }
}