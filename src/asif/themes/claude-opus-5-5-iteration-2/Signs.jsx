import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ChevronsUp,
  LayoutGrid,
  Menu as MenuIcon,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react'
import { useAsif } from '../../core.jsx'

export function backToTop(reduced) {
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  document.getElementById('as-name')?.focus({ preventScroll: true })
}

// ICAO-style sign array: the current section is a black location sign,
// every other section is a yellow direction sign pointing up or down.
export function SignBar({ sections, active, reduced }) {
  const { mode, setAppearance, openSearch } = useAsif()
  const [open, setOpen] = useState(false)
  const menuButton = useRef(null)
  const nav = useRef(null)
  const activeIndex = sections.findIndex((section) => section.id === active)
  const current = sections[activeIndex]

  useEffect(() => {
    if (!open) return
    const keydown = (event) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]'))
        return
      event.preventDefault()
      setOpen(false)
      menuButton.current?.focus()
    }
    const pointer = (event) => {
      if (
        !nav.current?.contains(event.target) &&
        !menuButton.current?.contains(event.target)
      )
        setOpen(false)
    }
    window.addEventListener('keydown', keydown)
    document.addEventListener('pointerdown', pointer)
    return () => {
      window.removeEventListener('keydown', keydown)
      document.removeEventListener('pointerdown', pointer)
    }
  }, [open])

  useEffect(() => {
    const media = matchMedia('(min-width: 1180px)')
    const update = () => media.matches && setOpen(false)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const dark = mode === 'dark'
  return (
    <div className="as-signbar" data-open={open ? 'true' : undefined}>
      <Link className="as-sign as-sign--info as-bar-editions" to="/">
        <LayoutGrid size={17} aria-hidden="true" />
        <span className="as-bar-editions-text">All editions</span>
      </Link>
      <p className="as-where">
        <span className="sr-only">Current section: </span>
        <span className="as-sign-letter" aria-hidden="true">
          {current?.letter || '·'}
        </span>
        <span>{current?.label || 'Start'}</span>
      </p>
      <nav
        id="as-nav"
        ref={nav}
        className="as-nav"
        aria-label="Main navigation"
      >
        <p className="as-nav-title" aria-hidden="true">
          Taxi route
        </p>
        <ul>
          {sections.map((section, index) => {
            const state =
              index === activeIndex
                ? 'here'
                : activeIndex >= 0 && index < activeIndex
                  ? 'behind'
                  : 'ahead'
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={`as-sign as-sign--${state}`}
                  aria-current={state === 'here' ? 'location' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {state === 'behind' && (
                    <ArrowUp size={17} strokeWidth={3} aria-hidden="true" />
                  )}
                  <span className="as-sign-letter" aria-hidden="true">
                    {section.letter}
                  </span>
                  <span className="as-sign-label">{section.label}</span>
                  {state === 'ahead' && (
                    <ArrowDown size={17} strokeWidth={3} aria-hidden="true" />
                  )}
                </a>
              </li>
            )
          })}
        </ul>
        <Link className="as-nav-editions" to="/">
          <LayoutGrid size={18} aria-hidden="true" />
          All editions
        </Link>
      </nav>
      <div className="as-controls">
        <button
          type="button"
          className="as-ctl"
          aria-label="Back to top"
          title="Back to top"
          onClick={() => backToTop(reduced)}
        >
          <ChevronsUp size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="as-ctl as-ctl--search"
          onClick={openSearch}
        >
          <Search size={18} aria-hidden="true" />
          <span className="as-ctl-text">Search</span>
        </button>
        <button
          type="button"
          className="as-ctl"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Day operations' : 'Night operations'}
          onClick={() => setAppearance(dark ? 'light' : 'dark')}
        >
          {dark ? (
            <Sun size={19} aria-hidden="true" />
          ) : (
            <Moon size={19} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          ref={menuButton}
          className="as-ctl as-ctl--menu"
          aria-expanded={open}
          aria-controls="as-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X size={18} aria-hidden="true" />
          ) : (
            <MenuIcon size={18} aria-hidden="true" />
          )}
          <span>Menu</span>
        </button>
      </div>
    </div>
  )
}
