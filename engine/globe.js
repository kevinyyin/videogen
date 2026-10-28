// Toy/hologram Earth for "what if" world-scale stories: painted land + borders (Natural Earth 1:110m, baked in
// engine/data/world110.js), soft rim glow, and instanced glowing dots you can switch on/off per dot (warheads, cities,
// labs...). Used by videos/005-no-nukes. Everything is local + deterministic.
//
//   const globe = makeGlobe({ r: 0.55 });             scene.add(globe.g)   (rotate globe.spin.rotation.y to turn the Earth)
//   globe.toLocal(lat, lon, h)                         -> Vector3 in the spinning frame (h = height above the surface)
//   const d = makeDots(globe, pts, { size, color })    pts = [{lat, lon}] ; d.set(i, scale) / d.setAll(fn) then d.commit()
//   const b = makeBars(globe, [{lat, lon, h}], {...})   glowing columns (bar chart on the globe); b.setHeights(k)
//   scatter(R, sites, n)                               n points spread (gaussian) around weighted [{lat, lon, w, s}] sites
import * as THREE from 'three';
import { canvasTex, rng } from '@engine/core.js';
import { COUNTRIES } from '@engine/data/world110.js';

const D2R = Math.PI / 180;

/** Same mapping as THREE.SphereGeometry's UVs (equirectangular texture, lon -180 at u=0). */
export function latLonToVec(lat, lon, r, out = new THREE.Vector3()) {
  const phi = ((lon + 180) / 360) * Math.PI * 2, cl = Math.cos(lat * D2R);
  return out.set(-Math.cos(phi) * cl * r, Math.sin(lat * D2R) * r, Math.sin(phi) * cl * r);
}
/** rotation.y for the spin group that brings longitude `lon` to face +z (toward a camera on +z). */
export const faceLon = (lon) => Math.PI / 2 - ((lon + 180) / 360) * Math.PI * 2;

/**
 * o: { r, ocean, land, border, grid, highlight: {ADM0_A3: color}, glow, glowColor, emissive }
 * returns { g (tilt group), spin (rotate .rotation.y), mesh, mat, toLocal, r }
 */
export function makeGlobe(o = {}) {
  const r = o.r ?? 0.55;
  const tex = canvasTex(4096, 2048, (g, w, h) => {
    g.fillStyle = o.ocean ?? '#0d2340'; g.fillRect(0, 0, w, h);
    // faint ocean grain so the water isn't flat
    const R = rng(21);
    for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(120,170,230,${R() * 0.05})`; g.fillRect(R() * w, R() * h, 2 + R() * 6, 1 + R() * 2); }
    // graticule
    g.strokeStyle = o.grid ?? 'rgba(140,190,255,.16)'; g.lineWidth = 2;
    for (let lon = -180; lon <= 180; lon += 15) { const x = ((lon + 180) / 360) * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let lat = -75; lat <= 75; lat += 15) { const y = ((90 - lat) / 180) * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const X = (lon) => ((lon / 10 + 180) / 360) * w, Y = (lat) => ((90 - lat / 10) / 180) * h;
    const path = (ring) => { g.beginPath(); for (let i = 0; i < ring.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, X(ring[i]), Y(ring[i + 1])); g.closePath(); };
    for (const [code, rings] of Object.entries(COUNTRIES)) {
      g.fillStyle = o.highlight?.[code] ?? o.land ?? '#3f8f86';
      for (const ring of rings) { path(ring); g.fill(); }
    }
    g.strokeStyle = o.border ?? 'rgba(210,245,235,.55)'; g.lineWidth = 2.2; g.lineJoin = 'round';
    for (const rings of Object.values(COUNTRIES)) for (const ring of rings) { path(ring); g.stroke(); }
  });
  // Lambert (no specular) + near-black diffuse + emissive map: the globe reads as a self-lit hologram and never picks up a
  // warm highlight/haze from the room's key light (a Standard material gave the top of the ocean a tan sheen).
  const mat = new THREE.MeshLambertMaterial({ map: tex, color: o.diffuse ?? 0x0c0c0c, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: o.emissive ?? 0.9 });
  const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
  g.rotation.z = o.tilt ?? 0;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 128, 64), mat); mesh.castShadow = false; mesh.receiveShadow = false; spin.add(mesh);

  // rim glow (fresnel, additive, back faces of a slightly bigger sphere)
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(o.glowColor ?? 0x6fb6ff) }, uI: { value: o.glow ?? 0.9 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uI; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.2); gl_FragColor = vec4(uColor * f * uI, f * uI); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontFace,
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 64, 32), glowMat); glow.castShadow = false; g.add(glow);

  const toLocal = (lat, lon, h = 0, out) => latLonToVec(lat, lon, r + h, out);
  return { g, spin, mesh, mat, glow, glowMat, toLocal, r, tex };
}

/** Gaussian scatter of n points around weighted sites [{lat, lon, w, s (spread deg)}]. Deterministic (pass rng). */
export function scatter(R, sites, n) {
  const W = sites.reduce((a, s) => a + (s.w ?? 1), 0), out = [];
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = R(); v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  let k = 0;
  sites.forEach((s, si) => {
    const m = si === sites.length - 1 ? n - k : Math.round((n * (s.w ?? 1)) / W);
    for (let i = 0; i < m; i++) out.push({ lat: s.lat + gauss() * (s.s ?? 1), lon: s.lon + gauss() * (s.s ?? 1) * 1.4, site: si });
    k += m;
  });
  return out.slice(0, n);
}

/**
 * Instanced glowing dots on the globe. pts = [{lat, lon}], o: { size, color, h, intensity }.
 * set(i, scale) then commit() once per frame (only re-uploads when something changed).
 */
export function makeDots(globe, pts, o = {}) {
  const geo = new THREE.SphereGeometry(o.size ?? 0.005, 8, 6);
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color ?? 0xff5a3c).multiplyScalar(o.intensity ?? 2.2), toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, m, pts.length); mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  const base = pts.map((p) => globe.toLocal(p.lat, p.lon, o.h ?? 0.002));
  const scale = new Float32Array(pts.length).fill(1), last = new Float32Array(pts.length).fill(-1);
  const M = new THREE.Matrix4(), S = new THREE.Vector3(), Q = new THREE.Quaternion();
  const set = (i, s) => { scale[i] = s; };
  const setAll = (fn) => { for (let i = 0; i < pts.length; i++) scale[i] = fn(i, pts[i]); };
  function commit() {
    let dirty = false;
    for (let i = 0; i < pts.length; i++) {
      if (Math.abs(scale[i] - last[i]) < 1e-4) continue;
      last[i] = scale[i]; dirty = true;
      const s = Math.max(scale[i], 1e-5); M.compose(base[i], Q, S.set(s, s, s)); mesh.setMatrixAt(i, M);
    }
    if (dirty) mesh.instanceMatrix.needsUpdate = true;
  }
  globe.spin.add(mesh); commit();
  return { mesh, mat: m, pts, base, set, setAll, commit };
}

/** Glowing columns standing on the globe (radial). items = [{lat, lon, h}]; setHeights(k) scales all by k (0..1) or setHeights(fn(i)). */
export function makeBars(globe, items, o = {}) {
  const grp = new THREE.Group(); globe.spin.add(grp);
  const mat = new THREE.MeshStandardMaterial({ color: o.color ?? 0xf3c46b, emissive: o.color ?? 0xf3c46b, emissiveIntensity: o.emissive ?? 0.9, roughness: 0.4, transparent: true, opacity: o.opacity ?? 0.92 });
  const bars = items.map((it) => {
    const geo = new THREE.CylinderGeometry(o.radius ?? 0.016, o.radius ?? 0.016, 1, 20); geo.translate(0, 0.5, 0);
    const m = new THREE.Mesh(geo, mat); m.castShadow = false;
    const p = globe.toLocal(it.lat, it.lon, 0); m.position.copy(p);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize());
    grp.add(m); return { m, it };
  });
  const setHeights = (k) => bars.forEach((b, i) => { const v = typeof k === 'function' ? k(i) : k; const hh = Math.max(1e-4, b.it.h * v); b.m.scale.set(1, hh, 1); b.m.visible = v > 0.001; });
  setHeights(0);
  return { grp, bars, mat, setHeights };
}
