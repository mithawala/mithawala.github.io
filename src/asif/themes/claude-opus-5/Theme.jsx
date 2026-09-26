import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUp,
  ArrowUpRight,
  Menu as MenuIcon,
  Moon,
  Search,
  Sun,
  X,
  AudioLines,
} from 'lucide-react'
import '@fontsource-variable/familjen-grotesk'
import '@fontsource-variable/jetbrains-mono'
import { useAsif } from '../../core.jsx'
import FieldLayer from './Field.jsx'
import Masthead from './Masthead.jsx'
import Catalogue from './Catalogue.jsx'
import { About, Resume } from './Profile.jsx'
import { Writing, Music, Contact } from './Chapters.jsx'
import './theme.css'
import './sections.css'

const SECTIONS = [
  { id: 'portfolio', label: 'Work' },
  { id: 'about', label: 'Person' },
  { id: 'resume', label: 'Record' },
  { id: 'blog', label: 'Writing' },
  { id: 'music', label: 'Sound' },
  { id: 'contact', label: 'Contact' },
]

function useActiveSection() {
  const [active, setActive] = useState('')
  useEffect(() => {
    const update = () => {
      let current = ''
      for (const { id } of SECTIONS) {
        const element = document.getElementById(id)
        if (element && element.getBoundingClientRect().top <= 140) current = id
      }
      setActive(current)
    }
    update()
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update)
    return () => {
      removeEventListener('scroll', update)
      removeEventListener('resize', update)
    }
  }, [])
  return active
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
  const [menu, setMenu] = useState(false)
  const [playing, setPlaying] = useState(null)
  const active = useActiveSection()
  const menuButton = useRef(null)
  const nav = useRef(null)
  const night = mode === 'dark'

  useEffect(() => {
    if (!menu) return
    const keydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenu(false)
        menuButton.current?.focus()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [
        menuButton.current,
        ...nav.current.querySelectorAll('a[href]'),
      ].filter(Boolean)
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    addEventListener('keydown', keydown)
    return () => removeEventListener('keydown', keydown)
  }, [menu])

  useEffect(() => {
    const shortcut = (event) => {
      const tag = document.activeElement?.tagName
      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !['INPUT', 'TEXTAREA'].includes(tag)
      ) {
        event.preventDefault()
        openSearch()
      }
    }
    addEventListener('keydown', shortcut)
    return () => removeEventListener('keydown', shortcut)
  }, [openSearch])

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="o5-header">
        <a
          className="o5-wordmark"
          href="#top"
          aria-label={`${profile.name}, back to top`}
        >
          <i aria-hidden="true" />
          {profile.name}
        </a>

        <nav
          className="o5-nav"
          id="o5-navigation"
          aria-label="Main navigation"
          ref={nav}
          data-open={menu}
        >
          <ul>
            {SECTIONS.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`${version.path}#${section.id}`}
                  aria-current={active === section.id ? 'location' : undefined}
                  onClick={() => setMenu(false)}
                >
                  {section.label}
                  <sup aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </sup>
                </a>
              </li>
            ))}
            <li className="o5-nav-gallery">
              <Link to="/" onClick={() => setMenu(false)}>
                All editions
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </nav>

        <div className="o5-tools">
          {playing?.playing && (
            <a className="o5-now-playing" href={`${version.path}#music`}>
              <AudioLines size={14} aria-hidden="true" />
              <span>{playing.title}</span>
            </a>
          )}
          <button
            className="o5-icon"
            onClick={openSearch}
            aria-label="Search"
            title="Search (press /)"
          >
            <Search size={19} />
          </button>
          <button
            className="o5-icon"
            onClick={() => setAppearance(night ? 'light' : 'dark')}
            aria-label={night ? 'Switch to light mode' : 'Switch to dark mode'}
            title={night ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {night ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <Link className="o5-gallery-link" to="/">
            <span>All editions</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
          <button
            className="o5-icon o5-menu-button"
            ref={menuButton}
            onClick={() => setMenu((open) => !open)}
            aria-label="Menu"
            aria-expanded={menu}
            aria-controls="o5-navigation"
          >
            {menu ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </header>

      <FieldLayer mode={mode} version={version}>
        <div className="o5-shell" id="top">
          <main id="main-content">
            <Masthead
              profile={profile}
              portfolio={portfolio}
              blog={blog}
              version={version}
            />
            <Catalogue
              portfolio={portfolio}
              contract={contract}
              version={version}
            />
            <About profile={profile} />
            <Resume profile={profile} />
            <Writing blog={blog} version={version} />
            <Music profile={profile} onPlaybackChange={setPlaying} />
            <Contact profile={profile} />
          </main>

          <footer className="o5-footer">
            <div className="o5-footer-top">
              <p>Let’s build something that lasts.</p>
              <nav aria-label="Sections">
                <ul>
                  {SECTIONS.map((section) => (
                    <li key={section.id}>
                      <a href={`${version.path}#${section.id}`}>
                        {section.label}
                      </a>
                    </li>
                  ))}
                  <li>
                    <a href="#top">
                      Back to top <ArrowUp size={13} aria-hidden="true" />
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
            <div className="o5-footer-meta o5-mono">
              <span>{profile.copyright}</span>
              <span>
                {version.model} — the map is built from each work’s categories,
                technologies and title
              </span>
              <Link to="/">All editions</Link>
            </div>
          </footer>
        </div>
      </FieldLayer>
    </>
  )
}
