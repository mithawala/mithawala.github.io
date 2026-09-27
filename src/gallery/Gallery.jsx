import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeftRight,
  Columns2,
  Compass,
  Github,
  Layers,
  Monitor,
  Pause,
  Play,
  Focus,
  Smartphone,
  X,
} from 'lucide-react'
import '@fontsource-variable/space-grotesk'
import '@fontsource/ibm-plex-mono/400.css'
import { versions } from '../versions.mjs'
import { profile, formatDate } from '../asif/content.mjs'
import Dialog from '../asif/Dialog.jsx'
import './gallery.css'

const PortalScene = lazy(() => import('./PortalScene.jsx'))
const EDITION_IDS = versions.map((version) => version.id)
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

function EditionLink({ version, children, ...props }) {
  return (
    <Link
      {...props}
      to={version.path}
      target="_blank"
      rel="noopener noreferrer"
      aria-describedby="nx-new-tab-hint"
    >
      {children}
    </Link>
  )
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
          <Columns2 size={14} aria-hidden="true" /> Parallel view
        </p>
        <h2>Two models. The same brief.</h2>
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
                <EditionLink
                  version={version}
                  aria-label={`Open ${editionLabel(version)}`}
                >
                  Enter edition <ArrowUpRight size={16} aria-hidden="true" />
                </EditionLink>
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
              <EditionLink
                key={side}
                version={version}
                aria-label={`Open ${editionLabel(version)}`}
              >
                {side === 0 ? 'A' : 'B'} / Enter edition{' '}
                {editionNumber(version)}{' '}
                <ArrowUpRight size={15} aria-hidden="true" />
              </EditionLink>
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

class PortalBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    console.warn('[Model Editions] The 3D gallery could not be loaded.')
    this.props.onFallback()
  }
  render() {
    return this.state.failed ? (
      <div
        className="nx-scene-error"
        data-scene-status="fallback"
        role="status"
      >
        <Compass size={44} aria-hidden="true" />
        <p>The 3D space could not load. Every edition is still open below.</p>
        <button onClick={() => location.reload()}>Retry graphics</button>
      </div>
    ) : (
      this.props.children
    )
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(preference.matches)
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  return reduced
}

function EditionCard({
  version,
  viewport,
  compact = false,
  chosen,
  selectionFull,
  onCompare,
  onLocate,
}) {
  return (
    <article
      className={`nx-edition-card ${compact ? 'nx-active-card' : ''}`}
      data-edition-card={version.id}
      data-selected={chosen}
      style={{ '--world-color': version.color }}
    >
      <EditionLink
        className="nx-card-preview"
        version={version}
        aria-label={`Explore ${version.model}`}
      >
        <PreviewImage
          version={version}
          viewport={viewport}
          priority={compact}
        />
        {!compact && (
          <span className="nx-preview-enter">
            Open this edition <ArrowUpRight size={18} aria-hidden="true" />
          </span>
        )}
      </EditionLink>
      <div className="nx-card-info">
        <p className="nx-eyebrow">
          <span className="nx-world-dot" />
          Edition {editionNumber(version)}
        </p>
        <h2>
          <EditionLink version={version}>{version.model}</EditionLink>
        </h2>
        <time dateTime={version.released}>
          {formatDate(version.released, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </time>
      </div>
      <div className="nx-card-actions">
        <EditionLink
          className="nx-enter-world"
          version={version}
          aria-label={`Visit ${version.model}`}
        >
          Open edition <ArrowUpRight size={17} aria-hidden="true" />
        </EditionLink>
        {!compact && (
          <button
            className="nx-locate-world"
            aria-label={`Locate ${editionLabel(version)} in 3D`}
            onClick={() => onLocate(version.id)}
          >
            <Focus size={17} aria-hidden="true" />
            <span>Locate</span>
          </button>
        )}
        <button
          className="nx-compare-world"
          data-compare-select={version.id}
          aria-label={`Compare ${editionLabel(version)}`}
          aria-pressed={chosen}
          disabled={selectionFull && !chosen}
          title={
            selectionFull && !chosen
              ? 'Remove a selected edition to choose another'
              : 'Add to comparison'
          }
          onClick={() => onCompare(version.id)}
        >
          {chosen ? (
            <Check size={17} aria-hidden="true" />
          ) : (
            <Columns2 size={17} aria-hidden="true" />
          )}
          <span>{chosen ? 'Selected' : 'Compare'}</span>
        </button>
      </div>
    </article>
  )
}

export default function Gallery() {
  const [viewport, setViewport] = useState('desktop')
  const [selected, setSelected] = useState([])
  const [comparison, setComparison] = useState(null)
  const [activeId, setActiveId] = useState(versions[0].id)
  const [paused, setPaused] = useState(false)
  const [controlsHovered, setControlsHovered] = useState(false)
  const [controlsFocused, setControlsFocused] = useState(false)
  const [sceneStatus, setSceneStatus] = useState('loading')
  const reducedMotion = useReducedMotion()
  const activeVersion = versionFor(activeId)
  const activeIndex = EDITION_IDS.indexOf(activeId)
  const collection = useRef(null)
  const hero = useRef(null)
  const editionControls = useRef(null)
  const activeControls = useRef(null)
  const selectionTray = useRef(null)
  const comparisonOpener = useRef(null)
  const interactionPaused =
    controlsHovered ||
    controlsFocused ||
    selected.length > 0 ||
    Boolean(comparison)
  useEffect(() => {
    if (!comparison && comparisonOpener.current) {
      comparisonOpener.current.focus()
      comparisonOpener.current = null
    }
  }, [comparison])
  useEffect(() => {
    const updateFocus = () => {
      const focused = document.activeElement
      setControlsFocused(
        Boolean(
          activeControls.current?.contains(focused) &&
          !focused.closest('.nx-motion-control'),
        ),
      )
    }
    document.addEventListener('focusin', updateFocus)
    return () => document.removeEventListener('focusin', updateFocus)
  }, [])
  const selectEdition = useCallback((id) => {
    setPaused(true)
    setActiveId(versionFor(id).id)
  }, [])
  const updateActiveEdition = useCallback(
    (id) => setActiveId(versionFor(id).id),
    [],
  )
  const graphicsUnavailable = useCallback(() => setSceneStatus('fallback'), [])
  const changeEdition = (direction) =>
    selectEdition(
      EDITION_IDS[
        (activeIndex + direction + versions.length) % versions.length
      ],
    )
  const locateEdition = (id) => {
    selectEdition(id)
    hero.current?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
    requestAnimationFrame(() =>
      editionControls.current?.focus({ preventScroll: true }),
    )
  }
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
  // Auto-advance must not discard the active card's focused controls.
  const renderEdition = (version, compact = false) => (
    <EditionCard
      key={compact ? 'active-edition' : version.id}
      version={version}
      viewport={viewport}
      compact={compact}
      chosen={selected.includes(version.id)}
      selectionFull={selected.length === 2}
      onCompare={toggleSelection}
      onLocate={locateEdition}
    />
  )
  return (
    <div
      className="editions-gallery nx-model-editions"
      data-comparing={selected.length > 0}
      data-motion={
        reducedMotion
          ? 'reduced'
          : paused || interactionPaused
            ? 'paused'
            : 'running'
      }
    >
      <a href="#editions" className="skip-link">
        Skip to editions
      </a>
      <header className="nx-header">
        <span id="nx-new-tab-hint" className="sr-only">
          Opens in a new tab.
        </span>
        <Link to="/" aria-label="Gallery home" className="gx-wordmark nx-brand">
          <span className="nx-brand-mark" aria-hidden="true">
            <Compass size={29} strokeWidth={1.2} />
          </span>
          <span>
            mithawala.com<span>MODEL EDITIONS</span>
          </span>
        </Link>
        <span className="nx-header-meta">
          <span />
          {versions.length} interpretations
          <span className="nx-header-divider">/</span>
          {models} AI models
        </span>
        <a
          className="nx-about-link"
          href="#about-benchmark"
          aria-label="About the benchmark"
        >
          <span>
            About<span className="nx-about-detail"> the benchmark</span>
          </span>{' '}
          <ArrowDown size={15} aria-hidden="true" />
        </a>
      </header>
      <main className="nx-main" id="editions" ref={collection} tabIndex="-1">
        <section
          ref={hero}
          className="nx-hero"
          aria-labelledby="nx-title"
          data-active-edition={activeId}
          data-scene={sceneStatus}
        >
          <div className="nx-scene-mount">
            <PortalBoundary onFallback={graphicsUnavailable}>
              <Suspense
                fallback={
                  <div
                    className="nx-scene-loading"
                    data-rendering
                    role="status"
                  >
                    <Compass size={30} aria-hidden="true" />
                    <span>Loading the 3D gallery...</span>
                  </div>
                }
              >
                <PortalScene
                  versions={versions}
                  activeId={activeId}
                  viewport={viewport}
                  paused={paused || reducedMotion || interactionPaused}
                  onSelect={selectEdition}
                  onActiveChange={updateActiveEdition}
                  onStatusChange={setSceneStatus}
                />
              </Suspense>
            </PortalBoundary>
          </div>
          <div className="nx-hero-copy">
            <h1 id="nx-title">
              <span className="nx-owner">
                {profile.name} / A hands-on AI design benchmark
              </span>
              One site. <em>Every model.</em>
            </h1>
            <p>
              Whenever a new AI model comes out, I give it the same challenge:
              create its own interpretation of{' '}
              <a href="https://mithawala.com" target="_blank" rel="noreferrer">
                mithawala.com
              </a>
              . Same content. Same capabilities. A fresh design, built
              independently.
            </p>
          </div>
          <div className="nx-sector-label" aria-hidden="true">
            <span>Selected edition</span>
            <strong>
              {editionNumber(activeVersion)}
              <small> / {String(versions.length).padStart(2, '0')}</small>
            </strong>
            <span>
              Rotates automatically
              <br />
              Drag or select to pause
            </span>
          </div>
          <div
            ref={activeControls}
            className="nx-hero-bottom"
            onPointerOver={(event) => {
              if (event.pointerType === 'mouse')
                setControlsHovered(!event.target.closest('.nx-motion-control'))
            }}
            onPointerLeave={() => setControlsHovered(false)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setControlsFocused(false)
            }}
          >
            <div className="nx-flight-controls">
              <div
                ref={editionControls}
                className="nx-world-navigation"
                role="group"
                aria-label="Edition navigation"
                tabIndex="-1"
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault()
                    changeEdition(event.key === 'ArrowLeft' ? -1 : 1)
                  }
                }}
              >
                <button
                  aria-label="Previous edition"
                  onClick={() => changeEdition(-1)}
                  disabled={versions.length < 2}
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <span>
                  {editionNumber(activeVersion)}{' '}
                  <small>/ {String(versions.length).padStart(2, '0')}</small>
                </span>
                <button
                  aria-label="Next edition"
                  onClick={() => changeEdition(1)}
                  disabled={versions.length < 2}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
              <div
                className="nx-world-selector"
                role="group"
                aria-label="Choose an edition"
              >
                {versions.map((version) => (
                  <button
                    key={version.id}
                    aria-label={`Select ${editionLabel(version)}`}
                    aria-pressed={activeId === version.id}
                    onClick={() => selectEdition(version.id)}
                  >
                    {editionNumber(version)}
                  </button>
                ))}
              </div>
              <ViewportSwitch viewport={viewport} onChange={setViewport} />
              <button
                className="nx-motion-control"
                aria-label={
                  paused || reducedMotion ? 'Resume motion' : 'Pause motion'
                }
                title={
                  reducedMotion
                    ? 'Your reduced-motion preference is respected'
                    : paused
                      ? 'Play automatic gallery rotation'
                      : 'Pause automatic gallery rotation'
                }
                disabled={reducedMotion}
                onClick={() => setPaused(!paused)}
              >
                {paused || reducedMotion ? (
                  <Play size={16} aria-hidden="true" />
                ) : (
                  <Pause size={16} aria-hidden="true" />
                )}
              </button>
            </div>
            {renderEdition(activeVersion, true)}
            <p
              className="nx-announcement"
              role="status"
              aria-live={
                paused || reducedMotion || interactionPaused ? 'polite' : 'off'
              }
            >
              {sceneStatus === 'fallback'
                ? 'Preview mode. Use the edition arrows or browse the collection below.'
                : `${activeVersion.model} / Edition ${editionNumber(activeVersion)}. Open the full site or compare it with another interpretation.`}
            </p>
          </div>
        </section>
        <section
          id="about-benchmark"
          className="nx-benchmark"
          aria-labelledby="nx-benchmark-title"
        >
          <div className="nx-benchmark-intro">
            <p className="nx-eyebrow">What this collection is about</p>
            <h2 id="nx-benchmark-title">
              A new model.
              <br />
              <span>The same challenge.</span>
            </h2>
            <p>
              I benchmark new AI models by asking each one to build a new
              interpretation of my personal website,{' '}
              <a href="https://mithawala.com" target="_blank" rel="noreferrer">
                mithawala.com
              </a>
              . The results live here: real, working websites you can explore
              and compare.
            </p>
          </div>
          <div className="nx-benchmark-method">
            <article>
              <span className="nx-eyebrow">01 / A consistent brief</span>
              <h3>Same person. Same content.</h3>
              <p>
                Every model starts with the same biography, projects, articles,
                and required functionality. The subject stays the same.
              </p>
            </article>
            <article>
              <span className="nx-eyebrow">
                02 / An independent interpretation
              </span>
              <h3>A blank canvas for each model.</h3>
              <p>
                No previous edition to copy. Each model chooses its own layout,
                typography, visual language, and interactions.
              </p>
            </article>
            <article>
              <span className="nx-eyebrow">03 / A working result</span>
              <h3>Judge the experience, not a screenshot.</h3>
              <p>
                Open an edition to see what it actually built. Compare the
                creativity, craft, usability, and implementation across models.
              </p>
            </article>
          </div>
          <p className="nx-benchmark-note">
            A hands-on, qualitative benchmark of AI design and development, not
            a numerical leaderboard. The gallery grows as new models are put to
            the test.
          </p>
        </section>
        <section className="nx-directory" aria-labelledby="nx-directory-title">
          <div className="nx-directory-heading">
            <div>
              <p className="nx-eyebrow">The collection</p>
              <h2 id="nx-directory-title">Compare the interpretations.</h2>
              <p>
                Your selected edition is above. Explore the other{' '}
                {versions.length - 1} interpretations below.
              </p>
            </div>
            <button
              className="nx-compare-shortcut"
              aria-haspopup="dialog"
              disabled={versions.length < 2}
              onClick={(event) =>
                openComparison(
                  [versions[0], versions.at(-1)],
                  event.currentTarget,
                )
              }
            >
              Compare first & latest <Columns2 size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="nx-directory-grid">
            {versions
              .filter((version) => version.id !== activeId)
              .map((version) => renderEdition(version))}
          </div>
        </section>
        <section className="nx-common-source" aria-label="About the collection">
          <Compass size={33} strokeWidth={1.1} aria-hidden="true" />
          <div>
            <h2>
              Different designs.
              <br />
              <span>The same source.</span>
            </h2>
            <p>
              Every edition contains the complete portfolio, articles,
              experience, music, and contact details. The gallery uses real
              automated captures; each preview opens the full interactive
              website.
            </p>
          </div>
          <a href={profile.social.github} target="_blank" rel="noreferrer">
            <Github size={17} aria-hidden="true" />
            Follow the work <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </section>
      </main>
      <footer className="nx-footer">
        <span>{profile.copyright}</span>
        <span>New models. Independent interpretations.</span>
        <a href="https://mithawala.com" target="_blank" rel="noreferrer">
          Original site <ArrowUpRight size={14} aria-hidden="true" />
        </a>
        <a href={`mailto:${profile.about.email}`}>
          Get in touch <ArrowUpRight size={14} aria-hidden="true" />
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
