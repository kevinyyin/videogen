// SET: a bright 24-hour laundromat — a long wall of front-load washers (bottom) + dryers (top) with round glass doors and tumbling
// clothes, a folding table with baskets + detergent, a row of plastic chairs, a vending machine, a neon OPEN 24H sign, posters,
// checker floor, fluorescent panels. Built for video 012. update(t, spin) tumbles every drum (spin 0..1).
// Coordinates: room x∈[-4.5,4.5], z∈[-3,3], ceiling 3.0. Machines along z=-3 (front faces at z≈-2.35), x from -4 to 4 (DIMS.machines).
// Chairs at DIMS.chairs (seat 0.45, facing −z, toward the machines).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = { machines: [-3.6, -2.7, -1.8, -0.9, 0.0, 0.9, 1.8, 2.7, 3.6], chairs: [-2.8, -2.1, -1.4, -0.7, 0.0, 0.7, 1.4], chairZ: 0.9, seat: 0.45 };

export function buildLaundromat(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 14);
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);
  const fTex = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#f2efe8' : '#3f6a8a'; g.fillRect(x * 64, y * 64, 64, 64); } }, [9, 6]);
  const floor = mk(new THREE.PlaneGeometry(9, 6), new THREE.MeshStandardMaterial({ map: fTex, roughness: 0.35 }), root); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallM = mat(0xf6e9c8, 0.9);
  box(9.2, 3.0, 0.12, wallM, 0, 1.5, -3.06); box(0.12, 3.0, 6, wallM, -4.56, 1.5, 0); box(0.12, 3.0, 6, wallM, 4.56, 1.5, 0); box(9.3, 0.1, 6.2, mat(0xf4f2ee, 0.95), 0, 3.05, 0);
  // machines: white body, chrome-rim glass door, a drum of tumbling clothes behind it
  const body = mat(0xf2f2ee, 0.35), chrome = mat(0xc9ccd0, 0.2, { metalness: 0.8 }), glass = new THREE.MeshStandardMaterial({ color: 0xbfe0f0, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false });
  const clothC = [0xd2483f, 0x3d7bd9, 0xf2b632, 0x58b368, 0xe58fa6, 0xf4f1ea, 0x2f4f73, 0x8f6fb8];
  const drums = [];
  for (const x of DIMS.machines) for (const [y, kind] of [[0.55, 'wash'], [1.5, 'dry']]) {
    rbox(0.82, 0.9, 0.7, 0.04, body, x, y, -2.7);
    mk(new THREE.TorusGeometry(0.26, 0.03, 10, 28), chrome, root, x, y, -2.34);
    const gl = mk(new THREE.CircleGeometry(0.26, 28), glass, root, x, y, -2.33); gl.castShadow = false;
    const back = mk(new THREE.CircleGeometry(0.26, 28), mat(kind === 'wash' ? 0x7fb8d8 : 0x3a3d42, 0.6), root, x, y, -2.5);
    const drum = new THREE.Group(); drum.position.set(x, y, -2.42); root.add(drum);
    for (let k = 0; k < 6; k++) { const c = mk(new THREE.SphereGeometry(0.07 + R() * 0.04, 8, 6), mat(clothC[Math.floor(R() * clothC.length)], 0.9), drum, Math.cos(k * 1.05) * 0.15, Math.sin(k * 1.05) * 0.15, 0); c.scale.set(1.4, 0.8, 0.7); }
    if (kind === 'wash') { const foam = mk(new THREE.CircleGeometry(0.25, 24, Math.PI, Math.PI), mat(0xffffff, 0.9, { transparent: true, opacity: 0.6 }), root, x, y - 0.02, -2.41); foam.castShadow = false; }
    box(0.5, 0.08, 0.02, mat(0x3a3d42, 0.4), x, y + 0.37, -2.34); const led = mk(new THREE.PlaneGeometry(0.12, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3dff9a).multiplyScalar(1.5), toneMapped: false }), root, x + 0.15, y + 0.37, -2.33);
    drums.push({ drum, dir: kind === 'wash' ? 1 : -1, sp: 0.8 + R() * 0.6 });
    void back; void led;
  }
  // folding table + baskets + detergent; chairs; vending machine; neon; posters
  rbox(2.4, 0.06, 0.8, 0.02, mat(0xe9e2d2, 0.4), 2.6, 0.86, 2.3); for (const [a, b] of [[-1.1, -0.3], [1.1, -0.3], [-1.1, 0.3], [1.1, 0.3]]) box(0.04, 0.85, 0.04, chrome, 2.6 + a, 0.43, 2.3 + b);
  for (const [x, c] of [[1.9, 0x3d7bd9], [3.1, 0xe58fa6]]) { mk(new THREE.CylinderGeometry(0.26, 0.2, 0.32, 14, 1, true), mat(c, 0.6, { side: THREE.DoubleSide }), root, x, 1.05, 2.3); for (let k = 0; k < 3; k++) mk(new THREE.SphereGeometry(0.12, 10, 8), mat(clothC[(k + 2) % 8], 0.9), root, x + (k - 1) * 0.1, 1.18, 2.3); }
  for (let k = 0; k < 3; k++) { rbox(0.14, 0.26, 0.09, 0.02, mat([0xf08a4b, 0x3d7bd9, 0x58b368][k], 0.4), 3.6 + k * 0.17, 1.02, 2.15); }
  for (const x of DIMS.chairs) { const c = new THREE.Group(); c.position.set(x, 0, DIMS.chairZ); c.rotation.y = Math.PI; root.add(c); rbox(0.46, 0.05, 0.44, 0.02, mat(0xf2b632, 0.5), 0, DIMS.seat, 0, c); rbox(0.46, 0.42, 0.05, 0.02, mat(0xf2b632, 0.5), 0, 0.72, -0.21, c); for (const [a, b] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) box(0.025, 0.45, 0.025, chrome, a, 0.225, b, c); }
  const vm = new THREE.Group(); vm.position.set(-4.0, 0, 2.2); vm.rotation.y = Math.PI / 2; root.add(vm);
  rbox(1.0, 1.9, 0.8, 0.04, mat(0xd2483f, 0.4), 0, 0.95, 0, vm); const vg = mk(new THREE.PlaneGeometry(0.6, 1.1), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(128, 220, (g, w, h) => { g.fillStyle = '#1d2a38'; g.fillRect(0, 0, w, h); for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) { g.fillStyle = ['#f2b632', '#58b368', '#e58fa6', '#3d7bd9'][(x + y) % 4]; g.fillRect(10 + x * 28, 12 + y * 42, 20, 30); } }) }), vm, -0.12, 1.15, 0.41);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.45), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: canvasTex(512, 144, (g, w, h) => { g.shadowColor = '#ff4aa8'; g.shadowBlur = 24; g.fillStyle = '#ff7ac0'; g.font = 'bold 92px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OPEN 24H', w / 2, h / 2 + 6); }) }));
  neon.position.set(-1.0, 2.45, -2.99); root.add(neon);
  const pinkGlow = new THREE.PointLight(0xff6ab8, 2.0, 4, 1.8); pinkGlow.position.set(-1.0, 2.4, -2.5); root.add(pinkGlow);
  const post = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.95), new THREE.MeshStandardMaterial({ map: canvasTex(200, 270, (g, w, h) => { g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f6aa8'; g.font = 'bold 30px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('WASH', w / 2, 60); g.fillText('& FOLD', w / 2, 96); g.fillStyle = '#d23a3f'; g.font = 'bold 44px Helvetica, Arial, sans-serif'; g.fillText('$2.50', w / 2, 170); g.fillStyle = '#555'; g.font = '18px Helvetica, Arial, sans-serif'; g.fillText('please be patient', w / 2, 230); }), roughness: 0.7 }));
  post.position.set(4.5, 1.6, -0.6); post.rotation.y = -Math.PI / 2; root.add(post);
  // fluorescent panels + fill
  const panelM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf4fbff).multiplyScalar(1.6), toneMapped: false });
  for (const x of [-3, 0, 3]) for (const z of [-1.2, 1.4]) { const p = mk(new THREE.BoxGeometry(1.2, 0.04, 0.4), panelM, root, x, 2.98, z); p.castShadow = false; }
  const hemi = new THREE.HemisphereLight(0xf4fbff, 0x8a8478, 1.3); root.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(2, 8, 6); key.target.position.set(0, 0, -1); root.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 20 });
  for (const x of [-2.5, 2.5]) { const L = new THREE.PointLight(0xf4fbff, 5, 7, 1.6); L.position.set(x, 2.7, 0.5); root.add(L); }
  function update(t, spin = 1) { drums.forEach((d) => (d.drum.rotation.z = t * 5.5 * d.dir * d.sp * spin)); }
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });
  return { root, D: DIMS, update, lights: { hemi, key } };
}
