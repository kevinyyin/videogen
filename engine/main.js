// Boots one video: /engine/index.html?video=<folder under videos/>.
// The video folder supplies story.json (text + HUD timeline) and shots.js (3D scene + animation).
// Exposes window.renderAt(t) and window.EDSTUDIO_READY for tools/render.mjs.
import { createStudio, createOverlay } from '@engine/core.js';

const slug = new URLSearchParams(location.search).get('video');
const base = `/videos/${slug}/`;

try {
  const story = await (await fetch(base + 'story.json')).json();
  const studio = createStudio(document.getElementById('gl'), story.look || {});
  const overlay = createOverlay(story);
  const mod = await import(base + 'shots.js');
  const video = await mod.build(studio, story);

  await Promise.all([
    document.fonts.load('300 74px Newsreader'), document.fonts.load('italic 400 44px Newsreader'),
    document.fonts.load('600 20px Inter'), document.fonts.load('500 18px Inter'),
  ]);
  await document.fonts.ready;

  window.STORY = story;
  // Debug cameras (tools/render.mjs --cam top|front): bird's-eye or straight-on views to check blocking + light.
  const dbg = new URLSearchParams(location.search).get('cam');
  if (dbg) { // hide ceilings + text so you can see the floor plan
    document.getElementById('ui').style.display = 'none';
    // ceilings go to layer 1: invisible to this camera but still casting shadows (so the lighting stays true)
    const v = new studio.THREE.Vector3();
    studio.scene.traverse((o) => { if (o.isMesh && o.getWorldPosition(v).y > 2.65) o.layers.set(1); if (o.isLight && o.shadow) o.shadow.camera.layers.enable(1); });
  }
  const debugCam = () => {
    const c = studio.camera, view = story.debugView || { center: [0, 0, 0], height: 7 };
    if (dbg === 'top') { c.position.set(view.center[0], view.height, view.center[2] + 0.001); c.fov = 60; c.updateProjectionMatrix(); c.lookAt(view.center[0], 0, view.center[2]); }
    if (dbg === 'front') { c.position.set(view.center[0], 1.6, view.center[2] + view.height); c.fov = 60; c.updateProjectionMatrix(); c.lookAt(view.center[0], 1.0, view.center[2]); }
  };
  window.renderAt = (t) => { video.update(t); if (dbg) debugCam(); overlay.update(t); studio.render(t); };
  window.renderAt(0);
  window.EDSTUDIO_READY = true;
} catch (err) {
  console.error(err);
  window.EDSTUDIO_ERROR = String(err && err.stack || err);
}
