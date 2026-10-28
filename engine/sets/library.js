// SET: a sunny public reading room (built for video 019) — three tall windows on the back wall, wall-to-wall bookshelves
// (one InstancedMesh of ~1,500 books), two long reading tables with green banker's lamps, chairs, a librarian's desk with a
// "QUIET PLEASE" sign, a rolling book cart, a globe, a ladder, plants, a wall clock, pendant lamps and a rug.
// Coordinates: room x∈[-4,4], z∈[-5,3], ceiling 3.8. Camera usually at +z looking −z (the windows are behind the action).
// Tables run along z at DIMS.tables (top 0.76); chairs DIMS.seats along each side (readers sit facing ±x, seat top 0.46).
// Handles: cart (group, wheels on the floor, front = +x), sign (group: the QUIET PLEASE stand, pivot at its foot),
// lampShades[] (the green shades — tip them), cartBooks[] (meshes on the cart), books (InstancedMesh, static).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

export const DIMS = {
  room: { x0: -4, x1: 4, z0: -5, z1: 3, h: 3.8 },
  tables: [-1.05, 1.05], tableZ: [-3.1, 0.1], tableTop: 0.76, seatY: 0.46,
  seats: [-2.7, -1.75, -0.8, 0.15],   // chair z along each table; chairs at table x ± 0.62
  desk: [0, -3.95], cart: [1.25, 0.75],   // desk at the far end under the middle window (librarian faces +z)
};

export function buildLibrary(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 19), Dm = DIMS.room, W = Dm.x1 - Dm.x0, Dd = Dm.z1 - Dm.z0;
  const box = (w, h, d, m, x, y, z, p = root) => mk(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
  const rbox = (w, h, d, r, m, x, y, z, p = root) => mk(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);

  // floor (warm herringbone-ish planks) + a long red rug down the middle
  const floorTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9a6b42'; g.fillRect(0, 0, w, h); const r = rng(3); for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -32 : 0; x < w; x += 64) { g.fillStyle = `hsl(28,${38 + r() * 12}%,${30 + r() * 10}%)`; g.fillRect(x + 1, y + 1, 62, 14); } }, [5, 5]);
  const floor = mk(new THREE.PlaneGeometry(W, Dd), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55 }), root, 0, 0, (Dm.z0 + Dm.z1) / 2); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const rugTex = canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#9b2f2f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e2b866'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.strokeStyle = '#5a1a1a'; g.lineWidth = 3; g.strokeRect(22, 22, w - 44, h - 44); });
  const rug = mk(new THREE.PlaneGeometry(1.1, 6.4), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 }), root, 0, 0.004, -1.6); rug.rotation.x = -Math.PI / 2; rug.castShadow = false; rug.receiveShadow = true;

  // walls: cream plaster with a dark wood wainscot, ceiling with coffers
  const wallM = mat(0xefe4cf, 0.92), woodD = mat(0x5a3820, 0.55), woodM = mat(0x7a4e2c, 0.6);
  box(0.15, Dm.h, Dd, wallM, Dm.x0 - 0.07, Dm.h / 2, (Dm.z0 + Dm.z1) / 2); box(0.15, Dm.h, Dd, wallM, Dm.x1 + 0.07, Dm.h / 2, (Dm.z0 + Dm.z1) / 2);
  box(W + 0.3, 0.12, Dd, mat(0xf6efe2, 0.95), 0, Dm.h + 0.06, (Dm.z0 + Dm.z1) / 2);
  for (let x = -3; x <= 3; x += 2) box(0.16, 0.18, Dd, woodD, x, Dm.h - 0.09, (Dm.z0 + Dm.z1) / 2);

  // back wall with three tall arched windows (painted sunny park outside, emissive) — the bright "behind" of the room
  const outT = canvasTex(512, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fb7ea'); gr.addColorStop(0.62, '#d8ecf6'); gr.addColorStop(0.63, '#7fae5c'); gr.addColorStop(1, '#5d8c44'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(8); for (let i = 0; i < 14; i++) { g.fillStyle = `hsl(${95 + r() * 30},${35 + r() * 15}%,${32 + r() * 14}%)`; g.beginPath(); g.arc(r() * w, h * (0.55 + r() * 0.08), 40 + r() * 70, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 5; i++) { const cx = r() * w, cy = 80 + r() * 260; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(cx + k * 22, cy + Math.sin(k) * 8, 26, 0, 7); g.fill(); } }
  });
  const backM = mat(0xefe4cf, 0.92);
  const winX = [-2.5, 0, 2.5], winW = 1.5, winH = 2.6, winY0 = 0.8;
  // wall pieces around the windows
  box(W, winY0, 0.2, backM, 0, winY0 / 2, Dm.z0); box(W, Dm.h - winY0 - winH - 0.4, 0.2, backM, 0, winY0 + winH + 0.4 + (Dm.h - winY0 - winH - 0.4) / 2, Dm.z0);
  for (const [a, b] of [[Dm.x0, winX[0] - winW / 2], [winX[0] + winW / 2, winX[1] - winW / 2], [winX[1] + winW / 2, winX[2] - winW / 2], [winX[2] + winW / 2, Dm.x1]]) box(b - a, winH + 0.4, 0.2, backM, (a + b) / 2, winY0 + (winH + 0.4) / 2, Dm.z0);
  for (const x of winX) {
    const pane = mk(new THREE.PlaneGeometry(winW, winH + 0.4), new THREE.MeshBasicMaterial({ map: outT, toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.12) }), root, x, winY0 + (winH + 0.4) / 2, Dm.z0 - 0.35);
    pane.castShadow = false;
    // mullions + frame (white)
    const fr = mat(0xfaf6ee, 0.6);
    box(0.06, winH + 0.4, 0.08, fr, x, winY0 + (winH + 0.4) / 2, Dm.z0 + 0.1); box(winW, 0.06, 0.08, fr, x, winY0 + winH * 0.45, Dm.z0 + 0.1); box(winW, 0.06, 0.08, fr, x, winY0 + winH * 0.9, Dm.z0 + 0.1);
    for (const s of [-1, 1]) box(0.1, winH + 0.4, 0.12, fr, x + s * winW / 2, winY0 + (winH + 0.4) / 2, Dm.z0 + 0.1);
    box(winW + 0.2, 0.1, 0.25, fr, x, winY0 - 0.04, Dm.z0 + 0.15);
  }

  // ---- bookshelves: wood frames + one InstancedMesh of books
  const bookT = [];
  const BOOK_COLS = [0x9b2f2f, 0x2f5f8a, 0x3f7a3a, 0xc9a25a, 0x6a3f7a, 0x2a2a2a, 0xd2783a, 0xe8dcc0, 0x7a2a3a, 0x3a6a6a, 0xb8483a, 0x4a5a8a];
  const shelf = (x, z, ry, w, h, levels, depth = 0.38) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    box(w, h, 0.04, woodD, 0, h / 2, -depth / 2 + 0.02, g);
    for (const s of [-1, 1]) box(0.06, h, depth, woodM, s * (w / 2 - 0.03), h / 2, 0, g);
    box(w, 0.08, depth + 0.04, woodM, 0, h - 0.04, 0, g); box(w, 0.12, depth, woodD, 0, 0.06, 0, g);
    const lh = (h - 0.2) / levels;
    for (let lv = 0; lv < levels; lv++) {
      const y0 = 0.12 + lv * lh; box(w - 0.08, 0.03, depth - 0.02, woodM, 0, y0, 0.01, g);
      let bx = -w / 2 + 0.07;
      while (bx < w / 2 - 0.1) {
        const bw = 0.035 + R() * 0.035, bh = Math.min(lh - 0.06, 0.2 + R() * 0.12), lean = R() < 0.06 ? 0.25 : 0;
        if (R() < 0.04) { bx += 0.08; continue; }
        bookT.push({ g, x: bx + bw / 2, y: y0 + 0.015 + bh / 2, z: 0.02, w: bw, h: bh, d: depth - 0.1, c: BOOK_COLS[Math.floor(R() * BOOK_COLS.length)], lean });
        bx += bw + 0.004;
      }
    }
    return g;
  };
  // side walls: long runs of shelves facing inward; back corners left/right of the windows
  for (let z = -4.3; z <= 1.8; z += 1.55) { shelf(Dm.x0 + 0.22, z, Math.PI / 2, 1.5, 3.0, 6); shelf(Dm.x1 - 0.22, z, -Math.PI / 2, 1.5, 3.0, 6); }
  shelf(-1.25, Dm.z0 + 0.3, 0, 0.9, 2.2, 4, 0.32); shelf(1.25, Dm.z0 + 0.3, 0, 0.9, 2.2, 4, 0.32);
  // all books in one instanced mesh (world-local to root): compose each from its shelf group's transform
  root.updateMatrixWorld(true);
  const books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.75 }), bookT.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(), rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  bookT.forEach((b, i) => {
    m4.compose(v.set(b.x, b.y, b.z), q.setFromEuler(e.set(0, 0, b.lean)), s.set(b.w, b.h, b.d));
    m4.premultiply(b.g.matrixWorld).premultiply(rootInv);
    books.setMatrixAt(i, m4); books.setColorAt(i, new THREE.Color(b.c).multiplyScalar(0.85 + R() * 0.3));
  });
  books.castShadow = true; books.receiveShadow = true; root.add(books);

  // a rolling ladder on the left shelves
  const lad = new THREE.Group(); lad.position.set(Dm.x0 + 0.55, 0, -2.0); lad.rotation.z = -0.12; root.add(lad);
  for (const s2 of [-1, 1]) box(0.05, 3.0, 0.05, woodM, 0, 1.5, s2 * 0.22, lad);
  for (let k = 0; k < 9; k++) box(0.04, 0.04, 0.44, woodM, 0, 0.3 + k * 0.32, 0, lad);

  // ---- reading tables + chairs + green banker's lamps
  const tableM = mat(0x6a4024, 0.45), chairM = mat(0x7a4a2a, 0.6), greenM = new THREE.MeshStandardMaterial({ color: 0x1f6b45, roughness: 0.3, metalness: 0.2, emissive: 0x0a2a18, emissiveIntensity: 0.4 });
  const lampShades = [], chairs = [];
  for (const tx of DIMS.tables) {
    const L = DIMS.tableZ[1] - DIMS.tableZ[0], cz = (DIMS.tableZ[0] + DIMS.tableZ[1]) / 2;
    rbox(0.95, 0.06, L, 0.015, tableM, tx, DIMS.tableTop - 0.03, cz);
    for (const [lx, lz] of [[-0.4, -L / 2 + 0.1], [0.4, -L / 2 + 0.1], [-0.4, L / 2 - 0.1], [0.4, L / 2 - 0.1]]) box(0.07, DIMS.tableTop - 0.06, 0.07, tableM, tx + lx, (DIMS.tableTop - 0.06) / 2, cz + lz);
    for (let k = 0; k < 3; k++) {
      const lz = DIMS.tableZ[0] + 0.55 + k * 1.15, lg = new THREE.Group(); lg.position.set(tx, DIMS.tableTop, lz); root.add(lg);
      mk(new THREE.CylinderGeometry(0.06, 0.07, 0.02, 14), mat(0xc9a25a, 0.3, { metalness: 0.7 }), lg, 0, 0.01, 0);
      mk(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), mat(0xc9a25a, 0.3, { metalness: 0.7 }), lg, 0, 0.16, 0);
      const shade = new THREE.Group(); shade.position.y = 0.32; lg.add(shade);
      const sh = mk(new THREE.CylinderGeometry(0.06, 0.13, 0.12, 16, 1, true, 0, Math.PI), greenM, shade, 0, 0, 0); sh.rotation.z = Math.PI / 2; sh.rotation.y = Math.PI / 2; sh.material.side = THREE.DoubleSide;
      const bulb = mk(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c8, toneMapped: false }), shade, 0, -0.03, 0); bulb.castShadow = false;
      lampShades.push(shade);
      // a few open books + paper on the table
      const ob = new THREE.Group(); ob.position.set(tx + (k % 2 ? 0.25 : -0.25), DIMS.tableTop + 0.012, lz + 0.35); ob.rotation.y = (k - 1) * 0.3; root.add(ob);
      for (const s2 of [-1, 1]) { const pg = box(0.15, 0.012, 0.21, mat(0xf6f0e0, 0.8), s2 * 0.077, 0, 0, ob); pg.rotation.z = s2 * 0.06; }
      box(0.31, 0.01, 0.22, mat(BOOK_COLS[(k * 3) % 12], 0.7), 0, -0.008, 0, ob);
    }
    for (const sz of DIMS.seats) for (const side of [-1, 1]) {
      const c = new THREE.Group(); c.position.set(tx + side * 0.66, 0, sz); c.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; root.add(c);
      rbox(0.42, 0.05, 0.42, 0.015, chairM, 0, DIMS.seatY - 0.025, 0, c);
      rbox(0.42, 0.42, 0.04, 0.015, chairM, 0, DIMS.seatY + 0.24, -0.2, c);
      for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.035, DIMS.seatY - 0.05, 0.035, chairM, a, (DIMS.seatY - 0.05) / 2, b, c);
      chairs.push(c);
    }
  }

  // ---- librarian's desk (far end, center) + QUIET PLEASE sign on a brass stand + a bell + a stamp + a monitor
  const [dx, dz] = DIMS.desk;
  rbox(1.5, 0.95, 0.6, 0.02, woodD, dx, 0.475, dz); rbox(1.6, 0.05, 0.7, 0.01, woodM, dx, 0.975, dz);
  const mon = new THREE.Group(); mon.position.set(dx - 0.35, 1.0, dz - 0.05); mon.rotation.y = 0.5; root.add(mon);
  box(0.4, 0.28, 0.03, mat(0x2a2a2a, 0.4), 0, 0.24, 0, mon); box(0.06, 0.1, 0.06, mat(0x2a2a2a, 0.4), 0, 0.05, 0, mon);
  mk(new THREE.PlaneGeometry(0.36, 0.24), new THREE.MeshBasicMaterial({ color: 0x9fc4e8, toneMapped: false }), mon, 0, 0.24, 0.017);
  for (let k = 0; k < 5; k++) box(0.22, 0.05, 0.3, mat(BOOK_COLS[k * 2], 0.7), dx + 0.45, 1.025 + k * 0.05, dz, root).rotation.y = (k - 2) * 0.12;
  const sign = new THREE.Group(); sign.position.set(dx + 0.95, 0, dz + 0.45); root.add(sign);
  mk(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 16), mat(0xc9a25a, 0.3, { metalness: 0.7 }), sign, 0, 0.02, 0);
  mk(new THREE.CylinderGeometry(0.018, 0.018, 1.2, 8), mat(0xc9a25a, 0.3, { metalness: 0.7 }), sign, 0, 0.62, 0);
  const signT = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#1d2a22'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a25a'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#f6efe0'; g.font = 'bold 44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('QUIET', w / 2, 60); g.fillText('PLEASE', w / 2, 112); });
  const plate = mk(new THREE.BoxGeometry(0.46, 0.29, 0.02), new THREE.MeshStandardMaterial({ map: signT, roughness: 0.5 }), sign, 0, 1.35, 0); plate.rotation.y = -0.25;

  // ---- book cart (front, right of the aisle): two-shelf wooden cart on casters, loaded with books
  const cart = new THREE.Group(); cart.position.set(DIMS.cart[0], 0, DIMS.cart[1]); cart.rotation.y = -0.35; root.add(cart);
  for (const y of [0.25, 0.62, 0.95]) box(0.9, 0.04, 0.42, woodM, 0, y, 0, cart);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.04, 0.95, 0.04, woodD, sx * 0.43, 0.5, sz * 0.19, cart);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mk(new THREE.SphereGeometry(0.045, 8, 6), mat(0x222222, 0.5), cart, sx * 0.4, 0.045, sz * 0.17);
  const cartBooks = [];
  for (const y of [0.27, 0.64]) for (let k = 0; k < 12; k++) { const bh = 0.2 + R() * 0.08; const b = box(0.05, bh, 0.28, mat(BOOK_COLS[Math.floor(R() * 12)], 0.7), -0.38 + k * 0.068, y + 0.02 + bh / 2, 0, cart); b.rotation.z = (R() - 0.5) * 0.15; cartBooks.push(b); }

  // ---- dressing: globe, plants, wall clock, pendant lamps, a READ poster, a card catalog
  const globe = new THREE.Group(); globe.position.set(2.85, 0, -3.9); root.add(globe);
  mk(new THREE.CylinderGeometry(0.04, 0.2, 0.75, 10), woodD, globe, 0, 0.375, 0);
  mk(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#5f9cc8'; g.fillRect(0, 0, w, h); g.fillStyle = '#d9c38a'; const r = rng(5); for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(r() * w, 20 + r() * 90, 14 + r() * 26, 10 + r() * 18, r() * 3, 0, 7); g.fill(); } }) }), globe, 0, 1.05, 0);
  const plant = (x, z, sc = 1) => { const pl = new THREE.Group(); pl.position.set(x, 0, z); pl.scale.setScalar(sc); root.add(pl); mk(new THREE.CylinderGeometry(0.2, 0.15, 0.36, 14), mat(0xb8653a, 0.7), pl, 0, 0.18, 0); for (let k = 0; k < 9; k++) { const lf = mk(new THREE.SphereGeometry(0.22, 10, 8), mat(0x3f7a3a, 0.8), pl, Math.sin(k * 2.4) * 0.17, 0.6 + (k % 3) * 0.18, Math.cos(k * 2.4) * 0.17); lf.scale.set(0.45, 1.5, 0.25); lf.rotation.z = Math.sin(k) * 0.6; } };
  plant(-3.3, -4.5); plant(3.3, -4.5); plant(-3.2, 2.5, 0.8);
  const clock = mk(new THREE.CircleGeometry(0.26, 32), new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(128, 128, (g) => { g.fillStyle = '#fbf6e8'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#3a2a1a'; g.lineWidth = 7; g.stroke(); g.lineCap = 'round'; g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 22 * Math.sin(2.2), 64 - 22 * Math.cos(2.2)); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 40 * Math.sin(1.47), 64 - 40 * Math.cos(1.47)); g.stroke(); }) }), root, 0, 3.55, Dm.z0 + 0.11);
  void clock;
  for (const [x, z] of [[-1.05, -2.6], [1.05, -2.6], [-1.05, -0.6], [1.05, -0.6]]) {
    mk(new THREE.CylinderGeometry(0.008, 0.008, 1.0, 6), mat(0x2a2a2a, 0.4), root, x, Dm.h - 0.5, z);
    mk(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf4e8c8, 0.4, { side: THREE.DoubleSide }), root, x, Dm.h - 1.05, z);
    mk(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1c8, toneMapped: false }), root, x, Dm.h - 1.06, z).castShadow = false;
  }
  const cat = new THREE.Group(); cat.position.set(2.95, 0, 2.3); cat.rotation.y = -Math.PI / 2; root.add(cat);
  rbox(1.0, 1.1, 0.5, 0.02, woodM, 0, 0.55, 0, cat);
  for (let r2 = 0; r2 < 5; r2++) for (let c2 = 0; c2 < 4; c2++) { box(0.2, 0.16, 0.02, woodD, -0.36 + c2 * 0.24, 0.2 + r2 * 0.2, 0.26, cat); mk(new THREE.SphereGeometry(0.015, 6, 4), mat(0xc9a25a, 0.3, { metalness: 0.7 }), cat, -0.36 + c2 * 0.24, 0.2 + r2 * 0.2, 0.28); }

  // ---- light: daylight through the windows + warm lamps + hemisphere
  const hemi = new THREE.HemisphereLight(0xfff4e0, 0x7a5a3a, 1.15); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4); sun.position.set(1.5, 7, -10); sun.target.position.set(0, 0, -1); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 6, bottom: -6, near: 1, far: 25 }); sun.shadow.bias = -0.0004;
  const warm = new THREE.PointLight(0xffd9a0, 5, 9, 1.5); warm.position.set(0, 3.0, -1.2); root.add(warm);
  const front = new THREE.PointLight(0xfff0dc, 3, 8, 1.6); front.position.set(0.5, 2.4, 2.2); root.add(front);
  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) o.castShadow = false; });
  return { root, D: DIMS, cart, cartBooks, sign, lampShades, chairs, books, lights: { hemi, sun, warm, front } };
}
