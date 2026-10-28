// SET: a cozy morning kitchen — counters + cabinets along the back wall (sink under a sunny window, stove, coffee maker, toaster),
// a fridge, a dining table with 4 chairs, a pendant lamp, a fruit bowl, a wall clock, a calendar, plants, a rug. Built for video 010.
// Dressed heavily on purpose (user steer: no bare scenes).
//
// Coordinates (meters, y up). Room x∈[-3,3], z∈[-2.6,2.6], ceiling 2.6. Counters along z=-2.6 (top 0.92). Window over the sink
// at x∈[-0.6,0.6]. Fridge at x=-2.45. Table centered at DIMS.table (top 0.75). Camera usually from +z looking -z.
// Handles: table, chairs[], mug position DIMS.mugSpot (on the table), setClock(h, m).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = { room: { x0: -3, x1: 3, z0: -2.6, z1: 2.6, h: 2.6 }, table: [0.4, -0.4], tableTop: 0.75, mugSpot: [0.15, 0.755, -0.15] };

export function buildKitchen(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 5), Dm = DIMS.room;
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);

  // shell: checker floor, two-tone walls, ceiling
  const floorTex = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#e9e2d2' : '#b9c7c0'; g.fillRect(x * 64, y * 64, 64, 64); } }, [6, 6]);
  const floor = mk(new THREE.PlaneGeometry(6, 5.2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4 }), root); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallM = mat(0xf2e6c9, 0.9), tileTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,150,170,.45)'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); } }, [12, 2]);
  const W0 = -0.6, W1 = 0.6;
  box(W0 - Dm.x0, Dm.h, 0.12, wallM, (Dm.x0 + W0) / 2, Dm.h / 2, Dm.z0 - 0.06); box(Dm.x1 - W1, Dm.h, 0.12, wallM, (W1 + Dm.x1) / 2, Dm.h / 2, Dm.z0 - 0.06);
  box(W1 - W0, 1.05, 0.12, wallM, 0, 0.525, Dm.z0 - 0.06); box(W1 - W0, Dm.h - 2.1, 0.12, wallM, 0, (Dm.h + 2.1) / 2, Dm.z0 - 0.06);
  const splash = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.55), new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.3 })); splash.position.set(0, 1.2, Dm.z0 + 0.005); root.add(splash);
  box(0.12, Dm.h, 5.2, wallM, Dm.x0 - 0.06, Dm.h / 2, 0); box(0.12, Dm.h, 5.2, wallM, Dm.x1 + 0.06, Dm.h / 2, 0);
  box(6.3, 0.1, 5.4, mat(0xf6f3ec, 0.95), 0, Dm.h + 0.05, 0);
  // sunny view out the window
  const view = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ map: canvasTex(256, 170, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8fc3ec'); gr.addColorStop(0.7, '#d9ecf5'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#6fa84f'; g.fillRect(0, h * 0.72, w, h); g.fillStyle = '#4f8a3f'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(20 + i * 45, h * 0.7, 26, 0, 7); g.fill(); } }), toneMapped: false }));
  view.position.set(0, 1.55, Dm.z0 - 1.0); root.add(view);
  for (const x of [W0, W1]) box(0.06, 1.1, 0.08, mat(0xffffff, 0.5), x, 1.6, Dm.z0 + 0.01); box(1.3, 0.06, 0.08, mat(0xffffff, 0.5), 0, 2.13, Dm.z0 + 0.01); box(1.3, 0.05, 0.2, mat(0xffffff, 0.5), 0, 1.05, Dm.z0 + 0.06);
  for (const x of [W0 - 0.25, W1 + 0.25]) { const c = mk(new THREE.PlaneGeometry(0.45, 1.3), mat(0xe2574c, 0.9, { side: THREE.DoubleSide }), root, x, 1.55, Dm.z0 + 0.04); c.castShadow = false; }

  // counters + cabinets
  const cabM = mat(0x7aa3b5, 0.6), topM = mat(0xece6da, 0.35), knob = mat(0xc9a25a, 0.3, { metalness: 0.6 });
  for (let x = -1.9; x <= 2.7; x += 0.6) {
    rbox(0.58, 0.82, 0.58, 0.02, cabM, x, 0.41, Dm.z0 + 0.3); mk(new THREE.SphereGeometry(0.02, 8, 6), knob, root, x + 0.2, 0.7, Dm.z0 + 0.6);
    if (Math.abs(x) > 0.8) { rbox(0.58, 0.65, 0.34, 0.02, cabM, x, 1.95, Dm.z0 + 0.17); mk(new THREE.SphereGeometry(0.02, 8, 6), knob, root, x + 0.2, 1.7, Dm.z0 + 0.35); }
  }
  box(4.9, 0.05, 0.64, topM, 0.4, 0.845, Dm.z0 + 0.32);
  // sink, stove, coffee maker, toaster, fruit, utensils
  box(0.6, 0.02, 0.4, mat(0xb8bcc2, 0.2, { metalness: 0.7 }), 0, 0.875, Dm.z0 + 0.32); mk(new THREE.TorusGeometry(0.1, 0.015, 6, 16, Math.PI), mat(0xb8bcc2, 0.2, { metalness: 0.7 }), root, 0, 1.0, Dm.z0 + 0.1);
  box(0.6, 0.02, 0.55, mat(0x2a2d31, 0.4), 1.6, 0.875, Dm.z0 + 0.32); for (const [bx, bz] of [[-0.13, -0.12], [0.13, -0.12], [-0.13, 0.12], [0.13, 0.12]]) mk(new THREE.TorusGeometry(0.07, 0.01, 6, 20), mat(0x444444, 0.5), root, 1.6 + bx, 0.89, Dm.z0 + 0.32 + bz).rotation.x = Math.PI / 2;
  const kettle = mk(new THREE.SphereGeometry(0.11, 14, 10), mat(0xd2483f, 0.4), root, 1.47, 0.98, Dm.z0 + 0.2); kettle.scale.y = 0.85;
  rbox(0.2, 0.34, 0.24, 0.02, mat(0x2a2d31, 0.4), -1.3, 1.04, Dm.z0 + 0.2); mk(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 12), mat(0xcfe3ef, 0.1, { transparent: true, opacity: 0.6 }), root, -1.3, 0.94, Dm.z0 + 0.32);
  rbox(0.26, 0.16, 0.14, 0.03, mat(0xd8dce0, 0.3, { metalness: 0.5 }), -0.85, 0.95, Dm.z0 + 0.22);
  const bowl = mk(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xf2efe8, 0.5, { side: THREE.DoubleSide }), root, 0.95, 1.02, Dm.z0 + 0.3);
  [0xd2483f, 0xf2b632, 0x6fa84f, 0xf08a4b, 0xd2483f].forEach((c, i) => mk(new THREE.SphereGeometry(0.055, 10, 8), mat(c, 0.5), root, 0.95 + Math.cos(i * 1.3) * 0.07, 0.94 + (i > 2 ? 0.05 : 0), Dm.z0 + 0.3 + Math.sin(i * 1.3) * 0.07));
  for (let i = 0; i < 4; i++) mk(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 6), mat(0x8a6a48, 0.6), root, 2.3 + i * 0.03, 1.0, Dm.z0 + 0.2).rotation.z = (i - 1.5) * 0.12;
  mk(new THREE.CylinderGeometry(0.06, 0.05, 0.14, 12), mat(0xe2574c, 0.6), root, 2.34, 0.93, Dm.z0 + 0.2);
  // fridge (with magnets + a drawing)
  const fx = -2.45;
  rbox(0.85, 1.85, 0.75, 0.04, mat(0xf2f2ee, 0.3), fx, 0.925, Dm.z0 + 0.4); box(0.84, 0.01, 0.01, mat(0xbbbbbb, 0.4), fx, 1.2, Dm.z0 + 0.78);
  box(0.03, 0.4, 0.03, mat(0xbbbbbb, 0.3, { metalness: 0.6 }), fx + 0.32, 1.45, Dm.z0 + 0.79); box(0.03, 0.3, 0.03, mat(0xbbbbbb, 0.3, { metalness: 0.6 }), fx + 0.32, 0.9, Dm.z0 + 0.79);
  const draw = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.28), new THREE.MeshStandardMaterial({ map: canvasTex(128, 160, (g, w, h) => { g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h); g.lineWidth = 5; ['#e04b3a', '#3a7be0', '#3ab05a'].forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(30 + i * 34, 60 + i * 20, 18, 0, 7); g.stroke(); }); g.fillStyle = '#f2b632'; g.beginPath(); g.arc(100, 30, 16, 0, 7); g.fill(); }), roughness: 0.8 }));
  draw.position.set(fx - 0.1, 1.5, Dm.z0 + 0.785); root.add(draw);
  [0xe2574c, 0x4f9bd9, 0xf2b632].forEach((c, i) => mk(new THREE.BoxGeometry(0.05, 0.05, 0.02), mat(c, 0.5), root, fx - 0.25 + i * 0.1, 1.7 - i * 0.12, Dm.z0 + 0.79));
  // table + chairs + tablecloth stripe + centerpiece
  const [tx, tz] = DIMS.table, wood = mat(0xb07a4a, 0.6);
  const table = new THREE.Group(); table.position.set(tx, 0, tz); root.add(table);
  rbox(1.4, 0.05, 0.9, 0.02, wood, 0, DIMS.tableTop - 0.025, 0, table);
  for (const [lx, lz] of [[-0.62, -0.38], [0.62, -0.38], [-0.62, 0.38], [0.62, 0.38]]) box(0.05, DIMS.tableTop - 0.05, 0.05, wood, lx, (DIMS.tableTop - 0.05) / 2, lz, table);
  box(1.42, 0.005, 0.3, mat(0xe2574c, 0.9), 0, DIMS.tableTop + 0.002, 0, table);
  const vase = mk(new THREE.CylinderGeometry(0.05, 0.07, 0.18, 12), mat(0x4f9bd9, 0.4), table, 0.45, DIMS.tableTop + 0.09, 0.05);
  for (let k = 0; k < 5; k++) mk(new THREE.SphereGeometry(0.035, 8, 6), mat([0xf2b632, 0xe58fa6, 0xffffff][k % 3], 0.6), table, 0.45 + Math.cos(k * 1.25) * 0.05, DIMS.tableTop + 0.24, 0.05 + Math.sin(k * 1.25) * 0.05);
  const chairs = [];
  for (const [cx, cz, r] of [[-0.95, 0, Math.PI / 2], [0.95, 0, -Math.PI / 2], [0, -0.75, 0], [0, 0.8, Math.PI]]) {
    const c = new THREE.Group(); c.position.set(tx + cx, 0, tz + cz); c.rotation.y = r; root.add(c);
    rbox(0.42, 0.04, 0.42, 0.01, wood, 0, 0.45, 0, c); for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.035, 0.45, 0.035, wood, lx, 0.225, lz, c);
    for (const lx of [-0.18, 0.18]) box(0.035, 0.5, 0.035, wood, lx, 0.7, -0.19, c); box(0.4, 0.12, 0.03, wood, 0, 0.88, -0.19, c);
    chairs.push(c);
  }
  // pendant lamp, wall clock, calendar, shelf with jars, plants, rug
  mk(new THREE.CylinderGeometry(0.005, 0.005, 0.7, 4), mat(0x222222, 0.5), root, tx, Dm.h - 0.35, tz);
  const shade = mk(new THREE.ConeGeometry(0.22, 0.2, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xf2b632, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xffc070, emissiveIntensity: 0.4 }), root, tx, Dm.h - 0.75, tz);
  const clockTex = (h, m) => canvasTex(128, 128, (g, w) => { g.fillStyle = '#fffdf6'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#333'; g.lineWidth = 6; g.stroke(); g.lineCap = 'round'; const a = ((h % 12) + m / 60) / 12 * Math.PI * 2, b = m / 60 * Math.PI * 2; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(a) * 30, 64 - Math.cos(a) * 30); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(b) * 46, 64 - Math.cos(b) * 46); g.stroke(); });
  const clockM = new THREE.MeshStandardMaterial({ map: clockTex(6, 10), roughness: 0.6 });
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), clockM); clock.position.set(Dm.x1 - 0.005, 1.95, -0.6); clock.rotation.y = -Math.PI / 2; root.add(clock);
  const setClock = (h, m) => { clockM.map = clockTex(h, m); clockM.needsUpdate = true; };
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.55), new THREE.MeshStandardMaterial({ map: canvasTex(160, 220, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#d23a3f'; g.fillRect(0, 0, w, 50); g.fillStyle = '#fff'; g.font = 'bold 30px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('TUESDAY', w / 2, 36); g.fillStyle = '#ccc'; for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) g.fillRect(8 + x * 21, 62 + y * 30, 16, 22); }), roughness: 0.8 }));
  cal.position.set(Dm.x1 - 0.005, 1.4, 0.6); cal.rotation.y = -Math.PI / 2; root.add(cal);
  box(1.2, 0.03, 0.22, wood, Dm.x0 + 0.12, 1.85, 0.8).rotation.y = Math.PI / 2;
  for (let i = 0; i < 4; i++) mk(new THREE.CylinderGeometry(0.06, 0.06, 0.16 + (i % 2) * 0.05, 12), mat([0xf2b632, 0xe58fa6, 0x6fa84f, 0xf2efe8][i], 0.4), root, Dm.x0 + 0.13, 1.95, 0.4 + i * 0.25);
  for (const [px, pz, s] of [[2.6, 2.1, 1.0], [-2.6, 2.0, 0.8]]) { const pg = new THREE.Group(); pg.position.set(px, 0, pz); pg.scale.setScalar(s); root.add(pg); mk(new THREE.CylinderGeometry(0.2, 0.15, 0.35, 14), mat(0xb5672e, 0.8), pg, 0, 0.17, 0); for (let k = 0; k < 8; k++) { const lf = mk(new THREE.SphereGeometry(0.2, 10, 8), mat(0x4f8a3f, 0.8), pg, Math.sin(k * 2.4) * 0.15, 0.55 + (k % 3) * 0.15, Math.cos(k * 2.4) * 0.15); lf.scale.set(0.5, 1.5, 0.3); } }
  const rug = mk(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshStandardMaterial({ map: canvasTex(256, 170, (g, w, h) => { g.fillStyle = '#c9b38c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a8584a'; g.lineWidth = 10; g.strokeRect(12, 12, w - 24, h - 24); g.strokeStyle = '#5c7c84'; g.lineWidth = 6; g.strokeRect(30, 30, w - 60, h - 60); }), roughness: 1 }), root, tx, 0.004, tz); rug.rotation.x = -Math.PI / 2; rug.castShadow = false;

  // lights: morning sun through the window + warm pendant + soft fill
  const hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a7a66, 1.1); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe9c8, 2.2); sun.position.set(0.6, 4.5, -7); sun.target.position.set(0.4, 0, -0.2); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 16 }); sun.shadow.bias = -0.0005;
  const pend = new THREE.PointLight(0xffc98a, 3.5, 5, 1.8); pend.position.set(tx, Dm.h - 0.9, tz); root.add(pend);
  const fillL = new THREE.PointLight(0xfff0e0, 2.5, 7, 1.6); fillL.position.set(1.5, 2.2, 2.0); root.add(fillL);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; } });
  void R;
  return { root, D: DIMS, table, chairs, setClock, lights: { hemi, sun, pend } };
}
