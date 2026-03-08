import * as cheerio from 'cheerio'
export const SOURCE_NAME = 'Pioneer Works'
export const SOURCE_URL = 'https://pioneerworks.org'
export async function scrape() {
  const res = await fetch(`${SOURCE_URL}/programs`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-nyc-bot/1.0)' } })
  const $ = cheerio.load(await res.text())
  const events = []
  $('.program-card, .event-card, article').each((_, el) => {
    const $el = $(el)
    const title = $el.find('h2, h3, .program-title').first().text().trim()
    const date = $el.find('time').attr('datetime') || $el.find('.program-date, .event-date').text().trim()
    const time = $el.find('.program-time, .event-time').text().trim()
    const desc = $el.find('p, .program-description').first().text().trim().slice(0, 400)
    const href = $el.find('a').first().attr('href')
    if (!title || title.length < 3) return
    try { events.push({ title, venue: 'Pioneer Works', neighborhood: 'Red Hook', date: new Date(date).toISOString().slice(0, 10), timeDisplay: time, description: desc, sourceUrl: href?.startsWith('http') ? href : `${SOURCE_URL}${href}`, sourceName: SOURCE_NAME }) } catch {}
  })
  return events
}
