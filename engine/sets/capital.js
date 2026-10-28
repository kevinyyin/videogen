// SETS: mid-1800s America — rooms, a speaking platform, a battlefield, a theatre, a marble memorial
// (built for videos/009-abe-lincoln; reusable for any 19th-century biography). Each builder returns its own `root`
// at the origin — park them at offsets and show ONE per shot (007 montage technique).
//
//   buildRoom(studio)        5×4 m room (x∈[-2.5,2.5], z∈[-2,2]), window in the east wall (+x). Desk at z=-1.05 facing +z
//                            with chair, papers, quill + inkwell, candle; flag in the corner, portrait, wall clock, rocking chair.
//                            setMode('candle'|'day'|'dawn'), setWallpaper(css1, css2), setClock(h, m). Handles: desk, paper,
//                            candle, rocker, clock, flag, portrait, books.
//   buildSquare(studio)      outdoor speaking platform (deck y=1.0, x∈[-3.5,3.5], z∈[-4,-0.6], faces +z), bunting, flags,
//                            crowd area z∈[0.5,9]. Dress groups: town (brick fronts), cemetery (headstones + hills), dome (a
//                            distant Capitol), banner. setMode('summer'|'autumn'|'spring'), update(t) waves the flags.
//   buildBattlefield(studio) dusk field: 4 cannons on the near ridge (fire(i, t) recoil + flash + smoke), rail fence,
//                            far ridge, drifting battle smoke. update(t, shots) — shots = [[time, cannonIndex], ...].
//   buildTheatre(studio)     1860s theatre from the stage: stage z<0 (deck y=0.9), house z>0, the presidential box on the
//                            east side wall (box floor y=3.0, x≈4.3, z∈[1.2,3.2]) draped with flags + a portrait; rocking chair.
//   buildMemorial(studio)    marble temple: steps, columns, a seated colossal statue (set statue pose from the video).
//   Props: makeTopHat(r), makeFlag(w, h) ({g, update(t)}), makeCannon(), makeQuill(), makeKepi(color), makeRifle(),
//          makeBonnet(color), makeDerby(color), usFlagTexture()
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng, clamp, lerp } from '@engine/core.js';
import { makeSkyDome } from '@engine/sets/military.js';
import { makeTree, makeRailFence, makeBook, makeOpenBook } from '@engine/sets/frontier.js';

const PI = Math.PI;
export const DIMS = {
  room: { desk: [0, -1.05], chair: [0, -0.45], rocker: [1.3, 0.6], window: [2.5, -0.2] },
  square: { deck: 1.0, stage: [-3.5, 3.5, -4, -0.6] },
  theatre: { box: [4.3, 3.0, 2.2], stage: 0.9 },
};

// ---------------------------------------------------------------- props
export function usFlagTexture(w = 512, h = 300) {
  return canvasTex(w, h, (g) => {
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#f4efe6' : '#b8302f'; g.fillRect(0, (i * h) / 13, w, h / 13 + 1); }
    g.fillStyle = '#2a3a6a'; g.fillRect(0, 0, w * 0.42, (h * 7) / 13);
    g.fillStyle = '#f4efe6';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { g.beginPath(); g.arc(18 + c * 28 + (r % 2) * 10, 16 + r * 30, 5, 0, PI * 2); g.fill(); }
  });
}
const FLAG_TEX = { t: null };
/** A cloth flag on a pole (pole along +y, cloth to +x). update(t) waves it. */
export function makeFlag(w = 1.4, h = 0.85, poleH = 3.2, seed = 0) {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.025, 0.03, poleH, 8), mat(0x8a7a5a, 0.6), g, 0, poleH / 2, 0);
  mk(new THREE.SphereGeometry(0.05, 10, 8), mat(0xc9a050, 0.3, { metalness: 0.7 }), g, 0, poleH + 0.03, 0);
  FLAG_TEX.t = FLAG_TEX.t || usFlagTexture();
  const geo = new THREE.PlaneGeometry(w, h, 16, 6); geo.translate(w / 2, 0, 0);
  const base = geo.attributes.position.array.slice();
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: FLAG_TEX.t, roughness: 0.85, side: THREE.DoubleSide }));
  cloth.position.y = poleH - h / 2 - 0.05; cloth.castShadow = true; g.add(cloth);
  const update = (t, amp = 1) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = base[i * 3], y = base[i * 3 + 1]; p.setZ(i, amp * (x / w) * 0.12 * Math.sin(x * 3.2 - t * 4.2 + seed + y * 0.8)); p.setY(i, y - amp * (x / w) * 0.04); }
    p.needsUpdate = true; geo.computeVertexNormals();
  };
  update(0);
  return { g, cloth, update };
}
/** Stovepipe hat sized for head radius r (sit it at y ≈ r*0.8 on the head group). */
export function makeTopHat(r = 0.14, color = 0x141416) {
  const g = new THREE.Group(), m = mat(color, 0.55);
  mk(new THREE.CylinderGeometry(r * 1.62, r * 1.62, r * 0.06, 28), m, g, 0, 0, 0);
  mk(new THREE.CylinderGeometry(r * 0.98, r * 0.92, r * 2.3, 28), m, g, 0, r * 1.15, 0);
  mk(new THREE.CylinderGeometry(r * 0.935, r * 0.935, r * 0.3, 28), mat(0x2a2a2e, 0.5), g, 0, r * 0.2, 0);
  return g;
}
export function makeDerby(r = 0.135, color = 0x3a2e26) {
  const g = new THREE.Group(), m = mat(color, 0.6);
  mk(new THREE.CylinderGeometry(r * 1.45, r * 1.45, r * 0.06, 24), m, g, 0, 0, 0);
  const crown = mk(new THREE.SphereGeometry(r * 1.0, 20, 12, 0, PI * 2, 0, PI / 2), m, g, 0, r * 0.05, 0); crown.scale.set(1, 1.05, 1);
  return g;
}
export function makeBonnet(r = 0.135, color = 0xe8dcc0) {
  const g = new THREE.Group(), m = mat(color, 0.9, { side: THREE.DoubleSide });
  const shell = mk(new THREE.SphereGeometry(r * 1.2, 22, 12, PI * 0.15, PI * 1.7, 0, PI * 0.62), m, g, 0, 0, -r * 0.08); shell.rotation.y = PI;
  const brim = mk(new THREE.TorusGeometry(r * 1.1, r * 0.16, 8, 24, PI * 1.25), m, g, 0, -r * 0.05, r * 0.15); brim.rotation.set(-0.35, 0, -PI * 0.125);
  return g;
}
export function makeKepi(r = 0.135, color = 0x2a3a6a) {
  const g = new THREE.Group(), m = mat(color, 0.8);
  const c = mk(new THREE.CylinderGeometry(r * 0.95, r * 1.05, r * 0.8, 20), m, g, 0, r * 0.3, -r * 0.05); c.rotation.x = -0.25;
  const top = mk(new THREE.CircleGeometry(r * 0.95, 20), m, g, r * 0, r * 0.71, -r * 0.15); top.rotation.x = -PI / 2 - 0.25;
  const visor = mk(new THREE.CylinderGeometry(r * 0.7, r * 0.7, r * 0.05, 16, 1, false, -PI / 2, PI), mat(0x1a1a1a, 0.4), g, 0, -r * 0.05, r * 0.65);
  visor.scale.set(1, 1, 0.6);
  return g;
}
export function makeRifle() {
  const g = new THREE.Group();
  mk(new THREE.BoxGeometry(0.05, 0.42, 0.07), mat(0x6a4a2a, 0.7), g, 0, -0.38, 0);
  mk(new THREE.CylinderGeometry(0.012, 0.014, 1.0, 6), mat(0x4a4a4e, 0.4, { metalness: 0.6 }), g, 0, 0.3, 0);
  mk(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 4), mat(0xb0b0b4, 0.3, { metalness: 0.8 }), g, 0, 0.9, 0);
  return g;
}
export function makeQuill() {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.003, 0.004, 0.24, 5), mat(0xe8dcc0, 0.6), g, 0, 0.12, 0);
  const vane = mk(new THREE.SphereGeometry(0.03, 10, 8), mat(0xf4f0e6, 0.8), g, 0.006, 0.17, 0); vane.scale.set(0.35, 2.4, 0.08);
  return g;
}
export function makeCannon() {
  const g = new THREE.Group(), wood = mat(0x5a4a3a, 0.85), iron = mat(0x2a2c2e, 0.4, { metalness: 0.6 });
  const tube = new THREE.Group(); tube.position.set(0, 0.85, 0); g.add(tube);
  const b = mk(new THREE.CylinderGeometry(0.11, 0.16, 1.9, 16), iron, tube, 0, 0, 0.3); b.rotation.x = PI / 2 - 0.08;
  mk(new THREE.SphereGeometry(0.17, 14, 10), iron, tube, 0, 0, -0.65);
  for (const s of [-1, 1]) {
    const w = mk(new THREE.TorusGeometry(0.55, 0.05, 8, 24), wood, g, s * 0.42, 0.6, 0); w.rotation.y = PI / 2;
    for (let k = 0; k < 6; k++) { const sp = mk(new THREE.BoxGeometry(0.03, 1.05, 0.04), wood, g, s * 0.42, 0.6, 0); sp.rotation.x = (k * PI) / 6; }
    mk(new THREE.BoxGeometry(0.08, 0.25, 1.2), wood, g, s * 0.2, 0.62, -0.3);
  }
  const trail = mk(new THREE.BoxGeometry(0.22, 0.14, 1.9), wood, g, 0, 0.35, -1.2); trail.rotation.x = 0.32;
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc070).multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false }));
  flash.position.set(0, 0.92, 1.45); flash.visible = false; g.add(flash);
  return { g, tube, flash };
}
const wallTex = (c1, c2) => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = c1; g.fillRect(0, 0, w, h);
  g.fillStyle = c2; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 26, h);
  g.globalAlpha = 0.35; for (let y = 16; y < h; y += 64) for (let x = 13; x < w; x += 64) { g.beginPath(); g.arc(x, y, 6, 0, PI * 2); g.fill(); } g.globalAlpha = 1;
}, [3, 1.5]);
const floorTex = (c = '#7a5634') => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = c; g.fillRect(0, 0, w, h); const r = rng(77);
  for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.08})`; g.fillRect(i * 64, 0, 64, h); g.fillStyle = 'rgba(20,10,0,.5)'; g.fillRect(i * 64, 0, 2, h); }
}, [3, 3]);

// ---------------------------------------------------------------- ROOM (law office / Springfield office / White House study / dawn)
export function buildRoom(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const W2 = 2.5, D2 = 2.0, H = 3.0;
  const wallM = new THREE.MeshStandardMaterial({ map: wallTex('#4f6a4a', '#5a7856'), roughness: 0.95, side: THREE.DoubleSide });
  const fl = mk(new THREE.PlaneGeometry(W2 * 2, D2 * 2), new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.75 }), root); fl.rotation.x = -PI / 2;
  const ceil = mk(new THREE.PlaneGeometry(W2 * 2, D2 * 2), mat(0xe8e0d0, 0.95, { side: THREE.DoubleSide }), root, 0, H, 0); ceil.rotation.x = PI / 2;
  mk(new THREE.PlaneGeometry(W2 * 2, H), wallM, root, 0, H / 2, -D2);
  mk(new THREE.PlaneGeometry(D2 * 2, H), wallM, root, -W2, H / 2, 0).rotation.y = PI / 2;
  mk(new THREE.PlaneGeometry(W2 * 2, H), wallM, root, 0, H / 2, D2).rotation.y = PI;
  // east wall with a tall window (z∈[-0.8,0.4], y∈[0.8,2.5])
  const ew = (z0, z1, y0, y1) => { const m = mk(new THREE.PlaneGeometry(z1 - z0, y1 - y0), wallM, root, W2, (y0 + y1) / 2, (z0 + z1) / 2); m.rotation.y = -PI / 2; };
  ew(-D2, -0.8, 0, H); ew(0.4, D2, 0, H); ew(-0.8, 0.4, 0, 0.8); ew(-0.8, 0.4, 2.5, H);
  const trim = mat(0xefe8da, 0.7);
  mk(new THREE.BoxGeometry(0.08, 0.06, 1.3), trim, root, W2 - 0.02, 0.8, -0.2); mk(new THREE.BoxGeometry(0.08, 0.06, 1.3), trim, root, W2 - 0.02, 2.5, -0.2);
  mk(new THREE.BoxGeometry(0.05, 1.7, 0.05), trim, root, W2 - 0.02, 1.65, -0.2); mk(new THREE.BoxGeometry(0.05, 0.05, 1.2), trim, root, W2 - 0.02, 1.65, -0.2);
  for (const s of [-1, 1]) { const c = mk(new THREE.BoxGeometry(0.06, 2.3, 0.35), mat(0x7a2a2a, 0.95), root, W2 - 0.1, 1.55, -0.2 + s * 0.78); }
  // baseboard + chair rail
  mk(new THREE.BoxGeometry(W2 * 2, 0.16, 0.03), mat(0x4a3424, 0.7), root, 0, 0.08, -D2 + 0.015);
  mk(new THREE.BoxGeometry(0.03, 0.16, D2 * 2), mat(0x4a3424, 0.7), root, -W2 + 0.015, 0.08, 0);
  // desk + chair
  const wood = mat(0x5a3a24, 0.55), wood2 = mat(0x6e4a2e, 0.6);
  const desk = new THREE.Group(); desk.position.set(DIMS.room.desk[0], 0, DIMS.room.desk[1]); root.add(desk);
  mk(new THREE.BoxGeometry(1.5, 0.06, 0.75), wood, desk, 0, 0.76, 0);
  mk(new THREE.BoxGeometry(1.5, 0.05, 0.74), mat(0x2f4a2f, 0.9), desk, 0, 0.792, 0);  // green leather top
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.42, 0.73, 0.7), wood2, desk, s * 0.52, 0.365, 0);
  mk(new THREE.BoxGeometry(1.5, 0.35, 0.12), wood, desk, 0, 0.98, -0.33);                        // pigeonhole back
  const paperTex = canvasTex(256, 330, (g, w, h) => {
    g.fillStyle = '#f6efdc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a2a1a'; g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center';
    g.fillText('BY THE PRESIDENT OF THE', w / 2, 36); g.fillText('UNITED STATES OF AMERICA:', w / 2, 56);
    g.font = 'bold 21px Georgia, serif'; g.fillText('A Proclamation.', w / 2, 88);
    g.fillStyle = 'rgba(40,30,20,.55)'; for (let i = 0; i < 11; i++) g.fillRect(26, 108 + i * 16, w - 52 - ((i * 37) % 50), 4);
  });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.39), new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.9 }));
  paper.rotation.x = -PI / 2; paper.position.set(0.05, 0.818, 0.08); desk.add(paper);
  // signature: a dark stroke that the video reveals left→right with setSign(k)
  const sigTex = canvasTex(256, 64, (g, w, h) => { g.strokeStyle = '#1a1410'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(12, 40); g.bezierCurveTo(40, 4, 50, 60, 80, 30); g.bezierCurveTo(100, 14, 120, 50, 150, 34); g.bezierCurveTo(175, 22, 200, 48, 244, 26); g.stroke(); });
  const sig = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), new THREE.MeshBasicMaterial({ map: sigTex, transparent: true, depthWrite: false }));
  sig.rotation.x = -PI / 2; sig.position.set(0.09, 0.82, 0.22); desk.add(sig); sigTex.repeat.set(0.001, 1);
  const setSign = (k) => { sig.visible = k > 0.01; sig.scale.x = Math.max(0.01, k); sig.position.x = 0.09 - 0.1 * (1 - k); sigTex.repeat.set(Math.max(0.001, k), 1); };
  setSign(0);
  const ink = mk(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 12), mat(0x1a1a24, 0.2), desk, 0.45, 0.84, 0.05);
  const books = new THREE.Group(); desk.add(books);
  [0x5a2a1a, 0x2a3a2a, 0x6a4a2a, 0x3a2a3a].forEach((c, i) => { const b = makeBook(c, 0.17, 0.24, 0.05); b.position.set(-0.5, 0.82 + i * 0.05, -0.1 + (i % 2) * 0.02); b.rotation.y = (i % 3) * 0.08; books.add(b); });
  const openBook = makeOpenBook(0x4a2a1a); openBook.position.set(-0.05, 0.82, 0.12); desk.add(openBook); openBook.visible = false;
  // candle (light + flame)
  const candle = new THREE.Group(); candle.position.set(-0.35, 0.82, 0.12); desk.add(candle);
  mk(new THREE.CylinderGeometry(0.05, 0.06, 0.02, 12), mat(0xb08a40, 0.4, { metalness: 0.6 }), candle, 0, 0.01, 0);
  mk(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 10), mat(0xf4ecd8, 0.6), candle, 0, 0.09, 0);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc070).multiplyScalar(4), toneMapped: false }));
  flame.scale.set(1, 2.2, 1); flame.position.y = 0.19; candle.add(flame);
  const candleL = new THREE.PointLight(0xffa850, 0, 6, 1.6); candleL.position.set(-0.35, 1.1, -0.85); root.add(candleL);
  const chair = new THREE.Group(); chair.position.set(DIMS.room.chair[0], 0, DIMS.room.chair[1]); root.add(chair);
  mk(new THREE.BoxGeometry(0.5, 0.06, 0.48), wood, chair, 0, 0.46, 0);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.CylinderGeometry(0.022, 0.022, 0.46, 6), wood, chair, a * 0.21, 0.23, b * 0.2);
  mk(new THREE.BoxGeometry(0.5, 0.6, 0.05), mat(0x6a2a2a, 0.8), chair, 0, 0.8, 0.22);
  chair.rotation.y = PI;
  // rocking chair (the dawn shot puts the hat on its seat)
  const rocker = new THREE.Group(); rocker.position.set(DIMS.room.rocker[0], 0, DIMS.room.rocker[1]); root.add(rocker);
  const rw = mat(0x5a3020, 0.5), uph = mat(0x8a2a2a, 0.85);
  mk(new RoundedBoxGeometry(0.55, 0.1, 0.52, 2, 0.03), uph, rocker, 0, 0.48, 0);
  mk(new RoundedBoxGeometry(0.55, 0.75, 0.08, 2, 0.03), uph, rocker, 0, 0.9, -0.26).rotation.x = -0.18;
  for (const s of [-1, 1]) {
    const r = mk(new THREE.TorusGeometry(0.9, 0.025, 6, 24, 0.8), rw, rocker, s * 0.26, 0.92, 0.05); r.rotation.set(0, PI / 2, -PI / 2 - 0.4);
    mk(new THREE.BoxGeometry(0.05, 0.05, 0.5), rw, rocker, s * 0.3, 0.68, 0);
    for (const z of [-0.2, 0.2]) mk(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), rw, rocker, s * 0.24, 0.27, z);
  }
  rocker.rotation.y = -2.4;
  // flag in a stand (corner), portrait, wall clock, bookcase
  const flag = makeFlag(1.0, 0.62, 2.3, 1); flag.g.position.set(-2.1, 0, -1.65); flag.g.rotation.y = 0.5; root.add(flag.g);
  const portraitTex = canvasTex(200, 260, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h / 2, h * 0.7); gr.addColorStop(0, '#6a5a44'); gr.addColorStop(1, '#2a2018'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8c0a0'; g.beginPath(); g.ellipse(w / 2, h * 0.38, 34, 42, 0, 0, PI * 2); g.fill();
    g.fillStyle = '#eee8dc'; g.beginPath(); g.ellipse(w / 2, h * 0.27, 40, 26, 0, PI, PI * 2); g.fill();
    g.fillStyle = '#1a1a22'; g.beginPath(); g.moveTo(w * 0.2, h); g.quadraticCurveTo(w / 2, h * 0.5, w * 0.8, h); g.fill();
  });
  const portrait = new THREE.Group(); portrait.position.set(-0.9, 1.9, -D2 + 0.03); root.add(portrait);
  mk(new THREE.BoxGeometry(0.62, 0.78, 0.04), mat(0xb08a40, 0.35, { metalness: 0.6 }), portrait);
  mk(new THREE.PlaneGeometry(0.5, 0.66), new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.8 }), portrait, 0, 0, 0.025);
  let clockH = 7, clockM = 22;
  const clockTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f2ead6'; g.beginPath(); g.arc(128, 128, 120, 0, PI * 2); g.fill();
    g.fillStyle = '#2a2018'; g.font = 'bold 26px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) g.fillText(['I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][i - 1], 128 + Math.sin((i * PI) / 6) * 92, 128 - Math.cos((i * PI) / 6) * 92);
  });
  const clock = new THREE.Group(); clock.position.set(1.2, 2.15, -D2 + 0.04); root.add(clock);
  mk(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 28), mat(0x5a3a24, 0.5), clock).rotation.x = PI / 2;
  mk(new THREE.CircleGeometry(0.2, 28), new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.6 }), clock, 0, 0, 0.032);
  const handM = mat(0x111111, 0.4);
  const hourH = new THREE.Group(), minH = new THREE.Group(); hourH.position.z = minH.position.z = 0.036; clock.add(hourH, minH);
  mk(new THREE.BoxGeometry(0.014, 0.1, 0.004), handM, hourH, 0, 0.045, 0); mk(new THREE.BoxGeometry(0.009, 0.15, 0.004), handM, minH, 0, 0.07, 0.002);
  const setClock = (h, m) => { hourH.rotation.z = -((h % 12) + m / 60) * (PI / 6); minH.rotation.z = -m * (PI / 30); };
  setClock(clockH, clockM);
  const shelf = new THREE.Group(); shelf.position.set(-2.3, 0, 0.3); shelf.rotation.y = PI / 2; root.add(shelf);
  mk(new THREE.BoxGeometry(1.2, 2.0, 0.36), wood, shelf, 0, 1.0, 0);
  for (let k = 0; k < 4; k++) for (let i = 0; i < 9; i++) mk(new THREE.BoxGeometry(0.1, 0.32, 0.26), mat([0x5a2a1a, 0x2a3a2a, 0x6a4a2a, 0x3a2a3a, 0x7a5a2a][(i + k) % 5], 0.8), shelf, -0.48 + i * 0.12, 0.3 + k * 0.45, 0.06);
  // light: sun through the window, hemi, candle
  const hemi = new THREE.HemisphereLight(0xfff0dc, 0x4a3424, 0.7); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4); sun.position.set(9, 6.5, 2.5); sun.target.position.set(-0.5, 0.5, -0.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 2, far: 30 });
  root.add(sun, sun.target);
  const outside = mk(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ color: 0xcfe0f0, toneMapped: true }), root, W2 + 1.5, 1.6, -0.2); outside.rotation.y = -PI / 2;
  const MODES = {
    candle: { hemi: 0.18, hemiC: 0x6a7aa0, sun: 0.0, sunC: 0x9fb4e6, candle: 6, out: 0x101828 },
    day: { hemi: 1.05, hemiC: 0xfff0dc, sun: 2.4, sunC: 0xfff0d8, candle: 0, out: 0x9fb4c8 },
    dawn: { hemi: 1.1, hemiC: 0xb8c4e0, sun: 2.6, sunC: 0xd8e0f6, candle: 0, out: 0x8090a8 },
  };
  function setMode(name) {
    const m = MODES[name];
    hemi.intensity = m.hemi; hemi.color.setHex(m.hemiC); sun.intensity = m.sun; sun.color.setHex(m.sunC); candleL.intensity = m.candle;
    flame.visible = m.candle > 0; outside.material.color.setHex(m.out);
  }
  function setWallpaper(c1, c2) { wallM.map = wallTex(c1, c2); wallM.needsUpdate = true; }
  setMode('day');
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  return { root, desk, paper, sig, setSign, ink, books, openBook, candle, chair, rocker, flag, portrait, clock, shelf, setMode, setWallpaper, setClock, lights: { hemi, sun, candle: candleL } };
}

// ---------------------------------------------------------------- SQUARE (debate platform / Gettysburg / victory crowd)
export function buildSquare(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const R = rng(opts.seed ?? 1858);
  const sky = makeSkyDome(0x6fa2d8, 0xf2e2c8, 300); root.add(sky.mesh);
  const grassM = new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7a8a4a'; g.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(60,80,30,.15)' : 'rgba(150,130,80,.12)'; g.fillRect(r() * w, r() * h, 3 + r() * 6, 2 + r() * 4); } }, [40, 40]), roughness: 1 });
  const ground = mk(new THREE.PlaneGeometry(500, 500), grassM, root); ground.rotation.x = -PI / 2;
  const dirtM = mat(0x9a8462, 1);
  const trodden = mk(new THREE.CircleGeometry(9, 32), dirtM, root, 0, 0.01, 4); trodden.rotation.x = -PI / 2; trodden.scale.set(1.3, 1, 1);
  // platform
  const S = DIMS.square, deckY = S.deck;
  const plank = mat(0x9a7a54, 0.85), dark = mat(0x5a4632, 0.9);
  const stage = new THREE.Group(); root.add(stage);
  mk(new THREE.BoxGeometry(S.stage[1] - S.stage[0], 0.1, S.stage[3] - S.stage[2]), plank, stage, 0, deckY - 0.05, (S.stage[2] + S.stage[3]) / 2);
  for (let x = S.stage[0] + 0.2; x <= S.stage[1]; x += 1.15) for (const z of [S.stage[2] + 0.2, S.stage[3] - 0.2]) mk(new THREE.BoxGeometry(0.14, deckY, 0.14), dark, stage, x, deckY / 2, z);
  // bunting: a striped skirt + three swags along the front
  const buntTex = canvasTex(512, 128, (g, w, h) => { const c = ['#b8302f', '#f4efe6', '#2a3a6a']; for (let i = 0; i < 3; i++) { g.fillStyle = c[i]; g.fillRect(0, (i * h) / 3, w, h / 3 + 1); } });
  const skirt = mk(new THREE.PlaneGeometry(S.stage[1] - S.stage[0], deckY), new THREE.MeshStandardMaterial({ map: buntTex, roughness: 0.9, side: THREE.DoubleSide }), stage, 0, deckY / 2, S.stage[3] + 0.01);
  const bunting = new THREE.Group(); stage.add(bunting);
  const buntTex2 = canvasTex(256, 128, (g, w, h) => { const c = ['#2a3a6a', '#f4efe6', '#b8302f']; for (let i = 0; i < 3; i++) { g.fillStyle = c[i]; g.fillRect(0, (i * h) / 3, w, h / 3 + 1); } });
  for (let i = 0; i < 3; i++) {
    const swag = mk(new THREE.CylinderGeometry(1.15, 1.15, 0.45, 20, 1, true, PI / 2 + 0.25, PI - 0.5), new THREE.MeshStandardMaterial({ map: buntTex2, roughness: 0.9, side: THREE.DoubleSide }), bunting, -2.33 + i * 2.33, deckY + 0.68, S.stage[3] + 0.02);
    swag.rotation.set(PI / 2, 0, 0); swag.scale.set(1, 1, 0.35);
  }
  // railing (front)
  for (let x = S.stage[0]; x <= S.stage[1] + 0.01; x += 0.9) mk(new THREE.BoxGeometry(0.06, 0.9, 0.06), dark, stage, x, deckY + 0.45, S.stage[3] - 0.05);
  mk(new THREE.BoxGeometry(S.stage[1] - S.stage[0], 0.06, 0.08), dark, stage, 0, deckY + 0.9, S.stage[3] - 0.05);
  // lectern + chairs on the platform
  const lectern = new THREE.Group(); lectern.position.set(0.0, deckY, S.stage[3] - 0.55); stage.add(lectern);
  mk(new THREE.BoxGeometry(0.5, 1.05, 0.4), dark, lectern, 0, 0.52, 0);
  mk(new THREE.BoxGeometry(0.6, 0.05, 0.5), plank, lectern, 0, 1.07, 0.03).rotation.x = 0.25;
  const chairs = [];
  for (let i = 0; i < 6; i++) { const c = new THREE.Group(); c.position.set(-2.6 + i * 1.04, deckY, S.stage[2] + 1.0); stage.add(c); mk(new THREE.BoxGeometry(0.45, 0.05, 0.45), dark, c, 0, 0.46, 0); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.CylinderGeometry(0.02, 0.02, 0.46, 6), dark, c, a * 0.19, 0.23, b * 0.19); mk(new THREE.BoxGeometry(0.45, 0.5, 0.04), dark, c, 0, 0.72, -0.2); chairs.push(c); }
  // banner between two tall poles
  const banner = new THREE.Group(); root.add(banner);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.06, 0.07, 5.2, 8), dark, banner, s * 3.6, 2.6, S.stage[2] + 0.3);
  const bannerTex = (text) => canvasTex(1024, 160, (g, w, h) => { g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a3a6a'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#8a2a2a'; g.font = 'bold 74px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4); });
  const bannerMesh = mk(new THREE.PlaneGeometry(6.8, 1.06), new THREE.MeshStandardMaterial({ map: bannerTex('LINCOLN  ★  DOUGLAS'), roughness: 0.9, side: THREE.DoubleSide }), banner, 0, 4.4, S.stage[2] + 0.32);
  const setBanner = (text) => { bannerMesh.material.map = bannerTex(text); bannerMesh.material.needsUpdate = true; };
  // flags on the stage corners and around
  const flags = [];
  [[-3.4, S.stage[3]], [3.4, S.stage[3]]].forEach(([x, z], i) => { const f = makeFlag(1.1, 0.66, 2.6, i * 2); f.g.position.set(x, deckY, z); f.g.rotation.y = i ? PI : 0; stage.add(f.g); flags.push(f); });
  // TOWN: brick + clapboard fronts behind the platform and along the sides
  const town = new THREE.Group(); root.add(town);
  const brick = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9a4a34'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(230,210,190,.35)'; for (let y = 0; y < h; y += 16) { g.fillRect(0, y, w, 2); for (let x = (y / 16) % 2 ? 0 : 16; x < w; x += 32) g.fillRect(x, y, 2, 16); } }, [4, 4]);
  const brickM = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.95 }), clapM = [mat(0xe8e0cc, 0.9), mat(0xd8c8a0, 0.9), mat(0xa8b8b0, 0.9)];
  const winM = mat(0x2a2a30, 0.3), shutterM = mat(0x2f4a3a, 0.8);
  const front = (x, z, w, h, ry, m) => {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry; town.add(b);
    mk(new THREE.BoxGeometry(w, h, 6), m, b, 0, h / 2, -3);
    mk(new THREE.BoxGeometry(w + 0.3, 0.3, 0.4), mat(0x5a4a3a, 0.8), b, 0, h, 0.1);
    for (let fy = 1.6; fy < h - 0.8; fy += 2.6) for (let fx = -w / 2 + 1.1; fx < w / 2 - 0.6; fx += 1.6) { mk(new THREE.PlaneGeometry(0.8, 1.3), winM, b, fx, fy, 0.01); for (const s of [-1, 1]) mk(new THREE.PlaneGeometry(0.35, 1.3), shutterM, b, fx + s * 0.6, fy, 0.012); }
  };
  for (let i = 0; i < 6; i++) front(-14 + i * 5.6, -11, 5.4, 6 + (i % 3) * 1.5, 0, i % 2 ? brickM : clapM[i % 3]);
  for (let i = 0; i < 4; i++) { front(-15, -6 + i * 5.6, 5.4, 6.5, PI / 2, i % 2 ? clapM[1] : brickM); front(15, -6 + i * 5.6, 5.4, 6.5, -PI / 2, i % 2 ? brickM : clapM[0]); }
  // church steeple
  const church = new THREE.Group(); church.position.set(9, 0, -16); town.add(church);
  mk(new THREE.BoxGeometry(3, 12, 3), mat(0xf2ede2, 0.85), church, 0, 6, 0); mk(new THREE.ConeGeometry(2.0, 7, 4), mat(0x4a4a52, 0.6), church, 0, 15.5, 0).rotation.y = PI / 4;
  // trees
  const leafM = mat(0x4f8a3a, 0.88), trunkM = mat(0x5e4330, 0.95), trees = new THREE.Group(); root.add(trees);
  for (let i = 0; i < 14; i++) { const x = (i % 2 ? 1 : -1) * (6 + R() * 6), z = -8 + R() * 18; const tr = makeTree('oak', leafM, R, trunkM, 1.0 + R() * 0.5); tr.t.position.set(x, 0, z); trees.add(tr.t); }
  // CEMETERY (Gettysburg): rolling hills, rows of small white headstones, autumn trees, rail fence
  const cemetery = new THREE.Group(); root.add(cemetery);
  for (let k = 0; k < 5; k++) { const hill = mk(new THREE.SphereGeometry(60, 32, 12, 0, PI * 2, 0, 0.3), grassM, cemetery, -80 + k * 45, -57.5, -90 - (k % 2) * 25); }
  const stoneM = mat(0xe8e4d8, 0.8);
  for (let r = 0; r < 6; r++) for (let i = 0; i < 22; i++) { const a = -0.9 + i * 0.085; const rr = 14 + r * 1.6; mk(new RoundedBoxGeometry(0.4, 0.5, 0.12, 2, 0.04), stoneM, cemetery, Math.sin(a) * rr - 2, 0.25, -Math.cos(a) * rr + 2); }
  cemetery.add(makeRailFence(-20, -6, 20, -8, mat(0x8a7558, 0.95)));
  // DOME: the Capitol far away (victory shot)
  const dome = new THREE.Group(); dome.position.set(-30, 0, -140); root.add(dome);
  const domeM = mat(0xf4f0e6, 0.7);
  mk(new THREE.BoxGeometry(90, 18, 24), domeM, dome, 0, 9, 0);
  mk(new THREE.CylinderGeometry(14, 15, 14, 32), domeM, dome, 0, 25, 0);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * PI * 2; mk(new THREE.CylinderGeometry(0.5, 0.5, 12, 8), mat(0xffffff, 0.6), dome, Math.sin(a) * 15.5, 24, Math.cos(a) * 15.5); }
  const cup = mk(new THREE.SphereGeometry(13, 32, 16, 0, PI * 2, 0, PI / 2), domeM, dome, 0, 32, 0); cup.scale.set(1, 1.25, 1);
  mk(new THREE.CylinderGeometry(2, 2.3, 6, 16), domeM, dome, 0, 50, 0); mk(new THREE.ConeGeometry(1.6, 4, 12), domeM, dome, 0, 55, 0);
  // lights
  const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x5a4a30, 1.0); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.5); sun.position.set(-14, 22, 26); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 5, far: 90 });
  root.add(sun, sun.target);
  const fog = new THREE.Fog(0xe2e0d4, 40, 260);
  const MODES = {
    summer: { leaf: 0x4f8a3a, grass: 0xffffff, sky: [0x6fa2d8, 0xf2e2c8], sun: 0xfff0d8, sunI: 2.5, hemi: 1.0, fog: 0xe2e0d4 },
    autumn: { leaf: 0xc8702c, grass: 0xd8c8a0, sky: [0x8aa0c0, 0xe8d8c0], sun: 0xffe2c0, sunI: 2.1, hemi: 0.95, fog: 0xd8d4c8 },
    spring: { leaf: 0x86c25a, grass: 0xf0ffe0, sky: [0x5f9ad8, 0xf4e8d4], sun: 0xfff4e0, sunI: 2.7, hemi: 1.1, fog: 0xe4e8e0 },
  };
  function setMode(name) {
    const m = MODES[name];
    leafM.color.setHex(m.leaf); grassM.color.setHex(m.grass); sky.setColors(m.sky[0], m.sky[1]);
    sun.color.setHex(m.sun); sun.intensity = m.sunI; hemi.intensity = m.hemi; fog.color.setHex(m.fog);
  }
  function setDress({ town: tw = true, cemetery: cm = false, dome: dm = false, banner: bn = true, bunting: bt = true } = {}) {
    town.visible = tw; cemetery.visible = cm; dome.visible = dm; banner.visible = bn; bunting.visible = bt; skirt.visible = bt;
  }
  const update = (t) => flags.forEach((f) => f.update(t));
  setMode('summer'); setDress({});
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  return { root, sky, fog, stage, lectern, chairs, flags, banner, setBanner, town, cemetery, dome, trees, setMode, setDress, update, lights: { hemi, sun } };
}

// ---------------------------------------------------------------- BATTLEFIELD
export function buildBattlefield(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const R = rng(opts.seed ?? 1861);
  const sky = makeSkyDome(0x3a3a5a, 0xe8905a, 320); root.add(sky.mesh);
  const geo = new THREE.PlaneGeometry(600, 600, 120, 120);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); const z = -y; // plane is rotated: local y -> world -z
    const h = 1.6 * Math.sin(x * 0.03) * Math.cos(z * 0.025) + (z < -40 ? Math.min(14, (-z - 40) * 0.12) : 0) - (Math.abs(z) < 6 && Math.abs(x) < 12 ? 0 : 0);
    pos.setZ(i, h); }
  geo.computeVertexNormals();
  const fieldM = new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7a7a44'; g.fillRect(0, 0, w, h); const r = rng(8); for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(70,70,30,.18)' : 'rgba(170,150,90,.15)'; g.fillRect(r() * w, r() * h, 3 + r() * 6, 2 + r() * 4); } }, [50, 50]), roughness: 1 });
  const ground = mk(geo, fieldM, root); ground.rotation.x = -PI / 2;
  const heightAt = (x, z) => 1.6 * Math.sin(x * 0.03) * Math.cos(z * 0.025) + (z < -40 ? Math.min(14, (-z - 40) * 0.12) : 0);
  // cannons on the near ridge (z≈0), pointing -z
  const cannons = [];
  for (let i = 0; i < 4; i++) { const c = makeCannon(); const x = -6 + i * 4; c.g.position.set(x, heightAt(x, 0), 0); c.g.rotation.y = PI; root.add(c.g); cannons.push({ ...c, x, base: c.g.position.clone() }); }
  root.add(makeRailFence(-30, 6, 30, 5, mat(0x7a6a50, 0.95)));
  const leafM = mat(0x4a6a34, 0.9), trunkM = mat(0x4e3a2a, 0.95);
  for (let i = 0; i < 50; i++) { const x = -150 + R() * 300, z = -60 - R() * 80; const tr = makeTree('oak', leafM, R, trunkM, 1.4 + R()); tr.t.position.set(x, heightAt(x, z), z); root.add(tr.t); }
  for (let i = 0; i < 16; i++) { const x = (i % 2 ? 1 : -1) * (18 + R() * 30), z = -10 + R() * 30; const tr = makeTree('oak', leafM, R, trunkM, 1.2 + R() * 0.6); tr.t.position.set(x, heightAt(x, z), z); root.add(tr.t); }
  // smoke: big soft spheres (instanced), drifting; muzzle puffs get emitted by fire()
  const SMK = 90, smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: 0xb0a898, roughness: 1, transparent: true, opacity: 0.32, depthWrite: false }), SMK);
  smoke.frustumCulled = false; root.add(smoke);
  const haze = [];
  for (let i = 0; i < 26; i++) { const m = mk(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc8b8a8, roughness: 1, transparent: true, opacity: 0.28, depthWrite: false }), root, -60 + R() * 120, 2 + R() * 4, -20 - R() * 40); m.scale.set(8 + R() * 8, 3 + R() * 2, 6); m.castShadow = false; haze.push({ m, x: m.position.x, k: R() }); }
  const hemi = new THREE.HemisphereLight(0xb8a0c0, 0x4a3a28, 0.75); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xff9a5c, 2.0); sun.position.set(-20, 8, -50); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 5, far: 140 });
  root.add(sun, sun.target);
  const flashL = new THREE.PointLight(0xffb060, 0, 30, 1.5); root.add(flashL);
  const fog = new THREE.Fog(0xd89a70, 30, 220);
  const SR = rng(99), sSeeds = Array.from({ length: SMK }, () => [SR(), SR(), SR(), SR()]);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  function update(t, shots = []) {
    let flash = 0;
    cannons.forEach((c) => { c.g.position.copy(c.base); c.flash.visible = false; });
    shots.forEach(([ts, ci]) => {
      const c = cannons[ci], age = t - ts;
      if (age < 0) return;
      const rec = age < 0.6 ? Math.sin(Math.min(1, age / 0.08) * PI / 2) * (1 - age / 0.6) : 0;
      c.g.position.z = c.base.z + rec * 0.45;
      if (age < 0.12) { c.flash.visible = true; c.flash.scale.setScalar(1 + age * 10); flash = Math.max(flash, 1 - age / 0.12); flashL.position.set(c.x, 2, -2); }
    });
    flashL.intensity = 22 * flash;
    sSeeds.forEach((s, i) => {
      const si = i % Math.max(1, shots.length); const sh = shots[si];
      if (!sh || t < sh[0]) { M4.makeScale(0, 0, 0); smoke.setMatrixAt(i, M4); return; }
      const c = cannons[sh[1]], age = t - sh[0];
      V.set(c.x + (s[0] - 0.5) * (0.6 + age * 1.6) + age * 0.6, c.base.y + 0.9 + age * (0.35 + s[2] * 0.4), -1.6 - age * (1.2 + s[1] * 1.5) - s[3] * 1.4);
      const r = Math.min(1.4, 0.3 + age * (0.3 + s[2] * 0.25)); Sc.set(r, r * 0.8, r); M4.compose(V, Q.identity(), Sc); smoke.setMatrixAt(i, M4);
    });
    smoke.instanceMatrix.needsUpdate = true;
    haze.forEach((h) => { h.m.position.x = h.x + t * (0.6 + h.k); });
  }
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  ground.receiveShadow = true;
  return { root, sky, fog, cannons, heightAt, update, lights: { hemi, sun, flashL } };
}

// ---------------------------------------------------------------- THEATRE
export function buildTheatre(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const R = rng(opts.seed ?? 1865);
  const SY = DIMS.theatre.stage, WX = 5.2, HZ = 12, H = 9;
  const wallM = mat(0x5a2a26, 0.9), goldM = mat(0xc9a050, 0.35, { metalness: 0.6 }), creamM = mat(0xe8dcc4, 0.8), redM = mat(0x8a1e1e, 0.9);
  // stage
  mk(new THREE.BoxGeometry(WX * 2, SY, 7), new THREE.MeshStandardMaterial({ map: floorTex('#6a4a2c'), roughness: 0.7 }), root, 0, SY / 2, -3.5);
  // backdrop (painted garden) + wings
  const drop = canvasTex(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7a9ab8'); gr.addColorStop(0.6, '#d8c8a0'); gr.addColorStop(1, '#5a7a4a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${40 + r() * 40},${80 + r() * 50},${40 + r() * 30},.9)`; g.beginPath(); g.arc(r() * w, h * 0.55 + r() * h * 0.2, 40 + r() * 60, 0, PI * 2); g.fill(); } g.fillStyle = '#e8e0d0'; g.fillRect(w * 0.42, h * 0.38, w * 0.16, h * 0.34); });
  mk(new THREE.PlaneGeometry(WX * 2, H - SY), new THREE.MeshStandardMaterial({ map: drop, roughness: 0.95 }), root, 0, SY + (H - SY) / 2, -6.9);
  // proscenium arch with red curtains
  const pro = new THREE.Group(); root.add(pro);
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(1.0, H, 0.5), creamM, pro, s * (WX - 0.4), H / 2, 0);
  mk(new THREE.BoxGeometry(WX * 2, 1.4, 0.5), creamM, pro, 0, H - 0.7, 0);
  mk(new THREE.BoxGeometry(WX * 2 - 1.6, 0.12, 0.55), goldM, pro, 0, H - 1.45, 0.02);
  const curtM = new THREE.MeshStandardMaterial({ color: 0x8a1e1e, roughness: 0.85, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, H - 1.5 - SY, 16, 1, true, 0, PI), curtM); c.scale.set(1.2, 1, 0.35); c.position.set(s * (WX - 1.6), SY + (H - 1.5 - SY) / 2, -0.4); root.add(c); }
  const valance = new THREE.Mesh(new THREE.BoxGeometry(WX * 2 - 1.6, 0.8, 0.2), curtM); valance.position.set(0, H - 1.9, -0.35); root.add(valance);
  // footlights
  const footM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd090).multiplyScalar(2), toneMapped: false });
  for (let x = -WX + 1.2; x <= WX - 1.2; x += 0.6) mk(new THREE.SphereGeometry(0.05, 8, 6), footM, root, x, SY + 0.05, -0.15).castShadow = false;
  const foot = new THREE.PointLight(0xffc880, 6, 9, 1.6); foot.position.set(0, SY + 0.4, -0.6); root.add(foot);
  // house: side walls, back wall, ceiling, floor, rows of seats with audience heads (instanced)
  mk(new THREE.PlaneGeometry(WX * 2, HZ), mat(0x3a2418, 0.9), root, 0, 0, HZ / 2).rotation.x = -PI / 2;
  for (const s of [-1, 1]) { const w = mk(new THREE.PlaneGeometry(HZ, H), wallM, root, s * WX, H / 2, HZ / 2); w.rotation.y = -s * PI / 2; }
  mk(new THREE.PlaneGeometry(WX * 2, H), wallM, root, 0, H / 2, HZ).rotation.y = PI;
  const ceil = mk(new THREE.PlaneGeometry(WX * 2, HZ + 7), mat(0x6a4a3a, 0.9, { side: THREE.DoubleSide }), root, 0, H, HZ / 2 - 3.5); ceil.rotation.x = PI / 2;
  // dress circle balcony along the back + gas lamps
  mk(new THREE.BoxGeometry(WX * 2, 0.5, 3), creamM, root, 0, 3.2, HZ - 1.5);
  mk(new THREE.BoxGeometry(WX * 2, 0.9, 0.1), goldM, root, 0, 3.75, HZ - 3.0);
  const lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd8a0).multiplyScalar(1.8), toneMapped: false });
  for (const s of [-1, 1]) for (const z of [5, 8.5]) { mk(new THREE.SphereGeometry(0.14, 10, 8), lampM, root, s * (WX - 0.2), 2.6, z).castShadow = false; }
  const houseL = new THREE.PointLight(0xffc890, 8, 16, 1.6); houseL.position.set(0, 5.5, 6); root.add(houseL);
  // audience: rows of seat backs + heads
  const seatM = mat(0x5a1a1a, 0.8);
  const HEADS = 60, heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 10, 8), mat(0x2a2018, 0.8), HEADS), bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.17, 0.25, 4, 8), mat(0x1e1e24, 0.9), HEADS);
  let hi = 0; const M4 = new THREE.Matrix4();
  for (let r = 0; r < 7; r++) for (let i = 0; i < 12; i++) {
    const x = -3.6 + i * 0.66 + (r % 2) * 0.2, z = 1.6 + r * 1.0, y = 0.0 + r * 0.12;
    mk(new THREE.BoxGeometry(0.55, 0.85, 0.08), seatM, root, x, y + 0.42, z + 0.25);
    if (hi < HEADS && R() < 0.75) { M4.makeTranslation(x, y + 0.82, z); bodies.setMatrixAt(hi, M4); M4.makeTranslation(x, y + 1.18, z); heads.setMatrixAt(hi, M4); hi++; }
  }
  heads.count = bodies.count = hi; root.add(heads, bodies);
  // the presidential box on the east wall
  const B = DIMS.theatre.box, box = new THREE.Group(); box.position.set(B[0], B[1], B[2]); root.add(box);
  mk(new THREE.BoxGeometry(1.8, 0.2, 2.4), creamM, box, 0.0, -0.1, 0);                              // floor slab
  mk(new THREE.BoxGeometry(0.1, 2.6, 2.4), wallM, box, 0.92, 1.3, 0);                                 // back wall (on the house wall)
  const partitions = [-1, 1].map((s) => mk(new THREE.BoxGeometry(1.8, 2.6, 0.08), wallM, box, 0, 1.3, s * 1.2));    // side partitions ([0] = stage side; hide it to film into the box from the stage)
  mk(new THREE.BoxGeometry(1.8, 0.15, 2.4), creamM, box, 0, 2.6, 0);
  const rail = mk(new THREE.BoxGeometry(0.12, 0.9, 2.4), creamM, box, -0.9, 0.35, 0);                 // front parapet
  mk(new THREE.BoxGeometry(0.14, 0.08, 2.44), goldM, box, -0.9, 0.82, 0);
  const posts = [-1, 1].map((s) => mk(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 10), goldM, box, -0.9, 1.3, s * 1.18));   // [0] = stage side
  // draped flags on the parapet + Washington's portrait at its center
  const flagTex = usFlagTexture(512, 300);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.0, 16, 1, true, PI, PI), new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.9, side: THREE.DoubleSide })); f.rotation.set(0, 0, PI / 2); f.scale.set(1, 1, 0.3); f.rotation.order = 'ZYX'; f.position.set(-0.98, 0.2, s * 0.62); box.add(f); f.rotation.y = 0; }
  const wTex = canvasTex(160, 200, (g, w, h) => { g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8c0a0'; g.beginPath(); g.ellipse(w / 2, h * 0.4, 30, 38, 0, 0, PI * 2); g.fill(); g.fillStyle = '#f4f0ea'; g.beginPath(); g.ellipse(w / 2, h * 0.27, 34, 22, 0, PI, PI * 2); g.fill(); g.fillStyle = '#1a1a22'; g.beginPath(); g.moveTo(w * 0.15, h); g.quadraticCurveTo(w / 2, h * 0.52, w * 0.85, h); g.fill(); });
  const port = new THREE.Group(); port.position.set(-0.99, 0.35, 0); port.rotation.y = -PI / 2; box.add(port);
  mk(new THREE.BoxGeometry(0.44, 0.54, 0.04), goldM, port); mk(new THREE.PlaneGeometry(0.36, 0.46), new THREE.MeshStandardMaterial({ map: wTex, roughness: 0.8 }), port, 0, 0, 0.025);
  // box door at the back (where the shadow appears)
  const doorway = mk(new THREE.PlaneGeometry(0.8, 2.0), new THREE.MeshBasicMaterial({ color: 0x8a6040 }), box, 0.86, 1.0, -0.95);   // dim lit corridor so a silhouette reads in it doorway.rotation.y = -PI / 2;
  const boxL = new THREE.PointLight(0xffc890, 3.5, 5, 1.6); boxL.position.set(B[0] - 0.4, B[1] + 2.1, B[2]); root.add(boxL);
  // rocking chair in the box
  const rocker = new THREE.Group(); box.add(rocker); rocker.position.set(0.1, 0, -0.45);
  const uph = mat(0x8a2a2a, 0.85), rw = mat(0x4a2818, 0.5);
  mk(new RoundedBoxGeometry(0.55, 0.1, 0.52, 2, 0.03), uph, rocker, 0, 0.48, 0);
  mk(new RoundedBoxGeometry(0.55, 0.62, 0.08, 2, 0.03), uph, rocker, 0.27, 0.82, 0).rotation.set(0, PI / 2, 0.18);
  // a plain side chair for the second guest (Mary) — seat 0.45
  const chair2 = new THREE.Group(); box.add(chair2); chair2.position.set(-0.15, 0, 0.35);
  mk(new THREE.BoxGeometry(0.46, 0.06, 0.46), uph, chair2, 0, 0.45, 0);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.CylinderGeometry(0.022, 0.022, 0.45, 6), rw, chair2, a * 0.19, 0.225, b * 0.19);
  mk(new THREE.BoxGeometry(0.06, 0.55, 0.46), uph, chair2, 0.21, 0.75, 0);
  // muzzle flash (sphere + light) and a smoke puff, posed by the video
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe0a0).multiplyScalar(5), toneMapped: false, transparent: true, depthWrite: false }));
  flash.visible = false; root.add(flash);
  const flashL = new THREE.PointLight(0xffd090, 0, 9, 1.3); root.add(flashL);
  const puff = new THREE.Group(); root.add(puff);
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0xbdb6aa, roughness: 1, transparent: true, opacity: 0.6, depthWrite: false })); m.userData.d = [Math.sin(i * 2.1) * 0.08, 0.03 + i * 0.02, Math.cos(i * 1.7) * 0.08]; puff.add(m); }
  puff.visible = false;
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  const hemi = new THREE.HemisphereLight(0xffd8b0, 0x2a1810, 0.35); root.add(hemi);
  /** fire(pos, age): pos = world muzzle position, age = seconds since the shot (<0 = not yet). */
  function setShot(pos, age) {
    flash.visible = age >= 0 && age < 0.1; flashL.intensity = age >= 0 && age < 0.14 ? 16 * (1 - age / 0.14) : 0;
    if (pos) { flash.position.copy(pos); flashL.position.copy(pos); puff.position.copy(pos); }
    flash.scale.setScalar(1 + Math.max(0, age) * 8);
    puff.visible = age >= 0 && age < 2.5;
    puff.children.forEach((m) => { const k = Math.max(0, age); m.position.set(m.userData.d[0] * (1 + k * 3), m.userData.d[1] + k * 0.12, m.userData.d[2] * (1 + k * 3)); m.scale.setScalar(1 + k * 2.2); m.material.opacity = 0.55 * Math.max(0, 1 - k / 2.5); });
  }
  setShot(null, -1);
  return { root, box, rocker, chair2, doorway, portrait: port, partitions, posts, setShot, lights: { hemi, foot, houseL, boxL, flashL } };
}

// ---------------------------------------------------------------- MEMORIAL
export function buildMemorial(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const marble = mat(0xece6da, 0.55), marble2 = mat(0xe0d8c8, 0.6);
  const sky = makeSkyDome(0x5a7ab0, 0xf4c890, 320); root.add(sky.mesh);
  const ground = mk(new THREE.PlaneGeometry(600, 600), mat(0x7a8a5a, 1), root); ground.rotation.x = -PI / 2;
  // base: a platform (top y = FY, z∈[-10.5, 7.5]) and a wide staircase down toward +z
  const steps = 12, rise = 0.3, FY = steps * rise;
  mk(new THREE.BoxGeometry(27, FY, 18), marble2, root, 0, FY / 2, -1.5);
  for (let i = 0; i < steps; i++) { const h = rise * (steps - i); mk(new THREE.BoxGeometry(16, h, 0.5), i % 2 ? marble : marble2, root, 0, h / 2, 7.75 + i * 0.5); }
  // colonnade: 8 columns across the front (z=4), 4 deep on each side
  const colG = new THREE.CylinderGeometry(0.62, 0.72, 13, 20);
  const cols = new THREE.Group(); root.add(cols);
  for (let i = 0; i < 8; i++) mk(colG, marble, cols, -11.2 + i * 3.2, FY + 6.5, 6.0);
  for (const s of [-1, 1]) for (let k = 1; k < 5; k++) mk(colG, marble, cols, s * 11.2, FY + 6.5, 6.0 - k * 3.4);
  mk(new THREE.BoxGeometry(26, 2.4, 18), marble, root, 0, FY + 14.2, -1.5);                          // entablature / attic
  mk(new THREE.BoxGeometry(24, 1.6, 16), marble2, root, 0, FY + 16.2, -1.5);
  const frieze = canvasTex(1024, 64, (g, w, h) => { g.fillStyle = '#e0d8c8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8b0a0'; for (let i = 0; i < 36; i++) g.fillRect(14 + i * 28, 14, 16, 36); });
  mk(new THREE.PlaneGeometry(26, 1.2), new THREE.MeshStandardMaterial({ map: frieze, roughness: 0.6 }), root, 0, FY + 14.2, 7.51);
  // inner chamber: back + side walls, ceiling
  mk(new THREE.BoxGeometry(20, 13, 0.6), marble2, root, 0, FY + 6.5, -8.5);
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.6, 13, 13), marble2, root, s * 9.5, FY + 6.5, -2.4);
  mk(new THREE.BoxGeometry(20, 0.5, 15), marble2, root, 0, FY + 13.2, -1.5);
  // pedestal (top y = FY+3.0, the statue's feet) + a chair under the statue (seat top FY+5.35 for a 5.2× figure at z=-5.6)
  const throne = new THREE.Group(); throne.position.set(0, FY, -5.6); root.add(throne);
  mk(new THREE.BoxGeometry(6.6, 3.0, 6.4), marble2, throne, 0, 1.5, -0.4);
  mk(new THREE.BoxGeometry(4.6, 2.15, 3.6), marble, throne, 0, 3.0 + 1.075, -0.5);
  mk(new THREE.BoxGeometry(4.6, 5.2, 0.7), marble, throne, 0, 3.0 + 2.6 + 1.6, -2.3);
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.7, 3.4, 3.2), marble, throne, s * 2.0, 3.0 + 1.7, -0.9);
  // reflecting pool in front (toward +z) + Washington Monument far away
  const pool = mk(new THREE.PlaneGeometry(14, 120), new THREE.MeshStandardMaterial({ color: 0x8aa0c0, roughness: 0.08, metalness: 0.6 }), root, 0, 0.03, 80); pool.rotation.x = -PI / 2;
  const obelisk = mk(new THREE.CylinderGeometry(3, 5, 120, 4), mat(0xf0e8dc, 0.6), root, 0, 60, 260); obelisk.rotation.y = PI / 4;
  // lights: golden hour from the front (east), soft hemi; a spot on the statue face
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x8a7a5a, 0.9); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd0a0, 2.6); sun.position.set(10, 18, 40); sun.target.position.set(0, FY + 4, -4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 5, far: 120 });
  root.add(sun, sun.target);
  const spot = new THREE.SpotLight(0xfff0dc, 60, 30, 0.5, 0.6, 1.4); spot.position.set(0, FY + 12, 2); spot.target.position.set(0, FY + 6, -5); root.add(spot, spot.target);
  const fog = new THREE.Fog(0xf0d8b8, 60, 380);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  return { root, sky, fog, floorY: FY, throne, marble, lights: { hemi, sun, spot } };
}
