const SYSTEM_PROMPT = `You are the editorial engine for "local." — a curated NYC cultural events platform. Evaluate raw scraped events and determine which are genuine "Happenings" — one-time, communally shared, culturally meaningful experiences. A Happening is: an art opening (the night of), a film screening with Q&A, an artist in conversation, a live debate or lecture, an immersive performance, a singular concert. NOT a Happening: ongoing exhibitions, bar nights, tourist events, generic concerts at large venues. Return JSON only, no preamble: {"category": one of ["Art Opening","Film Q&A","Artist Talk","Concert","Lecture/Debate","Performance","Other"], "editorial_score": integer 1-10, "editorial_notes": "1-2 sentences", "is_happening": boolean}`

export async function scoreEvent(rawEvent) {
  const prompt = `Rate this event:\nTitle: ${rawEvent.title}\nVenue: ${rawEvent.venue || 'unknown'}\nDate: ${rawEvent.date || 'unknown'}\nDescription: ${rawEvent.description || 'none'}\nSource: ${rawEvent.sourceName}`
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 300, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: prompt }] })
  })
  const data = await res.json()
  const text = data.content?.[0]?.text || '{}'
  try { return JSON.parse(text) } catch { return { category: 'Other', editorial_score: 5, editorial_notes: 'Parse error', is_happening: false } }
}
