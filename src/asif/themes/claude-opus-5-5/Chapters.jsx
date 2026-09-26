import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Download,
  Github,
  Linkedin,
  Youtube,
  Instagram,
  Mail,
  Phone,
  MapPin,
  CircleCheck,
} from 'lucide-react'
import { detailPath } from '../../content.mjs'
import { ContactForm, ImageLightbox, ResponsiveImage } from '../../features.jsx'
import MusicPlayer from '../../MusicPlayer.jsx'

const SOCIAL = {
  linkedin: [Linkedin, 'LinkedIn'],
  github: [Github, 'GitHub'],
  youtube: [Youtube, 'YouTube'],
  instagram: [Instagram, 'Instagram'],
}
const CONTACT = [
  ['phone', 'Phone', Phone],
  ['map', 'Based in', MapPin],
  ['envelope', 'Email', Mail],
  ['check', 'Availability', CircleCheck],
]

// An eight-point jali star, the edition's recurring ornament.
export function Star({ className = '' }) {
  return (
    <svg
      className={`op-star ${className}`}
      viewBox="-1 -1 2 2"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1 0 L0.354 0.146 L0.354 0.354 L0.146 0.354 L0 1 L-0.146 0.354 L-0.354 0.354 L-0.354 0.146 L-1 0 L-0.354 -0.146 L-0.354 -0.354 L-0.146 -0.354 L0 -1 L0.146 -0.354 L0.354 -0.354 L0.354 -0.146 Z" />
    </svg>
  )
}

const paragraphs = (text) => text.split('\n\n').filter(Boolean)

function lightFollow(event) {
  if (event.pointerType === 'touch') return
  const bounds = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty(
    '--light-x',
    `${event.clientX - bounds.left}px`,
  )
  event.currentTarget.style.setProperty(
    '--light-y',
    `${event.clientY - bounds.top}px`,
  )
}

export function About({ profile }) {
  const [lead, ...intro] = paragraphs(profile.about.intro)
  return (
    <section
      id="about"
      className="op-section op-about"
      tabIndex={-1}
      aria-labelledby="op-about-title"
    >
      <div className="op-about-grid">
        <figure className="op-about-portrait">
          <ResponsiveImage
            src={profile.photo}
            alt={profile.name}
            sizes="(max-width: 700px) 86vw, 32vw"
          />
        </figure>
        <div className="op-about-text">
          <h2 id="op-about-title">About</h2>
          <p className="op-lead">{lead}</p>
          {intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {paragraphs(profile.about.experience).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="op-roles-list">
            <h3 className="op-subhead">Roles</h3>
            <ul>
              {profile.roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </div>
          <div className="op-about-links">
            <a
              className="op-button op-button-solid"
              href={profile.about.cvLink}
              target="_blank"
              rel="noreferrer"
            >
              <Download size={18} aria-hidden="true" /> Download CV
            </a>
            <ul className="op-social" aria-label="Social profiles">
              {Object.entries(profile.social).map(([name, url]) => {
                const [Icon, title] = SOCIAL[name] || [ArrowUpRight, name]
                return (
                  <li key={name}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={title}
                      title={title}
                    >
                      <Icon size={19} aria-hidden="true" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="op-expertise-block">
        <h3 className="op-subhead">Expertise</h3>
        <ul
          className="op-expertise"
          onPointerMove={lightFollow}
          onPointerLeave={(event) => {
            event.currentTarget.style.removeProperty('--light-x')
            event.currentTarget.style.removeProperty('--light-y')
          }}
        >
          {profile.about.skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      </div>

      <div className="op-services-block">
        <h3 className="op-subhead">Services</h3>
        <ul className="op-services">
          {profile.services.map((service) => (
            <li key={service.title}>
              <Star />
              <h4>{service.title}</h4>
              <p>{service.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Writing({ blog, version }) {
  return (
    <section
      id="blog"
      className="op-section op-writing"
      tabIndex={-1}
      aria-labelledby="op-writing-title"
    >
      <header className="op-section-head">
        <h2 id="op-writing-title">Writing</h2>
        <p>
          Reflections on work, growth, and the culture people make together.
        </p>
      </header>
      <div className="op-articles">
        {blog.map((post) => (
          <article
            className="op-article"
            key={post.slug}
            data-article={post.slug}
          >
            <Link to={detailPath(version, 'blog', post.slug)}>
              <span className="op-article-cover">
                <ResponsiveImage
                  src={post.image}
                  alt=""
                  sizes="(max-width: 700px) 86vw, 34vw"
                />
              </span>
              <span className="op-article-meta">
                <span>{post.category}</span>
                <span>{post.date}</span>
              </span>
              <h3>{post.title}</h3>
              <span className="op-text-link">
                Read the article <ArrowUpRight size={17} aria-hidden="true" />
              </span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}

export function Music({ profile, onPlaybackChange, playing }) {
  const [artwork, setArtwork] = useState(false)
  return (
    <section
      id="music"
      className="op-section op-music"
      tabIndex={-1}
      aria-labelledby="op-music-title"
      data-playing={playing || undefined}
    >
      <div className="op-music-grid">
        <button
          className="op-music-art"
          aria-label="Enlarge music artwork"
          onClick={() => setArtwork(true)}
        >
          <ResponsiveImage
            src={profile.music.image}
            alt=""
            sizes="(max-width: 700px) 86vw, 38vw"
          />
          <span className="op-music-glow" />
        </button>
        <div className="op-music-text">
          <h2 id="op-music-title">Music</h2>
          <p className="op-lead">{profile.music.intro}</p>
          <a
            className="op-button"
            href={profile.music.spotifyUrl}
            target="_blank"
            rel="noreferrer"
          >
            Follow on Spotify <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
      <MusicPlayer
        music={profile.music}
        artist={profile.name}
        onPlaybackChange={onPlaybackChange}
      />
      {artwork && (
        <ImageLightbox
          images={[profile.music.image]}
          title="Music"
          onClose={() => setArtwork(false)}
        />
      )}
    </section>
  )
}

export function Contact({ profile }) {
  return (
    <section
      id="contact"
      className="op-section op-contact"
      tabIndex={-1}
      aria-labelledby="op-contact-title"
    >
      <header className="op-section-head">
        <h2 id="op-contact-title">Contact</h2>
        <p>Write, call, or send a note below. The light stays on.</p>
      </header>
      <div className="op-contact-grid">
        <div className="op-contact-details">
          <a
            className="op-contact-email"
            href={`mailto:${profile.about.email}`}
          >
            {profile.about.email}
            <ArrowUpRight size={24} aria-hidden="true" />
          </a>
          <dl className="op-contact-list">
            {profile.contact.info.map((info) => {
              const [, label, Icon] = CONTACT.find(([key]) =>
                info.icon.includes(key),
              ) || [null, 'Detail', ArrowUpRight]
              return (
                <div key={info.value}>
                  <dt>
                    <Icon size={16} aria-hidden="true" /> {label}
                  </dt>
                  <dd>
                    {info.link ? (
                      <a href={info.link}>{info.value}</a>
                    ) : (
                      info.value
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
          <iframe
            className="op-map"
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
  )
}
