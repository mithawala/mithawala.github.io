import { lazy, Suspense, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { versions } from './versions.mjs'
import { profile } from './asif/content.mjs'
import { AsifProvider } from './asif/core.jsx'
import Gallery from './gallery/Gallery.jsx'

const designs = Object.fromEntries(
  versions.map((version) => [version.id, lazy(version.load)]),
)

export default function App() {
  const location = useLocation()
  const version = versions.find(
    (entry) =>
      location.pathname === entry.path.slice(0, -1) ||
      location.pathname.startsWith(entry.path),
  )
  useEffect(() => {
    document.title = `${profile.name}${version ? ` - ${version.model}` : ' - Editions'}`
  }, [version])
  if (
    location.pathname === '/' ||
    location.pathname === '/asif/' ||
    location.pathname === '/asif'
  )
    return <Gallery />
  if (!version)
    return (
      <main className="not-found">
        <p>404</p>
        <h1>Not at this address.</h1>
        <Link to="/">Back to the gallery</Link>
      </main>
    )
  const Design = designs[version.id]
  return (
    <Suspense
      fallback={
        <main className="loading-page" role="status">
          {profile.name}
        </main>
      }
    >
      <AsifProvider version={version}>
        <Design />
      </AsifProvider>
    </Suspense>
  )
}
