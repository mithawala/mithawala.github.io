import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SCULPTURE_VARIANTS,
  SCULPTURE_VIEW,
  createSculptureGeometry,
  createSculptureIllustration,
  getSculpturePose,
  sculptureProjection,
  sculptureRotation,
} from '../src/asif/themes/gpt-6-astra-iteration-2/geometry.mjs'

for (const variant of SCULPTURE_VARIANTS) {
  test(`${variant}: fresh, deterministic, finite indexed mesh with unit normals`, () => {
    const geometry = createSculptureGeometry(variant)
    const second = createSculptureGeometry(variant)
    const count = geometry.positions.length / 3
    assert.equal(count, 321 * 25 * (variant === 'orbit' ? 2 : 1))
    assert.equal(geometry.normals.length, geometry.positions.length)
    assert.equal(
      geometry.indices.length,
      320 * 24 * 6 * geometry.componentCount,
    )
    assert.ok(geometry.positions instanceof Float32Array)
    assert.ok(geometry.normals instanceof Float32Array)
    assert.ok(geometry.indices instanceof Uint16Array)
    for (const key of ['positions', 'normals', 'indices']) {
      assert.notStrictEqual(geometry[key], second[key])
      assert.notStrictEqual(geometry[key].buffer, second[key].buffer)
      assert.deepEqual(geometry[key], second[key])
    }
    for (let offset = 0; offset < geometry.positions.length; offset += 3) {
      const point = geometry.positions.subarray(offset, offset + 3)
      const normal = geometry.normals.subarray(offset, offset + 3)
      assert.ok(point.every(Number.isFinite))
      assert.ok(normal.every(Number.isFinite))
      assert.ok(Math.abs(Math.hypot(...normal) - 1) < 1e-6)
      assert.ok(Math.hypot(...point) <= SCULPTURE_VIEW.radius + 1e-6)
    }
    assert.ok(geometry.indices.every((index) => index >= 0 && index < count))
    geometry.positions[0] += 1
    assert.notEqual(geometry.positions[0], second.positions[0])
  })

  test(`${variant}: closed seams and outward, non-degenerate triangles`, () => {
    const { positions, normals, indices, componentCount } =
      createSculptureGeometry(variant)
    const stride = 25
    const verticesPerCurve = 321 * stride
    for (const array of [positions, normals]) {
      for (let curve = 0; curve < componentCount; curve += 1) {
        const start = curve * verticesPerCurve * 3
        const end = start + 320 * stride * 3
        assert.deepEqual(
          array.slice(start, start + stride * 3),
          array.slice(end, end + stride * 3),
        )
        for (let ring = 0; ring <= 320; ring += 1) {
          const offset = start + ring * stride * 3
          assert.deepEqual(
            array.slice(offset, offset + 3),
            array.slice(offset + 24 * 3, offset + 25 * 3),
          )
        }
      }
    }
    for (let offset = 0; offset < indices.length; offset += 3) {
      const a = indices[offset] * 3
      const b = indices[offset + 1] * 3
      const c = indices[offset + 2] * 3
      const ab = [0, 1, 2].map(
        (axis) => positions[b + axis] - positions[a + axis],
      )
      const ac = [0, 1, 2].map(
        (axis) => positions[c + axis] - positions[a + axis],
      )
      const face = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
      ]
      assert.ok(Math.hypot(...face) > 1e-7)
      const facing = face.reduce(
        (sum, value, axis) =>
          sum +
          value * (normals[a + axis] + normals[b + axis] + normals[c + axis]),
        0,
      )
      assert.ok(facing > 0, `Triangle ${offset / 3} must face outward.`)
    }
  })

  test(`${variant}: default pose is substantial and fits the parent frame sizes`, () => {
    const geometry = createSculptureGeometry(variant)
    const rotation = sculptureRotation(getSculpturePose(variant))
    for (const aspect of [
      660 / (480 - 66),
      450 / (390 - 66),
      344 / (330 - 66),
      304 / (330 - 66),
      0.5,
      2.5,
    ]) {
      const projection = sculptureProjection(aspect)
      let minimumX = Infinity
      let minimumY = Infinity
      let maximumX = -Infinity
      let maximumY = -Infinity
      assert.ok(projection.every(Number.isFinite))
      for (let offset = 0; offset < geometry.positions.length; offset += 3) {
        const [x, y, z] = geometry.positions.subarray(offset, offset + 3)
        const rx = rotation[0] * x + rotation[3] * y + rotation[6] * z
        const ry = rotation[1] * x + rotation[4] * y + rotation[7] * z
        const rz = rotation[2] * x + rotation[5] * y + rotation[8] * z
        const distance = SCULPTURE_VIEW.distance - rz
        const projectedX = (rx * projection[0]) / distance
        const projectedY = (ry * projection[5]) / distance
        assert.ok(Math.abs(projectedX) < 0.95)
        assert.ok(Math.abs(projectedY) < 0.95)
        minimumX = Math.min(minimumX, projectedX)
        minimumY = Math.min(minimumY, projectedY)
        maximumX = Math.max(maximumX, projectedX)
        maximumY = Math.max(maximumY, projectedY)
      }
      if (aspect >= 1) {
        const widthInStageHeights = ((maximumX - minimumX) * aspect) / 2
        const heightInStageHeights = (maximumY - minimumY) / 2
        assert.ok(
          Math.max(widthInStageHeights, heightInStageHeights) >= 0.82,
          `${variant} must occupy at least 82% of the stage height along its longer axis.`,
        )
        if (variant !== 'orbit') {
          assert.ok(
            heightInStageHeights >= 0.82,
            `${variant} must have a substantial, non-edge-on default pose.`,
          )
        }
      }
    }
  })

  test(`${variant}: illustrated fallback is finite, layered, and rotatable`, () => {
    const pose = getSculpturePose(variant)
    const paths = createSculptureIllustration(variant, pose)
    const rotated = createSculptureIllustration(variant, {
      ...pose,
      yaw: pose.yaw + 0.5,
    })
    assert.equal(paths.length, variant === 'orbit' ? 96 : 48)
    assert.equal(new Set(paths.map((segment) => segment.id)).size, paths.length)
    for (const [index, segment] of paths.entries()) {
      assert.match(segment.path, /^M-?\d/)
      assert.doesNotMatch(segment.path, /NaN|Infinity/)
      assert.ok(Number.isFinite(segment.depth))
      assert.ok(segment.width > 0 && Number.isFinite(segment.width))
      assert.ok(segment.shade >= 0 && segment.shade <= 0.3)
      if (index) assert.ok(paths[index - 1].depth <= segment.depth)
    }
    assert.notDeepEqual(
      paths.map((segment) => segment.path),
      rotated.map((segment) => segment.path),
    )
    assert.notStrictEqual(paths, createSculptureIllustration(variant, pose))
  })
}

test('the enlarged view leaves a safe border at every possible rotation', () => {
  const { distance, radius } = SCULPTURE_VIEW
  const projectedRadius = radius / Math.sqrt(distance ** 2 - radius ** 2)
  for (const aspect of [0.5, 1, 304 / 264, 450 / 324, 660 / 414, 2.5]) {
    const projection = sculptureProjection(aspect)
    assert.ok(
      projectedRadius * Math.max(projection[0], projection[5]) < 0.95,
      'Even the rotated bounding sphere must stay inside 95% of the clip extent.',
    )
  }
})

test('the three studies have genuinely different geometry and silhouettes', () => {
  const meshes = SCULPTURE_VARIANTS.map((variant) =>
    createSculptureGeometry(variant, {
      tubularSegments: 128,
      radialSegments: 12,
    }),
  )
  assert.equal(meshes[0].componentCount, 1)
  assert.equal(meshes[1].componentCount, 2)
  assert.equal(meshes[2].componentCount, 1)
  let squaredDifference = 0
  for (let index = 0; index < meshes[0].positions.length; index += 1) {
    squaredDifference +=
      (meshes[0].positions[index] - meshes[2].positions[index]) ** 2
  }
  assert.ok(
    Math.sqrt(squaredDifference / meshes[0].positions.length) > 0.2,
    'Weave and bloom must not be the same curve with different labels.',
  )
  const illustrations = SCULPTURE_VARIANTS.map((variant) =>
    JSON.stringify(createSculptureIllustration(variant)),
  )
  assert.equal(new Set(illustrations).size, 3)
})

test('rotation matrices preserve lengths and poses are not shared mutable state', () => {
  const first = getSculpturePose()
  const second = getSculpturePose()
  first.yaw += 1
  assert.notEqual(first.yaw, second.yaw)
  for (const pose of [
    second,
    { pitch: -1.1, yaw: 2.9, roll: -0.4 },
    { pitch: 0, yaw: 0, roll: 0 },
  ]) {
    const rotation = sculptureRotation(pose)
    for (let column = 0; column < 3; column += 1) {
      const vector = rotation.slice(column * 3, column * 3 + 3)
      assert.ok(Math.abs(Math.hypot(...vector) - 1) < 1e-6)
      const next = ((column + 1) % 3) * 3
      const dot = vector.reduce(
        (sum, value, axis) => sum + value * rotation[next + axis],
        0,
      )
      assert.ok(Math.abs(dot) < 1e-6)
    }
  }
})

test('invalid shapes, frames, and unsupported mesh sizes fail explicitly', () => {
  assert.throws(() => createSculptureGeometry('unknown'), /Unknown sculpture/)
  assert.throws(() => getSculpturePose('unknown'), /Unknown sculpture/)
  assert.throws(
    () => createSculptureIllustration('unknown'),
    /Unknown sculpture/,
  )
  for (const tubularSegments of [0, 63, 64.5, NaN, Infinity]) {
    assert.throws(
      () => createSculptureGeometry('weave', { tubularSegments }),
      /tubularSegments/,
    )
  }
  for (const radialSegments of [0, 7, 8.5, NaN, Infinity]) {
    assert.throws(
      () => createSculptureGeometry('orbit', { radialSegments }),
      /radialSegments/,
    )
  }
  assert.throws(
    () =>
      createSculptureGeometry('orbit', {
        tubularSegments: 1000,
        radialSegments: 64,
      }),
    /unsigned-short/,
  )
  for (const aspect of [0, -1, Infinity, NaN]) {
    assert.throws(() => sculptureProjection(aspect), /aspect ratio/)
  }
  assert.throws(
    () => sculptureRotation({ pitch: NaN, yaw: 0, roll: 0 }),
    /finite angles/,
  )
})
