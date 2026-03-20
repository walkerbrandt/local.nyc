// scrapers/lib/firecrawl.js
// Universal AI-powered scraper using Firecrawl
// Replaces all individual source scrapers

const FIRECRAWL_API = 'https://api.firecrawl.dev/v1'

// The schema we want extracted from every events page
const EVENT_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title:       { type: 'string', description: 'Name of the event or film or performance' },
          venue:       { type: 'string', description: 'Name of the venue or location' },
          date:        { type: 'string', description: 'Date of the event in any format' },
          time:        { type: 'string', description: 'Time of the event e.g. 7pm, 7:30 PM' },
          description: { type: 'string', description: 'Short description or summary of the event' },
          url:         { type: 'string', description: 'URL link to the event detail page' },
          image_url:   { type: 'string', description: 'URL of the event image if available' },
        },
        required: ['title']
      }
    }
  }
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
      formats: ['extract'],
      extract: {
        schema: EVENT_SCHEMA,
        systemPrompt: `You are extracting NYC cultural events from a webpage. 
Extract all upcoming events, performances, screenings, concerts, talks, openings, and happenings.
For each event extract the title, venue, date, time, description, and URL.
Only extract actual events with specific dates — not general info pages or evergreen content.
Focus on one-time or limited-run events rather than ongoing exhibitions.`
      }
    })
  })

  const data = await res.json()

  if (!data.success) {
    console.log(`  [Firecrawl] Failed for ${sourceName}:`, data.error || 'unknown error')
    return []
  }

  console.log('[Firecrawl] Raw response:', JSON.stringify(data).slice(0, 500))
  const events = data.extract?.events || []
  console.log(`  [Firecrawl] Found ${events.length} events from ${sourceName}`)

  // Normalize to our standard format
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