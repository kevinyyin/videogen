// Reusable props: draped blanket (deformable), plush bunny, phone, toys, moving boxes.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mk, canvasTex, rng } from '@engine/core.js';

// ---------------------------------------------------------------- blanket
function roundHang(d, r) { // distance past a mattress edge -> [outward offset, drop]
  const q = (Math.PI * r) / 2;
  if (d < q) { const a = d / r; return [r * Math.sin(a), r * (1 - Math.cos(a))]; }
  return [r, r + (d - q)];
}
/** Capsule-shaped bump under the blanket. body: {x, zA (feet), zB (shoulders), h, r} */
export function bodyBump(x, z, b) {
  const zc = Math.min(Math.max(z, Math.min(b.zA, b.zB)), Math.max(b.zA, b.zB));
  const d2 = ((x - b.x) ** 2 + (z - zc) ** 2) / (b.r * b.r);
  return b.h * Math.exp(-d2 * 1.6);
}
/**
 * A blanket that drapes over a mattress and over a body bump. Call update(p) whenever p changes:
 * p = { cx, w, top, zFoot, zHead (the folded edge near the pillow), hang, footHang, r, body|null, lift }
 */
export class Blanket {
  constructor(material, segX = 44, segZ = 64) {
    this.segX = segX; this.segZ = segZ;
    this.geo = new THREE.PlaneGeometry(1, 1, segX, segZ);
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.key = '';
  }
  heightAt(x, z, p) {
    return p.top + (p.lift ?? 0.014) + (p.body ? bodyBump(x, z, p.body) : 0);
  }
  update(p) {
    const key = JSON.stringify(p);
    if (key === this.key) return; this.key = key;
    const pos = this.geo.attributes.position, uv = this.geo.attributes.uv;
    const totalW = p.w + 2 * p.hang, totalL = p.zHead - p.zFoot + p.footHang;
    for (let j = 0; j <= this.segZ; j++) {
      const v = j / this.segZ, along = v * totalL;
      let z, dropZ = 0;
      if (along < p.footHang) { const [lat, drop] = roundHang(p.footHang - along, p.r); z = p.zFoot - lat; dropZ = drop; }
      else z = p.zFoot + (along - p.footHang);
      for (let i = 0; i <= this.segX; i++) {
        const u = i / this.segX, s = (u - 0.5) * totalW, ax = Math.abs(s) - p.w / 2;
        let x, dropX = 0;
        if (ax > 0) { const [lat, drop] = roundHang(ax, p.r); x = p.cx + Math.sign(s) * (p.w / 2 + lat); dropX = drop; }
        else x = p.cx + s;
        let y = this.heightAt(ax > 0 ? p.cx + Math.sign(s) * p.w / 2 : x, Math.max(z, p.zFoot), p) - dropX - dropZ;
        if (ax > 0 || along < p.footHang) y += 0.004 * Math.sin(u * 37 + v * 11); // tiny cloth wobble on the hanging parts
        const idx = j * (this.segX + 1) + i;
        pos.setXYZ(idx, x, y, z);
        uv.setXY(idx, u * totalW * 1.4, v * totalL * 1.4);
      }
    }
    pos.needsUpdate = true; uv.needsUpdate = true;
    this.geo.computeVertexNormals(); this.geo.computeBoundingSphere();
    const n = this.geo.attributes.normal; // degenerate triangles (coincident hang vertices) give zero normals -> NaN in shading
    for (let i = 0; i < n.count; i++) { const x = n.getX(i), y = n.getY(i), z = n.getZ(i); if (!(x * x + y * y + z * z > 1e-8)) n.setXYZ(i, 0, 1, 0); }
  }
}

// ---------------------------------------------------------------- fabric textures
export function quiltTexture(c1, c2, line = 'rgba(255,255,255,.35)') {
  return canvasTex(512, 512, (g, w, h) => {
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? c1 : c2; g.fillRect(x * s, y * s, s, s); }
    g.strokeStyle = line; g.lineWidth = 3; g.setLineDash([10, 8]);
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  }, [1, 1]);
}
export function starsTexture(bg, fg) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const R = rng(11); g.fillStyle = fg;
    for (let i = 0; i < 26; i++) {
      const x = R() * w, y = R() * h, r = 10 + R() * 12;
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.closePath(); g.fill();
    }
  }, [1, 1]);
}
export function dotsTexture(bg, fg) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.beginPath(); g.arc(x * 32 + (y % 2) * 16 + 8, y * 32 + 8, 4, 0, 7); g.fill(); }
  }, [1, 1]);
}

// ---------------------------------------------------------------- small props
export function makeBunny(color = 0xeee2d6) {
  const g = new THREE.Group(), m = mat(color, 0.95), pink = mat(0xe9a6b0, 0.9), dark = mat(0x1b1310, 0.4);
  const body = mk(new THREE.SphereGeometry(0.055, 18, 14), m, g, 0, 0.055, 0); body.scale.set(1, 1.1, 0.9);
  mk(new THREE.SphereGeometry(0.046, 18, 14), m, g, 0, 0.13, 0.008);
  for (const s of [-1, 1]) {
    const ear = mk(new THREE.CapsuleGeometry(0.014, 0.06, 4, 10), m, g, s * 0.02, 0.2, -0.005); ear.rotation.z = s * -0.25;
    const inner = mk(new THREE.CapsuleGeometry(0.007, 0.045, 4, 8), pink, g, s * 0.021, 0.2, 0.007); inner.rotation.z = s * -0.25;
    mk(new THREE.SphereGeometry(0.006, 8, 6), dark, g, s * 0.016, 0.138, 0.05);
    mk(new THREE.SphereGeometry(0.02, 10, 8), m, g, s * 0.045, 0.06, 0.03);
    mk(new THREE.SphereGeometry(0.022, 10, 8), m, g, s * 0.03, 0.012, 0.035);
  }
  mk(new THREE.SphereGeometry(0.007, 8, 6), pink, g, 0, 0.124, 0.054);
  return g;
}
export function makePhone() {
  const g = new THREE.Group();
  mk(new RoundedBoxGeometry(0.075, 0.009, 0.15, 2, 0.004), mat(0x1c1c22, 0.35), g, 0, 0.0045, 0);
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0a0d14, emissive: 0x8fb7ff, emissiveIntensity: 1.6, roughness: 0.3 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.138), screenMat); screen.rotation.x = -Math.PI / 2; screen.position.y = 0.0095; g.add(screen);
  return { g, screenMat };
}
export function makeBlock(color, s = 0.075) { const g = new THREE.Group(); mk(new RoundedBoxGeometry(s, s, s, 2, s * 0.12), mat(color, 0.6), g, 0, s / 2, 0); return g; }
export function makeToyCar(color = 0xd2483f) {
  const g = new THREE.Group(), m = mat(color, 0.45), t = mat(0x222222, 0.6);
  mk(new RoundedBoxGeometry(0.2, 0.06, 0.1, 2, 0.02), m, g, 0, 0.05, 0);
  mk(new RoundedBoxGeometry(0.1, 0.05, 0.09, 2, 0.02), m, g, -0.01, 0.095, 0);
  for (const [x, z] of [[0.065, 0.05], [-0.065, 0.05], [0.065, -0.05], [-0.065, -0.05]]) { const w = mk(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 14), t, g, x, 0.025, z); w.rotation.x = Math.PI / 2; }
  return g;
}
export function makeBall(c1 = 0x3d7bd9, c2 = 0xf2c14e) {
  const tex = canvasTex(256, 128, (g, w, h) => { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? c1hex(c1) : c2hex(c2); g.fillRect((i * w) / 6, 0, w / 6 + 1, h); } });
  const g = new THREE.Group(); mk(new THREE.SphereGeometry(0.07, 24, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }), g, 0, 0.07, 0); return g;
}
const c1hex = (c) => '#' + c.toString(16).padStart(6, '0'), c2hex = c1hex;
export function makeMovingBox(w = 0.46, h = 0.36, d = 0.4) {
  const g = new THREE.Group();
  mk(new RoundedBoxGeometry(w, h, d, 2, 0.012), mat(0xb98b5c, 0.95), g, 0, h / 2, 0);
  mk(new THREE.BoxGeometry(w * 1.002, 0.004, 0.06), mat(0xd8c49a, 0.5), g, 0, h + 0.001, 0);
  return g;
}

// ---------------------------------------------------------------- food + baby props (video 002; reusable)
/** Swaddled newborn: blanket capsule + tiny sleeping head. Lies along local x (head at +x). */
export function makeBabyBundle(blanket = 0xf3d9e2, skin = 0xebb996) {
  const g = new THREE.Group(), m = mat(blanket, 0.95);
  const body = mk(new THREE.CapsuleGeometry(0.075, 0.16, 6, 14), m, g, -0.03, 0, 0); body.rotation.z = Math.PI / 2;
  const hood = mk(new THREE.SphereGeometry(0.085, 16, 12), m, g, 0.11, 0.01, -0.01); hood.scale.set(1, 1, 0.9);
  const face = mk(new THREE.SphereGeometry(0.058, 16, 12), mat(skin, 0.6), g, 0.12, 0.02, 0.04); face.scale.set(1, 1, 0.75);
  const dark = mat(0x1b1310, 0.4);
  for (const s of [-1, 1]) { const e = mk(new THREE.TorusGeometry(0.011, 0.003, 4, 10, Math.PI), dark, g, 0.12 + s * 0.02, 0.03, 0.083); e.rotation.z = Math.PI; }
  return g;
}
export function makePickleJar() {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe8b8, roughness: 0.08, transparent: true, opacity: 0.38, depthWrite: false });
  const jar = mk(new THREE.CylinderGeometry(0.13, 0.13, 0.34, 24), glass, g, 0, 0.17, 0); jar.castShadow = false;
  const brine = mk(new THREE.CylinderGeometry(0.122, 0.122, 0.28, 20), new THREE.MeshStandardMaterial({ color: 0xb9c95a, roughness: 0.3, transparent: true, opacity: 0.5, depthWrite: false }), g, 0, 0.15, 0); brine.castShadow = false;
  const pk = mat(0x5f8a2e, 0.55), R = rng(17);
  for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = 0.06 * (i % 3) / 2 + 0.02, p = mk(new THREE.CapsuleGeometry(0.025, 0.14, 4, 8), pk, g, Math.cos(a) * rr, 0.15 + (R() - 0.5) * 0.06, Math.sin(a) * rr); p.rotation.set((R() - 0.5) * 0.5, 0, (R() - 0.5) * 0.5); }
  mk(new THREE.CylinderGeometry(0.135, 0.135, 0.05, 24), mat(0xd9b23a, 0.35, { metalness: 0.5 }), g, 0, 0.36, 0);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.1315, 0.1315, 0.12, 24, 1, true), new THREE.MeshStandardMaterial({ map: canvasTex(512, 96, (c, w, h) => { c.fillStyle = '#fff4d6'; c.fillRect(0, 0, w, h); c.fillStyle = '#2f7d4f'; c.font = 'bold 54px Helvetica, Arial, sans-serif'; c.textAlign = 'center'; c.fillText('PICKLES', w / 4, 66); c.fillText('PICKLES', (3 * w) / 4, 66); }), roughness: 0.7 }));
  label.position.y = 0.17; g.add(label);
  return g;
}
export function makeIceCreamTub() {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.11, 0.09, 0.15, 24), mat(0xf2a7bb, 0.6), g, 0, 0.075, 0);
  mk(new THREE.CylinderGeometry(0.115, 0.115, 0.025, 24), mat(0xfaf6ee, 0.5), g, 0, 0.16, 0);
  return g;
}
export function makeHotDog() {
  const g = new THREE.Group();
  const bun = mk(new THREE.CapsuleGeometry(0.035, 0.13, 4, 10), mat(0xd9a05b, 0.8), g); bun.rotation.z = Math.PI / 2; bun.scale.set(1, 1, 0.8);
  const dog = mk(new THREE.CapsuleGeometry(0.02, 0.17, 4, 8), mat(0xb5462e, 0.5), g, 0, 0.03, 0); dog.rotation.z = Math.PI / 2;
  const mus = mk(new THREE.CapsuleGeometry(0.006, 0.14, 3, 6), mat(0xf1c24a, 0.5), g, 0, 0.052, 0); mus.rotation.z = Math.PI / 2;
  return g;
}

// ---------------------------------------------------------------- flashlight (handheld; beam along local +z)
/** Returns {g, setOn(v), aim(pos, target)}: a toy flashlight with a soft additive beam cone + a spot light. */
export function makeFlashlight({ length = 34, radius = 2.4, color = 0xfff0d2 } = {}) {
  const g = new THREE.Group();
  const body = mk(new THREE.CylinderGeometry(0.022, 0.026, 0.19, 14), mat(0x2b2f36, 0.45), g, 0, 0, -0.02); body.rotation.x = Math.PI / 2;
  const headM = mat(0x3a3f47, 0.4);
  const head = mk(new THREE.CylinderGeometry(0.038, 0.028, 0.06, 16), headM, g, 0, 0, 0.1); head.rotation.x = Math.PI / 2;
  const lensM = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.5), toneMapped: false });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 18), lensM); lens.position.z = 0.131; g.add(lens);
  // soft volumetric cone: alpha fades along the length and toward the silhouette edges (no texture → no hard end cap)
  const geo = new THREE.CylinderGeometry(0.035, radius, length, 40, 1, true); geo.translate(0, -length / 2, 0); geo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0.3 }, uLen: { value: length } },
    vertexShader: 'varying float vD; varying vec3 vN; varying vec3 vV; void main(){ vD = position.z; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOpacity, uLen; varying float vD; varying vec3 vN; varying vec3 vV; void main(){ float d = clamp(vD / uLen, 0.0, 1.0); float a = pow(1.0 - d, 1.7) * uOpacity; float edge = abs(dot(normalize(vN), normalize(-vV))); a *= mix(0.45, 1.0, smoothstep(0.0, 0.7, edge)); gl_FragColor = vec4(uColor * a, a); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(geo, beamMat);
  beam.position.z = 0.13; beam.castShadow = false; g.add(beam);
  const spot = new THREE.SpotLight(color, 0, 60, 0.12, 0.6, 1.2); spot.position.z = 0.13; spot.target.position.set(0, 0, 10); g.add(spot, spot.target);
  const setOn = (v, beamOpacity = 0.3) => { lensM.color.setHex(color).multiplyScalar(0.1 + 2.4 * v); beamMat.uniforms.uOpacity.value = beamOpacity * v; beam.visible = v > 0.001; spot.intensity = 60 * v; };
  const aim = (pos, target) => { g.position.copy(pos); g.lookAt(target); };
  setOn(0);
  return { g, beam, spot, setOn, aim };
}

// ---------------------------------------------------------------- search bubble (008): a floating search bar above a head
/**
 * makeSearchBubble({ query, history: [..], width (m), maxChars, offX })
 *   A camera-facing card: magnifier + query on top, optional history rows (clock icon) below, a small tail pointing down.
 *   Bottom-anchored (sprite.center.y = 0): put `sprite.position` at the top of the head. offX shifts the card sideways
 *   (-0.5…0.5 of its width) so two neighbours' cards don't overlap. setRows(n) reveals history rows one by one (textures are
 *   prebuilt per row count — no per-frame canvas work). setPop(k) scales it (0 = hidden; use a boing for the pop).
 *   Unlit SpriteMaterial (house rule for screens), slightly off-white so it never trips the bloom threshold.
 */
export function makeSearchBubble(o = {}) {
  const W = 1024, PAD = 26, TAIL = 34, R = 44;
  const width = o.width ?? 0.9, history = o.history || [], maxChars = o.maxChars ?? 24;
  const wrap = (s) => { const out = []; let line = ''; for (const w of s.split(' ')) { if ((line + ' ' + w).trim().length > maxChars && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } if (line) out.push(line); return out; };
  const qLines = wrap(o.query || ''), rows = history.map((h) => wrap(h));
  const QH = 70, RH = 60, TOPH = 46 + qLines.length * QH;
  const texFor = (n) => {
    const rowLines = rows.slice(0, n).reduce((a, r) => a + r.length, 0);
    const cardH = TOPH + (n ? 22 + rowLines * RH + n * 18 + 14 : 0);
    const H = cardH + PAD * 2 + TAIL;
    const tex = canvasTex(W, H, (g) => {
      const x0 = PAD, y0 = PAD, w = W - PAD * 2;
      g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
      g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(x0, y0, w, cardH, R); g.fill();
      const tx = Math.min(W - PAD - 90, Math.max(PAD + 90, (0.5 + (o.offX ?? 0)) * W)); // tail points at the anchor (the head)
      g.beginPath(); g.moveTo(tx - 30, y0 + cardH - 2); g.lineTo(tx, y0 + cardH + TAIL - 4); g.lineTo(tx + 30, y0 + cardH - 2); g.fill();
      g.restore();
      // magnifier
      const my = y0 + 23 + QH / 2 + 4;
      g.strokeStyle = '#6b7078'; g.lineWidth = 9; g.beginPath(); g.arc(x0 + 62, my - 6, 20, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0 + 77, my + 9); g.lineTo(x0 + 92, my + 24); g.stroke();
      g.fillStyle = '#202124'; g.font = '600 56px Helvetica, Arial, sans-serif'; g.textBaseline = 'middle';
      qLines.forEach((l, i) => g.fillText(l, x0 + 122, y0 + 23 + QH / 2 + 2 + i * QH));
      if (!n) return;
      let y = y0 + TOPH + 4;
      g.fillStyle = '#e3e5e8'; g.fillRect(x0 + 30, y, w - 60, 4); y += 22;
      rows.slice(0, n).forEach((r) => {
        const cy = y + RH / 2;
        g.strokeStyle = '#9aa0a6'; g.lineWidth = 6; g.beginPath(); g.arc(x0 + 62, cy, 19, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 6; g.beginPath(); g.moveTo(x0 + 62, cy - 11); g.lineTo(x0 + 62, cy); g.lineTo(x0 + 71, cy + 6); g.stroke();
        g.fillStyle = '#5b2a9a'; g.font = '500 46px Helvetica, Arial, sans-serif';
        r.forEach((l, i) => g.fillText(l, x0 + 122, cy + i * RH));
        y += r.length * RH + 18;
      });
    });
    return { tex, aspect: H / W };
  };
  const texs = Array.from({ length: history.length + 1 }, (_, n) => texFor(n));
  const material = new THREE.SpriteMaterial({ map: texs[0].tex, color: o.color ?? 0xf2f2f2, transparent: true, depthWrite: false, toneMapped: false, fog: false });
  const sprite = new THREE.Sprite(material); sprite.center.set(0.5 + (o.offX ?? 0), 0); sprite.renderOrder = 5;
  let rowsShown = 0, pop = 1;
  const resize = () => { const a = texs[rowsShown].aspect; sprite.scale.set(width * pop, width * a * pop, 1); sprite.visible = pop > 0.001; };
  const setRows = (n) => { n = Math.max(0, Math.min(history.length, Math.floor(n))); if (n !== rowsShown) { rowsShown = n; material.map = texs[n].tex; } resize(); };
  const setPop = (k) => { pop = Math.max(0, k); resize(); };
  resize();
  return { sprite, material, setRows, setPop, width };
}

// ---------------------------------------------------------------- city bus + basketball hoop (010; reusable)
/**
 * City bus (12 m, faces +z, front at z=+L/2). Returns {g, body, wheels, setSag(k), setSign(text)}.
 * setSag(k 0..1): the body sinks onto its axles and rolls toward the curb (−x side) — "too heavy".
 */
export function makeBus({ color = 0x2f7d6a, stripe = 0xf2c14e, L = 12, sign = '42 DOWNTOWN' } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const W = 2.55, H = 3.0, paint = mat(color, 0.4), glass = new THREE.MeshStandardMaterial({ color: 0x1d2a38, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.55 });
  mk(new RoundedBoxGeometry(W, 0.9, L, 3, 0.12), paint, body, 0, 0.75, 0);                       // lower body
  mk(new RoundedBoxGeometry(W, 0.35, L, 3, 0.12), paint, body, 0, H - 0.18, 0);                  // roof
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) mk(new THREE.BoxGeometry(0.08, 1.55, 0.12), paint, body, s * (W / 2 - 0.04), 2.0, -L / 2 + 0.6 + k * (L - 1.2) / 5); // window pillars
  const win = mk(new THREE.BoxGeometry(W - 0.06, 1.55, L - 0.3), glass, body, 0, 2.0, 0); win.castShadow = false;            // glass box (people inside show through)
  mk(new THREE.BoxGeometry(W + 0.01, 0.16, L + 0.01), mat(stripe, 0.5), body, 0, 1.12, 0);
  const signTex = canvasTex(512, 96, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb21c'; c.font = 'bold 64px Helvetica, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sign, w / 2, h / 2 + 3); });
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false });
  const signM = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.34), signMat); signM.position.set(0, H - 0.5, L / 2 + 0.07); body.add(signM);
  const door = mk(new THREE.BoxGeometry(0.06, 2.1, 1.1), glass, body, -W / 2 - 0.01, 1.25, L / 2 - 1.6); door.castShadow = false;
  const wheels = [];
  for (const z of [L / 2 - 2.2, -L / 2 + 2.4]) for (const s of [-1, 1]) {
    const w = mk(new THREE.CylinderGeometry(0.5, 0.5, 0.32, 18), mat(0x1c1c1e, 0.8), g, s * (W / 2 - 0.15), 0.5, z); w.rotation.z = Math.PI / 2; wheels.push(w);
    mk(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 14), mat(0xbfc4ca, 0.3), w, 0, 0, 0);
  }
  const setSag = (k) => { body.position.y = -0.42 * k; body.rotation.z = 0.06 * k; wheels.forEach((w) => w.scale.set(1, 1, 1 - 0.18 * k)); };
  const setSign = (text) => { const c = signTex.image.getContext('2d'); c.fillStyle = '#111'; c.fillRect(0, 0, 512, 96); c.fillStyle = '#ffb21c'; c.font = 'bold 64px Helvetica, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 256, 51); signTex.needsUpdate = true; };
  return { g, body, wheels, door, setSag, setSign, W, H, L };
}
/** Driveway basketball hoop: pole + backboard + orange rim at y=3.05 (regulation). Rim center at (0, 3.05, 0.55) local. */
export function makeHoop() {
  const g = new THREE.Group(), metal = mat(0x3d4a45, 0.5);
  mk(new THREE.CylinderGeometry(0.07, 0.09, 3.6, 12), metal, g, 0, 1.8, -0.35);
  mk(new THREE.BoxGeometry(0.06, 0.06, 0.5), metal, g, 0, 3.35, -0.12);
  const board = mk(new THREE.BoxGeometry(1.8, 1.05, 0.05), new THREE.MeshStandardMaterial({ color: 0xf6f6f4, roughness: 0.3 }), g, 0, 3.4, 0.12);
  mk(new THREE.BoxGeometry(0.6, 0.45, 0.01), mat(0xd2483f, 0.5), g, 0, 3.27, 0.15).scale.set(1, 1, 1);
  mk(new THREE.BoxGeometry(0.52, 0.37, 0.012), new THREE.MeshStandardMaterial({ color: 0xf6f6f4, roughness: 0.3 }), g, 0, 3.27, 0.152);
  const rim = mk(new THREE.TorusGeometry(0.23, 0.018, 8, 28), mat(0xe2572b, 0.4), g, 0, 3.05, 0.4); rim.rotation.x = Math.PI / 2;
  const net = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.15, 0.4, 14, 3, true), new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.8 }));
  net.position.set(0, 2.84, 0.4); g.add(net);
  return { g, rim: new THREE.Vector3(0, 3.05, 0.4), board };
}
export function makeBasketball(r = 0.12) {
  const tex = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#e0722f'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a1a10'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.moveTo(w / 4, 0); c.lineTo(w / 4, h); c.moveTo((3 * w) / 4, 0); c.lineTo((3 * w) / 4, h); c.stroke(); });
  const g = new THREE.Group(); mk(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), g); return g;
}

// ---------------------------------------------------------------- dog, ceiling fan, mug (010 v2; reusable)
/** Toy dog (faces +z, ~0.45 m tall at the head). update(t, speed) trots the legs + wags the tail; bark(k) opens the mouth. */
export function makeDog({ color = 0xc98e4a, patch = 0xf2e6cf } = {}) {
  const g = new THREE.Group(), m = mat(color, 0.85), p = mat(patch, 0.85), dark = mat(0x1b1310, 0.4);
  const body = mk(new THREE.CapsuleGeometry(0.11, 0.26, 6, 12), m, g, 0, 0.27, 0); body.rotation.x = Math.PI / 2;
  mk(new THREE.SphereGeometry(0.09, 12, 10), p, g, 0, 0.24, 0.12).scale.set(1, 0.9, 1.2);
  const head = new THREE.Group(); head.position.set(0, 0.4, 0.2); g.add(head);
  mk(new THREE.SphereGeometry(0.1, 14, 12), m, head);
  const snout = mk(new THREE.SphereGeometry(0.06, 12, 10), p, head, 0, -0.03, 0.08); snout.scale.set(1, 0.8, 1.2);
  mk(new THREE.SphereGeometry(0.02, 8, 6), dark, head, 0, 0.0, 0.15);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.018, 8, 6), dark, head, s * 0.045, 0.035, 0.08); const ear = mk(new THREE.CapsuleGeometry(0.03, 0.08, 4, 8), mat(0x7a4f28, 0.85), head, s * 0.085, 0.03, -0.01); ear.rotation.z = s * 0.4; }
  const jaw = mk(new THREE.BoxGeometry(0.06, 0.015, 0.06), mat(0x8a2f2b, 0.6), head, 0, -0.07, 0.09);
  const legs = [];
  for (const [x, z] of [[-0.06, 0.14], [0.06, 0.14], [-0.06, -0.14], [0.06, -0.14]]) { const L = new THREE.Group(); L.position.set(x, 0.22, z); g.add(L); mk(new THREE.CapsuleGeometry(0.028, 0.14, 4, 8), m, L, 0, -0.1, 0); legs.push(L); }
  const tail = new THREE.Group(); tail.position.set(0, 0.33, -0.24); g.add(tail); const tm = mk(new THREE.CapsuleGeometry(0.02, 0.12, 4, 8), m, tail, 0, 0.07, -0.02); tm.rotation.x = -0.5;
  // 016: lying down (setLie 0..1 — body + head sink, front legs forward, back legs back) and a wag speed (setWag)
  const chest = g.children[1], base = [body, chest, head, tail].map((o) => o.position.y);
  let lie = 0, wag = 14;
  const update = (t, speed = 0) => {
    const ph = t * (8 + speed * 6);
    legs.forEach((L, i) => (L.rotation.x = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7 * Math.min(1, speed) * (1 - lie) + (i < 2 ? -1.45 : 1.45) * lie));
    g.children[0].position.y = 0.27 + Math.abs(Math.sin(ph)) * 0.02 * Math.min(1, speed) - 0.17 * lie;
    tail.rotation.z = Math.sin(t * wag) * 0.6;
  };
  const setLie = (k) => { lie = k; [body, chest, head, tail].forEach((o, i) => (o.position.y = base[i] - 0.17 * k)); legs.forEach((L) => (L.position.y = 0.22 - 0.15 * k)); };
  const setWag = (w) => { wag = w; };
  const bark = (k) => { jaw.position.y = -0.07 - 0.03 * k; head.rotation.x = -0.3 * k; };
  return { g, head, jaw, update, bark, setLie, setWag };
}
/** Ceiling fan (mount at the ceiling, hangs down 0.35 m). update(t, wobble) spins the blades; wobble 0..1 shakes it (after a bonk). */
export function makeCeilingFan() {
  const g = new THREE.Group(), wood = mat(0x7d5233, 0.6), metal = mat(0xc9c2b6, 0.3, { metalness: 0.5 });
  mk(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), metal, g, 0, -0.15, 0);
  const hub = new THREE.Group(); hub.position.y = -0.32; g.add(hub);
  mk(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 16), metal, hub);
  for (let i = 0; i < 4; i++) { const a = new THREE.Group(); a.rotation.y = (i * Math.PI) / 2; hub.add(a); mk(new THREE.BoxGeometry(0.62, 0.015, 0.14), wood, a, 0.4, 0, 0); }
  mk(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffd9a0, emissiveIntensity: 0.6 }), hub, 0, -0.09, 0);
  const update = (t, wobble = 0) => { hub.rotation.y = t * 7; g.rotation.z = wobble * 0.25 * Math.sin(t * 19); g.rotation.x = wobble * 0.18 * Math.sin(t * 15 + 1); };
  return { g, update };
}
export function makeMug(color = 0xd2483f) {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.04, 0.036, 0.09, 16, 1, true), mat(color, 0.4, { side: THREE.DoubleSide }), g, 0, 0.045, 0);
  mk(new THREE.CircleGeometry(0.036, 16), mat(0x3a2414, 0.2), g, 0, 0.075, 0).rotation.x = -Math.PI / 2;
  mk(new THREE.TorusGeometry(0.022, 0.007, 6, 12, Math.PI), mat(color, 0.4), g, 0.045, 0.045, 0).rotation.z = -Math.PI / 2;
  return g;
}

// ---------------------------------------------------------------- talking pets (016; reusable)
/**
 * makeSpeechBubble({ lines, name, accent, width, maxChars, offX, soft })
 *   A camera-facing speech bubble: rounded white card, a thin accent outline, an optional small name tag, bold lines below,
 *   and a tail pointing down at the speaker. Bottom-anchored like makeSearchBubble: put `sprite.position` just above the mouth.
 *   setRows(n) reveals lines 1..n (one prebuilt texture per count — the card grows upward, chat-style), setPop(k) scales it
 *   (0 = hidden; drive it with a boing). `soft: true` = a warm, quiet line (no shouting) for tender beats. `tail` (px, default 42)
 *   lengthens the tail so the card can float above a crowd and still point down at a small speaker (a goldfish).
 *   Unlit, slightly off-white so it never trips the bloom threshold (house rule for screens/cards).
 */
export function makeSpeechBubble(o = {}) {
  const W = 1024, PAD = 26, TAIL = o.tail ?? 42, R = 52;
  const lines = o.lines || [o.text || ''], width = o.width ?? 0.9, maxChars = o.maxChars ?? 20, accent = o.accent || '#e8553f';
  const soft = !!o.soft, FS = soft ? 74 : 72, LH = Math.round(FS * 1.16), GAP = 16, NAMEH = o.name ? 62 : 0;
  const font = `${soft ? '600' : '800'} ${FS}px Helvetica, Arial, sans-serif`;
  const wrap = (s) => { const out = []; let line = ''; for (const w of s.split(' ')) { if ((line + ' ' + w).trim().length > maxChars && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } if (line) out.push(line); return out; };
  const rows = lines.map(wrap);
  const texFor = (n) => {
    const nl = rows.slice(0, n).reduce((a, r) => a + r.length, 0);
    const cardH = 40 + NAMEH + nl * LH + Math.max(0, n - 1) * GAP + 30, H = cardH + PAD * 2 + TAIL;
    const tex = canvasTex(W, H, (g) => {
      const x0 = PAD, y0 = PAD, w = W - PAD * 2, tx = Math.min(W - PAD - 110, Math.max(PAD + 110, (0.5 + (o.offX ?? 0)) * W));
      const shape = () => { g.beginPath(); g.roundRect(x0, y0, w, cardH, R); g.moveTo(tx - 34, y0 + cardH - 2); g.lineTo(tx - 6, y0 + cardH + TAIL - 4); g.lineTo(tx + 30, y0 + cardH - 2); };
      g.save(); g.shadowColor = 'rgba(0,0,0,.38)'; g.shadowBlur = 20; g.shadowOffsetY = 7;
      g.fillStyle = soft ? '#fffaf0' : '#ffffff'; shape(); g.fill(); g.restore();
      g.lineWidth = 9; g.strokeStyle = accent; g.beginPath(); g.roundRect(x0 + 5, y0 + 5, w - 10, cardH - 10, R - 5); g.stroke();
      g.fillStyle = soft ? '#fffaf0' : '#ffffff'; g.beginPath(); g.moveTo(tx - 28, y0 + cardH - 14); g.lineTo(tx - 6, y0 + cardH + TAIL - 12); g.lineTo(tx + 24, y0 + cardH - 14); g.fill();
      let y = y0 + 34;
      if (o.name) { g.font = '800 36px Helvetica, Arial, sans-serif'; const nw = g.measureText(o.name).width + 44; g.fillStyle = accent; g.beginPath(); g.roundRect(x0 + 40, y - 6, nw, 48, 24); g.fill(); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(o.name, x0 + 62, y + 19); y += NAMEH; }
      g.font = font; g.fillStyle = soft ? '#3a2a1e' : '#1d1e22'; g.textBaseline = 'middle'; g.textAlign = 'center';
      rows.slice(0, n).forEach((r, k) => { r.forEach((l, i) => g.fillText(l, W / 2, y + LH / 2 + i * LH)); y += r.length * LH + GAP; });
    });
    return { tex, aspect: H / W };
  };
  const texs = [null, ...rows.map((_, i) => texFor(i + 1))];
  const material = new THREE.SpriteMaterial({ map: texs[1].tex, color: 0xf0f0f0, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false });
  const sprite = new THREE.Sprite(material); sprite.center.set(0.5 + (o.offX ?? 0), 0); sprite.renderOrder = 10;
  let shown = 1, pop = 1;
  const resize = () => { const a = texs[shown].aspect; sprite.scale.set(width * pop, width * a * pop, 1); sprite.visible = pop > 0.001; };
  const setRows = (n) => { n = Math.max(1, Math.min(rows.length, Math.floor(n))); if (n !== shown) { shown = n; material.map = texs[n].tex; } resize(); };
  const setPop = (k) => { pop = Math.max(0, k); resize(); };
  resize();
  return { sprite, material, setRows, setPop, width, rows: rows.length };
}

/** Sitting toy cat (faces +z, head top ~0.42 m). update(t) sways the tail; talk(k) opens the mouth; paw(k) raises the right
 *  front paw forward (0 → 1 = reaching out at chest height, for pushing a mug off a counter); squint(k) = the unimpressed look. */
export function makeCat({ color = 0xe08a3a, belly = 0xf6e7d2, stripe = 0xb4602a, nose = 0xe88a9a } = {}) {
  const g = new THREE.Group(), m = mat(color, 0.85), b = mat(belly, 0.85), dark = mat(0x1b1310, 0.35), st = mat(stripe, 0.85), pink = mat(nose, 0.6);
  mk(new THREE.SphereGeometry(0.1, 16, 12), m, g, 0, 0.1, -0.02).scale.set(0.95, 1.0, 1.1);              // seat / lower body
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.07, 12, 10), m, g, s * 0.07, 0.065, -0.03).scale.set(0.8, 0.9, 1.25);   // haunches
  const chest = mk(new THREE.CapsuleGeometry(0.07, 0.1, 6, 12), m, g, 0, 0.21, 0.025); chest.rotation.x = 0.3;
  mk(new THREE.SphereGeometry(0.055, 12, 10), b, g, 0, 0.19, 0.075).scale.set(1, 1.3, 0.7);             // white bib
  for (let k = 0; k < 3; k++) mk(new THREE.BoxGeometry(0.15, 0.02, 0.05), st, g, 0, 0.12 + k * 0.055, -0.1 + k * 0.025).rotation.x = 0.3;
  const legs = [];
  for (const s of [-1, 1]) {
    const L = new THREE.Group(); L.position.set(s * 0.04, 0.21, 0.07); g.add(L);
    mk(new THREE.CapsuleGeometry(0.022, 0.15, 4, 8), m, L, 0, -0.1, 0.0);
    mk(new THREE.SphereGeometry(0.027, 10, 8), b, L, 0, -0.195, 0.012).scale.set(1, 0.7, 1.2);
    legs.push(L);
  }
  const head = new THREE.Group(); head.position.set(0, 0.34, 0.05); g.add(head);
  mk(new THREE.SphereGeometry(0.085, 18, 14), m, head).scale.set(1.12, 0.95, 1.0);
  mk(new THREE.SphereGeometry(0.036, 12, 10), b, head, 0, -0.03, 0.068).scale.set(1.35, 0.8, 0.8);
  mk(new THREE.SphereGeometry(0.012, 8, 6), pink, head, 0, -0.008, 0.09);
  const eyes = [];
  for (const s of [-1, 1]) {
    eyes.push(mk(new THREE.SphereGeometry(0.016, 10, 8), dark, head, s * 0.036, 0.015, 0.074));
    const ear = mk(new THREE.ConeGeometry(0.034, 0.075, 4), m, head, s * 0.056, 0.08, 0.0); ear.rotation.z = -s * 0.35; ear.rotation.y = Math.PI / 4;
    const inner = mk(new THREE.ConeGeometry(0.02, 0.05, 4), pink, head, s * 0.054, 0.074, 0.012); inner.rotation.z = -s * 0.35; inner.rotation.y = Math.PI / 4;
    for (let k = -1; k <= 1; k++) { const w = mk(new THREE.CylinderGeometry(0.0016, 0.0016, 0.09, 4), mat(0xffffff, 0.5), head, s * 0.07, -0.028 + k * 0.009, 0.07); w.rotation.z = Math.PI / 2 + k * 0.15 * s; w.castShadow = false; }
    mk(new THREE.BoxGeometry(0.035, 0.008, 0.01), st, head, s * 0.03, 0.065, 0.06).rotation.z = s * 0.3;   // brow stripes
  }
  const jaw = mk(new THREE.BoxGeometry(0.03, 0.008, 0.02), mat(0x8a2f3b, 0.6), head, 0, -0.05, 0.074);
  const tail = []; let prev = g;
  for (let k = 0; k < 5; k++) { const s = new THREE.Group(); s.position.set(0, k ? 0.07 : 0.03, k ? 0 : -0.12); prev.add(s); mk(new THREE.CapsuleGeometry(0.018, 0.06, 4, 8), k === 4 ? st : m, s, 0, 0.035, 0); tail.push(s); prev = s; }
  const update = (t, swish = 1) => tail.forEach((s, k) => { s.rotation.x = k === 0 ? -1.2 : 0.32; s.rotation.z = Math.sin(t * 2.2 - k * 0.6) * 0.22 * swish; });
  const talk = (k) => { jaw.position.y = -0.05 - 0.016 * k; jaw.scale.set(1, 1 + 2.5 * k, 1); };
  const paw = (k) => { legs[1].rotation.x = -1.35 * k; };
  const squint = (k) => eyes.forEach((e) => e.scale.set(1.15, 1 - 0.65 * k, 1));
  update(0);
  return { g, head, legs, update, talk, paw, squint };
}

/** Toy macaw on a perch (faces +z; feet at y=0, head top ~0.31 m, tail hangs ~0.2 m below the feet).
 *  talk(k) opens the beak; update(t, flap) bobs the head and flaps the wings (flap 0..1). */
export function makeParrot({ body = 0xd8352a, wingA = 0xf2c230, wingB = 0x2f6fd0, face = 0xfaf6ee } = {}) {
  const g = new THREE.Group(), m = mat(body, 0.7), dark = mat(0x161616, 0.3);
  const torso = mk(new THREE.CapsuleGeometry(0.06, 0.12, 6, 12), m, g, 0, 0.12, 0); torso.rotation.x = 0.22;
  const head = new THREE.Group(); head.position.set(0, 0.25, 0.035); g.add(head);
  mk(new THREE.SphereGeometry(0.058, 16, 12), m, head);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.03, 10, 8), mat(face, 0.7), head, s * 0.032, -0.005, 0.035).scale.set(0.6, 1.1, 0.8); mk(new THREE.SphereGeometry(0.0105, 8, 6), dark, head, s * 0.036, 0.012, 0.052); }
  const beak = mk(new THREE.ConeGeometry(0.026, 0.065, 12), mat(0xefe6d2, 0.4), head, 0, -0.012, 0.064); beak.rotation.x = Math.PI * 0.62;
  const jaw = mk(new THREE.ConeGeometry(0.016, 0.03, 10), mat(0x2a2a2a, 0.5), head, 0, -0.042, 0.05); jaw.rotation.x = Math.PI * 0.42;
  const wings = [-1, 1].map((s) => { const w = new THREE.Group(); w.position.set(s * 0.055, 0.17, 0.0); g.add(w); mk(new THREE.SphereGeometry(0.055, 12, 10), mat(wingA, 0.7), w, s * 0.012, -0.02, 0).scale.set(0.35, 1.0, 0.95); mk(new THREE.SphereGeometry(0.05, 12, 10), mat(wingB, 0.7), w, s * 0.014, -0.085, -0.012).scale.set(0.33, 1.25, 0.85); return w; });
  const tail = mk(new THREE.CapsuleGeometry(0.018, 0.2, 4, 8), m, g, 0, -0.05, -0.07); tail.rotation.x = -0.35;
  mk(new THREE.CapsuleGeometry(0.014, 0.08, 4, 8), mat(wingB, 0.7), g, 0, -0.16, -0.11).rotation.x = -0.35;
  for (const s of [-1, 1]) mk(new THREE.CapsuleGeometry(0.012, 0.03, 4, 6), mat(0x5a5a5a, 0.6), g, s * 0.025, 0.012, 0.012).rotation.x = Math.PI / 2;
  const talk = (k) => { jaw.rotation.x = Math.PI * 0.42 + 0.6 * k; jaw.position.y = -0.042 - 0.012 * k; };
  const update = (t, flap = 0) => {
    head.rotation.z = 0.12 * Math.sin(t * 1.7); head.rotation.x = 0.05 * Math.sin(t * 2.3);
    wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.05 + flap * (0.5 + 0.7 * Math.sin(t * 22)))));
  };
  return { g, head, wings, talk, update };
}
/** A T-perch stand (base disc + pole + crossbar). The bird's feet go at y = h. */
export function makePerch(h = 1.2) {
  const g = new THREE.Group(), wood = mat(0x8a5a36, 0.7);
  mk(new THREE.CylinderGeometry(0.2, 0.22, 0.04, 20), mat(0x5a4a3e, 0.7), g, 0, 0.02, 0);
  mk(new THREE.CylinderGeometry(0.018, 0.022, h, 10), wood, g, 0, h / 2, 0);
  mk(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 10), wood, g, 0, h - 0.015, 0).rotation.z = Math.PI / 2;
  mk(new THREE.CylinderGeometry(0.035, 0.03, 0.04, 12), mat(0xd9d4c8, 0.4), g, 0.17, h + 0.005, 0);   // a little food cup
  return { g, h };
}

/** Goldfish bowl (bottom at y=0, radius r) with gravel, a plant and one goldfish. update(t, face) swims the fish in a circle;
 *  face 0..1 brings it to the front glass looking at +z (to "talk"); talk(k) opens its mouth. Glass + water are see-through. */
export function makeFishBowl({ r = 0.16, fishColor = 0xf28a2a } = {}) {
  const g = new THREE.Group(), cy = r * 0.92;
  const glass = mk(new THREE.SphereGeometry(r, 32, 22, 0, Math.PI * 2, Math.PI * 0.2, Math.PI * 0.72), new THREE.MeshStandardMaterial({ color: 0xe6f6ff, roughness: 0.05, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }), g, 0, cy, 0);
  glass.renderOrder = 3; glass.castShadow = false;
  const water = mk(new THREE.SphereGeometry(r * 0.97, 28, 18, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.62), new THREE.MeshStandardMaterial({ color: 0x6fc0ea, roughness: 0.1, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }), g, 0, cy, 0);
  water.renderOrder = 2; water.castShadow = false;
  const wy = cy + r * 0.97 * Math.cos(Math.PI * 0.3), wr = r * 0.97 * Math.sin(Math.PI * 0.3);
  const surf = mk(new THREE.CircleGeometry(wr, 28), new THREE.MeshStandardMaterial({ color: 0x9fd8f2, roughness: 0.05, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }), g, 0, wy, 0); surf.rotation.x = -Math.PI / 2; surf.renderOrder = 2; surf.castShadow = false;
  const rimY = cy + r * Math.cos(Math.PI * 0.2), rimR = r * Math.sin(Math.PI * 0.2);
  mk(new THREE.TorusGeometry(rimR, 0.006, 6, 28), new THREE.MeshStandardMaterial({ color: 0xe6f6ff, roughness: 0.1, transparent: true, opacity: 0.5 }), g, 0, rimY, 0).rotation.x = Math.PI / 2;
  const R2 = rng(7);
  for (let k = 0; k < 26; k++) { const a = R2() * Math.PI * 2, d = Math.sqrt(R2()) * r * 0.62; mk(new THREE.SphereGeometry(0.014, 6, 5), mat([0xe2574c, 0x4f9bd9, 0xf2c14e, 0xf2efe8, 0x6fa84f][k % 5], 0.6), g, Math.cos(a) * d, 0.035 + R2() * 0.012, Math.sin(a) * d); }
  for (let k = 0; k < 3; k++) { const p = mk(new THREE.CapsuleGeometry(0.008, 0.09 + k * 0.03, 4, 6), mat(0x3f9a4a, 0.7), g, -r * 0.35 + k * 0.025, 0.1 + k * 0.015, -r * 0.3); p.rotation.z = (k - 1) * 0.25; }
  const fish = new THREE.Group(); g.add(fish);
  const fm = mat(fishColor, 0.5);
  mk(new THREE.SphereGeometry(0.034, 14, 10), fm, fish).scale.set(0.72, 0.85, 1.25);
  const tail = new THREE.Group(); tail.position.set(0, 0, -0.04); fish.add(tail);
  const tf = mk(new THREE.ConeGeometry(0.03, 0.05, 3), fm, tail, 0, 0, -0.02); tf.rotation.x = -Math.PI / 2; tf.scale.set(0.25, 1, 1.3);
  mk(new THREE.ConeGeometry(0.014, 0.03, 3), fm, fish, 0, 0.032, -0.005).scale.set(0.25, 1, 1.4);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.011, 8, 6), mat(0xffffff, 0.3), fish, s * 0.018, 0.012, 0.028); mk(new THREE.SphereGeometry(0.0065, 8, 6), mat(0x111111, 0.3), fish, s * 0.022, 0.013, 0.034); }
  const mouth = mk(new THREE.TorusGeometry(0.006, 0.0025, 6, 12), mat(0xb8452a, 0.5), fish, 0, -0.004, 0.042);
  const swimY = cy - r * 0.05;
  const update = (t, face = 0) => {
    const a = t * 1.1, rr = r * 0.42, x = Math.cos(a) * rr, z = Math.sin(a) * rr, head = Math.atan2(-Math.sin(a), Math.cos(a));
    fish.position.set(x * (1 - face), swimY + 0.012 * Math.sin(t * 2.3), z * (1 - face) + face * r * 0.45);
    fish.rotation.y = head + (0 - head) * face;
    tail.rotation.y = Math.sin(t * (10 - 6 * face)) * 0.45;
  };
  const talk = (k) => mouth.scale.setScalar(1 + 1.4 * k);
  update(0);
  return { g, fish, update, talk, top: rimY };
}

/** Toy hamster (faces +z, ~0.11 m long). update(t, run) bobs it (run 0..1 = scurrying); stand(k) rears up on its hind legs with
 *  its front paws raised (for holding a tiny sign; `paws` are attach points); talk(k) opens the mouth. */
export function makeHamster({ color = 0xe2a65e, belly = 0xf7ecdc } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const m = mat(color, 0.9), b = mat(belly, 0.9), pink = mat(0xf0a8b0, 0.6), dark = mat(0x111111, 0.3);
  mk(new THREE.SphereGeometry(0.045, 14, 12), m, body, 0, 0.042, -0.005).scale.set(1.0, 0.88, 1.2);
  mk(new THREE.SphereGeometry(0.036, 12, 10), b, body, 0, 0.03, 0.012).scale.set(0.95, 0.75, 1.15);
  const head = new THREE.Group(); head.position.set(0, 0.052, 0.04); body.add(head);
  mk(new THREE.SphereGeometry(0.034, 14, 12), m, head);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.019, 10, 8), b, head, s * 0.02, -0.012, 0.016); mk(new THREE.SphereGeometry(0.012, 8, 6), pink, head, s * 0.02, 0.03, -0.004).scale.set(1, 1, 0.5); mk(new THREE.SphereGeometry(0.0068, 8, 6), dark, head, s * 0.017, 0.01, 0.029); }
  mk(new THREE.SphereGeometry(0.0055, 8, 6), pink, head, 0, -0.002, 0.034);
  const jaw = mk(new THREE.BoxGeometry(0.012, 0.004, 0.006), mat(0x8a2f3b, 0.6), head, 0, -0.016, 0.03);
  const paws = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.022, 0.03, 0.045); body.add(p); mk(new THREE.SphereGeometry(0.009, 8, 6), pink, p); return p; });
  const feet = [-1, 1].map((s) => mk(new THREE.SphereGeometry(0.01, 8, 6), pink, g, s * 0.025, 0.006, -0.03));
  let st = 0;
  const update = (t, run = 0) => {
    body.position.y = run * 0.006 * Math.abs(Math.sin(t * 28)); body.position.z = 0;
    if (st < 0.01) paws.forEach((p, i) => (p.position.y = 0.012 + 0.008 * run * Math.max(0, Math.sin(t * 28 + i * Math.PI))));
    feet.forEach((f, i) => (f.position.z = -0.03 + 0.012 * run * Math.sin(t * 28 + i * Math.PI)));
  };
  const stand = (k) => { st = k; body.rotation.x = -1.15 * k; body.position.y = 0.0; paws.forEach((p, i) => { p.position.set((i ? 1 : -1) * (0.022 + 0.012 * k), 0.03 + 0.03 * k, 0.045 + 0.01 * k); }); };
  const talk = (k) => jaw.scale.set(1, 1 + 3 * k, 1);
  return { g, body, head, paws, update, stand, talk };
}
/** Hamster wheel on an A-frame stand: wheel radius r, axis along z (the camera sees its face). spin(angle) turns it.
 *  The runner stands at the wheel's bottom: (0, axleY − r + 0.008, 0) local, facing ±x. */
export function makeHamsterWheel({ r = 0.1, color = 0x3d9be0 } = {}) {
  const g = new THREE.Group(), axleY = r + 0.03, wheel = new THREE.Group(); wheel.position.y = axleY; g.add(wheel);
  const pm = mat(color, 0.4), metal = mat(0xd9dde2, 0.3, { metalness: 0.5 });
  for (const z of [-0.035, 0.035]) mk(new THREE.TorusGeometry(r, 0.006, 6, 32), pm, wheel, 0, 0, z);
  for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2, c = mk(new THREE.CylinderGeometry(0.0025, 0.0025, 0.07, 4), metal, wheel, Math.cos(a) * r, Math.sin(a) * r, 0); c.rotation.x = Math.PI / 2; }
  for (let k = 0; k < 4; k++) { const sp = mk(new THREE.BoxGeometry(r * 2, 0.006, 0.006), pm, wheel, 0, 0, -0.035); sp.rotation.z = (k / 4) * Math.PI; }
  mk(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 12), pm, wheel, 0, 0, -0.04).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) { const leg = mk(new THREE.BoxGeometry(0.012, axleY * 1.08, 0.012), pm, g, s * 0.03, axleY / 2, -0.05); leg.rotation.z = s * 0.3; }
  mk(new THREE.BoxGeometry(0.14, 0.012, 0.06), pm, g, 0, 0.006, -0.05);
  return { g, wheel, r, axleY, spin: (a) => (wheel.rotation.z = a) };
}

// ---------------------------------------------------------------- ants (dh002)
/** A cartoon ant, Labrador-sized at scale 1 (~1.1 m from mandibles to gaster, back at ~0.45 m). Faces +z, feet on y = 0.
 *  update(t, o): tripod gait (L1 R2 L3 swing while R1 L2 R3 push) driven by o.dist (meters walked; pure, so foley can mirror
 *  it) or, without dist, an idle shuffle; antennae sway + sniff; o.carry 0..1 lifts the head and opens the jaws (an object
 *  rides at `carryAt` in the ant's local space), o.mouth 0..1 opens the mandibles, o.look = head yaw, o.rear 0..1 rears up.
 *  Parts for tints: mats.body / mats.leg. makeAntSwarm(n) renders hundreds of these, legs and all. */
export function makeAnt({ color = 0x5a2a18, leg = 0x2e1a10, scale = 1 } = {}) {
  const g = new THREE.Group(); g.scale.setScalar(scale);
  const bodyM = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.08 });
  const legM = new THREE.MeshStandardMaterial({ color: leg, roughness: 0.45 });
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.12 });
  const shineM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const Y = new THREE.Vector3(0, 1, 0);
  /** a capsule from a to b (vectors in parent space) */
  const limb = (a, b, r, m, p) => {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length();
    const o = mk(new THREE.CapsuleGeometry(r, Math.max(0.001, L - r), 3, 8), m, p, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    o.quaternion.setFromUnitVectors(Y, d.normalize()); return o;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const body = new THREE.Group(); g.add(body);                          // bobs with the gait
  const thorax = mk(new THREE.SphereGeometry(0.1, 14, 10), bodyM, body, 0, 0.42, 0.08); thorax.scale.set(0.95, 0.95, 1.75); thorax.rotation.x = -0.28;
  mk(new THREE.SphereGeometry(0.06, 10, 8), bodyM, body, 0, 0.4, -0.13);                              // petiole node
  const gasterG = new THREE.Group(); gasterG.position.set(0, 0.42, -0.17); body.add(gasterG);          // pivot at the waist
  const gaster = mk(new THREE.SphereGeometry(0.17, 16, 12), bodyM, gasterG, 0, -0.02, -0.19); gaster.scale.set(1, 0.9, 1.3);
  const head = new THREE.Group(); head.position.set(0, 0.47, 0.25); body.add(head);                  // pivot at the neck
  const skull = mk(new THREE.SphereGeometry(0.155, 16, 12), bodyM, head, 0, 0.05, 0.14); skull.scale.set(1.05, 0.92, 0.95);
  for (const s of [-1, 1]) {
    const e = mk(new THREE.SphereGeometry(0.062, 12, 10), eyeM, head, s * 0.088, 0.1, 0.235); e.scale.set(0.85, 1, 0.8);
    mk(new THREE.SphereGeometry(0.019, 8, 6), shineM, head, s * 0.1, 0.13, 0.283);
  }
  const jaws = [-1, 1].map((s) => {
    const j = new THREE.Group(); j.position.set(s * 0.06, -0.02, 0.27); head.add(j);
    limb(V(0, 0, 0), V(s * 0.02, -0.02, 0.09), 0.026, legM, j); limb(V(s * 0.02, -0.02, 0.09), V(-s * 0.05, -0.03, 0.13), 0.02, legM, j);
    j.s = s; return j;
  });
  const antennae = [-1, 1].map((s) => {
    const a = new THREE.Group(); a.position.set(s * 0.06, 0.16, 0.24); head.add(a);
    limb(V(0, 0, 0), V(s * 0.1, 0.17, 0.05), 0.016, legM, a);                                           // scape (up + out)
    const f = new THREE.Group(); f.position.set(s * 0.1, 0.17, 0.05); a.add(f);
    limb(V(0, 0, 0), V(s * 0.04, 0.02, 0.24), 0.013, legM, f);                                         // funiculus (forward)
    mk(new THREE.SphereGeometry(0.024, 8, 6), legM, f, s * 0.04, 0.02, 0.25);
    a.s = s; a.f = f; return a;
  });
  // legs: [front, mid, hind] × [−x, +x]; femur goes out + up to a knee, tibia comes down to the foot on y = 0
  const LEGS = [[0.17, 0.2, 0.3], [0.08, 0.02, 0.04], [-0.01, -0.14, -0.3]];   // [hip z, knee z, foot z]
  const legs = [];
  LEGS.forEach(([hz, kz, fz], pair) => [-1, 1].forEach((s) => {
    const r = new THREE.Group(); r.position.set(s * 0.07, 0.37, hz); body.add(r);
    const knee = V(s * 0.23, 0.15, kz - hz), foot = V(s * 0.34, -0.365, fz - hz);
    limb(V(0, 0, 0), knee, 0.036, legM, r); limb(knee, foot, 0.027, legM, r);
    mk(new THREE.SphereGeometry(0.032, 8, 6), legM, r, foot.x, foot.y, foot.z);
    r.s = s; r.tri = (pair + (s > 0 ? 1 : 0)) % 2;                                                     // tripod 0 = L1 R2 L3
    legs.push(r);
  }));
  const STRIDE = 0.46;                                                                                    // meters per gait cycle
  const carryAt = V(0, 1.02, 0.12);
  function update(t, o = {}) {
    const moving = o.dist !== undefined, ph = moving ? (o.dist / STRIDE) * Math.PI * 2 : t * 2.1, amp = moving ? Math.min(1, (o.speed ?? 1) * 2 + 0.25) : 0.12;
    legs.forEach((r, i) => {
      const p = ph + (r.tri ? Math.PI : 0);
      r.rotation.set(0, -r.s * 0.42 * amp * Math.sin(p), r.s * 0.32 * amp * Math.max(0, Math.cos(p)));
    });
    const carry = o.carry ?? 0, rear = o.rear ?? 0;
    body.position.y = 0.012 * amp * Math.abs(Math.sin(ph * 2)) * (moving ? 1 : 0);
    body.rotation.x = -0.55 * rear; body.position.z = -0.12 * rear; body.position.y += 0.08 * rear;
    gasterG.rotation.x = 0.06 * Math.sin(ph * 2) * amp + 0.15 * carry + 0.35 * rear; gasterG.rotation.y = 0.07 * Math.sin(ph) * amp;
    head.rotation.set(-0.42 * carry + 0.05 * Math.sin(t * 1.3), (o.look ?? 0) + 0.06 * Math.sin(t * 0.9 + 1), 0);
    const open = Math.max(o.mouth ?? 0, carry * 0.6);
    jaws.forEach((j) => (j.rotation.y = j.s * (0.05 + 0.5 * open)));
    antennae.forEach((a) => {
      const w = Math.sin(t * 3.1 + a.s * 1.3) * 0.22 + Math.max(0, Math.sin(t * 0.8 + a.s)) ** 6 * 0.5 * Math.sin(t * 17);   // lazy sway + a quick sniff
      a.rotation.set(-0.15 + w * 0.6 - 0.3 * carry, a.s * w * 0.4, 0); a.f.rotation.x = 0.2 + 0.25 * Math.sin(t * 2.3 + a.s);
    });
  }
  update(0);
  return { g, body, head, gasterG, jaws, legs, update, carryAt, mats: { body: bodyM, leg: legM }, STRIDE };
}

/** Hundreds of ants in a handful of draw calls: every mesh of a template ant becomes an InstancedMesh. Per frame call
 *  begin(), then add(x, y, z, rotY, scale, o) for each ant (o = the same options as makeAnt's update: t, dist, speed, carry…),
 *  then end(). Positions are in the swarm group's parent space. */
export function makeAntSwarm(n, opts = {}) {
  const tpl = makeAnt(opts), meshes = [];
  tpl.g.traverse((o) => o.isMesh && meshes.push(o));
  const g = new THREE.Group();
  const inst = meshes.map((m) => { const im = new THREE.InstancedMesh(m.geometry, m.material, n); im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true; im.count = 0; g.add(im); return im; });
  let k = 0;
  const begin = () => { k = 0; };
  function add(x, y, z, rotY, s, o = {}) {
    if (k >= n) return;
    tpl.g.position.set(x, y, z); tpl.g.scale.setScalar(s);
    if (o.quat) tpl.g.quaternion.copy(o.quat); else tpl.g.rotation.set(o.pitch ?? 0, rotY, o.roll ?? 0, 'YXZ');   // quat: any orientation (climbing a wall)
    tpl.update(o.t ?? 0, o); tpl.g.updateMatrixWorld(true);
    meshes.forEach((m, j) => inst[j].setMatrixAt(k, m.matrixWorld)); k++;
  }
  const end = () => inst.forEach((im) => { im.count = k; im.instanceMatrix.needsUpdate = true; });
  return { g, begin, add, end, mats: tpl.mats, get count() { return k; } };
}
