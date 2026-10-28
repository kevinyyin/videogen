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
import { K, KV, clamp, lerp, smooth, easeIO, win, faceToward, rng, canvasTex } from '@engine/core.js';
import { makePerson, applyPose, basePose } from '@engine/rig.js';
import { makeSpeechBubble } from '@engine/props.js';
import { buildCasino } from '@engine/sets/casino.js';
import { FIG_S, FELT_Y, SEATS, makeRobot, makeChips, chipStackY, makeCard, makeGiantHand, makeCaptcha } from './pieces.js';

const CAM_OF = { deal: 'wide', tower: 'tiltUp', peek: 'overShoulder', flip: 'flipCam', handshake: 'twoShot', wall: 'high', kick: 'wide', captcha: 'high', flick: 'wide' };
const HEAD_UP = 0.13 * FIG_S;   // headG -> head center (robot box / human sphere), world meters
const TIP = 0.22, G = 3;        // a topple: seconds the column tips as one piece; slow-motion gravity (m/s²) so the fall reads big
const CARD_L = 0.088;

/** pile slots around (cx, cz): a cone of chips whose layers shrink with height, a hole for the buried figure's legs */
function pileSlots(cx, cz, n, R0, rand) {
  const out = [], hole = 0.012;
  for (let layer = 0; out.length < n && layer < 40; layer++) {
    const Rl = R0 * (1 - layer / 18);
    if (Rl < hole + 0.02) break;
    for (let r = hole + 0.02; r <= Rl + 1e-6 && out.length < n; r += 0.034) {
      const m = Math.max(1, Math.floor((2 * Math.PI * r) / 0.036)), off = rand() * 6.283;
      for (let j = 0; j < m && out.length < n; j++) {
        const a = off + (j / m) * 6.283;
        out.push([cx + Math.cos(a) * r + (rand() - 0.5) * 0.008, chipStackY(layer) + rand() * 0.002, cz + Math.sin(a) * r + (rand() - 0.5) * 0.008, (rand() - 0.5) * 0.5, (rand() - 0.5) * 0.5]);
      }
    }
  }
  while (out.length < n) { const a = rand() * 6.283, r = R0 + rand() * 0.06; out.push([cx + Math.cos(a) * r, chipStackY(0), cz + Math.sin(a) * r, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3]); }
  return out;
}

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
      const card = [f.x + fx * 0.075, FELT_Y + 0.025, f.z + fz * 0.075];
      // behind the RIGHT shoulder, well above the head: the lifted cards land right of the figure, clear of the HUD
      return { p: [h.x - fx * 0.17 * k - fz * 0.05, h.y + 0.09 * k, h.z - fz * 0.17 * k + fx * 0.05], a: card, fov: 38, focus: card };
    },
    twoShot(b, t) {
      const [a1, a2] = Array.isArray(b.who) ? b.who : [heroOf(b), 'you'];
      const m = headW(a1).add(headW(a2)).multiplyScalar(0.5), d = lerp(0.42, 0.38, u01(b, t));
      return { p: [m.x + d, m.y + 0.02, m.z + 0.03], a: m.toArray(), fov: 32, focus: m.toArray() };
    },
    tiltUp(b, t) {   // from the +z side (the near seat stays out of the lens), tilting up the growing tower
      const id = heroOf(b), h = headW(id), st = stacks[id], w = towers.find((x) => x.id === id) || { g0: b.t0, peak: b.t1 };
      const u = smooth((t - w.g0) / (w.peak - w.g0 + 0.3)), top = chipStackY(stackCount(id, t));
      const a = [lerp(h.x, st.x, u), lerp(h.y, top - 0.06, u), lerp(h.z, st.z, u)];
      return { p: [h.x + 0.4, FELT_Y + 0.03 + 0.05 * u, h.z + 0.14], a, fov: 34, focus: a };
    },
    flipCam(b, t) {   // 3/4 high on the flipper: face + the cards it turns over (a head-height close-up cut the cards out)
      const id = heroOf(b), h = headW(id), cs = cardsOf[id], c = [(cs[0].x + cs[1].x) / 2, FELT_Y, (cs[0].z + cs[1].z) / 2];
      // aimed between face and cards, shifted left so the face sits right of the HUD with the cards whole below it
      const k = lerp(1, 0.93, u01(b, t)), a = [lerp(h.x, c[0], 0.55), lerp(h.y, c[1], 0.55), lerp(h.z, c[2], 0.55) + 0.015];
      return { p: [c[0] + 0.27 * k, FELT_Y + 0.24 * k, c[2] + 0.08 * k], a, fov: 36, focus: a };   // steep: looks down past the pot
    },
    topple(b, t) {   // high diagonal over tower -> target, pushing in on the pile
      const ev = topples.find((e) => e.t0 === b.at.fall), st = stacks[ev.id], tg = cast[ev.target];
      const m = [(st.x + tg.x) / 2, FELT_Y, (st.z + tg.z) / 2], k = lerp(1, 0.88, clamp((t - ev.t0) / 2.5));
      return { p: [m[0] + 0.42 * k, FELT_Y + 0.36 * k, m[2] - 0.3 * k], a: [m[0] - 0.01, FELT_Y + 0.07, m[2] + 0.01], fov: 40, focus: [tg.x, FELT_Y + 0.04, tg.z] };   // from -z: the far robot lands upper-right, clear of the HUD
    },
    high(b, t) {
      const id = b.around || b.target || 'you', f = cast[id], k = lerp(1, 0.93, u01(b, t));
      const a = [f.x, FELT_Y + 0.02, f.z];
      return { p: [f.x + 0.35 * k, FELT_Y + 0.5 * k, f.z + 0.05], a, fov: 34, focus: a };
    },
  };
  const titleBeat = { t0: 0, t1: story.title.out + 0.6 };

  // ---------------------------------------------------------------- the table — chips, cards, the dealer's hand — pure in t
  // (every beat's effect persists: dealt cards stay dealt, a grown tower stays tall, a topple's pile stays piled)
  const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
  const R = rng((E.seed || 1) * 977);
  const fwdOf = (id) => [Math.sin(cast[id].rotY), Math.cos(cast[id].rotY)];
  const rightOf = (id) => [-Math.cos(cast[id].rotY), Math.sin(cast[id].rotY)];
  const chips = makeChips(scene, 2000);
  const stacks = {};
  ids.forEach((id, i) => { const [rx, rz] = rightOf(id); stacks[id] = { x: cast[id].x + rx * 0.045, z: cast[id].z + rz * 0.045, base: cast[id].c.stack ?? 12, color: i }; });
  const towers = beats.filter((b) => b.type === 'tower').map((b) => ({ id: b.who, push: b.at.push, g0: b.at.grow0, peak: b.at.peak, to: b.height }));
  function stackCount(id, t) {
    let n = stacks[id].base;
    for (const w of towers) if (w.id === id && t >= w.g0) n = Math.round(lerp(n, w.to, easeOut((t - w.g0) / (w.peak - w.g0))));
    return n;
  }
  // topples: `after: "topple"` drops the latest tower on `you`; `kick` drops `tower_of`'s stack on its owner
  const topples = [];
  beats.forEach((b, i) => {
    let ev = null;
    if (b.after === 'topple') ev = { id: beats.slice(0, i + 1).reverse().find((x) => x.type === 'tower').who, target: 'you', t0: b.at.fall, impact: b.at.impact };
    if (b.type === 'kick') ev = { id: b.tower_of, target: b.tower_of, t0: b.at.topple, impact: b.at.impact, kicker: b.who };
    if (!ev) return;
    const st = stacks[ev.id], tg = cast[ev.target], dx = tg.x - st.x, dz = tg.z - st.z, d = Math.hypot(dx, dz) || 1;
    Object.assign(ev, { n: stackCount(ev.id, ev.t0), dx: dx / d, dz: dz / d });
    ev.slots = pileSlots(tg.x, tg.z, ev.n, ev.target === ev.id ? 0.06 : 0.085, R);
    ev.spin = Array.from({ length: ev.n }, () => [(R() - 0.5) * 9, (R() - 0.5) * 9]);
    topples.push(ev);
  });
  const potChips = Array.from({ length: 8 }, () => [(R() - 0.5) * 0.05, (R() - 0.5) * 0.05 - 0.07, Math.floor(R() * 4)]);   // off the near->far camera lines
  function column(st, n, phi, dx, dz, col) {
    const sn = Math.sin(phi), cs = Math.cos(phi);
    for (let k = 0; k < n; k++) { const y = chipStackY(k) - FELT_Y; chips.add(st.x + dx * y * sn, FELT_Y + y * cs, st.z + dz * y * sn, phi * dz, -phi * dx, col(k)); }
  }
  function drawChips(t) {
    chips.begin();
    for (const [x, z, c] of potChips) chips.add(x, chipStackY(0), z, 0, 0, c);
    for (const id of ids) {
      const st = stacks[id], ev = topples.find((e) => e.id === id && t >= e.t0), col = (k) => (st.color + (k >> 3)) % 4;
      if (!ev) {
        const w = towers.find((x) => x.id === id && t >= x.peak);
        column(st, stackCount(id, t), w ? 0.035 * Math.sin(9 * (t - w.peak)) * Math.exp(-(t - w.peak) * 0.9) : 0, 1, 0, col);
        continue;
      }
      const u = (t - ev.t0) / TIP;
      if (u < 1) { column(st, ev.n, 0.5 * u * u, ev.dx, ev.dz, col); continue; }
      // released: each chip flies its own ballistic arc from the tipped column to its pile slot (higher chips land later)
      const tr = ev.t0 + TIP, sn = Math.sin(0.5), cs = Math.cos(0.5);
      for (let k = 0; k < ev.n; k++) {
        const y0 = chipStackY(k) - FELT_Y, S = [st.x + ev.dx * y0 * sn, FELT_Y + y0 * cs, st.z + ev.dz * y0 * sn];
        const Q = ev.slots[k], T = Math.max(0.12, ev.impact - 0.05 + 0.25 * (k / ev.n) - tr), tau = Math.min(t - tr, T), q = tau / T;
        const vy = (Q[1] - S[1] + 0.5 * G * T * T) / T, sw = Math.sin(Math.PI * q);
        chips.add(lerp(S[0], Q[0], q), S[1] + vy * tau - 0.5 * G * tau * tau, lerp(S[2], Q[2], q),
          lerp(0.5 * ev.dz, Q[3], q) + ev.spin[k][0] * sw, lerp(-0.5 * ev.dx, Q[4], q) + ev.spin[k][1] * sw, col(k));
      }
    }
    for (const w of towers) if (t >= w.push) {   // the one bet chip slides toward the pot at the push
      const st = stacks[w.id], u = easeOut((t - w.push) / 0.3);
      chips.add(lerp(st.x, -0.02, u), chipStackY(0), lerp(st.z, -0.075, u), 0, 0, 0);   // into the pot (it sat on the flipper's cards)
    }
    chips.end();
  }

  // cards: two per dealt player, 7.5 cm in front, back up; the giant hand drops them one by one
  const cardsOf = {};
  for (const id of ids) {
    const [fx, fz] = fwdOf(id), [rx, rz] = rightOf(id);
    cardsOf[id] = [-1, 1].map((sd, j) => {
      const c = makeCard(); scene.add(c.g); c.g.visible = false;
      return { ...c, id, j, x: cast[id].x + fx * 0.075 + rx * 0.034 * sd, z: cast[id].z + fz * 0.075 + rz * 0.034 * sd, yaw: cast[id].rotY, fx, fz };
    });
  }
  for (const b of beats) if (b.cards) b.cards.forEach((code, j) => cardsOf[b.who][j].setFace(code));
  const deal = beats.find((b) => b.type === 'deal'), drops = [];
  if (deal) deal.at.land.forEach((tl, i) => drops.push({ card: cardsOf[deal.to[i % deal.to.length]][Math.floor(i / deal.to.length)], tl }));
  const peekOf = (id) => beats.find((b) => b.type === 'peek' && b.who === id);
  const flipOf = (id) => beats.find((b) => b.type === 'flip' && b.who === id);
  const foldT = (beats.find((b) => b.then === 'fold') || { at: {} }).at.fold;
  const MUCK = [0.045, -0.04];   // beside the pot, off every camera line
  const HAND_P = 0.5, TIP_L = 0.19;   // hand pitch (fingers angled down); wrist -> fingertip
  const hand = makeGiantHand(); scene.add(hand.g); hand.g.visible = false;
  const handKeys = !drops.length ? null : [[drops[0].tl - 1.2, [-0.55, FELT_Y + 0.42, 0]],
    ...drops.flatMap(({ card, tl }) => [[tl - 0.48, [card.x, FELT_Y + 0.2, card.z]], [tl - 0.3, [card.x, FELT_Y + 0.2, card.z]]]),
    [drops[drops.length - 1].tl + 0.4, [-0.55, FELT_Y + 0.42, 0.05]]];
  const handTip = (t) => KV(t, handKeys);
  function drawHand(t) {
    hand.g.visible = !!handKeys && t >= handKeys[0][0] && t <= handKeys[handKeys.length - 1][0];
    if (!hand.g.visible) return;
    const tip = handTip(t);
    hand.g.position.set(tip[0] - TIP_L * Math.cos(HAND_P), tip[1] + TIP_L * Math.sin(HAND_P), tip[2]);
    hand.g.rotation.set(HAND_P, Math.PI / 2, 0, 'YXZ');   // fingers toward +x (the dealer reaches in from -x), tipped down
    hand.pose('pinch', drops.some(({ tl }, i) => t >= (i ? drops[i - 1].tl - 0.3 : handKeys[0][0]) && t < tl - 0.3) ? 1 : 0.3);
  }
  function drawCards(t) {
    for (const cs of Object.values(cardsOf)) for (const c of cs) c.g.visible = false;
    drops.forEach(({ card, tl }, i) => {
      const drop = tl - 0.3, born = i ? drops[i - 1].tl - 0.3 : handKeys[0][0];
      if (t < born) return;
      const g = card.g; g.visible = true;
      let x = card.x, y = FELT_Y + 0.0006, z = card.z, rx = 0, rz = 0, yaw = card.yaw;
      if (t < drop) { const tip = handTip(t); [x, y, z] = [tip[0], tip[1] - 0.012, tip[2]]; rx = 0.25; }   // held in the pinch
      else if (t < tl) { const u = clamp((t - drop) / 0.3); y = lerp(FELT_Y + 0.188, y, u * u); rz = 0.4 * Math.sin(u * 9) * (1 - u); rx = 0.3 * (1 - u) * Math.cos(u * 7); }
      // peek: the human lifts the near edge (pivot on the far edge); both cards, one after the other
      const pk = peekOf(card.id);
      let lift = pk ? (card.j ? K(t, [[pk.at.reveal, 0], [pk.at.reveal + 0.4, 1.1]]) : K(t, [[pk.at.lift, 0], [pk.at.reveal, 1.1]])) : 0;
      if (pk && foldT !== undefined) lift *= 1 - clamp((t - foldT) / 0.15);
      if (lift > 0) { x += card.fx * (CARD_L / 2) * (1 - Math.cos(lift)); z += card.fz * (CARD_L / 2) * (1 - Math.cos(lift)); y += (CARD_L / 2) * Math.sin(lift); rx += lift; }
      // fold: the human's cards arc into the muck, face down
      if (card.id === 'you' && foldT !== undefined && t > foldT + 0.15) {
        const u = easeIO((t - foldT - 0.15) / 0.35);
        x = lerp(x, MUCK[0] + card.j * 0.012, u); z = lerp(z, MUCK[1] + card.j * 0.006, u); y += 0.04 * Math.sin(Math.PI * u); yaw += 0.8 * u;
      }
      // flip: turned over about the long axis
      const fl = flipOf(card.id);
      if (fl) { const u = easeIO((t - fl.at.flip - card.j * 0.08) / 0.3); rz += Math.PI * u; yaw += Math.PI * u; y += 0.02 * Math.sin(Math.PI * u); }   // spun to face the audience as it turns
      g.position.set(x, y, z); g.rotation.set(rx, yaw, rz, 'YXZ');
    });
  }

  // poses gathered from every beat (pure in t): pushes, peeks, the fold slump, the flip reach, the laugh, the burial
  function poses(t, P) {
    for (const w of towers) {
      const k = win(t, w.push - 0.25, w.push + 0.45, 0.2);
      if (k > 0) P[w.id].armB = { sx: -0.9 * k, sz: 0.12, el: -0.4 * k, free: 0 };
      for (const id of ids) if (id !== w.id && t >= w.g0) P[id].headPitch = -0.35 * smooth((t - w.g0) / 0.8);
    }
    const pk = peekOf('you');
    if (pk) {
      const k = win(t, pk.at.lift - 0.3, foldT ?? pk.t1, 0.25);
      if (k > 0) { P.you.headPitch = 0.45 * k; P.you.armB = { sx: -0.7 * k, sz: 0.15, el: -0.6 * k, free: 0 }; }
    }
    if (foldT !== undefined && t >= foldT) { const k = smooth((t - foldT) / 0.4); P.you.lean = 0.22 * k; P.you.headPitch = 0.5 * k; }
    for (const b of beats) if (b.type === 'flip') {
      const k = win(t, b.at.flip - 0.3, b.at.flip + 0.6, 0.2), f = b.at.flip;
      if (k > 0) P[b.who].armB = { sx: -0.8 * k, sz: 0.1, el: -0.5 * k, free: 0 };
      const laugh = smooth((t - f - 0.3) / 0.3) * (1 - smooth((t - f - 3) / 0.5));
      if (laugh > 0) {   // a hop + flailing arms: a lean alone was millimeters at this scale and the shot went static
        const w = Math.sin(t * 13);
        Object.assign(P[b.who], { lean: 0.03 + 0.06 * w * laugh, y: 0.07 * Math.abs(Math.sin(t * 6.5)) * laugh,
          armA: { sx: -0.3 * laugh, sz: (0.5 + 0.35 * w) * laugh, el: -1.1 * laugh, free: 0 }, armB: { sx: -0.3 * laugh, sz: (0.5 - 0.35 * w) * laugh, el: -1.1 * laugh, free: 0 } });
      }
    }
    for (const ev of topples) {
      if (t >= ev.t0 && t < ev.impact) P[ev.target].headPitch = -0.45 * smooth((t - ev.t0) / 0.25);
      if (t >= ev.impact) {
        const k = smooth((t - ev.impact) / 0.25), up = { sx: -0.25 * k, sz: 1.3 * k, el: -1.2 * k, free: 0 };
        Object.assign(P[ev.target], { armA: up, armB: { ...up }, mouth: 'o', headPitch: -0.2 });
      }
    }
  }
  const jolts = [...drops.map((d) => [d.tl, 0.0008]), ...topples.map((e) => [e.impact, 0.0015])];
  const jolt = (t) => jolts.reduce((sum, [te, A]) => sum + (t >= te ? A * Math.exp(-(t - te) * 10) * Math.sin((t - te) * 55) : 0), 0);

  const beatAt = (t) => { for (let i = beats.length - 1; i >= 0; i--) if (t >= beats[i].t0) return i; return -1; };
  const faceAt = (id, t) => { let e = 'neutral'; for (const b of beats) if (t >= (b.type === 'flip' ? b.at.flip + 0.15 : b.t0) && b.face && b.face[id]) e = b.face[id]; return e; };
  const camOf = (b, t) => (b.after === 'topple' && t >= b.at.fall - 0.3 ? 'topple' : b.cam || CAM_OF[b.type]);

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
    hand.g.visible = false; Object.values(cardsOf).flat().forEach((c) => (c.g.visible = false)); chips.begin(); chips.end();
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
    const P = {}; ids.forEach((id) => (P[id] = {}));
    poses(t, P);
    for (const id of ids) { pose(id, P[id], t); cast[id].setFace(faceAt(id, t)); }
    drawHand(t); drawCards(t); drawChips(t);
    const i = beatAt(t), b = i >= 0 ? beats[i] : null;
    shot = b ? cams[camOf(b, t)](b, Math.min(t, b.t1)) : cams.wide(titleBeat, t);
    setCamera(shot.p, shot.a, shot.fov, t, 0.0004);
    camera.position.y += jolt(t);
    camera.updateMatrixWorld();
    bokeh.uniforms.focus.value = camera.position.distanceTo(_v.fromArray(shot.focus));
    sun.target.position.set(shot.focus[0], FELT_Y, shot.focus[2]); sun.position.copy(sun.target.position).add(_v.set(0.12, 0.45, 0.3));   // from +z: shadows fall screen-right, beside the figures
    sayAll(t);
  }

  // ---------------------------------------------------------------- framing self-check (warnings only)
  const proj = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2, (1 - p.y) / 2, p.z]; };
  const subOn = (m) => (story.subs || []).some(([a, b]) => m >= a && m < b);   // the band only matters while a subtitle shows
  const bad = ([x, y, z], m) => (z > 1 || x < 0.06 || x > 0.94 || y < 0.06 || y > 0.94 ? 'outside the frame'
    : x < 0.45 && y > 0.22 && y < 0.36 ? 'under the HUD' : subOn(m) && y > 0.64 && y < 0.76 ? 'in the subtitle band' : null);
  beats.forEach((b, n) => {
    const moments = Object.values(b.at).flat().concat([(b.t0 + b.t1) / 2]).filter((m) => m >= b.t0 && m < b.t1);
    for (const m of moments) {
      update(m); scene.updateMatrixWorld(true);
      const cn = camOf(b, m);   // tilt-up and over-the-shoulder frame a thing (tower top, cards), not a head
      const heads = cn === 'topple' ? ['you', heroOf(b)] : Array.isArray(b.who) ? b.who : Array.isArray(b.to) ? b.to : [heroOf(b)];
      const pts = cn === 'overShoulder' || (cn === 'tiltUp' && m >= b.at.grow0) ? [['focus', new THREE.Vector3().fromArray(shot.focus)]]
        : heads.map((id) => [id + ' head', headW(id)]);
      const B = bubbles[n];
      if (B && B.bub.sprite.visible) pts.push(['bubble', B.bub.sprite.position.clone()]);
      for (const [what, v] of pts) {
        const q = proj(v), why = bad(q, m);
        if (why) console.warn(`⚠️ frame: beat ${n + 1} ${b.type} @${m.toFixed(2)}: ${what} at (${(q[0] * 100).toFixed(0)}%, ${(q[1] * 100).toFixed(0)}%) ${why}`);
      }
    }
  });

  return { update };
}
