// GAGS for the Ladder format: the rungs become a timeline of prop instances at build time (born / gone / place / carrier /
// pile), then draw(t, place) poses every instance as a pure function of t — so whatever a rung creates persists.
// Gags: say · poof · transform (+scale, riders) · drop (pile, crush, squash) · grow · walkoff · sail (riders) · rain ·
// flood (sheep, layered; `earth` covers the planet) · launch (+lands) · react (extras). See formats/ladder/README.md.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeIO, rng } from '@engine/core.js';
import { makeSpritePool } from '@engine/sets/tech.js';
import { makeProp, makeSheepFlood } from './props.js';

const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
const boingK = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 + Math.sin(u * Math.PI) * 0.25 * (1 - u) - (1 - easeOut(u)));
const CAST = ['you', 'ai'];
const DROP_H = 14, PILE_CAP = 4, PILE_SCALE = { moon: 1.5 };
// flood regions (place-local): a rectangle at a floor height, or the planet
const REGIONS = {
  livingroom: { table: { x0: -4.15, x1: -2.65, z0: -1.35, z1: -0.55, y: 0.75 }, room: { x0: -5, x1: -1.5, z0: -2.8, z1: 1.0, y: 0 } },
  street: { road: { x0: -8, x1: 8, z0: 0, z1: 8, y: 0 }, pile: { x0: -6, x1: 0, z0: 0.5, z1: 4.5, y: 0 } },
  paris: { lawn: { x0: -18, x1: 18, z0: 12, z1: 62, y: 0, s: 1.3 }, tower: { x0: -18, x1: 18, z0: -18, z1: 18, y: 0, s: 1.3 } },
  casino: { table: { x0: -1.5, x1: 1.5, z0: -0.8, z1: 0.8, y: 0.8 } },
  space: { earth: { sphere: true } },
};
/** visible sheep for an offered count: the real number up to 120, then logarithmic, capped by the pool */
export const sheepFor = (count) => Math.min(1500, count <= 120 ? count : Math.round(120 + 300 * Math.log10(count / 120)));

export function makeWorld(ctx) {
  const { scene, rungs, anchorW, W, sets } = ctx;
  const R = rng(ctx.seed * 17 + 3);
  const inst = [];
  const INDOOR = { casino: 1, livingroom: 1, podium: 1 }, _bb = new THREE.Box3(), _sz = new THREE.Vector3();
  const add = (o) => {
    const I = { gone: Infinity, born: -1, moves: [], ...o };
    if (!I.kind) {
      I.p = makeProp(I.name); I.p.g.updateMatrixWorld(true); _bb.setFromObject(I.p.g).getSize(_sz); I.span = Math.max(_sz.x, _sz.z);   // footprint (a car is long, not tall)
      scene.add(I.p.g); I.p.g.visible = false;
    }
    inst.push(I); return I;
  };
  const indoorCap = (I) => { if (INDOOR[I.place]) I.capH = Math.min(I.capH || Infinity, 2.8); };   // a 5 m house in a 3.6 m room left the camera nowhere to stand
  const live = (name, place, t) => [...inst].reverse().find((I) => I.name === name && (place == null || placeOf(I, t) === place) && I.born <= t && I.gone > t);
  const placeOf = (I, t) => { let p = I.place; for (const m of I.moves) if (t >= m.t) p = m.place; return p; };
  const castAs = { you: null, ai: null };      // a transformed cast member: {I, from}
  const squash = { you: Infinity, ai: Infinity };
  const piles = {}, reacts = [], impacts = [], puffs = [], pileDrops = [];

  // built-ins: the casino's own table + chip stacks are on screen from the start
  const builtin = { table: add({ kind: 'builtin', name: 'table', place: 'casino', obj: [sets.casino.table] }),
    chips: add({ kind: 'builtin', name: 'chips', place: 'casino', obj: [...sets.casino.stacks, sets.casino.pot] }) };
  // pre-placed: a prop that a later walkoff / launch / grow acts on stands at its anchor from the start
  for (const r of rungs) if (['walkoff', 'launch', 'grow'].includes(r.gag) && !CAST.includes(r.prop)) {
    const earlier = rungs.slice(0, rungs.indexOf(r)).some((x) => x.place === r.place && (x.prop === r.prop || x.to === r.prop) && x.gag !== 'say');
    if (!earlier && !inst.some((I) => I.name === r.prop && I.place === r.place)) add({ name: r.prop, place: r.place, pos: anchorW(r.place, r.anchor || 'you') });
  }
  if (inst.some((I) => I.name === 'eiffel' && I.place === 'paris')) hideParisTower();

  // ------------------------------------------------------------ rungs -> instances (r.at = key-moment times, r.anchor = the place anchor)
  rungs.forEach((r, n) => {
    const k = r.at, anchor = r.anchor ? anchorW(r.place, r.anchor) : null, P = r.place;
    if (r.gag === 'poof') {
      const I = add({ name: r.prop, place: P, born: k.pop, pos: anchor.clone(), pop: k.pop, onTable: P === 'casino' && r.anchor === 'table', yaw: ctx.faceYaw[P] });
      indoorCap(I);
      if (r.anchor === 'pile') stack(P, I);
      puffs.push({ t: k.pop, pos: anchor.clone().add(new THREE.Vector3(0, I.p.h * 0.5, 0)), n: 10, size: clamp(I.p.h * 0.9, 0.25, 1.2) });   // puffs sized to the prop
    }
    if (r.gag === 'transform') {
      const isCast = CAST.includes(r.prop), tgt = isCast ? null : live(r.prop, P, k.puff - 0.01);
      const own = tgt && tgt.kind === 'builtin' ? anchorW(P, 'table') : null;   // the casino's own table + chips stand at the table
      const from = own && tgt.name === 'table' ? own.setY(0) : tgt && !own ? tgtPos(tgt) : null;
      if (tgt && tgt.kind === 'builtin' && tgt.name === 'table') tgt.after = 0.38;   // table -> boat: what was on it now sits in the boat
      const I = add({ name: r.to, place: P, born: k.puff, pos: from || (anchor ? anchor.clone() : own || anchorW(P, r.prop)), pop: k.puff,
        riders: !!(r.riders || (tgt && tgt.riders)), follow: isCast ? r.prop : null, growTo: r.scale || 1, growT: r.scale ? [k.puff + 0.3, k.grow1] : null });
      if (tgt) { tgt.gone = k.puff; I.moves = tgt.moves.filter((m) => m.t <= k.puff); I.onTable = tgt.onTable || (tgt.kind === 'builtin' && tgt.name === 'chips'); }
      if (isCast) castAs[r.prop] = { I, from: k.puff };
      const ph = isCast ? 1.6 : I.p.h * (r.scale || 1);
      puffs.push({ t: k.puff, pos: (from || I.pos || anchorW(P, r.prop)).clone().add(new THREE.Vector3(0, Math.min(ph, 3) * 0.5, 0)), n: 14, size: clamp(ph * 0.6, 0.3, 1.3) });
    }
    if (r.gag === 'drop') {
      if (r.prop === 'pile') {
        pileDrops.push({ place: P, from: k.fall, to: k.impact, target: anchor.clone() }); impacts.push({ t: k.impact, pos: anchor.clone(), amp: 0.09 });
        if (CAST.includes(r.anchor)) squash[r.anchor] = k.impact;
        return;
      }
      const I = add({ name: r.prop, place: P, born: k.fall, pos: anchor.clone(), fall: [k.fall, k.impact] });
      indoorCap(I);
      if (r.anchor === 'pile') stack(P, I);
      if (P === 'casino' && r.anchor === 'table') { builtin.table.gone = Math.min(builtin.table.gone, k.impact); builtin.table.after ??= 0; I.pos.y = 0; }   // crushed: it lands on the floor
      if (CAST.includes(r.anchor)) squash[r.anchor] = k.impact;   // lands where the cast member stands (the podium riser too)
      if (PILE_SCALE[r.prop] && r.anchor !== 'pile') I.capS = 1.2;
      impacts.push({ t: k.impact, pos: I.pos.clone(), amp: 0.06 });
    }
    if (r.gag === 'grow') { const T = live(r.prop, P, k.grow0); if (T) { T.growTo = r.scale; T.growT = [k.grow0, k.grow1]; } }
    if (r.gag === 'walkoff') { const T = live(r.prop, P, k.stand); if (T) { T.walk = [k.stand, k.walk0, k.walk1]; T.gone = k.walk1 + 0.3; } }
    if (r.gag === 'sail') {
      const T = live(r.prop, null, r.t0 - 0.01) || [...inst].reverse().find((I) => I.name === r.prop);
      if (T) { T.moves.push({ t: r.t0, place: P, path: [anchor.clone().add(new THREE.Vector3(12, 0, 0)), anchor.clone().add(new THREE.Vector3(-1.5, 0, 0))], go: [k.go0, k.go1] }); if (r.riders) T.riders = true; }
    }
    if (r.gag === 'rain') add({ kind: 'rain', name: r.prop, place: P, born: k.fall0, fall: [k.fall0, k.fall1], pos: (anchor || anchorW(P, 'you')).clone(), count: Math.min(600, r.count), seed: n });
    if (r.gag === 'flood') add({ kind: 'flood', name: 'sheep', place: P, born: k.fill0, fill: [k.fill0, k.fill1], region: (REGIONS[P] || {})[r.anchor] || null, anchor: anchor.clone(), count: r.count, seed: n });
    if (r.gag === 'launch') {
      const T = live(r.prop, P, k.lift);
      if (T) { T.launch = [k.lift, k.gone]; T.gone = k.gone; }
      if (r.lands) {
        const land = rungs.slice(n + 1).find((x) => ctx.ANCHORS[x.place][r.lands]);
        if (land) { const I = add({ name: r.prop, place: land.place, born: land.t0, pos: anchorW(land.place, r.lands), capH: PILE_CAP }); if (r.lands === 'pile') stack(land.place, I); }
      }
    }
    if (r.react) reacts.push({ place: P, from: Math.min(...Object.values(k), r.t0 + 0.3), focus: (anchor || anchorW(P, 'you')).clone() });
  });
  function stack(place, I) { (piles[place] ||= []).push(I); I.pile = place; I.capH = I.capH || PILE_CAP; if (PILE_SCALE[I.name]) I.capS = PILE_SCALE[I.name]; }
  // where a prop stands (its group sits at the origin until the first draw; a sailed prop's moves are copied with it)
  function tgtPos(T) { return T.pos ? T.pos.clone() : null; }

  function hideParisTower() {
    const root = sets.paris.root, box = new THREE.Box3(), c = new THREE.Vector3(), sz = new THREE.Vector3();
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (o.isInstancedMesh) { o.computeBoundingBox(); box.copy(o.boundingBox).applyMatrix4(o.matrixWorld); } else { o.geometry.computeBoundingBox(); box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); }
      box.getCenter(c); box.getSize(sz); root.worldToLocal(c);
      // the set's own tower (the eiffel prop stands in for it) — tower-sized only: the 600 m sky dome is centered on the axis too
      if (Math.hypot(c.x, c.z) < 16 && (c.y > 1.5 || sz.y > 1.5) && sz.y < 120 && Math.max(sz.x, sz.z) < 60) o.visible = false;   // incl. the wide, short platforms
    });
  }

  // ------------------------------------------------------------ pools: smoke, rain chips, sheep
  const smoke = makeSpritePool(scene, 80, 'smoke');
  const chipGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.012, 16), chipMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const rain = new THREE.InstancedMesh(chipGeo, chipMat, 600); rain.frustumCulled = false; rain.castShadow = true; rain.count = 0; scene.add(rain);
  const CHIPC = [0xc8322f, 0x2c5aa8, 0x1d1d22, 0x2f8f4e, 0xf0c040].map((c) => new THREE.Color(c));
  for (let i = 0; i < 600; i++) rain.setColorAt(i, CHIPC[i % 5]);
  const flock = makeSheepFlood(scene, 1500);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(404, 64, 48), new THREE.MeshLambertMaterial({ color: 0xf4f1ea, transparent: true, opacity: 0 }));
  shell.position.copy(W('space', [0, 0, 0])); scene.add(shell);
  const d = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();

  // ------------------------------------------------------------ pose an instance at t
  function pileOffset(I, t) {
    let y = 0;
    for (const J of piles[I.pile] || []) { if (J === I) break; if (J.born <= t) y += sizeOf(J) * 0.92; }
    return y;
  }
  function sizeOf(I) { return I.p.h * scaleOf(I, Infinity); }
  function scaleOf(I, t) {
    let s = I.capS || 1;
    if (I.capH && I.p.h * s > I.capH) s = I.capH / I.p.h;
    if (I.growT) s *= lerp(1, I.growTo, easeOut((t - I.growT[0]) / (I.growT[1] - I.growT[0]))) * (1 + 0.06 * Math.sin((t - I.growT[1]) * 12) * Math.exp(-Math.max(0, t - I.growT[1]) * 3) * (t > I.growT[1] ? 1 : 0));
    if (I.pop !== undefined) s *= boingK((t - I.pop) / 0.35);
    return s;
  }
  // pure: the camera calls it too (focusOf), so the prop's own motion lives in animProp
  function posOf(I, t, place) {
    const mv = [...I.moves].reverse().find((m) => t >= m.t);
    let p = I.pos ? I.pos.clone() : new THREE.Vector3();
    if (I.follow) p = ctx.castSpot(I.follow, place, t);
    if (mv) { const u = easeIO((t - mv.go[0]) / (mv.go[1] - mv.go[0])); p = mv.path[0].clone().lerp(mv.path[1], u); p.y += 0.08 * Math.sin(t * 3.1); }
    if (I.onTable && t >= builtin.table.gone) p.y = builtin.table.after ?? 0;
    if (I.pile) p.y += pileOffset(I, t);
    if (I.fall) { const u = clamp((t - I.fall[0]) / (I.fall[1] - I.fall[0])); p.y += DROP_H * (1 - u * u); }
    for (const D of pileDrops) if (I.pile === D.place && t >= D.from) { const u = clamp((t - D.from) / (D.to - D.from)); p.x = D.target.x; p.z = D.target.z; p.y = D.target.y + pileOffset(I, t) + DROP_H * (1 - u * u); }
    if (I.walk) p.x += 2.2 * Math.max(0, t - I.walk[1]);   // slow enough to watch it go
    if (I.launch) { const u = clamp((t - I.launch[0]) / (I.launch[1] - I.launch[0])); p.y += 140 * u * u; }
    return p;
  }
  function animProp(I, t) {   // a sailing prop rocks and faces its way, a parked boat bobs, a walking building strides
    const g = I.p.g, mv = [...I.moves].reverse().find((m) => t >= m.t);
    if (mv) { g.rotation.z = 0.05 * Math.sin(t * 2.3); g.rotation.y = -Math.PI / 2; }
    else if (I.name === 'boat') g.rotation.z = 0.035 * Math.sin(t * 1.7);
    if (I.walk && I.p.setLegs) I.p.setLegs(smooth((t - I.walk[0] + 0.4) / 0.7), Math.max(0, t - I.walk[1]) * 1.4);
  }

  // ------------------------------------------------------------ per frame
  function draw(t, place) {
    for (const I of inst) {
      const here = I.born <= t && t < I.gone && (I.follow ? true : placeOf(I, t) === place);
      if (I.kind === 'builtin') { for (const o of I.obj) o.visible = t < I.gone; continue; }
      if (I.kind) continue;
      I.p.g.visible = here;
      if (!here) continue;
      const g = I.p.g, s = scaleOf(I, t);
      g.position.copy(posOf(I, t, place)); animProp(I, t); g.scale.setScalar(Math.max(0.001, s));
      if (I.yaw !== undefined) g.rotation.y = I.yaw;
      if (I.follow) g.rotation.y = ctx.castYaw(I.follow, place, t);
      if (I.fall && t >= I.fall[1] && t < I.fall[1] + 0.25) { const k = 1 - (t - I.fall[1]) / 0.25; g.scale.set(s * (1 + 0.15 * k), s * (1 - 0.15 * k), s * (1 + 0.15 * k)); }
      if (I.p.update) I.p.update(t);
    }
    // rain chips
    let ri = 0;
    for (const I of inst) if (I.kind === 'rain' && placeOf(I, t) === place && t >= I.born) {
      const Rr = rng(I.seed * 97 + 5);
      for (let k = 0; k < I.count && ri < 600; k++) {
        const tl = lerp(I.fall[0], I.fall[1], k / I.count) + 0.6, a = Rr() * 6.283, rr = 3.2 * Math.sqrt(Rr()), tilt = (Rr() - 0.5) * 0.6;
        if (t < tl - 0.8) continue;
        const u = clamp((t - (tl - 0.8)) / 0.8);
        d.position.set(I.pos.x + Math.cos(a) * rr, 0.01 + Rr() * 0.08 + 12 * (1 - u * u), I.pos.z + Math.sin(a) * rr);
        d.rotation.set(u < 1 ? t * 7 + k : tilt, k, u < 1 ? t * 5 : tilt * 0.5); d.scale.setScalar(1); d.updateMatrix(); rain.setMatrixAt(ri++, d.matrix);
      }
    }
    rain.count = ri; rain.instanceMatrix.needsUpdate = true; if (rain.instanceColor) rain.instanceColor.needsUpdate = true;
    // sheep floods (+ the planet)
    flock.begin(); shell.material.opacity = 0;
    for (const I of inst) if (I.kind === 'flood' && I.place === place && t >= I.born) {
      const n = Math.round(sheepFor(I.count) * easeOut((t - I.fill[0]) / (I.fill[1] - I.fill[0]))), Rf = rng(I.seed * 31 + 7), Rg = I.region;
      if (Rg && Rg.sphere) {
        const C = W('space', [0, 0, 0]);
        for (let k = 0; k < n; k++) {
          const yv = 1 - (k + 0.5) / 1500 * 1.7, rad = Math.sqrt(Math.max(0, 1 - yv * yv)), th = k * 2.39996;
          const nrm = new THREE.Vector3(Math.cos(th) * rad, yv, Math.sin(th) * rad); if (nrm.z < -0.15) nrm.z = -nrm.z;
          q.setFromUnitVectors(up, nrm.normalize());
          flock.addQ(C.x + nrm.x * 401, C.y + nrm.y * 401, C.z + nrm.z * 401, q, 36);
        }
        shell.material.opacity = 0.75 * easeOut((t - I.fill[0]) / (I.fill[1] - I.fill[0]));
        continue;
      }
      const reg = Rg || { x0: -3, x1: 3, z0: -3, z1: 3, y: 0 }, off = Rg ? W(place, [0, 0, 0]) : I.anchor.clone().setY(0);
      const area = (reg.x1 - reg.x0) * (reg.z1 - reg.z0), per = Math.max(1, Math.floor(area / 0.7)), sc = reg.s || 1;
      for (let k = 0; k < n; k++) {
        const layer = Math.floor(k / per);
        flock.add(off.x + lerp(reg.x0 + 0.3, reg.x1 - 0.3, Rf()), off.y + reg.y + layer * 0.55 * sc, off.z + lerp(reg.z0 + 0.3, reg.z1 - 0.3, Rf()), Rf() * 6.283, sc * (0.9 + Rf() * 0.2));
      }
    }
    flock.end();
    // smoke: poofs, impact dust, launch trails
    let si = 0;
    const puff = (pos, size, op) => { if (si < 80) smoke.set(si++, pos, size, op); };
    for (const P of puffs) if (t >= P.t && t < P.t + 0.7 && placeAtPos(P.pos) === place) {
      const u = (t - P.t) / 0.7, Rp = rng(Math.round(P.t * 100));
      for (let k = 0; k < P.n; k++) { const a = Rp() * 6.283, rr = P.size * (0.3 + 0.9 * easeOut(u)); puff(P.pos.clone().add(new THREE.Vector3(Math.cos(a) * rr, (Rp() - 0.3) * P.size * 0.8, Math.sin(a) * rr * 0.6)), P.size * (0.6 + u), 0.6 * (1 - u)); }
    }
    for (const X of impacts) if (t >= X.t && t < X.t + 1.0 && placeAtPos(X.pos) === place) {
      const u = (t - X.t) / 1.0, Rp = rng(Math.round(X.t * 100) + 1);
      for (let k = 0; k < 12; k++) { const a = Rp() * 6.283, rr = 1.2 + 2.6 * easeOut(u); puff(X.pos.clone().add(new THREE.Vector3(Math.cos(a) * rr, 0.3 + u * 0.8, Math.sin(a) * rr)), 1.3 + u * 1.5, 0.7 * (1 - u)); }
    }
    for (const I of inst) if (I.launch && t >= I.launch[0] && t < I.launch[1] + 0.6 && placeOf(I, t) === place) {
      for (let k = 0; k < 14; k++) { const tk = t - k * 0.06; if (tk < I.launch[0]) break; const u = clamp((tk - I.launch[0]) / (I.launch[1] - I.launch[0])); puff(I.pos.clone().add(new THREE.Vector3(Math.sin(k) * 2, 140 * u * u, Math.cos(k) * 2)), 4 + k * 0.6, 0.6 * (1 - k / 14)); }
    }
    for (let k = si; k < 80; k++) smoke.set(k, new THREE.Vector3(), 0, 0);
  }
  const placeAtPos = (p) => { for (const [n, o] of Object.entries(ctx.PLACE)) if (Math.abs(p.x - o.off[0]) < 90 && Math.abs(p.z - o.off[2]) < 3000) return n; return null; };

  // ------------------------------------------------------------ what shots.js asks
  return {
    draw,
    /** cast override: hidden (transformed), riding (seat world pos), squashed (0..1) */
    castState(id, place, t) {
      const st = {};
      if (castAs[id] && t >= castAs[id].from) st.hidden = true;
      const boat = inst.find((I) => I.riders && I.born <= t && t < I.gone && placeOf(I, t) === place && !I.follow);
      if (boat) { const g = boat.p.g; g.updateMatrixWorld(true); const seat = boat.p.seats ? boat.p.seats[id === 'ai' ? 0 : 1] : [0, 0.45, 0]; st.seat = new THREE.Vector3(...seat).applyMatrix4(g.matrixWorld); st.seatYaw = g.rotation.y; }
      if (t >= squash[id]) st.squash = clamp((t - squash[id]) / 0.12);
      return st;
    },
    asProp(id, t) { return castAs[id] && t >= castAs[id].from ? castAs[id].I.p : null; },
    /** the gag's subject for cameras: {pos (mid-height), size} */
    focusOf(r, t, place) {
      const k = r.at;
      const T = ['transform', 'grow', 'walkoff', 'launch', 'sail', 'poof', 'drop'].includes(r.gag) && r.prop !== 'pile'
        ? [...inst].reverse().find((I) => !I.kind && (I.name === (r.gag === 'transform' ? r.to : r.prop)) && I.born <= Math.max(t, Object.values(k)[0] || t) + 0.01 && placeOf(I, t) === place) : null;
      // (a walk-off is watched leaving: the subject point stops at walk0 and the camera holds)
      if (r.prop === 'pile' || r.anchor === 'pile') {
        const top = (piles[place] || []).filter((I) => I.born <= t).reduce((s2, I) => s2 + sizeOf(I) * 0.92, 0), base = anchorW(place, r.anchor || 'pile');
        return { pos: base.add(new THREE.Vector3(0, clamp(top * 0.5, 1, 7), 0)), size: Math.max(2.5, Math.min(top, 14)) };
      }
      if (T && T.p.g.visible) { const s = scaleOf(T, t), h = T.walk ? 11 : T.p.h * s; const p = posOf(T, Math.min(t, T.gone - 0.01, T.walk ? T.walk[1] : Infinity), place); if (T.fall && t < T.fall[1]) p.y = T.pos.y; return { pos: p.add(new THREE.Vector3(0, clamp(h * 0.5, 1.0, 6), 0)), size: Math.max(1.6, Math.min(T.walk ? 12 : Math.max(h, T.span * s * 0.7), 14)) }; }
      const g = (REGIONS[place] || {})[r.anchor];
      if (r.gag === 'flood' && g && !g.sphere) return { pos: W(place, [(g.x0 + g.x1) / 2, g.y + 0.8, (g.z0 + g.z1) / 2]), size: Math.max(g.x1 - g.x0, g.z1 - g.z0) * 0.6 };
      const a = r.anchor ? anchorW(place, r.anchor) : anchorW(place, 'you');
      return { pos: a.add(new THREE.Vector3(0, 1, 0)), size: 2 };
    },
    reactFor(place, t) { return reacts.filter((x) => x.place === place && t >= x.from); },
    shake(t) { return impacts.reduce((s2, X) => s2 + (t >= X.t ? X.amp * Math.exp(-(t - X.t) * 6) * Math.sin((t - X.t) * 40) : 0), 0); },
  };
}
