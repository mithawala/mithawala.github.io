import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUp,
  ArrowUpRight,
  Menu,
  Moon,
  Music2,
  Search,
  Sun,
  X,
} from 'lucide-react'
import '@fontsource-variable/eczar'
import '@fontsource-variable/schibsted-grotesk'
import { useAsif } from '../../core.jsx'
import Hero from './Hero.jsx'
import Works from './Works.jsx'
import Career from './Career.jsx'
import { About, Writing, Music, Contact, Star } from './Chapters.jsx'
import './theme.css'
import './sections.css'
import './evening.css'

const ORDER = ['about', 'portfolio', 'resume', 'blog', 'music', 'contact']
const LABELS = {
  about: 'About',
  portfolio: 'Works',
  resume: 'Career',
  blog: 'Writing',
  music: 'Music',
  contact: 'Contact',
}

function useActiveSection(ids) {
  const [active, setActive] = useState('')
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const current = ids
        .map((id) => document.getElementById(id))
        .filter(
          (element) => element && element.getBoundingClientRect().top <= 140,
        )
        .at(-1)
      setActive(current?.id || '')
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)
    }
  }, [ids])
  return active
}

function Header({
  profile,
  version,
  mode,
  setAppearance,
  openSearch,
  active,
  playback,
}) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const toggle = useRef(null)
  const nav = useRef(null)
  const next = mode === 'light' ? 'dark' : 'light'

  useEffect(() => {
    const update = () => setScrolled(scrollY > 24)
    update()
    addEventListener('scroll', update, { passive: true })
    return () => removeEventListener('scroll', update)
  }, [])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    nav.current?.querySelector('a')?.focus()
    const keydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        toggle.current?.focus()
      }
      if (event.key === 'Tab') {
        const items = [toggle.current, ...nav.current.querySelectorAll('a')]
        const index = items.indexOf(document.activeElement)
        if (event.shiftKey && index <= 0) {
          event.preventDefault()
          items.at(-1).focus()
        } else if (!event.shiftKey && index === items.length - 1) {
          event.preventDefault()
          items[0].focus()
        }
      }
    }
    addEventListener('keydown', keydown)
    return () => {
      document.body.style.overflow = previous
      removeEventListener('keydown', keydown)
    }
  }, [open])

  return (
    <header
      className="op-header"
      data-scrolled={scrolled || undefined}
      data-open={open || undefined}
    >
      <a
        className="op-brand"
        href={version.path}
        aria-label={`${profile.name}, top of page`}
      >
        <Star />
        <span>{profile.name}</span>
      </a>
      <nav id="op-navigation" ref={nav} aria-label="Main navigation">
        <ul>
          {ORDER.map((id) => (
            <li key={id}>
              <a
                href={`${version.path}#${id}`}
                aria-current={active === id ? 'location' : undefined}
                onClick={() => {
                  setOpen(false)
                  requestAnimationFrame(() =>
                    document.getElementById(id)?.focus({ preventScroll: true }),
                  )
                }}
              >
                {LABELS[id]}
              </a>
            </li>
          ))}
          <li className="op-nav-editions">
            <Link to="/" onClick={() => setOpen(false)}>
              All editions <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </nav>
      <div className="op-tools">
        {playback.playing && (
          <a className="op-now-playing" href={`${version.path}#music`}>
            <Music2 size={15} aria-hidden="true" />
            <span className="op-now-label">Now playing</span>
            <span className="op-now-title">{playback.title}</span>
          </a>
        )}
        <button
          className="op-icon"
          onClick={openSearch}
          aria-label="Search"
          title="Search (press /)"
        >
          <Search size={19} aria-hidden="true" />
        </button>
        <button
          className="op-icon"
          onClick={() => setAppearance(next)}
          aria-label={`Switch to ${next} mode`}
          title={next === 'dark' ? 'Light the lantern' : 'Let the sun in'}
        >
          {mode === 'light' ? (
            <Moon size={19} aria-hidden="true" />
          ) : (
            <Sun size={19} aria-hidden="true" />
          )}
        </button>
        <Link className="op-editions" to="/">
          All editions <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <button
          ref={toggle}
          className="op-icon op-menu"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="op-navigation"
        >
          {open ? (
            <X size={21} aria-hidden="true" />
          ) : (
            <Menu size={21} aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  )
}

export default function Theme() {
  const {
    profile,
    portfolio,
    blog,
    contract,
    version,
    mode,
    setAppearance,
    openSearch,
  } = useAsif()
  const active = useActiveSection(ORDER)
  const [playback, setPlayback] = useState({ playing: false, title: '' })
  const search = useRef(openSearch)
  search.current = openSearch

  useEffect(() => {
    const key = (event) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey)
        return
      if (
        event.target.closest?.(
          'input, textarea, select, [contenteditable="true"]',
        )
      )
        return
      if (document.querySelector('dialog[open]')) return
      event.preventDefault()
      search.current()
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [])

  return (
    <div className="op" id="top">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header
        profile={profile}
        version={version}
        mode={mode}
        setAppearance={setAppearance}
        openSearch={openSearch}
        active={active}
        playback={playback}
      />
      <main id="main-content" tabIndex={-1}>
        <Hero profile={profile} mode={mode} />
        <About profile={profile} />
        <Works
          portfolio={portfolio}
          categories={contract.categories}
          version={version}
        />
        <Career resume={profile.resume} />
        <Writing blog={blog} version={version} />
        <Music
          profile={profile}
          onPlaybackChange={setPlayback}
          playing={playback.playing}
        />
        <Contact profile={profile} />
      </main>
      <footer className="op-footer">
        <p>
          <Star /> {profile.copyright}
        </p>
        <Link to="/">
          All editions <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <a
          className="op-icon"
          href="#top"
          aria-label="Back to top"
          title="Back to top"
        >
          <ArrowUp size={19} aria-hidden="true" />
        </a>
      </footer>
    </div>
  )
}
