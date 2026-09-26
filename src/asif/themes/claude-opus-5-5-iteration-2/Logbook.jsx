import { useMemo, useRef } from 'react'
import { useAsif } from '../../core.jsx'
import { plural, scheduleOf } from './airside.mjs'
import { useInView } from './hooks.js'

function Schedule({ entries, now }) {
  const { rows, from, to } = scheduleOf(entries, now)
  if (!rows.length) return null
  const span = to - from
  const position = (value) => ((value - from) / span) * 100
  const years = Array.from({ length: span + 1 }, (_, index) => from + index)
  const today = now.getUTCFullYear() + now.getUTCMonth() / 12
  return (
    <figure className="as-schedule">
      <figcaption className="as-block-title">
        <span>Rotation chart</span>
        <span className="as-block-meta">
          {from}–{now.getUTCFullYear()} · overlapping duties
        </span>
      </figcaption>
      <div
        className="as-schedule-chart"
        role="img"
        aria-label={`Timeline of ${rows.length} positions and studies from ${from} to ${now.getUTCFullYear()}. Every entry is listed in full in the logbook below.`}
      >
        <div className="as-schedule-axis">
          {years.map((year) => (
            <span
              key={year}
              style={{ left: `${position(year)}%` }}
              data-major={year % 5 === 0 ? 'true' : undefined}
            >
              {year}
            </span>
          ))}
          <i
            className="as-schedule-now"
            style={{ left: `${position(today)}%` }}
          >
            <b>Now</b>
          </i>
        </div>
        {rows.map(({ entry, span: period }) => (
          <div
            className={`as-schedule-row as-schedule-row--${entry.kind}`}
            key={`${entry.company}-${entry.period}`}
          >
            <span className="as-schedule-label">{entry.company}</span>
            <span className="as-schedule-track">
              <span
                className="as-schedule-bar"
                data-current={period.current ? 'true' : undefined}
                style={{
                  left: `${position(period.start)}%`,
                  width: `${Math.max(0.6, position(period.end) - position(period.start))}%`,
                }}
              />
            </span>
          </div>
        ))}
      </div>
    </figure>
  )
}

function StripBay({ title, kind, entries }) {
  return (
    <div className={`as-bay as-bay--${kind}`}>
      <h3 className="as-bay-title">
        <span>{title}</span>
        <span className="as-block-meta">{plural(entries.length, 'strip')}</span>
      </h3>
      <ol className="as-strips">
        {entries.map((entry) => (
          <li className="as-strip" key={`${entry.company}-${entry.period}`}>
            <div className="as-strip-cell as-strip-period">
              <span className="as-strip-field" aria-hidden="true">
                Period
              </span>
              <span className="as-strip-when">{entry.period}</span>
            </div>
            <div className="as-strip-cell as-strip-logo">
              <img src={entry.logo} alt="" loading="lazy" decoding="async" />
            </div>
            <div className="as-strip-cell as-strip-main">
              <span className="as-strip-field" aria-hidden="true">
                {kind === 'work' ? 'Operator' : 'School'}
              </span>
              <h4>{entry.title}</h4>
              <p className="as-strip-company">{entry.company}</p>
            </div>
            <div className="as-strip-cell as-strip-remarks">
              <span className="as-strip-field" aria-hidden="true">
                Remarks
              </span>
              <p>{entry.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

const ARC = 'M 20.16 83 A 46 46 0 1 1 99.84 83'
const TICKS = Array.from({ length: 11 }, (_, index) => {
  const angle = ((-120 + index * 24) * Math.PI) / 180
  const outer = 52
  const inner = index % 5 === 0 ? 42 : 46
  return {
    index,
    x1: 60 + inner * Math.sin(angle),
    y1: 60 - inner * Math.cos(angle),
    x2: 60 + outer * Math.sin(angle),
    y2: 60 - outer * Math.cos(angle),
  }
})

function Gauge({ skill }) {
  const value = Math.max(0, Math.min(100, Number(skill.value) || 0))
  return (
    <div
      className="as-gauge"
      style={{ '--angle': `${-120 + 2.4 * value}deg`, '--value': value }}
    >
      <svg
        className="as-gauge-dial"
        viewBox="0 0 120 120"
        aria-hidden="true"
        focusable="false"
      >
        <circle className="as-gauge-face" cx="60" cy="60" r="57" />
        {TICKS.map((tick) => (
          <line
            key={tick.index}
            className={tick.index % 5 === 0 ? 'is-major' : undefined}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
          />
        ))}
        <path className="as-gauge-track" d={ARC} pathLength="100" />
        <path className="as-gauge-arc" d={ARC} pathLength="100" />
        <g className="as-gauge-needle">
          <path d="M 57.5 62 L 60 17 L 62.5 62 Z" />
        </g>
        <circle className="as-gauge-hub" cx="60" cy="60" r="6" />
      </svg>
      <span className="as-gauge-readout" aria-hidden="true">
        {value}
        <small>%</small>
      </span>
      <meter
        className="as-gauge-meter"
        min="0"
        max="100"
        value={skill.value}
        aria-label={skill.name}
      >
        {skill.value}%
      </meter>
      <span className="as-gauge-name">{skill.name}</span>
    </div>
  )
}

function Instruments({ groups, reduced }) {
  const panel = useRef(null)
  const seen = useInView(panel, { threshold: 0.2, once: true })
  return (
    <div
      ref={panel}
      className={`as-panel ${!reduced && !seen ? 'is-armed' : ''}`}
    >
      <h3 className="as-block-title as-panel-title">
        <span>Instrument panel</span>
        <span className="as-block-meta">Proficiency, 0–100</span>
      </h3>
      <div className="as-panel-groups">
        {groups.map(([name, skills]) => (
          <div className="as-panel-group" key={name}>
            <h4>{name}</h4>
            <ul className="as-gauges">
              {skills.map((skill) => (
                <li key={skill.name}>
                  <Gauge skill={skill} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Logbook({ reduced }) {
  const { profile } = useAsif()
  const { experience, education, functionalSkills, codingSkills } =
    profile.resume
  const now = useMemo(() => new Date(), [])
  const entries = useMemo(
    () => [
      ...experience.map((entry) => ({ ...entry, kind: 'work' })),
      ...education.map((entry) => ({ ...entry, kind: 'school' })),
    ],
    [experience, education],
  )
  return (
    <div className="as-logbook">
      <Schedule entries={entries} now={now} />
      <div className="as-bays">
        <StripBay title="Experience" kind="work" entries={experience} />
        <StripBay title="Education" kind="school" entries={education} />
      </div>
      <Instruments
        reduced={reduced}
        groups={[
          ['Functional', functionalSkills],
          ['Coding', codingSkills],
        ]}
      />
    </div>
  )
}
