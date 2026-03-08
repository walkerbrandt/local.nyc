import * as cheerio from 'cheerio'
export const SOURCE_NAME = 'e-flux'
export const SOURCE_URL = 'https://www.e-flux.com'
export async function scrape() {
  const res = await fetch(`${SOURCE_URL}/announcements/`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-nyc-bot/1.0)' } })
  const $ = cheerio.load(await res.text())
  const events = []
  $('.announcement, article').each((_, el) => {
    const $el = $(el)
    const title = $el.find('h2, h3').first().text().trim()
    const venue = $el.find('[class*="venue"],[class*="location"]').first().text().trim()
    const date = $el.find('time').attr('datetime') || $el.find('[class*="date"]').first().text().trim()
    const desc = $el.find('p').first().text().trim().slice(0, 400)
    const href = $el.find('a').first().attr('href')
    if (!title || title.length < 3) return
    const loc = (venue + ' ' + desc).toLowerCase()
    if (!loc.includes('new york') && !loc.includes('nyc') && !loc.includes('brooklyn') && !loc.includes('manhattan')) return
    try { events.push({ title, venue, date: new Date(date).toISOString().slice(0, 10), description: desc, sourceUrl: href?.startsWith('http') ? href : `${SOURCE_URL}${href}`, sourceName: SOURCE_NAME }) } catch {}
  })
  return events
}
