// SET: an elevated subway car in daylight — steel poles, overhead grab bars, long orange bench seats along both walls,
// sliding doors, a strip of colorful ad cards over the windows, a route map, fluorescent ceiling strips, and a sunny city
// skyline scrolling past the windows. Built for video 018 (everyone is magnetic: commuters stuck to the poles).
//
// Coordinates (meters, y up). The car runs along z (the train drives toward -z). Floor y=0, ceiling DIMS.h (2.25).
//   Walls at x = ±DIMS.halfW (1.45). Bench seats along both walls (seat top DIMS.seatY 0.45, seat front x = ±1.0).
//   Doors (both sides) centered at z = DIMS.doors[i]. Vertical poles at (0, z) for z in DIMS.poles. Car ends at z = ±DIMS.halfL.
// Cameras: from z≈+6 looking down the car toward -z (depth + faces), or across the aisle.
// Handles: update(t, speed) scrolls the city outside (speed in m/s, 0 = stopped), poles[] (meshes), lights.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = { halfW: 1.45, halfL: 8.5, h: 2.25, seatY: 0.45, seatX: 1.0, doors: [-4.2, 3.0], poles: [-6.0, -4.2, -1.8, 0.6, 3.0, 5.4], barY: 1.92, barX: 0.72 };

export function buildSubway(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 18), D = DIMS, W = D.halfW, L = D.halfL;
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);

  // shell: speckled floor, cream walls, a curved-looking ceiling (two slanted panels + a flat center)
  const floorTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8d9096'; g.fillRect(0, 0, w, h); const r = rng(2); for (let i = 0; i < 1600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)'; g.fillRect(r() * w, r() * h, 2, 2); } }, [3, 12]);
  const floor = mk(new THREE.PlaneGeometry(2 * W, 2 * L), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6 }), root); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallM = mat(0xece7dc, 0.6), steel = mat(0xc9ccd2, 0.25, { metalness: 0.75 }), darkM = mat(0x3a3f47, 0.5);
  const ceilM = mat(0xf4f2ec, 0.7);
  box(1.3, 0.04, 2 * L, ceilM, 0, D.h, 0);
  for (const s of [-1, 1]) { const c = box(0.95, 0.04, 2 * L, ceilM, s * (0.65 + 0.4), D.h - 0.14, 0); c.rotation.z = s * 0.32; }
  // fluorescent strips
  const lightM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf6f9ff).multiplyScalar(1.5), toneMapped: false });
  for (const s of [-1, 1]) { const l = box(0.12, 0.03, 2 * L - 0.6, lightM, s * 0.58, D.h - 0.03, 0); l.castShadow = false; }

  // side walls with window openings + doors
  const isDoor = (z) => D.doors.some((dz) => Math.abs(z - dz) < 0.75);
  for (const s of [-1, 1]) {
    const x = s * W;
    box(0.08, 0.92, 2 * L, wallM, x, 0.46, 0);                    // below the windows
    box(0.08, 0.45, 2 * L, wallM, x, D.h - 0.22, 0);              // above the windows (ad strip lives here)
    for (let z = -L + 0.6; z <= L - 0.6; z += 1.2) if (!isDoor(z)) box(0.1, 0.9, 0.16, wallM, x, 1.37, z);   // window mullions
    const glass = mk(new THREE.PlaneGeometry(2 * L, 0.9), new THREE.MeshStandardMaterial({ color: 0xbfd9ec, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }), root, x * 1.01, 1.37, 0);
    glass.rotation.y = Math.PI / 2;
    // doors: brushed steel panels with tall windows (closed), a red edge
    for (const dz of D.doors) {
      for (const k of [-1, 1]) {
        const door = rbox(0.06, 1.95, 0.7, 0.02, steel, x - s * 0.02, 0.98, dz + k * 0.36);
        door.castShadow = false;
        mk(new THREE.PlaneGeometry(0.42, 0.85), new THREE.MeshStandardMaterial({ color: 0xbfd9ec, roughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false }), root, x - s * 0.06, 1.35, dz + k * 0.36).rotation.y = -s * Math.PI / 2;
      }
      box(0.1, 0.03, 1.5, mat(0xf2c14e, 0.5), x - s * 0.03, 0.01, dz);          // yellow sill
      const sign = mk(new THREE.PlaneGeometry(0.9, 0.16), new THREE.MeshBasicMaterial({ map: canvasTex(256, 48, (g, w, h) => { g.fillStyle = '#1b1d22'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff9a3c'; g.font = 'bold 30px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DOWNTOWN', w / 2, h / 2 + 2); }), toneMapped: false }), root, x - s * 0.05, 2.05, dz);
      sign.rotation.y = -s * Math.PI / 2;
    }
  }
  // end walls (with a door window into the next car)
  for (const s of [-1, 1]) {
    const z = s * L;
    box(2 * W, D.h, 0.08, wallM, 0, D.h / 2, z);
    const dw = mk(new THREE.PlaneGeometry(0.5, 0.75), new THREE.MeshStandardMaterial({ color: 0x9fc4e0, roughness: 0.1, emissive: 0x6f94b0, emissiveIntensity: 0.5 }), root, 0, 1.45, z - s * 0.05);
    if (s > 0) dw.rotation.y = Math.PI;
    box(0.6, 1.95, 0.04, steel, 0, 0.98, z - s * 0.06);
  }

  // bench seats (orange molded plastic) + stainless kick panels
  const seatM = mat(0xe8873a, 0.45), seatM2 = mat(0xf2b632, 0.45);
  for (const s of [-1, 1]) for (let z = -L + 0.3; z < L - 0.3; z += 0.5) {
    if (isDoor(z)) continue;
    const m = Math.floor((z + L) / 0.5) % 2 ? seatM : seatM2;
    rbox(0.44, 0.06, 0.46, 0.02, m, s * (W - 0.24), D.seatY, z);
    rbox(0.06, 0.5, 0.46, 0.02, m, s * (W - 0.05), D.seatY + 0.28, z).rotation.z = -s * 0.12;
    box(0.04, D.seatY - 0.04, 0.48, steel, s * (W - 0.46), (D.seatY - 0.04) / 2, z);
  }
  // steel: vertical poles (center aisle), overhead grab bars, a pole at each door edge
  const poles = [];
  for (const z of D.poles) poles.push(mk(new THREE.CylinderGeometry(0.022, 0.022, D.h, 12), steel, root, 0, D.h / 2, z));
  for (const s of [-1, 1]) {
    const bar = mk(new THREE.CylinderGeometry(0.018, 0.018, 2 * L - 0.5, 10), steel, root, s * D.barX, D.barY, 0); bar.rotation.x = Math.PI / 2;
    for (let z = -L + 0.6; z < L - 0.4; z += 1.6) mk(new THREE.CylinderGeometry(0.012, 0.012, D.h - D.barY, 6), steel, root, s * D.barX, (D.h + D.barY) / 2, z);
    for (const dz of D.doors) for (const k of [-1, 1]) mk(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 10), steel, root, s * (W - 0.12), 1.05, dz + k * 0.82);
  }
  // ad cards over the windows (both sides): bright, silly, readable at a glance
  const ADS = [
    ['#2f6aa8', '#fff', 'NEED A LAWYER?', 'CALL 1-800-STUCK'], ['#f2b632', '#2a2a2a', 'WOODEN FORKS', 'NOW 2 FOR $1'],
    ['#d2483f', '#fff', 'PLASTIC CARS', 'COMING SOON'], ['#3f8a4a', '#fff', 'RELAX', 'IT\'S JUST PHYSICS'],
    ['#8e44ad', '#fff', 'NORTH OR SOUTH?', 'TAKE THE QUIZ'], ['#e58fa6', '#2a2a2a', 'DATING APP', 'OPPOSITES ONLY'],
  ];
  const adTex = ADS.map(([bg, fg, a, b]) => canvasTex(320, 120, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 34px Helvetica, Arial, sans-serif'; g.fillText(a, w / 2, 44); g.font = '26px Helvetica, Arial, sans-serif'; g.fillText(b, w / 2, 88); }));
  let ai = 0;
  for (const s of [-1, 1]) for (let z = -L + 0.9; z < L - 0.6; z += 1.25) {
    if (isDoor(z)) continue;
    const ad = mk(new THREE.PlaneGeometry(1.05, 0.38), new THREE.MeshStandardMaterial({ map: adTex[ai++ % adTex.length], roughness: 0.6 }), root, s * (W - 0.05), D.h - 0.22, z);
    ad.rotation.y = -s * Math.PI / 2;
  }
  // route map strip over one door
  const map = mk(new THREE.PlaneGeometry(1.3, 0.22), new THREE.MeshStandardMaterial({ map: canvasTex(512, 88, (g, w, h) => { g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d2483f'; g.lineWidth = 8; g.beginPath(); g.moveTo(20, 44); g.lineTo(w - 20, 44); g.stroke(); for (let i = 0; i < 9; i++) { g.fillStyle = '#fff'; g.beginPath(); g.arc(30 + i * 56, 44, 9, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 3; g.stroke(); } }), roughness: 0.6 }), root, -W + 0.06, 2.0, D.doors[1] + 1.2);
  map.rotation.y = Math.PI / 2;

  // outside: a sunny skyline that scrolls past both sides (elevated line), sky above it
  const cityTex = canvasTex(1024, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fb4e6'); gr.addColorStop(0.7, '#cfe4f2'); gr.addColorStop(1, '#e9e2d2'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(77), cols = ['#e9c9a3', '#d98f7a', '#a9c4c9', '#efe0b8', '#b8a6c9', '#c9d6a8', '#9fb6d6', '#f2f0ea'];
    for (let layer = 0; layer < 2; layer++) for (let x = -20; x < w; ) {
      const bw = 40 + r() * 70, bh = (layer ? 60 : 110) + r() * (layer ? 70 : 120), y = h - bh;
      g.fillStyle = cols[Math.floor(r() * cols.length)]; if (!layer) g.globalAlpha = 0.6; g.fillRect(x, y, bw, bh); g.globalAlpha = 1;
      g.fillStyle = 'rgba(60,90,130,.45)'; for (let wy = y + 10; wy < h - 12; wy += 18) for (let wx = x + 7; wx < x + bw - 9; wx += 14) g.fillRect(wx, wy, 7, 9);
      x += bw + 4 + r() * 10;
    }
    g.fillStyle = '#6f9a4a'; for (let x = 0; x < w; x += 22) { g.beginPath(); g.arc(x + r() * 8, h - 6, 12 + r() * 6, 0, 7); g.fill(); }
  });
  cityTex.wrapS = THREE.RepeatWrapping; cityTex.repeat.set(2, 1);
  const views = [];
  for (const s of [-1, 1]) {
    const tex = cityTex.clone(); tex.needsUpdate = true; tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(2, 1);
    const v = mk(new THREE.PlaneGeometry(60, 15), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), root, s * 9, 3.2, 0);
    v.rotation.y = -s * Math.PI / 2; v.castShadow = false; v.receiveShadow = false; views.push({ v, tex, s });
  }
  let pos = 0, lastT = null;
  function update(t, speed = 12) {
    if (lastT === null || t < lastT || t - lastT > 0.5) lastT = t;
    pos += (t - lastT) * speed; lastT = t;
    views.forEach(({ tex, s }) => { tex.offset.x = (s * pos) / 120; });
  }

  // lights: daylight through the windows + the fluorescents
  const hemi = new THREE.HemisphereLight(0xf4f8ff, 0x8a8478, 1.35); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.6); sun.position.set(6, 5, 2); sun.target.position.set(0, 0, 0); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 20 }); sun.shadow.bias = -0.0005;
  for (const z of [-5, 0, 5]) { const p = new THREE.PointLight(0xf4f8ff, 4.5, 6, 1.6); p.position.set(0, D.h - 0.25, z); root.add(p); }
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; } });
  void R;
  return { root, D: DIMS, poles, update, lights: { hemi, sun } };
}
