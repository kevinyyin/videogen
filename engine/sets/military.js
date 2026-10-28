// SETS: small military / nuclear locations for world-scale stories (built for videos/005-no-nukes). Each builder returns its
// own `root` group at the origin — build several, then show ONE per shot (`root.visible`), like 003/005 do.
//
//   buildSilo(studio)    underground missile silo, camera low in the shaft looking up. setDissolve(u, t): the missile
//                        vanishes bottom→top (clipping plane) and sheds rising embers at the cut line. Missile y∈[0.6, 12.4].
//   buildBase(studio)    sunny parade ground + an open hangar (door at z=-14, facing +z). marchers: 30 helmeted soldiers in a
//                        6×5 block (call update(t) with a march start/end); tanks roll out of the hangar along +z (setTanks(u)).
//   buildBorder(studio)  dusk: a road crossing a border (line z=0) with a barrier arm, a guard booth + one guard at z=+3,
//                        and a row of tanks with headlights on the ridge across the border (z≈-60). setTanksAdvance(u).
//   buildPlant(studio)   nuclear power plant: two cooling towers with steam, a reactor dome, fence. setDay(d) 0..1 (time-lapse).
//   makeTank(color), makeSoldier(opts), makeSkyDome(top, bottom)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng, clamp, lerp, smooth } from '@engine/core.js';
import { makePerson } from '@engine/rig.js';

// ---------------------------------------------------------------- shared pieces
/** Gradient sky sphere (basic material, no fog). setColors(top, bottom) to animate. */
export function makeSkyDome(top = 0x6fa2d8, bottom = 0xf0dcc0, r = 300) {
  const geo = new THREE.SphereGeometry(r, 32, 16), cols = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) cols.push(0, 0, 0);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, toneMapped: false }));
  const T = new THREE.Color(), B = new THREE.Color(), C = new THREE.Color();
  const setColors = (top, bottom) => {
    T.set(top); B.set(bottom);
    for (let i = 0; i < pos.count; i++) { const h = clamp(pos.getY(i) / r * 2.2 + 0.08); C.copy(B).lerp(T, smooth(h)); geo.attributes.color.setXYZ(i, C.r, C.g, C.b); }
    geo.attributes.color.needsUpdate = true;
  };
  setColors(top, bottom);
  m.castShadow = false; m.receiveShadow = false;
  return { mesh: m, setColors };
}

/** Toy tank (faces +z, ~4.2 m long). Returns {g, turret, setLights(v)}. */
export function makeTank(color = 0x5d6a45) {
  const g = new THREE.Group(), body = mat(color, 0.75), dark = mat(0x2a2b28, 0.8);
  mk(new RoundedBoxGeometry(2.3, 0.75, 4.0, 2, 0.18), body, g, 0, 0.95, 0);
  for (const s of [-1, 1]) {
    mk(new RoundedBoxGeometry(0.55, 0.75, 4.3, 2, 0.25), dark, g, s * 1.3, 0.45, 0);
    for (let k = 0; k < 5; k++) { const w = mk(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16), mat(0x3d3f3a, 0.6), g, s * 1.6, 0.4, -1.6 + k * 0.8); w.rotation.z = Math.PI / 2; }
  }
  const turret = new THREE.Group(); turret.position.set(0, 1.55, -0.2); g.add(turret);
  mk(new RoundedBoxGeometry(1.5, 0.55, 1.8, 2, 0.2), body, turret, 0, 0, 0);
  const barrel = mk(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 12), body, turret, 0, 0.05, 2.0); barrel.rotation.x = Math.PI / 2;
  mk(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 12), dark, turret, 0.35, 0.35, -0.3);
  const lightM = new THREE.MeshBasicMaterial({ color: 0xffe2a8, toneMapped: false });
  for (const s of [-1, 1]) mk(new THREE.CircleGeometry(0.11, 16), lightM, g, s * 0.8, 1.05, 2.01);
  const setLights = (v) => lightM.color.setHex(0xffe2a8).multiplyScalar(0.1 + 2.4 * v);
  setLights(0);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { g, turret, setLights };
}

/** A toy soldier: makePerson in fatigues + a round helmet. */
export function makeSoldier(o = {}) {
  const P = makePerson({ skin: o.skin ?? 0xe0ac88, top: o.top ?? 0x56603f, collar: o.top ?? 0x56603f, pants: o.pants ?? 0x4a5236, shoes: 0x2a2620, hair: 0x2a2018, hairStyle: 'short' });
  const r = 0.135 * 1.16, hm = mat(o.helmet ?? 0x48512f, 0.8);
  const helm = mk(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hm, P.head.g, 0, 0.02, -0.01);
  helm.scale.set(1.05, 0.95, 1.08);
  const brim = mk(new THREE.TorusGeometry(r * 1.0, 0.016, 6, 28), hm, P.head.g, 0, 0.02, -0.01); brim.rotation.x = Math.PI / 2;
  P.head.hair.visible = false;
  return P;
}

const groundTex = (base, line, seed) => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const R = rng(seed);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.06})`; g.fillRect(R() * w, R() * h, 2 + R() * 5, 2 + R() * 5); }
  if (line) { g.strokeStyle = line; g.lineWidth = 3; for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); } }
}, [12, 12]);

// ---------------------------------------------------------------- SILO
export function buildSilo(studio) {
  const { scene, renderer } = studio;
  renderer.localClippingEnabled = true;
  const root = new THREE.Group(); scene.add(root);
  const concrete = new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8d8b84'; g.fillRect(0, 0, w, h); const R = rng(5);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${R() < 0.5 ? 0 : 255},${R() < 0.5 ? 0 : 255},${R() < 0.5 ? 0 : 255},${R() * 0.05})`; g.fillRect(R() * w, R() * h, 3, 3); }
    g.strokeStyle = 'rgba(40,40,40,.35)'; g.lineWidth = 3; for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }, [6, 4]), color: 0x9a978e, roughness: 0.95, side: THREE.BackSide });
  const shaft = mk(new THREE.CylinderGeometry(2.4, 2.4, 14, 48, 1, true), concrete, root, 0, 6.5, 0); shaft.castShadow = false;
  const floor = mk(new THREE.CircleGeometry(2.4, 48), mat(0x55534e, 0.9), root, 0, 0, 0); floor.rotation.x = -Math.PI / 2;
  // open door at the top: a ring with the night sky above
  const lip = mk(new THREE.RingGeometry(2.4, 6, 48), mat(0x6c6a63, 0.9, { side: THREE.DoubleSide }), root, 0, 13.5, 0); lip.rotation.x = Math.PI / 2;
  const sky = new THREE.Mesh(new THREE.CircleGeometry(3, 32), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#0c1630'; g.fillRect(0, 0, w, h); const R = rng(8); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,250,230,${0.4 + R() * 0.6})`; g.fillRect(R() * w, R() * h, 2, 2); }
  }), toneMapped: false })); sky.position.y = 15; sky.rotation.x = Math.PI / 2; root.add(sky);
  const door = mk(new THREE.BoxGeometry(5, 0.5, 2.6), mat(0x5a5850, 0.85), root, 3.2, 14.2, 0); door.rotation.z = -0.5;
  // gantry rings + cables
  for (const y of [2.5, 5.5, 8.5, 11.5]) { const ring = mk(new THREE.TorusGeometry(2.3, 0.06, 6, 48), mat(0x3e3f40, 0.5), root, 0, y, 0); ring.rotation.x = Math.PI / 2; }
  // missile
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const mWhite = new THREE.MeshStandardMaterial({ color: 0xe6e3da, roughness: 0.5, clippingPlanes: [clip], clipShadows: true });
  const mDark = new THREE.MeshStandardMaterial({ color: 0x33343a, roughness: 0.5, clippingPlanes: [clip], clipShadows: true });
  const missile = new THREE.Group(); root.add(missile);
  mk(new THREE.CylinderGeometry(0.62, 0.62, 9.0, 40), mWhite, missile, 0, 5.1, 0);
  mk(new THREE.ConeGeometry(0.62, 2.4, 40), mWhite, missile, 0, 10.8, 0);
  for (const y of [3.0, 7.2]) mk(new THREE.CylinderGeometry(0.63, 0.63, 0.12, 40), mDark, missile, 0, y, 0);
  for (let k = 0; k < 4; k++) { const f = mk(new THREE.BoxGeometry(0.06, 1.2, 0.7), mDark, missile, Math.sin(k * Math.PI / 2) * 0.75, 1.2, Math.cos(k * Math.PI / 2) * 0.75); f.rotation.y = k * Math.PI / 2; }
  mk(new THREE.CylinderGeometry(0.5, 0.62, 0.6, 32), mDark, missile, 0, 0.6, 0);
  // red warning lamps on the wall
  const redM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3a22).multiplyScalar(2), toneMapped: false });
  const lamps = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05 + 0.4, y = 1.5 + (i % 3) * 3.8;
    mk(new THREE.SphereGeometry(0.09, 12, 8), redM, root, Math.sin(a) * 2.32, y, Math.cos(a) * 2.32).castShadow = false;
    const L = new THREE.PointLight(0xff3a22, 3.5, 7, 2); L.position.set(Math.sin(a) * 2.1, y, Math.cos(a) * 2.1); root.add(L); lamps.push(L);
  }
  const hemi = new THREE.HemisphereLight(0x6c7fa8, 0x2a2420, 0.35); root.add(hemi);
  const moon = new THREE.SpotLight(0xb8c8ff, 260, 0, 0.32, 0.6, 2); moon.position.set(0.3, 18, 0.2); moon.target.position.set(0, 0, 0); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); root.add(moon, moon.target);
  const work = new THREE.PointLight(0xffe0b0, 6, 8, 2); work.position.set(-1.6, 3.0, 1.2); root.add(work);
  // embers
  const N = 420, R = rng(77);
  const emb = Array.from({ length: N }, () => ({ u: R(), a: R() * Math.PI * 2, rr: 0.4 + R() * 0.3, vy: 0.6 + R() * 1.4, vr: 0.1 + R() * 0.5, life: 0.8 + R() * 0.9 }));
  const eMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb36a).multiplyScalar(2.6), toneMapped: false }), N);
  eMesh.castShadow = false; eMesh.frustumCulled = false; root.add(eMesh);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  const H0 = 0.25, H1 = 12.2;
  /** u: 0 (whole) → 1 (gone); t0/t1 = the time window of the dissolve; t = now (embers keep rising after the cut passes). */
  function setDissolve(t, t0, t1) {
    const u = clamp((t - t0) / (t1 - t0));
    clip.constant = -lerp(H0, H1, u);              // keep fragments with y >= cut
    missile.visible = u < 0.999;
    emb.forEach((e, i) => {
      const tb = t0 + e.u * (t1 - t0), age = t - tb, y0 = lerp(H0, H1, e.u);
      const vis = age > 0 && age < e.life;
      const s = vis ? 1 - age / e.life : 0;
      const r = (y0 > 10.2 ? 0.62 * (12.4 - y0) / 2.2 : 0.62) + e.vr * Math.max(age, 0);
      P.set(Math.sin(e.a) * r, y0 + e.vy * Math.max(age, 0), Math.cos(e.a) * r);
      M4.compose(P, Q, S.setScalar(Math.max(s, 1e-5))); eMesh.setMatrixAt(i, M4);
    });
    eMesh.instanceMatrix.needsUpdate = true;
  }
  setDissolve(0, 1, 2);
  return { root, missile, setDissolve, lights: { lamps, hemi, moon, work } };
}

// ---------------------------------------------------------------- PARADE GROUND + HANGAR
export function buildBase(studio) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const sky = makeSkyDome(0x7fa9d6, 0xeadcc4); root.add(sky.mesh);
  const ground = mk(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: groundTex('#a3a097', 'rgba(60,60,60,.18)', 3), roughness: 0.95 }), root);
  ground.rotation.x = -Math.PI / 2;
  // painted lines
  for (const x of [-6, 6]) mk(new THREE.PlaneGeometry(0.18, 60), mat(0xe9e2c9, 0.9), root, x, 0.005, 0).rotation.x = -Math.PI / 2;
  // hangar: big half-cylinder shell with an open front
  const shellM = new THREE.MeshStandardMaterial({ color: 0x8e958c, roughness: 0.7, metalness: 0.2, side: THREE.DoubleSide });
  const shell = mk(new THREE.CylinderGeometry(9, 9, 22, 48, 1, true, -Math.PI / 2, Math.PI), shellM, root, 0, 0, -25);
  shell.rotation.x = -Math.PI / 2; // axis along z (z∈[-36,-14]), the arc over the top
  const back = mk(new THREE.CircleGeometry(9, 48, 0, Math.PI), mat(0x6a7068, 0.8, { side: THREE.DoubleSide }), root, 0, 0, -36);
  // front arch frame + warm interior light
  const arch = mk(new THREE.TorusGeometry(9, 0.25, 8, 48, Math.PI), mat(0x5d635c, 0.6), root, 0, 0, -14);
  const inside = new THREE.PointLight(0xffc98a, 120, 30, 2); inside.position.set(0, 6, -24); root.add(inside);
  const stripM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe3b0).multiplyScalar(1.4), toneMapped: false });
  for (const z of [-18, -24, -30]) mk(new THREE.BoxGeometry(6, 0.12, 0.3), stripM, root, 0, 7.6, z).castShadow = false;
  // reviewing stand + plain banners (no flags)
  mk(new RoundedBoxGeometry(10, 1.2, 3, 2, 0.1), mat(0x7a6f60, 0.8), root, -16, 0.6, 6);
  for (const x of [-20, -12]) { mk(new THREE.CylinderGeometry(0.08, 0.08, 8, 8), mat(0xcfcfcf, 0.4), root, x, 4, 4.5); mk(new THREE.PlaneGeometry(1.4, 3.2), mat(0x8a2f2a, 0.9, { side: THREE.DoubleSide }), root, x + 0.75, 6, 4.5); }
  // far fence + trees for depth
  const R = rng(12);
  for (let i = 0; i < 30; i++) { const x = -90 + i * 6 + R() * 2; mk(new THREE.SphereGeometry(2.6 + R() * 1.5, 12, 8), mat(0x5d7a4a, 0.9), root, x, 2.6, -70 - R() * 10); }
  // lights
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x7a6f5e, 1.1); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6); sun.position.set(30, 45, 25); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 140 }); sun.shadow.bias = -0.0005;
  root.add(sun, sun.target);
  // marchers: 6 columns × 5 rows
  const soldiers = [], skins = [0xe0ac88, 0xc68e66, 0x9a6a4c, 0xf0c8a8, 0xd9a77f];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { const S = makeSoldier({ skin: skins[(r * 6 + c) % 5] }); root.add(S.root); soldiers.push({ P: S, r, c }); }
  // tanks
  const tanks = [0, 1, 2, 3].map(() => { const T = makeTank(); root.add(T.g); return T; });
  return { root, sky, soldiers, tanks, lights: { hemi, sun, inside } };
}

// ---------------------------------------------------------------- BORDER POST (dusk)
export function buildBorder(studio) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const sky = makeSkyDome(0x27315a, 0xe08a5a); root.add(sky.mesh);
  const grass = mk(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: groundTex('#5d6b43', null, 9), roughness: 1 }), root); grass.rotation.x = -Math.PI / 2;
  const road = mk(new THREE.PlaneGeometry(5, 400), mat(0x3e3d3b, 0.9), root, 0, 0.01, 0); road.rotation.x = -Math.PI / 2;
  for (let z = -190; z < 190; z += 6) mk(new THREE.PlaneGeometry(0.15, 2.5), mat(0xe8dfc0, 0.8), root, 0, 0.015, z).rotation.x = -Math.PI / 2;
  // border line: low fence posts along x, painted stripe across the road
  for (let x = -60; x <= 60; x += 3) if (Math.abs(x) > 3) { mk(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), mat(0x8a8070, 0.8), root, x, 0.6, 0); }
  const wire = mk(new THREE.BoxGeometry(117, 0.02, 0.02), mat(0x9a9488, 0.5), root, 0, 1.0, 0);
  mk(new THREE.PlaneGeometry(5, 0.3), mat(0xf0e8d0, 0.8), root, 0, 0.02, 0).rotation.x = -Math.PI / 2;
  // barrier arm (red/white) + post
  const armTex = canvasTex(256, 32, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f2eee4' : '#c23a2e'; g.fillRect(i * 32, 0, 32, h); } });
  mk(new RoundedBoxGeometry(0.4, 1.1, 0.4, 2, 0.05), mat(0x4a4d50, 0.6), root, -2.9, 0.55, 0.4);
  const arm = mk(new THREE.BoxGeometry(5.6, 0.14, 0.14), new THREE.MeshStandardMaterial({ map: armTex, roughness: 0.6 }), root, -0.1, 1.0, 0.4);
  // guard booth with a lit window
  const booth = new THREE.Group(); booth.position.set(-4.6, 0, 2.6); root.add(booth);
  mk(new RoundedBoxGeometry(2.0, 2.4, 2.0, 2, 0.06), mat(0xd8d2c2, 0.85), booth, 0, 1.2, 0);
  mk(new RoundedBoxGeometry(2.3, 0.18, 2.3, 2, 0.05), mat(0x5a4a3a, 0.8), booth, 0, 2.48, 0);
  const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd08a).multiplyScalar(1.3), toneMapped: false });
  mk(new THREE.PlaneGeometry(1.1, 0.7), winM, booth, 0, 1.5, 1.01).castShadow = false;
  const boothL = new THREE.PointLight(0xffc27a, 9, 8, 2); boothL.position.set(-4.6, 1.8, 4.0); root.add(boothL);
  const lampPost = mk(new THREE.CylinderGeometry(0.06, 0.08, 4.5, 8), mat(0x3a3a3a, 0.5), root, 3.2, 2.25, 1.0);
  const lampHead = mk(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(2), toneMapped: false }), root, 3.2, 4.5, 1.0); lampHead.castShadow = false;
  const lamp = new THREE.PointLight(0xffd09a, 26, 18, 2); lamp.position.set(3.2, 4.3, 1.0); root.add(lamp);
  // the guard
  const guard = makeSoldier({ top: 0x5a6a7a, pants: 0x4a5866, helmet: 0x4d5b6a, skin: 0xd9a77f }); root.add(guard.root);
  // tanks across the border on a ridge
  const ridge = mk(new THREE.SphereGeometry(80, 32, 12, 0, Math.PI * 2, 0, 0.35), mat(0x4c5838, 1), root, 0, -75.5, -95);
  const tanks = [];
  for (let i = 0; i < 9; i++) { const T = makeTank(0x4d5638); T.g.rotation.y = Math.PI * 0 + 0; T.g.position.set(-32 + i * 8, 0, -62); root.add(T.g); tanks.push(T); }
  const tankGlow = new THREE.PointLight(0xffe2a8, 0, 60, 1.5); tankGlow.position.set(0, 3, -55); root.add(tankGlow);
  // lights
  const hemi = new THREE.HemisphereLight(0x8e8fc0, 0x3a3020, 0.55); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xff9a5c, 1.4); sun.position.set(-20, 8, -60); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 5, far: 120 });
  root.add(sun, sun.target);
  const setTanksAdvance = (u, lightsOn) => { tanks.forEach((T, i) => { T.g.position.z = -62 + u * 6 + (i % 2) * 1.5; T.setLights(lightsOn); }); tankGlow.intensity = 40 * lightsOn; };
  setTanksAdvance(0, 1);
  return { root, sky, guard, arm, tanks, setTanksAdvance, lights: { hemi, sun, lamp, boothL } };
}

// ---------------------------------------------------------------- NUCLEAR POWER PLANT
export function buildPlant(studio) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const sky = makeSkyDome(0x6f9fd6, 0xe9dcc4); root.add(sky.mesh);
  const grass = mk(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: groundTex('#7c8a58', null, 4), roughness: 1 }), root); grass.rotation.x = -Math.PI / 2;
  const water = mk(new THREE.PlaneGeometry(600, 40), new THREE.MeshStandardMaterial({ color: 0x4f6f8a, roughness: 0.25, metalness: 0.1 }), root, 0, 0.03, 48); water.rotation.x = -Math.PI / 2;
  const conc = mat(0xc9c4b8, 0.9);
  // cooling towers (hyperboloid lathe)
  const prof = []; for (let i = 0; i <= 24; i++) { const y = (i / 24) * 34; const r = 9.5 - 4.2 * Math.sin((i / 24) * Math.PI * 0.8) ; prof.push(new THREE.Vector2(r, y)); }
  const towerTops = [];
  for (const [x, z] of [[-14, -20], [10, -30]]) {
    const tw = mk(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ color: 0xcdc8bc, roughness: 0.9, side: THREE.DoubleSide }), root, x, 0, z);
    towerTops.push(new THREE.Vector3(x, 34, z));
  }
  // reactor building + dome + turbine hall
  mk(new THREE.CylinderGeometry(7, 7, 12, 40), conc, root, 16, 6, 4);
  mk(new THREE.SphereGeometry(7, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), conc, root, 16, 12, 4);
  mk(new RoundedBoxGeometry(24, 9, 10, 2, 0.3), mat(0x9fa7ad, 0.8), root, -6, 4.5, 8);
  mk(new THREE.CylinderGeometry(0.9, 1.1, 30, 16), mat(0xd9d3c6, 0.8), root, 30, 15, -10);
  // fence
  for (let x = -40; x <= 40; x += 4) mk(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), mat(0x7a7a7a, 0.5), root, x, 1.1, 24);
  mk(new THREE.BoxGeometry(80, 1.6, 0.03), new THREE.MeshStandardMaterial({ color: 0x8a8a8a, transparent: true, opacity: 0.35 }), root, 0, 1.1, 24).castShadow = false;
  // window lights for night
  const winM = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  for (let i = 0; i < 10; i++) mk(new THREE.PlaneGeometry(1.2, 0.8), winM, root, -16 + i * 2.2, 6, 13.02).castShadow = false;
  const redM = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  for (const p of towerTops) mk(new THREE.SphereGeometry(0.35, 8, 6), redM, root, p.x + 5.3, p.y + 0.3, p.z).castShadow = false;
  // steam: soft sprites rising from each tower top (deterministic loop)
  const puffTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const puffs = [], R = rng(41);
  for (const top of towerTops) for (let i = 0; i < 26; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0.8 }));
    root.add(sp); puffs.push({ sp, top, ph: i / 26, dx: (R() - 0.5) * 4, s: 8 + R() * 6 });
  }
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x6a6a50, 1.1); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4); sun.position.set(40, 60, 50); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 10, far: 200 });
  root.add(sun, sun.target);
  const DAYSKY = [0x6f9fd6, 0xe9dcc4], NIGHTSKY = [0x0b1430, 0x2a3558];
  const A = new THREE.Color(), B = new THREE.Color();
  /** d: 1 = noon, 0 = night. t drives the steam. */
  function update(t, d) {
    sky.setColors(A.set(NIGHTSKY[0]).lerp(new THREE.Color(DAYSKY[0]), d).getHex(), B.set(NIGHTSKY[1]).lerp(new THREE.Color(DAYSKY[1]), d).getHex());
    sun.intensity = 2.4 * d; hemi.intensity = 0.35 + 0.75 * d;
    winM.color.setHex(0xffd08a).multiplyScalar(1.4 * (1 - d));
    redM.color.setHex(0xff3a22).multiplyScalar(0.3 + 2.2 * (1 - d));
    puffs.forEach((p) => {
      const u = (t * 0.22 + p.ph) % 1;
      p.sp.position.set(p.top.x + p.dx * u + u * 10, p.top.y + u * 26, p.top.z + p.dx * 0.5);
      p.sp.scale.setScalar(p.s * (0.5 + u * 1.3));
      p.sp.material.opacity = 0.75 * Math.sin(Math.PI * u) * (0.45 + 0.55 * d);
      p.sp.material.color.setScalar(0.35 + 0.65 * d);
    });
  }
  update(0, 1);
  return { root, sky, update, lights: { hemi, sun } };
}
