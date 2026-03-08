import 'dotenv/config'
import { insertHappening, startRun, finishRun } from './lib/core.js'
import { scoreEvent } from './lib/scorer.js'
import { scrape as scrapeScreenSlate, SOURCE_NAME as SS_NAME } from './sources/screen-slate.js'
import { scrape as scrapeMetrograph, SOURCE_NAME as MG_NAME } from './sources/metrograph.js'
import { scrape as scrapePioneerWorks, SOURCE_NAME as PW_NAME } from './sources/pioneer-works.js'
import { scrape as scrapeArtforum, SOURCE_NAME as AF_NAME } from './sources/artforum.js'
import { scrape as scrapeEflux, SOURCE_NAME as EF_NAME } from './sources/eflux.js'

const SOURCES = [
  { name: SS_NAME, fn: scrapeScreenSlate },
  { name: MG_NAME, fn: scrapeMetrograph },
  { name: PW_NAME, fn: scrapePioneerWorks },
  { name: AF_NAME, fn: scrapeArtforum },
  { name: EF_NAME, fn: scrapeEflux },
]

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  console.log(`\n local. scraper — ${new Date().toISOString()}\n`)
  for (const source of SOURCES) {
    const runId = await startRun(source.name)
    console.log(`\n ${source.name}`)
    try {
      const raw = await source.fn()
      console.log(`  scraped: ${raw.length} events`)
      let newCount = 0
      for (const event of raw) {
        if (!event.title) continue
        const scored = await scoreEvent(event)
        await sleep(300)
        const enriched = { ...event, category: scored.category, editorialScore: scored.editorial_score, editorialNotes: scored.editorial_notes }
        const result = await insertHappening(enriched)
        if (result.inserted) { newCount++; console.log(`  [${enriched.editorialScore}/10] ${event.title}`) }
        else console.log(`  dup: ${event.title}`)
      }
      await finishRun(runId, { found: raw.length, newCount })
      console.log(`  ${newCount} new events inserted`)
    } catch (err) {
      await finishRun(runId, { error: err.message })
      console.error(`  ${source.name} failed:`, err.message)
    }
  }
}

main().catch(console.error)
