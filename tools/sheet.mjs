#!/usr/bin/env node
// Contact sheet of all stills for a video -> videos/<video>/stills/_sheet.jpg (one image to review many frames).
//   node tools/sheet.mjs 001-bedroom-door [--cols 6]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const ci = args.indexOf('--cols');
const dir = path.join(ROOT, 'videos', String(slug), 'stills');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^t[\d.]+\.jpg$/.test(f)).sort() : [];
if (!files.length) { console.error('no stills in ' + dir + ' — run: node tools/render.mjs ' + slug + ' --stills 1,4,8'); process.exit(1); }
const cols = ci >= 0 ? Number(args[ci + 1]) : Math.max(2, Math.min(6, files.length)), rows = Math.ceil(files.length / cols);   // ≥ 2: xstack needs 2+ inputs (a single still used to crash)
let ffmpeg = process.env.FFMPEG_PATH;
if (!ffmpeg) { try { ffmpeg = (await import('@ffmpeg-installer/ffmpeg')).default.path; } catch { ffmpeg = 'ffmpeg'; } }
const inputs = files.flatMap((f) => ['-i', path.join(dir, f)]);
const scaled = files.map((_, i) => `[${i}:v]scale=300:533[s${i}]`).join(';');
const pad = Array.from({ length: cols * rows - files.length }, (_, i) => `color=black:s=300x533:d=1[p${i}]`);
const all = files.map((_, i) => `[s${i}]`).concat(pad.map((_, i) => `[p${i}]`)).join('');
const filter = [scaled, ...pad, `${all}xstack=inputs=${cols * rows}:layout=${Array.from({ length: cols * rows }, (_, i) => `${(i % cols) * 304}_${Math.floor(i / cols) * 537}`).join('|')}:fill=black[out]`].join(';');
const out = path.join(dir, '_sheet.jpg');
const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '[out]', '-frames:v', '1', out], { stdio: 'inherit' });
if (r.status === 0) console.log(out + '   (' + files.map((f) => f.slice(1, -4).replace(/^0+(?=\d)/, '') + 's').join(', ') + ')');
process.exit(r.status ?? 1);
