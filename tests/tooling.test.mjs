import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { versions } from '../src/versions.mjs'

// The only test files every edition builder may read. All others belong to an
// edition and are named after its registered ID.
const SHARED_TESTS = [
  'e2e/site.spec.mjs',
  'content.test.mjs',
  'tooling.test.mjs',
]

const filesIn = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesIn(path.join(directory, entry.name))
      : [path.join(directory, entry.name)],
  )

test('Pages workflow validates changes before a main-only deployment', () => {
  const workflow = parse(readFileSync('.github/workflows/pages.yml', 'utf8'))
  assert.deepEqual(workflow.on.push.branches, ['main'])
  assert.deepEqual(workflow.on.pull_request.branches, ['main'])
  assert.equal(workflow.permissions.contents, 'read')
  assert.equal(workflow.jobs.deploy.needs, 'build')
  assert.equal(workflow.jobs.deploy.permissions.pages, 'write')
  assert.equal(workflow.jobs.deploy.permissions['id-token'], 'write')
  assert.ok(workflow.jobs.deploy.if.includes("github.ref == 'refs/heads/main'"))
  assert.ok(
    workflow.jobs.deploy.if.includes("github.event_name != 'pull_request'"),
  )
  const commands = workflow.jobs.build.steps
    .map((step) => step.run)
    .filter(Boolean)
  for (const command of [
    'npm ci',
    'npm test',
    'npm run build',
    'npm run test:e2e',
  ])
    assert.ok(commands.includes(command))
  assert.ok(
    workflow.jobs.build.steps.some(
      (step) =>
        step.uses?.startsWith('actions/upload-pages-artifact@') &&
        step.with.path === 'dist',
    ),
  )
})

test('new-edition skill has valid discoverable metadata and mandatory contracts', () => {
  const text = readFileSync(
    '.github/skills/build-personal-edition/SKILL.md',
    'utf8',
  )
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  assert.ok(frontmatter, 'Skill must start with YAML frontmatter')
  const metadata = parse(frontmatter[1])
  assert.equal(metadata.name, 'build-personal-edition')
  assert.equal(metadata['user-invocable'], true)
  assert.ok(
    metadata.description.length > 50 && metadata.description.length < 1024,
  )
  for (const requirement of [
    'content/asif/',
    'src/versions.mjs',
    'npm run test:e2e',
    'Do not',
    'independent',
  ])
    assert.ok(text.toLowerCase().includes(requirement.toLowerCase()))
  assert.ok(
    readFileSync('AGENTS.md', 'utf8').includes(
      '.github/skills/build-personal-edition/SKILL.md',
    ),
  )
})

test('the blind-entry rule stays in the skill and the project instructions', () => {
  const skill = readFileSync(
    '.github/skills/build-personal-edition/SKILL.md',
    'utf8',
  ).toLowerCase()
  const agents = readFileSync('AGENTS.md', 'utf8').toLowerCase()
  for (const rule of [
    'blind entry',
    'cheating',
    'fresh session',
    'src/asif/themes/',
    'public/gallery/previews/',
    'clean-room statement',
    'the answer to beat',
  ])
    assert.ok(skill.includes(rule), `skill lost: ${rule}`)
  for (const file of SHARED_TESTS)
    assert.ok(skill.includes(`tests/${file}`), `skill must list tests/${file}`)
  for (const rule of ['blind entry', 'cheating', 'fresh session'])
    assert.ok(agents.includes(rule), `AGENTS.md lost: ${rule}`)
})

test('editions never import code or styles from another edition', () => {
  const root = path.resolve('src/asif/themes')
  const reference =
    /(?:\bfrom\s*|\bimport\s*\(?\s*|@import\s+(?:url\()?\s*|url\(\s*)['"]([^'"]+)['"]/g
  for (const edition of readdirSync(root)) {
    for (const file of filesIn(path.join(root, edition))) {
      if (!/\.(jsx?|mjs|css)$/.test(file)) continue
      for (const [, specifier] of readFileSync(file, 'utf8').matchAll(
        reference,
      )) {
        const target = specifier.startsWith('.')
          ? path.resolve(path.dirname(file), specifier)
          : specifier
        const owner = target.startsWith(root + path.sep)
          ? target.slice(root.length + 1).split(path.sep)[0]
          : specifier.match(/themes\/([^/]+)\//)?.[1]
        if (owner)
          assert.equal(
            owner,
            edition,
            `${path.relative('.', file)} imports ${specifier}`,
          )
      }
    }
  }
})

test('edition-specific tests are named after a registered edition', () => {
  const ids = versions.map((version) =>
    version.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  )
  const named = new RegExp(
    `^(${ids.join('|')})(\\.[a-z0-9-]+)?\\.(test|spec)\\.mjs$`,
  )
  const files = filesIn('tests')
    .map((file) => path.relative('tests', file).split(path.sep).join('/'))
    .filter((file) => /\.(test|spec)\.mjs$/.test(file))
  assert.ok(files.length > SHARED_TESTS.length)
  for (const file of files) {
    if (SHARED_TESTS.includes(file)) continue
    assert.match(
      path.basename(file),
      named,
      `${file} must be shared or named after an edition ID`,
    )
  }
})
