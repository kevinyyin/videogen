// PIECES for the AI Table format (formats/aitable/shots.js): the toy robot, chips, cards, the giant dealer hand
// and the CAPTCHA card. Everything is built at REAL size in meters: a figure is a normal rig scaled by FIG_S (≈ 8.7 cm tall),
// a card is 6.3 × 8.8 cm, a chip 4 cm across — so the table reads as a landscape to the figures.
// Felt coordinates: the casino poker table is at the origin, felt top y = FELT_Y, the camera side is +x.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';
import { makePerson } from '@engine/rig.js';

export const FIG_S = 0.05;
export const FELT_Y = 0.8;
/** seat -> [x, z] on the felt (the camera side is +x, the slot wall behind -x) */
export const SEATS = { near: [0.14, 0], far: [-0.14, 0], left: [-0.04, -0.12], right: [-0.04, 0.12] };

// ---------------------------------------------------------------- robot
const EYE = '#bff8ff';

function drawFace(g, w, h, expr, accent) {
  g.fillStyle = '#0a0f1e'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(120,200,255,.07)'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);   // scanlines
  g.shadowColor = EYE; g.shadowBlur = 14; g.fillStyle = EYE; g.strokeStyle = EYE; g.lineCap = 'round'; g.lineWidth = 12;
  const ex = [w * 0.31, w * 0.69], ey = h * 0.4, mouth = (fn) => { g.beginPath(); fn(); g.stroke(); };
  const eye = (x, y, ew, eh) => { g.beginPath(); g.roundRect(x - ew / 2, y - eh / 2, ew, eh, Math.min(ew, eh) / 2); g.fill(); };
  if (expr.startsWith('TEXT:')) {
    const words = expr.slice(5).split(' '), lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words;
    g.shadowColor = '#ff4a3d'; g.fillStyle = '#ff6a5a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 90; g.font = `900 ${fs}px Helvetica, Arial, sans-serif`;
    while (fs > 20 && Math.max(...lines.map((l) => g.measureText(l).width)) > w * 0.88) { fs -= 4; g.font = `900 ${fs}px Helvetica, Arial, sans-serif`; }
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.05));
    return;
  }
  switch (expr) {
    case 'smug':
      ex.forEach((x) => { eye(x, ey + 6, 44, 30); g.save(); g.shadowBlur = 0; g.fillStyle = '#0a0f1e'; g.fillRect(x - 30, ey - 22, 60, 20); g.restore(); });
      mouth(() => { g.moveTo(w * 0.36, h * 0.74); g.quadraticCurveTo(w * 0.55, h * 0.8, w * 0.68, h * 0.66); });
      break;
    case 'shifty':
      ex.forEach((x) => eye(x + 16, ey, 40, 22));
      mouth(() => { g.moveTo(w * 0.42, h * 0.74); g.lineTo(w * 0.6, h * 0.72); });
      break;
    case 'suspicious':
      ex.forEach((x) => eye(x, ey + 4, 50, 12));
      g.lineWidth = 8; mouth(() => { g.moveTo(ex[0] - 26, ey - 26); g.lineTo(ex[0] + 26, ey - 16); g.moveTo(ex[1] - 26, ey - 16); g.lineTo(ex[1] + 26, ey - 30); });
      g.lineWidth = 12; mouth(() => { g.moveTo(w * 0.4, h * 0.74); g.lineTo(w * 0.6, h * 0.74); });
      break;
    case 'laugh':
      ex.forEach((x) => mouth(() => { g.moveTo(x - 24, ey + 10); g.lineTo(x, ey - 14); g.lineTo(x + 24, ey + 10); }));
      g.beginPath(); g.moveTo(w * 0.3, h * 0.62); g.lineTo(w * 0.7, h * 0.62); g.quadraticCurveTo(w * 0.5, h * 0.98, w * 0.3, h * 0.62); g.fill();
      break;
    case 'cry':
      ex.forEach((x) => mouth(() => { g.moveTo(x - 22, ey - 6); g.lineTo(x + 22, ey + 2); }));
      g.save(); g.fillStyle = '#5ab4ff'; g.shadowColor = '#5ab4ff'; ex.forEach((x) => g.fillRect(x - 5, ey + 12, 10, h * 0.42)); g.restore();
      mouth(() => { g.moveTo(w * 0.36, h * 0.8); g.quadraticCurveTo(w * 0.5, h * 0.62, w * 0.64, h * 0.8); });
      break;
    case 'glitch': {
      const R = rng(7);
      for (let i = 0; i < 18; i++) { g.fillStyle = i % 3 ? EYE : accent; g.fillRect(R() * w, R() * h, 20 + R() * 90, 4 + R() * 12); }
      break;
    }
    default:   // neutral
      ex.forEach((x) => eye(x, ey, 38, 46));
      mouth(() => { g.moveTo(w * 0.4, h * 0.74); g.lineTo(w * 0.6, h * 0.74); });
  }
}

/** A toy robot on the normal rig: chrome hands/skin, body-colored torso, a rounded chrome screen head with an antenna.
 *  setFace(expr) — 'neutral'|'smug'|'shifty'|'suspicious'|'laugh'|'cry'|'glitch' or 'TEXT:BOT DETECTED' (redraws on change). */
export function makeRobot({ color }) {
  const rig = makePerson({ skin: 0xbfc6d1, top: color, pants: 0x3a3f4a, shoes: 0x2a2e36, hair: 0x222222, hairStyle: 'none' });
  for (const m of [rig.mats.skin, rig.mats.faceSkin]) { m.metalness = 0.6; m.roughness = 0.35; }
  rig.head.g.visible = false;
  const chrome = mat(0xc9d0da, 0.3, { metalness: 0.65 });
  const head = new THREE.Group(); head.position.y = 0.13; rig.headG.add(head);
  mk(new RoundedBoxGeometry(0.3, 0.24, 0.24, 3, 0.05), chrome, head);
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 192;
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const screen = mk(new THREE.PlaneGeometry(0.25, 0.18), new THREE.MeshBasicMaterial({ map: tex }), head, 0, 0, 0.1215);
  screen.castShadow = false;
  mk(new THREE.CylinderGeometry(0.008, 0.008, 0.11, 8), chrome, head, 0, 0.17, 0);
  const tipCol = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35);
  mk(new THREE.SphereGeometry(0.026, 14, 10), new THREE.MeshBasicMaterial({ color: tipCol }), head, 0, 0.235, 0);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), chrome, head, s * 0.16, 0, 0).rotation.z = Math.PI / 2;
  let shown = null;
  function setFace(expr = 'neutral') {
    if (expr === shown) return;
    shown = expr;
    drawFace(canvas.getContext('2d'), canvas.width, canvas.height, expr, '#' + new THREE.Color(color).getHexString());
    tex.needsUpdate = true;
  }
  setFace('neutral');
  return { rig, setFace, head, screen };
}

// ---------------------------------------------------------------- chips (one instanced body + one instanced stripe band)
const CHIP_R = 0.02, CHIP_H = 0.0033;
const CHIP_COLORS = [0xc8322f, 0x2c5aa8, 0x1d1d22, 0x2f8f4e].map((c) => new THREE.Color(c));
export const chipStackY = (k) => FELT_Y + CHIP_H / 2 + k * CHIP_H;

/** Instanced poker chips, rebuilt every frame: begin(); add(x, y, z, rx, rz, colorIdx) per chip; end(). */
export function makeChips(parent, n = 2000) {
  const body = new THREE.InstancedMesh(new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_H, 24), new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
  const stripeTex = canvasTex(128, 8, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; for (let i = 0; i < 8; i++) g.fillRect(i * 16 + 5, 0, 5, h); });
  const stripes = new THREE.InstancedMesh(new THREE.CylinderGeometry(CHIP_R * 1.004, CHIP_R * 1.004, CHIP_H * 0.86, 24, 1, true),
    new THREE.MeshLambertMaterial({ map: stripeTex, alphaTest: 0.5, color: 0xf4efe6 }), n);
  stripes.instanceMatrix = body.instanceMatrix;   // same transforms, one upload
  for (const m of [body, stripes]) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.count = 0; parent.add(m); }
  body.setColorAt(0, CHIP_COLORS[0]);
  const d = new THREE.Object3D();
  let i = 0;
  return {
    begin() { i = 0; },
    add(x, y, z, rx = 0, rz = 0, colorIdx = 0) {
      if (i >= n) return;
      d.position.set(x, y, z); d.rotation.set(rx, (Math.sin(i * 12.9898) * 43758.5453 % 1) * 6.283, rz);   // hashed spin: a regular step stacked into a helix d.updateMatrix();
      body.setMatrixAt(i, d.matrix); body.setColorAt(i, CHIP_COLORS[((colorIdx % 4) + 4) % 4]); i++;
    },
    end() {
      body.count = stripes.count = i;
      body.instanceMatrix.needsUpdate = true; if (body.instanceColor) body.instanceColor.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- cards (real size, lying flat, BACK up by default)
const CARD_W = 0.063, CARD_L = 0.088;
const SUIT = { s: ['♠', '#1a1a1a'], c: ['♣', '#1a1a1a'], h: ['♥', '#c8202a'], d: ['♦', '#c8202a'] };
const faceTexCache = {};
function cardFaceTex(code) {
  if (faceTexCache[code]) return faceTexCache[code];
  const rank = code[0] === 'T' ? '10' : code[0], [glyph, col] = SUIT[code[1]];
  return (faceTexCache[code] = canvasTex(256, 356, (g, w, h) => {
    g.fillStyle = '#fbfaf6'; g.beginPath(); g.roundRect(0, 0, w, h, 22); g.fill();
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 74px Helvetica, Arial, sans-serif'; g.fillText(rank, 46, 50);
    g.font = '58px Helvetica, Arial, sans-serif'; g.fillText(glyph, 46, 112);
    g.font = '170px Helvetica, Arial, sans-serif'; g.fillText(glyph, w / 2, h / 2 + 30);
  }));
}
let backTex = null;
function cardBackTex() {
  return (backTex ||= canvasTex(256, 356, (g, w, h) => {
    g.fillStyle = '#fbfaf6'; g.beginPath(); g.roundRect(0, 0, w, h, 22); g.fill();
    g.fillStyle = '#1d2a5a'; g.beginPath(); g.roundRect(14, 14, w - 28, h - 28, 14); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
    for (let k = -h; k < w + h; k += 22) { g.beginPath(); g.moveTo(k, 14); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k + h, 14); g.lineTo(k, h); g.stroke(); }
  }));
}
/** A playing card at real size. Lies flat with its BACK up (+y); rotate x by PI to show the face. setFace(code | null). */
export function makeCard() {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(CARD_W, CARD_L);
  const back = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: cardBackTex(), color: 0xcfcfcf, alphaTest: 0.5 }));
  back.rotation.x = -Math.PI / 2; back.position.y = 0.0003;
  const face = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: cardBackTex(), color: 0xcfcfcf, alphaTest: 0.5 }));
  face.rotation.x = Math.PI / 2; face.position.y = -0.0003;
  for (const m of [back, face]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
  return { g, face, setFace(code) { face.material.map = code ? cardFaceTex(code) : cardBackTex(); face.material.needsUpdate = true; } };
}

// ---------------------------------------------------------------- the giant dealer hand (life size, palm down, fingers +z)
const HAND_POSES = {   // per finger [base, mid, tip] curl (rad, + = toward the palm); thumb [base, tip]
  rest:  { f: [[0.2, 0.25, 0.15], [0.2, 0.25, 0.15], [0.25, 0.3, 0.2], [0.3, 0.35, 0.2]], t: [0.2, 0.2] },
  pinch: { f: [[0.55, 0.6, 0.4], [1.2, 1.4, 0.9], [1.3, 1.4, 0.9], [1.3, 1.4, 0.9]], t: [0.7, 0.5] },
  flat:  { f: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], t: [0, 0] },
  point: { f: [[0, 0, 0], [1.3, 1.5, 0.9], [1.3, 1.5, 0.9], [1.3, 1.5, 0.9]], t: [0.8, 0.6] },
  flick: { f: [[1.3, 1.45, 0.9], [0.1, 0.1, 0.05], [0.15, 0.1, 0.05], [0.2, 0.15, 0.1]], t: [0.9, 0.7] },
};
/** pose(name, k): blends every joint from `rest` toward HAND_POSES[name] by k. The group origin is the wrist. */
export function makeGiantHand() {
  const g = new THREE.Group();
  const skin = mat(0xc9906e, 0.6), shirt = mat(0xf2efe8, 0.8), suit = mat(0x23242c, 0.7);
  mk(new RoundedBoxGeometry(0.09, 0.024, 0.1, 3, 0.01), skin, g, 0, 0, 0.05);
  const cuff = mk(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 20), shirt, g, 0, 0, -0.022); cuff.rotation.x = Math.PI / 2;
  const sleeve = mk(new THREE.CylinderGeometry(0.044, 0.05, 0.45, 20), suit, g, 0, 0, -0.27); sleeve.rotation.x = Math.PI / 2;
  const seg = (parent, len, r, z0) => {
    const j = new THREE.Group(); j.position.z = z0; parent.add(j);
    mk(new THREE.CapsuleGeometry(r, len - 2 * r, 4, 10), skin, j, 0, 0, len / 2).rotation.x = Math.PI / 2;
    return j;
  };
  const DIM = [[0.045, 0.028, 0.022, 0.0095, -0.031], [0.05, 0.03, 0.024, 0.0098, -0.01], [0.046, 0.028, 0.022, 0.0094, 0.011], [0.036, 0.022, 0.018, 0.0082, 0.03]];
  const fingers = DIM.map(([a, b, c, r, x]) => { const root = new THREE.Group(); root.position.set(x, 0, 0.1); g.add(root); const j0 = seg(root, a, r, 0), j1 = seg(j0, b, r * 0.92, a), j2 = seg(j1, c, r * 0.85, b); return [j0, j1, j2]; });
  const thumbRoot = new THREE.Group(); thumbRoot.position.set(-0.045, -0.004, 0.035); thumbRoot.rotation.y = -0.75; g.add(thumbRoot);
  const t0 = seg(thumbRoot, 0.042, 0.011, 0), t1 = seg(t0, 0.032, 0.0102, 0.042);
  function pose(name = 'rest', k = 1) {
    const A = HAND_POSES.rest, B = HAND_POSES[name] || A;
    fingers.forEach((js, i) => js.forEach((j, s) => (j.rotation.x = A.f[i][s] + (B.f[i][s] - A.f[i][s]) * k)));
    t0.rotation.x = A.t[0] + (B.t[0] - A.t[0]) * k; t1.rotation.x = A.t[1] + (B.t[1] - A.t[1]) * k;
  }
  pose('rest', 1);
  return { g, pose, tip: fingers[0][2] };
}

// ---------------------------------------------------------------- the CAPTCHA card (a giant card: header, 3x3 grid, VERIFY)
const CAP_W = 0.25, CAP_L = 0.35, CAP_CELLS = ['As', '7c', 'Kd', '3s', 'Ah', 'Ad', '9h', 'Qc', 'Ac'];
/** Lies flat, face up, its top toward -z (place it with rotation.y = PI/2 to read it from +x). setLit(mask[9] (+ [9] = VERIFY)). */
export function makeCaptcha(text) {
  const g = new THREE.Group();
  const CW = 512, CH = 716, top = 150, cell = 160, gx = (CW - 3 * cell) / 2;
  const tex = canvasTex(CW, CH, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(0, 0, w, h, 26); c.fill();
    c.fillStyle = '#4a7bd8'; c.beginPath(); c.roundRect(16, 16, w - 32, 118, 14); c.fill();
    c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs = 52; c.font = `800 ${fs}px Helvetica, Arial, sans-serif`;
    while (fs > 18 && c.measureText(text).width > w - 64) { fs -= 2; c.font = `800 ${fs}px Helvetica, Arial, sans-serif`; }
    c.fillText(text, w / 2, 75);
    CAP_CELLS.forEach((code, i) => {
      const x = gx + (i % 3) * cell, y = top + Math.floor(i / 3) * cell, [glyph, col] = SUIT[code[1]];
      c.fillStyle = '#f1f1ee'; c.fillRect(x + 6, y + 6, cell - 12, cell - 12);
      c.fillStyle = col; c.font = 'bold 64px Helvetica, Arial, sans-serif'; c.fillText(code[0], x + cell / 2, y + cell / 2 - 18);
      c.font = '50px Helvetica, Arial, sans-serif'; c.fillText(glyph, x + cell / 2, y + cell / 2 + 38);
    });
    c.fillStyle = '#2f9e5a'; c.beginPath(); c.roundRect(w / 2 - 130, top + 3 * cell + 18, 260, 64, 14); c.fill();
    c.fillStyle = '#ffffff'; c.font = '800 38px Helvetica, Arial, sans-serif'; c.fillText('VERIFY ✓', w / 2, top + 3 * cell + 50);
  });
  const card = mk(new THREE.PlaneGeometry(CAP_W, CAP_L), new THREE.MeshLambertMaterial({ map: tex, color: 0xc8c8c8, alphaTest: 0.5 }), g);
  card.rotation.x = -Math.PI / 2; card.position.y = 0.0008;
  const toPlane = (px, py) => [(px / CW - 0.5) * CAP_W, (py / CH - 0.5) * CAP_L];
  const litMat = new THREE.MeshBasicMaterial({ color: 0x1fb85a, transparent: true, opacity: 0.8, depthWrite: false });
  const cellsAt = CAP_CELLS.map((_, i) => toPlane(gx + (i % 3) * cell + cell / 2, top + Math.floor(i / 3) * cell + cell / 2));
  const lits = cellsAt.map(([x, z]) => { const m = mk(new THREE.PlaneGeometry(CAP_W * 0.28, CAP_L * 0.2), litMat, g, x, 0.0014, z); m.rotation.x = -Math.PI / 2; m.castShadow = false; m.visible = false; return m; });
  const [vx, vz] = toPlane(CW / 2, top + 3 * cell + 50);
  const verify = mk(new THREE.PlaneGeometry(CAP_W * 0.55, CAP_L * 0.1), litMat, g, vx, 0.0014, vz); verify.rotation.x = -Math.PI / 2; verify.castShadow = false; verify.visible = false;
  return {
    g, cellsAt, verifyAt: [vx, vz],
    setLit(mask) { lits.forEach((m, i) => (m.visible = !!mask[i])); verify.visible = !!mask[9]; },
  };
}
