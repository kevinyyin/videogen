// SET: a toy city — one main street with an intersection, a sea of blocks out to a downtown skyline, and a rooftop.
// Built for "what if everyone vanished" stories: power (block-by-block blackout), day/night/golden hour, overgrowth
// (years later), snow, a traffic signal, driverless cars. All procedural + deterministic.
//
// Coordinates (meters, y up). The main street runs along z (downtown is toward -z).
//   Road x∈[-4,4] (cars heading -z drive at x=+2, heading +z at x=-2), sidewalks x∈[4,7] / [-7,-4], curb 0.14.
//   Near intersection: cross street road z∈[-10,-2]; crosswalk over the main street at z∈[-1.6,0.6].
//   Near-right corner (crowd spot): x∈[4.3,6.8], z∈[0.5,12]. Storefronts line x=±7 for z∈[-39,67].
//   Rooftop: building x∈[-17,-7], z∈[8,18], roof at y=ROOF_Y with a parapet; the main street runs past its +x side.
//   Downtown towers cluster around (0,-190). ANSWER = one tall tower whose single window can light up (setAnswer).
// The video must raise the camera far plane to see the skyline (studio.camera.far = 900).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mk, canvasTex, rng, clamp, lerp } from '@engine/core.js';
import { makeWeather } from '@engine/sky.js';

export const ROOF_Y = 16;
export const DIMS = {
  road: 4, walk: 7, curb: 0.14,
  cross: { z0: -10, z1: -2 },
  roof: { x0: -17, x1: -7, z0: 8, z1: 18, y: ROOF_Y },
  corner: [5.4, 1.5],
  downtown: [0, -190],
  answer: { x0: 14, x1: 30, z0: -158, z1: -142, h: 74, win: [20.5, 43.2, -141.9] }, // tower + its one window (world)
};

const AVES = [-138, -92, -46, 0, 46, 92, 138];     // avenue centers (x); main street = 0
const CROSS = [-246, -206, -166, -126, -86, -46, -6, 34, 74]; // cross street centers (z)
const aveHalf = (x) => (x === 0 ? 7 : 8), crossHalf = 7;

// ---------------------------------------------------------------- textures
const WIN_LIT = ['#ffcf86', '#ffd99e', '#ffe6bd', '#ffc070', '#cfe0ff', '#ffdcae'];
/** Facade map (wall + glass) and matching emissive map (lit windows). 4 columns x 4 floors per tile (12 m x 13 m). */
function facadeTextures(seed, litFrac = 0.58) {
  const R = rng(seed), S = 512, c = S / 4, cells = [];
  for (let i = 0; i < 16; i++) cells.push(R() < litFrac ? { col: WIN_LIT[Math.floor(R() * WIN_LIT.length)], b: 0.55 + R() * 0.45, cur: R() } : null);
  const rect = (i) => { const x = (i % 4) * c, y = Math.floor(i / 4) * c; return [x + 22, y + 24, c - 44, c - 46]; };
  const map = canvasTex(S, S, (g) => {
    g.fillStyle = '#ece6dc'; g.fillRect(0, 0, S, S);
    for (let r = 0; r < 4; r++) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, r * c + c - 12, S, 6); } // floor bands
    for (let i = 0; i < 16; i++) {
      const [x, y, w, h] = rect(i);
      g.fillStyle = '#d8d0c4'; g.fillRect(x - 6, y + h, w + 12, 8);                  // sill
      g.fillStyle = '#3b4859'; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(x + w / 2 - 2, y, 4, h);       // mullion
    }
  }, [1, 1]);
  const em = canvasTex(S, S, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 16; i++) {
      const L = cells[i]; if (!L) continue;
      const [x, y, w, h] = rect(i);
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, L.col); gr.addColorStop(1, '#6b4a2a');
      g.globalAlpha = L.b; g.fillStyle = gr; g.fillRect(x, y, w, h);
      if (L.cur < 0.4) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, y, w * 0.28, h); g.fillRect(x + w * 0.72, y, w * 0.28, h); } // curtains
      g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x + w / 2 - 2, y, 4, h);
    }
  }, [1, 1]);
  return { map, em };
}
function asphaltTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#3a3c42'; g.fillRect(0, 0, w, h);
    const R = rng(3);
    for (let i = 0; i < 9000; i++) { const v = 40 + R() * 40; g.fillStyle = `rgba(${v},${v},${v + 6},.5)`; g.fillRect(R() * w, R() * h, 2, 2); }
    g.globalAlpha = 0.12; for (let i = 0; i < 14; i++) { g.fillStyle = R() < 0.5 ? '#000' : '#777'; g.beginPath(); g.ellipse(R() * w, R() * h, 30 + R() * 80, 20 + R() * 50, R() * 3, 0, 7); g.fill(); }
  }, [80, 84]);
}
function concreteTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#a7a39b'; g.fillRect(0, 0, w, h);
    const R = rng(4);
    for (let i = 0; i < 2500; i++) { const v = 140 + R() * 50; g.fillStyle = `rgba(${v},${v - 3},${v - 8},.35)`; g.fillRect(R() * w, R() * h, 2, 2); }
    g.fillStyle = 'rgba(40,36,30,.45)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);   // slab joints (1.5 m)
  }, [1, 1]);
}
function roofTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6d6862'; g.fillRect(0, 0, w, h);
    const R = rng(8);
    for (let i = 0; i < 5000; i++) { const v = 80 + R() * 70; g.fillStyle = `rgba(${v},${v - 4},${v - 9},.6)`; g.fillRect(R() * w, R() * h, 2, 2); }
  }, [6, 6]);
}
const SHOPS = [['DELI', '#c9503f'], ['BOOKS', '#2f5d62'], ['LAUNDRY', '#4a6fa5'], ['CAFÉ', '#8a5a3b'], ['FLOWERS', '#b85c7a'], ['NOODLES', '#c7862f'], ['PHARMACY', '#3f8a5a'], ['BAKERY', '#a8683c'], ['HARDWARE', '#5a5f6b'], ['24 HR', '#7a4fa0']];
function shopTextures(i) {
  const [name, col] = SHOPS[i % SHOPS.length], R = rng(50 + i);
  const draw = (g, w, h, lit) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h * 0.2);                                       // sign band
    g.fillStyle = lit ? '#fff4dc' : '#e9e2d4'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, h * 0.1);
    const gr = g.createLinearGradient(0, h * 0.2, 0, h);
    if (lit) { gr.addColorStop(0, '#ffe2a8'); gr.addColorStop(1, '#d98b45'); } else { gr.addColorStop(0, '#465264'); gr.addColorStop(1, '#2a3038'); }
    g.fillStyle = gr; g.fillRect(0, h * 0.2, w, h * 0.8);
    g.fillStyle = lit ? 'rgba(90,50,25,.55)' : 'rgba(0,0,0,.35)';                          // shelves / counter silhouettes
    for (let k = 0; k < 3; k++) g.fillRect(w * 0.06, h * (0.42 + k * 0.17), w * 0.88, 8);
    for (let k = 0; k < 18; k++) g.fillRect(w * 0.08 + R() * w * 0.82, h * (0.36 + Math.floor(R() * 3) * 0.17), 10 + R() * 18, 22 + R() * 14);
    g.fillStyle = lit ? 'rgba(80,45,20,.6)' : 'rgba(0,0,0,.4)'; g.fillRect(0, h * 0.2, w, 10); g.fillRect(w * 0.48, h * 0.2, 12, h * 0.8); // frame
  };
  return { map: canvasTex(512, 384, (g, w, h) => draw(g, w, h, false)), em: canvasTex(512, 384, (g, w, h) => draw(g, w, h, true)) };
}
function vineTex() {
  return canvasTex(256, 512, (g, w, h) => {
    const R = rng(12);
    for (let i = 0; i < 520; i++) {
      const y = h * Math.pow(R(), 0.6), x = R() * w; // denser at the bottom (canvas bottom = ground)
      g.fillStyle = `hsl(${95 + R() * 40},${35 + R() * 25}%,${22 + R() * 22}%)`;
      g.beginPath(); g.ellipse(x, h - y * 0.98, 7 + R() * 9, 5 + R() * 6, R() * 3, 0, 7); g.fill();
    }
  });
}
function crackTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const R = rng(13);
    g.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      let x = R() * w, y = R() * h; g.strokeStyle = 'rgba(20,18,15,.7)'; g.lineWidth = 1 + R() * 2.5; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += (R() - 0.5) * 60; y += (R() - 0.5) * 60; g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = `hsla(${80 + R() * 40},${30 + R() * 20}%,${24 + R() * 14}%,${0.35 + R() * 0.4})`; g.beginPath(); g.ellipse(R() * w, R() * h, 6 + R() * 26, 4 + R() * 16, R() * 3, 0, 7); g.fill(); }
  }, [4, 6]);
}

// ---------------------------------------------------------------- sky
function nightSkyTex() {
  return canvasTex(4096, 2048, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#03061a'); gr.addColorStop(0.42, '#0b1430'); gr.addColorStop(0.5, '#1c2848'); gr.addColorStop(0.53, '#0c1120'); gr.addColorStop(1, '#05070c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const R = rng(91);
    for (let i = 0; i < 5200; i++) { const y = Math.pow(R(), 1.3) * h * 0.5, a = 0.2 + R() * 0.7, r = R() < 0.03 ? 1.6 + R() * 0.9 : 0.6 + R() * 0.7; g.fillStyle = `rgba(255,${235 + R() * 20},${215 + R() * 40},${a})`; g.beginPath(); g.arc(R() * w, y, r, 0, 7); g.fill(); }
  });
}
/** The Milky Way: a sinusoid in equirect = a tilted great circle. At u=0.75 (toward -z) it crosses ~37° up, diagonally. */
function milkyTex() {
  return canvasTex(4096, 2048, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const R = rng(77), yc = (u) => h / 2 - 600 * Math.sin(2 * Math.PI * u + 0.75 * Math.PI);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 1400; i++) {
      const u = R(), y = yc(u) + (R() + R() + R() - 1.5) * 140, x = u * w, r = 36 + R() * 120;
      const core = Math.exp(-Math.pow((u - 0.72) / 0.12, 2)); // brighter core toward -z
      const rg = g.createRadialGradient(x, y, 0, x, y, r), a = 0.035 + 0.06 * core;
      const col = R() < 0.5 ? `rgba(255,226,190,${a})` : `rgba(170,190,255,${a})`;
      rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    for (let i = 0; i < 26000; i++) { const u = R(), y = yc(u) + (R() + R() - 1) * 180; g.fillStyle = `rgba(255,248,235,${0.2 + R() * 0.6})`; g.beginPath(); g.arc(u * w, y, R() < 0.08 ? 1.6 : 0.8, 0, 7); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 260; i++) { // dust lanes
      const u = R(), y = yc(u) + (R() - 0.5) * 60, x = u * w, r = 20 + R() * 52;
      const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(0,0,0,.28)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  });
}
function daySkyTex(golden) {
  return canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (golden) { gr.addColorStop(0, '#4f6c9e'); gr.addColorStop(0.36, '#c29ab0'); gr.addColorStop(0.49, '#f6c48c'); gr.addColorStop(0.52, '#e9b48a'); gr.addColorStop(1, '#7a6a5e'); }
    else { gr.addColorStop(0, '#3f7fc6'); gr.addColorStop(0.4, '#88b6e0'); gr.addColorStop(0.5, '#d4e4ee'); gr.addColorStop(1, '#9aa8b0'); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const R = rng(golden ? 61 : 60);
    for (let i = 0; i < 26; i++) {
      const cx = R() * w, cy = h * (0.18 + R() * 0.26), n = 6 + Math.floor(R() * 8);
      for (let k = 0; k < n; k++) {
        const x = cx + (R() - 0.5) * 120, y = cy + (R() - 0.5) * 18, r = 14 + R() * 26, rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, golden ? 'rgba(255,214,180,.55)' : 'rgba(255,255,255,.6)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
    }
  });
}

// ---------------------------------------------------------------- geometry helpers
/** Box (centered at cx, h/2, cz) whose side UVs are in world units / (tileW, tileH) so windows keep their size. Top/bottom → a wall pixel. */
function buildingBox(x0, x1, z0, z1, y0, y1, color, tileW = 12, tileH = 13) {
  const w = x1 - x0, d = z1 - z0, h = y1 - y0;
  const geo = new THREE.BoxGeometry(w, h, d); geo.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const uv = geo.attributes.uv, spans = [d, d, 0, 0, w, w]; // +x, -x, +y, -y, +z, -z (4 verts each)
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    if (!spans[f]) uv.setXY(i, 0.01, 0.99);
    else uv.setXY(i, uv.getX(i) * spans[f] / tileW, (y0 + uv.getY(i) * h) / tileH);
  }
  const c = new THREE.Color(color), col = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
/** Plain box with world-scaled UVs on every face (sidewalk slabs). */
function slabBox(x0, x1, z0, z1, h, unit) {
  const w = x1 - x0, d = z1 - z0, geo = new THREE.BoxGeometry(w, h, d); geo.translate((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
  const uv = geo.attributes.uv, sp = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * sp[f][0] / unit, uv.getY(i) * sp[f][1] / unit); }
  return geo;
}

const PALETTE = [0xd99a83, 0xe6d3b3, 0xa9bba8, 0x9eaac0, 0xc9ab92, 0xb3adc4, 0xd8c09f, 0xc28a74, 0xbfc7c9, 0xe0b98f];

// ---------------------------------------------------------------- cars
/** Toy car facing +z, ~3.9 m long. Returns {g, setLights(v), setRust(r), body}. */
export function makeCar(color = 0xc9503f, seed = 1) {
  const g = new THREE.Group(), R = rng(seed);
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });
  const base = new THREE.Color(color), rust = new THREE.Color(0x6b4a33);
  const glassM = new THREE.MeshStandardMaterial({ color: 0x1d2633, roughness: 0.15, metalness: 0.3 });
  const tire = mat(0x1c1c1e, 0.8), chrome = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.3, metalness: 0.7 });
  const body = new THREE.Group(); g.add(body);
  mk(new RoundedBoxGeometry(1.8, 0.62, 3.9, 3, 0.22), paint, body, 0, 0.62, 0);
  const cab = mk(new RoundedBoxGeometry(1.56, 0.6, 2.05, 3, 0.24), paint, body, 0, 1.15, -0.25);
  mk(new RoundedBoxGeometry(1.6, 0.42, 1.9, 2, 0.16), glassM, body, 0, 1.18, -0.25);
  cab.scale.set(0.98, 1, 1);
  for (const z of [1.96, -1.96]) mk(new RoundedBoxGeometry(1.7, 0.16, 0.12, 2, 0.05), chrome, body, 0, 0.42, z);
  const headM = new THREE.MeshBasicMaterial({ color: 0xfff1d0, toneMapped: false });
  const tailM = new THREE.MeshBasicMaterial({ color: 0xff3020, toneMapped: false });
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.13, 18), headM); hl.position.set(s * 0.6, 0.7, 1.952); body.add(hl);
    const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.12), tailM); tl.position.set(s * 0.62, 0.74, -1.952); tl.rotation.y = Math.PI; body.add(tl);
  }
  const wheels = [];
  for (const [x, z] of [[0.82, 1.25], [-0.82, 1.25], [0.82, -1.25], [-0.82, -1.25]]) {
    const w = mk(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 20), tire, g, x, 0.36, z); w.rotation.z = Math.PI / 2; wheels.push(w);
    const hub = mk(new THREE.CylinderGeometry(0.16, 0.16, 0.27, 12), chrome, g, x, 0.36, z); hub.rotation.z = Math.PI / 2;
  }
  // soft light pools on the road (cheap stand-in for headlight beams)
  const poolTex = canvasTex(128, 256, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h * 0.15, 4, w / 2, h * 0.4, h * 0.6); gr.addColorStop(0, 'rgba(255,240,210,.9)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 7), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.rotation.z = Math.PI; pool.position.set(0, 0.03, 5.2); g.add(pool);
  const tailPoolTex = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,40,20,.8)'); gr.addColorStop(1, 'rgba(255,40,20,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const tpool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.2), new THREE.MeshBasicMaterial({ map: tailPoolTex, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  tpool.rotation.x = -Math.PI / 2; tpool.position.set(0, 0.03, -2.7); g.add(tpool);
  g.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial) { o.castShadow = false; o.receiveShadow = false; } });
  const setLights = (v, tail = v) => {
    headM.color.setHex(0xfff1d0).multiplyScalar(0.25 + 1.6 * v); tailM.color.setHex(0xff3020).multiplyScalar(0.2 + 1.4 * tail);
    pool.material.opacity = 0.35 * v; tpool.material.opacity = 0.25 * tail; pool.visible = v > 0.01; tpool.visible = tail > 0.01;
  };
  const setRust = (r) => { paint.color.copy(base).lerp(rust, r * 0.75); paint.roughness = 0.35 + r * 0.55; body.position.y = -0.12 * r; wheels.forEach((w) => (w.scale.y = 1)); };
  setLights(0);
  return { g, body, setLights, setRust };
}

// ---------------------------------------------------------------- the set
export function buildCity(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 2026);

  // ---- textures + shared materials
  const variants = [facadeTextures(101), facadeTextures(202, 0.5), facadeTextures(303, 0.66)];
  const concrete = concreteTex(), asphalt = asphaltTex();

  // ---- ground: asphalt everywhere, sidewalk slabs around every block
  const ground = mk(new THREE.PlaneGeometry(420, 440), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92 }), root, 0, 0, -90);
  ground.rotation.x = -Math.PI / 2; ground.castShadow = false;

  const blocks = [];
  const sx = AVES.slice().sort((a, b) => a - b), sz = CROSS.slice().sort((a, b) => a - b);
  for (let i = 0; i < sx.length - 1; i++) for (let j = 0; j < sz.length - 1; j++) {
    blocks.push({ x0: sx[i] + aveHalf(sx[i]), x1: sx[i + 1] - aveHalf(sx[i + 1]), z0: sz[j] + crossHalf, z1: sz[j + 1] - crossHalf });
  }
  const slabs = blocks.map((b) => slabBox(b.x0 - 3, b.x1 + 3, b.z0 - 3, b.z1 + 3, DIMS.curb, 1.5));
  const walkMat = new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.9 });
  const walks = mk(mergeGeometries(slabs), walkMat, root); walks.castShadow = false;

  // ---- lane markings + crosswalks (thin boxes; one merged mesh)
  const paint = [];
  const strip = (x0, x1, z0, z1) => { const g = new THREE.BoxGeometry(x1 - x0, 0.012, z1 - z0); g.translate((x0 + x1) / 2, 0.006, (z0 + z1) / 2); paint.push(g); };
  for (let z = 70; z > -250; z -= 1) if (Math.abs(z + 6) > 6) { strip(-0.17, -0.07, z - 1, z); strip(0.07, 0.17, z - 1, z); } // double center line
  for (let x = -3.6; x <= 3.6; x += 0.9) { strip(x - 0.25, x + 0.25, -1.6, 0.6); strip(x - 0.25, x + 0.25, -12.6, -10.4); }
  for (let z = -9.6; z <= -2.4; z += 0.9) { strip(4.4, 6.6, z - 0.25, z + 0.25); strip(-6.6, -4.4, z - 0.25, z + 0.25); }
  strip(0.2, 3.9, 0.9, 1.25); strip(-3.9, -0.2, -12.95, -12.6);                              // stop lines
  const paintMesh = mk(mergeGeometries(paint), new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.8 }), root);
  paintMesh.castShadow = false;

  // ---- buildings: lots per block, merged per block (one material per block = one "district" for the blackout)
  const ANS = DIMS.answer, RF = DIMS.roof;
  const districts = [];
  // keep the line of sight from the rooftop to the answer window clear: cap buildings near that line below it
  const EYE = [-10, ROOF_Y + 2, 10], AWp = ANS.win;
  const sightCap = (x, z) => {
    const dx = AWp[0] - EYE[0], dz = AWp[2] - EYE[2], L2 = dx * dx + dz * dz;
    const f = clamp(((x - EYE[0]) * dx + (z - EYE[2]) * dz) / L2);
    if (f <= 0.02 || f >= 0.97) return 1e9;
    const d = Math.hypot(x - (EYE[0] + dx * f), z - (EYE[2] + dz * f));
    return d < 16 ? EYE[1] + (AWp[1] - EYE[1]) * f - 6 : 1e9;
  };
  const shopsFront = [];   // [{x, z0, z1, side, block}] storefront slots facing the main street
  const vineSlots = [];
  for (const b of blocks) {
    const geos = [], nearMain = Math.abs(b.x0) === 7 || Math.abs(b.x1) === 7, nearCity = Math.abs((b.z0 + b.z1) / 2) < 80;
    const lots = [];
    const zCuts = (z0, z1, lo, hi) => { const out = []; let z = z0; while (z1 - z > hi) { const w = lo + R() * (hi - lo); out.push([z, z + w]); z += w; } out.push([z, z1]); return out; };
    if (nearMain) {
      // a row of narrow frontage buildings along the main street, deeper filler behind
      const side = b.x0 === 7 ? 1 : -1, xf = side > 0 ? b.x0 : b.x1, depth = 11;
      const rows = (b.x0 === -38 && b.z0 === 1) ? [[1, 8], [8, 18], [18, 27]] : zCuts(b.z0, b.z1, 6, 9.5);
      for (const [z0, z1] of rows) {
        const isRoof = b.x0 === -38 && z0 === 8;
        const x0 = side > 0 ? xf : (isRoof ? RF.x0 : xf - depth), x1 = side > 0 ? xf + depth : xf;
        const h = isRoof ? RF.y : (b.x0 === -38 && b.z0 === 1) ? 10 + R() * 2.5 : 9 + R() * (nearCity ? 9 : 14);
        lots.push({ x0, x1, z0: z0 + 0.05, z1: z1 - 0.05, h, front: true, isRoof });
        if (Math.abs((b.z0 + b.z1) / 2) < 80) { shopsFront.push({ x: side > 0 ? xf : xf, z0: z0 + 0.4, z1: z1 - 0.4, side: -side, block: districts.length, h }); vineSlots.push({ x: xf, z0, z1, side: -side, h }); }
      }
      const fx0 = side > 0 ? xf + depth : b.x0, fx1 = side > 0 ? b.x1 : xf - depth;
      for (const [z0, z1] of zCuts(b.z0, b.z1, 8, 13)) for (const [x0, x1] of zCuts(fx0, fx1, 8, 13)) {
        if (b.x0 === -38 && b.z0 === 1 && x1 > RF.x0 - 0.5 && z0 < RF.z1 && z1 > RF.z0) continue;
        lots.push({ x0: x0 + 0.1, x1: x1 - 0.1, z0: z0 + 0.1, z1: z1 - 0.1, h: (b.z0 === 1 && b.x0 === -38) ? 9 + R() * 3 : 10 + R() * 10 });
      }
    } else {
      for (const [z0, z1] of zCuts(b.z0, b.z1, 8, 14)) for (const [x0, x1] of zCuts(b.x0, b.x1, 8, 14)) {
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, dd = Math.hypot(cx - DIMS.downtown[0], cz - DIMS.downtown[1]);
        let h = 9 + R() * 9 + 82 * Math.exp(-Math.pow(dd / 78, 2)) * (0.45 + R() * 0.75);
        if (Math.abs(cz) < 45) h = Math.min(h, 16);
        const inset = R() * 0.8;
        lots.push({ x0: x0 + inset, x1: x1 - inset, z0: z0 + inset, z1: z1 - inset, h });
      }
    }
    // the answer tower replaces whatever lots overlap it
    const hasAns = ANS.x0 >= b.x0 && ANS.x1 <= b.x1 && ANS.z0 >= b.z0 && ANS.z1 <= b.z1;
    for (const L of lots) {
      if (hasAns && L.x1 > ANS.x0 && L.x0 < ANS.x1 && L.z1 > ANS.z0 && L.z0 < ANS.z1) continue;
      L.h = Math.min(L.h, sightCap((L.x0 + L.x1) / 2, (L.z0 + L.z1) / 2));
      const col = PALETTE[Math.floor(R() * PALETTE.length)];
      geos.push(buildingBox(L.x0, L.x1, L.z0, L.z1, 0, L.h, col));
      if (L.front) geos.push(buildingBox(L.x0 - 0.25, L.x1 + 0.25, L.z0 - 0.25, L.z1 + 0.25, L.h, L.h + 0.35, new THREE.Color(col).multiplyScalar(0.8))); // cornice
      if (L.h > 40) geos.push(buildingBox(L.x0 + 1.5, L.x1 - 1.5, L.z0 + 1.5, L.z1 - 1.5, L.h, L.h + 6 + R() * 8, col)); // setback crown
    }
    if (hasAns) {
      geos.push(buildingBox(ANS.x0, ANS.x1, ANS.z0, ANS.z1, 0, ANS.h, 0xb9c0cc));
      geos.push(buildingBox(ANS.x0 + 2, ANS.x1 - 2, ANS.z0 + 2, ANS.z1 - 2, ANS.h, ANS.h + 9, 0xb9c0cc));
    }
    const v = variants[districts.length % 3];
    const m = new THREE.MeshStandardMaterial({ map: v.map, emissiveMap: v.em, emissive: 0xffffff, emissiveIntensity: 1, vertexColors: true, roughness: 0.88 });
    const mesh = mk(mergeGeometries(geos), m, root);
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    // blackout order: far from the near intersection first (the dark rolls toward the viewer), a little jitter
    const thr = clamp(Math.hypot(cx * 0.8, cz - 20) / 330 + (R() - 0.5) * 0.1, 0.06, 0.97);
    districts.push({ mesh, mat: m, thr, cx, cz, lit: 1 });
  }

  // ---- storefronts + awnings along the main street (ground floors)
  const shopGroup = new THREE.Group(); root.add(shopGroup);
  const shopMats = [];
  shopsFront.forEach((s, i) => {
    const w = s.z1 - s.z0; if (w < 3) return;
    const tx = shopTextures(i), m = new THREE.MeshStandardMaterial({ map: tx.map, emissiveMap: tx.em, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.6 });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.1), m);
    p.position.set(s.x + s.side * 0.02, 1.7, (s.z0 + s.z1) / 2); p.rotation.y = s.side > 0 ? Math.PI / 2 : -Math.PI / 2; shopGroup.add(p);
    const aw = mk(new THREE.BoxGeometry(1.1, 0.08, w), mat(PALETTE[i % PALETTE.length] * 1 & 0xffffff, 0.9), shopGroup, s.x + s.side * 0.55, 3.45, (s.z0 + s.z1) / 2);
    aw.rotation.z = s.side * -0.32;
    aw.material.color.multiplyScalar(0.75);
    shopMats.push({ m, block: s.block });
  });

  // ---- vines (overgrowth) on the street-facing facades
  const vineM = new THREE.MeshStandardMaterial({ map: vineTex(), alphaTest: 0.5, roughness: 0.95, side: THREE.DoubleSide });
  const vines = vineSlots.map((s, i) => {
    const w = s.z1 - s.z0, h = Math.min(s.h, 6 + (i * 37 % 7));
    const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
    const v = new THREE.Mesh(geo, vineM); v.position.set(s.x + s.side * 0.06, 0.1, (s.z0 + s.z1) / 2); v.rotation.y = s.side > 0 ? Math.PI / 2 : -Math.PI / 2;
    v.userData.k = 0.55 + ((i * 53) % 10) / 22; v.visible = false; root.add(v); return v;
  });

  // ---- rooftop details (the roof building is part of its block's merged mesh)
  const roof = new THREE.Group(); root.add(roof);
  const rcx = (RF.x0 + RF.x1) / 2, rcz = (RF.z0 + RF.z1) / 2, rw = RF.x1 - RF.x0, rd = RF.z1 - RF.z0;
  const roofFloor = mk(new THREE.PlaneGeometry(rw, rd), new THREE.MeshStandardMaterial({ map: roofTex(), roughness: 0.95 }), roof, rcx, RF.y + 0.01, rcz);
  roofFloor.rotation.x = -Math.PI / 2;
  const parM = mat(0xb7a99a, 0.9), capM = mat(0xd8d0c4, 0.8);
  const par = (x0, x1, z0, z1) => { mk(new THREE.BoxGeometry(x1 - x0, 0.95, z1 - z0), parM, roof, (x0 + x1) / 2, RF.y + 0.475, (z0 + z1) / 2); mk(new THREE.BoxGeometry(x1 - x0 + 0.06, 0.06, z1 - z0 + 0.06), capM, roof, (x0 + x1) / 2, RF.y + 0.98, (z0 + z1) / 2); };
  par(RF.x0, RF.x1, RF.z0, RF.z0 + 0.25); par(RF.x0, RF.x1, RF.z1 - 0.25, RF.z1); par(RF.x0, RF.x0 + 0.25, RF.z0, RF.z1); par(RF.x1 - 0.25, RF.x1, RF.z0, RF.z1);
  // stair hut + door
  mk(new RoundedBoxGeometry(2.6, 2.6, 2.4, 2, 0.05), mat(0xa99c8e, 0.9), roof, -14.6, RF.y + 1.3, 15.6);
  mk(new THREE.BoxGeometry(0.9, 2.0, 0.05), mat(0x5d4a3c, 0.6), roof, -14.6, RF.y + 1.0, 14.38);
  // water tower
  const wood = mat(0x8a5d3f, 0.85), iron = mat(0x3d3a38, 0.6);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 8), iron, roof, -11.2 + dx, RF.y + 1.1, 16.0 + dz * 0.9);
  mk(new THREE.CylinderGeometry(1.35, 1.35, 2.5, 24), wood, roof, -11.2, RF.y + 3.45, 16.0);
  mk(new THREE.ConeGeometry(1.5, 0.9, 24), iron, roof, -11.2, RF.y + 5.15, 16.0);
  for (const y of [2.6, 3.4, 4.3]) { const hoop = mk(new THREE.TorusGeometry(1.37, 0.03, 6, 32), iron, roof, -11.2, RF.y + y, 16.0); hoop.rotation.x = Math.PI / 2; }
  // AC units + vents + the crate you sit on
  mk(new RoundedBoxGeometry(1.4, 0.9, 1.0, 2, 0.06), mat(0xc7c9c6, 0.6), roof, -15.5, RF.y + 0.45, 10.0);
  mk(new RoundedBoxGeometry(1.0, 0.7, 1.0, 2, 0.06), mat(0xc7c9c6, 0.6), roof, -15.6, RF.y + 0.35, 11.4);
  mk(new THREE.CylinderGeometry(0.18, 0.18, 0.7, 12), iron, roof, -12.8, RF.y + 0.35, 12.8);
  const crate = mk(new RoundedBoxGeometry(0.62, 0.44, 0.5, 2, 0.03), mat(0x9b7650, 0.85), roof, -9.6, RF.y + 0.22, 10.6);
  // snow on the roof (montage)
  const snowM = new THREE.MeshStandardMaterial({ color: 0xf2f5fb, roughness: 0.9, transparent: true, opacity: 0 });
  const roofSnow = mk(new THREE.PlaneGeometry(rw - 0.5, rd - 0.5), snowM, roof, rcx, RF.y + 0.03, rcz); roofSnow.rotation.x = -Math.PI / 2; roofSnow.castShadow = false;
  const parSnow = new THREE.Group(); roof.add(parSnow);
  for (const [x, z, w, d] of [[rcx, RF.z0 + 0.125, rw, 0.3], [rcx, RF.z1 - 0.125, rw, 0.3], [RF.x0 + 0.125, rcz, 0.3, rd], [RF.x1 - 0.125, rcz, 0.3, rd]]) mk(new THREE.BoxGeometry(w, 0.05, d), snowM, parSnow, x, RF.y + 1.03, z);
  const weather = makeWeather(root, { x0: RF.x0 - 6, x1: RF.x1 + 4, y0: RF.y - 2, y1: RF.y + 8, z0: RF.z0 - 8, z1: RF.z1 });

  // ---- the answer window (one light in the dark city)
  const AW = ANS.win;
  const ansM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd28a).multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0 });
  const ansWin = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.0), ansM); ansWin.position.set(AW[0], AW[1], AW[2]); root.add(ansWin);
  const glowTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,230,180,1)'); gr.addColorStop(0.25, 'rgba(255,200,130,.45)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const ansGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  ansGlow.position.set(AW[0], AW[1], AW[2] + 0.3); ansGlow.scale.set(14, 14, 1); root.add(ansGlow);
  const setAnswer = (v, glow = 14) => { ansM.opacity = clamp(v); ansGlow.scale.set(glow, glow, 1); ansGlow.material.opacity = 0.9 * clamp(v); ansWin.visible = ansGlow.visible = v > 0.001; };
  setAnswer(0);

  // ---- streetlamps (main street + near cross street); real lights only near the action
  const lampHeadM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(2.2), toneMapped: false });
  const poleM = mat(0x2f3338, 0.55);
  const lampLights = [], lampHeads = [];
  const lampAt = (x, z, dirX, real) => {
    mk(new THREE.CylinderGeometry(0.07, 0.09, 5.6, 10), poleM, root, x, 2.8, z);
    const arm = mk(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8), poleM, root, x + dirX * 0.6, 5.55, z); arm.rotation.z = Math.PI / 2;
    mk(new RoundedBoxGeometry(0.62, 0.16, 0.32, 2, 0.05), poleM, root, x + dirX * 1.25, 5.5, z);
    const head = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.22), lampHeadM); head.rotation.x = Math.PI / 2; head.position.set(x + dirX * 1.25, 5.415, z); root.add(head); lampHeads.push(head);
    if (real) { const L = new THREE.PointLight(0xffc98a, 0, 16, 1.6); L.position.set(x + dirX * 1.25, 5.3, z); root.add(L); lampLights.push(L); }
  };
  for (let z = 25; z > -240; z -= 14) { if (z < -1 && z > -13) continue; lampAt(4.5, z, -1, z > -30 && z < 30); lampAt(-4.5, z - 7, 1, z - 7 > -30 && z - 7 < 30); }
  for (const x of [12, 26, -12, -26]) lampAt(x, -1.5 * Math.sign(x) - 0.2, 0, false);

  // ---- traffic signal at the near intersection (for cars heading -z) + one across
  const sigBox = mat(0x2a2d31, 0.5);
  const signal = new THREE.Group(); root.add(signal);
  mk(new THREE.CylinderGeometry(0.09, 0.11, 5.4, 10), poleM, signal, 4.6, 2.7, -1.6);
  const marm = mk(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), poleM, signal, 3.0, 5.25, -1.6); marm.rotation.z = Math.PI / 2;
  const sigCols = { red: 0xff3a2a, yellow: 0xffb21c, green: 0x3dff9a };
  const sigMats = {};
  for (const [k, c] of Object.entries(sigCols)) sigMats[k] = new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  const head = (x, y, z, rotY) => {
    const hg = new THREE.Group(); hg.position.set(x, y, z); hg.rotation.y = rotY; signal.add(hg);
    mk(new RoundedBoxGeometry(0.42, 1.18, 0.34, 2, 0.06), sigBox, hg, 0, 0, 0);
    ['red', 'yellow', 'green'].forEach((k, i) => { const d = new THREE.Mesh(new THREE.CircleGeometry(0.12, 18), sigMats[k]); d.position.set(0, 0.36 - i * 0.36, 0.172); hg.add(d); const vis = mk(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 16, 1, true, -Math.PI / 2, Math.PI), sigBox, hg, 0, 0.36 - i * 0.36 + 0.02, 0.23); vis.rotation.x = Math.PI / 2; vis.rotation.y = Math.PI; });
  };
  head(1.9, 4.6, -1.6, 0); head(4.75, 3.2, -1.6, 0);
  mk(new THREE.CylinderGeometry(0.09, 0.11, 5.4, 10), poleM, signal, -4.6, 2.7, -10.4);
  head(-4.75, 3.2, -10.4, Math.PI);
  const sigGlow = new THREE.PointLight(0xff3a2a, 0, 6, 2); sigGlow.position.set(1.9, 4.4, -1.2); root.add(sigGlow);
  const setSignal = (state, power = 1) => {
    for (const [k, m] of Object.entries(sigMats)) m.color.setHex(sigCols[k]).multiplyScalar(k === state ? 1.8 * power + 0.05 : 0.07);
    sigGlow.color.setHex(sigCols[state] ?? 0xffffff); sigGlow.intensity = state in sigCols ? 1.4 * power : 0;
  };

  // ---- overgrowth: grass tufts, bushes, trees, cracks
  const growth = new THREE.Group(); root.add(growth);
  const blade = (h, a, tilt) => { const g = new THREE.ConeGeometry(0.035, h, 4); g.translate(0, h / 2, 0); g.rotateZ(tilt); g.rotateY(a); return g; };
  const tuftGeo = mergeGeometries([blade(0.42, 0, 0.25), blade(0.32, 1.3, 0.35), blade(0.5, 2.5, 0.15), blade(0.36, 3.7, 0.4), blade(0.28, 4.9, 0.3)]);
  const NT = 2600, tufts = new THREE.InstancedMesh(tuftGeo, mat(0x6f8f3e, 0.9), NT); growth.add(tufts);
  const tuftData = [];
  for (let i = 0; i < NT; i++) {
    const k = R(); let x, z;
    if (k < 0.3) { x = (R() < 0.5 ? -1 : 1) * (4.0 + (R() - 0.5) * 0.3); z = 35 - R() * 80; }        // along the curbs
    else if (k < 0.5) { x = (R() < 0.5 ? -1 : 1) * (6.7 + R() * 0.25); z = 35 - R() * 80; }       // building bases
    else if (k < 0.65) { x = (R() - 0.5) * 0.5; z = 35 - R() * 80; }                                // center line
    else { x = (R() - 0.5) * 14; z = 35 - R() * 80; }                                                 // anywhere (cracks)
    const y = Math.abs(x) > 4 && Math.abs(x) < 7 ? DIMS.curb : 0;
    tuftData.push({ x, y, z, s: 0.6 + R() * 0.9, r: R() * 6.3, th: R() * 0.7 });
  }
  const bushGeo = new THREE.IcosahedronGeometry(0.5, 1), NB = 170, bushes = new THREE.InstancedMesh(bushGeo, mat(0x4f6e35, 0.9), NB); growth.add(bushes);
  const bushData = [];
  for (let i = 0; i < NB; i++) { const side = R() < 0.5 ? -1 : 1, onCurb = R() < 0.4; bushData.push({ x: side * (onCurb ? 4.2 + R() * 0.4 : 6.4 + R() * 0.5), y: DIMS.curb, z: 35 - R() * 80, s: 0.5 + R() * 1.1, th: 0.1 + R() * 0.7 }); }
  const trees = [];
  const trunkM = mat(0x5e4632, 0.9), leafMs = [mat(0x5d7f3a, 0.85), mat(0x6e9144, 0.85), mat(0x4c6b33, 0.85)];
  for (const [x, z, s, th] of [[5.6, 20, 1.0, 0.1], [-5.6, 9, 0.9, 0.15], [5.7, -18, 1.1, 0.05], [-5.5, -24, 1.0, 0.2], [1.6, -5.2, 1.15, 0.25], [-1.8, 13.5, 0.8, 0.35], [2.6, -24, 0.9, 0.3], [-0.6, -34, 1.0, 0.2], [5.4, 31, 0.9, 0.2], [-2.5, 26, 0.85, 0.4]]) {
    const t = new THREE.Group(); t.position.set(x, Math.abs(x) > 4 ? DIMS.curb : 0, z); growth.add(t);
    mk(new THREE.CylinderGeometry(0.13, 0.22, 3.4, 8), trunkM, t, 0, 1.7, 0);
    for (let k = 0; k < 5; k++) { const b = mk(new THREE.IcosahedronGeometry(1.0 + R() * 0.7, 1), leafMs[k % 3], t, (R() - 0.5) * 1.6, 3.2 + R() * 1.6, (R() - 0.5) * 1.6); b.scale.y = 0.85; }
    trees.push({ t, s, th });
  }
  const cracks = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 80), new THREE.MeshStandardMaterial({ map: crackTex(), transparent: true, opacity: 0, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }));
  cracks.rotation.x = -Math.PI / 2; cracks.position.set(0, 0.02, -5); cracks.receiveShadow = true; growth.add(cracks);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
  let curGrowth = -1;
  const setGrowth = (gv) => {
    if (gv === curGrowth) return; curGrowth = gv;
    growth.visible = gv > 0.001;
    tuftData.forEach((d, i) => { const k = clamp((gv - d.th) / 0.3) * d.s; _m.compose(_p.set(d.x, d.y, d.z), _q.setFromEuler(_e.set(0, d.r, 0)), _s.set(k, k, k)); tufts.setMatrixAt(i, _m); });
    bushData.forEach((d, i) => { const k = clamp((gv - d.th) / 0.3) * d.s; _m.compose(_p.set(d.x, d.y + 0.2 * k, d.z), _q.identity(), _s.set(k, k * 0.75, k)); bushes.setMatrixAt(i, _m); });
    tufts.instanceMatrix.needsUpdate = true; bushes.instanceMatrix.needsUpdate = true;
    trees.forEach(({ t, s, th }) => { const k = clamp((gv - th) / 0.6) * s; t.scale.setScalar(Math.max(k, 1e-4)); t.visible = k > 0.01; });
    cracks.material.opacity = clamp(gv * 1.4);
    vines.forEach((v) => { const k = clamp(gv * 1.2) * v.userData.k; v.visible = k > 0.01; v.scale.set(1, Math.max(k, 1e-4), 1); });
  };
  growth.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  cracks.castShadow = false;
  setGrowth(0);

  // ---- sky domes (night stars, Milky Way overlay, day) + moon
  const nightSky = new THREE.Mesh(new THREE.SphereGeometry(700, 48, 24), new THREE.MeshBasicMaterial({ map: nightSkyTex(), side: THREE.BackSide, fog: false, depthWrite: false }));
  const milky = new THREE.Mesh(new THREE.SphereGeometry(690, 48, 24), new THREE.MeshBasicMaterial({ map: milkyTex(), side: THREE.BackSide, fog: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const dayTex = daySkyTex(false), goldTex = daySkyTex(true);
  const daySky = new THREE.Mesh(new THREE.SphereGeometry(680, 48, 24), new THREE.MeshBasicMaterial({ map: dayTex, side: THREE.BackSide, fog: false, transparent: true, opacity: 0, depthWrite: false }));
  nightSky.renderOrder = -3; milky.renderOrder = -2; daySky.renderOrder = -1;
  root.add(nightSky, milky, daySky);
  const moonDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, '#fff6dc'); gr.addColorStop(0.32, '#fff2d2'); gr.addColorStop(0.36, 'rgba(255,240,210,.35)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), fog: false, depthWrite: false, toneMapped: false }));
  moonDisc.position.set(260, 330, -420); moonDisc.scale.set(70, 70, 1); root.add(moonDisc);
  // follow the camera so the domes never clip
  nightSky.onBeforeRender = () => { nightSky.position.copy(studio.camera.position); milky.position.copy(studio.camera.position); daySky.position.copy(studio.camera.position); };

  // ---- lights
  const hemi = new THREE.HemisphereLight(0x7088c0, 0x2a2520, 0.6); root.add(hemi);
  const key = new THREE.DirectionalLight(0xa9bfe8, 1.0); root.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04;
  const cityGlow = new THREE.HemisphereLight(0xffb070, 0x000000, 0); root.add(cityGlow);
  const shopLights = [];
  for (const [x, z] of [[6.2, 6], [6.2, 16], [-6.2, 4], [-6.2, 22], [6.2, -20], [-6.2, -26]]) { const L = new THREE.PointLight(0xffb873, 0, 9, 1.8); L.position.set(x, 2.2, z); root.add(L); shopLights.push(L); }
  let focus = [0, 0, 0, 30];
  const setShadowFocus = (x, z, half = 30) => { focus = [x, 0, z, half]; };
  scene.fog = new THREE.Fog(0x0d1428, 40, 420);

  let state = { day: 0, golden: 0, power: 1, milky: 0, moon: 1 };
  function applyLight() {
    const { day, golden } = state;
    // key = moon (night) / sun (day) / low sun (golden)
    const dir = new THREE.Vector3().lerpVectors(new THREE.Vector3(-0.35, 0.8, 0.45), new THREE.Vector3(0.55, 0.75, 0.35), day);
    if (golden > 0) dir.lerp(new THREE.Vector3(-0.35, 0.22, -0.9), golden).normalize();
    key.color.setHex(0xa9bfe8).lerp(new THREE.Color(0xfff0dc), day).lerp(new THREE.Color(0xffb36b), golden);
    key.intensity = lerp(0.8 * state.moon + 0.5, 2.6, day) * (1 - 0.15 * golden);
    key.target.position.set(focus[0], 0, focus[2]); key.position.copy(key.target.position).addScaledVector(dir.normalize(), 120);
    const h = focus[3]; Object.assign(key.shadow.camera, { left: -h, right: h, top: h, bottom: -h, near: 20, far: 260 }); key.shadow.camera.updateProjectionMatrix();
    hemi.color.setHex(0x7088c0).lerp(new THREE.Color(0xcfe3ff), day).lerp(new THREE.Color(0xf0c8a8), golden);
    hemi.groundColor.setHex(0x2a2520).lerp(new THREE.Color(0x8a7a66), day);
    hemi.intensity = lerp(0.55, 1.25, day);
    nightSky.material.color.setScalar(1 - day);
    daySky.material.opacity = day; daySky.visible = day > 0.001;
    if (daySky.material.map !== (golden > 0.5 ? goldTex : dayTex)) { daySky.material.map = golden > 0.5 ? goldTex : dayTex; daySky.material.needsUpdate = true; }
    milky.material.opacity = state.milky * (1 - day); milky.visible = milky.material.opacity > 0.001;
    moonDisc.material.opacity = state.moon * (1 - day); moonDisc.visible = moonDisc.material.opacity > 0.01;
    const fogNight = new THREE.Color(0x111a33).lerp(new THREE.Color(0x070b16), 1 - state.power);
    scene.fog.color.copy(fogNight).lerp(new THREE.Color(0xc4d6e6), day).lerp(new THREE.Color(0xe7c39e), golden * day);
    scene.fog.near = lerp(40, 60, day); scene.fog.far = lerp(420, 520, day);
  }

  /** p 1→0: blocks go dark far→near (each snaps off with a tiny flicker), streetlamps last. */
  function setPower(p) {
    state.power = p;
    const nightK = 1 - state.day;
    for (const d of districts) {
      const u = clamp((p - d.thr) / 0.012 + 1);           // 1 above thr, 0 below
      d.mat.emissiveIntensity = (0.95 * u) * nightK;
    }
    for (const s of shopMats) s.m.emissiveIntensity = (districts[s.block].mat.emissiveIntensity > 0.01 ? 1.1 : 0) * nightK;
    const lamp = clamp((p - 0.02) / 0.03) * nightK;
    lampHeadM.color.setHex(0xffd9a0).multiplyScalar(0.08 + 2.2 * lamp);
    lampLights.forEach((L) => (L.intensity = 9 * lamp));
    const near = districts.filter((d) => Math.abs(d.cx) < 30 && Math.abs(d.cz) < 30);
    const nearLit = near.reduce((a, d) => a + d.mat.emissiveIntensity, 0) / Math.max(1, near.length);
    shopLights.forEach((L) => (L.intensity = 3.2 * nearLit));
    cityGlow.intensity = 0.18 * nearLit;
    applyLight();
  }
  /** day 0..1 (night→day), golden 0..1 (low warm sun), milkyWay 0..1, moon 0..1. */
  function setTime(o = {}) { state = { ...state, ...o }; setPower(state.power); }
  setTime({});

  let curSnow = -1;
  const setSnow = (s) => { if (s === curSnow) return; curSnow = s; snowM.opacity = s; roofSnow.visible = parSnow.visible = s > 0.01; };
  setSnow(0);

  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || (o.material.transparent && o !== roofSnow))) { o.castShadow = false; o.receiveShadow = false; } });

  return {
    root, D: DIMS, districts, roof, crate, signal,
    lights: { hemi, key, cityGlow, lampLights, shopLights },
    setPower, setTime, setGrowth, setSnow, setSignal, setAnswer, setShadowFocus,
    setWeather: (t, season) => weather.update(t, season),
    sky: { nightSky, milky, daySky, moonDisc },
  };
}
