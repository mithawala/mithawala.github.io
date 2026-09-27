import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  AudioLines,
  Check,
  Download,
  Github,
  Instagram,
  LayoutGrid,
  Linkedin,
  List,
  LoaderCircle,
  Menu,
  Moon,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Shuffle,
  Sun,
  Youtube,
} from 'lucide-react'
import '@fontsource-variable/space-grotesk'
import '@fontsource/ibm-plex-mono/400.css'
import { useAsif } from '../../core.jsx'
import { detailPath, filterPortfolio, formatDate } from '../../content.mjs'
import { ResponsiveImage, useContactForm } from '../../features.jsx'
import Dialog from '../../Dialog.jsx'
import CuriosityScene from './CuriosityScene.jsx'
import ListeningRoom from './ListeningRoom.jsx'
import './theme.css'

const socialIcons = {
  linkedin: Linkedin,
  github: Github,
  youtube: Youtube,
  instagram: Instagram,
}

const socialLabels = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  youtube: 'YouTube',
  instagram: 'Instagram',
}

const chapterLabels = {
  about: 'The person',
  portfolio: 'The work',
  music: 'The sound',
  resume: 'The journey',
  blog: 'The notes',
  contact: 'Say hello',
}

const chapterOrder = [
  'about',
  'portfolio',
  'music',
  'resume',
  'blog',
  'contact',
]
const number = (value) => String(value).padStart(2, '0')

function Emblem({ className = '' }) {
  return (
    <svg
      className={className}
      width="36"
      height="36"
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <path
        d="M17 0h6l-1 13 9-10 5 5-10 9 14-1v7l-14-1 10 9-5 5-9-10 1 14h-6l1-14-10 10-5-5 10-9-13 1v-7l13 1L3 8l5-5 10 10Z"
        fill="currentColor"
      />
    </svg>
  )
}

function useMotionPreference() {
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

function useActiveChapter() {
  const [active, setActive] = useState('about')
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const position = Math.min(innerHeight * 0.35, 300)
      const current = chapterOrder.findLast(
        (id) =>
          document.getElementById(id)?.getBoundingClientRect().top <= position,
      )
      setActive(current || 'about')
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])
  return active
}

function ChapterHeading({ id, eyebrow, children, aside }) {
  return (
    <div className="ca-section-heading">
      <div className="ca-chapter-number" aria-hidden="true">
        {number(chapterOrder.indexOf(id) + 1)}
      </div>
      <div>
        <p className="ca-kicker">{eyebrow}</p>
        <h2 id={`ca-${id}-title`}>{children}</h2>
      </div>
      {aside && <div className="ca-heading-aside">{aside}</div>}
    </div>
  )
}

function Navigation({ active }) {
  const { contract, mode, setAppearance, openSearch } = useAsif()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef(null)
  const closeMenu = () => {
    setMenuOpen(false)
    requestAnimationFrame(() => menuButton.current?.focus())
  }
  const destinations = chapterOrder.map((id) =>
    contract.sections.find((section) => section.id === id),
  )
  const links = (mobile = false) => (
    <nav
      aria-label="Main navigation"
      className={mobile ? 'ca-menu-links' : 'ca-dock-links'}
    >
      {destinations.map(({ id, label }, index) => (
        <a
          key={id}
          href={`#${id}`}
          aria-label={label}
          aria-current={active === id ? 'location' : undefined}
          onClick={mobile ? closeMenu : undefined}
        >
          <span className="ca-nav-number" aria-hidden="true">
            {number(index + 1)}
          </span>
          <span>{mobile ? chapterLabels[id] : label}</span>
          {mobile && <ArrowUpRight size={24} aria-hidden="true" />}
        </a>
      ))}
    </nav>
  )
  return (
    <>
      <div className="ca-dock">
        <button
          ref={menuButton}
          className="ca-menu-trigger"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={19} aria-hidden="true" />
          <span>{chapterLabels[active]}</span>
        </button>
        <div className="ca-desktop-navigation">{links()}</div>
        <div className="ca-dock-tools">
          <button
            className="ca-icon-button"
            onClick={openSearch}
            aria-label="Search"
            title="Search (Ctrl+K)"
          >
            <Search size={18} aria-hidden="true" />
          </button>
          <button
            className="ca-icon-button"
            onClick={() => setAppearance(mode === 'light' ? 'dark' : 'light')}
            aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
          >
            {mode === 'light' ? (
              <Moon size={18} aria-hidden="true" />
            ) : (
              <Sun size={18} aria-hidden="true" />
            )}
          </button>
          <a
            href="#about"
            className="ca-icon-button ca-top-link"
            aria-label="Back to top"
            title="Back to top"
          >
            <ArrowUp size={18} aria-hidden="true" />
          </a>
        </div>
      </div>
      {menuOpen && (
        <Dialog
          title="Explore the atlas"
          onClose={closeMenu}
          className="ca-menu-dialog"
        >
          <p className="ca-kicker">Choose a direction</p>
          <h2>The atlas.</h2>
          {links(true)}
          <a href="/" className="ca-text-link">
            <ArrowLeft size={16} /> All editions
          </a>
        </Dialog>
      )}
    </>
  )
}

function About({ reducedMotion, paused, setPaused }) {
  const { profile, portfolio, mode, version } = useAsif()
  const [roleIndex, setRoleIndex] = useState(0)
  const [variant, setVariant] = useState('weave')
  useEffect(() => {
    if (reducedMotion || paused) return
    const timer = setInterval(
      () => setRoleIndex((index) => (index + 1) % profile.roles.length),
      3600,
    )
    return () => clearInterval(timer)
  }, [reducedMotion, paused, profile.roles.length])
  return (
    <section id="about" aria-labelledby="ca-person-name">
      <header className="ca-masthead">
        <a
          className="ca-wordmark"
          href="#about"
          aria-label={`${profile.name}, back to top`}
        >
          <Emblem />
          <span>
            The curiosity
            <br />
            atlas.
          </span>
        </a>
        <p className="ca-edition-mark">
          {version.model}
          <span>Independent edition / 02</span>
        </p>
        <a className="ca-gallery-link" href="/">
          <ArrowLeft size={15} aria-hidden="true" /> All editions
        </a>
      </header>
      <div className="ca-hero">
        <div className="ca-hero-meta ca-kicker">
          <span>Cloud. Code. A little bit of everything.</span>
          <span>
            {profile.contact.info.find((info) => info.link === null)?.value}
          </span>
        </div>
        <h1 id="ca-person-name">
          {profile.name.split(' ').map((part, index) => (
            <span key={index}>
              {index > 0 && ' '}
              {part}
            </span>
          ))}
          <span className="ca-name-dot" aria-hidden="true">
            .
          </span>
        </h1>
        <div className="ca-playground">
          <svg
            className="ca-orbit-lines"
            viewBox="0 0 1200 500"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <ellipse cx="600" cy="245" rx="535" ry="190" />
            <ellipse
              cx="600"
              cy="245"
              rx="375"
              ry="215"
              transform="rotate(-12 600 245)"
            />
            <path d="M600 0v500M0 245h1200" />
            <circle cx="65" cy="245" r="4" />
            <circle cx="1135" cy="245" r="4" />
          </svg>
          <span className="ca-curiosity-word" aria-hidden="true">
            curiosity
          </span>
          <div className="ca-scene-frame">
            <CuriosityScene
              mode={mode}
              paused={paused || reducedMotion}
              variant={variant}
            />
          </div>
          <a className="ca-orbit-note ca-note-work" href="#portfolio">
            <span className="ca-kicker">01 / Make something</span>
            <strong>
              Small experiments.
              <br />
              Real possibilities.
            </strong>
            <span>
              {portfolio.length} projects to explore{' '}
              <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          </a>
          <a className="ca-orbit-note ca-note-human" href="#ca-biography">
            <ResponsiveImage
              src={profile.photo}
              alt=""
              sizes="56px"
              loading="eager"
            />
            <span>
              <span className="ca-kicker">The human behind it</span>
              <strong>
                Hi, I'm {profile.name.split(' ')[0]}.{' '}
                <ArrowUpRight size={16} aria-hidden="true" />
              </strong>
            </span>
          </a>
          <a className="ca-orbit-note ca-note-sound" href="#music">
            <AudioLines size={28} strokeWidth={1.4} aria-hidden="true" />
            <span>
              <span className="ca-kicker">A different frequency</span>
              <strong>There's music, too.</strong>
            </span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
          <span className="ca-field-caption ca-kicker">
            An open mind is a work in progress.
          </span>
        </div>
        <div className="ca-playground-toolbar">
          <div
            className="ca-shape-selector"
            role="group"
            aria-label="Sculpture form"
          >
            <span className="ca-kicker">Give curiosity a shape</span>
            {['weave', 'orbit', 'bloom'].map((shape) => (
              <button
                key={shape}
                aria-pressed={variant === shape}
                onClick={() => setVariant(shape)}
              >
                {shape[0].toUpperCase() + shape.slice(1)}
              </button>
            ))}
          </div>
          <button
            className="ca-motion-toggle"
            onClick={() => setPaused(!paused)}
            aria-label={
              paused || reducedMotion ? 'Resume motion' : 'Pause motion'
            }
            disabled={reducedMotion}
            title={
              reducedMotion
                ? 'Your reduced-motion preference is respected'
                : undefined
            }
          >
            {paused || reducedMotion ? (
              <Play size={13} aria-hidden="true" />
            ) : (
              <Pause size={13} aria-hidden="true" />
            )}
            {reducedMotion
              ? 'Reduced motion'
              : paused
                ? 'Motion paused'
                : 'Pause motion'}
          </button>
        </div>
        <div className="ca-hero-footer">
          <p>
            <span className="ca-status-dot" aria-hidden="true" />
            <span data-rotating-role>{profile.roles[roleIndex]}</span>
          </p>
          <a href="#portfolio" className="ca-primary-link">
            Explore the work <ArrowDown size={18} aria-hidden="true" />
          </a>
        </div>
      </div>
      <div id="ca-biography" className="ca-biography">
        <div className="ca-portrait">
          <ResponsiveImage
            src={profile.photo}
            alt={profile.name}
            sizes="(max-width: 700px) 85vw, 28vw"
          />
          <div className="ca-portrait-label">
            <span>Human, first.</span>
            <Emblem />
          </div>
        </div>
        <div className="ca-biography-copy">
          <p className="ca-kicker">A little context / 01</p>
          <h2>
            Technology is a tool.
            <br />
            Curiosity is the engine.
          </h2>
          <h3>{profile.about.headline}</h3>
          {profile.about.intro.split('\n\n').map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="ca-biography-links">
            <a className="ca-text-link" href={profile.about.cvLink} download>
              Download CV <Download size={16} aria-hidden="true" />
            </a>
            <div className="ca-social-links">
              {Object.entries(profile.social).map(([name, url]) => {
                const Icon = socialIcons[name] || ArrowUpRight
                return (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={socialLabels[name] || name}
                    title={socialLabels[name] || name}
                  >
                    <Icon size={18} aria-hidden="true" />
                  </a>
                )
              })}
            </div>
          </div>
        </div>
        <details className="ca-biography-more">
          <summary>
            <span>The full story, expertise & services</span>
            <Plus size={21} aria-hidden="true" />
          </summary>
          <div className="ca-story-grid">
            <div className="ca-story-prose">
              {profile.about.experience.split('\n\n').map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div>
              <h3>Areas of expertise</h3>
              <ul className="ca-expertise">
                {profile.about.skills.map((skill) => (
                  <li key={skill}>
                    <Check size={15} aria-hidden="true" />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="ca-services">
            {profile.services.map((service, index) => (
              <article key={service.title}>
                <span className="ca-kicker">
                  {number(index + 1)} / How I can help
                </span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </details>
      </div>
    </section>
  )
}

function Portfolio() {
  const { portfolio, contract, version } = useAsif()
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [layout, setLayout] = useState('gallery')
  const navigate = useNavigate()
  const filtered = filterPortfolio(portfolio, category, query)
  const visible =
    showAll || category !== 'all' || query.trim()
      ? filtered
      : filtered.slice(0, 6)
  return (
    <section
      id="portfolio"
      className="ca-section ca-portfolio"
      aria-labelledby="ca-portfolio-title"
    >
      <ChapterHeading
        id="portfolio"
        eyebrow="Proof, not just possibilities"
        aside={
          <>
            <strong>{number(portfolio.length)}</strong>
            <span>projects & experiments</span>
          </>
        }
      >
        Ideas, made real.
      </ChapterHeading>
      <div className="ca-portfolio-toolbar">
        <div
          role="group"
          aria-label="Portfolio categories"
          className="ca-categories"
        >
          {contract.categories.map((item) => (
            <button
              key={item}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <div
          className="ca-project-layout"
          role="group"
          aria-label="Project layout"
        >
          <button
            className="ca-icon-button"
            aria-label="Gallery view"
            aria-pressed={layout === 'gallery'}
            onClick={() => setLayout('gallery')}
          >
            <LayoutGrid size={18} aria-hidden="true" />
          </button>
          <button
            className="ca-icon-button"
            aria-label="Index view"
            aria-pressed={layout === 'index'}
            onClick={() => setLayout('index')}
          >
            <List size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="ca-archive-caption">
        <p role="status">
          {visible.length} of {filtered.length}{' '}
          {category === 'all' ? 'projects' : `${category} entries`}
        </p>
        <label>
          <Search size={15} aria-hidden="true" />
          <input
            aria-label="Filter projects"
            placeholder="Find an idea..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <div className="ca-projects" data-view={layout}>
        {visible.map((item) => (
          <article
            data-project={item.slug}
            key={item.slug}
            className="ca-project"
          >
            <Link
              to={detailPath(version, 'project', item.slug)}
              aria-label={item.title}
            >
              <div className="ca-project-image">
                <ResponsiveImage
                  src={item.image}
                  alt=""
                  sizes="(max-width: 650px) 90vw, (max-width: 1000px) 48vw, 60vw"
                />
                <span className="ca-project-open" aria-hidden="true">
                  <ArrowUpRight size={24} />
                </span>
              </div>
              <div className="ca-project-info">
                <div className="ca-project-meta">
                  <span>{item.category}</span>
                  <span>{formatDate(item.date)}</span>
                </div>
                <h3>{item.title}</h3>
              </div>
              <ArrowUpRight
                className="ca-index-arrow"
                size={22}
                aria-hidden="true"
              />
            </Link>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="ca-empty">
          No projects match that combination. Try another word or category.
        </p>
      )}
      {visible.length < filtered.length && (
        <button
          className="ca-show-all"
          data-action="show-all-projects"
          onClick={() => setShowAll(true)}
        >
          Open the whole collection{' '}
          <span>
            {portfolio.length} projects <Plus size={18} aria-hidden="true" />
          </span>
        </button>
      )}
      <div className="ca-detour">
        <Emblem />
        <p>
          Good things happen
          <br />
          <strong>when you follow a tangent.</strong>
        </p>
        <button
          onClick={() =>
            navigate(
              detailPath(
                version,
                'project',
                portfolio[Math.floor(Math.random() * portfolio.length)].slug,
              ),
            )
          }
        >
          Take a detour <Shuffle size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

function SkillSet({ title, skills }) {
  return (
    <div className="ca-skill-set">
      <h3>{title}</h3>
      {skills.map((skill) => (
        <div className="ca-skill" key={skill.name}>
          <div>
            <span>{skill.name}</span>
            <span>{skill.value}%</span>
          </div>
          <meter min="0" max="100" value={skill.value} aria-label={skill.name}>
            {skill.value}%
          </meter>
        </div>
      ))}
    </div>
  )
}

function Resume() {
  const { profile } = useAsif()
  return (
    <section
      id="resume"
      className="ca-section ca-resume"
      aria-labelledby="ca-resume-title"
    >
      <ChapterHeading
        id="resume"
        eyebrow="The route so far"
        aside={
          <>
            <span>Building, learning, evolving</span>
            <strong className="ca-since">
              Since {profile.resume.startYear}
            </strong>
          </>
        }
      >
        Never a straight line.
      </ChapterHeading>
      <div className="ca-resume-layout">
        <div className="ca-timeline">
          <h3 className="ca-kicker">Experience</h3>
          {profile.resume.experience.map((entry, index) => (
            <details
              className="ca-career-entry"
              key={`${entry.company}-${entry.period}`}
              open={index === 0}
            >
              <summary>
                <img
                  src={entry.logo}
                  alt={`${entry.company} logo`}
                  loading="lazy"
                />
                <span>
                  <span className="ca-kicker">{entry.period}</span>
                  <strong>{entry.company}</strong>
                  <span className="ca-career-title">{entry.title}</span>
                </span>
                <Plus size={19} aria-hidden="true" />
              </summary>
              <p>{entry.description}</p>
            </details>
          ))}
          <h3 className="ca-kicker ca-education-label">Education</h3>
          {profile.resume.education.map((entry) => (
            <article
              className="ca-education"
              key={`${entry.company}-${entry.period}`}
            >
              <img
                src={entry.logo}
                alt={`${entry.company} logo`}
                loading="lazy"
              />
              <div>
                <p className="ca-kicker">{entry.period}</p>
                <h4>{entry.company}</h4>
                <strong>{entry.title}</strong>
                <p>{entry.description}</p>
              </div>
            </article>
          ))}
        </div>
        <aside className="ca-toolbox">
          <p className="ca-kicker">Tools for the journey</p>
          <h3>
            A versatile
            <br />
            toolkit.
          </h3>
          <SkillSet
            title="Architecture & delivery"
            skills={profile.resume.functionalSkills}
          />
          <SkillSet
            title="Languages & code"
            skills={profile.resume.codingSkills}
          />
          <p className="ca-toolbox-note">
            Different disciplines.
            <br />
            Better connections.
          </p>
        </aside>
      </div>
    </section>
  )
}

function Journal() {
  const { blog, version } = useAsif()
  return (
    <section
      id="blog"
      className="ca-section ca-journal"
      aria-labelledby="ca-blog-title"
    >
      <ChapterHeading
        id="blog"
        eyebrow="Notes from along the way"
        aside={
          <span>
            Sometimes, the most useful
            <br />
            thing to build is a perspective.
          </span>
        }
      >
        A moment to reflect.
      </ChapterHeading>
      <div className="ca-articles">
        {blog.map((post, index) => (
          <article data-article={post.slug} key={post.slug}>
            <Link to={detailPath(version, 'blog', post.slug)}>
              <div className="ca-article-image">
                <ResponsiveImage
                  src={post.image}
                  alt=""
                  sizes="(max-width: 700px) 90vw, 45vw"
                />
                <span>{number(index + 1)}</span>
              </div>
              <p className="ca-kicker">
                {post.category} / {post.date}
              </p>
              <h3>{post.title}</h3>
              <span className="ca-text-link">
                Read the full story{' '}
                <ArrowUpRight size={18} aria-hidden="true" />
              </span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}

function Contact() {
  const { profile, version } = useAsif()
  const { status, submit } = useContactForm(profile.contact.endpoint)
  const sending = status.type === 'sending'
  return (
    <section
      id="contact"
      className="ca-section ca-contact"
      aria-labelledby="ca-contact-title"
    >
      <ChapterHeading id="contact" eyebrow="Every good thing starts somewhere">
        What if we
        <br />
        made it happen?
      </ChapterHeading>
      <div className="ca-contact-layout">
        <div className="ca-contact-details">
          <Emblem className="ca-contact-emblem" />
          <p className="ca-contact-intro">
            An idea, a collaboration,
            <br />
            or just a good conversation.
          </p>
          <div className="ca-contact-values">
            {profile.contact.info.map((info) =>
              info.link ? (
                <a key={info.value} href={info.link}>
                  {info.value}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              ) : (
                <p key={info.value}>
                  <span className="ca-status-dot" aria-hidden="true" />
                  {info.value}
                </p>
              ),
            )}
          </div>
          <details className="ca-map">
            <summary>
              Find me on the map <Plus size={17} aria-hidden="true" />
            </summary>
            <iframe
              src={profile.contact.mapUrl}
              title="Location map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </details>
        </div>
        <form
          className="ca-contact-form"
          aria-label="Contact form"
          onSubmit={submit}
        >
          <p className="ca-kicker">A note to {profile.name.split(' ')[0]}</p>
          <div className="ca-form-pair">
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                disabled={sending}
                placeholder="Your name"
              />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={sending}
                placeholder="you@somewhere.com"
              />
            </label>
          </div>
          <label>
            Subject
            <input
              name="subject"
              required
              disabled={sending}
              placeholder="What's the big idea?"
            />
          </label>
          <label>
            Message
            <textarea
              name="message"
              rows="4"
              required
              disabled={sending}
              placeholder="I'd love to hear it."
            />
          </label>
          <input
            type="text"
            name="_honey"
            className="sr-only"
            tabIndex="-1"
            autoComplete="off"
            aria-hidden="true"
          />
          <button type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Send message'}
            {sending ? (
              <LoaderCircle
                className="loading-spinner"
                size={19}
                aria-hidden="true"
              />
            ) : (
              <Send size={19} aria-hidden="true" />
            )}
          </button>
          <p
            className="ca-contact-status"
            role={status.type === 'error' ? 'alert' : 'status'}
          >
            {status.message}
          </p>
        </form>
      </div>
      <footer className="ca-footer">
        <span>{profile.copyright}</span>
        <span>
          Always a work in progress. <Emblem />
        </span>
        <span>{version.model} / The Curiosity Atlas</span>
      </footer>
    </section>
  )
}

export default function Theme() {
  const { openSearch } = useAsif()
  const active = useActiveChapter()
  const reducedMotion = useMotionPreference()
  const [paused, setPaused] = useState(false)
  const search = useRef(openSearch)
  search.current = openSearch
  useEffect(() => {
    const keydown = (event) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey))
        return
      if (document.querySelector('dialog[open]')) return
      event.preventDefault()
      search.current()
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])
  return (
    <div
      className="ca-atlas"
      data-motion={reducedMotion ? 'reduced' : paused ? 'paused' : 'running'}
    >
      <a href="#ca-main" className="skip-link">
        Skip to content
      </a>
      <main id="ca-main" tabIndex="-1">
        <About
          reducedMotion={reducedMotion}
          paused={paused}
          setPaused={setPaused}
        />
        <Portfolio />
        <section
          id="music"
          className="ca-section ca-music"
          aria-labelledby="ca-music-title"
        >
          <ChapterHeading
            id="music"
            eyebrow="Less screen time. More feeling."
            aside={
              <AudioLines size={46} strokeWidth={1.2} aria-hidden="true" />
            }
          >
            The listening room.
          </ChapterHeading>
          <ListeningRoom />
        </section>
        <Resume />
        <Journal />
        <Contact />
      </main>
      <Navigation active={active} />
    </div>
  )
}
