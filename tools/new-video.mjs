#!/usr/bin/env node
// Scaffold a new video folder from videos/_template.
//   npm run new -- 002-dad-driveway
//   node tools/new-video.mjs 002-dad-driveway --from 001-bedroom-door   (start from an existing video instead)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const fromIdx = args.indexOf('--from');
const from = fromIdx >= 0 ? args[fromIdx + 1] : '_template';
if (!slug || !/^[a-z]*\d{3}-[a-z0-9-]+$/.test(slug)) {
  console.error('usage: npm run new -- <NNN-short-slug>   e.g. dh002-dad-driveway  (optional letter prefix, 3-digit number, lowercase, dashes)');
  process.exit(1);
}
const src = path.join(ROOT, 'videos', from), dst = path.join(ROOT, 'videos', slug);
if (!fs.existsSync(src)) { console.error('source not found: ' + src); process.exit(1); }
if (fs.existsSync(dst)) { console.error('already exists: ' + dst); process.exit(1); }
fs.mkdirSync(dst, { recursive: true });
for (const f of ['story.json', 'shots.js', 'cues.json', 'caption.md']) {
  if (fs.existsSync(path.join(src, f))) fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
if (!fs.existsSync(path.join(dst, 'caption.md'))) fs.writeFileSync(path.join(dst, 'caption.md'), '# Caption\n\n<hook line + emoji>\n\n<2–3 sentence summary>\n\n<question CTA> 👇\nSend this to your ___\n\n#tag1 #tag2 #tag3 #tag4 #animation\n');
console.log(`created videos/${slug}/ from videos/${from}/
next:
  1. edit videos/${slug}/story.json   (opening question, HUD, subtitles, timing)
  2. edit videos/${slug}/shots.js     (shots, cameras, poses)
  3. node tools/render.mjs ${slug} --stills 1,4,8 && node tools/sheet.mjs ${slug}   (look at stills/_sheet.jpg)
  4. python3 -I audio/synth.py ${slug}   (writes videos/${slug}/audio.wav from cues.json)
  5. node tools/render.mjs ${slug}       (writes videos/${slug}/final.mp4)`);
