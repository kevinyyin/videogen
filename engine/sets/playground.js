// SET: sunny city playground (video 014) — a downtown plaza turned into a giant playground: soft rubber ground, a slide
// tower, a swing set, a merry-go-round, a seesaw, spring riders, a climbing dome, a sandbox, benches, trees, a fence, and
// office towers behind it with a banner. Reusable for any park / kids / "everyone plays" beat.
//
// Coordinates (meters, y up). Playground floor y = 0 over x∈[-11, 11], z∈[-12, 5]. The camera usually sits at z ≈ +6…+9
// looking toward −z. Towers stand behind z ≈ −22.
// Handles:
//   setBuild(k)    0..1 — pieces pop up one after another (boing scale) in DIMS.order; 1 = everything built (default).
//   update(t, s)   swings swing, the merry-go-round spins, spring riders rock (s = 0..1 activity).
//   setBanner(text) the banner across the towers.  aimSun(cx, cz, half).  fog.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = {
  // laid out in DEPTH for a vertical frame (camera at z ≈ +5…+6): riders + seesaw up front, the carousel mid, slide/swings behind
  slide: [-2.6, -6.2], swings: [2.4, -7.2], carousel: [0.2, -2.6], seesaw: [-1.9, 0.6], sandbox: [2.6, -0.6],
  dome: [-0.2, -10.5], riders: [[-0.6, 2.0], [1.0, 1.6], [2.6, 2.4]], benches: [[-6.6, -1.0], [6.6, -1.0]],
  swingSeats: 3, swingPivotY: 2.35, swingLen: 1.75, swingW: 3.0,
};
const ORDER = ['carousel', 'slide', 'swings', 'seesaw', 'sandbox', 'riders', 'dome', 'banner'];

function rubberTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#3f8fcf'; g.fillRect(0, 0, w, h);
    const R = rng(5); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${0.04 + R() * 0.06})`; g.fillRect(R() * w, R() * h, 2, 2); }
    g.strokeStyle = '#f2c14e'; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2); g.stroke();   // painted ring
  }, [3, 3]);
}
function grassTex() {
  return canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#74a04c'; g.fillRect(0, 0, w, h); const R = rng(9); for (let i = 0; i < 3000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(40,80,20,.18)' : 'rgba(170,210,110,.16)'; g.fillRect(R() * w, R() * h, 2, 5); } }, [30, 30]);
}
function skyTex() {
  return canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4a8ad2'); gr.addColorStop(0.44, '#a8cfef'); gr.addColorStop(0.5, '#eaf0f2'); gr.addColorStop(1, '#eaf0f2'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}
function towerTex(c, lit) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = c; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h - 8; y += 16) for (let x = 8; x < w - 8; x += 16) { g.fillStyle = lit(x, y) ? '#cfe4f4' : '#6f8aa3'; g.fillRect(x, y, 10, 10); }
  }, [1, 1]);
}
function bannerTex(text) {
  return canvasTex(1024, 220, (g, w, h) => {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e2574c'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
    g.fillStyle = '#2f6aa8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 120; g.font = `bold ${size}px Helvetica, Arial, sans-serif`;
    while (g.measureText(text).width > w - 80 && size > 40) { size -= 4; g.font = `bold ${size}px Helvetica, Arial, sans-serif`; }
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

export function buildPlayground(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 14);
  const fog = new THREE.Fog(0xe2eaf0, 45, 230);
  const pieces = {};
  const group = (name, x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g); (pieces[name] ||= []).push(g); return g; };
  const RED = mat(0xe2574c, 0.45), YEL = mat(0xf2b632, 0.45), BLU = mat(0x3d7bd9, 0.45), GRN = mat(0x58b368, 0.45), STEEL = mat(0xcfd4d8, 0.35, { metalness: 0.5 });
  const pipe = (p, a, b, r, m) => { // a cylinder from point a to point b (local to p)
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
    const c = mk(new THREE.CylinderGeometry(r, r, L, 10), m, p, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return c;
  };

  // ---- sky, grass, rubber floor, paths
  root.add(new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, fog: false, toneMapped: false })));
  const grass = mk(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 0.95 }), root, 0, -0.01, 0); grass.rotation.x = -Math.PI / 2; grass.castShadow = false;
  const floor = mk(new THREE.PlaneGeometry(24, 18), new THREE.MeshStandardMaterial({ map: rubberTex(), roughness: 0.9 }), root, 0, 0.004, -3.5); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const curb = mat(0xd9d2c4, 0.9);
  for (const [w, d, x, z] of [[24.4, 0.25, 0, 5.5], [24.4, 0.25, 0, -12.5], [0.25, 18.2, -12.1, -3.5], [0.25, 18.2, 12.1, -3.5]]) mk(new THREE.BoxGeometry(w, 0.14, d), curb, root, x, 0.07, z);
  const pathM = mat(0xcfc6b2, 0.95);
  const path = mk(new THREE.PlaneGeometry(3, 30), pathM, root, 0, 0.003, 18); path.rotation.x = -Math.PI / 2; path.castShadow = false;

  // ---- slide tower (platform 1.6 m, ladder at the back, a long yellow slide toward +x)
  { const g = group('slide', ...DIMS.slide);
    for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) mk(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 10), RED, g, x, 1.6, z);
    mk(new THREE.BoxGeometry(1.8, 0.12, 1.8), BLU, g, 0, 1.6, 0);
    const roof = mk(new THREE.ConeGeometry(1.45, 0.9, 4), YEL, g, 0, 3.6, 0); roof.rotation.y = Math.PI / 4;
    for (const s of [-1, 1]) mk(new THREE.BoxGeometry(1.8, 0.5, 0.06), GRN, g, 0, 2.0, s * 0.88);
    for (let k = 0; k < 6; k++) mk(new THREE.BoxGeometry(0.7, 0.05, 0.08), STEEL, g, 0, 0.25 + k * 0.27, -1.05);   // ladder rungs
    for (const s of [-1, 1]) pipe(g, [s * 0.38, 0, -1.05], [s * 0.38, 1.7, -1.05], 0.035, STEEL);
    const slideM = mat(0xf2b632, 0.3);
    const sl = new THREE.Group(); sl.position.set(0.9, 1.62, 0); g.add(sl); sl.rotation.z = -0.62;
    mk(new THREE.BoxGeometry(3.4, 0.06, 0.75), slideM, sl, 1.7, 0, 0);
    for (const s of [-1, 1]) mk(new THREE.BoxGeometry(3.4, 0.2, 0.06), slideM, sl, 1.7, 0.1, s * 0.38);
    mk(new THREE.BoxGeometry(0.6, 0.06, 0.75), slideM, g, 4.0, 0.12, 0);
  }
  // ---- swing set (A-frames, 4 swings: handles.swings[i] = pivot group, rotate .x)
  const swings = [];
  { const g = group('swings', ...DIMS.swings), W = DIMS.swingW, H = DIMS.swingPivotY;
    for (const s of [-1, 1]) { pipe(g, [s * W / 2, 0, -0.9], [s * W / 2, H, 0], 0.07, RED); pipe(g, [s * W / 2, 0, 0.9], [s * W / 2, H, 0], 0.07, RED); }
    pipe(g, [-W / 2, H, 0], [W / 2, H, 0], 0.08, BLU);
    for (let i = 0; i < DIMS.swingSeats; i++) {
      const pv = new THREE.Group(); pv.position.set(-W / 2 + (i + 0.5) * (W / DIMS.swingSeats), H, 0); g.add(pv);
      for (const s of [-1, 1]) pipe(pv, [s * 0.22, 0, 0], [s * 0.22, -DIMS.swingLen, 0], 0.012, STEEL);
      mk(new THREE.BoxGeometry(0.5, 0.05, 0.22), [RED, YEL, GRN, BLU][i % 4], pv, 0, -DIMS.swingLen, 0);
      swings.push(pv);
    }
  }
  // ---- merry-go-round (spins: handles.carousel.rotation.y)
  const carousel = new THREE.Group();
  { const g = group('carousel', ...DIMS.carousel); g.add(carousel);
    mk(new THREE.CylinderGeometry(1.7, 1.75, 0.16, 32), mat(0xf2b632, 0.5), carousel, 0, 0.32, 0);
    const wedgeCols = [0xe2574c, 0x3d7bd9, 0x58b368, 0xa77bd1, 0xe2574c, 0x3d7bd9];
    wedgeCols.forEach((c, i) => { const w = mk(new THREE.CylinderGeometry(1.71, 1.71, 0.02, 16, 1, false, i * Math.PI / 3, Math.PI / 3), mat(c, 0.5), carousel, 0, 0.41, 0); w.castShadow = false; });
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; pipe(carousel, [Math.cos(a) * 1.45, 0.42, Math.sin(a) * 1.45], [Math.cos(a) * 0.15, 1.25, Math.sin(a) * 0.15], 0.04, STEEL); }
    mk(new THREE.CylinderGeometry(0.15, 0.15, 1.35, 12), STEEL, carousel, 0, 0.95, 0);
    mk(new THREE.CylinderGeometry(0.45, 0.5, 0.25, 16), mat(0x8a8f96, 0.6), g, 0, 0.12, 0);
  }
  // ---- seesaw (rocks: handles.seesaw.rotation.z)
  const seesaw = new THREE.Group();
  { const g = group('seesaw', ...DIMS.seesaw);
    mk(new THREE.BoxGeometry(0.3, 0.45, 0.4), mat(0x8a8f96, 0.6), g, 0, 0.22, 0);
    seesaw.position.y = 0.48; g.add(seesaw);
    mk(new THREE.BoxGeometry(3.6, 0.08, 0.32), GRN, seesaw, 0, 0, 0);
    for (const s of [-1, 1]) { pipe(seesaw, [s * 1.45, 0.04, -0.15], [s * 1.45, 0.3, -0.15], 0.02, STEEL); pipe(seesaw, [s * 1.45, 0.04, 0.15], [s * 1.45, 0.3, 0.15], 0.02, STEEL); pipe(seesaw, [s * 1.45, 0.3, -0.15], [s * 1.45, 0.3, 0.15], 0.02, STEEL); }
  }
  // ---- sandbox with a bucket, a spade and a castle
  { const g = group('sandbox', ...DIMS.sandbox);
    for (const [w, d, x, z] of [[2.2, 0.16, 0, 1.0], [2.2, 0.16, 0, -1.0], [0.16, 2.2, 1.0, 0], [0.16, 2.2, -1.0, 0]]) mk(new THREE.BoxGeometry(w, 0.3, d), mat(0xb5793a, 0.8), g, x, 0.15, z);
    mk(new THREE.BoxGeometry(1.9, 0.2, 1.9), mat(0xe8d39a, 1.0), g, 0, 0.1, 0);
    mk(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 14), RED, g, 0.7, 0.33, 0.5);
    for (const [x, z, s] of [[-0.5, -0.4, 1], [-0.2, -0.6, 0.7], [-0.75, -0.65, 0.7]]) { mk(new THREE.CylinderGeometry(0.18 * s, 0.22 * s, 0.3 * s, 10), mat(0xd9c27e, 1.0), g, x, 0.2 + 0.15 * s, z); mk(new THREE.ConeGeometry(0.2 * s, 0.2 * s, 10), mat(0xd9c27e, 1.0), g, x, 0.45 + 0.25 * s, z); }
  }
  // ---- spring riders (rock: handles.riders[i].rotation.x)
  const riders = DIMS.riders.map(([x, z], i) => {
    const g = group('riders', x, z), top = new THREE.Group(); top.position.y = 0.32; g.add(top);
    mk(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 8), STEEL, g, 0, 0.17, 0);
    const col = [0x58b368, 0xe58fa6, 0xf2b632][i % 3];
    mk(new RoundedBoxGeometry(0.75, 0.38, 0.32, 3, 0.12), mat(col, 0.45), top, 0, 0.25, 0);      // body
    mk(new THREE.SphereGeometry(0.2, 14, 10), mat(col, 0.45), top, 0.38, 0.52, 0);                 // head
    for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.035, 8, 6), mat(0x1a1a1a, 0.4), top, 0.52, 0.58, s * 0.09);
    pipe(top, [0.25, 0.5, -0.18], [0.25, 0.5, 0.18], 0.025, RED);
    return top;
  });
  // ---- climbing dome (geodesic-ish frame)
  { const g = group('dome', ...DIMS.dome), Rr = 1.9, ringM = [RED, BLU, YEL, GRN];
    for (let k = 1; k <= 4; k++) { const a = (k / 5) * (Math.PI / 2), r = Rr * Math.cos(a), y = Rr * Math.sin(a); const ring = mk(new THREE.TorusGeometry(r, 0.04, 8, 32), ringM[k % 4], g, 0, y, 0); ring.rotation.x = Math.PI / 2; }
    mk(new THREE.TorusGeometry(Rr, 0.05, 8, 40), RED, g, 0, 0.02, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const pts = []; for (let k = 0; k <= 8; k++) { const b = (k / 8) * (Math.PI / 2); pts.push(new THREE.Vector3(Math.cos(a) * Rr * Math.cos(b), Rr * Math.sin(b), Math.sin(a) * Rr * Math.cos(b))); } mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.035, 6), STEEL, g, 0, 0, 0); }
  }
  // ---- benches, trees, fence, lamps, a trash can, balloons
  DIMS.benches.forEach(([x, z]) => { const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; root.add(b); mk(new THREE.BoxGeometry(1.8, 0.07, 0.45), mat(0x8a5a3a, 0.8), b, 0, 0.45, 0); mk(new THREE.BoxGeometry(1.8, 0.4, 0.06), mat(0x8a5a3a, 0.8), b, 0, 0.75, -0.22); for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.06, 0.45, 0.4), mat(0x3d4a45, 0.5), b, s * 0.8, 0.22, 0); });
  const leafM = [mat(0x4f8a3a, 0.9), mat(0x6aa448, 0.9), mat(0x3f7a40, 0.9)];
  for (let i = 0; i < 26; i++) {
    const a = R() * Math.PI * 2, r = 14 + R() * 16, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.7 - 4;
    if (z > 2 && Math.abs(x) < 8) continue;                                   // keep the camera's foreground clear
    const t = new THREE.Group(); t.position.set(x, 0, z); root.add(t); const h = 2.2 + R() * 1.6;
    mk(new THREE.CylinderGeometry(0.14, 0.2, h, 8), mat(0x6a4a32, 0.9), t, 0, h / 2, 0);
    for (let k = 0; k < 3; k++) mk(new THREE.SphereGeometry(1.2 + R() * 0.6, 12, 10), leafM[(i + k) % 3], t, (R() - 0.5) * 1.2, h + 0.5 + k * 0.5, (R() - 0.5) * 1.2);
  }
  const fenceM = mat(0x2f6a5a, 0.6);
  for (let x = -12; x <= 12; x += 0.4) mk(new THREE.BoxGeometry(0.05, 0.9, 0.05), fenceM, root, x, 0.45, -13.0);
  mk(new THREE.BoxGeometry(24.2, 0.06, 0.06), fenceM, root, 0, 0.85, -13.0);
  for (const x of [-11.5, 11.5]) { mk(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 8), mat(0x2a2a2a, 0.5), root, x, 1.8, 3.6); mk(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff2c8 }), root, x, 3.7, 3.6); }
  mk(new THREE.CylinderGeometry(0.28, 0.25, 0.8, 14), mat(0x3d6a4a, 0.6), root, 9.6, 0.4, 1.5);
  const balloonCols = [0xe2574c, 0xf2b632, 0x3d7bd9, 0x58b368, 0xe58fa6, 0xa77bd1];
  const balloons = new THREE.Group(); root.add(balloons);
  for (let i = 0; i < 12; i++) { const x = -11 + (i % 6) * 0.25, z = 4.4 + Math.floor(i / 6) * 0.2; mk(new THREE.SphereGeometry(0.22, 12, 10), mat(balloonCols[i % 6], 0.3), balloons, x + (i % 3) * 0.1, 2.3 + (i % 4) * 0.25, z).scale.y = 1.2; pipe(balloons, [x + (i % 3) * 0.1, 2.05 + (i % 4) * 0.25, z], [-10.6, 0.9, 4.5], 0.006, mat(0xffffff, 0.5)); }
  pieces.banner = [];

  // ---- downtown backdrop: office towers + a banner across two of them
  const towerCols = ['#9fb3c6', '#b8c4cf', '#8ea6bb', '#c9cfd4', '#a7b7c4'];
  for (let i = 0; i < 16; i++) {
    const x = -48 + i * 6.4 + (R() - 0.5) * 2, h = 14 + R() * 30, w = 4.5 + R() * 2, z = -26 - R() * 18;
    const tex = towerTex(towerCols[i % 5], () => R() < 0.35);
    tex.repeat.set(1, Math.max(1, Math.round(h / 16)));   // big windows: a fine grid shimmered (moiré)
    const b = mk(new THREE.BoxGeometry(w, h, w), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), root, x, h / 2, z); b.castShadow = false;
  }
  const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex(opts.banner ?? 'NOW A PLAYGROUND'), roughness: 0.7, side: THREE.DoubleSide });
  const banner = new THREE.Group(); root.add(banner); banner.position.set(0, 9.5, -24); pieces.banner.push(banner);
  mk(new THREE.PlaneGeometry(14, 3.0), bannerMat, banner, 0, 0, 0);
  function setBanner(text) { bannerMat.map = bannerTex(text); bannerMat.needsUpdate = true; }

  // ---- build-up (pieces pop in order with a small overshoot)
  const groups = ORDER.flatMap((n, i) => (pieces[n] || []).map((g) => ({ g, i })));
  function setBuild(k = 1) {
    for (const { g, i } of groups) {
      const u = Math.min(1, Math.max(0, k * ORDER.length - i)), s = u <= 0 ? 0.0001 : u >= 1 ? 1 : 1 + 0.22 * Math.sin(u * Math.PI) - (1 - u) * 0.9 * (1 - u);
      g.scale.setScalar(Math.max(0.0001, s)); g.visible = u > 0;
    }
  }
  function update(t, s = 1) {
    swings.forEach((pv, i) => (pv.rotation.x = s * 0.55 * Math.sin(t * 2.4 + i * 1.3)));
    carousel.rotation.y = s * t * 1.1;
    seesaw.rotation.z = s * 0.24 * Math.sin(t * 1.8);
    riders.forEach((r, i) => (r.rotation.z = s * 0.22 * Math.sin(t * 4 + i * 2)));
  }

  // ---- lights
  const hemi = new THREE.HemisphereLight(0xd2e6ff, 0x7a8a5a, opts.ambient ?? 1.3); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dc, opts.sun ?? 2.8); root.add(sun, sun.target);
  const SUN_DIR = new THREE.Vector3(0.4, 0.82, 0.55).normalize();
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  function aimSun(cx = 0, cz = -3, half = 14) {
    sun.target.position.set(cx, 0, cz); sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 60);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 5, far: 140 }); sun.shadow.camera.updateProjectionMatrix();
  }
  aimSun();
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  setBuild(1); update(0, 0);
  return { root, D: DIMS, fog, setBuild, update, setBanner, aimSun, swings, carousel, seesaw, riders, lights: { hemi, sun } };
}
