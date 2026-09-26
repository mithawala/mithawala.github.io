// World units are metres. The back wall is the plane z = 0, the floor is y = 0,
// and light enters through an arched lattice window in the side wall
// x = window.plane. JavaScript and GLSL share these numbers so the WebGL room,
// the static fallback, and the museum label stay aligned.
export const SCENE = {
  window: { plane: -5.2, u: 4.05, halfWidth: 0.82, sill: 1.3, spring: 3.85 },
  lattice: { cell: 0.36, bar: 0.052, margin: 0.1 },
  frame: {
    x: 1.62,
    y: 2.02,
    halfWidth: 0.6,
    halfHeight: 0.6,
    depth: 0.055,
    border: 0.045,
    mat: 0.135,
  },
  sun: { azimuth: 58, elevation: 16.5, range: 7, soft: 0.0021 },
  lamp: { distance: 22, shift: 0.4, radius: 0.05, power: 690 },
}

export const windowApex = () =>
  SCENE.window.spring + SCENE.window.halfWidth * Math.sqrt(3)

const radians = (degrees) => (degrees * Math.PI) / 180
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const normalize = (a) => scale(a, 1 / Math.hypot(a[0], a[1], a[2]))

// Unit vector pointing from a surface toward the sun.
export function sunDirection(azimuth, elevation) {
  const az = radians(azimuth)
  const el = radians(elevation)
  return [
    -Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el),
  ]
}

// Carry a point on the window plane to the back wall along the incoming light.
export function onWall(point, light) {
  if (light.type === 'sun')
    return sub(point, scale(light.direction, point[2] / light.direction[2]))
  const ray = sub(point, light.position)
  return add(point, scale(ray, -point[2] / ray[2]))
}

export function windowCentre() {
  const w = SCENE.window
  return [w.plane, (w.sill + windowApex()) / 2, w.u]
}

// The lantern stands outside the window on the line through the opening's
// centre, so night light falls where the morning light fell.
export function lampPosition(direction) {
  const centre = windowCentre()
  const target = add(onWall(centre, { type: 'sun', direction }), [
    SCENE.lamp.shift,
    0,
    0,
  ])
  return add(centre, scale(normalize(sub(centre, target)), SCENE.lamp.distance))
}

export function cameraFor(width, height, stacked = false) {
  const aspect = width / Math.max(height, 1)
  if (stacked) {
    const x = SCENE.frame.x - 0.07
    const distance = aspect > 1.15 ? 6.4 : 5.6
    return { position: [x, 1.75, distance], target: [x, 1.38, 0], fov: 44 }
  }
  if (aspect >= 1.25)
    return { position: [0.35, 1.62, 7.4], target: [0.35, 1.5, 0], fov: 38 }
  return { position: [0.2, 1.55, 8.4], target: [0.2, 1.3, 0], fov: 44 }
}

export function withParallax(camera, x = 0, y = 0) {
  return {
    ...camera,
    position: add(camera.position, [x * 0.2, -y * 0.1, 0]),
    target: add(camera.target, [x * 0.05, -y * 0.03, 0]),
  }
}

function basis(camera) {
  const forward = normalize(sub(camera.target, camera.position))
  const right = normalize(cross(forward, [0, 1, 0]))
  return { forward, right, up: cross(right, forward) }
}

export function project(point, camera, width, height) {
  const { forward, right, up } = basis(camera)
  const d = sub(point, camera.position)
  const depth = dot(d, forward)
  const tanHalf = Math.tan(radians(camera.fov) / 2)
  return [
    ((dot(d, right) / (depth * tanHalf * (width / height)) + 1) / 2) * width,
    ((1 - dot(d, up) / (depth * tanHalf)) / 2) * height,
  ]
}

export function frameRect(camera, width, height) {
  const f = SCENE.frame
  const [left, top] = project(
    [f.x - f.halfWidth, f.y + f.halfHeight, f.depth],
    camera,
    width,
    height,
  )
  const [right, bottom] = project(
    [f.x + f.halfWidth, f.y - f.halfHeight, f.depth],
    camera,
    width,
    height,
  )
  return { left, top, width: right - left, height: bottom - top }
}

export function floorLine(camera, width, height) {
  return project([camera.target[0], 0, 0], camera, width, height)[1]
}

// Screen corners of the window's bounding rectangle as it lands on the wall.
export function patchCorners(camera, width, height, light) {
  const w = SCENE.window
  const apex = windowApex()
  return [
    [w.u - w.halfWidth, apex],
    [w.u + w.halfWidth, apex],
    [w.u + w.halfWidth, w.sill],
    [w.u - w.halfWidth, w.sill],
  ].map(([u, v]) =>
    project(onWall([w.plane, v, u], light), camera, width, height),
  )
}

// CSS matrix3d that maps a width x height rectangle onto four screen corners
// ordered top-left, top-right, bottom-right, bottom-left.
export function quadMatrix(width, height, corners) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = corners
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const sx = x0 - x1 + x2 - x3
  const sy = y0 - y1 + y2 - y3
  const det = dx1 * dy2 - dx2 * dy1
  const g = (sx * dy2 - dx2 * sy) / det
  const h = (dx1 * sy - sx * dy1) / det
  const a = x1 - x0 + g * x1
  const b = x3 - x0 + h * x3
  const d = y1 - y0 + g * y1
  const e = y3 - y0 + h * y3
  const m = [
    a / width,
    d / width,
    0,
    g / width,
    b / height,
    e / height,
    0,
    h / height,
    0,
    0,
    1,
    0,
    x0,
    y0,
    0,
    1,
  ]
  return `matrix3d(${m.map((value) => +value.toFixed(8)).join(',')})`
}
