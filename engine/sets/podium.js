// SET: a presidential press-briefing room — blue backdrop with a (fictional) seal, two flags, a wooden lectern with goose-neck mics,
// teleprompter panes, stage lights, a TV camera on a tripod (red tally light), and rows of reporters' chairs. Camera flashes are
// built in (setFlashes) — instant drama. Built for video 012; reusable for any "live on TV" beat. All generic / fictional.
//
// Coordinates (meters, y up). Room x∈[-5,5], z∈[-4,6], ceiling 3.4. Backdrop at z=-4. Lectern at DIMS.lectern (stands at z=-2.6,
// the speaker stands behind it at z=-3.05 facing +z). Press rows: DIMS.rows (z) × DIMS.seats (x); reporters face −z.
// Handles: setFlashes(t, rate) (deterministic photo flashes from the press rows), tally, lights.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = { lectern: [0, -2.6], speaker: [0, -3.1], rows: [0.6, 1.5, 2.4, 3.3], seats: [-2.6, -1.8, -1.0, 1.0, 1.8, 2.6] };

export function buildPodium(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 3);
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);

  // shell: carpet, side walls, ceiling
  const carpet = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5a1f2a'; g.fillRect(0, 0, w, h); const r = rng(1); for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.08)'; g.fillRect(r() * w, r() * h, 3, 3); } }, [5, 5]);
  const floor = mk(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 }), root, 0, 0, 1); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallM = mat(0xe9e2d2, 0.9);
  box(0.12, 3.4, 10, wallM, -5.06, 1.7, 1); box(0.12, 3.4, 10, wallM, 5.06, 1.7, 1); box(10.2, 0.1, 10.2, mat(0xf2efe8, 0.95), 0, 3.45, 1);
  // stage riser + backdrop (blue panels with a fictional seal + "PRESS BRIEFING" plaque)
  rbox(5.2, 0.25, 2.4, 0.03, mat(0x3a2a22, 0.6), 0, 0.125, -2.9);
  const blue = canvasTex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1c3a6e'); gr.addColorStop(1, '#12284e'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 6; for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.4), new THREE.MeshStandardMaterial({ map: blue, roughness: 0.7 })); back.position.set(0, 1.7, -4); root.add(back);
  const sealTex = canvasTex(512, 512, (g, w) => {
    const c = w / 2; g.fillStyle = '#e8c76a'; g.beginPath(); g.arc(c, c, 250, 0, 7); g.fill(); g.fillStyle = '#1c3a6e'; g.beginPath(); g.arc(c, c, 228, 0, 7); g.fill();
    g.fillStyle = '#f4efe2'; g.beginPath(); g.arc(c, c, 160, 0, 7); g.fill(); g.fillStyle = '#e8c76a';
    for (let i = 0; i < 13; i++) { const a = (i / 13) * Math.PI * 2 - Math.PI / 2; star(g, c + Math.cos(a) * 196, c + Math.sin(a) * 196, 12); }
    star(g, c, c - 20, 70); g.fillStyle = '#1c3a6e'; g.font = 'bold 40px Georgia, serif'; g.textAlign = 'center'; g.fillText('OFFICE OF THE', c, c + 80); g.fillText('PRESIDENT', c, c + 122);
  });
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.85, 48), new THREE.MeshStandardMaterial({ map: sealTex, roughness: 0.5 })); seal.position.set(0, 2.45, -3.98); root.add(seal);
  // two generic flags on poles (blue field + a gold star) with gold finials
  for (const s of [-1, 1]) {
    mk(new THREE.CylinderGeometry(0.025, 0.025, 2.8, 8), mat(0xc9a25a, 0.3, { metalness: 0.7 }), root, s * 2.2, 1.65, -3.6);
    mk(new THREE.SphereGeometry(0.06, 10, 8), mat(0xe8c76a, 0.3, { metalness: 0.7 }), root, s * 2.2, 3.08, -3.6);
    const fl = mk(new THREE.PlaneGeometry(0.7, 1.4, 6, 10), new THREE.MeshStandardMaterial({ map: canvasTex(128, 256, (g, w, h) => { g.fillStyle = s < 0 ? '#1c3a6e' : '#b5462e'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8c76a'; star(g, w / 2, h * 0.3, 30); for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#f4efe2' : 'rgba(0,0,0,0)'; g.fillRect(0, h * 0.55 + i * 22, w, 22); } }), roughness: 0.8, side: THREE.DoubleSide }), root, s * 2.2 + 0.36 * s * -1, 2.2, -3.58);
    const fp = fl.geometry.attributes.position; for (let i = 0; i < fp.count; i++) fp.setZ(i, 0.06 * Math.sin(fp.getY(i) * 5 + fp.getX(i) * 6)); fl.geometry.computeVertexNormals();
  }
  // lectern + seal plaque + mics + water glass
  const [lx, lz] = DIMS.lectern, wood = mat(0x7d4a2a, 0.5);
  rbox(0.8, 1.15, 0.5, 0.04, wood, lx, 0.25 + 0.575, lz);
  const top = rbox(0.9, 0.06, 0.62, 0.02, wood, lx, 1.42, lz - 0.04); top.rotation.x = 0.18;
  const plaque = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshStandardMaterial({ map: sealTex, roughness: 0.5 })); plaque.position.set(lx, 0.95, lz + 0.26); root.add(plaque);
  for (const s of [-1, 1]) { const m = mk(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 6), mat(0x222222, 0.4), root, lx + s * 0.09, 1.6, lz + 0.18); m.rotation.x = 0.6; m.rotation.z = -s * 0.25; mk(new THREE.SphereGeometry(0.025, 10, 8), mat(0x111111, 0.6), root, lx + s * 0.14, 1.75, lz + 0.3); }
  mk(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 12), mat(0xcfe6f5, 0.05, { transparent: true, opacity: 0.5 }), root, lx + 0.32, 1.52, lz - 0.1);
  for (const s of [-1, 1]) { mk(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 6), mat(0x222222, 0.4), root, lx + s * 1.05, 0.9, lz + 0.2); const pane = mk(new THREE.PlaneGeometry(0.4, 0.32), new THREE.MeshStandardMaterial({ color: 0x9fc6e0, roughness: 0.05, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), root, lx + s * 1.05, 1.65, lz + 0.2); pane.rotation.y = s * -0.6; pane.rotation.x = -0.3; }
  // press chairs + a TV camera on a tripod (red tally light) at the back
  const chairM = mat(0x2a2d31, 0.6);
  for (const z of DIMS.rows) for (const x of DIMS.seats) { rbox(0.46, 0.06, 0.44, 0.02, chairM, x, 0.45, z); rbox(0.46, 0.5, 0.05, 0.02, chairM, x, 0.72, z + 0.22); for (const [a, b] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) box(0.03, 0.45, 0.03, mat(0x8a8f96, 0.4), x + a, 0.225, z + b); }
  const cam = new THREE.Group(); cam.position.set(3.6, 0, 4.4); cam.rotation.y = 0.5; root.add(cam);
  for (let k = 0; k < 3; k++) { const l = mk(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6), mat(0x222222, 0.5), cam, Math.cos(k * 2.1) * 0.25, 0.7, Math.sin(k * 2.1) * 0.25); l.rotation.set(Math.sin(k * 2.1) * 0.3, 0, -Math.cos(k * 2.1) * 0.3); }
  rbox(0.35, 0.3, 0.6, 0.04, mat(0x1d1d22, 0.5), 0, 1.6, 0, cam); mk(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 14), mat(0x111111, 0.3), cam, 0, 1.6, -0.42).rotation.x = Math.PI / 2;
  const tallyM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a20).multiplyScalar(2), toneMapped: false }); const tally = mk(new THREE.SphereGeometry(0.03, 8, 6), tallyM, cam, 0, 1.8, -0.2);
  // press cameras: 12 flash points over the rows (a bright sprite + a light that pops)
  const flashTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(230,240,255,.8)'); gr.addColorStop(1, 'rgba(200,220,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const flashes = Array.from({ length: 12 }, (_, i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    sp.position.set(DIMS.seats[i % 6] + (R() - 0.5) * 0.3, 1.55 + R() * 0.4, DIMS.rows[i % 4] - 0.25); sp.scale.setScalar(0.9); root.add(sp);
    return { sp, ph: R() * 10, rate: 0.6 + R() * 0.8 };
  });
  const flashLight = new THREE.PointLight(0xe6f0ff, 0, 9, 1.6); flashLight.position.set(0, 2.0, 0.8); root.add(flashLight);
  function setFlashes(t, rate = 1) {
    let sum = 0;
    flashes.forEach((f) => { const u = (t * f.rate * rate + f.ph) % 1, k = u < 0.06 ? 1 - u / 0.06 : 0; f.sp.material.opacity = k; sum += k; });
    flashLight.intensity = 18 * Math.min(1.5, sum);
  }
  setFlashes(0, 0);
  // lights: stage key from the front, backdrop wash, room fill
  const hemi = new THREE.HemisphereLight(0xfff4e6, 0x4a3a3a, 0.9); root.add(hemi);
  const key = new THREE.SpotLight(0xfff0dc, 60, 0, 0.5, 0.4, 1.4); key.position.set(0.6, 3.3, 2.0); key.target.position.set(0, 1.3, -3.0); root.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  const wash = new THREE.PointLight(0x9fb8ff, 6, 6, 1.6); wash.position.set(0, 3.0, -3.2); root.add(wash);
  const fill = new THREE.PointLight(0xffe8d0, 5, 10, 1.4); fill.position.set(-2.5, 2.6, 2.5); root.add(fill);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });
  void tally;
  return { root, D: DIMS, setFlashes, tallyM, lights: { hemi, key, wash, fill } };
}
function star(g, x, y, r) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5 - Math.PI / 2, rr = k % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
