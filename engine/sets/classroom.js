// SET: kindergarten classroom ("Room 4") on a sunny morning. 6×4 = 24 small desks + chairs, chalkboard, teacher's desk,
// a wall of windows (seasonal schoolyard outside), and a door to a bright hallway. Built for video 003.
//
// Coordinates (meters, y up). Room x∈[-3.5,3.5], z∈[-3,3], ceiling 3.0.
//   Front wall (z=-3): chalkboard. Kids sit facing -z.
//   Right wall (x=+3.5): 3 windows, y∈[0.9,2.4]; the sun comes in through them (warm, low, from +x).
//   Left wall (x=-3.5): door opening z∈[1.6,2.5] (hinge at z=2.5; setDoor(θ) swings it into the room, 1.8 = flat against the back wall,
//   so the opening stays clear for the camera). People walking in should stay at z < 2.4 near the door.
//   Desks: DIMS.desks[i] = {x, z} (desk center), chair at z + 0.36. Teacher's desk front-left.
//   Hallway: x∈[-5.2,-3.6], self-lit.
// Handles: setDoor, setChairsUp(bool), setSeason('autumn'|'winter'|'spring'|'summer', t), setClock(h, m), setBoard(text),
//          setAbandoned(0..1) (dimmer, cooler light, no ceiling lights), updateDust(t).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng, clamp } from '@engine/core.js';
import { makeWeather } from '@engine/sky.js';

const COLS = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5], ROWS = [-1.1, -0.2, 0.7, 1.6];
export const DIMS = {
  room: { x0: -3.5, x1: 3.5, z0: -3, z1: 3, h: 3.0 },
  door: { x: -3.5, z0: 1.6, z1: 2.5, h: 2.1 },
  windows: [-1.9, 0, 1.9].map((z) => ({ z0: z - 0.75, z1: z + 0.75, y0: 0.9, y1: 2.4 })),
  desk: { w: 0.62, d: 0.44, h: 0.52 },
  chair: { seat: 0.31, dz: 0.36 },
  desks: ROWS.flatMap((z) => COLS.map((x) => ({ x, z }))), // row-major, front row first
  cols: COLS, rows: ROWS,
  teacherDesk: { x: -2.3, z: -2.25, w: 1.3, d: 0.7, h: 0.76 },
  board: { x: 0.3, y: 1.55, w: 3.6, h: 1.2 },
  doorway: [-3.85, 2.05],           // just outside the threshold, in the hallway
  front: [-0.4, -2.35],             // where the teacher stands to take attendance
};

// ---------------------------------------------------------------- textures
function floorTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const n = 8, s = w / n, R = rng(4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const l = 82 + R() * 4; g.fillStyle = (x + y) % 2 ? `hsl(40,22%,${l}%)` : `hsl(28,30%,${l - 10}%)`; g.fillRect(x * s, y * s, s, s);
    }
    g.strokeStyle = 'rgba(80,60,40,.12)'; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  }, [3.5, 3]);
}
function boardTex(text) {
  return canvasTex(1440, 480, (g, w, h) => {
    g.fillStyle = '#2f4a3d'; g.fillRect(0, 0, w, h);
    const R = rng(9);
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + R() * 0.04})`; g.beginPath(); g.ellipse(R() * w, R() * h, 60 + R() * 140, 14 + R() * 30, R() * 3, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(245,245,235,.92)'; g.font = 'italic 64px Georgia, serif'; g.textAlign = 'left';
    (text || '').split('\n').forEach((line, i) => g.fillText(line, 70, 120 + i * 92));
  });
}
function alphabetTex() {
  return canvasTex(2048, 128, (g, w, h) => {
    const cols = ['#e2574c', '#f2b632', '#4f9bd9', '#58b368', '#a77bd1', '#f08a4b'];
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 26; i++) {
      const x = (i * w) / 26; g.fillStyle = i % 2 ? '#fff6e2' : '#fdeccc'; g.fillRect(x, 0, w / 26, h);
      g.fillStyle = cols[i % cols.length]; g.font = 'bold 76px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.fillText(L[i] + L[i].toLowerCase(), x + w / 52, 92);
    }
  });
}
function signTex(text, bg = '#fff6e2', fg = '#3a3a3a', size = 70) {
  return canvasTex(512, 160, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `bold ${size}px Helvetica, Arial, sans-serif`; g.textAlign = 'center'; g.fillText(text, w / 2, h / 2 + size * 0.36); });
}
function drawingTex(seed) {
  return canvasTex(256, 200, (g, w, h) => {
    const R = rng(seed); g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h); g.lineWidth = 7; g.lineCap = 'round';
    g.fillStyle = '#f2b632'; g.beginPath(); g.arc(w * 0.8, h * 0.2, 22, 0, 7); g.fill();
    g.fillStyle = '#58b368'; g.fillRect(0, h * 0.8, w, h * 0.2);
    ['#e2574c', '#4f9bd9', '#a77bd1'].forEach((c) => { g.strokeStyle = c; g.beginPath(); g.moveTo(R() * w, R() * h * 0.7); for (let k = 0; k < 3; k++) g.quadraticCurveTo(R() * w, R() * h * 0.8, R() * w, R() * h * 0.8); g.stroke(); });
    const x = w * (0.3 + R() * 0.3); g.strokeStyle = '#333'; g.lineWidth = 5; g.beginPath(); g.arc(x, h * 0.42, 16, 0, 7); g.moveTo(x, h * 0.5); g.lineTo(x, h * 0.72); g.moveTo(x - 20, h * 0.58); g.lineTo(x + 20, h * 0.58); g.stroke();
  });
}
const NAMES = ['MAYA', 'LEO', 'AVA', 'NOAH', 'ZOE', 'ELI', 'MIA', 'SAM', 'LILY', 'OWEN', 'NORA', 'JUDE', 'ROSA', 'FINN', 'IVY', 'MILO', 'ANA', 'KAI', 'JUNE', 'BEN', 'LUNA', 'MAX', 'ELLA', 'TEO'];
export { NAMES };

/** Daytime schoolyard seen through the windows, per season. */
function yardTex(season) {
  const S = {
    autumn: { top: '#7fb0d8', bot: '#d9e6ee', grass: '#9a9a52', tree: ['#d9772f', '#e8a23a', '#b8502a'] },
    winter: { top: '#a9bccd', bot: '#e3e8ee', grass: '#eef2f7', tree: ['#e9eef4', '#d5dde6', '#c3ccd6'], snow: 1 },
    spring: { top: '#6fb0e6', bot: '#d6ecf7', grass: '#7cc06a', tree: ['#f2b8c8', '#f7d0dc', '#9ccf7d'] },
    summer: { top: '#5aa6e8', bot: '#cfe8f6', grass: '#6bb85a', tree: ['#4f9a48', '#62ad55', '#3f8a3f'] },
  }[season];
  return canvasTex(1600, 900, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h * 0.7); grd.addColorStop(0, S.top); grd.addColorStop(1, S.bot); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const R = rng(3);
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 7; i++) { const x = R() * w, y = 60 + R() * 200; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + k * 40, y + (k % 2) * 10, 60, 28, 0, 0, 7); g.fill(); } }
    // far houses
    g.fillStyle = season === 'winter' ? '#9aa6b6' : '#a7b3a2';
    for (let x = 0; x < w; x += 150 + R() * 60) { const hh = 50 + R() * 50; g.fillRect(x, h * 0.6 - hh, 120, hh + 10); g.beginPath(); g.moveTo(x - 10, h * 0.6 - hh); g.lineTo(x + 60, h * 0.6 - hh - 40); g.lineTo(x + 130, h * 0.6 - hh); g.fill(); }
    // ground
    g.fillStyle = S.grass; g.fillRect(0, h * 0.6, w, h * 0.4);
    // trees
    for (let i = 0; i < 9; i++) {
      const x = (i + 0.3 + R() * 0.4) * (w / 9), y = h * (0.56 + R() * 0.06), s = 70 + R() * 50;
      g.fillStyle = '#6b4a35'; g.fillRect(x - 8, y, 16, s * 1.1);
      if (season === 'winter') { g.strokeStyle = '#6b4a35'; g.lineWidth = 5; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x, y + 20); g.lineTo(x + (R() - 0.5) * s * 1.6, y - s * (0.4 + R() * 0.6)); g.stroke(); } }
      for (let k = 0; k < 6; k++) { g.fillStyle = S.tree[k % 3]; g.globalAlpha = season === 'winter' ? 0.55 : 1; g.beginPath(); g.arc(x + (R() - 0.5) * s, y - s * 0.3 + (R() - 0.5) * s * 0.6, s * (0.35 + R() * 0.25), 0, 7); g.fill(); g.globalAlpha = 1; }
    }
    // playground: swing set + slide + fence
    g.strokeStyle = '#d24b3c'; g.lineWidth = 12;
    const sx = w * 0.3, sy = h * 0.83;
    g.beginPath(); g.moveTo(sx - 160, sy); g.lineTo(sx - 120, sy - 210); g.lineTo(sx - 80, sy); g.moveTo(sx + 160, sy); g.lineTo(sx + 120, sy - 210); g.lineTo(sx + 80, sy); g.moveTo(sx - 125, sy - 205); g.lineTo(sx + 125, sy - 205); g.stroke();
    g.strokeStyle = '#555'; g.lineWidth = 3;
    for (const dx of [-60, 40]) { g.beginPath(); g.moveTo(sx + dx, sy - 205); g.lineTo(sx + dx, sy - 70); g.moveTo(sx + dx + 34, sy - 205); g.lineTo(sx + dx + 34, sy - 70); g.stroke(); g.fillStyle = '#333'; g.fillRect(sx + dx - 6, sy - 72, 46, 9); }
    g.fillStyle = '#f2b632'; const lx = w * 0.68; g.beginPath(); g.moveTo(lx, sy - 170); g.lineTo(lx + 30, sy - 170); g.lineTo(lx + 210, sy); g.lineTo(lx + 160, sy); g.fill();
    g.fillStyle = '#4f7fb8'; g.fillRect(lx - 20, sy - 175, 26, 175); g.fillRect(lx - 60, sy - 175, 26, 175);
    g.fillStyle = '#e8e2d2'; for (let x = 0; x < w; x += 46) g.fillRect(x, h * 0.9, 10, 60); g.fillRect(0, h * 0.91, w, 8);
    if (S.snow) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, sy - 4, w, 10); }
  });
}

export function buildClassroom(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const D = DIMS, Rm = D.room;
  const wallMat = mat(opts.wallColor ?? 0xe9dcc0, 0.95), lowWall = mat(0x9cc1b8, 0.9), trimMat = mat(0xf1ece0, 0.6);
  const woodMat = mat(0xc89a66, 0.55), metal = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.4, metalness: 0.6 });
  const box = (w, h, d, m, x, y, z, parent = root) => mk(new THREE.BoxGeometry(w, h, d), m, parent, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, parent = root) => mk(new RoundedBoxGeometry(w, h, d, 3, r), m, parent, x, y, z);
  const plane = (w, h, material, x, y, z, ry = 0, parent = root) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); p.position.set(x, y, z); p.rotation.y = ry; parent.add(p); return p; };

  // ---------------------------------------------------------------- shell
  const floor = mk(new THREE.PlaneGeometry(7, 6), new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.55 }), root); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  box(7.4, 0.1, 6.4, mat(0xf4f1ea, 1), 0, Rm.h + 0.05, 0);                                 // ceiling
  box(7.2, Rm.h, 0.12, wallMat, 0, Rm.h / 2, -3.06);                                        // front wall
  box(7.2, Rm.h, 0.12, wallMat, 0, Rm.h / 2, 3.06);                                         // back wall
  box(7.0, 0.9, 0.02, lowWall, 0, 0.45, -2.995); box(7.0, 0.9, 0.02, lowWall, 0, 0.45, 2.995); // two-tone wainscot
  // left wall with door hole
  const Dd = D.door;
  box(0.12, Rm.h, Dd.z0 + 3, wallMat, -3.56, Rm.h / 2, (Dd.z0 - 3) / 2);
  box(0.12, Rm.h, 3 - Dd.z1, wallMat, -3.56, Rm.h / 2, (3 + Dd.z1) / 2);
  box(0.12, Rm.h - Dd.h, Dd.z1 - Dd.z0, wallMat, -3.56, (Rm.h + Dd.h) / 2, (Dd.z0 + Dd.z1) / 2);
  box(0.02, 0.9, Dd.z0 + 3, lowWall, -3.495, 0.45, (Dd.z0 - 3) / 2);
  // right wall with 3 windows
  const wins = D.windows, wy0 = wins[0].y0, wy1 = wins[0].y1;
  box(0.12, wy0, 6.2, wallMat, 3.56, wy0 / 2, 0); box(0.12, Rm.h - wy1, 6.2, wallMat, 3.56, (Rm.h + wy1) / 2, 0);
  let zc = -3.1;
  for (const w of [...wins, { z0: 3.1 }]) { if (w.z0 > zc) box(0.12, wy1 - wy0, w.z0 - zc, wallMat, 3.56, (wy0 + wy1) / 2, (zc + w.z0) / 2); zc = w.z1; }
  box(0.02, 0.9, 6.0, lowWall, 3.495, 0.45, 0);
  for (const w of wins) {
    const cz = (w.z0 + w.z1) / 2, cy = (w.y0 + w.y1) / 2, ww = w.z1 - w.z0;
    rbox(0.2, 0.05, ww + 0.14, 0.01, trimMat, 3.42, w.y0 - 0.01, cz);
    box(0.05, w.y1 - w.y0, 0.05, trimMat, 3.5, cy, cz); box(0.05, 0.05, ww, trimMat, 3.5, cy + 0.2, cz);
    box(0.05, 0.07, ww + 0.1, trimMat, 3.5, w.y1 + 0.03, cz); box(0.05, w.y1 - w.y0 + 0.1, 0.06, trimMat, 3.5, cy, w.z0 - 0.02); box(0.05, w.y1 - w.y0 + 0.1, 0.06, trimMat, 3.5, cy, w.z1 + 0.02);
  }
  // baseboards
  box(7, 0.08, 0.02, trimMat, 0, 0.04, -2.99); box(7, 0.08, 0.02, trimMat, 0, 0.04, 2.99);
  // door casing + door (pivot at the hinge z=2.5, swings out toward +z in the hallway)
  box(0.03, Dd.h + 0.08, 0.07, trimMat, -3.49, Dd.h / 2, Dd.z0 - 0.035); box(0.03, Dd.h + 0.08, 0.07, trimMat, -3.49, Dd.h / 2, Dd.z1 + 0.035); box(0.03, 0.08, Dd.z1 - Dd.z0 + 0.14, trimMat, -3.49, Dd.h + 0.04, (Dd.z0 + Dd.z1) / 2);
  const door = new THREE.Group(); door.position.set(-3.5, 0, Dd.z1); root.add(door);
  const doorMat = mat(0x5f86a8, 0.5);
  box(0.045, Dd.h - 0.03, Dd.z1 - Dd.z0 - 0.02, doorMat, -0.025, (Dd.h - 0.03) / 2, -(Dd.z1 - Dd.z0) / 2, door);
  const doorWin = plane(0.24, 0.5, new THREE.MeshBasicMaterial({ color: 0xfff1d6, toneMapped: true }), 0.0, 1.45, -(Dd.z1 - Dd.z0) / 2 - 0.12, Math.PI / 2, door); doorWin.position.x = 0.001;
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a25a, roughness: 0.3, metalness: 0.8 });
  mk(new THREE.SphereGeometry(0.03, 14, 10), brass, door, 0.03, 0.98, -(Dd.z1 - Dd.z0) + 0.1);
  const setDoor = (theta) => { door.rotation.y = -theta; };   // swings INTO the room, flat against the back wall at θ≈1.8
  // "ROOM 4" sign next to the door
  plane(0.42, 0.13, new THREE.MeshStandardMaterial({ map: signTex('ROOM 4', '#fff6e2', '#2f4a3d', 84), roughness: 0.7 }), -3.49, 2.3, (Dd.z0 + Dd.z1) / 2, Math.PI / 2);

  // ---------------------------------------------------------------- hallway (self-lit, bright)
  const hallMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c0, emissive: 0xfff0d8, emissiveIntensity: 0.45, roughness: 0.9 });
  const hf = mk(new THREE.PlaneGeometry(1.8, 4), new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.5, emissive: 0x6a5a40, emissiveIntensity: 0.35 }), root, -4.5, 0.001, 2.0); hf.rotation.x = -Math.PI / 2;
  box(0.1, Rm.h, 4, hallMat, -5.4, Rm.h / 2, 2.0); box(1.8, 0.1, 4, hallMat, -4.5, Rm.h, 2.0); box(1.8, Rm.h, 0.1, hallMat, -4.5, Rm.h / 2, 0.0); box(1.8, Rm.h, 0.1, hallMat, -4.5, Rm.h / 2, 4.0);
  const hooks = new THREE.Group(); root.add(hooks); // backpack hooks in the hallway
  for (let i = 0; i < 6; i++) mk(new THREE.SphereGeometry(0.025, 8, 6), brass, hooks, -5.33, 1.25, 0.6 + i * 0.42);

  // ---------------------------------------------------------------- chalkboard, banners, clock, art
  const Bd = D.board;
  rbox(Bd.w + 0.12, Bd.h + 0.12, 0.04, 0.01, woodMat, Bd.x, Bd.y, -2.985);
  const boardMat = new THREE.MeshStandardMaterial({ map: boardTex(''), roughness: 0.9 });
  plane(Bd.w, Bd.h, boardMat, Bd.x, Bd.y, -2.96);
  rbox(Bd.w, 0.03, 0.08, 0.01, woodMat, Bd.x, Bd.y - Bd.h / 2 - 0.05, -2.93);
  let boardText = null;
  const setBoard = (text) => { if (text === boardText) return; boardText = text; boardMat.map.dispose(); boardMat.map = boardTex(text); boardMat.needsUpdate = true; };
  plane(5.6, 0.35, new THREE.MeshStandardMaterial({ map: alphabetTex(), roughness: 0.8 }), 0.0, 2.55, -2.995);
  // clock (front wall, right of the board)
  const clock = new THREE.Group(); clock.position.set(2.75, 2.2, -2.97); root.add(clock);
  mk(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 36), mat(0x333333, 0.4), clock).rotation.x = Math.PI / 2;
  const face = mk(new THREE.CircleGeometry(0.18, 36), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w) => { g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, w); g.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillRect(w / 2 + Math.sin(a) * 100 - 4, w / 2 - Math.cos(a) * 100 - 10, 8, 20); } }), roughness: 0.6 }), clock, 0, 0, 0.022);
  face.castShadow = false;
  const hand = (len, wdt) => { const p = new THREE.Group(); p.position.z = 0.03; clock.add(p); mk(new THREE.BoxGeometry(wdt, len, 0.006), mat(0x222222, 0.5), p, 0, len / 2 - 0.02, 0); return p; };
  const hourH = hand(0.1, 0.018), minH = hand(0.15, 0.012);
  const setClock = (h, m) => { minH.rotation.z = -(m / 60) * Math.PI * 2; hourH.rotation.z = -((h % 12) / 12 + m / 720) * Math.PI * 2; };
  setClock(8, 0);
  // kids' drawings on the back wall + a calendar + a name chart
  const art = new THREE.Group(); root.add(art);
  for (let i = 0; i < 10; i++) plane(0.38, 0.3, new THREE.MeshStandardMaterial({ map: drawingTex(i * 7 + 1), roughness: 0.85 }), -2.6 + i * 0.58, 1.55 + (i % 2) * 0.4, 2.995, Math.PI);
  plane(0.9, 0.18, new THREE.MeshStandardMaterial({ map: signTex('WELCOME, FRIENDS!', '#f2b632', '#ffffff', 52), roughness: 0.8 }), 0, 2.3, 2.995, Math.PI);
  // world map on the left wall
  plane(1.3, 0.8, new THREE.MeshStandardMaterial({ map: canvasTex(512, 320, (g, w, h) => { g.fillStyle = '#9fd0e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#9cc77a'; const R = rng(12); for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(R() * w, h * 0.2 + R() * h * 0.6, 30 + R() * 60, 20 + R() * 40, R() * 3, 0, 7); g.fill(); } g.strokeStyle = '#8a6a44'; g.lineWidth = 10; g.strokeRect(0, 0, w, h); }), roughness: 0.8 }), -3.49, 1.6, -1.1, Math.PI / 2);

  // ---------------------------------------------------------------- teacher's desk + props
  const T = D.teacherDesk, tdesk = new THREE.Group(); root.add(tdesk);
  rbox(T.w, 0.05, T.d, 0.015, woodMat, T.x, T.h, T.z, tdesk);
  rbox(0.05, T.h, T.d - 0.06, 0.01, woodMat, T.x - T.w / 2 + 0.05, T.h / 2, T.z, tdesk); rbox(0.05, T.h, T.d - 0.06, 0.01, woodMat, T.x + T.w / 2 - 0.05, T.h / 2, T.z, tdesk);
  rbox(T.w - 0.1, 0.5, 0.03, 0.01, woodMat, T.x, T.h - 0.27, T.z - T.d / 2 + 0.05, tdesk);
  const apple = mk(new THREE.SphereGeometry(0.045, 16, 12), mat(0xc8352b, 0.4), tdesk, T.x + 0.4, T.h + 0.05, T.z + 0.1);
  mk(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 5), mat(0x5a3a20, 0.6), tdesk, T.x + 0.4, T.h + 0.105, T.z + 0.1);
  for (let i = 0; i < 3; i++) rbox(0.22, 0.04, 0.3, 0.008, mat([0x4f7fb8, 0xe2574c, 0xf2b632][i], 0.7), T.x - 0.3, T.h + 0.045 + i * 0.04, T.z - 0.05, tdesk).rotation.y = i * 0.15;
  const mug = mk(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 18), mat(0xfff6e2, 0.4), tdesk, T.x + 0.1, T.h + 0.075, T.z - 0.12);
  // teacher's chair (behind the desk, toward the board)
  const tchair = new THREE.Group(); tchair.position.set(T.x, 0, T.z - 0.6); root.add(tchair);
  rbox(0.46, 0.05, 0.44, 0.015, mat(0x3c4a5c, 0.7), 0, 0.47, 0, tchair); rbox(0.46, 0.45, 0.04, 0.015, mat(0x3c4a5c, 0.7), 0, 0.72, -0.22, tchair);
  mk(new THREE.CylinderGeometry(0.025, 0.025, 0.44, 8), metal, tchair, 0, 0.23, 0);
  // potted plant on the window sill
  const plant = new THREE.Group(); plant.position.set(3.32, wy0, 1.0); root.add(plant);
  mk(new THREE.CylinderGeometry(0.09, 0.07, 0.15, 16), mat(0xc06a3f, 0.8), plant, 0, 0.075, 0);
  for (let i = 0; i < 7; i++) { const l = mk(new THREE.SphereGeometry(0.06, 10, 8), mat(0x4f9a48, 0.7), plant, Math.sin(i * 2.1) * 0.06, 0.2 + (i % 3) * 0.05, Math.cos(i * 2.1) * 0.06); l.scale.set(0.6, 1.3, 0.6); }

  // ---------------------------------------------------------------- 24 desks + chairs (chairs can be flipped up onto the desks)
  const dk = D.desk, deskTop = mat(0xe6c99a, 0.5);
  const chairCols = [0xe2574c, 0xf2b632, 0x4f9bd9, 0x58b368].map((c) => mat(c, 0.55));
  const desks = [], chairs = [], tags = [];
  D.desks.forEach((p, i) => {
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z); root.add(g);
    rbox(dk.w, 0.035, dk.d, 0.012, deskTop, 0, dk.h, 0, g);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.CylinderGeometry(0.014, 0.014, dk.h, 8), metal, g, x * (dk.w / 2 - 0.05), dk.h / 2, z * (dk.d / 2 - 0.05));
    rbox(dk.w - 0.08, 0.1, dk.d - 0.12, 0.01, metal, 0, dk.h - 0.08, -0.03, g);
    // name tag (folded card) facing the chair
    const tag = plane(0.2, 0.06, new THREE.MeshStandardMaterial({ map: signTex(NAMES[i], '#fffaf0', '#444', 80), roughness: 0.8 }), 0, dk.h + 0.045, dk.d / 2 - 0.05, 0, g);
    tag.rotation.x = -0.35; tags.push(tag);
    desks.push(g);
    // chair: seat + backrest + 4 legs, in its own pivot so it can be flipped up onto the desk
    const c = new THREE.Group(); root.add(c);
    const cm = chairCols[(i + Math.floor(i / 6)) % 4], S = D.chair.seat;
    rbox(0.36, 0.035, 0.34, 0.012, cm, 0, S, 0, c);
    rbox(0.36, 0.22, 0.03, 0.012, cm, 0, S + 0.2, 0.17, c);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.CylinderGeometry(0.012, 0.012, S, 6), metal, c, x * 0.15, S / 2, z * 0.14);
    mk(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), metal, c, 0.15, S + 0.12, 0.165); mk(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), metal, c, -0.15, S + 0.12, 0.165);
    chairs.push({ g: c, x: p.x, z: p.z + D.chair.dz });
  });
  const setChairsUp = (up) => {
    for (const c of chairs) {
      if (up) { c.g.position.set(c.x, dk.h + 0.035 + D.chair.seat + 0.02, c.z - D.chair.dz); c.g.rotation.set(Math.PI, 0, 0); }
      else { c.g.position.set(c.x, 0, c.z); c.g.rotation.set(0, 0, 0); }
    }
  };
  setChairsUp(false);

  // ---------------------------------------------------------------- outside (seasonal yard) + weather
  const yards = { autumn: yardTex('autumn'), winter: yardTex('winter'), spring: yardTex('spring'), summer: yardTex('summer') };
  const yardMat = new THREE.MeshBasicMaterial({ map: yards.summer, toneMapped: false, color: 0xffffff });
  const yard = plane(12, 6.75, yardMat, 7.5, 1.6, 0, -Math.PI / 2);
  const weather = makeWeather(root, { x0: 3.7, x1: 6.5, y0: 0.2, y1: 3.0, z0: -3.0, z1: 3.0 });
  let curSeason = 'summer';
  const setSeason = (s, t) => { if (s !== curSeason) { yardMat.map = yards[s]; yardMat.needsUpdate = true; curSeason = s; } weather.update(t, s === 'spring' ? 'none' : s === 'summer' ? 'none' : s); };

  // ---------------------------------------------------------------- lights
  const hemi = new THREE.HemisphereLight(0xdfe8f5, 0x8a7560, opts.ambient ?? 0.9); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, opts.sun ?? 3.2);
  sun.position.set(9, 5.2, -2.5); sun.target.position.set(0, 0, 0.3); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 2, far: 20 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  // ceiling light panels (emissive) + a broad soft fill from them
  const panelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6e6).multiplyScalar(1.4), toneMapped: false });
  for (const x of [-1.8, 1.8]) for (const z of [-1.5, 1.2]) { const p = plane(1.2, 0.6, panelMat, x, Rm.h - 0.005, z); p.rotation.x = Math.PI / 2; }
  const ceil = new THREE.PointLight(0xfff1dc, 3.0, 9, 1.6); ceil.position.set(0, 2.7, 0); root.add(ceil);
  const hallLight = new THREE.PointLight(0xffe6c0, 2.2, 5, 2); hallLight.position.set(-4.5, 2.2, 2.0); root.add(hallLight);
  const setAbandoned = (a) => {
    hemi.intensity = (opts.ambient ?? 0.9) * (1 - 0.45 * a); hemi.color.setHex(0xdfe8f5).lerp(new THREE.Color(0x9fb3d6), a);
    sun.intensity = (opts.sun ?? 3.2) * (1 - 0.25 * a);
    ceil.intensity = 3.0 * (1 - a); panelMat.color.setHex(0xfff6e6).multiplyScalar(a > 0.5 ? 0.35 : 1.4);
    art.visible = a < 0.5;
  };

  // ---------------------------------------------------------------- dust motes in the sun beams
  const DN = 320, dR = rng(51), seeds = Array.from({ length: DN }, () => [dR(), dR(), dR(), dR()]);
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DN * 3), 3));
  const dc = document.createElement('canvas'); dc.width = dc.height = 32; const dg = dc.getContext('2d'); const drg = dg.createRadialGradient(16, 16, 0, 16, 16, 16); drg.addColorStop(0, '#fff'); drg.addColorStop(1, 'rgba(255,255,255,0)'); dg.fillStyle = drg; dg.fillRect(0, 0, 32, 32);
  const dMat = new THREE.PointsMaterial({ size: 0.016, map: new THREE.CanvasTexture(dc), color: 0xffe2b0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dGeo, dMat); dust.frustumCulled = false; root.add(dust);
  function updateDust(t, amount = 1) {
    const a = dGeo.attributes.position;
    for (let i = 0; i < DN; i++) {
      const [u, v, w, k] = seeds[i];
      a.setXYZ(i, -1 + u * 4.3 + Math.sin(t * 0.13 + i) * 0.06, 0.2 + ((v * 2.4 + t * 0.015 * (k - 0.5)) % 2.4 + 2.4) % 2.4, -2.6 + w * 5.4 + Math.cos(t * 0.11 + i * 1.3) * 0.06);
    }
    a.needsUpdate = true; dMat.opacity = 0.55 * amount;
  }

  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  yard.castShadow = false;

  return {
    root, D, door, setDoor, desks, chairs, tags, tdesk, tchair, mug, apple, plant, clock, hooks,
    lights: { hemi, sun, ceil, hallLight },
    setChairsUp, setSeason, setClock, setBoard, setAbandoned, updateDust,
  };
}
