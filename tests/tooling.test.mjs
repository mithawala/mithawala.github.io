import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

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
