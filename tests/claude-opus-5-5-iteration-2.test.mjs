import test from 'node:test'
import assert from 'node:assert/strict'
import { profile, portfolio, blog, contract } from '../src/asif/content.mjs'
import {
  ROUTE,
  barcode,
  boardDate,
  buildRoute,
  flapGrid,
  flapLayout,
  flightCode,
  parsePeriod,
  projectRemark,
  readingMinutes,
  scheduleOf,
  wrapFlapText,
} from '../src/asif/themes/claude-opus-5-5-iteration-2/airside.mjs'

const now = new Date('2026-09-27T12:00:00Z')

test('the taxi route visits every contract section exactly once', () => {
  const route = buildRoute({ contract, profile, portfolio, blog })
  assert.deepEqual(
    [...route.map((stop) => stop.id)].sort(),
    contract.sections.map((section) => section.id).sort(),
  )
  assert.equal(new Set(ROUTE.map((stop) => stop.letter)).size, ROUTE.length)
  for (const stop of route) {
    const section = contract.sections.find((entry) => entry.id === stop.id)
    assert.equal(stop.label, section.label)
    assert.ok(stop.remark)
  }
  const remarks = Object.fromEntries(
    route.map((stop) => [stop.id, stop.remark]),
  )
  assert.match(remarks.portfolio, new RegExp(`^${portfolio.length} `))
  assert.match(remarks.blog, new RegExp(`^${blog.length} `))
})

test('every resume period is charted from the canonical strings', () => {
  const entries = [...profile.resume.experience, ...profile.resume.education]
  for (const entry of entries) {
    const span = parsePeriod(entry.period, now)
    assert.ok(span, `unparsed period: ${entry.period}`)
    assert.ok(span.end > span.start)
  }
  assert.deepEqual(parsePeriod('2011', now), {
    start: 2011,
    end: 2012,
    current: false,
  })
  assert.equal(parsePeriod('Mar 2026 - Current', now).current, true)
  assert.equal(parsePeriod('not a period', now), null)
  const schedule = scheduleOf(entries, now)
  assert.equal(schedule.rows.length, entries.length)
  assert.ok(schedule.from <= 2005 && schedule.to >= 2026)
})

test('split-flap layouts keep words whole and never exceed the panel', () => {
  const name = profile.name
  for (const width of [240, 296, 342, 600, 960]) {
    const layout = flapLayout([name], width, {
      min: 34,
      max: 74,
      gap: 5,
      floor: 14,
    })
    assert.ok(layout.cols * layout.size + (layout.cols - 1) * 5 <= width)
    for (const line of layout.wrapped[0]) assert.ok(line.length <= layout.cols)
    assert.equal(layout.wrapped[0].join(' '), name.toUpperCase())
  }
  const roles = profile.roles
  const layout = flapLayout(roles, 232, { min: 19, max: 32, gap: 3, floor: 11 })
  roles.forEach((role, index) => {
    const joined = layout.wrapped[index].join(' ').replace(/- /g, '-')
    assert.equal(joined, role.toUpperCase())
  })
  const grid = flapGrid(layout.wrapped[0], layout.cols, layout.rows)
  assert.equal(grid.length, layout.rows)
  assert.ok(grid.every((row) => row.length === layout.cols))
  assert.deepEqual(wrapFlapText('Frontend-developer', 12), [
    'FRONTEND-',
    'DEVELOPER',
  ])
})

test('departure board fields derive from each portfolio record', () => {
  const codes = portfolio.map((item) => flightCode(portfolio, item))
  assert.equal(new Set(codes).size, portfolio.length)
  assert.equal(codes[0], `AM ${String(portfolio.length).padStart(3, '0')}`)
  for (const item of portfolio) {
    assert.match(boardDate(item.date), /^\d{2} [A-Z]{3} \d{4}$/)
    assert.ok(projectRemark(item).length > 0)
  }
  const live = portfolio.find((item) => item.deviceMockup)
  assert.equal(projectRemark(live), 'Live demo')
  for (const post of blog) assert.ok(readingMinutes(post.content) >= 1)
})

test('decorative barcodes are deterministic', () => {
  assert.deepEqual(barcode(profile.name), barcode(profile.name))
  assert.notDeepEqual(barcode(profile.name), barcode(`${profile.name}!`))
  for (const bar of barcode(profile.name, 96))
    assert.ok(bar.x >= 0 && bar.x + bar.width <= 96)
})
