import test from 'node:test'
import assert from 'node:assert/strict'
import { validateContent } from '../scripts/validate-content.mjs'
import {
  portfolio,
  blog,
  detailPath,
  resolveDetail,
  filterPortfolio,
  searchContent,
  formatTime,
} from '../src/asif/content.mjs'
import { versions } from '../src/versions.mjs'
import {
  NEXUS_SIGNALS,
  emptyExpedition,
  parseExpedition,
  loadExpedition,
  saveExpedition,
  updateExpedition,
  expeditionStats,
} from '../src/gallery/nexus-game.mjs'
import {
  previewAttributes,
  previewPath,
  previewSources,
  previewWidths,
} from '../src/asif/images.mjs'

test('all canonical content, assets, and version records are valid', () => {
  assert.equal(validateContent().portfolio, portfolio.length)
})

test('every detail route resolves within each version namespace', () => {
  for (const version of versions) {
    for (const [kind, records] of [
      ['project', portfolio],
      ['blog', blog],
    ]) {
      for (const record of records)
        assert.equal(
          resolveDetail(version, detailPath(version, kind, record.slug)).record,
          record,
        )
    }
    assert.equal(resolveDetail(version, version.path), null)
    assert.equal(
      resolveDetail(version, `${version.path}project/not-a-project/`).missing,
      true,
    )
    assert.equal(
      resolveDetail(version, `${version.path}project/%E0%A4/`).missing,
      true,
    )
    assert.equal(resolveDetail(version, '/my-awesome-campaign/'), null)
  }
})

test('filtering preserves all records and combines category and search', () => {
  assert.equal(filterPortfolio(portfolio).length, portfolio.length)
  assert.ok(
    filterPortfolio(portfolio, 'app').every((entry) =>
      entry.categories.includes('app'),
    ),
  )
  assert.equal(
    filterPortfolio(portfolio, 'all', 'voicecom')[0].slug,
    'voicecom',
  )
  assert.equal(filterPortfolio(portfolio, 'event', 'voicecom').length, 0)
})

test('search includes project descriptions and full articles', () => {
  assert.ok(
    searchContent('VoiceCom').some(
      (result) => result.record.slug === 'voicecom',
    ),
  )
  assert.ok(
    searchContent('Two-Way Door').some((result) => result.kind === 'blog'),
  )
  assert.deepEqual(searchContent('   '), [])
})

test('content edits flow through consumers rather than a theme-specific copy', () => {
  const changed = portfolio.map((entry, index) =>
    index ? entry : { ...entry, title: 'Shared content update' },
  )
  for (const version of versions) {
    assert.equal(
      filterPortfolio(changed, 'all', 'Shared content update').length,
      1,
    )
    assert.ok(
      detailPath(version, 'project', changed[0].slug).startsWith(version.path),
    )
  }
})

test('player timestamps are stable', () => {
  assert.equal(formatTime(65000), '1:05')
  assert.equal(formatTime(-1), '0:00')
})

test('responsive previews derive from canonical covers and preserve originals', () => {
  assert.equal(new Set(previewSources).size, previewSources.length)
  const source = portfolio[0].image
  const attributes = previewAttributes(source, '50vw')
  assert.equal(attributes.src, source)
  assert.equal(attributes.sizes, '50vw')
  for (const width of previewWidths) {
    assert.ok(
      attributes.srcSet.includes(`${previewPath(source, width)} ${width}w`),
    )
    assert.ok(previewPath(source, width).startsWith('/asif/previews/'))
  }
  assert.throws(() => previewPath(source, 123), /Unsupported image preview/)
  assert.throws(() => previewAttributes(source), /sizes are required/)
  for (const original of [
    'https://example.com/art.png',
    '/asif/assets/animation.gif',
    '/asif/assets/logo.svg',
  ])
    assert.deepEqual(previewAttributes(original, '50vw'), { src: original })
})

test('gallery expedition actions are immutable and discoveries cannot be counted twice', () => {
  const worldIds = versions.map((version) => version.id)
  const initial = emptyExpedition()
  const scanned = updateExpedition(
    initial,
    { type: 'scan', id: worldIds[0] },
    worldIds,
  )
  assert.deepEqual(initial, { scanned: [], signals: [], compared: false })
  assert.notEqual(initial.scanned, emptyExpedition().scanned)
  assert.deepEqual(scanned.scanned, [worldIds[0]])
  assert.equal(
    updateExpedition(scanned, { type: 'scan', id: worldIds[0] }, worldIds),
    scanned,
  )
  const collected = updateExpedition(
    scanned,
    { type: 'signal', id: NEXUS_SIGNALS[0].id },
    worldIds,
  )
  assert.equal(
    updateExpedition(
      collected,
      { type: 'signal', id: NEXUS_SIGNALS[0].id },
      worldIds,
    ),
    collected,
  )
  const compared = updateExpedition(collected, { type: 'compare' }, worldIds)
  assert.equal(
    updateExpedition(compared, { type: 'compare' }, worldIds),
    compared,
  )
  assert.deepEqual(
    updateExpedition(compared, { type: 'reset' }, worldIds),
    emptyExpedition(),
  )
  assert.throws(
    () =>
      updateExpedition(initial, { type: 'scan', id: 'not-a-world' }, worldIds),
    /Unknown expedition world/,
  )
  assert.throws(
    () =>
      updateExpedition(
        initial,
        { type: 'signal', id: 'not-a-signal' },
        worldIds,
      ),
    /Unknown expedition signal/,
  )
  assert.throws(
    () => updateExpedition(initial, { type: 'unknown' }, worldIds),
    /Unknown expedition action/,
  )
})

test('gallery expedition completion follows the whole current collection', () => {
  const worldIds = versions.map((version) => version.id)
  let progress = emptyExpedition()
  for (const id of worldIds)
    progress = updateExpedition(progress, { type: 'scan', id }, worldIds)
  for (const signal of NEXUS_SIGNALS)
    progress = updateExpedition(
      progress,
      { type: 'signal', id: signal.id },
      worldIds,
    )
  assert.equal(expeditionStats(progress, worldIds).complete, false)
  progress = updateExpedition(progress, { type: 'compare' }, worldIds)
  const stats = expeditionStats(progress, worldIds)
  assert.equal(stats.complete, true)
  assert.equal(stats.percent, 100)
  assert.equal(stats.scanned, worldIds.length)
  assert.equal(stats.recovered, NEXUS_SIGNALS.length)
  assert.equal(
    expeditionStats(progress, [...worldIds, 'new-world-fixture']).complete,
    false,
  )
  const oneWorld = {
    scanned: [worldIds[0]],
    signals: NEXUS_SIGNALS.map((signal) => signal.id),
    compared: false,
  }
  assert.equal(expeditionStats(oneWorld, [worldIds[0]]).complete, true)
  assert.equal(expeditionStats(oneWorld, [worldIds[0]]).objectivesTotal, 2)
})

test('gallery expedition progress round-trips through its versioned storage format', () => {
  const worldIds = versions.map((version) => version.id)
  const progress = {
    scanned: [worldIds[0]],
    signals: [NEXUS_SIGNALS[0].id],
    compared: true,
  }
  let saved = null
  assert.deepEqual(
    loadExpedition(() => saved, worldIds).progress,
    emptyExpedition(),
  )
  assert.equal(
    saveExpedition(progress, (value) => {
      saved = value
    }).ok,
    true,
  )
  assert.equal(JSON.parse(saved).schema, 1)
  const loaded = loadExpedition(() => saved, worldIds)
  assert.deepEqual(loaded.progress, progress)
  assert.equal(loaded.persistent, true)
  assert.equal(loaded.notice, '')
})

test('gallery expedition storage failures and stale data have explicit notices', () => {
  const worldIds = versions.map((version) => version.id)
  const denied = loadExpedition(() => {
    throw new Error('Storage denied')
  }, worldIds)
  assert.equal(denied.persistent, false)
  assert.match(denied.notice, /session only/)
  assert.deepEqual(denied.progress, emptyExpedition())
  const failed = saveExpedition(emptyExpedition(), () => {
    throw new Error('Quota exceeded')
  })
  assert.equal(failed.ok, false)
  assert.match(failed.notice, /could not be saved/)
  for (const raw of [
    '{invalid',
    'null',
    '[]',
    '{"schema":2}',
    '{"schema":1,"scanned":[1],"signals":[],"compared":true}',
  ]) {
    const result = parseExpedition(raw, worldIds)
    assert.deepEqual(result.progress, emptyExpedition())
    assert.ok(result.notice)
  }
  const result = parseExpedition(
    JSON.stringify({
      schema: 1,
      scanned: [worldIds[0], worldIds[0], 'removed-world'],
      signals: [NEXUS_SIGNALS[0].id, 'removed-signal'],
      compared: true,
    }),
    worldIds,
  )
  assert.deepEqual(result.progress, {
    scanned: [worldIds[0]],
    signals: [NEXUS_SIGNALS[0].id],
    compared: true,
  })
  assert.match(result.notice, /updated/)
})
