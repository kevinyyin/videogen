#!/usr/bin/env node
// EDStudio renderer: serves the repo, opens engine/index.html?video=<slug> in headless Chrome,
// steps the timeline frame by frame, and pipes JPEG frames into ffmpeg (H.264, 1080x1920).
//
//   node tools/render.mjs <video>                      full render (+ muxes audio if videos/<video>/audio.wav exists)
//   node tools/render.mjs <video> --stills 0.5,7,15    still frames -> videos/<video>/stills/ (half size; --full for 1080x1920)
//   node tools/render.mjs <video> --preview            fast draft: 15 fps, half size
//   node tools/render.mjs <video> --from 20 --to 28    render a time range only
//   node tools/render.mjs <video> --stills 5 --cam top  bird's-eye debug view (check blocking, light, collisions)
//   (--stills clears previous stills first; add --keep to append)
//
// Env overrides: CHROME_PATH, FFMPEG_PATH.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { findChrome, findFfmpeg, finalRateArgs } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const slug = args.find((a) => !a.startsWith('--') && !/^[\d.,]+$/.test(a));
if (!slug) { console.error('usage: node tools/render.mjs <video-folder> [--stills t1,t2] [--preview] [--from s] [--to s]'); process.exit(1); }
const videoDir = path.join(ROOT, 'videos', path.basename(slug));
if (!fs.existsSync(path.join(videoDir, 'story.json'))) { console.error('No such video: ' + videoDir); process.exit(1); }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

const story = JSON.parse(fs.readFileSync(path.join(videoDir, 'story.json'), 'utf8'));
// house rule: the end card must stay fully readable for >= 3.5 s (user feedback on 001: it vanished before it could be read)
if (story.end && story.duration - (story.end.in + 0.5) < 3.5) console.warn(`⚠️  end card is fully visible for only ${(story.duration - story.end.in - 0.5).toFixed(1)} s — set duration ≥ end.in + 4.0 (house rule: ≥ 3.5 s)`);
// house rule: every video ships with a real caption (user: "make sure every video generation has a caption")
{ const cap = path.join(videoDir, 'caption.md'); const txt = fs.existsSync(cap) ? fs.readFileSync(cap, 'utf8') : '';
  if (!txt || txt.includes('<hook line')) console.warn('⚠️  caption.md is ' + (txt ? 'still the template' : 'missing') + ' — write it (hook + emoji, 2–3 sentences, question CTA 👇, "Send this to your ___", 5 hashtags incl. #animation) and paste it in your report'); }
const preview = !!flag('preview', false);
const fps = Number(flag('fps', preview ? 15 : story.fps || 30));
const t0 = Number(flag('from', 0)), t1 = Number(flag('to', story.duration));
const stills = flag('stills', null);
const scale = flag('full', false) ? 1 : (stills || preview) ? 0.5 : 1;

const chrome = findChrome();
if (!chrome) { console.error('Chrome not found. Install Google Chrome or set CHROME_PATH.'); process.exit(1); }
const srv = await serve();
const cam = flag('cam', null); // debug camera: top | front
const url = `http://127.0.0.1:${srv.address().port}/engine/index.html?video=${encodeURIComponent(path.basename(videoDir))}${cam ? '&cam=' + cam : ''}${flag('noshadow', false) ? '&noshadow' : ''}`;
const browser = await puppeteer.launch({
  executablePath: chrome, headless: true,
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=' + (process.platform === 'darwin' ? 'metal' : 'default'), '--hide-scrollbars', '--mute-audio'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[page error]', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction('window.EDSTUDIO_READY || window.EDSTUDIO_ERROR', { timeout: 120000 });
const err = await page.evaluate('window.EDSTUDIO_ERROR');
if (err) { console.error(err); await browser.close(); srv.close(); process.exit(1); }

async function frameAt(t) {
  await page.evaluate((tt) => new Promise((r) => { window.renderAt(tt); requestAnimationFrame(() => r()); }), t);
  return page.screenshot({ type: 'jpeg', quality: stills ? 90 : 95, optimizeForSpeed: true, clip: { x: 0, y: 0, width: 1080, height: 1920, scale } });
}

if (stills) {
  const outDir = path.join(videoDir, 'stills'); fs.mkdirSync(outDir, { recursive: true });
  // start each batch clean so _sheet.jpg only shows this batch (old stills confuse reviews); --keep to add to the existing set
  if (!flag('keep', false)) for (const f of fs.readdirSync(outDir)) if (/^t[\d.]+\.jpg$/.test(f)) fs.unlinkSync(path.join(outDir, f));
  for (const t of String(stills).split(',').map(Number)) {
    const f = path.join(outDir, `t${t.toFixed(2).padStart(6, '0')}.jpg`);
    fs.writeFileSync(f, await frameAt(t)); console.log(f);
  }
} else {
  const outDir = path.join(videoDir, 'out'); fs.mkdirSync(outDir, { recursive: true });
  const silent = path.join(outDir, preview ? 'preview.mp4' : 'silent.mp4');
  const ffmpeg = await findFfmpeg();
  const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', preview ? 'veryfast' : 'medium', '-crf', preview ? '24' : '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((t1 - t0) * fps), start = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await frameAt(t0 + i / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % fps === 0 || i === n - 1) {
      const el = (Date.now() - start) / 1000, eta = (el / (i + 1)) * (n - i - 1);
      process.stdout.write(`\rframe ${i + 1}/${n}  ${(t0 + i / fps).toFixed(1)}s  elapsed ${el.toFixed(0)}s  eta ${eta.toFixed(0)}s   `);
    }
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  console.log('\nvideo: ' + silent);
  // mux audio if present (full renders only)
  const wav = path.join(videoDir, 'audio.wav');
  if (!preview && t0 === 0 && fs.existsSync(wav)) {
    const final = path.join(videoDir, 'final.mp4');
    // re-encode at a capped bitrate so final.mp4 stays < 100 MB (GitHub limit) and well within Instagram's spec
    await new Promise((r) => spawn(ffmpeg, ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', ...finalRateArgs(story.duration), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', final], { stdio: 'inherit' }).on('close', r));
    console.log('final (with audio): ' + final);
  } else if (!preview) console.log('(no videos/' + path.basename(videoDir) + '/audio.wav yet — run the audio step, then re-run or mux with tools/mux.mjs)');
}
await browser.close(); srv.close();
