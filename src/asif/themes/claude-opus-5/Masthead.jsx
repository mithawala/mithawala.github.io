import { useEffect, useRef, useState } from 'react'
import { ArrowDown, Pause, Play, MoveHorizontal } from 'lucide-react'
import { FieldWindow, useField, usePrefersReducedMotion } from './Field.jsx'
import { rampColour } from './field.js'

const swatch = (tone) =>
  `rgb(${rampColour(tone)
    .map((value) => Math.round(value * 255))
    .join(',')})`

export function YearLegend({ scale, label = 'Colour marks the year' }) {
  const stops = [0, 0.25, 0.5, 0.75, 1]
  return (
    <div className="o5-legend">
      <span className="o5-mono o5-dim">{label}</span>
      <span
        className="o5-legend-bar"
        style={{
          backgroundImage: `linear-gradient(90deg, ${stops
            .map((stop) => `${swatch(stop)} ${stop * 100}%`)
            .join(', ')})`,
        }}
      />
      <span className="o5-mono o5-num">
        {scale.first} — {scale.last}
      </span>
    </div>
  )
}

export default function Masthead({ profile, portfolio, blog, version }) {
  const field = useField()
  const reduced = usePrefersReducedMotion()
  const [role, setRole] = useState(0)
  const [paused, setPaused] = useState(false)
  const rotating = !reduced && profile.roles.length > 1
  const heading = useRef(null)

  useEffect(() => {
    if (!rotating || paused) return
    const timer = setInterval(
      () => setRole((index) => (index + 1) % profile.roles.length),
      3400,
    )
    return () => clearInterval(timer)
  }, [rotating, paused, profile.roles.length])

  const place = profile.contact.info.find((entry) =>
    entry.icon.includes('map-marker'),
  )?.value
  const [given, ...rest] = profile.name.split(' ')
  const years = new Date().getUTCFullYear() - profile.resume.startYear
  const index = [
    ['Works', portfolio.length],
    ['Years', years],
    ['Roles held', profile.resume.experience.length],
    ['Articles', blog.length],
  ]

  return (
    <section className="o5-section o5-stage" aria-labelledby="o5-name">
      <div className="o5-stage-copy o5-plate">
        <div className="o5-stage-lead">
          <p className="o5-mono o5-stage-meta">
            <span>{place}</span>
            <span aria-hidden="true">/</span>
            <span className="o5-num">
              Working since {profile.resume.startYear}
            </span>
          </p>
          <h1 id="o5-name" className="o5-stage-name" ref={heading}>
            <span>{given}</span>
            <span>{rest.join(' ')}</span>
          </h1>
          <p className="o5-stage-role">
            <span key={role} className="o5-role">
              {profile.roles[role]}
            </span>
            {rotating && (
              <button
                className="o5-role-toggle"
                onClick={() => setPaused((value) => !value)}
                aria-label={
                  paused ? 'Resume role rotation' : 'Pause role rotation'
                }
                title={paused ? 'Resume role rotation' : 'Pause role rotation'}
              >
                {paused ? <Play size={12} /> : <Pause size={12} />}
              </button>
            )}
          </p>
          <p className="o5-stage-line">{profile.about.headline}</p>
          <div className="o5-stage-actions">
            <a className="o5-button o5-button-solid" href="#portfolio">
              See the catalogue <ArrowDown size={15} aria-hidden="true" />
            </a>
            <a className="o5-button" href="#contact">
              Start a conversation
            </a>
          </div>
        </div>
        <dl className="o5-stage-index">
          {index.map(([label, value]) => (
            <div key={label}>
              <dt className="o5-mono">{label}</dt>
              <dd className="o5-num">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <FieldWindow id="masthead" priority={0.35} className="o5-stage-figure">
        <div className="o5-figure-head">
          <span className="o5-mono">Fig. 01 — Latent map</span>
          <span className="o5-mono o5-dim o5-num">
            {field?.map.nodes.length} works
          </span>
        </div>
        <p className="o5-figure-note">
          Every project he has made, placed by what it shares with the others.
          Near neighbours are joined.
        </p>
        <div className="o5-figure-foot">
          {field && <YearLegend scale={field.scale} />}
          <span className="o5-mono o5-dim o5-figure-hint">
            <MoveHorizontal size={13} aria-hidden="true" /> Drag to turn
          </span>
        </div>
      </FieldWindow>
    </section>
  )
}
