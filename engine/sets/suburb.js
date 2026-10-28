// SET: sunny suburb — a street of single-story bungalows (front doors, porches, lawns, driveways, garages), mailboxes, trees,
// a pocket park with a bench, and a driveway basketball hoop. Built for video 010 (giants vs. a normal-size world). Reusable.
//
// Coordinates (meters, y up). The street runs along x.
//   Road z∈[0,7] (center line 3.5). Near sidewalk z∈[-2,0] (top SW_H), far sidewalk z∈[7,9].
//   Near houses (facing +z): front wall at z = DIMS.houseZ (-9), lots 16 m wide centered at DIMS.lots[i] (x). Each lot:
//     front door (0.95 × 2.1 m) at x = lot − 2.2 on a porch (top y 0.3), driveway at x = lot + 4.5 to a garage door, mailbox at the curb.
//     Eaves at 2.75 m, ridge at ~4.6 m — a 3.3 m giant towers over them.
//   Far side (z > 9): houses facing −z (backdrop only).
//   Park: x∈[50, 70], z∈[-14, -2] (grass, trees, a path, DIMS.bench).  Hoop: on the garage of lot 1 (DIMS.hoop).
// Handles: aimSun(cx, cz, half), houses[i] = {door, doorPos, drive, garage}, bench (group), hoop (makeHoop handle).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';
const lerpN = (a, b, u) => a + (b - a) * u;
import { makeHoop } from '@engine/props.js';

export const SW_H = 0.12;
export const DIMS = {
  houseZ: -9, lots: [-32, -16, 0, 16, 32], porchY: 0.3,
  bench: [58, -6.2], hoop: { lot: 1 }, park: { x0: 50, x1: 70, z0: -14, z1: -2 },
};

const WALLS = ['#e8d6b9', '#b9cfd6', '#efe7d2', '#d6b9b0', '#c9d6b4', '#f2dcc0'];
const ROOFS = [0x7a4a3a, 0x4a5560, 0x6a5040, 0x3f5a4a, 0x8a5a44, 0x55504a];
const DOORS = [0x2f6a8a, 0xb5462e, 0x3f6a3a, 0xf2c14e, 0x6a3a5a, 0x2a3a4a];

function sidingTex(c) {
  return canvasTex(256, 256, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.07)'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 3); }, [4, 2]);
}
function grassTex() {
  return canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6f9a4a'; g.fillRect(0, 0, w, h); const R = rng(8); for (let i = 0; i < 3000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(40,80,20,.18)' : 'rgba(170,210,110,.16)'; g.fillRect(R() * w, R() * h, 2, 5); } }, [40, 6]);
}
function asphalt() {
  return canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5c5e63'; g.fillRect(0, 0, w, h); const R = rng(3); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},${0.04 + R() * 0.06})`; g.fillRect(R() * w, R() * h, 2, 2); } }, [20, 2]);
}
function skyTex() {
  return canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4f8fd4'); gr.addColorStop(0.44, '#a6cdee'); gr.addColorStop(0.5, '#e8eef0'); gr.addColorStop(1, '#e8eef0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}
function windowTex() {
  return canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#a9cbe6'); gr.addColorStop(1, '#4e6e8e'); g.fillStyle = gr; g.fillRect(10, 10, w - 20, h - 20); g.fillStyle = '#f4f1ea'; g.fillRect(w / 2 - 4, 10, 8, h - 20); g.fillRect(10, h / 2 - 4, w - 20, 8); });
}

export function buildSuburb(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 21);
  const fog = new THREE.Fog(0xdfe8ee, 40, 220);
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const X0 = -80, X1 = 110;

  // ---- sky + ground
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, fog: false, toneMapped: false }));
  root.add(sky);
  const grassM = new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 0.95 });
  for (const [z0, z1] of [[-60, -2], [9, 60]]) { const gr = mk(new THREE.PlaneGeometry(X1 - X0, z1 - z0), grassM, root, (X0 + X1) / 2, 0.005, (z0 + z1) / 2); gr.rotation.x = -Math.PI / 2; gr.castShadow = false; }
  const road = mk(new THREE.PlaneGeometry(X1 - X0, 7), new THREE.MeshStandardMaterial({ map: asphalt(), roughness: 0.92 }), root, (X0 + X1) / 2, 0, 3.5); road.rotation.x = -Math.PI / 2; road.castShadow = false;
  for (let x = X0; x < X1; x += 3) { const d = box(1.5, 0.004, 0.12, mat(0xf1c24a, 0.7), x, 0.002, 3.5); d.castShadow = false; }
  const conc = mat(0xcfc9be, 0.9);
  box(X1 - X0, SW_H, 2, conc, (X0 + X1) / 2, SW_H / 2, -1); box(X1 - X0, SW_H, 2, conc, (X0 + X1) / 2, SW_H / 2, 8);

  // ---- houses
  const winMat = new THREE.MeshStandardMaterial({ map: windowTex(), roughness: 0.3 });
  const houses = [];
  function house(cx, side, ci) {
    const g = new THREE.Group(); root.add(g);
    const zf = side < 0 ? DIMS.houseZ : 20, dir = side < 0 ? 1 : -1;   // front faces +z on the near side
    g.position.set(cx, 0, zf); g.rotation.y = side < 0 ? 0 : Math.PI;
    const wallM = new THREE.MeshStandardMaterial({ map: sidingTex(WALLS[ci % WALLS.length]), roughness: 0.9 });
    const W = 12.5, D = 9, Hh = 2.75;
    box(W, 0.4, D + 0.4, mat(0x8a8178, 0.9), 0, 0.2, -D / 2, g);                          // foundation
    box(W, Hh, D, wallM, 0, 0.4 + Hh / 2, -D / 2, g);
    // gable roof (two slanted slabs + gable triangles)
    const roofM = mat(ROOFS[ci % ROOFS.length], 0.8), pitch = 0.42, half = D / 2 + 0.6, rl = half / Math.cos(pitch);
    for (const s of [-1, 1]) { const r = box(W + 0.8, 0.18, rl, roofM, 0, 0.4 + Hh + Math.tan(pitch) * half / 2, -D / 2 + s * half / 2, g); r.rotation.x = s * pitch; }
    const tri = new THREE.Shape(); tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, Math.tan(pitch) * D / 2); tri.closePath();
    for (const s of [-1, 1]) { const m = mk(new THREE.ShapeGeometry(tri), wallM, g, s * W / 2, 0.4 + Hh, -D / 2); m.rotation.y = s * Math.PI / 2; }
    // porch + door + windows
    const doorX = -2.2;
    box(3.0, DIMS.porchY, 2.0, mat(0xb0a698, 0.9), doorX, DIMS.porchY / 2, 1.0, g);
    const porchRoof = new THREE.Group(); porchRoof.position.set(doorX - 1.6, 2.9, 1.05); g.add(porchRoof);   // hinge at its left end (it can collapse)
    box(3.2, 0.12, 2.3, mat(0xece6da, 0.6), 1.6, 0, 0, porchRoof);
    for (const px of [-1.4, 1.4]) mk(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 10), mat(0xf2efe8, 0.6), g, doorX + px, 1.6, 1.9);
    box(1.1, 2.3, 0.08, mat(0xf2efe8, 0.6), doorX, 0.4 + 1.15, 0.02, g);                          // door frame
    const door = new THREE.Group(); door.position.set(doorX - 0.475, 0.4, 0.06); g.add(door);   // hinge at the left edge
    box(0.95, 2.1, 0.05, mat(DOORS[ci % DOORS.length], 0.5), 0.475, 1.05, 0, door);
    mk(new THREE.SphereGeometry(0.035, 10, 8), mat(0xc9a25a, 0.3), door, 0.85, 1.0, 0.05);
    for (const wx of [1.2, 4.6]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), winMat); w.position.set(wx - 1.5, 1.9, 0.02); g.add(w); box(1.7, 0.1, 0.18, mat(0xf2efe8, 0.6), wx - 1.5, 1.25, 0.08, g); }
    // garage + driveway
    const gx = 4.5, dlen = side < 0 ? -2 - zf : zf - 9;        // lot depth from the front wall to the sidewalk
    box(3.2, 2.3, 0.08, mat(0xeeeae2, 0.6), gx, 0.4 + 1.15, 0.03, g);
    for (let k = 0; k < 4; k++) box(3.0, 0.03, 0.1, mat(0xd8d2c6, 0.6), gx, 0.7 + k * 0.5, 0.08, g);
    const drive = box(3.4, 0.05, dlen + 0.2, conc, gx, 0.03, dlen / 2 + 0.05, g); drive.castShadow = false;
    const walk = box(1.1, 0.04, dlen - 2, conc, doorX, 0.025, (dlen - 2) / 2 + 2.0, g); walk.castShadow = false;
    // mailbox at the curb
    const mbx = mk(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), mat(0x3d4a45, 0.5), g, doorX + 1.8, 0.55, dlen - 0.4);
    mk(new RoundedBoxGeometry(0.25, 0.25, 0.48, 2, 0.08), mat(0x2f4f73, 0.5), g, doorX + 1.8, 1.2, dlen - 0.4);
    // trees + shrubs
    const leaf = mat([0x5e9a46, 0x6fa84f, 0x4f8a3f][ci % 3], 0.85);
    for (const [tx, tz] of [[-5.5, 4.2], [7.6, 5.2]]) {
      const t = new THREE.Group(); t.position.set(tx, 0, tz + R() * 1.5); g.add(t);
      mk(new THREE.CylinderGeometry(0.15, 0.22, 2.6, 8), mat(0x6b4a33, 0.9), t, 0, 1.3, 0);
      for (let k = 0; k < 4; k++) mk(new THREE.IcosahedronGeometry(1.1 - k * 0.12, 1), leaf, t, (R() - 0.5) * 1.0, 3.0 + k * 0.45, (R() - 0.5) * 0.8);
    }
    for (let k = 0; k < 4; k++) mk(new THREE.IcosahedronGeometry(0.45, 1), mat(0x4f7a3a, 0.9), g, -5.8 + k * 0.8, 0.45, 0.6);
    houses.push({ g, door, porchRoof, doorPos: new THREE.Vector3(cx + doorX, 0.4, zf + 0.1), drive: new THREE.Vector3(cx + gx, 0, zf + 3.5), garage: new THREE.Vector3(cx + gx, 0, zf), side });
  }
  DIMS.lots.forEach((x, i) => house(x, -1, i));
  [-48, 80, -64].forEach((x, i) => house(x, -1, i + 2));   // (the lots at 48 + 64 are the pocket park)
  [-40, -24, -8, 8, 24, 40, 56, 72].forEach((x, i) => house(x, 1, i + 1));

  // ---- pocket park (replaces a lot): path, trees, bench, lamp
  const P = DIMS.park;
  const path = box(P.x1 - P.x0, 0.03, 1.6, mat(0xd8cdb8, 0.95), (P.x0 + P.x1) / 2, 0.02, -6.2 - 1.3); path.castShadow = false;
  for (const [tx, tz] of [[52, -11], [61, -12.5], [68, -9], [55, -3.2]]) {
    const t = new THREE.Group(); t.position.set(tx, 0, tz); root.add(t);
    mk(new THREE.CylinderGeometry(0.2, 0.3, 3.2, 8), mat(0x6b4a33, 0.9), t, 0, 1.6, 0);
    for (let k = 0; k < 5; k++) mk(new THREE.IcosahedronGeometry(1.5 - k * 0.15, 1), mat(0x5a8e42, 0.85), t, (R() - 0.5) * 1.4, 3.6 + k * 0.5, (R() - 0.5) * 1.2);
  }
  // bench built as two halves (left/right, pivot at each outer leg) so a video can SNAP it in the middle
  const bench = new THREE.Group(); bench.position.set(DIMS.bench[0], 0, DIMS.bench[1]); root.add(bench);
  const benchWood = mat(0xa8744a, 0.7), benchMetal = mat(0x3d4a45, 0.5), halves = [];
  for (const s of [-1, 1]) {
    const h = new THREE.Group(); h.position.set(s * 1.1, 0, 0); bench.add(h);                     // pivot at the outer leg
    for (let i = 0; i < 3; i++) mk(new RoundedBoxGeometry(1.1, 0.05, 0.14, 2, 0.015), benchWood, h, -s * 0.55, 0.45, -0.18 + i * 0.16);
    for (let i = 0; i < 2; i++) { const b = mk(new RoundedBoxGeometry(1.1, 0.12, 0.05, 2, 0.015), benchWood, h, -s * 0.55, 0.72 + i * 0.16, -0.3); b.rotation.x = -0.15; }
    mk(new THREE.BoxGeometry(0.06, 0.45, 0.45), benchMetal, h, -s * 0.05, 0.225, 0); mk(new THREE.BoxGeometry(0.06, 0.5, 0.06), benchMetal, h, -s * 0.05, 0.7, -0.3);
    halves.push(h);
  }
  bench.userData.halves = halves;
  mk(new THREE.CylinderGeometry(0.05, 0.06, 3.6, 8), mat(0x3d4a45, 0.5), root, 63, 1.8, -5.6);
  mk(new THREE.SphereGeometry(0.2, 12, 10), mat(0xfff3d6, 0.4), root, 63, 3.6, -5.6);

  // ---- hoop on lot 1's garage
  const H1 = houses[DIMS.hoop.lot];
  const hoop = makeHoop(); hoop.g.position.set(H1.garage.x, 0, H1.garage.z + 6.2); hoop.g.rotation.y = Math.PI; root.add(hoop.g);

  // ---- set dressing (scenes should never look bare): power poles + wires, picket fences, flower beds, a kid's bike, a gnome,
  //      a doghouse, curbside cars, clouds
  const poleM = mat(0x6b5440, 0.9), wireM = new THREE.LineBasicMaterial({ color: 0x2a2a2a });
  const poles = [];
  const keepClear = opts.poleClear ?? [-16, -11.5, -2.2, 4.5, 58];   // x spots where a pole would sit in a hero shot's sightline
  for (let x = X0 + 6; x < X1; x += 18) { if (keepClear.some((c) => Math.abs(c - x) < 4)) continue; mk(new THREE.CylinderGeometry(0.12, 0.15, 9, 8), poleM, root, x, 4.5, -2.3); const cross = mk(new THREE.BoxGeometry(2.2, 0.14, 0.14), poleM, root, x, 8.4, -2.3); poles.push(x); }
  for (let i = 0; i < poles.length - 1; i++) for (const dx of [-0.9, 0, 0.9]) {
    if (poles[i + 1] - poles[i] > 19) continue;
    const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push(new THREE.Vector3(lerpN(poles[i], poles[i + 1], u) + dx * 0, 8.45 - 0.9 * Math.sin(Math.PI * u) + (dx ? -0.05 : 0), -2.3 + dx * 0.45)); }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireM));
  }
  const fenceM = mat(0xf4f1ea, 0.7);
  DIMS.lots.forEach((lx) => { for (const fx of [lx - 8, lx + 8]) { for (let z = -8.6; z < -2.4; z += 0.32) mk(new THREE.BoxGeometry(0.07, 0.9, 0.07), fenceM, root, fx, 0.45, z); mk(new THREE.BoxGeometry(0.05, 0.07, 6.2), fenceM, root, fx, 0.7, -5.5); } });
  const flowerCols = [0xe2574c, 0xf2b632, 0xe58fa6, 0xffffff, 0xa77bd1];
  DIMS.lots.forEach((lx, li) => { for (let k = 0; k < 14; k++) mk(new THREE.SphereGeometry(0.07, 8, 6), mat(flowerCols[(k + li) % 5], 0.7), root, lx - 4.4 + k * 0.28, 0.22, -8.0 + (k % 2) * 0.18); mk(new THREE.BoxGeometry(4.2, 0.16, 0.6), mat(0x5a3e2a, 0.95), root, lx - 2.6, 0.08, -8.0); });
  // kid's bike on a lawn (lot 3), a gnome (lot 2), a doghouse (lot 4)
  const bike = new THREE.Group(); bike.position.set(DIMS.lots[3] - 4.5, 0.05, -4.2); bike.rotation.set(0, 0.6, Math.PI / 2 - 0.1); root.add(bike);
  for (const z of [-0.45, 0.45]) mk(new THREE.TorusGeometry(0.28, 0.035, 8, 20), mat(0x222222, 0.6), bike, 0, 0, z).rotation.y = Math.PI / 2;
  mk(new THREE.BoxGeometry(0.05, 0.05, 0.9), mat(0xd2483f, 0.4), bike, 0, 0.1, 0); mk(new THREE.BoxGeometry(0.05, 0.4, 0.05), mat(0xd2483f, 0.4), bike, 0, 0.3, 0.3);
  const gnome = new THREE.Group(); gnome.position.set(DIMS.lots[2] - 4.0, 0, -7.0); root.add(gnome);
  mk(new THREE.CylinderGeometry(0.1, 0.13, 0.25, 10), mat(0x3d7bd9, 0.6), gnome, 0, 0.12, 0); mk(new THREE.SphereGeometry(0.08, 10, 8), mat(0xf1c3a1, 0.6), gnome, 0, 0.3, 0);
  mk(new THREE.ConeGeometry(0.09, 0.22, 10), mat(0xd2483f, 0.6), gnome, 0, 0.45, 0); mk(new THREE.SphereGeometry(0.07, 8, 6), mat(0xf4f1ea, 0.8), gnome, 0, 0.24, 0.05);
  const dh = new THREE.Group(); dh.position.set(DIMS.lots[4] - 5.5, 0, -6.5); dh.rotation.y = 0.4; root.add(dh);
  mk(new THREE.BoxGeometry(1.0, 0.8, 1.2), mat(0xb5462e, 0.8), dh, 0, 0.4, 0); for (const sgn of [-1, 1]) { const r = mk(new THREE.BoxGeometry(1.2, 0.06, 0.75), mat(0x4a5560, 0.8), dh, 0, 0.95, sgn * 0.3); r.rotation.x = sgn * 0.55; }
  // a few cars parked along the far curb + clouds
  for (const [cx, col] of [[-26, 0x3d7bd9], [22, 0xf1c24a], [44, 0x6fa84f]]) {
    const c = new THREE.Group(); c.position.set(cx, 0, 6.0); root.add(c); const cm = mat(col, 0.35);
    mk(new RoundedBoxGeometry(3.9, 0.62, 1.8, 3, 0.2), cm, c, 0, 0.62, 0); mk(new RoundedBoxGeometry(2.05, 0.58, 1.56, 3, 0.22), cm, c, -0.25, 1.15, 0);
    for (const [wx, wz] of [[-1.3, 0.85], [1.3, 0.85], [-1.3, -0.85], [1.3, -0.85]]) mk(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 14), mat(0x1c1c1e, 0.8), c, wx, 0.33, wz).rotation.x = Math.PI / 2;
  }
  const cloudM = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 14; i++) { const cg = new THREE.Group(); const a = R() * Math.PI * 2; cg.position.set(Math.cos(a) * 200, 60 + R() * 50, Math.sin(a) * 200 - 40); root.add(cg); for (let k = 0; k < 5; k++) { const p = mk(new THREE.SphereGeometry(8 + R() * 7, 12, 8), cloudM, cg, (k - 2) * 9, R() * 4, R() * 6); p.scale.y = 0.55; p.castShadow = false; } }

  // ---- lights
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x7a8a5a, opts.ambient ?? 1.25); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dc, opts.sun ?? 2.7); root.add(sun, sun.target);
  const SUN_DIR = new THREE.Vector3(0.45, 0.8, 0.6).normalize();
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  function aimSun(cx = 0, cz = -4, half = 14) {
    sun.target.position.set(cx, 0, cz); sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 60);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 5, far: 140 }); sun.shadow.camera.updateProjectionMatrix();
  }
  aimSun();
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  return { root, D: DIMS, fog, houses, bench, hoop, aimSun, lights: { hemi, sun } };
}
