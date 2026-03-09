'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function AdminQueuePage() {
  const [happenings, setHappenings] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    async function fetchQueue() {
      const { data, error } = await supabase
        .from('happenings')
        .select('id, title, venue, date, category, editorial_score, editorial_notes, source_url')
        .eq('status', 'pending_review')
        .order('editorial_score', { ascending: false })
      if (!error) setHappenings(data || [])
      setLoading(false)
    }
    fetchQueue()
  }, [])

  async function updateStatus(id, status) {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/happenings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) setHappenings((prev) => prev.filter((h) => h.id !== id))
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <p className="text-neutral-600">Loading queue…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="bg-neutral-900 text-white py-6 px-6">
        <h1 className="text-xl font-semibold">Admin — Review Queue</h1>
        <p className="text-neutral-400 text-sm mt-1">
          {happenings.length} event{happenings.length !== 1 ? 's' : ''} pending review
        </p>
      </header>
      <main className="max-w-3xl mx-auto py-8 px-6">
        {happenings.length === 0 ? (
          <p className="text-neutral-500">No events in the queue.</p>
        ) : (
          <ul className="space-y-6">
            {happenings.map((h) => (
              <li
                key={h.id}
                className="bg-white rounded-lg border border-neutral-200 p-5 shadow-sm"
              >
                <h2 className="font-semibold text-neutral-900">{h.title}</h2>
                <p className="text-sm text-neutral-600 mt-1">
                  {h.venue && <span>{h.venue}</span>}
                  {h.date && (
                    <span className={h.venue ? ' ml-2' : ''}>{h.date}</span>
                  )}
                </p>
                {h.category && (
                  <p className="text-sm text-neutral-500 mt-0.5">{h.category}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-[#C4603A] text-white text-sm font-medium">
                    {h.editorial_score ?? '—'}/10
                  </span>
                  {h.editorial_notes && (
                    <span className="text-sm text-neutral-600">
                      {h.editorial_notes}
                    </span>
                  )}
                </div>
                {h.source_url && (
                  <a
                    href={h.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#C4603A] hover:underline mt-2 inline-block"
                  >
                    Source
                  </a>
                )}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => updateStatus(h.id, 'published')}
                    disabled={updating === h.id}
                    className="px-4 py-2 rounded bg-[#C4603A] text-white text-sm font-medium hover:bg-[#a85230] disabled:opacity-50"
                  >
                    {updating === h.id ? '…' : 'Publish'}
                  </button>
                  <button
                    onClick={() => updateStatus(h.id, 'rejected')}
                    disabled={updating === h.id}
                    className="px-4 py-2 rounded border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
