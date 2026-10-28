// SET: a bright operating room (built for video 019) — teal tiled walls, an OR table with a patient-shaped blue drape, a big
// round surgical lamp on a ceiling arm (`lamp` pivot swings), a heart monitor whose ECG trace you draw per frame
// (`setECG(t, bpm, wild)`), an instrument tray on a Mayo stand (`tray` group), an anesthesia cart, IV pole, glass supply
// cabinets, an X-ray light box, an "OR 3" sign, a porthole door, a wall clock.
// Coordinates: room x∈[-3.2,3.2], z∈[-3,2.6], ceiling 3.0. The table runs along x at DIMS.table (top DIMS.tableTop), head at −x.
// Surgeons stand behind it (z ≈ −1.25, facing +z = the camera) or in front (z ≈ +0.0, backs to the camera).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = { room: { x0: -3.2, x1: 3.2, z0: -3, z1: 2.6, h: 3.0 }, table: [0, -0.65], tableTop: 0.92, tableLen: 2.0 };

export function buildSurgery(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 7), Dm = DIMS.room, W = Dm.x1 - Dm.x0, Dd = Dm.z1 - Dm.z0;
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);
  void R;

  const tileT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7fc3bd'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); } }, [4, 2]);
  const wallM = new THREE.MeshStandardMaterial({ map: tileT, roughness: 0.35 });
  const floorT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#b9c9c6'; g.fillRect(0, 0, w, h); const r = rng(4); for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '60,80,80'},.18)`; g.fillRect(r() * w, r() * h, 3, 3); } }, [4, 4]);
  const floor = mk(new THREE.PlaneGeometry(W, Dd), new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.4 }), root, 0, 0, (Dm.z0 + Dm.z1) / 2); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  box(0.14, Dm.h, Dd, wallM, Dm.x0 - 0.07, Dm.h / 2, (Dm.z0 + Dm.z1) / 2); box(0.14, Dm.h, Dd, wallM, Dm.x1 + 0.07, Dm.h / 2, (Dm.z0 + Dm.z1) / 2);
  box(W, Dm.h, 0.14, wallM, 0, Dm.h / 2, Dm.z0 - 0.07);
  box(W + 0.3, 0.1, Dd, mat(0xf2f5f4, 0.8), 0, Dm.h + 0.05, (Dm.z0 + Dm.z1) / 2);
  for (const x of [-1.6, 1.6]) for (const z of [-2.0, 0.6]) mk(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshBasicMaterial({ color: 0xf6fbff, toneMapped: false }), root, x, Dm.h - 0.005, z).rotation.x = Math.PI / 2;

  // ---- OR table (head at −x) + patient drape (a long blue bump with a head-end tent and two feet at +x)
  const [tx, tz] = DIMS.table, TT = DIMS.tableTop, TL = DIMS.tableLen;
  const steel = mat(0xc9ced4, 0.25, { metalness: 0.7 });
  box(0.5, TT - 0.12, 0.35, steel, tx, (TT - 0.12) / 2, tz); box(0.9, 0.08, 0.6, steel, tx, 0.04, tz);
  rbox(TL, 0.1, 0.58, 0.03, mat(0x2f3a44, 0.5), tx, TT - 0.06, tz);
  const drapeM = mat(0x3f86c9, 0.85);
  const body = mk(new THREE.CapsuleGeometry(0.2, TL - 0.7, 6, 16), drapeM, root, tx + 0.05, TT + 0.06, tz); body.rotation.z = Math.PI / 2; body.scale.set(1, 1, 1.3);
  box(TL + 0.04, 0.02, 0.8, drapeM, tx, TT + 0.0, tz);
  const feet = new THREE.Group(); feet.position.set(tx + TL / 2 - 0.12, TT + 0.12, tz); root.add(feet);   // rotate feet.children for a kick
  const footL = mk(new THREE.SphereGeometry(0.085, 12, 10), drapeM, feet, 0, 0.08, -0.1); footL.scale.set(0.8, 1.5, 0.9);
  const footR = mk(new THREE.SphereGeometry(0.085, 12, 10), drapeM, feet, 0, 0.08, 0.1); footR.scale.set(0.8, 1.5, 0.9);
  const tent = new THREE.Group(); tent.position.set(tx - TL / 2 + 0.55, TT, tz); root.add(tent);   // anesthesia screen at the head end
  for (const s of [-1, 1]) box(0.02, 0.55, 0.02, steel, 0, 0.27, s * 0.38, tent);
  box(0.02, 0.02, 0.8, steel, 0, 0.55, 0, tent);
  const scr = mk(new THREE.PlaneGeometry(0.8, 0.5), mat(0x3f86c9, 0.9, { side: THREE.DoubleSide }), tent, 0.01, 0.3, 0); scr.rotation.y = Math.PI / 2;
  const headPillow = rbox(0.3, 0.08, 0.36, 0.03, mat(0xf4f6f8, 0.8), tx - TL / 2 + 0.25, TT + 0.04, tz); void headPillow;

  // ---- surgical lamp: a ceiling mount + arm + a big round head (pivot `lamp` at the ceiling)
  const lamp = new THREE.Group(); lamp.position.set(tx + 0.1, Dm.h, tz + 0.15); root.add(lamp);
  mk(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), steel, lamp, 0, -0.04, 0);
  const arm1 = box(0.07, 0.95, 0.07, mat(0xe8ecef, 0.4), 0, -0.5, 0, lamp); void arm1;
  const head = new THREE.Group(); head.position.set(0, -1.0, 0); lamp.add(head);
  const lh = mk(new THREE.CylinderGeometry(0.42, 0.34, 0.14, 32), mat(0xeef1f3, 0.35), head, 0, 0, 0); void lh;
  for (let k = 0; k < 7; k++) { const a = (k / 6) * Math.PI * 2, r2 = k === 6 ? 0 : 0.22; mk(new THREE.CircleGeometry(0.085, 20), new THREE.MeshBasicMaterial({ color: 0xfffbf0, toneMapped: false }), head, Math.cos(a) * r2, -0.072, Math.sin(a) * r2).rotation.x = Math.PI / 2; }
  const lampLight = new THREE.SpotLight(0xfffaf0, 7, 6, 0.5, 0.6, 1.3); lampLight.position.set(0, -0.1, 0); head.add(lampLight);
  const lampTarget = new THREE.Object3D(); lampTarget.position.set(0, -2, 0); head.add(lampTarget); lampLight.target = lampTarget;
  lampLight.castShadow = true; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -0.0005;

  // ---- heart monitor on a wall arm (left of the table): screen = canvas you redraw with setECG
  const ecgCanvas = document.createElement('canvas'); ecgCanvas.width = 384; ecgCanvas.height = 256;
  const ecgTex = new THREE.CanvasTexture(ecgCanvas); ecgTex.colorSpace = THREE.SRGBColorSpace;
  const mon = new THREE.Group(); mon.position.set(-1.75, 1.55, -1.7); mon.rotation.y = 0.35; root.add(mon);
  rbox(0.7, 0.5, 0.08, 0.03, mat(0x2a2f35, 0.4), 0, 0, 0, mon);
  mk(new THREE.PlaneGeometry(0.62, 0.42), new THREE.MeshBasicMaterial({ map: ecgTex, toneMapped: false }), mon, 0, 0, 0.042);
  box(0.06, 0.06, 0.6, mat(0xe8ecef, 0.4), 0, 0, -0.32, mon);
  function setECG(t, bpm = 72, wild = 0) {
    const g = ecgCanvas.getContext('2d'), w = ecgCanvas.width, h = ecgCanvas.height;
    g.fillStyle = '#04120c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(60,255,140,.12)'; g.lineWidth = 1; for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const per = 60 / bpm, span = 3.2, x0 = 12, x1 = w - 120, base = h * 0.52;
    g.strokeStyle = '#4dff9a'; g.lineWidth = 4; g.shadowColor = '#4dff9a'; g.shadowBlur = 8; g.beginPath();
    for (let px = x0; px <= x1; px += 2) {
      const tt = t - span + ((px - x0) / (x1 - x0)) * span, ph = ((tt % per) + per) % per / per;
      let y = 0;
      if (ph < 0.08) y = -0.12 * Math.sin((ph / 0.08) * Math.PI);                   // P wave
      else if (ph < 0.12) y = 0.15 * ((ph - 0.08) / 0.04);                          // Q
      else if (ph < 0.16) y = 0.15 - 1.15 * ((ph - 0.12) / 0.04);                   // R spike
      else if (ph < 0.2) y = -1.0 + 1.0 * ((ph - 0.16) / 0.04);                     // S
      else if (ph > 0.32 && ph < 0.48) y = -0.22 * Math.sin(((ph - 0.32) / 0.16) * Math.PI);   // T
      y += wild * 0.25 * Math.sin(tt * 37) * (ph > 0.5 ? 1 : 0);                      // a little "dance" squiggle between beats
      const py = base + y * h * 0.32; if (px === x0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke(); g.shadowBlur = 0;
    g.fillStyle = '#4dff9a'; g.font = 'bold 64px Helvetica, Arial, sans-serif'; g.textAlign = 'right'; g.fillText(String(Math.round(bpm)), w - 12, 92);
    g.font = 'bold 22px Helvetica, Arial, sans-serif'; g.fillText('HR', w - 12, 30); g.fillStyle = '#7fd6ff'; g.fillText('SpO2 99', w - 12, 150); g.fillStyle = '#ffd66b'; g.fillText('BP 120/80', w - 12, 190);
    ecgTex.needsUpdate = true;
  }
  setECG(0);

  // ---- instrument tray on a Mayo stand (right of the table, in front) — `tray` group (instruments ride on it)
  const tray = new THREE.Group(); tray.position.set(tx + 1.25, 0, tz + 0.55); root.add(tray);
  box(0.04, 1.0, 0.04, steel, 0, 0.5, -0.18, tray); box(0.5, 0.03, 0.06, steel, 0, 0.02, -0.18, tray);
  const top = new THREE.Group(); top.position.y = 1.02; tray.add(top);
  rbox(0.6, 0.03, 0.4, 0.01, steel, 0, 0, 0, top); box(0.56, 0.005, 0.36, mat(0x3f86c9, 0.9), 0, 0.018, 0, top);
  for (let k = 0; k < 6; k++) { const ins = box(0.012, 0.006, 0.17, steel, -0.2 + k * 0.08, 0.025, 0, top); ins.rotation.y = (k % 2 ? 0.1 : -0.1); }
  mk(new THREE.CylinderGeometry(0.05, 0.04, 0.03, 14), steel, top, 0.18, 0.035, 0.1);
  // anesthesia cart (head end, behind) + IV pole + a supply cabinet wall + X-ray light box + OR 3 sign + porthole door + clock
  const an = new THREE.Group(); an.position.set(-2.1, 0, -1.0); root.add(an);
  rbox(0.7, 1.2, 0.6, 0.03, mat(0xe8ecef, 0.5), 0, 0.6, 0, an); for (let k = 0; k < 4; k++) box(0.6, 0.02, 0.01, mat(0x9aa4ad, 0.4), 0, 0.3 + k * 0.22, 0.305, an);
  const ivp = new THREE.Group(); ivp.position.set(-1.3, 0, 0.1); root.add(ivp);
  box(0.03, 2.0, 0.03, steel, 0, 1.0, 0, ivp); box(0.3, 0.02, 0.02, steel, 0, 1.95, 0, ivp);
  mk(new THREE.CapsuleGeometry(0.06, 0.14, 4, 10), new THREE.MeshStandardMaterial({ color: 0xdff2ff, roughness: 0.1, transparent: true, opacity: 0.75 }), ivp, 0.12, 1.78, 0);
  const cab = new THREE.Group(); cab.position.set(1.4, 0, Dm.z0 + 0.3); root.add(cab);
  for (const cx of [-0.55, 0.55]) { box(1.05, 2.1, 0.45, mat(0xdfe5e8, 0.4), cx, 1.05, 0, cab); mk(new THREE.PlaneGeometry(0.85, 1.2), new THREE.MeshStandardMaterial({ color: 0xbfe8f2, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 }), cab, cx, 1.35, 0.23); for (let s = 0; s < 3; s++) for (let k = 0; k < 6; k++) box(0.1, 0.13, 0.1, mat([0xf4f1ea, 0x7fb6d6, 0xf2b632, 0xe58fa6][(k + s) % 4], 0.6), cx - 0.3 + k * 0.12, 0.95 + s * 0.38, 0.05, cab); }
  const xr = mk(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(300, 200, (g, w, h) => { g.fillStyle = '#e8f4ff'; g.fillRect(0, 0, w, h); for (const x of [90, 210]) { g.fillStyle = '#1a2430'; g.beginPath(); g.ellipse(x, 100, 52, 78, 0, 0, 7); g.fill(); } g.strokeStyle = 'rgba(230,240,255,.7)'; g.lineWidth = 6; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(150, 40 + k * 26, 105, 14, 0, 0, Math.PI); g.stroke(); } g.fillStyle = 'rgba(230,240,255,.8)'; g.fillRect(143, 10, 14, 180); }) }), root, -1.0, 1.8, Dm.z0 + 0.01);
  void xr;
  const sign = mk(new THREE.PlaneGeometry(0.7, 0.28), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(256, 100, (g, w, h) => { g.fillStyle = '#d23a3f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 56px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OR 3', w / 2, h / 2 + 3); }) }), root, 0.1, 2.65, Dm.z0 + 0.01);
  void sign;
  const door = new THREE.Group(); door.position.set(Dm.x1 - 0.01, 0, -1.4); door.rotation.y = -Math.PI / 2; root.add(door);
  box(1.2, 2.2, 0.06, mat(0xdfe5e8, 0.4), 0, 1.1, 0, door); mk(new THREE.CircleGeometry(0.17, 24), new THREE.MeshBasicMaterial({ color: 0xbfe2f2, toneMapped: false }), door, 0, 1.5, 0.04);
  const clock = mk(new THREE.CircleGeometry(0.2, 32), new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(128, 128, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 6; g.stroke(); g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 24 * Math.sin(1.2), 64 - 24 * Math.cos(1.2)); g.stroke(); g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 42 * Math.sin(5.9), 64 - 42 * Math.cos(5.9)); g.stroke(); }) }), root, -2.4, 2.4, Dm.z0 + 0.01);
  void clock;

  // ---- light: bright cool room + the surgical spot
  const hemi = new THREE.HemisphereLight(0xf2fbff, 0x6a8a86, 1.45); root.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2, 6, 4); key.target.position.set(0, 0.8, -0.6); root.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  const fill = new THREE.PointLight(0xeaf6ff, 3, 8, 1.5); fill.position.set(0.5, 2.3, 1.8); root.add(fill);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });
  return { root, D: DIMS, lamp, lampHead: head, lampLight, tray, trayTop: top, feet, footL, footR, monitor: mon, setECG, ivp, lights: { hemi, key, fill } };
}
