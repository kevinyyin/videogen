#!/usr/bin/env node
// Environment check: run `npm run doctor` after `npm install`. Prints what's missing and how to fix it.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = true;
const check = (name, pass, fix) => { console.log(`${pass ? '✅' : '❌'} ${name}${pass ? '' : '\n     fix: ' + fix}`); if (!pass) ok = false; };

const [maj] = process.versions.node.split('.').map(Number);
check(`Node ${process.versions.node} (need 18+)`, maj >= 18, 'install Node 18+ from https://nodejs.org');
check('npm dependencies installed', fs.existsSync(path.join(ROOT, 'node_modules/three')) && fs.existsSync(path.join(ROOT, 'node_modules/puppeteer-core')), 'run: npm install');

const { findChrome, findFfmpeg } = await import('./lib.mjs');
const chrome = findChrome();
check(`Chrome/Chromium/Edge found${chrome ? ' (' + chrome + ')' : ''}`, !!chrome, 'install Google Chrome, or set CHROME_PATH=/path/to/chrome');
const ffmpeg = await findFfmpeg();
const ff = spawnSync(ffmpeg, ['-version'], { encoding: 'utf8' });
check(`ffmpeg works (${ffmpeg})`, ff.status === 0, 'run: npm install  (bundles ffmpeg), or install ffmpeg and set FFMPEG_PATH');

const py = spawnSync('python3', ['-c', 'import numpy, scipy; print(numpy.__version__, scipy.__version__)'], { encoding: 'utf8' });
check(`python3 + numpy + scipy${py.status === 0 ? ' (' + py.stdout.trim() + ')' : ''}`, py.status === 0, 'install Python 3, then: python3 -m pip install numpy scipy');

if (chrome && fs.existsSync(path.join(ROOT, 'node_modules/puppeteer-core'))) {
  try {
    const puppeteer = (await import('puppeteer-core')).default;
    const b = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=' + (process.platform === 'darwin' ? 'metal' : 'default')] });
    const p = await b.newPage();
    const gl = await p.evaluate(() => { const c = document.createElement('canvas').getContext('webgl2'); if (!c) return null; const e = c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'webgl2'; });
    await b.close();
    check(`headless Chrome WebGL2${gl ? ' (' + gl + ')' : ''}`, !!gl, 'update Chrome / GPU drivers; on Linux servers install mesa or use a machine with a GPU');
    if (gl && /swiftshader|llvmpipe|software/i.test(gl)) console.log('   ⚠️  software rendering detected — renders will work but be slow');
  } catch (e) {
    check('headless Chrome launches', false, String(e.message).split('\n')[0] + '  (if this runs inside a sandbox, run it outside: the macOS sandbox blocks Chrome)');
  }
}
console.log(ok ? '\nAll good. Try: node tools/render.mjs _template --stills 2,6,9 && node tools/sheet.mjs _template' : '\nFix the ❌ items above, then re-run: npm run doctor');
process.exit(ok ? 0 : 1);
