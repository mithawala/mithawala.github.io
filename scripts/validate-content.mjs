import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { profile, portfolio, blog, contract } from '../src/asif/content.mjs'
import { versions } from '../src/versions.mjs'

export function validateContent() {
  for (const [label, records] of Object.entries({ portfolio, blog })) {
    assert.ok(records.length > 0, `${label} cannot be empty`)
    assert.equal(
      new Set(records.map((entry) => entry.id)).size,
      records.length,
      `${label}: duplicate IDs`,
    )
    assert.equal(
      new Set(records.map((entry) => entry.slug)).size,
      records.length,
      `${label}: duplicate slugs`,
    )
    for (const entry of records) {
      assert.match(entry.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      for (const field of ['title', 'image', 'date'])
        assert.ok(entry[field], `${entry.slug}: missing ${field}`)
      if (label === 'blog')
        assert.ok(
          entry.content.trim(),
          `${entry.slug}: article body is required`,
        )
      else {
        assert.ok(
          ['project', 'video', 'image'].includes(entry.type),
          `${entry.slug}: unknown item type`,
        )
        assert.ok(
          entry.categories.every((category) =>
            contract.categories.includes(category),
          ),
        )
        if ('descriptionHtml' in entry)
          assert.equal(typeof entry.descriptionHtml, 'string')
        if (entry.type === 'video')
          assert.ok(entry.videoUrl, `${entry.slug}: video missing`)
      }
    }
  }
  function checkAssets(value) {
    if (typeof value === 'string' && value.startsWith('/asif/assets/')) {
      const location = path.join('public', decodeURIComponent(value))
      assert.ok(existsSync(location), `Missing asset: ${value}`)
    } else if (Array.isArray(value)) value.forEach(checkAssets)
    else if (value && typeof value === 'object')
      Object.values(value).forEach(checkAssets)
  }
  checkAssets({ profile, portfolio, blog })
  assert.equal(
    new Set(versions.map((version) => version.id)).size,
    versions.length,
  )
  for (const version of versions) {
    assert.match(version.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    assert.equal(version.path, `/asif/${version.id}/`)
    assert.ok(version.model && typeof version.load === 'function')
  }
  assert.equal(contract.sections.length, 6)
  assert.ok(
    profile.about.intro &&
      profile.about.experience &&
      profile.about.skills.length,
  )
  assert.ok(
    profile.services.length &&
      profile.resume.education.length &&
      profile.resume.experience.length,
  )
  assert.ok(
    profile.resume.codingSkills.length &&
      profile.resume.functionalSkills.length,
  )
  assert.ok(profile.contact.endpoint.startsWith('https://'))
  assert.ok(profile.music.playlistUrl.startsWith('https://soundcloud.com/'))
  return {
    portfolio: portfolio.length,
    blog: blog.length,
    versions: versions.length,
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log('Content validated:', validateContent())
}
