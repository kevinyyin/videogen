// SET: a cozy apartment living room + dining area (built for video 016, talking pets; reusable for any home scene).
// Dressed on purpose (user steer: no bare scenes): armchair, sofa, coffee table + magazines + popcorn, rug, a big window with a
// painted view, bookshelf, floor lamp, side table, plants, framed pictures, a TV on the right wall, a dog bed, a pet perch spot,
// and a dining area (table, 4 chairs, sideboard, pendant lamp, wall art, a window on the left wall).
//
// Coordinates (meters, y up). Room x∈[-5,3], z∈[-2.8,2.8], ceiling 2.7. Camera usually from +z looking −z.
//   Living area x∈[-1.6,3]: armchair at DIMS.armchair (seat top 0.45, faces +z) — its group's origin is the BACK-BOTTOM edge
//   so `armchair.rotation.x = −θ` tips it over backwards. Sofa against the back wall (x∈[0.9,2.7]). Window x∈[-0.7,1.5].
//   Dog bed at DIMS.dogBed, perch spot DIMS.perch, side table (top DIMS.sideTop) at DIMS.side, coffee table at DIMS.coffee.
//   Dining area x∈[-5,-1.7]: table centered DIMS.dining (top DIMS.diningTop, 1.6 × 0.9), chairs `diningChairs[]` =
//   [left end (faces +x), back-left, back-right (face +z), right end (faces −x)].
// setMode('evening' | 'dinner' | 'night'): golden 7 PM sun / dusk with the pendant on / a moonlit night with the lamps on.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = {
  room: { x0: -5, x1: 3, z0: -2.8, z1: 2.8, h: 2.7 },
  armchair: [-0.35, -1.5], seat: 0.45, sofa: [1.8, -2.25], dogBed: [-0.78, -0.55], perch: [0.6, -1.85],
  side: [-1.15, -1.75], sideTop: 0.62, coffee: [0.45, -0.45], coffeeTop: 0.4,
  dining: [-3.4, -0.95], diningTop: 0.75, diningSize: [1.6, 0.9],
};

function viewTex(mode) {
  return canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (mode === 'evening') { gr.addColorStop(0, '#6f9fd8'); gr.addColorStop(0.45, '#f6c48a'); gr.addColorStop(0.75, '#f59a6a'); }
    else if (mode === 'dinner') { gr.addColorStop(0, '#2c3f78'); gr.addColorStop(0.6, '#6a64a8'); gr.addColorStop(0.85, '#d98a8a'); }
    else { gr.addColorStop(0, '#0d1838'); gr.addColorStop(0.7, '#1f3566'); gr.addColorStop(1, '#2f4a7a'); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const R = rng(3);
    if (mode === 'night') { g.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { g.globalAlpha = 0.4 + R() * 0.6; g.beginPath(); g.arc(R() * w, R() * h * 0.55, 0.8 + R() * 1.4, 0, 7); g.fill(); } g.globalAlpha = 1; g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(w * 0.72, h * 0.22, 26, 0, 7); g.fill(); }
    if (mode === 'evening') { g.fillStyle = 'rgba(255,236,190,.9)'; g.beginPath(); g.arc(w * 0.3, h * 0.66, 40, 0, 7); g.fill(); }
    // far skyline + near rooftops + trees
    for (let i = 0; i < 16; i++) { const bw = 40 + R() * 70, bh = 60 + R() * 150, x = i * 66 - 10; g.fillStyle = mode === 'evening' ? '#9a7f9a' : mode === 'dinner' ? '#3a3a62' : '#1a2340'; g.fillRect(x, h * 0.78 - bh, bw, bh + 200);
      if (mode !== 'evening') for (let y = h * 0.78 - bh + 10; y < h * 0.76; y += 18) for (let xx = x + 6; xx < x + bw - 8; xx += 14) if (R() < 0.45) { g.fillStyle = R() < 0.5 ? '#ffd98a' : '#ffe9b8'; g.fillRect(xx, y, 7, 9); } }
    g.fillStyle = mode === 'evening' ? '#5f7f4f' : mode === 'dinner' ? '#2a3a3a' : '#141c26';
    for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(i * 95 + 20, h * 0.86, 55 + (i % 3) * 14, 0, 7); g.fill(); }
    g.fillRect(0, h * 0.86, w, h);
  });
}

export function buildLivingRoom(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 16), Dm = DIMS.room;
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 3, r), m, p, x, y, z);
  const plane = (w, h, tex, x, y, z, ry = 0, basic = false) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); m.position.set(x, y, z); m.rotation.y = ry; root.add(m); return m; };

  // ---------------------------------------------------------------- shell: wood floor, wallpaper, ceiling
  const floorTex = canvasTex(512, 512, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#b98a5e', '#c4956a', '#ad7f55', '#bf9064'][i % 4]; g.fillRect(0, i * 64, w, 64); g.fillStyle = 'rgba(70,40,20,.25)'; g.fillRect(0, i * 64, w, 3); g.fillRect(((i * 197) % 400) + 40, i * 64, 3, 64); } }, [4, 3]);
  const floor = mk(new THREE.PlaneGeometry(8, 5.6), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55 }), root, -1, 0, 0); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const paper = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e9dcc4'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(190,150,110,.22)'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 10, h); g.fillStyle = 'rgba(160,110,90,.25)'; for (let y = 16; y < h; y += 64) for (let x = 21; x < w; x += 32) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } }, [8, 2]);
  const wallM = new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9 }), trim = mat(0xf6f1e6, 0.6);
  const WX0 = -0.7, WX1 = 1.5, WY0 = 0.85, WY1 = 2.25;   // big living-room window in the back wall
  box(WX0 - Dm.x0, Dm.h, 0.12, wallM, (Dm.x0 + WX0) / 2, Dm.h / 2, Dm.z0 - 0.06); box(Dm.x1 - WX1, Dm.h, 0.12, wallM, (WX1 + Dm.x1) / 2, Dm.h / 2, Dm.z0 - 0.06);
  box(WX1 - WX0, WY0, 0.12, wallM, (WX0 + WX1) / 2, WY0 / 2, Dm.z0 - 0.06); box(WX1 - WX0, Dm.h - WY1, 0.12, wallM, (WX0 + WX1) / 2, (Dm.h + WY1) / 2, Dm.z0 - 0.06);
  const LZ0 = -1.9, LZ1 = -0.4;   // dining window in the left wall
  box(0.12, Dm.h, LZ0 - Dm.z0, wallM, Dm.x0 - 0.06, Dm.h / 2, (Dm.z0 + LZ0) / 2); box(0.12, Dm.h, Dm.z1 - LZ1, wallM, Dm.x0 - 0.06, Dm.h / 2, (LZ1 + Dm.z1) / 2);
  box(0.12, 0.95, LZ1 - LZ0, wallM, Dm.x0 - 0.06, 0.475, (LZ0 + LZ1) / 2); box(0.12, Dm.h - 2.15, LZ1 - LZ0, wallM, Dm.x0 - 0.06, (Dm.h + 2.15) / 2, (LZ0 + LZ1) / 2);
  box(0.12, Dm.h, 5.6, wallM, Dm.x1 + 0.06, Dm.h / 2, 0);
  box(8.3, 0.1, 5.8, mat(0xf8f4ec, 0.95), -1, Dm.h + 0.05, 0);
  box(8, 0.12, 0.03, trim, -1, 0.06, Dm.z0 + 0.015);                                     // baseboard
  // window frames + sill + curtains + the painted view
  const views = { evening: viewTex('evening'), dinner: viewTex('dinner'), night: viewTex('night') };
  const viewM = new THREE.MeshBasicMaterial({ map: views.evening, toneMapped: false });
  const view = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), viewM); view.position.set(0.4, 1.5, Dm.z0 - 2.4); root.add(view);
  const view2 = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), viewM); view2.position.set(Dm.x0 - 1.8, 1.5, -1.15); view2.rotation.y = Math.PI / 2; root.add(view2);
  for (const x of [WX0, (WX0 + WX1) / 2, WX1]) box(0.06, WY1 - WY0, 0.08, trim, x, (WY0 + WY1) / 2, Dm.z0 + 0.01);
  box(WX1 - WX0 + 0.1, 0.06, 0.08, trim, (WX0 + WX1) / 2, WY1, Dm.z0 + 0.01); box(WX1 - WX0 + 0.2, 0.05, 0.22, trim, (WX0 + WX1) / 2, WY0, Dm.z0 + 0.08);
  box(0.08, 0.06, LZ1 - LZ0, trim, Dm.x0 + 0.03, 2.15, (LZ0 + LZ1) / 2); box(0.2, 0.05, LZ1 - LZ0 + 0.1, trim, Dm.x0 + 0.08, 0.95, (LZ0 + LZ1) / 2);
  const curtM = mat(0x5f8f8a, 0.95, { side: THREE.DoubleSide });
  for (const x of [WX0 - 0.28, WX1 + 0.28]) { const c = mk(new THREE.PlaneGeometry(0.5, 2.3), curtM, root, x, 1.4, Dm.z0 + 0.07); c.castShadow = false; }
  box(WX1 - WX0 + 1.4, 0.03, 0.03, mat(0x3a2e26, 0.4), (WX0 + WX1) / 2, 2.5, Dm.z0 + 0.1);
  // a little succulent row + a cactus on the sill
  for (let i = 0; i < 3; i++) { mk(new THREE.CylinderGeometry(0.05, 0.04, 0.08, 10), mat([0xe2574c, 0xf2efe8, 0x4f9bd9][i], 0.6), root, WX0 + 0.3 + i * 0.75, WY0 + 0.065, Dm.z0 + 0.1); mk(new THREE.SphereGeometry(0.05, 8, 6), mat(0x4f8a3f, 0.8), root, WX0 + 0.3 + i * 0.75, WY0 + 0.13, Dm.z0 + 0.1).scale.set(1, 0.7 + (i % 2) * 0.6, 1); }

  // ---------------------------------------------------------------- living area
  const rugTex = canvasTex(512, 340, (g, w, h) => { g.fillStyle = '#c75b4a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2d8a8'; g.lineWidth = 14; g.strokeRect(20, 20, w - 40, h - 40); g.strokeStyle = '#2f5f6a'; g.lineWidth = 8; g.strokeRect(50, 50, w - 100, h - 100); g.fillStyle = '#f2d8a8'; for (let i = 0; i < 5; i++) { g.save(); g.translate(110 + i * 75, h / 2); g.rotate(Math.PI / 4); g.fillRect(-16, -16, 32, 32); g.restore(); } });
  const rug = mk(new THREE.PlaneGeometry(3.0, 2.0), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }), root, 0.4, 0.004, -0.75); rug.rotation.x = -Math.PI / 2; rug.castShadow = false;
  // armchair (origin = back-bottom edge, tips backwards)
  const [ax, az] = DIMS.armchair, chairM = mat(0x3f7d8c, 0.85), legM = mat(0x4a3324, 0.6);
  const armchair = new THREE.Group(); armchair.position.set(ax, 0, az - 0.42); root.add(armchair);
  const C = new THREE.Group(); C.position.z = 0.42; armchair.add(C);
  rbox(0.82, 0.2, 0.78, 0.06, chairM, 0, 0.3, 0, C); rbox(0.66, 0.1, 0.62, 0.05, mat(0x4c90a0, 0.85), 0, 0.42, 0.05, C);
  rbox(0.82, 0.62, 0.18, 0.07, chairM, 0, 0.62, -0.32, C); for (const s of [-1, 1]) rbox(0.14, 0.32, 0.74, 0.06, chairM, s * 0.36, 0.5, 0.0, C);
  for (const [lx, lz] of [[-0.34, -0.32], [0.34, -0.32], [-0.34, 0.32], [0.34, 0.32]]) box(0.05, 0.2, 0.05, legM, lx, 0.1, lz, C);
  mk(new THREE.SphereGeometry(0.13, 12, 10), mat(0xf2c14e, 0.9), C, 0.22, 0.6, -0.15).scale.set(1, 1, 0.45);   // cushion
  // sofa against the back wall (right of the window, under a painting)
  const [sx, sz] = DIMS.sofa, sofaM = mat(0x8f6aa8, 0.9);
  rbox(1.9, 0.24, 0.85, 0.07, sofaM, sx, 0.3, sz); rbox(1.9, 0.6, 0.2, 0.07, sofaM, sx, 0.62, sz - 0.33); for (const s of [-1, 1]) rbox(0.18, 0.38, 0.85, 0.07, sofaM, sx + s * 0.86, 0.5, sz);
  for (let i = 0; i < 2; i++) rbox(0.78, 0.1, 0.62, 0.05, mat(0x9d7ab5, 0.9), sx - 0.4 + i * 0.8, 0.46, sz + 0.06);
  [[0xf2c14e, -0.55], [0x58b3a8, 0.6]].forEach(([c, dx]) => { const p = mk(new THREE.SphereGeometry(0.15, 12, 10), mat(c, 0.9), root, sx + dx, 0.66, sz - 0.18); p.scale.set(1, 1, 0.4); p.rotation.z = dx * 0.4; });
  const throwB = rbox(0.5, 0.03, 0.7, 0.015, mat(0xd9c7a0, 0.95), sx + 0.55, 0.53, sz + 0.05); throwB.rotation.z = 0.05;
  // coffee table: magazines, remote, popcorn, a mug
  const [cx, cz] = DIMS.coffee, wood = mat(0x8a5a36, 0.55);
  rbox(1.0, 0.05, 0.56, 0.02, wood, cx, DIMS.coffeeTop - 0.025, cz); for (const [lx, lz] of [[-0.44, -0.22], [0.44, -0.22], [-0.44, 0.22], [0.44, 0.22]]) box(0.04, DIMS.coffeeTop - 0.05, 0.04, wood, cx + lx, (DIMS.coffeeTop - 0.05) / 2, cz + lz);
  [0xd2483f, 0x3d7bd9, 0xf2efe8].forEach((c, i) => { const mg = box(0.22, 0.012, 0.3, mat(c, 0.6), cx - 0.25 + i * 0.03, DIMS.coffeeTop + 0.006 + i * 0.012, cz + 0.02); mg.rotation.y = i * 0.25; });
  box(0.05, 0.02, 0.16, mat(0x222222, 0.4), cx + 0.1, DIMS.coffeeTop + 0.01, cz + 0.1).rotation.y = 0.4;
  const pop = mk(new THREE.CylinderGeometry(0.1, 0.08, 0.1, 16, 1, true), mat(0xd2483f, 0.6, { side: THREE.DoubleSide }), root, cx + 0.3, DIMS.coffeeTop + 0.05, cz - 0.05);
  for (let k = 0; k < 14; k++) mk(new THREE.SphereGeometry(0.022, 6, 5), mat(0xfff3d6, 0.9), root, cx + 0.3 + Math.cos(k * 1.7) * 0.06 * (k % 3) / 2, DIMS.coffeeTop + 0.1 + (k % 4) * 0.012, cz - 0.05 + Math.sin(k * 1.7) * 0.06 * (k % 3) / 2);
  void pop;
  // side table (with a lamp at the back) — the fish bowl goes on it
  const [stx, stz] = DIMS.side;
  mk(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 20), wood, root, stx, DIMS.sideTop - 0.02, stz); mk(new THREE.CylinderGeometry(0.03, 0.05, DIMS.sideTop - 0.04, 10), wood, root, stx, (DIMS.sideTop - 0.04) / 2, stz); mk(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 16), wood, root, stx, 0.015, stz);
  // floor lamp (left of the side table) + table lamp on the bookshelf
  const lampX = -1.6, lampZ = -2.3;
  mk(new THREE.CylinderGeometry(0.15, 0.17, 0.03, 16), mat(0x2a2a2a, 0.5), root, lampX, 0.015, lampZ); mk(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 6), mat(0x2a2a2a, 0.5), root, lampX, 0.75, lampZ);
  const lampShade = mk(new THREE.CylinderGeometry(0.15, 0.22, 0.28, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xf6e3b8, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffc777, emissiveIntensity: 0.5 }), root, lampX, 1.6, lampZ); lampShade.castShadow = false;
  // bookshelf on the back wall, left of the window
  const bsx = -2.05;
  box(0.9, 1.9, 0.32, wood, bsx, 0.95, Dm.z0 + 0.18);
  for (let s = 0; s < 4; s++) { box(0.84, 0.03, 0.3, mat(0x6e4a2e, 0.6), bsx, 0.25 + s * 0.45, Dm.z0 + 0.34); for (let b = 0; b < 9; b++) { if (R() < 0.15) continue; const bh = 0.2 + R() * 0.12; box(0.06 + R() * 0.03, bh, 0.2, mat([0xd2483f, 0x3d7bd9, 0xf2c14e, 0x6fa84f, 0x8f6fb8, 0xe58fa6, 0xf2efe8][(b + s * 3) % 7], 0.7), bsx - 0.36 + b * 0.09, 0.27 + s * 0.45 + bh / 2, Dm.z0 + 0.3); } }
  // framed pictures (one big painting over the sofa, small ones over the dining sideboard)
  const art = (w, h, draw) => canvasTex(Math.round(256 * w / h), 256, draw);
  const paint = art(1.4, 0.8, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f4c27a'); gr.addColorStop(1, '#e2786a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#3f6a8a'; g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.3, h * 0.45); g.lineTo(w * 0.55, h); g.fill(); g.fillStyle = '#2f5070'; g.beginPath(); g.moveTo(w * 0.35, h); g.lineTo(w * 0.7, h * 0.3); g.lineTo(w, h); g.fill(); g.fillStyle = '#fff3d6'; g.beginPath(); g.arc(w * 0.75, h * 0.25, 22, 0, 7); g.fill(); });
  box(1.5, 0.9, 0.04, mat(0x3a2a20, 0.5), sx, 1.75, Dm.z0 + 0.03); plane(1.4, 0.8, paint, sx, 1.75, Dm.z0 + 0.055);
  // TV on the right wall (faces −x) on a low console
  box(0.45, 0.5, 1.6, wood, Dm.x1 - 0.25, 0.25, -0.4); const tv = box(0.05, 0.62, 1.1, mat(0x111111, 0.3), Dm.x1 - 0.1, 1.2, -0.4);
  const tvScreen = plane(1.02, 0.55, canvasTex(256, 140, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3a6fb0'); gr.addColorStop(1, '#7ac0d8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(w * 0.3, h * 0.55, 26, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 22px Helvetica'; g.fillText('NEWS', w * 0.55, h * 0.4); }), Dm.x1 - 0.13, 1.2, -0.4, -Math.PI / 2, true);
  void tv; void tvScreen;
  // dog bed
  const [dbx, dbz] = DIMS.dogBed;
  const bed = mk(new THREE.TorusGeometry(0.33, 0.1, 10, 24), mat(0x7a5a8a, 0.95), root, dbx, 0.09, dbz); bed.rotation.x = Math.PI / 2; bed.scale.set(1, 0.8, 1);
  mk(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 24), mat(0xe9dcc8, 0.95), root, dbx, 0.04, dbz).scale.set(1, 1, 0.8);
  const bone = new THREE.Group(); bone.position.set(dbx + 0.45, 0.025, dbz + 0.25); bone.rotation.y = 0.7; root.add(bone);
  box(0.16, 0.03, 0.035, mat(0xf2efe8, 0.6), 0, 0, 0, bone); for (const s of [-1, 1]) for (const t of [-1, 1]) mk(new THREE.SphereGeometry(0.022, 8, 6), mat(0xf2efe8, 0.6), bone, s * 0.08, 0, t * 0.02);
  mk(new THREE.SphereGeometry(0.05, 12, 10), mat(0xd2483f, 0.5), root, dbx - 0.5, 0.05, dbz + 0.35);   // a ball
  // plants (corners)
  const plant = (px, pz, s, c = 0x4f8a3f) => { const pg = new THREE.Group(); pg.position.set(px, 0, pz); pg.scale.setScalar(s); root.add(pg); mk(new THREE.CylinderGeometry(0.2, 0.15, 0.35, 14), mat(0xd9d4c8, 0.6), pg, 0, 0.17, 0); for (let k = 0; k < 9; k++) { const lf = mk(new THREE.SphereGeometry(0.2, 10, 8), mat(c, 0.8), pg, Math.sin(k * 2.4) * 0.16, 0.55 + (k % 3) * 0.17, Math.cos(k * 2.4) * 0.16); lf.scale.set(0.45, 1.6, 0.3); lf.rotation.z = Math.sin(k) * 0.3; } };
  plant(2.65, -2.45, 1.15); plant(-1.55, -0.2, 0.75, 0x5f9a4a); plant(-4.65, -2.45, 1.0); plant(2.6, 1.6, 0.9);

  // ---------------------------------------------------------------- dining area
  const [dx, dz] = DIMS.dining, [dw, dd] = DIMS.diningSize, dwood = mat(0x7a4e30, 0.55);
  rbox(dw, 0.05, dd, 0.02, dwood, dx, DIMS.diningTop - 0.025, dz);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.06, DIMS.diningTop - 0.05, 0.06, dwood, dx + lx * (dw / 2 - 0.08), (DIMS.diningTop - 0.05) / 2, dz + lz * (dd / 2 - 0.08));
  const diningChairs = [];
  for (const [ccx, ccz, r] of [[dx - dw / 2 - 0.2, dz, Math.PI / 2], [dx - 0.4, dz - dd / 2 - 0.2, 0], [dx + 0.4, dz - dd / 2 - 0.2, 0], [dx + dw / 2 + 0.2, dz, -Math.PI / 2]]) {
    const c = new THREE.Group(); c.position.set(ccx, 0, ccz); c.rotation.y = r; root.add(c);
    rbox(0.44, 0.05, 0.44, 0.015, dwood, 0, 0.45, 0, c); for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) box(0.035, 0.45, 0.035, dwood, lx, 0.225, lz, c);
    for (const lx of [-0.19, 0.19]) box(0.035, 0.52, 0.035, dwood, lx, 0.72, -0.2, c); box(0.42, 0.14, 0.03, dwood, 0, 0.9, -0.2, c);
    rbox(0.38, 0.04, 0.38, 0.015, mat(0xc75b4a, 0.9), 0, 0.49, 0.01, c);
    diningChairs.push(c);
  }
  // sideboard + candles + a bowl, wall art, pendant lamp
  box(1.5, 0.8, 0.42, dwood, dx, 0.4, Dm.z0 + 0.23); for (let i = 0; i < 3; i++) box(0.44, 0.6, 0.01, mat(0x8a5e3e, 0.5), dx - 0.48 + i * 0.48, 0.42, Dm.z0 + 0.445);
  for (let i = 0; i < 3; i++) { mk(new THREE.CylinderGeometry(0.025, 0.025, 0.18 + i * 0.05, 10), mat(0xf6efe0, 0.6), root, dx + 0.3 + i * 0.1, 0.8 + (0.18 + i * 0.05) / 2, Dm.z0 + 0.2); }
  mk(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x58b3a8, 0.4, { side: THREE.DoubleSide }), root, dx - 0.35, 0.95, Dm.z0 + 0.22);
  const smallArt = [['#6fa8d8', '#f2c14e'], ['#e58fa6', '#3d7bd9'], ['#9fd27a', '#d2483f']];
  smallArt.forEach(([a, b], i) => { box(0.5, 0.5, 0.03, mat(0xf6f1e6, 0.5), dx - 0.6 + i * 0.6, 1.65, Dm.z0 + 0.03); plane(0.4, 0.4, canvasTex(128, 128, (g, w, h) => { g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; g.beginPath(); g.arc(w * (0.3 + i * 0.2), h * 0.55, 30, 0, 7); g.fill(); }), dx - 0.6 + i * 0.6, 1.65, Dm.z0 + 0.05); });
  mk(new THREE.CylinderGeometry(0.005, 0.005, 0.85, 4), mat(0x222222, 0.5), root, dx, Dm.h - 0.42, dz);
  const pendShade = mk(new THREE.SphereGeometry(0.24, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2b632, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xffc070, emissiveIntensity: 0.5 }), root, dx, Dm.h - 0.95, dz);
  pendShade.castShadow = false;
  // a clock between the window and the bookshelf + a coat rack corner + a "HOME" sign
  const clockT = canvasTex(128, 128, (g) => { g.fillStyle = '#fffdf6'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#333'; g.lineWidth = 6; g.stroke(); g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 30); g.stroke(); g.beginPath(); g.moveTo(64, 64); g.lineTo(90, 76); g.stroke(); });
  const clk = mk(new THREE.CircleGeometry(0.17, 28), new THREE.MeshStandardMaterial({ map: clockT, roughness: 0.6 }), root, -1.2, 2.05, Dm.z0 + 0.01); clk.castShadow = false;
  plane(0.6, 0.18, canvasTex(256, 76, (g, w, h) => { g.fillStyle = '#f6efe0'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a4e30'; g.font = 'bold 50px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HOME', w / 2, h / 2 + 3); }), -1.2, 1.6, Dm.z0 + 0.01);

  // ---------------------------------------------------------------- lights
  const hemi = new THREE.HemisphereLight(0xfff1e0, 0x8a6e58, 1.0); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc89a, 2.0); sun.position.set(-1.2, 3.6, -7.5); sun.target.position.set(0.0, 0, -0.6); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 4, bottom: -4, near: 1, far: 18 }); sun.shadow.bias = -0.0005;
  const lampL = new THREE.PointLight(0xffc27a, 2.0, 5.5, 1.6); lampL.position.set(lampX + 0.15, 1.5, lampZ + 0.35); root.add(lampL);
  const pend = new THREE.PointLight(0xffc98a, 2.0, 5, 1.6); pend.position.set(dx, Dm.h - 1.15, dz); root.add(pend);
  const fillL = new THREE.PointLight(0xfff0e0, 1.8, 8, 1.4); fillL.position.set(0.2, 2.2, 1.6); root.add(fillL);
  const fillD = new THREE.PointLight(0xfff0e0, 1.2, 7, 1.4); fillD.position.set(dx, 2.1, 1.4); root.add(fillD);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });

  function setMode(mode) {
    viewM.map = views[mode] || views.evening; viewM.needsUpdate = true;
    if (mode === 'evening') { hemi.intensity = 1.05; hemi.color.set(0xfff1e0); sun.intensity = 2.2; sun.color.set(0xffc08a); lampL.intensity = 1.2; pend.intensity = 0.8; fillL.intensity = 1.8; fillD.intensity = 1.0; }
    else if (mode === 'dinner') { hemi.intensity = 0.85; hemi.color.set(0xffe6cc); sun.intensity = 0.5; sun.color.set(0x8a9ad8); lampL.intensity = 2.0; pend.intensity = 4.2; fillL.intensity = 1.2; fillD.intensity = 1.8; }
    else { hemi.intensity = 0.55; hemi.color.set(0xd8d8ff); sun.intensity = 0.35; sun.color.set(0x9ab0ff); lampL.intensity = 3.2; pend.intensity = 0.6; fillL.intensity = 1.0; fillD.intensity = 0.4; }
  }
  setMode('evening');
  return { root, D: DIMS, armchair, diningChairs, setMode, lights: { hemi, sun, lampL, pend, fillL, fillD } };
}
