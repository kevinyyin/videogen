// SET: an outdoor garden wedding — a flower-covered white arch, an aisle runner with petals, rows of white chairs with bows,
// hedges, string lights, a cake table, lanterns, trees, sunny sky. Built for video 012; reusable for any ceremony beat.
// Coordinates: arch at DIMS.arch (z=-4, faces +z). Couple stands at DIMS.bride / DIMS.groom (facing each other, ±x),
// officiant at DIMS.officiant (behind them, facing +z). Guest chairs: rows at DIMS.rows (z), seats at ±DIMS.seats (x), facing −z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = { arch: [0, -4], bride: [0.55, -3.3], groom: [-0.55, -3.3], officiant: [0, -4.25], rows: [-1.4, -0.4, 0.6, 1.6, 2.6], seats: [1.3, 2.0, 2.7, 3.4], seat: 0.45 };

export function buildWedding(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 22);
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);
  const fog = new THREE.Fog(0xeef0e6, 40, 200);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 32, 16), new THREE.MeshBasicMaterial({ fog: false, side: THREE.BackSide, toneMapped: false, map: canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6aa6e0'); gr.addColorStop(0.45, '#bcdcf2'); gr.addColorStop(0.5, '#f4f0e6'); gr.addColorStop(1, '#f4f0e6'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) })); root.add(sky);
  const grass = mk(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ roughness: 0.95, map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#76a24c'; g.fillRect(0, 0, w, h); const r = rng(9); for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(40,80,20,.18)' : 'rgba(180,220,120,.16)'; g.fillRect(r() * w, r() * h, 2, 5); } }, [60, 60]) }), root); grass.rotation.x = -Math.PI / 2; grass.castShadow = false;
  // aisle runner + petals
  const run = box(1.1, 0.01, 9.5, mat(0xf7f4ee, 0.9), 0, 0.006, -0.6); run.castShadow = false;
  const petalM = [mat(0xe58fa6, 0.8), mat(0xffffff, 0.8), mat(0xf2b632, 0.8)];
  for (let i = 0; i < 120; i++) { const p = mk(new THREE.CircleGeometry(0.03, 6), petalM[i % 3], root, (R() - 0.5) * 1.1, 0.013, -5 + R() * 9); p.rotation.x = -Math.PI / 2; p.castShadow = false; }
  // arch: two white posts + a curved top covered in flowers
  const white = mat(0xf7f4ee, 0.5), [ax, az] = DIMS.arch;
  for (const s of [-1, 1]) box(0.12, 2.6, 0.12, white, ax + s * 1.2, 1.3, az);
  const curve = mk(new THREE.TorusGeometry(1.2, 0.07, 10, 36, Math.PI), white, root, ax, 2.6, az);
  const flowerC = [0xe58fa6, 0xffffff, 0xf2b632, 0xd2483f, 0xf4c6d6];
  for (let i = 0; i < 70; i++) { const a = R() * Math.PI, side = R() < 0.35; const x = side ? ax + (R() < 0.5 ? -1 : 1) * 1.2 : ax + Math.cos(a) * 1.2, y = side ? 1.2 + R() * 1.4 : 2.6 + Math.sin(a) * 1.2; mk(new THREE.SphereGeometry(0.06 + R() * 0.05, 8, 6), mat(flowerC[i % 5], 0.7), root, x + (R() - 0.5) * 0.12, y + (R() - 0.5) * 0.12, az + (R() - 0.5) * 0.15); }
  for (let i = 0; i < 40; i++) { const a = R() * Math.PI; mk(new THREE.SphereGeometry(0.08, 8, 6), mat(0x4f8a3f, 0.8), root, ax + Math.cos(a) * 1.2, 2.6 + Math.sin(a) * 1.2, az - 0.05).scale.set(1.3, 0.6, 1); }
  void curve;
  // officiant's small lectern
  rbox(0.5, 1.05, 0.35, 0.03, mat(0xf7f4ee, 0.5), DIMS.officiant[0], 0.52, DIMS.officiant[1] + 0.45);
  // guest chairs with bows (both sides of the aisle)
  const chairM = mat(0xf7f4ee, 0.45), bowM = mat(0xe58fa6, 0.7);
  for (const z of DIMS.rows) for (const sx of DIMS.seats) for (const side of [-1, 1]) {
    const c = new THREE.Group(); c.position.set(side * sx, 0, z); root.add(c);
    rbox(0.44, 0.04, 0.42, 0.01, chairM, 0, DIMS.seat, 0, c); for (const [a, b] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) box(0.03, DIMS.seat, 0.03, chairM, a, DIMS.seat / 2, b, c);
    for (let k = 0; k < 4; k++) box(0.03, 0.5, 0.03, chairM, -0.18 + k * 0.12, 0.72, 0.2, c);
    if (Math.abs(sx - 1.3) < 0.01) mk(new THREE.SphereGeometry(0.06, 8, 6), bowM, c, -side * 0.2, 0.95, 0.2).scale.set(1.6, 1, 0.6);
  }
  // hedges, trees, string lights, lanterns, cake table
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const h = mk(new THREE.BoxGeometry(1.6, 1.1, 0.8), mat(0x3f6e34, 0.9), root, s * 5.8, 0.55, -5 + k * 1.7); h.scale.y = 0.9 + R() * 0.2; }
  for (const [x, z, s] of [[-7, -8, 1.3], [6, -9, 1.5], [-9, 2, 1.1], [9, 1, 1.2], [0, -12, 1.6]]) { const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); root.add(t); mk(new THREE.CylinderGeometry(0.18, 0.28, 3, 8), mat(0x6b4a33, 0.9), t, 0, 1.5, 0); for (let k = 0; k < 5; k++) mk(new THREE.IcosahedronGeometry(1.3 - k * 0.12, 1), mat(0x5e9a46, 0.85), t, (R() - 0.5) * 1.2, 3.4 + k * 0.45, (R() - 0.5) * 1.0); }
  const bulbM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0c8).multiplyScalar(1.6), toneMapped: false });
  for (const s of [-1, 1]) for (let i = 0; i <= 20; i++) { const u = i / 20, z = -4.5 + u * 8, y = 3.0 - 0.5 * Math.sin(Math.PI * u); mk(new THREE.SphereGeometry(0.035, 8, 6), bulbM, root, s * 4.6, y, z).castShadow = false; }
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.03, 0.03, 3.1, 6), white, root, s * 4.6, 1.55, -4.5), mk(new THREE.CylinderGeometry(0.03, 0.03, 3.1, 6), white, root, s * 4.6, 1.55, 3.5);
  const cake = new THREE.Group(); cake.position.set(-4.2, 0, -2.0); root.add(cake);
  rbox(1.2, 0.05, 0.7, 0.02, white, 0, 0.75, 0, cake); for (const [a, b] of [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]]) box(0.04, 0.75, 0.04, white, a, 0.375, b, cake);
  [[0.22, 0.14], [0.16, 0.12], [0.1, 0.1]].forEach(([r, h], i) => mk(new THREE.CylinderGeometry(r, r, h, 20), mat(0xfbf6ee, 0.6), cake, 0, 0.82 + [0, 0.14, 0.26][i] + h / 2 - 0.02, 0));
  // lights
  const hemi = new THREE.HemisphereLight(0xdcecff, 0x7a8a5a, 1.25); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6); sun.position.set(8, 16, 12); sun.target.position.set(0, 0, -2); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 2, far: 50 }); sun.shadow.bias = -0.0004;
  root.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial) o.castShadow = false; });
  return { root, D: DIMS, fog, lights: { hemi, sun } };
}
