import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  SCULPTURE_VARIANTS,
  SCULPTURE_VIEW,
  createSculptureGeometry,
  createSculptureIllustration,
  getSculpturePose,
  sculptureProjection,
  sculptureRotation,
} from './geometry.mjs'
import './CuriosityScene.css'

const STUDY_NAMES = {
  weave: 'an interwoven trefoil in orange-red enamel',
  orbit: 'two interlinked enamel rings',
  bloom: 'a five-lobed enamel rosette',
}

const VERTEX_SHADER = `
  precision highp float;
  attribute vec3 a_position;
  attribute vec3 a_normal;
  uniform mat3 u_rotation;
  uniform mat4 u_projection;
  uniform mediump float u_distance;
  varying mediump vec3 v_position;
  varying mediump vec3 v_normal;

  void main() {
    v_position = u_rotation * a_position;
    v_normal = u_rotation * a_normal;
    gl_Position = u_projection * vec4(
      v_position - vec3(0.0, 0.0, u_distance), 1.0
    );
  }
`

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform float u_dark;
  uniform mediump float u_distance;
  varying mediump vec3 v_position;
  varying mediump vec3 v_normal;

  void main() {
    vec3 normal = normalize(v_normal);
    vec3 eye = normalize(vec3(0.0, 0.0, u_distance) - v_position);
    vec3 key = normalize(vec3(-3.8, 5.5, 6.5));
    vec3 fill = normalize(vec3(4.0, 0.7, 3.0));
    vec3 rim = normalize(vec3(1.0, 2.5, -4.0));
    float diffuse = max(dot(normal, key), 0.0);
    float depth = mix(0.76, 1.0, smoothstep(-1.5, 1.5, v_position.z));
    vec3 enamel = vec3(0.90, 0.071, 0.024);
    vec3 color = enamel * (
      0.26 + 0.79 * diffuse + 0.18 * max(dot(normal, fill), 0.0)
    ) * depth;
    color += vec3(0.12, 0.055, 0.018)
      * pow(max(dot(normal, rim), 0.0), 3.0)
      * mix(0.55, 0.85, u_dark);

    vec3 reflection = reflect(-eye, normal);
    vec2 box = (reflection.xy - vec2(-0.32, 0.58)) / vec2(0.42, 0.34);
    vec2 squared = box * box;
    float softbox = exp(-0.9 * (squared.x * squared.x + squared.y * squared.y))
      * smoothstep(0.25, 0.62, reflection.z);
    float specular = max(dot(normal, normalize(key + eye)), 0.0);
    float ribbonDistance = reflection.x - 0.72;
    float ribbon = exp(-130.0 * ribbonDistance * ribbonDistance)
      * smoothstep(0.2, 0.9, reflection.z);
    float coat = 0.68 * softbox + 0.15 * pow(specular, 22.0)
      + 0.2 * pow(specular, 96.0) + 0.12 * ribbon;
    color = mix(color, vec3(1.0, 0.86, 0.61), clamp(coat, 0.0, 0.94));

    float edge = pow(1.0 - max(dot(normal, eye), 0.0), 3.0);
    color += vec3(0.095, 0.043, 0.021) * edge * (diffuse + 0.16);
    color += 0.002 * sin(v_position.x * 110.0) * sin(v_position.y * 95.0);
    color *= mix(0.98, 1.06, u_dark);
    gl_FragColor = vec4(pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
  }
`

function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
  })
  if (!gl) throw new Error('WebGL is unavailable on this device.')

  const shaders = []
  const buffers = []
  let program = null
  let disposed = false
  let indexCount = 0

  function dispose() {
    if (disposed) return
    disposed = true
    if (!gl.isContextLost()) {
      for (const buffer of buffers) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
      for (const shader of shaders) gl.deleteShader(shader)
    }
  }

  function shader(type, source) {
    const handle = gl.createShader(type)
    if (!handle)
      throw new Error('The graphics device could not allocate a shader.')
    shaders.push(handle)
    gl.shaderSource(handle, source)
    gl.compileShader(handle)
    if (!gl.getShaderParameter(handle, gl.COMPILE_STATUS)) {
      throw new Error(`Sculpture shader failed: ${gl.getShaderInfoLog(handle)}`)
    }
    return handle
  }

  function buffer() {
    const handle = gl.createBuffer()
    if (!handle)
      throw new Error('The graphics device could not allocate a mesh.')
    buffers.push(handle)
    return handle
  }

  function checkGraphics() {
    if (gl.isContextLost()) throw new Error('The graphics context was lost.')
    const error = gl.getError()
    if (error !== gl.NO_ERROR) {
      throw new Error(`Sculpture graphics error: 0x${error.toString(16)}.`)
    }
  }

  try {
    program = gl.createProgram()
    if (!program)
      throw new Error('The graphics device could not allocate a program.')
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX_SHADER))
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(
        `Sculpture program failed: ${gl.getProgramInfoLog(program)}`,
      )
    }

    const positionAttribute = gl.getAttribLocation(program, 'a_position')
    const normalAttribute = gl.getAttribLocation(program, 'a_normal')
    if (positionAttribute < 0 || normalAttribute < 0) {
      throw new Error('The sculpture shader is missing its mesh attributes.')
    }
    const uniforms = Object.fromEntries(
      ['u_rotation', 'u_projection', 'u_distance', 'u_dark'].map((name) => {
        const location = gl.getUniformLocation(program, name)
        if (location === null)
          throw new Error(`Missing sculpture uniform: ${name}`)
        return [name, location]
      }),
    )
    const positionBuffer = buffer()
    const normalBuffer = buffer()
    const indexBuffer = buffer()
    gl.useProgram(program)
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.frontFace(gl.CCW)
    gl.clearColor(0, 0, 0, 0)
    gl.clearDepth(1)

    return {
      setGeometry(geometry) {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(positionAttribute)
        gl.vertexAttribPointer(positionAttribute, 3, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(normalAttribute)
        gl.vertexAttribPointer(normalAttribute, 3, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW)
        indexCount = geometry.indices.length
        checkGraphics()
      },
      draw({ width, height, ratio, pose, mode, firstFrame }) {
        if (disposed || !indexCount) {
          throw new Error('The sculpture renderer has no drawable mesh.')
        }
        const pixelWidth = Math.max(1, Math.round(width * ratio))
        const pixelHeight = Math.max(1, Math.round(height * ratio))
        const resized =
          canvas.width !== pixelWidth || canvas.height !== pixelHeight
        if (resized) {
          canvas.width = pixelWidth
          canvas.height = pixelHeight
        }
        gl.viewport(0, 0, pixelWidth, pixelHeight)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        gl.useProgram(program)
        gl.uniformMatrix3fv(uniforms.u_rotation, false, sculptureRotation(pose))
        gl.uniformMatrix4fv(
          uniforms.u_projection,
          false,
          sculptureProjection(width / height),
        )
        gl.uniform1f(uniforms.u_distance, SCULPTURE_VIEW.distance)
        gl.uniform1f(uniforms.u_dark, mode === 'dark' ? 1 : 0)
        gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0)
        if (firstFrame) gl.finish()
        if (firstFrame || resized) checkGraphics()
      },
      dispose,
    }
  } catch (error) {
    dispose()
    throw error
  }
}

function SculptureIllustration({ variant, pose, id }) {
  const paths = useMemo(
    () => createSculptureIllustration(variant, pose),
    [variant, pose],
  )
  return (
    <svg
      className="ca-scene-illustration"
      viewBox="0 0 600 480"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={`${id}-enamel`}
          gradientUnits="userSpaceOnUse"
          x1="140"
          y1="60"
          x2="420"
          y2="420"
        >
          <stop offset="0" stopColor="#ffe6b0" />
          <stop offset="0.2" stopColor="#ff9a5b" />
          <stop offset="0.43" stopColor="#f4512b" />
          <stop offset="0.72" stopColor="#d53019" />
          <stop offset="1" stopColor="#862719" />
        </linearGradient>
        <linearGradient
          id={`${id}-glaze`}
          gradientUnits="userSpaceOnUse"
          x1="130"
          y1="80"
          x2="430"
          y2="350"
        >
          <stop offset="0" stopColor="#fff2d5" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#ffe4ba" stopOpacity="0.48" />
          <stop offset="1" stopColor="#ff9f6a" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {paths.map((segment) => (
          <g key={segment.id}>
            <path
              d={segment.path}
              stroke={`url(#${id}-enamel)`}
              strokeWidth={segment.width}
            />
            <path
              d={segment.path}
              stroke="#752318"
              strokeOpacity={segment.shade}
              strokeWidth={segment.width}
            />
            <path
              d={segment.path}
              stroke={`url(#${id}-glaze)`}
              strokeWidth={segment.width * 0.23}
              transform="translate(-2 -3)"
            />
          </g>
        ))}
      </g>
    </svg>
  )
}

function RotationIcon({ direction }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={
          direction === 'right' ? 'translate(24 0) scale(-1 1)' : undefined
        }
      >
        {direction === 'reset' ? (
          <>
            <path d="M5 7a8 8 0 1 1-1 8M5 3v5h5" />
            <circle cx="12" cy="12" r="2" />
          </>
        ) : (
          <>
            <path d="M7 8 3 12l4 4M3 12h12" />
            <path d="M11 5c6 0 10 3 10 7s-4 7-10 7" />
          </>
        )}
      </g>
    </svg>
  )
}

/**
 * @param {{ mode?: 'light' | 'dark', paused?: boolean, variant?: 'weave' | 'orbit' | 'bloom' }} props
 */
export default function CuriosityScene({
  mode = 'light',
  paused = false,
  variant = 'weave',
}) {
  const knownVariant = SCULPTURE_VARIANTS.includes(variant)
  const illustrationVariant = knownVariant ? variant : 'weave'
  const id = `ca-scene-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const controllerRef = useRef(null)
  const pointerRef = useRef(null)
  const settingsRef = useRef({ mode, paused, variant })
  const poseRef = useRef(getSculpturePose(illustrationVariant))
  const [pose, setPose] = useState(() => getSculpturePose(illustrationVariant))
  const [dragging, setDragging] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [scene, setScene] = useState({
    status: 'loading',
    message: 'Preparing the 3D sculpture. An illustrated study is visible.',
  })

  useLayoutEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    const canvas = canvasRef.current
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduced = preference.matches
    let disposed = false
    let renderer = null
    let frame = null
    let firstFrame = true
    let elapsed = 0
    let lastTime = null
    let width = 0
    let height = 0
    let inView = false
    let contextLost = false

    function measure() {
      width = stage.clientWidth
      height = stage.clientHeight
      const bounds = root.getBoundingClientRect()
      inView =
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.bottom > 0 &&
        bounds.top < window.innerHeight &&
        bounds.right > 0 &&
        bounds.left < window.innerWidth
    }

    function stopFrame() {
      if (frame !== null) window.cancelAnimationFrame(frame)
      frame = null
      lastTime = null
    }

    function canDraw() {
      return (
        !disposed &&
        renderer !== null &&
        inView &&
        !document.hidden &&
        width > 0 &&
        height > 0
      )
    }

    function canAnimate() {
      return (
        canDraw() &&
        !reduced &&
        !settingsRef.current.paused &&
        !pointerRef.current
      )
    }

    function fallback(error, message) {
      stopFrame()
      renderer?.dispose()
      renderer = null
      if (disposed) return
      setPose({ ...poseRef.current })
      setScene({ status: 'fallback', message })
      console.warn(`[Curiosity Atlas] ${message}`, error)
    }

    function draw() {
      if (!canDraw()) return
      try {
        renderer.draw({
          width,
          height,
          ratio: Math.min(2, window.devicePixelRatio || 1),
          pose: {
            pitch: poseRef.current.pitch + Math.sin(elapsed * 0.31) * 0.065,
            yaw: poseRef.current.yaw + Math.sin(elapsed * 0.23) * 0.18,
            roll: poseRef.current.roll + Math.sin(elapsed * 0.19) * 0.025,
          },
          mode: settingsRef.current.mode,
          firstFrame,
        })
        if (firstFrame) {
          firstFrame = false
          setScene({
            status: 'ready',
            message:
              'Live 3D sculpture. Drag or use the rotation controls to explore.',
          })
        }
      } catch (error) {
        fallback(
          error,
          '3D is unavailable. The illustrated study remains interactive.',
        )
      }
    }

    function tick(time) {
      frame = null
      if (!canAnimate()) return
      if (lastTime !== null) elapsed += Math.min((time - lastTime) / 1000, 0.05)
      lastTime = time
      draw()
      if (canAnimate()) frame = window.requestAnimationFrame(tick)
    }

    function reconcile(redraw = true) {
      stopFrame()
      if (redraw) draw()
      if (canAnimate()) frame = window.requestAnimationFrame(tick)
    }

    function initialize() {
      renderer?.dispose()
      renderer = null
      firstFrame = true
      setScene({
        status: 'loading',
        message: 'Preparing the 3D sculpture. An illustrated study is visible.',
      })
      try {
        const geometry = createSculptureGeometry(settingsRef.current.variant)
        renderer = createRenderer(canvas)
        renderer.setGeometry(geometry)
        measure()
        reconcile()
      } catch (error) {
        fallback(
          error,
          SCULPTURE_VARIANTS.includes(settingsRef.current.variant)
            ? '3D is unavailable. The illustrated study remains interactive.'
            : 'That study is unavailable. An illustrated weave is shown instead.',
        )
      }
    }

    function resize() {
      measure()
      reconcile()
    }

    function visibilityChanged() {
      measure()
      reconcile()
    }

    function preferenceChanged(event) {
      reduced = event.matches
      setReducedMotion(reduced)
      if (reduced) elapsed = 0
      reconcile()
    }

    function lost(event) {
      event.preventDefault()
      contextLost = true
      fallback(
        new Error('The WebGL context was lost.'),
        'Graphics interrupted. The illustrated study remains interactive.',
      )
    }

    function restored() {
      if (disposed) return
      contextLost = false
      initialize()
    }

    const controller = {
      configure(next) {
        const previous = settingsRef.current
        settingsRef.current = next
        if (next.variant !== previous.variant) {
          const safeVariant = SCULPTURE_VARIANTS.includes(next.variant)
            ? next.variant
            : 'weave'
          poseRef.current = getSculpturePose(safeVariant)
          setPose({ ...poseRef.current })
          elapsed = 0
          if (renderer) {
            try {
              setScene({
                status: 'loading',
                message:
                  'Preparing the new 3D study. An illustration is visible.',
              })
              renderer.setGeometry(createSculptureGeometry(next.variant))
              firstFrame = true
            } catch (error) {
              fallback(
                error,
                'The requested 3D study is unavailable. Its illustration is shown.',
              )
            }
          } else if (!contextLost) {
            initialize()
            return
          }
        }
        if (
          next.mode !== previous.mode ||
          next.paused !== previous.paused ||
          next.variant !== previous.variant
        ) {
          reconcile()
        }
      },
      invalidate(resetMotion = true) {
        if (resetMotion) elapsed = 0
        reconcile()
      },
      interactionStarted() {
        reconcile(false)
      },
    }
    controllerRef.current = controller

    const resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
    const intersectionObserver =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            ([entry]) => {
              inView = entry.isIntersecting
              reconcile()
            },
            { threshold: 0 },
          )
        : null
    resizeObserver?.observe(stage)
    intersectionObserver?.observe(root)
    if (!intersectionObserver)
      window.addEventListener('scroll', resize, { passive: true })
    window.addEventListener('resize', resize, { passive: true })
    document.addEventListener('visibilitychange', visibilityChanged)
    preference.addEventListener('change', preferenceChanged)
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    setReducedMotion(reduced)
    initialize()

    return () => {
      disposed = true
      stopFrame()
      resizeObserver?.disconnect()
      intersectionObserver?.disconnect()
      window.removeEventListener('scroll', resize)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', visibilityChanged)
      preference.removeEventListener('change', preferenceChanged)
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
      const pointer = pointerRef.current
      pointerRef.current = null
      if (pointer && stage.hasPointerCapture(pointer.id)) {
        stage.releasePointerCapture(pointer.id)
      }
      renderer?.dispose()
      renderer = null
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [])

  useLayoutEffect(() => {
    controllerRef.current?.configure({ mode, paused, variant })
  }, [mode, paused, variant])

  function applyPose(next) {
    const bounded = {
      ...next,
      pitch: Math.max(-1.15, Math.min(1.15, next.pitch)),
      yaw: Math.atan2(Math.sin(next.yaw), Math.cos(next.yaw)),
    }
    poseRef.current = bounded
    setPose(bounded)
    controllerRef.current?.invalidate()
  }

  function rotate(yaw, pitch = 0) {
    applyPose({
      ...poseRef.current,
      yaw: poseRef.current.yaw + yaw,
      pitch: poseRef.current.pitch + pitch,
    })
  }

  function reset() {
    applyPose(getSculpturePose(illustrationVariant))
  }

  function endDrag(event) {
    const pointer = pointerRef.current
    if (
      !pointer ||
      (event?.pointerId !== undefined && event.pointerId !== pointer.id)
    ) {
      return
    }
    pointerRef.current = null
    const stage = stageRef.current
    if (stage.hasPointerCapture(pointer.id))
      stage.releasePointerCapture(pointer.id)
    setDragging(false)
    controllerRef.current?.invalidate(false)
  }

  function startDrag(event) {
    if (!event.isPrimary || event.button !== 0 || pointerRef.current) return
    const touch = event.pointerType === 'touch'
    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      locked: !touch,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    if (!touch) event.currentTarget.focus({ preventScroll: true })
    setDragging(!touch)
    controllerRef.current?.interactionStarted()
  }

  function drag(event) {
    const pointer = pointerRef.current
    if (!pointer || pointer.id !== event.pointerId) return
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      endDrag(event)
      return
    }
    if (!pointer.locked) {
      const horizontal = Math.abs(event.clientX - pointer.startX)
      const vertical = Math.abs(event.clientY - pointer.startY)
      if (vertical > 6 && vertical > horizontal) {
        endDrag(event)
        return
      }
      if (horizontal < 6 || horizontal <= vertical) return
      pointer.locked = true
      setDragging(true)
    }
    rotate(
      (event.clientX - pointer.lastX) * 0.008,
      (event.clientY - pointer.lastY) * 0.006,
    )
    pointer.lastX = event.clientX
    pointer.lastY = event.clientY
  }

  function keyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const actions = {
      ArrowLeft: () => rotate(-0.2),
      ArrowRight: () => rotate(0.2),
      ArrowUp: () => rotate(0, -0.16),
      ArrowDown: () => rotate(0, 0.16),
      Home: reset,
    }
    if (actions[event.key]) {
      event.preventDefault()
      actions[event.key]()
    }
  }

  return (
    <div
      ref={rootRef}
      className="ca-scene"
      role="group"
      aria-label={`Curiosity Atlas sculpture: ${STUDY_NAMES[illustrationVariant]}`}
      aria-describedby={`${id}-help ${id}-status`}
      data-scene-status={scene.status}
      data-rendering={scene.status === 'loading' ? '' : undefined}
      data-scene-mode={mode}
      data-scene-variant={variant}
      data-scene-paused={paused ? 'true' : 'false'}
      data-scene-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-scene-yaw={pose.yaw.toFixed(3)}
      data-scene-pitch={pose.pitch.toFixed(3)}
      data-scene-dragging={dragging ? 'true' : 'false'}
    >
      <div
        className="ca-scene-stage"
        ref={stageRef}
        role="group"
        aria-label="Rotate the sculpture"
        aria-describedby={`${id}-help`}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home"
        tabIndex={0}
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onBlur={endDrag}
        onKeyDown={keyDown}
      >
        <svg
          className="ca-scene-orbits"
          viewBox="0 0 600 480"
          aria-hidden="true"
          focusable="false"
        >
          <g fill="none" stroke="currentColor" strokeWidth="0.8">
            <ellipse
              cx="300"
              cy="240"
              rx="253"
              ry="163"
              transform="rotate(-18 300 240)"
            />
            <ellipse
              cx="300"
              cy="240"
              rx="237"
              ry="160"
              transform="rotate(49 300 240)"
              strokeDasharray="2 8"
            />
            <path d="M35 240h28m474 0h28M300 27v22m0 382v22" />
            <path d="M61 215v50m478-50v50M275 51h50m-50 378h50" opacity="0.5" />
          </g>
          <g fill="currentColor">
            <circle cx="61" cy="240" r="2.5" />
            <circle cx="539" cy="240" r="2.5" />
          </g>
        </svg>
        <div className="ca-scene-shadow" aria-hidden="true" />
        <canvas
          className="ca-scene-canvas"
          ref={canvasRef}
          aria-hidden="true"
        />
        {scene.status !== 'ready' && (
          <SculptureIllustration
            variant={illustrationVariant}
            pose={pose}
            id={id}
          />
        )}
        <span className="ca-scene-index" aria-hidden="true">
          Fig.{' '}
          {String(SCULPTURE_VARIANTS.indexOf(illustrationVariant) + 1).padStart(
            2,
            '0',
          )}
          <span>{illustrationVariant}</span>
        </span>
      </div>
      <p id={`${id}-help`} className="ca-scene-visually-hidden">
        Drag horizontally to turn the sculpture; vertical touch gestures scroll
        the page. Use the arrow keys to rotate and Home to reset, or use the
        three buttons. Rotation controls also work with the illustrated
        fallback.
      </p>
      <p
        id={`${id}-status`}
        className={`ca-scene-status${scene.status === 'fallback' ? '' : ' ca-scene-visually-hidden'}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {scene.message}
      </p>
      <div
        className="ca-scene-controls"
        role="group"
        aria-label="Sculpture rotation controls"
      >
        <span className="ca-scene-hint" aria-hidden="true">
          Drag / arrows
        </span>
        <button
          className="ca-scene-control"
          type="button"
          aria-label="Rotate sculpture left"
          onClick={() => rotate(-0.3)}
        >
          <RotationIcon direction="left" />
        </button>
        <button
          className="ca-scene-control"
          type="button"
          aria-label="Rotate sculpture right"
          onClick={() => rotate(0.3)}
        >
          <RotationIcon direction="right" />
        </button>
        <button
          className="ca-scene-control"
          type="button"
          aria-label="Reset sculpture"
          onClick={reset}
        >
          <RotationIcon direction="reset" />
        </button>
      </div>
    </div>
  )
}
