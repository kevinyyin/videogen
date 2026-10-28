// FORMAT: GGhuman "Ladder" — ridiculous escalation Reels.
// Every episode's shots.js is one line, `export * from '/formats/ladder/shots.js'`; the episode is story.episode, written by
// tools/ladder.py with the ABSOLUTE key moments of every rung. Six places from engine/sets/ live in one scene, each set's
// root parked at its own offset (OFF); a rung shows one root and swaps fog / near / far / exposure (hidden roots also switch off their lights).
// Normal-size cast: "you" (makePerson) and the AI (the aitable robot at scale 1), plus a few reacting extras per place.
// Gags (gags.js) and props (props.js) are pure functions of t, so everything a rung creates persists.
// Debug: --stills 200,201,… renders the prop / gag lineup; every rung's key moments are framing-checked at build time and
// problems print as "⚠️ frame: …" (tools/render.mjs).
import * as THREE from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { K, clamp, lerp, smooth, faceToward, rng } from '@engine/core.js';
import { makePerson, applyPose, basePose } from '@engine/rig.js';
import { makeSpeechBubble } from '@engine/props.js';
import { buildCasino, DIMS as CASINO } from '@engine/sets/casino.js';
import { buildLivingRoom } from '@engine/sets/livingroom.js';
import { buildStreet, SIDEWALK_H } from '@engine/sets/street.js';
import { buildParis } from '@engine/sets/paris.js';
import { buildPodium, DIMS as PODIUM } from '@engine/sets/podium.js';
import { buildSpace } from '@engine/sets/tech.js';
import { makeRobot } from '/formats/aitable/pieces.js';
import { makeProp, makeSheepFlood } from './props.js';

// place offsets + view settings (space is far away on -z: buildSpace's Earth is R = 400 with stars at 2,600)
const PLACE = {
  casino:     { off: [0, 0, 0],      near: 0.05, far: 80,   exposure: 1.1 },
  livingroom: { off: [100, 0, 0],    near: 0.05, far: 80,   exposure: 1.1 },
  podium:     { off: [200, 0, 0],    near: 0.05, far: 80,   exposure: 1.1 },
  street:     { off: [400, 0, 0],    near: 0.1,  far: 400,  exposure: 1.0 },
  paris:      { off: [1500, 0, 0],   near: 0.3,  far: 700,  exposure: 1.0 },
  space:      { off: [0, 0, -20000], near: 0.3,  far: 6000, exposure: 1.0 },
};
// named anchors per place, LOCAL to the place (tools/ladder.py PLACES must list exactly these names)
export const ANCHORS = {
  casino:     { table: [0, CASINO.top, 0], ai: [-0.25, 0, -1.32], you: [-0.25, 0, 1.32] },
  livingroom: { table: [-3.4, 0.75, -0.95], ai: [-3.4, 0, -1.75], you: [-3.4, 0, -0.15], room: [-1, 0, 0] },
  street:     { road: [0, 0, 3.5], curb: [2, SIDEWALK_H, -2], crowd: [0, SIDEWALK_H, -1.2], pile: [-3, 0, 2.5], you: [1, 0, 4.5], ai: [-0.5, 0, 4.5] },
  paris:      { tower: [0, 0, 0], lawn: [0, 0, 32], you: [1, 0, 30], ai: [-1, 0, 30] },
  podium:     { lectern: [PODIUM.lectern[0], 0, PODIUM.lectern[1]], ai: [PODIUM.speaker[0], 0, PODIUM.speaker[1]], you: [1.6, 0, -1.6] },
  space:      { earth: [0, 0, 0], orbit: [0, 0, 1100], table: [0, 0, 1000], you: [0.9, 0, 1000.3], ai: [-0.9, 0, 1000.3] },
};
const FLOOR = { street: SIDEWALK_H };   // standing height for extras on the street's sidewalk

export async function build(studio, story) {
  const { scene, camera, setCamera, composer } = studio;
  const E = story.episode, rungs = E.rungs, R = rng((E.seed || 1) * 131);

  // ---------------------------------------------------------------- places
  const sets = {};
  sets.casino = buildCasino(studio, {});
  sets.livingroom = buildLivingRoom(studio, {});
  sets.podium = buildPodium(studio, {});
  sets.street = buildStreet(studio, {}); const streetFog = scene.fog; scene.fog = null;   // street.js sets the global fog
  sets.paris = buildParis(studio, {}); const parisFog = sets.paris.fog || null; scene.fog = null;
  sets.space = buildSpace(studio, {});
  const FOG = { street: streetFog, paris: parisFog };
  for (const [name, set] of Object.entries(sets)) set.root.position.set(...PLACE[name].off);
  // the street camera lives on the far sidewalk (z 7–10): its trees stood right in front of the lens
  for (const tr of sets.street.trees || []) { tr.t.updateMatrixWorld(true); if (tr.t.getWorldPosition(new THREE.Vector3()).z - PLACE.street.off[2] > 6) tr.t.visible = false; }
  if (sets.livingroom.setMode) sets.livingroom.setMode('evening');
  const W = (place, local) => new THREE.Vector3(local[0] + PLACE[place].off[0], local[1] + PLACE[place].off[1], local[2] + PLACE[place].off[2]);
  const anchorW = (place, name) => W(place, ANCHORS[place][name]);
  let current = null;
  function usePlace(name) {
    if (current === name) return;
    current = name;
    for (const [n, set] of Object.entries(sets)) set.root.visible = n === name;   // hidden roots switch their lights off too
    const P = PLACE[name];
    scene.fog = FOG[name] || null;
    camera.near = P.near; camera.far = P.far; camera.updateProjectionMatrix();
    studio.renderer.toneMappingExposure = (story.look.exposure ?? 1) * P.exposure;
  }

  // ---------------------------------------------------------------- cast + extras
  const you = makePerson({ skin: 0xe2ad8c, top: E.cast.you.top, pants: 0x34405c, hair: 0x2b1d14, hairStyle: 'short' });
  const ai = makeRobot({ color: E.cast.ai.color });
  scene.add(you.root, ai.rig.root);
  const cast = { you: { rig: you, setFace() {} }, ai: { rig: ai.rig, setFace: ai.setFace } };
  const SKINS = [0xe2ad8c, 0xc68a62, 0x8d5a3b, 0xf0c8a8], TOPS = [0xd9534f, 0x5b8def, 0xf0ad4e, 0x6abf69, 0x9b6fd1, 0xef7fb0];
  const extraSpots = {
    casino: [[-2.5, -3.2], [-1, -3.6], [1.2, -3.4], [2.8, -3.0], [3.6, 1.6], [3.2, 2.9]].map(([x, z]) => ({ x, z, look: [0, 0] })),
    street: [-4, -2.4, -0.8, 2.6, 4.1, 5.6].map((x) => ({ x, z: -1.2 + R() * 0.4, look: [x * 0.5, 4] })),
    paris: [[-4, 27], [-2.6, 34], [3, 27.5], [4.2, 33], [-5.5, 30.5], [5.4, 30]].map(([x, z]) => ({ x, z, look: [0, 30] })),
    podium: PODIUM.rows.slice(0, 2).flatMap((z) => PODIUM.seats.filter((_, i) => i % 2 === 0).map((x) => ({ x, z, look: [x, -4], seated: true }))),
  };
  const extras = {};
  for (const [place, spots] of Object.entries(extraSpots)) {
    extras[place] = spots.map((s, i) => {
      const rig = makePerson({ skin: SKINS[(i + place.length) % 4], top: TOPS[(i * 2 + place.length) % 6], pants: 0x3a3f4a, hair: 0x2b1d14, hairStyle: ['short', 'bob', 'messy'][i % 3] });
      scene.add(rig.root); return { rig, ...s, phase: i * 1.7 };
    });
  }
  function poseCast(id, place, t, o = {}) {
    const f = cast[id], a = ANCHORS[place][id], other = ANCHORS[place][id === 'you' ? 'ai' : 'you'];
    const p = Object.assign(basePose(), {
      x: a[0] + PLACE[place].off[0], z: a[2] + PLACE[place].off[2], y: a[1] + PLACE[place].off[1],
      // in space both face out toward +z (slightly inward), so every shot of them has Earth (at -z) behind
      rotY: place === 'space' ? faceToward(a[0], a[2], a[0] * 0.3, a[2] + 10) : faceToward(a[0], a[2], other[0], other[2]), lean: 0.03 + 0.015 * Math.sin(t * 2 + (id === 'ai' ? 1 : 0)),
      headYaw: 0.1 * Math.sin(t * 0.8 + (id === 'ai' ? 2 : 0)),
    }, o);
    if (place === 'space') p.y += 0.06 * Math.sin(t * 1.3 + (id === 'ai' ? 1.5 : 0));   // floating
    p.floor = p.y;
    applyPose(f.rig, p);
  }
  function poseExtras(place, t, react = null) {
    for (const [pl, list] of Object.entries(extras)) for (const x of list) x.rig.root.visible = pl === place;
    for (const x of extras[place] || []) {
      const off = PLACE[place].off, y = FLOOR[place] || 0;
      const p = Object.assign(basePose(), { x: x.x + off[0], z: x.z + off[2], y, floor: y, rotY: faceToward(x.x, x.z, x.look[0], x.look[1]),
        lean: 0.03 + 0.02 * Math.sin(t * 1.6 + x.phase), headYaw: 0.15 * Math.sin(t * 0.7 + x.phase) });
      if (x.seated) Object.assign(p, { y: -0.375, floor: 0, footFwd: 0.42 });
      if (react) react(x, p, t);
      applyPose(x.rig, p);
    }
  }
  const headW = (rig, out = new THREE.Vector3()) => { rig.root.updateMatrixWorld(true); return rig.headG.getWorldPosition(out).add(new THREE.Vector3(0, 0.13, 0)); };

  // ---------------------------------------------------------------- bubbles (drawn in their own pass, always on top)
  const ui = new THREE.Scene();
  const uiPass = new RenderPass(ui, camera); uiPass.clear = false;
  composer.insertPass(uiPass, 1);
  const frameW = (d) => 2 * d * Math.tan((camera.fov * Math.PI) / 360) * (9 / 16);
  const boing = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.cos(u * Math.PI * 1.5) * Math.exp(-u * 4));
  const bubbles = rungs.map((r) => {
    if (!r.say_text) return null;
    const who = r.say_who;
    const bub = makeSpeechBubble({ lines: [r.say_text], name: who === 'ai' ? E.cast.ai.name : 'YOU', accent: who === 'ai' ? E.cast.ai.color : E.cast.you.top, width: 1 });
    bub.setPop(0); ui.add(bub.sprite);
    return { bub, who };
  });
  let speakerHead = (who) => headW(cast[who].rig);   // gags.js swaps this when a cast member has been transformed
  function sayAll(t) {
    rungs.forEach((r, i) => {
      const B = bubbles[i]; if (!B) return;
      const k = boing((t - r.say_at) / 0.35) * (1 - clamp((t - (r.say_end - 0.2)) / 0.2));
      if (k <= 0.001 || current !== r.place) { B.bub.setPop(0); return; }
      const p = speakerHead(B.who); p.y += 0.2;
      B.bub.sprite.position.copy(p); B.bub.setRows(1);
      B.bub.setPop(k * 0.6 * frameW(camera.position.distanceTo(p)));
      camera.updateMatrixWorld(); const x = (p.clone().project(camera).x + 1) / 2;
      B.bub.sprite.center.x = clamp(0.5, 1 - (0.96 - x) / 0.6, (x - 0.04) / 0.6);   // keep the whole bubble on screen
    });
  }

  // ---------------------------------------------------------------- cameras: (rung, t) -> {p, a, fov}
  const u01 = (r, t) => clamp((t - r.t0) / (r.t1 - r.t0));
  const speakerOf = (r) => r.say_who || 'ai';
  const WIDE = {   // establishing shots, local to each place: [position, aim, fov]
    casino: [[4.4, 3.0, 1.2], [-0.4, 0.9, 0], 40],
    livingroom: [[-0.6, 1.7, 2.4], [-3.4, 0.9, -0.95], 42],
    street: [[0.5, 2.0, 8.6], [0, 1.4, 1.5], 44],   // on the far sidewalk (z 7–10): at z 13 it sat inside the facades
    paris: [[0, 2.5, 46], [0, 16, 0], 50],
    podium: [[0, 1.8, 4.6], [0, 1.4, -2.8], 40],
    space: [[0, 1.4, 1004.6], [0, 0.6, 1000], 50],
  };
  const cams = {
    wide(r, t) {
      const [p, a, fov] = WIDE[r.place], k = lerp(1, 0.93, smooth(u01(r, t)));
      const P = p.map((v, i) => a[i] + (v - a[i]) * k);
      return { p: W(r.place, P).toArray(), a: W(r.place, a).toArray(), fov };
    },
    close(r, t) { return closeOn(speakerOf(r), r, t, 0.45); },
    ai(r, t) { return closeOn('ai', r, t, 0.45); },
    you(r, t) { return closeOn('you', r, t, -0.45); },
    high(r, t) {
      const c = W(r.place, ANCHORS[r.place][r.at] || ANCHORS[r.place].you), k = lerp(1, 0.9, u01(r, t));
      return { p: [c.x + 2.5 * k, c.y + 6 * k, c.z + 3 * k], a: c.toArray(), fov: 45 };
    },
    orbit(r, t) {
      const c = W(r.place, ANCHORS[r.place][r.at] || ANCHORS[r.place].you), a0 = r.place === 'space' ? -0.25 + 0.5 * u01(r, t) : 0.6 + 0.5 * u01(r, t);   // space: arc around +z, Earth behind
      return { p: [c.x + Math.sin(a0) * 6, c.y + 2.2, c.z + Math.cos(a0) * 6], a: [c.x, c.y + 1, c.z], fov: 42 };
    },
  };
  function closeOn(id, r, t, side) {   // a 3/4 medium shot ~2.3 m off the face (at 1.1 m a full-size robot head filled the frame)
    // in space nearly frontal: a 9:16 frame is only ±11° wide and a 3/4 angle swung Earth out of the background
    const h = speakerHead(id), yaw = cast[id].rig.root.rotation.y + side * (r.place === 'space' ? 0.2 : 1), d = lerp(2.4, 2.15, u01(r, t));
    return { p: [h.x + Math.sin(yaw) * d, h.y + 0.1, h.z + Math.cos(yaw) * d], a: [h.x, h.y - 0.3, h.z], fov: 40 };
  }
  const DEFAULT_CAM = { say: 'close', poof: 'close', transform: 'close', drop: 'wide', grow: 'wide', walkoff: 'wide', sail: 'wide', rain: 'wide', flood: 'wide', launch: 'wide' };
  const camOf = (r) => r.cam || DEFAULT_CAM[r.gag];
  const titleRung = rungs.length ? { ...rungs[0], t0: 0, t1: rungs[0].t0 } : null;

  // ---------------------------------------------------------------- lineup (t >= 200: --stills 200,…,205 shows every prop on the street)
  // each frame: items [name, x, z, scale, rotY] (street-local) + a camera [p, a, fov]; at most 5 props per frame
  const LINEUP = [
    { items: [['boat', -0.9, 2.2, 1, 0.5], ['table', 1.1, 4.4, 1, 0]], cam: [[1.2, 2.4, 9.6], [0, 0.5, 3.2], 42] },
    { items: [['five_aces', -0.17, 6.4, 1, 0], ['gold_chips', 0.03, 6.5, 1, 0], ['chips', 0.2, 6.4, 1, 0]], cam: [[0, 0.5, 7.5], [0, 0.15, 6.4], 40] },
    { items: [['chicken', -0.7, 5.0, 1, 0.3], ['grandma', 0.15, 4.8, 1, 0], ['sheep', 0.75, 5.4, 1, -0.6], ['wheat_card', 0.15, 6.1, 1, 0]], cam: [[0, 1.3, 9.4], [0, 0.85, 4.8], 44] },
    { items: [['casino_building', 0, -1.2, 1, 0], ['car', 1.6, 4.4, 1, 0.4]], cam: [[0, 5.0, 9.6], [0, 5.6, -1], 60] },
    { items: [['house', -3.4, -1.0, 0.7, 0.3], ['eiffel', 2.0, -0.5, 0.1, 0], ['moon', 0.0, 2.6, 0.8, 0]], cam: [[0, 2.6, 9.6], [0, 2.4, 0], 58] },
    { flood: 1500, cam: [[0, 4.5, 9.6], [0, 0, 2], 55] },
  ];
  let lineup = null;
  function showLineup(t) {
    if (!lineup) {
      lineup = { root: new THREE.Group(), props: {} }; scene.add(lineup.root);
      for (const f of LINEUP) for (const [name] of f.items || []) if (!lineup.props[name]) { lineup.props[name] = makeProp(name); lineup.root.add(lineup.props[name].g); }
      lineup.flood = makeSheepFlood(lineup.root, 1500);
    }
    const f = LINEUP[Math.min(LINEUP.length - 1, Math.floor(t) - 200)];
    document.getElementById('ui').style.display = 'none';
    usePlace('street'); you.root.visible = false; ai.rig.root.visible = false; poseExtras('none', t);
    for (const b of bubbles) if (b) b.bub.setPop(0);
    for (const pr of Object.values(lineup.props)) pr.g.visible = false;
    for (const [name, x, z, sc, rot] of f.items || []) {
      const pr = lineup.props[name]; pr.g.visible = true; pr.g.position.copy(W('street', [x, 0, z])); pr.g.scale.setScalar(sc); pr.g.rotation.y = rot;
      if (pr.setLegs) pr.setLegs(1, 0.3);
      if (pr.update) pr.update(t);
    }
    lineup.flood.begin();
    if (f.flood) { const Rf = rng(5); for (let k = 0; k < f.flood; k++) { const a = Rf() * 6.283, rr = 5 * Math.sqrt(Rf()); lineup.flood.add(...W('street', [Math.cos(a) * rr, 0, 3 + Math.sin(a) * rr * 0.7]).toArray(), Rf() * 6.283, 0.9 + Rf() * 0.2); } }
    lineup.flood.end();
    setCamera(W('street', f.cam[0]).toArray(), W('street', f.cam[1]).toArray(), f.cam[2], 0, 0);
  }

  // ---------------------------------------------------------------- update
  const rungAt = (t) => { for (let i = rungs.length - 1; i >= 0; i--) if (t >= rungs[i].t0) return i; return -1; };
  let shot = null;
  function update(t) {
    if (t >= 200) return showLineup(t);
    if (lineup) { lineup.root.visible = false; document.getElementById('ui').style.display = ''; }
    const i = rungAt(t), r = i >= 0 ? rungs[i] : titleRung;
    usePlace(r.place);
    if (sets[r.place].update) sets[r.place].update(t);
    if (r.place === 'podium' && sets.podium.setFlashes) sets.podium.setFlashes(t, i >= 0 && rungs[i].place === 'podium' ? 2.5 : 0);
    for (const id of ['you', 'ai']) poseCast(id, r.place, t);
    cast.ai.setFace('smug');
    poseExtras(r.place, t);
    shot = (i >= 0 ? cams[camOf(r)] : cams.wide)(r, t);
    setCamera(shot.p, shot.a, shot.fov, t, 0.004);
    camera.updateMatrixWorld();
    sayAll(t);
  }

  // ---------------------------------------------------------------- framing self-check (warnings only)
  const proj = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2, (1 - p.y) / 2, p.z]; };
  const subOn = (m) => (story.subs || []).some(([a, b]) => m >= a && m < b);
  const bad = ([x, y, z], m) => (z > 1 || x < 0.06 || x > 0.94 || y < 0.06 || y > 0.94 ? 'outside the frame'
    : x < 0.45 && y > 0.22 && y < 0.36 ? 'under the HUD' : subOn(m) && y > 0.64 && y < 0.76 ? 'in the subtitle band' : null);
  rungs.forEach((r, n) => {
    const moments = Object.values(r.at).concat([(r.t0 + r.t1) / 2]).filter((m) => m >= r.t0 && m < r.t1);
    for (const m of moments) {
      update(m); scene.updateMatrixWorld(true);
      const pts = [];
      if (r.say_who && camOf(r) !== 'wide') pts.push([r.say_who + ' head', speakerHead(r.say_who)]);
      const B = bubbles[n];
      if (B && B.bub.sprite.visible) pts.push(['bubble', B.bub.sprite.position.clone()]);
      for (const [what, v] of pts) {
        const q = proj(v), why = bad(q, m);
        if (why) console.warn(`⚠️ frame: rung ${n + 1} ${r.place}/${r.gag} @${m.toFixed(2)}: ${what} at (${(q[0] * 100).toFixed(0)}%, ${(q[1] * 100).toFixed(0)}%) ${why}`);
      }
    }
  });

  return { update };
}
