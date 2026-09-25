import { parse } from '@babel/parser'
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  existsSync,
} from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const reference = path.resolve(
  process.argv.find((argument) => argument.startsWith('--source='))?.slice(9) ||
    '../mithawala.com-reference',
)
const verify = process.argv.includes('--verify')
const output = path.resolve('content/asif')

function literal(node) {
  if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(node.type))
    return node.value
  if (node.type === 'NullLiteral') return null
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0].value.cooked
  if (node.type === 'ArrayExpression') return node.elements.map(literal)
  if (node.type === 'ObjectExpression')
    return Object.fromEntries(
      node.properties.map((property) => {
        assert.equal(
          property.type,
          'ObjectProperty',
          'Content must contain static object properties',
        )
        return [
          property.key.name ?? property.key.value,
          literal(property.value),
        ]
      }),
    )
  throw new Error(`Nonliteral source content: ${node.type}`)
}

function extract(file, names) {
  const ast = parse(readFileSync(path.join(reference, 'src', file), 'utf8'), {
    sourceType: 'module',
    plugins: ['jsx'],
  })
  const found = {}
  function visit(node) {
    if (!node || typeof node !== 'object') return
    if (node.type === 'VariableDeclarator' && names.includes(node.id.name))
      found[node.id.name] = literal(node.init)
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit)
      else if (value && typeof value === 'object') visit(value)
    }
  }
  visit(ast)
  for (const name of names)
    assert.ok(name in found, `Missing ${name} in ${file}`)
  return found
}

function normalize(value) {
  if (typeof value === 'string')
    return value
      .replace(/https:\/\/mithawala\.com\/images\//g, '/asif/assets/images/')
      .replace(/(^|[\s"'(=])\/images\//g, '$1/asif/assets/images/')
      .replace(/^\/cv\.pdf$/, '/asif/assets/cv.pdf')
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalize(entry)]),
    )
  return value
}

const { siteData } = extract('App.jsx', ['siteData'])
const { aboutData, services } = extract('pages/AboutMe.jsx', [
  'aboutData',
  'services',
])
const resume = extract('pages/Resume.jsx', [
  'education',
  'experience',
  'functionalSkills',
  'codingSkills',
])
const { portfolioItems } = extract('pages/Portfolio.jsx', ['portfolioItems'])
const { blogPosts } = extract('pages/Blog.jsx', ['blogPosts'])
const { contactInfo, FORMSUBMIT_ENDPOINT } = extract('pages/Contact.jsx', [
  'contactInfo',
  'FORMSUBMIT_ENDPOINT',
])
const { soundcloudProfileUrl } = extract('pages/Music.jsx', [
  'soundcloudProfileUrl',
])

const content = {
  'profile.json': normalize({
    ...siteData,
    heroPhoto: '/images/main/sp_photo.jpg',
    about: aboutData,
    services,
    resume: { ...resume, startYear: 2008 },
    contact: {
      info: contactInfo,
      endpoint: FORMSUBMIT_ENDPOINT,
      mapUrl:
        'https://www.google.com/maps?q=T-Centralen,Stockholm,Sweden&z=15&output=embed',
    },
    music: {
      playlistUrl: soundcloudProfileUrl,
      spotifyUrl: 'https://open.spotify.com/artist/7rRCrE7Boh4en52XqHWZmr',
      image: '/images/music/music-header.png',
      intro:
        "Music has always been a creative outlet for me. Here you'll find my original compositions and productions. Hit play and enjoy!",
    },
  }),
  'portfolio.json': normalize(portfolioItems),
  'blog.json': normalize(blogPosts),
}

if (verify) {
  for (const [name, data] of Object.entries(content))
    assert.deepEqual(
      JSON.parse(readFileSync(path.join(output, name), 'utf8')),
      data,
      `${name} differs from the reference`,
    )
  console.log(
    `Verified lossless migration: ${portfolioItems.length} portfolio entries, ${blogPosts.length} articles, ${resume.experience.length} jobs, ${resume.education.length} education entries.`,
  )
} else {
  assert.ok(
    !existsSync(path.join(output, 'profile.json')),
    'Content already exists. Import is intentionally one-time; edit canonical content directly.',
  )
  mkdirSync(output, { recursive: true })
  for (const [name, data] of Object.entries(content))
    writeFileSync(path.join(output, name), `${JSON.stringify(data, null, 2)}\n`)
  mkdirSync('public/asif/assets', { recursive: true })
  cpSync(path.join(reference, 'public/images'), 'public/asif/assets/images', {
    recursive: true,
  })
  cpSync(path.join(reference, 'public/cv.pdf'), 'public/asif/assets/cv.pdf')
  const manifest = {
    source: 'https://github.com/mithawala/mithawala.com',
    commit: execFileSync('git', ['-C', reference, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    importedAt: new Date().toISOString(),
    counts: {
      portfolio: portfolioItems.length,
      blog: blogPosts.length,
      experience: resume.experience.length,
      education: resume.education.length,
      services: services.length,
    },
    initialContentHashes: Object.fromEntries(
      Object.entries(content).map(([name, data]) => [
        name,
        createHash('sha256').update(JSON.stringify(data)).digest('hex'),
      ]),
    ),
  }
  writeFileSync(
    path.join(output, 'import-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  console.log(
    `Imported ${portfolioItems.length} portfolio entries, ${blogPosts.length} complete articles and all shared profile data/assets.`,
  )
}
