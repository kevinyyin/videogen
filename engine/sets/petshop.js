// SETS: a bright pet shop and a vet clinic waiting room (built for video 016, talking pets; reusable).
//
// buildPetShop — room x∈[-4,4], z∈[-3,3], ceiling 3.0. Back wall (z=-3): a lit wall of fish tanks under a "PAWS & CLAWS" sign.
//   A display table at DIMS.shop.table (top DIMS.shop.tableTop, 2.0 × 0.7, sawdust bed) in front of it — the video puts hamster
//   wheels on it. Left wall: shelves of pet-food bags. Right: hanging bird cages, a checkout counter, a cat tree, toy bins.
//   update(t) swims the tank fish.
// buildVet — room x∈[-3.5,3.5], z∈[-2.6,2.6], ceiling 2.7, mint walls. Five waiting chairs along the back wall at
//   DIMS.vet.chairs (x) / DIMS.vet.chairZ, seat DIMS.vet.seat, facing +z. EXAM 1 door in the back wall at DIMS.vet.exam
//   (`examDoor` hinge group: rotation.y = −1.4 opens it toward the room), EXIT door at DIMS.vet.exit (right of the chairs).
//   Posters ("IS YOUR PET CHUBBY?", "PLEASE KEEP PETS ON A LEASH"), clinic sign, clock, scale, treat jar, plants, water bowl.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = {
  shop: { room: { x0: -4, x1: 4, z0: -3, z1: 3, h: 3.0 }, table: [0, -1.2], tableTop: 0.8, tableSize: [2.0, 0.7] },
  vet: { room: { x0: -3.5, x1: 3.5, z0: -2.6, z1: 2.6, h: 2.7 }, chairs: [-1.6, -0.8, 0, 0.8, 1.6], chairZ: -2.05, seat: 0.45, exam: [-2.6, -2.6], exit: [2.65, -2.6] },
};

const signTex = (text, bg, fg, w = 1024, h = 192, font = 'bold 110px Helvetica, Arial, sans-serif') => canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 6); });

export function buildPetShop(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 31), Dm = DIMS.shop.room;
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);
  const plane = (w, h, tex, x, y, z, ry = 0, basic = false) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })); m.position.set(x, y, z); m.rotation.y = ry; root.add(m); return m; };

  // shell
  const floorTex = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#f1ece2' : '#e2dccf'; g.fillRect(x * 64, y * 64, 64, 64); } }, [8, 6]);
  const floor = mk(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35 }), root); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallM = mat(0xfff1d6, 0.9), accentM = mat(0x58b3a8, 0.8);
  box(8, Dm.h, 0.12, wallM, 0, Dm.h / 2, Dm.z0 - 0.06); box(0.12, Dm.h, 6, wallM, Dm.x0 - 0.06, Dm.h / 2, 0); box(0.12, Dm.h, 6, wallM, Dm.x1 + 0.06, Dm.h / 2, 0);
  box(8, 0.5, 0.02, accentM, 0, 0.25, Dm.z0 + 0.01); box(0.02, 0.5, 6, accentM, Dm.x0 + 0.01, 0.25, 0); box(0.02, 0.5, 6, accentM, Dm.x1 - 0.01, 0.25, 0);
  box(8.2, 0.1, 6.2, mat(0xfbf8f2, 0.95), 0, Dm.h + 0.05, 0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const p = mk(new THREE.PlaneGeometry(1.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xfffaf0 }), root, -2.4 + i * 2.4, Dm.h - 0.01, -1.5 + j * 2.6); p.rotation.x = Math.PI / 2; p.castShadow = false; }
  // big sign over the tanks
  plane(4.2, 0.62, signTex('PAWS & CLAWS', '#e8553f', '#fff6e0'), 0, 2.62, Dm.z0 + 0.02);
  for (let k = 0; k < 2; k++) { const paw = plane(0.4, 0.4, canvasTex(128, 128, (g) => { g.fillStyle = '#e8553f'; g.beginPath(); g.ellipse(64, 80, 30, 26, 0, 0, 7); g.fill(); for (const [x, y] of [[30, 40], [52, 26], [76, 26], [98, 40]]) { g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); } }), k ? 2.55 : -2.55, 2.62, Dm.z0 + 0.02); paw.material.transparent = true; }

  // wall of fish tanks (3 × 2), lit blue, with little fish that swim
  const tankFish = [];
  const tankM = new THREE.MeshBasicMaterial({ color: 0x7fcfee, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const tx = -2.25 + i * 1.5, ty = 0.75 + j * 0.85, tz = Dm.z0 + 0.32;
    box(1.38, 0.08, 0.5, mat(0x2a2d31, 0.4), tx, ty - 0.38, tz); box(1.38, 0.05, 0.5, mat(0x2a2d31, 0.4), tx, ty + 0.36, tz);
    const water = mk(new THREE.BoxGeometry(1.32, 0.68, 0.44), tankM, root, tx, ty, tz); water.castShadow = false;
    for (let k = 0; k < 6; k++) mk(new THREE.CapsuleGeometry(0.012, 0.1 + R() * 0.12, 4, 6), mat(0x3f9a4a, 0.7), root, tx - 0.55 + R() * 1.1, ty - 0.25, tz + 0.05).rotation.z = (R() - 0.5) * 0.4;
    for (let k = 0; k < 5; k++) { const f = mk(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: [0xf28a2a, 0xf2c14e, 0xe8553f, 0x4f9bd9, 0xffffff][(k + i + j) % 5] }), root, tx, ty, tz + 0.23); f.scale.set(1.6, 1, 0.5); f.castShadow = false; tankFish.push({ f, tx, ty, ph: R() * 6, sp: 0.4 + R() * 0.6, y: (R() - 0.5) * 0.4 }); }
  }
  const tankLight = new THREE.PointLight(0x8fd8ff, 1.6, 4.5, 1.6); tankLight.position.set(0, 1.2, Dm.z0 + 1.1); root.add(tankLight);

  // display table (sawdust bed) for the hamsters
  const [tbx, tbz] = DIMS.shop.table, [tw, td] = DIMS.shop.tableSize, top = DIMS.shop.tableTop;
  rbox(tw, top, td, 0.03, mat(0x58b3a8, 0.6), tbx, top / 2, tbz);
  const dust = mk(new THREE.BoxGeometry(tw - 0.08, 0.02, td - 0.08), new THREE.MeshStandardMaterial({ map: canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#e8d29a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = R() < 0.5 ? '#d6b878' : '#f4e2b0'; g.fillRect(R() * w, R() * h, 3, 2); } }), roughness: 1 }), root, tbx, top + 0.01, tbz); dust.castShadow = false;
  for (const s of [-1, 1]) box(0.03, 0.12, td, mat(0xdff2ff, 0.1, { transparent: true, opacity: 0.35 }), tbx + s * (tw / 2 - 0.015), top + 0.06, tbz);
  plane(0.62, 0.15, signTex('HAMSTERS', '#f2c14e', '#7a3a1a', 512, 120, 'bold 84px Helvetica, Arial, sans-serif'), tbx, top - 0.18, tbz + td / 2 + 0.005);
  // a little hut + food bowl on the table edge
  mk(new THREE.SphereGeometry(0.09, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xe2574c, 0.7), root, tbx - 0.85, top + 0.02, tbz - 0.2);
  mk(new THREE.CylinderGeometry(0.05, 0.04, 0.03, 12), mat(0x3d7bd9, 0.5), root, tbx + 0.85, top + 0.035, tbz - 0.2);

  // left wall: shelves of pet-food bags
  const BAGC = [0xe8553f, 0x3d7bd9, 0xf2c14e, 0x6fa84f, 0x8f6fb8, 0xf08a4b];
  const bagTex = BAGC.map((c, i) => canvasTex(96, 128, (g, w, h) => { g.fillStyle = '#' + c.toString(16).padStart(6, '0'); g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(8, 40, w - 16, 44); g.fillStyle = '#333'; g.font = 'bold 22px Helvetica'; g.textAlign = 'center'; g.fillText(['KIBBLE', 'MEOW', 'SEEDS', 'CHEW', 'TREATS', 'BITES'][i], w / 2, 70); }));
  for (let s = 0; s < 4; s++) {
    box(0.45, 0.03, 4.4, mat(0xd9d4c8, 0.5), Dm.x0 + 0.25, 0.3 + s * 0.6, -0.3);
    for (let k = 0; k < 13; k++) { if (R() < 0.08) continue; const bh = 0.36 + R() * 0.12, b = mk(new THREE.BoxGeometry(0.16, bh, 0.28), [mat(BAGC[(k + s) % 6], 0.6), mat(BAGC[(k + s) % 6], 0.6), mat(BAGC[(k + s) % 6], 0.6), mat(BAGC[(k + s) % 6], 0.6), new THREE.MeshStandardMaterial({ map: bagTex[(k + s) % 6], roughness: 0.6 }), mat(BAGC[(k + s) % 6], 0.6)], root, Dm.x0 + 0.3, 0.32 + s * 0.6 + bh / 2, -2.3 + k * 0.32); b.rotation.y = Math.PI / 2; }
  }
  box(0.04, 2.4, 0.04, mat(0xb8bcc2, 0.4), Dm.x0 + 0.48, 1.2, 1.9); box(0.04, 2.4, 0.04, mat(0xb8bcc2, 0.4), Dm.x0 + 0.48, 1.2, -2.5);
  // right side: checkout counter + register, cat tree, toy bins, two hanging bird cages with budgies
  rbox(0.7, 1.0, 1.6, 0.03, mat(0xe8553f, 0.6), Dm.x1 - 0.6, 0.5, 1.2); rbox(0.8, 0.05, 1.7, 0.02, mat(0xf6efe0, 0.5), Dm.x1 - 0.6, 1.02, 1.2);
  rbox(0.32, 0.22, 0.3, 0.03, mat(0x2a2d31, 0.4), Dm.x1 - 0.6, 1.16, 1.5);
  const tree = new THREE.Group(); tree.position.set(Dm.x1 - 0.7, 0, -1.6); root.add(tree);
  mk(new THREE.CylinderGeometry(0.08, 0.08, 1.7, 10), mat(0xd9c49a, 0.95), tree, 0, 0.85, 0); for (const [y, s] of [[0.5, 0.35], [1.1, 0.3], [1.7, 0.36]]) mk(new THREE.CylinderGeometry(s, s, 0.06, 18), mat(0xb88aa8, 0.95), tree, 0, y, 0);
  mk(new THREE.BoxGeometry(0.7, 0.06, 0.7), mat(0xb88aa8, 0.95), tree, 0, 0.03, 0);
  for (let b = 0; b < 2; b++) {
    const bx = 1.1 + b * 1.1, bz = -0.6 + b * 0.8, cg = new THREE.Group(); cg.position.set(bx, 2.1, bz); root.add(cg);
    mk(new THREE.CylinderGeometry(0.004, 0.004, 0.75, 4), mat(0x888888, 0.5), cg, 0, 0.62, 0);
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, bar = mk(new THREE.CylinderGeometry(0.004, 0.004, 0.42, 4), mat(0xd9c49a, 0.4, { metalness: 0.4 }), cg, Math.cos(a) * 0.17, 0.0, Math.sin(a) * 0.17); bar.castShadow = false; }
    mk(new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd9c49a, 0.4, { metalness: 0.4, transparent: true, opacity: 0.6 }), cg, 0, 0.2, 0).castShadow = false;
    mk(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 16), mat(0xd9c49a, 0.4, { metalness: 0.4 }), cg, 0, -0.21, 0);
    for (let k = 0; k < 2; k++) { const bird = new THREE.Group(); bird.position.set(-0.06 + k * 0.12, -0.05, 0); cg.add(bird); mk(new THREE.SphereGeometry(0.035, 10, 8), mat([0x6fd04f, 0x4fb3e8][(k + b) % 2], 0.7), bird, 0, 0, 0).scale.set(1, 1.2, 1); mk(new THREE.SphereGeometry(0.028, 10, 8), mat(0xf2e66a, 0.7), bird, 0, 0.05, 0.005); mk(new THREE.ConeGeometry(0.008, 0.02, 6), mat(0xe8a040, 0.5), bird, 0, 0.045, 0.03).rotation.x = Math.PI / 2; }
  }
  for (let k = 0; k < 3; k++) { const bin = mk(new THREE.CylinderGeometry(0.28, 0.24, 0.45, 18, 1, true), mat([0x3d7bd9, 0xf2c14e, 0x6fa84f][k], 0.6, { side: THREE.DoubleSide }), root, 1.0 + k * 0.62, 0.225, 1.9); void bin; for (let j = 0; j < 5; j++) mk(new THREE.SphereGeometry(0.06, 10, 8), mat([0xe8553f, 0xf2efe8, 0x8f6fb8, 0xf08a4b][j % 4], 0.5), root, 1.0 + k * 0.62 + Math.cos(j * 1.3) * 0.12, 0.46 + (j % 2) * 0.05, 1.9 + Math.sin(j * 1.3) * 0.12); }
  for (const [px, pz] of [[-3.5, 2.4], [3.4, -2.5]]) { const pg = new THREE.Group(); pg.position.set(px, 0, pz); root.add(pg); mk(new THREE.CylinderGeometry(0.22, 0.17, 0.4, 14), mat(0xd9d4c8, 0.6), pg, 0, 0.2, 0); for (let k = 0; k < 9; k++) { const lf = mk(new THREE.SphereGeometry(0.22, 10, 8), mat(0x4f8a3f, 0.8), pg, Math.sin(k * 2.4) * 0.17, 0.62 + (k % 3) * 0.18, Math.cos(k * 2.4) * 0.17); lf.scale.set(0.45, 1.6, 0.3); } }

  // lights: bright retail
  const hemi = new THREE.HemisphereLight(0xfffaf0, 0x9a8a78, 1.35); root.add(hemi);
  const key = new THREE.DirectionalLight(0xfff4e6, 1.6); key.position.set(1.5, 5, 4); key.target.position.set(0, 0.8, -1.2); root.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 14 }); key.shadow.bias = -0.0005;
  const fillL = new THREE.PointLight(0xfff0e0, 1.6, 8, 1.4); fillL.position.set(0, 2.3, 1.5); root.add(fillL);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });
  const update = (t) => tankFish.forEach((q) => { const u = Math.sin(t * q.sp + q.ph); q.f.position.x = q.tx + 0.52 * u; q.f.position.y = q.ty + q.y + 0.03 * Math.sin(t * 2 + q.ph); q.f.scale.x = 1.6 * (Math.cos(t * q.sp + q.ph) >= 0 ? 1 : -1); });
  return { root, D: DIMS.shop, update, lights: { hemi, key, tankLight, fillL } };
}

export function buildVet(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 41), Dm = DIMS.vet.room, V = DIMS.vet;
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);
  const plane = (w, h, tex, x, y, z, ry = 0, p = root) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })); m.position.set(x, y, z); m.rotation.y = ry; p.add(m); return m; };

  const floorTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#eef2ee'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(80,120,110,.12)'; for (let i = 0; i < 160; i++) g.fillRect(R() * w, R() * h, 4, 4); g.strokeStyle = 'rgba(80,120,110,.18)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, [7, 5]);
  const floor = mk(new THREE.PlaneGeometry(7, 5.2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4 }), root); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallM = mat(0xcfe9de, 0.9), stripeM = mat(0x58b3a8, 0.7), white = mat(0xfbfbf8, 0.6);
  // back wall with the two door openings (exam at x≈-2.6, exit at x≈2.65; 0.95 wide, 2.1 high)
  const DW = 0.95, DH = 2.1, ex = V.exam[0], xx = V.exit[0];
  box(ex - DW / 2 - Dm.x0, Dm.h, 0.12, wallM, (Dm.x0 + ex - DW / 2) / 2, Dm.h / 2, Dm.z0 - 0.06);
  box((xx - DW / 2) - (ex + DW / 2), Dm.h, 0.12, wallM, ((ex + DW / 2) + (xx - DW / 2)) / 2, Dm.h / 2, Dm.z0 - 0.06);
  box(Dm.x1 - (xx + DW / 2), Dm.h, 0.12, wallM, (xx + DW / 2 + Dm.x1) / 2, Dm.h / 2, Dm.z0 - 0.06);
  for (const x of [ex, xx]) box(DW, Dm.h - DH, 0.12, wallM, x, (Dm.h + DH) / 2, Dm.z0 - 0.06);
  box(0.12, Dm.h, 5.2, wallM, Dm.x0 - 0.06, Dm.h / 2, 0); box(0.12, Dm.h, 5.2, wallM, Dm.x1 + 0.06, Dm.h / 2, 0);
  box(7, 0.12, 0.02, stripeM, 0, 1.0, Dm.z0 + 0.01); box(0.02, 0.12, 5.2, stripeM, Dm.x0 + 0.01, 1.0, 0); box(0.02, 0.12, 5.2, stripeM, Dm.x1 - 0.01, 1.0, 0);
  box(7.2, 0.1, 5.4, mat(0xfbfbf8, 0.95), 0, Dm.h + 0.05, 0);
  for (let i = 0; i < 3; i++) { const p = mk(new THREE.PlaneGeometry(1.1, 0.5), new THREE.MeshBasicMaterial({ color: 0xfffdf6 }), root, -2 + i * 2, Dm.h - 0.01, -0.6); p.rotation.x = Math.PI / 2; p.castShadow = false; }
  // door frames, the exam door (hinge group, opens into the room), the exit (a bright corridor beyond)
  for (const x of [ex, xx]) { box(0.06, DH, 0.16, white, x - DW / 2 - 0.03, DH / 2, Dm.z0); box(0.06, DH, 0.16, white, x + DW / 2 + 0.03, DH / 2, Dm.z0); box(DW + 0.12, 0.06, 0.16, white, x, DH + 0.03, Dm.z0); }
  const examDoor = new THREE.Group(); examDoor.position.set(ex - DW / 2, 0, Dm.z0 + 0.02); root.add(examDoor);
  rbox(DW - 0.02, DH - 0.02, 0.05, 0.01, mat(0xf6f1e6, 0.5), DW / 2, DH / 2, 0, examDoor);
  plane(0.5, 0.16, signTex('EXAM 1', '#2f6f6a', '#ffffff', 512, 160, 'bold 96px Helvetica, Arial, sans-serif'), DW / 2, 1.6, 0.03, 0, examDoor);
  mk(new THREE.SphereGeometry(0.03, 8, 6), mat(0xc9a25a, 0.3, { metalness: 0.6 }), examDoor, DW - 0.1, 1.0, 0.04);
  const behind = mk(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshBasicMaterial({ color: 0xe9f6f2 }), root, ex, 1.2, Dm.z0 - 0.9); behind.castShadow = false;
  const corridor = mk(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshBasicMaterial({ color: 0xbfe6ff }), root, xx, 1.2, Dm.z0 - 1.2); corridor.castShadow = false;
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), new THREE.MeshBasicMaterial({ map: signTex('EXIT', '#2fa84f', '#ffffff', 512, 180, 'bold 120px Helvetica, Arial, sans-serif'), toneMapped: false })); exitSign.position.set(xx, DH + 0.25, Dm.z0 + 0.02); root.add(exitSign);
  // clinic sign over the chairs, posters, clock
  plane(3.0, 0.42, signTex('HAPPY PAWS VET CLINIC', '#2f6f6a', '#fff6e0', 1536, 216, 'bold 120px Helvetica, Arial, sans-serif'), 0, 2.47, Dm.z0 + 0.02);
  const chubby = canvasTex(256, 340, (g, w, h) => { g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h); g.fillStyle = '#d2483f'; g.font = 'bold 30px Helvetica'; g.textAlign = 'center'; g.fillText('IS YOUR PET', w / 2, 44); g.fillText('CHUBBY?', w / 2, 80); g.fillStyle = '#2f6f6a'; [[60, 30], [128, 42], [196, 56]].forEach(([x, r]) => { g.beginPath(); g.ellipse(x, 200, r * 0.8, r * 0.6, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x + r * 0.7, 180, 16, 0, 7); g.fill(); }); g.fillStyle = '#555'; g.font = 'bold 22px Helvetica'; g.fillText('IDEAL     OOPS     HMM', w / 2, 290); });
  plane(0.6, 0.8, chubby, -1.2, 1.6, Dm.z0 + 0.02);
  const leash = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f2c14e'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a2a1e'; g.font = 'bold 30px Helvetica'; g.textAlign = 'center'; ['PLEASE KEEP', 'PETS ON A', 'LEASH'].forEach((l, i) => g.fillText(l, w / 2, 90 + i * 40)); g.beginPath(); g.ellipse(w / 2, 222, 18, 14, 0, 0, 7); g.fill(); });
  plane(0.5, 0.5, leash, 1.2, 1.65, Dm.z0 + 0.02);
  const clockT = canvasTex(128, 128, (g) => { g.fillStyle = '#fffdf6'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#2f6f6a'; g.lineWidth = 7; g.stroke(); g.strokeStyle = '#333'; g.lineCap = 'round'; g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 28); g.stroke(); g.beginPath(); g.moveTo(64, 64); g.lineTo(88, 52); g.stroke(); });
  mk(new THREE.CircleGeometry(0.15, 28), new THREE.MeshStandardMaterial({ map: clockT, roughness: 0.6 }), root, 0, 1.8, Dm.z0 + 0.02).castShadow = false;
  // waiting chairs (blue plastic on a steel rail)
  const chairM = mat(0x3d7bd9, 0.45), steel = mat(0xb8bcc2, 0.3, { metalness: 0.6 });
  box(4.1, 0.05, 0.05, steel, 0, 0.3, V.chairZ); for (const x of [-1.9, 1.9]) box(0.05, 0.3, 0.05, steel, x, 0.15, V.chairZ);
  for (const x of V.chairs) { rbox(0.5, 0.05, 0.46, 0.02, chairM, x, V.seat - 0.02, V.chairZ); const b = rbox(0.5, 0.5, 0.05, 0.02, chairM, x, V.seat + 0.28, V.chairZ - 0.23); b.rotation.x = -0.1; box(0.04, V.seat - 0.32, 0.04, steel, x, (V.seat + 0.32) / 2 - 0.02, V.chairZ); }
  // reception counter (right wall) with a treat jar + bell; scale; water bowl; plants; magazine rack; a bench by the left wall
  rbox(0.6, 1.05, 1.8, 0.03, mat(0xf6f1e6, 0.5), Dm.x1 - 0.35, 0.525, 0.4); box(0.62, 0.15, 1.82, stripeM, Dm.x1 - 0.35, 0.95, 0.4);
  mk(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 14), mat(0xdff2ff, 0.1, { transparent: true, opacity: 0.5 }), root, Dm.x1 - 0.4, 1.15, 0.0).castShadow = false;
  for (let k = 0; k < 8; k++) mk(new THREE.BoxGeometry(0.05, 0.02, 0.02), mat(0xb5762e, 0.7), root, Dm.x1 - 0.4 + Math.cos(k) * 0.04, 1.07 + (k % 4) * 0.03, Math.sin(k) * 0.04).rotation.y = k;
  mk(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xc9a25a, 0.3, { metalness: 0.7 }), root, Dm.x1 - 0.4, 1.06, 0.8);
  rbox(0.7, 0.06, 0.5, 0.02, mat(0x8a8f96, 0.4), -0.9, 0.03, -0.9); plane(0.36, 0.12, signTex('PET SCALE', '#2a2d31', '#ffffff', 512, 170, 'bold 100px Helvetica, Arial, sans-serif'), -0.9, 0.065, -0.64).rotation.x = -Math.PI / 2;
  mk(new THREE.CylinderGeometry(0.12, 0.1, 0.06, 16), mat(0xe8553f, 0.5), root, 2.2, 0.03, -1.4);
  for (const [px, pz, s] of [[-3.15, -2.25, 1.0], [3.15, -2.25, 0.9], [-3.1, 1.8, 0.8]]) { const pg = new THREE.Group(); pg.position.set(px, 0, pz); pg.scale.setScalar(s); root.add(pg); mk(new THREE.CylinderGeometry(0.2, 0.15, 0.36, 14), mat(0xf6f1e6, 0.6), pg, 0, 0.18, 0); for (let k = 0; k < 9; k++) { const lf = mk(new THREE.SphereGeometry(0.2, 10, 8), mat(0x4f8a3f, 0.8), pg, Math.sin(k * 2.4) * 0.15, 0.58 + (k % 3) * 0.17, Math.cos(k * 2.4) * 0.15); lf.scale.set(0.45, 1.6, 0.3); } }
  box(0.25, 0.9, 0.5, white, -2.05, 0.45, Dm.z0 + 0.3); for (let k = 0; k < 4; k++) box(0.2, 0.26, 0.02, mat([0xe8553f, 0x3d7bd9, 0xf2c14e, 0x6fa84f][k], 0.6), -2.05, 0.3 + (k % 2) * 0.35, Dm.z0 + 0.12 + (k > 1 ? 0.25 : 0.05)).rotation.x = -0.15;

  // lights: clean, bright clinic
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a9a94, 1.3); root.add(hemi);
  const key = new THREE.DirectionalLight(0xfff6ea, 1.5); key.position.set(-1.0, 5, 4); key.target.position.set(0, 0.6, -1.8); root.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 14 }); key.shadow.bias = -0.0005;
  const fillL = new THREE.PointLight(0xfff0e0, 1.6, 8, 1.4); fillL.position.set(0, 2.2, 1.2); root.add(fillL);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });
  return { root, D: V, examDoor, lights: { hemi, key, fillL } };
}
