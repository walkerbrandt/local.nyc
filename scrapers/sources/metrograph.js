import * as cheerio from 'cheerio'
export const SOURCE_NAME = 'Metrograph'
export const SOURCE_URL = 'https://metrograph.com'
export async function scrape() {
  const res = await fetch(`${SOURCE_URL}/calendar/`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-nyc-bot/1.0)' } })
  const $ = cheerio.load(await res.text())
  const events = []
  $('.film-listing, .event-listing').each((_, el) => {
    const $el = $(el)
    const title = $el.find('h2, .film-title, .event-title').first().text().trim()
    const date = $el.find('time').first().attr('datetime') || $el.find('.screening-date').first().text().trim()
    const time = $el.find('.screening-time').text().trim()
    const desc = $el.find('.film-description, .event-description').text().trim().slice(0, 400)
    const href = $el.find('a').first().attr('href')
    if (!title || !date) return
    try { events.push({ title, venue: 'Metrograph', date: new Date(date).toISOString().slice(0, 10), timeDisplay: time, description: desc, sourceUrl: href?.startsWith('http') ? href : `${SOURCE_URL}${href}`, sourceName: SOURCE_NAME }) } catch {}
  })
  return events
}
