// Renders the showreel frame by frame in headless Chromium and encodes it.
//
//   node showreel/render.mjs                 full render -> showreel/showreel.mp4
//   node showreel/render.mjs --stills 1,2.5  PNG stills -> showreel/out/still-*.png
//
// Requires ffmpeg on PATH and Playwright (local or global install).
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'out');
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch {
  playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
}

const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;
const sub = args.includes('--sub') ? args[args.indexOf('--sub') + 1] : '4';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.wav': 'audio/wav' };
const server = createServer(async (req, res) => {
  const file = path.join(here, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try {
    const body = await readFile(file.endsWith(path.sep) ? path.join(file, 'index.html') : file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/index.html?render&sub=${sub}`;

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => { console.error('page error:', e); process.exitCode = 1; });
await page.goto(url);
await page.evaluate(() => window.ready);
const { frames, FPS } = await page.evaluate(() => window.REEL);
await mkdir(outDir, { recursive: true });

if (stillsArg) {
  for (const t of stillsArg.split(',').map(Number)) {
    const data = await page.evaluate(f => window.grabFrame(f), Math.round(t * FPS));
    const file = path.join(outDir, `still-${t.toFixed(2)}.png`);
    await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(file);
  }
} else {
  const wav = path.join(here, 'out', 'showreel.wav');
  execSync(`node ${path.join(here, 'audio.mjs')} ${wav}`, { stdio: 'inherit' });
  const mp4 = path.join(here, 'showreel.mp4');
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '256k', '-shortest', mp4,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error(`ffmpeg exited ${c}`)) : res())));
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    const data = await page.evaluate(n => window.grabFrame(n), f);
    const buf = Buffer.from(data.split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`\rframe ${f}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await done;
  console.log(`\nwrote ${mp4}`);
}
await browser.close();
server.close();
