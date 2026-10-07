// 12th anniversary pop-up: a glossy 3D "12" inside the logo ring, with confetti.
// The WebGL scene is built when the dialog opens and disposed when it closes.
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/fonts/helvetiker_bold.typeface.json';
const SEEN_KEY = 'smallville-anniv-12-seen';

const dialog = document.getElementById('anniv');
const sceneEl = document.getElementById('anniv-scene');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastFocus = null;
let scene3d = null;

/* ---------- Dialog behaviour ---------- */
function open() {
  if (dialog.classList.contains('open')) return;
  lastFocus = document.activeElement;
  dialog.setAttribute('aria-hidden', 'false');
  dialog.classList.add('open');
  document.body.classList.add('modal-open');
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch {}
  dialog.querySelector('.anniv-close').focus({ preventScroll: true });
  if (!scene3d) scene3d = createScene();
}

function close() {
  if (!dialog.classList.contains('open')) return;
  dialog.classList.remove('open');
  dialog.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  lastFocus?.focus?.({ preventScroll: true });
  // Let the exit transition finish before tearing down WebGL
  setTimeout(() => {
    if (!dialog.classList.contains('open') && scene3d) { scene3d.dispose(); scene3d = null; }
  }, 450);
}

dialog.addEventListener('click', e => {
  if (e.target.closest('[data-anniv-close]')) close();
});
document.querySelectorAll('[data-anniv-open]').forEach(b => b.addEventListener('click', open));

document.addEventListener('keydown', e => {
  if (!dialog.classList.contains('open')) return;
  if (e.key === 'Escape') { e.preventDefault(); close(); }
  if (e.key === 'Tab') {
    const items = [...dialog.querySelectorAll('a[href], button:not([disabled])')];
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// Show once per visit; add ?anniversary to the URL to force it
let seen = false;
try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch {}
if (!seen || new URLSearchParams(location.search).has('anniversary')) {
  setTimeout(open, 1400);
}

/* ---------- 3D scene ---------- */
function createScene() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null; // the CSS "12" fallback stays visible
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  sceneEl.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2, 4, 5);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.3));

  const stage = new THREE.Group();
  scene.add(stage);

  // Ring echoing the logo: thick blue-white arc, thin red circle
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(2.25, 0.09, 16, 120, Math.PI * 1.45),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.1, clearcoat: 1 })
  );
  arc.rotation.z = 0.5;
  const thin = new THREE.Mesh(
    new THREE.TorusGeometry(1.95, 0.025, 8, 120),
    new THREE.MeshStandardMaterial({ color: 0xe5242a, emissive: 0xe5242a, emissiveIntensity: 0.5 })
  );
  const rings = new THREE.Group();
  rings.add(arc, thin);
  rings.position.z = -0.6;
  stage.add(rings);

  // The "12"
  const numberGroup = new THREE.Group();
  stage.add(numberGroup);
  const faceMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.18, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1 });
  const sideMat = new THREE.MeshPhysicalMaterial({ color: 0xe5242a, roughness: 0.3, metalness: 0.2, clearcoat: 0.6 });
  let numberMesh = null;
  new FontLoader().load(FONT_URL, font => {
    if (disposed) return;
    const geo = new TextGeometry('12', {
      font, size: 1.7, depth: 0.5, curveSegments: 10,
      bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.05, bevelSegments: 5,
    });
    geo.center();
    numberMesh = new THREE.Mesh(geo, [faceMat, sideMat]);
    numberGroup.add(numberMesh);
    sceneEl.classList.add('ready');
    burst();
  });

  // Sparkles
  const sparkCount = 90;
  const sparkPos = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    const r = 2.6 + Math.random() * 2.6, a = Math.random() * Math.PI * 2;
    sparkPos.set([Math.cos(a) * r, Math.sin(a) * r * 0.75, -1.5 - Math.random() * 2], i * 3);
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.8, depthWrite: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  scene.add(sparks);

  // Confetti
  const COUNT = innerWidth < 600 ? 140 : 220;
  const palette = [0xe5242a, 0xffffff, 0xffd400, 0x00aeef, 0xec008c, 0x9fb0ff].map(c => new THREE.Color(c));
  const confettiGeo = new THREE.PlaneGeometry(0.11, 0.2);
  const confettiMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, metalness: 0.2 });
  const confetti = new THREE.InstancedMesh(confettiGeo, confettiMat, COUNT);
  confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(confetti);
  const bits = Array.from({ length: COUNT }, (_, i) => {
    confetti.setColorAt(i, palette[i % palette.length]);
    return {
      p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(),
      spin: new THREE.Vector3(), sway: Math.random() * Math.PI * 2, alive: false,
    };
  });
  confetti.instanceColor.needsUpdate = true;
  const dummy = new THREE.Object3D();
  let halfW = 4, halfH = 3;

  function rain(b) {
    b.p.set((Math.random() * 2 - 1) * halfW, halfH + Math.random() * halfH, (Math.random() - 0.5) * 3);
    b.v.set(0, -0.6 - Math.random() * 0.6, 0);
    b.alive = true;
  }
  function burst() {
    bits.forEach(b => {
      const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 6;
      b.p.set(0, -0.2, 0.5);
      b.v.set(Math.cos(a) * s, Math.sin(a) * s * 0.8 + 3, (Math.random() - 0.3) * 4);
      b.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      b.spin.set(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4);
      b.alive = true;
    });
    pop = 1;
  }
  if (reduceMotion) bits.forEach(b => { rain(b); b.p.y = (Math.random() * 2 - 1) * halfH; });

  // Pointer tilt and tap-for-confetti
  const tilt = { x: 0, y: 0 };
  function onMove(e) {
    const r = sceneEl.getBoundingClientRect();
    tilt.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    tilt.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  }
  function onTap() { if (!reduceMotion) burst(); }
  addEventListener('pointermove', onMove, { passive: true });
  sceneEl.addEventListener('click', onTap);

  function resize() {
    const w = sceneEl.clientWidth, h = sceneEl.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the ring in frame on short mobile scenes
    camera.position.z = Math.max(8.8, 7.8 / Math.min(1, camera.aspect * 0.9));
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(sceneEl);
  resize();

  const clock = new THREE.Clock();
  let pop = 0, intro = 0, disposed = false, raf = 0;

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // Intro: the 12 spins in with a slight overshoot
    intro = Math.min(1, intro + dt / (reduceMotion ? 0.01 : 1.2));
    const e = 1 - Math.pow(1 - intro, 3);
    const overshoot = 1 + Math.sin(e * Math.PI) * 0.12;
    numberGroup.scale.setScalar(Math.max(0.001, e * overshoot));
    const idle = reduceMotion ? 0 : Math.sin(t * 0.9) * 0.18;
    numberGroup.rotation.y += ((1 - e) * -Math.PI * 1.5 + idle + tilt.x * 0.45 - numberGroup.rotation.y) * (1 - Math.exp(-dt * 10));
    numberGroup.rotation.x += (tilt.y * 0.3 - numberGroup.rotation.x) * (1 - Math.exp(-dt * 6));
    numberGroup.position.y = reduceMotion ? 0 : Math.sin(t * 1.4) * 0.06;

    // A quick squash when confetti fires
    pop = Math.max(0, pop - dt * 3);
    numberGroup.scale.x *= 1 + pop * 0.08;
    numberGroup.scale.y *= 1 - pop * 0.06;

    if (!reduceMotion) {
      rings.rotation.z = t * 0.25;
      thin.rotation.x = Math.sin(t * 0.6) * 0.25;
      sparks.rotation.z = -t * 0.04;
      sparkMat.opacity = 0.55 + Math.sin(t * 3) * 0.25;
    }

    bits.forEach((b, i) => {
      if (!reduceMotion) {
        b.v.y -= 9 * dt;
        b.v.multiplyScalar(1 - 2.2 * dt);          // air drag
        b.v.y = Math.max(b.v.y, -1.4);              // flutter speed
        b.p.addScaledVector(b.v, dt);
        b.p.x += Math.sin(t * 2 + b.sway) * 0.4 * dt;
        b.r.x += b.spin.x * dt; b.r.y += b.spin.y * dt; b.r.z += b.spin.z * dt;
        if (b.p.y < -halfH - 0.5) rain(b);
      }
      dummy.position.copy(b.p);
      dummy.rotation.copy(b.r);
      dummy.updateMatrix();
      confetti.setMatrixAt(i, dummy.matrix);
    });
    confetti.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
  }
  frame();

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener('pointermove', onMove);
      sceneEl.removeEventListener('click', onTap);
      scene.traverse(o => {
        o.geometry?.dispose();
        [].concat(o.material || []).forEach(m => m.dispose());
      });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      sceneEl.classList.remove('ready');
    },
  };
}
