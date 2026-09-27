import { useEffect, useId, useRef, useState } from 'react'
import { PortalSceneController } from './portal-scene.mjs'
import './PortalScene.css'

const EMPTY = []

export default function PortalScene({
  versions,
  activeId,
  viewport = 'desktop',
  paused = false,
  signals = EMPTY,
  collectedIds = EMPTY,
  scannedIds = EMPTY,
  complete = false,
  launchId = 0,
  onSelect,
  onCollect,
  onStatusChange,
}) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const tooltipRef = useRef(null)
  const controllerRef = useRef(null)
  const statusRef = useRef(null)
  const optionsRef = useRef(null)
  const instructionsId = useId()
  const [sceneState, setSceneState] = useState({
    status: 'loading',
    firstFrame: false,
    message: '',
  })
  const [failedPreview, setFailedPreview] = useState('')

  optionsRef.current = {
    versions,
    activeId,
    viewport,
    paused,
    signals,
    collectedIds,
    scannedIds,
    complete,
    launchId,
    onSelect,
    onCollect,
    onStatusChange,
  }

  useEffect(() => {
    const controller = new PortalSceneController({
      host: hostRef.current,
      canvas: canvasRef.current,
      tooltip: tooltipRef.current,
      options: optionsRef.current,
      report: (status, firstFrame, message = '') => {
        setSceneState({ status, firstFrame, message })
        if (statusRef.current !== status) {
          statusRef.current = status
          optionsRef.current.onStatusChange?.(status)
        }
      },
    })
    controllerRef.current = controller
    controller.start()
    return () => {
      controllerRef.current = null
      controller.dispose()
    }
  }, [])

  useEffect(() => {
    controllerRef.current?.update(optionsRef.current)
  }, [
    versions,
    activeId,
    viewport,
    paused,
    signals,
    collectedIds,
    scannedIds,
    complete,
    launchId,
    onSelect,
    onCollect,
    onStatusChange,
  ])

  const active =
    versions.find((version) => version.id === activeId) || versions[0]
  const preview =
    viewport === 'mobile' ? active?.mobilePreview : active?.preview
  const fallback = sceneState.status === 'fallback'

  return (
    <div
      ref={hostRef}
      className="nx-portal-scene"
      data-scene-status={sceneState.status}
      data-rendering={
        sceneState.status === 'loading' && !sceneState.firstFrame
          ? ''
          : undefined
      }
      data-active-portal={active?.id || ''}
      data-scene-motion="paused"
      data-launch-state="idle"
    >
      <canvas
        ref={canvasRef}
        className="nx-portal-canvas"
        role="group"
        tabIndex={fallback ? -1 : 0}
        aria-label="Explore editions in 3D"
        aria-describedby={instructionsId}
        aria-hidden={fallback ? true : undefined}
      />
      <p className="nx-scene-sr-only" id={instructionsId}>
        Drag horizontally or use the left and right arrow keys to select an
        edition. Select a glowing signal to collect it. Edition links and
        equivalent exploration controls are available outside the scene.
      </p>
      <div
        ref={tooltipRef}
        className="nx-scene-tooltip"
        aria-hidden="true"
        hidden
      />
      {sceneState.status === 'loading' && (
        <div className="nx-scene-loading" role="status">
          <span aria-hidden="true" />
          Establishing portal connections
        </div>
      )}
      {fallback && (
        <div className="nx-scene-fallback" data-preview-viewport={viewport}>
          <div className="nx-scene-fallback-orbits" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="nx-scene-fallback-stage">
            <div className="nx-scene-fallback-ghost" aria-hidden="true" />
            <figure className="nx-scene-fallback-window">
              <figcaption>
                <span aria-hidden="true">◈</span>
                {active?.model || 'Edition Nexus'}
              </figcaption>
              {preview && failedPreview !== preview ? (
                <img
                  src={preview}
                  alt={`${active.model} ${viewport} edition preview`}
                  onError={() => setFailedPreview(preview)}
                />
              ) : (
                <div className="nx-scene-fallback-symbol" aria-hidden="true">
                  <span>◈</span>
                  <small>YOUR NEXT WORLD AWAITS</small>
                </div>
              )}
              <div className="nx-scene-fallback-edge" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </figure>
            <div className="nx-scene-fallback-ghost" aria-hidden="true" />
          </div>
          <p className="nx-scene-fallback-message" role="status">
            <strong>Preview mode</strong>
            {sceneState.message ||
              '3D graphics are unavailable in this browser.'}{' '}
            Edition links remain available.
          </p>
        </div>
      )}
    </div>
  )
}
