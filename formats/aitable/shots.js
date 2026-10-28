// FORMAT: GGhuman "AI Table" — toy-sized players on a giant poker table.
// Every episode's shots.js is one line, `export * from '/formats/aitable/shots.js'`; the episode itself is story.episode,
// written by tools/aitable.py with the ABSOLUTE time of every key moment, so this file animates to the same numbers the
// audio (cues.json) is built from. World = engine/sets/casino.js; felt top y = FELT_Y; the camera side is +x (slot wall and
// neon behind, at -x). Figures are normal rigs at FIG_S (≈ 8.7 cm); cards/chips are real size, so they read as doors/towers.
// Depth of field (BokehPass, focused on the beat's hero every frame) sells the miniature scale.
// Debug: --stills 200,201,… renders the piece lineup; at build time every key moment is framing-checked and
// problems are printed as "⚠️ frame: …" by tools/render.mjs.
import * as THREE from 'three';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { K, clamp, lerp, faceToward, rng, canvasTex } from '@engine/core.js';
import { makePerson, applyPose, basePose } from '@engine/rig.js';
import { makeSpeechBubble } from '@engine/props.js';
import { buildCasino } from '@engine/sets/casino.js';
import { FIG_S, FELT_Y, SEATS, makeRobot, makeChips, chipStackY, makeCard, makeGiantHand, makeCaptcha } from './pieces.js';

const CAM_OF = { deal: 'wide', tower: 'tiltUp', peek: 'overShoulder', flip: 'hero', handshake: 'twoShot', wall: 'high', kick: 'wide', captcha: 'high', flick: 'wide' };
const HEAD_UP = 0.13 * FIG_S;   // headG -> head center (robot box / human sphere), world meters

export async function build(studio, story) {
  const { scene, camera, setCamera, composer } = studio;
  const E = story.episode, beats = E.beats, endIn = story.end.in;

  // ---------------------------------------------------------------- world
  const casino = buildCasino(studio, {});
  [...casino.stacks, casino.pot, casino.cards].forEach((g) => (g.visible = false));   // our own chips/cards replace them
  // the felt is our ground now, seen at grazing angles: a Standard material's Fresnel turned it white there — matte it
  // fine felt grain, anisotropic: the set's 512 px felt map is ~7 mm per texel — a plain green floor at this scale
  const feltTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#1b6a3e'; g.fillRect(0, 0, w, h); const R = rng(11);
    for (let i = 0; i < 9000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,.11)' : 'rgba(170,255,190,.07)'; g.fillRect(R() * w, R() * h, 1 + R() * 2, 1); }
  }, [80, 48]);
  feltTex.anisotropy = studio.renderer.capabilities.getMaxAnisotropy();
  casino.table.traverse((o) => { if (o.isMesh && o.scale.x === 1.75) o.material = new THREE.MeshLambertMaterial({ map: feltTex }); });
  // the pool + key spots were sized for people AT the table (the felt a sliver of the frame); with the felt filling the frame
  // they overexposed it and ACES bleached everything pale — dim them (the slot wall keeps its own lights)
  casino.lights.pool.intensity *= 0.15; casino.lights.key.intensity *= 0.5;
  // a tight key from the camera side: crisp contact shadows falling away from the lens (the pool's shadow map spans ~4.8 m)
  const sun = new THREE.DirectionalLight(0xfff0e0, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0001; sun.shadow.normalBias = 0.0004;
  Object.assign(sun.shadow.camera, { left: -0.35, right: 0.35, top: 0.35, bottom: -0.35, near: 0.01, far: 2 });
  scene.add(sun, sun.target);
  camera.near = 0.004; camera.far = 60; camera.updateProjectionMatrix();
  // the studio's camera fill is tuned for people 3 m away; at 8 cm figures it sat 25 cm off and washed everything out —
  // scale it like the figures (position/range x0.1, intensity x0.01 by inverse square)
  studio.fill.position.set(0.025, 0.015, 0); studio.fill.distance = 0.7; studio.fill.intensity = (story.look.fill ?? 0.5) * 0.01;
  const bokeh = new BokehPass(scene, camera, { focus: 0.6, aperture: 0.03, maxblur: 0.03 });
  composer.insertPass(bokeh, 1);
  // bubbles live in their own scene, drawn AFTER the depth of field: sprites write no depth, so the blur read them as the
  // far wall and smeared the text
  const ui = new THREE.Scene();
  const uiPass = new RenderPass(ui, camera); uiPass.clear = false;
  composer.insertPass(uiPass, 2);

  // ---------------------------------------------------------------- cast
  const cast = {};
  for (const c of E.cast) {
    const fig = c.kind === 'robot' ? makeRobot({ color: c.color })
      : { rig: makePerson({ skin: 0xe2ad8c, top: c.top || '#f2c230', pants: 0x34405c, hair: 0x2b1d14, hairStyle: 'short' }), setFace() {} };
    fig.rig.root.scale.setScalar(FIG_S); scene.add(fig.rig.root);
    const [x, z] = SEATS[c.seat];
    const look = c.seat === 'near' ? [-0.2, 0] : [0.1, 0];   // near faces across the table; the rest turn toward the lens
    cast[c.id] = { ...fig, c, x, z, rotY: faceToward(x, z, look[0], look[1]), phase: x * 7 + z * 13 };
  }
  const ids = Object.keys(cast);
  const centroid = () => [ids.reduce((s, i) => s + cast[i].x, 0) / ids.length, ids.reduce((s, i) => s + cast[i].z, 0) / ids.length];

  /** pose a cast member: p fields as rig.js basePose; x/z world meters; dist/speed already divided by FIG_S by the caller */
  function pose(id, o = {}, t = 0) {
    const f = cast[id];
    const p = Object.assign(basePose(), { x: f.x, z: f.z, rotY: f.rotY, lean: 0.03 + 0.012 * Math.sin(t * 2.1 + f.phase), headYaw: 0.08 * Math.sin(t * 0.9 + f.phase) }, o);
    applyPose(f.rig, p);
    f.rig.root.position.y = FELT_Y + (o.y || 0) * FIG_S;
  }
  const _v = new THREE.Vector3();
  function headW(id, out = new THREE.Vector3()) {
    cast[id].rig.root.updateMatrixWorld(true);
    return cast[id].rig.headG.getWorldPosition(out).add(_v.set(0, HEAD_UP, 0));
  }

  // ---------------------------------------------------------------- bubbles (016 say(): sized to the lens every frame)
  const frameW = (d) => 2 * d * Math.tan((camera.fov * Math.PI) / 360) * (9 / 16);
  const bubbles = beats.map((b) => {
    if (!b.say) return null;
    const who = typeof b.say === 'object' ? b.say.who : (typeof b.who === 'string' ? b.who : b.target);
    const text = typeof b.say === 'object' ? b.say.text : b.say;
    const bub = makeSpeechBubble({ lines: [text], name: who === 'you' ? 'YOU' : who, accent: cast[who].c.color || '#f2c230', width: 1 });
    bub.setPop(0); ui.add(bub.sprite);
    return { bub, who };
  });
  const boing = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.cos(u * Math.PI * 1.5) * Math.exp(-u * 4));
  function sayAll(t) {
    beats.forEach((b, i) => {
      const B = bubbles[i]; if (!B) return;
      const k = boing((t - b.say_at) / 0.35) * (1 - clamp((t - (b.say_end - 0.2)) / 0.2));
      if (k <= 0.001) { B.bub.setPop(0); return; }
      const p = headW(B.who, new THREE.Vector3()); p.y += 0.016;
      B.bub.sprite.position.copy(p); B.bub.setRows(1);
      B.bub.setPop(k * 0.6 * frameW(camera.position.distanceTo(p)));
    });
  }

  // ---------------------------------------------------------------- cameras: (b, t) -> {p, a, fov, focus}
  const heroOf = (b) => (typeof b.who === 'string' ? b.who : b.target || (Array.isArray(b.who) ? b.who[0] : 'you'));
  const u01 = (b, t) => clamp((t - b.t0) / (b.t1 - b.t0));
  const cams = {
    wide(b, t) {
      const [cx, cz] = centroid(), push = lerp(1, 0.94, u01(b, t));
      return { p: [cx + 0.75 * push, FELT_Y + 0.08 * push, cz + 0.1 * push], a: [cx - 0.02, FELT_Y + 0.05, cz], fov: 36, focus: [cx, FELT_Y + 0.05, cz] };
    },
    hero(b, t) {
      const id = heroOf(b), h = headW(id), f = cast[id], d = lerp(0.25, 0.22, u01(b, t));
      return { p: [h.x + Math.sin(f.rotY) * d, h.y + 0.01, h.z + Math.cos(f.rotY) * d], a: h.toArray(), fov: 28, focus: h.toArray() };
    },
    overShoulder(b, t) {
      const f = cast.you, h = headW('you'), fx = Math.sin(f.rotY), fz = Math.cos(f.rotY), k = lerp(1, 0.92, u01(b, t));
      const card = [f.x + fx * 0.06, FELT_Y + 0.01, f.z + fz * 0.06];
      // behind the right shoulder, above the head, looking down past it at the card on the felt
      return { p: [h.x - fx * 0.08 * k + fz * 0.035, h.y + 0.045 * k, h.z - fz * 0.08 * k - fx * 0.035], a: card, fov: 34, focus: card };
    },
    twoShot(b, t) {
      const [a1, a2] = Array.isArray(b.who) ? b.who : [heroOf(b), 'you'];
      const m = headW(a1).add(headW(a2)).multiplyScalar(0.5), d = lerp(0.42, 0.38, u01(b, t));
      return { p: [m.x + d, m.y + 0.02, m.z + 0.03], a: m.toArray(), fov: 32, focus: m.toArray() };
    },
    tiltUp(b, t) {
      const id = heroOf(b), h = headW(id);
      return { p: [h.x + 0.45, FELT_Y + 0.03, h.z + 0.06], a: h.toArray(), fov: 34, focus: h.toArray() };
    },
    high(b, t) {
      const id = b.around || b.target || 'you', f = cast[id], k = lerp(1, 0.93, u01(b, t));
      const a = [f.x, FELT_Y + 0.02, f.z];
      return { p: [f.x + 0.35 * k, FELT_Y + 0.5 * k, f.z + 0.05], a, fov: 34, focus: a };
    },
  };
  const titleBeat = { t0: 0, t1: story.title.out + 0.6 };

  // ---------------------------------------------------------------- beats (choreography per type; Tasks 5–7)
  const BEAT_FNS = {};
  const beatAt = (t) => { for (let i = beats.length - 1; i >= 0; i--) if (t >= beats[i].t0) return i; return -1; };
  const faceAt = (id, t) => { let e = 'neutral'; for (const b of beats) if (t >= b.t0 && b.face && b.face[id]) e = b.face[id]; return e; };

  // ---------------------------------------------------------------- lineup (t >= 200: --stills 200,201,202,203,204)
  const LX = -0.75;   // a clear patch of felt behind the action
  let lineup = null;
  function buildLineup() {
    const root = new THREE.Group(); scene.add(root);
    const robots = [0, 1, 2, 3].map(() => { const r = makeRobot({ color: '#7b5cff' }); r.rig.root.scale.setScalar(FIG_S); root.add(r.rig.root); return r; });
    const hands = ['rest', 'pinch', 'flat', 'point', 'flick'].map((n) => { const h = makeGiantHand(); h.pose(n, 1); root.add(h.g); return h; });
    const cards = ['As', '7c', '2d', null].map((c) => { const k = makeCard(); k.setFace(c); root.add(k.g); return k; });
    const chips = makeChips(root, 200);
    const cap = makeCaptcha('SELECT ALL THE ACES'); root.add(cap.g); cap.setLit([1, 0, 0, 0, 1, 1, 0, 0, 1]);
    return { root, robots, hands, cards, chips, cap };
  }
  function showLineup(t) {
    lineup ||= buildLineup();
    const L = lineup, f = Math.floor(t) - 200;
    document.getElementById('ui').style.display = 'none';
    ids.forEach((id) => (cast[id].rig.root.visible = false));
    L.root.visible = true;
    L.robots.forEach((r) => (r.rig.root.visible = false)); L.hands.forEach((h) => (h.g.visible = false)); L.cards.forEach((k) => (k.g.visible = false));
    L.cap.g.visible = false; L.chips.begin();
    let p, a, fov = 30;
    if (f === 0 || f === 4) {
      const ex = f === 0 ? ['neutral', 'smug', 'shifty', 'suspicious'] : ['laugh', 'cry', 'glitch', 'TEXT:BOT DETECTED'];
      L.robots.forEach((r, i) => { r.setFace(ex[i]); applyPose(r.rig, Object.assign(basePose(), { x: LX, z: -0.039 + i * 0.026, rotY: Math.PI / 2 })); r.rig.root.position.y = FELT_Y; r.rig.root.visible = true; });
      p = [LX + 0.32, FELT_Y + 0.07, 0]; a = [LX, FELT_Y + 0.065, 0];
    } else if (f === 1) {
      L.hands.forEach((h, i) => { h.g.position.set(LX, FELT_Y + 0.04, -0.22 + i * 0.11); h.g.rotation.set(0, -Math.PI / 2, 0); h.g.visible = true; });   // fingers -> -x, backs up
      p = [LX + 0.55, FELT_Y + 1.1, 0]; a = [LX - 0.08, FELT_Y, 0]; fov = 32;
    } else if (f === 2) {
      L.cards.forEach((k, i) => { k.g.position.set(LX, FELT_Y + 0.05 + Math.floor(i / 2) * 0.1, -0.04 + (i % 2) * 0.08); k.g.rotation.set(-Math.PI / 2, Math.PI / 2, 0, 'YXZ'); k.g.visible = true; });
      p = [LX + 0.6, FELT_Y + 0.1, 0]; a = [LX, FELT_Y + 0.1, 0];
    } else {
      for (let k = 0; k < 40; k++) L.chips.add(LX + 0.06, chipStackY(k), 0.11, 0, 0, k >> 3);
      L.cap.g.position.set(LX - 0.06, FELT_Y, -0.02); L.cap.g.rotation.set(0, Math.PI / 2, 0); L.cap.g.visible = true;
      p = [LX + 0.42, FELT_Y + 0.5, 0.03]; a = [LX - 0.03, FELT_Y + 0.02, 0.03]; fov = 40;
    }
    L.chips.end();
    setCamera(p, a, fov, 0, 0); camera.updateMatrixWorld();
    bokeh.uniforms.focus.value = camera.position.distanceTo(_v.fromArray(a));
    sun.target.position.set(a[0], FELT_Y, a[2]); sun.position.copy(sun.target.position).add(_v.set(0.12, 0.45, 0.3));
  }

  let shot = null;
  function update(t) {
    if (t >= 200) return showLineup(t);
    if (lineup) { lineup.root.visible = false; document.getElementById('ui').style.display = ''; }
    casino.update(t);
    for (const id of ids) { pose(id, {}, t); cast[id].setFace(faceAt(id, t)); }
    const i = beatAt(t), b = i >= 0 ? beats[i] : null;
    if (b && BEAT_FNS[b.type]) BEAT_FNS[b.type](b, t);
    shot = b ? cams[b.cam || CAM_OF[b.type]](b, Math.min(t, b.t1)) : cams.wide(titleBeat, t);
    setCamera(shot.p, shot.a, shot.fov, t, 0.0004);
    camera.updateMatrixWorld();
    bokeh.uniforms.focus.value = camera.position.distanceTo(_v.fromArray(shot.focus));
    sun.target.position.set(shot.focus[0], FELT_Y, shot.focus[2]); sun.position.copy(sun.target.position).add(_v.set(0.12, 0.45, 0.3));   // from +z: shadows fall screen-right, beside the figures
    sayAll(t);
  }

  // ---------------------------------------------------------------- framing self-check (warnings only)
  const proj = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2, (1 - p.y) / 2, p.z]; };
  const bad = ([x, y, z]) => (z > 1 || x < 0.06 || x > 0.94 || y < 0.06 || y > 0.94 ? 'outside the frame'
    : x < 0.45 && y > 0.22 && y < 0.36 ? 'under the HUD' : y > 0.64 && y < 0.76 ? 'in the subtitle band' : null);
  beats.forEach((b, n) => {
    const moments = Object.values(b.at).flat().concat([(b.t0 + b.t1) / 2]).filter((m) => m >= b.t0 && m < b.t1);
    for (const m of moments) {
      update(m); scene.updateMatrixWorld(true);
      const pts = (b.cam || CAM_OF[b.type]) === 'overShoulder' ? [['focus', new THREE.Vector3().fromArray(shot.focus)]]
        : (Array.isArray(b.who) ? b.who : Array.isArray(b.to) ? b.to : [heroOf(b)]).map((id) => [id + ' head', headW(id)]);
      const B = bubbles[n];
      if (B && B.bub.sprite.visible) pts.push(['bubble', B.bub.sprite.position.clone()]);
      for (const [what, v] of pts) {
        const q = proj(v), why = bad(q);
        if (why) console.warn(`⚠️ frame: beat ${n + 1} ${b.type} @${m.toFixed(2)}: ${what} at (${(q[0] * 100).toFixed(0)}%, ${(q[1] * 100).toFixed(0)}%) ${why}`);
      }
    }
  });

  return { update };
}
