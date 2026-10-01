// Reads the personal content of the original mithawala.com repository.
//
// mithawala.com keeps its content as plain object literals inside React
// components. This module reads them straight from git, at any commit, without
// running that site's code, and maps them to the shape of content/asif/. Both
// the one-time import and the ongoing sync use it.

import { parse } from '@babel/parser'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'

export const sourceRepository = 'https://github.com/mithawala/mithawala.com'

// Failures surface as thrown errors that include git's message.
export const git = (repository, ...args) =>
  execFileSync('git', ['-C', repository, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

export const gitBuffer = (repository, ...args) =>
  execFileSync('git', ['-C', repository, ...args], {
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

export const resolveCommit = (repository, ref = 'HEAD') =>
  git(repository, 'rev-parse', '--verify', `${ref}^{commit}`).trim()

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

function extract(read, file, names) {
  const ast = parse(read(`src/${file}`), {
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

// Shared files are served from /asif/assets/ here, and from the root there.
export function normalize(value) {
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

// Maps a mithawala.com path under public/ to its home here, and back.
export const assetPath = (sourcePath) =>
  sourcePath === 'public/cv.pdf'
    ? 'public/asif/assets/cv.pdf'
    : sourcePath.replace(/^public\/images\//, 'public/asif/assets/images/')

export const isSharedAsset = (sourcePath) =>
  sourcePath === 'public/cv.pdf' || sourcePath.startsWith('public/images/')

// The canonical content files that mithawala.com's records produce.
export function readContent(read) {
  const { siteData } = extract(read, 'App.jsx', ['siteData'])
  const { aboutData, services } = extract(read, 'pages/AboutMe.jsx', [
    'aboutData',
    'services',
  ])
  const resume = extract(read, 'pages/Resume.jsx', [
    'education',
    'experience',
    'functionalSkills',
    'codingSkills',
  ])
  const { portfolioItems } = extract(read, 'pages/Portfolio.jsx', [
    'portfolioItems',
  ])
  const { blogPosts } = extract(read, 'pages/Blog.jsx', ['blogPosts'])
  const { contactInfo, FORMSUBMIT_ENDPOINT } = extract(
    read,
    'pages/Contact.jsx',
    ['contactInfo', 'FORMSUBMIT_ENDPOINT'],
  )
  const { soundcloudProfileUrl } = extract(read, 'pages/Music.jsx', [
    'soundcloudProfileUrl',
  ])
  return {
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
}

export const readContentAt = (repository, commit) =>
  readContent((file) => git(repository, 'show', `${commit}:${file}`))
