import {
  createContext,
  useContext,
  useEffect,
  useState,
  useDeferredValue,
} from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Search } from 'lucide-react'
import {
  profile,
  portfolio,
  blog,
  contract,
  detailPath,
  resolveDetail,
  searchContent,
} from './content.mjs'
import Dialog from './Dialog.jsx'
import { ProjectDetails, BlogDetails } from './features.jsx'
import './features.css'

const AsifContext = createContext(null)

export const useAsif = () => useContext(AsifContext)

export function AsifProvider({ version, children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [preference, setPreference] = useState(() => {
    try {
      return localStorage.getItem('asif:appearance') || 'system'
    } catch {
      return 'system'
    }
  })
  const [systemDark, setSystemDark] = useState(
    () => matchMedia('(prefers-color-scheme: dark)').matches,
  )
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const mode =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
  const setAppearance = (next) => {
    setPreference(next)
    try {
      localStorage.setItem('asif:appearance', next)
    } catch {}
  }
  const detail = resolveDetail(version, location.pathname)
  const closeDetail = () =>
    navigate(
      `${version.path}#${detail?.kind === 'blog' ? 'blog' : 'portfolio'}`,
      { replace: true },
    )
  useEffect(() => {
    document.title = `${detail?.record?.title || profile.name} - ${version.model}`
  }, [detail?.record?.title, version.model])
  useEffect(() => {
    if (!detail && location.hash)
      requestAnimationFrame(() =>
        document.getElementById(location.hash.slice(1))?.scrollIntoView(),
      )
  }, [location.hash, detail?.record?.slug])
  const context = {
    version,
    profile,
    portfolio,
    blog,
    contract,
    mode,
    preference,
    setAppearance,
    openSearch: () => setSearchOpen(true),
    detail,
    closeDetail,
  }
  return (
    <AsifContext.Provider value={context}>
      <div data-edition={version.id} data-mode={mode}>
        {children}
        {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
        {detail && (
          <Dialog
            title={detail.missing ? 'Page not found' : detail.record.title}
            onClose={closeDetail}
            className="detail-dialog"
          >
            {detail.missing ? (
              <>
                <h2>Page not found</h2>
                <p>This item is not in the collection.</p>
              </>
            ) : detail.kind === 'blog' ? (
              <BlogDetails post={detail.record} version={version} />
            ) : (
              <ProjectDetails
                key={detail.record.slug}
                item={detail.record}
                version={version}
              />
            )}
          </Dialog>
        )}
      </div>
    </AsifContext.Provider>
  )
}

function SearchDialog({ onClose }) {
  const { version } = useAsif()
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const results = searchContent(deferred)
  return (
    <Dialog title="Search" onClose={onClose} className="search-dialog">
      <h2>Find something.</h2>
      <label className="search-field">
        <Search size={22} />
        <input
          autoFocus
          aria-label="Search portfolio and articles"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Projects, ideas, articles..."
        />
      </label>
      <p role="status" className="search-status">
        {query.trim() ? `${results.length} results` : 'Portfolio & articles'}
      </p>
      <div className="search-results">
        {results.map(({ record, kind }) => (
          <Link
            key={`${kind}-${record.slug}`}
            to={detailPath(version, kind, record.slug)}
            onClick={onClose}
          >
            <img src={record.image} alt="" />
            <span>
              <small>{kind === 'blog' ? 'Article' : record.category}</small>
              {record.title}
            </span>
            <ArrowUpRight size={20} />
          </Link>
        ))}
      </div>
    </Dialog>
  )
}
