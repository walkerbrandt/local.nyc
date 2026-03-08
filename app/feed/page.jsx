'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CATEGORIES = [
  'Art Opening',
  'Film Q&A',
  'Artist Talk',
  'Concert',
  'Lecture/Debate',
  'Performance',
  'Other',
]

const CATEGORY_COLORS = {
  'Art Opening': 'bg-amber-400',
  'Film Q&A': 'bg-violet-400',
  'Artist Talk': 'bg-emerald-400',
  'Concert': 'bg-rose-400',
  'Lecture/Debate': 'bg-sky-400',
  'Performance': 'bg-[#C4603A]',
  'Other': 'bg-neutral-400',
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function FeedPage() {
  const [happenings, setHappenings] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchFeed() {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('happenings')
        .select('id, title, venue, date, time_display, category, source_url')
        .eq('status', 'published')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('editorial_score', { ascending: false })
      if (!error) setHappenings(data || [])
      setLoading(false)
    }
    fetchFeed()
  }, [])

  const filtered = useMemo(() => {
    let list = happenings
    if (categoryFilter) {
      list = list.filter((h) => h.category === categoryFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (h) =>
          (h.title && h.title.toLowerCase().includes(q)) ||
          (h.venue && h.venue.toLowerCase().includes(q)) ||
          (h.category && h.category.toLowerCase().includes(q))
      )
    }
    return list
  }, [happenings, categoryFilter, search])

  const byDate = useMemo(() => {
    const map = new Map()
    for (const h of filtered) {
      const key = h.date || 'No date'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(h)
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a === 'No date' ? 1 : b === 'No date' ? -1 : a.localeCompare(b)))
  }, [filtered])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <p className="text-neutral-600">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="border-b border-neutral-200 bg-[#FAF7F2] py-6 px-6">
        <h1 className="font-serif text-2xl text-neutral-900">
          local.
        </h1>
        <p className="text-sm text-neutral-500 mt-1">Happenings in NYC</p>
      </header>
      <main className="max-w-2xl mx-auto py-8 px-6">
        <div className="mb-6 space-y-4">
          <input
            type="search"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C4603A]/40 focus:border-[#C4603A]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                categoryFilter === null
                  ? 'bg-[#C4603A] text-white'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  categoryFilter === cat
                    ? 'bg-[#C4603A] text-white'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        {byDate.length === 0 ? (
          <p className="text-neutral-500">No upcoming events.</p>
        ) : (
          <div className="space-y-10">
            {byDate.map(([dateKey, events]) => (
              <section key={dateKey}>
                <h2
                  className="font-serif text-lg text-neutral-800 mb-4"
                >
                  {dateKey === 'No date' ? 'Date TBA' : formatDate(dateKey)}
                </h2>
                <ul className="space-y-4">
                  {events.map((h) => (
                    <li key={h.id} className="border-l-2 border-[#C4603A]/30 pl-4 py-1">
                      <a
                        href={h.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block"
                      >
                        <span
                          className="font-serif text-lg text-neutral-900 group-hover:text-[#C4603A]"
                        >
                          {h.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-sm text-neutral-600">
                          {h.venue && <span>{h.venue}</span>}
                          {h.time_display && (
                            <span className="text-neutral-500">{h.time_display}</span>
                          )}
                          {h.category && (
                            <span
                              className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                CATEGORY_COLORS[h.category] || CATEGORY_COLORS['Other']
                              }`}
                              title={h.category}
                            />
                          )}
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
