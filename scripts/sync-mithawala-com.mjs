// Brings new and changed content from the mithawala.com repository into
// content/asif/ and public/asif/assets/, keeping edits made here.
//
//   npm run sync:content                 sync from ../mithawala.com at HEAD
//   npm run sync:content -- --dry-run    report what would change
//   options: --source=<checkout> --ref=<commit or branch>
//
// Only committed content is read. Nothing is written if anything conflicts.

import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { canonical, mergeContent } from './content-merge.mjs'
import {
  assetPath,
  git,
  gitBuffer,
  readContentAt,
  resolveCommit,
  sourceRepository,
} from './mithawala-com.mjs'

const option = (name) =>
  process.argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
const dryRun = process.argv.includes('--dry-run')
const source = path.resolve(option('source') || '../mithawala.com')
const contentDirectory = path.resolve('content/asif')
const manifestFile = path.join(contentDirectory, 'import-manifest.json')
const FILES = {
  'profile.json': '',
  'portfolio.json': 'portfolio',
  'blog.json': 'blog',
}
const SHARED_PATHS = ['public/images', 'public/cv.pdf']
const digest = (value) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
const short = (commit) => commit.slice(0, 7)
const show = (value) =>
  value === undefined ? 'missing' : JSON.stringify(value)?.slice(0, 160)

function fail(message) {
  console.error(`\n${message}`)
  process.exit(1)
}

let theirsCommit
try {
  theirsCommit = resolveCommit(source, option('ref') || 'HEAD')
} catch {
  fail(
    `No mithawala.com checkout at ${source}.\nClone ${sourceRepository} there, or pass --source=<path>.`,
  )
}

const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))
const baseCommit = manifest.sync?.commit ?? manifest.commit
// Before the first sync, the base is the content as it was first committed
// here, straight from the original import.
const firstCommitted = (file) => {
  const target = `content/asif/${file}`
  const commit = git(
    process.cwd(),
    'log',
    '--diff-filter=A',
    '--format=%H',
    '--',
    target,
  )
    .trim()
    .split('\n')
    .at(-1)
  return JSON.parse(git(process.cwd(), 'show', `${commit}:${target}`))
}
const baseHashes =
  manifest.sync?.contentHashes ??
  Object.fromEntries(
    Object.keys(FILES).map((file) => [file, digest(firstCommitted(file))]),
  )
try {
  git(source, 'cat-file', '-e', `${baseCommit}^{commit}`)
} catch {
  fail(
    `The last synced commit ${short(baseCommit)} is not in ${source}.\nFetch its full history (git fetch --unshallow) and try again.`,
  )
}
if (git(source, 'status', '--porcelain', '--', ...SHARED_PATHS, 'src').trim())
  console.warn(
    'Note: mithawala.com has uncommitted changes. Only committed content is synced.',
  )
if (theirsCommit === baseCommit) {
  console.log(`Already in sync with mithawala.com ${short(theirsCommit)}.`)
  process.exit(0)
}

// The base must be exactly what the last sync merged against, or every
// difference would be misattributed to one side.
const base = readContentAt(source, baseCommit)
for (const [file, data] of Object.entries(base))
  if (digest(data) !== baseHashes[file])
    fail(
      `Reading mithawala.com at ${short(baseCommit)} no longer reproduces the ${file} last synced.\nscripts/mithawala-com.mjs changed how content is read; fix that before syncing.`,
    )
const theirs = readContentAt(source, theirsCommit)
const ours = Object.fromEntries(
  Object.keys(FILES).map((file) => [
    file,
    JSON.parse(readFileSync(path.join(contentDirectory, file), 'utf8')),
  ]),
)

const results = Object.fromEntries(
  Object.entries(FILES).map(([file, root]) => [
    file,
    mergeContent(base[file], theirs[file], ours[file], root),
  ]),
)
const conflicts = Object.entries(results).flatMap(([file, { report }]) =>
  report.conflicts.map(
    (conflict) =>
      `${file} ${conflict.path}\n    was:  ${show(conflict.base)}\n    there: ${show(conflict.theirs)}\n    here:  ${show(conflict.ours)}`,
  ),
)

// Shared files: take theirs where this side still has the previous version.
const referenced = JSON.stringify(
  Object.values(results).map(({ merged }) => merged),
)
const blob = (commit, file) => {
  try {
    return git(source, 'rev-parse', `${commit}:${file}`).trim()
  } catch {
    return null
  }
}
const assets = []
const changedFiles = git(
  source,
  'diff',
  '--name-status',
  '--no-renames',
  '-z',
  baseCommit,
  theirsCommit,
  '--',
  ...SHARED_PATHS,
)
  .split('\0')
  .filter(Boolean)
for (let entry = 0; entry < changedFiles.length; entry += 2) {
  const [status, file] = [changedFiles[entry], changedFiles[entry + 1]]
  const target = assetPath(file)
  const local = existsSync(target)
    ? git(process.cwd(), 'hash-object', '--', target).trim()
    : null
  const previous = blob(baseCommit, file)
  if (status === 'D') {
    if (local === null) continue
    if (local !== previous)
      console.warn(`Kept ${target}: removed there, but changed here.`)
    else if (referenced.includes(`/${target.replace(/^public\//, '')}`))
      console.warn(`Kept ${target}: removed there, but still used here.`)
    else assets.push({ action: 'remove', file, target })
    continue
  }
  const next = blob(theirsCommit, file)
  if (local === next) continue
  if (local === null && status === 'A')
    assets.push({ action: 'add', file, target })
  else if (local !== null && local === previous)
    assets.push({ action: 'update', file, target })
  else
    conflicts.push(
      `${target}\n    changed in both repositories (or removed here); resolve it by hand`,
    )
}

const summary = []
for (const [file, { report }] of Object.entries(results)) {
  const lines = [
    ...report.added.map((label) => `  + ${label}`),
    ...report.removed.map((label) => `  - ${label}`),
    ...report.changed.map((label) => `  ~ ${label}`),
    ...report.kept.map((label) => `  = ${label} (kept the edit made here)`),
  ]
  if (lines.length) summary.push(file, ...lines)
}
if (assets.length)
  summary.push(
    'shared files',
    ...assets.map(
      ({ action, target }) =>
        `  ${{ add: '+', update: '~', remove: '-' }[action]} ${target}`,
    ),
  )

console.log(
  `mithawala.com ${short(baseCommit)} -> ${short(theirsCommit)}${dryRun ? ' (dry run)' : ''}\n`,
)
console.log(summary.length ? summary.join('\n') : 'No content changes.')
if (conflicts.length)
  fail(
    `Stopped: ${conflicts.length} conflict(s). Nothing was written.\n\n${conflicts.join('\n\n')}`,
  )
if (dryRun) process.exit(0)

for (const [file, { merged }] of Object.entries(results))
  if (digest(merged) !== digest(ours[file]))
    writeFileSync(
      path.join(contentDirectory, file),
      `${JSON.stringify(merged, null, 2)}\n`,
    )
for (const { action, file, target } of assets) {
  if (action === 'remove') {
    rmSync(target)
    continue
  }
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(
    target,
    gitBuffer(source, 'cat-file', 'blob', `${theirsCommit}:${file}`),
  )
}
manifest.sync = {
  commit: theirsCommit,
  syncedAt: new Date().toISOString(),
  contentHashes: Object.fromEntries(
    Object.entries(theirs).map(([file, data]) => [file, digest(data)]),
  ),
}
writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(
  `\nSynced. Run npm run build to refresh the generated cover images, then the tests.`,
)
