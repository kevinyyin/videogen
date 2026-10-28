// SET: a sunny wood-paneled courtroom — a raised judge's bench with a gavel (animatable) + sound block + nameplate, a fictional
// court seal and two flags behind it, a witness stand, the defense + prosecution tables, a jury box (2 rows × 4 seats), a bar
// railing, gallery benches, tall windows with daylight, pendant globes, a clock, a court reporter's desk. Built for video 015;
// reusable for any trial / judge / verdict beat. Everything generic / fictional.
//
// Coordinates (meters, y up): room x∈[-5,5], z∈[-4.6,5], ceiling 4.2. The judge sits at DIMS.judge (on a platform, root y =
// DIMS.judgeFloor) facing +z behind the bench (top at DIMS.benchTop). Defense table at DIMS.defense (two chairs at z+0.55 facing
// −z), prosecution at DIMS.prosecution. Jury seats DIMS.jury[] = [x, z, floorY] facing +x. Gallery benches at DIMS.gallery (z),
// facing −z, seat DIMS.seat. Handles: gavel (group: pivot at the handle end; rotate .rotation.x to strike), lights.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = {
  judge: [0, -3.55], judgeFloor: 0.55, benchTop: 1.62, defense: [-1.15, -0.45], prosecution: [1.15, -0.45], tableTop: 0.76, seat: 0.46,
  jury: [[-3.7, -2.6, 0], [-3.7, -1.9, 0], [-3.7, -1.2, 0], [-3.7, -0.5, 0], [-4.3, -2.6, 0.3], [-4.3, -1.9, 0.3], [-4.3, -1.2, 0.3], [-4.3, -0.5, 0.3]],
  gallery: [1.6, 2.5, 3.4], witness: [1.95, -2.75],
};

export function buildCourtroom(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 12);
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);

  // shell: parquet floor, wainscot + cream walls, coffered ceiling
  const parq = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#9a6a42'; g.fillRect(0, 0, w, h); const r = rng(3); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { const v = ((x + y) / 64) % 2; for (let k = 0; k < 4; k++) { g.fillStyle = `hsl(${26 + r() * 6},${40 + r() * 8}%,${34 + r() * 9}%)`; if (v) g.fillRect(x + k * 16 + 1, y + 1, 14, 62); else g.fillRect(x + 1, y + k * 16 + 1, 62, 14); } } }, [5, 5]);
  const floor = mk(new THREE.PlaneGeometry(10, 9.6), new THREE.MeshStandardMaterial({ map: parq, roughness: 0.5 }), root, 0, 0, 0.2); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const darkW = mat(0x5a3420, 0.55), midW = mat(0x7a4a2a, 0.5), cream = mat(0xf0e6d2, 0.9), goldM = mat(0xd9a84a, 0.3, { metalness: 0.7 });
  box(10.2, 1.3, 0.12, darkW, 0, 0.65, -4.6); box(10.2, 2.9, 0.12, cream, 0, 2.75, -4.6);
  for (const s of [-1, 1]) { box(0.12, 1.3, 9.6, darkW, s * 5.05, 0.65, 0.2); box(0.12, 2.9, 9.6, cream, s * 5.05, 2.75, 0.2); }
  for (let x = -4.5; x <= 4.5; x += 1.0) box(0.06, 1.2, 0.04, mat(0x4a2a18, 0.5), x, 0.62, -4.53);
  box(10.2, 0.1, 9.8, mat(0xf4efe4, 0.95), 0, 4.2, 0.2); for (let x = -4; x <= 4; x += 2) box(0.18, 0.2, 9.6, mat(0xe6dcc8, 0.9), x, 4.1, 0.2);
  // back wall (z = 5): wainscot + cream, double doors with round windows, a clock above them, a bulletin board
  box(10.2, 1.3, 0.12, darkW, 0, 0.65, 5.05); box(10.2, 2.9, 0.12, cream, 0, 2.75, 5.05);
  for (const s of [-1, 1]) { const d = rbox(0.85, 2.3, 0.08, 0.02, midW, s * 0.45, 1.15, 4.97); void d; const w = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshBasicMaterial({ color: 0xdcecf8, toneMapped: false })); w.position.set(s * 0.45, 1.65, 4.92); w.rotation.y = Math.PI; root.add(w); mk(new THREE.BoxGeometry(0.04, 0.3, 0.06), goldM, root, s * 0.1, 1.1, 4.92); }
  box(2.1, 0.12, 0.1, darkW, 0, 2.36, 4.96);
  const bclk = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(128, 128, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#2a1a14'; g.lineWidth = 7; g.stroke(); g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 28); g.stroke(); g.beginPath(); g.moveTo(64, 64); g.lineTo(40, 70); g.stroke(); }) }));
  bclk.position.set(0, 3.0, 4.98); bclk.rotation.y = Math.PI; root.add(bclk);
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(240, 160, (g, w, h) => { g.fillStyle = '#b8895a'; g.fillRect(0, 0, w, h); const r = rng(5); for (let k = 0; k < 7; k++) { g.fillStyle = ['#fffdf2', '#f6e88a', '#cfe6f5', '#f4c6d6'][k % 4]; g.fillRect(10 + r() * (w - 60), 10 + r() * (h - 60), 44, 50); } }) }));
  bb.position.set(-2.6, 1.7, 4.98); bb.rotation.y = Math.PI; root.add(bb);
  for (const x of [2.4, 3.6]) { const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshStandardMaterial({ roughness: 0.7, color: 0x6a8aa8 })); fr.position.set(x, 1.9, 4.98); fr.rotation.y = Math.PI; root.add(fr); }
  // windows on the right wall (daylight), each with a bright sky pane
  const skyM = new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(64, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8fc4f2'); gr.addColorStop(1, '#e6f2fa'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(20, 40, 14, 0, 7); g.arc(36, 36, 16, 0, 7); g.fill(); }) });
  for (const z of [-2.8, -0.6, 1.6, 3.8]) { const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.0), skyM); pane.position.set(4.98, 2.4, z); pane.rotation.y = -Math.PI / 2; root.add(pane); box(0.12, 0.1, 1.3, midW, 4.95, 3.43, z); box(0.18, 0.1, 1.3, midW, 4.93, 1.37, z); for (const e of [-1, 1]) box(0.12, 2.1, 0.08, midW, 4.95, 2.4, z + e * 0.6); box(0.1, 2.0, 0.06, darkW, 4.94, 2.4, z); box(0.1, 0.06, 1.1, darkW, 4.94, 2.4, z); }
  // seal + flags + the judge's raised bench
  const sealT = canvasTex(512, 512, (g, w) => { const c = w / 2; g.fillStyle = '#c9a25a'; g.beginPath(); g.arc(c, c, 250, 0, 7); g.fill(); g.fillStyle = '#2a3a5a'; g.beginPath(); g.arc(c, c, 226, 0, 7); g.fill(); g.fillStyle = '#f4efe2'; g.beginPath(); g.arc(c, c, 160, 0, 7); g.fill(); g.fillStyle = '#c9a25a'; g.font = 'bold 44px Georgia, serif'; g.textAlign = 'center'; g.fillText('SUPERIOR COURT', c, 60 + 0); g.fillStyle = '#2a3a5a'; g.font = 'bold 120px Georgia, serif'; g.fillText('⚖', c, c + 45); });
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.75, 48), new THREE.MeshStandardMaterial({ map: sealT, roughness: 0.5 })); seal.position.set(0, 3.15, -4.52); root.add(seal);
  const flags = [];
  for (const s of [-1, 1]) {
    mk(new THREE.CylinderGeometry(0.025, 0.025, 2.9, 8), goldM, root, s * 1.75, 1.45 + 0.55, -4.25);
    mk(new THREE.SphereGeometry(0.06, 10, 8), goldM, root, s * 1.75, 3.5, -4.25);
    const fl = mk(new THREE.PlaneGeometry(0.75, 1.35, 6, 10), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, map: canvasTex(128, 256, (g, w, h) => { g.fillStyle = s < 0 ? '#2a3a6a' : '#7a2a2a'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8c76a'; g.beginPath(); g.arc(w / 2, h * 0.32, 26, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 4; i++) g.fillRect(0, h * 0.6 + i * 20, w, 8); }) }), root, s * 1.75 - s * 0.39, 2.75, -4.23);
    const fp = fl.geometry.attributes.position; for (let i = 0; i < fp.count; i++) fp.setZ(i, 0.05 * Math.sin(fp.getY(i) * 5 + fp.getX(i) * 6)); fl.geometry.computeVertexNormals(); flags.push(fl);
  }
  const [jx, jz] = DIMS.judge;
  rbox(4.4, DIMS.judgeFloor, 1.8, 0.03, darkW, jx, DIMS.judgeFloor / 2, jz + 0.1);
  rbox(3.4, DIMS.benchTop, 0.6, 0.04, midW, jx, DIMS.benchTop / 2, jz + 0.75);
  rbox(3.6, 0.08, 0.8, 0.03, darkW, jx, DIMS.benchTop + 0.04, jz + 0.65);
  for (let k = -1; k <= 1; k++) rbox(0.9, 0.9, 0.04, 0.02, darkW, jx + k * 1.05, DIMS.benchTop * 0.5, jz + 1.06);
  const chairB = new THREE.Group(); chairB.position.set(jx, DIMS.judgeFloor, jz - 0.15); root.add(chairB);
  rbox(0.6, 0.12, 0.55, 0.04, mat(0x2a1a14, 0.4), 0, 0.5, 0, chairB); rbox(0.62, 1.05, 0.12, 0.05, mat(0x2a1a14, 0.4), 0, 1.0, -0.26, chairB);
  const npT = canvasTex(256, 48, (g, w, h) => { g.fillStyle = '#c9a25a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1d22'; g.font = 'bold 26px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('THE HON. JUDGE', w / 2, h / 2 + 1); });
  const np = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.12), new THREE.MeshStandardMaterial({ map: npT, roughness: 0.3, metalness: 0.4 })); np.position.set(jx + 0.75, DIMS.benchTop + 0.14, jz + 1.0); np.rotation.x = -0.3; root.add(np);
  // gavel + sound block (pivot at the handle end so .rotation.x swings the head down onto the block)
  mk(new THREE.CylinderGeometry(0.09, 0.1, 0.05, 20), midW, root, jx - 0.55, DIMS.benchTop + 0.105, jz + 0.75);
  const gavel = new THREE.Group(); gavel.position.set(jx - 0.55, DIMS.benchTop + 0.14, jz + 0.42); root.add(gavel);
  mk(new THREE.CylinderGeometry(0.014, 0.016, 0.3, 8), midW, gavel, 0, 0.0, 0.15).rotation.x = Math.PI / 2;
  const head = mk(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 14), darkW, gavel, 0, 0.0, 0.32); head.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.047, 0.047, 0.02, 14), goldM, gavel, s * 0.06, 0, 0.32).rotation.z = Math.PI / 2;
  // witness stand + court reporter
  const [wx, wz] = DIMS.witness; rbox(1.0, 0.25, 1.0, 0.02, darkW, wx, 0.125, wz); rbox(1.0, 1.05, 0.08, 0.02, midW, wx, 0.78, wz + 0.48); for (const s of [-1, 1]) rbox(0.08, 1.05, 1.0, 0.02, midW, wx + s * 0.48, 0.78, wz);
  mk(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 4), mat(0x222222, 0.4), root, wx - 0.2, 1.42, wz + 0.45).rotation.x = 0.5;
  rbox(0.9, 0.75, 0.55, 0.03, midW, -1.9, 0.375, -2.6);
  // counsel tables with chairs, papers, legal pads, water pitchers
  const tableAt = ([x, z]) => {
    rbox(1.7, 0.06, 0.8, 0.02, midW, x, DIMS.tableTop - 0.03, z); box(1.6, 0.66, 0.04, darkW, x, 0.38, z - 0.35); for (const s of [-1, 1]) box(0.05, 0.72, 0.75, darkW, x + s * 0.8, 0.36, z);
    for (let k = 0; k < 3; k++) box(0.21, 0.004, 0.297, mat(k === 1 ? 0xf6e88a : 0xffffff, 0.8), x - 0.5 + k * 0.42, DIMS.tableTop + 0.003, z + 0.05).rotation.y = (R() - 0.5) * 0.3;
    mk(new THREE.CylinderGeometry(0.06, 0.05, 0.2, 14), mat(0xcfe6f5, 0.05, { transparent: true, opacity: 0.5 }), root, x + 0.62, DIMS.tableTop + 0.1, z - 0.15);
    for (const s of [-1, 1]) { const c = new THREE.Group(); c.position.set(x + s * 0.42, 0, z + 0.62); c.rotation.y = Math.PI; root.add(c); rbox(0.5, 0.07, 0.48, 0.03, mat(0x2a1a14, 0.5), 0, DIMS.seat - 0.035, 0, c); rbox(0.5, 0.36, 0.06, 0.03, mat(0x2a1a14, 0.5), 0, DIMS.seat + 0.22, -0.23, c); for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(0.04, DIMS.seat - 0.07, 0.04, midW, a, (DIMS.seat - 0.07) / 2, b, c); }
  };
  tableAt(DIMS.defense); tableAt(DIMS.prosecution);
  // jury box: a two-tier platform with a front rail, seats facing +x
  rbox(1.6, 0.3, 3.0, 0.02, darkW, -4.3, 0.15, -1.55); rbox(0.08, 0.95, 3.0, 0.02, midW, -3.25, 0.48, -1.55); rbox(1.9, 0.95, 0.08, 0.02, midW, -4.1, 0.48, 0.0);
  DIMS.jury.forEach(([x, z, y]) => { const c = new THREE.Group(); c.position.set(x - 0.08, y, z); c.rotation.y = Math.PI / 2; root.add(c); rbox(0.5, 0.07, 0.46, 0.03, mat(0x2f4a3a, 0.6), 0, DIMS.seat - 0.035, 0, c); rbox(0.5, 0.42, 0.06, 0.03, mat(0x2f4a3a, 0.6), 0, DIMS.seat + 0.25, -0.22, c); });
  // the bar (a low railing with a gate) + gallery benches
  for (const s of [-1, 1]) { rbox(4.2, 0.08, 0.1, 0.02, midW, s * 2.75, 0.92, 0.9); for (let k = 0; k < 9; k++) mk(new THREE.CylinderGeometry(0.025, 0.025, 0.86, 8), midW, root, s * (0.75 + k * 0.5), 0.45, 0.9); }
  DIMS.gallery.forEach((z) => { for (const s of [-1, 1]) { rbox(3.6, 0.07, 0.46, 0.02, midW, s * 2.65, DIMS.seat - 0.035, z); rbox(3.6, 0.55, 0.06, 0.02, midW, s * 2.65, DIMS.seat + 0.3, z + 0.24); for (const xx of [0.95, 2.65, 4.35]) box(0.06, DIMS.seat - 0.07, 0.4, darkW, s * xx, (DIMS.seat - 0.07) / 2, z); } });
  // pendant globes, clock, plants, a "SILENCE" sign
  const globeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d8).multiplyScalar(1.4), toneMapped: false });
  for (const [x, z] of [[-2.5, -1.5], [2.5, -1.5], [-2.5, 2.2], [2.5, 2.2], [0, 0.6]]) { mk(new THREE.CylinderGeometry(0.008, 0.008, 1.0, 4), mat(0x222222, 0.4), root, x, 3.7, z); mk(new THREE.SphereGeometry(0.2, 16, 12), globeM, root, x, 3.15, z).castShadow = false; }
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.25, 32), new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(128, 128, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#2a1a14'; g.lineWidth = 7; g.stroke(); g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 26); g.stroke(); g.beginPath(); g.moveTo(64, 64); g.lineTo(90, 64); g.stroke(); }) })); clock.position.set(-4.98, 3.0, 2.0); clock.rotation.y = Math.PI / 2; root.add(clock);
  const silT = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#2a1a14'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8d8b0'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SILENCE', w / 2, h / 2 + 2); });
  const sil = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshStandardMaterial({ map: silT, roughness: 0.5 })); sil.position.set(-4.98, 2.3, -3.2); sil.rotation.y = Math.PI / 2; root.add(sil);
  for (const [x, z] of [[-4.5, -4.1], [4.5, -4.1]]) { const p = new THREE.Group(); p.position.set(x, 0, z); root.add(p); mk(new THREE.CylinderGeometry(0.22, 0.17, 0.42, 14), mat(0xc9a25a, 0.4, { metalness: 0.4 }), p, 0, 0.21, 0); for (let k = 0; k < 10; k++) { const lf = mk(new THREE.SphereGeometry(0.22, 10, 8), mat(k % 2 ? 0x3f7a3a : 0x4f8a42, 0.8), p, Math.sin(k * 2.4) * 0.18, 0.7 + (k % 4) * 0.2, Math.cos(k * 2.4) * 0.18); lf.scale.set(0.45, 1.6, 0.25); lf.rotation.z = Math.sin(k) * 0.6; } }
  // lights: bright daylight through the windows + warm globes + a key on the defense table
  const hemi = new THREE.HemisphereLight(0xfff6e8, 0x6a4a32, 1.3); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.2); sun.position.set(9, 6, 1); sun.target.position.set(-1, 0, -1); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 }); sun.shadow.bias = -0.0005;
  const key = new THREE.SpotLight(0xfff0dc, 55, 0, 0.75, 0.5, 1.3); key.position.set(0.8, 3.6, 3.2); key.target.position.set(-0.4, 0.9, -1.8); root.add(key, key.target);
  const benchL = new THREE.PointLight(0xffe6c8, 4, 6, 1.5); benchL.position.set(0, 2.9, -2.4); root.add(benchL);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });
  return { root, D: DIMS, gavel, flags, lights: { hemi, sun, key, benchL } };
}
