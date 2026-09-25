import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { parse, parseFragment, serialize } from 'parse5'
import { profile, portfolio, blog, detailPath } from '../src/asif/content.mjs'
import { versions, siteOrigin } from '../src/versions.mjs'

const template = readFileSync('dist/index.html', 'utf8')
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ],
  )

function page(route, title, description, image = profile.photo) {
  const document = parse(template)
  const html = document.childNodes.find((node) => node.tagName === 'html')
  const head = html.childNodes.find((node) => node.tagName === 'head')
  head.childNodes = head.childNodes.filter(
    (node) =>
      node.tagName !== 'title' &&
      !(
        node.tagName === 'meta' &&
        node.attrs.some(
          (attribute) =>
            attribute.name === 'name' && attribute.value === 'description',
        )
      ),
  )
  const metadata = parseFragment(
    `<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${siteOrigin}${route}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${siteOrigin}${route}"><meta property="og:image" content="${siteOrigin}${escape(image)}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image">`,
  )
  for (const node of metadata.childNodes) {
    node.parentNode = head
    head.childNodes.push(node)
  }
  const destination = route.endsWith('.html')
    ? path.join('dist', route)
    : path.join('dist', route, 'index.html')
  mkdirSync(path.dirname(destination), { recursive: true })
  writeFileSync(destination, serialize(document))
}

const routes = ['/']
page(
  '/',
  `${profile.name} - Editions`,
  `Independent designs. One ${profile.name}.`,
  versions[0].preview,
)
page(
  '/asif/',
  `${profile.name} - Editions`,
  profile.about.headline,
  versions[0].preview,
)
for (const version of versions) {
  page(
    version.path,
    `${profile.name} - ${version.model}`,
    profile.about.headline,
  )
  routes.push(version.path)
  for (const [kind, records] of [
    ['project', portfolio],
    ['blog', blog],
  ]) {
    for (const record of records) {
      const route = detailPath(version, kind, record.slug)
      page(
        route,
        `${record.title} - ${profile.name}`,
        record.description || record.title,
        record.image,
      )
      routes.push(route)
    }
  }
}
page(
  '/404.html',
  `Page not found - ${profile.name}`,
  'This address does not exist.',
)
writeFileSync(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${siteOrigin}${escape(route)}</loc></url>`).join('')}</urlset>`,
)
writeFileSync(
  'dist/robots.txt',
  `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`,
)
writeFileSync('dist/.nojekyll', '')
console.log(
  `Generated ${routes.length} static routes, plus the gallery alias and 404 page.`,
)
