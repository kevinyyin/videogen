// Toy-figure character rig built from primitives (big head, capsule limbs) + pose driver.
// makePerson() -> rig; applyPose(rig, pose) every frame. Model faces +z; rotation.y turns it.
// A pose is plain data (see basePose) so videos can keyframe it with K()/walkLegs().
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, mat, mk } from '@engine/core.js';

export const L1 = 0.42, L2 = 0.40, ANKLE = 0.045;
export const HIP_H = L1 + L2 + ANKLE; // pelvis height when standing (0.865 m)
export const STEP_A = 0.19;           // half stride (m)

// ---------------------------------------------------------------- head (shared by standing + sleeping figures)
/**
 * o: { r, skin, hair, hairStyle: 'bob'|'short'|'messy'|'none', beanie: color|null, glasses: bool }
 * Head-local frame: center at origin, +y up, +z = face.
 */
export function makeHead(o) {
  const r = o.r, g = new THREE.Group();
  const mSkin = mat(o.skin, 0.62), mDark = mat(0x1b1310, 0.35), mMouth = mat(0x6e2f2b, 0.5);
  const mHair = mat(o.hair, 0.72, { side: THREE.DoubleSide });
  const head = mk(new THREE.SphereGeometry(r, 40, 28), mSkin, g); head.scale.set(1, 1.06, 0.96);
  for (const s of [-1, 1]) { const e = mk(new THREE.SphereGeometry(r * 0.2, 14, 10), mSkin, g, s * r * 0.96, -r * 0.06, -r * 0.03); e.scale.set(0.45, 1, 0.8); }
  mk(new THREE.SphereGeometry(r * 0.12, 14, 10), mSkin, g, 0, -r * 0.1, r * 0.97);

  const eyesOpen = new THREE.Group(), eyesClosed = new THREE.Group(); g.add(eyesOpen, eyesClosed);
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xbdbdbd });
  for (const s of [-1, 1]) {
    const e = mk(new THREE.SphereGeometry(r * 0.115, 16, 12), mDark, eyesOpen, s * r * 0.35, r * 0.08, r * 0.86); e.scale.set(1, 1.12, 0.55);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(r * 0.026, 8, 6), glintMat); gl.position.set(s * r * 0.35 + r * 0.045, r * 0.135, r * 0.925); eyesOpen.add(gl);
    const c = mk(new THREE.TorusGeometry(r * 0.11, r * 0.024, 6, 16, Math.PI), mDark, eyesClosed, s * r * 0.35, r * 0.07, r * 0.885); c.rotation.z = Math.PI;
  }
  eyesClosed.visible = false;
  const brows = [];
  for (const s of [-1, 1]) {
    const b = mk(new RoundedBoxGeometry(r * 0.3, r * 0.055, r * 0.06, 2, r * 0.02), mat(o.browColor ?? o.hair, 0.8), g, s * r * 0.36, r * 0.34, r * 0.85);
    b.rotation.z = s * -0.14; brows.push(b);
  }
  const smile = mk(new THREE.TorusGeometry(r * 0.15, r * 0.032, 6, 18, Math.PI), mMouth, g, 0, -r * 0.33, r * 0.895); smile.rotation.z = Math.PI; smile.scale.set(1, 0.7, 1);
  const flat = mk(new RoundedBoxGeometry(r * 0.22, r * 0.045, r * 0.05, 2, r * 0.018), mMouth, g, 0, -r * 0.4, r * 0.895);
  const oMouth = mk(new THREE.SphereGeometry(r * 0.1, 14, 10), mat(0x3a1512, 0.6), g, 0, -r * 0.38, r * 0.86); oMouth.scale.set(0.85, 1.15, 0.5); oMouth.visible = false; // shocked "O"
  for (const s of [-1, 1]) { const c = mk(new THREE.SphereGeometry(r * 0.14, 12, 8), mat(0xe8a08f, 0.7), g, s * r * 0.55, -r * 0.2, r * 0.77); c.scale.set(1, 0.6, 0.35); }
  // optional mustache (o.mustache = color): two fat capsules under the nose — instantly reads as "a grown man"
  if (o.mustache) {
    const mM = mat(o.mustache, 0.8);
    for (const s of [-1, 1]) { const m = mk(new THREE.CapsuleGeometry(r * 0.075, r * 0.2, 4, 10), mM, g, s * r * 0.13, -r * 0.22, r * 0.93); m.rotation.z = s * (Math.PI / 2 - 0.35); }
  }

  // optional chin-curtain beard (o.beard = color; 009 Lincoln): a fat U along the jaw + a chin tuft, no mustache.
  // Grow it with H.beard.scale.setScalar(k) (0.62 → 1); below k≈0.6 it sits inside the head — also set beard.visible=false.
  const beard = new THREE.Group(); g.add(beard);
  if (o.beard) {
    const mBd = mat(o.beard, 0.9);
    const u = mk(new THREE.TorusGeometry(r * 1.0, r * 0.22, 10, 28, Math.PI), mBd, beard, 0, 0, r * 0.12);
    u.rotation.set(-0.85, 0, Math.PI);
    const chin = mk(new THREE.SphereGeometry(r * 0.36, 16, 12), mBd, beard, 0, -r * 0.84, r * 0.7); chin.scale.set(1.35, 1.1, 0.8);
  }
  beard.visible = !!o.beard;

  // hair
  const rh = r * 1.07, hair = new THREE.Group(); g.add(hair);
  const cap = (mtl) => { const m = mk(new THREE.SphereGeometry(rh, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), mtl, hair); m.rotation.x = -0.3; m.scale.set(1, 1.04, 1); return m; };
  if (o.beanie) {
    const mB = mat(o.beanie, 0.95, { side: THREE.DoubleSide });
    const b = mk(new THREE.SphereGeometry(rh * 1.04, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), mB, hair); b.rotation.x = -0.25;
    const brim = mk(new THREE.TorusGeometry(rh * 1.0, r * 0.1, 10, 36), mB, hair); brim.rotation.x = Math.PI / 2 - 0.25; brim.position.set(0, -r * 0.02, -r * 0.05);
    mk(new THREE.SphereGeometry(r * 0.2, 14, 10), mB, hair, 0, rh * 1.02, -r * 0.3);
  } else if (o.hairStyle === 'bob') {
    cap(mHair);
    const bob = mk(new THREE.SphereGeometry(rh * 1.02, 36, 16, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, Math.PI * 0.36, Math.PI * 0.38), mHair, hair, 0, -r * 0.03, 0); bob.scale.set(1.05, 1.12, 1.03);
    mk(new THREE.SphereGeometry(rh * 1.01, 24, 8, Math.PI / 2 - 0.98, 1.96, Math.PI * 0.16, Math.PI * 0.17), mHair, hair);
  } else if (o.hairStyle === 'short' || o.hairStyle === 'messy') {
    cap(mHair);
    mk(new THREE.SphereGeometry(rh * 1.0, 36, 12, Math.PI / 2 + 1.25, Math.PI * 2 - 2.5, Math.PI * 0.42, Math.PI * 0.2), mHair, hair);
    mk(new THREE.SphereGeometry(rh * 1.005, 24, 8, Math.PI / 2 - 0.9, 1.8, Math.PI * 0.15, Math.PI * 0.12), mHair, hair);
    if (o.hairStyle === 'messy') {
      for (let i = 0; i < 6; i++) {
        const tuft = mk(new THREE.ConeGeometry(r * 0.13, r * 0.32, 8), mHair, hair);
        const a = i * 1.07 + 0.3, el = 0.35 + (i % 3) * 0.18;
        tuft.position.set(Math.sin(a) * rh * Math.sin(el), rh * Math.cos(el) * 0.98, Math.cos(a) * rh * Math.sin(el) - r * 0.15);
        tuft.lookAt(tuft.position.clone().multiplyScalar(3)); tuft.rotateX(Math.PI / 2);
      }
    }
  }

  // glasses + tear (toggled per shot)
  const glasses = new THREE.Group(); g.add(glasses);
  const mG = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.35, metalness: 0.4 });
  for (const s of [-1, 1]) {
    mk(new THREE.TorusGeometry(r * 0.25, r * 0.03, 8, 26), mG, glasses, s * r * 0.36, r * 0.08, r * 1.0);
    const arm = mk(new THREE.BoxGeometry(r * 0.03, r * 0.03, r * 0.85), mG, glasses, s * r * 0.62, r * 0.1, r * 0.55); arm.rotation.y = s * 0.12;
  }
  mk(new THREE.CylinderGeometry(r * 0.02, r * 0.02, r * 0.22, 6), mG, glasses, 0, r * 0.12, r * 1.0).rotation.z = Math.PI / 2;
  glasses.visible = !!o.glasses;
  const tear = new THREE.Group(); g.add(tear);
  const mTear = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, emissive: 0x9fd0ff, emissiveIntensity: 1.4, roughness: 0.1, transparent: true, opacity: 0.85 });
  for (const s of [-1, 1]) {
    const streak = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.022, r * 0.36, 4, 8), mTear); streak.position.set(s * r * 0.4, -r * 0.14, r * 0.875); streak.rotation.x = -0.35; tear.add(streak);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(r * 0.045, 10, 8), mTear); drop.position.set(s * r * 0.41, -r * 0.36, r * 0.83); tear.add(drop);
  }
  tear.visible = false;

  return { g, head, eyesOpen, eyesClosed, smile, flat, oMouth, brows, hair, hairMat: mHair, skinMat: mSkin, glasses, tear, beard };
}

// ---------------------------------------------------------------- standing figure
/** o: { skin, top, pants, shoes, hair, hairStyle, headR } */
export function makePerson(o) {
  const root = new THREE.Group();
  const mTop = mat(o.top, 0.92), mPants = mat(o.pants, 0.9), mShoe = mat(o.shoes ?? 0x3a2e2a, 0.7), mSkin = mat(o.skin, 0.62);

  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0.085 * s, HIP_H, 0); root.add(hip);
    mk(new THREE.CapsuleGeometry(0.07, L1 - 0.1, 6, 14), mPants, hip, 0, -L1 / 2, 0);
    const knee = new THREE.Group(); knee.position.y = -L1; hip.add(knee);
    mk(new THREE.CapsuleGeometry(0.058, L2 - 0.08, 6, 14), mPants, knee, 0, -L2 / 2, 0);
    const ankle = new THREE.Group(); ankle.position.y = -L2; knee.add(ankle);
    mk(new RoundedBoxGeometry(0.1, 0.07, 0.21, 2, 0.03), mShoe, ankle, 0, -0.012, 0.045);
    legs.push({ hip, knee, ankle, s });
  }
  const pelvis = new THREE.Group(); pelvis.position.y = HIP_H; root.add(pelvis);
  const hips = mk(new THREE.CapsuleGeometry(0.15, 0.06, 6, 18), mPants, pelvis, 0, 0.02, 0); hips.scale.set(1.12, 1, 0.82);
  const spine = new THREE.Group(); pelvis.add(spine);
  const torso = mk(new THREE.CapsuleGeometry(0.165, 0.27, 8, 22), mTop, spine, 0, 0.27, 0); torso.scale.set(1.12, 1, 0.78);
  // pregnancy/belly bump (pose.belly 0..1): a shirt-colored sphere on the lower front of the torso, scaled from nothing
  const belly = new THREE.Group(); belly.position.set(0, 0.14, 0.05); spine.add(belly);
  const bellyMesh = mk(new THREE.SphereGeometry(0.2, 28, 20), mTop, belly); bellyMesh.scale.set(0.95, 0.92, 1);
  belly.visible = false;
  if (o.collar) { const c = mk(new THREE.TorusGeometry(0.075, 0.022, 8, 20), mat(o.collar, 0.9), spine, 0, 0.535, 0.01); c.rotation.x = Math.PI / 2; }
  mk(new THREE.CylinderGeometry(0.045, 0.052, 0.09, 12), mSkin, spine, 0, 0.56, 0);
  const headG = new THREE.Group(); headG.position.y = 0.59; spine.add(headG);
  const headR = o.headR ?? 0.135;
  const H = makeHead({ r: headR, skin: o.skin, hair: o.hair, hairStyle: o.hairStyle, glasses: o.glasses, browColor: o.browColor, mustache: o.mustache, beard: o.beard });
  H.g.position.y = headR * 0.95; headG.add(H.g);

  // optional long dress (o.dress = color; 009 period women): a cone skirt from the waist to the floor, parented to the
  // root so it stays upright while the legs walk inside it. Seated figures: hide it behind furniture or set dress.visible.
  let dress = null;
  if (o.dress) {
    dress = mk(new THREE.CylinderGeometry(0.17, 0.44, HIP_H + 0.1, 24, 1, true), mat(o.dress, 0.9, { side: THREE.DoubleSide }), root, 0, (HIP_H + 0.1) / 2 - 0.02, 0.01);
    mk(new THREE.CircleGeometry(0.17, 24), mat(o.dress, 0.9), dress, 0, (HIP_H + 0.1) / 2, 0).rotation.x = -Math.PI / 2;
  }

  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(0.205 * s, 0.45, 0); spine.add(shoulder);
    mk(new THREE.SphereGeometry(0.062, 14, 10), mTop, shoulder);
    mk(new THREE.CapsuleGeometry(0.056, 0.17, 6, 12), mTop, shoulder, 0, -0.135, 0);
    const elbow = new THREE.Group(); elbow.position.y = -0.27; shoulder.add(elbow);
    mk(new THREE.CapsuleGeometry(0.05, 0.16, 6, 12), mTop, elbow, 0, -0.12, 0);
    const hand = new THREE.Group(); hand.position.y = -0.265; elbow.add(hand);
    const hm = mk(new THREE.SphereGeometry(0.052, 14, 10), mSkin, hand); hm.scale.set(0.85, 1.12, 0.62);
    mk(new THREE.CapsuleGeometry(0.016, 0.03, 4, 8), mSkin, hand, -0.035 * s * -1, 0.005, 0.03).rotation.z = 0.6 * s;
    arms.push({ shoulder, elbow, hand, s });
  }
  return { root, legs, pelvis, spine, headG, head: H, arms, belly, dress, mats: { top: mTop, pants: mPants, hair: H.hairMat, skin: mSkin, faceSkin: H.skinMat } };
}

/** Default standing pose. armA = the arm on the figure's local -x side, armB = local +x. */
export function basePose() {
  return {
    visible: true, x: 0, y: 0, z: 0, rotY: 0, dist: 0, speed: 0,
    lean: 0.03, crouch: 0, footFwd: 0, headPitch: 0.05, headYaw: 0, headRoll: 0,
    armA: { sx: 0.03, sz: 0.07, el: -0.18, free: 1 }, armB: { sx: 0.03, sz: 0.07, el: -0.18, free: 1 },
    smile: 1, eyes: 'open', tear: false, glasses: false,
    belly: 0, waddle: 0, mouth: null, floor: 0,
  };
}

/** Two-bone leg IK in the sagittal plane: ankle target (dz forward, dy vertical) relative to the hip joint; keeps the foot flat. */
function legIK(leg, dz, dy) {
  let d = Math.hypot(dz, dy); d = Math.min(d, L1 + L2 - 1e-4);
  const gamma = Math.atan2(dz, -dy);
  const alpha = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const beta = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  leg.hip.rotation.x = -(gamma + alpha);
  leg.knee.rotation.x = beta;
  leg.ankle.rotation.x = gamma + alpha - beta;
}

export function applyPose(P, p) {
  P.root.visible = p.visible !== false;
  P.root.position.set(p.x, p.y || 0, p.z);
  P.root.rotation.y = p.rotY;
  const walk = clamp(p.speed / 0.35);
  const ph = (p.dist * Math.PI) / (2 * STEP_A);
  // waddle (0..1): side-to-side roll locked to the gait + legs splayed (penguin walk). Use with lean < 0 (leaning back).
  const wd = p.waddle || 0;
  P.root.rotation.z = wd * (0.02 + 0.09 * walk) * Math.sin(ph);
  P.legs.forEach((leg) => { leg.hip.rotation.z = leg.s * 0.07 * wd; });
  const bl = Math.max(0, p.belly || 0);
  P.belly.visible = bl > 0.01;
  if (P.belly.visible) { P.belly.scale.setScalar(Math.min(bl, 1.6)); P.belly.position.z = 0.03 + 0.12 * Math.min(bl, 1.3); P.belly.position.y = 0.15 - 0.02 * bl; } // front of bump ≈ 0.03 + 0.32·belly m
  const hipY = HIP_H - p.crouch + walk * 0.012 * Math.abs(Math.sin(ph));
  P.pelvis.position.y = hipY;
  P.legs.forEach((leg, i) => {
    leg.hip.position.y = hipY;
    const phi = ph + (i ? Math.PI : 0);
    const fz = walk * STEP_A * Math.sin(phi) + (p.footFwd || 0);
    const lift = walk * 0.075 * Math.max(0, Math.cos(phi));
    legIK(leg, fz, ANKLE + lift + (p.floor || 0) - (p.y || 0) - hipY); // p.floor = ground height under the feet (sidewalks, steps)
  });
  P.spine.rotation.set(p.lean + walk * 0.04, walk * 0.07 * Math.sin(ph), 0);
  P.headG.rotation.set(p.headPitch, p.headYaw, p.headRoll);
  for (const arm of P.arms) {
    const a = arm.s < 0 ? p.armA : p.armB;
    const free = a.free ?? 1;
    const swing = walk * 0.3 * Math.sin(ph + (arm.s < 0 ? 0 : Math.PI)) * free;
    const splay = 0.2 * Math.min(Math.max(0, p.belly || 0), 1.3) * free; // free-hanging arms swing out around a big belly
    arm.shoulder.rotation.set(a.sx + swing, a.twist || 0, arm.s * (a.sz + splay));
    arm.elbow.rotation.x = a.el - walk * 0.12 * free;
  }
  const h = P.head;
  // mouth: p.mouth = 'smile' | 'flat' | 'o' (shocked) overrides the legacy p.smile flag
  const mouth = p.mouth || (p.smile > 0.5 ? 'smile' : 'flat');
  h.smile.visible = mouth === 'smile'; h.flat.visible = mouth === 'flat'; h.oMouth.visible = mouth === 'o';
  h.eyesOpen.visible = p.eyes !== 'closed'; h.eyesClosed.visible = p.eyes === 'closed';
  h.tear.visible = !!p.tear; h.glasses.visible = !!p.glasses;
}

/** World position of a hand (side -1 = armA, +1 = armB). Call after applyPose. */
const _v = new THREE.Vector3();
export function handWorld(P, side = -1) {
  P.root.updateMatrixWorld(true);
  return P.arms.find((a) => a.s === side).hand.getWorldPosition(_v).clone();
}

/** Blink: closed for ~0.13 s every few seconds (deterministic). Returns 'open' | 'closed'. */
export function blink(t, seed = 0) {
  const period = 3.3 + (seed % 3) * 0.7;
  return (t + seed * 1.7) % period < 0.13 ? 'closed' : 'open';
}

// ---------------------------------------------------------------- lying figure (head on a pillow; body is a bump under the blanket)
/** o: { r, skin, hair, hairStyle, beanie } — returns {g (place at head center), turn (rotation.z rolls the face sideways), head} */
export function makeSleeper(o) {
  const g = new THREE.Group(), turn = new THREE.Group(), face = new THREE.Group();
  g.add(turn); turn.add(face); face.rotation.x = -Math.PI / 2 + (o.tilt ?? 0.4); // head top -> -z (headboard), face -> ceiling, chin tipped toward the feet
  const H = makeHead({ ...o, glasses: false });
  H.eyesOpen.visible = false; H.eyesClosed.visible = true; H.smile.visible = false; H.flat.visible = true;
  H.flat.scale.set(0.7, 1, 1);
  face.add(H.g);
  return { g, turn, head: H };
}

export const hairColor = (young, old, age) => new THREE.Color(young).lerp(new THREE.Color(old), clamp(age));
export { lerp };

// ---------------------------------------------------------------- wet pants (012) — a cartoon dark patch, never liquid
/**
 * addWetPatch(rig, { color }) → setWet(k 0..1): a darker, glossier patch spreads over the crotch + inner thighs.
 * color = the rig's pants color (the patch is that color × 0.5, low roughness = "wet" sheen). Pure cartoon: no drips/puddles.
 */
export function addWetPatch(P, o = {}) {
  const base = new THREE.Color(o.color ?? 0x6b5a48);
  const wetM = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.48), roughness: 0.28, metalness: 0.05 });
  const front = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), wetM); front.position.set(0, -0.05, 0.085); front.scale.set(1, 0.85, 0.5);
  P.pelvis.add(front);
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), wetM); back.position.set(0, -0.04, -0.07); back.scale.set(1, 0.8, 0.45);
  P.pelvis.add(back);
  const thighs = P.legs.map((leg) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.0735, 0.2, 6, 14), wetM); m.position.y = -0.12; leg.hip.add(m); return m; });
  const all = [front, back, ...thighs];
  all.forEach((m) => { m.castShadow = false; m.visible = false; });
  const setWet = (k) => {
    k = Math.max(0, Math.min(1, k));
    all.forEach((m) => (m.visible = k > 0.01));
    front.scale.set(0.35 + 0.65 * k, (0.35 + 0.65 * k) * 0.85, 0.5); back.scale.set(0.3 + 0.7 * k, (0.3 + 0.7 * k) * 0.8, 0.45);
    thighs.forEach((m) => { m.scale.set(1, Math.max(0.05, k), 1); m.position.y = -0.03 - 0.09 * k; });
  };
  setWet(0);
  return setWet;
}

// ---------------------------------------------------------------- fluffy tail (015) — wags when its owner lies
/**
 * addTail(rig, { color, tip, len, r, n, seed }) → tail handle (also stored as rig.tail):
 *   tail.update(t, wag 0..1, { rate, sprout 0..1, lift, side, curl, spin, still })
 * A bushy chain of n lumpy segments on the back of the pelvis: rests pointing back + up with a husky curl, idles with a lazy sway
 * (so it is never still) and whips side to side with `wag` (rate in Hz, ~4.5 = frantic). `lift` raises it, `side` swings the root
 * (seated figures: point it out past a chair back), `curl` adds per-joint curl, `still` stops the idle sway (truth), `spin` (rad) turns the whole tail around the
 * body's vertical axis (straight up + curled + spinning = a helicopter rotor). Color = the owner's hair, lighter tip.
 */
export function addTail(P, o = {}) {
  const len = o.len ?? 0.8, N = o.n ?? 13, R = o.r ?? 0.105, segL = len / N;
  const col = new THREE.Color(o.color ?? 0x8a5a32), tipC = new THREE.Color(o.tip ?? 0xf3ece2);
  const base = new THREE.Group(); base.position.set(0, -0.01, -0.105); base.rotation.order = 'YXZ'; P.pelvis.add(base);
  const sprout = new THREE.Group(); base.add(sprout);
  const r0 = rngT(o.seed ?? 1), joints = [];
  const fur = furTexture();
  let parent = sprout;
  for (let i = 0; i < N; i++) {
    const j = new THREE.Group(); j.position.z = i ? -segL : 0; parent.add(j); joints.push(j); parent = j;
    const u = i / (N - 1), r = R * (0.3 + 0.7 * Math.sin(Math.PI * Math.min(1, Math.pow(u, 0.7) * 0.9 + 0.05)));
    const c = col.clone().lerp(tipC, clamp((u - 0.8) / 0.15)).offsetHSL(0, 0, (r0() - 0.5) * 0.03);
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: 1, map: fur });
    const geo = new THREE.SphereGeometry(r, 16, 12); geo.rotateX(Math.PI / 2);   // poles along the tail → fur streaks run along it
    const s = mk(geo, m, j, 0, 0, -segL * 0.5); s.scale.set(1, 1, (segL * 1.7) / r + 0.55); s.rotation.z = r0() * 6;
    for (let k = 0; k < 2; k++) { // tufts: smaller fur balls poking out at random angles = a fluffy, lumpy silhouette
      const a = r0() * Math.PI * 2, rr = r * (0.55 + r0() * 0.2);
      const tg = new THREE.SphereGeometry(rr, 12, 9); tg.rotateX(Math.PI / 2);
      const tf = mk(tg, m, j, Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, -segL * (0.1 + r0() * 0.8)); tf.scale.z = 1.25; tf.rotation.z = r0() * 6;
    }
  }
  const tail = {
    base, sprout, joints,
    update(t, wag = 0, q = {}) {
      const rate = q.rate ?? 4.5, sp = q.sprout ?? 1, ph = (o.seed ?? 1) * 1.7;
      sprout.visible = sp > 0.01; sprout.scale.setScalar(Math.max(0.001, sp));
      const w = clamp(wag), idle = (q.still ? 0.012 : 0.12) * (1 - w);
      base.rotation.set(0.32 + 0.25 * w + (q.lift ?? 0), (q.side ?? 0) + (q.spin ?? 0), 0);
      joints.forEach((j, i) => {
        const curl = i ? 0.064 + (q.curl ?? 0) - 0.017 * w : 0;
        const amp = w * (i ? 0.085 + 0.008 * i : 0.75) + idle * (i ? 0.25 : 1);
        const f = w > 0.02 ? rate : 0.7;
        j.rotation.set(curl, amp * Math.sin((t * f + ph) * Math.PI * 2 - i * (w > 0.02 ? 0.33 : 0.22)), 0);
      });
    },
  };
  tail.update(0, 0);
  P.tail = tail;
  return tail;
}
let _fur = null;
function furTexture() { // soft streaks along v (the tail axis): light + dark strands
  if (_fur) return _fur;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, 128, 256); const r = rngT(7);
  for (let i = 0; i < 500; i++) { const x = r() * 128, y = r() * 256, l = 10 + r() * 26; g.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.1 + r() * 0.15})` : `rgba(60,50,40,${0.08 + r() * 0.12})`; g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + l); g.stroke(); }
  _fur = new THREE.CanvasTexture(c); _fur.colorSpace = THREE.SRGBColorSpace; _fur.wrapS = _fur.wrapT = THREE.RepeatWrapping; _fur.repeat.set(3, 1);
  return _fur;
}
function rngT(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
