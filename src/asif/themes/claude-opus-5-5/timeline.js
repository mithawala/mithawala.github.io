const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

function point(text, end, now) {
  const value = text.trim().toLowerCase()
  if (/current|present|now/.test(value)) return now
  const match = value.match(/([a-z]+)?\s*(\d{4})/)
  if (!match) return null
  const month = match[1] ? MONTHS[match[1].slice(0, 3)] : undefined
  const year = Number(match[2])
  if (month === undefined) return year + (end ? 1 : 0)
  return year + (month + (end ? 1 : 0)) / 12
}

// Turns canonical period text such as "Nov 2008 - July 2013" into years.
export function parsePeriod(period, now) {
  const [from, to] = String(period).split(/\s+[-–—]\s+|[-–—]/)
  const start = point(from || '', false, now)
  const end = to ? point(to, true, now) : point(from || '', true, now)
  return start !== null && end !== null && end > start ? { start, end } : null
}

// The largest number of spans that overlap at any moment.
export function mostAtOnce(spans) {
  const edges = spans.flatMap(({ start, end }) => [
    [start, 1],
    [end, -1],
  ])
  edges.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  let current = 0
  let most = 0
  for (const [, change] of edges) {
    current += change
    most = Math.max(most, current)
  }
  return most
}
