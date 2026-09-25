import profile from '../../content/asif/profile.json' with { type: 'json' }
import portfolio from '../../content/asif/portfolio.json' with { type: 'json' }
import blog from '../../content/asif/blog.json' with { type: 'json' }
import contract from '../../content/asif/contract.json' with { type: 'json' }

export { profile, portfolio, blog, contract }

export function detailPath(version, kind, slug) {
  if (!['project', 'blog'].includes(kind))
    throw new Error(`Unknown detail kind: ${kind}`)
  return `${version.path}${kind}/${encodeURIComponent(slug)}/`
}

export function resolveDetail(version, pathname) {
  if (!pathname.startsWith(version.path)) return null
  const [kind, encodedSlug, ...extra] = pathname
    .slice(version.path.length)
    .split('/')
    .filter(Boolean)
  if (!kind) return null
  let slug
  try {
    slug = decodeURIComponent(encodedSlug || '')
  } catch {
    return { missing: true }
  }
  const records = kind === 'project' ? portfolio : kind === 'blog' ? blog : []
  const record = extra.length
    ? null
    : records.find((entry) => entry.slug === slug)
  return record ? { kind, record } : { missing: true }
}

export function filterPortfolio(records, category = 'all', query = '') {
  const term = query.toLocaleLowerCase().trim()
  return records.filter(
    (entry) =>
      (category === 'all' || entry.categories.includes(category)) &&
      [
        entry.title,
        entry.description,
        entry.descriptionHtml,
        entry.category,
        ...(entry.technologies || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(term),
  )
}

export function searchContent(query) {
  const term = query.toLocaleLowerCase().trim()
  if (!term) return []
  return [
    ...filterPortfolio(portfolio, 'all', term).map((record) => ({
      kind: 'project',
      record,
    })),
    ...blog
      .filter((record) =>
        `${record.title} ${record.content} ${record.category}`
          .toLocaleLowerCase()
          .includes(term),
      )
      .map((record) => ({ kind: 'blog', record })),
  ]
}

export function formatDate(
  value,
  options = { month: 'short', year: 'numeric' },
) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(
        date,
      )
}

export function formatTime(milliseconds = 0) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
