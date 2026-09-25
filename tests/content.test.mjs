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
