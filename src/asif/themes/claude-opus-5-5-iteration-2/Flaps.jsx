import { memo, useLayoutEffect, useRef, useState } from 'react'
import { flapGrid, flapLayout, wrapFlapText } from './airside.mjs'

// Character order on the drum of a split-flap unit.
const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&@.,:-/'!?+"

function stepsTo(from, to) {
  const start = DRUM.indexOf(from)
  const end = DRUM.indexOf(to)
  if (start < 0 || end < 0) return [to]
  const distance = (end - start + DRUM.length) % DRUM.length
  const count = Math.min(distance, 3 + Math.floor(Math.random() * 5))
  return Array.from(
    { length: count },
    (_, index) => DRUM[(end - (count - 1 - index) + DRUM.length) % DRUM.length],
  )
}

const FlapCell = memo(function FlapCell({ char, delay, animate }) {
  const cell = useRef(null)
  const shown = useRef(null)
  useLayoutEffect(() => {
    const element = cell.current
    const [top, bottom, front, back] = element.querySelectorAll('[data-face]')
    const leaf = element.querySelector('.as-flap-leaf')
    const paint = (value) => {
      top.textContent = value
      bottom.textContent = value
    }
    if (shown.current === null) {
      shown.current = animate ? ' ' : char
      paint(shown.current)
    }
    if (shown.current === char) return
    if (!animate || typeof leaf.animate !== 'function') {
      shown.current = char
      paint(char)
      return
    }
    let cancelled = false
    const depth = `${Math.round(element.offsetWidth * 7)}px`
    const run = async () => {
      for (const next of stepsTo(shown.current, char)) {
        if (cancelled) return
        const previous = shown.current
        top.textContent = next
        bottom.textContent = previous
        front.textContent = previous
        back.textContent = next
        leaf.style.display = 'block'
        try {
          await leaf.animate(
            [
              { transform: `perspective(${depth}) rotateX(0deg)` },
              { transform: `perspective(${depth}) rotateX(-180deg)` },
            ],
            { duration: 74, easing: 'cubic-bezier(0.55, 0, 0.8, 0.45)' },
          ).finished
        } catch {
          return
        }
        shown.current = next
        bottom.textContent = next
        leaf.style.display = ''
      }
    }
    const timer = setTimeout(run, delay)
    return () => {
      cancelled = true
      clearTimeout(timer)
      leaf.getAnimations().forEach((animation) => animation.cancel())
      leaf.style.display = ''
      paint(shown.current)
    }
  }, [char, animate, delay])
  return (
    <span className="as-flap" ref={cell}>
      <span className="as-flap-half as-flap-top">
        <span data-face="" />
      </span>
      <span className="as-flap-half as-flap-bottom">
        <span data-face="" />
      </span>
      <span className="as-flap-leaf">
        <span className="as-flap-half as-flap-front">
          <span data-face="" />
        </span>
        <span className="as-flap-half as-flap-back">
          <span data-face="" />
        </span>
      </span>
    </span>
  )
})

// A split-flap panel sized to its container. `texts` fixes the panel shape so
// that rotating between several strings never changes its height.
export function FlapText({
  text,
  texts,
  min,
  max,
  gap = 4,
  floor,
  animate = false,
  stagger = 24,
  lineDelay = 80,
  className = '',
}) {
  const box = useRef(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const element = box.current
    const measure = () => {
      const next = Math.floor(element.getBoundingClientRect().width)
      setWidth((current) => (current === next ? current : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const options = texts || [text]
  const layout = width
    ? flapLayout(options, width, { min, max, gap, floor })
    : null
  let grid = []
  if (layout) {
    const index = options.indexOf(text)
    const lines =
      index >= 0 ? layout.wrapped[index] : wrapFlapText(text, layout.cols)
    grid = flapGrid(lines, layout.cols, layout.rows)
  }
  return (
    <span
      ref={box}
      className={`as-flaps ${className}`}
      aria-hidden="true"
      data-text={text}
      style={
        layout
          ? { '--cell': `${layout.size}px`, '--gap': `${gap}px` }
          : undefined
      }
    >
      {grid.map((row, rowIndex) => (
        <span className="as-flap-row" key={rowIndex}>
          {row.map((char, column) => (
            <FlapCell
              key={column}
              char={char}
              animate={animate}
              delay={column * stagger + rowIndex * lineDelay}
            />
          ))}
        </span>
      ))}
    </span>
  )
}
