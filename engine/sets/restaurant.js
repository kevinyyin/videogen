// SET: a cozy evening bistro for a first date — warm wood floor, a brick back wall with a big window on a night city, string
// lights, six two-person tables (white tablecloths, candles, plates, wine glasses), low-backed wooden chairs (so whatever sits
// behind a diner — a tail — stays in view), a bar along the right wall with backlit bottle shelves, pendant lamps, a specials
// chalkboard, framed pictures, plants, a host stand. Built for video 015; reusable for any date / dinner / restaurant beat.
//
// Coordinates (meters, y up): room x∈[-4,4], z∈[-3.6,3.6], ceiling 3.0. Tables at DIMS.tables (the hero table is [0]); each
// table seats two diners at x ± DIMS.chairDx facing each other (left diner rotY = +PI/2, right diner rotY = −PI/2).
// Handles: tables[i] = { g, cloth (yankable group), dishes (group on the cloth), flame, chairs [left, right] (groups at the seat)}, update(t) (candle flicker, soft).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = {
  tables: [[0, 0.2], [-2.35, -1.0], [2.15, -1.2], [0, -2.4], [-2.45, 1.55], [-2.3, -2.75]],
  tableTop: 0.76, seat: 0.46, chairDx: 0.62,
};

export function buildRestaurant(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 15);
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);

  // shell: plank floor, brick back wall, paneled side walls, ceiling with beams
  const planks = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#8a5a36'; g.fillRect(0, 0, w, h); const r = rng(4); for (let y = 0; y < h; y += 42) { let x = -r() * 120; while (x < w) { const L = 90 + r() * 140; g.fillStyle = `hsl(${24 + r() * 8},${38 + r() * 10}%,${30 + r() * 10}%)`; g.fillRect(x + 2, y + 2, L - 3, 38); x += L; } } }, [4, 4]);
  const floor = mk(new THREE.PlaneGeometry(8, 7.2), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.55 }), root); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const brick = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#d9c6b0'; g.fillRect(0, 0, w, h); const r = rng(6); for (let row = 0; row < 16; row++) for (let c = -1; c < 8; c++) { const x = c * 68 + (row % 2) * 34, y = row * 32; g.fillStyle = `hsl(${10 + r() * 12},${45 + r() * 15}%,${36 + r() * 12}%)`; g.fillRect(x + 3, y + 3, 62, 26); } }, [3, 2]);
  const back = mk(new THREE.PlaneGeometry(8, 3.0), new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 }), root, 0, 1.5, -3.6); back.castShadow = false;
  const panel = mat(0x5a3422, 0.6), cream = mat(0xefe2c8, 0.9);
  for (const s of [-1, 1]) { box(0.1, 1.1, 7.2, panel, s * 4.05, 0.55, 0); box(0.1, 1.9, 7.2, cream, s * 4.05, 2.05, 0); box(0.14, 0.06, 7.2, mat(0x3a2216, 0.5), s * 4.0, 1.12, 0); }
  box(8.2, 0.08, 7.4, mat(0x3a2a22, 0.8), 0, 3.04, 0);
  for (let z = -3; z <= 3; z += 1.5) box(8.1, 0.16, 0.14, mat(0x4a3022, 0.6), 0, 2.94, z);
  // big window on the back wall: a night city (emissive), mullions, a sill with candles
  const city = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.7), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(720, 340, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a2346'); gr.addColorStop(1, '#4a3a5e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(8); for (let x = 0; x < w;) { const bw = 30 + r() * 60, bh = 80 + r() * 200; g.fillStyle = `hsl(${230 + r() * 20},${20 + r() * 10}%,${14 + r() * 8}%)`; g.fillRect(x, h - bh, bw, bh); for (let y = h - bh + 8; y < h - 4; y += 13) for (let xx = x + 4; xx < x + bw - 6; xx += 10) if (r() < 0.45) { g.fillStyle = r() < 0.7 ? '#ffd98a' : '#bfe0ff'; g.fillRect(xx, y, 5, 6); } x += bw + 3; }
    g.fillStyle = 'rgba(255,240,200,.9)'; g.beginPath(); g.arc(w * 0.8, h * 0.18, 16, 0, 7); g.fill();
  }) }));
  city.position.set(0.4, 1.75, -3.58); root.add(city);
  const frameM = mat(0x2a1a12, 0.5);
  box(3.75, 0.1, 0.12, frameM, 0.4, 2.62, -3.55); box(3.75, 0.12, 0.2, frameM, 0.4, 0.88, -3.5);
  for (const x of [-1.4, -0.2, 1.0, 2.2]) box(0.07, 1.75, 0.08, frameM, x, 1.75, -3.54);
  // string lights along the back wall + across the ceiling
  const bulbM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd58a).multiplyScalar(1.8), toneMapped: false });
  for (let i = 0; i <= 26; i++) { const u = i / 26; mk(new THREE.SphereGeometry(0.03, 8, 6), bulbM, root, -3.9 + u * 7.8, 2.75 - 0.22 * Math.sin(Math.PI * ((u * 3) % 1)), -3.45).castShadow = false; }
  for (const z of [-1.8, 0.0, 1.8]) for (let i = 0; i <= 18; i++) { const u = i / 18; mk(new THREE.SphereGeometry(0.028, 8, 6), bulbM, root, -3.9 + u * 7.8, 2.85 - 0.3 * Math.sin(Math.PI * u), z).castShadow = false; }
  // bar along the right wall: counter, stools, backlit shelves of bottles
  const bar = new THREE.Group(); bar.position.set(3.45, 0, -0.6); root.add(bar);
  rbox(0.7, 1.05, 3.6, 0.04, mat(0x4a2a1a, 0.5), 0, 0.525, 0, bar); rbox(0.85, 0.06, 3.7, 0.02, mat(0x2a1a12, 0.25), -0.05, 1.08, 0, bar);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc27a).multiplyScalar(0.9), toneMapped: false })); glow.position.set(0.55, 1.95, 0); glow.rotation.y = -Math.PI / 2; bar.add(glow);
  const bottleC = [0x2f6a3a, 0x7a2a2a, 0xc9a25a, 0x3a4a7a, 0xe8e2d0, 0x5a3a24];
  for (let lv = 0; lv < 3; lv++) { box(0.3, 0.03, 3.4, mat(0x3a2216, 0.5), 0.42, 1.45 + lv * 0.42, 0, bar); for (let b = 0; b < 14; b++) { const bh = 0.2 + R() * 0.12; mk(new THREE.CylinderGeometry(0.035, 0.04, bh, 8), mat(bottleC[Math.floor(R() * 6)], 0.2, { transparent: true, opacity: 0.85 }), bar, 0.42, 1.47 + lv * 0.42 + bh / 2, -1.6 + b * 0.24); } }
  for (let k = 0; k < 4; k++) { const st = new THREE.Group(); st.position.set(-0.65, 0, -1.3 + k * 0.85); bar.add(st); mk(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16), mat(0x7a2a2a, 0.6), st, 0, 0.75, 0); mk(new THREE.CylinderGeometry(0.03, 0.04, 0.72, 8), mat(0x2a2a2a, 0.3, { metalness: 0.6 }), st, 0, 0.37, 0); }
  // tables: wood base, a white tablecloth (top + skirt, its own group so it can be yanked), dishes, candle; two low-backed chairs
  const clothM = mat(0xfbf8f2, 0.85), woodM = mat(0x5a3422, 0.5), chairM = mat(0x6a3e26, 0.6), cushM = mat(0x8a2a2a, 0.8);
  const plateM = mat(0xffffff, 0.3), glassM = new THREE.MeshStandardMaterial({ color: 0xdde8f0, roughness: 0.05, transparent: true, opacity: 0.45 }), wineM = mat(0x6a1020, 0.3);
  const flameTex = canvasTex(64, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.62, 2, w / 2, h * 0.55, h * 0.5); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.35, 'rgba(255,190,80,.9)'); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const tables = DIMS.tables.map(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    mk(new THREE.CylinderGeometry(0.05, 0.06, DIMS.tableTop - 0.03, 10), woodM, g, 0, (DIMS.tableTop - 0.03) / 2, 0);
    mk(new THREE.CylinderGeometry(0.28, 0.3, 0.04, 16), woodM, g, 0, 0.02, 0);
    box(0.84, 0.03, 0.84, woodM, 0, DIMS.tableTop - 0.03, 0, g);
    const cloth = new THREE.Group(); cloth.position.y = DIMS.tableTop; g.add(cloth);
    box(0.98, 0.012, 0.98, clothM, 0, 0.0, 0, cloth);
    for (const [a, b, ry] of [[0, 0.49, 0], [0, -0.49, 0], [0.49, 0, Math.PI / 2], [-0.49, 0, Math.PI / 2]]) { const sk = box(0.98, 0.32, 0.01, clothM, a, -0.16, b, cloth); sk.rotation.y = ry; }
    const dishes = new THREE.Group(); dishes.position.y = DIMS.tableTop + 0.008; g.add(dishes);
    for (const s of [-1, 1]) {
      mk(new THREE.CylinderGeometry(0.13, 0.1, 0.02, 20), plateM, dishes, s * 0.24, 0.01, 0);
      mk(new THREE.SphereGeometry(0.06, 10, 6), mat([0xd2483f, 0xe8c070, 0x6a9a4a][(i + (s > 0 ? 1 : 0)) % 3], 0.7), dishes, s * 0.24, 0.025, 0).scale.y = 0.45;
      const gl = new THREE.Group(); gl.position.set(s * 0.2, 0, s * 0.24); dishes.add(gl);
      mk(new THREE.CylinderGeometry(0.035, 0.02, 0.09, 12), glassM, gl, 0, 0.14, 0); mk(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 6), glassM, gl, 0, 0.05, 0); mk(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 12), glassM, gl, 0, 0.003, 0);
      mk(new THREE.CylinderGeometry(0.03, 0.022, 0.04, 12), wineM, gl, 0, 0.125, 0);
      for (const f of [-1, 1]) box(0.012, 0.004, 0.16, mat(0xc9ccd0, 0.25, { metalness: 0.7 }), s * 0.24 + f * 0.17, 0.003, 0, dishes);
    }
    mk(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), mat(0xf6efe0, 0.6), dishes, 0, 0.06, -0.05);
    mk(new THREE.CylinderGeometry(0.045, 0.05, 0.015, 12), mat(0xc9a25a, 0.3, { metalness: 0.6 }), dishes, 0, 0.007, -0.05);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    flame.scale.set(0.05, 0.1, 1); flame.position.set(0, 0.16, -0.05); dishes.add(flame);
    mk(new THREE.CylinderGeometry(0.025, 0.035, 0.08, 10), mat(0xf4f1ea, 0.4), dishes, 0.05, 0.04, 0.2);
    const chairs = [];
    for (const s of [-1, 1]) {
      const c = new THREE.Group(); c.position.set(x + s * DIMS.chairDx, 0, z); chairs.push(c); c.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; root.add(c);
      rbox(0.44, 0.05, 0.42, 0.015, chairM, 0, DIMS.seat - 0.025, 0, c); rbox(0.4, 0.04, 0.38, 0.015, cushM, 0, DIMS.seat + 0.01, 0.01, c);
      for (const [a, b] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) box(0.035, DIMS.seat - 0.03, 0.035, chairM, a, (DIMS.seat - 0.03) / 2, b, c);
      for (const a of [-0.19, 0.19]) box(0.035, 0.32, 0.035, chairM, a, DIMS.seat + 0.15, -0.19, c);
      rbox(0.42, 0.08, 0.035, 0.01, chairM, 0, DIMS.seat + 0.28, -0.19, c);
    }
    return { g, cloth, dishes, flame, chairs, x, z };
  });
  // pendant lamps over the tables (emissive shades + a few real lights)
  const shadeM = mat(0x2a3a2a, 0.5), lampBulb = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(2.0), toneMapped: false });
  DIMS.tables.forEach(([x, z]) => { mk(new THREE.CylinderGeometry(0.006, 0.006, 1.0, 4), mat(0x111111, 0.5), root, x, 2.5, z); mk(new THREE.ConeGeometry(0.2, 0.18, 18, 1, true), shadeM, root, x, 1.95, z).material.side = THREE.DoubleSide; mk(new THREE.SphereGeometry(0.05, 10, 8), lampBulb, root, x, 1.9, z).castShadow = false; });
  // host stand, specials chalkboard, framed pictures, plants, coat rack
  const host = new THREE.Group(); host.position.set(-3.3, 0, 2.9); host.rotation.y = 0.6; root.add(host);
  rbox(0.5, 1.1, 0.35, 0.03, mat(0x4a2a1a, 0.5), 0, 0.55, 0, host); mk(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), mat(0x222222, 0.4), host, 0.12, 1.25, 0);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(300, 400, (g, w, h) => { g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e2a24'; g.fillRect(14, 14, w - 28, h - 28); g.fillStyle = '#f4efe2'; g.textAlign = 'center'; g.font = 'bold 34px Georgia, serif'; g.fillText('Tonight', w / 2, 70); g.font = 'italic 24px Georgia, serif'; ['Truffle pasta', 'Lemon salmon', 'Tiramisu', '♥ Date night ♥'].forEach((s, k) => g.fillText(s, w / 2, 140 + k * 56)); }) }));
  board.position.set(-3.98, 1.7, -1.9); board.rotation.y = Math.PI / 2; root.add(board);
  [[-3.98, 1.85, 0.4, 0xc98a5a], [-3.98, 1.75, 1.6, 0x5a8aa8], [3.98, 1.9, 2.2, 0xa85a6a]].forEach(([x, y, z, c]) => { const f = rbox(0.06, 0.6, 0.5, 0.01, mat(0xc9a25a, 0.4, { metalness: 0.5 }), x, y, z); const pic = mk(new THREE.PlaneGeometry(0.42, 0.52), mat(c, 0.8), root, x + (x < 0 ? 0.035 : -0.035), y, z); pic.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; void f; });
  const plant = (x, z, s = 1) => { const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(s); root.add(p); mk(new THREE.CylinderGeometry(0.2, 0.16, 0.38, 14), mat(0xb5562e, 0.7), p, 0, 0.19, 0); for (let k = 0; k < 10; k++) { const lf = mk(new THREE.SphereGeometry(0.2, 10, 8), mat(k % 2 ? 0x3f7a3a : 0x4f8a42, 0.8), p, Math.sin(k * 2.4) * 0.16, 0.6 + (k % 4) * 0.18, Math.cos(k * 2.4) * 0.16); lf.scale.set(0.45, 1.5, 0.25); lf.rotation.z = Math.sin(k) * 0.7; } };
  plant(-3.55, -3.2, 1.2); plant(3.55, 2.9, 1.1); plant(-1.6, -3.25, 0.9); plant(2.6, -3.2, 1.0);
  const rack = new THREE.Group(); rack.position.set(-3.6, 0, 2.0); root.add(rack); mk(new THREE.CylinderGeometry(0.02, 0.03, 1.8, 8), mat(0x2a1a12, 0.5), rack, 0, 0.9, 0); mk(new THREE.SphereGeometry(0.2, 10, 8), mat(0x6a5a8a, 0.9), rack, 0.12, 1.45, 0).scale.set(0.6, 1.4, 0.6); mk(new THREE.SphereGeometry(0.2, 10, 8), mat(0xb8743a, 0.9), rack, -0.1, 1.4, 0.05).scale.set(0.6, 1.3, 0.6);
  // lights: warm and bright (the TRIBE lesson: bright places score), a key from the camera side, pendant pools, bar glow
  const hemi = new THREE.HemisphereLight(0xffe6c8, 0x5a3a2a, 1.25); root.add(hemi);
  const key = new THREE.SpotLight(0xffe2bc, 70, 0, 0.7, 0.5, 1.3); key.position.set(1.5, 2.8, 3.3); key.target.position.set(0, 0.8, -0.6); root.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005;
  const pends = DIMS.tables.slice(0, 3).map(([x, z]) => { const l = new THREE.PointLight(0xffc98a, 3.2, 4.5, 1.6); l.position.set(x, 1.8, z); root.add(l); return l; });
  const barL = new THREE.PointLight(0xffb870, 3.5, 5, 1.6); barL.position.set(2.6, 2.0, -0.6); root.add(barL);
  const winL = new THREE.PointLight(0x8aa0ff, 1.5, 5, 1.6); winL.position.set(0.4, 1.8, -2.6); root.add(winL);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });
  function update(t) { tables.forEach((tb, i) => { const f = 1 + 0.12 * Math.sin(t * 9 + i * 2.1) + 0.06 * Math.sin(t * 23 + i); tb.flame.scale.set(0.05 * (2 - f), 0.1 * f, 1); }); pends.forEach((l, i) => (l.intensity = 3.2 * (1 + 0.03 * Math.sin(t * 7 + i)))); }
  return { root, D: DIMS, tables, update, lights: { hemi, key, pends, barL } };
}
