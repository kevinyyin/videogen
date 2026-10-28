// SET: a round "war room" with a floating hologram Earth over a round table (world leaders stand around it),
// plus a small underground missile launch capsule placed far away in the same scene (cut between them).
// Built for videos/005-no-nukes; reusable for any world-scale "what if" (globe = engine/globe.js).
//
// WAR ROOM (origin): floor y=0, circular wall r=4.6, ceiling 3.3. Table r=1.25, top y=0.8.
//   Globe center (0, 1.62, 0), r=0.5. Leaders stand on a ring r≈1.62 around the table, facing the center.
//   Light: cool glow from the globe (setGlobeLight), warm pendant ring over the table, warm wall sconces.
// CAPSULE (offset CAP = [40, 0, 0]): room x∈[-1.6,1.6], z∈[-1.8,1.8] around CAP, ceiling 2.4 (vaulted).
//   Console along the back wall (z=-1.8) with rows of red indicator lights (setPanel(0..1) = lit fraction, sweeps
//   left→right), two seats at x=±0.45, z=-0.55 facing -z. Light: red/amber panel glow + a dim white work lamp.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng, clamp } from '@engine/core.js';
import { makeGlobe } from '@engine/globe.js';

export const DIMS = {
  globe: { y: 1.62, r: 0.5 },
  table: { r: 1.25, top: 0.8 },
  ring: 1.62,                       // leaders' standing radius
  CAP: [40, 0, 0],
  seats: [[-0.45, -0.55], [0.45, -0.55]], // capsule seats (relative to CAP)
};

function panelTex() {
  return canvasTex(512, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a2633'); gr.addColorStop(1, '#0f1720'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,170,220,.10)'; g.lineWidth = 3;
    for (let y = 60; y < h; y += 180) { g.strokeRect(30, y, w - 60, 150); }
    g.fillStyle = 'rgba(255,190,120,.35)'; g.fillRect(w / 2 - 3, 0, 6, h);
  });
}
function mapScreenTex(seed) { // wall screen: framed dark panel with a grid + a couple of line graphs (decor only)
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#081420'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,170,255,.16)'; g.lineWidth = 1;
    for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const R = rng(seed);
    for (const [col, base] of [['rgba(120,200,255,.75)', 0.45], ['rgba(255,190,120,.6)', 0.7]]) {
      g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); let y = h * base;
      for (let x = 16; x < w - 16; x += 24) { y = Math.min(h - 20, Math.max(20, y + (R() - 0.5) * 34)); (x === 16 ? g.moveTo : g.lineTo).call(g, x, y); }
      g.stroke();
    }
    g.strokeStyle = 'rgba(150,200,240,.5)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  });
}
function consoleTex(lit) { // capsule console face: grid of indicator lights (red when lit) + two small screens
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#4a4f45'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3c4038'; for (let x = 0; x < w; x += 256) g.fillRect(x + 4, 4, 248, h - 8);
    const R = rng(9);
    for (let row = 0; row < 7; row++) for (let col = 0; col < 26; col++) {
      const x = 24 + col * 38.5, y = 40 + row * 48;
      g.fillStyle = '#20231f'; g.fillRect(x - 2, y - 2, 26, 22);
      const on = lit && R() < 0.85;
      g.fillStyle = on ? (R() < 0.8 ? '#ff4630' : '#ffb341') : '#5a2a24'; g.fillRect(x, y, 22, 18);
    }
    for (const sx of [300, 620]) { g.fillStyle = '#0b0f0b'; g.fillRect(sx, 380, 120, 90); g.fillStyle = lit ? '#46ff9a' : '#0f1a12'; g.font = 'bold 40px monospace'; g.fillText(lit ? 'ARM' : '', sx + 22, 438); }
  });
}

export function buildWarRoom(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const D = DIMS;

  // ---------------------------------------------------------------- shell
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#1b2129'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,220,170,.10)'; g.lineWidth = 3;
    for (let r = 120; r < w / 2; r += 110) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, 7); g.stroke(); }
    for (let a = 0; a < 16; a++) { g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a * Math.PI / 8) * w, h / 2 + Math.sin(a * Math.PI / 8) * h); g.stroke(); }
  });
  const floor = mk(new THREE.CircleGeometry(4.7, 96), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.38, metalness: 0.1 }), root);
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallMat = new THREE.MeshStandardMaterial({ map: panelTex(), color: 0x8a9bb0, roughness: 0.8, side: THREE.BackSide });
  wallMat.map.wrapS = THREE.RepeatWrapping; wallMat.map.repeat.set(18, 1);
  const wall = mk(new THREE.CylinderGeometry(4.6, 4.6, 3.3, 96, 1, true), wallMat, root, 0, 1.65, 0); wall.castShadow = false;
  const ceil = mk(new THREE.CircleGeometry(4.7, 64), mat(0x141a22, 0.9), root, 0, 3.3, 0); ceil.rotation.x = Math.PI / 2;
  // wall screens (glowing world maps) + warm sconces between them
    const sconceMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc27a).multiplyScalar(0.75), toneMapped: false });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;                       // screens at 0, 45°, ... sconces halfway between (none right behind the globe)
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), new THREE.MeshBasicMaterial({ map: mapScreenTex(i + 1), color: 0x6a7684 }));
    scr.position.set(Math.sin(a) * 4.52, 1.95, Math.cos(a) * 4.52); scr.lookAt(0, 1.95, 0); root.add(scr);
    const b = a + Math.PI / 8, sc = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.22, 16), sconceMat);
    sc.position.set(Math.sin(b) * 4.5, 1.7, Math.cos(b) * 4.5); root.add(sc);
  }

  // ---------------------------------------------------------------- table
  const T = D.table;
  const woodMat = mat(0x3b2a20, 0.45);
  mk(new THREE.CylinderGeometry(T.r, T.r, 0.07, 96), woodMat, root, 0, T.top - 0.035, 0);
  mk(new THREE.CylinderGeometry(T.r * 0.55, T.r * 0.62, T.top - 0.07, 64), mat(0x22262c, 0.6), root, 0, (T.top - 0.07) / 2, 0);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb08a55, roughness: 0.3, metalness: 0.7 });
  const rim = mk(new THREE.TorusGeometry(T.r, 0.022, 10, 120), rimMat, root, 0, T.top, 0); rim.rotation.x = Math.PI / 2;
  // projector disc in the middle of the table (the globe "projects" from it)
  const projMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7cc4ff).multiplyScalar(0.3), toneMapped: false });
  const proj = mk(new THREE.CylinderGeometry(0.3, 0.34, 0.03, 48), projMat, root, 0, T.top + 0.012, 0); proj.castShadow = false;
  const beamTex = canvasTex(16, 256, (c, w, h) => { const gr = c.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.5, 48, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: 0x6fb6ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  beam.position.y = T.top + 0.26; root.add(beam);
  // papers + glasses on the table (scale cues)
  const R = rng(3);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3, rr = T.r - 0.3;
    const p = mk(new THREE.BoxGeometry(0.21, 0.004, 0.29), mat(0x9d978b, 0.95), root, Math.sin(a) * rr, T.top + 0.003, Math.cos(a) * rr); p.rotation.y = a + (R() - 0.5) * 0.5;
    const gl = mk(new THREE.CylinderGeometry(0.03, 0.026, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xcfe6ff, roughness: 0.05, transparent: true, opacity: 0.35 }), root, Math.sin(a + 0.2) * (rr + 0.12), T.top + 0.05, Math.cos(a + 0.2) * (rr + 0.12));
    gl.castShadow = false;
  }

  // ---------------------------------------------------------------- pendant ring (warm) over the table
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd7a0).multiplyScalar(0.9), toneMapped: false });
  const pend = mk(new THREE.TorusGeometry(1.5, 0.025, 10, 120), ringMat, root, 0, 3.0, 0); pend.rotation.x = Math.PI / 2; pend.castShadow = false;
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; mk(new THREE.CylinderGeometry(0.006, 0.006, 0.45, 6), mat(0x222222, 0.5), root, Math.sin(a) * 1.5, 3.15, Math.cos(a) * 1.5); }

  // ---------------------------------------------------------------- globe
  const globe = makeGlobe({ r: D.globe.r, tilt: 0.0, ...(opts.globe || {}) });
  globe.g.position.set(0, D.globe.y, 0); root.add(globe.g);

  // ---------------------------------------------------------------- lights
  const hemi = new THREE.HemisphereLight(0x7d93b8, 0x2a2420, opts.ambient ?? 0.55); root.add(hemi);
  const key = new THREE.SpotLight(0xffd2a0, opts.key ?? 45, 0, 0.95, 0.55, 2);
  key.position.set(0, 3.25, 0); key.target.position.set(0, 0, 0); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 4; root.add(key, key.target);
  const globeLight = new THREE.PointLight(0x7cbcff, 6, 6, 2); globeLight.position.set(0, D.globe.y, 0); root.add(globeLight);
  const redLight = new THREE.PointLight(0xff4a30, 0, 6, 2); redLight.position.set(0, D.globe.y, 0); root.add(redLight);
  const wallWash = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const l = new THREE.PointLight(0xffb070, opts.sconce ?? 2.2, 5, 2); l.position.set(Math.sin(a) * 3.9, 2.2, Math.cos(a) * 3.9); root.add(l); wallWash.push(l);
  }
  /** v: 0..1 brightness of the hologram (globe emissive + its blue light + projector beam). */
  const setGlobeLight = (v) => { globe.mat.emissiveIntensity = 0.9 * v; globeLight.intensity = 6 * v; beam.material.opacity = 0.12 * v; globe.glowMat.uniforms.uI.value = 0.9 * v; };

  return { root, D, globe, lights: { hemi, key, globeLight, redLight, wallWash }, setGlobeLight, beam };
}

export function buildCapsule(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); root.position.set(...DIMS.CAP); scene.add(root);
  const wallMat = mat(0xb9b6a4, 0.9), dark = mat(0x2d302c, 0.7);
  const box = (w, h, d, m, x, y, z) => mk(new THREE.BoxGeometry(w, h, d), m, root, x, y, z);
  const floor = mk(new THREE.PlaneGeometry(3.4, 3.8), mat(0x5d6a6e, 0.75), root); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  box(3.4, 2.5, 0.1, wallMat, 0, 1.25, -1.9); box(3.4, 2.5, 0.1, wallMat, 0, 1.25, 1.9);
  box(0.1, 2.5, 3.8, wallMat, -1.7, 1.25, 0); box(0.1, 2.5, 3.8, wallMat, 1.7, 1.25, 0);
  // vaulted ceiling (half cylinder along z)
  const vault = mk(new THREE.CylinderGeometry(1.7, 1.7, 3.8, 48, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0xa9a796, roughness: 0.9, side: THREE.BackSide }), root, 0, 2.48, 0);
  vault.rotation.x = -Math.PI / 2; vault.scale.set(1, 1, 0.42); vault.castShadow = false; // half-cylinder along z, flattened

  // console: back wall rack + angled desk
  const litTex = consoleTex(true), offTex = consoleTex(false);
  const panelMat = new THREE.MeshStandardMaterial({ map: litTex, emissiveMap: litTex, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.6 });
  const offMat = new THREE.MeshStandardMaterial({ map: offTex, roughness: 0.7 });
  const rack = new THREE.Group(); root.add(rack); rack.position.set(0, 0, -1.84);
  mk(new THREE.BoxGeometry(2.9, 2.1, 0.12), dark, rack, 0, 1.05, 0);
  // the lit face is split into 8 vertical strips so the lights can go out in a left→right sweep
  const strips = [];
  for (let i = 0; i < 8; i++) {
    const geo = new THREE.PlaneGeometry(2.7 / 8, 1.0); const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / 8);
    const on = new THREE.Mesh(geo, panelMat); on.position.set(-1.35 + (i + 0.5) * (2.7 / 8), 1.45, 0.065); rack.add(on);
    const off = new THREE.Mesh(geo, offMat); off.position.copy(on.position); off.visible = false; rack.add(off);
    strips.push({ on, off });
  }
  const desk = mk(new RoundedBoxGeometry(2.9, 0.06, 0.62, 2, 0.02), mat(0x55594f, 0.6), root, 0, 0.74, -1.5);
  box(2.9, 0.7, 0.05, dark, 0, 0.37, -1.2);
  // key boxes + red phone on the desk
  const keyBoxes = [];
  for (const x of [-0.45, 0.45]) {
    const kb = mk(new RoundedBoxGeometry(0.16, 0.07, 0.12, 2, 0.01), mat(0x8a1f1a, 0.5), root, x, 0.805, -1.42);
    const keyM = mk(new THREE.BoxGeometry(0.012, 0.05, 0.03), new THREE.MeshStandardMaterial({ color: 0xd8c27a, metalness: 0.8, roughness: 0.3 }), root, x, 0.86, -1.38);
    keyBoxes.push({ kb, keyM });
  }
  mk(new RoundedBoxGeometry(0.18, 0.07, 0.1, 2, 0.02), mat(0xb02a22, 0.4), root, 1.05, 0.81, -1.55);
  // chairs
  for (const [x, z] of DIMS.seats) {
    const c = new THREE.Group(); c.position.set(x, 0, z); root.add(c);
    mk(new RoundedBoxGeometry(0.5, 0.1, 0.48, 2, 0.04), mat(0x7a2b26, 0.8), c, 0, 0.48, 0);
    mk(new RoundedBoxGeometry(0.5, 0.62, 0.09, 2, 0.04), mat(0x7a2b26, 0.8), c, 0, 0.85, 0.24);
    mk(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), mat(0x333333, 0.4), c, 0, 0.22, 0);
  }
  // lights: red panel glow + work lamp
  const hemi = new THREE.HemisphereLight(0x9aa6b0, 0x3a3530, opts.ambient ?? 0.35); root.add(hemi);
  const panelGlow = new THREE.PointLight(0xff4a30, 5, 5, 2); panelGlow.position.set(0, 1.4, -1.2); root.add(panelGlow);
  const work = new THREE.SpotLight(0xfff0d8, opts.work ?? 14, 0, 0.9, 0.6, 2); work.position.set(0.2, 2.35, 0.6); work.target.position.set(0, 0.6, -0.8);
  work.castShadow = true; work.shadow.mapSize.set(1024, 1024); work.shadow.bias = -0.0005; root.add(work, work.target);
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d8).multiplyScalar(1.5), toneMapped: false });
  mk(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24), lampMat, root, 0.2, 2.37, 0.6).castShadow = false;

  /** lit: 0..1 fraction of the console still lit (strips go out left→right as it drops). */
  const setPanel = (lit) => {
    strips.forEach((s, i) => { const on = (i + 0.5) / 8 < lit; s.on.visible = on; s.off.visible = !on; });
    panelGlow.intensity = 5 * clamp(lit);
  };
  setPanel(1);
  return { root, setPanel, lights: { hemi, panelGlow, work }, keyBoxes, CAP: DIMS.CAP };
}
