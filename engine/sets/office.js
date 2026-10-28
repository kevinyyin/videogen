// SET: a corner office for a job interview — floor-to-ceiling windows on a painted skyline, a desk (laptop, papers, pen cup, a
// "HUMAN RESOURCES" nameplate, a coffee cup), two chairs, a bookshelf, a motivational poster, a plant, a water cooler, a wall clock.
// Built for video 012. Coordinates: room x∈[-3,3], z∈[-2.6,2.6], ceiling 2.8; windows on z=-2.6. Desk at DIMS.desk (top 0.75).
// The interviewer sits behind the desk at DIMS.boss facing +z; the candidate sits across at DIMS.guest facing −z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = { desk: [0, -0.9], deskTop: 0.75, boss: [0, -1.55], guest: [0, -0.15], seat: 0.48 };

export function buildOffice(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 6);
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);

  const floorTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8a6a4a'; g.fillRect(0, 0, w, h); const r = rng(2); for (let y = 0; y < h; y += 32) { g.fillStyle = `hsl(28,${30 + r() * 10}%,${32 + r() * 8}%)`; g.fillRect(0, y, w, 30); } }, [4, 4]);
  const floor = mk(new THREE.PlaneGeometry(6, 5.2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5 }), root); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallM = mat(0xe9e4da, 0.9);
  box(0.12, 2.8, 5.2, wallM, -3.06, 1.4, 0); box(0.12, 2.8, 5.2, wallM, 3.06, 1.4, 0); box(6.2, 0.1, 5.4, mat(0xf4f2ee, 0.95), 0, 2.85, 0);
  // window wall: mullions over a painted skyline (emissive so it reads as daylight)
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(1024, 420, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#79b2e6'); gr.addColorStop(1, '#dbeaf3'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(4); for (let x = 0; x < w;) { const bw = 40 + r() * 70, bh = 100 + r() * 240; g.fillStyle = `hsl(${205 + r() * 20},${15 + r() * 15}%,${55 + r() * 20}%)`; g.fillRect(x, h - bh, bw, bh); g.fillStyle = 'rgba(255,255,255,.35)'; for (let y = h - bh + 8; y < h; y += 14) for (let xx = x + 5; xx < x + bw - 6; xx += 11) g.fillRect(xx, y, 6, 7); x += bw + 4; }
  }) }));
  sky.position.set(0, 1.6, -4.5); root.add(sky);
  for (let x = -3; x <= 3; x += 1.2) box(0.08, 2.8, 0.1, mat(0x3a3d42, 0.4), x, 1.4, -2.6); box(6.1, 0.12, 0.12, mat(0x3a3d42, 0.4), 0, 0.06, -2.6); box(6.1, 0.12, 0.12, mat(0x3a3d42, 0.4), 0, 2.78, -2.6);
  // desk
  const [dx, dz] = DIMS.desk, wood = mat(0x5a3a26, 0.45);
  rbox(1.9, 0.06, 0.9, 0.02, wood, dx, DIMS.deskTop - 0.03, dz); box(1.85, 0.7, 0.05, wood, dx, 0.36, dz + 0.42); for (const s of [-1, 1]) box(0.05, 0.72, 0.85, wood, dx + s * 0.92, 0.36, dz);
  const lap = new THREE.Group(); lap.position.set(dx - 0.35, DIMS.deskTop, dz - 0.05); lap.rotation.y = 0.25; root.add(lap);
  box(0.36, 0.015, 0.25, mat(0xb8bcc2, 0.3, { metalness: 0.5 }), 0, 0.008, 0, lap); const scr = box(0.36, 0.24, 0.012, mat(0xb8bcc2, 0.3, { metalness: 0.5 }), 0, 0.125, -0.12, lap); scr.rotation.x = -0.25;
  for (let i = 0; i < 4; i++) box(0.21, 0.004, 0.297, mat(0xffffff, 0.8), dx + 0.25 + i * 0.01, DIMS.deskTop + 0.002 + i * 0.003, dz + 0.05).rotation.y = (i - 1.5) * 0.08;
  mk(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 12), mat(0x2f4f73, 0.5), root, dx + 0.7, DIMS.deskTop + 0.05, dz - 0.2);
  for (let i = 0; i < 4; i++) mk(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4), mat([0xd2483f, 0x3d7bd9, 0x222222, 0xf2b632][i], 0.5), root, dx + 0.7 + (i - 1.5) * 0.012, DIMS.deskTop + 0.13, dz - 0.2);
  mk(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 12), mat(0xf4f1ea, 0.4), root, dx - 0.75, DIMS.deskTop + 0.045, dz + 0.15);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.08), new THREE.MeshStandardMaterial({ map: canvasTex(256, 48, (g, w, h) => { g.fillStyle = '#c9a25a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1d22'; g.font = 'bold 22px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HUMAN RESOURCES', w / 2, h / 2 + 1); }), roughness: 0.3, metalness: 0.4 }));
  plate.position.set(dx + 0.05, DIMS.deskTop + 0.045, dz + 0.36); plate.rotation.x = -0.35; root.add(plate);
  // chairs
  const chair = (x, z, ry, col) => { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; root.add(c); rbox(0.52, 0.08, 0.5, 0.03, mat(col, 0.7), 0, DIMS.seat - 0.04, 0, c); rbox(0.5, 0.6, 0.08, 0.03, mat(col, 0.7), 0, DIMS.seat + 0.33, -0.24, c); mk(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), mat(0x3a3d42, 0.4), c, 0, 0.22, 0); for (let k = 0; k < 5; k++) { const l = box(0.3, 0.03, 0.04, mat(0x3a3d42, 0.4), Math.cos(k * 1.256) * 0.15, 0.04, Math.sin(k * 1.256) * 0.15, c); l.rotation.y = -k * 1.256; } return c; };
  chair(DIMS.boss[0], DIMS.boss[1], 0, 0x1d1d22); chair(DIMS.guest[0], DIMS.guest[1], Math.PI, 0x2f4f73);
  // bookshelf + books, poster, plant, water cooler, clock, diploma
  const sh = new THREE.Group(); sh.position.set(-2.75, 0, -1.2); sh.rotation.y = Math.PI / 2; root.add(sh);
  box(1.4, 2.0, 0.35, wood, 0, 1.0, 0, sh); for (let lv = 0; lv < 4; lv++) { box(1.36, 0.03, 0.32, mat(0x6a4a32, 0.5), 0, 0.35 + lv * 0.45, 0.02, sh); for (let b = 0; b < 9; b++) { const bh = 0.24 + R() * 0.12; box(0.1, bh, 0.24, mat([0xd2483f, 0x3d7bd9, 0xf2b632, 0x58b368, 0x8f6fb8, 0xf4f1ea][Math.floor(R() * 6)], 0.7), -0.58 + b * 0.13, 0.37 + lv * 0.45 + bh / 2, 0.04, sh); } }
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), new THREE.MeshStandardMaterial({ map: canvasTex(300, 400, (g, w, h) => { g.fillStyle = '#1d2a38'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2b632'; g.beginPath(); g.moveTo(40, 300); g.lineTo(150, 110); g.lineTo(260, 300); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(118, 165); g.lineTo(150, 110); g.lineTo(182, 165); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 40px Georgia, serif'; g.textAlign = 'center'; g.fillText('TEAMWORK', w / 2, 360); }), roughness: 0.7 }));
  poster.position.set(3.0, 1.6, 0.3); poster.rotation.y = -Math.PI / 2; root.add(poster);
  const dip = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), new THREE.MeshStandardMaterial({ map: canvasTex(200, 150, (g, w, h) => { g.fillStyle = '#5a3a26'; g.fillRect(0, 0, w, h); g.fillStyle = '#fbf6e8'; g.fillRect(12, 12, w - 24, h - 24); g.fillStyle = '#333'; g.font = 'italic 18px Georgia, serif'; g.textAlign = 'center'; g.fillText('Certificate', w / 2, 60); g.fillRect(50, 90, 100, 3); }), roughness: 0.6 }));
  dip.position.set(3.0, 1.6, -1.4); dip.rotation.y = -Math.PI / 2; root.add(dip);
  const pl = new THREE.Group(); pl.position.set(2.5, 0, -2.1); root.add(pl); mk(new THREE.CylinderGeometry(0.22, 0.17, 0.4, 14), mat(0xf4f1ea, 0.5), pl, 0, 0.2, 0); for (let k = 0; k < 9; k++) { const lf = mk(new THREE.SphereGeometry(0.22, 10, 8), mat(0x3f7a3a, 0.8), pl, Math.sin(k * 2.4) * 0.18, 0.65 + (k % 3) * 0.2, Math.cos(k * 2.4) * 0.18); lf.scale.set(0.45, 1.6, 0.25); lf.rotation.z = Math.sin(k) * 0.6; }
  const cool = new THREE.Group(); cool.position.set(2.55, 0, 1.6); root.add(cool); box(0.35, 1.0, 0.35, mat(0xf4f1ea, 0.4), 0, 0.5, 0, cool); mk(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16), mat(0x8fc6ef, 0.05, { transparent: true, opacity: 0.6 }), cool, 0, 1.2, 0);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.18, 32), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 6; g.stroke(); g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 30); g.stroke(); g.beginPath(); g.moveTo(64, 64); g.lineTo(88, 72); g.stroke(); }), roughness: 0.5 }));
  clock.position.set(-3.0, 2.1, 0.8); clock.rotation.y = Math.PI / 2; root.add(clock);
  // lights: window daylight + ceiling panel + fill
  const hemi = new THREE.HemisphereLight(0xeaf3ff, 0x6a5a4a, 1.1); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.0); sun.position.set(1.5, 5, -8); sun.target.position.set(0, 0, 0); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  const ceil = new THREE.PointLight(0xfff6ea, 4, 7, 1.5); ceil.position.set(0, 2.6, 0.2); root.add(ceil);
  const fill = new THREE.PointLight(0xffeedd, 2.5, 7, 1.5); fill.position.set(1.5, 1.8, 2.3); root.add(fill);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });
  return { root, D: DIMS, lights: { hemi, sun } };
}
