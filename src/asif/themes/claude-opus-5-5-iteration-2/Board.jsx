import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Pause, PlaneTakeoff, Play } from 'lucide-react'
import { useAsif } from '../../core.jsx'
import { ResponsiveImage } from '../../features.jsx'
import { contactValue } from './airside.mjs'
import { FlapText } from './Flaps.jsx'
import { useClock, useInView } from './hooks.js'

export function Board({ sections, reduced }) {
  const { profile } = useAsif()
  const roles = profile.roles.length ? profile.roles : [profile.subtitle]
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(reduced)
  const hero = useRef(null)
  const inView = useInView(hero)
  const clock = useClock(contactValue(profile, 'map-marker'))

  useEffect(() => setPaused(reduced), [reduced])
  useEffect(() => {
    if (paused || !inView || roles.length < 2) return
    const timer = setInterval(() => {
      if (!document.hidden) setIndex((value) => (value + 1) % roles.length)
    }, 4200)
    return () => clearInterval(timer)
  }, [paused, inView, roles.length])

  return (
    <div className="as-hero as-lane" ref={hero}>
      <div className="as-board">
        <div className="as-board-head">
          <p className="as-board-title">
            <PlaneTakeoff size={20} aria-hidden="true" />
            <span lang="sv">Avgångar</span>
            <span className="as-board-title-en">Departures</span>
          </p>
          <p className="as-board-clock">
            <span className="as-board-clock-label">{clock.label}</span>
            <FlapText
              text={clock.time}
              min={15}
              max={22}
              gap={2}
              animate={!reduced}
              className="as-clock-flaps"
            />
            <span className="sr-only">{clock.time}</span>
          </p>
        </div>
        <div className="as-board-id">
          <figure className="as-board-photo">
            <ResponsiveImage
              src={profile.heroPhoto}
              alt={`Portrait of ${profile.name}`}
              sizes="(max-width: 700px) 104px, 230px"
              loading="eager"
              fetchPriority="high"
            />
          </figure>
          <h1 id="as-name" className="as-name" tabIndex={-1}>
            <span className="sr-only">{profile.name}</span>
            <FlapText
              text={profile.name}
              min={34}
              max={74}
              gap={5}
              floor={14}
              animate={!reduced}
            />
          </h1>
          <div className="as-roles">
            <p className="sr-only">Roles: {roles.join(', ')}</p>
            <FlapText
              text={roles[index]}
              texts={roles}
              min={19}
              max={32}
              gap={3}
              floor={11}
              animate={!reduced}
              stagger={16}
              className="as-role-flaps"
            />
            {roles.length > 1 && (
              <button
                type="button"
                className="as-role-toggle"
                aria-label={
                  paused ? 'Play role rotation' : 'Pause role rotation'
                }
                title={paused ? 'Play role rotation' : 'Pause role rotation'}
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? (
                  <Play size={18} aria-hidden="true" />
                ) : (
                  <Pause size={18} aria-hidden="true" />
                )}
              </button>
            )}
          </div>
          <p className="as-headline">{profile.about.headline}</p>
        </div>
        <div className="as-board-cols" aria-hidden="true">
          <span>Flight</span>
          <span>Destination</span>
          <span className="as-board-cols-gate">Gate</span>
          <span>Remarks</span>
        </div>
        <ol className="as-destinations" aria-label="Destinations">
          {sections.map((section, position) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="as-destination">
                <span className="as-mf as-dest-code" aria-hidden="true">
                  {`AM ${String(position + 1).padStart(2, '0')}`}
                </span>
                <span className="as-mf as-dest-name">{section.label}</span>
                <span className="as-dest-sv" lang="sv" aria-hidden="true">
                  {section.sv}
                </span>
                <span className="as-dest-gate" aria-hidden="true">
                  {section.letter}
                </span>
                <span className="as-mf as-dest-remark">
                  <span className="sr-only">, </span>
                  {section.remark}
                </span>
                <ArrowRight
                  className="as-dest-arrow"
                  size={20}
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
