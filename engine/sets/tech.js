// SETS: modern tech / spaceflight (built for videos/011-elon-musk; reusable for any space, rocket, car or startup story).
// Each builder returns its own `root` at the origin — park them at offsets and show ONE per shot (007 montage technique).
//
//   buildSpace(studio)    black starfield, a big textured Earth (R = DIMS.space.R, center at the origin, sun from +x, clouds,
//                         atmosphere rim). Orbiting props go at radius ≈ R + 20…40 (top of the planet is y = R).
//                         setSpin(a) turns the Earth; makeStarlinkSwarm(n) gives an instanced satellite shell.
//   buildLaunch(studio)   seaside launch site with three dressings via setMode('island'|'landing'|'starbase', sky):
//                         island = palm atoll + small pad (Falcon 1 era), landing = night landing zone with a big X,
//                         starbase = steel catch tower with two arms (setArms(k): 0 open → 1 closed) + a beach for a crowd.
//                         Effects: setExplosion(pos, age), setPlume(pos, k) (engine plume + ground smoke), setSky(day|dusk|night).
//   buildFactory(studio)  rocket factory hangar (a Falcon stage on cradles, engines, work lights). setMode('day'|'night'|'showroom').
//   buildSuburb(studio)   sunny 1970s Pretoria street: white houses, terracotta roofs, purple jacaranda trees, petals.
//   buildCampus(studio)   sandstone arcade (arches, red-tile roof), palms, lawn, a path.
//   buildFlight(studio)   above-the-clouds sunset for a jet in flight (cloud deck below, sky dome, sun).
//   Props: makeFalcon(kind: 'f1'|'f9'), makeSuperHeavy(), makeDragon(), makeISS(), makeRoadster(color), makeModelS(color),
//          makeCybertruck(), makeJet(), makeCRT() ({g, screen, setScreen(drawFn)}), makeSink(), makeSatellite()
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng, clamp, lerp } from '@engine/core.js';
import { makeSkyDome } from '@engine/sets/military.js';
import { COUNTRIES } from '@engine/data/world110.js';

const PI = Math.PI;
export const DIMS = { space: { R: 400 }, launch: { pad: [0, 0], tower: [0, 0], beach: 260 } };
const glowMat = (c, k = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
const steel = () => new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.32, metalness: 0.85 });
function dotTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, '#fff'); r.addColorStop(0.4, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
/** Soft round sprite texture: stops = [[0, css], [0.5, css], [1, css]]. */
function softTex(stops, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(([k, col]) => r.addColorStop(k, col));
  g.fillStyle = r; g.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const FIRE_TEX = { t: null }, SMOKE_TEX = { t: null };
const fireTex = () => (FIRE_TEX.t = FIRE_TEX.t || softTex([[0, 'rgba(255,255,240,1)'], [0.25, 'rgba(255,210,120,0.95)'], [0.55, 'rgba(255,120,40,0.55)'], [1, 'rgba(120,30,0,0)']]));
const smokeTex = () => (SMOKE_TEX.t = SMOKE_TEX.t || softTex([[0, 'rgba(255,255,255,0.9)'], [0.45, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]));
/** A pool of camera-facing soft sprites (fire = additive glow, smoke = soft alpha). Each sprite: set(i, pos, size, opacity, color). */
export function makeSpritePool(parent, n, kind = 'smoke') {
  const items = Array.from({ length: n }, () => {
    const m = new THREE.SpriteMaterial({ map: kind === 'fire' ? fireTex() : smokeTex(), transparent: true, depthWrite: false, toneMapped: kind !== 'fire',
      blending: kind === 'fire' ? THREE.AdditiveBlending : THREE.NormalBlending, color: kind === 'fire' ? new THREE.Color(1.6, 1.2, 0.8) : new THREE.Color(0xd8d4cc) });
    const sp = new THREE.Sprite(m); sp.visible = false; parent.add(sp); return sp;
  });
  return {
    items,
    hide() { items.forEach((s) => (s.visible = false)); },
    set(i, pos, size, opacity, color) { const s = items[i]; s.visible = opacity > 0.01 && size > 0.01; s.position.copy(pos); s.scale.setScalar(size); s.material.opacity = opacity; s.material.rotation = i * 1.7; if (color) s.material.color.copy(color); },
  };
}
function shadowsOff(root) { root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } }); }

// ---------------------------------------------------------------- PROPS
/** Falcon rocket, base at y=0, along +y. 'f1' ≈ 21 m (black/white, 1 engine), 'f9' ≈ 70 m (white, black interstage, legs,
 *  grid fins). Returns {g, legs[], fins[], setLegs(k), booster (the first stage group, for landings), flameAt (y of nozzles)}. */
export function makeFalcon(kind = 'f9') {
  const g = new THREE.Group(), white = mat(0xf4f4f2, 0.4), black = mat(0x1e1e22, 0.5), metal = mat(0x6a6c70, 0.35, { metalness: 0.7 });
  const f9 = kind === 'f9', r = f9 ? 1.85 : 0.85, h1 = f9 ? 41 : 14, h2 = f9 ? 14 : 5, hf = f9 ? 13 : 3;
  const booster = new THREE.Group(); g.add(booster);
  mk(new THREE.CylinderGeometry(r, r, h1, 32), white, booster, 0, h1 / 2 + 1, 0);
  mk(new THREE.CylinderGeometry(r * 1.01, r * 1.01, f9 ? 4 : 1.2, 32), black, booster, 0, h1 + 1 - (f9 ? 2 : 0.6), 0);   // interstage
  const eng = new THREE.Group(); booster.add(eng);
  const n = f9 ? 9 : 1;
  for (let i = 0; i < n; i++) { const a = (i / Math.max(1, n - 1)) * PI * 2, rr = i === n - 1 && f9 ? 0 : r * 0.6; const bell = mk(new THREE.CylinderGeometry(0.18 * (f9 ? 1 : 1.6), 0.42 * (f9 ? 1 : 1.6), 1.2, 14, 1, true), metal, eng, f9 ? Math.cos(a) * rr : 0, 0.6, f9 ? Math.sin(a) * rr : 0); bell.material.side = THREE.DoubleSide; }
  const legs = [], fins = [];
  if (f9) {
    for (let i = 0; i < 4; i++) {
      const piv = new THREE.Group(); piv.position.set(Math.cos(i * PI / 2 + PI / 4) * r, 9, Math.sin(i * PI / 2 + PI / 4) * r); piv.rotation.y = -(i * PI / 2 + PI / 4); booster.add(piv);
      const leg = mk(new THREE.BoxGeometry(0.45, 9.5, 0.6), black, piv, 0.1, -4.6, 0); legs.push(piv);
      const fp = new THREE.Group(); fp.position.set(Math.cos(i * PI / 2) * (r + 0.1), h1 - 1.5, Math.sin(i * PI / 2) * (r + 0.1)); fp.rotation.y = -i * PI / 2; booster.add(fp);
      mk(new THREE.BoxGeometry(0.15, 1.6, 1.3), metal, fp, 0.8, 0, 0); fins.push(fp);
    }
  }
  const upper = new THREE.Group(); upper.position.y = h1 + 1; g.add(upper);
  mk(new THREE.CylinderGeometry(r, r, h2, 32), white, upper, 0, h2 / 2, 0);
  mk(new THREE.CylinderGeometry(r * (f9 ? 1.4 : 1.1), r, hf * 0.45, 32), white, upper, 0, h2 + hf * 0.225, 0);
  mk(new THREE.ConeGeometry(r * (f9 ? 1.4 : 1.1), hf * 0.55, 32), white, upper, 0, h2 + hf * 0.45 + hf * 0.275, 0);
  const setLegs = (k) => legs.forEach((p) => (p.rotation.z = lerp(0, -0.55, k)));  // 0 folded along the body, 1 deployed
  const setFins = (k) => fins.forEach((p) => (p.children[0].position.x = lerp(0.1, 0.8, k)));
  setLegs(0); setFins(0);
  return { g, booster, upper, legs, fins, setLegs, setFins, height: h1 + h2 + hf + 1, radius: r };
}
/** Starship Super Heavy booster: stainless, 9 m wide, 71 m tall, base at y=0; grid fins near the top + the catch pins. */
export function makeSuperHeavy() {
  const g = new THREE.Group(), st = steel(), dark = mat(0x2a2c30, 0.5, { metalness: 0.6 });
  mk(new THREE.CylinderGeometry(4.5, 4.5, 70, 40), st, g, 0, 36, 0);
  for (let i = 0; i < 9; i++) mk(new THREE.CylinderGeometry(4.53, 4.53, 0.25, 40), mat(0x9aa0a8, 0.3, { metalness: 0.9 }), g, 0, 6 + i * 7.5, 0);   // weld rings
  mk(new THREE.CylinderGeometry(3.6, 4.5, 2, 40), dark, g, 0, 1, 0);
  for (let i = 0; i < 4; i++) { const f = mk(new THREE.BoxGeometry(0.4, 4, 3.4), dark, g, Math.cos(i * PI / 2 + PI / 4) * 5.3, 66, Math.sin(i * PI / 2 + PI / 4) * 5.3); f.rotation.y = -(i * PI / 2 + PI / 4); }
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(1.2, 0.8, 1.2), dark, g, s * 5.0, 63.5, 0);                                      // catch pins
  return { g, height: 71 };
}
/** Catch tower ("chopsticks"): square lattice 12 m wide, 145 m tall; two arms that swing closed around a booster at x=+15.
 *  Returns {g, setArms(k), armY} — the booster's catch pins sit at armY when caught. */
export function makeTower() {
  const g = new THREE.Group(), m = mat(0x3a3e44, 0.6, { metalness: 0.5 });
  const H = 145, S = 12;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.BoxGeometry(1.0, H, 1.0), m, g, (x * S) / 2, H / 2, (z * S) / 2);
  for (let y = 6; y < H; y += 6) for (const [ax, x, z] of [['x', 0, -S / 2], ['x', 0, S / 2], ['z', -S / 2, 0], ['z', S / 2, 0]]) {
    const b = mk(new THREE.BoxGeometry(ax === 'x' ? S : 0.4, 0.4, ax === 'x' ? 0.4 : S), m, g, x, y, z);
    const d = mk(new THREE.BoxGeometry(ax === 'x' ? S * 1.4 : 0.3, 0.3, ax === 'x' ? 0.3 : S * 1.4), m, g, x, y - 3, z); d.rotation[ax === 'x' ? 'z' : 'x'] = 0.46 * (y % 12 ? 1 : -1);
  }
  const armY = 100, arms = [];
  const carriage = mk(new THREE.BoxGeometry(S + 3, 6, S + 3), mat(0x2e3238, 0.6, { metalness: 0.5 }), g, 0, armY + 2, 0);
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(S / 2 + 0.5, armY, s * (S / 2 - 1)); g.add(piv);
    const arm = mk(new THREE.BoxGeometry(32, 3.2, 2.2), mat(0x8a8e94, 0.4, { metalness: 0.7 }), piv, 16, 0, 0);
    mk(new THREE.BoxGeometry(32, 0.6, 2.6), mat(0x1e1e22, 0.6), piv, 16, 1.9, 0);
    arms.push({ piv, s });
  }
  mk(new THREE.BoxGeometry(14, 0.6, 14), m, g, 0, H, 0);
  const setArms = (k) => arms.forEach(({ piv, s }) => (piv.rotation.y = s * lerp(0.55, 0.12, k)));
  setArms(0);
  return { g, setArms, armY, catchX: S / 2 + 0.5 + 15.5 };
}
/** Crew Dragon: white capsule (dark heat shield, windows, side thruster pods, open nose cone) on a trunk with solar cells. Nose = +y. */
export function makeDragon() {
  const g = new THREE.Group(), white = mat(0xf4f4f2, 0.35), black = mat(0x16161a, 0.5), glass = new THREE.MeshStandardMaterial({ color: 0x0a1018, roughness: 0.05, metalness: 0.7 });
  mk(new THREE.CylinderGeometry(1.0, 2.0, 3.0, 40), white, g, 0, 1.5, 0);
  mk(new THREE.CylinderGeometry(2.02, 2.02, 0.25, 40), black, g, 0, 0.05, 0);                                   // heat-shield rim
  for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; const w = mk(new THREE.BoxGeometry(0.38, 0.32, 0.06), glass, g, Math.sin(a) * 1.62, 1.35, Math.cos(a) * 1.62); w.rotation.y = a; w.rotation.x = -0.32; }
  for (let i = 0; i < 4; i++) { const a = i * PI / 2; const pod = mk(new THREE.BoxGeometry(0.5, 0.42, 0.14), black, g, Math.sin(a) * 1.25, 2.35, Math.cos(a) * 1.25); pod.rotation.y = a; pod.rotation.x = -0.35; }
  mk(new THREE.CylinderGeometry(0.75, 0.75, 0.18, 32), mat(0x9a9ca0, 0.3, { metalness: 0.8 }), g, 0, 3.08, 0);      // docking adapter
  const nose = new THREE.Group(); nose.position.set(0, 3.0, -0.9); nose.rotation.x = -1.1; g.add(nose);           // hinged-open nose cone
  mk(new THREE.SphereGeometry(1.0, 24, 12, 0, PI * 2, 0, PI / 2), white, nose, 0, 0, 0.9).scale.set(1, 0.45, 1);
  mk(new THREE.CylinderGeometry(2.0, 2.0, 2.8, 40), white, g, 0, -1.4, 0);                                       // trunk
  const cells = new THREE.MeshStandardMaterial({ color: 0x15204a, roughness: 0.25, metalness: 0.6, side: THREE.DoubleSide });
  mk(new THREE.CylinderGeometry(2.02, 2.02, 1.8, 40, 1, true, 0, PI), cells, g, 0, -1.4, 0);
  for (let i = 0; i < 4; i++) { const f = mk(new THREE.BoxGeometry(0.08, 1.0, 0.9), white, g, Math.sin(i * PI / 2) * 2.25, -2.3, Math.cos(i * PI / 2) * 2.25); f.rotation.y = i * PI / 2; }
  return { g };
}

/** International Space Station (toy scale ~110 m): truss along x, 8 golden solar wings, white radiators, pressurized modules
 *  along z with the docking port at +z. Returns {g, port, wings[] (rotate .rotation.x to face the sun/camera)}. */
export function makeISS() {
  const g = new THREE.Group(), truss = mat(0xc8c8c4, 0.5, { metalness: 0.4 }), mod = mat(0xeceae4, 0.45, { metalness: 0.15 }), dark = mat(0x3a3a3e, 0.5);
  const panel = new THREE.MeshStandardMaterial({ map: canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#c08a2a'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(70,40,10,.7)'; c.lineWidth = 3;
    for (let x = 0; x <= w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.fillStyle = 'rgba(255,230,160,.18)'; c.fillRect(0, 0, w, h * 0.5); }),
    roughness: 0.3, metalness: 0.55, side: THREE.DoubleSide, emissive: 0x2a1a05 });
  mk(new THREE.BoxGeometry(100, 2.2, 2.2), truss, g, 0, 0, 0);
  for (let x = -48; x <= 48; x += 4) { const d = mk(new THREE.BoxGeometry(0.2, 3, 0.2), dark, g, x, 0, 1.1); d.rotation.z = 0.7; }
  const wings = [];
  for (const x of [-44, -32, 32, 44]) for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(x, 0, 0); g.add(piv); piv.rotation.x = 0.55;
    mk(new THREE.BoxGeometry(10, 0.12, 36), panel, piv, 0, 0, s * 19.5); mk(new THREE.BoxGeometry(0.4, 0.4, 37), dark, piv, 0, 0.2, s * 19.5); wings.push(piv);
  }
  for (const [z, r, l] of [[-16, 2.2, 10], [-5.5, 2.1, 9], [5, 2.2, 10], [14.5, 1.6, 6]]) {
    const c = mk(new THREE.CylinderGeometry(r, r, l, 28), mod, g, 0, -3.5, z); c.rotation.x = PI / 2;
    for (const e of [-l / 2 + 0.3, l / 2 - 0.3]) { const ring = mk(new THREE.TorusGeometry(r, 0.12, 6, 28), mat(0xb8b8b4, 0.4), g, 0, -3.5, z + e); }
  }
  for (const [x, z] of [[-6, -16], [6, -16]]) { const c = mk(new THREE.CylinderGeometry(1.8, 1.8, 7, 24), mod, g, x, -3.5, z); c.rotation.z = PI / 2; }   // side modules
  for (const s of [-1, 1]) { const rad = mk(new THREE.BoxGeometry(14, 0.15, 6), mat(0xf6f6f6, 0.5), g, s * 15, -1.2, -6); rad.rotation.z = s * 0.15; }
  for (let i = 0; i < 6; i++) mk(new THREE.SphereGeometry(0.15, 8, 6), glowMat(i % 2 ? 0xff4a3a : 0xffffff, 2), g, -48 + i * 19, 1.3, 0);
  return { g, port: new THREE.Vector3(0, -3.5, 17.7), wings };
}

/** Red Tesla Roadster (open top), 4 m long, faces +z, wheels on y=0. Seat at roadster.seat (driver = left, x<0). */
export function makeRoadster(color = 0xc81e1e) {
  const g = new THREE.Group(), paint = new THREE.MeshStandardMaterial({ color, roughness: 0.18, metalness: 0.55 }), black = mat(0x141416, 0.45), tire = mat(0x1a1a1a, 0.8), chrome = mat(0xb8bcc0, 0.2, { metalness: 0.9 });
  mk(new RoundedBoxGeometry(1.72, 0.42, 3.9, 5, 0.2), paint, g, 0, 0.55, 0);                                  // tub
  for (const z of [1.25, -1.25]) for (const x of [-0.72, 0.72]) { const f = mk(new THREE.SphereGeometry(0.48, 20, 12), paint, g, x, 0.6, z); f.scale.set(0.62, 0.62, 1.15); }   // fenders
  mk(new RoundedBoxGeometry(1.5, 0.22, 1.25, 4, 0.1), paint, g, 0, 0.78, 1.2).rotation.x = -0.12;           // hood
  mk(new RoundedBoxGeometry(1.5, 0.28, 0.8, 4, 0.12), paint, g, 0, 0.82, -1.45);                            // rear deck
  mk(new RoundedBoxGeometry(1.45, 0.3, 1.5, 3, 0.1), black, g, 0, 0.72, -0.2);                              // cabin tub (interior)
  const frame = mk(new THREE.TorusGeometry(0.72, 0.035, 6, 24, PI), black, g, 0, 0.82, 0.48); frame.rotation.set(-0.95, 0, 0); frame.scale.set(1, 0.42, 1);
  mk(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.45, side: THREE.DoubleSide }), g, 0, 1.0, 0.42).rotation.x = -0.95;
  for (const sx of [-1, 1]) { mk(new RoundedBoxGeometry(0.5, 0.55, 0.5, 2, 0.12), black, g, sx * 0.36, 0.8, -0.35); mk(new RoundedBoxGeometry(0.5, 0.12, 0.45, 2, 0.05), black, g, sx * 0.36, 0.62, -0.15); }
  mk(new THREE.TorusGeometry(0.17, 0.025, 6, 18), black, g, -0.36, 0.95, 0.15).rotation.x = -1.0;          // steering wheel
  const dash = mk(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshBasicMaterial({ map: canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#05080c'; c.fillRect(0, 0, w, h); c.fillStyle = '#6aff8a'; c.font = 'bold 18px Helvetica, Arial'; c.textAlign = 'center'; c.fillText("DON'T PANIC!", w / 2, 38); }), toneMapped: false }), g, 0.05, 0.92, 0.32);
  dash.rotation.x = -0.6;
  for (const [x, z] of [[-0.82, 1.25], [0.82, 1.25], [-0.82, -1.25], [0.82, -1.25]]) { const w = mk(new THREE.CylinderGeometry(0.33, 0.33, 0.26, 24), tire, g, x, 0.33, z); w.rotation.z = PI / 2; mk(new THREE.CylinderGeometry(0.22, 0.22, 0.27, 10), chrome, g, x, 0.33, z).rotation.z = PI / 2; }
  for (const sx of [-1, 1]) { const hl = mk(new THREE.SphereGeometry(0.11, 12, 8), glowMat(0xffffff, 1.4), g, sx * 0.55, 0.68, 1.93); hl.scale.set(1.6, 0.6, 0.4); }
  mk(new THREE.BoxGeometry(1.2, 0.05, 0.04), glowMat(0xff2a2a, 1.6), g, 0, 0.78, -1.96);
  return { g, paint, seat: new THREE.Vector3(-0.36, 0.55, -0.3) };
}

export function makeModelS(color = 0xe8e8ec) {
  const g = new THREE.Group(), paint = new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0.6 }), glass = new THREE.MeshStandardMaterial({ color: 0x10161e, roughness: 0.04, metalness: 0.7 }), tire = mat(0x141414, 0.8), rim = mat(0x8a8e94, 0.25, { metalness: 0.85 });
  mk(new RoundedBoxGeometry(1.95, 0.62, 4.95, 5, 0.28), paint, g, 0, 0.68, 0);
  const cab = mk(new THREE.SphereGeometry(1.0, 32, 16, 0, PI * 2, 0, PI / 2), glass, g, 0, 0.95, -0.3); cab.scale.set(0.86, 0.55, 2.1);
  mk(new RoundedBoxGeometry(1.9, 0.08, 1.4, 3, 0.04), paint, g, 0, 0.99, 1.65).rotation.x = -0.06;
  for (const [x, z] of [[-0.9, 1.5], [0.9, 1.5], [-0.9, -1.55], [0.9, -1.55]]) { const w = mk(new THREE.CylinderGeometry(0.37, 0.37, 0.26, 24), tire, g, x, 0.37, z); w.rotation.z = PI / 2; mk(new THREE.CylinderGeometry(0.27, 0.27, 0.27, 10), rim, g, x, 0.37, z).rotation.z = PI / 2; }
  for (const sx of [-1, 1]) { const hl = mk(new THREE.BoxGeometry(0.42, 0.05, 0.05), glowMat(0xffffff, 1.6), g, sx * 0.62, 0.84, 2.47); hl.rotation.z = sx * 0.12; }
  mk(new THREE.BoxGeometry(1.6, 0.04, 0.04), glowMat(0xff2a2a, 1.6), g, 0, 0.86, -2.47);
  return { g, paint };
}

/** Cybertruck: an angular stainless wedge (triangle-profile extrusion), black fender arches, aero wheels, full-width light bars. */
export function makeCybertruck() {
  const g = new THREE.Group(), st = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.3, metalness: 0.9, flatShading: true }), tire = mat(0x141414, 0.8), arch = mat(0x1a1a1c, 0.7);
  const shape = new THREE.Shape();   // profile in (z, y): nose low at +z, apex over the cabin, flat bed to the tail
  shape.moveTo(2.95, 0.55); shape.lineTo(2.95, 0.98); shape.lineTo(0.15, 1.95); shape.lineTo(-2.95, 1.3); shape.lineTo(-2.95, 0.55); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.02, bevelEnabled: false }); geo.translate(0, 0, -1.01);
  const body = new THREE.Mesh(geo, st); body.rotation.y = -PI / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.04, metalness: 0.7 });
  const ws = mk(new THREE.PlaneGeometry(1.9, 1.62), glass, g, 0, 1.47, 1.56); ws.rotation.x = -1.22;               // windshield
  for (const sx of [-1, 1]) { const sw = mk(new THREE.PlaneGeometry(2.3, 0.42), glass, g, sx * 1.015, 1.38, 0.05); sw.rotation.y = sx * PI / 2; sw.rotation.x = 0; }   // side windows
  for (const [x, z] of [[-1.0, 1.95], [1.0, 1.95], [-1.0, -1.95], [1.0, -1.95]]) {
    const a = mk(new THREE.BoxGeometry(0.12, 0.62, 1.35), arch, g, x * 1.03, 0.62, z); a.rotation.z = 0;
    const w = mk(new THREE.CylinderGeometry(0.46, 0.46, 0.34, 24), tire, g, x, 0.46, z); w.rotation.z = PI / 2;
    mk(new THREE.CylinderGeometry(0.4, 0.4, 0.35, 6), mat(0x2a2c30, 0.5, { metalness: 0.5 }), g, x, 0.46, z).rotation.z = PI / 2;
  }
  mk(new THREE.BoxGeometry(2.02, 0.05, 0.05), glowMat(0xffffff, 2.2), g, 0, 0.97, 2.96);
  mk(new THREE.BoxGeometry(2.02, 0.05, 0.05), glowMat(0xff2020, 2.0), g, 0, 1.25, -2.96);
  return { g };
}

/** Airliner (~34 m), nose toward +z: fuselage with nose cone + cockpit windows, swept wings with winglets, under-wing engines,
 *  swept tail, a navy cheatline + tail livery, cabin windows. */
export function makeJet() {
  const g = new THREE.Group(), white = mat(0xf4f4f6, 0.3, { metalness: 0.15 }), navy = mat(0x1e3a7a, 0.4), grey = mat(0xb0b4ba, 0.35, { metalness: 0.5 }), dark = mat(0x101418, 0.2);
  const body = mk(new THREE.CylinderGeometry(2.0, 2.0, 28, 32), white, g, 0, 0, 0); body.rotation.x = PI / 2;
  const nose = mk(new THREE.SphereGeometry(2.0, 32, 16, 0, PI * 2, 0, PI / 2), white, g, 0, 0, 14); nose.rotation.x = PI / 2; nose.scale.set(1, 1.6, 1);
  const tailc = mk(new THREE.ConeGeometry(2.0, 7, 32), white, g, 0, 0.5, -17.5); tailc.rotation.x = -PI / 2; tailc.scale.set(1, 1, 0.75);
  for (const sx of [-1, 1]) { const cw = mk(new THREE.BoxGeometry(0.06, 0.32, 0.7), dark, g, sx * 1.15, 0.85, 16.3); cw.rotation.y = sx * 0.6; }
  for (const sx of [-1, 1]) mk(new THREE.BoxGeometry(0.04, 0.22, 26), navy, g, sx * 2.0, -0.35, -1);              // cheatline
  for (let i = 0; i < 22; i++) for (const sx of [-1, 1]) mk(new THREE.BoxGeometry(0.05, 0.3, 0.22), dark, g, sx * 2.0, 0.42, 11 - i * 1.1);
  const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.lineTo(17, -7); wingShape.lineTo(17, -9.2); wingShape.lineTo(0, -6.5); wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.35, bevelEnabled: false });
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(wingGeo, white); w.rotation.x = -PI / 2; w.scale.x = sx; w.position.set(sx * 1.6, -1.0, 4.5); w.castShadow = true; g.add(w);
    const wl = mk(new THREE.BoxGeometry(0.2, 2.2, 1.6), navy, g, sx * 18.4, 0.0, -3.6); wl.rotation.z = sx * -0.25;
    const e = mk(new THREE.CylinderGeometry(1.0, 0.85, 4, 24), grey, g, sx * 6.2, -2.1, 3.6); e.rotation.x = PI / 2;
    mk(new THREE.CircleGeometry(0.85, 20), dark, g, sx * 6.2, -2.1, 5.62);
    mk(new THREE.BoxGeometry(0.3, 1.0, 2.5), grey, g, sx * 6.2, -1.4, 3.4);
  }
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(5.5, 0); fin.lineTo(7.5, 7); fin.lineTo(5.6, 7); fin.closePath();
  const finM = new THREE.Mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.3, bevelEnabled: false }), navy); finM.rotation.y = PI / 2; finM.position.set(-0.15, 1.2, -13); g.add(finM);
  const hs = new THREE.Shape(); hs.moveTo(0, 0); hs.lineTo(6, -3); hs.lineTo(6, -4.4); hs.lineTo(0, -3.2); hs.closePath();
  for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.2, bevelEnabled: false }), white); h.rotation.x = -PI / 2; h.scale.x = sx; h.position.set(sx * 0.8, 0.6, -14.5); g.add(h); }
  for (const sx of [-1, 1]) mk(new THREE.SphereGeometry(0.12, 8, 6), glowMat(sx < 0 ? 0xff3030 : 0x30ff60, 2.5), g, sx * 18.4, 1.0, -3.6);
  return { g, engines: [new THREE.Vector3(-6.2, -2.1, 1.4), new THREE.Vector3(6.2, -2.1, 1.4)] };
}

/** Beige 1980s home computer + CRT monitor; setScreen(draw(ctx, w, h)) repaints the 320×240 screen (emissive). */
export function makeCRT() {
  const g = new THREE.Group(), beige = mat(0xd8cfb8, 0.6), dark = mat(0x2a2620, 0.5);
  mk(new RoundedBoxGeometry(0.42, 0.36, 0.38, 3, 0.04), beige, g, 0, 0.18 + 0.1, -0.02);
  const c = document.createElement('canvas'); c.width = 320; c.height = 240;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.24), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(0, 0.29, 0.172); g.add(screen);
  mk(new RoundedBoxGeometry(0.48, 0.07, 0.2, 2, 0.02), beige, g, 0, 0.035, 0.32);                                    // keyboard
  for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) mk(new THREE.BoxGeometry(0.03, 0.012, 0.03), dark, g, -0.19 + k * 0.042, 0.075, 0.26 + r * 0.04);
  const glow = new THREE.PointLight(0x8ab8ff, 0.7, 2.2, 2); glow.position.set(0, 0.3, 0.75); g.add(glow);   // a softer glow, further out: 1.6 at 0.45 m blew the beige bezel to white
  const setScreen = (draw) => { const ctx = c.getContext('2d'); draw(ctx, 320, 240); tex.needsUpdate = true; };
  setScreen((x, w, h) => { x.fillStyle = '#3040a0'; x.fillRect(0, 0, w, h); });
  return { g, screen, glow, setScreen };
}
/** A white porcelain bathroom sink (bowl + pedestal-less basin), ~0.55 m wide — carried with both hands. */
export function makeSink() {
  const g = new THREE.Group(), por = mat(0xf6f6f4, 0.15);
  mk(new RoundedBoxGeometry(0.55, 0.16, 0.42, 3, 0.05), por, g, 0, 0, 0);
  const bowl = mk(new THREE.SphereGeometry(0.17, 20, 10, 0, PI * 2, PI / 2, PI / 2), por, g, 0, 0.0, 0); bowl.scale.set(1.2, 0.8, 1);
  mk(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 8), mat(0xc0c4c8, 0.2, { metalness: 0.9 }), g, 0, 0.12, -0.14);
  return { g };
}
/** Starship upper stage: stainless, 9 m wide, 50 m tall, base at y=0; ogive nose, black forward/aft flaps, 6 engines. */
export function makeStarship() {
  const g = new THREE.Group(), st = steel(), dark = mat(0x1a1a1e, 0.5), tile = mat(0x16161a, 0.7);
  mk(new THREE.CylinderGeometry(4.5, 4.5, 36, 40), st, g, 0, 19, 0);
  const shield = mk(new THREE.CylinderGeometry(4.52, 4.52, 36, 40, 1, true, -PI / 2, PI), tile, g, 0, 19, 0);    // heat-shield side
  const nose = mk(new THREE.SphereGeometry(4.5, 40, 20, 0, PI * 2, 0, PI / 2), st, g, 0, 37, 0); nose.scale.set(1, 2.8, 1);
  for (const sx of [-1, 1]) { mk(new THREE.BoxGeometry(0.4, 9, 3.8), dark, g, sx * 5.0, 41, 0).rotation.z = sx * 0.2; mk(new THREE.BoxGeometry(0.5, 11, 5), dark, g, sx * 5.2, 6, 0); }
  for (let i = 0; i < 6; i++) { const a = i * PI / 3; const b = mk(new THREE.CylinderGeometry(0.5, 1.1, 1.6, 16, 1, true), mat(0x6a6c70, 0.3, { metalness: 0.8, side: THREE.DoubleSide }), g, Math.cos(a) * 2.6, 0.2, Math.sin(a) * 2.6); }
  for (let i = 0; i < 3; i++) { const leg = mk(new THREE.BoxGeometry(0.8, 3, 0.8), dark, g, Math.cos(i * 2.1) * 4.2, 0.6, Math.sin(i * 2.1) * 4.2); }
  return { g, height: 50 };
}
export function makeSatellite() {
  const g = new THREE.Group();
  mk(new THREE.BoxGeometry(1.2, 0.15, 2.4), mat(0xd8d8d4, 0.4, { metalness: 0.5 }), g);
  mk(new THREE.BoxGeometry(1.1, 0.05, 6), new THREE.MeshStandardMaterial({ color: 0x1a2a50, roughness: 0.3, metalness: 0.6 }), g, 0, 0.1, 4.2);
  return { g };
}

// ---------------------------------------------------------------- SPACE
function earthTexture() {
  return canvasTex(4096, 2048, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0d2a52'); gr.addColorStop(0.5, '#124a86'); gr.addColorStop(1, '#0d2a52');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const R = rng(3);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(80,150,220,${R() * 0.06})`; g.fillRect(R() * w, R() * h, 4 + R() * 30, 2 + R() * 4); }
    const X = (lon) => ((lon / 10 + 180) / 360) * w, Y = (lat) => ((90 - lat / 10) / 180) * h;
    for (const rings of Object.values(COUNTRIES)) for (const ring of rings) {
      let lat = 0; for (let i = 1; i < ring.length; i += 2) lat += ring[i]; lat /= ring.length / 2 * 10;
      g.fillStyle = Math.abs(lat) > 62 ? '#e8eef2' : Math.abs(lat) < 30 && R() < 0.4 ? '#b89a62' : ['#4a7a3a', '#5a8a42', '#6a8a4a'][Math.floor(R() * 3)];
      g.beginPath(); for (let i = 0; i < ring.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, X(ring[i]), Y(ring[i + 1])); g.closePath(); g.fill();
    }
    g.fillStyle = '#eef3f6'; g.fillRect(0, h * 0.95, w, h * 0.05); g.fillRect(0, 0, w, h * 0.03);
  });
}
function cloudTexture() {
  return canvasTex(2048, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h); const R = rng(8);
    // soft puffs in weather bands (ITCZ + mid-latitude storm tracks), each a radial gradient so edges stay fuzzy
    const band = () => { const b = R(); return b < 0.3 ? 0.5 + (R() - 0.5) * 0.08 : b < 0.65 ? 0.3 + (R() - 0.5) * 0.12 : 0.7 + (R() - 0.5) * 0.12; };
    for (let i = 0; i < 2600; i++) {
      const x = R() * w, y = (R() < 0.75 ? band() : 0.1 + R() * 0.8) * h, r = 3 + Math.pow(R(), 2) * 26, a = 0.06 + R() * 0.2;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * (1.5 + R()), r, 0, 0, PI * 2); g.fill();
    }
  });
}
/** City lights: warm dots scattered over land (sampled from a land mask), for the night side. */
function cityTexture() {
  const mw = 1024, mh = 512, mask = document.createElement('canvas'); mask.width = mw; mask.height = mh; const mg = mask.getContext('2d');
  mg.fillStyle = '#000'; mg.fillRect(0, 0, mw, mh); mg.fillStyle = '#fff';
  const X = (lon) => ((lon / 10 + 180) / 360) * mw, Y = (lat) => ((90 - lat / 10) / 180) * mh;
  for (const rings of Object.values(COUNTRIES)) for (const ring of rings) { mg.beginPath(); for (let i = 0; i < ring.length; i += 2) (i ? mg.lineTo : mg.moveTo).call(mg, X(ring[i]), Y(ring[i + 1])); mg.closePath(); mg.fill(); }
  const data = mg.getImageData(0, 0, mw, mh).data;
  return canvasTex(4096, 2048, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const R = rng(17);
    for (let i = 0; i < 26000; i++) {
      const u = R(), v = 0.12 + R() * 0.66, px = Math.floor(u * mw), py = Math.floor(v * mh);
      if (data[(py * mw + px) * 4] < 128) continue;
      const big = R() < 0.08, r = big ? 3 + R() * 4 : 1 + R() * 1.5;
      g.fillStyle = big ? 'rgba(255,200,120,0.85)' : 'rgba(255,214,150,0.7)'; g.beginPath(); g.arc(u * w, v * h, r, 0, PI * 2); g.fill();
    }
  });
}
export function buildSpace(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const R = DIMS.space.R, Rn = rng(opts.seed ?? 71);
  // stars on a far shell
  const SG = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 4000; i++) { const u = Rn() * 2 - 1, a = Rn() * PI * 2, s = Math.sqrt(1 - u * u); sp.push(Math.cos(a) * s * 2600, u * 2600, Math.sin(a) * s * 2600); }
  SG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(SG, new THREE.PointsMaterial({ size: 3.2, map: dotTex(), transparent: true, depthWrite: false, color: 0xdfe8ff, fog: false, sizeAttenuation: false }));
  stars.material.size = 2.4; root.add(stars);
  const spin = new THREE.Group(); root.add(spin);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 96), new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.62, metalness: 0.05 }));
  earth.receiveShadow = false; spin.add(earth);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.008, 128, 64), new THREE.MeshStandardMaterial({ map: cloudTexture(), transparent: true, depthWrite: false, roughness: 1, opacity: 0.95 }));
  spin.add(clouds);
  // night lights: additive, faded in only where the sun is below the horizon
  const lights = new THREE.Mesh(new THREE.SphereGeometry(R * 1.002, 128, 64), new THREE.ShaderMaterial({
    uniforms: { uMap: { value: cityTexture() }, uSun: { value: new THREE.Vector3(1000, 250, 300).normalize() } },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vW = normalize((modelMatrix * vec4(normal, 0.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D uMap; uniform vec3 uSun; varying vec2 vUv; varying vec3 vW; void main(){ float night = smoothstep(0.08, -0.22, dot(vW, uSun)); vec3 c = texture2D(uMap, vUv).rgb * night * 1.8; gl_FragColor = vec4(c, 1.0); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  spin.add(lights);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 96, 48), new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(0x6fb0ff) }, uSun: { value: new THREE.Vector3(1, 0.25, 0.3).normalize() } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vW = normalize((modelMatrix * vec4(normal,0.0)).xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uC; uniform vec3 uSun; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float f = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 3.0); float lit = clamp(dot(vW, uSun) * 0.8 + 0.4, 0.05, 1.0); gl_FragColor = vec4(uC * f * 1.6 * lit, f * lit); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  root.add(atm);
  const sun = new THREE.DirectionalLight(0xfff6e8, 3.2); sun.position.set(1000, 250, 300); sun.target.position.set(0, 0, 0); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const amb = new THREE.HemisphereLight(0x8aa8d8, 0x101018, 0.35); root.add(amb);
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(0xfff2d8).multiplyScalar(3), toneMapped: false, depthWrite: false, fog: false }));
  sunDisc.scale.setScalar(260); sunDisc.position.set(2000, 500, 600); root.add(sunDisc);
  /** Point the sun's shadow camera at a small orbital scene (a car, a capsule). */
  function focusShadow(center, half = 20) {
    sun.target.position.copy(center); sun.position.copy(center).add(new THREE.Vector3(1000, 250, 300).normalize().multiplyScalar(200));
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 10, far: 400 }); sun.shadow.camera.updateProjectionMatrix();
  }
  const setSpin = (a) => { spin.rotation.y = a; clouds.rotation.y = a * 0.15; lights.rotation.y = 0; };
  /** Instanced satellite shell: n tiny bright points on inclined rings at altitude alt (planet units). update(t) moves them. */
  function makeStarlinkSwarm(n = 1600, alt = 18) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 6, map: dotTex(), transparent: true, depthWrite: false, color: new THREE.Color(0xfff2d8).multiplyScalar(1.6), sizeAttenuation: false, toneMapped: false }));
    pts.frustumCulled = false; root.add(pts);
    const planes = 40, per = Math.ceil(n / planes);
    const seeds = Array.from({ length: n }, (_, i) => [Math.floor(i / per) * (PI * 2 / planes), 0.93, (i % per) / per * PI * 2]);
    const v = new THREE.Vector3(), e = new THREE.Euler();
    function update(t, k = 1) {
      for (let i = 0; i < n; i++) {
        const [raan, inc, ph] = seeds[i], a = ph + t * 0.06;
        v.set(Math.cos(a) * (R + alt), 0, Math.sin(a) * (R + alt)); v.applyEuler(e.set(inc, raan, 0, 'YXZ'));
        const on = i / n < k ? 1 : 0;
        pos[i * 3] = v.x * on; pos[i * 3 + 1] = v.y * on; pos[i * 3 + 2] = v.z * on;
      }
      geo.attributes.position.needsUpdate = true;
    }
    update(0);
    return { pts, update };
  }
  /** A freshly launched Starlink "train": n dots in a tight line on one orbit; update(t) slides it along. */
  function makeTrain(n = 60, alt = 40, inc = 0.5, raan = -0.6) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 5, map: dotTex(), transparent: true, depthWrite: false, color: new THREE.Color(0xffffff).multiplyScalar(2), sizeAttenuation: false, toneMapped: false }));
    pts.frustumCulled = false; root.add(pts);
    const v = new THREE.Vector3(), e = new THREE.Euler(inc, raan, 0, 'YXZ');
    function update(t) { for (let i = 0; i < n; i++) { const a = -1.2 + t * 0.09 - i * 0.006; v.set(Math.cos(a) * (R + alt), 0, Math.sin(a) * (R + alt)).applyEuler(e); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; } geo.attributes.position.needsUpdate = true; }
    update(0); return { pts, update };
  }
  shadowsOff(root);
  return { root, earth, clouds, lights, spin, atm, stars, sun, setSpin, focusShadow, makeStarlinkSwarm, makeTrain, R };
}

// ---------------------------------------------------------------- LAUNCH SITE
export function buildLaunch(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const Rn = rng(opts.seed ?? 2008);
  const sky = makeSkyDome(0x5f9ad8, 0xe8f0f4, 1800); root.add(sky.mesh);
  const waterTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#2a6a8a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Rn() * 0.1})`; g.fillRect(Rn() * w, Rn() * h, 20 + Rn() * 60, 2); } }, [40, 40]);
  const water = mk(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.25, metalness: 0.3 }), root, 0, -0.6, 0); water.rotation.x = -PI / 2;
  const sandM = mat(0xd8c49a, 1), concrete = mat(0xb8b6b0, 0.95), dark = mat(0x55575a, 0.9);
  // ISLAND (Falcon 1 era, Kwajalein): a small atoll with palms around a pad
  const island = new THREE.Group(); root.add(island);
  const isl = mk(new THREE.CylinderGeometry(120, 140, 1.2, 48), sandM, island, 0, -0.3, 0);
  mk(new THREE.BoxGeometry(30, 0.4, 30), concrete, island, 0, 0.2, 0);
  const palmM = mat(0x3f7a3a, 0.9), trunkM = mat(0x8a6a4a, 0.9);
  for (let i = 0; i < 46; i++) {
    const a = Rn() * PI * 2, d = 35 + Rn() * 75, p = new THREE.Group(); p.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); island.add(p);
    const h = 7 + Rn() * 5, tr = mk(new THREE.CylinderGeometry(0.25, 0.35, h, 6), trunkM, p, 0, h / 2, 0); tr.rotation.z = (Rn() - 0.5) * 0.25;
    for (let k = 0; k < 6; k++) { const f = mk(new THREE.ConeGeometry(0.6, 4.5, 4), palmM, p, Math.cos(k) * 1.6, h, Math.sin(k) * 1.6); f.rotation.set(Math.sin(k) * 1.1, 0, -Math.cos(k) * 1.1); }
  }
  const smallTower = new THREE.Group(); island.add(smallTower);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.BoxGeometry(0.3, 22, 0.3), dark, smallTower, -5 + x * 1.2, 11, z * 1.2);
  for (let y = 2; y < 22; y += 2) mk(new THREE.BoxGeometry(2.7, 0.2, 2.7), dark, smallTower, -5, y, 0);
  // LANDING ZONE (night): a big concrete circle with an X
  const landing = new THREE.Group(); root.add(landing);
  mk(new THREE.PlaneGeometry(600, 600), mat(0x3a4030, 1), landing, 0, 0.01, 0).rotation.x = -PI / 2;
  const lz = mk(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#9a9890'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4f2ea'; g.lineWidth = 14; g.beginPath(); g.arc(w / 2, h / 2, w * 0.36, 0, PI * 2); g.stroke(); g.lineWidth = 26; g.beginPath(); g.moveTo(w * 0.32, h * 0.32); g.lineTo(w * 0.68, h * 0.68); g.moveTo(w * 0.68, h * 0.32); g.lineTo(w * 0.32, h * 0.68); g.stroke(); }), roughness: 0.9 }), landing, 0, 0.03, 0);
  lz.rotation.x = -PI / 2;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * PI * 2; mk(new THREE.SphereGeometry(0.4, 8, 6), glowMat(0xffd080, 2.2), landing, Math.cos(a) * 42, 0.4, Math.sin(a) * 42); }
  // STARBASE: catch tower + launch mount at the origin, beach toward +z for the crowd
  const starbase = new THREE.Group(); root.add(starbase);
  mk(new THREE.PlaneGeometry(900, 520), mat(0xb8a882, 1), starbase, 0, 0.01, 0).rotation.x = -PI / 2;
  const tower = makeTower(); starbase.add(tower.g);
  const mount = new THREE.Group(); mount.position.set(tower.catchX, 0, 0); starbase.add(mount);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.BoxGeometry(2, 20, 2), concrete, mount, x * 8, 10, z * 8);
  mk(new THREE.BoxGeometry(20, 3, 20), concrete, mount, 0, 21, 0);
  mk(new THREE.PlaneGeometry(900, 60), mat(0xe8dcb8, 1), starbase, 0, 0.03, DIMS.launch.beach).rotation.x = -PI / 2;   // the beach strip
  const tanks = new THREE.Group(); starbase.add(tanks);
  for (let i = 0; i < 6; i++) mk(new THREE.CylinderGeometry(4, 4, 30, 20), steel(), tanks, -60 - i * 10, 15, -40);
  // effects: soft camera-facing sprites (fireball glow, dark smoke, white steam) — sphere stacks read as rings/bubbles
  const fireM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa040).multiplyScalar(3), toneMapped: false, transparent: true, depthWrite: false });
  const fireCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0c0).multiplyScalar(4), toneMapped: false, transparent: true, depthWrite: false });
  const fx = new THREE.Group(); root.add(fx);
  const fires = makeSpritePool(fx, 22, 'fire'), smokes = makeSpritePool(fx, 34, 'smoke'), steam = makeSpritePool(fx, 40, 'smoke');
  const fSeeds = Array.from({ length: 34 }, () => [new THREE.Vector3(Rn() - 0.5, Rn() * 0.9 + 0.1, Rn() - 0.5).normalize(), Rn(), Rn()]);
  const debris = Array.from({ length: 34 }, () => { const m = mk(new THREE.BoxGeometry(0.5 + Rn(), 0.18, 0.5 + Rn()), mat(0x2a2a2c, 0.6), root); m.visible = false; return { m, v: new THREE.Vector3((Rn() - 0.5) * 34, 6 + Rn() * 22, (Rn() - 0.5) * 34), w: Rn() * 8, glow: Rn() < 0.4 }; });
  const flash = new THREE.PointLight(0xffa050, 0, 600, 1.2); root.add(flash);
  const _v = new THREE.Vector3(), cSmoke = new THREE.Color(0x6a625a), cFire = new THREE.Color(1.8, 1.0, 0.45);
  /** Explosion at pos (vec3), age seconds since it began (<0 hidden). */
  function setExplosion(pos, age) {
    const on = age >= 0 && age < 7;
    fires.hide(); smokes.hide();
    if (on) {
      fires.items.forEach((_, i) => { const [d, a, b] = fSeeds[i], life = 0.9 + a * 0.9, k = clamp(age / life); if (k >= 1) return;
        _v.copy(pos).addScaledVector(d, (2 + 16 * Math.sqrt(k)) * (0.5 + b)); fires.set(i, _v, (6 + 26 * Math.sqrt(k)) * (0.6 + a * 0.6), Math.pow(1 - k, 1.4), cFire); });
      smokes.items.forEach((_, i) => { const [d, a, b] = fSeeds[i], k = clamp((age - 0.15) / 6.5); if (k <= 0 || k >= 1) return;
        _v.copy(pos).addScaledVector(d, (4 + 20 * Math.sqrt(k)) * (0.5 + b)); _v.y += age * 2.2; smokes.set(i, _v, (10 + 34 * Math.sqrt(k)) * (0.6 + a * 0.6), 0.85 * (1 - k) * Math.min(1, age * 4), cSmoke); });
    }
    debris.forEach((d) => { d.m.visible = on && age < 4; if (!d.m.visible) return; d.m.position.copy(pos).addScaledVector(d.v, age); d.m.position.y -= 4.9 * age * age; d.m.rotation.set(age * d.w, age * d.w * 0.7, 0); if (d.m.position.y < 0) d.m.visible = false; });
    flash.position.copy(pos); flash.intensity = on ? 500 * Math.max(0, 1 - age / 0.9) : 0;
  }
  // plume: an engine flame cone + a glow sprite at the nozzle + a billowing steam/smoke cloud on the ground
  const plume = new THREE.Group(); root.add(plume);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 20, 1, true), fireM); cone.rotation.x = PI; cone.position.y = -0.5; plume.add(cone);
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 16), fireCore); core.rotation.x = PI; core.position.y = -0.5; plume.add(core);
  const glow = makeSpritePool(root, 1, 'fire');
  const plumeL = new THREE.PointLight(0xffb060, 0, 400, 1.2); root.add(plumeL);
  const sSeeds = Array.from({ length: 40 }, () => [Rn() * PI * 2, Rn(), 0.6 + Rn() * 0.8, Rn()]);
  const cSteam = new THREE.Color(0xf0ece6);
  /** Engine plume at nozzle pos (pointing down), strength k (0 off), length L; ground cloud of radius `cloud` at groundY; t animates the billow. */
  function setPlume(pos, k, L = 30, width = 2, cloud = 0, groundY = 0, t = 0) {
    plume.visible = k > 0.01; plume.position.copy(pos); plume.scale.set(width * k, L * k, width * k);
    glow.set(0, _v.copy(pos).add(new THREE.Vector3(0, -L * 0.15 * k, 0)), width * 9 * k, k > 0.01 ? 0.9 : 0, cFire);
    plumeL.position.copy(pos).add(new THREE.Vector3(0, -3, 6)); plumeL.intensity = 300 * k;
    steam.hide();
    if (cloud > 0.5) sSeeds.forEach(([a, r, sc, ph], i) => { const rr = cloud * (0.25 + r * 0.75) * (1 + 0.06 * Math.sin(t * 0.8 + ph * 6)); _v.set(pos.x + Math.cos(a + t * 0.05) * rr, groundY + 1 + r * cloud * 0.22 + ph * 2, pos.z + Math.sin(a + t * 0.05) * rr); steam.set(i, _v, cloud * 0.55 * sc, 0.75, cSteam); });
  }
  setPlume(new THREE.Vector3(), 0); setExplosion(new THREE.Vector3(), -1);
  // night stars (shown with the 'night' sky)
  const SG = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 1500; i++) { const a = Rn() * PI * 2, e = 0.08 + Rn() * 1.4; sp.push(Math.cos(e) * Math.sin(a) * 1700, Math.sin(e) * 1700, Math.cos(e) * Math.cos(a) * 1700); }
  SG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(SG, new THREE.PointsMaterial({ size: 2.2, map: dotTex(), transparent: true, depthWrite: false, color: 0xdfe6ff, fog: false, sizeAttenuation: false }));
  root.add(stars);
  // lights + sky modes
  const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x6a5a40, 1.0); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); root.add(sun, sun.target);
  const fog = new THREE.Fog(0xdfe8ee, 400, 2600);
  const SKIES = {
    day: { top: 0x4f8ad0, bot: 0xe6eef2, sun: 0xfff2dc, si: 2.6, hemi: 1.0, fog: 0xdfe8ee, water: 0xffffff },
    dusk: { top: 0x2a3a6a, bot: 0xf2a066, sun: 0xffb070, si: 1.8, hemi: 0.6, fog: 0xe8a878, water: 0xc8a090 },
    night: { top: 0x050a18, bot: 0x1a2440, sun: 0x8aa0d0, si: 0.35, hemi: 0.18, fog: 0x0a1020, water: 0x404a60 },
  };
  function setSky(name, cx = 0, cz = 0, half = 40) {
    const s = SKIES[name]; stars.visible = name === 'night'; sky.setColors(s.top, s.bot); sun.color.setHex(s.sun); sun.intensity = s.si; hemi.intensity = s.hemi; fog.color.setHex(s.fog); water.material.color.setHex(s.water);
    sun.target.position.set(cx, 0, cz); sun.position.set(cx - 120, 160, cz + 140);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 10, far: 600 }); sun.shadow.camera.updateProjectionMatrix();
  }
  function setMode(name, skyName = 'day') { island.visible = name === 'island'; landing.visible = name === 'landing'; starbase.visible = name === 'starbase'; setSky(skyName); }
  setMode('island');
  shadowsOff(root); isl.receiveShadow = true;
  return { root, sky, fog, island, landing, starbase, tower, mount, smallTower, setMode, setSky, setExplosion, setPlume, lights: { hemi, sun, flash, plumeL } };
}

// ---------------------------------------------------------------- FACTORY
export function buildFactory(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const W = 60, D = 40, H = 18;
  const floor = mk(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.18, metalness: 0.15 }), root); floor.rotation.x = -PI / 2;
  for (let i = -4; i <= 4; i++) mk(new THREE.PlaneGeometry(0.15, D), mat(0xf2c430, 0.6), root, i * 6, 0.005, 0).rotation.x = -PI / 2;
  const wallM = mat(0x5e6670, 0.9, { side: THREE.DoubleSide });   // darker than the white rocket so it reads
  mk(new THREE.PlaneGeometry(W, H), wallM, root, 0, H / 2, -D / 2); mk(new THREE.PlaneGeometry(D, H), wallM, root, -W / 2, H / 2, 0).rotation.y = PI / 2; mk(new THREE.PlaneGeometry(D, H), wallM, root, W / 2, H / 2, 0).rotation.y = -PI / 2;
  mk(new THREE.PlaneGeometry(W, H), wallM, root, 0, H / 2, D / 2).rotation.y = PI;
  const ceil = mk(new THREE.PlaneGeometry(W, D), mat(0x9a9ea4, 0.9, { side: THREE.DoubleSide }), root, 0, H, 0); ceil.rotation.x = PI / 2;
  const trussM = mat(0x6a6e74, 0.6, { metalness: 0.4 });
  for (let x = -27; x <= 27; x += 6) mk(new THREE.BoxGeometry(0.5, 1.2, D), trussM, root, x, H - 0.8, 0);
  const lampM = glowMat(0xffffff, 1.6), lamps = [];
  for (let x = -24; x <= 24; x += 12) for (let z = -12; z <= 12; z += 12) { lamps.push(mk(new THREE.BoxGeometry(4, 0.2, 1.2), lampM, root, x, H - 1.6, z)); }
  // a Falcon first stage lying on cradles along x
  const stage = new THREE.Group(); stage.position.set(0, 3.2, -6); root.add(stage);
  const body = mk(new THREE.CylinderGeometry(1.85, 1.85, 34, 32), mat(0xf4f4f2, 0.4), stage); body.rotation.z = PI / 2;
  mk(new THREE.CylinderGeometry(1.87, 1.87, 3.5, 32), mat(0x1e1e22, 0.5), stage, 18.5, 0, 0).rotation.z = PI / 2;
  const bellM = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.28, metalness: 0.9, side: THREE.DoubleSide }), bellIn = mat(0x2a1a10, 0.6, { side: THREE.BackSide });
  for (let i = 0; i < 9; i++) { const a = (i / 8) * PI * 2, rr = i === 8 ? 0 : 1.15; const b = mk(new THREE.CylinderGeometry(0.2, 0.46, 1.4, 20, 1, true), bellM, stage, -17.7, Math.cos(a) * rr, Math.sin(a) * rr); b.rotation.z = PI / 2;
    const ring = mk(new THREE.TorusGeometry(0.46, 0.035, 6, 20), mat(0x8a8e94, 0.3, { metalness: 0.9 }), stage, -18.4, Math.cos(a) * rr, Math.sin(a) * rr); ring.rotation.y = PI / 2; }
  mk(new THREE.CylinderGeometry(1.7, 1.7, 0.2, 32), mat(0x3a3c40, 0.5, { metalness: 0.6 }), stage, -17.05, 0, 0).rotation.z = PI / 2;   // engine section plate
  for (const x of [-12, 0, 12]) { mk(new THREE.BoxGeometry(1.2, 1.6, 4.4), mat(0x2a6ac8, 0.6), root, x, 0.8, -6); }
  // second, upright tank section + scaffolding
  const tank = mk(new THREE.CylinderGeometry(1.85, 1.85, 12, 32), mat(0xf4f4f2, 0.4), root, -20, 6, 8);
  const scaf = new THREE.Group(); scaf.position.set(-20, 0, 8); root.add(scaf);
  for (let y = 2; y < 13; y += 2.5) { const r = mk(new THREE.TorusGeometry(3.2, 0.08, 6, 24), mat(0xf2c430, 0.6), scaf, 0, y, 0); r.rotation.x = PI / 2; }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; mk(new THREE.BoxGeometry(0.12, 13, 0.12), mat(0xf2c430, 0.6), scaf, Math.cos(a) * 3.2, 6.5, Math.sin(a) * 3.2); }
  // overhead bridge crane (yellow girder + trolley + hook over the stage)
  const crane = new THREE.Group(); crane.position.set(-4, H - 3.2, -6); root.add(crane);
  mk(new THREE.BoxGeometry(1.2, 1.4, D - 2), mat(0xf2b632, 0.5), crane, 0, 0, 0);
  mk(new THREE.BoxGeometry(2.2, 1.0, 2.0), mat(0x3a3e44, 0.5), crane, 0, -1.0, 0);
  mk(new THREE.CylinderGeometry(0.03, 0.03, 6, 6), mat(0x2a2a2a, 0.4), crane, 0, -4.4, 0); mk(new THREE.TorusGeometry(0.35, 0.08, 6, 12, PI * 1.4), mat(0xc83a2a, 0.5), crane, 0, -7.6, 0);
  // a big flag hanging on the back wall + a banner of mission patches
  const flagT = canvasTex(512, 300, (g, w, h) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#f4efe6' : '#b8302f'; g.fillRect(0, (i * h) / 13, w, h / 13 + 1); } g.fillStyle = '#2a3a6a'; g.fillRect(0, 0, w * 0.42, (h * 7) / 13); g.fillStyle = '#f4efe6'; for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { g.beginPath(); g.arc(18 + c * 28 + (r % 2) * 10, 16 + r * 30, 5, 0, PI * 2); g.fill(); } });
  const flagWall = mk(new THREE.PlaneGeometry(14, 8.2), new THREE.MeshStandardMaterial({ map: flagT, roughness: 0.9 }), root, 8, H - 6.5, -D / 2 + 0.06);
  for (let i = 0; i < 5; i++) mk(new THREE.CircleGeometry(1.1, 24), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = ['#1a2a5a', '#2a2a2a', '#5a1a1a', '#1a4a3a', '#3a2a5a'][i]; g.beginPath(); g.arc(64, 64, 62, 0, PI * 2); g.fill(); g.strokeStyle = '#e8e4d8'; g.lineWidth = 6; g.stroke(); g.fillStyle = '#e8e4d8'; g.beginPath(); g.moveTo(64, 22); g.lineTo(74, 80); g.lineTo(54, 80); g.closePath(); g.fill(); }), roughness: 0.8 }), root, -22 + i * 3.0, H - 5, -D / 2 + 0.06);
  // work lights on stands (warm pools on the white floor)
  const workLights = [];
  for (const [x, z] of [[-14, 0], [-2, 2], [10, 0]]) { mk(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), mat(0x2a2a2a, 0.5), root, x, 1.5, z); mk(new THREE.BoxGeometry(0.7, 0.45, 0.3), glowMat(0xfff0d0, 1.4), root, x, 3.1, z - 0.1); const l = new THREE.PointLight(0xffe0b0, 25, 14, 1.6); l.position.set(x, 3.0, z - 0.6); root.add(l); workLights.push(l); }
  // welding sparks (a worker by the upright tank)
  const sparks = makeSpritePool(root, 30, 'fire');
  const SP = Array.from({ length: 30 }, (_, i) => [Math.sin(i * 2.3), Math.cos(i * 1.7), 0.5 + (i % 5) * 0.2, (i * 0.37) % 1]);
  const weld = new THREE.PointLight(0x9ac8ff, 0, 8, 1.8); root.add(weld);
  function setSparks(t, at, on = true) {
    sparks.hide(); weld.intensity = 0; if (!on) return;
    const flick = 0.6 + 0.4 * Math.sin(t * 37) * Math.sin(t * 23); weld.position.copy(at); weld.intensity = 14 * flick;
    SP.forEach(([dx, dz, sp, ph], i) => { const a = (t * 1.6 + ph) % 1; sparks.set(i, new THREE.Vector3(at.x + dx * a * sp, at.y + a * 0.8 * sp - a * a * 2.2, at.z + dz * a * sp), 0.12 * (1 - a), 1 - a, new THREE.Color(2.2, 1.4, 0.6)); });
  }
  // tool carts, crates
  const carts = new THREE.Group(); root.add(carts);
  for (let i = 0; i < 8; i++) mk(new RoundedBoxGeometry(1.2, 1.0, 0.8, 2, 0.08), mat([0xc83a2a, 0x3a3e44, 0x2a6ac8][i % 3], 0.6), carts, -24 + i * 6.5, 0.5, 14);
  // showroom dressing (turntable + dark walls + spotlights)
  const show = new THREE.Group(); root.add(show);
  const turn = mk(new THREE.CylinderGeometry(5, 5, 0.3, 48), mat(0x1a1a1e, 0.25, { metalness: 0.6 }), show, 0, 0.15, 8);
  const ring = mk(new THREE.TorusGeometry(5, 0.05, 6, 64), glowMat(0xffffff, 1.6), show, 0, 0.31, 8); ring.rotation.x = PI / 2;
  const showWall = mk(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: canvasTex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#05060a'); gr.addColorStop(0.55, '#141c34'); gr.addColorStop(1, '#2a3a6a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(140,180,255,.5)'; for (let i = 0; i < 9; i++) g.fillRect(i * 60 + 10, h * 0.62, 34, 3); }), toneMapped: true }), show, 0, H / 2, -D / 2 + 0.05);
  for (const x of [-9, 9]) { const strip = mk(new THREE.BoxGeometry(0.15, 9, 0.15), glowMat(0xcfe0ff, 2.2), show, x, 4.5, 3); }
  const front = new THREE.SpotLight(0xffffff, 0, 30, 0.5, 0.5, 1.2); front.position.set(0, 6, 20); front.target.position.set(2, 1.2, 10); show.add(front, front.target);
  const spots = [-6, 6].map((x) => { const s = new THREE.SpotLight(0xffffff, 0, 40, 0.45, 0.5, 1.2); s.position.set(x, 14, 16); s.target.position.set(0, 0.5, 8); show.add(s, s.target); return s; });
  spots.push(front);   // presenter key light (last)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8e94, 1.0); root.add(hemi);
  const nightLamp = new THREE.SpotLight(0xffd8a8, 0, 30, 0.6, 0.6, 1.4); nightLamp.position.set(2, 12, 11); nightLamp.target.position.set(0.6, 0, 8.4); nightLamp.castShadow = true; root.add(nightLamp, nightLamp.target);
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(10, 30, 20); key.target.position.set(0, 0, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 80 }); root.add(key, key.target);
  function setMode(name) {
    show.visible = name === 'showroom'; stage.visible = tank.visible = scaf.visible = name !== 'showroom';
    const night = name === 'night', sr = name === 'showroom';
    hemi.intensity = night ? 0.3 : sr ? 0.15 : 1.0; nightLamp.intensity = night ? 90 : 0; key.intensity = night ? 0.15 : sr ? 0.0 : 1.4;
    lampM.color.setHex(0xffffff).multiplyScalar(night ? 0.3 : sr ? 0.0 : 1.6); lamps.forEach((l, i) => (l.visible = !night || i % 4 === 0)); workLights.forEach((l) => (l.intensity = night || sr ? 0 : 25)); crane.visible = carts.visible = flagWall.visible = !sr;
    spots.forEach((s, i) => (s.intensity = sr ? (i === spots.length - 1 ? 25 : 170) : 0));
  }
  setMode('day');
  shadowsOff(root); floor.receiveShadow = true;
  return { root, stage, turn, show, crane, setMode, setSparks, lights: { hemi, key, spots, workLights } };
}

// ---------------------------------------------------------------- SUBURB (Pretoria, 1970s)
export function buildSuburb(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const Rn = rng(opts.seed ?? 1971);
  const sky = makeSkyDome(0x4a8ad8, 0xe8eef2, 400); root.add(sky.mesh);
  mk(new THREE.PlaneGeometry(600, 600), mat(0x7a9a4a, 1), root, 0, 0, 0).rotation.x = -PI / 2;
  mk(new THREE.PlaneGeometry(200, 7), mat(0x55575a, 0.9), root, 0, 0.02, 6).rotation.x = -PI / 2;          // road along x at z=6
  mk(new THREE.PlaneGeometry(200, 2), mat(0xc8c2b6, 0.9), root, 0, 0.04, 1.8).rotation.x = -PI / 2;        // pavement
  const white = mat(0xf2ede2, 0.85), roof = mat(0xb8502e, 0.8), wallLow = mat(0xe8e0d0, 0.9);
  const houses = [];
  for (let i = -3; i <= 3; i++) {
    const h = new THREE.Group(); h.position.set(i * 16, 0, -8); root.add(h); houses.push(h);
    mk(new THREE.BoxGeometry(11, 3.2, 8), white, h, 0, 1.6, 0);
    for (const sz of [-1, 1]) { const r = mk(new THREE.BoxGeometry(12.2, 0.25, 5.0), roof, h, 0, 4.15, sz * 2.05); r.rotation.x = sz * 0.5; }   // gable roof (a 4-sided cone rendered black)
    for (const sx of [-1, 1]) { const tri = new THREE.Shape(); tri.moveTo(-4.1, 0); tri.lineTo(4.1, 0); tri.lineTo(0, 2.0); tri.closePath(); const gm = mk(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.85, side: THREE.DoubleSide }), h, sx * 5.5, 3.2, 0); gm.rotation.y = PI / 2; }
    mk(new THREE.BoxGeometry(1.1, 2.1, 0.1), mat(0x6a3a22, 0.7), h, -2, 1.05, 4.01);
    for (const x of [1.2, 3.6]) { mk(new THREE.BoxGeometry(1.4, 1.2, 0.08), mat(0x2a3a4a, 0.3), h, x, 1.8, 4.01); mk(new THREE.BoxGeometry(1.6, 0.12, 0.2), white, h, x, 1.15, 4.05); }
    for (const s of [-1, 1]) mk(new THREE.BoxGeometry(6.5, 1.1, 0.25), wallLow, h, s * 4.6, 0.55, 8.5);
    mk(new THREE.BoxGeometry(2.4, 1.0, 0.06), mat(0x2a2a2c, 0.5, { metalness: 0.6 }), h, -1.5, 0.5, 8.5);   // gate
  }
  // jacaranda trees: twisted trunk + purple crowns + petals carpeting the pavement
  const purple = [mat(0x8a62c8, 0.85), mat(0x9a72d8, 0.85), mat(0x7a52b8, 0.85)], trunkM = mat(0x5a4636, 0.95);
  for (let i = 0; i < 16; i++) {
    const t = new THREE.Group(); t.position.set(-60 + i * 8 + Rn() * 2, 0, i % 2 ? 2.8 : 9.4); root.add(t);
    mk(new THREE.CylinderGeometry(0.25, 0.4, 4, 7), trunkM, t, 0, 2, 0).rotation.z = (Rn() - 0.5) * 0.3;
    for (let k = 0; k < 7; k++) mk(new THREE.IcosahedronGeometry(1.6 - k * 0.08, 1), purple[k % 3], t, (Rn() - 0.5) * 3.4, 4.6 + Rn() * 1.6, (Rn() - 0.5) * 3);
  }
  const PET = 900, petals = new THREE.InstancedMesh(new THREE.CircleGeometry(0.05, 5), new THREE.MeshStandardMaterial({ color: 0x9a72d8, roughness: 0.9, side: THREE.DoubleSide }), PET);
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-PI / 2, 0, 0)), sc = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < PET; i++) { M4.compose(new THREE.Vector3(-60 + Rn() * 120, 0.05, 0.5 + Rn() * 10), q, sc); petals.setMatrixAt(i, M4); }
  root.add(petals);
  // a parked 1970s sedan + flower beds by the gates
  const car = new THREE.Group(); car.position.set(4.5, 0, 5.2); root.add(car);
  mk(new RoundedBoxGeometry(1.8, 0.6, 4.6, 3, 0.12), mat(0x5a8a9a, 0.4, { metalness: 0.3 }), car, 0, 0.55, 0);
  mk(new RoundedBoxGeometry(1.6, 0.5, 2.3, 3, 0.1), mat(0x5a8a9a, 0.4, { metalness: 0.3 }), car, 0, 1.05, -0.2);
  mk(new THREE.BoxGeometry(1.55, 0.38, 2.2), new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.05, metalness: 0.5 }), car, 0, 1.06, -0.2);
  for (const [x, z] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) { const w = mk(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16), mat(0x1a1a1a, 0.8), car, x, 0.33, z); w.rotation.z = PI / 2; }
  mk(new THREE.BoxGeometry(1.8, 0.12, 0.08), mat(0xc8ccd0, 0.2, { metalness: 0.9 }), car, 0, 0.42, 2.32);
  const flowerM = [mat(0xe84a6a, 0.7), mat(0xf2c430, 0.7), mat(0xf4f4f4, 0.7)];
  for (let i = -3; i <= 3; i++) for (let k = 0; k < 14; k++) mk(new THREE.SphereGeometry(0.09, 6, 4), flowerM[k % 3], root, i * 16 - 5 + (k % 7) * 0.5, 0.25, -8 + 8.1 + Math.floor(k / 7) * 0.3);
  // falling jacaranda petals (sprites tinted purple)
  const fall = makeSpritePool(root, 70, 'smoke'), petalC = new THREE.Color(0x9a72d8);
  const PS = Array.from({ length: 70 }, () => [Rn() * 40 - 20, Rn() * 14, Rn(), Rn()]);
  function update(t) { PS.forEach(([x, z, a, b], i) => { const y = 7 - ((t * (0.4 + a * 0.3) + b * 7) % 7); fall.set(i, new THREE.Vector3(x + Math.sin(t * 1.3 + i) * 0.4, y, z - 2), 0.14, 0.9, petalC); }); }
  const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x6a7a4a, 1.1); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe8c8, 2.8); sun.position.set(-20, 30, 25); sun.target.position.set(0, 0, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 5, far: 100 }); root.add(sun, sun.target);
  const fog = new THREE.Fog(0xe0e8ee, 60, 300);
  shadowsOff(root);
  return { root, fog, houses, car, update, lights: { hemi, sun } };
}

// ---------------------------------------------------------------- CAMPUS (sandstone arcade)
export function buildCampus(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const Rn = rng(opts.seed ?? 1995);
  const sky = makeSkyDome(0x5a9ae0, 0xeef2f4, 400); root.add(sky.mesh);
  mk(new THREE.PlaneGeometry(600, 600), mat(0x6a9a4a, 1), root).rotation.x = -PI / 2;
  mk(new THREE.PlaneGeometry(4, 120), mat(0xd8c8a8, 1), root, 0, 0.02, 20).rotation.x = -PI / 2;
  const sand = mat(0xd8b88a, 0.9), tile = mat(0xb8502e, 0.8);
  // arcade along x at z=-6: piers + arches (half-torus) + a roof
  const arc = new THREE.Group(); arc.position.z = -6; root.add(arc);
  for (let i = -6; i <= 6; i++) {
    mk(new THREE.BoxGeometry(0.9, 3.2, 1.2), sand, arc, i * 3.6, 1.6, 0);
    if (i < 6) { const a = mk(new THREE.TorusGeometry(1.35, 0.42, 8, 20, PI), sand, arc, i * 3.6 + 1.8, 3.2, 0); }
  }
  mk(new THREE.BoxGeometry(48, 1.6, 1.4), sand, arc, 0, 5.2, 0);
  mk(new THREE.BoxGeometry(48, 6, 8), sand, arc, 0, 3, -5);
  const r = mk(new THREE.BoxGeometry(49, 0.4, 10), tile, arc, 0, 6.4, -3.5); r.rotation.x = 0.08;
  // big arch gateway at the center (taller)
  mk(new THREE.BoxGeometry(2, 8, 2), sand, arc, -3.6, 4, 1.2); mk(new THREE.BoxGeometry(2, 8, 2), sand, arc, 3.6, 4, 1.2);
  mk(new THREE.TorusGeometry(3.6, 0.9, 8, 24, PI), sand, arc, 0, 8, 1.2);
  // palms
  const palmM = mat(0x3f7a3a, 0.9), trunkM = mat(0x9a8a6a, 0.9);
  for (let i = 0; i < 14; i++) { const p = new THREE.Group(); p.position.set((i % 2 ? 1 : -1) * (4 + Rn() * 2), 0, -2 + i * 6); root.add(p); const h = 9 + Rn() * 3; mk(new THREE.CylinderGeometry(0.25, 0.35, h, 6), trunkM, p, 0, h / 2, 0); for (let k = 0; k < 7; k++) { const f = mk(new THREE.ConeGeometry(0.5, 4, 4), palmM, p, Math.cos(k) * 1.4, h, Math.sin(k) * 1.4); f.rotation.set(Math.sin(k) * 1.15, 0, -Math.cos(k) * 1.15); } }
  const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x6a7a4a, 1.0); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.6); sun.position.set(25, 30, 30); sun.target.position.set(0, 0, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 5, far: 100 }); root.add(sun, sun.target);
  const fog = new THREE.Fog(0xe4ecf0, 60, 300);
  shadowsOff(root);
  return { root, fog, lights: { hemi, sun } };
}

// ---------------------------------------------------------------- FLIGHT (above the clouds)
export function buildFlight(studio, opts = {}) {
  const root = new THREE.Group(); studio.scene.add(root);
  const Rn = rng(opts.seed ?? 1989);
  const sky = makeSkyDome(0x3a6ab8, 0xffc890, 2000); root.add(sky.mesh);
  const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x6a5a5a });
  const CL = 260, deck = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), cloudM, CL);
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const seeds = Array.from({ length: CL }, () => [Rn() * 1600 - 800, Rn() * 1200 - 900, 20 + Rn() * 45, Rn()]);
  deck.frustumCulled = false; root.add(deck);
  const setDrift = (dx) => { seeds.forEach(([x, z, r, k], i) => { const xx = ((x - dx + 800) % 1600 + 1600) % 1600 - 800; v.set(xx, -60 - k * 10, z); s.set(r * 1.6, r * 0.45, r); M4.compose(v, q, s); deck.setMatrixAt(i, M4); }); deck.instanceMatrix.needsUpdate = true; };
  setDrift(0);
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(0xffd8a0).multiplyScalar(2.5), toneMapped: false, depthWrite: false, fog: false }));
  sunDisc.scale.setScalar(220); sunDisc.position.set(-1400, 120, -900); root.add(sunDisc);
  const hemi = new THREE.HemisphereLight(0xc8d8ff, 0xffd8b0, 1.2); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd8a8, 2.8); sun.position.set(-140, 60, 90); sun.target.position.set(0, 0, 0); root.add(sun, sun.target);
  const fog = new THREE.Fog(0xf2d0b0, 350, 1900);
  const trail = makeSpritePool(root, 36, 'smoke');
  /** Contrails: puffs streaming back from the engine positions (world-local), plane speed v. */
  function setTrail(engines, t, v = 9) { trail.hide(); engines.forEach((e, j) => { for (let i = 0; i < 18; i++) { const k = i / 18; trail.set(j * 18 + i, new THREE.Vector3(e.x - 6 - k * 70, e.y + k * 0.6, e.z), 1.2 + k * 6, 0.55 * (1 - k), new THREE.Color(0xffffff)); } }); }
  shadowsOff(root);
  return { root, fog, setDrift, setTrail, lights: { hemi, sun } };
}
