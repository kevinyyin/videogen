// SET: sunny public swimming pool — a tiled 25×12 m basin with see-through rippling water, lane ropes, a lifeguard tower, a diving
// board, ladders, lounge chairs + umbrellas + towels, a "NO RUNNING" sign, palm-ish trees, a snack hut, sky + clouds. Built for 012.
//
// Coordinates (meters, y up). Pool basin x∈[-12.5,12.5], z∈[-6,6]; deck top y=0; water surface y=DIMS.water (−0.15); floor −1.4.
// Lifeguard tower at DIMS.tower (seat y 2.0). Lane ropes along x at z = DIMS.lanes. Camera usually on the deck at +z looking −z.
// Swimmers: put a rig at y ≈ water − 1.45 (shoulders at the surface), or float on the back.  update(t) animates the water.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = { x0: -12.5, x1: 12.5, z0: -6, z1: 6, water: -0.15, floor: -1.4, lanes: [-3.6, -1.2, 1.2, 3.6], tower: [9.5, 7.4] };

export function buildPool(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 8), D = DIMS;
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const fog = new THREE.Fog(0xe6eef2, 50, 260);

  // sky + clouds
  const sky = new THREE.Mesh(new THREE.SphereGeometry(260, 32, 16), new THREE.MeshBasicMaterial({ fog: false, side: THREE.BackSide, toneMapped: false, map: canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3f86d6'); gr.addColorStop(0.45, '#a3cdf0'); gr.addColorStop(0.5, '#eef3f2'); gr.addColorStop(1, '#eef3f2'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) }));
  root.add(sky);
  const cloudM = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  for (let i = 0; i < 10; i++) { const cg = new THREE.Group(); const a = -Math.PI * 0.9 + R() * Math.PI * 0.8; cg.position.set(Math.cos(a) * 180, 50 + R() * 40, Math.sin(a) * 180); root.add(cg); for (let k = 0; k < 5; k++) { const p = mk(new THREE.SphereGeometry(7 + R() * 6, 12, 8), cloudM, cg, (k - 2) * 8, R() * 3, R() * 5); p.scale.y = 0.55; p.castShadow = false; } }

  // deck (tiles) with a hole for the basin: 4 slabs around it
  const deckTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#efe6d4'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(150,130,100,.35)'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, [1, 1]);
  const deckM = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.8 });
  const slab = (x0, x1, z0, z1) => { const t = deckTex.clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / 1.2, (z1 - z0) / 1.2); const m = mk(new THREE.BoxGeometry(x1 - x0, 0.3, z1 - z0), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }), root, (x0 + x1) / 2, -0.15, (z0 + z1) / 2); return m; };
  slab(-40, 40, -40, D.z0); slab(-40, 40, D.z1, 40); slab(-40, D.x0, D.z0, D.z1); slab(D.x1, 40, D.z0, D.z1);
  // coping (rounded edge) + basin walls/floor tiled blue with lane lines
  const copeM = mat(0xf7f3ea, 0.5);
  box(25.6, 0.12, 0.35, copeM, 0, 0.02, D.z0 - 0.1); box(25.6, 0.12, 0.35, copeM, 0, 0.02, D.z1 + 0.1); box(0.35, 0.12, 12.4, copeM, D.x0 - 0.1, 0.02, 0); box(0.35, 0.12, 12.4, copeM, D.x1 + 0.1, 0.02, 0);
  const tileTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7fc8e8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); } }, [10, 5]);
  const basinM = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.4 });
  const fl = mk(new THREE.PlaneGeometry(25, 12), basinM, root, 0, D.floor, 0); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
  for (const z of D.lanes.concat([0])) { const l = box(23, 0.01, 0.25, mat(0x1d4f7a, 0.6), 0, D.floor + 0.01, z + 1.2 * 0); l.castShadow = false; }
  for (const [w, x, z, ry] of [[25, 0, D.z0, 0], [25, 0, D.z1, Math.PI], [12, D.x0, 0, Math.PI / 2], [12, D.x1, 0, -Math.PI / 2]]) { const m = mk(new THREE.PlaneGeometry(w, 1.45), basinM, root, x, D.floor / 2 - 0.02, z); m.rotation.y = ry; m.castShadow = false; }
  // water: transparent, rippling (two scrolling normal-ish canvas textures)
  const rip = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3fa9e0'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; for (let y = 0; y < h; y += 16) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + 4 * Math.sin(x * 0.07 + y)); g.stroke(); } }, [6, 3]);
  const waterM = new THREE.MeshStandardMaterial({ map: rip, color: 0x8fd3f5, transparent: true, opacity: 0.8, roughness: 0.08, metalness: 0.1, depthWrite: false });
  const water = mk(new THREE.PlaneGeometry(25, 12, 50, 24), waterM, root, 0, D.water, 0); water.rotation.x = -Math.PI / 2; water.castShadow = false; water.receiveShadow = false; water.renderOrder = 2;
  // lane ropes (red/white floats)
  const floatM = [mat(0xd2483f, 0.5), mat(0xf4f1ea, 0.5)];
  const fGeo = new THREE.SphereGeometry(0.07, 10, 8);
  for (const z of D.lanes) for (const [k, mm] of floatM.entries()) {
    const inst = new THREE.InstancedMesh(fGeo, mm, 90); const m4 = new THREE.Matrix4(); let n = 0;
    for (let i = 0; i < 180; i++) if (Math.floor(i / 6) % 2 === k) { m4.makeTranslation(D.x0 + 0.3 + i * 0.137, D.water + 0.02, z); inst.setMatrixAt(n++, m4); }
    inst.count = n; root.add(inst);
  }
  // ladders, diving board, lifeguard tower
  const steel = mat(0xd8dce0, 0.2, { metalness: 0.8 });
  for (const x of [-9, 6]) for (const s of [-0.3, 0.3]) { const r = mk(new THREE.TorusGeometry(0.4, 0.03, 8, 16, Math.PI), steel, root, x + s, 0.2, D.z1 - 0.05); r.rotation.y = Math.PI / 2; }
  const dbx = -11.0; box(0.8, 0.5, 1.0, mat(0x2f6aa8, 0.5), dbx - 1, 0.25, D.z1 + 0.9); const board = box(0.6, 0.08, 3.2, mat(0xf4f1ea, 0.5), dbx - 1, 0.55, D.z1 - 0.4); board.rotation.x = 0.04;
  const [tx, tz] = D.tower, tower = new THREE.Group(); tower.position.set(tx, 0, tz); root.add(tower);
  for (const [a, b] of [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]]) box(0.08, 2.0, 0.08, mat(0xf4f1ea, 0.5), a, 1.0, b, tower);
  box(1.1, 0.08, 0.9, mat(0xf4f1ea, 0.5), 0, 2.0, 0, tower); box(1.1, 0.7, 0.08, mat(0xd2483f, 0.5), 0, 2.35, -0.42, tower);
  const umb = mk(new THREE.ConeGeometry(0.9, 0.4, 10, 1, true), mat(0xd2483f, 0.6, { side: THREE.DoubleSide }), tower, 0, 3.4, 0); mk(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6), mat(0xf4f1ea, 0.5), tower, 0, 2.7, 0);
  // lounge chairs + umbrellas + towels along the deck
  const cols = [0xf2b632, 0x4f9bd9, 0xe58fa6, 0x58b368, 0xf08a4b];
  for (let i = 0; i < 7; i++) {
    const x = -10 + i * 3.2, z = 8.6, c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = Math.PI; root.add(c);
    box(0.6, 0.05, 1.7, mat(0xf4f1ea, 0.5), 0, 0.35, 0, c); const bk = box(0.6, 0.05, 0.7, mat(0xf4f1ea, 0.5), 0, 0.55, -0.95, c); bk.rotation.x = 0.7;
    box(0.55, 0.02, 1.4, mat(cols[i % 5], 0.9), 0, 0.39, 0.1, c);
    if (i % 2 === 0) { mk(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6), mat(0xf4f1ea, 0.5), root, x + 1.0, 1.1, z); const u = mk(new THREE.ConeGeometry(1.2, 0.5, 12, 1, true), mat(cols[(i + 2) % 5], 0.7, { side: THREE.DoubleSide }), root, x + 1.0, 2.25, z); u.castShadow = true; }
  }
  // NO RUNNING sign, snack hut, trees
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshStandardMaterial({ map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#d23a3f'; g.fillRect(0, 0, w, 30); g.fillStyle = '#fff'; g.font = 'bold 22px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('POOL RULES', w / 2, 22); g.fillStyle = '#222'; g.font = 'bold 34px Helvetica, Arial, sans-serif'; g.fillText('NO RUNNING', w / 2, 80); g.font = '20px Helvetica, Arial, sans-serif'; g.fillText('no splashing · no diving', w / 2, 110); }), roughness: 0.6 }));
  sign.position.set(-6, 1.6, -9.0); root.add(sign); mk(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), mat(0x8a8f96, 0.4), root, -6, 0.7, -9.05);
  const hut = new THREE.Group(); hut.position.set(3, 0, -11); root.add(hut);
  box(5, 2.6, 2.4, mat(0x4fb3a8, 0.7), 0, 1.3, 0, hut); const aw = box(5.4, 0.1, 1.4, mat(0xf4f1ea, 0.6), 0, 2.4, 1.5, hut); aw.rotation.x = -0.3;
  const snack = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.6), new THREE.MeshStandardMaterial({ map: canvasTex(512, 100, (g, w, h) => { g.fillStyle = '#f2b632'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a2a1c'; g.font = 'bold 66px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SNACKS', w / 2, h / 2 + 4); }), roughness: 0.6 })); snack.position.set(0, 2.0, 1.22); hut.add(snack);
  for (const [x, z] of [[-14, -10], [14, -9], [16, 9], [-16, 10], [10, -12]]) { const t = new THREE.Group(); t.position.set(x, 0, z); root.add(t); mk(new THREE.CylinderGeometry(0.18, 0.28, 5, 8), mat(0x8a6a48, 0.9), t, 0, 2.5, 0); for (let k = 0; k < 6; k++) { const lf = mk(new THREE.BoxGeometry(2.6, 0.06, 0.5), mat(0x4f9a3f, 0.8), t, Math.cos(k) * 1.0, 5.0, Math.sin(k) * 1.0); lf.rotation.set(0.3, k * 1.05, -0.35); } }

  // lights: hot summer sun + sky fill
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0xb9a98a, 1.3); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3dc, 2.8); root.add(sun, sun.target);
  sun.position.set(14, 30, 18); sun.target.position.set(0, 0, 0); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 5, far: 80 }); sun.shadow.bias = -0.0004;
  function update(t) { rip.offset.set(t * 0.03, t * 0.015); const p = water.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.025 * Math.sin(p.getX(i) * 1.3 + t * 2.0) * Math.cos(p.getY(i) * 1.1 + t * 1.6)); p.needsUpdate = true; }
  root.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial) o.castShadow = false; });
  void deckM;
  return { root, D: DIMS, fog, update, water, lights: { hemi, sun } };
}
