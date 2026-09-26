import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Plus, Minus } from 'lucide-react'
import { detailPath, filterPortfolio, formatDate } from '../../content.mjs'
import { FieldWindow, useField } from './Field.jsx'
import { YearLegend } from './Masthead.jsx'

const PREVIEW = 12
const label = (value) => value[0].toUpperCase() + value.slice(1)

export default function Catalogue({ portfolio, contract, version }) {
  const field = useField()
  const [category, setCategory] = useState('all')
  const [expanded, setExpanded] = useState(false)
  const list = useRef(null)

  const selected = useMemo(
    () => filterPortfolio(portfolio, category),
    [portfolio, category],
  )
  const shown = expanded ? selected : selected.slice(0, PREVIEW)
  const indexOf = useMemo(
    () => new Map(portfolio.map((item, index) => [item.slug, index])),
    [portfolio],
  )

  useEffect(() => {
    field?.filter(
      category === 'all'
        ? null
        : new Set(selected.map((item) => indexOf.get(item.slug))),
    )
  }, [field, category, selected, indexOf])

  useEffect(() => () => field?.highlight(null), [field])

  const years = portfolio
    .map((item) => Number(String(item.date).slice(0, 4)))
    .filter(Number.isFinite)

  return (
    <section className="o5-section o5-works" id="portfolio">
      <div className="o5-works-list o5-plate">
        <header className="o5-head">
          <p className="o5-rule o5-mono">
            <span>§ 01 — Catalogue</span>
            <span className="o5-num">{portfolio.length} entries</span>
          </p>
          <h2>Everything he has made.</h2>
          <p>
            {portfolio.length} pieces of work from {Math.min(...years)} to{' '}
            {Math.max(...years)} — production cloud platforms, apps built in an
            evening, films, drawings, races run. The map places each one by what
            it has in common with the rest.
          </p>
        </header>

        <div
          className="o5-filters"
          role="group"
          aria-label="Portfolio categories"
        >
          {contract.categories.map((entry) => {
            const total = filterPortfolio(portfolio, entry).length
            return (
              <button
                key={entry}
                className="o5-filter"
                aria-pressed={category === entry}
                onClick={() => {
                  setCategory(entry)
                  setExpanded(false)
                }}
              >
                {label(entry)}
                <span className="o5-num" aria-hidden="true">
                  {total}
                </span>
              </button>
            )
          })}
        </div>

        <p className="o5-mono o5-dim o5-works-count" role="status">
          Showing {shown.length} of {selected.length}
          {category === 'all' ? '' : ` in ${label(category)}`}
        </p>

        <ol className="o5-entries" ref={list}>
          {shown.map((item) => {
            const position = indexOf.get(item.slug)
            return (
              <li
                key={item.slug}
                data-project={item.slug}
                className="o5-entry"
                onPointerEnter={() => field?.highlight(position)}
                onPointerLeave={() => field?.highlight(null)}
              >
                <Link
                  to={detailPath(version, 'project', item.slug)}
                  onFocus={() => field?.highlight(position)}
                  onBlur={() => field?.highlight(null)}
                >
                  <span className="o5-entry-index o5-num" aria-hidden="true">
                    {String(position + 1).padStart(3, '0')}
                  </span>
                  <span className="o5-entry-title">{item.title}</span>
                  <span className="o5-entry-tags o5-mono o5-dim">
                    {(item.technologies || []).slice(0, 3).join(' · ') ||
                      item.category}
                  </span>
                  <span className="o5-entry-date o5-mono o5-num o5-dim">
                    {formatDate(item.date)}
                  </span>
                  <ArrowUpRight
                    className="o5-entry-go"
                    size={17}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            )
          })}
        </ol>

        {selected.length > PREVIEW && (
          <button
            className="o5-button o5-reveal"
            data-action="show-all-projects"
            onClick={() => {
              setExpanded((value) => !value)
              if (expanded)
                requestAnimationFrame(() =>
                  list.current?.scrollIntoView({ block: 'start' }),
                )
            }}
          >
            {expanded ? (
              <>
                <Minus size={15} aria-hidden="true" /> Show the first {PREVIEW}
              </>
            ) : (
              <>
                <Plus size={15} aria-hidden="true" /> Show all {selected.length}
              </>
            )}
          </button>
        )}
      </div>

      <FieldWindow id="works" priority={1} className="o5-works-figure">
        <div className="o5-figure-head">
          <span className="o5-mono">Fig. 02 — {label(category)}</span>
          <span className="o5-mono o5-dim o5-num">
            {selected.length}/{portfolio.length}
          </span>
        </div>
        <p className="o5-figure-note">
          Hover a point to read it, or a row to find it. Click either to open
          the work.
        </p>
        <div className="o5-figure-foot">
          {field && <YearLegend scale={field.scale} />}
        </div>
      </FieldWindow>
    </section>
  )
}
