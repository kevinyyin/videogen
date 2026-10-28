// SET: a sunny hillside cemetery for a funeral (built for video 019) — rolling green lawn, rows of headstones + a few crosses
// and an angel statue, big oaks, a white funeral canopy over the grave (green carpet + lowering frame), folding chairs,
// flower wreaths on easels, a long black hearse on the gravel lane, a small stone chapel, a wrought-iron fence, sky + fog.
// Coordinates: the grave at DIMS.grave (canopy around it), chairs DIMS.rows (z) × DIMS.seats (x) facing −z, the gravel lane
// along z = DIMS.laneZ. Camera usually at +z looking −z across the chairs. Handles: canopy (group), wreaths[] (groups),
// hearse (group, nose −x). Outdoor: own `fog`; camera.far ≥ 260.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = { grave: [0, -3.2], rows: [-0.6, 0.4], seats: [1.0, 1.6, 2.2], seat: 0.45, laneZ: 4.2 };

export function buildCemetery(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 33);
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);
  const fog = new THREE.Fog(0xe6eee6, 45, 220);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 16), new THREE.MeshBasicMaterial({ fog: false, side: THREE.BackSide, toneMapped: false, map: canvasTex(256, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5f9fdc'); gr.addColorStop(0.42, '#b8dbf3'); gr.addColorStop(0.5, '#eef3ec'); gr.addColorStop(1, '#eef3ec'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.8)'; const r = rng(2); for (let i = 0; i < 9; i++) { const cx = r() * w, cy = 60 + r() * 150; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(cx + k * 9 - 25, cy + Math.sin(k * 1.7) * 5, 10 + r() * 7, 0, 7); g.fill(); } }
  }) }));
  root.add(sky);
  const grassT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6f9d45'; g.fillRect(0, 0, w, h); const r = rng(9); for (let i = 0; i < 3500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(40,80,20,.18)' : 'rgba(190,225,120,.16)'; g.fillRect(r() * w, r() * h, 2, 5); } }, [60, 60]);
  const grassM = new THREE.MeshStandardMaterial({ roughness: 0.95, map: grassT });
  const grass = mk(new THREE.PlaneGeometry(240, 240), grassM, root); grass.rotation.x = -Math.PI / 2; grass.castShadow = false;
  // rolling hills behind (flattened spheres)
  for (const [x, z, sx, sy] of [[-30, -70, 60, 9], [35, -80, 70, 12], [0, -120, 120, 18], [-70, -40, 40, 7], [70, -30, 40, 6]]) { const h = mk(new THREE.SphereGeometry(1, 32, 16), grassM, root, x, 0, z); h.scale.set(sx, sy, sx * 0.5); h.castShadow = false; }
  // gravel lane
  const lane = box(60, 0.02, 2.4, mat(0xc9bfa8, 0.95), 0, 0.01, DIMS.laneZ); lane.castShadow = false;

  // headstones (instanced rounded slabs) in loose rows, a few crosses + an angel on a plinth
  const stoneM = new THREE.MeshStandardMaterial({ color: 0xb9b8b2, roughness: 0.8 });
  const spots = [];
  for (let row = 0; row < 9; row++) for (let i = 0; i < 16; i++) {
    const x = -15 + i * 2.0 + (R() - 0.5) * 0.4 + (row % 2) * 0.9, z = -7 - row * 2.6 + (R() - 0.5) * 0.4;
    if (Math.abs(x) < 3.5 && z > -9) continue;   // keep the grave area clear
    spots.push({ x, z, h: 0.55 + R() * 0.45, w: 0.45 + R() * 0.25, ry: (R() - 0.5) * 0.12, tint: 0.85 + R() * 0.25 });
  }
  for (let i = 0; i < 14; i++) { const s = R() < 0.5 ? -1 : 1; spots.push({ x: s * (5 + R() * 9), z: -1 - R() * 5, h: 0.55 + R() * 0.4, w: 0.45 + R() * 0.2, ry: (R() - 0.5) * 0.2, tint: 0.85 + R() * 0.25 }); }
  const stones = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 3, 0.18), stoneM, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
  spots.forEach((p, i) => { m4.compose(v.set(p.x, p.h / 2, p.z), q.setFromEuler(e.set(0, p.ry, 0)), s3.set(p.w, p.h, 0.14)); stones.setMatrixAt(i, m4); stones.setColorAt(i, new THREE.Color(0xb9b8b2).multiplyScalar(p.tint)); });
  stones.castShadow = true; stones.receiveShadow = true; root.add(stones);
  spots.forEach((p, i) => { if (i % 5 === 0) for (let k = 0; k < 3; k++) mk(new THREE.SphereGeometry(0.05, 6, 5), mat([0xd2483f, 0xf2b632, 0xffffff][k], 0.7), root, p.x + (k - 1) * 0.08, 0.05, p.z + 0.18).castShadow = false; });
  for (const [x, z] of [[-6.5, -9.5], [7.5, -12], [-11, -16]]) { const c = new THREE.Group(); c.position.set(x, 0, z); root.add(c); box(0.14, 1.4, 0.14, stoneM, 0, 0.7, 0, c); box(0.7, 0.14, 0.14, stoneM, 0, 1.05, 0, c); box(0.5, 0.2, 0.4, stoneM, 0, 0.1, 0, c); }
  const angel = new THREE.Group(); angel.position.set(5.2, 0, -8.5); root.add(angel);
  box(0.8, 1.0, 0.8, stoneM, 0, 0.5, 0, angel); mk(new THREE.CylinderGeometry(0.18, 0.32, 1.0, 12), stoneM, angel, 0, 1.5, 0); mk(new THREE.SphereGeometry(0.15, 12, 10), stoneM, angel, 0, 2.15, 0);
  for (const s of [-1, 1]) { const w = mk(new THREE.SphereGeometry(0.4, 12, 8), stoneM, angel, s * 0.25, 1.75, -0.12); w.scale.set(0.35, 1.0, 0.15); w.rotation.z = -s * 0.4; }

  // trees (big oaks) + a far chapel + a wrought-iron fence
  const leafM = [mat(0x4f8a3a, 0.85), mat(0x5e9a46, 0.85), mat(0x3f7a34, 0.85)];
  for (const [x, z, sc] of [[-8.5, -5, 1.5], [9.5, -7, 1.7], [-14, -14, 1.9], [13, -18, 2.0], [-4, -22, 1.6], [18, -4, 1.4], [-19, -6, 1.6]]) {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(sc); root.add(t);
    mk(new THREE.CylinderGeometry(0.2, 0.32, 3.2, 8), mat(0x6b4a33, 0.9), t, 0, 1.6, 0);
    for (let k = 0; k < 6; k++) mk(new THREE.IcosahedronGeometry(1.35 - k * 0.1, 1), leafM[k % 3], t, (R() - 0.5) * 1.8, 3.5 + (k % 3) * 0.6, (R() - 0.5) * 1.5);
  }
  const ch = new THREE.Group(); ch.position.set(-9, 0, -28); ch.rotation.y = 0.3; root.add(ch);
  const chStone = mat(0xd8d0c0, 0.9), roofM = mat(0x5a4a44, 0.8);
  box(5, 4, 8, chStone, 0, 2, 0, ch); const rf = mk(new THREE.CylinderGeometry(0.01, 3.4, 2.4, 4, 1), roofM, ch, 0, 5.2, 0); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 2.3);
  box(1.6, 7.5, 1.6, chStone, 0, 3.75, 4.5, ch); const sp = mk(new THREE.ConeGeometry(1.2, 3, 4), roofM, ch, 0, 9, 4.5); sp.rotation.y = Math.PI / 4;
  mk(new THREE.PlaneGeometry(1.0, 1.8), mat(0x5a3a26, 0.7), ch, 0, 0.9, 5.31); mk(new THREE.CircleGeometry(0.4, 20), mat(0x7fa6c8, 0.2), ch, 0, 5.5, 5.31);
  const ironM = mat(0x24262a, 0.5, { metalness: 0.5 });
  for (let x = -30; x <= 30; x += 0.35) box(0.03, 1.2, 0.03, ironM, x, 0.6, -36); box(60, 0.05, 0.05, ironM, 0, 1.1, -36); box(60, 0.05, 0.05, ironM, 0, 0.2, -36);

  // funeral canopy (white tent on 4 poles) over the grave + green carpet + the lowering frame (brass rails)
  const [gx, gz] = DIMS.grave, white = mat(0xf7f6f2, 0.6);
  const canopy = new THREE.Group(); canopy.position.set(gx, 0, gz + 0.9); root.add(canopy);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.06, 2.6, 0.06, mat(0xb8bcc2, 0.4, { metalness: 0.5 }), sx * 2.6, 1.3, sz * 2.2, canopy);
  const roof = mk(new THREE.ConeGeometry(3.8, 0.9, 4, 1, true), mat(0xf7f6f2, 0.7, { side: THREE.DoubleSide }), canopy, 0, 3.0, 0); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.85);
  for (const sx of [-1, 1]) { const val = box(5.3, 0.3, 0.02, white, 0, 2.48, sx * 2.21, canopy); val.castShadow = false; }
  for (const sx of [-1, 1]) { const val = box(0.02, 0.3, 4.4, white, sx * 2.61, 2.48, 0, canopy); val.castShadow = false; }
  const carpet = box(4.6, 0.02, 3.6, mat(0x4f8a3a, 0.95), gx, 0.012, gz + 0.5); carpet.castShadow = false;
  const brass = mat(0xc9a25a, 0.3, { metalness: 0.7 });
  for (const s of [-1, 1]) box(2.4, 0.06, 0.06, brass, gx, 0.35, gz + s * 0.55); for (const s of [-1, 1]) box(0.06, 0.06, 1.16, brass, gx + s * 1.2, 0.35, gz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.05, 0.35, 0.05, brass, gx + sx * 1.2, 0.175, gz + sz * 0.55);
  // folding chairs (two short rows) + wreaths on easels + a framed photo stand
  const chairM = mat(0xf2f0ea, 0.5);
  for (const z of DIMS.rows) for (const sx of DIMS.seats) for (const side of [-1, 1]) {
    const c = new THREE.Group(); c.position.set(side * sx, 0, z); root.add(c);
    rbox(0.44, 0.04, 0.42, 0.01, chairM, 0, DIMS.seat, 0, c); for (const [a, b] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) box(0.03, DIMS.seat, 0.03, chairM, a, DIMS.seat / 2, b, c);
    rbox(0.42, 0.3, 0.03, 0.01, chairM, 0, 0.78, 0.2, c);
  }
  const wreaths = [];
  const flowerC = [0xffffff, 0xf4c6d6, 0xf2b632, 0xd2483f, 0xe8dcf0];
  for (const [x, z, ry] of [[-2.1, -4.3, 0.25], [2.1, -4.3, -0.25], [-3.0, -3.0, 0.6], [3.0, -3.0, -0.6]]) {
    const w = new THREE.Group(); w.position.set(x, 0, z); w.rotation.y = ry; root.add(w);
    for (const s of [-1, 1]) { const l = box(0.03, 1.4, 0.03, mat(0x5a3a26, 0.7), s * 0.25, 0.7, 0, w); l.rotation.z = s * 0.12; }
    box(0.03, 1.3, 0.03, mat(0x5a3a26, 0.7), 0, 0.65, -0.3, w).rotation.x = 0.25;
    const ring = new THREE.Group(); ring.position.set(0, 1.35, 0.03); w.add(ring);
    mk(new THREE.TorusGeometry(0.38, 0.09, 8, 24), mat(0x3f6e34, 0.9), ring);
    for (let k = 0; k < 22; k++) { const a = (k / 22) * Math.PI * 2; mk(new THREE.SphereGeometry(0.06 + (k % 3) * 0.01, 8, 6), mat(flowerC[k % 5], 0.7), ring, Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0.07); }
    wreaths.push(w);
  }
  // hearse: a long black car with a chrome stripe, parked on the lane (nose −x)
  const hearse = new THREE.Group(); hearse.position.set(5.5, 0, DIMS.laneZ); root.add(hearse);
  const blk = mat(0x15161a, 0.25, { metalness: 0.5 }), chrome = mat(0xd8dce0, 0.2, { metalness: 0.9 });
  rbox(5.2, 0.7, 1.8, 0.15, blk, 0, 0.6, 0, hearse); rbox(3.4, 0.75, 1.7, 0.18, blk, 0.55, 1.25, 0, hearse);
  box(3.0, 0.55, 1.72, mat(0x2a3540, 0.1, { metalness: 0.3 }), 0.4, 1.3, 0, hearse);
  box(5.25, 0.05, 1.82, chrome, 0, 0.62, 0, hearse);
  for (const sx of [-1.7, 1.7]) for (const sz of [-0.88, 0.88]) { const wh = mk(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 16), mat(0x1a1a1a, 0.7), hearse, sx, 0.34, sz); wh.rotation.x = Math.PI / 2; }
  for (const sz of [-0.6, 0.6]) { const s = mk(new THREE.TorusGeometry(0.25, 0.04, 6, 12, Math.PI), chrome, hearse, 1.2, 1.35, sz * 1.45); s.rotation.y = Math.PI / 2; }

  // light
  const hemi = new THREE.HemisphereLight(0xdcecff, 0x6a7a4a, 1.25); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.7); sun.position.set(9, 15, 10); sun.target.position.set(0, 0, -2); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 2, far: 60 }); sun.shadow.bias = -0.0004;
  root.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial) o.castShadow = false; });
  return { root, D: DIMS, fog, canopy, wreaths, hearse, lights: { hemi, sun } };
}
