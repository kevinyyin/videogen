// SET: a sunny toy-city street (daytime). Built for "What if…" crowd simulations (video 002) — reuse for any outdoor city story.
// Signature look: warm low sun, long soft shadows, pastel low-poly buildings on both sides, hazy skyline at the street's ends.
//
// Coordinates (meters, y up). The street runs along x.
//   Back sidewalk  z∈[-3, 0]   (top at y=SIDEWALK_H). Storefront facades at z=-3, facing +z.
//   Road           z∈[0, 7]    (center line z=3.5). Crosswalk at x∈[2.6, 5.4].
//   Front sidewalk z∈[7, 10]   facades at z=10, facing -z.
//   Named spots (back side, see DIMS.spots): hospital doors, restroom door, market door, hot-dog cart, bench, trash can.
// Cameras: face a storefront from the road (z≈4–6, looking -z), or look down the street along -x from x≈12 (vertical frame loves depth).
// Call set.aimSun(cx, cz, half) per shot so the sun's shadow map is sharp where the action is.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng, clamp } from '@engine/core.js';

export const SIDEWALK_H = 0.12;
export const DIMS = {
  back: { z0: -3, z1: 0 }, road: { z0: 0, z1: 7 }, front: { z0: 7, z1: 10 },
  spots: {
    hospitalDoor: [-11.5, -2.6], restroomDoor: [-5.2, -2.6], marketDoor: [0.6, -2.6],
    cart: [5.6, -1.1], bench: [10.0, -2.2], trash: [7.8, -0.5],
  },
};

const FACADES = ['#e9c9a3', '#d98f7a', '#a9c4c9', '#efe0b8', '#b8a6c9', '#c9d6a8', '#e6b8b8', '#9fb6d6'];

function facadeTexture(base, R) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // one window per tile: frame, glass with a sky reflection, sill
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(70, 52, 116, 150);
    const gr = g.createLinearGradient(0, 60, 0, 196); gr.addColorStop(0, '#9ec4e6'); gr.addColorStop(1, '#4f6f93');
    g.fillStyle = gr; g.fillRect(80, 62, 96, 130);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(80, 150); g.lineTo(140, 62); g.lineTo(160, 62); g.lineTo(100, 192); g.lineTo(80, 192); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(126, 62, 4, 130); g.fillRect(64, 200, 128, 10);
    g.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 40; i++) g.fillRect(R() * w, R() * h, 2, 2);
  });
}
function signTexture(text, bg, fg, w = 512, h = 128, font = 'bold 74px Helvetica, Arial, sans-serif') {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  });
}
function asphaltTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#5b5d63'; g.fillRect(0, 0, w, h);
    const R = rng(3); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},${0.04 + R() * 0.06})`; g.fillRect(R() * w, R() * h, 2, 2); }
  }, [16, 2]);
}
function pavingTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c9c2b6'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,80,70,.35)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
    const R = rng(9); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.05})`; g.fillRect(R() * w, R() * h, 3, 3); }
  }, [40, 3]);
}
function skyTexture() {
  return canvasTex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5f9bd8'); gr.addColorStop(0.42, '#9cc6ec'); gr.addColorStop(0.5, '#f4dcc0'); gr.addColorStop(1, '#f4dcc0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

export function buildStreet(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 42);
  studio.camera.far = 400; // outdoor: the street's ends + skyline are far away
  const box = (w, h, d, m, x, y, z, parent = root) => mk(new THREE.BoxGeometry(w, h, d), m, parent, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, parent = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, parent, x, y, z);
  const X0 = -90, X1 = 40;

  // ---------------------------------------------------------------- sky + haze
  const HAZE = new THREE.Color(0xe9d9c6);
  scene.fog = new THREE.Fog(HAZE, 30, 120);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, toneMapped: false }));
  root.add(sky);

  // ---------------------------------------------------------------- ground
  const road = mk(new THREE.PlaneGeometry(X1 - X0, 7), new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.92 }), root, (X0 + X1) / 2, 0, 3.5);
  road.rotation.x = -Math.PI / 2; road.castShadow = false;
  const paint = mat(0xf2efe6, 0.7), yellow = mat(0xf1c24a, 0.7);
  for (let x = X0; x < X1; x += 3) { const d = box(1.5, 0.004, 0.12, yellow, x, 0.002, 3.5); d.castShadow = false; }
  for (let i = 0; i < 7; i++) { const c = box(0.42, 0.005, 6.2, paint, 2.8 + i * 0.42 * 2, 0.003, 3.5); c.castShadow = false; }
  const paveMat = new THREE.MeshStandardMaterial({ map: pavingTexture(), roughness: 0.9 });
  const curbMat = mat(0xb7b0a5, 0.85);
  for (const [z0, z1] of [[-3, 0], [7, 10]]) {
    box(X1 - X0, SIDEWALK_H, z1 - z0, paveMat, (X0 + X1) / 2, SIDEWALK_H / 2, (z0 + z1) / 2);
    box(X1 - X0, SIDEWALK_H + 0.01, 0.16, curbMat, (X0 + X1) / 2, SIDEWALK_H / 2, z0 === -3 ? -0.08 : 7.08);
  }
  // snow cover (winter) — thin white slabs on both sidewalks
  const snowMat = mat(0xf4f7fb, 0.95);
  const snowGround = new THREE.Group(); root.add(snowGround); snowGround.visible = false;
  box(X1 - X0, 0.02, 2.9, snowMat, (X0 + X1) / 2, SIDEWALK_H + 0.01, -1.55, snowGround); box(X1 - X0, 0.02, 2.9, snowMat, (X0 + X1) / 2, SIDEWALK_H + 0.01, 8.55, snowGround);

  // ---------------------------------------------------------------- buildings (both sides)
  const facadeMats = FACADES.map((c) => facadeTexture(c, R));
  const storeDark = mat(0x3c3f46, 0.5);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x24384f, roughness: 0.15, metalness: 0.3, emissive: 0x1d2a3a, emissiveIntensity: 0.4 });
  function building(x0, x1, side, h, ci, opt = {}) {
    const w = x1 - x0, cx = (x0 + x1) / 2, zf = side < 0 ? -3 : 10, d = 9, zc = zf + side * d / 2;
    const tex = facadeMats[ci % facadeMats.length].clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, Math.round(w / 1.6)), Math.max(1, Math.round((h - 3.2) / 1.9)));
    const upper = box(w, h - 3.2, d, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), cx, 3.2 + (h - 3.2) / 2, zc);
    const groundCol = opt.ground ?? FACADES[(ci + 3) % FACADES.length];
    box(w, 3.2, d, mat(groundCol, 0.85), cx, 1.6, zc);
    box(w + 0.1, 0.18, 0.3, mat(0xf3eee4, 0.6), cx, 3.2, zf - side * 0.12);              // cornice between floors
    box(w + 0.2, 0.3, 0.4, mat(0xf3eee4, 0.6), cx, h + 0.15, zf - side * 0.15);           // roof lip
    if (!opt.custom) {                                                                    // generic shop window + door
      const win = box(w * 0.55, 1.6, 0.06, glassMat, cx - w * 0.12, 1.45, zf - side * 0.03);
      box(0.9, 2.1, 0.06, storeDark, cx + w * 0.32, 1.17, zf - side * 0.03);
      if (opt.awning !== false && w > 3) {
        const aw = rbox(w * 0.7, 0.08, 1.1, 0.03, mat(opt.awning ?? FACADES[(ci + 5) % FACADES.length], 0.8), cx - w * 0.05, 2.75, zf - side * 0.5);
        aw.rotation.x = side * 0.22;
      }
      win.castShadow = false;
    }
    return { cx, zf, w, upper };
  }
  // back side (z=-3): storefronts the story uses, then generic blocks out to the haze
  const hosp = building(-16.5, -8.2, -1, 11, 3, { ground: '#f2f0ea', custom: true });
  const cafe = building(-8.2, -3.4, -1, 8, 4, { custom: true, ground: '#e9c9a3' });
  const market = building(-3.4, 3.6, -1, 9, 5, { custom: true, ground: '#7aa77c' });
  building(3.6, 8.0, -1, 12, 1);
  building(8.0, 13.5, -1, 10, 6);
  building(13.5, 19, -1, 14, 2);
  building(19, 26, -1, 9, 7);
  building(26, 34, -1, 13, 0);
  for (let x = -16.5; x > X0; ) { const w = 5 + R() * 6; building(x - w, x, -1, 8 + R() * 12, Math.floor(R() * 8)); x -= w; }
  for (let x = X1; x > X0; ) { const w = 5 + R() * 6; building(x - w, x, 1, 8 + R() * 12, Math.floor(R() * 8)); x -= w; }
  // distant skyline blocks at the street's ends
  for (let i = 0; i < 26; i++) {
    const x = X0 - 6 - R() * 30, z = -25 + R() * 60, h = 18 + R() * 40;
    box(6 + R() * 6, h, 6 + R() * 6, mat(FACADES[i % FACADES.length], 0.9), x, h / 2, z);
  }

  // --- hospital: white, glass doors, red cross + HOSPITAL letters
  const hz = -3;
  box(3.6, 2.4, 0.06, glassMat, -11.5, 1.32, hz + 0.03);
  box(0.06, 2.4, 0.08, mat(0xd8d8d8, 0.4), -11.5, 1.32, hz + 0.06);
  const crossMat = new THREE.MeshStandardMaterial({ color: 0xe0393e, emissive: 0xe0393e, emissiveIntensity: 0.25, roughness: 0.5 });
  box(0.9, 0.28, 0.1, crossMat, -14.6, 3.75, hz + 0.08); box(0.28, 0.9, 0.1, crossMat, -14.6, 3.75, hz + 0.08);
  const hospSign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.9), new THREE.MeshStandardMaterial({ map: signTexture('HOSPITAL', '#f2f0ea', '#d23a3f', 640, 128), roughness: 0.6 }));
  hospSign.position.set(-11.5, 3.75, hz + 0.05); root.add(hospSign);
  rbox(4.4, 0.1, 1.6, 0.03, mat(0xf2f0ea, 0.6), -11.5, 2.7, hz + 0.75);

  // --- café with the RESTROOM door
  box(2.2, 1.6, 0.06, glassMat, -7.0, 1.45, hz + 0.03);
  box(0.95, 2.1, 0.06, mat(0x5b7fa6, 0.6), -5.2, 1.17, hz + 0.03);
  const rr = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.24), new THREE.MeshStandardMaterial({ map: signTexture('RESTROOM', '#2f4f73', '#ffffff', 512, 144, 'bold 92px Helvetica, Arial, sans-serif'), roughness: 0.6 }));
  rr.position.set(-5.2, 2.4, hz + 0.07); root.add(rr);
  const cafeSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshStandardMaterial({ map: signTexture('CAFÉ', '#8a4f3a', '#fff3df'), roughness: 0.6 }));
  cafeSign.position.set(-7.0, 2.6, hz + 0.05); root.add(cafeSign);

  // --- market: green awning, MARKET sign, window poster "PICKLES SOLD OUT"
  const mz = hz + 0.03;
  box(3.4, 1.7, 0.06, glassMat, -1.4, 1.45, mz);
  box(1.3, 2.2, 0.06, storeDark, 0.6, 1.22, mz);
  const awn = rbox(6.6, 0.08, 1.3, 0.03, mat(0x2f7d4f, 0.8), 0.1, 2.8, hz + 0.62); awn.rotation.x = -0.22;
  for (let i = 0; i < 11; i++) { const st = box(0.3, 0.085, 1.31, mat(0xf5f0e2, 0.8), -3.0 + i * 0.6, 2.8, hz + 0.62); st.rotation.x = -0.22; }
  const mkSign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.85), new THREE.MeshStandardMaterial({ map: signTexture('MARKET', '#fff7e6', '#2f7d4f', 640, 128), roughness: 0.6 }));
  mkSign.position.set(0.1, 3.75, hz + 0.05); root.add(mkSign);
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshStandardMaterial({
    map: canvasTex(384, 256, (g, w, h) => {
      g.fillStyle = '#fff9e8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d23a3f'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#2f7d4f'; g.font = 'bold 64px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('PICKLES', w / 2, 100);
      g.fillStyle = '#d23a3f'; g.font = 'bold 58px Helvetica, Arial, sans-serif'; g.fillText('SOLD OUT', w / 2, 180);
      g.fillStyle = '#555'; g.font = '24px Helvetica, Arial, sans-serif'; g.fillText('(everywhere)', w / 2, 222);
    }), roughness: 0.7,
  }));
  poster.position.set(-1.4, 1.5, mz + 0.04); root.add(poster);
  // produce crates by the window
  for (let i = 0; i < 3; i++) {
    rbox(0.6, 0.35, 0.45, 0.02, mat(0xb98b5c, 0.9), -2.6 + i * 0.75, SIDEWALK_H + 0.18, -2.6);
    for (let k = 0; k < 6; k++) mk(new THREE.SphereGeometry(0.07, 10, 8), mat([0xd2483f, 0xf1c24a, 0x6fa84f][i], 0.6), root, -2.82 + i * 0.75 + (k % 3) * 0.2, SIDEWALK_H + 0.4, -2.72 + Math.floor(k / 3) * 0.2);
  }

  // ---------------------------------------------------------------- street furniture
  const metal = mat(0x3d4a45, 0.5);
  const lampHeads = [];
  for (let x = X0 + 4; x < X1; x += 9) for (const z of [-0.45, 7.45]) {
    mk(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 10), metal, root, x, 2.1 + SIDEWALK_H, z);
    const arm = mk(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), metal, root, x, 4.2, z + (z < 3 ? 0.35 : -0.35)); arm.rotation.x = Math.PI / 2;
    lampHeads.push(mk(new THREE.SphereGeometry(0.16, 14, 10), mat(0xfff3d6, 0.4), root, x, 4.1, z + (z < 3 ? 0.7 : -0.7)));
  }
  // trees (foliage color follows the season)
  const leafMat = mat(0x6fa84f, 0.85), trunkMat = mat(0x6b4a33, 0.9);
  const trees = [];
  for (let x = X0 + 8.5; x < X1; x += 9) for (const z of [-0.6, 7.6]) {
    if (x > 4 && x < 11.5 && z < 0) continue; // keep the cart / trash / bench corner clear
    const t = new THREE.Group(); t.position.set(x, SIDEWALK_H, z); root.add(t);
    mk(new THREE.CylinderGeometry(0.09, 0.13, 2.2, 8), trunkMat, t, 0, 1.1, 0);
    const crown = new THREE.Group(); t.add(crown);
    for (let k = 0; k < 4; k++) mk(new THREE.IcosahedronGeometry(0.75 - k * 0.08, 1), leafMat, crown, (R() - 0.5) * 0.7, 2.6 + k * 0.32, (R() - 0.5) * 0.5);
    trees.push({ t, crown });
  }
  // bench
  const S = DIMS.spots, bench = new THREE.Group(); bench.position.set(S.bench[0], SIDEWALK_H, S.bench[1]); root.add(bench);
  const benchWood = mat(0xa8744a, 0.7);
  for (let i = 0; i < 3; i++) rbox(2.2, 0.05, 0.14, 0.015, benchWood, 0, 0.45, -0.18 + i * 0.16, bench);
  for (let i = 0; i < 2; i++) { const b = rbox(2.2, 0.12, 0.05, 0.015, benchWood, 0, 0.72 + i * 0.16, -0.3, bench); b.rotation.x = -0.15; }
  for (const x of [-0.95, 0.95]) { box(0.06, 0.45, 0.45, metal, x, 0.225, 0, bench); box(0.06, 0.5, 0.06, metal, x, 0.7, -0.3, bench); }
  // trash can
  const trash = new THREE.Group(); trash.position.set(S.trash[0], SIDEWALK_H, S.trash[1]); root.add(trash);
  mk(new THREE.CylinderGeometry(0.28, 0.25, 0.9, 16), mat(0x2f5d50, 0.6), trash, 0, 0.45, 0);
  mk(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16), mat(0x24463d, 0.6), trash, 0, 0.92, 0);
  // hot-dog cart: box on wheels + striped umbrella + sign
  const cart = new THREE.Group(); cart.position.set(S.cart[0], SIDEWALK_H, S.cart[1]); root.add(cart);
  rbox(1.4, 0.75, 0.75, 0.04, mat(0xd8dde2, 0.35, { metalness: 0.4 }), 0, 0.68, 0, cart);
  rbox(1.42, 0.1, 0.77, 0.02, mat(0xd2483f, 0.6), 0, 1.08, 0, cart);
  for (const x of [-0.5, 0.5]) { const w = mk(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 18), mat(0x4a4a4a, 0.7), cart, x, 0.22, 0.42); w.rotation.x = Math.PI / 2; mk(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 14), mat(0xc9ccd0, 0.3, { metalness: 0.5 }), cart, x, 0.22, 0.42).rotation.x = Math.PI / 2; }
  mk(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), metal, cart, 0, 1.75, 0);
  const umb = new THREE.Group(); umb.position.set(0, 2.45, 0); cart.add(umb);
  for (let i = 0; i < 8; i++) {
    const seg = mk(new THREE.ConeGeometry(0.95, 0.38, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), mat(i % 2 ? 0xf5efe0 : 0xd2483f, 0.7, { side: THREE.DoubleSide }), umb);
    seg.castShadow = true;
  }
  const cartSign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), new THREE.MeshStandardMaterial({ map: signTexture('HOT DOGS', '#f1c24a', '#7a2a1c', 512, 128), roughness: 0.6 }));
  cartSign.position.set(0, 0.8, 0.381); cart.add(cartSign);
  // a few parked toy cars
  const carCols = [0xd2483f, 0x3d7bd9, 0xf1c24a, 0x6fa84f, 0xf5f0e2];
  for (const [x, col, side] of [[-34, 0, 1], [14.5, 1, 1], [22, 2, 1], [-30, 3, -1], [-3, 4, -1], [30, 0, -1]]) {
    const car = new THREE.Group(); car.position.set(x, 0, side > 0 ? 1.05 : 5.95); root.add(car);
    const cm = mat(carCols[col], 0.35);
    rbox(2.6, 0.55, 1.25, 0.12, cm, 0, 0.55, 0, car);
    rbox(1.4, 0.5, 1.15, 0.12, cm, -0.15, 1.02, 0, car);
    box(1.32, 0.38, 1.17, glassMat, -0.15, 1.04, 0, car);
    for (const [wx, wz] of [[-0.85, 0.6], [0.85, 0.6], [-0.85, -0.6], [0.85, -0.6]]) { const w = mk(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16), mat(0x222222, 0.8), car, wx, 0.28, wz); w.rotation.x = Math.PI / 2; }
  }

  // ---------------------------------------------------------------- lights
  const hemi = new THREE.HemisphereLight(0xbcd6f2, 0x8a7560, opts.ambient ?? 1.25); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, opts.sun ?? 2.6);
  const SUN_DIR = new THREE.Vector3(0.55, 0.75, 0.62).normalize(); // from the camera side, high, slightly right -> faces lit, shadows fall back-left
  root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  function aimSun(cx = 0, cz = -1, half = 12) {
    sun.target.position.set(cx, 0, cz);
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 40);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 5, far: 90 });
    sun.shadow.camera.updateProjectionMatrix();
  }
  aimSun();

  // ---------------------------------------------------------------- seasons
  const SEASONS = {
    spring: { leaf: 0x86c25a, sun: 0xfff0d8, sunI: 2.6, hemi: 1.25, snow: false, fog: 0xe9d9c6 },
    summer: { leaf: 0x4f9a3f, sun: 0xfff3dc, sunI: 2.9, hemi: 1.3, snow: false, fog: 0xeadfcf },
    autumn: { leaf: 0xe08a3a, sun: 0xffdcae, sunI: 2.5, hemi: 1.15, snow: false, fog: 0xead2b4 },
    winter: { leaf: null, sun: 0xeef2ff, sunI: 2.2, hemi: 1.35, snow: true, fog: 0xdfe6ef },
  };
  // snow particles (winter)
  const SN = 900, snowGeo = new THREE.BufferGeometry(), sSeeds = Array.from({ length: SN }, () => [R(), R(), R(), R()]);
  snowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SN * 3), 3));
  const dotC = document.createElement('canvas'); dotC.width = dotC.height = 32; const dg = dotC.getContext('2d'); const drg = dg.createRadialGradient(16, 16, 0, 16, 16, 16); drg.addColorStop(0, '#fff'); drg.addColorStop(1, 'rgba(255,255,255,0)'); dg.fillStyle = drg; dg.fillRect(0, 0, 32, 32);
  const flakes = new THREE.Points(snowGeo, new THREE.PointsMaterial({ size: 0.07, map: new THREE.CanvasTexture(dotC), transparent: true, depthWrite: false, color: 0xffffff }));
  flakes.frustumCulled = false; flakes.visible = false; root.add(flakes);
  let curSeason = null;
  function setSeason(name, t = 0, center = [0, 2]) {
    const s = SEASONS[name];
    if (name !== curSeason) {
      curSeason = name;
      if (s.leaf) leafMat.color.setHex(s.leaf);
      trees.forEach((tr) => { tr.crown.visible = !!s.leaf; });
      sun.color.setHex(s.sun); sun.intensity = s.sunI; hemi.intensity = s.hemi; scene.fog.color.setHex(s.fog);
      snowGround.visible = s.snow; flakes.visible = s.snow;
    }
    if (s.snow) {
      const a = snowGeo.attributes.position;
      for (let i = 0; i < SN; i++) {
        const [u, v, w, k] = sSeeds[i];
        a.setXYZ(i, center[0] - 14 + u * 28 + Math.sin(t * (0.6 + k) + i) * 0.15, 8 - ((v * 8 + t * (0.5 + k * 0.4)) % 8), center[1] - 6 + w * 14);
      }
      a.needsUpdate = true;
    }
  }
  setSeason('spring');

  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  sky.receiveShadow = false;

  return { root, D: DIMS, cart, bench, trash, trees, lights: { hemi, sun }, aimSun, setSeason, buildings: { hosp, cafe, market } };
}
