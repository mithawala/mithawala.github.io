import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Mail,
  MapPin,
  Phone,
  CircleCheck,
  Maximize2,
} from 'lucide-react'
import { detailPath } from '../../content.mjs'
import { ContactForm, ImageLightbox, ResponsiveImage } from '../../features.jsx'
import MusicPlayer from '../../MusicPlayer.jsx'

const CONTACT_ICONS = [
  ['phone-handset', Phone],
  ['map-marker', MapPin],
  ['envelope', Mail],
  ['checkmark-circle', CircleCheck],
]

const strip = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/\s+/g, ' ')
    .trim()

export function Writing({ blog, version }) {
  return (
    <section className="o5-section o5-plate o5-pad" id="blog">
      <div className="o5-frame">
        <header className="o5-head">
          <p className="o5-rule o5-mono">
            <span>§ 04 — Writing</span>
            <span className="o5-num">{blog.length} pieces</span>
          </p>
          <h2>Longer thoughts, written down.</h2>
        </header>
        <ul className="o5-articles">
          {blog.map((post, index) => (
            <li key={post.slug} data-article={post.slug}>
              <Link to={detailPath(version, 'blog', post.slug)}>
                <span className="o5-article-figure">
                  <ResponsiveImage
                    src={post.image}
                    alt={post.title}
                    sizes="(max-width: 900px) 90vw, 44vw"
                  />
                </span>
                <span className="o5-article-body">
                  <span className="o5-mono o5-dim">
                    0{index + 1} · {post.category} · {post.date}
                  </span>
                  <span className="o5-article-title">{post.title}</span>
                  <span className="o5-article-excerpt">
                    {strip(post.content).slice(0, 190)}…
                  </span>
                  <span className="o5-article-go o5-mono">
                    Read it <ArrowUpRight size={15} aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Music({ profile, onPlaybackChange }) {
  const [lightbox, setLightbox] = useState(false)
  return (
    <section className="o5-section o5-plate o5-pad o5-music" id="music">
      <div className="o5-frame o5-music-grid">
        <header className="o5-head">
          <p className="o5-rule o5-mono">
            <span>§ 05 — Sound</span>
            <span className="o5-mono">SoundCloud</span>
          </p>
          <h2>He also makes music.</h2>
          <p>{profile.music.intro}</p>
          <div className="o5-music-actions">
            <a
              className="o5-button"
              href={profile.music.spotifyUrl}
              target="_blank"
              rel="noreferrer"
            >
              Follow on Spotify <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <button
              className="o5-button"
              onClick={() => setLightbox(true)}
              aria-label="Enlarge music artwork"
            >
              <Maximize2 size={15} aria-hidden="true" /> Artwork
            </button>
          </div>
        </header>
        <figure className="o5-music-art">
          <ResponsiveImage
            src={profile.music.image}
            alt={`Cover artwork for ${profile.name}'s music`}
            sizes="(max-width: 900px) 90vw, 38vw"
          />
        </figure>
        <div className="o5-music-player">
          <MusicPlayer
            music={profile.music}
            artist={profile.name}
            onPlaybackChange={onPlaybackChange}
          />
        </div>
      </div>
      {lightbox && (
        <ImageLightbox
          images={[profile.music.image]}
          title="Music"
          onClose={() => setLightbox(false)}
        />
      )}
    </section>
  )
}

export function Contact({ profile }) {
  return (
    <section className="o5-section o5-plate o5-pad" id="contact">
      <div className="o5-frame o5-contact">
        <header className="o5-head">
          <p className="o5-rule o5-mono">
            <span>§ 06 — Contact</span>
            <span className="o5-mono">Open for work</span>
          </p>
          <h2>Tell him what you are building.</h2>
        </header>

        <div className="o5-contact-details">
          <a className="o5-contact-mail" href={`mailto:${profile.about.email}`}>
            {profile.about.email}
          </a>
          <dl>
            {profile.contact.info.map((entry) => {
              const Icon =
                CONTACT_ICONS.find(([key]) => entry.icon.includes(key))?.[1] ||
                CircleCheck
              return (
                <div key={entry.value}>
                  <dt>
                    <Icon size={15} aria-hidden="true" />
                    <span className="sr-only">Contact detail</span>
                  </dt>
                  <dd>
                    {entry.link ? (
                      <a href={entry.link}>{entry.value}</a>
                    ) : (
                      entry.value
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
          <div className="o5-map">
            <iframe
              src={profile.contact.mapUrl}
              title="Location Map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <div className="o5-contact-form">
          <ContactForm endpoint={profile.contact.endpoint} />
        </div>
      </div>
    </section>
  )
}
