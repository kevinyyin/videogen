// SET: a hospital MRI suite — the big white scanner (rounded block with a glowing bore), the patient table that slides into
// it, a control-room window with monitors, yellow "MAGNET IS ALWAYS ON" warnings, a tiled floor, cabinets, a wheelchair,
// an IV stand, a supply cart, a plant, ceiling light panels and a doorway to the corridor. Built for video 018.
//
// Coordinates (meters, y up). Room x∈[-3.5,3.5], z∈[-4,3.5], ceiling 2.8. The scanner's bore axis runs along z: bore center
// DIMS.bore = [x, y, z] (front face at DIMS.boreFront z, facing +z), bore radius DIMS.boreR. The table runs from the bore
// toward +z (top at DIMS.tableY). Corridor door on the right wall (x = 3.5) at z = DIMS.doorZ. Control window on the left wall.
// Handles: table (group; slide it with .position.z), glow (bore light material), setGlow(k), lights.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = { room: { x0: -3.5, x1: 3.5, z0: -4, z1: 3.5, h: 2.8 }, bore: [0, 1.05, -2.2], boreFront: -1.35, boreR: 0.36, tableY: 0.78, doorZ: 0.9 };

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function buildMRI(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 3), Dm = DIMS.room;
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);

  // shell: pale tile floor, soft blue-green walls, a wood-look accent wall behind the scanner, ceiling with light panels
  const floorTex = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#e6ebec' : '#d6dfe2'; g.fillRect(x * 64, y * 64, 64, 64); } g.strokeStyle = 'rgba(120,140,150,.35)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, [5, 5]);
  const floor = mk(new THREE.PlaneGeometry(7, 7.5), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35 }), root, 0, 0, -0.25); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallM = mat(0xcfe3e0, 0.85), accent = new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c99a6a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(90,50,20,.18)'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h); }, [3, 1]) });
  box(7, Dm.h, 0.12, accent, 0, Dm.h / 2, Dm.z0 - 0.06);
  box(0.12, Dm.h, 7.5, wallM, Dm.x0 - 0.06, Dm.h / 2, -0.25);
  // right wall with a corridor doorway (opening 1.3 m wide)
  const dz = DIMS.doorZ;
  box(0.12, Dm.h, dz - 0.65 - Dm.z0, wallM, Dm.x1 + 0.06, Dm.h / 2, (Dm.z0 + dz - 0.65) / 2);
  box(0.12, Dm.h, Dm.z1 - (dz + 0.65), wallM, Dm.x1 + 0.06, Dm.h / 2, (dz + 0.65 + Dm.z1) / 2);
  box(0.12, Dm.h - 2.2, 1.3, wallM, Dm.x1 + 0.06, (Dm.h + 2.2) / 2, dz);
  // the corridor beyond the door (bright, a handrail, a far wall)
  box(0.1, Dm.h, 6, mat(0xf2efe6, 0.8), Dm.x1 + 2.2, Dm.h / 2, dz); const cf = mk(new THREE.PlaneGeometry(2.2, 6), mat(0xd6dfe2, 0.4), root, Dm.x1 + 1.1, 0.002, dz); cf.rotation.x = -Math.PI / 2;
  mk(new THREE.CylinderGeometry(0.025, 0.025, 6, 8), mat(0x9fb6c9, 0.4), root, Dm.x1 + 2.1, 0.95, dz).rotation.x = Math.PI / 2;
  box(7.2, 0.1, 7.7, mat(0xf4f4f0, 0.95), 0, Dm.h + 0.05, -0.25);
  const panelM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf4f8ff).multiplyScalar(1.5), toneMapped: false });
  for (const [x, z] of [[-1.6, -2.4], [1.6, -2.4], [-1.6, 0.4], [1.6, 0.4], [0, 2.2]]) box(1.0, 0.03, 1.0, panelM, x, Dm.h - 0.015, z).castShadow = false;
  // a starry ceiling tile over the table (kids' hospitals do this) — dressing
  const sky = mk(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6fb2e8'); gr.addColorStop(1, '#bfe2f6'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y, r] of [[60, 70, 30], [100, 60, 24], [170, 150, 34], [205, 140, 24], [80, 190, 20]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }), toneMapped: false }), root, 0, Dm.h - 0.01, -0.6);
  sky.rotation.x = Math.PI / 2;

  // the scanner: a rounded white block with a bore (extruded shape with a hole), a gray front ring, a soft blue bore light
  const [bx, by, bz] = DIMS.bore, DEPTH = 1.7;
  const shape = roundedRectShape(2.3, 2.1, 0.45), hole = new THREE.Path(); hole.absarc(0, 0, DIMS.boreR, 0, Math.PI * 2, true); shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 48 });
  const scanner = new THREE.Mesh(geo, mat(0xf6f6f2, 0.35)); scanner.position.set(bx, by, DIMS.boreFront - DEPTH - 0.06); root.add(scanner);
  scanner.castShadow = true; scanner.receiveShadow = true;
  const ring = mk(new THREE.TorusGeometry(DIMS.boreR + 0.16, 0.07, 12, 48), mat(0x9aa7b4, 0.4), root, bx, by, DIMS.boreFront + 0.02);
  const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fd6ff), side: THREE.BackSide, toneMapped: false });
  const tube = mk(new THREE.CylinderGeometry(DIMS.boreR - 0.005, DIMS.boreR - 0.005, DEPTH + 0.1, 40, 1, true), glowM, root, bx, by, DIMS.boreFront - DEPTH / 2); tube.rotation.x = Math.PI / 2; tube.castShadow = false;
  // logo band + a little control panel on the front
  const band = mk(new THREE.PlaneGeometry(1.2, 0.14), new THREE.MeshStandardMaterial({ map: canvasTex(384, 48, (g, w, h) => { g.fillStyle = '#2f6aa8'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 30px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MR 3.0 T', w / 2, h / 2 + 2); }), roughness: 0.5 }), root, bx, by + 0.86, DIMS.boreFront + 0.07);
  void band; void ring;
  for (const s of [-1, 1]) { rbox(0.16, 0.1, 0.03, 0.01, mat(0x3a4a5a, 0.4), bx + s * 0.75, by - 0.55, DIMS.boreFront + 0.07); }
  // patient table: a pedestal + a sliding cushioned top (group: slide .position.z toward the bore)
  const pedestal = rbox(0.6, DIMS.tableY - 0.1, 1.5, 0.08, mat(0xe9ecee, 0.4), bx, (DIMS.tableY - 0.1) / 2, DIMS.boreFront + 0.95);
  void pedestal;
  const table = new THREE.Group(); table.position.set(bx, DIMS.tableY, DIMS.boreFront + 1.0); root.add(table);
  rbox(0.56, 0.08, 2.0, 0.03, mat(0xd8dde2, 0.35), 0, 0, 0, table);
  rbox(0.5, 0.07, 1.9, 0.03, mat(0x4f9bd9, 0.7), 0, 0.07, 0, table);
  rbox(0.34, 0.08, 0.24, 0.04, mat(0xf4f4f0, 0.8), 0, 0.12, 0.75, table);   // pillow at the far (+z) end
  // control-room window on the left wall (bright monitors behind glass)
  const winX = Dm.x0 + 0.01;
  const cr = mk(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshBasicMaterial({ map: canvasTex(512, 240, (g, w, h) => { g.fillStyle = '#2a3440'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a4a5c'; g.fillRect(0, h * 0.62, w, h * 0.38); for (let i = 0; i < 3; i++) { g.fillStyle = '#111'; g.fillRect(40 + i * 160, 60, 130, 90); g.fillStyle = ['#7fd0ff', '#9be8c0', '#d8e6ff'][i]; g.fillRect(46 + i * 160, 66, 118, 78); g.fillStyle = 'rgba(20,40,60,.6)'; for (let k = 0; k < 4; k++) g.fillRect(56 + i * 160, 76 + k * 16, 60 + (k * 13) % 40, 6); } }), toneMapped: false }), root, winX, 1.45, 0.2);
  cr.rotation.y = Math.PI / 2;
  for (const [w, h, y, z] of [[0.08, 1.16, 1.45, -0.94], [0.08, 1.16, 1.45, 1.34], [0.08, 0.08, 2.0, 0.2], [0.08, 0.08, 0.9, 0.2]]) box(w, h, w === 0.08 && h === 0.08 ? 2.36 : 0.08, mat(0xdfe3e6, 0.4), winX + 0.02, y, z);
  // warning signs (yellow) on the back wall + by the door
  const warnTex = (a, b) => canvasTex(256, 320, (g, w, h) => { g.fillStyle = '#f2c14e'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, w, 64); g.fillStyle = '#f2c14e'; g.font = 'bold 40px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('WARNING', w / 2, 34); g.fillStyle = '#1b1b1b'; g.beginPath(); g.moveTo(w / 2, 90); g.lineTo(w / 2 + 50, 180); g.lineTo(w / 2 - 50, 180); g.closePath(); g.fill(); g.fillStyle = '#f2c14e'; g.font = 'bold 60px Helvetica, Arial, sans-serif'; g.fillText('!', w / 2, 150); g.fillStyle = '#1b1b1b'; g.font = 'bold 30px Helvetica, Arial, sans-serif'; g.fillText(a, w / 2, 226); g.fillText(b, w / 2, 268); });
  const w1 = mk(new THREE.PlaneGeometry(0.5, 0.62), new THREE.MeshStandardMaterial({ map: warnTex('MAGNET IS', 'ALWAYS ON'), roughness: 0.6 }), root, 1.75, 1.6, Dm.z0 + 0.01);
  const w2 = mk(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshStandardMaterial({ map: warnTex('NO METAL', 'BEYOND HERE'), roughness: 0.6 }), root, Dm.x1 - 0.01, 1.55, dz - 1.05); w2.rotation.y = -Math.PI / 2;
  void w1;
  // cabinets + a sink counter on the back-left, a supply cart, an IV stand, a wheelchair, a plant, a step stool
  const cab = mat(0xe9ecee, 0.5);
  for (let k = 0; k < 3; k++) rbox(0.6, 0.9, 0.55, 0.02, cab, -2.9 + k * 0.62, 0.45, Dm.z0 + 0.3);
  box(1.9, 0.04, 0.6, mat(0xb8c4cc, 0.3), -2.28, 0.92, Dm.z0 + 0.3);
  for (let k = 0; k < 3; k++) rbox(0.6, 0.6, 0.32, 0.02, cab, -2.9 + k * 0.62, 2.0, Dm.z0 + 0.17);
  for (let k = 0; k < 4; k++) mk(new THREE.BoxGeometry(0.14, 0.18, 0.1), mat([0x4f9bd9, 0xf2b632, 0xe58fa6, 0x6fa84f][k], 0.6), root, -2.9 + k * 0.32, 1.03, Dm.z0 + 0.32);
  const plant = new THREE.Group(); plant.position.set(2.9, 0, Dm.z0 + 0.45); root.add(plant);
  mk(new THREE.CylinderGeometry(0.2, 0.15, 0.4, 14), mat(0xf2efe8, 0.6), plant, 0, 0.2, 0);
  for (let k = 0; k < 9; k++) { const lf = mk(new THREE.SphereGeometry(0.2, 10, 8), mat(0x4f8a3f, 0.8), plant, Math.sin(k * 2.4) * 0.16, 0.6 + (k % 3) * 0.18, Math.cos(k * 2.4) * 0.16); lf.scale.set(0.5, 1.5, 0.3); }
  const steel = mat(0xc9ccd2, 0.3, { metalness: 0.7 });
  // IV stand (group) — flies later
  const iv = new THREE.Group(); iv.position.set(2.3, 0, -1.2); root.add(iv);
  mk(new THREE.CylinderGeometry(0.015, 0.015, 1.8, 8), steel, iv, 0, 0.95, 0);
  for (let k = 0; k < 5; k++) mk(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), steel, iv, Math.cos(k * 1.26) * 0.14, 0.05, Math.sin(k * 1.26) * 0.14).rotation.set(Math.sin(k * 1.26) * 1.45, 0, -Math.cos(k * 1.26) * 1.45);
  mk(new THREE.BoxGeometry(0.12, 0.2, 0.05), mat(0xdff0f8, 0.2, { transparent: true, opacity: 0.8 }), iv, 0.08, 1.7, 0);
  // supply cart (group)
  const cart = new THREE.Group(); cart.position.set(-2.5, 0, 1.6); cart.rotation.y = 0.3; root.add(cart);
  for (const y of [0.25, 0.6, 0.95]) rbox(0.6, 0.04, 0.45, 0.01, steel, 0, y, 0, cart);
  for (const [a, b] of [[-0.28, -0.2], [0.28, -0.2], [-0.28, 0.2], [0.28, 0.2]]) mk(new THREE.CylinderGeometry(0.012, 0.012, 0.95, 6), steel, cart, a, 0.5, b);
  for (let k = 0; k < 5; k++) mk(new THREE.BoxGeometry(0.1, 0.12, 0.08), mat([0x4f9bd9, 0xf2b632, 0xe58fa6, 0xffffff, 0x6fa84f][k], 0.6), cart, -0.2 + k * 0.1, 0.67, 0);
  // wheelchair (group)
  const chair = new THREE.Group(); chair.position.set(2.4, 0, 2.4); chair.rotation.y = -2.4; root.add(chair);
  rbox(0.46, 0.05, 0.44, 0.02, mat(0x2a3440, 0.6), 0, 0.5, 0, chair); rbox(0.46, 0.45, 0.04, 0.02, mat(0x2a3440, 0.6), 0, 0.78, -0.22, chair);
  for (const s of [-1, 1]) { const wh = mk(new THREE.TorusGeometry(0.28, 0.02, 8, 28), steel, chair, s * 0.28, 0.3, -0.05); wh.rotation.y = Math.PI / 2; mk(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), steel, chair, s * 0.24, 0.8, -0.24); }

  // lights: cool panels + a warm-ish fill so faces read; soft blue spill from the bore
  const hemi = new THREE.HemisphereLight(0xf4f8ff, 0x9aa4a8, 1.35); root.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(2, 6, 4); key.target.position.set(0, 0.8, -1); root.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 16 }); key.shadow.bias = -0.0005;
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [0, 1.6]]) { const p = new THREE.PointLight(0xf6f8ff, 4.5, 6, 1.6); p.position.set(x, Dm.h - 0.25, z); root.add(p); }
  const boreL = new THREE.PointLight(0x9fd6ff, 2.5, 3.5, 1.6); boreL.position.set(bx, by, DIMS.boreFront + 0.6); root.add(boreL);
  const setGlow = (k) => { glowM.color.setHex(0x9fd6ff).multiplyScalar(0.6 + 1.2 * k); boreL.intensity = 1.5 + 4 * k; };
  setGlow(0.3);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });
  void R;
  return { root, D: DIMS, table, iv, cart, chair, setGlow, lights: { hemi, key } };
}
