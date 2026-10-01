import test from 'node:test'
import assert from 'node:assert/strict'
import { validateContent } from '../scripts/validate-content.mjs'
import {
  profile,
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
  previewAttributes,
  previewPath,
  previewSources,
  previewWidths,
} from '../src/asif/images.mjs'
import { canonical, mergeContent } from '../scripts/content-merge.mjs'
import { assetPath, normalize, readContent } from '../scripts/mithawala-com.mjs'

const project = (slug, fields = {}) => ({
  id: slug.length,
  slug,
  title: slug,
  categories: ['all', 'project'],
  ...fields,
})

test('content sync takes new records from mithawala.com and keeps edits made here', () => {
  const base = [project('older'), project('oldest')]
  const theirs = [
    project('newest'),
    project('newer'),
    project('older'),
    project('oldest'),
  ]
  const ours = [
    project('older', { title: 'older, corrected here' }),
    project('local-only'),
    project('oldest'),
  ]
  const { merged, report } = mergeContent(base, theirs, ours, 'portfolio')
  assert.deepEqual(
    merged.map((record) => record.slug),
    ['newest', 'newer', 'older', 'local-only', 'oldest'],
  )
  assert.equal(merged[2].title, 'older, corrected here')
  assert.deepEqual(report.added, ['portfolio[newest]', 'portfolio[newer]'])
  assert.deepEqual(report.kept, [
    'portfolio[older].title',
    'portfolio[local-only]',
  ])
  assert.deepEqual(report.conflicts, [])
})

test('content sync applies changes and removals made only in mithawala.com', () => {
  const base = [project('kept', { title: 'Old' }), project('dropped')]
  const theirs = [project('kept', { title: 'New', links: ['x'] })]
  const { merged, report } = mergeContent(
    base,
    theirs,
    structuredClone(base),
    'portfolio',
  )
  assert.deepEqual(merged, theirs)
  assert.deepEqual(report.removed, ['portfolio[dropped]'])
  assert.deepEqual(report.changed.sort(), [
    'portfolio[kept].links',
    'portfolio[kept].title',
  ])
})

test('content sync ignores key order and still reports conflicting edits', () => {
  const profileBase = {
    name: 'A',
    resume: { experience: [{ company: 'X', period: '2020', title: 'Old' }] },
  }
  const reordered = {
    resume: { experience: [{ title: 'Old', period: '2020', company: 'X' }] },
    name: 'A',
  }
  assert.deepEqual(
    mergeContent(profileBase, reordered, profileBase, '').report,
    { added: [], removed: [], changed: [], kept: [], conflicts: [] },
  )
  assert.deepEqual(
    JSON.stringify(canonical(reordered)),
    JSON.stringify(canonical(profileBase)),
  )
  const theirs = structuredClone(profileBase)
  theirs.resume.experience[0].title = 'Theirs'
  const ours = structuredClone(profileBase)
  ours.resume.experience[0].title = 'Ours'
  ours.name = 'B'
  const { merged, report } = mergeContent(profileBase, theirs, ours, '')
  assert.deepEqual(
    report.conflicts.map((conflict) => conflict.path),
    ['resume.experience[X / 2020].title'],
  )
  assert.equal(merged.name, 'B')
  const removed = mergeContent(
    [project('edited')],
    [],
    [project('edited', { title: 'changed here' })],
    'portfolio',
  )
  assert.deepEqual(
    removed.report.conflicts.map((conflict) => conflict.path),
    ['portfolio[edited]'],
  )
  assert.equal(removed.merged[0].title, 'changed here')
})

test('the mithawala.com reader maps shared paths to their home here', () => {
  assert.equal(
    assetPath('public/images/portfolio/x/cover.png'),
    'public/asif/assets/images/portfolio/x/cover.png',
  )
  assert.equal(assetPath('public/cv.pdf'), 'public/asif/assets/cv.pdf')
  assert.deepEqual(
    normalize({
      image: '/images/a.png',
      html: '<img src="/images/b.png"> https://mithawala.com/images/c.png',
      cv: '/cv.pdf',
    }),
    {
      image: '/asif/assets/images/a.png',
      html: '<img src="/asif/assets/images/b.png"> /asif/assets/images/c.png',
      cv: '/asif/assets/cv.pdf',
    },
  )
  const source = {
    'src/App.jsx': 'const siteData = { name: "Asif" }',
    'src/pages/AboutMe.jsx': 'const aboutData = {}; const services = []',
    'src/pages/Resume.jsx':
      'const education = []; const experience = []; const functionalSkills = []; const codingSkills = []',
    'src/pages/Portfolio.jsx':
      'export const portfolioItems = [{ slug: "a", image: "/images/a.png", descriptionHtml: `<p>One</p>` }]',
    'src/pages/Blog.jsx': 'export const blogPosts = []',
    'src/pages/Contact.jsx':
      'const contactInfo = []; const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/x"',
    'src/pages/Music.jsx':
      'const soundcloudProfileUrl = "https://soundcloud.com/x"',
  }
  const content = readContent((file) => source[file])
  assert.deepEqual(content['portfolio.json'], [
    {
      slug: 'a',
      image: '/asif/assets/images/a.png',
      descriptionHtml: '<p>One</p>',
    },
  ])
  assert.equal(content['profile.json'].name, 'Asif')
  assert.equal(
    content['profile.json'].heroPhoto,
    '/asif/assets/images/main/sp_photo.jpg',
  )
  // The map comes from MAP_URL; revisions from before it fall back.
  assert.match(content['profile.json'].contact.mapUrl, /q=T-Centralen/)
  const withMap = readContent((file) =>
    file === 'src/pages/Contact.jsx'
      ? `${source[file]}; const MAP_URL = "https://www.google.com/maps?ll=1,2&z=14&output=embed"`
      : source[file],
  )
  assert.equal(
    withMap['profile.json'].contact.mapUrl,
    'https://www.google.com/maps?ll=1,2&z=14&output=embed',
  )
  assert.throws(
    () =>
      readContent((file) =>
        file === 'src/pages/Blog.jsx'
          ? 'export const blogPosts = [makePost()]'
          : source[file],
      ),
    /Nonliteral source content/,
  )
})

test('all canonical content, assets, and version records are valid', () => {
  assert.equal(validateContent().portfolio, portfolio.length)
})

test('the shared map shows the Kungsholmen area without a pin or address', () => {
  const url = new URL(profile.contact.mapUrl)
  assert.equal(url.origin, 'https://www.google.com')
  assert.equal(url.pathname, '/maps')
  assert.equal(url.searchParams.get('ll'), '59.3381,18.0308')
  assert.equal(url.searchParams.get('z'), '14')
  assert.equal(url.searchParams.get('output'), 'embed')
  // A search or place ID would drop a pin on a specific spot.
  for (const pin of ['q', 'cid', 'place_id', 'daddr'])
    assert.equal(url.searchParams.has(pin), false, `map must not use ${pin}`)
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
