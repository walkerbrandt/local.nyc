// scrapers/run.js
import 'dotenv/config'
import { insertHappening, startRun, finishRun } from './lib/core.js'
import { scoreEvent } from './lib/scorer.js'
import { scrapeWithFirecrawl } from './lib/firecrawl.js'

const SOURCES = [
  { name: 'Screen Slate',            url: 'https://www.screenslate.com/listings' },
  { name: 'Artforum Artguide',       url: 'https://www.artforum.com/artguide/new-york/' },
  { name: 'e-flux',                  url: 'https://www.e-flux.com/announcements/' },
  { name: 'Culturebot',              url: 'https://culturebot.org/' },
  { name: 'Hyperallergic',           url: 'https://hyperallergic.com/events/' },
  { name: 'Brooklyn Rail',           url: 'https://brooklynrail.org/events' },
  { name: 'Metrograph',              url: 'https://metrograph.com/calendar/' },
  { name: 'Film Forum',              url: 'https://filmforum.org/' },
  { name: 'IFC Center',              url: 'https://www.ifccenter.com/' },
  { name: 'Anthology Film Archives', url: 'https://anthologyfilmarchives.org/film_screenings' },
  { name: 'BAMcinema',               url: 'https://www.bam.org/film' },
  { name: 'Nitehawk Cinema',         url: 'https://nitehawkcinema.com/' },
  { name: 'Pioneer Works',           url: 'https://pioneerworks.org/programs' },
  { name: 'Artists Space',           url: 'https://artistsspace.org/' },
  { name: 'The Kitchen',             url: 'https://thekitchen.org/' },
  { name: 'New Museum',              url: 'https://www.newmuseum.org/calendar/' },
  { name: 'Printed Matter',          url: 'https://www.printedmatter.org/programs/events' },
  { name: 'Roulette',                url: 'https://roulette.org/' },
  { name: 'Issue Project Room',      url: 'https://issueprojectroom.org/' },
  { name: 'National Sawdust',        url: 'https://nationalsawdust.org/' },
  { name: 'The Stone',               url: 'https://thestonenyc.com/' },
  { name: 'The Shed',                url: 'https://theshed.org/program' },
  { name: '92NY',                    url: 'https://www.92ny.org/event' },
  { name: 'Whitney Museum',          url: 'https://whitney.org/events/' },
]

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  console.log(`\n local. scraper (Firecrawl) — ${new Date().toISOString()}\n`)

  for (const source of SOURCES) {
    const runId = await startRun(source.name)
    console.log(`\n▶ ${source.name}`)

    try {
      const raw = await scrapeWithFirecrawl(source.url, source.name)
      console.log(`  scraped: ${raw.length} events`)

      let newCount = 0

      for (const event of raw) {
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

      await finishRun(runId, { found: raw.length, newCount })
      console.log(`  ✅ ${newCount} new events inserted`)

    } catch (err) {
      await finishRun(runId, { error: err.message })
      console.error(`  ❌ ${source.name} failed:`, err.message)
    }

    await sleep(1000)
  }

  console.log('\n✅ scrape complete\n')
}

main().catch(console.error)