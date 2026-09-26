import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUpRight, PlaneTakeoff } from 'lucide-react'
import { useAsif } from '../../core.jsx'
import { ResponsiveImage } from '../../features.jsx'
import { detailPath, filterPortfolio } from '../../content.mjs'
import {
  boardDate,
  capitalize,
  flightCode,
  plural,
  projectRemark,
} from './airside.mjs'

export const BOARD_LIMIT = 12
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

// Re-rolls the board's flap fields like a departures board refreshing. Writes
// into the existing text nodes so React keeps ownership of them.
function refreshBoard(root) {
  const fields = [...root.querySelectorAll('[data-scramble]')]
    .map((field) => ({ node: field.firstChild, final: field.textContent }))
    .filter(({ node }) => node?.nodeType === Node.TEXT_NODE)
  const start = performance.now()
  let frame = 0
  const tick = (now) => {
    const elapsed = now - start
    let settled = true
    fields.forEach(({ node, final }, index) => {
      const duration = 240 + (index % 15) * 26
      if (elapsed >= duration) {
        if (node.nodeValue !== final) node.nodeValue = final
        return
      }
      settled = false
      const fixed = Math.floor((elapsed / duration) * final.length)
      node.nodeValue =
        final.slice(0, fixed) +
        [...final.slice(fixed)]
          .map((character) =>
            character === ' '
              ? ' '
              : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join('')
    })
    if (!settled) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => {
    cancelAnimationFrame(frame)
    fields.forEach(({ node, final }) => (node.nodeValue = final))
  }
}

export function Departures({ reduced }) {
  const { portfolio, contract, version } = useAsif()
  const [category, setCategory] = useState('all')
  const [expanded, setExpanded] = useState(false)
  const board = useRef(null)
  const focusAfterReveal = useRef(false)
  const firstRender = useRef(true)
  const items = filterPortfolio(portfolio, category)
  const limited = category === 'all' && !expanded && items.length > BOARD_LIMIT
  const shown = limited ? items.slice(0, BOARD_LIMIT) : items

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!reduced && board.current) return refreshBoard(board.current)
  }, [category, reduced])

  useEffect(() => {
    if (!expanded || !focusAfterReveal.current) return
    focusAfterReveal.current = false
    board.current?.querySelectorAll('[data-project] > a')[BOARD_LIMIT]?.focus()
  }, [expanded])

  const label = category === 'all' ? 'All' : capitalize(category)
  return (
    <div className="as-departures">
      <div className="as-gates">
        <p className="as-gates-label" aria-hidden="true">
          Select gate
        </p>
        <div
          className="as-gate-signs"
          role="group"
          aria-label="Portfolio categories"
        >
          {contract.categories.map((key) => {
            const count = filterPortfolio(portfolio, key).length
            const active = key === category
            return (
              <button
                type="button"
                key={key}
                className={`as-sign ${active ? 'as-sign--here' : 'as-sign--ahead'}`}
                aria-pressed={active}
                onClick={() => setCategory(key)}
              >
                {capitalize(key)}
                <span className="as-gate-count" aria-hidden="true">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="as-depboard">
        <div className="as-depboard-head">
          <p className="as-depboard-title">
            <PlaneTakeoff size={20} aria-hidden="true" />
            <span lang="sv">Avgångar</span>
            <span className="as-depboard-en">Departures</span>
          </p>
          <p className="as-depboard-status" role="status">
            {limited
              ? `${shown.length} of ${plural(items.length, 'departure')}`
              : `${plural(items.length, 'departure')}`}
            {category !== 'all' && ` · Gate ${label}`}
          </p>
        </div>
        <div className="as-depboard-cols" aria-hidden="true">
          <span />
          <span>Date</span>
          <span>Flight</span>
          <span>Destination</span>
          <span>Gate</span>
          <span>Remarks</span>
        </div>
        <ol className="as-deplist" ref={board}>
          {shown.map((item) => (
            <li key={item.slug} data-project={item.slug} className="as-dep">
              <Link
                to={detailPath(version, 'project', item.slug)}
                className="as-dep-link"
              >
                <span className="as-dep-carrier">
                  <ResponsiveImage
                    src={item.image}
                    alt=""
                    sizes="(max-width: 700px) 64px, 96px"
                  />
                </span>
                <h3 className="as-dep-title">{item.title}</h3>
                <span className="as-mf as-dep-date" data-scramble="">
                  {boardDate(item.date)}
                </span>
                <span
                  className="as-mf as-dep-code"
                  data-scramble=""
                  aria-hidden="true"
                >
                  {flightCode(portfolio, item)}
                </span>
                <span className="as-dep-gate">{item.category}</span>
                <span className="as-mf as-dep-remark" data-scramble="">
                  {projectRemark(item)}
                </span>
                <ArrowUpRight
                  className="as-dep-arrow"
                  size={20}
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ol>
        {limited && (
          <button
            type="button"
            className="as-sign as-sign--ahead as-show-all"
            data-action="show-all-projects"
            onClick={() => {
              focusAfterReveal.current = true
              setExpanded(true)
            }}
          >
            Show all {plural(items.length, 'departure')}
            <ArrowDown size={18} strokeWidth={3} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
