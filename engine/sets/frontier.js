// SETS: the American frontier, early 1800s (built for videos/009-abe-lincoln; reusable for any pioneer / biography story).
// Each builder returns its own `root` at the origin — park them at offsets and show ONE per shot (007 montage technique).
//
//   buildCabin(studio)   one-room log cabin, x∈[-2.5,2.5] z∈[-2,2], walls 2.2 m, door + window in the south wall (z=+2),
//                        stone fireplace on the west wall (fire light, animate with update(t)), cradle, bed, table, stool,
//                        shelf of books. Outside: snowy night clearing, pines, rail fence, moon, chimney smoke, snowfall.
//                        setExterior(v): oiled-paper window glows for shots from outside. DIMS.cabin has the spots.
//   buildWoods(studio)   Indiana forest clearing: chopping stump at the origin, half-built cabin, zigzag rail fence, wood pile,
//                        mother's grave on a knoll (DIMS.woods.grave), a dirt road (z=+9) to a far cabin window.
//                        setMode('summer'|'autumn'|'night', t), setShadowFocus(x, z, half), falling leaves in autumn.
//   buildRiver(studio)   a wide river at sunset (flows along +x), tree banks, a flatboat (boat.g: deck at y=0.55, sweep oar
//                        boat.sweep — handle end at boat x≈-3.8, y≈1.6: stand the steersman at x=-3.3 facing -x), New Orleans on the far bank (x>40). update(t) scrolls the water.
//   buildStore(studio)   general store interior (x∈[-3,3], z∈[-2.5,2.5]): counter at z=-0.8, shelves, barrels, sacks, scale,
//                        window light from +x.
//   Props: makeAxe(), makeBook(color), makeLantern() ({g, light}), makeCoin(), makeTree(kind, leafMat, R), makeRailFence()
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng, clamp, lerp } from '@engine/core.js';
import { makeSkyDome } from '@engine/sets/military.js';

const PI = Math.PI;
export const DIMS = {
  cabin: { hearth: [-2.2, -0.3], cradle: [-1.25, 0.55], chair: [-0.75, 0.05], stool: [-1.45, -0.55], bed: [1.75, -1.25], table: [1.1, 0.75] },
  woods: { stump: [0, 0], grave: [16, 3], road: 9, farCabin: [-34, 12] },
  store: { counter: -0.8, clerk: [0.4, -1.45], customer: [0.2, 0.0] },
};

// ---------------------------------------------------------------- textures + shared pieces
const noiseTex = (base, dots, seed, rep = [8, 8], size = 512) => canvasTex(size, size, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const R = rng(seed);
  for (let i = 0; i < 1400; i++) { g.fillStyle = dots[Math.floor(R() * dots.length)]; g.globalAlpha = 0.05 + R() * 0.12; g.fillRect(R() * w, R() * h, 2 + R() * 7, 2 + R() * 5); }
  g.globalAlpha = 1;
}, rep);
const plankTex = (base, seam, rep, seed = 3, vertical = false) => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const R = rng(seed);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = `rgba(0,0,0,${0.03 + R() * 0.08})`;
    if (vertical) g.fillRect(i * 64, 0, 64, h); else g.fillRect(0, i * 64, w, 64);
    g.fillStyle = seam; if (vertical) g.fillRect(i * 64, 0, 3, h); else g.fillRect(0, i * 64, w, 3);
  }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(60,30,10,${R() * 0.12})`; g.fillRect(R() * w, R() * h, vertical ? 1.5 : 20 + R() * 40, vertical ? 20 + R() * 40 : 1.5); }
}, rep);
export const woodMat = (c = 0x8a6040, r = 0.9) => mat(c, r);

/** Tree: kind 'oak' (round crown) | 'pine'. Crown material is shared so a season can recolor every tree at once. */
export function makeTree(kind, leafMat, R, trunkMat, scale = 1) {
  const t = new THREE.Group(), crown = new THREE.Group();
  const tm = trunkMat || mat(0x5e4330, 0.95);
  if (kind === 'pine') {
    mk(new THREE.CylinderGeometry(0.12, 0.2, 2.0, 7), tm, t, 0, 1.0, 0);
    for (let k = 0; k < 4; k++) mk(new THREE.ConeGeometry(1.5 - k * 0.3, 1.7, 9), leafMat, crown, 0, 1.6 + k * 0.85, 0);
  } else {
    mk(new THREE.CylinderGeometry(0.16, 0.28, 3.0, 8), tm, t, 0, 1.5, 0);
    for (let k = 0; k < 5; k++) mk(new THREE.IcosahedronGeometry(1.25 - k * 0.1, 1), leafMat, crown, (R() - 0.5) * 1.6, 3.4 + (k % 3) * 0.55, (R() - 0.5) * 1.4);
  }
  t.add(crown); t.scale.setScalar(scale);
  return { t, crown };
}
/** Zigzag "Virginia" split-rail fence from (x0,z0) to (x1,z1). */
export function makeRailFence(x0, z0, x1, z1, rm = mat(0x7d6a55, 0.95)) {
  const g = new THREE.Group(), L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(L / 2.4)), ang = Math.atan2(z1 - z0, x1 - x0);
  for (let i = 0; i < n; i++) {
    const zig = i % 2 ? 0.35 : -0.35;
    for (let k = 0; k < 4; k++) {
      const r = mk(new THREE.BoxGeometry(2.7, 0.09, 0.11), rm, g, (i + 0.5) * (L / n), 0.22 + k * 0.24, 0);
      r.rotation.y = zig;
    }
  }
  g.position.set(x0, 0, z0); g.rotation.y = -ang;
  return g;
}
export function makeAxe() {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.018, 0.022, 0.8, 8), mat(0xb08a5a, 0.7), g, 0, 0.0, 0);           // handle along y (grip end at y=-0.4)
  const head = mk(new RoundedBoxGeometry(0.05, 0.1, 0.17, 2, 0.01), mat(0x6c6f73, 0.35, { metalness: 0.6 }), g, 0, 0.37, 0.05);
  mk(new THREE.BoxGeometry(0.02, 0.12, 0.05), mat(0xc9ccd0, 0.25, { metalness: 0.7 }), g, 0, 0.37, 0.15);
  return g;
}
export function makeBook(color = 0x7a3a2a, w = 0.15, h = 0.21, d = 0.035) {
  const g = new THREE.Group();
  mk(new RoundedBoxGeometry(w, d, h, 1, 0.004), mat(color, 0.8), g, 0, d / 2, 0);
  mk(new THREE.BoxGeometry(w - 0.012, d - 0.01, h - 0.008), mat(0xf1e6c8, 0.9), g, 0.006, d / 2, 0);
  return g;
}
/** Open book (two page blocks in a shallow V). Lies flat, spine along local z. */
export function makeOpenBook(color = 0x6a3020) {
  const g = new THREE.Group(), pm = mat(0xf4ead0, 0.9), cm = mat(color, 0.8);
  for (const s of [-1, 1]) {
    const half = new THREE.Group(); half.rotation.z = s * -0.18; g.add(half);
    mk(new THREE.BoxGeometry(0.15, 0.006, 0.21), cm, half, s * 0.077, 0, 0);
    mk(new THREE.BoxGeometry(0.14, 0.018, 0.2), pm, half, s * 0.075, 0.011, 0);
  }
  return g;
}
export function makeLantern() {
  const g = new THREE.Group(), metal = mat(0x2e2b28, 0.5, { metalness: 0.5 });
  mk(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 10), metal, g, 0, -0.16, 0);
  mk(new THREE.CylinderGeometry(0.03, 0.065, 0.06, 10), metal, g, 0, 0.03, 0);
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc070).multiplyScalar(2.2), toneMapped: false }));
  glow.position.y = -0.075; g.add(glow);
  const ring = mk(new THREE.TorusGeometry(0.035, 0.005, 6, 12), metal, g, 0, 0.09, 0);
  const light = new THREE.PointLight(0xffb560, 3.5, 7, 2); light.position.y = -0.07; g.add(light);
  return { g, light, glow, ring };
}
export function makeCoin() {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.003, 16), mat(0xd2a24a, 0.3, { metalness: 0.8 }));
  return c;
}
function makeFire(parent, x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  const logM = mat(0x3a2618, 0.9);
  for (let i = 0; i < 3; i++) { const l = mk(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), logM, g, 0, 0.05, 0); l.rotation.set(PI / 2, i * 1.05, 0); l.rotation.order = 'YXZ'; }
  const fm = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), transparent: true, opacity: 0.92, toneMapped: false, depthWrite: false });
  const flames = [];
  [[0, 0.32, 0.12, 0xff8a2a, 2.2], [0.09, 0.25, 0.09, 0xffa040, 2.4], [-0.08, 0.27, 0.1, 0xff7a20, 2.0], [0, 0.18, 0.07, 0xffe08a, 3.0]].forEach(([dx, h, r, c, k], i) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), fm(c, k)); f.position.set(dx, 0.08 + h / 2, (i % 2) * 0.03); g.add(f); flames.push({ f, h, ph: i * 1.7 });
  });
  const light = new THREE.PointLight(0xff9a4a, 9, 9, 1.4); light.position.set(0.75, 0.55, 0); g.add(light);   // kept ~0.8 m off the wall: closer, it blows the logs out to white
  const update = (t) => {
    flames.forEach(({ f, ph }, i) => { const k = 1 + 0.16 * Math.sin(t * 9.3 + ph) + 0.08 * Math.sin(t * 17.1 + ph * 2); f.scale.set(1, k, 1); f.rotation.z = 0.08 * Math.sin(t * 5 + ph); });
    light.intensity = light.userData.base * (1 + 0.06 * Math.sin(t * 7.1) + 0.04 * Math.sin(t * 13.7));
  };
  light.userData.base = 9;
  return { g, light, update };
}
// soft round sprite for snow / smoke points
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, '#fff'); r.addColorStop(0.5, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------- CABIN
export function buildCabin(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const R = rng(opts.seed ?? 1809);
  const W2 = 2.5, D2 = 2.0, WH = 2.2, LR = 0.13;
  const logM = [mat(0x7a5a3e, 0.92), mat(0x6e4f36, 0.92), mat(0x84623f, 0.92)];
  const chink = mat(0xb9a88a, 1);
  // a wall of horizontal logs along `axis` ('x' at z=pos, or 'z' at x=pos) with rectangular openings [[a0,a1,y0,y1]]
  const wall = (axis, pos, half, holes = []) => {
    const n = Math.round(WH / (LR * 1.7));
    for (let i = 0; i < n; i++) {
      const y = LR + i * LR * 1.7;
      const cuts = holes.filter(([, , y0, y1]) => y > y0 && y < y1).sort((a, b) => a[0] - b[0]);
      let a = -half - 0.25; const segs = [];
      for (const [a0, a1] of cuts) { segs.push([a, a0]); a = a1; }
      segs.push([a, half + 0.25]);
      for (const [s0, s1] of segs) {
        if (s1 - s0 < 0.05) continue;
        const L = s1 - s0, c = (s0 + s1) / 2;
        const log = mk(new THREE.CylinderGeometry(LR, LR, L, 10), logM[(((i + Math.round(c * 3)) % 3) + 3) % 3], root);
        if (axis === 'x') { log.rotation.z = PI / 2; log.position.set(c, y, pos); } else { log.rotation.x = PI / 2; log.position.set(pos, y + LR * 0.85, c); }
      }
      // chinking (mortar strip between logs) on the inside face
      if (i < n - 1) {
        const ch = mk(new THREE.BoxGeometry(axis === 'x' ? half * 2 : 0.05, LR * 0.6, axis === 'x' ? 0.05 : half * 2), chink, root);
        ch.position.set(axis === 'x' ? 0 : pos, y + LR * 0.85 + (axis === 'x' ? 0 : LR * 0.85), axis === 'x' ? pos : 0);
        ch.visible = cuts.length === 0;
      }
    }
  };
  // solid backing inside the log walls (N, E, W) so moonlit snow never shows through the gaps between logs
  const backM = mat(0x5a4230, 1);
  mk(new THREE.BoxGeometry(W2 * 2, WH, 0.06), backM, root, 0, WH / 2, -D2);
  mk(new THREE.BoxGeometry(0.06, WH, D2 * 2), backM, root, W2, WH / 2, 0);
  mk(new THREE.BoxGeometry(0.06, WH, D2 * 2), backM, root, -W2, WH / 2, 0);
  const DOOR = [0.35, 1.2, 0, 1.95], WIN = [-1.6, -0.9, 0.95, 1.55];
  wall('x', D2, W2, [DOOR, WIN]);          // south (front) wall
  wall('x', -D2, W2, []);                  // north
  wall('z', W2, D2, []);                   // east
  wall('z', -W2, D2, [[-0.95, 0.35, 0, 1.25]]); // west, opening for the hearth
  // gables + roof (ridge along x at y=3.35)
  const RIDGE = 3.35, rise = RIDGE - WH - 0.1, slope = Math.atan2(rise, D2 + 0.35);
  const shingle = new THREE.MeshStandardMaterial({ map: plankTex('#6a5440', 'rgba(20,10,0,.35)', [3, 4], 7), roughness: 0.95, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const L = Math.hypot(D2 + 0.45, rise);
    const roof = mk(new THREE.BoxGeometry(W2 * 2 + 0.8, 0.08, L), shingle, root, 0, WH + 0.12 + rise / 2, s * (D2 + 0.45) / 2);
    roof.rotation.x = s * slope;
  }
  const gableM = woodMat(0x6b4c33);
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape(); shape.moveTo(-D2 - 0.1, 0); shape.lineTo(D2 + 0.1, 0); shape.lineTo(0, rise + 0.05); shape.closePath();
    const gab = mk(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: 0x6b4c33, roughness: 0.95, side: THREE.DoubleSide }), root, s * W2, WH + 0.12, 0);
    gab.rotation.y = PI / 2;
  }
  // plank ceiling (no gaps under the eaves for moonlight to leak through) + joists
  const ceilM = new THREE.MeshStandardMaterial({ map: plankTex('#5e4430', 'rgba(20,10,0,.45)', [2, 2], 11, true), roughness: 0.95, side: THREE.DoubleSide });
  const ceil = mk(new THREE.PlaneGeometry(W2 * 2, D2 * 2), ceilM, root, 0, WH + 0.12, 0); ceil.rotation.x = PI / 2;
  for (let x = -2; x <= 2; x += 1) mk(new THREE.BoxGeometry(0.12, 0.12, D2 * 2), gableM, root, x, WH + 0.06, 0);
  // floor: packed dirt inside, door, window shutter
  const dirt = mk(new THREE.PlaneGeometry(W2 * 2, D2 * 2), new THREE.MeshStandardMaterial({ map: noiseTex('#6b5038', ['#3d2b1c', '#8a6a48', '#2d2015'], 4, [2, 2]), roughness: 1 }), root, 0, 0.005, 0);
  dirt.rotation.x = -PI / 2;
  const door = new THREE.Group(); door.position.set(DOOR[1], 0, D2); root.add(door);
  mk(new THREE.BoxGeometry(0.85, 1.95, 0.06), new THREE.MeshStandardMaterial({ map: plankTex('#7a5a3a', 'rgba(0,0,0,.4)', [1, 1], 9, true), roughness: 0.9 }), door, -0.42, 0.975, 0);
  door.rotation.y = -0.05;
  const winGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff9a44).multiplyScalar(0.75), toneMapped: false, transparent: true, opacity: 0 }));
  winGlow.position.set((WIN[0] + WIN[1]) / 2, (WIN[2] + WIN[3]) / 2, D2 + 0.02); root.add(winGlow);
  // greased-paper pane: amber from inside (and it hides the moonlit snow, which read as a blown-out white hole)
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.62), new THREE.MeshStandardMaterial({ color: 0x9a7a4a, emissive: 0x3a2410, roughness: 1, side: THREE.DoubleSide }));
  pane.position.set((WIN[0] + WIN[1]) / 2, (WIN[2] + WIN[3]) / 2, D2); root.add(pane);
  // fireplace: stone block on the west wall (inside opening) + chimney outside
  const stone = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7d7468'; g.fillRect(0, 0, w, h); const r = rng(12);
    for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -20 : 0; x < w; x += 48) { const c = 100 + r() * 50; g.fillStyle = `rgb(${c},${c * 0.95},${c * 0.88})`; g.fillRect(x + 2, y + 2, 44, 28); }
  }, [2, 3]), roughness: 0.95 });
  const hearthX = -W2;
  mk(new THREE.BoxGeometry(0.6, 1.5, 1.7), stone, root, hearthX + 0.05, 0.75, -0.3).material = stone;
  const firebox = mk(new THREE.BoxGeometry(0.62, 0.8, 0.9), mat(0x1a120c, 1), root, hearthX + 0.06, 0.42, -0.3);
  mk(new THREE.BoxGeometry(0.75, 0.06, 1.9), stone, root, hearthX + 0.32, 0.03, -0.3);            // hearthstone
  mk(new THREE.BoxGeometry(0.2, 0.1, 1.8), woodMat(0x5a3d28), root, hearthX + 0.38, 1.55, -0.3);    // mantel
  mk(new THREE.BoxGeometry(1.0, 4.4, 1.1), stone, root, hearthX - 0.55, 2.2, -0.3);                   // chimney (outside)
  const fire = makeFire(root, hearthX + 0.28, 0.06, -0.3, 0.95);
  // mantel things: two candlesticks, a jug
  mk(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 10), mat(0x9a6a42, 0.6), root, hearthX + 0.38, 1.7, -0.75);
  // furniture
  const cradle = new THREE.Group(); cradle.position.set(...[DIMS.cabin.cradle[0], 0, DIMS.cabin.cradle[1]]); root.add(cradle);
  const cw = woodMat(0x9a6b42);
  const rock = new THREE.Group(); cradle.add(rock);
  mk(new THREE.BoxGeometry(0.42, 0.05, 0.8), cw, rock, 0, 0.17, 0);
  for (const s of [-1, 1]) { mk(new THREE.BoxGeometry(0.04, 0.28, 0.8), cw, rock, s * 0.2, 0.3, 0); mk(new THREE.BoxGeometry(0.42, 0.32, 0.04), cw, rock, 0, 0.32, s * 0.4); }
  for (const s of [-1, 1]) { const r = mk(new THREE.TorusGeometry(0.5, 0.025, 6, 20, 0.9), cw, rock, s * 0.16, 0.56, 0); r.rotation.set(0, PI / 2, -PI / 2 - 0.45); }
  mk(new THREE.BoxGeometry(0.36, 0.06, 0.74), mat(0xd9cfb8, 1), rock, 0, 0.22, 0);
  const chair = new THREE.Group(); chair.position.set(DIMS.cabin.chair[0], 0, DIMS.cabin.chair[1]); root.add(chair);
  mk(new THREE.BoxGeometry(0.42, 0.05, 0.42), cw, chair, 0, 0.45, 0);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), cw, chair, a * 0.18, 0.225, b * 0.18);
  mk(new THREE.BoxGeometry(0.42, 0.5, 0.04), cw, chair, 0, 0.72, -0.2);
  const stool = new THREE.Group(); stool.position.set(DIMS.cabin.stool[0], 0, DIMS.cabin.stool[1]); root.add(stool);
  mk(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 14), cw, stool, 0, 0.42, 0);
  for (let i = 0; i < 3; i++) mk(new THREE.CylinderGeometry(0.02, 0.025, 0.42, 6), cw, stool, Math.sin(i * 2.1) * 0.13, 0.21, Math.cos(i * 2.1) * 0.13);
  // bed in the north-east corner with a quilt
  const quilt = canvasTex(256, 256, (g, w, h) => { const cols = ['#a8473a', '#d9b46a', '#5d7a8a', '#e9dcc0', '#7a8a4a']; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = cols[(x * 3 + y * 5) % 5]; g.fillRect(x * 32, y * 32, 32, 32); } });
  const bed = new THREE.Group(); bed.position.set(DIMS.cabin.bed[0], 0, DIMS.cabin.bed[1]); root.add(bed);
  mk(new THREE.BoxGeometry(1.0, 0.35, 1.9), cw, bed, 0, 0.22, 0);
  mk(new RoundedBoxGeometry(0.98, 0.16, 1.86, 2, 0.06), new THREE.MeshStandardMaterial({ map: quilt, roughness: 1 }), bed, 0, 0.47, 0);
  mk(new RoundedBoxGeometry(0.7, 0.1, 0.32, 2, 0.04), mat(0xefe6d2, 1), bed, 0, 0.58, -0.72);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 6), cw, bed, a * 0.48, 0.37, b * 0.93);
  const table = new THREE.Group(); table.position.set(DIMS.cabin.table[0], 0, DIMS.cabin.table[1]); root.add(table);
  mk(new THREE.BoxGeometry(1.0, 0.06, 0.6), cw, table, 0, 0.74, 0);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.CylinderGeometry(0.03, 0.03, 0.74, 6), cw, table, a * 0.44, 0.37, b * 0.25);
  mk(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 10), mat(0x8a8f96, 0.4, { metalness: 0.5 }), table, -0.25, 0.83, 0);
  // shelf with books (north wall)
  mk(new THREE.BoxGeometry(1.2, 0.04, 0.25), cw, root, -0.6, 1.45, -D2 + 0.18);
  const books = new THREE.Group(); root.add(books);
  [0x7a3a2a, 0x2f4a6a, 0x5a6a3a, 0x8a6a3a].forEach((c, i) => { const b = makeBook(c); b.rotation.set(0, 0, PI / 2); b.position.set(-1.0 + i * 0.07, 1.47, -D2 + 0.18); books.add(b); });
  // pot hook + iron pot in the hearth, axe by the door, a rifle on pegs, a spinning wheel? keep it simple: pot + axe
  mk(new THREE.SphereGeometry(0.13, 12, 8, 0, PI * 2, PI * 0.35, PI * 0.65), mat(0x222222, 0.6), root, hearthX + 0.2, 0.32, -0.62);
  const axe = makeAxe(); axe.position.set(1.85, 0.4, D2 - 0.2); axe.rotation.z = 0.15; root.add(axe);

  // ---------------------------------------------------------------- outside: snowy clearing at night
  const sky = makeSkyDome(0x0d1530, 0x2a3a5c, 260); root.add(sky.mesh);
  const snowM = new THREE.MeshStandardMaterial({ map: noiseTex('#dfe7f2', ['#b9c7da', '#ffffff', '#a9b9d0'], 5, [20, 20]), roughness: 0.9 });
  const ground = new THREE.Mesh(new THREE.RingGeometry(0.01, 220, 48, 1), snowM); ground.rotation.x = -PI / 2; ground.receiveShadow = true; root.add(ground);
  // hide the snow under the dirt floor (ground sits just below the floor)
  ground.position.y = -0.01;
  // snow on the roof
  for (const s of [-1, 1]) { const L = Math.hypot(D2 + 0.45, rise); const sr = mk(new THREE.BoxGeometry(W2 * 2 + 0.85, 0.07, L * 0.98), mat(0xeef3fa, 0.8), root, 0, WH + 0.19 + rise / 2, s * (D2 + 0.45) / 2); sr.rotation.x = s * slope; }
  const pineM = mat(0x2f4a3a, 0.9), oakBare = mat(0x4a3a2c, 0.95);
  for (let i = 0; i < 40; i++) {
    const a = R() * PI * 2, d = 9 + R() * 28;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (z > 3 && Math.abs(x) < 7) continue; // keep the view from the front clear
    const tr = makeTree('pine', pineM, R, null, 0.9 + R() * 0.8); tr.t.position.set(x, 0, z); root.add(tr.t);
    for (const c of [...tr.crown.children]) { const cap = mk(new THREE.ConeGeometry(c.geometry.parameters.radius * 0.7, 0.5, 9), mat(0xeef3fa, 0.8), tr.crown, 0, c.position.y + 0.55, 0); }
  }
  const fence = makeRailFence(-7, 5.5, 3.5, 7.5, mat(0x5a4a3c, 0.95)); root.add(fence);
  // moon (sprite disc) + moonlight
  const moon = new THREE.Mesh(new THREE.CircleGeometry(6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf4f1e2).multiplyScalar(1.4), toneMapped: false, fog: false }));
  moon.position.set(-60, 70, -150); moon.lookAt(0, 0, 0); root.add(moon);
  // stars
  const SG = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 700; i++) { const a = R() * PI * 2, e = 0.12 + R() * 1.3; sp.push(Math.cos(e) * Math.sin(a) * 240, Math.sin(e) * 240, Math.cos(e) * Math.cos(a) * 240); }
  SG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(SG, new THREE.PointsMaterial({ size: 1.6, map: dotTexture(), transparent: true, depthWrite: false, color: 0xdfe6ff, fog: false, sizeAttenuation: true }));
  root.add(stars);
  // snowfall + chimney smoke (points, deterministic)
  const dot = dotTexture();
  const SN = 1400, snowGeo = new THREE.BufferGeometry(), sSeeds = Array.from({ length: SN }, () => [R(), R(), R(), R()]);
  snowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SN * 3), 3));
  const flakes = new THREE.Points(snowGeo, new THREE.PointsMaterial({ size: 0.06, map: dot, transparent: true, depthWrite: false, color: 0xffffff }));
  flakes.frustumCulled = false; root.add(flakes);
  const SM = 70, smokeGeo = new THREE.BufferGeometry(), mSeeds = Array.from({ length: SM }, () => [R(), R(), R()]);
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SM * 3), 3));
  const smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({ size: 1.1, map: dot, transparent: true, opacity: 0.22, depthWrite: false, color: 0xb8c0cc }));
  smoke.frustumCulled = false; root.add(smoke);

  // lights: moon (key outside, cool), dim hemi, fire (inside), a faint cool fill through the window
  const hemi = new THREE.HemisphereLight(0x5a6c9a, 0x2a2018, 0.35); root.add(hemi);
  const warm = new THREE.PointLight(0xffb070, 3.0, 7, 1.6); warm.position.set(0.2, 2.0, 0.6); root.add(warm);   // interior bounce so faces read
  const moonL = new THREE.DirectionalLight(0xa9bce8, 0.9); moonL.position.set(-14, 16, 18); moonL.target.position.set(0, 0, 0);
  moonL.castShadow = true; moonL.shadow.mapSize.set(2048, 2048); Object.assign(moonL.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 2, far: 70 });
  root.add(moonL, moonL.target);
  fire.light.castShadow = true; fire.light.shadow.mapSize.set(1024, 1024); fire.light.shadow.bias = -0.004;

  const setExterior = (v) => { winGlow.material.opacity = v; };
  function update(t) {
    fire.update(t);
    const a = snowGeo.attributes.position;
    for (let i = 0; i < SN; i++) { const [u, v, w, k] = sSeeds[i]; a.setXYZ(i, -10 + u * 20 + Math.sin(t * (0.5 + k) + i) * 0.2, 9 - ((v * 9 + t * (0.45 + k * 0.35)) % 9), -6 + w * 22); }
    a.needsUpdate = true;
    const b = smokeGeo.attributes.position;
    for (let i = 0; i < SM; i++) { const [u, v, w] = mSeeds[i], age = ((t * 0.18 + u) % 1); b.setXYZ(i, hearthX - 0.55 + age * 2.2 + Math.sin(t + i) * 0.1 * age, 4.5 + age * 5.0, -0.3 + (v - 0.5) * 0.6 * (1 + age * 3)); }
    b.needsUpdate = true;
  }
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  ground.receiveShadow = true;
  setExterior(0); update(0);
  return { root, sky, door, cradle, rock, chair, stool, bed, table, books, flakes, smoke, fire, setExterior, update, lights: { hemi, moonL, fire: fire.light } };
}

// ---------------------------------------------------------------- WOODS
export function buildWoods(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const R = rng(opts.seed ?? 1816);
  const sky = makeSkyDome(0x6fa2d8, 0xf0e2c4, 280); root.add(sky.mesh);
  const grassM = new THREE.MeshStandardMaterial({ map: noiseTex('#6e8a45', ['#4f6a30', '#8aa255', '#5a4a30'], 6, [30, 30]), roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), grassM); ground.rotation.x = -PI / 2; ground.receiveShadow = true; root.add(ground);
  const leafM = mat(0x4f8a3a, 0.88), leafM2 = mat(0x3f7a34, 0.88), pineM = mat(0x2f5a3a, 0.9), trunkM = mat(0x5e4330, 0.95);
  const trees = [];
  const place = (x, z, kind, s) => { const tr = makeTree(kind, kind === 'pine' ? pineM : (R() < 0.5 ? leafM : leafM2), R, trunkM, s); tr.t.position.set(x, 0, z); tr.t.rotation.y = R() * 6; root.add(tr.t); trees.push(tr); return tr; };
  for (let i = 0; i < 120; i++) {
    const x = -60 + R() * 120, z = -50 + R() * 75;
    if (Math.hypot(x, z) < 7) continue;                         // the clearing
    if (Math.abs(z - DIMS.woods.road) < 2.2) continue;          // the road
    if (Math.hypot(x - DIMS.woods.grave[0], z - DIMS.woods.grave[1]) < 4) continue;
    place(x, z, R() < 0.25 ? 'pine' : 'oak', 0.8 + R() * 0.7);
  }
  // the big tree that shades the grave
  const graveTree = place(DIMS.woods.grave[0] - 2.6, DIMS.woods.grave[1] - 3.2, 'oak', 1.5);
  // stump + chopping log + wood pile + split rails stacked
  const wd = woodMat(0x8a6a48), bark = mat(0x5a4230, 0.95);
  const stump = new THREE.Group(); root.add(stump);
  mk(new THREE.CylinderGeometry(0.32, 0.38, 0.45, 14), bark, stump, 0, 0.225, 0);
  mk(new THREE.CircleGeometry(0.31, 18), mat(0xcaa678, 0.85), stump, 0, 0.451, 0).rotation.x = -PI / 2;
  const block = new THREE.Group(); block.position.set(0, 0.45, 0); root.add(block);   // the log being split (two halves)
  const halves = [];
  for (const s of [-1, 1]) { const h = mk(new THREE.CylinderGeometry(0.13, 0.13, 0.36, 12, 1, false, s < 0 ? 0 : PI, PI), wd, block, 0, 0.18, 0); halves.push(h); }
  const pile = new THREE.Group(); pile.position.set(-2.4, 0, -1.6); root.add(pile);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6 - r; k++) { const l = mk(new THREE.CylinderGeometry(0.11, 0.11, 1.1, 8), r % 2 ? wd : bark, pile, -0.6 + k * 0.23 + r * 0.11, 0.11 + r * 0.2, 0); l.rotation.x = PI / 2; }
  // half-built cabin (4 courses of logs) in the back of the clearing
  const hb = new THREE.Group(); hb.position.set(-3.5, 0, -5.5); hb.rotation.y = 0.3; root.add(hb);
  for (let i = 0; i < 4; i++) for (const [ax, p, half] of [['x', -1.8, 2.4], ['x', 1.8, 2.4], ['z', -2.4, 1.8], ['z', 2.4, 1.8]]) {
    const l = mk(new THREE.CylinderGeometry(0.13, 0.13, half * 2 + 0.5, 9), i % 2 ? bark : wd, hb);
    if (ax === 'x') { l.rotation.z = PI / 2; l.position.set(0, 0.13 + i * 0.24 + (i % 2 ? 0 : 0.12), p); } else { l.rotation.x = PI / 2; l.position.set(p, 0.25 + i * 0.24 + (i % 2 ? 0.12 : 0), 0); }
  }
  root.add(makeRailFence(-9, -2.5, -3.5, -9, mat(0x8a7558, 0.95)));
  root.add(makeRailFence(3, -8, 10, -3, mat(0x8a7558, 0.95)));
  // chips (instanced, the video animates them on each axe hit)
  const CH = 14, chips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.012, 0.03), mat(0xd9b88a, 0.8), CH); chips.frustumCulled = false; root.add(chips);

  // grave on a knoll: mound, plank marker, a few stones
  const G = DIMS.woods.grave;
  const knoll = mk(new THREE.SphereGeometry(6, 32, 12, 0, PI * 2, 0, 0.35), grassM, root, G[0], -5.63, G[1]);
  const mound = mk(new THREE.SphereGeometry(0.9, 18, 10, 0, PI * 2, 0, PI / 2), mat(0x5a4a34, 1), root, G[0], 0.33, G[1]); mound.scale.set(0.55, 0.22, 1.0);
  const marker = new THREE.Group(); marker.position.set(G[0], 0.33, G[1] - 0.95); root.add(marker);
  mk(new THREE.BoxGeometry(0.42, 0.62, 0.06), woodMat(0x8a7558), marker, 0, 0.31, 0);
  const markTex = canvasTex(128, 192, (g, w, h) => { g.fillStyle = '#8a7558'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(40,25,10,.8)'; g.font = 'bold 22px Georgia, serif'; g.textAlign = 'center'; g.fillText('NANCY', w / 2, 70); g.font = '18px Georgia, serif'; g.fillText('1784–1818', w / 2, 102); });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.6), new THREE.MeshStandardMaterial({ map: markTex, roughness: 0.9 })); plate.position.set(0, 0.31, 0.032); marker.add(plate);
  for (let i = 0; i < 7; i++) mk(new THREE.DodecahedronGeometry(0.08 + R() * 0.05), mat(0x8a857a, 0.9), root, G[0] + Math.sin(i) * 0.6, 0.36, G[1] + (i / 7 - 0.5) * 1.8);
  // wildflowers on the mound
  for (let i = 0; i < 9; i++) mk(new THREE.SphereGeometry(0.03, 6, 4), mat([0xf2e6a0, 0xe8a0b0, 0xffffff][i % 3], 0.7), root, G[0] + (R() - 0.5) * 0.7, 0.45, G[1] + (R() - 0.5) * 1.3);
  // falling leaves (autumn)
  const LV = 160, leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.07, 0.05), new THREE.MeshStandardMaterial({ color: 0xd9822f, side: THREE.DoubleSide, roughness: 0.8 }), LV);
  leaves.frustumCulled = false; root.add(leaves);
  const lSeeds = Array.from({ length: LV }, () => [R(), R(), R(), R()]);

  // road: dirt strip along x at z=road, fence beside it, a far cabin with a lit window at the end
  const rz = DIMS.woods.road;
  const road = mk(new THREE.PlaneGeometry(200, 2.6), new THREE.MeshStandardMaterial({ map: noiseTex('#7a6448', ['#5a4630', '#9a8060'], 8, [40, 1]), roughness: 1 }), root, 0, 0.01, rz); road.rotation.x = -PI / 2;
  root.add(makeRailFence(-60, rz - 1.9, 20, rz - 1.9, mat(0x7a6a55, 0.95)));
  const far = new THREE.Group(); far.position.set(DIMS.woods.farCabin[0], 0, DIMS.woods.farCabin[1]); root.add(far);
  mk(new THREE.BoxGeometry(4, 2.2, 3.4), mat(0x5a4230, 0.95), far, 0, 1.1, 0);
  const fr = mk(new THREE.ConeGeometry(3.2, 1.4, 4), mat(0x4a3a2c, 0.95), far, 0, 2.9, 0); fr.rotation.y = PI / 4; fr.scale.set(1, 1, 0.8);
  const farWin = mk(new THREE.PlaneGeometry(0.6, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb866).multiplyScalar(2.2), toneMapped: false }), far, 0.8, 1.2, 1.71);
  const farLight = new THREE.PointLight(0xffb060, 0, 10, 2); farLight.position.set(0.8, 1.3, 3); far.add(farLight);

  // lights
  const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x4a3a28, 1.0); root.add(hemi);
  const SUN_DIR = new THREE.Vector3(-0.55, 0.62, 0.55).normalize();
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005;
  root.add(sun, sun.target);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf4f1e2).multiplyScalar(1.4), toneMapped: false, fog: false }));
  moonDisc.position.set(60, 60, 150); moonDisc.lookAt(0, 0, 0); root.add(moonDisc);
  function setShadowFocus(cx = 0, cz = 0, half = 10, dir = SUN_DIR) {
    sun.target.position.set(cx, 0, cz); sun.position.copy(sun.target.position).addScaledVector(dir, 40);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 5, far: 100 }); sun.shadow.camera.updateProjectionMatrix();
  }
  const MODES = {
    summer: { leaf: [0x4f8a3a, 0x3f7a34], grass: 0xffffff, sky: [0x6fa2d8, 0xf0e2c4], sun: 0xfff0d8, sunI: 2.4, hemi: 1.0, hemiSky: 0xcfe2ff, dir: SUN_DIR, fog: [0xdfe4d8, 30, 160] },
    autumn: { leaf: [0xd9822f, 0xc4552a], grass: 0xd8c490, sky: [0x8a9ac0, 0xf2b67a], sun: 0xffc48a, sunI: 2.2, hemi: 0.8, hemiSky: 0xf0d0b0, dir: new THREE.Vector3(0.75, 0.32, -0.3).normalize(), fog: [0xe8c8a0, 25, 140] },
    night: { leaf: [0x2a4030, 0x243828], grass: 0x6a7a9a, sky: [0x0b1228, 0x26365a], sun: 0x9fb4e6, sunI: 0.75, hemi: 0.3, hemiSky: 0x5a6c9a, dir: new THREE.Vector3(0.3, 0.6, 0.75).normalize(), fog: [0x1a2238, 18, 90] },
  };
  const fog = new THREE.Fog(0xdfe4d8, 30, 160);
  let cur = null;
  function setMode(name, t = 0) {
    const m = MODES[name];
    if (name !== cur) {
      cur = name;
      leafM.color.setHex(m.leaf[0]); leafM2.color.setHex(m.leaf[1]); grassM.color.setHex(m.grass);
      sky.setColors(m.sky[0], m.sky[1]); sun.color.setHex(m.sun); sun.intensity = m.sunI; hemi.intensity = m.hemi; hemi.color.setHex(m.hemiSky);
      fog.color.setHex(m.fog[0]); fog.near = m.fog[1]; fog.far = m.fog[2];
      leaves.visible = name === 'autumn'; moonDisc.visible = name === 'night'; farLight.intensity = name === 'night' ? 6 : 0;
      farWin.visible = name === 'night'; root.userData.dir = m.dir;
    }
    if (leaves.visible) {
      const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
      lSeeds.forEach(([a, b, c, k], i) => {
        const fall = (t * (0.35 + k * 0.3) + b * 5) % 5;
        v.set(G[0] - 4 + a * 7 + Math.sin(t * 1.3 + i) * 0.3, 5 - fall, G[1] - 4 + c * 7);
        q.setFromEuler(e.set(t * (1 + k * 2) + i, t * 1.7 + i, i)); M4.compose(v, q, s); leaves.setMatrixAt(i, M4);
      });
      leaves.instanceMatrix.needsUpdate = true;
    }
  }
  setMode('summer'); setShadowFocus(0, 0, 10);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  ground.receiveShadow = true;
  return { root, sky, fog, stump, block, halves, chips, pile, marker, graveTree, trees, setMode, setShadowFocus: (x, z, h) => setShadowFocus(x, z, h, root.userData.dir || SUN_DIR), lights: { hemi, sun } };
}

// ---------------------------------------------------------------- RIVER
export function buildRiver(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const R = rng(opts.seed ?? 1828);
  const sky = makeSkyDome(0x3a5a9a, 0xf2a466, 380); root.add(sky.mesh);
  // sun disc low over the river (down-river, +x)
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(12, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd08a).multiplyScalar(1.8), toneMapped: false, fog: false }));
  sunDisc.position.set(-300, 26, -120); sunDisc.lookAt(0, 0, 0); root.add(sunDisc);
  const waterTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#5d6e66'; g.fillRect(0, 0, w, h); const r = rng(21);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,214,160' : '30,45,50'},${0.08 + r() * 0.18})`; g.fillRect(r() * w, r() * h, 30 + r() * 90, 2 + r() * 2); }
  }, [16, 6]);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 70), new THREE.MeshStandardMaterial({ map: waterTex, color: 0xb8c4c0, roughness: 0.22, metalness: 0.25 }));
  water.rotation.x = -PI / 2; water.receiveShadow = true; root.add(water);
  const bankM = new THREE.MeshStandardMaterial({ map: noiseTex('#5f6e3e', ['#3f4e28', '#7a8a50'], 22, [40, 6]), roughness: 1 });
  const mudM = mat(0x6a5a42, 1);
  for (const s of [-1, 1]) {
    const bank = mk(new THREE.BoxGeometry(900, 1.2, 200), bankM, root, 0, -0.1, s * (35 + 100)); bank.receiveShadow = true;
    const edge = mk(new THREE.BoxGeometry(900, 0.5, 3), mudM, root, 0, 0.0, s * 34.5); edge.rotation.x = s * 0.25;
  }
  const leafM = mat(0x3f6a34, 0.9), leafM2 = mat(0x52763a, 0.9), trunkM = mat(0x4e3a2a, 0.95);
  for (let i = 0; i < 160; i++) {
    const s = i % 2 ? 1 : -1, x = -300 + R() * 340, z = s * (38 + R() * 25);
    const tr = makeTree('oak', R() < 0.5 ? leafM : leafM2, R, trunkM, 1.2 + R() * 1.1); tr.t.position.set(x, 0.5, z); root.add(tr.t);
  }
  // New Orleans on the far (north, -z) bank: warehouses, houses, a cathedral with three spires, ship masts
  const town = new THREE.Group(); root.add(town);
  const wallCols = [0xd9c4a0, 0xc98e6a, 0xe8dcc4, 0xb8a080, 0xd8b890, 0xa87858];
  for (let i = 0; i < 34; i++) {
    const x = 40 + i * 5.2 + R() * 1.5, h = 5 + R() * 7, d = 6 + R() * 4, z = -40 - R() * 10;
    const b = mk(new THREE.BoxGeometry(4.6, h, d), mat(wallCols[i % wallCols.length], 0.9), town, x, h / 2 + 0.5, z);
    const roof = mk(new THREE.ConeGeometry(3.6, 2.2, 4), mat(0x6a4a3a, 0.9), town, x, h + 1.6, z); roof.rotation.y = PI / 4; roof.scale.set(1, 1, d / 5);
    for (let k = 0; k < Math.floor(h / 2.4); k++) mk(new THREE.PlaneGeometry(3.6, 0.6), mat(0x3a3028, 0.8), town, x, 2 + k * 2.4, z + d / 2 + 0.01);
  }
  const cath = new THREE.Group(); cath.position.set(110, 0.5, -48); town.add(cath);
  mk(new THREE.BoxGeometry(12, 12, 10), mat(0xf0ebe0, 0.85), cath, 0, 6, 0);
  [-5, 0, 5].forEach((x, i) => { mk(new THREE.BoxGeometry(2.6, i === 1 ? 18 : 15, 2.6), mat(0xf0ebe0, 0.85), cath, x, (i === 1 ? 18 : 15) / 2, 4); mk(new THREE.ConeGeometry(1.8, i === 1 ? 9 : 7, 6), mat(0x4a4a52, 0.6), cath, x, (i === 1 ? 22.5 : 18.5), 4); });
  for (let i = 0; i < 9; i++) {
    const x = 50 + i * 13, sh = new THREE.Group(); sh.position.set(x, 0, -30); town.add(sh);
    mk(new THREE.BoxGeometry(10, 1.6, 3), mat(0x3a2a20, 0.8), sh, 0, 0.6, 0);
    mk(new THREE.CylinderGeometry(0.15, 0.2, 13, 6), mat(0x4a3a2a, 0.8), sh, -2, 7, 0); mk(new THREE.CylinderGeometry(0.12, 0.16, 11, 6), mat(0x4a3a2a, 0.8), sh, 2.5, 6, 0);
    mk(new THREE.BoxGeometry(0.1, 0.1, 5), mat(0x4a3a2a, 0.8), sh, -2, 10, 0);
  }
  // flatboat (bow toward +x): hull, deck, cabin shed, barrels, a long steering sweep at the stern
  const boat = new THREE.Group(); root.add(boat);
  const plank = new THREE.MeshStandardMaterial({ map: plankTex('#8a6a48', 'rgba(30,15,5,.45)', [4, 1], 31), roughness: 0.9 });
  mk(new THREE.BoxGeometry(11, 0.7, 4), plank, boat, 0, 0.2, 0);
  mk(new THREE.BoxGeometry(11.2, 0.12, 4.2), woodMat(0x6a4c33), boat, 0, 0.58, 0);
  const shed = new THREE.Group(); shed.position.set(0.8, 0.6, 0); boat.add(shed);
  mk(new THREE.BoxGeometry(5, 1.5, 3.4), plank, shed, 0, 0.75, 0);
  const roofM = mat(0x5a4636, 0.95);
  mk(new THREE.BoxGeometry(5.4, 0.1, 3.8), roofM, shed, 0, 1.55, 0).rotation.x = 0.0;
  mk(new THREE.PlaneGeometry(0.8, 1.2), mat(0x2a1c12, 0.9), shed, -2.51, 0.6, 0).rotation.y = -PI / 2;
  const barrelM = mat(0x7a5434, 0.85), hoopM = mat(0x3a3a3a, 0.5);
  [[4.3, 1.2], [4.3, -1.2], [4.9, 0], [3.7, 0]].forEach(([x, z]) => { mk(new THREE.CylinderGeometry(0.3, 0.27, 0.75, 12), barrelM, boat, x, 1.0, z); mk(new THREE.TorusGeometry(0.3, 0.02, 6, 16), hoopM, boat, x, 1.15, z).rotation.x = PI / 2; });
  mk(new THREE.BoxGeometry(0.8, 0.5, 0.8), woodMat(0x9a7a50), boat, 4.0, 0.9, 1.5);
  // steering sweep: pivot on a post at the stern; the handle ends at boat x≈-3.8 (where the steersman's hands are), blade aft
  const sweep = new THREE.Group(); sweep.position.set(-5.0, 1.5, 0); boat.add(sweep);
  mk(new THREE.CylinderGeometry(0.08, 0.1, 1.0, 8), woodMat(0x5a4030), boat, -5.0, 1.0, 0);
  const oar = mk(new THREE.CylinderGeometry(0.045, 0.05, 5.7, 8), woodMat(0xa08060), sweep, -1.65, 0, 0); oar.rotation.z = PI / 2 + 0.12;   // blade end dips aft, handle rises to the hands
  mk(new THREE.BoxGeometry(1.4, 0.05, 0.45), woodMat(0xa08060), sweep, -4.4, -0.56, 0).rotation.z = 0.12;
  // lights
  const hemi = new THREE.HemisphereLight(0xb8c4e8, 0x5a4a30, 0.75); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb878, 2.4); sun.position.set(-30, 10, -14); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 2, far: 80 });
  root.add(sun, sun.target);
  const fog = new THREE.Fog(0xe8b890, 60, 330);
  const update = (t) => { waterTex.offset.x = -t * 0.025; };
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  water.receiveShadow = true;
  return { root, sky, fog, boat, sweep, town, update, lights: { hemi, sun } };
}

// ---------------------------------------------------------------- GENERAL STORE
export function buildStore(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const R = rng(opts.seed ?? 1831);
  const W2 = 3, D2 = 2.5, H = 2.7;
  const floorM = new THREE.MeshStandardMaterial({ map: plankTex('#8a6844', 'rgba(30,15,5,.5)', [3, 3], 41, true), roughness: 0.9 });
  const wallM = new THREE.MeshStandardMaterial({ map: plankTex('#a68660', 'rgba(40,20,5,.4)', [2, 2], 42), roughness: 0.95, side: THREE.DoubleSide });
  const fl = mk(new THREE.PlaneGeometry(W2 * 2, D2 * 2), floorM, root); fl.rotation.x = -PI / 2;
  const ceil = mk(new THREE.PlaneGeometry(W2 * 2, D2 * 2), mat(0x7a5a3c, 0.95, { side: THREE.DoubleSide }), root, 0, H, 0); ceil.rotation.x = PI / 2;
  mk(new THREE.PlaneGeometry(W2 * 2, H), wallM, root, 0, H / 2, -D2);
  mk(new THREE.PlaneGeometry(D2 * 2, H), wallM, root, -W2, H / 2, 0).rotation.y = PI / 2;
  // east wall with a window (four pieces around the opening)
  const ew = (z0, z1, y0, y1) => { const m = mk(new THREE.PlaneGeometry(z1 - z0, y1 - y0), wallM, root, W2, (y0 + y1) / 2, (z0 + z1) / 2); m.rotation.y = -PI / 2; };
  ew(-D2, -1.4, 0, H); ew(0.2, D2, 0, H); ew(-1.4, 0.2, 0, 0.9); ew(-1.4, 0.2, 2.0, H);
  for (let i = 0; i < 3; i++) mk(new THREE.BoxGeometry(0.06, 0.06, 1.6), woodMat(0x5a4030), root, W2, 1.1 + i * 0.4, -0.6);
  mk(new THREE.BoxGeometry(0.06, 1.1, 0.06), woodMat(0x5a4030), root, W2, 1.45, -0.6);
  // beams
  for (let x = -2; x <= 2; x += 2) mk(new THREE.BoxGeometry(0.16, 0.18, D2 * 2), woodMat(0x5a4030), root, x, H - 0.09, 0);
  // shelves on the back wall, loaded with jars, tins, bolts of cloth
  const shelfM = woodMat(0x6a4c33);
  const jarCols = [0xc9a45a, 0x8a3a2a, 0x5a7a3a, 0xd8d0b8, 0x3a5a7a, 0xb86a3a];
  for (let k = 0; k < 4; k++) {
    const y = 0.55 + k * 0.48;
    mk(new THREE.BoxGeometry(5.4, 0.04, 0.4), shelfM, root, 0, y, -D2 + 0.22);
    for (let x = -2.55; x < 2.6; x += 0.17 + R() * 0.08) {
      const kind = R();
      if (kind < 0.55) mk(new THREE.CylinderGeometry(0.055, 0.055, 0.17 + R() * 0.06, 10), mat(jarCols[Math.floor(R() * jarCols.length)], 0.5), root, x, y + 0.11, -D2 + 0.22);
      else if (kind < 0.8) mk(new THREE.BoxGeometry(0.12, 0.2, 0.12), mat(jarCols[Math.floor(R() * jarCols.length)], 0.7), root, x, y + 0.12, -D2 + 0.22);
      else { const b = mk(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 10), mat([0xa83a3a, 0x3a6a9a, 0xe8d8b0, 0x5a8a4a][Math.floor(R() * 4)], 0.95), root, x, y + 0.1, -D2 + 0.22); b.rotation.z = PI / 2; }
    }
  }
  for (const x of [-2.75, 2.75]) mk(new THREE.BoxGeometry(0.06, 2.2, 0.42), shelfM, root, x, 1.1, -D2 + 0.22);
  // counter
  const counter = new THREE.Group(); counter.position.set(0, 0, DIMS.store.counter); root.add(counter);
  mk(new THREE.BoxGeometry(3.8, 0.95, 0.6), new THREE.MeshStandardMaterial({ map: plankTex('#7a5a3a', 'rgba(30,15,5,.5)', [2, 1], 43, true), roughness: 0.85 }), counter, 0, 0.475, 0);
  mk(new THREE.BoxGeometry(3.95, 0.06, 0.7), woodMat(0x5a3d26, 0.6), counter, 0, 0.98, 0);
  // scale + jar of candy + ledger on the counter
  const scale = new THREE.Group(); scale.position.set(-1.1, 1.01, 0); counter.add(scale);
  const brass = mat(0xc9a050, 0.35, { metalness: 0.7 });
  mk(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 14), brass, scale, 0, 0.02, 0); mk(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 8), brass, scale, 0, 0.2, 0);
  mk(new THREE.BoxGeometry(0.5, 0.015, 0.015), brass, scale, 0, 0.38, 0);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.09, 0.07, 0.03, 14), brass, scale, s * 0.24, 0.24, 0);
  mk(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 14), new THREE.MeshStandardMaterial({ color: 0xe8f0e0, roughness: 0.1, transparent: true, opacity: 0.45 }), counter, 1.15, 1.13, 0.05);
  const ledger = makeOpenBook(0x3a2a20); ledger.position.set(0.95, 1.02, -0.05); ledger.rotation.y = 0.2; counter.add(ledger);
  // barrels + sacks in front
  const barrelM = mat(0x7a5434, 0.85), hoopM = mat(0x3a3a3a, 0.5);
  [[-2.4, 1.2], [-2.0, 1.8], [2.2, 1.6]].forEach(([x, z]) => { mk(new THREE.CylinderGeometry(0.3, 0.26, 0.8, 14), barrelM, root, x, 0.4, z); mk(new THREE.TorusGeometry(0.3, 0.02, 6, 16), hoopM, root, x, 0.6, z).rotation.x = PI / 2; mk(new THREE.CircleGeometry(0.29, 16), mat(0x9a7a50, 0.9), root, x, 0.801, z).rotation.x = -PI / 2; });
  [[-2.5, -1.4], [-2.2, -1.2], [2.5, -1.5]].forEach(([x, z]) => { const s = mk(new THREE.SphereGeometry(0.28, 14, 10), mat(0xd8c8a0, 1), root, x, 0.26, z); s.scale.set(1, 1.2, 0.8); });
  // lights: daylight through the east window, warm bounce, a hanging lantern
  const hemi = new THREE.HemisphereLight(0xfff0dc, 0x5a4030, 0.85); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.8); sun.position.set(12, 6, -2); sun.target.position.set(-1, 0.6, -0.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 2, far: 30 });
  root.add(sun, sun.target);
  const lamp = makeLantern(); lamp.g.position.set(-0.8, 2.25, -0.2); lamp.light.intensity = 2.5; root.add(lamp.g);
  const fillL = new THREE.PointLight(0xffd8a8, 3, 8, 2); fillL.position.set(0, 2.2, 1.5); root.add(fillL);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  return { root, counter, lights: { hemi, sun, fillL, lamp: lamp.light } };
}
