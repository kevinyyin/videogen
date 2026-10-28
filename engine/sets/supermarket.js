// SET: supermarket interior — 4 long aisles of shelves stocked with colorful products (instanced), price strips, fluorescent
// ceiling panels, a checkout lane at the front, an "SOLD OUT" sign you can switch on. Built for video 010; reusable.
//
// Coordinates (meters, y up). Store x∈[-8,8], z∈[-12,6], ceiling 4.4. Aisles run along z; shelf units at x = DIMS.shelves
// (each 1.0 deep, 2.1 tall, z∈[-10,2]). Walkways between them at x = DIMS.aisles. The entrance + checkouts are at +z.
// Handles: setStock(k 0..1) — products vanish in a fixed shuffled order (k=1 full, 0 empty, a time-lapse in one call),
//          setSoldOut(v) — the hanging SOLD OUT banners.
import * as THREE from 'three';
import { mat, mk, canvasTex, rng, clamp } from '@engine/core.js';

export const DIMS = { room: { x0: -8, x1: 8, z0: -12, z1: 6, h: 4.4 }, shelves: [-6.0, -2.0, 2.0, 6.0], aisles: [-4.0, 0.0, 4.0], z0: -10, z1: 2 };

export function buildSupermarket(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 31), Dm = DIMS.room;
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);

  // shell
  const floorTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e9e6df'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,110,100,.25)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.03)'; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2); }, [16, 18]);
  const floor = mk(new THREE.PlaneGeometry(16, 18), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35 }), root, 0, 0, -3); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallM = mat(0xf1ede4, 0.9);
  box(16.4, Dm.h, 0.2, wallM, 0, Dm.h / 2, Dm.z0 - 0.1); box(0.2, Dm.h, 18, wallM, Dm.x0 - 0.1, Dm.h / 2, -3); box(0.2, Dm.h, 18, wallM, Dm.x1 + 0.1, Dm.h / 2, -3);
  box(16.4, 0.15, 18.4, mat(0xdedad2, 0.95), 0, Dm.h + 0.07, -3);
  const deptTex = (t, c) => canvasTex(512, 96, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 60px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, w / 2, h / 2 + 3); });
  [['PRODUCE', '#3f8a4a', -6], ['BAKERY', '#b5762e', -2], ['DAIRY', '#2f6aa8', 2], ['SNACKS', '#c0392b', 6]].forEach(([t, c, x]) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshStandardMaterial({ map: deptTex(t, c), roughness: 0.6 })); s.position.set(x, 3.4, Dm.z0 + 0.02); root.add(s); });

  // shelves + products (instanced)
  const shelfM = mat(0xdad7d0, 0.5, { metalness: 0.2 });
  const COLS = [0xd2483f, 0xf2b632, 0x3d7bd9, 0x58b368, 0xf08a4b, 0xa77bd1, 0xffffff, 0xe58fa6, 0x2f4f73];
  const prod = [], fruitBins = [];
  for (const sx of DIMS.shelves) {
    const L = DIMS.z1 - DIMS.z0, cz = (DIMS.z0 + DIMS.z1) / 2;
    box(1.0, 2.1, 0.06, shelfM, sx, 1.05, cz + L / 2); box(1.0, 2.1, 0.06, shelfM, sx, 1.05, cz - L / 2);
    box(0.08, 2.1, L, shelfM, sx, 1.05, cz);                                    // spine
    for (let lv = 0; lv < 5; lv++) {
      const y = 0.15 + lv * 0.45;
      box(1.0, 0.04, L, shelfM, sx, y, cz);
      for (const side of [-1, 1]) {
        if (Math.abs(sx + side * 0.5) > 7.6) continue;                            // wall-side faces stay bare
        const strip = box(0.02, 0.06, L, mat(0xf2c14e, 0.5), sx + side * 0.51, y + 0.01, cz); strip.castShadow = false;
        for (let z = DIMS.z0 + 0.2; z < DIMS.z1 - 0.1; z += 0.26) prod.push({ x: sx + side * 0.27, y: y + 0.02, z, c: COLS[Math.floor(R() * COLS.length)], h: 0.18 + R() * 0.2, w: 0.2 + R() * 0.05, k: R() });
      }
    }
  }
  const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.55 }), prod.length);
  pm.castShadow = true; pm.receiveShadow = true; root.add(pm);
  prod.forEach((p, i) => pm.setColorAt(i, new THREE.Color(p.c)));
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  let lastK = -1, lastBelow = Infinity;
  function setStock(k, belowY = Infinity) {   // belowY (014): only shelves lower than this height empty; higher ones stay full
    if (k === lastK && belowY === lastBelow) return; lastK = k; lastBelow = belowY;
    prod.forEach((p, i) => { const on = p.y >= belowY || p.k < k; _v.set(p.x, p.y + p.h / 2, p.z); _s.set(on ? 0.4 : 0, on ? p.h : 0, on ? p.w : 0); _m.compose(_v, _q, _s); pm.setMatrixAt(i, _m); });
    pm.instanceMatrix.needsUpdate = true; if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
    fruitBins.forEach((b, i) => (b.visible = k > 0.25 + i * 0.12));
  }
  setStock(1);

  // checkout lane at the front
  for (const x of [-5, -1.5, 2]) { box(0.8, 0.95, 2.4, mat(0x4a5560, 0.5), x, 0.475, 4.0); box(0.82, 0.04, 2.42, mat(0x2a2d31, 0.4), x, 0.97, 4.0); }

  // carts + produce bins (set dressing)
  const wire = mat(0xc9ccd0, 0.3, { metalness: 0.6 });
  for (const [x, z, r] of [[-3.2, 3.0, 0.3], [1.1, 1.6, -0.5], [5.0, 3.3, 0.1], [-6.9, -11.0, 1.5]]) {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = r; root.add(c);
    mk(new THREE.BoxGeometry(0.55, 0.45, 0.85), new THREE.MeshStandardMaterial({ color: 0xc9ccd0, wireframe: true }), c, 0, 0.75, 0);
    mk(new THREE.BoxGeometry(0.55, 0.02, 0.85), wire, c, 0, 0.53, 0); mk(new THREE.BoxGeometry(0.6, 0.03, 0.03), mat(0xd2483f, 0.5), c, 0, 1.05, -0.45);
    for (const [wx, wz] of [[-0.22, 0.35], [0.22, 0.35], [-0.22, -0.35], [0.22, -0.35]]) mk(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), mat(0x222222, 0.6), c, wx, 0.05, wz).rotation.z = Math.PI / 2;
    for (const k of [0, 1]) mk(new THREE.BoxGeometry(0.03, 0.5, 0.03), wire, c, k ? 0.25 : -0.25, 0.28, -0.4);
  }
  const fruit = [0xd2483f, 0xf2b632, 0x6fa84f, 0xf08a4b];
  fruit.forEach((col, i) => { const x = -7.2 + i * 0.0, z = -8.5 + i * 2.2; mk(new THREE.BoxGeometry(0.9, 0.7, 1.8), mat(0x8a6a48, 0.9), root, x + 0.2, 0.35, z); const bin = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), mat(col, 0.5), 60); const m = new THREE.Matrix4(); for (let k = 0; k < 60; k++) { m.makeTranslation(x + 0.2 + ((k % 6) - 2.5) * 0.13, 0.75 + Math.floor(k / 36) * 0.1, z + ((Math.floor(k / 6) % 6) - 2.5) * 0.27); bin.setMatrixAt(k, m); } root.add(bin); fruitBins.push(bin); });

  // SOLD OUT banners hanging over the aisles
  const soldTex = canvasTex(640, 160, (g, w, h) => { g.fillStyle = '#d23a3f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 104px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SOLD OUT', w / 2, h / 2 + 6); });
  const sold = new THREE.Group(); root.add(sold);
  for (const x of DIMS.aisles) { const b = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshStandardMaterial({ map: soldTex, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: soldTex, emissiveIntensity: 0.25 })); b.position.set(x, 3.55, -1.5); sold.add(b); }
  sold.visible = false;

  // lights: fluorescent panels (emissive) + soft cool fill
  const panelM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf4f8ff).multiplyScalar(1.6), toneMapped: false });
  for (const x of DIMS.aisles) for (let z = -9; z <= 4; z += 3.2) { const p = mk(new THREE.BoxGeometry(0.6, 0.04, 1.9), panelM, root, x, Dm.h - 0.02, z); p.castShadow = false; }
  const hemi = new THREE.HemisphereLight(0xf2f6ff, 0x8a8478, 1.3); root.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(3, 12, 6); key.target.position.set(0, 0, -3); root.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 30 });
  for (const x of [-4, 4]) for (const z of [-7, 0]) { const L = new THREE.PointLight(0xf4f8ff, 6, 9, 1.6); L.position.set(x, 3.6, z); root.add(L); }

  root.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial) o.castShadow = false; });
  // setSoldOut(v, text?) — optional custom banner text (012: 'TOWELS SOLD OUT')
  let soldText = 'SOLD OUT';
  const setSoldOut = (v, text) => {
    sold.visible = !!v;
    if (text && text !== soldText) { soldText = text; const c = soldTex.image.getContext('2d'); c.fillStyle = '#d23a3f'; c.fillRect(0, 0, 640, 160); c.fillStyle = '#fff'; let fs = 104; do { c.font = `bold ${fs}px Helvetica, Arial, sans-serif`; fs -= 4; } while (c.measureText(text).width > 590 && fs > 30); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 320, 86); soldTex.needsUpdate = true; }
  };
  return { root, D: DIMS, setStock, setSoldOut, lights: { hemi, key } };
}
