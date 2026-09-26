import { SCENE, windowApex } from './scene.js'

const f = (value) => {
  const text = String(+value.toFixed(6))
  return text.includes('.') || text.includes('e') ? text : `${text}.0`
}

export const vertexShader = `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`

export function fragmentShader() {
  const w = SCENE.window
  const l = SCENE.lattice
  const fr = SCENE.frame
  return `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec3 uCamera;
uniform vec3 uTarget;
uniform float uTanHalf;
uniform vec3 uSun;
uniform vec3 uLamp;
uniform float uNight;
uniform float uShafts;
uniform float uPhotoReady;
uniform sampler2D uPhoto;
out vec4 fragColor;

#define WX ${f(w.plane)}
#define WU ${f(w.u)}
#define WA ${f(w.halfWidth)}
#define WSILL ${f(w.sill)}
#define WSPRING ${f(w.spring)}
#define WAPEX ${f(windowApex())}
#define CELL ${f(l.cell)}
#define BAR ${f(l.bar)}
#define MARGIN ${f(l.margin)}
#define FC vec2(${f(fr.x)}, ${f(fr.y)})
#define FH vec2(${f(fr.halfWidth)}, ${f(fr.halfHeight)})
#define FD ${f(fr.depth)}
#define FB ${f(fr.border)}
#define FM ${f(fr.mat)}
#define SUN_SOFT ${f(SCENE.sun.soft)}
#define LAMP_R ${f(SCENE.lamp.radius)}
#define LAMP_POWER ${f(SCENE.lamp.power)}

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 s = fract(p);
  s = s * s * (3.0 - 2.0 * s);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), s.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), s.x), s.y);
}
float rect(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Pointed (lancet) arch: negative inside the opening.
float arch(vec2 w) {
  float x = abs(w.x - WU);
  if (w.y < WSPRING) return max(x - WA, WSILL - w.y);
  return length(vec2(x + WA, w.y - WSPRING)) - 2.0 * WA;
}

// Star-and-cross jali: carved bars trace eight-point stars whose tips touch,
// leaving star-shaped and cross-shaped openings. Positive in the openings.
float lattice(vec2 w) {
  vec2 q = abs(fract(w / CELL) - 0.5);
  if (q.y > q.x) q = q.yx;
  float square = q.x - 0.35355339;
  float diamond = (q.x + q.y - 0.5) * 0.70710678;
  return abs(min(square, diamond)) * CELL - BAR * 0.5;
}

float opening(vec2 w) { return min(-(arch(w) + MARGIN), lattice(w)); }

// Light from a distant sun, softened by distance from the lattice.
float sunLight(vec3 p, float soft) {
  if (uSun.x > -0.01) return 0.0;
  float t = (WX - p.x) / uSun.x;
  vec2 w = vec2(p.z + t * uSun.z, p.y + t * uSun.y);
  float pen = soft * t + 0.003;
  return smoothstep(-pen, pen, opening(w));
}

// Light from a lantern outside the window: perspective shadows.
float lampLight(vec3 p) {
  vec3 d = uLamp - p;
  float dist = length(d);
  vec3 l = d / dist;
  if (l.x > -0.01) return 0.0;
  float t = (WX - p.x) / l.x;
  vec2 w = vec2(p.z + t * l.z, p.y + t * l.y);
  float pen = LAMP_R * t / max(dist - t, 0.3) + 0.003;
  return smoothstep(-pen, pen, opening(w));
}

float glow(vec3 p, vec3 l) {
  if (l.x > -0.01) return 0.0;
  float t = (WX - p.x) / l.x;
  vec2 w = vec2(p.z + t * l.z, p.y + t * l.y);
  return smoothstep(-0.8, 0.9, -arch(w));
}

// Shadow the frame casts on the wall behind it.
float frameShadow(vec3 p, vec3 l) {
  if (l.z < 0.02) return 1.0;
  vec2 q = p.xy + l.xy * (FD / l.z);
  return smoothstep(-0.004, 0.014, rect(q - FC, FH));
}

// 0 wall, 1 floor, 2 frame front, 3 frame edge
vec4 trace(vec3 ro, vec3 rd, out vec3 normal) {
  float best = 1e6;
  float id = -1.0;
  normal = vec3(0.0, 0.0, 1.0);
  if (rd.z < 0.0) {
    float t = -ro.z / rd.z;
    if (ro.y + rd.y * t >= 0.0) { best = t; id = 0.0; }
  }
  if (rd.y < 0.0) {
    float t = -ro.y / rd.y;
    if (ro.z + rd.z * t >= 0.0 && t < best) { best = t; id = 1.0; normal = vec3(0, 1, 0); }
  }
  vec3 safe = rd + vec3(equal(rd, vec3(0.0))) * 1e-6;
  vec3 inv = 1.0 / safe;
  vec3 t0 = (vec3(FC - FH, 0.0) - ro) * inv;
  vec3 t1 = (vec3(FC + FH, FD) - ro) * inv;
  vec3 lo = min(t0, t1);
  vec3 hi = max(t0, t1);
  float near = max(max(lo.x, lo.y), lo.z);
  float far = min(min(hi.x, hi.y), hi.z);
  if (near < far && near > 0.0 && near < best) {
    best = near;
    if (near == lo.z) { id = 2.0; normal = vec3(0, 0, 1); }
    else if (near == lo.x) { id = 3.0; normal = vec3(-sign(rd.x), 0, 0); }
    else { id = 3.0; normal = vec3(0, -sign(rd.y), 0); }
  }
  return vec4(ro + rd * best, id);
}

// grad and boards are filter widths measured in uniform control flow.
vec3 surface(vec3 p, float id, vec4 grad, float boards, out float ao) {
  ao = 1.0;
  if (id < 0.5) {
    float grain = noise(p.xy * 5.0) * 0.55 + noise(p.xy * 31.0) * 0.45;
    ao *= mix(0.58, 1.0, smoothstep(0.0, 0.75, p.y));
    float contact = rect(p.xy - FC, FH);
    ao *= 1.0 - 0.55 * exp(-max(contact, 0.0) / 0.022);
    ao *= 1.0 - 0.2 * exp(-max(rect(p.xy - FC + vec2(0.0, 0.06), FH), 0.0) / 0.18);
    return mix(vec3(0.70, 0.70, 0.67), vec3(0.74, 0.72, 0.69), grain);
  }
  if (id < 1.5) {
    // Oiled oak boards running toward the viewer.
    float board = floor(p.x / 0.17);
    float along = fract(p.x / 0.17);
    float seam = min(along, 1.0 - along) * 0.17;
    float width = boards * 1.2 + 0.0008;
    float grain = noise(vec2(board * 7.3, p.z * 3.0)) * 0.5 + noise(vec2(p.x * 40.0, p.z * 1.4)) * 0.5;
    ao *= mix(0.5, 1.0, smoothstep(0.0, 0.7, p.z));
    ao *= mix(0.72, 1.0, smoothstep(0.0012, 0.0012 + width, seam));
    return vec3(0.115, 0.078, 0.052) * (0.84 + 0.2 * hash(vec2(board, 3.0)) + 0.14 * grain);
  }
  if (id < 2.5) {
    vec2 local = p.xy - FC;
    float matEdge = rect(local, FH - FB);
    float photoEdge = rect(local, FH - FB - FM);
    if (matEdge > 0.0) return vec3(0.045, 0.042, 0.04);
    if (photoEdge > 0.0) {
      ao *= 1.0 - 0.45 * exp(-photoEdge / 0.005);
      ao *= 1.0 - 0.35 * exp(matEdge / 0.012);
      return vec3(0.78, 0.765, 0.73);
    }
    vec2 uv = local / (2.0 * (FH - FB - FM)) + 0.5;
    vec3 photo = pow(textureGrad(uPhoto, uv, grad.xy, grad.zw).rgb, vec3(2.2)) * 0.95;
    return mix(vec3(0.22), photo, uPhotoReady);
  }
  ao = 0.75;
  return vec3(0.03);
}

vec3 shafts(vec3 ro, vec3 rd, float hit) {
  if (uShafts < 0.5) return vec3(0.0);
  float far = min(hit, 15.0);
  float jitter = hash(gl_FragCoord.xy);
  float day = 0.0;
  float night = 0.0;
  for (int i = 0; i < 18; i++) {
    vec3 s = ro + rd * ((float(i) + jitter) / 18.0 * far);
    if (s.x < WX || s.y < 0.0 || s.z < 0.0) continue;
    if (uNight < 0.999) day += sunLight(s, SUN_SOFT * 1.6);
    if (uNight > 0.001) { vec3 d = uLamp - s; night += lampLight(s) / dot(d, d); }
  }
  float step = far / 18.0;
  return mix(vec3(1.0, 0.86, 0.68) * day * step * 0.012,
             vec3(1.0, 0.6, 0.28) * night * step * LAMP_POWER * 0.0016, uNight);
}

vec3 tonemap(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 camForward;
vec3 camRight;
vec3 camUp;

vec3 rayAt(vec2 frag) {
  vec2 ndc = frag / uResolution * 2.0 - 1.0;
  return normalize(camForward + camRight * ndc.x * uTanHalf * uResolution.x / uResolution.y + camUp * ndc.y * uTanHalf);
}

// Which surface, or which band of the frame front, a hit belongs to.
float band(vec4 hit) {
  if (abs(hit.w - 2.0) > 0.5) return hit.w;
  vec2 local = hit.xy - FC;
  if (rect(local, FH - FB) > 0.0) return 2.0;
  return rect(local, FH - FB - FM) > 0.0 ? 2.25 : 2.5;
}

// Albedo under sunlight or lantern light, before shafts and exposure.
vec3 lit(vec4 hit, vec3 n, vec4 grad, float boards) {
  vec3 p = hit.xyz;
  float ao;
  vec3 albedo = surface(p, hit.w, grad, boards, ao);
  bool wall = hit.w < 0.5;
  vec3 dayLight = vec3(0.0);
  vec3 nightLight = vec3(0.0);

  if (uNight < 0.999) {
    vec3 sunColour = vec3(1.0, 0.83, 0.6) * 6.4;
    float sunFacing = max(dot(n, uSun), 0.0);
    float softness = hit.w > 1.5 ? SUN_SOFT * 2.4 : SUN_SOFT;
    float sun = sunFacing > 0.0 ? sunLight(p, softness) : 0.0;
    if (wall) sun *= frameShadow(p, uSun);
    vec3 dayAmbient = mix(vec3(0.54, 0.49, 0.43), vec3(0.72, 0.72, 0.74), n.y * 0.5 + 0.5) * 1.3;
    dayLight = dayAmbient * ao + sunColour * (sunFacing * sun + 0.045 * glow(p, uSun) * ao);
  }

  if (uNight > 0.001) {
    vec3 toLamp = uLamp - p;
    float lampDistance = dot(toLamp, toLamp);
    vec3 lampDir = toLamp * inversesqrt(lampDistance);
    vec3 lampColour = vec3(1.0, 0.6, 0.28) * LAMP_POWER / lampDistance;
    float lampFacing = max(dot(n, lampDir), 0.0);
    float lamp = lampFacing > 0.0 ? lampLight(p) : 0.0;
    if (wall) lamp *= frameShadow(p, lampDir);
    vec3 nightAmbient = mix(vec3(0.03, 0.03, 0.045), vec3(0.075, 0.09, 0.16), n.y * 0.5 + 0.5);
    nightLight = nightAmbient * ao + lampColour * (lampFacing * lamp + 0.05 * glow(p, lampDir) * ao);
  }

  return albedo * mix(dayLight, nightLight, uNight);
}

void main() {
  camForward = normalize(uTarget - uCamera);
  camRight = normalize(cross(camForward, vec3(0, 1, 0)));
  camUp = cross(camRight, camForward);
  vec2 ndc = gl_FragCoord.xy / uResolution * 2.0 - 1.0;
  vec3 rd = rayAt(gl_FragCoord.xy);

  // Texture and seam filter widths, measured on the planes in uniform flow.
  vec3 front = uCamera + rd * ((FD - uCamera.z) / min(rd.z, -1e-4));
  vec2 uv = (front.xy - FC) / (2.0 * (FH - FB - FM));
  vec4 grad = vec4(dFdx(uv), dFdy(uv));
  float floorX = uCamera.x + rd.x * (-uCamera.y / min(rd.y, -1e-4));
  float boards = min(fwidth(floorX), 0.05);

  vec3 n;
  vec4 hit = trace(uCamera, rd, n);
  vec3 extra = shafts(uCamera, rd, length(hit.xyz - uCamera));
  float exposure = (1.0 - 0.14 * smoothstep(0.6, 1.5, length(ndc * vec2(0.85, 1.0)))) * mix(1.0, 1.25, uNight);
  vec3 colour = tonemap((lit(hit, n, grad, boards) + extra) * exposure);

  // Supersample only pixels that straddle a silhouette or a frame band.
  const vec2 offsets[4] = vec2[4](vec2(0.125, 0.375), vec2(0.375, -0.125), vec2(-0.125, -0.375), vec2(-0.375, 0.125));
  vec4 hits[4];
  vec3 normals[4];
  float centre = band(hit);
  bool edge = false;
  for (int i = 0; i < 4; i++) {
    hits[i] = trace(uCamera, rayAt(gl_FragCoord.xy + offsets[i]), normals[i]);
    edge = edge || band(hits[i]) != centre;
  }
  if (edge) {
    colour = vec3(0.0);
    for (int i = 0; i < 4; i++)
      colour += tonemap((lit(hits[i], normals[i], grad, boards) + extra) * exposure);
    colour *= 0.25;
  }

  colour = pow(colour, vec3(1.0 / 2.2));
  colour += (hash(gl_FragCoord.xy + 17.0) - 0.5) / 255.0;
  fragColor = vec4(colour, 1.0);
}`
}
