// SET: a sunny used-car lot — asphalt with painted stalls, two rows of cars (windshield price stickers, balloons on the
// mirrors), strings of fluttering pennants between light poles, a giant "HONEST BOB'S" sign, a little sales-office trailer,
// a waving inflatable tube man, a road + grass verge, palm-ish trees, a hazy town on the horizon, sky dome + fog.
// Built for video 015; reusable for any car / sales / parking-lot beat.
//
// Coordinates (meters, y up): lot x∈[-14,14], z∈[-14,6]; the street runs along z≈9 (x). Front row of cars at z=DIMS.row1
// (noses +z), back row at DIMS.row2. The hero car is cars[DIMS.hero] (front row, x=0). Salesman/customer spots: DIMS.sales /
// DIMS.buyer. Tube man at DIMS.tube. Camera usually at z≈+4…+6 looking −z. Set camera.far ≥ 320 (sky dome r=260).
// Handles: cars[i] = { car (makeCar handle), sticker }, tube (update with update(t)), update(t) (pennants + tube man),
// aimSun(cx, cz, half), fog.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';
import { makeCar } from '@engine/sets/city.js';

export const DIMS = { row1: -1.6, row2: -8.0, hero: 2, sales: [-1.35, 1.3], buyer: [1.25, 1.55], tube: [3.9, 1.2], office: [-7.5, -4.5] };

export function buildCarLot(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 31);
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);
  const fog = new THREE.Fog(0xe9eef2, 60, 240);
  // sky + ground
  const sky = new THREE.Mesh(new THREE.SphereGeometry(260, 32, 16), new THREE.MeshBasicMaterial({ fog: false, side: THREE.BackSide, toneMapped: false, map: canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4f93dc'); gr.addColorStop(0.44, '#a9d2f2'); gr.addColorStop(0.5, '#eef0ea'); gr.addColorStop(1, '#eef0ea'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) })); root.add(sky);
  const grass = mk(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ roughness: 0.95, map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7aa64e'; g.fillRect(0, 0, w, h); const r = rng(2); for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(40,80,20,.18)' : 'rgba(190,230,120,.16)'; g.fillRect(r() * w, r() * h, 2, 4); } }, [120, 120]) }), root, 0, -0.01, 0); grass.rotation.x = -Math.PI / 2; grass.castShadow = false;
  const asph = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6a6c70'; g.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.04 + r() * 0.06})`; g.fillRect(r() * w, r() * h, 2, 2); } }, [8, 6]);
  const lot = mk(new THREE.PlaneGeometry(30, 22), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.9 }), root, 0, 0.005, -4); lot.rotation.x = -Math.PI / 2; lot.castShadow = false;
  const lineM = mat(0xf4f1ea, 0.8);
  for (const zr of [DIMS.row1, DIMS.row2]) for (let k = -6; k <= 6; k++) { const l = box(0.08, 0.01, 4.4, lineM, k * 2.6 + 1.3, 0.011, zr); l.castShadow = false; }
  const road = mk(new THREE.PlaneGeometry(500, 6), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.9, color: 0xbfbfbf }), root, 0, 0.004, 10); road.rotation.x = -Math.PI / 2; road.castShadow = false;
  for (let x = -60; x < 60; x += 4) { const d = box(1.8, 0.01, 0.14, mat(0xf2c14e, 0.7), x, 0.009, 10); d.castShadow = false; }
  box(30, 0.14, 0.3, mat(0xcfcac0, 0.8), 0, 0.07, 6.9);
  // cars: two rows, noses toward the camera (+z); price stickers on the windshields, balloons tied to a few mirrors
  const COLORS = [0xd2483f, 0x3d7bd9, 0xf1c24a, 0xf4f4f2, 0x58b368, 0x2a2a2e, 0xe08a3a, 0x8f6fb8, 0x4fb3a8, 0xc9c4be];
  const PRICES = ['$4,999', '$7,450', '$2,999', '$9,995', '$5,500', '$3,250', '$6,999', '$8,400', '$1,999', '$4,250'];
  const stickerTex = (txt) => canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#ffe44a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d2283f'; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#d2283f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 30px Helvetica, Arial, sans-serif'; g.fillText('ONLY', w / 2, 40); g.font = 'bold 62px Helvetica, Arial, sans-serif'; g.fillText(txt, w / 2, 102); });
  const balloonC = [0xd2483f, 0xf2b632, 0x3d7bd9, 0xe58fa6];
  const cars = [];
  [[DIMS.row1, 5], [DIMS.row2, 5]].forEach(([zr, n], row) => {
    for (let k = 0; k < n; k++) {
      const i = cars.length, x = (k - 2) * 2.6, car = makeCar(COLORS[(i * 3 + row) % COLORS.length], 40 + i);
      car.g.position.set(x, 0, zr); car.g.rotation.y = row ? Math.PI : 0; root.add(car.g);
      const st = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), new THREE.MeshBasicMaterial({ map: stickerTex(PRICES[i % PRICES.length]), toneMapped: false }));
      st.position.set(0.22, 1.2, 0.71); st.rotation.x = -0.55; car.body.add(st);
      if ((i + row) % 2 === 0) for (let b = 0; b < 3; b++) { // balloons on strings tied to the mirror
        const s = b ? -1 : 1, bx = 0.95 + 0.12 * b, by = 1.9 + 0.25 * b, bz = 0.35 + 0.1 * s;
        mk(new THREE.SphereGeometry(0.17, 14, 10), mat(balloonC[(i + b) % 4], 0.35), car.body, bx, by, bz).scale.y = 1.18;
        const str = mk(new THREE.CylinderGeometry(0.004, 0.004, by - 1.0, 4), mat(0xf4f4f4, 0.6), car.body, (0.9 + bx) / 2, (by + 1.0) / 2 - 0.1, (0.6 + bz) / 2); str.rotation.z = (bx - 0.9) / (by - 1.0);
      }
      cars.push({ car, sticker: st, x, z: zr });
    }
  });
  // light poles with strings of pennants (each pennant flutters in update)
  const poleM = mat(0xb8bcc2, 0.4, { metalness: 0.5 });
  const POLES = [[-7.6, 1.6], [-2.6, 2.3], [2.6, 2.3], [7.6, 1.6], [-7.6, -5.0], [7.6, -5.0]];
  POLES.forEach(([x, z]) => { mk(new THREE.CylinderGeometry(0.07, 0.09, 6.0, 10), poleM, root, x, 3.0, z); box(0.9, 0.12, 0.35, mat(0x4a4f57, 0.5), x, 6.0, z); });
  const PCOL = [0xd2483f, 0xf2b632, 0x3d7bd9, 0xf4f4f2, 0x58b368];
  const pennants = [];
  const string = (a, b, n, sag) => { for (let i = 0; i <= n; i++) { const u = i / n, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u, y = 5.6 - sag * Math.sin(Math.PI * u); const pv = new THREE.Group(); pv.position.set(x, y, z); pv.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2; root.add(pv); const tri = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.16, 0, 0), new THREE.Vector3(0.16, 0, 0), new THREE.Vector3(0, -0.42, 0)]), mat(PCOL[(i + pennants.length) % 5], 0.7, { side: THREE.DoubleSide })); tri.geometry.computeVertexNormals(); pv.add(tri); pennants.push(pv); } };
  string(POLES[0], POLES[1], 12, 0.9); string(POLES[1], POLES[2], 13, 0.9); string(POLES[2], POLES[3], 12, 0.9); string(POLES[0], POLES[4], 16, 1.1); string(POLES[3], POLES[5], 16, 1.1); string(POLES[1], [-1.3, -8], 20, 1.2); string(POLES[2], [1.3, -8], 20, 1.2);
  // big sign: HONEST BOB'S USED CARS (on two posts, behind the back row)
  const signT = canvasTex(1024, 384, (g, w, h) => { g.fillStyle = '#1d3a7a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2c14e'; g.lineWidth = 18; g.strokeRect(14, 14, w - 28, h - 28); g.fillStyle = '#f2c14e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 120px Helvetica, Arial, sans-serif'; g.fillText("HONEST BOB'S", w / 2, 140); g.fillStyle = '#ffffff'; g.font = 'bold 84px Helvetica, Arial, sans-serif'; g.fillText('USED CARS', w / 2, 270); for (const x of [90, w - 90]) { g.fillStyle = '#d2483f'; star(g, x, 140, 46); } });
  const sign = new THREE.Group(); sign.position.set(-3.5, 0, -12.5); root.add(sign);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.14, 0.16, 7, 10), poleM, sign, s * 3.2, 3.5, 0);
  rbox(7.6, 2.9, 0.3, 0.05, mat(0x1d3a7a, 0.5), 0, 6.1, 0, sign); const face = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 2.75), new THREE.MeshStandardMaterial({ map: signT, roughness: 0.6, emissive: 0xffffff, emissiveMap: signT, emissiveIntensity: 0.25 })); face.position.set(0, 6.1, 0.16); sign.add(face);
  // sales office trailer + "SALE" banner + a bench + flags
  const off = new THREE.Group(); off.position.set(DIMS.office[0], 0, DIMS.office[1]); off.rotation.y = 0.5; root.add(off);
  rbox(4.4, 2.6, 2.6, 0.06, mat(0xf4f1ea, 0.7), 0, 1.5, 0, off); box(4.6, 0.12, 2.8, mat(0x3a4a5a, 0.6), 0, 2.86, 0, off); box(4.4, 0.25, 2.6, mat(0x5a5f66, 0.7), 0, 0.12, 0, off);
  for (const x of [-1.3, 0.9]) { box(0.9, 0.7, 0.04, mat(0x8fbfe6, 0.1), x, 1.75, 1.31, off); }
  box(0.8, 1.9, 0.05, mat(0x3a4a7a, 0.5), -0.25, 1.2, 1.31, off);
  const saleT = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#d2283f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 80px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MEGA SALE!', w / 2, h / 2 + 4); });
  const sale = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.8), new THREE.MeshStandardMaterial({ map: saleT, roughness: 0.7, side: THREE.DoubleSide })); sale.position.set(0, 2.45, 1.33); off.add(sale);
  // waving inflatable tube man: a stack of tube segments + two arm tubes; update() flails them
  const tube = new THREE.Group(); tube.position.set(DIMS.tube[0], 0, DIMS.tube[1]); root.add(tube);
  mk(new THREE.CylinderGeometry(0.42, 0.48, 0.5, 18), mat(0x2a2a2e, 0.6), tube, 0, 0.25, 0);
  const tubeM = mat(0xf2433f, 0.45), tubeM2 = mat(0xf2c14e, 0.45);
  const segs = []; let par = tube;
  for (let i = 0; i < 7; i++) { const s = new THREE.Group(); s.position.y = i ? 0.42 : 0.5; par.add(s); mk(new THREE.CylinderGeometry(0.2, 0.21, 0.44, 14), i % 3 === 2 ? tubeM2 : tubeM, s, 0, 0.21, 0); segs.push(s); par = s; }
  const tHead = mk(new THREE.SphereGeometry(0.22, 14, 10), tubeM, par, 0, 0.55, 0);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.035, 8, 6), mat(0xffffff, 0.4), tHead, s * 0.08, 0.04, 0.19); mk(new THREE.SphereGeometry(0.018, 8, 6), mat(0x111111, 0.4), tHead, s * 0.08, 0.04, 0.22); }
  mk(new THREE.TorusGeometry(0.07, 0.015, 6, 14, Math.PI), mat(0x111111, 0.4), tHead, 0, -0.05, 0.2).rotation.z = Math.PI;
  for (let k = 0; k < 6; k++) mk(new THREE.ConeGeometry(0.06, 0.28, 6), tubeM2, tHead, (k - 2.5) * 0.07, 0.25, 0).rotation.z = (k - 2.5) * 0.25;
  const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(s * 0.18, 0.3, 0); segs[4].add(a); const parts = []; let p = a; for (let k = 0; k < 3; k++) { const q = new THREE.Group(); q.position.x = k ? s * 0.32 : 0; p.add(q); const m = mk(new THREE.CylinderGeometry(0.09, 0.09, 0.34, 10), tubeM, q, s * 0.16, 0, 0); m.rotation.z = Math.PI / 2; parts.push(q); p = q; } return { a, parts, s }; });
  // trees, far houses, a fire hydrant, cones
  const tree = (x, z, s) => { const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); root.add(t); mk(new THREE.CylinderGeometry(0.16, 0.24, 3, 8), mat(0x6b4a33, 0.9), t, 0, 1.5, 0); for (let k = 0; k < 4; k++) mk(new THREE.IcosahedronGeometry(1.2 - k * 0.14, 1), mat(k % 2 ? 0x5e9a46 : 0x4e8a3e, 0.85), t, (R() - 0.5) * 1.0, 3.2 + k * 0.45, (R() - 0.5) * 0.9); };
  [[-12, -11, 1.3], [11, -12, 1.5], [-13, 1, 1.1], [12.5, 0, 1.2], [6, -15, 1.4], [-9, -16, 1.2]].forEach(([x, z, s]) => tree(x, z, s));
  for (let k = 0; k < 9; k++) { const x = -40 + k * 10 + R() * 3, h = 4 + R() * 6; box(6 + R() * 3, h, 5, mat([0xe9c9a3, 0xa9c4c9, 0xd98f7a, 0xc9d6a8, 0xb8a6c9][k % 5], 0.9), x, h / 2, -38 - R() * 6); }
  for (const [x, z] of [[-4.6, 3.6], [4.8, 3.4]]) { const c = mk(new THREE.ConeGeometry(0.16, 0.5, 12), mat(0xf08a2b, 0.6), root, x, 0.25, z); void c; }
  const hyd = new THREE.Group(); hyd.position.set(6.2, 0, 4.2); root.add(hyd); mk(new THREE.CylinderGeometry(0.12, 0.14, 0.6, 12), mat(0xd2283f, 0.5), hyd, 0, 0.3, 0); mk(new THREE.SphereGeometry(0.12, 12, 8), mat(0xd2283f, 0.5), hyd, 0, 0.62, 0);
  // lights
  const hemi = new THREE.HemisphereLight(0xd6e8ff, 0x7a7a6a, 1.3); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.8); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004;
  function aimSun(cx = 0, cz = 0, half = 10) {
    sun.target.position.set(cx, 0, cz); sun.position.set(cx + 7, 16, cz + 11);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 2, far: 60 }); sun.shadow.camera.updateProjectionMatrix();
  }
  aimSun(0, -2, 10);
  root.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial) o.castShadow = false; });
  function update(t) {
    pennants.forEach((p, i) => { p.children[0].rotation.x = 0.25 + 0.25 * Math.sin(t * 6 + i * 0.7); p.children[0].rotation.y = 0.2 * Math.sin(t * 4.3 + i); });
    segs.forEach((s, i) => { s.rotation.z = (0.18 + 0.03 * i) * Math.sin(t * 3.1 - i * 0.55) + 0.1 * Math.sin(t * 7.3 + i); s.rotation.x = 0.08 * Math.sin(t * 2.3 - i * 0.4); });
    arms.forEach(({ a, parts, s }) => { a.rotation.z = s * (0.6 + 0.7 * Math.sin(t * 5.2 + (s > 0 ? 1.4 : 0))); parts.forEach((q, k) => (q.rotation.z = s * 0.5 * Math.sin(t * 6.1 - k * 0.9 + s))); });
  }
  update(0);
  return { root, D: DIMS, fog, cars, tube, update, aimSun, lights: { hemi, sun } };
}
function star(g, x, y, r) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5 - Math.PI / 2, rr = k % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
