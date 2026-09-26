import test from 'node:test'
import assert from 'node:assert/strict'
import { profile } from '../src/asif/content.mjs'
import {
  parsePeriod,
  mostAtOnce,
} from '../src/asif/themes/claude-opus-5-5/timeline.js'
import {
  SCENE,
  cameraFor,
  frameRect,
  project,
  quadMatrix,
  sunDirection,
  lampPosition,
  onWall,
} from '../src/asif/themes/claude-opus-5-5/scene.js'
import { fragmentShader } from '../src/asif/themes/claude-opus-5-5/shader.js'

test('Claude Opus 5.5 timeline reads every canonical period', () => {
  const now = 2026.5
  for (const entry of [
    ...profile.resume.experience,
    ...profile.resume.education,
  ]) {
    const span = parsePeriod(entry.period, now)
    assert.ok(span, `Unreadable period: ${entry.period}`)
    assert.ok(span.end > span.start)
  }
  assert.deepEqual(parsePeriod('2011', now), { start: 2011, end: 2012 })
  assert.equal(parsePeriod('Mar 2026 - Current', now).end, now)
  const span = parsePeriod('Nov 2008 - July 2013', now)
  assert.equal(span.start, 2008 + 10 / 12)
  assert.equal(span.end, 2013 + 7 / 12)
  assert.equal(parsePeriod('2009 – 2014', now).end, 2015)
  assert.equal(parsePeriod('not a date', now), null)
  assert.equal(
    mostAtOnce([
      { start: 1, end: 5 },
      { start: 2, end: 3 },
      { start: 3, end: 4 },
      { start: 2.5, end: 6 },
    ]),
    3,
  )
})

test('Claude Opus 5.5 room geometry is shared by WebGL and the DOM fallback', () => {
  const width = 1440
  const height = 1000
  const camera = cameraFor(width, height)
  const rect = frameRect(camera, width, height)
  const f = SCENE.frame
  const [cx, cy] = project([f.x, f.y, f.depth], camera, width, height)
  assert.ok(Math.abs(rect.left + rect.width / 2 - cx) < 0.5)
  assert.ok(Math.abs(rect.top + rect.height / 2 - cy) < 0.5)
  assert.ok(rect.left > width / 2 && rect.left + rect.width < width)

  const corners = [
    [120, 80],
    [520, 130],
    [480, 610],
    [90, 540],
  ]
  const values = quadMatrix(200, 300, corners)
    .slice(9, -1)
    .split(',')
    .map(Number)
  const apply = (x, y) => {
    const w = values[3] * x + values[7] * y + values[15]
    return [
      (values[0] * x + values[4] * y + values[12]) / w,
      (values[1] * x + values[5] * y + values[13]) / w,
    ]
  }
  ;[
    [0, 0],
    [200, 0],
    [200, 300],
    [0, 300],
  ].forEach(([x, y], index) => {
    const [px, py] = apply(x, y)
    assert.ok(Math.abs(px - corners[index][0]) < 0.01)
    assert.ok(Math.abs(py - corners[index][1]) < 0.01)
  })

  const direction = sunDirection(SCENE.sun.azimuth, SCENE.sun.elevation)
  assert.ok(direction[0] < 0 && direction[1] > 0 && direction[2] > 0)
  const lamp = lampPosition(direction)
  assert.ok(lamp[0] < SCENE.window.plane, 'The lantern stands outside')
  const landing = onWall([SCENE.window.plane, 3, SCENE.window.u], {
    type: 'sun',
    direction,
  })
  assert.ok(Math.abs(landing[2]) < 1e-9)
  const shader = fragmentShader()
  assert.match(shader, new RegExp(`#define WX ${SCENE.window.plane}`))
  assert.match(shader, /float lattice\(vec2 w\)/)
})
