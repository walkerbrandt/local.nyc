import * as cheerio from 'cheerio'
export const SOURCE_NAME = 'Screen Slate'
export const SOURCE_URL = 'https://www.screenslate.com'
export async function scrape() {
  const res = await fetch(`${SOURCE_URL}/listings`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-nyc-bot/1.0)' } })
  const $ = cheerio.load(await res.text())
  const events = []
  $('.views-row').each((_, el) => {
    const $el = $(el)
    const title = $el.find('.field-title a').text().trim()
    const venue = $el.find('.field-venue').text().trim()
    const date = $el.find('.field-date').attr('content')
    const time = $el.find('.field-time').text().trim()
    const desc = $el.find('.field-body').text().trim().slice(0, 400)
    const href = $el.find('.field-title a').attr('href')
    if (!title || !date) return
    events.push({ title, venue, date: date.slice(0, 10), timeDisplay: time, description: desc, sourceUrl: href?.startsWith('http') ? href : `${SOURCE_URL}${href}`, sourceName: SOURCE_NAME })
  })
  return events
}
