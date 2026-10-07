// Smallville 3D hero: "Ville" the helper bot, who watches the cursor,
// surrounded by the four services as clickable objects.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('bot-canvas');
const bubble = document.getElementById('bubble');
const label = document.getElementById('obj-label');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const C = {
  blue: 0x1f2bd1, ink: 0x0e1a4f, red: 0xe5242a, shell: 0xf4f6ff,
  cyan: 0x00aeef, magenta: 0xec008c, yellow: 0xffd400, steel: 0x8a93b8,
};
const mat = (color, roughness = 0.45, metalness = 0.05) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const glow = color => new THREE.MeshBasicMaterial({ color });

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (err) {
  stage.classList.add('no-webgl');
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0.4, 10);
camera.lookAt(0, 0.1, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d0f5, 1.7));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(3, 5, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0x8f9bff, 1.4);
rim.position.set(-4, 2, -3);
scene.add(rim);

/* ---------- The bot ---------- */
const bot = new THREE.Group();
scene.add(bot);

const body = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.2, 1.15, 6, 0.4), mat(C.blue));
body.position.y = -1.2;
bot.add(body);

const badgeOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.06, 40), mat(C.shell));
badgeOuter.rotation.x = Math.PI / 2;
badgeOuter.position.set(0, -1.12, 0.58);
const badgeInner = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 40), mat(C.red));
badgeInner.rotation.x = Math.PI / 2;
badgeInner.position.set(0, -1.12, 0.6);
bot.add(badgeOuter, badgeInner);

const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.25, 24), mat(C.ink));
neck.position.y = -0.5;
bot.add(neck);

// Arms hang from shoulder pivots so they can wave
function makeArm(side) {
  const pivot = new THREE.Group();
  pivot.position.set(side * 0.86, -0.82, 0);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.42, 6, 16), mat(C.blue));
  arm.position.y = -0.3;
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), mat(C.shell));
  hand.position.y = -0.6;
  pivot.add(arm, hand);
  pivot.rotation.z = side * 0.12;
  bot.add(pivot);
  return pivot;
}
const armL = makeArm(-1);
const armR = makeArm(1);

// Head pivots at the neck
const head = new THREE.Group();
head.position.y = -0.4;
bot.add(head);

const shell = new THREE.Mesh(new RoundedBoxGeometry(2.1, 1.55, 1.6, 8, 0.5), mat(C.shell, 0.35));
shell.position.y = 0.85;
head.add(shell);

const screen = new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.05, 0.12, 4, 0.06), mat(C.ink, 0.25, 0.2));
screen.position.set(0, 0.85, 0.76);
head.add(screen);

const face = new THREE.Group();
face.position.set(0, 0.85, 0.84);
head.add(face);

const eyeMat = glow(0xcfe0ff);
function makeEye(x) {
  const eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.16, 6, 16), eyeMat);
  eye.position.x = x;
  face.add(eye);
  return eye;
}
const eyes = [makeEye(-0.36), makeEye(0.36)];

const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 24, Math.PI), eyeMat);
mouth.rotation.z = Math.PI;
mouth.position.y = -0.3;
face.add(mouth);

for (const side of [-1, 1]) {
  const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 32), mat(C.blue));
  ear.rotation.z = Math.PI / 2;
  ear.position.set(side * 1.1, 0.85, 0);
  const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 20), mat(C.red));
  dot.rotation.z = Math.PI / 2;
  dot.position.set(side * 1.22, 0.85, 0);
  head.add(ear, dot);
}

const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 10), mat(C.ink));
stalk.position.y = 1.82;
const bulbMat = new THREE.MeshStandardMaterial({ color: C.red, emissive: C.red, emissiveIntensity: 0.4, roughness: 0.3 });
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), bulbMat);
bulb.position.y = 2.08;
head.add(stalk, bulb);

// Soft contact shadow
function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(14,26,79,0.28)');
  grad.addColorStop(1, 'rgba(14,26,79,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(2.6, 1),
  new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = -2.05;
scene.add(shadow);

/* ---------- Service objects ---------- */
function buildPrint() {
  const g = new THREE.Group();
  [C.yellow, C.magenta, C.cyan, 0xffffff].forEach((col, i) => {
    const sheet = new THREE.Mesh(new RoundedBoxGeometry(0.8, 1.05, 0.04, 2, 0.015), mat(col, 0.6));
    sheet.position.set(i * 0.07 - 0.1, i * 0.06 - 0.09, i * 0.06);
    sheet.rotation.z = (i - 1.5) * 0.06;
    g.add(sheet);
  });
  for (let i = 0; i < 4; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(i === 0 ? 0.42 : 0.55, 0.05, 0.01), mat(C.ink));
    line.position.set(0.11 - (i === 0 ? 0.06 : 0), 0.3 - i * 0.16 + 0.09, 0.23);
    line.rotation.z = 0.09;
    g.add(line);
  }
  return g;
}
function buildIT() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.07, 0.75, 2, 0.03), mat(C.steel, 0.35, 0.4));
  base.position.y = -0.32;
  const lid = new THREE.Group();
  lid.position.set(0, -0.29, -0.36);
  lid.rotation.x = -0.25;
  const back = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.75, 0.05, 2, 0.03), mat(C.steel, 0.35, 0.4));
  back.position.y = 0.375;
  const display = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), glow(C.blue));
  display.position.set(0, 0.375, 0.03);
  const code = new THREE.Group();
  [0.36, 0.22, 0.5, 0.3].forEach((w, i) => {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.05), glow(i === 2 ? 0xffd400 : 0xcfe0ff));
    bar.position.set(-0.4 + w / 2 + (i % 2) * 0.08, 0.55 - i * 0.12, 0.035);
    code.add(bar);
  });
  lid.add(back, display, code);
  g.add(base, lid);
  g.rotation.set(0.25, 0.35, 0);
  return g;
}
function buildFreight() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 0.6), mat(C.red, 0.55, 0.2));
  g.add(box);
  const ridgeMat = mat(0xb5161b, 0.5, 0.2);
  for (let i = 0; i < 9; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 0.03), ridgeMat);
    r.position.set(-0.56 + i * 0.14, 0, 0.31);
    g.add(r);
  }
  const frame = mat(C.ink, 0.5, 0.3);
  for (const y of [-0.3, 0.3]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.05, 0.64), frame);
    rail.position.y = y;
    g.add(rail);
  }
  g.rotation.set(0.25, -0.5, 0);
  return g;
}
function buildEnergy() {
  const g = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.95, 36), mat(C.ink, 0.4, 0.3));
  g.add(barrel);
  for (const y of [-0.3, 0.3]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.025, 8, 40), mat(C.steel, 0.3, 0.6));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.365, 0.16, 36, 1, true), mat(C.red, 0.45));
  g.add(band);
  const drop = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), mat(C.yellow, 0.3));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 20), mat(C.yellow, 0.3));
  tip.position.y = 0.14;
  drop.add(ball, tip);
  drop.position.set(0, 0.75, 0);
  g.add(drop);
  g.userData.drop = drop;
  g.rotation.set(0.3, 0, -0.12);
  return g;
}

const SERVICES = [
  { id: 'print', name: 'Printing', build: buildPrint, slot: [-1, 0.75], line: 'Printing it is. Cards, banners, billboards, all below.' },
  { id: 'it', name: 'IT services and training', build: buildIT, slot: [1, 0.85], line: 'IT and training. Here is how we help your team.' },
  { id: 'freight', name: 'Clearing and forwarding', build: buildFreight, slot: [-1, -0.75], line: 'Shipping something? We clear it and move it.' },
  { id: 'energy', name: 'Oil and gas', build: buildEnergy, slot: [1, -0.7], line: 'Oil and gas support, from exploration to distribution.' },
];

const hitboxes = [];
const haloMat = new THREE.MeshBasicMaterial({ color: C.red, transparent: true, opacity: 0.9 });
SERVICES.forEach((s, i) => {
  const holder = new THREE.Group();
  const model = s.build();
  holder.add(model);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.022, 8, 64), haloMat);
  halo.position.z = -0.5;
  halo.visible = false;
  holder.add(halo);
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 12, 10),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hit.userData.service = s;
  holder.add(hit);
  hitboxes.push(hit);
  scene.add(holder);
  Object.assign(s, { holder, model, halo, phase: i * 1.7, scale: 1, spin: 0 });
});

/* ---------- Layout ---------- */
let width = 1, height = 1;
function layout() {
  const r = stage.getBoundingClientRect();
  width = Math.max(1, r.width);
  height = Math.max(1, r.height);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  // Pull the camera back on narrow stages so the objects stay in frame
  camera.position.z = camera.aspect < 1 ? 10 / Math.max(camera.aspect, 0.75) : 10;
  camera.updateProjectionMatrix();
  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  const halfW = halfH * camera.aspect;
  const spreadX = Math.min(2.6, halfW - 1.05);
  SERVICES.forEach(s => {
    s.base = new THREE.Vector3(s.slot[0] * spreadX, s.slot[1] * Math.min(1.8, halfH - 0.8) + 0.1, 0.4);
  });
}
new ResizeObserver(layout).observe(stage);
layout();

/* ---------- Interaction ---------- */
const pointer = { x: 0, y: 0, inside: false, lastMove: -Infinity };
const ndc = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const lookPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -3.2); // z = 3.2, in front of the bot
const lookTarget = new THREE.Vector3(0, 0.4, 3.2);
const tmp = new THREE.Vector3();
let hovered = null;
let focus = null; // { point, until }
let happyUntil = 0, waveUntil = 0, jumpStart = -10;
let active = SERVICES[0];

function toNdc(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  return r;
}

addEventListener('pointermove', e => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.lastMove = performance.now();
  const r = canvas.getBoundingClientRect();
  pointer.inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
}, { passive: true });

function pick(clientX, clientY) {
  toNdc(clientX, clientY);
  raycaster.setFromCamera(ndc, camera);
  const objHit = raycaster.intersectObjects(hitboxes, false)[0];
  if (objHit) return { type: 'service', service: objHit.object.userData.service };
  if (raycaster.intersectObject(bot, true)[0]) return { type: 'bot' };
  return null;
}

let bubbleTimer;
function say(text, ms = 3200) {
  bubble.textContent = text;
  bubble.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
}

function cheer(t) {
  happyUntil = t + 1.4;
  jumpStart = t;
}

const botLines = [
  "Hi! I'm Ville. I help you find the right Smallville service.",
  'That tickles. Try clicking one of the objects around me.',
  'Need it printed, set up, shipped or supplied? We do all four.',
  'You can also call us on +234 809 944 6057.',
];
let botLine = 0;

canvas.addEventListener('click', e => {
  const t = clock.elapsedTime;
  const hit = pick(e.clientX, e.clientY);
  if (hit?.type === 'service') {
    const s = hit.service;
    s.spin = 1;
    focus = { point: s.holder.position.clone(), until: t + 1.6 };
    cheer(t);
    window.smallvilleSelect?.(s.id);
    say(s.line);
  } else if (hit?.type === 'bot') {
    waveUntil = t + 1.6;
    cheer(t);
    say(botLines[botLine++ % botLines.length]);
  } else {
    // Look at the empty spot that was clicked
    toNdc(e.clientX, e.clientY);
    raycaster.setFromCamera(ndc, camera);
    const p = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(lookPlane, p)) focus = { point: p, until: t + 1.2 };
  }
});

// When a tab below is picked, glance at the matching object
document.addEventListener('service-change', e => {
  const s = SERVICES.find(x => x.id === e.detail.id);
  if (!s) return;
  active = s;
  if (focus?.point?.equals?.(s.holder.position)) return;
  focus = { point: s.holder.position.clone(), until: clock.elapsedTime + 1.2 };
});

/* ---------- Animation ---------- */
const clock = new THREE.Clock();
let nextBlink = 2, blinkEnd = 0;
let headYaw = 0, headPitch = 0;
let running = true;

new IntersectionObserver(([entry]) => {
  running = entry.isIntersecting;
  if (running) clock.getDelta();
}).observe(stage);

setTimeout(() => say("Hi, I'm Ville. Click a service to see what we do.", 4200), 900);

function frame() {
  requestAnimationFrame(frame);
  if (!running) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const ease = k => 1 - Math.exp(-k * dt);

  // Where to look: a focused point, the cursor, or a slow idle glance
  if (focus && t < focus.until) {
    lookTarget.lerp(tmp.copy(focus.point).setZ(Math.max(focus.point.z, 2)), ease(8));
  } else {
    focus = null;
    if (performance.now() - pointer.lastMove < 5000) {
      toNdc(pointer.x, pointer.y);
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(lookPlane, tmp)) lookTarget.lerp(tmp, ease(10));
    } else {
      tmp.set(Math.sin(t * 0.5) * 2, 0.6 + Math.sin(t * 0.8) * 0.5, 3.2);
      lookTarget.lerp(tmp, ease(2));
    }
  }

  // Head turns toward the target, eyes lead the head
  head.getWorldPosition(tmp);
  tmp.y += 0.85;
  const dx = lookTarget.x - tmp.x, dy = lookTarget.y - tmp.y, dz = Math.max(0.5, lookTarget.z - tmp.z);
  const yaw = THREE.MathUtils.clamp(Math.atan2(dx, dz), -0.6, 0.6);
  const pitch = THREE.MathUtils.clamp(-Math.atan2(dy, dz), -0.45, 0.4);
  headYaw += (yaw - headYaw) * ease(7);
  headPitch += (pitch - headPitch) * ease(7);
  head.rotation.set(headPitch, headYaw, -headYaw * 0.08);
  bot.rotation.y = headYaw * 0.25;
  face.position.x = (yaw / 0.6) * 0.2;
  face.position.y = 0.85 - (pitch / 0.45) * 0.13;

  // Blink and happy eyes
  const happy = t < happyUntil;
  if (t > nextBlink) { blinkEnd = t + 0.12; nextBlink = t + 2.4 + Math.random() * 3; }
  const eyeY = t < blinkEnd ? 0.12 : happy ? 0.35 : 1;
  eyes.forEach(eye => {
    eye.scale.y += (eyeY - eye.scale.y) * ease(30);
    eye.position.y += ((happy ? 0.06 : 0) - eye.position.y) * ease(12);
  });
  const smile = happy ? 1.5 : 1;
  mouth.scale.x += (smile - mouth.scale.x) * ease(10);
  mouth.scale.y = mouth.scale.x;
  bulbMat.emissiveIntensity = happy ? 1.2 + Math.sin(t * 20) * 0.4 : 0.4 + Math.sin(t * 2) * 0.15;

  // Body: idle bob, jump on cheer, arm wave
  const jt = t - jumpStart;
  const jump = jt < 0.5 ? Math.sin((jt / 0.5) * Math.PI) * 0.35 : 0;
  const bob = reduceMotion ? 0 : Math.sin(t * 1.6) * 0.06;
  bot.position.y = bob + (reduceMotion ? 0 : jump);
  shadow.scale.setScalar(1 - (bob + jump) * 0.5);
  const waving = t < waveUntil;
  const waveZ = waving ? 2.4 + Math.sin(t * 14) * 0.35 : 0.12;
  armR.rotation.z += (waveZ - armR.rotation.z) * ease(10);
  armL.rotation.z += ((happy ? -0.5 : -0.12) - armL.rotation.z) * ease(8);

  // Service objects float, react to hover, and spin when clicked
  if (pointer.inside) {
    const hit = pick(pointer.x, pointer.y);
    hovered = hit?.type === 'service' ? hit.service : null;
    canvas.style.cursor = hit ? 'pointer' : 'default';
  } else {
    hovered = null;
  }
  SERVICES.forEach(s => {
    const float = reduceMotion ? 0 : Math.sin(t * 1.2 + s.phase) * 0.12;
    s.holder.position.set(s.base.x, s.base.y + float, s.base.z);
    const target = s === hovered ? 1.18 : s === active ? 1.08 : 1;
    s.scale += (target - s.scale) * ease(12);
    s.holder.scale.setScalar(s.scale);
    if (s.spin > 0) s.spin = Math.max(0, s.spin - dt * 1.4);
    s.model.rotation.y = (s.model.userData.baseY ??= s.model.rotation.y) +
      (reduceMotion ? 0 : Math.sin(t * 0.7 + s.phase) * 0.25) +
      (s.spin > 0 ? (1 - s.spin) * Math.PI * 2 : 0);
    if (s.model.userData.drop && !reduceMotion) s.model.userData.drop.position.y = 0.75 + Math.sin(t * 2.4) * 0.08;
    s.halo.visible = s === active;
  });

  // HTML overlays follow their 3D anchors
  if (hovered) {
    tmp.copy(hovered.holder.position).project(camera);
    label.textContent = hovered.name;
    label.style.left = ((tmp.x + 1) / 2) * width + 'px';
    label.style.top = ((1 - tmp.y) / 2) * height - 50 * hovered.scale + 'px';
    label.classList.add('show');
  } else {
    label.classList.remove('show');
  }
  bot.localToWorld(tmp.set(0, 1.95, 0)).project(camera);
  bubble.style.left = THREE.MathUtils.clamp(((tmp.x + 1) / 2) * width, 125, width - 125) + 'px';
  bubble.style.top = Math.max(((1 - tmp.y) / 2) * height - 12, 80) + 'px';

  renderer.render(scene, camera);
}
frame();
