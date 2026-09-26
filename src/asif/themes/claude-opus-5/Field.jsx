import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { portfolio, detailPath } from '../../content.mjs'
import { buildMap } from './map.mjs'
import {
  createField,
  supportsField,
  flatten,
  rampColour,
  yearScale,
} from './field.js'

const FieldContext = createContext(null)
export const useField = () => useContext(FieldContext)

let cache
export function semanticMap() {
  if (!cache) cache = buildMap(portfolio)
  return cache
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}

// A window through which the map is visible, and the surface that makes it
// interactive while that window is on screen.
export function FieldWindow({ id, priority = 0, className = '', children }) {
  const context = useField()
  const element = useRef(null)
  useLayoutEffect(() => {
    if (!context) return
    return context.register(id, element.current, priority)
  }, [context, id, priority])
  return (
    <div className={`o5-window ${className}`} data-window={id}>
      <span
        className="o5-window-area"
        ref={element}
        aria-hidden="true"
        {...(context?.surface || {})}
      />
      {children}
    </div>
  )
}

export default function FieldLayer({ mode, version, children }) {
  const map = semanticMap()
  const navigate = useNavigate()
  const canvas = useRef(null)
  const field = useRef(null)
  const windows = useRef(new Map())
  const drag = useRef(null)
  const readout = useRef(null)
  const activeIndex = useRef(-1)
  const reduced = usePrefersReducedMotion()
  const [status, setStatus] = useState(() =>
    supportsField() ? 'starting' : 'static',
  )
  const [hover, setHover] = useState(null)
  const [pinned, setPinned] = useState(null)
  const scale = useMemo(() => yearScale(map.nodes), [map])
  const night = mode === 'dark'

  // Keeps the label pinned to its marker while the configuration turns.
  function trackLabel(positions) {
    const element = readout.current
    const index = activeIndex.current
    if (!element || index < 0) return
    const point = positions[index]
    element.style.transform = `translate(${point.x}px, ${point.y - point.r - 12}px) translate(-50%, -100%)`
    element.style.visibility = point.visible ? 'visible' : 'hidden'
  }

  // The largest window currently on screen owns the framing.
  function refocus() {
    const instance = field.current
    if (!instance) return
    let best = null
    let bestArea = 0
    let anyVisible = false
    for (const entry of windows.current.values()) {
      const rect = entry.element.getBoundingClientRect()
      const height = Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0)
      const area = Math.max(0, height) * rect.width
      if (area > 0) anyVisible = true
      const weighted = area * (1 + entry.priority)
      if (weighted > bestArea) {
        bestArea = weighted
        best = rect
      }
    }
    instance.setVisible(anyVisible && !document.hidden)
    if (!best) return
    instance.setFocus({
      x: best.left,
      y: best.top,
      width: best.width,
      height: best.height,
    })
  }

  useEffect(() => {
    if (!canvas.current) return
    let instance
    try {
      instance = createField(canvas.current, {
        nodes: map.nodes,
        links: map.links,
        onReady: () => setStatus('live'),
        onFrame: trackLabel,
      })
    } catch {
      setStatus('static')
      return
    }
    field.current = instance
    instance.setReducedMotion(reduced)
    instance.setNight(night)
    instance.resize(innerWidth, innerHeight, devicePixelRatio || 1)
    refocus()
    instance.jump()
    const resize = () => {
      instance.resize(innerWidth, innerHeight, devicePixelRatio || 1)
      refocus()
    }
    const scroll = () => refocus()
    addEventListener('resize', resize)
    addEventListener('scroll', scroll, { passive: true })
    document.addEventListener('visibilitychange', scroll)
    return () => {
      removeEventListener('resize', resize)
      removeEventListener('scroll', scroll)
      document.removeEventListener('visibilitychange', scroll)
      field.current = null
      instance.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  useEffect(() => {
    field.current?.setNight(night)
  }, [night])

  useEffect(() => {
    field.current?.setReducedMotion(reduced)
  }, [reduced])

  const active = pinned ?? hover
  activeIndex.current = active?.index ?? -1
  useEffect(() => {
    field.current?.setActive(active?.index ?? -1)
  }, [active])
  useLayoutEffect(() => {
    if (field.current) trackLabel(field.current.positions)
  }, [active])

  function locate(event) {
    const instance = field.current
    if (!instance) return null
    const index = instance.pick(event.clientX, event.clientY)
    if (index < 0) return null
    const point = instance.positions[index]
    return { index, x: point.x, y: point.y, r: point.r, source: 'map' }
  }

  function move(event) {
    if (drag.current) {
      field.current?.orbit(
        drag.current.yaw - (event.clientX - drag.current.x) * 0.006,
        drag.current.pitch - (event.clientY - drag.current.y) * 0.005,
      )
      return
    }
    const found = locate(event)
    event.currentTarget.style.cursor = found ? 'pointer' : 'grab'
    setHover((current) => (current?.index === found?.index ? current : found))
  }

  function down(event) {
    const instance = field.current
    if (!instance || event.button !== 0) return
    const { yaw, pitch } = instance.orientation
    drag.current = { x: event.clientX, y: event.clientY, yaw, pitch }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.currentTarget.style.cursor = 'grabbing'
  }

  function up(event) {
    const start = drag.current
    drag.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    event.currentTarget.style.cursor = 'grab'
    if (!start) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return
    const found = locate(event)
    if (found)
      navigate(detailPath(version, 'project', map.nodes[found.index].slug))
  }

  function leave(event) {
    drag.current = null
    event.currentTarget.style.cursor = 'grab'
    setHover(null)
  }

  const context = useMemo(
    () => ({
      map,
      scale,
      status,
      surface: {
        onPointerMove: move,
        onPointerDown: down,
        onPointerUp: up,
        onPointerLeave: leave,
      },
      register(id, element, priority) {
        windows.current.set(id, { element, priority })
        refocus()
        return () => {
          windows.current.delete(id)
          refocus()
        }
      },
      // Lets the catalogue light up its own point on the map.
      highlight(index) {
        setPinned(
          index === null || index === undefined || index < 0
            ? null
            : { index, source: 'list' },
        )
      },
      filter(indexes) {
        field.current?.setVisibleNodes(indexes)
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [map, scale, status],
  )

  const node = active && map.nodes[active.index]

  return (
    <FieldContext.Provider value={context}>
      <div
        className="o5-field"
        data-field={status}
        data-rendering={status === 'starting' ? 'field' : undefined}
        aria-hidden="true"
      >
        {status === 'static' ? (
          <StaticField nodes={map.nodes} links={map.links} />
        ) : (
          <canvas ref={canvas} />
        )}
        {node && status === 'live' && (
          <p className="o5-readout" ref={readout}>
            <b>{node.title}</b>
            <span>
              {String(node.index + 1).padStart(3, '0')} · {node.category} ·{' '}
              {node.year}
            </span>
          </p>
        )}
      </div>
      {children}
    </FieldContext.Provider>
  )
}

// Drawn from the same coordinates when WebGL is unavailable.
function StaticField({ nodes, links }) {
  const points = useMemo(() => flatten(nodes), [nodes])
  const scale = useMemo(() => yearScale(nodes), [nodes])
  const order = useMemo(
    () =>
      points
        .map((point, index) => index)
        .sort((a, b) => points[a].depth - points[b].depth),
    [points],
  )
  const tint = (node) =>
    `rgb(${rampColour(scale.tone(node.year))
      .map((value) => Math.round(value * 255))
      .join(',')})`
  return (
    <svg
      className="o5-static"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      <g className="o5-static-links">
        {links.map((link, index) => (
          <line
            key={index}
            x1={points[link.from].x}
            y1={points[link.from].y}
            x2={points[link.to].x}
            y2={points[link.to].y}
          />
        ))}
      </g>
      {order.map((index) => (
        <circle
          key={points[index].node.slug}
          cx={points[index].x}
          cy={points[index].y}
          r={1.15 + 0.5 * Math.min(1, points[index].node.weight / 6)}
          fill={tint(points[index].node)}
          opacity={0.55 + 0.45 * Math.min(1, (points[index].depth + 1.2) / 2.2)}
        />
      ))}
    </svg>
  )
}
