// The field: a WebGL2 rendering of the portfolio's semantic map.
//
// Instanced discs for the works, GL_LINES for their nearest-neighbour ties, a
// perspective camera that orbits the whole configuration. Picking happens on
// the CPU against the same matrices so the readout overlay stays real DOM text.

const CATEGORY_ORDER = [
  'app',
  'project',
  'video',
  'illustration',
  'event',
  'media',
  'cloud',
  'learning',
]

// Eight steps that stay legible side by side but still read as one scale.
const RAMP = [
  [0.42, 0.3, 0.98],
  [0.29, 0.44, 0.97],
  [0.11, 0.62, 0.95],
  [0.06, 0.77, 0.82],
  [0.18, 0.84, 0.55],
  [0.48, 0.87, 0.3],
  [0.75, 0.88, 0.16],
  [0.95, 0.82, 0.18],
]

export function rampColour(t) {
  const clamped = Math.min(Math.max(t, 0), 1) * (RAMP.length - 1)
  const index = Math.min(Math.floor(clamped), RAMP.length - 2)
  const mix = clamped - index
  return RAMP[index].map(
    (value, channel) => value + (RAMP[index + 1][channel] - value) * mix,
  )
}

export function categoryTone(category) {
  const index = CATEGORY_ORDER.indexOf(category)
  return index < 0 ? 0.5 : index / (CATEGORY_ORDER.length - 1)
}

export const categoryOrder = CATEGORY_ORDER

// Colour carries time, position carries meaning: the two read independently.
export function yearScale(nodes) {
  const years = nodes.map((node) => node.year).filter(Number.isFinite)
  const first = Math.min(...years)
  const last = Math.max(...years)
  return {
    first,
    last,
    tone: (year) =>
      last === first
        ? 0.5
        : (Math.min(Math.max(year, first), last) - first) / (last - first),
  }
}

export function supportsField() {
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}

// The same orthographic-ish reduction the canvas performs, for the static
// fallback drawing. Returns points in a 0..100 square with a depth order.
export function flatten(nodes, { yaw = -0.55, pitch = 0.24 } = {}) {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const placed = nodes.map((node) => {
    const [x, y, z] = node.position
    const rx = cy * x - sy * z
    const rz = sy * x + cy * z
    return { node, x: rx, y: -(cp * y - sp * rz), depth: cp * rz + sp * y }
  })
  const reach =
    Math.max(
      1e-6,
      ...placed.map((point) => Math.max(Math.abs(point.x), Math.abs(point.y))),
    ) / 0.46
  return placed.map((point) => ({
    ...point,
    x: 50 + point.x / reach,
    y: 50 + point.y / reach,
  }))
}

// Column-major 4x4 helpers, kept minimal and allocation free per frame.
// The projection carries a frustum shift so the configuration can be centred
// inside a window cut into the page rather than inside the whole viewport.
function perspective(out, fov, aspect, shiftX, shiftY, near, far) {
  const f = 1 / Math.tan((fov * Math.PI) / 360)
  out.fill(0)
  out[0] = f / aspect
  out[5] = f
  out[8] = -shiftX
  out[9] = -shiftY
  out[10] = (far + near) / (near - far)
  out[11] = -1
  out[14] = (2 * far * near) / (near - far)
  return out
}

function lookAt(out, eye, target) {
  const zx = eye[0] - target[0]
  const zy = eye[1] - target[1]
  const zz = eye[2] - target[2]
  const zl = Math.hypot(zx, zy, zz) || 1
  const z = [zx / zl, zy / zl, zz / zl]
  let x = [-z[2], 0, z[0]]
  const xl = Math.hypot(...x) || 1
  x = x.map((value) => value / xl)
  const y = [
    z[1] * x[2] - z[2] * x[1],
    z[2] * x[0] - z[0] * x[2],
    z[0] * x[1] - z[1] * x[0],
  ]
  out.set([
    x[0],
    y[0],
    z[0],
    0,
    x[1],
    y[1],
    z[1],
    0,
    x[2],
    y[2],
    z[2],
    0,
    -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
    -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
    -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
    1,
  ])
  return out
}

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader) || 'shader failed')
  return shader
}

function program(gl, vertex, fragment, attributes) {
  const created = gl.createProgram()
  gl.attachShader(created, compile(gl, gl.VERTEX_SHADER, vertex))
  gl.attachShader(created, compile(gl, gl.FRAGMENT_SHADER, fragment))
  attributes.forEach((name, index) =>
    gl.bindAttribLocation(created, index, name),
  )
  gl.linkProgram(created)
  if (!gl.getProgramParameter(created, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(created) || 'program failed')
  return created
}

const DISC_VERTEX = `#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec3 aCentre;
layout(location = 2) in vec3 aColour;
layout(location = 3) in float aRadius;
layout(location = 4) in float aOrder;
layout(location = 5) in float aMuted;
uniform mat4 uView;
uniform mat4 uProjection;
uniform float uReveal;
uniform float uCount;
uniform float uActive;
out vec2 vCorner;
out vec3 vColour;
out float vFade;
out float vActive;
out float vMuted;
void main() {
  float appear = clamp((uReveal * (uCount + 14.0) - aOrder) / 14.0, 0.0, 1.0);
  vActive = uActive == aOrder ? 1.0 : 0.0;
  vMuted = aMuted;
  vec4 view = uView * vec4(aCentre, 1.0);
  float radius = aRadius * (0.4 + 0.6 * appear) * (1.0 + 0.45 * vActive - 0.2 * aMuted) * 1.75;
  view.xy += aCorner * radius;
  vCorner = aCorner;
  vColour = aColour;
  vFade = appear * clamp((-view.z - 0.9) / 3.0, 0.12, 1.0);
  gl_Position = uProjection * view;
}`

const DISC_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vCorner;
in vec3 vColour;
in float vFade;
in float vActive;
in float vMuted;
uniform float uNight;
out vec4 fragColor;
void main() {
  float distance = length(vCorner);
  float edge = fwidth(distance) * 1.1 + 0.003;
  // The marker sits at 0.4 of the quad; the rest carries its halo.
  float core = 1.0 - smoothstep(0.4 - edge, 0.4 + edge, distance);
  float collar = 1.0 - smoothstep(0.47 - edge, 0.47 + edge, distance);
  float radial = clamp(1.0 - distance / 0.4, 0.0, 1.0);
  float halo = pow(max(0.0, 1.0 - distance), 2.4);
  float presence = mix(1.0, 0.18, vMuted);

  // Paper: a plotted marker with a paper-coloured collar so neighbours stay
  // readable where they overlap. Screen: the same marker, lit from inside.
  vec3 ink = vColour * (0.58 + 0.18 * vFade + 0.12 * radial);
  vec3 paper = mix(vec3(0.95, 0.945, 0.925), mix(ink, ink * 0.5, vActive), core);
  float paperAlpha = max(
    core * (0.55 + 0.45 * vFade) * presence,
    collar * 0.95 * mix(1.0, 0.45, vMuted));

  vec3 lit = vColour * (0.45 + 0.5 * vFade + 0.75 * radial * radial);
  lit += vec3(0.8, 0.86, 1.0) * pow(radial, 5.0) * (0.12 + 0.3 * vFade);
  lit += vec3(0.5, 0.56, 0.7) * vActive * core;
  float litAlpha = (core * (0.4 + 0.6 * vFade) + halo * (0.08 + 0.2 * vFade)) * presence;

  fragColor = vec4(mix(paper, lit, uNight), mix(paperAlpha, litAlpha, uNight));
  fragColor.rgb *= fragColor.a;
}`

const LINK_VERTEX = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in float aStrength;
layout(location = 2) in float aOrder;
uniform mat4 uView;
uniform mat4 uProjection;
uniform float uReveal;
uniform float uCount;
out float vAlpha;
void main() {
  vec4 view = uView * vec4(aPosition, 1.0);
  float appear = clamp((uReveal * (uCount + 12.0) - aOrder) / 14.0, 0.0, 1.0);
  vAlpha = aStrength * appear * clamp((-view.z - 0.4) / 3.4, 0.0, 1.0);
  gl_Position = uProjection * view;
}`

const LINK_FRAGMENT = `#version 300 es
precision highp float;
in float vAlpha;
uniform vec3 uLinkColour;
uniform float uLinkAlpha;
out vec4 fragColor;
void main() {
  float alpha = vAlpha * uLinkAlpha;
  fragColor = vec4(uLinkColour * alpha, alpha);
}`

export function createField(canvas, { nodes, links, onReady, onFrame }) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: false,
    premultipliedAlpha: true,
    powerPreference: 'low-power',
  })
  if (!gl) throw new Error('WebGL2 unavailable')

  const discProgram = program(gl, DISC_VERTEX, DISC_FRAGMENT, [
    'aCorner',
    'aCentre',
    'aColour',
    'aRadius',
    'aOrder',
    'aMuted',
  ])
  const linkProgram = program(gl, LINK_VERTEX, LINK_FRAGMENT, [
    'aPosition',
    'aStrength',
    'aOrder',
  ])
  const uniform = (created, names) =>
    Object.fromEntries(
      names.map((name) => [name, gl.getUniformLocation(created, name)]),
    )
  const discUniform = uniform(discProgram, [
    'uView',
    'uProjection',
    'uNight',
    'uReveal',
    'uCount',
    'uActive',
  ])
  const linkUniform = uniform(linkProgram, [
    'uView',
    'uProjection',
    'uLinkColour',
    'uLinkAlpha',
    'uReveal',
    'uCount',
  ])

  const count = nodes.length
  const heaviest = Math.max(1, ...nodes.map((node) => node.weight))
  const scaleOfYear = yearScale(nodes)
  const STRIDE = 9
  const instances = new Float32Array(count * STRIDE)
  nodes.forEach((node, index) => {
    const colour = rampColour(scaleOfYear.tone(node.year))
    const slot = index * STRIDE
    instances[slot] = node.position[0]
    instances[slot + 1] = node.position[1]
    instances[slot + 2] = node.position[2]
    instances[slot + 3] = colour[0]
    instances[slot + 4] = colour[1]
    instances[slot + 5] = colour[2]
    instances[slot + 6] = 0.05 + 0.046 * Math.sqrt(node.weight / heaviest)
    instances[slot + 7] = index
    instances[slot + 8] = 0
  })
  const radii = nodes.map((_, index) => instances[index * STRIDE + 6] * 0.7)
  const muted = new Float32Array(count)
  const sorted = new Float32Array(instances)
  const depths = nodes.map((_, index) => ({ index, depth: 0 }))

  // A bounding sphere over-reports how much frame the configuration needs. The
  // fit instead uses a high percentile of the silhouettes it actually makes
  // while it turns, so a couple of outliers may sit near the edge.
  const extent = (() => {
    const samples = []
    for (let step = 0; step < 16; step++) {
      const yaw = (step / 16) * Math.PI * 2
      for (const pitch of [-0.45, -0.2, 0.05, 0.3, 0.55]) {
        const cy = Math.cos(yaw)
        const sy = Math.sin(yaw)
        const cp = Math.cos(pitch)
        const sp = Math.sin(pitch)
        for (const node of nodes) {
          const [x, y, z] = node.position
          const rx = cy * x - sy * z
          const rz = sy * x + cy * z
          samples.push(Math.hypot(rx, cp * y - sp * rz))
        }
      }
    }
    samples.sort((a, b) => a - b)
    return Math.max(0.5, samples[Math.floor(samples.length * 0.96)])
  })()

  const linkData = new Float32Array(links.length * 2 * 5)
  links.forEach((link, index) => {
    const order = Math.max(link.from, link.to)
    const strength = Math.min(1, Math.max(0.16, (link.strength - 0.05) * 1.5))
    ;[link.from, link.to].forEach((end, side) => {
      const slot = (index * 2 + side) * 5
      linkData[slot] = nodes[end].position[0]
      linkData[slot + 1] = nodes[end].position[1]
      linkData[slot + 2] = nodes[end].position[2]
      linkData[slot + 3] = strength
      linkData[slot + 4] = order
    })
  })

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  )
  const instanceBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, instances, gl.STATIC_DRAW)
  const linkBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, linkBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, linkData, gl.STATIC_DRAW)

  const discArray = gl.createVertexArray()
  gl.bindVertexArray(discArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
  const stride = STRIDE * 4
  ;[
    [1, 3, 0],
    [2, 3, 12],
    [3, 1, 24],
    [4, 1, 28],
    [5, 1, 32],
  ].forEach(([location, size, offset]) => {
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset)
    gl.vertexAttribDivisor(location, 1)
  })

  const linkArray = gl.createVertexArray()
  gl.bindVertexArray(linkArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, linkBuffer)
  ;[
    [0, 3, 0],
    [1, 1, 12],
    [2, 1, 16],
  ].forEach(([location, size, offset]) => {
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 5 * 4, offset)
  })
  gl.bindVertexArray(null)

  const view = new Float32Array(16)
  const projection = new Float32Array(16)
  const state = {
    width: 1,
    height: 1,
    dpr: 1,
    yaw: -0.55,
    pitch: 0.24,
    yawTarget: -0.55,
    pitchTarget: 0.24,
    spin: 0,
    night: 0,
    nightTarget: 0,
    reveal: 0,
    active: -1,
    reduced: false,
    visible: true,
    disposed: false,
    ready: false,
    frame: 0,
    last: 0,
  }
  const screen = nodes.map(() => ({ x: 0, y: 0, z: 0, r: 0, visible: false }))
  const FOV = 41
  const HALF = Math.tan((FOV * Math.PI) / 360)
  // The window the configuration should fill, in canvas pixels.
  const focus = { x: 0, y: 0, width: 1, height: 1 }
  const eased = { x: 0, y: 0, width: 1, height: 1 }
  let framed = false

  function camera() {
    const aspect = state.width / Math.max(state.height, 1)
    const side = Math.max(60, Math.min(eased.width, eased.height))
    const distance = Math.min(
      12,
      Math.max(2.2, ((extent + 0.07) / (HALF * 0.98)) * (state.height / side)),
    )
    const shiftX = ((eased.x + eased.width / 2) / state.width) * 2 - 1
    const shiftY = 1 - ((eased.y + eased.height / 2) / state.height) * 2
    const cosPitch = Math.cos(state.pitch)
    const angle = state.yaw + state.spin
    lookAt(
      view,
      [
        Math.sin(angle) * cosPitch * distance,
        Math.sin(state.pitch) * distance,
        Math.cos(angle) * cosPitch * distance,
      ],
      [0, 0, 0],
    )
    perspective(projection, FOV, aspect, shiftX, shiftY, 0.1, 30)
  }

  // Same transform as the shaders, so overlay labels sit exactly on the discs.
  function projectPoints() {
    for (let index = 0; index < count; index++) {
      const slot = index * STRIDE
      const x = instances[slot]
      const y = instances[slot + 1]
      const z = instances[slot + 2]
      const vx = view[0] * x + view[4] * y + view[8] * z + view[12]
      const vy = view[1] * x + view[5] * y + view[9] * z + view[13]
      const vz = view[2] * x + view[6] * y + view[10] * z + view[14]
      const w = -vz || 1e-6
      const point = screen[index]
      point.x =
        ((projection[0] * vx) / w - projection[8] + 1) * 0.5 * state.width
      point.y =
        (1 - ((projection[5] * vy) / w - projection[9])) * 0.5 * state.height
      point.z = w
      point.r = ((projection[5] * radii[index]) / w) * 0.5 * state.height
      point.visible = w > 0.2
      depths[index].index = index
      depths[index].depth = w
    }
  }

  // No depth buffer: the markers are drawn far to near so they overlap the way
  // the eye expects, which matters most for the opaque paper rendering.
  function sortInstances() {
    depths.sort((a, b) => b.depth - a.depth)
    for (let position = 0; position < count; position++) {
      const from = depths[position].index * STRIDE
      sorted.set(instances.subarray(from, from + STRIDE), position * STRIDE)
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, sorted)
  }

  function draw() {
    const width = Math.max(1, Math.round(state.width * state.dpr))
    const height = Math.max(1, Math.round(state.height * state.dpr))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    camera()
    projectPoints()
    sortInstances()
    gl.viewport(0, 0, width, height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    const night = state.night
    gl.useProgram(linkProgram)
    gl.uniformMatrix4fv(linkUniform.uView, false, view)
    gl.uniformMatrix4fv(linkUniform.uProjection, false, projection)
    gl.uniform1f(linkUniform.uReveal, state.reveal)
    gl.uniform1f(linkUniform.uCount, count)
    gl.uniform3f(
      linkUniform.uLinkColour,
      0.1 + night * 0.3,
      0.11 + night * 0.52,
      0.14 + night * 0.66,
    )
    gl.uniform1f(linkUniform.uLinkAlpha, 0.52 + night * 0.4)
    gl.bindVertexArray(linkArray)
    gl.drawArrays(gl.LINES, 0, links.length * 2)

    gl.useProgram(discProgram)
    gl.uniformMatrix4fv(discUniform.uView, false, view)
    gl.uniformMatrix4fv(discUniform.uProjection, false, projection)
    gl.uniform1f(discUniform.uNight, night)
    gl.uniform1f(discUniform.uReveal, state.reveal)
    gl.uniform1f(discUniform.uCount, count)
    gl.uniform1f(discUniform.uActive, state.active)
    gl.bindVertexArray(discArray)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count)
    gl.bindVertexArray(null)
    onFrame?.(screen)
  }

  function settle(delta) {
    const ease = (value, target, time) =>
      value + (target - value) * (1 - Math.exp(-delta / time))
    const yaw = ease(state.yaw, state.yawTarget, 190)
    const pitch = ease(state.pitch, state.pitchTarget, 190)
    const night = ease(state.night, state.nightTarget, 260)
    let framing = false
    for (const key of ['x', 'y', 'width', 'height']) {
      const next = framed ? ease(eased[key], focus[key], 210) : focus[key]
      if (Math.abs(next - eased[key]) > 0.4) framing = true
      eased[key] = next
    }
    framed = true
    let fading = false
    for (let index = 0; index < count; index++) {
      const slot = index * STRIDE + 8
      const next = ease(instances[slot], muted[index], 150)
      if (Math.abs(next - muted[index]) > 0.002) fading = true
      instances[slot] =
        Math.abs(next - muted[index]) < 0.002 ? muted[index] : next
    }
    const moving =
      fading ||
      framing ||
      Math.abs(yaw - state.yaw) > 0.00004 ||
      Math.abs(pitch - state.pitch) > 0.00004 ||
      Math.abs(night - state.night) > 0.0004
    state.yaw = yaw
    state.pitch = pitch
    state.night = night
    if (state.reduced) {
      state.reveal = 1
      return moving
    }
    state.reveal = Math.min(1, state.reveal + delta / 1500)
    state.spin += delta * 0.000048
    return true
  }

  function tick(now) {
    state.frame = 0
    if (state.disposed) return
    const delta = state.last ? Math.min(now - state.last, 50) : 16
    state.last = now
    const moving = settle(delta)
    draw()
    if (!state.ready) {
      state.ready = true
      onReady?.()
    }
    if (state.visible && moving) request()
    else state.last = 0
  }

  function request() {
    if (!state.frame && !state.disposed)
      state.frame = requestAnimationFrame(tick)
  }

  const lost = (event) => {
    event.preventDefault()
    state.disposed = true
  }
  canvas.addEventListener('webglcontextlost', lost)

  return {
    resize(width, height, dpr) {
      state.width = width
      state.height = height
      state.dpr = Math.min(dpr, 2)
      request()
    },
    // The rectangle, in canvas pixels, the configuration should fill.
    setFocus(rect) {
      focus.x = rect.x
      focus.y = rect.y
      focus.width = Math.max(1, rect.width)
      focus.height = Math.max(1, rect.height)
      request()
    },
    setNight(night) {
      state.nightTarget = night ? 1 : 0
      request()
    },
    orbit(yaw, pitch) {
      state.yawTarget = yaw
      state.pitchTarget = Math.max(-0.75, Math.min(0.75, pitch))
      request()
    },
    nudge(yaw, pitch) {
      this.orbit(state.yawTarget + yaw, state.pitchTarget + pitch)
    },
    get orientation() {
      return { yaw: state.yawTarget, pitch: state.pitchTarget }
    },
    setReducedMotion(reduced) {
      state.reduced = reduced
      if (reduced) state.reveal = 1
      request()
    },
    setActive(index) {
      const next = typeof index === 'number' && index >= 0 ? index : -1
      if (next === state.active) return
      state.active = next
      request()
    },
    // A set of visible node indexes; everything else recedes.
    setVisibleNodes(allowed) {
      for (let index = 0; index < count; index++)
        muted[index] = !allowed || allowed.has(index) ? 0 : 1
      request()
    },
    setVisible(visible) {
      state.visible = visible
      if (visible) request()
    },
    jump() {
      state.yaw = state.yawTarget
      state.pitch = state.pitchTarget
      state.night = state.nightTarget
      framed = false
      request()
    },
    // Nearest disc to a canvas-space point, favouring the one in front.
    pick(x, y) {
      let best = -1
      let bestScore = Infinity
      for (let index = 0; index < count; index++) {
        const point = screen[index]
        if (!point.visible || muted[index] > 0.5) continue
        const distance = Math.hypot(point.x - x, point.y - y)
        const reach = Math.max(point.r * 2.2, 16)
        if (distance > reach) continue
        const score = distance - point.r * 0.9 + point.z * 3
        if (score < bestScore) {
          bestScore = score
          best = index
        }
      }
      return best
    },
    positions: screen,
    dispose() {
      state.disposed = true
      cancelAnimationFrame(state.frame)
      canvas.removeEventListener('webglcontextlost', lost)
      gl.deleteBuffer(quad)
      gl.deleteBuffer(instanceBuffer)
      gl.deleteBuffer(linkBuffer)
      gl.deleteVertexArray(discArray)
      gl.deleteVertexArray(linkArray)
      gl.deleteProgram(discProgram)
      gl.deleteProgram(linkProgram)
    },
  }
}
