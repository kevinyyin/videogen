// PROPS for the Ladder format (formats/ladder/shots.js + gags.js). Real size in meters, origin at the BASE CENTER, facing +z.
// makeProp(name, R) -> {g, h, ...}: h = height (gags stack piles and scale drops by it). tools/ladder.py PROPS must list
// exactly PROP_NAMES (+ the cast ids) — tests/test_ladder.py CrossFile checks it.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mk, canvasTex } from '@engine/core.js';
import { makePerson, applyPose, basePose } from '@engine/rig.js';
import { makeCar } from '@engine/sets/city.js';
import { makeCard } from '/formats/aitable/pieces.js';

export const PROP_NAMES = ['five_aces', 'gold_chips', 'chips', 'table', 'boat', 'chicken', 'casino_building', 'car', 'house',
  'eiffel', 'moon', 'grandma', 'sheep', 'wheat_card'];

const CHIP_R = 0.06, CHIP_H = 0.012;   // cartoon chips (3x real) so they read at normal scale

function chipStack(n, color, metal = 0) {
  // gold stays bright without an env map: a full metalness rendered it dark grey, so it's mostly color + a warm emissive
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, roughness: metal ? 0.35 : 0.6, metalness: metal ? 0.25 : 0, emissive: metal ? 0x3a2600 : 0x000000 });
  const edge = mat(0xf4efe6, 0.6);
  for (let k = 0; k < n; k++) {
    mk(new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_H, 24), m, g, 0, CHIP_H / 2 + k * CHIP_H, 0);
    mk(new THREE.CylinderGeometry(CHIP_R * 1.01, CHIP_R * 1.01, CHIP_H * 0.4, 24, 1, true), edge, g, 0, CHIP_H / 2 + k * CHIP_H, 0);
  }
  return g;
}

function signTex(text, bg, fg, w = 1024, h = 256) {
  return canvasTex(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffe9a8'; for (let x = 24; x < w; x += 48) { c.beginPath(); c.arc(x, 18, 9, 0, 7); c.fill(); c.beginPath(); c.arc(x, h - 18, 9, 0, 7); c.fill(); }
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs = 170; c.font = `900 ${fs}px Helvetica, Arial, sans-serif`;
    while (c.measureText(text).width > w - 90) { fs -= 6; c.font = `900 ${fs}px Helvetica, Arial, sans-serif`; }
    c.fillText(text, w / 2, h / 2 + 6);
  });
}

/** One merged, vertex-colored sheep (0.9 m long, faces +z): white fluff blobs, a black head, black legs. */
function sheepGeometry() {
  const parts = [];
  const add = (geo, color, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const g = geo.toNonIndexed(); g.scale(sx, sy, sz); g.translate(x, y, z);
    const c = new THREE.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv'); parts.push(g);
  };
  for (const [x, y, z, r] of [[0, 0.55, 0, 0.3], [0.16, 0.6, 0.15, 0.22], [-0.16, 0.6, 0.15, 0.22], [0.15, 0.58, -0.16, 0.22], [-0.15, 0.58, -0.16, 0.22], [0, 0.72, 0, 0.22]])
    add(new THREE.IcosahedronGeometry(r, 1), 0xf3f0ea, x, y, z);
  add(new THREE.SphereGeometry(0.14, 12, 10), 0x2a2522, 0, 0.62, 0.36, 0.85, 1, 1.2);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.05, 8, 6), 0x2a2522, s * 0.12, 0.7, 0.32, 1.4, 0.6, 0.8);   // ears
  for (const [x, z] of [[0.13, 0.17], [-0.13, 0.17], [0.13, -0.17], [-0.13, -0.17]]) add(new THREE.CylinderGeometry(0.035, 0.03, 0.36, 6), 0x2a2522, x, 0.18, z);
  return mergeGeometries(parts);
}
let SHEEP_GEO = null;
const sheepMat = () => new THREE.MeshLambertMaterial({ vertexColors: true });

/** Instanced sheep, rebuilt every frame: begin(); add(x, y, z, rotY, s); end(). */
export function makeSheepFlood(parent, n = 1500) {
  SHEEP_GEO ||= sheepGeometry();
  const m = new THREE.InstancedMesh(SHEEP_GEO, sheepMat(), n);
  m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.count = 0; parent.add(m);
  const d = new THREE.Object3D();
  let i = 0;
  return {
    mesh: m,
    begin() { i = 0; },
    add(x, y, z, rotY = 0, s = 1) {
      if (i >= n) return;
      d.position.set(x, y, z); d.rotation.set(0, rotY, 0); d.scale.setScalar(s); d.updateMatrix(); m.setMatrixAt(i++, d.matrix);
    },
    /** any orientation (sheep standing on a planet) */
    addQ(x, y, z, quat, s = 1) {
      if (i >= n) return;
      d.position.set(x, y, z); d.quaternion.copy(quat); d.scale.setScalar(s); d.updateMatrix(); m.setMatrixAt(i++, d.matrix);
      d.quaternion.identity();
    },
    end() { m.count = i; m.instanceMatrix.needsUpdate = true; },
  };
}

export function makeProp(name) {
  const g = new THREE.Group();
  switch (name) {
    case 'five_aces': {   // a standing fan of five aces (one too many), 2.5x so it reads in a medium shot
      ['As', 'Ah', 'Ad', 'Ac', 'As'].forEach((code, i) => {
        const c = makeCard(); c.setFace(code); c.g.scale.setScalar(4);
        const pivot = new THREE.Group(); pivot.rotation.z = (i - 2) * 0.22; g.add(pivot);
        c.g.rotation.set(-Math.PI / 2, 0, 0, 'YXZ'); c.g.position.set(0, 0.18, 0.003 * i); pivot.add(c.g);   // standing, face toward +z
      });
      return { g, h: 0.4 };
    }
    case 'gold_chips': g.add(chipStack(12, 0xf0c040, 0.85)); return { g, h: 12 * CHIP_H };
    case 'chips': g.add(chipStack(10, 0xc8322f)); return { g, h: 10 * CHIP_H };
    case 'table': {   // a round green poker table (floats in space, stands anywhere else)
      mk(new THREE.CylinderGeometry(0.8, 0.8, 0.06, 40), new THREE.MeshLambertMaterial({ color: 0x1b6a3e }), g, 0, 0.78, 0);
      mk(new THREE.TorusGeometry(0.8, 0.05, 10, 40), mat(0x2a1a14, 0.4), g, 0, 0.81, 0).rotation.x = Math.PI / 2;
      mk(new THREE.CylinderGeometry(0.08, 0.3, 0.75, 16), mat(0x2a1a14, 0.5), g, 0, 0.375, 0);
      return { g, h: 0.84 };
    }
    case 'boat': {   // a 3.8 m cartoon rowboat with two benches for riders (seat tops at y 0.45) and a little flag
      const hull = mk(new RoundedBoxGeometry(1.5, 0.62, 3.8, 3, 0.28), mat(0xd9483b, 0.5), g, 0, 0.31, 0);
      hull.scale.set(1, 1, 1);
      mk(new RoundedBoxGeometry(1.52, 0.08, 3.82, 2, 0.04), mat(0xf4efe6, 0.5), g, 0, 0.5, 0);
      mk(new THREE.BoxGeometry(1.3, 0.05, 3.5), mat(0x8a5a33, 0.8), g, 0, 0.38, 0);
      for (const z of [-0.8, 0.8]) mk(new THREE.BoxGeometry(1.3, 0.07, 0.32), mat(0xb07a45, 0.7), g, 0, 0.45, z);
      mk(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 8), mat(0x6b4a33, 0.6), g, 0, 1.1, 1.6);
      mk(new THREE.PlaneGeometry(0.45, 0.3), new THREE.MeshLambertMaterial({ color: 0xf0c040, side: THREE.DoubleSide }), g, 0.23, 1.62, 1.6);
      return { g, h: 0.62, seats: [[0, 0.45, -0.8], [0, 0.45, 0.8]] };
    }
    case 'chicken': {   // a 1.4 m cartoon chicken (head bob + wing flap in update)
      const white = mat(0xf7f3ea, 0.8), red = mat(0xd8332a, 0.6), yel = mat(0xf2b134, 0.5), dark = mat(0x1b1310, 0.4);
      mk(new THREE.SphereGeometry(0.42, 24, 18), white, g, 0, 0.75, 0).scale.set(1, 1.1, 1.15);
      const head = new THREE.Group(); head.position.set(0, 1.22, 0.18); g.add(head);
      mk(new THREE.SphereGeometry(0.22, 20, 16), white, head, 0, 0, 0);
      for (const [x, y, r] of [[0, 0.22, 0.07], [0, 0.27, 0.06], [0, 0.2, 0.06]]) mk(new THREE.SphereGeometry(r, 10, 8), red, head, x, y, -0.06 + y * 0.3);
      mk(new THREE.ConeGeometry(0.06, 0.16, 8), yel, head, 0, -0.02, 0.24).rotation.x = Math.PI / 2;
      mk(new THREE.SphereGeometry(0.045, 8, 6), red, head, 0, -0.12, 0.16).scale.set(1, 1.6, 1);
      for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.035, 8, 6), dark, head, s * 0.11, 0.05, 0.17);
      const wings = [-1, 1].map((s) => { const w = new THREE.Group(); w.position.set(s * 0.4, 0.85, 0); g.add(w); mk(new THREE.SphereGeometry(0.2, 12, 10), white, w, s * 0.05, -0.1, 0).scale.set(0.35, 0.9, 1.1); return w; });
      for (const s of [-1, 1]) {
        mk(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), yel, g, s * 0.15, 0.2, 0.02);
        mk(new THREE.BoxGeometry(0.16, 0.03, 0.2), yel, g, s * 0.15, 0.015, 0.08);
      }
      for (let i = 0; i < 3; i++) mk(new THREE.SphereGeometry(0.12, 10, 8), white, g, (i - 1) * 0.1, 1.0, -0.45).scale.set(0.5, 1.4, 0.6);
      return { g, h: 1.45, head, update(t) { head.position.y = 1.22 + 0.03 * Math.abs(Math.sin(t * 7)); head.rotation.x = 0.15 * Math.sin(t * 7); wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.15 + 0.25 * Math.max(0, Math.sin(t * 11))))); } };
    }
    case 'casino_building': {   // a 7 x 8 m facade with a CASINO marquee + two cartoon legs (setLegs(ext 0..1, phase))
      const body = new THREE.Group(); g.add(body);
      mk(new THREE.BoxGeometry(7, 8, 4), mat(0x7a1f3d, 0.7), body, 0, 4, 0);
      mk(new THREE.BoxGeometry(7.4, 0.5, 4.4), mat(0xd9a84a, 0.4, { metalness: 0.5 }), body, 0, 8.2, 0);
      mk(new THREE.PlaneGeometry(6.2, 1.55), new THREE.MeshBasicMaterial({ map: signTex('CASINO', '#2a0a18', '#ffd34d') }), body, 0, 6.6, 2.02);
      mk(new THREE.BoxGeometry(2.2, 2.6, 0.1), mat(0xf0c040, 0.4, { metalness: 0.4 }), body, 0, 1.3, 2.01);
      for (const x of [-2.4, 2.4]) for (const y of [3.2, 4.8]) mk(new THREE.PlaneGeometry(1.1, 1.0), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }), body, x, y, 2.02);
      const legs = [-1, 1].map((s) => {
        const hip = new THREE.Group(); hip.position.set(s * 1.8, 0, 0); g.add(hip);
        // thick cream legs + big black shoes: dark legs vanished against the storefronts
        const thigh = mk(new THREE.CylinderGeometry(0.55, 0.48, 1.5, 14), mat(0xefe4cf, 0.7), hip, 0, -0.75, 0);
        const knee = new THREE.Group(); knee.position.y = -1.5; hip.add(knee);
        mk(new THREE.SphereGeometry(0.5, 14, 10), mat(0xefe4cf, 0.7), knee, 0, 0, 0);
        mk(new THREE.CylinderGeometry(0.48, 0.42, 1.5, 14), mat(0xefe4cf, 0.7), knee, 0, -0.75, 0);
        mk(new RoundedBoxGeometry(1.2, 0.5, 1.9, 2, 0.2), mat(0x1b1310, 0.4), knee, 0, -1.6, 0.35);
        return { hip, knee, thigh };
      });
      function setLegs(ext = 1, phase = 0) {
        const L = 3.2 * ext;
        body.position.y = L + 0.08 * ext * Math.abs(Math.sin(phase * Math.PI));
        legs.forEach((l, i) => {
          l.hip.visible = ext > 0.02; l.hip.position.y = L; l.hip.scale.setScalar(Math.max(0.01, ext));
          const sw = Math.sin(phase * Math.PI + i * Math.PI) * 0.45 * ext;
          l.hip.rotation.x = sw; l.knee.rotation.x = Math.max(0, -sw) * 0.8;
        });
      }
      setLegs(0, 0);
      return { g, h: 8.4, setLegs, body };
    }
    case 'car': { const c = makeCar(0x3b7dd8, 7); g.add(c.g || c); return { g, h: 1.5 }; }
    case 'house': {   // 5 x 4.5 x 5 m bungalow: walls, a pyramid roof, a door, windows, a chimney
      mk(new THREE.BoxGeometry(5, 3, 5), mat(0xf2e3c6, 0.8), g, 0, 1.5, 0);
      const roof = mk(new THREE.ConeGeometry(4.1, 1.7, 4), mat(0x9a3b2e, 0.7), g, 0, 3.85, 0); roof.rotation.y = Math.PI / 4;
      mk(new THREE.BoxGeometry(1, 1.9, 0.1), mat(0x6b4a33, 0.6), g, 0, 0.95, 2.51);
      for (const x of [-1.6, 1.6]) mk(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0xbfe0ff }), g, x, 1.7, 2.52);
      mk(new THREE.BoxGeometry(0.5, 1.2, 0.5), mat(0x8a4a3a, 0.8), g, 1.3, 4.2, -0.8);
      return { g, h: 4.5 };
    }
    case 'eiffel': {   // a low-poly 72 m tower matching paris.js (legs at ±13.5): tapered legs, platforms, shaft, antenna
      const iron = mat(0x7a6650, 0.75);
      for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
        const leg = mk(new THREE.CylinderGeometry(0.9, 2.4, 26, 4), iron, g, sx * 8.5, 13, sz * 8.5);
        leg.rotation.set(-sz * 0.33, 0, sx * 0.33); leg.rotation.y = Math.PI / 4;
      }
      mk(new THREE.BoxGeometry(19, 1.4, 19), iron, g, 0, 12.4, 0);
      mk(new THREE.CylinderGeometry(3.5, 7.5, 13, 4), iron, g, 0, 19, 0).rotation.y = Math.PI / 4;
      mk(new THREE.BoxGeometry(9, 1, 9), iron, g, 0, 25.5, 0);
      mk(new THREE.CylinderGeometry(0.9, 3.5, 34, 4), iron, g, 0, 43, 0).rotation.y = Math.PI / 4;
      mk(new THREE.BoxGeometry(3.4, 1.4, 3.4), iron, g, 0, 60.5, 0);
      mk(new THREE.CylinderGeometry(0.15, 0.6, 10, 6), iron, g, 0, 66.5, 0);
      return { g, h: 72 };
    }
    case 'moon': {   // r 1 m crater-texture sphere, sitting on its base (gags scale it)
      const tex = canvasTex(512, 256, (c, w, h) => {
        c.fillStyle = '#b9b6ad'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 70; i++) {
          const x = ((i * 97) % w), y = ((i * 53) % h), r = 6 + ((i * 31) % 26);
          c.fillStyle = 'rgba(80,78,72,.35)'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
          c.fillStyle = 'rgba(235,232,224,.25)'; c.beginPath(); c.arc(x - r * 0.25, y - r * 0.25, r * 0.7, 0, 7); c.fill();
        }
      });
      mk(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshLambertMaterial({ map: tex }), g, 0, 1, 0);
      return { g, h: 2 };
    }
    case 'grandma': {   // a person preset: grey bob, glasses, lavender cardigan, arms crossed, unimpressed
      const rig = makePerson({ skin: 0xe8c0a0, top: 0xb39ad6, pants: 0x4a4a5a, hair: 0xdedad2, hairStyle: 'bob', glasses: true });
      const p = Object.assign(basePose(), { armA: { sx: -0.05, sz: 0.2, el: -2.0, twist: 0.9, free: 0 }, armB: { sx: -0.05, sz: 0.2, el: -2.0, twist: -0.9, free: 0 }, mouth: 'flat', headPitch: -0.05 });
      applyPose(rig, p); g.add(rig.root);
      return { g, h: 1.75, rig, pose: p };
    }
    case 'sheep': { SHEEP_GEO ||= sheepGeometry(); const m = new THREE.Mesh(SHEEP_GEO, sheepMat()); m.castShadow = true; g.add(m); return { g, h: 0.95 }; }
    case 'wheat_card': {   // a standing resource card (0.2 x 0.28 m)
      const tex = canvasTex(256, 360, (c, w, h) => {
        c.fillStyle = '#fbf3d6'; c.beginPath(); c.roundRect(0, 0, w, h, 20); c.fill();
        c.strokeStyle = '#c9a23a'; c.lineWidth = 10; c.strokeRect(12, 12, w - 24, h - 24);
        c.strokeStyle = '#d9a52a'; c.lineWidth = 8;
        for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(w / 2 + k * 34, 280); c.lineTo(w / 2 + k * 22, 90); c.stroke(); for (let j = 0; j < 6; j++) { c.fillStyle = '#e8b83a'; c.beginPath(); c.ellipse(w / 2 + k * 22 + 10, 100 + j * 26, 9, 15, 0.5, 0, 7); c.fill(); c.beginPath(); c.ellipse(w / 2 + k * 22 - 10, 112 + j * 26, 9, 15, -0.5, 0, 7); c.fill(); } }
        c.fillStyle = '#7a5a1a'; c.font = 'bold 40px Helvetica, Arial, sans-serif'; c.textAlign = 'center'; c.fillText('WHEAT', w / 2, 330);
      });
      mk(new THREE.PlaneGeometry(0.2, 0.28), new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }), g, 0, 0.14, 0);
      return { g, h: 0.28 };
    }
    default: throw new Error(`unknown prop '${name}'`);
  }
}
