import { useEffect, useRef, useState } from 'react'
import { ArrowDown, Headphones, Pause, Play, Sun, Moon } from 'lucide-react'
import { ResponsiveImage } from '../../features.jsx'
import { previewPath, previewSources } from '../../images.mjs'
import { createRoom, supportsRoom, lightFor } from './room.js'
import {
  SCENE,
  cameraFor,
  withParallax,
  frameRect,
  floorLine,
  patchCorners,
  quadMatrix,
  lampPosition,
  windowApex,
} from './scene.js'

const PX = 100
const w = SCENE.window
const apex = windowApex()
const patchWidth = w.halfWidth * 2
const patchHeight = apex - w.sill
const springY = apex - w.spring
const cell = SCENE.lattice.cell
const wrap = (value) => ((value % cell) + cell) % cell
const archPath = `M0,${patchHeight} L0,${springY} A${patchWidth},${patchWidth} 0 0 1 ${w.halfWidth},0 A${patchWidth},${patchWidth} 0 0 1 ${patchWidth},${springY} L${patchWidth},${patchHeight} Z`
const star = (() => {
  const c = cell / 2
  const r = cell * 0.35355339
  const i = cell * 0.14644661
  const points = [
    [c + c, c],
    [c + r, c + i],
    [c + r, c + r],
    [c + i, c + r],
    [c, c + c],
    [c - i, c + r],
    [c - r, c + r],
    [c - r, c + i],
    [0, c],
    [c - r, c - i],
    [c - r, c - r],
    [c - i, c - r],
    [c, 0],
    [c + i, c - r],
    [c + r, c - r],
    [c + r, c - i],
  ]
  return `M${points.map((point) => point.map((v) => +v.toFixed(4)).join(',')).join(' L')} Z`
})()

function usePrefersReducedMotion() {
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

export default function Hero({ profile, mode }) {
  const section = useRef(null)
  const stage = useRef(null)
  const canvas = useRef(null)
  const patch = useRef(null)
  const room = useRef(null)
  const view = useRef({ width: 1, height: 1, camera: null })
  const input = useRef({ light: 0.5, x: 0, y: 0, scroll: 0, night: false })
  const reduced = usePrefersReducedMotion()
  const [status, setStatus] = useState('fallback')
  const [light, setLight] = useState(50)
  const [role, setRole] = useState(0)
  const [paused, setPaused] = useState(false)
  const night = mode === 'dark'
  input.current.night = night
  const location = profile.contact.info.find((info) =>
    info.icon.includes('map-marker'),
  )?.value
  const [first, ...rest] = profile.name.split(' ')

  // Aligns the museum label and the static light with the current camera.
  function place(camera, direction, nightValue) {
    const element = section.current
    const { width, height } = view.current
    if (!element || !camera) return
    const rect = frameRect(camera, width, height)
    element.style.setProperty('--frame-left', `${rect.left}px`)
    element.style.setProperty('--frame-top', `${rect.top}px`)
    element.style.setProperty('--frame-width', `${rect.width}px`)
    element.style.setProperty('--frame-height', `${rect.height}px`)
    element.style.setProperty(
      '--floor',
      `${floorLine(camera, width, height)}px`,
    )
    const source =
      nightValue > 0.5
        ? { type: 'lamp', position: lampPosition(direction) }
        : { type: 'sun', direction }
    if (patch.current)
      patch.current.style.transform = quadMatrix(
        patchWidth * PX,
        patchHeight * PX,
        patchCorners(camera, width, height, source),
      )
  }

  function placeFallback() {
    if (room.current) return
    const { camera } = view.current
    if (!camera) return
    const { light, x, y, scroll } = input.current
    place(
      withParallax(camera, x, y),
      lightFor({ light, pointerX: x, pointerY: y, scroll }),
      input.current.night ? 1 : 0,
    )
  }

  useEffect(() => {
    if (!supportsRoom()) return
    let instance
    try {
      instance = createRoom(canvas.current, {
        photo: previewSources.includes(profile.heroPhoto)
          ? previewPath(profile.heroPhoto, 800)
          : profile.heroPhoto,
        onReady: () => setStatus('ready'),
        onFail: () => {
          room.current = null
          setStatus('fallback')
        },
        onCamera: place,
      })
    } catch {
      return
    }
    room.current = instance
    setStatus('loading')
    instance.setNight(input.current.night)
    instance.jump()
    return () => {
      room.current = null
      instance.dispose()
    }
  }, [profile.heroPhoto])

  useEffect(() => {
    const element = stage.current
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const stacked = getComputedStyle(element).position !== 'absolute'
      const camera = cameraFor(width, height, stacked)
      view.current = { width, height, camera }
      room.current?.resize(width, height, devicePixelRatio || 1, camera)
      placeFallback()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    room.current?.setReducedMotion(reduced)
    if (reduced) {
      input.current.x = 0
      input.current.y = 0
      input.current.scroll = 0
      room.current?.setPointer(0, 0)
      room.current?.setScroll(0)
    }
  }, [reduced])

  useEffect(() => {
    room.current?.setNight(night)
    placeFallback()
  }, [night])

  useEffect(() => {
    const element = section.current
    const observer = new IntersectionObserver(([entry]) =>
      room.current?.setVisible(entry.isIntersecting),
    )
    observer.observe(element)
    let frame = 0
    const scroll = () => {
      if (reduced || frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const progress = Math.min(
          Math.max(scrollY / Math.max(element.offsetHeight, 1), 0),
          1,
        )
        input.current.scroll = progress
        room.current?.setScroll(progress)
      })
    }
    addEventListener('scroll', scroll, { passive: true })
    return () => {
      observer.disconnect()
      removeEventListener('scroll', scroll)
      cancelAnimationFrame(frame)
    }
  }, [reduced])

  useEffect(() => {
    if (reduced || paused || profile.roles.length < 2) return
    const timer = setInterval(
      () => setRole((index) => (index + 1) % profile.roles.length),
      3600,
    )
    return () => clearInterval(timer)
  }, [reduced, paused, profile.roles.length])

  const pointer = (event) => {
    if (reduced || event.pointerType === 'touch') return
    const bounds = stage.current.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1
    input.current.x = Math.max(-1, Math.min(1, x))
    input.current.y = Math.max(-1, Math.min(1, y))
    room.current?.setPointer(input.current.x, input.current.y)
    placeFallback()
  }
  const leave = () => {
    input.current.x = 0
    input.current.y = 0
    room.current?.setPointer(0, 0)
    placeFallback()
  }
  const changeLight = (event) => {
    const value = Number(event.target.value)
    setLight(value)
    input.current.light = value / 100
    room.current?.setLight(value / 100)
    placeFallback()
  }

  return (
    <section
      className="op-hero"
      ref={section}
      aria-labelledby="op-name"
      data-room={status}
      data-rendering={status === 'loading' ? 'room' : undefined}
      onPointerMove={pointer}
      onPointerLeave={leave}
    >
      <div className="op-stage" ref={stage} aria-hidden="true">
        <div className="op-fallback">
          <div className="op-fallback-light">
            <svg
              ref={patch}
              className="op-patch"
              width={patchWidth * PX}
              height={patchHeight * PX}
              viewBox={`0 0 ${patchWidth} ${patchHeight}`}
            >
              <defs>
                <pattern
                  id="op-lattice"
                  width={cell}
                  height={cell}
                  x={wrap(-(w.u - w.halfWidth))}
                  y={wrap(apex)}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={star}
                    fill="none"
                    stroke="#000"
                    strokeWidth={SCENE.lattice.bar}
                  />
                </pattern>
                <mask id="op-window">
                  <path
                    d={archPath}
                    fill="#fff"
                    stroke="#000"
                    strokeWidth={SCENE.lattice.margin * 2}
                  />
                  <rect
                    width={patchWidth}
                    height={patchHeight}
                    fill="url(#op-lattice)"
                  />
                </mask>
              </defs>
              <rect
                className="op-patch-light"
                width={patchWidth}
                height={patchHeight}
                mask="url(#op-window)"
              />
            </svg>
          </div>
          <div className="op-fallback-frame">
            <ResponsiveImage
              src={profile.heroPhoto}
              alt=""
              sizes="(max-width: 700px) 40vw, 18vw"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>
        <canvas ref={canvas} className="op-canvas" />
      </div>

      <div className="op-hero-copy">
        <p className="op-hero-kicker">{profile.about.headline}</p>
        <h1 id="op-name" className="op-name">
          <span>{first}</span> <span>{rest.join(' ')}</span>
        </h1>
        <div className="op-hero-actions">
          <a className="op-button op-button-solid" href="#portfolio">
            Explore the work <ArrowDown size={18} aria-hidden="true" />
          </a>
          <a className="op-button" href="#music">
            <Headphones size={18} aria-hidden="true" /> Listen
          </a>
        </div>
      </div>

      <aside className="op-placard" aria-label="Portrait label">
        <p className="op-placard-name">{profile.name}</p>
        <p className="op-placard-role">
          <span className="op-placard-current" key={role}>
            {profile.roles[role]}
          </span>
          {!reduced && profile.roles.length > 1 && (
            <button
              className="op-role-toggle"
              onClick={() => setPaused(!paused)}
              aria-label={
                paused ? 'Resume role rotation' : 'Pause role rotation'
              }
              title={paused ? 'Resume role rotation' : 'Pause role rotation'}
            >
              {paused ? (
                <Play size={14} aria-hidden="true" />
              ) : (
                <Pause size={14} aria-hidden="true" />
              )}
            </button>
          )}
        </p>
        <p className="op-placard-meta">
          {location ? `${location}, ` : ''}working since{' '}
          {profile.resume.startYear}
        </p>
      </aside>

      <div className="op-light-control">
        <label htmlFor="op-light">
          {night ? (
            <Moon size={16} aria-hidden="true" />
          ) : (
            <Sun size={16} aria-hidden="true" />
          )}
          Move the light
        </label>
        <input
          id="op-light"
          type="range"
          min="0"
          max="100"
          value={light}
          onChange={changeLight}
        />
      </div>
    </section>
  )
}
