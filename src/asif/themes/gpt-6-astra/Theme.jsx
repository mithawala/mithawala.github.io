import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Download,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  Github,
  Linkedin,
  Youtube,
  Instagram,
  Cloud,
  GraduationCap,
  Code2,
  Dumbbell,
} from 'lucide-react'
import { useAsif } from '../../core.jsx'
import { detailPath, filterPortfolio, formatDate } from '../../content.mjs'
import { ContactForm, ImageLightbox } from '../../features.jsx'
import MusicPlayer from '../../MusicPlayer.jsx'
import './theme.css'

const socialIcons = {
  github: Github,
  linkedin: Linkedin,
  youtube: Youtube,
  instagram: Instagram,
}
const serviceIcons = [Cloud, GraduationCap, Code2, Dumbbell]

function SectionHeading({ number, title, subtitle }) {
  return (
    <div className="astra-section-heading">
      <span className="astra-section-number">{number}</span>
      <h2>{title}</h2>
      {subtitle && <span className="astra-section-aside">{subtitle}</span>}
    </div>
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('about')
  const [role, setRole] = useState(0)
  const [category, setCategory] = useState('all')
  const [showAll, setShowAll] = useState(false)
  const [musicImageOpen, setMusicImageOpen] = useState(false)
  const records = filterPortfolio(portfolio, category)
  const visible = showAll ? records : records.slice(0, 6)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(
      () => setRole((current) => (current + 1) % profile.roles.length),
      4200,
    )
    return () => clearInterval(timer)
  }, [profile.roles.length])
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        }),
      { rootMargin: '-15% 0px -65% 0px' },
    )
    contract.sections.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [contract])
  useEffect(() => {
    const close = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="astra-nav">
        <a
          href={version.path}
          className="astra-monogram"
          aria-label={`${profile.name} home`}
        >
          a<span>m</span>
        </a>
        <nav aria-label="Main navigation" className={menuOpen ? 'is-open' : ''}>
          {contract.sections.map((section) => (
            <a
              key={section.id}
              href={`${version.path}#${section.id}`}
              aria-current={active === section.id ? 'location' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {section.label}
            </a>
          ))}
        </nav>
        <div className="astra-nav-tools">
          <button
            className="icon-button"
            onClick={openSearch}
            aria-label="Search"
            title="Search"
          >
            <Search size={19} />
          </button>
          <button
            className="icon-button"
            onClick={() => setAppearance(mode === 'light' ? 'dark' : 'light')}
            aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
          >
            {mode === 'light' ? <Moon size={19} /> : <Sun size={19} />}
          </button>
          <button
            className="icon-button astra-menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
      <main id="main-content">
        <section className="astra-hero" aria-labelledby="hero-title">
          <div className="astra-hero-top">
            <span>A personal index of work & life</span>
            <Link to="/">
              The {version.model} edition <ArrowUpRight size={14} />
            </Link>
          </div>
          <h1 id="hero-title">
            <span className="astra-first-name">
              {profile.name.split(' ')[0]}
            </span>{' '}
            {profile.name.split(' ').slice(1).join(' ')}
            <span className="astra-period">.</span>
          </h1>
          <div className="astra-hero-body">
            <div className="astra-hero-copy">
              <h2>
                Serious about tech.
                <br />
                <em>Curious about everything.</em>
              </h2>
              <p>{profile.about.headline}</p>
              <a href="#portfolio" className="astra-hero-action">
                Discover the work{' '}
                <span>
                  <ArrowDown size={20} />
                </span>
              </a>
            </div>
            <div className="astra-signal" aria-hidden="true">
              <svg viewBox="0 0 200 200" fill="none">
                {[0, 30, 60, 90, 120, 150].map((angle) => (
                  <rect
                    key={angle}
                    x="89"
                    y="6"
                    width="22"
                    height="188"
                    rx="11"
                    fill="currentColor"
                    transform={`rotate(${angle} 100 100)`}
                  />
                ))}
              </svg>
              <span>Always in the making</span>
            </div>
            <figure className="astra-portrait">
              <div className="astra-portrait-frame">
                <img
                  src={profile.heroPhoto}
                  alt={profile.name}
                  fetchPriority="high"
                />
                <span className="astra-photo-mark" aria-hidden="true">
                  AM / 01
                </span>
              </div>
              <figcaption>
                <span className="astra-status-dot" />
                <span className="astra-role" key={role}>
                  {profile.roles[role]}
                </span>
              </figcaption>
            </figure>
          </div>
        </section>
        <div className="astra-current">
          <span className="astra-current-label">Currently at</span>
          <span>{profile.resume.experience[0].company}</span>
          <span className="astra-current-role">
            {profile.resume.experience[0].title}
          </span>
          <a href="#contact">
            Let&apos;s connect <ArrowUpRight size={17} />
          </a>
        </div>

        <section id="portfolio" className="astra-section astra-work">
          <SectionHeading
            number="01"
            title="Selected work."
            subtitle={`${portfolio.length} projects. One restless curiosity.`}
          />
          <div
            className="astra-filters"
            role="group"
            aria-label="Portfolio categories"
          >
            {contract.categories.map((entry) => (
              <button
                key={entry}
                aria-pressed={category === entry}
                onClick={() => {
                  setCategory(entry)
                  setShowAll(false)
                }}
              >
                {entry === 'all'
                  ? 'All work'
                  : entry[0].toUpperCase() + entry.slice(1)}
              </button>
            ))}
          </div>
          <div className="astra-projects">
            {visible.map((item, index) => (
              <article
                className="astra-project"
                key={item.id}
                data-project={item.slug}
              >
                <Link
                  to={detailPath(version, 'project', item.slug)}
                  className="astra-project-image"
                >
                  <img src={item.image} alt={item.title} loading="lazy" />
                  <span className="astra-project-index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="astra-project-arrow">
                    <ArrowUpRight size={25} />
                  </span>
                </Link>
                <div className="astra-project-meta">
                  <span>{item.category}</span>
                  <time dateTime={item.date}>{formatDate(item.date)}</time>
                </div>
                <h3>
                  <Link to={detailPath(version, 'project', item.slug)}>
                    {item.title}
                  </Link>
                </h3>
              </article>
            ))}
          </div>
          {records.length === 0 && (
            <p className="astra-empty">No work in this category yet.</p>
          )}
          {records.length > 6 && (
            <button
              className="astra-text-button astra-more"
              data-action="show-all-projects"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show less' : `View all ${records.length} works`}{' '}
              {showAll ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
            </button>
          )}
        </section>

        <section id="about" className="astra-section astra-about">
          <SectionHeading
            number="02"
            title="The human behind it."
            subtitle="Beyond the job title"
          />
          <div className="astra-about-grid">
            <div className="astra-about-photo">
              <img src={profile.photo} alt={profile.name} loading="lazy" />
              <div className="astra-socials">
                {Object.entries(profile.social).map(([name, url]) => {
                  const Icon = socialIcons[name]
                  return (
                    <a
                      href={url}
                      key={name}
                      target="_blank"
                      rel="noreferrer"
                      title={name}
                      aria-label={name}
                    >
                      <Icon size={21} />
                    </a>
                  )
                })}
              </div>
              <a
                className="astra-download"
                href={profile.about.cvLink}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={17} /> Download CV <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="astra-about-copy">
              <h3>{profile.about.headline}</h3>
              {profile.about.intro.split('\n\n').map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <details className="astra-bio-details">
                <summary>
                  More about my background <span>+</span>
                </summary>
                {profile.about.experience.split('\n\n').map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </details>
              <h4>Technical expertise</h4>
              <ul className="astra-expertise">
                {profile.about.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
              <a
                className="astra-text-button"
                href={`mailto:${profile.about.email}`}
              >
                Get in touch <ArrowUpRight size={19} />
              </a>
            </div>
          </div>
          <div className="astra-services-heading">
            <h3>What I do</h3>
            <span>Technology. Creativity. Momentum.</span>
          </div>
          <div className="astra-services">
            {profile.services.map((service, index) => {
              const Icon = serviceIcons[index]
              return (
                <article key={service.title}>
                  <Icon size={29} strokeWidth={1.4} />
                  <h4>{service.title}</h4>
                  <p>{service.description}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section id="resume" className="astra-section astra-resume">
          <SectionHeading
            number="03"
            title="Never standing still."
            subtitle={`${new Date().getFullYear() - profile.resume.startYear} years of experience`}
          />
          <div className="astra-resume-grid">
            <div>
              <h3 className="astra-small-heading">Experience</h3>
              <div className="astra-timeline">
                {profile.resume.experience.map((job) => (
                  <details
                    key={`${job.company}-${job.period}`}
                    className="astra-job"
                    open={job === profile.resume.experience[0]}
                  >
                    <summary>
                      <img src={job.logo} alt={job.company} loading="lazy" />
                      <span>
                        <small>{job.period}</small>
                        <h4>{job.title}</h4>
                        <span>{job.company}</span>
                      </span>
                      <span className="astra-expand">+</span>
                    </summary>
                    <p className="preserve-lines">{job.description}</p>
                  </details>
                ))}
              </div>
            </div>
            <aside>
              <h3 className="astra-small-heading">Education</h3>
              {profile.resume.education.map((education) => (
                <article className="astra-education" key={education.company}>
                  <div>
                    <img
                      src={education.logo}
                      alt={education.company}
                      loading="lazy"
                    />
                    <span>{education.period}</span>
                  </div>
                  <h4>{education.title}</h4>
                  <p>{education.company}</p>
                  <p className="astra-education-description">
                    {education.description}
                  </p>
                </article>
              ))}
              {[
                ['Functional', profile.resume.functionalSkills],
                ['Coding skills', profile.resume.codingSkills],
              ].map(([label, skills]) => (
                <div className="astra-skills" key={label}>
                  <h3 className="astra-small-heading">{label}</h3>
                  {skills.map((skill) => (
                    <div className="astra-skill" key={skill.name}>
                      <div>
                        <span>{skill.name}</span>
                        <span>{skill.value}%</span>
                      </div>
                      <meter
                        min="0"
                        max="100"
                        value={skill.value}
                        aria-label={skill.name}
                      >
                        {skill.value}%
                      </meter>
                    </div>
                  ))}
                </div>
              ))}
            </aside>
          </div>
        </section>

        <section id="blog" className="astra-section astra-blog">
          <SectionHeading
            number="04"
            title="From the notebook."
            subtitle="Writing & reflections"
          />
          <div className="astra-articles">
            {blog.map((post) => (
              <article key={post.slug} data-article={post.slug}>
                <Link
                  to={detailPath(version, 'blog', post.slug)}
                  className="astra-article-image"
                >
                  <img src={post.image} alt={post.title} loading="lazy" />
                </Link>
                <div>
                  <span className="eyebrow">
                    {post.category} / {post.date}
                  </span>
                  <h3>
                    <Link to={detailPath(version, 'blog', post.slug)}>
                      {post.title}
                    </Link>
                  </h3>
                  <Link
                    className="astra-text-button"
                    to={detailPath(version, 'blog', post.slug)}
                  >
                    Read article <ArrowUpRight size={19} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="music" className="astra-section astra-music">
          <SectionHeading
            number="05"
            title="Off the clock. On record."
            subtitle="Original music"
          />
          <div className="astra-music-intro">
            <p>{profile.music.intro}</p>
            <a
              className="astra-text-button"
              href={profile.music.spotifyUrl}
              target="_blank"
              rel="noreferrer"
            >
              Follow me on Spotify <ArrowUpRight size={18} />
            </a>
          </div>
          <button
            className="music-banner-button"
            aria-label="Enlarge music artwork"
            onClick={() => setMusicImageOpen(true)}
          >
            <img
              className="astra-music-banner"
              src={profile.music.image}
              alt="Music"
              loading="lazy"
            />
          </button>
          <MusicPlayer music={profile.music} artist={profile.name} />
          {musicImageOpen && (
            <ImageLightbox
              images={[profile.music.image]}
              title="Music"
              onClose={() => setMusicImageOpen(false)}
            />
          )}
        </section>

        <section id="contact" className="astra-section astra-contact">
          <SectionHeading
            number="06"
            title="Let's make something matter."
            subtitle="A conversation is a good start."
          />
          <div className="astra-contact-grid">
            <div>
              <a className="astra-email" href={`mailto:${profile.about.email}`}>
                {profile.about.email}
                <ArrowUpRight size={27} />
              </a>
              <div className="astra-contact-info">
                {profile.contact.info.map((info) =>
                  info.link ? (
                    <a href={info.link} key={info.value}>
                      {info.value}
                    </a>
                  ) : (
                    <span key={info.value}>{info.value}</span>
                  ),
                )}
              </div>
              <iframe
                title="Location Map"
                src={profile.contact.mapUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <ContactForm endpoint={profile.contact.endpoint} />
          </div>
        </section>
      </main>
      <footer className="astra-footer">
        <div>
          <a className="astra-monogram" href={version.path}>
            am<span>.</span>
          </a>
          <p>{profile.copyright}</p>
        </div>
        <Link to="/">
          All editions <ArrowUpRight size={16} />
        </Link>
        <a
          href="#main-content"
          className="icon-button"
          aria-label="Back to top"
          title="Back to top"
        >
          <ArrowUp size={19} />
        </a>
      </footer>
    </>
  )
}
