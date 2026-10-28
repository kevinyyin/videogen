// SET: Paris on a sunny day — a toy-scale Eiffel Tower (72 m, procedural iron lattice: four curved legs with X-bracing, the
// base arches, three platforms, the antenna), the Champ de Mars lawn in front of it (gravel paths, rows of trees, benches,
// lamp posts, flower beds, a crêpe kiosk + a souvenir stand), a ring of cream Haussmann blocks with gray mansard roofs, a
// sky dome. Built for video 018 (everyone is magnetic: tourists stick to 7,300 tonnes of iron).
//
// Coordinates (meters, y up). Tower centered at the origin (legs at x,z = ±13.5 at the ground). The lawn runs toward +z
// (z 18…120). Cameras: on the lawn at z≈+25…+45 looking back at the tower (−z), low and tilted up.
// Handles: legPoint(leg, y, u) → {p, n} a point on the OUTER face of a leg (leg 0..3 = (+x,+z), (−x,+z), (−x,−z), (+x,−z)),
//   u ∈ [−1, 1] across the face, n = outward normal (for sticking people on it); shaftPoint(y, u, side) the same for the upper
//   shaft (y > 25); corner(y) = the silhouette half-width; fog; lights; H (tower height).
// Video must set camera.far ≈ 700.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = { H: 72, base: 13.5, p1: 12.4, p2: 25, p3: 60, lawnZ: 18 };
const LEGS = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
const corner = (y) => (y <= DIMS.p2 ? 4.3 + (DIMS.base - 4.3) * Math.pow(1 - y / DIMS.p2, 1.5) : 4.3 - 3.5 * Math.pow((y - DIMS.p2) / (DIMS.p3 - DIMS.p2), 0.8));
const legW = (y) => 5.4 - 2.6 * Math.min(1, y / DIMS.p2);

export function buildParis(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 1889);
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);

  // sky + haze
  const fog = new THREE.Fog(0xe6e2d8, 120, 520);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.MeshBasicMaterial({ fog: false, side: THREE.BackSide, toneMapped: false, map: canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4f8fd4'); gr.addColorStop(0.43, '#a9cff0'); gr.addColorStop(0.5, '#f1e6d6'); gr.addColorStop(1, '#f1e6d6'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) }));
  root.add(sky);
  // a few soft clouds (camera-facing sprites)
  const cloudTex = canvasTex(256, 128, (g, w, h) => { for (const [x, y, r] of [[70, 80, 40], [120, 64, 52], [175, 78, 40], [110, 90, 40]]) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
  for (let i = 0; i < 9; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false })); s.position.set(-260 + i * 65, 110 + R() * 70, -260 - R() * 120); s.scale.set(110, 55, 1); root.add(s); }

  // ground: gravel esplanade around the tower, lawns + paths toward +z, flower beds
  const gravel = new THREE.MeshStandardMaterial({ roughness: 1, map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9c9a8'; g.fillRect(0, 0, w, h); const r = rng(4); for (let i = 0; i < 2500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(120,100,70,.18)' : 'rgba(255,255,255,.2)'; g.fillRect(r() * w, r() * h, 2, 2); } }, [60, 60]) });
  const ground = mk(new THREE.PlaneGeometry(1200, 1200), gravel, root); ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
  const grassM = new THREE.MeshStandardMaterial({ roughness: 0.95, map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7aa64e'; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 2500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(40,80,20,.16)' : 'rgba(180,220,120,.14)'; g.fillRect(r() * w, r() * h, 2, 3); } g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 16); }, [6, 30]) });
  for (const s of [-1, 1]) { const lawn = mk(new THREE.PlaneGeometry(26, 110), grassM, root, s * 17, 0.01, 75); lawn.rotation.x = -Math.PI / 2; lawn.castShadow = false; }
  const flowerC = [0xd2483f, 0xf2b632, 0xe58fa6, 0xffffff, 0x8f6fb8];
  for (const s of [-1, 1]) for (let k = 0; k < 26; k++) mk(new THREE.SphereGeometry(0.22, 8, 6), mat(flowerC[(k + (s > 0 ? 2 : 0)) % 5], 0.7), root, s * (4.4 + (k % 2) * 0.35), 0.2, 20 + k * 0.7);
  for (const s of [-1, 1]) box(1.2, 0.3, 19, mat(0x5a3e2a, 0.95), s * 4.6, 0.12, 28.8).castShadow = false;
  // rows of trees along both sides of the lawns
  const leafM = mat(0x5f9a45, 0.85), leafM2 = mat(0x4f8a3d, 0.85), trunkM = mat(0x6b4a33, 0.9);
  for (const s of [-1, 1]) for (const x of [31, 36]) for (let z = 16; z < 130; z += 7) {
    const t = new THREE.Group(); t.position.set(s * x + (R() - 0.5), 0, z + (R() - 0.5) * 2); root.add(t);
    mk(new THREE.CylinderGeometry(0.22, 0.32, 4, 8), trunkM, t, 0, 2, 0);
    for (let k = 0; k < 3; k++) mk(new THREE.IcosahedronGeometry(2.0 - k * 0.3, 1), R() < 0.5 ? leafM : leafM2, t, (R() - 0.5) * 1.2, 4.8 + k * 0.9, (R() - 0.5) * 1.2);
  }
  // benches, lamp posts, kiosks
  const iron = mat(0x2f4a3a, 0.5), benchW = mat(0x3f6a4a, 0.6);
  for (const s of [-1, 1]) for (let z = 22; z < 70; z += 9) {
    const b = new THREE.Group(); b.position.set(s * 5.6, 0, z); b.rotation.y = -s * Math.PI / 2; root.add(b);
    for (let i = 0; i < 3; i++) rbox(1.8, 0.05, 0.13, 0.015, benchW, 0, 0.45, -0.16 + i * 0.15, b);
    rbox(1.8, 0.3, 0.05, 0.015, benchW, 0, 0.75, -0.28, b);
    for (const x of [-0.8, 0.8]) box(0.06, 0.45, 0.45, iron, x, 0.225, 0, b);
    const lp = new THREE.Group(); lp.position.set(s * 5.6, 0, z + 4.5); root.add(lp);
    mk(new THREE.CylinderGeometry(0.07, 0.11, 3.6, 10), iron, lp, 0, 1.8, 0);
    mk(new THREE.SphereGeometry(0.22, 12, 10), mat(0xfff3d6, 0.4), lp, 0, 3.75, 0);
  }
  const kiosk = (x, z, col, label) => {
    const k = new THREE.Group(); k.position.set(x, 0, z); root.add(k);
    rbox(2.2, 1.1, 1.4, 0.05, mat(col, 0.6), 0, 0.55, 0, k); rbox(2.2, 0.08, 1.4, 0.02, mat(0xf4efe2, 0.5), 0, 1.12, 0, k);
    const roof = mk(new THREE.ConeGeometry(1.7, 0.9, 4), mat(0x3a4a5a, 0.5), k, 0, 2.6, 0); roof.rotation.y = Math.PI / 4;
    for (const [a, b] of [[-1, -0.6], [1, -0.6], [-1, 0.6], [1, 0.6]]) mk(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), mat(0xf4efe2, 0.5), k, a, 1.7, b);
    const sign = mk(new THREE.PlaneGeometry(1.9, 0.4), new THREE.MeshStandardMaterial({ map: canvasTex(384, 80, (g, w, h) => { g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f3f6e'; g.font = 'bold 50px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, w / 2, h / 2 + 3); }), roughness: 0.6 }), k, 0, 2.05, 0.71);
    void sign; return k;
  };
  kiosk(-8.5, 30, 0xb5462e, 'CRÊPES'); kiosk(9.0, 36, 0x2f6a8a, 'SOUVENIRS');

  // Haussmann blocks: a ring of cream buildings with gray-blue mansard roofs, far enough to sit in the haze
  const facade = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#efe4cf'; g.fillRect(0, 0, w, h); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = '#5a6a7a'; g.fillRect(14 + x * 62, 20 + y * 60, 30, 40); g.fillStyle = 'rgba(40,40,40,.5)'; g.fillRect(10 + x * 62, 58 + y * 60, 38, 4); } }, [1, 1]);
  const roofM = mat(0x5f6f80, 0.6);
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2, r = 190 + R() * 60, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z > 20 && Math.abs(x) < 70) continue;       // keep the view down the lawn open
    const w = 22 + R() * 18, h = 16 + R() * 6, d = 18;
    const tex = facade.clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(Math.round(w / 6), Math.round(h / 6));
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = -a + Math.PI / 2; root.add(b);
    mk(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), b, 0, h / 2, 0);
    const roof = mk(new THREE.CylinderGeometry(0.62, 0.82, 1, 4, 1), roofM, b, 0, h + 2.5, 0); roof.scale.set(w * 0.86, 5, d * 0.86); roof.rotation.y = Math.PI / 4;
  }

  // ---------------------------------------------------------------- the tower: instanced iron beams
  const beams = [];
  const beam = (a, b, th) => beams.push([a.clone(), b.clone(), th]);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // one leg: a 4-edge truss following the silhouette, with X-bracing on every face
  function leg(sx, sz) {
    const N = 10, pts = [];
    for (let i = 0; i <= N; i++) {
      const y = (i / N) * DIMS.p2, c = corner(y), w = legW(y);
      const o = [c, c - w]; // outer / inner offsets along each axis
      pts.push([V(sx * o[0], y, sz * o[0]), V(sx * o[1], y, sz * o[0]), V(sx * o[1], y, sz * o[1]), V(sx * o[0], y, sz * o[1])]);
    }
    for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) {
      const a = pts[i][k], b = pts[i + 1][k], a2 = pts[i][(k + 1) % 4], b2 = pts[i + 1][(k + 1) % 4];
      beam(a, b, 0.42); beam(a, b2, 0.16); beam(a2, b, 0.16); beam(b, b2, 0.18);
    }
  }
  LEGS.forEach(([sx, sz]) => leg(sx, sz));
  // the upper shaft (one square truss from the second platform to the top platform)
  {
    const N = 12, pts = [];
    for (let i = 0; i <= N; i++) { const y = DIMS.p2 + (i / N) * (DIMS.p3 - DIMS.p2), c = corner(y); pts.push(LEGS.map(([sx, sz]) => V(sx * c, y, sz * c))); }
    for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) {
      const a = pts[i][k], b = pts[i + 1][k], a2 = pts[i][(k + 1) % 4], b2 = pts[i + 1][(k + 1) % 4];
      beam(a, b, 0.32); beam(a, b2, 0.12); beam(a2, b, 0.12); beam(b, b2, 0.14);
    }
  }
  // the base arches: one decorative arch per side between the legs (a polyline of beams + spokes up to the platform)
  for (let side = 0; side < 4; side++) {
    const [ax, az] = LEGS[side], [bx2, bz2] = LEGS[(side + 1) % 4];
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14, y = 4.2 + 7.2 * Math.sin(u * Math.PI);
      const c = corner(y) - legW(y) * 0.5, x = ax * c + (bx2 * c - ax * c) * u, z = az * c + (bz2 * c - az * c) * u;
      pts.push(V(x, y, z));
    }
    for (let i = 0; i < 14; i++) { beam(pts[i], pts[i + 1], 0.32); if (i % 2 === 0) { const p = pts[i]; beam(p, V(p.x, DIMS.p1, p.z), 0.1); } }
  }
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const ironM = new THREE.MeshStandardMaterial({ color: 0x7a6250, roughness: 0.62, metalness: 0.15 });
  const im = new THREE.InstancedMesh(unit, ironM, beams.length); im.castShadow = true; im.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), d = V(0, 0, 0), mid = V(0, 0, 0), sc = V(1, 1, 1);
  beams.forEach(([a, b, th], i) => { d.subVectors(b, a); const len = d.length(); q.setFromUnitVectors(up, d.normalize()); mid.addVectors(a, b).multiplyScalar(0.5); sc.set(th, len, th); m4.compose(mid, q, sc); im.setMatrixAt(i, m4); });
  root.add(im);
  // platforms: decks with a glazed gallery + railings
  const deckM = mat(0x6a5444, 0.7), galleryM = new THREE.MeshStandardMaterial({ roughness: 0.4, map: canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#7a6250'; g.fillRect(0, 0, w, h); for (let x = 4; x < w; x += 22) { g.fillStyle = '#c9dceb'; g.fillRect(x, 12, 16, 40); } }, [6, 1]) });
  const deck = (y, c, thick, gal) => {
    for (let k = 0; k < 4; k++) {
      const g = new THREE.Group(); g.rotation.y = (k * Math.PI) / 2; root.add(g);
      box(2 * c + 1.2, thick, 2.6, deckM, 0, y, c - 0.7, g);
      if (gal) box(2 * c, gal, 0.3, galleryM, 0, y + thick / 2 + gal / 2, c - 0.2, g);
      box(2 * c + 1.2, 0.08, 0.08, mat(0x5a4636, 0.6), 0, y + thick / 2 + (gal || 0) + 1.0, c + 0.55, g);
    }
  };
  deck(DIMS.p1, corner(DIMS.p1) + 0.4, 1.4, 2.4);
  deck(DIMS.p2, corner(DIMS.p2) + 0.4, 1.0, 2.0);
  rbox(3.2, 2.6, 3.2, 0.1, galleryM, 0, DIMS.p3 + 1.2, 0);
  mk(new THREE.CylinderGeometry(0.9, 1.4, 3.2, 8), deckM, root, 0, DIMS.p3 + 4.0, 0);
  mk(new THREE.CylinderGeometry(0.18, 0.35, DIMS.H - DIMS.p3 - 5, 8), mat(0xd8d4cc, 0.5), root, 0, (DIMS.H + DIMS.p3 + 5) / 2, 0);
  const flag = mk(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, map: canvasTex(96, 64, (g, w, h) => { ['#2f4f9f', '#f4f4f2', '#d23a3f'].forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / 3, 0, w / 3, h); }); }) }), root, 1.0, DIMS.H - 1.0, 0);
  void flag;

  // where people can stick: the outer face of a leg (and the shaft)
  function legPoint(li, y, u) {
    const [sx, sz] = LEGS[li], c = corner(y), w = legW(Math.min(y, DIMS.p2));
    const front = li < 2;                                // legs 0/1 face +z (toward the lawn camera)
    const n = front ? V(0, 0, sz) : V(0, 0, sz);
    const along = c - w / 2 + u * w / 2;                 // across the leg's +z (or −z) face
    const p = V(sx * along, y, sz * (c + 0.25));
    // tilt the normal outward a little with the leg's slope
    const dc = corner(Math.min(DIMS.p2, y + 0.5)) - c; n.y = -dc * 0.9; n.normalize();
    return { p, n };
  }
  function shaftPoint(y, u, side = 1) { const c = corner(y); return { p: V(u * c, y, side * (c + 0.2)), n: V(0, 0, side) }; }

  // lights: warm high sun from the lawn side (faces + the tower's front lit)
  const hemi = new THREE.HemisphereLight(0xcfe3f8, 0x9a8a6a, 1.25); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.7); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  const SUN = V(0.45, 0.8, 0.55).normalize();
  function aimSun(cx = 0, cz = 10, half = 40) { sun.target.position.set(cx, 0, cz); sun.position.copy(sun.target.position).addScaledVector(SUN, 160); Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 20, far: 360 }); sun.shadow.camera.updateProjectionMatrix(); }
  aimSun();
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  sky.receiveShadow = false;
  return { root, D: DIMS, fog, legPoint, shaftPoint, corner, aimSun, H: DIMS.H, lights: { hemi, sun } };
}
