// The "what's in your glass" 3D scene: the design's water bar (model.js / water.js) pouring a glass whose
// water clears up stage by stage. Loaded on demand by GlassStory, so three.js never weighs on page load.
import * as THREE from "three";
import { buildDispenser, DIM } from "./model.js";
import { WaterFX } from "./water.js";

export type GlassScene = { setStage: (i: number) => void; setPaused: (p: boolean) => void; dispose: () => void };
// still: a single frame with a full glass of clear water (used to render public/glass-poster.webp).
type Options = { stage: number; onStageDone?: (i: number) => void; still?: boolean };

// Water look per stage: murky → off-taste tint → clear (the design's original water material).
const LOOKS = [
  { att: 0x8a7444, dist: 0.03, rough: 0.28, stream: 0xb59f72, bubble: 0xa89670 },
  { att: 0xd2dca0, dist: 0.11, rough: 0.07, stream: 0xdbe3bf, bubble: 0xd5dcc0 },
  { att: 0xeef7f9, dist: 0.55, rough: 0.015, stream: 0xeef6fb, bubble: 0xe3ecf2 },
];

function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(9, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
      fragmentShader: "varying vec3 vP; void main(){ float h = vP.y * .5 + .5; vec3 c = mix(vec3(.62,.70,.76), vec3(.90,.94,.97), smoothstep(.15,.85,h)); gl_FragColor = vec4(c,1.); }",
    }),
  );
  room.position.y = 1;
  s.add(room);
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
  box(2.2, 6, [6, 2, -0.5], 1.7);
  box(5, 3, [2.5, 2.8, 6.5], 1.4);
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
  gr.addColorStop(0, "rgba(15,42,58,0.45)");
  gr.addColorStop(0.55, "rgba(15,42,58,0.18)");
  gr.addColorStop(1, "rgba(15,42,58,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export function mountGlassScene(container: HTMLElement, { stage: initial, onStageDone, still }: Options): GlassScene {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!still });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);

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
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -0.45, right: 0.45, top: 0.45, bottom: -0.45, near: 0.2, far: 3 });
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0003;
  key.shadow.radius = 4;
  scene.add(key, key.target, new THREE.HemisphereLight(0xf2f4f8, 0x2a2c33, 0.3));
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.ShadowMaterial({ opacity: 0.18 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.receiveShadow = true;
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.5), new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.0005;
  scene.add(catcher, blob);

  // Camera: one framing per stage, moving closer to the glass as the water clears.
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
  const G = new THREE.Vector3();
  model.glass.getWorldPosition(G);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const SHOTS = [
    { focus: V(0, 0.205, 0.02), dir: V(0.42, 0.2, 1).normalize(), dist: 1.3 },
    { focus: G.clone().add(V(0, 0.07, 0)), dir: V(0.25, 0.08, 1).normalize(), dist: 0.62 },
    { focus: G.clone().add(V(0, 0.055, 0)), dir: V(0.32, 0.06, 1).normalize(), dist: 0.42 },
  ];
  let fitScale = 1;
  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitScale = Math.max(1, 0.85 / camera.aspect); // portrait boxes: step back so the bar still fits
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // Stage machine: drain the glass, switch the water look, pour again.
  const M = model.materials;
  const tint = (i: number) => {
    const L = LOOKS[i];
    M.water.attenuationColor.setHex(L.att);
    M.water.attenuationDistance = L.dist;
    M.water.roughness = L.rough;
    M.stream.color.setHex(L.stream);
    M.bubble.color.setHex(L.bubble);
  };
  let stage = initial, pending = true, doneT: ReturnType<typeof setTimeout> | undefined;
  tint(stage);
  fx.onChange((s: { state: string }) => {
    if (s.state === "idle" && pending) {
      pending = false;
      tint(stage);
      fx.start();
    }
    if (s.state === "full") {
      clearTimeout(doneT);
      doneT = setTimeout(() => onStageDone?.(stage), 1800);
    }
  });
  const setStage = (i: number) => {
    stage = i;
    pending = true;
    clearTimeout(doneT);
    if (fx.state === "idle") { pending = false; tint(stage); fx.start(); }
    else fx.empty();
  };

  const cur = { pos: SHOTS[stage].focus.clone().addScaledVector(SHOTS[stage].dir, SHOTS[stage].dist * fitScale), tgt: SHOTS[stage].focus.clone() };
  const P = new THREE.Vector3(), D = new THREE.Vector3();
  const timer = new THREE.Timer();
  let raf = 0, visible = false, paused = false;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    timer.update();
    const dt = Math.min(timer.getDelta(), 1 / 30), t = timer.getElapsed();
    const s = SHOTS[stage];
    // a slow sway keeps the scene alive without any scroll coupling
    D.copy(s.dir).applyAxisAngle(V(0, 1, 0), Math.sin(t * 0.35) * 0.12);
    P.copy(s.focus).addScaledVector(D, s.dist * fitScale);
    const k = Math.min(1, dt * 2.2);
    cur.pos.lerp(P, k);
    cur.tgt.lerp(s.focus, k);
    camera.position.copy(cur.pos);
    camera.lookAt(cur.tgt);
    fx.update(dt, t);
    renderer.render(scene, camera);
  };
  // Only render while on screen, the tab is visible and the visitor hasn't paused it.
  const run = () => {
    const on = visible && !document.hidden && !paused;
    if (on && !raf) { timer.reset(); frame(); }
    if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && !still; run(); });
  io.observe(container);
  document.addEventListener("visibilitychange", run);

  if (still) {
    tint(LOOKS.length - 1);
    fx.V = fx.Vmax * 0.9;
    fx.update(0, 0);
    camera.position.copy(cur.pos);
    camera.lookAt(cur.tgt);
    renderer.render(scene, camera);
  } else {
    fx.start();
    pending = false;
  }

  return {
    setStage,
    setPaused: (p) => { paused = p; run(); },
    dispose: () => {
      cancelAnimationFrame(raf);
      clearTimeout(doneT);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", run);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
