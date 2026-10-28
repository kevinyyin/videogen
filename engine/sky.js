// Night views for windows (painted canvas backdrops) + weather particles (snow, rain, leaves, fireflies).
import * as THREE from 'three';
import { canvasTex, rng } from '@engine/core.js';

const SKIES = {
  summer: { top: '#0a1430', bot: '#2a4170', stars: 1, moon: 1, house: '#0d1324', lit: '#ffcf7a' },
  autumn: { top: '#160f26', bot: '#4a2f3c', stars: 0.6, moon: 1, house: '#140e18', lit: '#ffb860' },
  winter: { top: '#0d1a33', bot: '#3a4d6e', stars: 0.5, moon: 1, house: '#101828', lit: '#ffd690', snow: 1 },
  rain:   { top: '#10151e', bot: '#2b3442', stars: 0, moon: 0, house: '#0d1118', lit: '#e8b870' },
  xmas:   { top: '#0d1a33', bot: '#3a4d6e', stars: 0.5, moon: 1, house: '#101828', lit: '#ffd690', snow: 1, xmas: 1 },
};

function drawSky(g, w, h, o) {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, o.top); grd.addColorStop(0.72, o.bot); grd.addColorStop(1, o.bot);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const R = rng(5);
  for (let i = 0; i < 220 * o.stars; i++) { g.fillStyle = `rgba(255,250,235,${0.25 + R() * 0.65})`; g.beginPath(); g.arc(R() * w, R() * h * 0.6, 0.6 + R() * 1.8, 0, 7); g.fill(); }
  if (o.moon) {
    const mx = w * 0.6, my = h * 0.2, rg = g.createRadialGradient(mx, my, 20, mx, my, 220);
    rg.addColorStop(0, 'rgba(255,246,215,.45)'); rg.addColorStop(1, 'rgba(255,246,215,0)');
    g.fillStyle = rg; g.fillRect(mx - 220, my - 220, 440, 440);
    g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(mx, my, 46, 0, 7); g.fill();
  }
  // tree silhouette
  g.fillStyle = o.house;
  const tx = w * 0.12; g.fillRect(tx - 10, h * 0.55, 20, h * 0.45);
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(tx + (R() - 0.5) * 140, h * 0.5 + (R() - 0.5) * 120, 60 + R() * 50, 0, 7); g.fill(); }
  // rooftops across the street
  let x = -40; const base = h * 0.66;
  while (x < w) {
    const hw = 160 + R() * 140, hh = 90 + R() * 110, roof = 50 + R() * 50;
    g.fillStyle = o.house; g.fillRect(x, base - hh, hw, h - base + hh);
    g.beginPath(); g.moveTo(x - 14, base - hh); g.lineTo(x + hw / 2, base - hh - roof); g.lineTo(x + hw + 14, base - hh); g.fill();
    if (o.snow) { g.fillStyle = 'rgba(235,242,255,.85)'; g.beginPath(); g.moveTo(x - 14, base - hh); g.lineTo(x + hw / 2, base - hh - roof); g.lineTo(x + hw + 14, base - hh); g.lineTo(x + hw + 6, base - hh + 9); g.lineTo(x + hw / 2, base - hh - roof + 12); g.lineTo(x - 6, base - hh + 9); g.fill(); }
    for (let k = 0; k < 3; k++) if (R() < 0.55) { g.fillStyle = o.lit; g.globalAlpha = 0.85; g.fillRect(x + 22 + k * (hw / 3.2), base - hh + 34 + (R() < 0.5 ? 0 : 50), 26, 32); g.globalAlpha = 1; }
    if (o.xmas) {
      const cols = ['#ff5a5a', '#5aff8a', '#ffd25a', '#6ab8ff'];
      for (let k = 0; k <= 16; k++) {
        const f = k / 16, px = x - 14 + f * (hw + 28), py = base - hh - roof * (1 - Math.abs(f - 0.5) * 2) + 4;
        const c = cols[k % 4]; const rg2 = g.createRadialGradient(px, py, 0, px, py, 9); rg2.addColorStop(0, c); rg2.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg2; g.fillRect(px - 9, py - 9, 18, 18);
      }
    }
    x += hw + 30 + R() * 50;
  }
  if (o.snow) { g.fillStyle = 'rgba(225,235,250,.9)'; g.fillRect(0, h * 0.93, w, h * 0.07); }
}

/** All sky variants as textures, keyed by season name. */
export function makeSkyTextures() {
  const out = {};
  for (const [k, o] of Object.entries(SKIES)) out[k] = canvasTex(1536, 1100, (g, w, h) => drawSky(g, w, h, o));
  return out;
}

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.4, 'rgba(255,255,255,.8)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/**
 * Weather inside a box (only visible through a window placed in front of it).
 * box = {x0,x1,y0,y1,z0,z1}. update(t, season) where season in summer|autumn|winter|rain|xmas.
 */
export function makeWeather(parent, box) {
  const R = rng(21), N = 420, tex = dotTexture();
  const seeds = Array.from({ length: N }, () => [R(), R(), R(), R()]);
  const mkPts = (size, color, opacity, blending = THREE.NormalBlending) => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const m = new THREE.PointsMaterial({ size, map: tex, color, transparent: true, opacity, depthWrite: false, blending, sizeAttenuation: true });
    const p = new THREE.Points(geo, m); p.frustumCulled = false; parent.add(p); return p;
  };
  const snow = mkPts(0.035, 0xffffff, 0.95), leaves = mkPts(0.05, 0xd9772f, 0.95), flies = mkPts(0.04, 0xffe27a, 1, THREE.AdditiveBlending);
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaabbd0, transparent: true, opacity: 0.45 })); rain.frustumCulled = false; parent.add(rain);
  const W = box.x1 - box.x0, Hh = box.y1 - box.y0, D = box.z1 - box.z0;

  function update(t, season) {
    snow.visible = season === 'winter' || season === 'xmas'; leaves.visible = season === 'autumn'; flies.visible = season === 'summer'; rain.visible = season === 'rain';
    const fill = (pts, fall, sway, swayF) => {
      const a = pts.geometry.attributes.position;
      for (let i = 0; i < N; i++) {
        const [u, v, w, k] = seeds[i];
        const y = box.y1 - ((((v * Hh) + t * fall * (0.7 + k * 0.6)) % Hh) + Hh) % Hh;
        a.setXYZ(i, box.x0 + u * W + Math.sin(t * swayF * (0.6 + k) + i) * sway, y, box.z0 + w * D);
      }
      a.needsUpdate = true;
    };
    if (snow.visible) { fill(snow, 0.35, 0.06, 1.1); const a = snow.geometry.attributes.position; for (let i = 0; i < N; i++) if (i % 2) a.setY(i, -50); }
    if (leaves.visible) { fill(leaves, 0.45, 0.15, 1.7); const a = leaves.geometry.attributes.position; for (let i = 0; i < N; i++) if (i % 4) a.setY(i, -50); }
    if (flies.visible) {
      const a = flies.geometry.attributes.position;
      for (let i = 0; i < N; i++) {
        const [u, v, w, k] = seeds[i];
        const on = i % 5 === 0 ? 1 : 0;
        a.setXYZ(i, box.x0 + u * W + Math.sin(t * 0.5 + i) * 0.08, on ? box.y0 + 0.1 + v * Hh * 0.5 + Math.sin(t * 0.7 + i * 2) * 0.05 : -50, box.z0 + w * D);
      }
      a.needsUpdate = true;
      flies.material.opacity = 0.6 + 0.4 * Math.sin(t * 3.1);
    }
    if (rain.visible) {
      const a = rain.geometry.attributes.position;
      for (let i = 0; i < N; i++) {
        const [u, v, w, k] = seeds[i];
        const y = box.y1 - ((((v * Hh) + t * 6 * (0.8 + k * 0.4)) % Hh) + Hh) % Hh, x = box.x0 + u * W, z = box.z0 + w * D;
        a.setXYZ(i * 2, x, y, z); a.setXYZ(i * 2 + 1, x - 0.01, y - 0.09, z);
      }
      a.needsUpdate = true;
    }
  }
  return { update };
}
