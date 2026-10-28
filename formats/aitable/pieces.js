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
