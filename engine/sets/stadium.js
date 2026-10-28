// SET: a sold-out stadium concert at dusk (built for video 019) — an elliptical two-deck bowl (one LatheGeometry), ~14,000
// instanced fans in the stands + ~2,700 on the field, a big stage at −x with an LED wall (`setScreen(t, beat)`), a lighting
// truss with colored beams, speaker stacks, floodlight towers on the rim, two jumbotrons, a dusk sky dome.
// Coordinates: field center at the origin, the bowl's field edge is an ellipse with semi-axes DIMS.A (x) × DIMS.B (z).
// The stage front is at x = DIMS.stageX facing +x; the field crowd stands in DIMS.pit. Camera usually on the stage looking +x
// (every fan faces the stage, so you see faces). Fans: `updateFans(t, f)` where f(info) → { y, arms, sway } per fan
// (info = { i, theta, row, field, x, z, seed }): y = lift (m, a jump), arms 0..1 (raises the V arms), sway (rad, lean side).
// Own `fog`; set camera.far ≥ 500.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

const A = 50, B = 33, ROW = 0.9, RISE = 0.48, N1 = 16, N2 = 16, UP = 3.2;   // lower deck rows N1, upper deck N2 (raised UP)
export const DIMS = { A, B, stageX: -38, pit: { x0: -34, x1: 14, z0: -22, z1: 22 }, row: ROW, rise: RISE };
/** tread k (0 = field-side front row): radius (x-units) + height of the standing surface */
export const tread = (k) => (k < N1 ? { r: A + 1.5 + k * ROW, y: 1.2 + k * RISE } : { r: A + 1.5 + (k + 2) * ROW, y: 1.2 + k * RISE + UP });

export function buildStadium(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 68);
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const fog = new THREE.Fog(0x5a4a6a, 200, 700);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.MeshBasicMaterial({ fog: false, side: THREE.BackSide, toneMapped: false, map: canvasTex(256, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1c2350'); gr.addColorStop(0.3, '#3d3a78'); gr.addColorStop(0.42, '#a5577e'); gr.addColorStop(0.48, '#f29a62'); gr.addColorStop(0.5, '#ffd08a'); gr.addColorStop(1, '#3a2a3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(3); g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 120; i++) { g.beginPath(); g.arc(r() * w, r() * h * 0.28, 0.6 + r(), 0, 7); g.fill(); }
  }) }));
  root.add(sky);
  // field: striped grass under a floor cover in the pit
  const fieldT = canvasTex(512, 512, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#4f8a3a' : '#5c9a44'; g.fillRect(i * 32, 0, 32, h); } g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 4; g.strokeRect(20, 20, w - 40, h - 40); g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w / 2, h - 20); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 60, 0, 7); g.stroke(); });
  const field = mk(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ map: fieldT, roughness: 0.9 }), root, 0, 0, 0); field.rotation.x = -Math.PI / 2; field.scale.set(A + 1.6, B + 1.6, 1); field.castShadow = false;
  const P = DIMS.pit, cover = box(P.x1 - P.x0 + 4, 0.02, P.z1 - P.z0 + 4, mat(0x2a2a30, 0.8), (P.x0 + P.x1) / 2, 0.012, 0); cover.castShadow = false;

  // the bowl: a stepped profile revolved (Lathe) + scaled to an ellipse
  // (no two consecutive profile points may coincide: a zero-length segment gives NaN normals → black blocks)
  const prof = [new THREE.Vector2(A, 0), new THREE.Vector2(A, 1.2)];
  for (let k = 0; k < N1 + N2; k++) { const a = tread(k); if (k === N1) { const b = tread(N1 - 1); prof.push(new THREE.Vector2(b.r + ROW + 0.9, b.y)); } prof.push(new THREE.Vector2(a.r, a.y), new THREE.Vector2(a.r + ROW, a.y)); }
  const top = tread(N1 + N2 - 1); prof.push(new THREE.Vector2(top.r + ROW, top.y + 2.4), new THREE.Vector2(top.r + ROW + 0.6, top.y + 2.4), new THREE.Vector2(top.r + ROW + 0.6, 0));
  const bowlT = canvasTex(64, 512, (g, w, h) => { g.fillStyle = '#2f5f9a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = y % 16 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.15)'; g.fillRect(0, y, w, 4); } });
  const bowl = mk(new THREE.LatheGeometry(prof, 128), new THREE.MeshStandardMaterial({ map: bowlT, roughness: 0.8, side: THREE.DoubleSide }), root); bowl.scale.set(1, 1, B / A); bowl.castShadow = false; bowl.receiveShadow = true;
  // the upper-deck fascia: a glowing LED ribbon between the decks
  const ribT = canvasTex(1024, 32, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); ['#ff5fa2', '#ffd166', '#5ad1ff', '#9b7bff', '#ff5fa2'].forEach((c, i) => gr.addColorStop(i / 4, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, [6, 1]);
  const lb = tread(N1 - 1), rib = mk(new THREE.CylinderGeometry(lb.r + ROW + 1.8, lb.r + ROW + 1.8, 1.0, 128, 1, true), new THREE.MeshBasicMaterial({ map: ribT, toneMapped: false, side: THREE.DoubleSide }), root, 0, tread(N1).y - 1.3, 0);
  rib.scale.set(1, 1, B / A); rib.castShadow = false;

  // fans: instanced bodies + heads + raised arms (a merged V); 4 shirt colors per instance, skin tones on heads
  const bodyG = new THREE.CapsuleGeometry(0.2, 0.55, 2, 6), headG = new THREE.SphereGeometry(0.17, 8, 6);
  const armL = new THREE.CapsuleGeometry(0.05, 0.5, 2, 4); armL.rotateZ(-0.45); armL.translate(-0.2, 0.32, 0);
  const armR = new THREE.CapsuleGeometry(0.05, 0.5, 2, 4); armR.rotateZ(0.45); armR.translate(0.2, 0.32, 0);
  const armsG = mergeGeometries([armL, armR]);
  const fans = [];
  const TOPS = [0xff5fa2, 0xffffff, 0x5ad1ff, 0xffd166, 0x9b7bff, 0xd2483f, 0x2f3a4a, 0x6fa84f, 0xf4a6c6, 0xe08a3a];
  const SK = [0xf1c3a1, 0xe2ad8c, 0xc98e6a, 0x9a6447, 0x6e4430, 0xf3d0b5];
  for (let k = 0; k < N1 + N2; k++) {
    const a = tread(k), rr = a.r + ROW * 0.5, circ = Math.PI * 2 * Math.sqrt((rr * rr + (rr * B / A) ** 2) / 2), n = Math.floor(circ / 0.78);
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2 + (k % 2) * 0.004;
      const x = rr * Math.cos(th), z = rr * Math.sin(th) * (B / A);
      if (x < DIMS.stageX + 4 && Math.abs(z) < 26) continue;   // no seats behind the stage
      if (R() < 0.04) continue;
      fans.push({ theta: th, row: k, field: false, x, y: a.y, z, face: Math.atan2(-x, -z), seed: R() });
    }
  }
  for (let x = P.x0; x <= P.x1; x += 0.85) for (let z = P.z0; z <= P.z1; z += 0.8) { if (R() < 0.06) continue; fans.push({ theta: Math.atan2(z, x), row: -1, field: true, x: x + (R() - 0.5) * 0.4, y: 0, z: z + (R() - 0.5) * 0.4, face: -Math.PI / 2 + (R() - 0.5) * 0.5, seed: R() }); }
  const NF = fans.length, fanM = new THREE.MeshStandardMaterial({ roughness: 0.8 });
  const bodies = new THREE.InstancedMesh(bodyG, fanM, NF), heads = new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ roughness: 0.7 }), NF), arms = new THREE.InstancedMesh(armsG, new THREE.MeshStandardMaterial({ roughness: 0.75 }), NF);
  fans.forEach((f, i) => { const c = new THREE.Color(TOPS[Math.floor(f.seed * 997) % TOPS.length]); bodies.setColorAt(i, c); arms.setColorAt(i, c); heads.setColorAt(i, new THREE.Color(SK[Math.floor(f.seed * 113) % SK.length])); });
  for (const im of [bodies, heads, arms]) { im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; root.add(im); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), v = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1), s0 = new THREE.Vector3(0, 0, 0), s3 = new THREE.Vector3(), up = new THREE.Vector3();
  const info = { i: 0, theta: 0, row: 0, field: false, x: 0, z: 0, seed: 0 };
  function updateFans(t, f) {
    for (let i = 0; i < NF; i++) {
      const F = fans[i]; info.i = i; info.theta = F.theta; info.row = F.row; info.field = F.field; info.x = F.x; info.z = F.z; info.seed = F.seed;
      const o = f(info), y = F.y + (o.y || 0), sw = o.sway || 0;
      e.set(0, F.face, sw); q.setFromEuler(e);
      m4.compose(v.set(F.x, y + 0.48, F.z), q, s1); bodies.setMatrixAt(i, m4);
      up.set(0, 1, 0).applyQuaternion(q);
      m4.compose(v.set(F.x + up.x * 0.55, y + 0.48 + up.y * 0.55, F.z + up.z * 0.55), q, s1); heads.setMatrixAt(i, m4);
      const a = o.arms || 0;
      if (a > 0.02) { m4.compose(v.set(F.x + up.x * 0.25, y + 0.48 + up.y * 0.25, F.z + up.z * 0.25), q, s3.set(1, a, 1)); arms.setMatrixAt(i, m4); } else { m4.compose(v.set(F.x, -50, F.z), q, s0); arms.setMatrixAt(i, m4); }
    }
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = arms.instanceMatrix.needsUpdate = true;
  }

  // stage: deck + LED wall + truss + speaker stacks + beams
  const st = new THREE.Group(); st.position.set(DIMS.stageX, 0, 0); root.add(st);
  box(10, 2.0, 30, mat(0x1a1a1e, 0.6), -5, 1.0, 0, st);
  const scrCanvas = document.createElement('canvas'); scrCanvas.width = 512; scrCanvas.height = 192;
  const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace;
  const screen = mk(new THREE.PlaneGeometry(26, 9.75), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }), st, -9, 8.0, 0); screen.rotation.y = Math.PI / 2; screen.castShadow = false;
  function setScreen(t, beat = 0) {
    const g = scrCanvas.getContext('2d'), w = scrCanvas.width, h = scrCanvas.height, pulse = 0.65 + 0.35 * Math.exp(-((beat % 1) * 6));
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, `hsl(${(t * 40) % 360},85%,${45 * pulse}%)`); gr.addColorStop(1, `hsl(${(t * 40 + 140) % 360},85%,${50 * pulse}%)`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = `rgba(255,255,255,${0.25 * pulse})`; for (let i = 0; i < 12; i++) { const x = ((i * 47 + t * 120) % (w + 80)) - 40; g.fillRect(x, 0, 14, h); }
    scrTex.needsUpdate = true;
  }
  setScreen(0);
  const trussM = mat(0x8a8f96, 0.4, { metalness: 0.6 });
  box(1.0, 1.0, 34, trussM, -4, 14, 0, st); for (const z of [-16, 16]) box(1.0, 14, 1.0, trussM, -4, 7, z, st);
  for (const z of [-13, 13]) { const sp = new THREE.Group(); sp.position.set(-2, 2, z); st.add(sp); for (let k = 0; k < 4; k++) box(2.2, 1.4, 2.2, mat(0x141416, 0.7), 0, 0.7 + k * 1.45, 0, sp); }
  const beamM = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const beams = [];
  for (let k = 0; k < 8; k++) {
    const c = [0xff5fa2, 0x5ad1ff, 0xffd166, 0x9b7bff][k % 4], bg = new THREE.Group(); bg.position.set(-4, 13.4, -14 + k * 4); st.add(bg);
    const cone = mk(new THREE.ConeGeometry(2.6, 34, 20, 1, true), beamM(c), bg, 0, -17, 0); cone.castShadow = false;
    mk(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }), bg).castShadow = false;
    beams.push(bg);
  }
  // floodlight towers on the rim + two jumbotrons
  const flM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6e0).multiplyScalar(1.5), toneMapped: false });
  const rim = tread(N1 + N2 - 1);
  for (let k = 0; k < 6; k++) { const th = (k / 6) * Math.PI * 2 + 0.5, x = (rim.r + 2) * Math.cos(th), z = (rim.r + 2) * Math.sin(th) * (B / A); const tw = new THREE.Group(); tw.position.set(x, 0, z); tw.rotation.y = Math.atan2(-x, -z); root.add(tw); box(1.2, rim.y + 14, 1.2, trussM, 0, (rim.y + 14) / 2, 0, tw); const pnl = box(7, 4, 0.4, mat(0x2a2a2a, 0.5), 0, rim.y + 15, 0, tw); void pnl; for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) mk(new THREE.CircleGeometry(0.55, 12), flM, tw, -2.6 + a * 1.75, rim.y + 13.9 + b * 1.1, 0.25).castShadow = false; }
  const jumbo = canvasTex(256, 144, (g, w, h) => { g.fillStyle = '#101018'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd166'; g.font = 'bold 46px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DANCE', w / 2, 52); g.fillStyle = '#ff5fa2'; g.fillText('CAM', w / 2, 100); });
  for (const s of [-1, 1]) { const th = s * 0.7, x = (rim.r - 4) * Math.cos(th), z = (rim.r - 4) * Math.sin(th) * (B / A); const j = mk(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({ map: jumbo, toneMapped: false, side: THREE.DoubleSide }), root, x, rim.y + 8, z); j.rotation.y = Math.atan2(-x, -z); j.castShadow = false; }

  // light: dusk hemisphere + stage key toward the crowd (+x) + colored washes
  const hemi = new THREE.HemisphereLight(0xb8b0ff, 0x3a2a3a, 1.3); root.add(hemi);
  const key = new THREE.DirectionalLight(0xfff0e0, 2.2); key.position.set(DIMS.stageX - 6, 22, 6); key.target.position.set(0, 0, 0); root.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 2, far: 80 });
  const washes = [0xff5fa2, 0x5ad1ff, 0xffd166].map((c, k) => { const l = new THREE.PointLight(c, 120, 60, 1.6); l.position.set(DIMS.stageX + 4, 10, -12 + k * 12); root.add(l); return l; });
  return { root, D: DIMS, fog, fans, NF, updateFans, setScreen, beams, screen, lights: { hemi, key, washes } };
}
