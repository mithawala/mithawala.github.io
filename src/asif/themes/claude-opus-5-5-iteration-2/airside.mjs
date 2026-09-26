// Pure helpers for the Airside edition. Everything here derives from the
// canonical records; nothing restates personal content.

export const ROUTE = [
  { id: 'about', letter: 'A', sv: 'Om mig', concept: 'Crew ID' },
  { id: 'portfolio', letter: 'P', sv: 'Portfölj', concept: 'Departures' },
  { id: 'resume', letter: 'R', sv: 'CV', concept: 'Logbook' },
  { id: 'blog', letter: 'B', sv: 'Blogg', concept: 'Seat-pocket reading' },
  { id: 'music', letter: 'M', sv: 'Musik', concept: 'In-flight entertainment' },
  { id: 'contact', letter: 'C', sv: 'Kontakt', concept: 'Air waybill' },
]

export const plural = (count, word, many = `${word}s`) =>
  `${count} ${count === 1 ? word : many}`

export function capitalize(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : value
}

export function contactValue(profile, iconHint) {
  return (
    profile.contact.info.find((info) => info.icon.includes(iconHint))?.value ||
    ''
  )
}

// Section list in Airside order, labelled by the contract and annotated with
// remarks computed from the current collections.
export function buildRoute({ contract, profile, portfolio, blog }) {
  const remarks = {
    about: `${plural(profile.about.skills.length, 'area')} of expertise`,
    portfolio: plural(portfolio.length, 'project'),
    resume: plural(
      profile.resume.experience.length + profile.resume.education.length,
      'entry',
      'entries',
    ),
    blog: plural(blog.length, 'article'),
    music: 'Live playlist',
    contact:
      contactValue(profile, 'checkmark') ||
      contactValue(profile, 'map-marker') ||
      'Open',
  }
  return ROUTE.map((stop) => ({
    ...stop,
    label:
      contract.sections.find((section) => section.id === stop.id)?.label ||
      capitalize(stop.id),
    remark: remarks[stop.id],
  }))
}

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]

function parsePoint(text, edge, now) {
  const value = text.trim()
  if (/^(current|present|now|today|ongoing)$/i.test(value))
    return now.getUTCFullYear() + (now.getUTCMonth() + 1) / 12
  const match = value.match(/^(?:([A-Za-z]+)\.?\s+)?(\d{4})$/)
  if (!match) return null
  const year = Number(match[2])
  if (!match[1]) return edge === 'end' ? year + 1 : year
  const month = MONTHS.indexOf(match[1].slice(0, 3).toLowerCase())
  if (month < 0) return null
  return year + (edge === 'end' ? month + 1 : month) / 12
}

// "Mar 2026 - Current", "2009 – 2014", "2011" -> fractional years.
export function parsePeriod(period, now = new Date()) {
  const parts = String(period || '')
    .split(/\s*[-–—]\s*/)
    .filter(Boolean)
  if (!parts.length || parts.length > 2) return null
  const start = parsePoint(parts[0], 'start', now)
  const end = parsePoint(parts[1] || parts[0], 'end', now)
  if (start == null || end == null || end < start) return null
  return { start, end, current: /current|present|now/i.test(parts[1] || '') }
}

export function scheduleOf(entries, now = new Date()) {
  const rows = entries
    .map((entry) => ({ entry, span: parsePeriod(entry.period, now) }))
    .filter((row) => row.span)
    .sort((a, b) => a.span.start - b.span.start || a.span.end - b.span.end)
  if (!rows.length) return { rows, from: 0, to: 0 }
  const from = Math.floor(Math.min(...rows.map((row) => row.span.start)))
  const to = Math.ceil(Math.max(...rows.map((row) => row.span.end)))
  return { rows, from, to: to > from ? to : from + 1 }
}

// Word-wraps text for a split-flap panel of `cols` cells per line.
export function wrapFlapText(text, cols) {
  const words = String(text).toUpperCase().split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  const flush = () => {
    if (line) lines.push(line)
    line = ''
  }
  for (let word of words) {
    while (word.length > cols) {
      let cut = word.lastIndexOf('-', cols - 1) + 1
      if (cut <= 0) cut = cols
      flush()
      lines.push(word.slice(0, cut))
      word = word.slice(cut)
    }
    if (!word) continue
    if (!line) line = word
    else if (line.length + 1 + word.length <= cols) line += ` ${word}`
    else {
      flush()
      line = word
    }
  }
  flush()
  return lines.length ? lines : ['']
}

// Chooses cells per line so every text fits `width` with cells no smaller
// than `min`, then enlarges cells up to `max`. Whole words are kept on one
// line while cells can stay at least `floor` pixels wide.
export function flapLayout(texts, width, { min, max, gap, floor = 10 }) {
  const all = texts.map(String)
  const longest = Math.max(1, ...all.map((text) => text.length))
  const longestWord = Math.max(
    1,
    ...all
      .flatMap((text) => text.split(/\s+|(?<=-)/))
      .map((word) => word.length),
  )
  const fitAt = (size) => Math.max(1, Math.floor((width + gap) / (size + gap)))
  let cols = Math.min(
    longest,
    Math.max(fitAt(min), Math.min(longestWord, fitAt(floor))),
  )
  let wrapped = texts.map((text) => wrapFlapText(text, cols))
  cols = Math.max(1, ...wrapped.flat().map((line) => line.length))
  wrapped = texts.map((text) => wrapFlapText(text, cols))
  const rows = Math.max(...wrapped.map((lines) => lines.length))
  const size = Math.max(
    8,
    Math.floor(Math.min(max, (width + gap) / cols - gap)),
  )
  return { cols, rows, size, wrapped }
}

export function flapGrid(lines, cols, rows) {
  return Array.from({ length: rows }, (_, row) =>
    (lines[row] || '').padEnd(cols, ' ').slice(0, cols).split(''),
  )
}

export function boardDate(value) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = new Date(iso ? `${value}T12:00:00Z` : value)
  if (Number.isNaN(date.getTime())) return String(value).toUpperCase()
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = MONTHS[date.getUTCMonth()].toUpperCase()
  return `${day} ${month} ${date.getUTCFullYear()}`
}

export function flightCode(portfolio, item) {
  const index = portfolio.indexOf(item)
  const number = index < 0 ? 0 : portfolio.length - index
  return `AM ${String(number).padStart(3, '0')}`
}

export function projectRemark(item) {
  if (item.deviceMockup) return 'Live demo'
  const videos =
    (item.videoUrl ? 1 : 0) +
    (item.embedVideo ? 1 : 0) +
    (item.embedVideos?.length || 0)
  if (videos > 1) return plural(videos, 'video')
  if (videos === 1) return 'Video'
  if (item.images?.length > 1) return plural(item.images.length, 'photo')
  return item.type === 'image' ? 'Photo' : 'Details'
}

export function yearsOf(records) {
  const years = records
    .map((record) => {
      const date = new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(record.date)
          ? `${record.date}T12:00:00Z`
          : record.date,
      )
      return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear()
    })
    .filter(Boolean)
  return years.length
    ? { first: Math.min(...years), last: Math.max(...years) }
    : null
}

export function readingMinutes(html, wordsPerMinute = 220) {
  const words = String(html)
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length
  return Math.max(1, Math.round(words / wordsPerMinute))
}

// Decorative barcode: deterministic bar positions derived from a string.
export function barcode(text, length = 64) {
  const bars = []
  let seed = 7
  for (const character of String(text))
    seed = (seed * 31 + character.charCodeAt(0)) >>> 0
  let x = 0
  let dark = true
  while (x < length) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
    const width = 1 + ((seed >>> 16) % 3)
    if (dark) bars.push({ x, width: Math.min(width, length - x) })
    x += width
    dark = !dark
  }
  return bars
}

export function machineLine(name, width = 30) {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '<')
    .padEnd(width, '<')
    .slice(0, width)
}
