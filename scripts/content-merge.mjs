// Three-way merge of canonical content.
//
// base: the content mithawala.com produced at the last synced commit.
// theirs: the content mithawala.com produces now.
// ours: content/asif/ as it is in this repository.
//
// A change on one side is taken as is. A value changed on both sides to
// different results is a conflict, which stops the sync instead of guessing.
// Keyed collections (portfolio, articles, jobs, degrees) merge record by
// record, so a new project there and a corrected typo here both survive.

const KEYED = new Map([
  ['portfolio', ['slug']],
  ['blog', ['slug']],
  ['resume.experience', ['company', 'period']],
  ['resume.education', ['company', 'period']],
])

export const MISSING = Symbol('missing')
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// Key order carries no meaning in content, so comparisons ignore it.
export const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : isObject(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value
const same = (a, b) =>
  a === b ||
  (a !== MISSING &&
    b !== MISSING &&
    JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)))
const join = (path, key) => (path ? `${path}.${key}` : key)

function index(list, fields) {
  const map = new Map()
  for (const record of list) {
    if (!isObject(record) || fields.some((field) => record[field] == null))
      return null
    const id = fields.map((field) => record[field]).join(' / ')
    if (map.has(id)) return null
    map.set(id, record)
  }
  return map
}

function keyed(base, theirs, ours, path, fields, report) {
  const [b, t, o] = [base, theirs, ours].map((list) => index(list, fields))
  // Records without a unique key cannot be matched; merge the list as a value.
  if (!b || !t || !o) return leaf(base, theirs, ours, path, report)

  const merged = new Map()
  for (const id of new Set([...b.keys(), ...t.keys(), ...o.keys()])) {
    const label = `${path}[${id}]`
    const [inBase, inTheirs, inOurs] = [b.has(id), t.has(id), o.has(id)]
    if (!inBase && inTheirs && !inOurs) {
      merged.set(id, t.get(id))
      report.added.push(label)
      continue
    }
    if (inBase && !inTheirs && inOurs && same(b.get(id), o.get(id))) {
      report.removed.push(label)
      continue
    }
    const result = merge(
      inBase ? b.get(id) : MISSING,
      inTheirs ? t.get(id) : MISSING,
      inOurs ? o.get(id) : MISSING,
      label,
      report,
    )
    if (result !== MISSING) merged.set(id, result)
  }

  // Their order decides; a record only this side has stays after the record
  // that preceded it here.
  const order = [...t.keys()].filter((id) => merged.has(id))
  const placed = new Set(order)
  let previous = null
  for (const id of o.keys()) {
    if (merged.has(id) && !placed.has(id)) {
      order.splice(previous === null ? 0 : order.indexOf(previous) + 1, 0, id)
      placed.add(id)
    }
    if (placed.has(id)) previous = id
  }
  return order.map((id) => merged.get(id))
}

function leaf(base, theirs, ours, path, report) {
  if (same(theirs, ours)) return ours
  if (same(base, theirs)) {
    report.kept.push(path)
    return ours
  }
  if (same(base, ours)) {
    report.changed.push(path)
    return theirs
  }
  report.conflicts.push({ path, base, theirs, ours })
  return ours
}

function merge(base, theirs, ours, path, report) {
  const sides = [base, theirs, ours]
  const fields = KEYED.get(path)
  if (fields && sides.every((side) => side === MISSING || Array.isArray(side)))
    return keyed(
      ...sides.map((side) => (side === MISSING ? [] : side)),
      path,
      fields,
      report,
    )
  if (
    theirs !== MISSING &&
    ours !== MISSING &&
    sides.every((side) => side === MISSING || isObject(side))
  ) {
    const result = {}
    const keys = new Set([
      ...Object.keys(ours),
      ...Object.keys(theirs),
      ...(base === MISSING ? [] : Object.keys(base)),
    ])
    for (const key of keys) {
      const entry = merge(
        base !== MISSING && key in base ? base[key] : MISSING,
        key in theirs ? theirs[key] : MISSING,
        key in ours ? ours[key] : MISSING,
        join(path, key),
        report,
      )
      if (entry !== MISSING) result[key] = entry
    }
    return result
  }
  return leaf(base, theirs, ours, path, report)
}

// root names the collection: 'portfolio' or 'blog' for those files, and ''
// for the profile, whose nested resume lists are keyed by their own paths.
export function mergeContent(base, theirs, ours, root = '') {
  const report = {
    added: [],
    removed: [],
    changed: [],
    kept: [],
    conflicts: [],
  }
  const merged = merge(base, theirs, ours, root, report)
  return { merged, report }
}
