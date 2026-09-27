import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronsLeftRight,
  Columns2,
  Github,
  Layers,
  Monitor,
  Plus,
  Smartphone,
  X,
} from 'lucide-react'
import { versions } from '../versions.mjs'
import { profile, formatDate } from '../asif/content.mjs'
import Dialog from '../asif/Dialog.jsx'
import './gallery.css'

const editionNumber = (version) =>
  String(versions.findIndex((entry) => entry.id === version.id) + 1).padStart(
    2,
    '0',
  )
const previewSource = (version, viewport) =>
  viewport === 'mobile' ? version.mobilePreview : version.preview
const editionLabel = (version) =>
  `${version.model}, edition ${editionNumber(version)}`
const versionFor = (id) => {
  const version = versions.find((entry) => entry.id === id)
  if (!version) throw new Error(`Unknown gallery edition: ${id}`)
  return version
}

function ViewportSwitch({ viewport, onChange, comparison = false }) {
  return (
    <div
      className="gx-viewport-switch"
      role="group"
      aria-label={comparison ? 'Comparison viewport' : 'Preview viewport'}
    >
      {[
        ['desktop', Monitor],
        ['mobile', Smartphone],
      ].map(([type, Icon]) => (
        <button
          key={type}
          aria-label={
            comparison
              ? `Comparison ${type} preview`
              : `${type[0].toUpperCase() + type.slice(1)} preview`
          }
          aria-pressed={viewport === type}
          onClick={() => onChange(type)}
        >
          <Icon size={17} aria-hidden="true" />
          <span>{type === 'desktop' ? 'Desktop' : 'Mobile'}</span>
        </button>
      ))}
    </div>
  )
}

function PreviewImage({
  version,
  viewport,
  priority = false,
  comparison = false,
}) {
  return (
    <img
      src={previewSource(version, viewport)}
      alt={
        comparison
          ? `${editionLabel(version)}, ${viewport} comparison preview`
          : `${version.model} personal-site preview`
      }
      width={viewport === 'mobile' ? 390 : 1440}
      height={viewport === 'mobile' ? 844 : 1000}
      loading={priority || comparison ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      draggable={false}
    />
  )
}

function ComparisonDialog({
  pair,
  onPairChange,
  viewport,
  setViewport,
  onClose,
}) {
  const [layout, setLayout] = useState('side-by-side')
  const [reveal, setReveal] = useState(50)
  const pointer = useRef(null)
  const slider = useRef(null)
  const [left, right] = pair
  const choose = (side, id) => {
    const version = versionFor(id)
    onPairChange(side === 0 ? [version, right] : [left, version])
  }
  const revealAt = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    setReveal(
      Math.round(
        Math.max(
          0,
          Math.min(100, ((event.clientX - box.left) / box.width) * 100),
        ),
      ),
    )
  }
  const stopDrag = (event) => {
    if (pointer.current?.id !== event.pointerId) return
    const completed = pointer.current.locked && event.type === 'pointerup'
    pointer.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    if (completed) slider.current?.focus({ preventScroll: true })
  }
  const startDrag = (event) => {
    if (!event.isPrimary || event.button !== 0) return
    pointer.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      locked: event.pointerType !== 'touch',
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    if (pointer.current.locked) {
      event.preventDefault()
      slider.current?.focus({ preventScroll: true })
      revealAt(event)
    }
  }
  const moveDrag = (event) => {
    const current = pointer.current
    if (!current || current.id !== event.pointerId) return
    if (!current.locked) {
      const horizontal = Math.abs(event.clientX - current.x)
      const vertical = Math.abs(event.clientY - current.y)
      if (vertical > 6 && vertical > horizontal) {
        stopDrag(event)
        return
      }
      if (horizontal < 6 || horizontal <= vertical) return
      current.locked = true
      slider.current?.focus({ preventScroll: true })
    }
    revealAt(event)
  }
  return (
    <Dialog
      title="Compare editions"
      onClose={onClose}
      className="gx-comparison-dialog"
    >
      <div className="gx-comparison-heading">
        <p className="gx-eyebrow">
          <Columns2 size={14} aria-hidden="true" /> The comparison room
        </p>
        <h2>Find your point of view.</h2>
        <p>
          Same content. Two independent interpretations. Look a little closer.
        </p>
      </div>
      <div className="gx-comparison-tools">
        <div
          className="gx-layout-switch"
          role="group"
          aria-label="Comparison layout"
        >
          <button
            aria-pressed={layout === 'side-by-side'}
            onClick={() => setLayout('side-by-side')}
          >
            <Columns2 size={17} aria-hidden="true" />
            Side by side
          </button>
          <button
            aria-pressed={layout === 'overlay'}
            onClick={() => setLayout('overlay')}
          >
            <Layers size={17} aria-hidden="true" />
            Overlay comparison
          </button>
        </div>
        <ViewportSwitch viewport={viewport} onChange={setViewport} comparison />
      </div>
      <div className="gx-pair-selectors">
        {pair.map((version, side) => (
          <label key={side}>
            <span className="gx-side-letter" aria-hidden="true">
              {side === 0 ? 'A' : 'B'}
            </span>
            <span className="sr-only">
              {side === 0 ? 'Left edition' : 'Right edition'}
            </span>
            <select
              aria-label={side === 0 ? 'Left edition' : 'Right edition'}
              value={version.id}
              onChange={(event) => choose(side, event.target.value)}
            >
              {versions.map((entry) => (
                <option
                  key={entry.id}
                  value={entry.id}
                  disabled={entry.id === pair[1 - side].id}
                >
                  {editionNumber(entry)} / {entry.model}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {layout === 'side-by-side' ? (
        <div
          className="gx-comparison-panes"
          data-comparison-layout="side-by-side"
        >
          {pair.map((version, side) => (
            <figure
              key={side}
              className="gx-comparison-pane"
              data-comparison-edition={version.id}
            >
              <div className="gx-comparison-image" data-viewport={viewport}>
                <PreviewImage
                  version={version}
                  viewport={viewport}
                  comparison
                />
              </div>
              <figcaption>
                <span>Edition {editionNumber(version)}</span>
                <Link
                  to={version.path}
                  aria-label={`Open ${editionLabel(version)}`}
                >
                  Enter edition <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="gx-overlay-comparison" data-comparison-layout="overlay">
          <div
            className="gx-wipe-stage"
            data-viewport={viewport}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            onLostPointerCapture={stopDrag}
          >
            <PreviewImage version={right} viewport={viewport} comparison />
            <div
              className="gx-wipe-left"
              style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}
            >
              <PreviewImage version={left} viewport={viewport} comparison />
            </div>
            <div
              className="gx-wipe-divider"
              style={{ left: `${reveal}%` }}
              aria-hidden="true"
            >
              <span>
                <ChevronsLeftRight size={20} />
              </span>
            </div>
            <span
              className="gx-wipe-badge gx-wipe-badge-left"
              aria-hidden="true"
            >
              A
            </span>
            <span
              className="gx-wipe-badge gx-wipe-badge-right"
              aria-hidden="true"
            >
              B
            </span>
          </div>
          <label className="gx-wipe-control">
            <span>
              Slide between perspectives{' '}
              <ChevronsLeftRight size={17} aria-hidden="true" />
            </span>
            <input
              ref={slider}
              type="range"
              min="0"
              max="100"
              value={reveal}
              aria-label="Reveal left edition"
              aria-valuetext={`${reveal}% edition ${editionNumber(left)}, ${100 - reveal}% edition ${editionNumber(right)}`}
              onChange={(event) => setReveal(Number(event.target.value))}
            />
          </label>
          <div className="gx-wipe-links">
            {pair.map((version, side) => (
              <Link
                key={side}
                to={version.path}
                aria-label={`Open ${editionLabel(version)}`}
              >
                {side === 0 ? 'A' : 'B'} / Enter edition{' '}
                {editionNumber(version)}{' '}
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      )}
      <p className="gx-comparison-note">
        These are real automated captures, not live embeds. Open either edition
        for the full interactive experience.
      </p>
    </Dialog>
  )
}

export default function Gallery() {
  const [viewport, setViewport] = useState('desktop')
  const [selected, setSelected] = useState([])
  const [comparison, setComparison] = useState(null)
  const collection = useRef(null)
  const selectionTray = useRef(null)
  const comparisonOpener = useRef(null)
  useEffect(() => {
    if (!comparison && comparisonOpener.current) {
      comparisonOpener.current.focus()
      comparisonOpener.current = null
    }
  }, [comparison])
  const models = new Set(versions.map((version) => version.model)).size
  const selectedVersions = selected.map(versionFor)
  const toggleSelection = (id) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    )
  const openComparison = (pair, opener) => {
    comparisonOpener.current = opener
    setSelected(pair.map((version) => version.id))
    setComparison(pair)
  }
  const clearSelection = () => {
    setSelected([])
    collection.current?.focus()
  }
  const removeSelection = (id) => {
    if (selected.length === 1) {
      clearSelection()
      return
    }
    toggleSelection(id)
    requestAnimationFrame(() =>
      selectionTray.current
        ?.querySelector('.gx-selected-editions button')
        ?.focus(),
    )
  }
  return (
    <div className="editions-gallery" data-comparing={selected.length > 0}>
      <a href="#editions" className="skip-link">
        Skip to editions
      </a>
      <header className="gx-nav gx-container">
        <Link to="/" aria-label="Gallery home" className="gx-wordmark">
          <span className="gx-brand-symbol" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>
            The edition
            <br />
            room<span className="gx-brand-dot">.</span>
          </span>
        </Link>
        <span className="gx-nav-label">One human. An open brief.</span>
        <a href="https://mithawala.com" target="_blank" rel="noreferrer">
          The original site <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </header>
      <main className="gx-container">
        <section className="gx-intro" aria-labelledby="gx-title">
          <div className="gx-intro-copy">
            <h1 id="gx-title">
              <span className="gx-owner">
                {profile.name} / A design experiment
              </span>
              One story.
              <br />
              <em>Many imaginations.</em>
            </h1>
          </div>
          <div className="gx-intro-aside">
            <div className="gx-exhibition-mark" aria-hidden="true">
              <div className="gx-paper gx-paper-back" />
              <div className="gx-paper gx-paper-middle" />
              <div className="gx-paper gx-paper-front">
                <span>Open to interpretation</span>
                <strong>{String(versions.length).padStart(2, '0')}</strong>
                <span>
                  Independent editions <ArrowUpRight size={16} />
                </span>
              </div>
            </div>
            <p>
              The same person. The same content. A blank canvas for every
              design. See what changes when the imagination does.
            </p>
            <button
              className="gx-intro-compare"
              aria-haspopup="dialog"
              disabled={versions.length < 2}
              onClick={(event) =>
                openComparison(
                  [versions[0], versions.at(-1)],
                  event.currentTarget,
                )
              }
            >
              Compare first & latest{' '}
              <ChevronsLeftRight size={18} aria-hidden="true" />
            </button>
          </div>
        </section>
        <div
          className="gx-collection-toolbar"
          id="editions"
          tabIndex="-1"
          ref={collection}
        >
          <div className="gx-collection-title">
            <h2>
              The collection{' '}
              <span>{String(versions.length).padStart(2, '0')}</span>
            </h2>
            <p>
              {models} models. {versions.length} independent points of view.
            </p>
          </div>
          <ViewportSwitch viewport={viewport} onChange={setViewport} />
        </div>
        <p className="gx-collection-hint">
          <span>
            <span className="gx-live-dot" aria-hidden="true" />
            Real previews. Full experiences inside.
          </span>
          <span>
            Choose two editions to compare{' '}
            <ArrowDown size={13} aria-hidden="true" />
          </span>
        </p>
        <div className="gx-edition-wall">
          {versions.map((version, index) => {
            const chosen = selected.includes(version.id)
            return (
              <article
                className="gx-edition-card"
                data-edition-card={version.id}
                data-selected={chosen}
                key={version.id}
                style={{ '--gx-edition-color': version.color }}
              >
                <header className="gx-card-heading">
                  <div>
                    <p className="gx-card-number">
                      <span aria-hidden="true" />
                      Edition {editionNumber(version)}
                    </p>
                    <h2>
                      <Link to={version.path}>{version.model}</Link>
                    </h2>
                  </div>
                  <Link
                    to={version.path}
                    className="gx-visit"
                    aria-label={`Visit ${version.model}`}
                    title={`Visit ${editionLabel(version)}`}
                  >
                    <ArrowUpRight size={22} aria-hidden="true" />
                  </Link>
                </header>
                <Link
                  to={version.path}
                  className="gx-edition-preview"
                  aria-label={`Explore ${version.model}`}
                >
                  <div className="gx-preview-mat" data-viewport={viewport}>
                    <div className="gx-preview-frame">
                      <div className="gx-preview-chrome" aria-hidden="true">
                        <span>
                          <i />
                          <i />
                          <i />
                        </span>
                        <span>
                          {viewport === 'desktop' ? 'Desktop' : 'Mobile'}{' '}
                          capture
                        </span>
                        <ArrowUpRight size={11} />
                      </div>
                      <PreviewImage
                        version={version}
                        viewport={viewport}
                        priority={index === 0}
                      />
                    </div>
                    <span className="gx-enter-preview">
                      Step inside <ArrowUpRight size={17} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
                <footer className="gx-card-footer">
                  <time dateTime={version.released}>
                    {formatDate(version.released, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </time>
                  <button
                    data-compare-select={version.id}
                    aria-label={`Compare ${editionLabel(version)}`}
                    aria-pressed={chosen}
                    disabled={selected.length === 2 && !chosen}
                    title={
                      selected.length === 2 && !chosen
                        ? 'Remove a selected edition to choose another'
                        : undefined
                    }
                    onClick={() => toggleSelection(version.id)}
                  >
                    {chosen ? (
                      <Check size={16} aria-hidden="true" />
                    ) : (
                      <Plus size={16} aria-hidden="true" />
                    )}
                    {chosen ? 'Selected' : 'Compare'}
                  </button>
                </footer>
              </article>
            )
          })}
        </div>
        <section className="gx-colophon" aria-labelledby="gx-colophon-title">
          <div>
            <p className="gx-eyebrow">
              Different by design. Equal at the core.
            </p>
            <h2 id="gx-colophon-title">
              The canvas changes.
              <br />
              <em>The person doesn't.</em>
            </h2>
          </div>
          <div className="gx-colophon-copy">
            <p>
              Every edition has the complete portfolio, articles, experience,
              music, and ways to get in touch. No borrowed layouts. No invented
              stories. Just independent interpretations of{' '}
              {profile.name.split(' ')[0]}.
            </p>
            <a href={profile.social.github} target="_blank" rel="noreferrer">
              <Github size={17} aria-hidden="true" />
              Follow the work <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
      <footer className="gx-footer gx-container">
        <span>{profile.copyright}</span>
        <span>Built independently. Collected here.</span>
        <a href={`mailto:${profile.about.email}`}>
          Say hello <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </footer>
      {selected.length > 0 && (
        <aside
          ref={selectionTray}
          className="gx-comparison-tray"
          aria-label="Selected editions"
        >
          <div className="gx-tray-intro">
            <Columns2 size={20} aria-hidden="true" />
            <p role="status">
              {selected.length} of 2 selected
              <span>
                {selected.length === 1
                  ? 'Pick one more perspective.'
                  : 'Ready for a closer look.'}
              </span>
            </p>
          </div>
          <div className="gx-selected-editions">
            {selectedVersions.map((version) => (
              <button
                key={version.id}
                aria-label={`Remove ${editionLabel(version)} from comparison`}
                onClick={() => removeSelection(version.id)}
              >
                <span>{editionNumber(version)}</span>
                {version.model}
                <X size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
          <button
            className="gx-open-comparison"
            aria-haspopup="dialog"
            disabled={selected.length !== 2}
            onClick={(event) =>
              openComparison(selectedVersions, event.currentTarget)
            }
          >
            Compare editions <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button
            className="gx-clear-comparison"
            aria-label="Clear comparison selection"
            title="Clear comparison selection"
            onClick={clearSelection}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </aside>
      )}
      {comparison && (
        <ComparisonDialog
          pair={comparison}
          onPairChange={(pair) => {
            setComparison(pair)
            setSelected(pair.map((version) => version.id))
          }}
          viewport={viewport}
          setViewport={setViewport}
          onClose={() => setComparison(null)}
        />
      )}
    </div>
  )
}
