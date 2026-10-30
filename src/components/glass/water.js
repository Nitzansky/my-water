// Ported from the design handoff (dispenser/water.js); three.js is now a bundled dependency.
// Real-time water: stream, fill level, surface ripples, splash droplets and bubbles.
// All coordinates are local to the glass base (group placed at the glass pivot).
import * as THREE from 'three';

const G = 9.81;
const rand = (a, b) => a + Math.random() * (b - a);

export class WaterFX {
  constructor({ materials, glassProfile, tipY, flow = 4.2e-5, v0 = 0.45, r0 = 0.0026 }) {
    this.M = materials; this.rIn = glassProfile.rIn; this.tipY = tipY;
    this.flow = flow; this.v0 = v0; this.r0 = r0;
    this.yBot = 0.0072; this.yMax = 0.094; this.rimY = glassProfile.rimInner;
    this.group = new THREE.Group(); this.group.name = 'water_fx';

    // Volume ⇄ level table (level rises slower where the glass is wider)
    this.tH = []; this.tV = []; let V = 0;
    for (let h = this.yBot; h <= this.yMax + 1e-6; h += 0.0004) {
      if (this.tH.length) { const r = this.rIn(h - 0.0002) - 0.0004; V += Math.PI * r * r * 0.0004; }
      this.tH.push(h); this.tV.push(V);
    }
    this.Vmax = V;

    this.body = new THREE.Mesh(new THREE.BufferGeometry(), materials.water); this.body.name = 'water_body';
    this.body.renderOrder = 1; this.body.visible = false; this.group.add(this.body);
    this._buildSurface(); this._buildStream(); this._buildParticles();

    this.V = 0; this.level = this.yBot; this.lastBuilt = -1;
    this.valve = false; this.streamOn = false; this.headT = -1; this.tailT = -1; this.headD = 0; this.tailD = 0;
    this.full = false; this.draining = false; this.agit = 0;
    this.acc = { aer: 0, spl: 0, bub: 0 };
    this.listeners = new Set();
    this._emit();
  }

  /* ---------- public ---------- */
  get fill() { return this.V / this.Vmax; }
  get state() { return this.draining ? 'draining' : this.valve ? 'pouring' : this.full ? 'full' : 'idle'; }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  toggle() {
    if (this.draining) return;
    if (this.valve) this.stop(); else if (this.full) this.empty(); else this.start();
  }
  start() {
    if (this.full || this.draining) return;
    this.valve = true;
    if (!this.streamOn) { this.streamOn = true; this.headT = 0; this.headD = 0; }
    this.tailT = -1; this.tailD = 0; this._emit();
  }
  stop() { if (!this.valve) return; this.valve = false; this.tailT = 0; this._emit(); }
  empty() { if (this.valve) this.stop(); this.draining = true; this._emit(); }

  update(dt, t) {
    const prevState = this.state, prevFill = Math.round(this.fill * 100);
    // Stream front / tail ballistics
    if (this.streamOn) {
      if (this.headT >= 0) { this.headT += dt; this.headD = this.v0 * this.headT + 0.5 * G * this.headT ** 2; }
      if (this.tailT >= 0) {
        this.tailT += dt; this.tailD = this.v0 * this.tailT + 0.5 * G * this.tailT ** 2;
        if (this.tipY - this.tailD < this.level - 0.004) { this.streamOn = false; this.tailT = -1; }
      }
    }
    const connected = this.streamOn && this.tipY - this.headD <= this.level && this.tipY - this.tailD > this.level;
    const fallH = this.tipY - this.level;
    this.vImpact = Math.sqrt(this.v0 ** 2 + 2 * G * Math.max(0, fallH));
    this.impactF = THREE.MathUtils.clamp(this.vImpact / 1.4, 0.5, 1.2);

    if (connected) {
      this.V = Math.min(this.Vmax, this.V + this.flow * dt);
      if (this.V >= this.Vmax - 1e-9) { this.full = true; this.stop(); }
    }
    if (this.draining) {
      this.V = Math.max(0, this.V - this.Vmax / 1.6 * dt);
      if (this.V <= 0) { this.draining = false; this.full = false; }
    }
    this.level = this._levelFromV(this.V);
    this.agit += ((connected ? 1 : 0) - this.agit) * Math.min(1, dt * (connected ? 6 : 1.4));

    this._updateBody(); this._updateSurface(t); this._updateStream(t); this._updateParticles(dt, t, connected);
    if (this.state !== prevState || Math.round(this.fill * 100) !== prevFill) this._emit();
  }

  /* ---------- internals ---------- */
  _emit() { const s = { state: this.state, fill: this.fill, full: this.full }; this.listeners.forEach(f => f(s)); }
  _levelFromV(V) {
    const { tV, tH } = this; if (V <= 0) return this.yBot;
    for (let i = 1; i < tV.length; i++) if (V <= tV[i]) return tH[i - 1] + (tH[i] - tH[i - 1]) * (V - tV[i - 1]) / (tV[i] - tV[i - 1]);
    return this.yMax;
  }
  _updateBody() {
    const h = this.level, vis = h > this.yBot + 0.0004;
    this.body.visible = vis; this.surface.visible = vis;
    if (!vis || Math.abs(h - this.lastBuilt) < 2e-5) return;
    this.lastBuilt = h;
    const pts = [new THREE.Vector2(0, this.yBot), new THREE.Vector2(this.rIn(this.yBot) - 0.0004, this.yBot)];
    for (let y = 0.008; y < h - 0.0008; y += 0.002) pts.push(new THREE.Vector2(this.rIn(y) - 0.0004, y));
    pts.push(new THREE.Vector2(this.rIn(h) - 0.0004, h));
    this.body.geometry.dispose(); this.body.geometry = new THREE.LatheGeometry(pts, 72);
  }
  _buildSurface() {
    const R = 22, S = 72, pos = [], idx = [];
    for (let i = 0; i <= R; i++) for (let j = 0; j <= S; j++) pos.push(0, 0, 0);
    for (let i = 0; i < R; i++) for (let j = 0; j < S; j++) {
      const a = i * (S + 1) + j, b = a + 1, c = a + S + 1, d = c + 1; idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    this.sR = R; this.sS = S;
    this.surface = new THREE.Mesh(g, this.M.water); this.surface.name = 'water_surface';
    this.surface.renderOrder = 1; this.surface.frustumCulled = false; this.surface.visible = false; this.group.add(this.surface);
    this._updateSurface(0, true);
    g.computeVertexNormals();
    if (g.attributes.normal.getY(Math.floor(R / 2) * (S + 1)) < 0) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const tt = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = tt; } }
  }
  _updateSurface(t, force) {
    if (!force && !this.surface.visible) return;
    const p = this.surface.geometry.attributes.position, R = this.sR, S = this.sS;
    const rad = this.rIn(this.level) - 0.0004, A = this.agit * 0.0011 * (this.impactF || 1), h = this.level;
    for (let i = 0; i <= R; i++) {
      const rho = i / R, d = rho * rad, edge = 1 - rho ** 6;
      const radial = A * (-1.5 * Math.exp(-((d / 0.0035) ** 2)) + 0.9 * Math.exp(-d * 55) * Math.sin(d * 1100 - t * 48));
      const meniscus = 0.0004 * Math.exp(-(rad - d) / 0.0011);
      for (let j = 0; j <= S; j++) {
        const th = j / S * Math.PI * 2;
        const chop = this.agit * 0.00022 * rho * (Math.sin(th * 3 + t * 7.3) + 0.6 * Math.sin(th * 5 - t * 11.1 + d * 300));
        p.setXYZ(i * (S + 1) + j, Math.cos(th) * d, h + (radial + chop) * edge + meniscus, Math.sin(th) * d);
      }
    }
    p.needsUpdate = true;
    if (!force) this.surface.geometry.computeVertexNormals();
  }
  _buildStream() {
    const Mr = 44, K = 14; this.stM = Mr; this.stK = K;
    const pos = new Float32Array((Mr + 1) * (K + 1) * 3), idx = [];
    for (let j = 0; j < Mr; j++) for (let k = 0; k < K; k++) {
      const a = j * (K + 1) + k, b = a + 1, c = a + K + 1, d = c + 1; idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
    this.stream = new THREE.Mesh(g, this.M.stream); this.stream.name = 'water_stream';
    this.stream.renderOrder = 1; this.stream.frustumCulled = false; this.stream.visible = false; this.group.add(this.stream);
  }
  _streamR(y) { const d = Math.max(0, this.tipY - y); return this.r0 * (this.pulse || 1) * Math.sqrt(this.v0 / Math.sqrt(this.v0 ** 2 + 2 * G * d)); }
  _updateStream(t) {
    this.pulse = 1 + 0.035 * Math.sin(t * 3.1) + 0.025 * Math.sin(t * 7.7 + 1.3);
    const top = this.tipY + 0.0015 - this.tailD;
    const headY = this.tipY - this.headD, bot = Math.max(this.level - 0.003, headY);
    this.sTop = top; this.sBot = bot;
    const vis = this.streamOn && top - bot > 0.0005; this.stream.visible = vis;
    if (!vis) return;
    const headFree = headY > this.level - 0.003, tailFree = this.tailT >= 0;
    const p = this.stream.geometry.attributes.position, Mr = this.stM, K = this.stK;
    for (let j = 0; j <= Mr; j++) {
      const y = top + (bot - top) * (j / Mr), d = Math.max(0, this.tipY - y), turb = Math.min(1, d / 0.05);
      let taper = 1;
      if (headFree) taper *= Math.sqrt(THREE.MathUtils.clamp((y - bot) / 0.004, 0, 1));
      if (tailFree) taper *= Math.sqrt(THREE.MathUtils.clamp((top - y) / 0.004, 0, 1));
      const r = this._streamR(y) * Math.max(taper, j === 0 || j === Mr ? 0 : 0.15);
      const ox = turb * (0.0005 * Math.sin(y * 90 + t * 13) + 0.0003 * Math.sin(y * 230 - t * 31));
      const oz = turb * (0.0005 * Math.cos(y * 80 - t * 11) + 0.0003 * Math.cos(y * 260 + t * 27));
      for (let k = 0; k <= K; k++) {
        const th = k / K * Math.PI * 2;
        const rr = r * (1 + turb * (0.22 * Math.sin(3 * th + y * 520 - t * 55) + 0.12 * Math.sin(5 * th - y * 900 + t * 37)));
        p.setXYZ(j * (K + 1) + k, ox + rr * Math.cos(th), y, oz + rr * Math.sin(th));
      }
    }
    p.needsUpdate = true; this.stream.geometry.computeVertexNormals();
  }
  _buildParticles() {
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const mk = (name, n) => {
      const m = new THREE.InstancedMesh(geo, this.M.bubble, n); m.name = name; m.count = 0; m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.group.add(m);
      return { mesh: m, n: 0, cap: n, p: new Float32Array(n * 3), v: new Float32Array(n * 3), s: new Float32Array(n), k: new Uint8Array(n), st: new Float32Array(n) };
    };
    this.drops = mk('splash_droplets', 420); this.bubs = mk('water_bubbles', 900);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._sc = new THREE.Vector3();
  }
  _spawn(P, x, y, z, vx, vy, vz, s, k = 0) {
    if (P.n >= P.cap) return; const i = P.n++;
    P.p[i * 3] = x; P.p[i * 3 + 1] = y; P.p[i * 3 + 2] = z; P.v[i * 3] = vx; P.v[i * 3 + 1] = vy; P.v[i * 3 + 2] = vz; P.s[i] = s; P.k[i] = k; P.st[i] = 0;
  }
  _kill(P, i) {
    const l = --P.n; if (i === l) return;
    for (let c = 0; c < 3; c++) { P.p[i * 3 + c] = P.p[l * 3 + c]; P.v[i * 3 + c] = P.v[l * 3 + c]; }
    P.s[i] = P.s[l]; P.k[i] = P.k[l]; P.st[i] = P.st[l];
  }
  _updateParticles(dt, t, connected) {
    const D = this.drops, B = this.bubs, lev = this.level, acc = this.acc, iF = this.impactF;
    // Emit: aeration inside the falling stream, splash at impact, plume bubbles below surface
    if (this.stream.visible) {
      acc.aer += dt * 240;
      while (acc.aer >= 1) {
        acc.aer--; const y = rand(this.sBot, this.sTop), r = this._streamR(y) * 0.65 * Math.sqrt(Math.random()), a = rand(0, 6.283);
        const v = Math.sqrt(this.v0 ** 2 + 2 * G * Math.max(0, this.tipY - y));
        this._spawn(D, Math.cos(a) * r, y, Math.sin(a) * r, 0, -v, 0, rand(0.00025, 0.0006), 1);
      }
    } else acc.aer = 0;
    if (connected) {
      acc.spl += dt * 40 * iF;
      while (acc.spl >= 1) {
        acc.spl--; const a = rand(0, 6.283), sp = rand(0.03, 0.14) * iF;
        this._spawn(D, Math.cos(a) * 0.0015, lev + 0.0006, Math.sin(a) * 0.0015, Math.cos(a) * sp, rand(0.08, 0.28) * iF, Math.sin(a) * sp, rand(0.0002, 0.0007), 0);
      }
      acc.bub += dt * 380 * iF;
      const maxD = Math.max(0.001, Math.min(lev - this.yBot - 0.0015, 0.012 + 0.05 * iF));
      while (acc.bub >= 1) {
        acc.bub--; const dep = Math.pow(Math.random(), 0.8) * maxD, y = lev - 0.0015 - dep;
        const sr = (0.0012 + dep * 0.28) * Math.sqrt(Math.random()), a = rand(0, 6.283);
        this._spawn(B, Math.cos(a) * sr, y, Math.sin(a) * sr, rand(-0.01, 0.01), -rand(0, 0.12), rand(-0.01, 0.01), 0.0003 + Math.pow(Math.random(), 3) * 0.0015);
      }
    }
    // Droplets
    for (let i = D.n - 1; i >= 0; i--) {
      const o = i * 3;
      if (D.k[i] === 0) D.v[o + 1] -= G * dt;
      else D.v[o + 1] = -Math.sqrt(this.v0 ** 2 + 2 * G * Math.max(0, this.tipY - D.p[o + 1]));
      D.p[o] += D.v[o] * dt; D.p[o + 1] += D.v[o + 1] * dt; D.p[o + 2] += D.v[o + 2] * dt;
      const y = D.p[o + 1];
      if (y < lev && D.v[o + 1] < 0) {
        if (D.k[i] === 1 && lev > this.yBot + 0.004 && Math.random() < 0.6)
          this._spawn(B, D.p[o], lev - 0.002, D.p[o + 2], 0, -rand(0.05, 0.2), 0, D.s[i] * rand(0.9, 1.8));
        this._kill(D, i); continue;
      }
      if (D.k[i] === 1 && y < this.sTop - (this.sTop - this.sBot) - 0.001) { this._kill(D, i); continue; }
      {
        const rr = Math.hypot(D.p[o], D.p[o + 2]), lim = this.rIn(Math.min(y, this.rimY)) - D.s[i] - 0.0003;
        if (rr > lim) { const f = lim / rr; D.p[o] *= f; D.p[o + 2] *= f; D.v[o] *= -0.3; D.v[o + 2] *= -0.3; }
      }
    }
    // Bubbles: buoyant rise, plume spread, wall cling
    for (let i = B.n - 1; i >= 0; i--) {
      const o = i * 3, s = B.s[i];
      if (B.st[i] > 0) { B.st[i] -= dt; if (B.st[i] <= 0) B.st[i] = -1; }
      else {
        const vr = 0.03 + 32 * s;
        B.v[o + 1] += (vr - B.v[o + 1]) * Math.min(1, dt * 3);
        B.v[o] *= 1 - Math.min(1, dt * 2); B.v[o + 2] *= 1 - Math.min(1, dt * 2);
        const w = 0.004 * (1 + s * 800);
        B.p[o] += (B.v[o] + Math.sin(t * 14 + i) * w) * dt; B.p[o + 1] += B.v[o + 1] * dt; B.p[o + 2] += (B.v[o + 2] + Math.cos(t * 12 + i * 1.7) * w) * dt;
      }
      const y = B.p[o + 1];
      if (y < this.yBot + s) { B.p[o + 1] = this.yBot + s; B.v[o + 1] = Math.abs(B.v[o + 1]); }
      const rr = Math.hypot(B.p[o], B.p[o + 2]), lim = this.rIn(y) - 0.0004 - s * 1.1;
      if (rr > lim) { const f = lim / rr; B.p[o] *= f; B.p[o + 2] *= f; if (B.st[i] === 0 && Math.random() < 0.45) { B.st[i] = rand(4, 14); B.v[o + 1] = 0; } }
      if (y > lev - s * 0.6 || lev <= this.yBot + 0.0008) this._kill(B, i);
    }
    this._write(D); this._write(B);
  }
  _write(P) {
    const { _m, _q, _v, _sc } = this;
    for (let i = 0; i < P.n; i++) {
      _v.set(P.p[i * 3], P.p[i * 3 + 1], P.p[i * 3 + 2]);
      const s = P.s[i], stretch = P.k[i] === 1 ? 1.8 : 1; _sc.set(s, s * stretch, s);
      _m.compose(_v, _q, _sc); P.mesh.setMatrixAt(i, _m);
    }
    P.mesh.count = P.n; P.mesh.instanceMatrix.needsUpdate = true;
  }
}
