export const SCULPTURE_VARIANTS = Object.freeze(['weave', 'orbit', 'bloom'])

export const SCULPTURE_VIEW = Object.freeze({
  distance: 8,
  halfHeight: 2.25,
  radius: 2.05,
})

const TAU = Math.PI * 2

const studies = {
  weave: {
    radius: 0.38,
    pose: { pitch: 0.18, yaw: -0.28, roll: -0.2 },
    curves: [
      (t) => {
        const radius = 2 + 0.68 * Math.cos(3 * t)
        return [
          radius * Math.cos(2 * t),
          radius * Math.sin(2 * t),
          0.82 * Math.sin(3 * t),
        ]
      },
    ],
  },
  orbit: {
    radius: 0.3,
    pose: { pitch: 0.24, yaw: -0.2, roll: -0.24 },
    curves: [
      (t) => [1.25 * Math.cos(t) - 0.7, 1.25 * Math.sin(t), 0],
      (t) => [
        1.25 * Math.cos(t) + 0.7,
        1.25 * Math.sin(t) * Math.cos(1.04),
        1.25 * Math.sin(t) * Math.sin(1.04),
      ],
    ],
  },
  bloom: {
    radius: 0.29,
    pose: { pitch: 0.16, yaw: -0.2, roll: -0.12 },
    curves: [
      (t) => {
        const radius = 1.95 + 0.65 * Math.cos(5 * t)
        return [
          radius * Math.cos(2 * t),
          radius * Math.sin(2 * t),
          0.76 * Math.sin(5 * t),
        ]
      },
    ],
  },
}

function studyFor(variant) {
  if (!SCULPTURE_VARIANTS.includes(variant)) {
    throw new RangeError(`Unknown sculpture variant: ${String(variant)}`)
  }
  return studies[variant]
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function unit(vector) {
  const length = Math.hypot(...vector)
  if (!Number.isFinite(length) || length < 1e-10) {
    throw new RangeError('The sculpture contains a degenerate curve frame.')
  }
  return vector.map((value) => value / length)
}

function turn(vector, axis, angle) {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const perpendicular = cross(axis, vector)
  const parallel = dot(axis, vector) * (1 - cosine)
  return vector.map(
    (value, index) =>
      value * cosine + perpendicular[index] * sine + axis[index] * parallel,
  )
}

function centerlines(variant, segments) {
  const study = studyFor(variant)
  const minimum = [Infinity, Infinity, Infinity]
  const maximum = [-Infinity, -Infinity, -Infinity]
  const curves = study.curves.map((curve) =>
    Array.from({ length: segments }, (_, index) => {
      const point = curve((index / segments) * TAU)
      point.forEach((value, axis) => {
        minimum[axis] = Math.min(minimum[axis], value)
        maximum[axis] = Math.max(maximum[axis], value)
      })
      return point
    }),
  )
  const center = minimum.map((value, axis) => (value + maximum[axis]) / 2)
  let radius = 0
  for (const curve of curves) {
    for (const point of curve) {
      point.forEach((value, axis) => {
        point[axis] = value - center[axis]
      })
      radius = Math.max(radius, Math.hypot(...point))
    }
  }
  const scale = SCULPTURE_VIEW.radius / (radius + study.radius)
  return {
    curves: curves.map((curve) =>
      curve.map((point) => point.map((value) => value * scale)),
    ),
    tubeRadius: study.radius * scale,
  }
}

function curveFrames(points) {
  const count = points.length
  const tangents = points.map((_, index) => {
    const before = points[(index + count - 1) % count]
    const after = points[(index + 1) % count]
    return unit(after.map((value, axis) => value - before[axis]))
  })
  tangents.push(tangents[0])
  const reference = Math.abs(tangents[0][2]) < 0.85 ? [0, 0, 1] : [0, 1, 0]
  const normals = [unit(cross(tangents[0], reference))]
  for (let index = 1; index <= count; index += 1) {
    const axis = cross(tangents[index - 1], tangents[index])
    const sine = Math.hypot(...axis)
    let normal = normals[index - 1]
    if (sine > 1e-10) {
      normal = turn(
        normal,
        axis.map((value) => value / sine),
        Math.atan2(sine, dot(tangents[index - 1], tangents[index])),
      )
    }
    const parallel = dot(normal, tangents[index])
    normals.push(
      unit(
        normal.map(
          (value, component) => value - parallel * tangents[index][component],
        ),
      ),
    )
  }

  // Distribute the transported frame's closing twist to avoid a visible seam.
  const closingAngle = Math.atan2(
    dot(tangents[0], cross(normals[count], normals[0])),
    dot(normals[count], normals[0]),
  )
  return tangents.slice(0, count).map((tangent, index) => {
    const normal = unit(
      turn(normals[index], tangent, (closingAngle * index) / count),
    )
    return { normal, binormal: unit(cross(tangent, normal)) }
  })
}

export function getSculpturePose(variant = 'weave') {
  return { ...studyFor(variant).pose }
}

export function sculptureRotation(pose) {
  if (
    !pose ||
    ![pose.pitch, pose.yaw, pose.roll].every((value) => Number.isFinite(value))
  ) {
    throw new RangeError('Sculpture rotation requires three finite angles.')
  }
  const sx = Math.sin(pose.pitch)
  const cx = Math.cos(pose.pitch)
  const sy = Math.sin(pose.yaw)
  const cy = Math.cos(pose.yaw)
  const sz = Math.sin(pose.roll)
  const cz = Math.cos(pose.roll)
  return new Float32Array([
    cz * cy,
    sz * cy,
    -sy,
    cz * sy * sx - sz * cx,
    sz * sy * sx + cz * cx,
    cy * sx,
    cz * sy * cx + sz * sx,
    sz * sy * cx - cz * sx,
    cy * cx,
  ])
}

export function sculptureProjection(aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    throw new RangeError('Sculpture aspect ratio must be finite and positive.')
  }
  const near = 0.1
  const far = 40
  const focal =
    SCULPTURE_VIEW.distance /
    (SCULPTURE_VIEW.halfHeight * Math.max(1, 1 / aspect))
  return new Float32Array([
    focal / aspect,
    0,
    0,
    0,
    0,
    focal,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    -1,
    0,
    0,
    (2 * far * near) / (near - far),
    0,
  ])
}

export function createSculptureGeometry(
  variant = 'weave',
  { tubularSegments = 320, radialSegments = 24 } = {},
) {
  const study = studyFor(variant)
  if (!Number.isInteger(tubularSegments) || tubularSegments < 64) {
    throw new RangeError('tubularSegments must be an integer of at least 64.')
  }
  if (!Number.isInteger(radialSegments) || radialSegments < 8) {
    throw new RangeError('radialSegments must be an integer of at least 8.')
  }
  const stride = radialSegments + 1
  const verticesPerCurve = (tubularSegments + 1) * stride
  const vertexCount = verticesPerCurve * study.curves.length
  if (vertexCount > 65535) {
    throw new RangeError(
      'The sculpture must fit WebGL 1 unsigned-short indices.',
    )
  }
  const { curves, tubeRadius } = centerlines(variant, tubularSegments)
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const indices = new Uint16Array(
    tubularSegments * radialSegments * 6 * curves.length,
  )
  let indexOffset = 0

  curves.forEach((points, curveIndex) => {
    const frames = curveFrames(points)
    const vertexOffset = curveIndex * verticesPerCurve
    for (let ring = 0; ring <= tubularSegments; ring += 1) {
      const point = points[ring % tubularSegments]
      const { normal, binormal } = frames[ring % tubularSegments]
      for (let side = 0; side <= radialSegments; side += 1) {
        const angle = ((side % radialSegments) / radialSegments) * TAU
        const offset = (vertexOffset + ring * stride + side) * 3
        for (let axis = 0; axis < 3; axis += 1) {
          const outward =
            normal[axis] * Math.cos(angle) + binormal[axis] * Math.sin(angle)
          positions[offset + axis] = point[axis] + tubeRadius * outward
          normals[offset + axis] = outward
        }
      }
    }
    for (let ring = 0; ring < tubularSegments; ring += 1) {
      for (let side = 0; side < radialSegments; side += 1) {
        const a = vertexOffset + ring * stride + side
        const b = a + stride
        indices.set([a, a + 1, b, a + 1, b + 1, b], indexOffset)
        indexOffset += 6
      }
    }
  })

  return {
    positions,
    normals,
    indices,
    radius: SCULPTURE_VIEW.radius,
    tubeRadius,
    componentCount: curves.length,
  }
}

export function createSculptureIllustration(
  variant = 'weave',
  pose = getSculpturePose(variant),
) {
  const { curves, tubeRadius } = centerlines(variant, 192)
  const rotation = sculptureRotation(pose)
  const segments = []
  const scale = 480 / (SCULPTURE_VIEW.halfHeight * 2)
  const project = ([x, y, z]) => {
    const rotated = [
      rotation[0] * x + rotation[3] * y + rotation[6] * z,
      rotation[1] * x + rotation[4] * y + rotation[7] * z,
      rotation[2] * x + rotation[5] * y + rotation[8] * z,
    ]
    const perspective =
      SCULPTURE_VIEW.distance / (SCULPTURE_VIEW.distance - rotated[2])
    return {
      x: 300 + rotated[0] * scale * perspective,
      y: 240 - rotated[1] * scale * perspective,
      z: rotated[2],
      perspective,
    }
  }

  curves.forEach((curve, curveIndex) => {
    const points = curve.map(project)
    for (let start = 0; start < points.length; start += 4) {
      const section = Array.from(
        { length: 5 },
        (_, index) => points[(start + index) % points.length],
      )
      const depth =
        section.reduce((sum, point) => sum + point.z, 0) / section.length
      const perspective =
        section.reduce((sum, point) => sum + point.perspective, 0) /
        section.length
      segments.push({
        id: `${curveIndex}-${start}`,
        path: section
          .map(
            (point, index) =>
              `${index === 0 ? 'M' : 'L'}${point.x.toFixed(3)},${point.y.toFixed(3)}`,
          )
          .join(' '),
        width: tubeRadius * 2 * scale * perspective,
        depth,
        shade: Math.max(0, Math.min(0.3, (0.7 - depth) / 7)),
      })
    }
  })
  return segments.sort((a, b) => a.depth - b.depth)
}
