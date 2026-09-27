import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const TAU = Math.PI * 2
const AUTO_SECONDS_PER_EDITION = 8
const FLOOR = -2.5
const SCENE_OWNER = Symbol('modelEditionsScene')
const FOCUS = new THREE.Vector3(0, 0.85, 1.1)
const ACCENT = new THREE.Color('#ff9800')
const DIM = new THREE.Color('#453016')
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const smoothstep = (a, b, value) => {
  const t = clamp((value - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

export function wrapIndex(index, count) {
  return count > 0 ? ((index % count) + count) % count : 0
}

export function nearestOrbitTarget(current, index, count) {
  return count > 0 ? index + Math.round((current - index) / count) * count : 0
}

export function portalDimensions(viewport = 'desktop') {
  const mobile = viewport === 'mobile'
  const width = mobile ? 2.48 : 5.4
  const height = mobile ? (width * 844) / 390 : 3.75
  return {
    width,
    height,
    outerWidth: width + 0.48,
    outerHeight: height + 0.6,
  }
}

export function portalPose(index, orbit, count, viewport, narrow = false) {
  const delta = nearestOrbitTarget(orbit, index, count) - orbit
  const step = Math.min(0.9, TAU / Math.max(7, count))
  const angle = delta * step
  const radius = viewport === 'mobile' ? (narrow ? 4.3 : 5.4) : narrow ? 5.7 : 7
  const visibility =
    count > 2 && count < 7
      ? 1 - smoothstep(count / 2 - 0.3, count / 2, Math.abs(delta))
      : 1
  return {
    x: Math.sin(angle) * radius,
    y: FOCUS.y - Math.min(Math.abs(delta), 3) * 0.055,
    z: FOCUS.z + (Math.cos(angle) - 1) * radius,
    yaw: -Math.sin(angle) * 0.72,
    scale:
      (1 - Math.min(Math.abs(delta), 3) * 0.055) * (0.65 + 0.35 * visibility),
    focus: Math.exp(-delta * delta * 2),
    visibility,
    radius,
  }
}

export function sceneFraming(width, height, viewport = 'desktop') {
  const w = Math.max(width, 1)
  const h = Math.max(height, 1)
  const narrow = w < 700
  const top = Math.min(narrow ? 210 : 220, h * 0.28)
  const bottom = Math.min(narrow ? 220 : 215, h * 0.3)
  const stageHeight = Math.max(100, h - top - bottom)
  const dimensions = portalDimensions(viewport)
  const fov = 42
  const unitHeight = 2 * Math.tan((fov * Math.PI) / 360)
  const availableWidth = w * (narrow ? 0.84 : w < 1100 ? 0.59 : 0.49)
  const availableHeight = stageHeight * 0.82
  const distance =
    Math.max(
      (dimensions.outerWidth * h) / (unitHeight * availableWidth),
      (dimensions.outerHeight * h) / (unitHeight * availableHeight),
    ) * 1.035
  const pixelsPerUnit = h / (unitHeight * distance)
  return {
    width: w,
    height: h,
    narrow,
    top,
    bottom,
    stageHeight,
    centerY: top + stageHeight * 0.45,
    distance,
    fov,
    pixelsPerUnit,
    portalWidth: dimensions.outerWidth * pixelsPerUnit,
    portalHeight: dimensions.outerHeight * pixelsPerUnit,
  }
}

class Resources {
  constructor() {
    this.items = new Set()
  }

  own(item) {
    this.items.add(item)
    return item
  }

  dispose() {
    for (const item of this.items) item.dispose()
    this.items.clear()
  }
}

function randomSequence(seed = 19) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function chamferPoints(width, height, cut = 0.15) {
  const x = width / 2
  const y = height / 2
  return [
    [-x + cut, -y],
    [x - cut, -y],
    [x, -y + cut],
    [x, y - cut],
    [x - cut, y],
    [-x + cut, y],
    [-x, y - cut],
    [-x, -y + cut],
  ]
}

function panelShape(width, height, hole) {
  const shape = new THREE.Shape(
    chamferPoints(width, height).map(([x, y]) => new THREE.Vector2(x, y)),
  )
  shape.closePath()
  if (hole) {
    const points = chamferPoints(hole.width, hole.height, 0.035)
      .reverse()
      .map(([x, y]) => new THREE.Vector2(x, y + 0.06))
    const path = new THREE.Path(points)
    path.closePath()
    shape.holes.push(path)
  }
  return shape
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context)
    throw new Error('A 2D context is required to prepare portal textures.')
  draw(context, canvas)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function radialTexture() {
  return canvasTexture(128, 128, (context) => {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.12, 'rgba(255,255,255,.62)')
    gradient.addColorStop(0.42, 'rgba(255,255,255,.14)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 128, 128)
  })
}

const planeVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

function glowMaterial(width, height) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: new THREE.Vector2(width + 1.4, height + 1.4) },
      uHalf: { value: new THREE.Vector2(width / 2, height / 2) },
      uColor: { value: ACCENT.clone() },
      uOpacity: { value: 0.4 },
    },
    vertexShader: planeVertex,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec2 uSize;
      uniform vec2 uHalf;
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        vec2 q = abs((vUv - 0.5) * uSize) - uHalf;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
        float glow = exp(-abs(d) * 14.0) * uOpacity;
        gl_FragColor = vec4(uColor, glow);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
}

function reflectionMaterial(texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uOpacity: { value: 0.13 },
    },
    vertexShader: planeVertex,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uMap;
      uniform float uOpacity;
      void main() {
        vec4 color = texture2D(uMap, vec2(vUv.x, 1.0 - vUv.y));
        float edge = smoothstep(0.0, 0.08, vUv.x) *
          smoothstep(0.0, 0.08, 1.0 - vUv.x);
        float fade = pow(vUv.y, 2.6) * edge;
        gl_FragColor = vec4(color.rgb * vec3(0.85), uOpacity * fade);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
}

function suspensionMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: ACCENT.clone() },
      uOpacity: { value: 0.08 },
    },
    vertexShader: planeVertex,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        float side = pow(max(0.0, 1.0 - abs(vUv.x - 0.5) * 2.0), 2.5);
        float shaft = side * pow(vUv.y, 1.5) * uOpacity;
        gl_FragColor = vec4(uColor, shaft);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  })
}

export class PortalSceneController {
  constructor({ host, canvas, tooltip, options, report }) {
    Object.assign(this, { host, canvas, tooltip, options, report })
    this.resources = new Resources()
    this.portalResources = new Resources()
    this.cachedPortalSets = new Map()
    this.previewTextures = new Set()
    this.pendingImages = new Set()
    this.cleanups = []
    this.portals = []
    this.pickTargets = []
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.projected = new THREE.Vector3()
    this.worldPoint = new THREE.Vector3()
    this.clock = 0
    this.orbit = 0
    this.targetOrbit = 0
    this.centering = false
    this.keyboardFocused = false
    this.pendingAutoIds = new Set()
    this.lastAutoTime = null
    this.lastFrameTime = 0
    this.lastPointsTime = -Infinity
    this.raf = 0
    this.textureGeneration = 0
    this.pendingCount = 0
    this.firstFrame = false
    this.renderScale = 1
    this.slowFrames = 0
    this.disposed = false
    this.failed = false
    this.inView = true
    this.hasSize = false
    this.status = ''
  }

  start() {
    this.canvas[SCENE_OWNER] = this
    this.setStatus('loading')
    try {
      this.installObservers()
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
      })
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping
      this.renderer.toneMappingExposure = 1.05
      this.renderer.setClearColor('#050b14', 1)
      this.renderer.debug.onShaderError = (gl, program) => {
        throw new Error(
          `Portal shader compilation failed: ${gl.getProgramInfoLog(program)}`,
        )
      }
      this.scene = new THREE.Scene()
      this.scene.fog = new THREE.FogExp2('#050b14', 0.016)
      this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150)
      this.placeholder = this.resources.own(
        canvasTexture(128, 128, (context) => {
          context.fillStyle = '#0b1c2a'
          context.fillRect(0, 0, 128, 128)
          context.strokeStyle = '#49351c'
          context.lineWidth = 1
          for (let x = 0; x < 128; x += 16) {
            context.beginPath()
            context.moveTo(x, 0)
            context.lineTo(x, 128)
            context.moveTo(0, x)
            context.lineTo(128, x)
            context.stroke()
          }
        }),
      )
      this.radial = this.resources.own(radialTexture())
      this.buildStation()
      this.update(this.options)
    } catch (error) {
      this.fail('3D graphics could not start in this browser.', error)
    }
  }

  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options)
    this.cleanups.push(() => target.removeEventListener(type, handler, options))
  }

  installObservers() {
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.reduced = this.motionQuery.matches
    this.listen(this.motionQuery, 'change', (event) => {
      this.reduced = event.matches
      this.syncMotion()
    })
    this.listen(document, 'visibilitychange', () => this.syncMotion())
    this.listen(this.canvas, 'webglcontextlost', (event) => {
      event.preventDefault()
      this.fail(
        'The browser released the 3D graphics context.',
        new Error('WebGL context lost.'),
      )
    })
    this.listen(this.canvas, 'pointerdown', (event) => this.pointerDown(event))
    this.listen(this.canvas, 'pointermove', (event) => this.pointerMove(event))
    this.listen(this.canvas, 'pointerup', (event) => this.pointerUp(event))
    this.listen(this.canvas, 'pointercancel', () => this.cancelGesture())
    this.listen(this.canvas, 'lostpointercapture', () => this.cancelGesture())
    this.listen(this.canvas, 'pointerleave', () => this.hideTooltip())
    this.listen(this.canvas, 'keydown', (event) => this.keyDown(event))
    this.listen(this.canvas, 'focus', () => {
      this.keyboardFocused = this.canvas.matches(':focus-visible')
      this.syncMotion()
    })
    this.listen(this.canvas, 'blur', () => {
      this.keyboardFocused = false
      this.syncMotion()
    })

    const checkVisibility = () => {
      const rect = this.host.getBoundingClientRect()
      this.inView =
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
      this.syncMotion()
    }
    checkVisibility()
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          this.inView = entry.isIntersecting
          this.syncMotion()
        },
        { threshold: 0 },
      )
      this.intersectionObserver.observe(this.host)
    } else {
      this.listen(window, 'scroll', checkVisibility, { passive: true })
    }
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.measure())
      this.resizeObserver.observe(this.host)
    }
    this.listen(window, 'resize', () => {
      this.measure()
      if (!this.intersectionObserver) checkVisibility()
    })
  }

  buildStation() {
    const own = (resource) => this.resources.own(resource)
    const room = new RoomEnvironment()
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    try {
      const environment = own(
        pmrem.fromScene(room, 0.045, 0.1, 100, { size: 64 }),
      )
      this.scene.environment = environment.texture
      this.scene.environmentIntensity = 0.75
    } finally {
      room.dispose()
      pmrem.dispose()
    }

    this.scene.add(new THREE.HemisphereLight('#ffe1b0', '#030a12', 1.45))
    const key = new THREE.DirectionalLight('#fff0d8', 3.5)
    key.position.set(-5, 9, 8)
    this.scene.add(key)
    const fill = new THREE.PointLight(ACCENT, 36, 24, 2)
    fill.position.set(0, 4.4, 4)
    this.scene.add(fill)
    const amberLight = new THREE.PointLight('#ffd190', 18, 26, 2)
    amberLight.position.set(9, 3, -5)
    this.scene.add(amberLight)

    const metal = own(
      new THREE.MeshStandardMaterial({
        color: '#111f2d',
        metalness: 0.84,
        roughness: 0.32,
      }),
    )
    // Explicit maps preserve per-material intensity instead of inheriting the room's brightness.
    const deckMaterial = own(
      new THREE.MeshPhysicalMaterial({
        color: '#050e19',
        metalness: 0.94,
        roughness: 0.18,
        envMap: this.scene.environment,
        envMapIntensity: 0.14,
        clearcoat: 0.24,
        clearcoatRoughness: 0.16,
      }),
    )
    const deckEdgeMaterial = own(
      new THREE.MeshStandardMaterial({
        color: '#030811',
        metalness: 0.94,
        roughness: 0.24,
        envMap: this.scene.environment,
        envMapIntensity: 0.09,
      }),
    )
    const floor = new THREE.Mesh(
      own(new THREE.PlaneGeometry(150, 150)),
      own(
        new THREE.MeshStandardMaterial({
          color: '#040b14',
          metalness: 0.94,
          roughness: 0.21,
          envMap: this.scene.environment,
          envMapIntensity: 0.075,
        }),
      ),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = FLOOR - 0.24
    this.scene.add(floor)
    const dais = new THREE.Mesh(
      own(new THREE.CylinderGeometry(9.7, 9.9, 0.2, 96)),
      [deckEdgeMaterial, deckMaterial, deckEdgeMaterial],
    )
    dais.position.set(0, FLOOR - 0.1, -5)
    this.scene.add(dais)

    const circuitMaterial = own(
      new THREE.MeshBasicMaterial({
        color: ACCENT,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    this.orbitalTrack = new THREE.Group()
    for (const radius of [1, 1.035, 1.23]) {
      const ring = new THREE.Mesh(
        own(
          new THREE.TorusGeometry(
            radius,
            radius === 1 ? 0.0028 : 0.0012,
            5,
            180,
          ),
        ),
        circuitMaterial,
      )
      ring.rotation.x = -Math.PI / 2
      this.orbitalTrack.add(ring)
    }
    this.orbitalTrack.position.y = FLOOR + 0.014
    this.scene.add(this.orbitalTrack)

    const ticks = []
    for (let index = 0; index < 96; index += 1) {
      const angle = (index / 96) * TAU
      const inner = index % 4 === 0 ? 8.65 : 9.1
      ticks.push(
        Math.sin(angle) * inner,
        FLOOR + 0.013,
        Math.cos(angle) * inner - 5,
        Math.sin(angle) * 9.42,
        FLOOR + 0.013,
        Math.cos(angle) * 9.42 - 5,
      )
    }
    const tickGeometry = own(new THREE.BufferGeometry())
    tickGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(ticks, 3),
    )
    this.scene.add(
      new THREE.LineSegments(
        tickGeometry,
        own(
          new THREE.LineBasicMaterial({
            color: '#8b622e',
            transparent: true,
            opacity: 0.4,
          }),
        ),
      ),
    )

    this.skyGate = new THREE.Group()
    this.skyGate.position.set(0, 1.4, -12)
    this.skyGate.rotation.set(0.16, -0.11, -0.14)
    const spine = new THREE.Mesh(
      own(new THREE.TorusGeometry(10.6, 0.085, 8, 160)),
      metal,
    )
    this.skyGate.add(spine)
    const archMaterial = own(
      new THREE.MeshBasicMaterial({
        color: '#ffb64d',
        transparent: true,
        opacity: 0.25,
        toneMapped: false,
        depthWrite: false,
      }),
    )
    for (const [radius, arc, rotation] of [
      [10.4, TAU, 0],
      [10.9, Math.PI * 1.45, 0.42],
      [11.6, Math.PI * 1.05, 2.35],
    ]) {
      const ring = new THREE.Mesh(
        own(new THREE.TorusGeometry(radius, 0.015, 5, 150, arc)),
        archMaterial,
      )
      ring.rotation.z = rotation
      this.skyGate.add(ring)
    }
    const bolts = new THREE.InstancedMesh(
      own(new THREE.BoxGeometry(0.035, 0.3, 0.07)),
      own(
        new THREE.MeshBasicMaterial({
          color: '#ffd190',
          transparent: true,
          opacity: 0.38,
        }),
      ),
      64,
    )
    const matrix = new THREE.Object3D()
    for (let index = 0; index < 64; index += 1) {
      const angle = (index / 64) * TAU
      matrix.position.set(Math.sin(angle) * 10.65, Math.cos(angle) * 10.65, 0)
      matrix.rotation.z = -angle
      matrix.updateMatrix()
      bolts.setMatrixAt(index, matrix.matrix)
    }
    this.skyGate.add(bolts)
    this.scene.add(this.skyGate)

    const random = randomSequence()
    const stars = []
    for (let index = 0; index < 850; index += 1) {
      stars.push((random() - 0.5) * 110, random() * 44 - 2, -12 - random() * 78)
    }
    const starGeometry = own(new THREE.BufferGeometry())
    starGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(stars, 3),
    )
    this.stars = new THREE.Points(
      starGeometry,
      own(
        new THREE.PointsMaterial({
          color: '#d8cbbb',
          size: 0.06,
          transparent: true,
          opacity: 0.68,
          sizeAttenuation: true,
          depthWrite: false,
        }),
      ),
    )
    this.scene.add(this.stars)

    for (const [x, y, z, size, color, opacity] of [
      [-14, 7, -31, 42, '#493116', 0.5],
      [13, 2, -29, 33, '#553715', 0.36],
      [0, -1, -18, 24, '#8b5c2d', 0.18],
    ]) {
      const haze = new THREE.Sprite(
        own(
          new THREE.SpriteMaterial({
            map: this.radial,
            color,
            opacity,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      )
      haze.position.set(x, y, z)
      haze.scale.set(size, size * 0.7, 1)
      this.scene.add(haze)
    }
  }

  rebuildPortals() {
    const reusable = this.portals.length > 0 && this.pendingCount === 0
    this.cancelFrame()
    this.cancelImages()
    for (const portal of this.portals) {
      this.scene.remove(
        portal.root,
        portal.reflection,
        portal.shadow,
        portal.marker,
      )
    }
    if (this.connections) this.scene.remove(this.connections)
    if (reusable) {
      this.cachedPortalSets.set(this.portalSetKey, {
        portals: this.portals,
        resources: this.portalResources,
        textures: this.previewTextures,
        connections: this.connections,
      })
    } else {
      this.portalResources.dispose()
      for (const texture of this.previewTextures) texture.dispose()
    }
    const cached = this.cachedPortalSets.get(this.portalSignature)
    this.cachedPortalSets.delete(this.portalSignature)
    this.portalSetKey = this.portalSignature
    while (this.cachedPortalSets.size > 1) {
      const [key, entry] = this.cachedPortalSets.entries().next().value
      entry.resources.dispose()
      for (const texture of entry.textures) texture.dispose()
      this.cachedPortalSets.delete(key)
    }
    this.setStatus('loading')
    if (cached) {
      this.portals = cached.portals
      this.portalResources = cached.resources
      this.previewTextures = cached.textures
      this.connections = cached.connections
      for (const portal of this.portals)
        this.scene.add(
          portal.root,
          portal.reflection,
          portal.shadow,
          portal.marker,
        )
      this.scene.add(this.connections)
      return
    }
    this.portalResources = new Resources()
    this.previewTextures = new Set()
    this.portals = []
    const own = (resource) => this.portalResources.own(resource)
    const { width, height, outerWidth, outerHeight } = portalDimensions(
      this.options.viewport,
    )
    const bodyGeometry = own(
      new THREE.ExtrudeGeometry(panelShape(outerWidth, outerHeight), {
        depth: 0.18,
        bevelEnabled: true,
        bevelSize: 0.025,
        bevelThickness: 0.022,
        bevelSegments: 2,
        steps: 1,
      }),
    )
    const frameGeometry = own(
      new THREE.ExtrudeGeometry(
        panelShape(outerWidth, outerHeight, {
          width: width + 0.08,
          height: height + 0.08,
        }),
        {
          depth: 0.13,
          bevelEnabled: true,
          bevelSize: 0.015,
          bevelThickness: 0.014,
          bevelSegments: 2,
          steps: 1,
        },
      ),
    )
    const screenGeometry = own(new THREE.PlaneGeometry(width, height))
    const labelGeometry = own(new THREE.PlaneGeometry(width - 0.08, 0.18))
    const screwGeometry = own(
      new THREE.CylinderGeometry(0.025, 0.025, 0.018, 8),
    )
    const rimGeometry = own(
      new THREE.BufferGeometry().setFromPoints(
        chamferPoints(outerWidth - 0.05, outerHeight - 0.05).map(
          ([x, y]) => new THREE.Vector3(x, y, 0.181),
        ),
      ),
    )
    const glassEdgeGeometry = own(
      new THREE.BufferGeometry().setFromPoints(
        chamferPoints(width + 0.035, height + 0.035, 0.04).map(
          ([x, y]) => new THREE.Vector3(x, y + 0.06, 0.173),
        ),
      ),
    )
    const bodyMaterial = own(
      new THREE.MeshStandardMaterial({
        color: '#060c14',
        metalness: 0.94,
        roughness: 0.26,
        envMap: this.scene.environment,
        envMapIntensity: 0.18,
      }),
    )
    const screwMaterial = own(
      new THREE.MeshStandardMaterial({
        color: '#53616d',
        metalness: 1,
        roughness: 0.24,
        envMap: this.scene.environment,
        envMapIntensity: 0.3,
      }),
    )
    const reflectionGeometry = own(
      new THREE.PlaneGeometry(width, height * 1.12),
    )
    const shadowGeometry = own(new THREE.PlaneGeometry(outerWidth * 1.25, 3))
    const markerGeometry = own(new THREE.RingGeometry(0.27, 0.32, 40))
    const auraGeometry = own(
      new THREE.PlaneGeometry(outerWidth + 1.4, outerHeight + 1.4),
    )
    const suspensionGeometry = own(new THREE.PlaneGeometry(width * 0.88, 1))

    this.options.versions.forEach((version, index) => {
      const root = new THREE.Group()
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
      body.position.z = -0.23
      root.add(body)
      const frameMaterial = own(
        new THREE.MeshPhysicalMaterial({
          color: '#0b131c',
          metalness: 0.92,
          roughness: 0.19,
          envMap: this.scene.environment,
          envMapIntensity: 0.3,
          clearcoat: 0.42,
          clearcoatRoughness: 0.12,
          emissive: '#2b1806',
          emissiveIntensity: 0.04,
        }),
      )
      const frame = new THREE.Mesh(frameGeometry, frameMaterial)
      root.add(frame)
      const screenMaterial = own(
        new THREE.MeshBasicMaterial({
          map: this.placeholder,
          color: '#ffffff',
          toneMapped: false,
          fog: false,
        }),
      )
      const screen = new THREE.Mesh(screenGeometry, screenMaterial)
      screen.position.set(0, 0.06, 0.166)
      root.add(screen)
      const rim = new THREE.LineLoop(
        rimGeometry,
        own(
          new THREE.LineBasicMaterial({
            color: ACCENT,
            transparent: true,
            opacity: 0.65,
            toneMapped: false,
          }),
        ),
      )
      root.add(rim)
      const glassEdge = new THREE.LineLoop(
        glassEdgeGeometry,
        own(
          new THREE.LineBasicMaterial({
            color: '#ffc777',
            transparent: true,
            opacity: 0.3,
            toneMapped: false,
          }),
        ),
      )
      root.add(glassEdge)
      const aura = new THREE.Mesh(
        auraGeometry,
        own(glowMaterial(outerWidth, outerHeight)),
      )
      aura.position.z = -0.25
      root.add(aura)
      const suspension = new THREE.Mesh(
        suspensionGeometry,
        own(suspensionMaterial()),
      )
      suspension.position.z = -0.06
      root.add(suspension)
      const label = own(
        canvasTexture(768, 48, (context) => {
          context.clearRect(0, 0, 768, 48)
          context.fillStyle = '#ffe0ab'
          context.font = '500 25px ui-monospace, Consolas, monospace'
          context.textBaseline = 'middle'
          const text = `${String(index + 1).padStart(2, '0')}  /  ${version.model.toUpperCase()}`
          context.fillText(text, 8, 25, 750)
        }),
      )
      const caption = new THREE.Mesh(
        labelGeometry,
        own(
          new THREE.MeshBasicMaterial({
            map: label,
            transparent: true,
            depthWrite: false,
            toneMapped: false,
          }),
        ),
      )
      caption.position.set(0, -height / 2 - 0.17, 0.175)
      root.add(caption)
      for (const x of [-1, 1]) {
        for (const y of [-1, 1]) {
          const screw = new THREE.Mesh(screwGeometry, screwMaterial)
          screw.rotation.x = Math.PI / 2
          screw.position.set(
            x * (outerWidth / 2 - 0.14),
            y * (outerHeight / 2 - 0.13),
            0.174,
          )
          root.add(screw)
        }
      }
      const indicator = new THREE.Mesh(
        own(new THREE.SphereGeometry(0.047, 10, 8)),
        own(new THREE.MeshBasicMaterial({ color: DIM, toneMapped: false })),
      )
      indicator.position.set(
        outerWidth / 2 - 0.22,
        outerHeight / 2 - 0.105,
        0.188,
      )
      root.add(indicator)

      const reflection = new THREE.Mesh(
        reflectionGeometry,
        own(reflectionMaterial(this.placeholder)),
      )
      reflection.rotation.x = -Math.PI / 2
      const shadow = new THREE.Mesh(
        shadowGeometry,
        own(
          new THREE.MeshBasicMaterial({
            map: this.radial,
            color: '#000000',
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
          }),
        ),
      )
      shadow.rotation.x = -Math.PI / 2
      const marker = new THREE.Mesh(
        markerGeometry,
        own(
          new THREE.MeshBasicMaterial({
            color: ACCENT,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            depthWrite: false,
            toneMapped: false,
          }),
        ),
      )
      marker.rotation.x = -Math.PI / 2
      const action = { kind: 'portal', id: version.id, label: version.model }
      const hitMeshes = [screen, frame, body]
      for (const mesh of hitMeshes) mesh.userData.action = action
      this.scene.add(root, reflection, shadow, marker)
      this.portals.push({
        version,
        index,
        root,
        screen,
        frameMaterial,
        rim,
        glassEdge,
        aura,
        suspension,
        outerHeight,
        reflection,
        shadow,
        marker,
        hitMeshes,
        height,
        pose: null,
      })
    })
    const geometry = own(new THREE.BufferGeometry())
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(this.portals.length * 6), 3),
    )
    const colors = new THREE.BufferAttribute(
      new Float32Array(this.portals.length * 6),
      3,
    )
    this.portals.forEach((_, index) => {
      colors.setXYZ(index * 2, DIM.r * 0.45, DIM.g * 0.45, DIM.b * 0.45)
      colors.setXYZ(index * 2 + 1, DIM.r, DIM.g, DIM.b)
    })
    geometry.setAttribute('color', colors)
    this.connections = new THREE.LineSegments(
      geometry,
      own(
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.5,
          toneMapped: false,
        }),
      ),
    )
    this.connections.frustumCulled = false
    this.scene.add(this.connections)
    this.loadPreviews()
  }

  update(options) {
    try {
      this.applyOptions(options)
    } catch (error) {
      this.fail('The portal scene could not update its previews.', error)
    }
  }

  applyOptions(options) {
    this.options = options
    if (this.disposed || this.failed || !this.renderer) return
    if (!options.versions.length) {
      this.fail(
        'No portal previews are registered yet.',
        new Error('The edition registry is empty.'),
      )
      return
    }
    const signature = JSON.stringify([
      options.viewport,
      options.versions.map(({ id, model, preview, mobilePreview }) => [
        id,
        model,
        preview,
        mobilePreview,
      ]),
    ])
    const orderKey = JSON.stringify(options.versions.map(({ id }) => id))
    const index = Math.max(
      0,
      options.versions.findIndex(({ id }) => id === options.activeId),
    )
    const requestedId = options.versions[index].id
    const autoEcho = this.pendingAutoIds.has(requestedId)
    let rebuilt = false
    if (signature !== this.portalSignature) {
      this.portalSignature = signature
      this.cancelGesture()
      this.rebuildPortals()
      if (this.failed) return
      rebuilt = true
    }
    if (orderKey !== this.orderKey) {
      this.orderKey = orderKey
      this.orbit = index
      this.targetOrbit = index
      this.centering = false
      this.activeId = requestedId
      this.pendingAutoIds.clear()
      this.lastAutoTime = null
    } else if (requestedId !== this.lastPropActiveId && !autoEcho) {
      this.centerOn(index)
    }
    // A parent echo acknowledges automatic selection without restarting its orbit.
    if (autoEcho) this.pendingAutoIds.delete(requestedId)
    this.lastPropActiveId = requestedId
    this.host.dataset.activePortal = this.activeId
    if (rebuilt || !this.framing) this.measure()
    this.syncMotion()
    this.pointsDirty = true
    this.requestFrame()
  }

  loadPreviews() {
    const generation = this.textureGeneration
    const groups = new Map()
    for (const portal of this.portals) {
      const url =
        this.options.viewport === 'mobile'
          ? portal.version.mobilePreview
          : portal.version.preview
      if (!url) {
        this.fail(
          'An edition is missing its preview image.',
          new Error(
            `Missing ${this.options.viewport} preview for ${portal.version.id}.`,
          ),
        )
        return
      }
      if (!groups.has(url)) groups.set(url, [])
      groups.get(url).push(portal)
    }
    this.pendingCount = groups.size
    this.setStatus('loading')
    this.imageTimeout = window.setTimeout(() => {
      if (generation === this.textureGeneration && this.pendingCount > 0) {
        this.fail(
          'The portal preview images did not finish loading.',
          new Error('Preview loading exceeded 20 seconds.'),
        )
      }
    }, 20000)
    for (const [url, portals] of groups) {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.decoding = 'async'
      this.pendingImages.add(image)
      image.onload = () => {
        this.pendingImages.delete(image)
        image.onload = null
        image.onerror = null
        if (
          this.disposed ||
          this.failed ||
          generation !== this.textureGeneration
        )
          return
        try {
          if (!image.naturalWidth || !image.naturalHeight) {
            throw new Error(`Empty preview image: ${url}`)
          }
          const limit = Math.min(
            1024,
            this.renderer.capabilities.maxTextureSize,
          )
          const factor = Math.min(
            1,
            limit / Math.max(image.naturalWidth, image.naturalHeight),
          )
          const texture = canvasTexture(
            Math.max(1, Math.round(image.naturalWidth * factor)),
            Math.max(1, Math.round(image.naturalHeight * factor)),
            (context, canvas) =>
              context.drawImage(image, 0, 0, canvas.width, canvas.height),
          )
          texture.anisotropy = Math.min(
            4,
            this.renderer.capabilities.getMaxAnisotropy(),
          )
          this.previewTextures.add(texture)
          for (const portal of portals) {
            portal.screen.material.map = texture
            portal.screen.material.needsUpdate = true
            portal.reflection.material.uniforms.uMap.value = texture
          }
          this.pendingCount -= 1
          if (!this.pendingCount) window.clearTimeout(this.imageTimeout)
          this.requestFrame()
        } catch (error) {
          this.fail('A portal preview could not be prepared for 3D.', error)
        }
      }
      image.onerror = () => {
        if (
          this.disposed ||
          this.failed ||
          generation !== this.textureGeneration
        )
          return
        this.fail(
          'A portal preview image could not be loaded.',
          new Error(`Preview image failed: ${url}`),
        )
      }
      image.src = url
    }
  }

  cancelImages() {
    this.textureGeneration += 1
    window.clearTimeout(this.imageTimeout)
    for (const image of this.pendingImages) {
      image.onload = null
      image.onerror = null
      image.removeAttribute('src')
    }
    this.pendingImages.clear()
    this.pendingCount = 0
  }

  measure() {
    if (!this.renderer || this.failed || this.disposed) return
    const rect = this.host.getBoundingClientRect()
    this.hasSize = rect.width > 0 && rect.height > 0
    if (!this.hasSize) {
      this.cancelFrame()
      return
    }
    const width = Math.round(rect.width)
    const height = Math.round(rect.height)
    const dpr =
      Math.min(
        window.devicePixelRatio || 1,
        1.5,
        Math.sqrt(2400000 / (width * height)),
      ) * this.renderScale
    this.host.dataset.renderScale = this.renderScale.toFixed(2)
    if (this.width !== width || this.height !== height || this.dpr !== dpr) {
      this.width = width
      this.height = height
      this.dpr = dpr
      this.renderer.setPixelRatio(dpr)
      this.renderer.setSize(width, height, false)
    }
    this.framing = sceneFraming(width, height, this.options.viewport)
    this.camera.aspect = width / height
    this.camera.fov = this.framing.fov
    this.camera.setViewOffset(
      width,
      height,
      0,
      height / 2 - this.framing.centerY,
      width,
      height,
    )
    this.camera.updateProjectionMatrix()
    this.applyCamera(0)
    this.pointsDirty = true
    this.requestFrame()
  }

  applyCamera(time) {
    const distance = this.framing.distance
    const drift = this.reduced ? 0 : Math.sin(time * 0.17) * 0.07
    this.camera.position.set(
      drift,
      FOCUS.y + distance * 0.105,
      FOCUS.z + distance * 0.9945,
    )
    this.camera.lookAt(FOCUS)
    this.camera.updateMatrixWorld()
  }

  canAnimate() {
    return (
      !this.options.paused &&
      !this.reduced &&
      !document.hidden &&
      this.inView &&
      this.hasSize &&
      !this.failed &&
      !this.disposed
    )
  }

  canAutoRotate() {
    return (
      this.canAnimate() &&
      this.firstFrame &&
      this.status === 'ready' &&
      this.pendingCount === 0 &&
      this.portals.length > 1 &&
      !this.gesture &&
      !this.keyboardFocused &&
      !this.centering
    )
  }

  syncAutoRotation() {
    const running = this.canAutoRotate()
    if (!running) this.lastAutoTime = null
    this.host.dataset.autoRotation = this.reduced
      ? 'reduced'
      : running
        ? 'running'
        : 'paused'
    return running
  }

  syncMotion() {
    this.host.dataset.sceneMotion = this.reduced
      ? 'reduced'
      : this.canAnimate()
        ? 'running'
        : 'paused'
    if (this.centering && (this.options.paused || this.reduced)) {
      this.orbit = this.targetOrbit
      this.centering = false
    }
    if (!this.canAnimate()) {
      this.cancelFrame()
      this.hideTooltip()
    }
    this.syncAutoRotation()
    this.requestFrame()
  }

  requestFrame() {
    if (
      this.raf ||
      this.disposed ||
      this.failed ||
      !this.renderer ||
      this.pendingCount > 0 ||
      !this.hasSize ||
      document.hidden ||
      !this.inView
    )
      return
    this.raf = requestAnimationFrame((time) => this.renderFrame(time))
  }

  cancelFrame() {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.lastFrameTime = 0
    this.lastAutoTime = null
  }

  renderFrame(time) {
    this.raf = 0
    if (
      this.disposed ||
      this.failed ||
      this.pendingCount > 0 ||
      document.hidden ||
      !this.inView ||
      !this.hasSize
    )
      return
    const moving = this.canAnimate()
    const elapsed =
      moving && this.lastFrameTime
        ? Math.max(0, (time - this.lastFrameTime) / 1000)
        : 0
    const delta = Math.min(elapsed, 0.045)
    this.lastFrameTime = moving ? time : 0
    if (moving && this.firstFrame && elapsed > 0) {
      this.slowFrames = elapsed > 0.066 ? this.slowFrames + 1 : 0
      if (this.slowFrames >= 3 && this.renderScale > 0.5) {
        this.renderScale = Math.max(0.5, this.renderScale * 0.75)
        this.slowFrames = 0
        this.measure()
      }
    }
    this.clock += delta
    let automaticId = null
    if (this.syncAutoRotation()) {
      const elapsedAuto =
        this.lastAutoTime === null
          ? 0
          : Math.max(0, (time - this.lastAutoTime) / 1000)
      this.lastAutoTime = time
      this.orbit += elapsedAuto / AUTO_SECONDS_PER_EDITION
      this.targetOrbit = this.orbit
      const index = wrapIndex(Math.round(this.orbit), this.portals.length)
      const id = this.portals[index].version.id
      if (id !== this.activeId) {
        this.activeId = id
        this.host.dataset.activePortal = id
        automaticId = id
        this.hideTooltip()
        this.pointsDirty = true
      }
    } else if (this.centering && !this.gesture) {
      this.orbit = moving
        ? this.orbit +
          (this.targetOrbit - this.orbit) * (1 - Math.exp(-delta * 8))
        : this.targetOrbit
      if (Math.abs(this.targetOrbit - this.orbit) < 0.0005) {
        this.orbit = this.targetOrbit
        this.centering = false
      }
    }
    this.host.dataset.orbit = this.orbit.toFixed(5)
    const phase = this.reduced ? 0 : this.clock
    try {
      this.applyCamera(phase)
      this.updateObjects(phase)
      this.renderer.render(this.scene, this.camera)
      if (this.pendingCount === 0) {
        this.firstFrame = true
        this.setStatus('ready')
      }
      const settled = this.orbit === this.targetOrbit
      if (
        !moving ||
        this.pointsDirty ||
        time - this.lastPointsTime >= 120 ||
        (settled && !this.wasSettled)
      ) {
        this.publishPoints()
        this.lastPointsTime = time
        this.pointsDirty = false
      }
      this.wasSettled = settled
    } catch (error) {
      this.fail('The 3D renderer could not complete a frame.', error)
      return
    }
    if (this.syncAutoRotation() && this.lastAutoTime === null)
      this.lastAutoTime = time
    if (automaticId && this.options.onActiveChange) {
      this.pendingAutoIds.add(automaticId)
      this.options.onActiveChange(automaticId)
    }
    if (this.canAnimate()) this.requestFrame()
  }

  updateObjects(time) {
    this.skyGate.rotation.z = -0.14 + Math.sin(time * 0.07) * 0.025
    this.stars.rotation.y = Math.sin(time * 0.025) * 0.04
    const positions = this.connections.geometry.attributes.position
    const count = this.portals.length
    this.portals.forEach((portal, index) => {
      const pose = portalPose(
        index,
        this.orbit,
        count,
        this.options.viewport,
        this.framing.narrow,
      )
      portal.pose = pose
      const float = this.reduced
        ? 0
        : Math.sin(time * 0.7 + index * 1.7) * 0.045
      portal.root.position.set(pose.x, pose.y + float, pose.z)
      portal.root.rotation.y = pose.yaw
      portal.root.scale.setScalar(pose.scale)
      portal.root.visible = pose.visibility > 0.015
      portal.frameMaterial.emissiveIntensity = 0.025 + pose.focus * 0.055
      portal.rim.material.opacity = 0.22 + pose.focus * 0.52
      portal.glassEdge.material.opacity = 0.14 + pose.focus * 0.22
      portal.aura.material.uniforms.uOpacity.value =
        (0.07 + pose.focus * 0.16) * pose.visibility
      const suspensionHeight = Math.max(
        0.01,
        (portal.root.position.y - FLOOR) / pose.scale - portal.outerHeight / 2,
      )
      portal.suspension.position.y =
        -portal.outerHeight / 2 - suspensionHeight / 2
      portal.suspension.scale.y = suspensionHeight
      portal.suspension.material.uniforms.uOpacity.value =
        0.045 + pose.focus * 0.09
      portal.marker.position.set(pose.x, FLOOR + 0.022, pose.z)
      portal.marker.material.opacity = 0.18 + pose.focus * 0.3
      portal.marker.scale.setScalar(pose.scale * (1 + pose.focus * 0.25))
      portal.marker.visible = portal.root.visible
      portal.shadow.position.set(pose.x, FLOOR + 0.008, pose.z + 0.18)
      portal.shadow.scale.setScalar(pose.scale)
      portal.shadow.visible = portal.root.visible
      portal.reflection.rotation.z = pose.yaw
      portal.reflection.position.set(
        pose.x + Math.sin(pose.yaw) * portal.height * 0.56 * pose.scale,
        FLOOR + 0.017,
        pose.z + Math.cos(pose.yaw) * portal.height * 0.56 * pose.scale,
      )
      portal.reflection.scale.setScalar(pose.scale)
      portal.reflection.visible = portal.root.visible
      portal.reflection.material.uniforms.uOpacity.value =
        (0.03 + pose.focus * 0.105) * pose.visibility
      positions.setXYZ(index * 2, 0, FLOOR + 0.012, FOCUS.z - pose.radius)
      positions.setXYZ(index * 2 + 1, pose.x, FLOOR + 0.012, pose.z)
    })
    positions.needsUpdate = true
    const radius = this.portals[0]?.pose.radius || 7
    this.orbitalTrack.position.z = FOCUS.z - radius
    this.orbitalTrack.scale.set(radius, 1, radius)

    this.pickTargets = this.portals
      .filter((portal) => portal.root.visible)
      .flatMap((portal) => portal.hitMeshes)
  }

  intersection(x, y) {
    this.pointer.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    return (
      this.raycaster.intersectObjects(this.pickTargets, false)[0]?.object
        .userData.action || null
    )
  }

  publishPoints() {
    const point = (id, position, available = true) => {
      this.projected.copy(position).project(this.camera)
      const x = (this.projected.x * 0.5 + 0.5) * this.width
      const y = (-this.projected.y * 0.5 + 0.5) * this.height
      const inside =
        available &&
        this.projected.z > -1 &&
        this.projected.z < 1 &&
        x > 2 &&
        y > 2 &&
        x < this.width - 2 &&
        y < this.height - 2
      const hit = inside ? this.intersection(x, y) : null
      return {
        id,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        visible: Boolean(inside && hit?.id === id),
      }
    }
    const portals = this.portals.map((portal) => {
      portal.screen.getWorldPosition(this.worldPoint)
      return point(portal.version.id, this.worldPoint, portal.root.visible)
    })
    this.host.dataset.portalPoints = JSON.stringify(portals)
  }

  localPointer(event) {
    const rect = this.canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  pointerDown(event) {
    if (this.failed || !this.camera || event.button !== 0 || !event.isPrimary)
      return
    this.keyboardFocused = false
    this.centering = false
    this.targetOrbit = this.orbit
    this.gesture = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      orbit: this.orbit,
      dragging: false,
    }
    this.syncAutoRotation()
  }

  pointerMove(event) {
    if (this.failed || !this.hasSize) return
    const gesture = this.gesture
    if (gesture && gesture.pointerId === event.pointerId) {
      const dx = event.clientX - gesture.x
      const dy = event.clientY - gesture.y
      if (!gesture.dragging) {
        if (Math.abs(dy) > 9 && Math.abs(dy) > Math.abs(dx)) {
          this.gesture = null
          this.syncAutoRotation()
          return
        }
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.25) return
        gesture.dragging = true
        this.canvas.setPointerCapture(event.pointerId)
        this.host.dataset.dragging = ''
        this.hideTooltip()
      }
      if (event.cancelable) event.preventDefault()
      this.orbit = gesture.orbit - dx / (this.framing.narrow ? 150 : 270)
      this.requestFrame()
      return
    }
    if (event.pointerType !== 'mouse') return
    const { x, y } = this.localPointer(event)
    const hit = this.intersection(x, y)
    if (!hit) {
      this.hideTooltip()
      return
    }
    this.canvas.style.cursor = 'pointer'
    this.tooltip.textContent = `${hit.label} · select edition`
    this.tooltip.hidden = false
    const tooltipWidth = this.tooltip.offsetWidth
    this.tooltip.style.transform = `translate(${clamp(x - tooltipWidth / 2, 12, this.width - tooltipWidth - 12)}px, ${Math.max(12, y - 52)}px)`
  }

  pointerUp(event) {
    const gesture = this.gesture
    if (!gesture || gesture.pointerId !== event.pointerId) return
    this.gesture = null
    delete this.host.dataset.dragging
    if (this.canvas.hasPointerCapture(event.pointerId))
      this.canvas.releasePointerCapture(event.pointerId)
    if (gesture.dragging) {
      const index = wrapIndex(Math.round(this.orbit), this.portals.length)
      this.select(this.portals[index].version.id)
      return
    }
    this.syncAutoRotation()
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 9)
      return
    const { x, y } = this.localPointer(event)
    const hit = this.intersection(x, y)
    if (hit) this.select(hit.id)
  }

  cancelGesture() {
    const gesture = this.gesture
    this.gesture = null
    delete this.host.dataset.dragging
    if (gesture && this.canvas.hasPointerCapture(gesture.pointerId)) {
      this.canvas.releasePointerCapture(gesture.pointerId)
    }
    if (gesture) {
      this.centering = false
      this.targetOrbit = this.orbit
    }
    this.hideTooltip()
    this.syncAutoRotation()
    this.requestFrame()
  }

  centerOn(index) {
    this.activeId = this.options.versions[index].id
    this.host.dataset.activePortal = this.activeId
    this.targetOrbit = nearestOrbitTarget(
      this.orbit,
      index,
      this.portals.length,
    )
    this.centering = true
    this.pendingAutoIds.clear()
    this.lastAutoTime = null
    this.pointsDirty = true
    if (this.reduced || this.options.paused) {
      this.orbit = this.targetOrbit
      this.centering = false
    }
  }

  select(id) {
    const index = this.options.versions.findIndex(
      (version) => version.id === id,
    )
    if (index < 0) return
    this.centerOn(index)
    this.hideTooltip()
    this.syncMotion()
    this.options.onSelect?.(id)
    this.requestFrame()
  }

  keyDown(event) {
    if (
      this.failed ||
      !this.portals.length ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return
    this.keyboardFocused = true
    this.syncMotion()
    const count = this.portals.length
    let index = wrapIndex(Math.round(this.targetOrbit), count)
    if (event.key === 'ArrowLeft') index = wrapIndex(index - 1, count)
    else if (event.key === 'ArrowRight') index = wrapIndex(index + 1, count)
    else if (event.key === 'Home') index = 0
    else if (event.key === 'End') index = count - 1
    else return
    event.preventDefault()
    this.select(this.portals[index].version.id)
  }

  hideTooltip() {
    this.tooltip.hidden = true
    this.canvas.style.cursor = ''
  }

  setStatus(status, message = '') {
    if (this.disposed) return
    this.host.dataset.sceneStatus = status
    if (status !== 'loading' || this.firstFrame)
      delete this.host.dataset.rendering
    if (status === this.status) return
    this.status = status
    this.report(status, this.firstFrame, message)
  }

  fail(message, error) {
    if (this.disposed || this.failed) return
    this.failed = true
    console.warn('[Model Editions] 3D preview unavailable:', error)
    this.cancelFrame()
    this.cancelGesture()
    this.cancelImages()
    this.hideTooltip()
    this.host.dataset.sceneMotion = this.reduced ? 'reduced' : 'paused'
    this.syncAutoRotation()
    this.host.dataset.portalPoints = '[]'
    this.setStatus('fallback', message)
    this.releaseGraphics()
  }

  releaseGraphics() {
    this.pendingAutoIds.clear()
    this.portalResources.dispose()
    for (const texture of this.previewTextures) texture.dispose()
    this.previewTextures.clear()
    for (const entry of this.cachedPortalSets.values()) {
      entry.resources.dispose()
      for (const texture of entry.textures) texture.dispose()
    }
    this.cachedPortalSets.clear()
    this.resources.dispose()
    this.scene?.clear()
    this.scene = null
    this.portals = []
    this.pickTargets = []
    if (this.renderer) {
      const renderer = this.renderer
      this.renderer = null
      renderer.dispose()
      // React's development remount may reuse this canvas before the microtask.
      queueMicrotask(() => {
        if (this.canvas[SCENE_OWNER] !== this) return
        delete this.canvas[SCENE_OWNER]
        if (!renderer.getContext().isContextLost()) renderer.forceContextLoss()
      })
    } else if (this.canvas[SCENE_OWNER] === this) {
      delete this.canvas[SCENE_OWNER]
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.cancelFrame()
    this.cancelGesture()
    this.cancelImages()
    this.resizeObserver?.disconnect()
    this.intersectionObserver?.disconnect()
    for (const cleanup of this.cleanups) cleanup()
    this.cleanups = []
    this.releaseGraphics()
  }
}
