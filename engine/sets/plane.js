// SET: airliner economy cabin — 3+3 seat rows down a narrow aisle, overhead bins, oval windows with a sunny cloudscape,
// ceiling light strip, seat-back screens, headrest covers, a galley curtain. Built for video 010 (giants in economy). Reusable.
//
// Coordinates (meters, y up). Aisle along z at x=0 (width 0.5). Seats at x = ±0.75, ±1.25, ±1.75 (left −, right +),
// rows every DIMS.pitch (0.8 m) from z=0 backward (−z). Seat top (cushion) y=0.45, back to 1.1. Ceiling 2.1 over the aisle,
// bins over the seats 1.65–2.0. Camera usually at the front (z ≈ +1.5) looking down the aisle toward −z.
// Handles: seatPos(row, col) → {x, z} (col 0..5: 0 = left window, 5 = right window), rows.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

const COLS = [-1.75, -1.25, -0.75, 0.75, 1.25, 1.75];
export const DIMS = { pitch: 0.82, rows: 12, cols: COLS, seatY: 0.45, ceil: 2.1 };
export const seatPos = (row, col) => ({ x: COLS[col], z: -row * DIMS.pitch });

export function buildPlane(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 12), N = DIMS.rows, P = DIMS.pitch, L = N * P + 3;
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);

  // floor (carpet), side walls (curved-ish: two slanted panels), ceiling, bins
  const carpet = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3c4a63'; g.fillRect(0, 0, w, h); const r = rng(2); for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)'; g.fillRect(r() * w, r() * h, 3, 3); } }, [3, 12]);
  const floor = mk(new THREE.PlaneGeometry(4.2, L), new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 }), root, 0, 0, -L / 2 + 1.5); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallM = mat(0xeceae4, 0.7), binM = mat(0xf4f2ee, 0.5);
  for (const s of [-1, 1]) {
    const lower = box(0.08, 1.2, L, wallM, s * 2.1, 0.6, -L / 2 + 1.5); const upper = box(0.08, 0.9, L, wallM, s * 1.95, 1.55, -L / 2 + 1.5); upper.rotation.z = s * 0.32;
    // windows (oval, emissive cloudscape) — one per row
    for (let r = 0; r < N; r++) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), winMat()); w.scale.set(0.8, 1.15, 1); w.position.set(s * 2.055, 1.05, -r * P - 0.2); w.rotation.y = -s * Math.PI / 2; root.add(w);
      mk(new THREE.TorusGeometry(0.15, 0.025, 6, 20), mat(0xd8d4cc, 0.5), root, s * 2.05, 1.05, -r * P - 0.2).rotation.y = Math.PI / 2;
    }
    // overhead bin run (with a seam per row)
    const bin = box(1.25, 0.38, L - 1, binM, s * 1.42, 1.84, -L / 2 + 2.0); bin.rotation.z = s * -0.1;
    for (let r = 0; r <= N; r++) box(1.26, 0.385, 0.01, mat(0xd8d4cc, 0.5), s * 1.42, 1.84, -r * P + 0.4).rotation.z = s * -0.1;
  }
  box(1.6, 0.06, L, mat(0xf6f5f1, 0.6), 0, DIMS.ceil, -L / 2 + 1.5);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, L - 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff4e0).multiplyScalar(1.4), toneMapped: false })); strip.position.set(0, DIMS.ceil - 0.04, -L / 2 + 1.8); root.add(strip);
  // back wall + galley curtain
  box(4.2, 2.2, 0.08, wallM, 0, 1.1, -N * P - 1.0);
  const curtain = mk(new THREE.PlaneGeometry(0.9, 1.9, 12, 1), mat(0x2f4f73, 0.9, { side: THREE.DoubleSide }), root, 0, 0.98, -N * P - 0.95);
  const cp = curtain.geometry.attributes.position; for (let i = 0; i < cp.count; i++) cp.setZ(i, 0.04 * Math.sin(cp.getX(i) * 18)); curtain.geometry.computeVertexNormals();

  // seats (instanced-ish: groups), seat-back screens, headrest covers
  const seatM = mat(0x2a5a8a, 0.8), coverM = mat(0xf2f1ec, 0.9), armM = mat(0x8a8f96, 0.5), screenM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6fa0d0).multiplyScalar(0.9), toneMapped: false });
  const rows = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < 6; c++) {
    const g = new THREE.Group(); const { x, z } = seatPos(r, c); g.position.set(x, 0, z); root.add(g);
    mk(new RoundedBoxGeometry(0.46, 0.14, 0.48, 2, 0.05), seatM, g, 0, DIMS.seatY - 0.07, 0.02);
    const back = mk(new RoundedBoxGeometry(0.46, 0.68, 0.12, 2, 0.05), seatM, g, 0, 0.82, -0.24); back.rotation.x = -0.1;
    mk(new RoundedBoxGeometry(0.34, 0.16, 0.13, 2, 0.04), coverM, g, 0, 1.06, -0.235).rotation.x = -0.1;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.13), screenM); scr.position.set(0, 0.9, -0.31); scr.rotation.y = Math.PI; scr.rotation.x = 0.1; g.add(scr);
    box(0.04, 0.05, 0.42, armM, -0.25, 0.62, 0, g);
    mk(new THREE.BoxGeometry(0.06, DIMS.seatY - 0.14, 0.06), armM, g, 0, (DIMS.seatY - 0.14) / 2, 0);
    rows.push(g);
  }
  // lights
  const hemi = new THREE.HemisphereLight(0xfff8ee, 0x5a6070, 1.25); root.add(hemi);
  const key = new THREE.DirectionalLight(0xfff2dc, 1.3); key.position.set(2, 6, 3); key.target.position.set(0, 0, -4); root.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 20 });
  for (let z = 0; z > -N * P; z -= 3) { const L2 = new THREE.PointLight(0xfff4e0, 3.0, 5, 1.8); L2.position.set(0, 1.9, z); root.add(L2); }
  root.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial) o.castShadow = false; });
  void R;
  return { root, D: DIMS, seatPos, rows, lights: { hemi, key } };
}
let _win = null;
function winMat() {
  if (_win) return _win;
  _win = new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(64, 96, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5f9bd8'); gr.addColorStop(0.6, '#cfe6f6'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(8 + i * 13, h * 0.75, 10, 0, 7); g.fill(); } }) });
  return _win;
}
