// scrapers/run.js
import 'dotenv/config'
import { insertHappening, startRun, finishRun } from './lib/core.js'
import { scoreEvent } from './lib/scorer.js'
import { scrapeWithFirecrawl } from './lib/firecrawl.js'

const SOURCES = [
  { name: 'Screen Slate',            url: 'https://www.screenslate.com/listings' },
  { name: 'Metrograph',              url: 'https://metrograph.com/calendar/' },
  { name: 'Film Forum',              url: 'https://filmforum.org/' },
  { name: 'IFC Center',              url: 'https://www.ifccenter.com/' },
  { name: 'Anthology Film Archives', url: 'https://anthologyfilmarchives.org/film_screenings' },
  { name: 'Artforum Artguide',       url: 'https://www.artforum.com/artguide/new-york/' },
  { name: 'e-flux',                  url: 'https://www.e-flux.com/announcements/' },
  { name: 'Pioneer Works',           url: 'https://pioneerworks.org/programs' },
  { name: 'The Shed',                url: 'https://theshed.org/program' },
  { name: 'Whitney Museum',          url: 'https://whitney.org/events/' },
  { name: 'Brooklyn Rail',           url: 'https://brooklynrail.org/events' },
]

function isWithinSevenDays(dateStr) {
  if (!dateStr) return true
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() + 7)
  const eventDate = new Date(dateStr)
  return eventDate >= today && eventDate <= cutoff
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  console.log(`\n local. scraper (Firecrawl) — ${new Date().toISOString()}\n`)

  for (const source of SOURCES) {
    const runId = await startRun(source.name)
    console.log(`\n▶ ${source.name}`)

    try {
      const raw = await scrapeWithFirecrawl(source.url, source.name)
      console.log(`  scraped: ${raw.length} events`)

      const upcoming = raw.filter(e => isWithinSevenDays(e.date))
      console.log(`  upcoming (<=7 days): ${upcoming.length} events`)

      let newCount = 0

      for (const event of upcoming) {
        const scored = await scoreEvent(event)
        await sleep(300)

        const enriched = {
          ...event,
          category:       scored.category,
          editorialScore: scored.editorial_score,
          editorialNotes: scored.editorial_notes,
        }

        const result = await insertHappening(enriched)
        if (result.inserted) {
          newCount++
          console.log(`  ✓ [${enriched.editorialScore}/10] ${event.title}`)
        }
      }

      await finishRun(runId, { found: upcoming.length, newCount })
      console.log(`  ✅ ${newCount} new events inserted`)

    } catch (err) {
      await finishRun(runId, { error: err.message })
      console.error(`  ❌ ${source.name} failed:`, err.message)
    }

    await sleep(3000)
  }

  console.log('\n✅ scrape complete\n')
}

main().catch(console.error)