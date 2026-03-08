import * as cheerio from 'cheerio'
export const SOURCE_NAME = 'Artforum Artguide'
export const SOURCE_URL = 'https://www.artforum.com'
export async function scrape() {
  const res = await fetch(`${SOURCE_URL}/artguide/new-york/`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-nyc-bot/1.0)', 'Accept': 'text/html' } })
  const $ = cheerio.load(await res.text())
  const events = []
  $('.guide-entry, .venue-listing').each((_, el) => {
    const $el = $(el)
    const title = $el.find('h2, h3').first().text().trim()
    const venue = $el.find('[class*="venue"],[class*="gallery"]').first().text().trim()
    const dates = $el.find('[class*="date"]').text().trim()
    const desc = $el.find('p').first().text().trim().slice(0, 400)
    const href = $el.find('a').first().attr('href')
    if (!title || title.length < 3) return
    const match = dates.match(/([A-Za-z]+)\s+(\d{1,2})/)
    let date = null
    if (match) try { date = new Date(`${match[1]} ${match[2]} 2026`).toISOString().slice(0, 10) } catch {}
    events.push({ title, venue, date, description: desc, sourceUrl: href?.startsWith('http') ? href : `${SOURCE_URL}${href}`, sourceName: SOURCE_NAME })
  })
  return events
}
