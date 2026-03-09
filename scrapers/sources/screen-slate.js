import * as cheerio from 'cheerio'
export const SOURCE_NAME = 'Screen Slate'
export const SOURCE_URL = 'https://www.screenslate.com'

function absUrl(href) {
  if (!href) return null
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  if (href.startsWith('//')) return `https:${href}`
  if (href.startsWith('/')) return `${SOURCE_URL}${href}`
  return `${SOURCE_URL}/${href}`
}

function parseDateToISO(dateRaw) {
  if (!dateRaw) return null
  const s = String(dateRaw).trim()
  if (!s) return null
  const m = s.match(/\d{4}-\d{2}-\d{2}/)
  if (m) return m[0]
  try {
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  } catch {}
  return null
}

function pickText($, el, selectors) {
  for (const sel of selectors) {
    const txt = $(el).find(sel).first().text().trim()
    if (txt) return txt
  }
  return ''
}

function pickAttr($, el, selectors, attr) {
  for (const sel of selectors) {
    const v = $(el).find(sel).first().attr(attr)
    if (v) return v
  }
  return null
}

export async function scrape() {
  const res = await fetch(`${SOURCE_URL}/listings`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; local-nyc-bot/1.0)',
      'Accept': 'text/html',
    },
  })
  const html = await res.text()
  console.log(`[${SOURCE_NAME}] HTML preview: ${html.slice(0, 500).replace(/\s+/g, ' ')}`)

  const $ = cheerio.load(html)
  const events = []
  const seen = new Set()

  // 1) Prefer elements with date-like attributes, then walk up to a likely container.
  const dateNodes = $('[data-date],[data-datetime],[datetime],time[datetime],[itemprop="startDate"],meta[itemprop="startDate"],[class*="date" i],[class*="when" i]')
  dateNodes.each((_, node) => {
    const $node = $(node)
    const container = $node.closest('[class*="listing" i],[class*="event" i],[class*="screen" i],[class*="show" i],article,li,section,div').first()
    const $c = container.length ? container : $node.parent()

    const dateRaw =
      $node.attr('datetime') ||
      $node.attr('data-date') ||
      $node.attr('data-datetime') ||
      $node.attr('content') ||
      $c.attr('data-date') ||
      $c.attr('data-datetime') ||
      $c.find('time[datetime]').first().attr('datetime') ||
      $c.find('meta[itemprop="startDate"]').first().attr('content') ||
      $node.text()

    const date = parseDateToISO(dateRaw)
    if (!date) return

    const href = pickAttr($, $c, ['a[href*="/listing" i]', 'a[href*="/event" i]', 'a[href]', 'h1 a', 'h2 a', 'h3 a'], 'href')
    const sourceUrl = absUrl(href)

    const title =
      pickText($, $c, ['h1', 'h2', 'h3', '[class*="title" i]', 'a[href*="/listing" i]', 'a[href*="/event" i]', 'a[href]']) ||
      (sourceUrl ? $c.find(`a[href="${href}"]`).first().text().trim() : '')

    if (!title || title.length < 2) return

    const venue = pickText($, $c, ['[class*="venue" i]', '[class*="theater" i]', '[class*="cinema" i]', '[class*="location" i]']) || ''
    const timeDisplay = pickText($, $c, ['time', '[class*="time" i]']) || ''
    const description = pickText($, $c, ['[class*="desc" i]', '[class*="summary" i]', 'p']).slice(0, 400)

    const key = `${title}__${date}__${sourceUrl || ''}`
    if (seen.has(key)) return
    seen.add(key)

    events.push({
      title,
      venue: venue || null,
      date,
      timeDisplay: timeDisplay || null,
      description: description || null,
      sourceUrl: sourceUrl || `${SOURCE_URL}/listings`,
      sourceName: SOURCE_NAME,
    })
  })

  // 2) Fallback: scan generic "listing-like" containers if we still have nothing.
  if (events.length === 0) {
    $('[class*="listing" i],[class*="event" i],article,li').each((_, el) => {
      const $c = $(el)

      const href = pickAttr($, $c, ['a[href*="/listing" i]', 'a[href*="/event" i]', 'a[href]'], 'href')
      const sourceUrl = absUrl(href)

      const title = pickText($, $c, ['h1', 'h2', 'h3', '[class*="title" i]', 'a[href*="/listing" i]', 'a[href*="/event" i]', 'a[href]'])
      if (!title || title.length < 2) return

      const dateRaw =
        $c.attr('data-date') ||
        $c.attr('data-datetime') ||
        $c.find('time[datetime]').first().attr('datetime') ||
        $c.find('[datetime]').first().attr('datetime') ||
        $c.find('[class*="date" i],[class*="when" i]').first().text().trim()

      const date = parseDateToISO(dateRaw)
      if (!date) return

      const venue = pickText($, $c, ['[class*="venue" i]', '[class*="theater" i]', '[class*="cinema" i]', '[class*="location" i]']) || ''
      const timeDisplay = pickText($, $c, ['time', '[class*="time" i]']) || ''
      const description = pickText($, $c, ['[class*="desc" i]', '[class*="summary" i]', 'p']).slice(0, 400)

      const key = `${title}__${date}__${sourceUrl || ''}`
      if (seen.has(key)) return
      seen.add(key)

      events.push({
        title,
        venue: venue || null,
        date,
        timeDisplay: timeDisplay || null,
        description: description || null,
        sourceUrl: sourceUrl || `${SOURCE_URL}/listings`,
        sourceName: SOURCE_NAME,
      })
    })
  }

  return events
}
