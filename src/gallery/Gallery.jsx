import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Github, Monitor, Smartphone } from 'lucide-react'
import { versions } from '../versions.mjs'
import { profile } from '../asif/content.mjs'
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
        <span className="gallery-nav-label">THE EDITIONS</span>
        <a href="https://mithawala.com" target="_blank" rel="noreferrer">
          mithawala.com <ArrowUpRight size={17} />
        </a>
      </header>
      <main id="editions">
        <section className="gallery-intro">
          <div className="gallery-index">
            AN EXPERIMENT IN PERSPECTIVE{' '}
            <span>
              {String(versions.length).padStart(2, '0')} EDITION
              {versions.length === 1 ? '' : 'S'} & COUNTING
            </span>
          </div>
          <h1>
            <span className="gallery-owner">{profile.name}</span>
            One person.
            <br />
            <em>Many perspectives.</em>
          </h1>
          <div className="gallery-intro-bottom">
            <p>
              The same story, told through different eyes.
              <br />
              <strong>Each frontier model gets a blank canvas.</strong>
            </p>
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
              </button>
              <button
                title="Mobile preview"
                aria-label="Mobile preview"
                aria-pressed={viewport === 'mobile'}
                onClick={() => setViewport('mobile')}
              >
                <Smartphone size={20} />
              </button>
            </div>
          </div>
        </section>
        <div className="edition-list">
          {versions.map((version, index) => (
            <article className="edition" key={version.id}>
              <Link
                className={`edition-preview ${viewport}`}
                to={version.path}
                aria-label={`Explore ${version.model}`}
                style={{ '--edition-accent': version.color }}
              >
                <div className="edition-browser-bar">
                  <span className="browser-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>asif / {version.id}</span>
                  <ArrowUpRight size={16} />
                </div>
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
                <span className="edition-open">
                  <ArrowUpRight size={28} />
                </span>
              </Link>
              <div className="edition-caption">
                <span className="edition-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2>
                  <Link to={version.path}>{version.model}</Link>
                </h2>
                <span className="edition-caption-note">
                  One model. Its own point of view.
                </span>
                <Link
                  to={version.path}
                  className="edition-visit"
                  aria-label={`Visit ${version.model}`}
                >
                  <ArrowUpRight size={24} />
                </Link>
              </div>
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
