import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Play } from 'lucide-react'
import { detailPath, filterPortfolio, formatDate } from '../../content.mjs'
import { ResponsiveImage } from '../../features.jsx'

const PREVIEW_COUNT = 12
const label = (category) =>
  category === 'all' ? 'All' : category[0].toUpperCase() + category.slice(1)
const medium = (item) =>
  item.technologies?.length ? item.technologies.slice(0, 3).join(', ') : ''

export default function Works({ portfolio, categories, version }) {
  const list = useRef(null)
  const [category, setCategory] = useState('all')
  const [expanded, setExpanded] = useState(false)
  const [active, setActive] = useState(portfolio[0]?.slug)
  const records = filterPortfolio(portfolio, category)
  const shortened = category === 'all' && !expanded
  const visible = shortened ? records.slice(0, PREVIEW_COUNT) : records
  const selected =
    visible.find((item) => item.slug === active) || visible[0] || null
  const counts = useMemo(
    () =>
      Object.fromEntries(
        categories.map((entry) => [
          entry,
          filterPortfolio(portfolio, entry).length,
        ]),
      ),
    [portfolio, categories],
  )
  const years = portfolio
    .map((item) => Number(String(item.date).slice(0, 4)))
    .filter(Boolean)
  const number = (item) =>
    String(portfolio.indexOf(item) + 1).padStart(
      String(portfolio.length).length,
      '0',
    )

  return (
    <section
      id="portfolio"
      className="op-section op-works"
      tabIndex={-1}
      aria-labelledby="op-works-title"
    >
      <header className="op-section-head">
        <h2 id="op-works-title">Catalogue of works</h2>
        <p>
          {portfolio.length} works from {Math.min(...years)} to{' '}
          {Math.max(...years)}. Apps and cloud projects, films and events,
          experiments built at home.
        </p>
      </header>
      <div
        className="op-filters"
        role="group"
        aria-label="Portfolio categories"
      >
        {categories.map((entry) => (
          <button
            key={entry}
            aria-pressed={category === entry}
            onClick={() => {
              setCategory(entry)
              setExpanded(false)
            }}
          >
            {label(entry)}
            <span aria-hidden="true">{counts[entry]}</span>
          </button>
        ))}
      </div>
      <div className="op-works-body">
        <div className="op-catalogue-wrap" ref={list}>
          <p className="op-results" role="status">
            {records.length === 0
              ? 'No works in this category yet.'
              : `Showing ${visible.length} of ${records.length} ${
                  category === 'all' ? '' : `${label(category).toLowerCase()} `
                }works`}
          </p>
          <ol className="op-catalogue">
            {visible.map((item) => (
              <li
                key={item.id}
                data-project={item.slug}
                className={item === selected ? 'is-selected' : undefined}
              >
                <Link
                  to={detailPath(version, 'project', item.slug)}
                  onMouseEnter={() => setActive(item.slug)}
                  onFocus={() => setActive(item.slug)}
                >
                  <span className="op-work-number">No. {number(item)}</span>
                  <span className="op-work-thumb">
                    <ResponsiveImage src={item.image} alt="" sizes="88px" />
                  </span>
                  <span className="op-work-text">
                    <span className="op-work-title">{item.title}</span>
                    <span className="op-work-meta">
                      {item.category}
                      {medium(item) && <span>{medium(item)}</span>}
                    </span>
                  </span>
                  <time className="op-work-year" dateTime={item.date}>
                    {String(item.date).slice(0, 4)}
                  </time>
                </Link>
              </li>
            ))}
          </ol>
          {category === 'all' && records.length > PREVIEW_COUNT && (
            <button
              className="op-button op-more"
              data-action="show-all-projects"
              aria-expanded={expanded}
              onClick={() => {
                setExpanded(!expanded)
                if (expanded)
                  requestAnimationFrame(() => {
                    const section = document.getElementById('portfolio')
                    section.scrollIntoView()
                    section.focus({ preventScroll: true })
                  })
              }}
            >
              {expanded
                ? 'Show fewer works'
                : `Show all ${records.length} works`}
            </button>
          )}
        </div>
        {selected && (
          <aside className="op-viewer" aria-label="Selected work">
            <Link
              className="op-viewer-plate"
              to={detailPath(version, 'project', selected.slug)}
              tabIndex={-1}
              aria-hidden="true"
            >
              <ResponsiveImage
                key={selected.slug}
                src={selected.image}
                alt=""
                sizes="(max-width: 1100px) 40vw, 520px"
              />
              <span className="op-viewer-light" />
              {selected.type === 'video' && (
                <span className="op-viewer-play">
                  <Play size={22} fill="currentColor" />
                </span>
              )}
            </Link>
            <div className="op-viewer-label">
              <p className="op-viewer-number">No. {number(selected)}</p>
              <h3>{selected.title}</h3>
              <p>
                {selected.category},{' '}
                {formatDate(selected.date, { month: 'long', year: 'numeric' })}
              </p>
              {selected.technologies?.length > 0 && (
                <p className="op-viewer-medium">
                  {selected.technologies.join(', ')}
                </p>
              )}
              <Link
                className="op-text-link"
                to={detailPath(version, 'project', selected.slug)}
              >
                Open this work <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </aside>
        )}
      </div>
    </section>
  )
}
