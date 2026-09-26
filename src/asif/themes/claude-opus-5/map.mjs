// A semantic map of the portfolio, computed from the canonical records.
//
// Every work becomes a sparse weighted feature vector (categories, medium,
// technologies, title terms, year neighbourhood). Cosine distance between those
// vectors feeds classical multidimensional scaling, which returns the 3D
// arrangement that best preserves those distances. Nothing here is decorative:
// move a project into another category or give it one more technology and it
// moves on the map.

const STOP = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'into',
  'that',
  'this',
  'your',
  'you',
  'our',
  'its',
  'was',
  'were',
  'are',
  'how',
  'why',
  'what',
  'when',
  'who',
  'via',
  'out',
  'off',
  'over',
  'under',
  'new',
  'one',
  'two',
  'all',
  'own',
  'got',
  'get',
  'has',
  'had',
  'but',
  'not',
  'can',
  'did',
  'made',
  'make',
  'built',
  'build',
  'building',
  'using',
  'used',
  'about',
  'after',
  'before',
])

const WEIGHT = {
  category: 1.35,
  type: 0.7,
  technology: 1,
  title: 0.55,
  year: 0.5,
}

const terms = (value = '') =>
  value
    .toLocaleLowerCase()
    .split(/[^a-z0-9+#]+/i)
    .filter((word) => word.length > 2 && !STOP.has(word))

function features(record) {
  const entries = new Map()
  const add = (key, weight) =>
    entries.set(key, Math.max(entries.get(key) || 0, weight))
  for (const category of record.categories || [])
    if (category !== 'all') add(`c:${category}`, WEIGHT.category)
  add(`m:${record.type}`, WEIGHT.type)
  for (const technology of record.technologies || [])
    for (const word of terms(technology)) add(`t:${word}`, WEIGHT.technology)
  for (const word of terms(record.title)) add(`w:${word}`, WEIGHT.title)
  const year = Number(String(record.date).slice(0, 4))
  if (Number.isFinite(year)) {
    add(`y:${year}`, WEIGHT.year)
    add(`y:${year - 1}`, WEIGHT.year * 0.5)
    add(`y:${year + 1}`, WEIGHT.year * 0.5)
  }
  return entries
}

// Rarer shared terms say more about two works than common ones do. The result
// is a dense matrix so the similarity pass below is a plain dot product.
function vectors(records) {
  const raw = records.map(features)
  const frequency = new Map()
  for (const entry of raw)
    for (const key of entry.keys())
      frequency.set(key, (frequency.get(key) || 0) + 1)
  const vocabulary = [...frequency.keys()].sort()
  const column = new Map(vocabulary.map((key, index) => [key, index]))
  const width = vocabulary.length
  const matrix = new Float64Array(records.length * width)
  raw.forEach((entry, row) => {
    const offset = row * width
    let sum = 0
    for (const [key, weight] of entry) {
      const value =
        weight * Math.log(1 + records.length / (frequency.get(key) || 1))
      matrix[offset + column.get(key)] = value
      sum += value * value
    }
    const norm = Math.sqrt(sum) || 1
    for (let index = 0; index < width; index++) matrix[offset + index] /= norm
  })
  return { matrix, width }
}

function similarities({ matrix, width }, count) {
  const table = Array.from({ length: count }, () => new Float64Array(count))
  for (let a = 0; a < count; a++) {
    table[a][a] = 1
    for (let b = a + 1; b < count; b++) {
      let total = 0
      for (let index = 0; index < width; index++)
        total += matrix[a * width + index] * matrix[b * width + index]
      const clamped = Math.min(1, Math.max(-1, total))
      table[a][b] = clamped
      table[b][a] = clamped
    }
  }
  return table
}

// Deterministic power iteration with deflation: enough for the leading axes.
function principalAxes(gram, count) {
  const n = gram.length
  const matrix = gram.map((row) => Float64Array.from(row))
  const axes = []
  for (let axis = 0; axis < count; axis++) {
    let vector = Float64Array.from({ length: n }, (_, index) =>
      Math.cos((index + 1) * (axis + 1) * 2.399963229728653),
    )
    let value = 0
    for (let step = 0; step < 260; step++) {
      const next = new Float64Array(n)
      for (let row = 0; row < n; row++) {
        const source = matrix[row]
        let total = 0
        for (let column = 0; column < n; column++)
          total += source[column] * vector[column]
        next[row] = total
      }
      let length = 0
      for (let index = 0; index < n; index++)
        length += next[index] * next[index]
      length = Math.sqrt(length)
      if (length < 1e-12) break
      let drift = 0
      for (let index = 0; index < n; index++) {
        next[index] /= length
        drift += Math.abs(next[index] - vector[index])
      }
      vector = next
      value = length
      if (drift < 1e-11) break
    }
    axes.push({ value, vector })
    for (let row = 0; row < n; row++)
      for (let column = 0; column < n; column++)
        matrix[row][column] -= value * vector[row] * vector[column]
  }
  return axes
}

// Classical multidimensional scaling of the cosine distances. The axes are
// partially whitened: the leading axis stays dominant, but not so dominant that
// the configuration collapses into a streak when seen from another angle.
function scale(similarity, dimensions, sharpness = 0.45) {
  const n = similarity.length
  const squared = similarity.map((row) => row.map((value) => 2 - 2 * value))
  const rowMeans = squared.map(
    (row) => row.reduce((total, value) => total + value, 0) / n,
  )
  const grandMean = rowMeans.reduce((total, value) => total + value, 0) / n
  const gram = squared.map((row, i) =>
    row.map(
      (value, j) => -0.5 * (value - rowMeans[i] - rowMeans[j] + grandMean),
    ),
  )
  const axes = principalAxes(gram, dimensions)
  const strongest = Math.max(...axes.map((axis) => axis.value), 1e-9)
  return Array.from({ length: n }, (_, index) =>
    axes.map(
      ({ value, vector }) =>
        vector[index] *
        Math.sqrt(strongest) *
        Math.pow(Math.max(value, 0) / strongest, sharpness / 2),
    ),
  )
}

// Scales the configuration to a unit ball, softening far outliers.
function normalise(points) {
  const centre = [0, 1, 2].map(
    (axis) =>
      points.reduce((total, point) => total + point[axis], 0) / points.length,
  )
  const centred = points.map((point) =>
    point.map((value, axis) => value - centre[axis]),
  )
  const radii = centred
    .map((point) => Math.hypot(...point))
    .sort((a, b) => a - b)
  const reference =
    radii[Math.min(radii.length - 1, Math.floor(radii.length * 0.9))] || 1
  return centred.map((point) => {
    const radius = Math.hypot(...point) / reference
    if (radius < 1e-9) return [0, 0, 0]
    const limited = radius <= 1 ? radius : 1 + Math.log(radius) * 0.45
    const factor = limited / radius / reference
    return point.map((value) => value * factor)
  })
}

// Works with identical feature vectors land on the same coordinate. A short
// deterministic relaxation gives every one of them its own place to be seen
// without disturbing the clusters the scaling found.
function relax(points, { separation = 0.2, steps = 150 } = {}) {
  const n = points.length
  const anchors = Float64Array.from(points.flat())
  const current = Float64Array.from(
    points.flat().map((value, slot) => {
      const index = Math.floor(slot / 3)
      const axis = slot % 3
      return (
        value + Math.sin((index + 1) * (axis + 3) * 12.9898) * separation * 0.05
      )
    }),
  )
  for (let step = 0; step < steps; step++) {
    const pull = 0.07 + 0.13 * (step / steps)
    for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++) {
        let dx = current[a * 3] - current[b * 3]
        let dy = current[a * 3 + 1] - current[b * 3 + 1]
        let dz = current[a * 3 + 2] - current[b * 3 + 2]
        let distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (distance >= separation) continue
        if (distance < 1e-6) {
          const phase = (a * 7 + b * 13) % 360
          dx = Math.cos(phase)
          dy = Math.sin(phase * 1.7)
          dz = Math.sin(phase * 0.6)
          distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
        }
        const push = ((separation - distance) / distance) * 0.5
        current[a * 3] += dx * push
        current[a * 3 + 1] += dy * push
        current[a * 3 + 2] += dz * push
        current[b * 3] -= dx * push
        current[b * 3 + 1] -= dy * push
        current[b * 3 + 2] -= dz * push
      }
    for (let slot = 0; slot < current.length; slot++)
      current[slot] += (anchors[slot] - current[slot]) * pull
  }
  return Array.from({ length: n }, (_, index) => [
    current[index * 3],
    current[index * 3 + 1],
    current[index * 3 + 2],
  ])
}

export function buildMap(records, { neighbours = 3, separation = 0.2 } = {}) {
  const similarity = similarities(vectors(records), records.length)
  const positions = relax(normalise(scale(similarity, 3)), { separation })
  const nodes = records.map((record, index) => ({
    index,
    slug: record.slug,
    title: record.title,
    category: record.category,
    categories: (record.categories || []).filter((entry) => entry !== 'all'),
    year: Number(String(record.date).slice(0, 4)),
    weight: (record.technologies || []).length,
    position: positions[index],
  }))
  const links = []
  const seen = new Set()
  similarity.forEach((row, index) => {
    Array.from(row, (value, other) => [value, other])
      .filter(([, other]) => other !== index)
      .sort((a, b) => b[0] - a[0])
      .slice(0, neighbours)
      .forEach(([value, other]) => {
        if (value < 0.08) return
        const key = index < other ? `${index}:${other}` : `${other}:${index}`
        if (seen.has(key)) return
        seen.add(key)
        links.push({ from: index, to: other, strength: value })
      })
  })
  return { nodes, links, similarity }
}

export function commonTechnologies(records, count = 8) {
  const frequency = new Map()
  for (const record of records)
    for (const technology of record.technologies || [])
      frequency.set(technology, (frequency.get(technology) || 0) + 1)
  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([term, total]) => ({ term, total }))
}
