// TEMPLATE — copy via `npm run new -- 002-my-slug`. A minimal, working 10-second video:
// door opens, a parent walks to the bed, tucks the blanket, camera cuts to a medium shot.
// Replace the story, shots, cameras and poses; keep the structure (SHOTS, CAMS, pose function, build/update).
import * as THREE from 'three';
import { K, clamp, lerp, lerpAngle, walkLegs, faceToward } from '@engine/core.js';
import { makePerson, makeSleeper, basePose, applyPose, blink } from '@engine/rig.js';
import { Blanket, quiltTexture } from '@engine/props.js';
import { buildBedroom, DIMS } from '@engine/sets/bedroom.js';

const PI = Math.PI, OPEN = 1.25;
const HALL = DIMS.hallSpot, DOOR = DIMS.doorway, BEDSIDE = [-1.2, -1.58];

export const SHOTS = [
  { t0: 0, t1: 6, cam: 'wide' },
  { t0: 6, t1: 10, cam: 'medium' },
];
// p: camera position [start, end]; a: look-at target [start, end]; fov in degrees; amp: handheld drift (m)
export const CAMS = {
  wide:   { p: [[1.85, 2.15, 2.45], [1.62, 2.0, 2.05]], a: [[-0.95, 0.72, -0.5], [-1.0, 0.72, -0.62]], fov: 70, amp: 0.004 },
  medium: { p: [[0.8, 1.32, 0.15], [0.7, 1.28, -0.05]], a: [[-0.78, 0.78, -1.85], [-0.8, 0.78, -1.9]], fov: 55, amp: 0.004 },
};

function doorAt(t) { return K(t, [[0, 0], [1.0, 0], [2.4, OPEN]]); }

function parentPose(t) {
  const p = basePose();
  p.eyes = blink(t, 1);
  const w = walkLegs(t, HALL, [{ t0: 2.0, t1: 5.2, pts: [DOOR, [-1.6, -0.85], BEDSIDE] }]);
  Object.assign(p, { x: w.x, z: w.z, dist: w.dist, speed: w.speed });
  p.rotY = lerpAngle(w.head ?? PI / 2, PI / 2, K(t, [[5.0, 0], [5.5, 1]]));   // end facing the bed (+x)
  p.lean = K(t, [[5.4, 0.04], [6.0, 0.42]]);
  p.headPitch = K(t, [[5.4, 0.1], [6.0, 0.5]]);
  p.armA = { sx: K(t, [[6.0, 0], [6.6, -1.0], [7.6, -1.15]]), sz: K(t, [[6.0, 0.07], [6.6, -0.08]]), el: K(t, [[6.0, -0.18], [6.6, -0.45], [7.6, -0.6]]), free: K(t, [[5.0, 1], [5.4, 0]]) };
  return p;
}

export async function build(studio, story) {
  const { scene, setCamera } = studio;
  const set = buildBedroom(studio, {});
  const B = set.D.bed;
  set.crib.visible = false;
  Object.values(set.decor).forEach((g) => (g.visible = false));
  set.decor.kid.visible = true;

  const parent = makePerson({ skin: 0xe2ad8c, top: 0x4f7a6a, collar: 0xf3e9dc, pants: 0x34405c, hair: 0x3d2a1f, hairStyle: 'short' });
  scene.add(parent.root);
  const child = makeSleeper({ r: 0.098, skin: 0xe8b48f, hair: 0x3d2a1f, hairStyle: 'short' });
  child.g.position.set(B.cx, B.top + 0.175, -2.16); child.turn.rotation.z = -0.6; scene.add(child.g);

  const blanket = new Blanket(new THREE.MeshStandardMaterial({ map: quiltTexture('#7b5d6e', '#c9b18f'), roughness: 0.95, side: THREE.DoubleSide }));
  scene.add(blanket.mesh);
  const body = { x: B.cx, zA: -1.0, zB: -1.95, h: 0.1, r: 0.17 };

  function update(t) {
    const shot = SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
    const theta = doorAt(t);
    set.setDoor(theta); set.lights.spill.intensity = 0.9 * clamp(theta / OPEN); set.updateDust(t, theta);
    set.setSeason('summer', t); set.setNightlight(1);
    applyPose(parent, parentPose(t));
    blanket.update({ cx: B.cx, w: B.w, top: B.top, zFoot: B.z1, zHead: K(t, [[6.6, -1.75], [7.6, -1.95]]), hang: 0.26, footHang: 0.22, r: 0.05, body });
    const c = CAMS[shot.cam], u = clamp((t - shot.t0) / (shot.t1 - shot.t0)), e = u * u * (3 - 2 * u);
    setCamera(c.p[0].map((v, i) => lerp(v, c.p[1][i], e)), c.a[0].map((v, i) => lerp(v, c.a[1][i], e)), c.fov, t, c.amp);
  }
  return { update };
}
