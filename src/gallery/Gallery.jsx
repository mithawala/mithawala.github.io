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
  Plus,
  Radio,
  Rocket,
  RotateCcw,
  ScanLine,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react'
import '@fontsource-variable/space-grotesk'
import '@fontsource/ibm-plex-mono/400.css'
import { versions } from '../versions.mjs'
import { profile, formatDate } from '../asif/content.mjs'
import Dialog from '../asif/Dialog.jsx'
import {
  EXPEDITION_KEY,
  NEXUS_SIGNALS,
  loadExpedition,
  saveExpedition,
  updateExpedition,
  expeditionStats,
} from './nexus-game.mjs'
import './gallery.css'

const PortalScene = lazy(() => import('./PortalScene.jsx'))
const WORLD_IDS = versions.map((version) => version.id)
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
          <Columns2 size={14} aria-hidden="true" /> Parallel view
        </p>
        <h2>Two worlds. One human.</h2>
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

class PortalBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    console.warn('[Edition Nexus] The 3D module could not be loaded.')
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

function useExpedition() {
  const [state, setState] = useState(() =>
    loadExpedition(() => localStorage.getItem(EXPEDITION_KEY), WORLD_IDS),
  )
  const current = useRef(state)
  const act = useCallback((action) => {
    const progress = updateExpedition(
      current.current.progress,
      action,
      WORLD_IDS,
    )
    if (progress === current.current.progress)
      return expeditionStats(progress, WORLD_IDS)
    let next = { ...current.current, progress }
    if (next.persistent) {
      const saved = saveExpedition(progress, (value) =>
        localStorage.setItem(EXPEDITION_KEY, value),
      )
      next = { ...next, persistent: saved.ok, notice: saved.notice }
      if (!saved.ok) console.warn(`[Edition Nexus] ${saved.notice}`)
    }
    current.current = next
    setState(next)
    return expeditionStats(progress, WORLD_IDS)
  }, [])
  return { ...state, act, stats: expeditionStats(state.progress, WORLD_IDS) }
}

function EditionCard({
  version,
  viewport,
  compact = false,
  scanned,
  chosen,
  selectionFull,
  onCompare,
  onEnter,
  onLocate,
}) {
  return (
    <article
      className={`nx-edition-card ${compact ? 'nx-active-card' : ''}`}
      data-edition-card={version.id}
      data-selected={chosen}
      data-scanned={scanned}
      style={{ '--world-color': version.color }}
    >
      <Link
        className="nx-card-preview"
        to={version.path}
        aria-label={`Explore ${version.model}`}
        onClick={() => onEnter(version.id)}
      >
        <PreviewImage
          version={version}
          viewport={viewport}
          priority={compact}
        />
        {!compact && (
          <span className="nx-preview-enter">
            Enter this world <ArrowUpRight size={18} aria-hidden="true" />
          </span>
        )}
      </Link>
      <div className="nx-card-info">
        <p className="nx-eyebrow">
          <span className="nx-world-dot" />
          World {editionNumber(version)}{' '}
          <span className="nx-scan-state">
            {scanned ? 'Scanned' : 'Uncharted'}
          </span>
        </p>
        <h2>
          <Link to={version.path} onClick={() => onEnter(version.id)}>
            {version.model}
          </Link>
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
        <Link
          className="nx-enter-world"
          to={version.path}
          aria-label={`Visit ${version.model}`}
          onClick={() => onEnter(version.id)}
        >
          Enter edition <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
        {!compact && (
          <button
            className="nx-locate-world"
            aria-label={`Locate ${editionLabel(version)} in 3D`}
            onClick={() => onLocate(version.id)}
          >
            <ScanLine size={17} aria-hidden="true" />
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

function ExpeditionLog({
  progress,
  stats,
  persistent,
  notice,
  onScan,
  onCollect,
  onReset,
  onClose,
}) {
  return (
    <Dialog
      title="Expedition log"
      onClose={onClose}
      className="nx-mission-dialog"
    >
      <p className="nx-eyebrow">
        <Compass size={15} aria-hidden="true" />
        Optional expedition / Your progress
      </p>
      <h2>
        {stats.complete
          ? 'Nexus stabilized.'
          : 'Find the human in the machine.'}
      </h2>
      <p className="nx-mission-intro">
        Explore the worlds. Recover the signals. Connect two perspectives.
        Nothing here locks access to the websites.
      </p>
      <div
        className="nx-expedition-meter"
        role="progressbar"
        aria-label="Expedition progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={stats.percent}
      >
        <span style={{ width: `${stats.percent}%` }} />
      </div>
      <p className="nx-mission-progress" role="status">
        {stats.objectivesComplete} / {stats.objectivesTotal} objectives complete{' '}
        <span>{stats.percent}% synchronized</span>
      </p>
      <div className="nx-objectives">
        <article data-objective="worlds" data-complete={stats.worldsComplete}>
          <span className="nx-objective-icon">
            {stats.worldsComplete ? (
              <Check size={20} />
            ) : (
              <ScanLine size={20} />
            )}
          </span>
          <div>
            <h3>Chart the worlds</h3>
            <p>
              Select every portal in the 3D field, or travel with the arrow
              controls.
            </p>
          </div>
          <strong>
            {stats.scanned}/{stats.totalWorlds}
          </strong>
        </article>
        <article data-objective="signals" data-complete={stats.signalsComplete}>
          <span className="nx-objective-icon">
            {stats.signalsComplete ? <Check size={20} /> : <Radio size={20} />}
          </span>
          <div>
            <h3>Recover the signals</h3>
            <p>
              Three beacons are hiding in plain sight. Their colors are your
              clues.
            </p>
          </div>
          <strong>
            {stats.recovered}/{stats.totalSignals}
          </strong>
        </article>
        {stats.comparisonAvailable && (
          <article data-objective="compare" data-complete={progress.compared}>
            <span className="nx-objective-icon">
              {progress.compared ? <Check size={20} /> : <Columns2 size={20} />}
            </span>
            <div>
              <h3>Think in parallel</h3>
              <p>
                Open a comparison between two editions. A different view changes
                everything.
              </p>
            </div>
            <strong>{progress.compared ? '1/1' : '0/1'}</strong>
          </article>
        )}
      </div>
      <div className="nx-signal-clues">
        {NEXUS_SIGNALS.map((signal, index) => (
          <div
            key={signal.id}
            data-recovered={progress.signals.includes(signal.id)}
            style={{ '--signal-color': signal.color }}
          >
            <span className="nx-signal-symbol">
              {progress.signals.includes(signal.id) ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                <Radio size={18} aria-hidden="true" />
              )}
            </span>
            <span className="nx-eyebrow">
              Signal {String(index + 1).padStart(2, '0')}
            </span>
            <h3>{signal.label}</h3>
            <p>
              {progress.signals.includes(signal.id)
                ? 'Recovered. The nexus grows stronger.'
                : signal.hint}
            </p>
          </div>
        ))}
      </div>
      <details className="nx-accessible-controls">
        <summary>
          Keyboard & low-graphics controls <Plus size={17} aria-hidden="true" />
        </summary>
        <p>
          The same expedition, without needing to find or click a 3D object.
        </p>
        <div className="nx-access-worlds">
          {versions.map((version) => (
            <button
              key={version.id}
              aria-label={`Scan ${editionLabel(version)}`}
              aria-pressed={progress.scanned.includes(version.id)}
              onClick={() => onScan(version.id)}
            >
              <span>{editionNumber(version)}</span>
              {version.model}
              {progress.scanned.includes(version.id) ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <ScanLine size={16} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        <div className="nx-access-signals">
          {NEXUS_SIGNALS.map((signal) => (
            <button
              key={signal.id}
              aria-label={`Collect ${signal.label}`}
              aria-pressed={progress.signals.includes(signal.id)}
              onClick={() => onCollect(signal.id)}
            >
              {progress.signals.includes(signal.id) ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Radio size={16} aria-hidden="true" />
              )}
              {signal.label}
            </button>
          ))}
        </div>
      </details>
      <div className="nx-log-footer">
        <p>
          {notice ||
            (persistent
              ? 'Saved only in this browser. No account. No tracking.'
              : 'Session-only progress. Browser storage is unavailable.')}
        </p>
        <button onClick={onReset}>
          <RotateCcw size={15} aria-hidden="true" />
          Reset expedition
        </button>
      </div>
    </Dialog>
  )
}

export default function Gallery() {
  const [viewport, setViewport] = useState('desktop')
  const [selected, setSelected] = useState([])
  const [comparison, setComparison] = useState(null)
  const [activeId, setActiveId] = useState(versions[0].id)
  const [missionOpen, setMissionOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  const [launchId, setLaunchId] = useState(0)
  const [sceneStatus, setSceneStatus] = useState('loading')
  const [announcement, setAnnouncement] = useState(
    'Click a portal to scan a world. Find the three floating signals.',
  )
  const reducedMotion = useReducedMotion()
  const game = useExpedition()
  const activeVersion = versionFor(activeId)
  const activeIndex = WORLD_IDS.indexOf(activeId)
  const collection = useRef(null)
  const hero = useRef(null)
  const worldControls = useRef(null)
  const selectionTray = useRef(null)
  const comparisonOpener = useRef(null)
  const missionOpener = useRef(null)
  useEffect(() => {
    if (!comparison && comparisonOpener.current) {
      comparisonOpener.current.focus()
      comparisonOpener.current = null
    }
  }, [comparison])
  useEffect(() => {
    if (!missionOpen && missionOpener.current) {
      missionOpener.current.focus()
      missionOpener.current = null
    }
  }, [missionOpen])
  const recordScan = useCallback(
    (id) => {
      const stats = game.act({ type: 'scan', id })
      setAnnouncement(
        `World ${editionNumber(versionFor(id))} scanned. ${stats.scanned} of ${stats.totalWorlds} worlds charted.`,
      )
    },
    [game.act],
  )
  const selectWorld = useCallback(
    (id) => {
      setActiveId(id)
      recordScan(id)
    },
    [recordScan],
  )
  const collectSignal = useCallback(
    (id) => {
      const stats = game.act({ type: 'signal', id })
      const signal = NEXUS_SIGNALS.find((entry) => entry.id === id)
      setAnnouncement(
        `${signal.label} recovered. ${stats.recovered} of ${stats.totalSignals} signals found.`,
      )
    },
    [game.act],
  )
  const graphicsUnavailable = useCallback(() => setSceneStatus('fallback'), [])
  const travel = (direction) =>
    selectWorld(
      WORLD_IDS[(activeIndex + direction + versions.length) % versions.length],
    )
  const locateWorld = (id) => {
    selectWorld(id)
    hero.current?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
    requestAnimationFrame(() =>
      worldControls.current?.focus({ preventScroll: true }),
    )
  }
  const resetExpedition = () => {
    game.act({ type: 'reset' })
    setActiveId(versions[0].id)
    setAnnouncement(
      'A fresh expedition. The worlds are open, and the signals are waiting.',
    )
  }
  const launch = () => {
    hero.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
    worldControls.current?.focus({ preventScroll: true })
    setLaunchId((value) => value + 1)
    setAnnouncement(
      sceneStatus === 'fallback'
        ? 'Nexus stabilized. The animated launch needs 3D graphics, but every world is open.'
        : paused || reducedMotion
          ? 'Nexus stabilized. The launch display stays still while motion is paused.'
          : 'Launch sequence engaged. All worlds are yours to explore.',
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
    game.act({ type: 'compare' })
    setAnnouncement(
      'Parallel connection established. A new perspective is part of the expedition.',
    )
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
  const renderEdition = (version, compact = false) => (
    <EditionCard
      key={version.id}
      version={version}
      viewport={viewport}
      compact={compact}
      scanned={game.progress.scanned.includes(version.id)}
      chosen={selected.includes(version.id)}
      selectionFull={selected.length === 2}
      onCompare={toggleSelection}
      onEnter={recordScan}
      onLocate={locateWorld}
    />
  )
  return (
    <div
      className="editions-gallery nx-nexus"
      data-comparing={selected.length > 0}
      data-expedition-complete={game.stats.complete}
      data-motion={reducedMotion ? 'reduced' : paused ? 'paused' : 'running'}
    >
      <a href="#editions" className="skip-link">
        Skip to editions
      </a>
      <header className="nx-header">
        <Link to="/" aria-label="Gallery home" className="gx-wordmark nx-brand">
          <span className="nx-brand-mark" aria-hidden="true">
            <Compass size={29} strokeWidth={1.2} />
          </span>
          <span>
            EDITION<span>NEXUS</span>
          </span>
        </Link>
        <span className="nx-header-signal">
          <span />
          {versions.length} worlds online
          <span className="nx-header-divider">/</span>
          {models} model signatures
        </span>
        <button
          className="nx-mission-trigger"
          aria-label="Mission log"
          aria-haspopup="dialog"
          onClick={(event) => {
            missionOpener.current = event.currentTarget
            setMissionOpen(true)
          }}
        >
          <Compass size={16} aria-hidden="true" />
          <span>Mission log</span>
          <strong aria-hidden="true">
            {game.stats.objectivesComplete}/{game.stats.objectivesTotal}
          </strong>
        </button>
      </header>
      <main className="nx-main" id="editions" ref={collection} tabIndex="-1">
        <section
          ref={hero}
          className="nx-hero"
          aria-labelledby="nx-title"
          data-active-world={activeId}
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
                    <span>Opening the nexus...</span>
                  </div>
                }
              >
                <PortalScene
                  versions={versions}
                  activeId={activeId}
                  viewport={viewport}
                  paused={
                    paused ||
                    reducedMotion ||
                    Boolean(comparison) ||
                    missionOpen
                  }
                  signals={NEXUS_SIGNALS}
                  collectedIds={game.progress.signals}
                  scannedIds={game.progress.scanned}
                  complete={game.stats.complete}
                  launchId={launchId}
                  onSelect={selectWorld}
                  onCollect={collectSignal}
                  onStatusChange={setSceneStatus}
                />
              </Suspense>
            </PortalBoundary>
          </div>
          <div className="nx-hero-copy">
            <h1 id="nx-title">
              <span className="nx-owner">
                {profile.name} / An interactive edition expedition
              </span>
              Choose your <em>reality.</em>
            </h1>
            <p>One human. Independent worlds. A few signals worth following.</p>
          </div>
          <div className="nx-sector-label" aria-hidden="true">
            <span>Current sector</span>
            <strong>
              {editionNumber(activeVersion)}
              <small> / {String(versions.length).padStart(2, '0')}</small>
            </strong>
            <span>
              Drag to travel
              <br />
              Click a portal to scan
            </span>
          </div>
          <div
            className="nx-signal-radar"
            aria-label={`${game.stats.recovered} of ${game.stats.totalSignals} signals recovered`}
          >
            <span className="nx-eyebrow">Recover the signals</span>
            <div>
              {NEXUS_SIGNALS.map((signal) => (
                <span
                  key={signal.id}
                  title={signal.label}
                  data-found={game.progress.signals.includes(signal.id)}
                  style={{ '--signal-color': signal.color }}
                >
                  <Radio size={19} aria-hidden="true" />
                </span>
              ))}
            </div>
            <span>
              {game.stats.recovered}/{game.stats.totalSignals} recovered
            </span>
          </div>
          <div className="nx-hero-bottom">
            <div className="nx-flight-controls">
              <div
                ref={worldControls}
                className="nx-world-navigation"
                role="group"
                aria-label="World navigation"
                tabIndex="-1"
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault()
                    travel(event.key === 'ArrowLeft' ? -1 : 1)
                  }
                }}
              >
                <button
                  aria-label="Previous world"
                  onClick={() => travel(-1)}
                  disabled={versions.length < 2}
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <span>
                  {editionNumber(activeVersion)}{' '}
                  <small>/ {String(versions.length).padStart(2, '0')}</small>
                </span>
                <button
                  aria-label="Next world"
                  onClick={() => travel(1)}
                  disabled={versions.length < 2}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
              <div
                className="nx-world-selector"
                role="group"
                aria-label="Choose a world"
              >
                {versions.map((version) => (
                  <button
                    key={version.id}
                    aria-label={`Select ${editionLabel(version)}`}
                    aria-pressed={activeId === version.id}
                    data-charted={game.progress.scanned.includes(version.id)}
                    onClick={() => selectWorld(version.id)}
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
                      ? 'Resume motion'
                      : 'Pause motion'
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
            <p className="nx-announcement" role="status">
              {game.notice ||
                (sceneStatus === 'fallback'
                  ? 'Preview mode. Use the world arrows and Mission log to explore without 3D.'
                  : announcement)}
            </p>
          </div>
        </section>
        <section
          className="nx-expedition-deck"
          aria-labelledby="nx-expedition-title"
        >
          <div className="nx-expedition-heading">
            <span className="nx-orbit-icon" aria-hidden="true">
              <Sparkles size={29} strokeWidth={1.3} />
            </span>
            <div>
              <p className="nx-eyebrow">A little curiosity goes a long way</p>
              <h2 id="nx-expedition-title">
                {game.stats.complete
                  ? 'Nexus stabilized.'
                  : 'There is more here than a menu.'}
              </h2>
              <p>
                {game.stats.complete
                  ? 'You found the signals and connected the perspectives. Your launch sequence is ready.'
                  : 'Chart the worlds. Find three colored beacons. Compare two perspectives. Power up the nexus.'}
              </p>
            </div>
          </div>
          <div className="nx-quest-stats">
            <div>
              <strong>
                {String(game.stats.scanned).padStart(2, '0')}
                <small>
                  /{String(game.stats.totalWorlds).padStart(2, '0')}
                </small>
              </strong>
              <span>Worlds charted</span>
            </div>
            <div>
              <strong>
                {String(game.stats.recovered).padStart(2, '0')}
                <small>
                  /{String(game.stats.totalSignals).padStart(2, '0')}
                </small>
              </strong>
              <span>Signals recovered</span>
            </div>
            <div>
              <strong>
                {game.progress.compared ? '01' : '00'}
                <small>/01</small>
              </strong>
              <span>Parallel connection</span>
            </div>
          </div>
          <div className="nx-expedition-actions">
            <button
              className="nx-launch-sequence"
              aria-label="Launch sequence"
              disabled={!game.stats.complete}
              onClick={launch}
            >
              <Rocket size={18} aria-hidden="true" />
              <span>
                {game.stats.complete
                  ? 'Engage launch sequence'
                  : 'Launch sequence locked'}
              </span>
              {game.stats.complete ? (
                <ArrowRight size={17} aria-hidden="true" />
              ) : (
                <span className="nx-quest-count">
                  {game.stats.objectivesComplete}/{game.stats.objectivesTotal}
                </span>
              )}
            </button>
            <span>
              {game.stats.complete
                ? 'A reward for following your curiosity.'
                : 'Optional challenge. Every website is already open.'}
            </span>
          </div>
        </section>
        <section className="nx-directory" aria-labelledby="nx-directory-title">
          <div className="nx-directory-heading">
            <div>
              <p className="nx-eyebrow">The remaining coordinates</p>
              <h2 id="nx-directory-title">Every world stays open.</h2>
              <p>
                Your selected world is above. These are the other{' '}
                {versions.length - 1} interpretations.
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
              Different dimensions.
              <br />
              <span>The same source.</span>
            </h2>
            <p>
              Every world contains the complete portfolio, articles, experience,
              music, and contact details. Portal windows use real captures.
              Enter any edition for the full interactive site.
            </p>
          </div>
          <a href={profile.social.github} target="_blank" rel="noreferrer">
            <Github size={17} aria-hidden="true" />
            Follow the source <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </section>
      </main>
      <footer className="nx-footer">
        <span>{profile.copyright}</span>
        <span>
          {game.persistent
            ? 'Expedition saved on this device only'
            : 'Expedition progress is session-only'}
        </span>
        <a href="https://mithawala.com" target="_blank" rel="noreferrer">
          Original site <ArrowUpRight size={14} aria-hidden="true" />
        </a>
        <a href={`mailto:${profile.about.email}`}>
          Open a channel <ArrowUpRight size={14} aria-hidden="true" />
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
      {missionOpen && (
        <ExpeditionLog
          progress={game.progress}
          stats={game.stats}
          persistent={game.persistent}
          notice={game.notice}
          onScan={selectWorld}
          onCollect={collectSignal}
          onReset={resetExpedition}
          onClose={() => setMissionOpen(false)}
        />
      )}
    </div>
  )
}
