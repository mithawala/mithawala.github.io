import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Github, Monitor, Smartphone } from 'lucide-react'
import { versions } from '../versions.mjs'
import { profile, formatDate } from '../asif/content.mjs'
import './gallery.css'

export default function Gallery() {
  const [viewport, setViewport] = useState('desktop')
  return (
    <div className="editions-gallery">
      <a href="#editions" className="skip-link">
        Skip to editions
      </a>
      <header className="gallery-nav">
        <Link to="/" aria-label="Gallery home" className="gallery-wordmark">
          am<span>.</span>
        </Link>
        <span className="gallery-nav-label">The editions</span>
        <a href="https://mithawala.com" target="_blank" rel="noreferrer">
          mithawala.com <ArrowUpRight size={17} />
        </a>
      </header>
      <main id="editions">
        <section className="gallery-intro">
          <div className="gallery-index">
            A personal website, reimagined.{' '}
            <span>
              {versions.length} edition{versions.length === 1 ? '' : 's'}
            </span>
          </div>
          <h1>
            <span className="gallery-owner">{profile.name}</span>
            One person.
            <br />
            New perspectives.
          </h1>
          <div className="gallery-intro-bottom">
            <p>
              Every new model starts with the same content and a blank canvas.
              Explore the different ways it sees {profile.name.split(' ')[0]}.
            </p>
          </div>
        </section>
        <div className="gallery-collection-header">
          <h2>The collection</h2>
          <div
            className="viewport-switch"
            role="group"
            aria-label="Preview viewport"
          >
            <button
              title="Desktop preview"
              aria-label="Desktop preview"
              aria-pressed={viewport === 'desktop'}
              onClick={() => setViewport('desktop')}
            >
              <Monitor size={20} />
              <span>Desktop</span>
            </button>
            <button
              title="Mobile preview"
              aria-label="Mobile preview"
              aria-pressed={viewport === 'mobile'}
              onClick={() => setViewport('mobile')}
            >
              <Smartphone size={20} />
              <span>Mobile</span>
            </button>
          </div>
        </div>
        <div className="edition-list">
          {versions.map((version, index) => (
            <article className="edition" key={version.id}>
              <div className="edition-info">
                <span className="edition-number">
                  Edition {String(index + 1).padStart(2, '0')}
                </span>
                <h2>
                  <Link to={version.path}>{version.model}</Link>
                </h2>
                <time dateTime={version.released}>
                  {formatDate(version.released, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </time>
                <Link
                  to={version.path}
                  className="edition-visit"
                  aria-label={`Visit ${version.model}`}
                >
                  Open edition <ArrowUpRight size={20} />
                </Link>
              </div>
              <Link
                className={`edition-preview ${viewport}`}
                to={version.path}
                aria-label={`Explore ${version.model}`}
              >
                <div className="edition-screenshot">
                  <img
                    src={
                      viewport === 'mobile'
                        ? version.mobilePreview
                        : version.preview
                    }
                    alt={`${version.model} personal-site preview`}
                    width={viewport === 'mobile' ? 390 : 1440}
                    height={viewport === 'mobile' ? 844 : 1000}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              </Link>
            </article>
          ))}
        </div>
      </main>
      <footer className="gallery-footer">
        <span>{profile.copyright}</span>
        <a href={profile.social.github} target="_blank" rel="noreferrer">
          <Github size={17} /> GitHub <ArrowUpRight size={15} />
        </a>
        <a href={`mailto:${profile.about.email}`}>
          Say hello <ArrowUpRight size={15} />
        </a>
      </footer>
    </div>
  )
}
