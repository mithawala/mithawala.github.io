import { SCENE, sunDirection, lampPosition, withParallax } from './scene.js'
import { vertexShader, fragmentShader } from './shader.js'

export function supportsRoom() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader) || 'Shader failed to compile')
  return shader
}

// Current light direction for a slider value, pointer, and scroll position.
export function lightFor({ light, pointerX, pointerY, scroll }) {
  const { azimuth, elevation, range } = SCENE.sun
  return sunDirection(
    azimuth + (light - 0.5) * 2 * range + pointerX * 3.5 + scroll * 5,
    elevation - pointerY * 2.2 + scroll * 2,
  )
}

export function createRoom(canvas, { photo, onReady, onFail, onCamera }) {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  })
  if (!gl) throw new Error('WebGL2 is unavailable')
  const program = gl.createProgram()
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexShader))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentShader()))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program) || 'Shader failed to link')
  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  )
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const position = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  const uniform = Object.fromEntries(
    [
      'uResolution',
      'uCamera',
      'uTarget',
      'uTanHalf',
      'uSun',
      'uLamp',
      'uNight',
      'uShafts',
      'uPhotoReady',
      'uPhoto',
    ].map((name) => [name, gl.getUniformLocation(program, name)]),
  )

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([60, 60, 60, 255]),
  )
  gl.uniform1i(uniform.uPhoto, 0)

  const state = {
    width: 1,
    height: 1,
    dpr: 1,
    camera: null,
    light: { value: 0.5, target: 0.5 },
    scroll: { value: 0, target: 0 },
    pointer: { x: 0, y: 0, tx: 0, ty: 0 },
    night: { value: 0, target: 0 },
    photoReady: 0,
    visible: true,
    reduced: false,
    interactiveScale: 1,
    shafts: 1,
    frame: 0,
    dirty: true,
    disposed: false,
    announced: false,
  }

  const image = new Image()
  image.decoding = 'async'
  image.onload = () => {
    if (state.disposed) return
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    state.photoReady = 1
    request()
  }
  image.onerror = () => {
    state.photoReady = 1
    request()
  }
  image.src = photo

  function draw(scale, shafts) {
    const width = Math.max(1, Math.round(state.width * state.dpr * scale))
    const height = Math.max(1, Math.round(state.height * state.dpr * scale))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    const camera = withParallax(state.camera, state.pointer.x, state.pointer.y)
    const direction = lightFor({
      light: state.light.value,
      pointerX: state.pointer.x,
      pointerY: state.pointer.y,
      scroll: state.scroll.value,
    })
    gl.viewport(0, 0, width, height)
    gl.uniform2f(uniform.uResolution, width, height)
    gl.uniform3fv(uniform.uCamera, camera.position)
    gl.uniform3fv(uniform.uTarget, camera.target)
    gl.uniform1f(uniform.uTanHalf, Math.tan((camera.fov * Math.PI) / 360))
    gl.uniform3fv(uniform.uSun, direction)
    gl.uniform3fv(uniform.uLamp, lampPosition(direction))
    gl.uniform1f(uniform.uNight, state.night.value)
    gl.uniform1f(uniform.uShafts, shafts)
    gl.uniform1f(uniform.uPhotoReady, state.photoReady)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    onCamera?.(camera, direction, state.night.value)
  }

  // Eases every animated input toward its target; returns true while moving.
  function settle(dt) {
    const approach = (value, target, time) =>
      state.reduced
        ? target
        : value + (target - value) * (1 - Math.exp(-dt / time))
    const p = state.pointer
    p.x = approach(p.x, p.tx, 110)
    p.y = approach(p.y, p.ty, 110)
    state.light.value = approach(state.light.value, state.light.target, 120)
    state.scroll.value = approach(state.scroll.value, state.scroll.target, 90)
    state.night.value = approach(state.night.value, state.night.target, 380)
    const pending = [
      [p.x, p.tx],
      [p.y, p.ty],
      [state.light.value, state.light.target],
      [state.scroll.value, state.scroll.target],
      [state.night.value, state.night.target],
    ]
    const moving = pending.some(
      ([value, target]) => Math.abs(target - value) > 0.002,
    )
    if (!moving) {
      p.x = p.tx
      p.y = p.ty
      state.light.value = state.light.target
      state.scroll.value = state.scroll.target
      state.night.value = state.night.target
    }
    return moving
  }

  let last = 0
  function tick(now) {
    state.frame = 0
    if (state.disposed || !state.camera) return
    if (!state.visible) {
      state.dirty = true
      return
    }
    const moving = settle(last ? Math.min(now - last, 64) : 16)
    last = now
    if (moving) {
      draw(state.interactiveScale, state.shafts > 1 ? 1 : 0)
      state.frame = requestAnimationFrame(tick)
      return
    }
    last = 0
    const started = performance.now()
    draw(1, state.shafts ? 1 : 0)
    state.dirty = false
    if (state.photoReady && !state.announced) {
      gl.finish()
      const cost = performance.now() - started
      state.interactiveScale = cost > 60 ? 0.5 : cost > 28 ? 0.72 : 1
      state.shafts = cost > 400 ? 0 : cost < 18 ? 2 : 1
      state.announced = true
      canvas.dataset.frameCost = String(Math.round(cost))
      onReady?.()
    }
  }

  function request() {
    if (!state.frame && !state.disposed)
      state.frame = requestAnimationFrame(tick)
  }

  const lost = (event) => {
    event.preventDefault()
    onFail?.(new Error('WebGL context lost'))
  }
  canvas.addEventListener('webglcontextlost', lost)

  return {
    resize(width, height, dpr, camera) {
      Object.assign(state, { width, height, dpr: Math.min(dpr, 1.75), camera })
      request()
    },
    setPointer(x, y) {
      state.pointer.tx = x
      state.pointer.ty = y
      request()
    },
    setLight(value) {
      state.light.target = value
      request()
    },
    setScroll(value) {
      if (Math.abs(value - state.scroll.target) < 0.002) return
      state.scroll.target = value
      request()
    },
    setNight(night) {
      state.night.target = night ? 1 : 0
      request()
    },
    setVisible(visible) {
      state.visible = visible
      if (visible && state.dirty) request()
    },
    setReducedMotion(reduced) {
      state.reduced = reduced
      request()
    },
    jump() {
      state.pointer.x = state.pointer.tx
      state.pointer.y = state.pointer.ty
      state.light.value = state.light.target
      state.scroll.value = state.scroll.target
      state.night.value = state.night.target
      request()
    },
    dispose() {
      state.disposed = true
      cancelAnimationFrame(state.frame)
      canvas.removeEventListener('webglcontextlost', lost)
      image.onload = null
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    },
  }
}
