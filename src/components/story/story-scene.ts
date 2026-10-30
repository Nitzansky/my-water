// Scroll-driven 3D for the home "what's in your glass" story — a port of the design's dispenser/scroll.js
// ("screen" mode): an intro that zooms out from the bar's screen, then the bar turns and the glass fills
// as the visitor scrolls. Loaded on demand by WaterStory; three.js never weighs on the initial page load.
import * as THREE from "three";
import { buildDispenser, DIM } from "../glass/model.js";
import { WaterFX } from "../glass/water.js";

export type ScreenRect = { x: number; y: number; w: number; h: number; vw: number; vh: number };
export type StoryScene = {
  setProgress: (p: number) => void;
  setIntro: (q: number) => void;
  dispose: () => void;
};
type Options = { onFrame?: (f: { q: number; rect: ScreenRect }) => void; onSlow?: () => void };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type Shot = { focus: THREE.Vector3; dir: THREE.Vector3; dist: number; side: number };
const shot = (focus: THREE.Vector3, dir: THREE.Vector3, dist: number, side = 1): Shot => ({ focus, dir: dir.normalize(), dist, side });

// Camera keyframes along the story (p 0→1) and the glass fill — the design's "screen" mode.
const KEYS: [number, Shot][] = [
  [0, shot(V(0, 0.205, 0.02), V(0.55, 0.2, 1), 1.3)],
  [0.5, shot(V(0, 0.205, 0.02), V(-0.05, 0.16, 1), 1.3)],
  [1, shot(V(0, 0.205, 0.02), V(-0.55, 0.12, 1), 1.3)],
];
const fillAt = (p: number) => range(p, 0.08, 0.6) * 0.95;

function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(9, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
      fragmentShader: "varying vec3 vP; void main(){ float h = vP.y * .5 + .5; vec3 c = mix(vec3(.42,.42,.41), vec3(.70,.70,.69), smoothstep(.15,.85,h)); gl_FragColor = vec4(c,1.); }",
    }),
  );
  room.position.y = 1;
  s.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ color: 0x3a3d44 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.4;
  s.add(floor);
  const soft = new THREE.ShaderMaterial({
    uniforms: { k: { value: 1 } }, side: THREE.DoubleSide, transparent: true, depthWrite: false,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: "uniform float k; varying vec2 vUv; void main(){ vec2 d = abs(vUv-.5)*2.; float e = (1.-smoothstep(.55,1.,d.x))*(1.-smoothstep(.55,1.,d.y)); gl_FragColor = vec4(vec3(k), e); }",
  });
  const box = (w: number, h: number, p: [number, number, number], k: number) => {
    const mat = soft.clone();
    mat.uniforms = { k: { value: k } };
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(...p);
    m.lookAt(0, 0.3, 0);
    s.add(m);
  };
  box(7, 4, [0, 7, 1], 3.2);
  box(2.6, 6, [-6, 2.2, 2.5], 2.6);
  box(1.2, 6, [-4.5, 2, -5], 1.2);
  box(2.2, 6, [6, 2, -0.5], 1.7);
  box(5, 3, [2.5, 2.8, 6.5], 1.4);
  box(6, 1.5, [0, 1.4, -7], 1.1);
  box(8, 8, [0, -3.5, 2], 1.0);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return tex;
}

function contactShadow() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(0,0,0,0.55)");
  gr.addColorStop(0.55, "rgba(0,0,0,0.25)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export async function mountStoryScene(el: HTMLElement, { onFrame, onSlow }: Options = {}): Promise<StoryScene> {
  const phone = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: !phone, alpha: true, powerPreference: "high-performance" });
  // Resolution steps for the adaptive quality check below (the first is the normal one).
  const ratios = [Math.min(devicePixelRatio, phone ? 1.5 : 2), 1.25, 1, 0.75].filter((r, i, a) => i === 0 || r < a[0]);
  let level = 0;
  renderer.setPixelRatio(ratios[0]);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !phone;
  Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  const model = buildDispenser({ maxAnisotropy: renderer.capabilities.getMaxAnisotropy() });
  scene.add(model.root);
  const fx = new WaterFX({ materials: model.materials, glassProfile: model.glassProfile, tipY: DIM.tipY - DIM.grilleTop });
  fx.group.position.copy(model.glass.position);
  model.root.add(fx.group);
  model.screen.draw({ cup: "ambient", pouring: false, full: false, fill: 0 });

  const key = new THREE.DirectionalLight(0xfffaf4, 1.15);
  key.position.set(0.55, 1.3, 0.9);
  key.castShadow = !phone;
  Object.assign(key.shadow.camera, { left: -0.45, right: 0.45, top: 0.45, bottom: -0.45, near: 0.2, far: 3 });
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0003;
  key.shadow.radius = 4;
  scene.add(key, key.target, new THREE.HemisphereLight(0xf2f4f8, 0x2a2c33, 0.3));
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.ShadowMaterial({ opacity: 0.28 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.receiveShadow = true;
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.5), new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.0005;
  scene.add(catcher, blob);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.002, 20);
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  let fitScale = 1;
  const resize = () => {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitScale = Math.max(1, 0.75 / camera.aspect); // portrait phones: step back so the whole bar fits
    dirty = true;
  };

  // The bar's touchscreen: the intro starts with it filling the view (the hero photo is mapped onto it).
  const box = new THREE.Box3().setFromObject(model.screen.mesh);
  const SC = box.getCenter(new THREE.Vector3()), SS = box.getSize(new THREE.Vector3()), Z = V(0, 0, 1);
  const c1 = V(0, 0, 0), c2 = V(0, 0, 0);
  const project = (): ScreenRect => {
    camera.updateMatrixWorld();
    c1.set(box.min.x, box.max.y, box.max.z).project(camera);
    c2.set(box.max.x, box.min.y, box.max.z).project(camera);
    const w = el.clientWidth, h = el.clientHeight;
    const x0 = ((c1.x + 1) / 2) * w, y0 = ((1 - c1.y) / 2) * h, x1 = ((c2.x + 1) / 2) * w, y1 = ((1 - c2.y) / 2) * h;
    return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), vw: w, vh: h };
  };

  let p = 0, q = 0, pourUntil = 0, dirty = true;
  let cur: { pos: THREE.Vector3; tgt: THREE.Vector3 } | null = null;
  const F = V(0, 0, 0), D = V(0, 0, 0), R = V(0, 0, 0), P = V(0, 0, 0), Tg = V(0, 0, 0);
  const K = KEYS.map(([kp, k]) => ({ p: kp, ...k }));

  const step = (dt: number, t: number) => {
    let dist: number, side: number;
    if (q < 1) {
      const o = K[0], d0 = Math.min(SS.y / 2 / tan, SS.x / 2 / (tan * camera.aspect));
      const late = ease(range(q, 0.5, 1));
      F.lerpVectors(SC, o.focus, late);
      D.lerpVectors(Z, o.dir, late).normalize();
      dist = d0 * Math.pow((o.dist * fitScale) / d0, ease(range(q, 0, 0.9)));
      side = o.side * late * (camera.aspect > 1.1 ? 0.5 : 0);
    } else {
      let i = 0;
      while (i < K.length - 2 && p > K[i + 1].p) i++;
      const a = K[i], b = K[i + 1], u = ease(range(p, a.p, b.p));
      F.lerpVectors(a.focus, b.focus, u);
      D.lerpVectors(a.dir, b.dir, u).normalize();
      dist = a.dist * fitScale * Math.pow(b.dist / a.dist, u);
      side = (a.side + (b.side - a.side) * u) * (camera.aspect > 1.1 ? 0.5 : 0);
    }
    R.set(D.z, 0, -D.x).normalize().multiplyScalar(dist * tan * camera.aspect * side);
    Tg.copy(F).add(R);
    P.copy(F).addScaledVector(D, dist).add(R);
    if (!cur) cur = { pos: P.clone(), tgt: Tg.clone() };
    const k = q < 1 ? Math.min(1, dt * 9) : Math.min(1, dt * 5);
    const moving = cur.pos.distanceToSquared(P) > 1e-10 || cur.tgt.distanceToSquared(Tg) > 1e-10;
    cur.pos.lerp(P, k);
    cur.tgt.lerp(Tg, k);
    camera.position.copy(cur.pos);
    camera.lookAt(cur.tgt);
    onFrame?.({ q, rect: project() });

    const tv = fillAt(p) * fx.Vmax;
    fx.full = false;
    fx.draining = false;
    if (tv > fx.V + fx.Vmax * 0.002) pourUntil = t + 0.35;
    const want = t < pourUntil;
    if (want && !fx.valve) fx.start();
    else if (!want && fx.valve) fx.stop();
    const filling = Math.abs(tv - fx.V) > fx.Vmax * 0.0005;
    fx.V += (tv - fx.V) * Math.min(1, dt * 3);
    fx.update(dt, t);
    return moving || filling || fx.streamOn || fx.state === "pouring";
  };

  // Compile shaders off the main thread where supported, so the first frame doesn't jank the scroll.
  resize();
  step(0, 0);
  await renderer.compileAsync(scene, camera);
  el.appendChild(renderer.domElement);
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  // Render only while the stage is on screen and something is changing.
  // Frame-rate check: skip a warm-up, then if the median frame is slower than ~22 fps lower the resolution
  // a step and measure again; only when the lowest step is still too slow hand back to the plain layout.
  const timer = new THREE.Timer();
  let raf = 0, visible = false, idleFrames = 0, warmup = 45;
  let samples: number[] = [];
  const frame = () => {
    raf = requestAnimationFrame(frame);
    timer.update();
    const rawDt = timer.getDelta();
    const dt = Math.min(rawDt, 1 / 30), t = timer.getElapsed();
    const active = step(dt, t);
    if (active || dirty) idleFrames = 0;
    else if (++idleFrames > 30) return; // settled: stop drawing until the next scroll
    dirty = false;
    renderer.render(scene, camera);
    if (warmup > 0) { warmup--; return; }
    if (samples.length < 60 && rawDt > 0 && rawDt < 0.5) {
      samples.push(rawDt);
      if (samples.length === 60) {
        const median = [...samples].sort((a, b) => a - b)[30];
        if (median > 0.045) {
          if (level < ratios.length - 1) {
            renderer.setPixelRatio(ratios[++level]);
            resize();
            samples = [];
            warmup = 20;
          } else onSlow?.();
        }
      }
    }
  };
  const run = () => {
    const on = visible && !document.hidden;
    if (on && !raf) { timer.reset(); dirty = true; warmup = Math.max(warmup, 20); frame(); }
    if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); });
  io.observe(el);
  document.addEventListener("visibilitychange", run);

  return {
    setProgress: (v) => { if (v !== p) { p = v; idleFrames = 0; } },
    setIntro: (v) => { if (v !== q) { q = v; idleFrames = 0; } },
    dispose: () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", run);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
