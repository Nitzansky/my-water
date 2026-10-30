// Ported from the design handoff (dispenser/model.js); three.js is now a bundled dependency.
// Water dispenser — procedural model. Units: meters, y-up, base at y=0, front faces +z.
import * as THREE from 'three';

export const DIM = {
  W: 0.160, H: 0.414, zF: 0.17, zB: -0.17, rF: 0.018, rB: 0.03,
  cav: { hw: 0.078, yb: 0.1427, yt: 0.315, ysplit: 0.249, rt: 0.03, rb: 0.0015, depth: 0.11, rh: 0.0045, rc: 0.007 },
  trayTop: 0.150, grilleTop: 0.1497, grilleR: 0.046, tipY: 0.2792, zN: 0.12,
  panel: { hw: 0.0787, y0: 0.3246, y1: 0.3955 },
  screen: { w: 0.060, h: 0.0384, y: 0.3672 },
  button: { x: 0.063, y: 0.3631, size: 0.017 },
};

const V2 = (x, y) => new THREE.Vector2(x, y);

/* ---------- geometry helpers ---------- */
function dedupe(pts) {
  const out = [];
  for (const p of pts) { const l = out[out.length - 1]; if (!l || l.distanceTo(p) > 1e-7) out.push(p.clone()); }
  if (out.length > 1 && out[0].distanceTo(out[out.length - 1]) < 1e-7) out.pop();
  return out;
}
function outline(shape, div = 24) {
  const pts = dedupe(shape.getPoints(div));
  if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
  return pts;
}
function normals2D(pts) {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const t = V2(b.x - a.x, b.y - a.y).normalize();
    return V2(t.y, -t.x);
  });
}
function buildGeom(pos, nor, uv, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
// Make triangle winding agree with authored vertex normals (majority vote).
function orient(g) {
  const p = g.attributes.position, n = g.attributes.normal, ix = g.index.array;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
  let score = 0;
  for (let i = 0; i < ix.length; i += 3) {
    A.fromBufferAttribute(p, ix[i]); B.fromBufferAttribute(p, ix[i + 1]); C.fromBufferAttribute(p, ix[i + 2]);
    B.sub(A); C.sub(A); B.cross(C);
    if (B.lengthSq() < 1e-16) continue;
    N.fromBufferAttribute(n, ix[i]); score += Math.sign(B.dot(N));
  }
  if (score < 0) for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  return g;
}
// Sweep a closed outline through rings: pos = p + n*off at depth z; normal = (n*ns, nz)
function sweep(pts, nrm, rings, filter) {
  const n = pts.length, cols = n + 1, pos = [], nor = [], uv = [], idx = [];
  const len = [0];
  for (let i = 1; i <= n; i++) len.push(len[i - 1] + pts[i % n].distanceTo(pts[i - 1]));
  const L = len[n], v = new THREE.Vector3();
  rings.forEach((r, ri) => {
    for (let i = 0; i <= n; i++) {
      const p = pts[i % n], q = nrm[i % n];
      pos.push(p.x + q.x * r.off, p.y + q.y * r.off, r.z);
      v.set(q.x * r.ns, q.y * r.ns, r.nz).normalize(); nor.push(v.x, v.y, v.z);
      uv.push(len[i] / L * 4, ri / Math.max(1, rings.length - 1));
    }
  });
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < n; i++) {
    if (filter && !filter(i)) continue;
    const a = r * cols + i, b = a + 1, c = a + cols, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  return orient(buildGeom(pos, nor, uv, idx));
}
function cap(contour, holes, z, dir) {
  const c = contour.slice(); if (!THREE.ShapeUtils.isClockWise(c)) c.reverse();
  const hs = holes.map(h => { const a = h.slice(); if (THREE.ShapeUtils.isClockWise(a)) a.reverse(); return a; });
  const tris = THREE.ShapeUtils.triangulateShape(c, hs);
  const all = c.concat(...hs), pos = [], nor = [], uv = [], idx = [];
  for (const p of all) { pos.push(p.x, p.y, z); nor.push(0, 0, dir); uv.push(p.x * 3 + 0.5, p.y * 3); }
  for (const [a, b, cc] of tris) {
    const A = all[a], B = all[b], C = all[cc];
    const cr = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
    if (cr * dir >= 0) idx.push(a, b, cc); else idx.push(a, cc, b);
  }
  return buildGeom(pos, nor, uv, idx);
}
function merge(list) {
  const pos = [], nor = [], uv = [], idx = []; let off = 0;
  for (const g of list) {
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array);
    for (const i of g.index.array) idx.push(i + off);
    off += g.attributes.position.count; g.dispose();
  }
  return buildGeom(pos, nor, uv, idx);
}
// Extruded outline with independently rounded back / front edges and optional front-cap holes.
function pillow(shape, { zB, zF, rB = 0, rF = 0, seg = 8, div = 24, holes = [] }) {
  const pts = outline(shape, div), n = normals2D(pts), rings = [];
  if (rB > 0) for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI / 2; rings.push({ off: -rB * (1 - Math.sin(a)), z: zB + rB * (1 - Math.cos(a)), ns: Math.sin(a), nz: -Math.cos(a) }); }
  else rings.push({ off: 0, z: zB, ns: 1, nz: 0 });
  if (rF > 0) for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI / 2; rings.push({ off: -rF * (1 - Math.cos(a)), z: zF - rF + rF * Math.sin(a), ns: Math.cos(a), nz: Math.sin(a) }); }
  else rings.push({ off: 0, z: zF, ns: 1, nz: 0 });
  const inset = d => pts.map((p, i) => V2(p.x - n[i].x * d, p.y - n[i].y * d));
  return merge([sweep(pts, n, rings), cap(inset(rB), [], zB, -1), cap(inset(rF), holes, zF, 1)]);
}
function rrect(x0, y0, x1, y1, r) {
  const [bl, br, tr, tl] = Array.isArray(r) ? r : [r, r, r, r];
  const s = new THREE.Shape();
  s.moveTo(x0 + bl, y0); s.lineTo(x1 - br, y0);
  if (br) s.absarc(x1 - br, y0 + br, br, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - tr);
  if (tr) s.absarc(x1 - tr, y1 - tr, tr, 0, Math.PI / 2, false);
  s.lineTo(x0 + tl, y1);
  if (tl) s.absarc(x0 + tl, y1 - tl, tl, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + bl);
  if (bl) s.absarc(x0 + bl, y0 + bl, bl, Math.PI, Math.PI * 1.5, false);
  return s;
}
function mesh(name, geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = receive; return m;
}

/* ---------- materials ---------- */
function noiseTexture() {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), img = g.createImageData(N, N);
  // smooth value noise, two octaves — subtle molded-plastic roughness variation
  const grid = (s) => { const a = []; for (let k = 0; k < (s + 1) * (s + 1); k++) a.push(Math.random()); return (x, y) => {
    const fx = x * s, fy = y * s, x0 = Math.floor(fx) % s, y0 = Math.floor(fy) % s, tx = fx - Math.floor(fx), ty = fy - Math.floor(fy);
    const q = (u, v) => a[(v % s) * (s + 1) + (u % s)], sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return (q(x0, y0) * (1 - sx) + q(x0 + 1, y0) * sx) * (1 - sy) + (q(x0, y0 + 1) * (1 - sx) + q(x0 + 1, y0 + 1) * sx) * sy; }; };
  const n1 = grid(8), n2 = grid(32);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = 0.86 + 0.1 * n1(x / N, y / N) + 0.04 * n2(x / N, y / N), b = Math.round(v * 255), o = (y * N + x) * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = b; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
}
export function createMaterials() {
  const P = (o) => new THREE.MeshPhysicalMaterial(o), rough = noiseTexture();
  return {
    white: P({ name: 'white_satin_housing', color: 0xeff0f1, roughness: 0.42, roughnessMap: rough, clearcoat: 0.35, clearcoatRoughness: 0.22, sheen: 0.15, sheenRoughness: 0.6, sheenColor: 0xffffff }),
    whiteSatin: P({ name: 'white_matte_trim', color: 0xe2e4e7, roughness: 0.58, roughnessMap: rough }),
    blackGloss: P({ name: 'black_gloss_glass', color: 0x050608, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.015, ior: 1.52, specularIntensity: 1 }),
    blackCavity: P({ name: 'matte_black_cavity', color: 0x0c0d0e, roughness: 0.78, roughnessMap: rough, specularIntensity: 0.5 }),
    blackMatte: new THREE.MeshStandardMaterial({ name: 'black_matte_drain', color: 0x0a0b0c, roughness: 0.85 }),
    lid: P({ name: 'matte_black_lid', color: 0x111214, roughness: 0.72, roughnessMap: rough, specularIntensity: 0.5, sheen: 0.2, sheenRoughness: 0.8, sheenColor: 0x3a3c40 }),
    steel: P({ name: 'brushed_stainless', color: 0xc9cdd1, metalness: 1, roughness: 0.27, anisotropy: 0.75, anisotropyRotation: 0, roughnessMap: rough }),
    chrome: P({ name: 'polished_chrome', color: 0xeef0f3, metalness: 1, roughness: 0.08, specularIntensity: 1 }),
    nozzleChrome: P({ name: 'nozzle_satin_chrome', color: 0xe4e7ea, metalness: 1, roughness: 0.24, envMapIntensity: 1.5,
      emissive: 0x7c8087, emissiveIntensity: 0.6, clearcoat: 1, clearcoatRoughness: 0.04 }),
    sensor: P({ name: 'smoked_sensor_window', color: 0x24262a, roughness: 0.08, clearcoat: 1 }),
    vent: new THREE.MeshStandardMaterial({ name: 'vent_dark', color: 0x1a1b1e, roughness: 0.75 }),
    seam: new THREE.MeshStandardMaterial({ name: 'seam_shadow', color: 0x8d9094, roughness: 0.7 }),
    // Live glass: Fresnel-reflection shell composited additively, so the transmissive water beneath it keeps its refraction
    // (three.js can't refract one transmissive object through another). Exported GLB swaps in glassExport.
    glass: P({ name: 'clear_glass', color: 0x000000, roughness: 0, metalness: 0, ior: 1.5, specularIntensity: 1,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.95 }),
    glassExport: P({ name: 'clear_glass', color: 0xffffff, roughness: 0, transmission: 1, ior: 1.5, thickness: 0.004,
      attenuationColor: 0xf2f8f6, attenuationDistance: 0.9, side: THREE.DoubleSide }),
    water: P({ name: 'water', color: 0xffffff, roughness: 0.015, transmission: 1, ior: 1.333, thickness: 0.06,
      attenuationColor: 0xeef7f9, attenuationDistance: 0.55, side: THREE.DoubleSide, envMapIntensity: 1.1, specularIntensity: 1 }),
    stream: P({ name: 'water_stream', color: 0xeef6fb, roughness: 0.1, transparent: true, opacity: 0.82, depthWrite: false,
      clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide, envMapIntensity: 1.8 }),
    bubble: new THREE.MeshStandardMaterial({ name: 'air_bubble', color: 0xe3ecf2, roughness: 0.1, metalness: 0, envMapIntensity: 1.6 }),
  };
}

/* ---------- glass profile ---------- */
export function glassProfile() {
  const outerC = [[0.0262, 0.0002], [0.0300, 0], [0.0336, 0.0009], [0.0362, 0.0032], [0.0381, 0.0075], [0.0414, 0.02], [0.0443, 0.04], [0.0454, 0.055], [0.0449, 0.07], [0.0431, 0.085], [0.0408, 0.1], [0.0393, 0.11], [0.0391, 0.1132]];
  const innerC = [[0.0262, 0.0066], [0.0318, 0.0076], [0.0352, 0.0102], [0.0393, 0.02], [0.0424, 0.04], [0.0435, 0.055], [0.0431, 0.07], [0.0413, 0.085], [0.0391, 0.1], [0.0376, 0.11], [0.0374, 0.1132]];
  const spl = c => new THREE.SplineCurve(c.map(([r, y]) => V2(r, y))).getSpacedPoints(72);
  const outer = spl(outerC), inner = spl(innerC), rim = [];
  for (let k = 1; k < 16; k++) { const a = k / 16 * Math.PI; rim.push(V2(0.03825 + 0.00085 * Math.cos(a), 0.1132 + 0.0011 * Math.sin(a))); }
  const pushUp = [V2(0, 0.0016), V2(0.010, 0.0014), V2(0.018, 0.0010), V2(0.0235, 0.0005)];
  const floor = [V2(0.020, 0.0067), V2(0.010, 0.0068), V2(0, 0.0068)];
  const profile = [...pushUp, ...outer, ...rim, ...inner.slice().reverse(), ...floor];
  const rIn = (y) => {
    if (y <= inner[0].y) return inner[0].x;
    for (let i = 1; i < inner.length; i++) if (y <= inner[i].y) {
      const a = inner[i - 1], b = inner[i], t = (y - a.y) / (b.y - a.y); return a.x + (b.x - a.x) * t;
    }
    return inner[inner.length - 1].x;
  };
  return { profile, rIn, height: 0.1143, innerBottom: 0.0068, rimInner: 0.1132 };
}

/* ---------- canvas graphics ---------- */
function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { c, ctx: c.getContext('2d'), t };
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function snowflake(ctx, cx, cy, r, lw, color) {
  ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    ctx.save(); ctx.rotate(k * Math.PI / 3);
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r);
    for (const s of [-1, 1]) {
      const y = s * r * 0.58, b = r * 0.3;
      ctx.moveTo(-b, y + s * b); ctx.lineTo(0, y); ctx.lineTo(b, y + s * b);
    }
    ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
function drop(ctx, cx, cy, s, lw, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy - s);
  ctx.quadraticCurveTo(cx + s * 0.72, cy - s * 0.1, cx + s * 0.62, cy + s * 0.32);
  ctx.arc(cx, cy + s * 0.32, s * 0.62, 0, Math.PI, false);
  ctx.quadraticCurveTo(cx - s * 0.72, cy - s * 0.1, cx, cy - s);
  ctx.stroke(); ctx.restore();
}

export const CUPS = [
  { id: 'hot', label: 'Hot', u: 0.235, v: 0.30, color: '#ff4d6d', fill: 0.45 },
  { id: 'ambient', label: 'Ambient', u: 0.745, v: 0.30, color: '#2db3ff', fill: 0.58 },
  { id: 'warm', label: 'Warm', u: 0.235, v: 0.70, color: '#3d8bff', fill: 0.55, top: '#ff4d6d' },
  { id: 'cold', label: 'Cold', u: 0.745, v: 0.70, color: '#1e63ff', fill: 0.6 },
];

function makeScreen() {
  const W = 1200, H = 768, S = canvasTex(W, H);
  const draw = (st = {}) => {
    const { ctx } = S;
    const bg = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H / 2, W * 0.65);
    bg.addColorStop(0, '#0d1422'); bg.addColorStop(1, '#030407');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // status bar (doubles as fill progress)
    rr(ctx, W / 2 - 60, 34, 120, 10, 5); ctx.fillStyle = '#3c414a'; ctx.fill();
    if (st.fill > 0) { rr(ctx, W / 2 - 60, 34, 120 * Math.min(1, st.fill), 10, 5); ctx.fillStyle = '#7fd0ff'; ctx.fill(); }
    CUPS.forEach((c) => {
      const cx = c.u * W, cy = c.v * H, w = 150, h = 158, bw = w * 0.78;
      const active = st.cup === c.id && (st.pouring || st.full);
      const path = () => { ctx.beginPath(); ctx.moveTo(cx - w / 2, cy - h / 2); ctx.lineTo(cx + w / 2, cy - h / 2); ctx.lineTo(cx + bw / 2, cy + h / 2); ctx.lineTo(cx - bw / 2, cy + h / 2); ctx.closePath(); };
      if (active) {
        rr(ctx, cx - w / 2 - 34, cy - h / 2 - 28, w + 68, h + 56, 26);
        ctx.strokeStyle = 'rgba(127,208,255,0.85)'; ctx.lineWidth = 6; ctx.stroke();
      }
      const f = active ? Math.max(0.04, st.fill) : c.fill;
      ctx.save(); path(); ctx.clip();
      const top = cy + h / 2 - h * f;
      ctx.shadowColor = c.color; ctx.shadowBlur = 40;
      const g = ctx.createLinearGradient(0, top, 0, cy + h / 2); g.addColorStop(0, c.color); g.addColorStop(1, shade(c.color));
      ctx.fillStyle = g; ctx.fillRect(cx - w, top, w * 2, h);
      if (c.top) { ctx.fillStyle = c.top; ctx.fillRect(cx - w, top, w * 2, 14); }
      ctx.restore();
      path(); ctx.strokeStyle = '#e8ebf0'; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.stroke();
    });
    if (st.full) {
      ctx.fillStyle = '#e8ebf0'; ctx.font = '600 64px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('FULL', W / 2, H / 2);
    } else snowflake(ctx, W / 2, H / 2, 46, 8, '#e8ebf0');
    S.t.needsUpdate = true;
  };
  draw();
  return { texture: S.t, draw, W, H };
}
function shade(hex) { const c = new THREE.Color(hex); c.multiplyScalar(0.55); return '#' + c.getHexString(); }

function makeButtonTex(kind) {
  const N = 256, S = canvasTex(N, N);
  const draw = (active = false) => {
    const { ctx } = S; ctx.clearRect(0, 0, N, N);
    const col = active ? '#8fd6ff' : '#9ba1a9';
    ctx.save(); if (active) { ctx.shadowColor = '#5cc2ff'; ctx.shadowBlur = 24; }
    ctx.beginPath(); ctx.arc(N / 2, N / 2, 99, 0, Math.PI * 2); ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.stroke();
    if (kind === 'water') drop(ctx, N / 2, N / 2 - 6, 44, 7, col); else snowflake(ctx, N / 2, N / 2, 44, 7, col);
    ctx.restore(); S.t.needsUpdate = true;
  };
  draw(); return { texture: S.t, draw };
}

function makePanelPrint(PW, PH, PY) {
  const cw = 2048, ch = Math.round(cw * PH / PW), S = canvasTex(cw, ch), k = cw / PW;
  const X = x => (x + PW / 2) * k, Y = y => (PY + PH / 2 - y) * k, { ctx } = S;
  const sc = DIM.screen, bx0 = -sc.w / 2 - 0.0016, bx1 = sc.w / 2 + 0.0016, by0 = sc.y - sc.h / 2 - 0.0016, by1 = sc.y + sc.h / 2 + 0.0016;
  rr(ctx, X(bx0), Y(by1), (bx1 - bx0) * k, (by1 - by0) * k, 0.0028 * k);
  ctx.fillStyle = '#111317'; ctx.fill(); ctx.strokeStyle = '#3b3f46'; ctx.lineWidth = 0.00035 * k; ctx.stroke();
  ctx.lineCap = 'round';
  for (const sx of [-1, 1]) for (const y of [0.3779, 0.3565]) {
    const x = sx * 0.0423, r = 0.0019;
    ctx.beginPath(); ctx.arc(X(x), Y(y), r * k, 0, Math.PI * 2); ctx.strokeStyle = '#8d939b'; ctx.lineWidth = 0.00034 * k; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(x - sx * r), Y(y)); ctx.lineTo(X(sx * (sc.w / 2 + 0.0016)), Y(y));
    ctx.strokeStyle = '#6b7078'; ctx.lineWidth = 0.0003 * k; ctx.stroke();
  }
  S.t.needsUpdate = true;
  return S.t;
}

/* ---------- build ---------- */
const circlePts = (cx, cy, r, n = 128) => { const a = []; for (let k = 0; k < n; k++) { const t = k / n * Math.PI * 2; a.push(V2(cx + r * Math.cos(t), cy + r * Math.sin(t))); } return a; };
// Lathe from a THREE.Path (x = radius, y = height)
const latheFromPath = (path, div = 10, seg = 96) => new THREE.LatheGeometry(dedupe(path.getPoints(div)), seg);

export function buildDispenser({ maxAnisotropy = 8 } = {}) {
  const M = createMaterials();
  const { W, H, zF, zB, rF, rB, cav } = DIM;
  const root = new THREE.Group(); root.name = 'WaterDispenser';
  const disp = new THREE.Group(); disp.name = 'dispenser'; root.add(disp);

  /* Housing — front silhouette swept in depth with rounded front/back edges and crowned side walls */
  const s = new THREE.Shape();
  // tapered silhouette: widest in the lower third, sides curving in continuously to a narrower crown
  s.moveTo(0, 0); s.lineTo(0.13, 0); s.quadraticCurveTo(0.152, 0, 0.156, 0.02);
  s.bezierCurveTo(0.162, 0.06, 0.162, 0.11, 0.158, 0.16); s.bezierCurveTo(0.150, 0.27, 0.128, 0.36, 0.122, 0.396); s.quadraticCurveTo(0.119, H, 0.104, H);
  s.lineTo(-0.104, H); s.quadraticCurveTo(-0.119, H, -0.122, 0.396); s.bezierCurveTo(-0.128, 0.36, -0.150, 0.27, -0.158, 0.16);
  s.bezierCurveTo(-0.162, 0.11, -0.162, 0.06, -0.156, 0.02); s.quadraticCurveTo(-0.152, 0, -0.13, 0); s.lineTo(0, 0);

  const { hw, yb, yt, ysplit, rt, rb, rh, rc, depth } = cav, zBack = zF - depth;
  const hs = new THREE.Shape();
  hs.moveTo(-hw + rb, yb); hs.lineTo(hw - rb, yb); hs.absarc(hw - rb, yb + rb, rb, -Math.PI / 2, 0, false);
  hs.lineTo(hw, ysplit); hs.lineTo(hw, yt - rt); hs.absarc(hw - rt, yt - rt, rt, 0, Math.PI / 2, false);
  hs.lineTo(-hw + rt, yt); hs.absarc(-hw + rt, yt - rt, rt, Math.PI / 2, Math.PI, false);
  hs.lineTo(-hw, ysplit); hs.lineTo(-hw, yb + rb); hs.absarc(-hw + rb, yb + rb, rb, Math.PI, Math.PI * 1.5, false);
  const hp = outline(hs, 12), hn = normals2D(hp);
  const holeFront = hp.map((p, i) => V2(p.x + hn[i].x * rh, p.y + hn[i].y * rh));

  const housingG = pillow(s, { zB, zF, rB, rF, seg: 12, div: 40, holes: [holeFront] });
  { const p = housingG.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i) / 0.17; p.setX(i, p.getX(i) * (1 + 0.02 * (1 - z * z))); } housingG.computeVertexNormals(); }
  disp.add(mesh('housing', housingG, M.white));

  /* Top lid — seated on the flat crown of the housing */
  const lidG = pillow(rrect(-0.103, -0.150, 0.103, 0.138, 0.026), { zB: 0, zF: 0.0105, rB: 0.0012, rF: 0.0055, seg: 8, div: 12 });
  lidG.rotateX(-Math.PI / 2); lidG.translate(0, H, 0);
  disp.add(mesh('top_lid', lidG, M.lid));

  /* Dispensing cavity — rolled front lip, coved inner corners, white hood over black well */
  const cavity = new THREE.Group(); cavity.name = 'dispensing_cavity'; disp.add(cavity);
  const lipRings = [];
  for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI / 2; lipRings.push({ off: rh * (1 - Math.sin(a)), z: zF - rh * (1 - Math.cos(a)), ns: -Math.sin(a), nz: Math.cos(a) }); }
  cavity.add(mesh('cavity_lip', sweep(hp, hn, lipRings), M.white));
  const wallRings = [{ off: 0, z: zF - rh, ns: -1, nz: 0 }, { off: 0, z: zBack + rc, ns: -1, nz: 0 }];
  for (let k = 1; k <= 8; k++) { const a = k / 8 * Math.PI / 2; wallRings.push({ off: -rc * (1 - Math.cos(a)), z: zBack + rc - rc * Math.sin(a), ns: -Math.cos(a), nz: Math.sin(a) }); }
  const midY = i => (hp[i].y + hp[(i + 1) % hp.length].y) / 2;
  cavity.add(mesh('cavity_hood', sweep(hp, hn, wallRings, i => midY(i) > ysplit - 1e-6), M.white));
  cavity.add(mesh('cavity_well_walls', sweep(hp, hn, wallRings, i => midY(i) <= ysplit - 1e-6), M.blackCavity));
  const backLo = new THREE.ShapeGeometry(rrect(-hw + rc, yb + rc, hw - rc, ysplit, 0), 4); backLo.translate(0, 0, zBack);
  const backHi = new THREE.ShapeGeometry(rrect(-hw + rc, ysplit, hw - rc, yt - rc, [0, 0, rt - rc, rt - rc]), 16); backHi.translate(0, 0, zBack);
  cavity.add(mesh('cavity_back_lower', backLo, M.blackCavity), mesh('cavity_back_upper', backHi, M.white));
  const sensG = pillow(rrect(-0.004, -0.0011, 0.004, 0.0011, 0.0011), { zB: 0, zF: 0.0008, rF: 0.0004, seg: 3, div: 6 });
  for (const sx of [-1, 1]) { const m = mesh(sx < 0 ? 'sensor_left' : 'sensor_right', sensG, M.sensor); m.position.set(sx * 0.063, 0.2427, zBack); cavity.add(m); }

  /* Nozzle — one continuous chrome lathe: ceiling escutcheon, rounded shoulder, flared funnel, collar, bored outlet */
  const nozzle = new THREE.Group(); nozzle.name = 'nozzle'; nozzle.position.set(0, DIM.tipY, DIM.zN); disp.add(nozzle);
  const np = new THREE.Path();
  np.moveTo(0, 0.0042); np.lineTo(0.0027, 0.0042); np.quadraticCurveTo(0.0029, 0.0042, 0.0029, 0.0036);
  np.lineTo(0.0029, 0.0005); np.quadraticCurveTo(0.0029, 0, 0.0034, 0); np.lineTo(0.0038, 0);
  np.quadraticCurveTo(0.0043, 0, 0.0043, 0.0005); np.lineTo(0.0043, 0.0039);
  np.quadraticCurveTo(0.0043, 0.0047, 0.0051, 0.0047); np.lineTo(0.0057, 0.0047);
  np.quadraticCurveTo(0.0063, 0.0047, 0.0063, 0.0053); np.lineTo(0.0063, 0.0079);
  np.bezierCurveTo(0.0063, 0.0098, 0.0101, 0.0126, 0.0140, 0.0168);
  np.bezierCurveTo(0.0176, 0.0206, 0.0196, 0.0236, 0.0196, 0.0276);
  np.lineTo(0.0196, 0.0326); np.quadraticCurveTo(0.0196, 0.0336, 0.0206, 0.0337);
  np.lineTo(0.0236, 0.0340); np.quadraticCurveTo(0.0244, 0.0341, 0.0244, 0.0349);
  np.lineTo(0.0244, 0.0359); np.lineTo(0, 0.0359);
  nozzle.add(mesh('nozzle_body', latheFromPath(np, 10, 96), M.nozzleChrome));
  const bore = new THREE.CircleGeometry(0.0027, 32); bore.rotateX(Math.PI / 2); bore.translate(0, 0.00415, 0);
  nozzle.add(mesh('nozzle_bore', bore, M.blackMatte, { cast: false }));

  /* Drip tray — removable grille plate in the well + folded stainless front apron */
  const tray = new THREE.Group(); tray.name = 'drip_tray'; disp.add(tray);
  const tTop = DIM.trayTop, gR = DIM.grilleR, gf = 0.0012, floorY = 0.1458, zN = DIM.zN;
  const plateZ0 = zBack + rc + 0.0005, plateZ1 = zF + 0.0005;
  const plateG = pillow(rrect(-0.0766, -plateZ1, 0.0766, -plateZ0, 0.0015), { zB: 0.1428, zF: tTop, rF: 0.0012, seg: 4, div: 4, holes: [circlePts(0, -zN, gR + gf, 160)] });
  plateG.rotateX(-Math.PI / 2); tray.add(mesh('tray_grille_plate', plateG, M.steel));
  const apronG = pillow(rrect(-0.081, -(zF + 0.030), 0.081, -(zF + 0.0008), [0.009, 0.009, 0.003, 0.003]), { zB: 0.1385, zF: tTop, rB: 0.0015, rF: 0.003, seg: 8, div: 10 });
  apronG.rotateX(-Math.PI / 2); tray.add(mesh('tray_front_apron', apronG, M.steel));
  const grille = new THREE.Group(); grille.name = 'tray_grille'; grille.position.set(0, 0, zN); tray.add(grille);
  const wp = new THREE.Path(); wp.moveTo(gR + gf, tTop); wp.quadraticCurveTo(gR, tTop, gR, tTop - gf); wp.lineTo(gR, floorY - 0.0003);
  grille.add(mesh('grille_well_wall', latheFromPath(wp, 6, 160), M.steel, { cast: false }));
  const fl = new THREE.CircleGeometry(gR + 0.0001, 128); fl.rotateX(-Math.PI / 2); fl.translate(0, floorY, 0);
  grille.add(mesh('grille_drain_floor', fl, M.blackMatte, { cast: false }));
  const ribs = [], yT = DIM.grilleTop, w = 0.0028;
  for (const r of [0.0085, 0.0165, 0.0245, 0.0325, 0.0405]) {
    const rp = new THREE.Path(); rp.moveTo(r + w / 2, floorY - 0.0003); rp.lineTo(r + w / 2, yT - w / 2);
    rp.absarc(r, yT - w / 2, w / 2, 0, Math.PI, false); rp.lineTo(r - w / 2, floorY - 0.0003);
    ribs.push(latheFromPath(rp, 8, 128));
  }
  const hub = new THREE.Path(); hub.moveTo(0.0036, floorY - 0.0003); hub.lineTo(0.0036, yT - 0.0016); hub.quadraticCurveTo(0.0036, yT, 0, yT);
  ribs.push(latheFromPath(hub, 8, 48));
  grille.add(mesh('grille_rings', merge(ribs), M.steel, { cast: false }));

  /* Lower front panel — flush reservoir drawer with a narrow parting-line seam */
  const lower = new THREE.Group(); lower.name = 'lower_panel'; disp.add(lower);
  lower.add(mesh('drawer_seam', pillow(rrect(-0.0812, 0.0208, 0.0812, 0.1232, 0.0092), { zB: zF + 0.0001, zF: zF + 0.0011, rF: 0.0004, seg: 2, div: 8 }), M.seam, { cast: false }));
  lower.add(mesh('drawer_front', pillow(rrect(-0.080, 0.022, 0.080, 0.122, 0.008), { zB: zF + 0.0011, zF: zF + 0.0048, rF: 0.0026, seg: 8, div: 8 }), M.white));
  lower.add(mesh('drawer_grip', pillow(rrect(-0.068, 0.0285, 0.068, 0.0385, 0.005), { zB: zF + 0.0040, zF: zF + 0.0062, rF: 0.0011, seg: 4, div: 8 }), M.whiteSatin));

  /* Control panel — inlaid black glass with printed capacitive keys and an embedded display */
  const panel = new THREE.Group(); panel.name = 'control_panel'; disp.add(panel);
  const pn = DIM.panel, pz = zF + 0.0021;
  panel.add(mesh('panel_glass', pillow(rrect(-pn.hw, pn.y0, pn.hw, pn.y1, [0.006, 0.006, 0.002, 0.002]), { zB: zF + 0.0001, zF: pz, rF: 0.0011, seg: 5, div: 8 }), M.blackGloss));
  const PW = pn.hw * 2 - 0.004, PH = pn.y1 - pn.y0 - 0.004, PY = (pn.y0 + pn.y1) / 2;
  const printTex = makePanelPrint(PW, PH, PY); printTex.anisotropy = maxAnisotropy;
  const printMat = new THREE.MeshStandardMaterial({ name: 'panel_print', map: printTex, transparent: true, roughness: 0.2, emissive: 0xffffff, emissiveMap: printTex, emissiveIntensity: 0.3, depthWrite: false });
  const print = mesh('panel_print', new THREE.PlaneGeometry(PW, PH), printMat, { cast: false }); print.position.set(0, PY, pz + 0.0001); panel.add(print);
  const scr = makeScreen(); scr.texture.anisotropy = maxAnisotropy;
  const scrMat = new THREE.MeshPhysicalMaterial({ name: 'touchscreen_display', color: 0x000000, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, emissive: 0xffffff, emissiveMap: scr.texture, emissiveIntensity: 1.0 });
  const screen = mesh('touchscreen', new THREE.PlaneGeometry(DIM.screen.w, DIM.screen.h), scrMat, { cast: false });
  screen.position.set(0, DIM.screen.y, pz + 0.0002); panel.add(screen);
  const btn = {};
  for (const [kind, sx] of [['water', -1], ['cold', 1]]) {
    const bt = makeButtonTex(kind);
    const mat = new THREE.MeshStandardMaterial({ name: `button_${kind}_icon`, map: bt.texture, transparent: true, roughness: 0.2, emissive: 0xffffff, emissiveMap: bt.texture, emissiveIntensity: 0.45, depthWrite: false });
    const m = mesh(`button_${kind}`, new THREE.PlaneGeometry(DIM.button.size, DIM.button.size), mat, { cast: false });
    m.position.set(sx * DIM.button.x, DIM.button.y, pz + 0.00015); panel.add(m);
    btn[kind] = { mesh: m, draw: bt.draw, material: mat };
  }

  /* Rear — instanced vent louvers + power inlet */
  const rear = new THREE.Group(); rear.name = 'rear_details'; disp.add(rear);
  const ventG = pillow(rrect(-0.02, -0.0018, 0.02, 0.0018, 0.0018), { zB: 0, zF: 0.0015, rF: 0.0006, seg: 3, div: 6 }); ventG.rotateY(Math.PI);
  const vents = new THREE.InstancedMesh(ventG, M.vent, 24); vents.name = 'rear_vent_louvers';
  const dm = new THREE.Object3D(); let vi = 0;
  for (const x of [-0.035, 0.035]) for (let r = 0; r < 12; r++) { dm.position.set(x, 0.25 + r * 0.0095, zB); dm.updateMatrix(); vents.setMatrixAt(vi++, dm.matrix); }
  vents.castShadow = true; rear.add(vents);
  const inlet = pillow(rrect(-0.012, -0.008, 0.012, 0.008, 0.003), { zB: 0, zF: 0.003, rF: 0.001, seg: 3, div: 6 }); inlet.rotateY(Math.PI); inlet.translate(0.075, 0.06, zB);
  rear.add(mesh('power_inlet', inlet, M.vent));

  /* Glass — pivot at base centre, resting on the grille rings */
  const gp = glassProfile();
  const glass = new THREE.Group(); glass.name = 'glass'; glass.position.set(0, DIM.grilleTop, DIM.zN); root.add(glass);
  const shell = mesh('glass_shell', new THREE.LatheGeometry(gp.profile, 128), M.glass, { cast: false, receive: false });
  shell.renderOrder = 2; glass.add(shell);

  return {
    root, dispenser: disp, glass, nozzle, materials: M, glassProfile: gp,
    screen: { mesh: screen, draw: scr.draw }, buttons: btn,
  };
}
