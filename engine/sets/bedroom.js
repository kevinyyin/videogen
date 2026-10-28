// SET: child's bedroom at night + the hallway behind its door.
// Signature look: cool moonlight through the window vs a warm wedge of hallway light when the door opens.
//
// Coordinates (meters, y up). Room x∈[-2,2], z∈[-2.5,2.5], ceiling 2.7.
//   Door: left wall (x=-2), opening z∈[-0.3,0.6], hinge at z=-0.3, swings OUT into the hallway toward -z (setDoor(θ), θ≈1.25 = open)
//         so the leaf never blocks a camera in the room or the light. Keep people in the hallway at z>0.25 (outside the leaf's arc).
//   Window: back wall (z=-2.5), opening x∈[0.4,1.45], y∈[1.0,2.05].
//   Bed / crib: centered x=-0.3, headboard against the back wall. Nightstand + lamp left of the bed.
//   Hallway: x∈[-3.7,-2.12] (self-lit warm walls + a spotlight that throws the wedge into the room).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng, clamp } from '@engine/core.js';
import { makeSkyTextures, makeWeather } from '@engine/sky.js';
import { makeMovingBox } from '@engine/props.js';

export const DIMS = {
  room: { x0: -2, x1: 2, z0: -2.5, z1: 2.5, h: 2.7 },
  door: { x: -2, z0: -0.3, z1: 0.6, h: 2.05, width: 0.9 },
  window: { x0: 0.4, x1: 1.45, y0: 1.0, y1: 2.05 },
  bed: { cx: -0.3, w: 1.0, z0: -2.43, z1: -0.5, top: 0.58 },
  crib: { cx: -0.3, w: 0.62, z0: -2.36, z1: -1.16, top: 0.55 },
  nightstand: { x: -1.12, z: -2.24, w: 0.42, d: 0.38, h: 0.55 },
  hallSpot: [-2.95, 0.5],       // a person standing in the hallway, visible through the open door
  doorway: [-2.2, 0.25],        // just outside the threshold
};

function floorTexture() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const R = rng(7), rows = 8, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -R() * 300;
      while (x < w) {
        const pw = 260 + R() * 300;
        g.fillStyle = `hsl(${27 + R() * 6},${40 + R() * 12}%,${44 + R() * 10}%)`; g.fillRect(x, r * rh, pw, rh);
        g.globalAlpha = 0.13;
        for (let k = 0; k < 7; k++) {
          g.strokeStyle = R() < 0.5 ? '#3a2414' : '#f2d2a2'; g.lineWidth = 1 + R() * 2; g.beginPath();
          const yy = r * rh + R() * rh; g.moveTo(x, yy); g.bezierCurveTo(x + pw * 0.3, yy + (R() - 0.5) * 10, x + pw * 0.6, yy + (R() - 0.5) * 10, x + pw, yy + (R() - 0.5) * 6); g.stroke();
        }
        g.globalAlpha = 1; g.fillStyle = 'rgba(40,22,10,.55)'; g.fillRect(x, r * rh, 3, rh); x += pw;
      }
      g.fillStyle = 'rgba(40,22,10,.6)'; g.fillRect(0, r * rh, w, 3);
    }
  }, [2, 2.5]);
}
function rugTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    const cols = ['#c9b38c', '#a8584a', '#e6d7b8', '#5c7c84', '#e6d7b8', '#a8584a', '#c9b38c'];
    cols.forEach((c, i) => { g.fillStyle = c; const m = i * 26; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - m, h / 2 - m, 0, 0, 7); g.fill(); });
  });
}
function artTexture(kind) {
  return canvasTex(256, 320, (g, w, h) => {
    const R = rng(kind.length * 13);
    if (kind === 'moon') { g.fillStyle = '#1d2c4d'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6e7b8'; g.beginPath(); g.arc(w * 0.55, h * 0.4, 60, 0, 7); g.fill(); g.fillStyle = '#1d2c4d'; g.beginPath(); g.arc(w * 0.66, h * 0.34, 54, 0, 7); g.fill(); for (let i = 0; i < 20; i++) { g.fillStyle = '#f6e7b8'; g.fillRect(R() * w, R() * h, 3, 3); } }
    else if (kind === 'family') { g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h); g.fillStyle = '#7da0b8'; g.fillRect(0, h * 0.62, w, h * 0.38); [[0.32, '#c46b7b'], [0.55, '#3c5a7a'], [0.75, '#e0b45a']].forEach(([x, c], i) => { g.fillStyle = c; g.fillRect(w * x - 18, h * 0.4 - i * 6, 36, 90 - i * 25); g.fillStyle = '#e1ad8b'; g.beginPath(); g.arc(w * x, h * 0.33 - i * 6, 18 - i * 3, 0, 7); g.fill(); }); }
    else if (kind === 'crayon') { g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h); g.lineWidth = 7; g.lineCap = 'round'; ['#e04b3a', '#3a7be0', '#3ab05a', '#f2b632'].forEach((c) => { g.strokeStyle = c; g.beginPath(); g.moveTo(R() * w, R() * h); for (let k = 0; k < 4; k++) g.quadraticCurveTo(R() * w, R() * h, R() * w, R() * h); g.stroke(); }); g.fillStyle = '#f2b632'; g.beginPath(); g.arc(w * 0.78, h * 0.18, 26, 0, 7); g.fill(); }
    else if (kind === 'poster1') { g.fillStyle = '#20262e'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8574a'; g.beginPath(); g.arc(w / 2, h * 0.42, 80, 0, 7); g.fill(); g.fillStyle = '#f1e9d8'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('NIGHT', w / 2, h * 0.82); g.fillText('DRIVE', w / 2, h * 0.94); }
    else if (kind === 'poster2') { g.fillStyle = '#e9c46a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#264653' : '#e76f51'; g.fillRect(0, i * 34 + 60, w, 18); } g.fillStyle = '#264653'; g.font = 'bold 46px sans-serif'; g.textAlign = 'center'; g.fillText('TOUR', w / 2, h * 0.9); }
  });
}

export function buildBedroom(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const D = DIMS;

  // ---------------------------------------------------------------- materials
  const wallMat = mat(opts.wallColor ?? 0xd9c9ae, 0.95);
  const trimMat = mat(0xece6da, 0.6);
  const woodMat = mat(0xa8744a, 0.6), woodDark = mat(0x7d5233, 0.65);
  const box = (w, h, d, m, x, y, z, parent = root) => mk(new THREE.BoxGeometry(w, h, d), m, parent, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, parent = root) => mk(new RoundedBoxGeometry(w, h, d, 3, r), m, parent, x, y, z);

  // ---------------------------------------------------------------- shell
  const floor = mk(new THREE.PlaneGeometry(4.0, 5.0), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.62 }), root);
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  box(4.3, 0.1, 5.3, mat(0xcfc2ad, 1), 0, 2.75, 0);                                   // ceiling
  // back wall with window hole
  const W = D.window;
  box(2.52, 2.7, 0.12, wallMat, -0.86, 1.35, -2.56);
  box(0.67, 2.7, 0.12, wallMat, 1.785, 1.35, -2.56);
  box(W.x1 - W.x0, W.y0, 0.12, wallMat, (W.x0 + W.x1) / 2, W.y0 / 2, -2.56);
  box(W.x1 - W.x0, 2.7 - W.y1, 0.12, wallMat, (W.x0 + W.x1) / 2, (2.7 + W.y1) / 2, -2.56);
  // left wall with door hole
  box(0.12, 2.7, 2.32, wallMat, -2.06, 1.35, -1.46);
  box(0.12, 2.7, 2.02, wallMat, -2.06, 1.35, 1.61);
  box(0.12, 2.7 - D.door.h, 0.9, wallMat, -2.06, (2.7 + D.door.h) / 2, 0.15);
  box(0.12, 2.7, 5.24, wallMat, 2.06, 1.35, 0);                                        // right wall
  box(4.24, 2.7, 0.12, wallMat, 0, 1.35, 2.56);                                        // front wall (behind camera)
  // baseboards
  box(4.0, 0.1, 0.02, trimMat, 0, 0.05, -2.49); box(0.02, 0.1, 5.0, trimMat, 1.99, 0.05, 0);
  box(0.02, 0.1, 2.2, trimMat, -1.99, 0.05, -1.4); box(0.02, 0.1, 1.9, trimMat, -1.99, 0.05, 1.55);
  // door casing (room side)
  box(0.025, 2.14, 0.07, trimMat, -1.99, 1.07, -0.335); box(0.025, 2.14, 0.07, trimMat, -1.99, 1.07, 0.635); box(0.025, 0.08, 1.04, trimMat, -1.99, 2.09, 0.15);

  // ---------------------------------------------------------------- door (pivot at the hinge)
  const door = new THREE.Group(); door.position.set(-2.0, 0, -0.3); root.add(door);
  const doorMat = mat(0xe9e3d6, 0.55);
  box(0.045, 2.03, 0.88, doorMat, -0.025, 1.035, 0.45, door);
  for (const [y, h] of [[1.5, 0.75], [0.55, 0.85]]) for (const side of [1, -1]) box(0.008, h, 0.62, mat(0xdcd5c6, 0.55), -0.025 + side * 0.026, y, 0.45, door);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a25a, roughness: 0.3, metalness: 0.8 });
  mk(new THREE.SphereGeometry(0.032, 16, 12), brass, door, 0.03, 0.97, 0.8); mk(new THREE.SphereGeometry(0.032, 16, 12), brass, door, -0.08, 0.97, 0.8);
  // warm line of light under the closed door (fades out as it opens)
  const leakTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,190,110,1)'); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const leak = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.86), new THREE.MeshBasicMaterial({ map: leakTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  leak.rotation.x = -Math.PI / 2; leak.position.set(-1.84, 0.004, 0.15); root.add(leak);
  const setDoor = (theta) => { door.rotation.y = -theta; leak.material.opacity = 0.75 * (1 - clamp(theta / 0.25)); };

  // ---------------------------------------------------------------- window
  const cx = (W.x0 + W.x1) / 2, cy = (W.y0 + W.y1) / 2;
  rbox(W.x1 - W.x0 + 0.2, 0.05, 0.17, 0.012, trimMat, cx, W.y0 - 0.005, -2.43);                 // sill
  box(0.08, W.y1 - W.y0 + 0.16, 0.03, trimMat, W.x0 - 0.04, cy, -2.485); box(0.08, W.y1 - W.y0 + 0.16, 0.03, trimMat, W.x1 + 0.04, cy, -2.485);
  box(W.x1 - W.x0 + 0.16, 0.08, 0.03, trimMat, cx, W.y1 + 0.04, -2.485);
  box(0.035, W.y1 - W.y0, 0.04, trimMat, cx, cy, -2.56); box(W.x1 - W.x0, 0.035, 0.04, trimMat, cx, cy, -2.56);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W.x1 - W.x0, W.y1 - W.y0), new THREE.MeshStandardMaterial({ color: 0x9fb4d6, roughness: 0.05, transparent: true, opacity: 0.1, depthWrite: false }));
  glass.position.set(cx, cy, -2.58); root.add(glass);
  // curtains + rod
  const curtainMat = mat(opts.curtainColor ?? 0x5d7c86, 0.95, { side: THREE.DoubleSide });
  for (const x of [W.x0 - 0.2, W.x1 + 0.2]) {
    const geo = new THREE.PlaneGeometry(0.42, 1.5, 28, 1), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, 0.035 * Math.sin((p.getX(i) / 0.42) * Math.PI * 5));
    geo.computeVertexNormals();
    mk(geo, curtainMat, root, x, 1.47, -2.42);
  }
  const rod = mk(new THREE.CylinderGeometry(0.012, 0.012, 1.9, 8), woodDark, root, cx, 2.24, -2.42); rod.rotation.z = Math.PI / 2;
  // sky + weather behind the window
  const skies = makeSkyTextures();
  const skyMat = new THREE.MeshBasicMaterial({ map: skies.summer, toneMapped: false });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.4), skyMat); sky.position.set(cx, 1.6, -4.7); root.add(sky);
  const weather = makeWeather(root, { x0: 0.1, x1: 1.75, y0: 0.6, y1: 2.5, z0: -4.4, z1: -2.75 });
  let curSeason = 'summer';
  const setSeason = (s, t) => { if (s !== curSeason) { skyMat.map = skies[s]; skyMat.needsUpdate = true; curSeason = s; } weather.update(t, s); };

  // christmas lights around the window frame
  const xmas = new THREE.Group(); root.add(xmas);
  const xcols = [0xff4a4a, 0x4aff7a, 0xffc94a, 0x5aa8ff];
  const bulbMats = xcols.map((c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2), toneMapped: false }));
  const perim = [];
  for (let i = 0; i <= 10; i++) perim.push([W.x0 - 0.06 + (i / 10) * (W.x1 - W.x0 + 0.12), W.y1 + 0.1]);
  for (let i = 1; i <= 8; i++) { perim.push([W.x0 - 0.1, W.y1 + 0.1 - i * 0.13]); perim.push([W.x1 + 0.1, W.y1 + 0.1 - i * 0.13]); }
  perim.forEach(([x, y], i) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), bulbMats[i % 4]); b.position.set(x, y + Math.sin(i * 1.7) * 0.012, -2.47); xmas.add(b); });
  xmas.visible = false;

  // ---------------------------------------------------------------- hallway (self-lit)
  const hallWall = new THREE.MeshStandardMaterial({ color: 0xa88a6a, emissive: 0xffa95c, emissiveIntensity: 0.2, roughness: 0.95 });
  const hallFloor = mk(new THREE.PlaneGeometry(1.6, 2.8), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.6, emissive: 0x5a3416, emissiveIntensity: 0.35 }), root, -2.9, 0.001, 0.2);
  hallFloor.rotation.x = -Math.PI / 2;
  box(0.1, 2.7, 2.9, hallWall, -3.75, 1.35, 0.2); box(1.7, 2.7, 0.1, hallWall, -2.9, 1.35, -1.25); box(1.7, 2.7, 0.1, hallWall, -2.9, 1.35, 1.65);
  box(1.7, 0.1, 2.9, hallWall, -2.9, 2.75, 0.2);
  const frame = rbox(0.04, 0.5, 0.4, 0.01, woodDark, -3.68, 1.55, -0.45);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.43), new THREE.MeshStandardMaterial({ map: artTexture('family'), emissive: 0xffffff, emissiveMap: artTexture('family'), emissiveIntensity: 0.25 }));
  photo.rotation.y = Math.PI / 2; photo.position.set(-3.655, 1.55, -0.45); root.add(photo);
  const fixture = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d0).multiplyScalar(3), toneMapped: false }));
  fixture.position.set(-2.9, 2.7, 0.15); root.add(fixture);
  frame.castShadow = false;

  // ---------------------------------------------------------------- furniture
  const B = D.bed, bed = new THREE.Group(); root.add(bed);
  rbox(B.w + 0.08, 0.18, B.z1 - B.z0 + 0.06, 0.03, woodMat, B.cx, 0.28, (B.z0 + B.z1) / 2, bed);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.06, 0.2, 0.06, woodDark, B.cx + x * (B.w / 2 - 0.02), 0.1, (B.z0 + B.z1) / 2 + z * ((B.z1 - B.z0) / 2 - 0.02), bed);
  rbox(B.w, 0.21, B.z1 - B.z0, 0.05, mat(0xf1ede5, 0.9), B.cx, 0.475, (B.z0 + B.z1) / 2, bed);
  rbox(B.w + 0.14, 0.95, 0.07, 0.03, woodMat, B.cx, 0.62, -2.465, bed);
  rbox(B.w + 0.14, 0.52, 0.06, 0.03, woodMat, B.cx, 0.31, B.z1 + 0.02, bed);
  const pillow = rbox(0.62, 0.12, 0.36, 0.055, mat(0xf7f4ee, 0.95), B.cx, B.top + 0.06, -2.2, bed);

  const C = D.crib, crib = new THREE.Group(); root.add(crib);
  const cribMat = mat(0xf2ede4, 0.55);
  const cz = (C.z0 + C.z1) / 2, cl = C.z1 - C.z0;
  rbox(C.w, 0.12, cl, 0.04, mat(0xf4f1ea, 0.9), C.cx, C.top - 0.06, cz, crib);
  rbox(C.w + 0.08, 0.04, cl + 0.08, 0.015, cribMat, C.cx, C.top - 0.14, cz, crib);
  for (const sx of [-1, 1]) {
    rbox(0.05, 0.04, cl + 0.1, 0.015, cribMat, C.cx + sx * (C.w / 2 + 0.03), 0.95, cz, crib);
    for (let i = 0; i <= 12; i++) mk(new THREE.CylinderGeometry(0.011, 0.011, 0.42, 8), cribMat, crib, C.cx + sx * (C.w / 2 + 0.03), 0.74, C.z0 - 0.02 + (i / 12) * (cl + 0.04));
  }
  for (const sz of [-1, 1]) {
    rbox(C.w + 0.12, 0.05, 0.05, 0.015, cribMat, C.cx, sz < 0 ? 1.08 : 0.95, cz + sz * (cl / 2 + 0.04), crib);
    for (let i = 0; i <= 6; i++) mk(new THREE.CylinderGeometry(0.011, 0.011, sz < 0 ? 0.55 : 0.42, 8), cribMat, crib, C.cx - C.w / 2 + (i / 6) * C.w, sz < 0 ? 0.8 : 0.74, cz + sz * (cl / 2 + 0.04));
  }
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.05, C.top - 0.12, 0.05, cribMat, C.cx + x * (C.w / 2 + 0.03), (C.top - 0.12) / 2, cz + z * (cl / 2 + 0.04), crib);
  // mobile above the crib
  const mobile = new THREE.Group(); mobile.position.set(C.cx, 1.45, cz - 0.15); crib.add(mobile);
  mk(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 6), trimMat, crib, C.cx + C.w / 2 + 0.03, 1.2, cz - 0.15);
  const mobRing = new THREE.Group(); mobile.add(mobRing);
  mk(new THREE.TorusGeometry(0.16, 0.006, 6, 30), trimMat, mobRing).rotation.x = Math.PI / 2;
  ['#f2c14e', '#9cc5e8', '#f2a3a3', '#b5dba0', '#f2c14e'].forEach((c, i) => {
    const a = (i / 5) * Math.PI * 2, x = Math.cos(a) * 0.16, z = Math.sin(a) * 0.16;
    mk(new THREE.CylinderGeometry(0.002, 0.002, 0.14, 4), trimMat, mobRing, x, -0.07, z);
    const s = mk(new THREE.OctahedronGeometry(0.035, 0), mat(c, 0.6), mobRing, x, -0.16, z); s.scale.set(1, 1, 0.4);
  });

  const N = D.nightstand, ns = new THREE.Group(); root.add(ns);
  rbox(N.w, N.h, N.d, 0.02, woodMat, N.x, N.h / 2, N.z, ns);
  box(N.w - 0.06, 0.006, 0.01, woodDark, N.x, N.h * 0.55, N.z + N.d / 2 + 0.002, ns);
  mk(new THREE.SphereGeometry(0.014, 10, 8), brass, ns, N.x, N.h * 0.75, N.z + N.d / 2 + 0.01);
  // lamp
  const lampPos = new THREE.Vector3(N.x - 0.06, N.h, N.z - 0.06);
  mk(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 20), mat(0x6e8a7e, 0.5), ns, lampPos.x, N.h + 0.015, lampPos.z);
  mk(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), brass, ns, lampPos.x, N.h + 0.12, lampPos.z);
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf1e3c4, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffb562, emissiveIntensity: 0 });
  const shade = mk(new THREE.CylinderGeometry(0.075, 0.12, 0.15, 28, 1, true), shadeMat, ns, lampPos.x, N.h + 0.26, lampPos.z); shade.castShadow = false;

  // dresser on the right wall
  rbox(0.48, 0.9, 1.0, 0.02, woodMat, 1.73, 0.45, -0.95);
  for (let i = 0; i < 3; i++) { box(0.008, 0.24, 0.92, woodDark, 1.488, 0.18 + i * 0.27, -0.95); mk(new THREE.SphereGeometry(0.016, 10, 8), brass, root, 1.48, 0.2 + i * 0.27, -0.95); }
  // rug
  const rug = mk(new THREE.CircleGeometry(0.75, 48), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }), root, -0.95, 0.004, -0.75);
  rug.rotation.x = -Math.PI / 2; rug.scale.set(1, 1.45, 1); rug.castShadow = false;
  // framed picture on the left wall
  rbox(0.03, 0.48, 0.38, 0.01, woodDark, -1.985, 1.62, -1.55);
  const fam = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.4), new THREE.MeshStandardMaterial({ map: artTexture('family'), roughness: 0.8 })); fam.rotation.y = Math.PI / 2; fam.position.set(-1.968, 1.62, -1.55); root.add(fam);

  // ---------------------------------------------------------------- era decor (above the headboard)
  const decor = { baby: new THREE.Group(), kid: new THREE.Group(), teen: new THREE.Group(), empty: new THREE.Group() };
  Object.values(decor).forEach((g) => root.add(g));
  const wallArt = (group, kind, x, y, w, h, rot = 0, framed = true) => {
    if (framed) { const f = rbox(w + 0.05, h + 0.05, 0.025, 0.008, woodDark, x, y, -2.488, group); f.rotation.z = rot; }
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: artTexture(kind), roughness: 0.85 }));
    p.position.set(x, y, framed ? -2.474 : -2.497); p.rotation.z = rot; group.add(p); return p;
  };
  wallArt(decor.baby, 'moon', -0.3, 1.62, 0.34, 0.42);
  wallArt(decor.kid, 'crayon', -0.62, 1.55, 0.26, 0.32, 0.08, false); wallArt(decor.kid, 'crayon', -0.25, 1.68, 0.26, 0.32, -0.06, false); wallArt(decor.kid, 'crayon', 0.08, 1.5, 0.26, 0.32, 0.05, false);
  wallArt(decor.teen, 'poster1', -0.58, 1.62, 0.42, 0.56, 0, false); wallArt(decor.teen, 'poster2', 0.0, 1.66, 0.4, 0.52, 0.03, false);
  for (const [x, y, w, h] of [[-0.58, 1.62, 0.42, 0.56], [0.0, 1.66, 0.4, 0.52]]) {
    const ghost = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(0xe6d9c2, 0.95)); ghost.position.set(x, y, -2.498); decor.empty.add(ghost);
    mk(new THREE.SphereGeometry(0.006, 6, 4), brass, decor.empty, x, y + h / 2 - 0.02, -2.495);
  }
  [[1.15, 0, -0.1, 0.25], [1.5, 0, 0.25, -0.35], [1.17, 0.36, -0.08, 0.1]].forEach(([x, y, z, r]) => { const b = makeMovingBox(); b.position.set(x, y, z); b.rotation.y = r; decor.empty.add(b); });
  // nightlight (baby + kid eras)
  const nlMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(1.6), toneMapped: false });
  const nightlightMesh = new THREE.Mesh(new THREE.CircleGeometry(0.035, 5), nlMat); nightlightMesh.rotation.y = Math.PI / 2; nightlightMesh.position.set(-1.985, 0.32, -0.95); root.add(nightlightMesh);

  // ---------------------------------------------------------------- lights
  const hemi = new THREE.HemisphereLight(0x8193c4, 0x3a3029, opts.ambient ?? 0.85); root.add(hemi);
  const moon = new THREE.DirectionalLight(0xa9bfe8, opts.moon ?? 1.6);
  moon.position.set(3.2, 4.6, -7.4); moon.target.position.set(0.3, 0.3, -1.2); root.add(moon, moon.target);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 2, far: 18 });
  moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.02;
  const spot = new THREE.SpotLight(0xffc27a, opts.spot ?? 46, 0, 0.75, 0.3, 2);
  // high in the hallway on the +z side -> the wedge crosses the room diagonally onto the bed
  spot.position.set(-3.0, 2.3, 1.2); spot.target.position.set(-0.3, 0.3, -1.6); root.add(spot, spot.target);
  spot.castShadow = !new URLSearchParams(location.search).has('noshadow'); spot.shadow.mapSize.set(2048, 2048); spot.shadow.camera.near = 0.3; spot.shadow.camera.far = 9;
  spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.015;
  const spill = new THREE.PointLight(0xffb873, 0, 4.5, 2); spill.position.set(-1.5, 1.1, -0.4); root.add(spill); // fake bounce from the wedge
  const lamp = new THREE.PointLight(0xffb060, 0, 5, 2); lamp.position.set(lampPos.x, N.h + 0.25, lampPos.z); root.add(lamp);
  const nightlight = new THREE.PointLight(0xffc98a, 0, 1.6, 2); nightlight.position.set(-1.92, 0.33, -0.95); root.add(nightlight);
  const xmasGlow = new THREE.PointLight(0xffd0b0, 0, 2.6, 2); xmasGlow.position.set(cx, 1.9, -2.3); root.add(xmasGlow);

  const setLamp = (v) => { lamp.intensity = 2.4 * v; shadeMat.emissiveIntensity = 1.2 * v; };
  const setNightlight = (v) => { nightlight.intensity = 0.35 * v; nightlightMesh.visible = v > 0; };
  const setXmas = (v, t = 0) => {
    xmas.visible = v > 0; xmasGlow.intensity = 0.55 * v;
    bulbMats.forEach((m, i) => m.color.setHex(xcols[i]).multiplyScalar(1.6 + 0.8 * Math.sin(t * 2 + i * 1.6)));
  };

  // ---------------------------------------------------------------- dust motes drifting in the door beam
  const DN = 260, dR = rng(33), dSeeds = Array.from({ length: DN }, () => [dR(), dR(), dR(), dR()]);
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DN * 3), 3));
  const dotC = document.createElement('canvas'); dotC.width = dotC.height = 32; const dg = dotC.getContext('2d'); const drg = dg.createRadialGradient(16, 16, 0, 16, 16, 16); drg.addColorStop(0, '#fff'); drg.addColorStop(1, 'rgba(255,255,255,0)'); dg.fillStyle = drg; dg.fillRect(0, 0, 32, 32);
  const dMat = new THREE.PointsMaterial({ size: 0.014, map: new THREE.CanvasTexture(dotC), color: 0xffd9a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dGeo, dMat); dust.frustumCulled = false; root.add(dust);
  function updateDust(t, theta) {
    const a = dGeo.attributes.position, sx = spot.position.x, sz = spot.position.z;
    const hx = -2, hz = -0.3, fx = -2 - 0.88 * Math.sin(theta), fz = -0.3 + 0.88 * Math.cos(theta); // hinge + free edge (leaf swings into the hallway)
    for (let i = 0; i < DN; i++) {
      const [u, v, w, k] = dSeeds[i];
      let x = -1.95 + u * 1.5 + Math.sin(t * 0.13 + i) * 0.05, y = 0.15 + ((v * 1.9 + t * 0.012 * (k - 0.5)) % 1.9 + 1.9) % 1.9, z = -1.7 + w * 2.0 + Math.cos(t * 0.11 + i * 1.3) * 0.05;
      // inside the beam? ray spot->p must cross the door plane inside the opening and not hit the door leaf
      const tt = (-2 - sx) / (x - sx), zc = sz + (z - sz) * tt, yc = spot.position.y + (y - spot.position.y) * tt;
      let inside = zc > -0.3 && zc < 0.6 && yc < 2.05 && yc > 0;
      if (inside) { // 2D segment intersection with the door leaf (hinge (-2,0.6) -> free edge)
        const d1x = x - sx, d1z = z - sz, d2x = fx - hx, d2z = fz - hz, den = d1x * d2z - d1z * d2x;
        if (Math.abs(den) > 1e-6) { const s = ((hx - sx) * d2z - (hz - sz) * d2x) / den, r = ((hx - sx) * d1z - (hz - sz) * d1x) / den; if (s > 0 && s < 1 && r > 0 && r < 1) inside = false; }
      }
      a.setXYZ(i, x, inside ? y : -50, z);
    }
    a.needsUpdate = true;
    dMat.opacity = 0.55 * clamp(theta / 0.6);
  }

  // shadows: everything casts + receives except self-lit / transparent stuff
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; o.receiveShadow = false; } });
  glass.castShadow = false;

  return {
    root, D, door, setDoor, bed, pillow, crib, mobile: mobRing, nightstand: ns, decor,
    lights: { hemi, moon, spot, spill, lamp, nightlight, xmasGlow },
    setLamp, setNightlight, setXmas, setSeason, updateDust,
  };
}
