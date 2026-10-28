// SET: a Las Vegas poker room — busy red-and-gold carpet, an oval poker table (green felt, padded rail, chip stacks, cards,
// a pot in the middle) under a big hanging lamp, low-backed stools so tails behind the players stay in view, a wall of slot
// machines with glowing screens, a neon "POKER" sign, a roulette table + a blackjack table in the background, velvet ropes on
// brass posts, a chandelier. Built for video 015; reusable for any casino / gambling / Vegas beat. Everything fictional.
//
// Coordinates (meters, y up): room x∈[-6,6], z∈[-5,4.5], ceiling 3.6. Poker table at the origin (long axis along x), felt top
// y = DIMS.top. Laid out for a VERTICAL frame: shoot from the +x end, high (≈ [4.4, 3.2, 0] → [-0.5, 0.6, 0]) so the table runs
// up the frame; the slot wall + neon are on the x=-6 wall behind the dealer. DIMS.seats = [x, z] stool positions for 5 players
// (face the table center), DIMS.dealer = [x, z] (far end, faces +x). Stool seat height DIMS.seat.
// Handles: stacks[i] (each seat's chip group), pot (group), cards (group), update(t) (slot screens + neon breathe gently).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = {
  top: 0.8, seat: 0.62, dealer: [-2.3, 0],
  seats: [[-1.3, -1.2], [-1.3, 1.2], [-0.25, -1.32], [-0.25, 1.32], [2.25, 0]],
};

export function buildCasino(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 77);
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);

  // shell: patterned carpet, dark walls with gold trim, ceiling
  const carpet = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#7a1a22'; g.fillRect(0, 0, w, h); const r = rng(5);
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = '#c9963a'; g.beginPath(); g.arc(x + 32, y + 32, 14, 0, 7); g.fill(); g.strokeStyle = '#2a4a6a'; g.lineWidth = 5; g.beginPath(); g.arc(x + 32, y + 32, 24, 0, 7); g.stroke(); g.fillStyle = '#e8c070'; g.fillRect(x, y, 6, 6); }
    for (let i = 0; i < 1600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,220,150,.06)' : 'rgba(0,0,0,.1)'; g.fillRect(r() * w, r() * h, 3, 3); }
  }, [6, 5]);
  const floor = mk(new THREE.PlaneGeometry(12, 9.5), new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 }), root, 0, 0, -0.25); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallM = mat(0x3a1a2a, 0.8), goldM = mat(0xd9a84a, 0.3, { metalness: 0.7 });
  box(12.2, 3.6, 0.12, wallM, 0, 1.8, -5.0); for (const s of [-1, 1]) box(0.12, 3.6, 9.5, wallM, s * 6.05, 1.8, -0.25);
  box(12.2, 0.08, 0.16, goldM, 0, 2.6, -4.92); box(0.16, 0.08, 9.5, goldM, -5.97, 2.6, -0.25); box(12.2, 0.1, 9.7, mat(0x1a0e14, 0.9), 0, 3.62, -0.25);
  // slot machines along the x=-6 wall (behind the dealer): cabinet, glowing screen (cherries / 7s / bars), a lit topper
  const sym = ['7', '🍒', 'BAR', '★', '$'];
  const screens = [];
  for (let k = 0; k < 7; k++) {
    const z = -3.9 + k * 1.3, g = new THREE.Group(); g.position.set(-5.5, 0, z); g.rotation.y = Math.PI / 2; root.add(g);
    rbox(0.95, 1.5, 0.75, 0.05, mat([0x2a2a4a, 0x4a1a2a, 0x1a3a4a][k % 3], 0.4, { metalness: 0.3 }), 0, 0.75, 0, g);
    rbox(0.95, 0.5, 0.6, 0.06, mat(0x1d1d24, 0.5), 0, 1.75, -0.05, g);
    const scrT = canvasTex(256, 160, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a2a6a'); gr.addColorStop(1, '#0a1030'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'middle'; for (let j = 0; j < 3; j++) { c.fillStyle = '#fff8e8'; c.fillRect(14 + j * 80, 30, 68, 100); c.fillStyle = ['#d2283f', '#2a8a3a', '#1d3a7a'][(j + k) % 3]; c.font = 'bold 48px Helvetica, Arial, sans-serif'; c.fillText(sym[(j * 2 + k) % 5], 48 + j * 80, 82); } });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.47), new THREE.MeshBasicMaterial({ map: scrT, toneMapped: false })); scr.position.set(0, 1.12, 0.38); g.add(scr); screens.push(scr);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.38), new THREE.MeshBasicMaterial({ color: new THREE.Color([0xffc040, 0xff5a8a, 0x5ad0ff][k % 3]).multiplyScalar(1.3), toneMapped: false })); top.position.set(0, 1.78, 0.26); g.add(top); top.userData.base = top.material.color.clone(); screens.push(top);
    box(0.95, 0.06, 0.3, goldM, 0, 0.82, 0.45, g); mk(new THREE.CylinderGeometry(0.2, 0.18, 0.62, 14), mat(0x8a1a2a, 0.6), g, 0, 0.31, 0.75);
  }
  // neon POKER sign on the back wall (above the slots)
  const neonT = canvasTex(512, 160, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 120px Helvetica, Arial, sans-serif'; g.shadowColor = '#ff3a6a'; g.shadowBlur = 28; g.fillStyle = '#ffd0e0'; g.fillText('POKER', w / 2, h / 2 + 6); });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), new THREE.MeshBasicMaterial({ map: neonT, transparent: true, toneMapped: false, depthWrite: false })); neon.position.set(-5.93, 2.95, 0); neon.rotation.y = Math.PI / 2; root.add(neon);
  // poker table: pedestal, oval felt, padded rail, chip stacks per seat, the pot, cards
  const T = new THREE.Group(); root.add(T);
  mk(new THREE.CylinderGeometry(0.35, 0.55, DIMS.top - 0.1, 18), mat(0x2a1a14, 0.5), T, 0, (DIMS.top - 0.1) / 2, 0).scale.set(2.0, 1, 1);
  const feltT = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#17643a'; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,240,200,.5)'; g.lineWidth = 4; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.36, h * 0.3, 0, 0, 7); g.stroke(); });
  const felt = mk(new THREE.CylinderGeometry(1, 1, 0.06, 48), new THREE.MeshStandardMaterial({ map: feltT, roughness: 0.95 }), T, 0, DIMS.top - 0.03, 0); felt.scale.set(1.75, 1, 1.05);
  const rail = mk(new THREE.TorusGeometry(1, 0.09, 12, 64), mat(0x2a1a14, 0.35), T, 0, DIMS.top + 0.01, 0); rail.rotation.x = Math.PI / 2; rail.scale.set(1.8, 1.1, 1);
  const chipC = [0xd2283f, 0x1d3a7a, 0x2a8a3a, 0x111111, 0xf4f1ea, 0xf2b632];
  const chipStack = (parent, x, z, n, c) => { const g = new THREE.Group(); g.position.set(x, DIMS.top, z); parent.add(g); for (let k = 0; k < n; k++) mk(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 14), mat(chipC[(c + (k > n / 2 ? 1 : 0)) % 6], 0.5), g, (R() - 0.5) * 0.004, 0.005 + k * 0.011, (R() - 0.5) * 0.004); return g; };
  const stacks = DIMS.seats.map(([sx, sz], i) => { const g = new THREE.Group(); T.add(g); const d = Math.hypot(sx / 1.75, sz / 1.05), ux = sx / d, uz = sz / d; for (let s = 0; s < 3; s++) chipStack(g, ux * 0.78 + (s - 1) * 0.08 * -Math.sign(uz || 1), uz * 0.78 + (s - 1) * 0.06, 5 + Math.floor(R() * 8), i + s); return g; });
  const pot = new THREE.Group(); T.add(pot); for (let s = 0; s < 7; s++) chipStack(pot, (R() - 0.5) * 0.45, (R() - 0.5) * 0.25, 4 + Math.floor(R() * 10), s);
  const cardT = canvasTex(64, 96, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#d2283f'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.fillText('A♥', w / 2, h / 2 + 12); });
  const backT = canvasTex(64, 96, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d3a7a'; g.fillRect(5, 5, w - 10, h - 10); g.strokeStyle = '#7a9ad8'; g.lineWidth = 2; for (let k = -h; k < w + h; k += 8) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); } });
  const cards = new THREE.Group(); T.add(cards);
  for (let k = 0; k < 5; k++) { const c = mk(new THREE.PlaneGeometry(0.07, 0.1), new THREE.MeshStandardMaterial({ map: cardT, roughness: 0.6 }), cards, -0.75, DIMS.top + 0.004, -0.2 + k * 0.1); c.rotation.set(-Math.PI / 2, 0, Math.PI / 2); }
  DIMS.seats.forEach(([sx, sz], i) => { const d = Math.hypot(sx / 1.75, sz / 1.05); for (let k = 0; k < 2; k++) { const c = mk(new THREE.PlaneGeometry(0.07, 0.1), new THREE.MeshStandardMaterial({ map: backT, roughness: 0.6 }), cards, sx / d * 0.62 + k * 0.04, DIMS.top + 0.005 + k * 0.001, sz / d * 0.62); c.rotation.set(-Math.PI / 2, 0, Math.atan2(sx, sz) + k * 0.2); } void i; });
  // stools (low backs) around the table + the dealer's
  const stoolM = mat(0x8a1a2a, 0.6);
  [...DIMS.seats, DIMS.dealer].forEach(([sx, sz]) => { const st = new THREE.Group(); st.position.set(sx, 0, sz); st.rotation.y = Math.atan2(-sx, -sz); root.add(st); mk(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 18), stoolM, st, 0, DIMS.seat - 0.04, 0); mk(new THREE.CylinderGeometry(0.035, 0.05, DIMS.seat - 0.08, 8), goldM, st, 0, (DIMS.seat - 0.08) / 2, 0); mk(new THREE.TorusGeometry(0.17, 0.012, 6, 18), goldM, st, 0, 0.25, 0).rotation.x = Math.PI / 2; });
  // hanging lamp over the table
  const lampG = new THREE.Group(); lampG.position.set(0, 2.45, 0); root.add(lampG);
  rbox(2.2, 0.16, 0.7, 0.05, mat(0x1d3a2a, 0.5), 0, 0, 0, lampG); for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.006, 0.006, 1.3, 4), mat(0x222222, 0.4), lampG, s * 0.9, 0.7, 0);
  const lampGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.55), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe2b0).multiplyScalar(1.6), toneMapped: false })); lampGlow.rotation.x = Math.PI / 2; lampGlow.position.y = -0.085; lampG.add(lampGlow);
  // background: roulette table (left), blackjack (right), velvet ropes, chandelier
  const rou = new THREE.Group(); rou.position.set(-4.0, 0, -2.6); rou.rotation.y = Math.PI / 2; root.add(rou);
  rbox(1.6, 0.8, 1.0, 0.05, mat(0x2a1a14, 0.5), 0, 0.4, 0, rou); box(1.5, 0.02, 0.9, mat(0x1f7a45, 0.9), 0, 0.81, 0, rou);
  const wheel = mk(new THREE.CylinderGeometry(0.32, 0.36, 0.1, 37), new THREE.MeshStandardMaterial({ roughness: 0.4, map: canvasTex(256, 32, (g, w, h) => { for (let k = 0; k < 37; k++) { g.fillStyle = k === 0 ? '#2a8a3a' : k % 2 ? '#d2283f' : '#111'; g.fillRect((k * w) / 37, 0, w / 37 + 1, h); } }) }), rou, -0.45, 0.87, 0);
  const bj = new THREE.Group(); bj.position.set(-4.0, 0, 2.6); bj.rotation.y = Math.PI / 2 + 0.3; root.add(bj);
  mk(new THREE.CylinderGeometry(0.9, 0.9, 0.06, 32, 1, false, 0, Math.PI), mat(0x1f6a8a, 0.9), bj, 0, 0.8, 0); mk(new THREE.CylinderGeometry(0.3, 0.4, 0.78, 14), mat(0x2a1a14, 0.5), bj, 0, 0.39, 0.3);
  const ropeM = mat(0x8a1a2a, 0.7);
  for (const [a, b] of [[[-3.2, 2.6], [-1.6, 3.2]], [[1.6, 3.2], [3.2, 2.6]], [[-3.2, 2.6], [-3.4, 0.6]], [[3.2, 2.6], [3.4, 0.6]]]) {
    for (const p of [a, b]) { mk(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 10), goldM, root, p[0], 0.45, p[1]); mk(new THREE.SphereGeometry(0.05, 10, 8), goldM, root, p[0], 0.92, p[1]); mk(new THREE.CylinderGeometry(0.14, 0.16, 0.04, 14), goldM, root, p[0], 0.02, p[1]); }
    const mid = new THREE.Vector3((a[0] + b[0]) / 2, 0.62, (a[1] + b[1]) / 2), curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a[0], 0.86, a[1]), mid, new THREE.Vector3(b[0], 0.86, b[1]));
    mk(new THREE.TubeGeometry(curve, 16, 0.025, 6), ropeM, root);
  }
  const chand = new THREE.Group(); chand.position.set(-3.6, 3.0, 0); root.add(chand);
  const crystalM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d0).multiplyScalar(1.5), toneMapped: false });
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; mk(new THREE.SphereGeometry(0.04, 8, 6), crystalM, chand, Math.cos(a) * 0.45, -0.2 - (k % 2) * 0.12, Math.sin(a) * 0.45).castShadow = false; }
  mk(new THREE.TorusGeometry(0.45, 0.02, 6, 28), goldM, chand, 0, -0.2, 0).rotation.x = Math.PI / 2;
  // lights: a warm pool on the felt (the hero), soft room fill, slot-wall glow
  const hemi = new THREE.HemisphereLight(0xffe0c8, 0x4a1a22, 1.0); root.add(hemi);
  const pool = new THREE.SpotLight(0xffe6c0, 42, 0, 0.8, 0.6, 1.2); pool.position.set(0, 2.35, 0.05); pool.target.position.set(0, 0.6, 0); root.add(pool, pool.target);
  pool.castShadow = true; pool.shadow.mapSize.set(2048, 2048); pool.shadow.bias = -0.0005;
  const key = new THREE.SpotLight(0xfff0e0, 55, 0, 0.7, 0.5, 1.3); key.position.set(4.2, 3.0, 1.0); key.target.position.set(-0.6, 0.9, 0); root.add(key, key.target);
  const slotL = new THREE.PointLight(0x9a7aff, 5, 6, 1.6); slotL.position.set(-4.4, 1.6, 0); root.add(slotL);
  const neonL = new THREE.PointLight(0xff4a7a, 3, 5, 1.6); neonL.position.set(-5.3, 2.9, 0); root.add(neonL);
  const chL = new THREE.PointLight(0xffd9a0, 3, 5, 1.6); chL.position.set(-3.6, 2.6, 0); root.add(chL);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });
  // gentle life: the slot toppers breathe slowly (no flashing), the roulette wheel turns
  function update(t) { screens.forEach((s, i) => { if (i % 2) s.material.color.copy(s.userData.base).multiplyScalar(0.9 + 0.1 * Math.sin(t * 1.6 + i)); }); wheel.rotation.y = t * 1.4; }
  return { root, D: DIMS, table: T, stacks, pot, cards, update, lights: { hemi, pool, key } };
}
