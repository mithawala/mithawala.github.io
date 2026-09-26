import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronsUp, LayoutGrid } from 'lucide-react'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/martian-mono/wdth.css'
import { useAsif } from '../../core.jsx'
import { buildRoute, plural, yearsOf } from './airside.mjs'
import { useActiveSection, useReducedMotion } from './hooks.js'
import { Board } from './Board.jsx'
import { SignBar, backToTop } from './Signs.jsx'
import { Crew, socialLinks } from './Crew.jsx'
import { Departures } from './Departures.jsx'
import { Logbook } from './Logbook.jsx'
import { Magazines } from './Magazines.jsx'
import { Entertainment } from './Entertainment.jsx'
import { Cargo } from './Cargo.jsx'
import './tokens.css'
import './flaps.css'
import './bar.css'
import './board.css'
import './shell.css'
import './crew.css'
import './departures.css'
import './logbook.css'
import './pocket.css'
import './ife.css'
import './cargo.css'

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join('')
}

function Stop({ stop, lead, children }) {
  return (
    <section
      id={stop.id}
      className={`as-stop as-stop--${stop.id} as-lane`}
      aria-labelledby={`${stop.id}-title`}
    >
      <div className="as-holding" aria-hidden="true" />
      <header className="as-stop-head">
        <span className="as-marking" aria-hidden="true">
          {stop.letter}
        </span>
        <p className="as-eyebrow">
          <span>{stop.concept}</span>
          <span lang="sv" className="as-eyebrow-sv">
            {stop.sv}
          </span>
        </p>
        <h2 id={`${stop.id}-title`}>{stop.label}</h2>
        {lead && <p className="as-lead">{lead}</p>}
      </header>
      {children}
    </section>
  )
}

export default function Theme() {
  const asif = useAsif()
  const { profile, portfolio, blog } = asif
  const reduced = useReducedMotion()
  const route = useMemo(() => buildRoute(asif), [asif.contract])
  const active = useActiveSection(route.map((stop) => stop.id))
  const stops = Object.fromEntries(route.map((stop) => [stop.id, stop]))
  const years = yearsOf(portfolio)
  const resume = profile.resume
  return (
    <div className="as-root">
      <a className="skip-link" href="#as-content">
        Skip to content
      </a>
      <SignBar sections={route} active={active} reduced={reduced} />
      <main id="as-content" className="as-main" tabIndex={-1}>
        <Board sections={route} reduced={reduced} />
        <Stop stop={stops.about}>
          <Crew />
        </Stop>
        <Stop
          stop={stops.portfolio}
          lead={`${plural(portfolio.length, 'project')}${years ? `, ${years.first}–${years.last}` : ''}. Apps, builds, videos, events and experiments, each with a gate and a flight number.`}
        >
          <Departures reduced={reduced} />
        </Stop>
        <Stop
          stop={stops.resume}
          lead={`${plural(resume.experience.length, 'position')} and ${plural(resume.education.length, 'school')}, logged as flight strips.`}
        >
          <Logbook reduced={reduced} />
        </Stop>
        <Stop
          stop={stops.blog}
          lead={`${plural(blog.length, 'article')} in the seat pocket in front of you.`}
        >
          <Magazines />
        </Stop>
        <Stop stop={stops.music} lead="Put your headphones on.">
          <Entertainment />
        </Stop>
        <Stop
          stop={stops.contact}
          lead="Send a message. It flies straight to the inbox."
        >
          <Cargo />
        </Stop>
      </main>
      <footer className="as-footer">
        <div className="as-runway" aria-hidden="true">
          <span className="as-runway-keys" />
          <span className="as-runway-name">
            <b>{initials(profile.name)}</b>
            <small>{profile.name}</small>
          </span>
          <span className="as-runway-keys" />
        </div>
        <div className="as-footer-row">
          <p>{profile.copyright}</p>
          <ul className="as-footer-social" aria-label="Social profiles">
            {socialLinks(profile).map(({ key, url, label, Icon }) => (
              <li key={key}>
                <a href={url} target="_blank" rel="noreferrer">
                  <Icon size={17} aria-hidden="true" />
                  <span>{label}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="as-footer-links">
            <Link to="/">
              <LayoutGrid size={17} aria-hidden="true" />
              All editions
            </Link>
            <button type="button" onClick={() => backToTop(reduced)}>
              <ChevronsUp size={18} aria-hidden="true" />
              Back to top
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
