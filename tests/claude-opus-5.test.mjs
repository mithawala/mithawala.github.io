import test from 'node:test'
import assert from 'node:assert/strict'
import { portfolio } from '../src/asif/content.mjs'
import {
  buildMap,
  commonTechnologies,
} from '../src/asif/themes/claude-opus-5/map.mjs'
import {
  rampColour,
  yearScale,
  flatten,
} from '../src/asif/themes/claude-opus-5/field.js'

const distance = (a, b) =>
  Math.hypot(
    a.position[0] - b.position[0],
    a.position[1] - b.position[1],
    a.position[2] - b.position[2],
  )

test('the semantic map places every work once, deterministically', () => {
  const first = buildMap(portfolio)
  const second = buildMap(portfolio)
  assert.equal(first.nodes.length, portfolio.length)
  assert.deepEqual(
    first.nodes.map((node) => node.slug),
    portfolio.map((record) => record.slug),
  )
  assert.deepEqual(
    first.nodes.map((node) => node.position),
    second.nodes.map((node) => node.position),
  )
  for (const node of first.nodes) {
    assert.ok(node.position.every(Number.isFinite))
    assert.ok(Math.hypot(...node.position) < 3)
  }
})

test('no two works share a coordinate, so all of them stay clickable', () => {
  const { nodes } = buildMap(portfolio)
  let closest = Infinity
  for (let a = 0; a < nodes.length; a++)
    for (let b = a + 1; b < nodes.length; b++)
      closest = Math.min(closest, distance(nodes[a], nodes[b]))
  assert.ok(closest > 0.1, `works overlap at ${closest}`)
})

test('works of the same kind land closer together than works of other kinds', () => {
  const { nodes } = buildMap(portfolio)
  const groups = new Map()
  for (const node of nodes) {
    if (!groups.has(node.category)) groups.set(node.category, [])
    groups.get(node.category).push(node)
  }
  let compared = 0
  for (const [category, members] of groups) {
    if (members.length < 2) continue
    let within = 0
    let across = 0
    let withinCount = 0
    let acrossCount = 0
    for (const node of members)
      for (const other of nodes) {
        if (node === other) continue
        const gap = distance(node, other)
        if (other.category === category) {
          within += gap
          withinCount++
        } else {
          across += gap
          acrossCount++
        }
      }
    compared++
    assert.ok(
      within / withinCount < across / acrossCount,
      `${category} is not grouped`,
    )
  }
  assert.ok(compared >= 4)
})

test('the arrangement is not flattened into a single streak', () => {
  const { nodes } = buildMap(portfolio)
  const spread = [0, 1, 2].map((axis) => {
    const values = nodes.map((node) => node.position[axis])
    const mean =
      values.reduce((total, value) => total + value, 0) / values.length
    return Math.sqrt(
      values.reduce((total, value) => total + (value - mean) ** 2, 0) /
        values.length,
    )
  })
  assert.ok(Math.min(...spread) / Math.max(...spread) > 0.6, spread.join(', '))
})

test('neighbour links join real, distinct works without duplicates', () => {
  const { nodes, links } = buildMap(portfolio)
  assert.ok(links.length > nodes.length / 2)
  const seen = new Set()
  for (const link of links) {
    assert.notEqual(link.from, link.to)
    assert.ok(nodes[link.from] && nodes[link.to])
    assert.ok(link.strength > 0 && link.strength <= 1)
    const key = [link.from, link.to].sort((a, b) => a - b).join(':')
    assert.ok(!seen.has(key))
    seen.add(key)
  }
})

test('content changes move the map instead of being ignored', () => {
  const changed = portfolio.map((record, index) =>
    index === 0
      ? {
          ...record,
          categories: ['all', 'event'],
          technologies: ['Vätternrundan'],
        }
      : record,
  )
  const before = buildMap(portfolio)
  const after = buildMap(changed)
  assert.ok(distance(before.nodes[0], after.nodes[0]) > 0.2)
  assert.equal(after.nodes[0].categories.join(), 'event')
})

test('the colour scale spans the years present in the content', () => {
  const { nodes } = buildMap(portfolio)
  const scale = yearScale(nodes)
  assert.equal(scale.first, Math.min(...nodes.map((node) => node.year)))
  assert.equal(scale.last, Math.max(...nodes.map((node) => node.year)))
  assert.equal(scale.tone(scale.first), 0)
  assert.equal(scale.tone(scale.last), 1)
  const [low, high] = [rampColour(0), rampColour(1)]
  assert.ok(low.every((value) => value >= 0 && value <= 1))
  assert.notDeepEqual(low, high)
  assert.deepEqual(rampColour(-5), low)
  assert.deepEqual(rampColour(5), high)
})

test('the static fallback draws the same works inside its frame', () => {
  const { nodes } = buildMap(portfolio)
  const points = flatten(nodes)
  assert.equal(points.length, nodes.length)
  for (const point of points) {
    assert.ok(point.x >= 0 && point.x <= 100, `x ${point.x}`)
    assert.ok(point.y >= 0 && point.y <= 100, `y ${point.y}`)
    assert.ok(Number.isFinite(point.depth))
  }
  assert.notDeepEqual(flatten(nodes, { yaw: 1.2, pitch: -0.3 })[0], points[0])
})

test('the technology tally reports real counts from the records', () => {
  const top = commonTechnologies(portfolio, 5)
  assert.equal(top.length, 5)
  for (const { term, total } of top)
    assert.equal(
      total,
      portfolio.filter((record) => (record.technologies || []).includes(term))
        .length,
    )
  assert.ok(top[0].total >= top[4].total)
})
