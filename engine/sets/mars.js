// SET: Mars colony site — rusty terrain with dunes + rocks, butterscotch sky, a landing pad, and a city that can BUILD ITSELF
// (time-lapse): solar fields, glass domes, connecting tubes, towers, all with growth handles. Built for video 007.
//
// Coordinates (meters, y up), set-local. Landing pad at the origin. The colony spreads toward -z:
//   pad at DIMS.pad (18, 8); central dome r=9 at (0,-22); ring domes r 4–6; tubes join them to the central dome; towers behind; solar fields at x=±32.
// Handles: setBuild(k 0..1)  — everything grows in a fixed order (fields → domes → tubes → towers), each piece eases up from 0
//          setDusk(k 0..1)   — sky/sun go to dusk and the colony's lights come on
//          lander: { g, flame } — a landing rocket (position it yourself), dust(t0, t) — expanding landing dust ring
// The camera far plane should be ≥ 800 (terrain + sky dome).
import * as THREE from 'three';
import { mat, mk, canvasTex, rng, clamp, lerp } from '@engine/core.js';

export const DIMS = { pad: [18, 8], center: [0, -22] };   // pad off to the side so the lander never hides the colony

function groundTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#b4623a'; g.fillRect(0, 0, w, h);
    const R = rng(4);
    for (let i = 0; i < 2600; i++) { const c = R(); g.fillStyle = c < 0.5 ? `rgba(90,40,20,${0.05 + R() * 0.08})` : `rgba(230,160,110,${0.04 + R() * 0.07})`; g.beginPath(); g.arc(R() * w, R() * h, 2 + R() * 14, 0, 7); g.fill(); }
  }, [30, 30]);
}
function skyTex(dusk) {
  return canvasTex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (!dusk) { gr.addColorStop(0, '#b98a5e'); gr.addColorStop(0.45, '#e2b98c'); gr.addColorStop(0.5, '#efcaa0'); gr.addColorStop(1, '#efcaa0'); }
    else { gr.addColorStop(0, '#2c2a40'); gr.addColorStop(0.38, '#6c5a6a'); gr.addColorStop(0.47, '#9db3d6'); gr.addColorStop(0.5, '#c9a68a'); gr.addColorStop(1, '#c9a68a'); } // Martian sunsets are blue
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
function hexTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = 'rgba(200,225,240,0.18)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(245,250,255,0.85)'; g.lineWidth = 4;
    const s = 32;
    for (let y = -1; y < 6; y++) for (let x = -1; x < 6; x++) {
      const cx = x * s * 1.5, cy = y * s * 1.732 + (x % 2 ? s * 0.866 : 0);
      g.beginPath(); for (let k = 0; k <= 6; k++) { const a = (k * Math.PI) / 3; g.lineTo(cx + s * Math.cos(a), cy + s * Math.sin(a)); } g.stroke();
    }
  }, [6, 3]);
}

export function buildMars(studio, opts = {}) {
  const { scene } = studio;
  const root = new THREE.Group(); scene.add(root);
  const R = rng(opts.seed ?? 9);
  const fog = new THREE.Fog(0xe2b48a, 60, 520);

  // ---- terrain: big displaced plane (flat around the colony), dunes far away
  const tg = new THREE.PlaneGeometry(1400, 1400, 140, 140); tg.rotateX(-Math.PI / 2);
  const p = tg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z + 20);
    const hills = 6 * Math.sin(x * 0.012) * Math.cos(z * 0.015) + 3 * Math.sin(x * 0.031 + z * 0.02) + 22 * Math.max(0, Math.sin((x + z * 0.4) * 0.006)) ** 3;
    p.setY(i, hills * clamp((d - 70) / 160) - 0.02);
  }
  tg.computeVertexNormals();
  const ground = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: groundTex(), roughness: 0.95 })); ground.receiveShadow = true; root.add(ground);
  const rockM = mat(0x7a3f26, 0.95);
  for (let i = 0; i < 90; i++) {
    const a = R() * Math.PI * 2, r = 25 + R() * 160, s = 0.3 + R() * 1.4;
    const rk = mk(new THREE.DodecahedronGeometry(s, 0), rockM, root, Math.cos(a) * r, s * 0.35, Math.sin(a) * r - 20); rk.rotation.set(R() * 3, R() * 3, R() * 3); rk.scale.y = 0.6;
  }
  // far mesas on the horizon
  for (let i = 0; i < 12; i++) { const a = -Math.PI * 0.9 + i * 0.16, r = 380 + R() * 120, h = 25 + R() * 45; mk(new THREE.CylinderGeometry(30 + R() * 40, 45 + R() * 50, h, 7), mat(0x9a5233, 0.95), root, Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r); }

  // ---- sky dome + sun
  const daySky = skyTex(false), duskSky = skyTex(true);
  const skyMat = new THREE.MeshBasicMaterial({ map: daySky, side: THREE.BackSide, fog: false, toneMapped: false, depthWrite: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(650, 32, 16), skyMat); sky.renderOrder = -2; root.add(sky);
  const duskMat = new THREE.MeshBasicMaterial({ map: duskSky, side: THREE.BackSide, fog: false, toneMapped: false, transparent: true, opacity: 0, depthWrite: false });
  const skyDusk = new THREE.Mesh(new THREE.SphereGeometry(640, 32, 16), duskMat); skyDusk.renderOrder = -1; root.add(skyDusk);
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.25, '#fff2d8'); gr.addColorStop(0.4, 'rgba(255,230,190,.35)'); gr.addColorStop(1, 'rgba(255,230,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), fog: false, toneMapped: false, depthWrite: false }));
  sunDisc.scale.set(60, 60, 1); root.add(sunDisc);

  // ---- lights
  const hemi = new THREE.HemisphereLight(0xf2c9a0, 0x6a3a22, 1.1); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2bf, 2.4); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 10, far: 300 });
  const SUN_DAY = new THREE.Vector3(0.6, 0.65, 0.45).normalize(), SUN_DUSK = new THREE.Vector3(0.85, 0.12, -0.5).normalize();
  const colonyGlow = new THREE.PointLight(0xffc98a, 0, 120, 1.4); colonyGlow.position.set(0, 10, -22); root.add(colonyGlow);

  // ---- landing pad
  const [PX, PZ] = DIMS.pad;
  mk(new THREE.CylinderGeometry(9, 9.4, 0.3, 40), mat(0x6c6a66, 0.8), root, PX, 0.15, PZ);
  const padRing = mk(new THREE.TorusGeometry(7, 0.15, 6, 48), new THREE.MeshStandardMaterial({ color: 0xf2c14e, emissive: 0xf2c14e, emissiveIntensity: 0.3 }), root, PX, 0.32, PZ); padRing.rotation.x = Math.PI / 2;

  // ---- the colony (each piece: {obj, t0, t1} in build-progress units 0..1)
  const pieces = [];
  const glassMat = new THREE.MeshStandardMaterial({ map: hexTex(), color: 0xdfeef8, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.2, emissive: 0xffd9a0, emissiveIntensity: 0, side: THREE.DoubleSide, depthWrite: false });
  const hullM = mat(0xeeeae2, 0.45), darkM = mat(0x3a3c42, 0.5);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x2a3340, emissive: 0xffc98a, emissiveIntensity: 0, roughness: 0.3 });
  const add = (obj, t0, t1, grow = 'y') => { obj.userData.grow = grow; root.add(obj); pieces.push({ obj, t0, t1 }); return obj; };
  const dome = (x, z, r, t0) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    mk(new THREE.CylinderGeometry(r * 1.02, r * 1.06, 0.6, 40), hullM, g, 0, 0.3, 0);
    const d = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), glassMat); d.position.y = 0.6; g.add(d);
    // a little house + trees inside (reads as "a city under glass")
    for (let k = 0; k < Math.round(r / 2); k++) { const a = k * 2.1 + x, rr = r * 0.45; mk(new THREE.BoxGeometry(r * 0.22, r * 0.22, r * 0.22), hullM, g, Math.cos(a) * rr, 0.6 + r * 0.11, Math.sin(a) * rr); mk(new THREE.IcosahedronGeometry(r * 0.12, 1), mat(0x5e9a46, 0.8), g, Math.cos(a + 1) * rr * 0.6, 0.6 + r * 0.15, Math.sin(a + 1) * rr * 0.6); }
    return add(g, t0, t0 + 0.14, 'xyz');
  };
  const tube = (ax, az, bx, bz, t0) => {
    const len = Math.hypot(bx - ax, bz - az), g = new THREE.Group(); g.position.set((ax + bx) / 2, 1.4, (az + bz) / 2); g.rotation.y = Math.atan2(bx - ax, bz - az);
    const c = mk(new THREE.CylinderGeometry(1.1, 1.1, len, 16, 1, true), glassMat, g); c.rotation.x = Math.PI / 2; c.castShadow = false;
    for (let k = 0; k <= Math.floor(len / 3); k++) { const r = mk(new THREE.TorusGeometry(1.12, 0.08, 6, 20), hullM, g, 0, 0, -len / 2 + k * 3); }
    return add(g, t0, t0 + 0.1, 'z');
  };
  const tower = (x, z, h, t0) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    mk(new THREE.CylinderGeometry(2.4, 3.2, h, 12), hullM, g, 0, h / 2, 0);
    for (let k = 1; k < h / 4; k++) mk(new THREE.CylinderGeometry(2.6 - k * 0.02, 2.6, 0.5, 12), winMat, g, 0, k * 4, 0);
    mk(new THREE.ConeGeometry(1.2, 6, 10), hullM, g, 0, h + 3, 0);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a4a).multiplyScalar(2), toneMapped: false })); beacon.position.y = h + 6.2; g.add(beacon);
    return add(g, t0, t0 + 0.16, 'y');
  };
  const field = (cx, cz, t0) => {
    const g = new THREE.Group(); g.position.set(cx, 0, cz);
    const pm = new THREE.MeshStandardMaterial({ color: 0x23395e, roughness: 0.25, metalness: 0.5 });
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const s = mk(new THREE.BoxGeometry(3.2, 0.08, 1.6), pm, g, (i - 2) * 3.6, 1.1, (j - 1.5) * 2.6); s.rotation.x = -0.5; mk(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), darkM, g, (i - 2) * 3.6, 0.55, (j - 1.5) * 2.6); }
    return add(g, t0, t0 + 0.12, 'xz');
  };
  field(32, -16, 0.0); field(-32, -12, 0.05); field(34, -30, 0.1);
  const C = DIMS.center;
  dome(C[0], C[1], 9, 0.12);
  const ring = [[-16, -12, 5], [15, -10, 4.5], [-20, -32, 5.5], [18, -34, 6], [0, -44, 5], [-30, -24, 4]];
  ring.forEach(([x, z, r], i) => dome(x, z, r, 0.2 + i * 0.07));
  ring.forEach(([x, z], i) => tube(C[0], C[1], x, z, 0.38 + i * 0.05));
  [[-8, -58, 34], [9, -60, 46], [26, -54, 28], [-26, -52, 26], [0, -72, 58]].forEach(([x, z, h], i) => tower(x, z, h, 0.55 + i * 0.07));
  // a rover + a few antenna masts
  const rover = new THREE.Group(); root.add(rover);
  mk(new THREE.BoxGeometry(2.2, 0.8, 3.2), hullM, rover, 0, 0.9, 0); mk(new THREE.BoxGeometry(1.6, 0.6, 1.2), darkM, rover, 0, 1.6, -0.6);
  for (const [x, z] of [[-1.2, 1.1], [1.2, 1.1], [-1.2, -1.1], [1.2, -1.1]]) { const w = mk(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 14), darkM, rover, x, 0.5, z); w.rotation.z = Math.PI / 2; }

  function setBuild(k) {
    for (const { obj, t0, t1 } of pieces) {
      const u = clamp((k - t0) / (t1 - t0)), e = u < 1 ? 1 - Math.pow(1 - u, 3) : 1; // ease-out "pop up"
      obj.visible = u > 0.001;
      const s = Math.max(e, 1e-3), gr = obj.userData.grow;
      obj.scale.set(gr.includes('x') || gr === 'xyz' ? s : 1, gr.includes('y') || gr === 'xyz' ? s : 1, gr.includes('z') || gr === 'xyz' ? s : 1);
    }
  }
  function setDusk(k) {
    duskMat.opacity = k;
    const dir = SUN_DAY.clone().lerp(SUN_DUSK, k).normalize();
    sun.target.position.set(0, 0, -25); sun.position.copy(sun.target.position).addScaledVector(dir, 150);
    sunDisc.position.copy(dir).multiplyScalar(560);
    sun.intensity = lerp(2.4, 0.9, k); sun.color.setHex(0xffe2bf).lerp(new THREE.Color(0xc8d8ff), k);
    hemi.intensity = lerp(1.1, 0.45, k);
    fog.color.setHex(0xe2b48a).lerp(new THREE.Color(0x5a5060), k);
    const lights = clamp((k - 0.35) / 0.4);
    glassMat.emissiveIntensity = 0.55 * lights; winMat.emissiveIntensity = 1.6 * lights; colonyGlow.intensity = 30 * lights;
  }

  // ---- lander + landing dust
  const lander = new THREE.Group(); root.add(lander);
  mk(new THREE.CylinderGeometry(2.4, 2.6, 26, 20), hullM, lander, 0, 13 + 2.2, 0);
  mk(new THREE.ConeGeometry(2.4, 6, 20), hullM, lander, 0, 26 + 5.2, 0);
  for (let f = 0; f < 4; f++) { const leg = mk(new THREE.BoxGeometry(0.3, 4, 0.3), darkM, lander, Math.sin(f * Math.PI / 2) * 3, 1.8, Math.cos(f * Math.PI / 2) * 3); leg.rotation.set(Math.cos(f * Math.PI / 2) * 0.35, 0, -Math.sin(f * Math.PI / 2) * 0.35); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(2.0, 12, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc07a).multiplyScalar(3), transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false }));
  flame.rotation.x = Math.PI; flame.position.y = -3.5; lander.add(flame);
  const DN = 90, dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xc9845a, roughness: 1, transparent: true, opacity: 0.75, depthWrite: false }), DN);
  dust.frustumCulled = false; root.add(dust);
  const dSeeds = Array.from({ length: DN }, () => [R(), R(), R()]);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3();
  function setDust(age, strength = 1) {
    dust.visible = age > 0 && strength > 0.01;
    dSeeds.forEach(([a, b, c], i) => {
      const ang = a * Math.PI * 2, r = 3 + Math.min(age, 3) * (4 + b * 4), h = 0.6 + age * (0.5 + c * 0.9);
      const sc = (1.2 + Math.min(age, 3) * 1.2 + c) * strength * clamp(1.5 - age * 0.35);
      _v.set(PX + Math.cos(ang) * r, h, PZ + Math.sin(ang) * r); _s.set(sc, sc * 0.7, sc);
      _m.compose(_v, _q.identity(), _s); dust.setMatrixAt(i, _m);
    });
    dust.instanceMatrix.needsUpdate = true;
    dust.material.opacity = 0.75 * clamp(1.3 - age * 0.32) * strength;
  }

  root.traverse((o) => { if (o.isMesh && (o.material.isMeshBasicMaterial || o.material.transparent)) { o.castShadow = false; } });
  ground.castShadow = false;
  setBuild(0); setDusk(0); setDust(0, 0);
  return { root, D: DIMS, fog, pieces, rover, lander: { g: lander, flame }, setBuild, setDusk, setDust, lights: { hemi, sun, colonyGlow } };
}
