// Shared helpers for tools: locate Chrome and ffmpeg on macOS / Windows / Linux.
import fs from 'node:fs';
export function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const c = {
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
    win32: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  }[process.platform] || [];
  return c.find((p) => fs.existsSync(p));
}
export async function findFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { return (await import('@ffmpeg-installer/ffmpeg')).default.path; } catch { return 'ffmpeg'; }
}

/** Video bitrate cap for final.mp4 so the file stays under ~90 MB (GitHub rejects > 100 MB) — 6 Mbps for reels up to ~115 s,
 *  lower for long ones (009's 2:19 biography came out at 101 MB with a flat 6M cap). Returns ffmpeg args. */
export function finalRateArgs(durationSec) {
  const kbps = Math.max(2500, Math.min(6000, Math.floor((90e6 * 8) / Math.max(1, durationSec) / 1000 - 230)));
  return ['-maxrate', `${kbps}k`, '-bufsize', `${kbps * 2}k`];
}
