import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const TAU = Math.PI * 2
const FLOOR = -2.5
const SCENE_OWNER = Symbol('nexusScene')
const FOCUS = new THREE.Vector3(0, 0.85, 1.1)
const CYAN = new THREE.Color('#78efff')
const ICE = new THREE.Color('#d8f9ff')
const AMBER = new THREE.Color('#ffc88e')
const DIM = new THREE.Color('#153643')
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

export function signalAnchors(framing, viewport, count) {
  const { width, height, narrow, centerY, portalWidth, portalHeight } = framing
  const left = (width - portalWidth) / 2
  const above = Math.max(framing.top + 24, centerY - portalHeight / 2 - 29)
  const below = Math.min(
    height - framing.bottom - 27,
    centerY + portalHeight / 2 + 38,
  )
  const positions =
    narrow && viewport !== 'mobile'
      ? [
          [width * 0.16, above],
          [width * 0.84, above + 9],
          [width * 0.5, below],
        ]
      : [
          [Math.max(31, left - (narrow ? 36 : 68)), centerY - 24],
          [
            Math.min(width - 31, width - left + (narrow ? 36 : 68)),
            centerY + 15,
          ],
          [width * 0.5, below],
        ]
  return Array.from({ length: count }, (_, index) => {
    if (index < positions.length) {
      return { x: positions[index][0], y: positions[index][1] }
    }
    const angle = (index / count) * TAU
    return {
      x: clamp(width / 2 + Math.cos(angle) * width * 0.36, 30, width - 30),
      y: clamp(
        centerY + Math.sin(angle) * framing.stageHeight * 0.4,
        framing.top + 25,
        height - framing.bottom - 25,
      ),
    }
  })
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
      uColor: { value: CYAN.clone() },
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
        gl_FragColor = vec4(color.rgb * vec3(0.66, 0.85, 0.95), uOpacity * fade);
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
      uColor: { value: CYAN.clone() },
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
    this.signalResources = new Resources()
    this.previewTextures = new Set()
    this.pendingImages = new Set()
    this.cleanups = []
    this.portals = []
    this.beacons = []
    this.pickTargets = []
    this.visibilityTargets = []
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.projected = new THREE.Vector3()
    this.worldPoint = new THREE.Vector3()
    this.clock = 0
    this.orbit = 0
    this.targetOrbit = 0
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
    this.seenLaunchId = 0
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
          context.strokeStyle = '#153c4b'
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
      const environment = own(pmrem.fromScene(room, 0.045))
      this.scene.environment = environment.texture
      this.scene.environmentIntensity = 0.75
    } finally {
      room.dispose()
      pmrem.dispose()
    }

    this.scene.add(new THREE.HemisphereLight('#b8e2ff', '#030a12', 1.45))
    const key = new THREE.DirectionalLight('#e2f6ff', 3.5)
    key.position.set(-5, 9, 8)
    this.scene.add(key)
    this.reactorLight = new THREE.PointLight('#78efff', 36, 24, 2)
    this.reactorLight.position.set(0, 4.4, 4)
    this.scene.add(this.reactorLight)
    const amberLight = new THREE.PointLight('#ffc88e', 18, 26, 2)
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

    this.circuitMaterial = own(
      new THREE.MeshBasicMaterial({
        color: CYAN,
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
        this.circuitMaterial,
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
            color: '#36677d',
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
    this.archMaterial = own(
      new THREE.MeshBasicMaterial({
        color: '#6ab9db',
        transparent: true,
        opacity: 0.28,
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
        this.archMaterial,
      )
      ring.rotation.z = rotation
      this.skyGate.add(ring)
    }
    const bolts = new THREE.InstancedMesh(
      own(new THREE.BoxGeometry(0.035, 0.3, 0.07)),
      own(
        new THREE.MeshBasicMaterial({
          color: '#8ec6e2',
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
          color: '#afcddd',
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
      [-14, 7, -31, 42, '#164065', 0.5],
      [13, 2, -29, 33, '#194b60', 0.36],
      [0, -1, -18, 24, '#3b739a', 0.18],
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

    this.warpSeeds = Array.from({ length: 170 }, () => ({
      angle: random() * TAU,
      radius: 3.6 + random() * 20,
      z: random() * 54,
      length: 2 + random() * 5,
    }))
    this.warpGeometry = own(new THREE.BufferGeometry())
    this.warpGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(this.warpSeeds.length * 6), 3),
    )
    this.warpMaterial = own(
      new THREE.LineBasicMaterial({
        color: '#b4ecff',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    this.warp = new THREE.LineSegments(this.warpGeometry, this.warpMaterial)
    this.warp.frustumCulled = false
    this.warp.visible = false
    this.scene.add(this.warp)
    this.launchRings = []
    const launchGeometry = own(new THREE.TorusGeometry(5.8, 0.022, 5, 120))
    for (let index = 0; index < 3; index += 1) {
      const material = own(this.warpMaterial.clone())
      const ring = new THREE.Mesh(launchGeometry, material)
      ring.visible = false
      this.launchRings.push(ring)
      this.scene.add(ring)
    }
  }

  rebuildPortals() {
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
    this.portalResources.dispose()
    for (const texture of this.previewTextures) texture.dispose()
    this.previewTextures.clear()
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
          emissive: '#08212d',
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
            color: CYAN,
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
            color: '#86c6d6',
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
          context.fillStyle = '#bcecf4'
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
            color: CYAN,
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
        indicator,
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
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(this.portals.length * 6), 3),
    )
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

  rebuildSignals() {
    for (const beacon of this.beacons) this.scene.remove(beacon.root)
    this.signalResources.dispose()
    this.beacons = []
    const own = (resource) => this.signalResources.own(resource)
    const coreGeometry = own(new THREE.OctahedronGeometry(0.19))
    const ringGeometry = own(new THREE.TorusGeometry(0.31, 0.012, 6, 44))
    const colliderGeometry = own(new THREE.SphereGeometry(0.38, 12, 8))
    const colliderMaterial = own(
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    this.options.signals.forEach((signal, index) => {
      const root = new THREE.Group()
      const color = signal.color ? new THREE.Color(signal.color) : AMBER.clone()
      const core = new THREE.Mesh(
        coreGeometry,
        own(
          new THREE.MeshPhysicalMaterial({
            color,
            metalness: 0.3,
            roughness: 0.16,
            emissive: color,
            emissiveIntensity: 1.3,
            clearcoat: 1,
          }),
        ),
      )
      const ringMaterial = own(
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.85,
          toneMapped: false,
        }),
      )
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.set(0.65, 0.36, 0)
      const secondRing = new THREE.Mesh(
        ringGeometry,
        own(
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.65,
            toneMapped: false,
          }),
        ),
      )
      secondRing.rotation.set(-0.65, -0.45, 0.8)
      secondRing.scale.setScalar(1.14)
      const glow = new THREE.Sprite(
        own(
          new THREE.SpriteMaterial({
            map: this.radial,
            color,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.46,
            depthWrite: false,
            toneMapped: false,
          }),
        ),
      )
      glow.scale.setScalar(1.6)
      const collider = new THREE.Mesh(colliderGeometry, colliderMaterial)
      collider.userData.action = {
        kind: 'signal',
        id: signal.id,
        label: signal.label,
        hint: signal.hint,
      }
      root.add(core, ring, secondRing, glow, collider)
      this.scene.add(root)
      this.beacons.push({
        signal,
        index,
        color,
        root,
        core,
        ring,
        secondRing,
        glow,
        collider,
        base: new THREE.Vector3(),
        baseScale: 1,
      })
    })
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
    let rebuilt = false
    if (signature !== this.portalSignature) {
      this.portalSignature = signature
      this.cancelGesture()
      this.rebuildPortals()
      if (this.failed) return
      rebuilt = true
    }
    const signalSignature = JSON.stringify(
      options.signals.map(({ id, label, color, hint }) => [
        id,
        label,
        color,
        hint,
      ]),
    )
    if (signalSignature !== this.signalSignature) {
      this.signalSignature = signalSignature
      this.rebuildSignals()
      rebuilt = true
    }
    this.collected = new Set(options.collectedIds)
    this.scanned = new Set(options.scannedIds)
    const index = Math.max(
      0,
      options.versions.findIndex(({ id }) => id === options.activeId),
    )
    this.activeId = options.versions[index].id
    this.host.dataset.activePortal = this.activeId
    this.targetOrbit = nearestOrbitTarget(
      this.orbit,
      index,
      options.versions.length,
    )
    if (rebuilt || this.reduced || options.paused) this.orbit = this.targetOrbit
    this.measure()
    if (options.launchId !== this.seenLaunchId) {
      this.seenLaunchId = options.launchId
      if (options.launchId > 0) {
        if (this.reduced || options.paused) {
          this.launch = null
          this.host.dataset.launchState = 'complete'
        } else {
          this.launch = { elapsed: 0 }
          this.host.dataset.launchState = 'launching'
        }
      } else {
        this.launch = null
        this.host.dataset.launchState = 'idle'
      }
    }
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
    this.applyCamera(0, 0)
    this.positionSignals()
    this.pointsDirty = true
    this.requestFrame()
  }

  applyCamera(time, launchAmount) {
    const distance = this.framing.distance
    const drift = this.reduced ? 0 : Math.sin(time * 0.17) * 0.07
    this.camera.position.set(
      drift,
      FOCUS.y + distance * 0.105 + launchAmount * 0.2,
      FOCUS.z + distance * 0.9945 - launchAmount * distance * 0.13,
    )
    this.camera.lookAt(FOCUS)
    this.camera.updateMatrixWorld()
  }

  positionSignals() {
    if (!this.framing) return
    const anchors = signalAnchors(
      this.framing,
      this.options.viewport,
      this.beacons.length,
    )
    const desiredSize = this.framing.narrow ? 37 : 42
    this.beacons.forEach((beacon, index) => {
      const { x, y } = anchors[index]
      const ray = new THREE.Vector3(
        (x / this.width) * 2 - 1,
        -(y / this.height) * 2 + 1,
        0.5,
      )
        .unproject(this.camera)
        .sub(this.camera.position)
        .normalize()
      const distance = (3 - this.camera.position.z) / ray.z
      beacon.base.copy(this.camera.position).addScaledVector(ray, distance)
      const pixelScale =
        this.height /
        (2 * Math.tan((this.camera.fov * Math.PI) / 360) * distance)
      beacon.baseScale = desiredSize / (0.76 * pixelScale)
    })
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

  syncMotion() {
    this.host.dataset.sceneMotion = this.reduced
      ? 'reduced'
      : this.canAnimate()
        ? 'running'
        : 'paused'
    if (this.options.paused || this.reduced) {
      this.orbit = this.targetOrbit
      if (this.launch) {
        this.launch = null
        this.host.dataset.launchState = 'complete'
      }
    }
    if (!this.canAnimate()) {
      this.cancelFrame()
      this.hideTooltip()
    }
    this.requestFrame()
  }

  requestFrame() {
    if (
      this.raf ||
      this.disposed ||
      this.failed ||
      !this.renderer ||
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
  }

  renderFrame(time) {
    this.raf = 0
    if (
      this.disposed ||
      this.failed ||
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
    if (!this.gesture?.dragging) {
      this.orbit = moving
        ? this.orbit +
          (this.targetOrbit - this.orbit) * (1 - Math.exp(-delta * 8))
        : this.targetOrbit
      if (Math.abs(this.targetOrbit - this.orbit) < 0.0005)
        this.orbit = this.targetOrbit
    }
    const phase = this.reduced ? 0 : this.clock
    let launchAmount = 0
    let launchProgress = 0
    if (this.launch) {
      this.launch.elapsed += elapsed
      launchProgress = clamp(this.launch.elapsed / 3.2, 0, 1)
      launchAmount = Math.sin(Math.PI * smoothstep(0, 1, launchProgress))
      if (launchProgress >= 1) {
        this.launch = null
        this.host.dataset.launchState = 'complete'
      }
    }
    try {
      this.applyCamera(phase, launchAmount)
      this.updateObjects(phase, launchAmount, launchProgress)
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
    if (this.canAnimate()) this.requestFrame()
  }

  updateObjects(time, launchAmount, launchProgress) {
    const energized = this.options.complete
    this.reactorLight.intensity = (energized ? 54 : 36) + launchAmount * 35
    this.circuitMaterial.opacity =
      (energized ? 0.54 : 0.3) + launchAmount * 0.22
    this.archMaterial.opacity = (energized ? 0.42 : 0.25) + launchAmount * 0.25
    this.skyGate.rotation.z = -0.14 + Math.sin(time * 0.07) * 0.025
    this.stars.rotation.y = Math.sin(time * 0.025) * 0.04
    const positions = this.connections.geometry.attributes.position
    const colors = this.connections.geometry.attributes.color
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
      const scanned = this.scanned.has(portal.version.id)
      portal.frameMaterial.emissiveIntensity =
        0.025 +
        pose.focus * 0.055 +
        (scanned ? 0.035 : 0) +
        (energized ? 0.065 : 0) +
        launchAmount * 0.12
      portal.rim.material.opacity =
        0.22 + pose.focus * 0.52 + (scanned ? 0.18 : 0)
      portal.glassEdge.material.opacity =
        0.14 + pose.focus * 0.22 + (scanned ? 0.08 : 0)
      portal.aura.material.uniforms.uOpacity.value =
        (0.07 +
          pose.focus * 0.16 +
          (energized ? 0.13 : 0) +
          launchAmount * 0.15) *
        pose.visibility
      const suspensionHeight = Math.max(
        0.01,
        (portal.root.position.y - FLOOR) / pose.scale - portal.outerHeight / 2,
      )
      portal.suspension.position.y =
        -portal.outerHeight / 2 - suspensionHeight / 2
      portal.suspension.scale.y = suspensionHeight
      portal.suspension.material.uniforms.uOpacity.value =
        0.045 + pose.focus * 0.09 + (energized ? 0.06 : 0)
      portal.indicator.material.color.copy(scanned ? ICE : DIM)
      portal.marker.position.set(pose.x, FLOOR + 0.022, pose.z)
      portal.marker.material.opacity = scanned ? 0.9 : 0.18 + pose.focus * 0.3
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
        (0.03 + pose.focus * 0.105 + launchAmount * 0.055) * pose.visibility
      positions.setXYZ(index * 2, 0, FLOOR + 0.012, FOCUS.z - pose.radius)
      positions.setXYZ(index * 2 + 1, pose.x, FLOOR + 0.012, pose.z)
      const color = scanned ? CYAN : DIM
      colors.setXYZ(index * 2, color.r * 0.45, color.g * 0.45, color.b * 0.45)
      colors.setXYZ(index * 2 + 1, color.r, color.g, color.b)
    })
    positions.needsUpdate = true
    colors.needsUpdate = true
    const radius = this.portals[0]?.pose.radius || 7
    this.orbitalTrack.position.z = FOCUS.z - radius
    this.orbitalTrack.scale.set(radius, 1, radius)

    this.beacons.forEach((beacon, index) => {
      const collected = this.collected.has(beacon.signal.id)
      beacon.root.position.copy(beacon.base)
      if (!this.reduced && !collected)
        beacon.root.position.y += Math.sin(time * 1.1 + index * 2) * 0.065
      beacon.root.scale.setScalar(beacon.baseScale * (collected ? 0.7 : 1))
      beacon.core.rotation.set(
        0.18,
        collected ? Math.PI / 4 : time * 0.55 + index,
        0.15,
      )
      beacon.ring.rotation.z = collected ? 0 : time * 0.25 + index
      beacon.secondRing.rotation.z = collected ? 0.8 : 0.8 - time * 0.22
      beacon.core.material.color.copy(collected ? ICE : beacon.color)
      beacon.core.material.emissive.copy(collected ? CYAN : beacon.color)
      beacon.core.material.emissiveIntensity = collected ? 0.75 : 1.3
      beacon.ring.material.color.copy(collected ? CYAN : beacon.color)
      beacon.secondRing.material.color.copy(collected ? CYAN : beacon.color)
      beacon.glow.material.color.copy(collected ? CYAN : beacon.color)
      beacon.glow.material.opacity = collected ? 0.16 : 0.42
    })
    const portals = this.portals
      .filter((portal) => portal.root.visible)
      .flatMap((portal) => portal.hitMeshes)
    this.visibilityTargets = [
      ...portals,
      ...this.beacons.map((beacon) => beacon.collider),
    ]
    this.pickTargets = [
      ...portals,
      ...this.beacons
        .filter((beacon) => !this.collected.has(beacon.signal.id))
        .map((beacon) => beacon.collider),
    ]
    this.warp.visible = launchAmount > 0.001
    if (this.warp.visible) {
      const attribute = this.warpGeometry.attributes.position
      this.warpSeeds.forEach((seed, index) => {
        const z = -55 + ((seed.z + launchProgress * 78) % 54)
        const x = Math.cos(seed.angle) * seed.radius
        const y = Math.sin(seed.angle) * seed.radius + FOCUS.y
        attribute.setXYZ(index * 2, x, y, z)
        attribute.setXYZ(index * 2 + 1, x, y, z + seed.length * launchAmount)
      })
      attribute.needsUpdate = true
      this.warpMaterial.opacity = launchAmount * 0.65
    }
    this.launchRings.forEach((ring, index) => {
      ring.visible = launchAmount > 0.001
      ring.position.set(0, FOCUS.y, -18 + launchProgress * 14 - index * 8)
      ring.scale.setScalar(1 + launchProgress * 0.4)
      ring.material.opacity = launchAmount * (0.42 - index * 0.07)
    })
  }

  intersection(x, y, targets = this.pickTargets) {
    this.pointer.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    return (
      this.raycaster.intersectObjects(targets, false)[0]?.object.userData
        .action || null
    )
  }

  publishPoints() {
    const point = (id, world, kind, available = true) => {
      this.projected.copy(world).project(this.camera)
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
      const hit = inside
        ? this.intersection(x, y, this.visibilityTargets)
        : null
      return {
        id,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        visible: Boolean(inside && hit?.id === id && hit?.kind === kind),
      }
    }
    const portals = this.portals.map((portal) => {
      portal.screen.getWorldPosition(this.worldPoint)
      return point(
        portal.version.id,
        this.worldPoint,
        'portal',
        portal.root.visible,
      )
    })
    const signals = this.beacons.map((beacon) => {
      beacon.core.getWorldPosition(this.worldPoint)
      return point(beacon.signal.id, this.worldPoint, 'signal')
    })
    this.host.dataset.portalPoints = JSON.stringify(portals)
    this.host.dataset.signalPoints = JSON.stringify(signals)
  }

  localPointer(event) {
    const rect = this.canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  pointerDown(event) {
    if (this.failed || !this.camera || event.button !== 0 || !event.isPrimary)
      return
    this.gesture = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      orbit: this.orbit,
      dragging: false,
    }
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
    this.tooltip.textContent =
      hit.kind === 'signal'
        ? `${hit.label} · ${hit.hint || 'collect signal'}`
        : `${hit.label} · scan world`
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
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 9)
      return
    const { x, y } = this.localPointer(event)
    const hit = this.intersection(x, y)
    if (hit?.kind === 'signal') {
      this.hideTooltip()
      this.options.onCollect?.(hit.id)
    } else if (hit?.kind === 'portal') {
      this.select(hit.id)
    }
  }

  cancelGesture() {
    const gesture = this.gesture
    this.gesture = null
    delete this.host.dataset.dragging
    if (gesture && this.canvas.hasPointerCapture(gesture.pointerId)) {
      this.canvas.releasePointerCapture(gesture.pointerId)
    }
    this.hideTooltip()
    this.requestFrame()
  }

  select(id) {
    const index = this.options.versions.findIndex(
      (version) => version.id === id,
    )
    if (index < 0) return
    this.targetOrbit = nearestOrbitTarget(
      this.orbit,
      index,
      this.portals.length,
    )
    if (this.reduced || this.options.paused) this.orbit = this.targetOrbit
    this.hideTooltip()
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
    console.warn('[Edition Nexus] 3D preview unavailable:', error)
    this.cancelFrame()
    this.cancelGesture()
    this.cancelImages()
    this.hideTooltip()
    this.host.dataset.sceneMotion = this.reduced ? 'reduced' : 'paused'
    this.host.dataset.launchState = 'idle'
    this.host.dataset.portalPoints = '[]'
    this.host.dataset.signalPoints = '[]'
    this.setStatus('fallback', message)
    this.releaseGraphics()
  }

  releaseGraphics() {
    this.portalResources.dispose()
    this.signalResources.dispose()
    for (const texture of this.previewTextures) texture.dispose()
    this.previewTextures.clear()
    this.resources.dispose()
    this.scene?.clear()
    this.scene = null
    this.portals = []
    this.beacons = []
    this.pickTargets = []
    this.visibilityTargets = []
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
