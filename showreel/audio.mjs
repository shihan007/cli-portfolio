// Synthesises the showreel soundtrack: 120 BPM, F minor, scored to the cuts
// in reel.js. No samples — every kick, clap, riser and blip is generated here.
//
//   node showreel/audio.mjs out.wav
import { writeFileSync } from 'node:fs';

const SR = 48000, DUR = 15, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N), SEND = new Float32Array(N);
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));

let seed = 12345;
const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1; };

function put(i, v, pan = 0, send = 0) {
  if (i < 0 || i >= N) return;
  const a = ((pan + 1) * Math.PI) / 4;
  L[i] += v * Math.cos(a) * Math.SQRT2;
  R[i] += v * Math.sin(a) * Math.SQRT2;
  SEND[i] += v * send;
}
function biquad(type, f, q = 0.707) {
  let b0, b1, b2, a1, a2, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const set = freq => {
    const w = (TAU * Math.min(freq, SR * 0.45)) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let n0, n1, n2;
    if (type === 'lp') { n0 = (1 - c) / 2; n1 = 1 - c; n2 = (1 - c) / 2; }
    else if (type === 'hp') { n0 = (1 + c) / 2; n1 = -(1 + c); n2 = (1 + c) / 2; }
    else { n0 = al; n1 = 0; n2 = -al; }
    const a0 = 1 + al; b0 = n0 / a0; b1 = n1 / a0; b2 = n2 / a0; a1 = (-2 * c) / a0; a2 = (1 - al) / a0;
  };
  set(f);
  return { set, run(x) { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; } };
}
const range = (t0, len) => [Math.max(0, Math.floor(t0 * SR)), Math.min(N, Math.floor((t0 + len) * SR))];

// ----------------------------------------------------------- arrangement
const KICKS = [];
for (let t = 2; t < 11.5; t += 0.5) KICKS.push(t);
for (let t = 12; t < 14; t += 0.5) KICKS.push(t);
KICKS.push(14);
function duck(t) {
  let last = -10;
  for (const k of KICKS) if (k <= t) last = k;
  return 1 - 0.78 * Math.exp(-(t - last) * 9);
}
const grooveOn = t => (t >= 2 && t < 11.5) || (t >= 12 && t < 14);
const CHORDS = {
  Fm: { root: 87.31, pad: [174.61, 207.65, 261.63, 311.13] },
  Db: { root: 69.3, pad: [138.59, 174.61, 207.65, 261.63] },
  Ab: { root: 103.83, pad: [207.65, 261.63, 311.13, 392.0] },
  Eb: { root: 77.78, pad: [155.56, 196.0, 233.08, 293.66] },
};
const BARS = [[1, 2, 'Fm'], [2, 4, 'Fm'], [4, 6, 'Db'], [6, 8, 'Ab'], [8, 10, 'Eb'], [10, 12, 'Fm'], [12, 14, 'Db'], [14, 15, 'Fm']];
const chordAt = t => (BARS.find(([a, b]) => t >= a && t < b) || BARS[0])[2];

// ------------------------------------------------------------- instruments
function kick(t0, amp = 1, pitch = 1) {
  const [a, b] = range(t0, 0.55);
  let ph = 0;
  for (let i = a; i < b; i++) {
    const dt = (i - a) / SR;
    ph += (TAU * (44 + 140 * Math.exp(-dt * 30)) * pitch) / SR;
    const env = Math.exp(-dt * 6.5) * Math.min(1, dt / 0.0015);
    const v = Math.tanh(Math.sin(ph) * env * 1.8) * 0.9 + noise() * Math.exp(-dt * 500) * 0.25;
    put(i, v * amp);
  }
}
function clap(t0, amp = 1) {
  const bp = biquad('bp', 1400, 1.1), [a, b] = range(t0, 0.5);
  for (let i = a; i < b; i++) {
    const dt = (i - a) / SR;
    let env = Math.exp(-dt * 16);
    for (const o of [0, 0.011, 0.022]) if (dt >= o && dt < o + 0.01) env += Math.exp(-(dt - o) * 300);
    const body = Math.sin(TAU * 185 * dt) * Math.exp(-dt * 28) * 0.4;
    put(i, (bp.run(noise()) * 2.6 * env + body) * amp, 0.05, 0.35);
  }
}
function hat(t0, amp, open = false, pan = 0.2) {
  const hp = biquad('hp', 7500, 0.9), [a, b] = range(t0, open ? 0.3 : 0.06);
  for (let i = a; i < b; i++) {
    const dt = (i - a) / SR;
    put(i, hp.run(noise()) * Math.exp(-dt * (open ? 14 : 75)) * amp, pan, 0.05);
  }
}
function bassNote(t0, len, f, amp = 1) {
  const lp = biquad('lp', 400, 2.5), [a, b] = range(t0, len + 0.03);
  let p1 = 0, p2 = 0, p3 = 0;
  for (let i = a; i < b; i++) {
    const dt = (i - a) / SR, t = i / SR;
    if ((i & 31) === 0) lp.set(180 + 1500 * Math.exp(-dt * 14));
    p1 = (p1 + f / SR) % 1; p2 = (p2 + (f * 1.006) / SR) % 1; p3 += (TAU * f * 0.5) / SR;
    const saw = (p1 * 2 - 1) + (p2 * 2 - 1);
    const env = Math.min(1, dt / 0.004) * (dt > len ? Math.exp(-(dt - len) * 120) : 1);
    put(i, (Math.tanh(lp.run(saw) * 1.2) * 0.35 + Math.sin(p3) * 0.45) * env * amp * duck(t));
  }
}
function padSegment(t0, t1, freqs, amp, cutoff = 1100) {
  const lp = biquad('lp', cutoff, 0.8), [a, b] = range(t0, t1 - t0 + 0.6);
  const ph = freqs.flatMap(() => [noise() * 0.5 + 0.5, noise() * 0.5 + 0.5, noise() * 0.5 + 0.5]);
  for (let i = a; i < b; i++) {
    const t = i / SR, dt = t - t0;
    if ((i & 63) === 0) lp.set(cutoff * (1 + 0.5 * Math.sin(t * 1.3)) + (t > 11 && t < 12 ? 2500 * prog(t, 11, 12) : 0));
    let s = 0;
    freqs.forEach((f, j) => {
      for (let d = 0; d < 3; d++) {
        const k = j * 3 + d;
        ph[k] = (ph[k] + (f * (1 + (d - 1) * 0.0045)) / SR) % 1;
        s += ph[k] * 2 - 1;
      }
    });
    const env = Math.min(1, dt / 0.25) * (t > t1 ? Math.exp(-(t - t1) * 8) : 1);
    const v = lp.run(s) * 0.05 * env * amp * (grooveOn(t) ? duck(t) : 1);
    const k = i & 1 ? 1 : -1;
    put(i, v, 0.35 * k * Math.sin(t * 0.7), 0.4);
  }
}
function pluck(t0, f, amp, pan) {
  const lp = biquad('lp', 3000, 3), [a, b] = range(t0, 0.35);
  let p = 0;
  for (let i = a; i < b; i++) {
    const dt = (i - a) / SR;
    if ((i & 15) === 0) lp.set(300 + 5000 * Math.exp(-dt * 30));
    p = (p + f / SR) % 1;
    const sq = (p < 0.5 ? 1 : -1) * 0.6 + (p * 2 - 1) * 0.4;
    put(i, lp.run(sq) * Math.exp(-dt * 11) * amp * duck(i / SR), pan, 0.45);
  }
}
function riser(t0, t1, amp = 1) {
  const bp = biquad('bp', 400, 3), [a, b] = range(t0, t1 - t0);
  let ph = 0;
  for (let i = a; i < b; i++) {
    const q = (i - a) / (b - a);
    if ((i & 31) === 0) bp.set(300 * Math.pow(30, q));
    ph += (TAU * (180 * Math.pow(6, q))) / SR;
    const env = q * q * (q > 0.97 ? (1 - q) / 0.03 : 1);
    put(i, (bp.run(noise()) * 2.2 + Math.sin(ph) * 0.12) * env * amp, Math.sin(q * 20) * 0.3, 0.3);
  }
}
function whoosh(tc, len, amp = 1, reverse = false) {
  const t0 = tc - len / 2, bp = biquad('bp', 800, 1.4), [a, b] = range(t0, len);
  for (let i = a; i < b; i++) {
    const q = (i - a) / (b - a);
    const shape = reverse ? Math.pow(q, 3) * (q > 0.96 ? (1 - q) / 0.04 : 1) : Math.sin(Math.PI * q) ** 2;
    if ((i & 31) === 0) bp.set(reverse ? 300 * Math.pow(25, q) : 500 + 4500 * Math.sin(Math.PI * q));
    put(i, bp.run(noise()) * 1.6 * shape * amp, -0.8 + 1.6 * q, 0.25);
  }
}
function impact(t0, amp = 1) {
  const lp = biquad('lp', 900, 0.7), [a, b] = range(t0, 2.2);
  let ph = 0;
  for (let i = a; i < b; i++) {
    const dt = (i - a) / SR;
    ph += (TAU * (26 + 50 * Math.exp(-dt * 3))) / SR;
    const sub = Math.sin(ph) * Math.exp(-dt * 2.0) * Math.min(1, dt / 0.002);
    const rumble = lp.run(noise()) * Math.exp(-dt * 4) * 1.6;
    put(i, (Math.tanh(sub * 1.6) * 0.85 + rumble * 0.6) * amp, 0, 0.5);
  }
  kick(t0, amp * 0.9);
  crash(t0, amp * 0.5);
}
function crash(t0, amp) {
  const hp = biquad('hp', 4500, 0.7), [a, b] = range(t0, 2.0);
  for (let i = a; i < b; i++) {
    const dt = (i - a) / SR;
    put(i, hp.run(noise()) * Math.exp(-dt * 3.2) * amp * 0.6, (i & 1 ? 0.4 : -0.4), 0.4);
  }
}
function blip(t0, f, amp = 0.3, len = 0.12, pan = 0) {
  const [a, b] = range(t0, len + 0.05);
  for (let i = a; i < b; i++) {
    const dt = (i - a) / SR;
    const env = Math.min(1, dt / 0.002) * Math.exp(-dt * (6 / len));
    const v = Math.sin(TAU * f * dt + 0.6 * Math.sin(TAU * f * 2 * dt)) * env;
    put(i, v * amp, pan, 0.6);
  }
}

// ------------------------------------------------------------------ score
// 0.0 - 2.0  impact
whoosh(0.28, 0.5, 0.35);
kick(0.5, 0.75, 1.6); blip(0.5, 2400, 0.12, 0.04);
riser(0.5, 1.0, 0.9);
impact(1.0, 1.2);
padSegment(1.0, 2.0, CHORDS.Fm.pad, 1.1, 700);
whoosh(1.78, 0.5, 0.8);

// 2.0 - 12.0 groove
crash(2.0, 0.35);
for (const k of KICKS) if (k !== 12 && k !== 14) kick(k, 1);
for (let t = 2; t < 14; t += 0.125) {
  if (!grooveOn(t)) continue;
  const s = Math.round((t % 0.5) / 0.125);
  hat(t, [0.1, 0.04, 0.15, 0.045][s], s === 2 && Math.round(t * 8) % 8 === 6, s % 2 ? -0.3 : 0.3);
}
for (let t = 2.5; t < 14; t += 1) if (grooveOn(t)) clap(t, 0.8);
for (let b = 2; b < 14; b += 0.5) {
  if (!grooveOn(b)) continue;
  const c = CHORDS[chordAt(b)];
  bassNote(b + 0.25, 0.2, c.root, 1);
  if (Math.round(b * 2) % 4 === 3) bassNote(b + 0.375, 0.1, c.root * 2, 0.6);
}
for (const [a, b, name] of BARS) if (a >= 2) padSegment(a, b, CHORDS[name].pad, a >= 14 ? 1.4 : 1);
// arpeggio from the FORM section onward
for (let t = 4; t < 14; t += 0.125) {
  if (t >= 11.5 && t < 12) continue;
  const tones = CHORDS[chordAt(t)].pad;
  const step = Math.round(t * 8);
  const f = tones[[0, 2, 1, 3, 2, 1, 3, 2][step % 8]] * 2;
  pluck(t, f, 0.11 + (step % 4 === 2 ? 0.04 : 0), step % 2 ? 0.5 : -0.5);
}
// transitions
whoosh(3.8, 0.5, 0.9);
whoosh(5.88, 0.36, 0.9, true);
whoosh(7.75, 0.5, 0.7);
whoosh(9.83, 0.42, 0.8);
// morph blips
[[4.5, 1046.5], [5.0, 1318.5], [5.5, 1568]].forEach(([t, f]) => blip(t, f, 0.18, 0.18, 0.3));
[[6.5, 784], [7.0, 1046.5], [7.5, 1568]].forEach(([t, f]) => blip(t, f, 0.16, 0.25, -0.3));
for (let k = 0; k < 8; k++) blip(9.0 + k * 0.03, 1800 + k * 220, 0.05, 0.03, k % 2 ? 0.6 : -0.6);
// build into the drop
riser(11.0, 12.0, 1.1);
for (let t = 11.0; t < 12.0; t += t < 11.5 ? 0.125 : 0.0625) clap(t, 0.25 + 0.6 * prog(t, 11, 12));

// 12.0 - 15.0 climax + resolve
impact(12.0, 1.35);
for (let j = 0; j < 15; j++) if (j !== 6) blip(13.05 + j * 0.04, 2200 + ((j * 7919) % 9) * 180, 0.045, 0.025, j % 2 ? 0.5 : -0.5);
impact(14.0, 0.8);
blip(14.04, 1046.5, 0.12, 0.6); blip(14.04, 1568, 0.08, 0.6);
whoosh(14.68, 0.4, 0.9, true);
kick(14.92, 0.6, 1.8);
blip(14.92, 880, 0.22, 0.08); blip(14.93, 1760, 0.12, 0.06);

// ------------------------------------------------------------------ reverb
function reverb(input, offset) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map(d => ({ buf: new Float32Array(Math.round((d + offset) * 1.09)), i: 0, f: 0 }));
  const aps = [556, 441, 341].map(d => ({ buf: new Float32Array(Math.round((d + offset) * 1.09)), i: 0 }));
  const outp = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const x = input[n] * 0.12;
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.f = y * 0.75 + c.f * 0.25;
      c.buf[c.i] = x + c.f * 0.86;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    for (const a of aps) {
      const b = a.buf[a.i];
      a.buf[a.i] = s + b * 0.5;
      s = b - s * 0.5;
      a.i = (a.i + 1) % a.buf.length;
    }
    outp[n] = s;
  }
  return outp;
}
const wl = reverb(SEND, 0), wr = reverb(SEND, 23);

// ------------------------------------------------------------------ master
const mixL = new Float32Array(N), mixR = new Float32Array(N);
// gain stage so only transient peaks reach the soft clipper
const sorted = Float32Array.from(L, (v, i) => Math.abs(v + wl[i] * 0.6)).sort();
const pre = 1.15 / sorted[Math.floor(N * 0.998)];
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fadeOut = t > DUR - 0.04 ? (DUR - t) / 0.04 : 1;
  mixL[i] = Math.tanh((L[i] + wl[i] * 0.6) * pre) * fadeOut;
  mixR[i] = Math.tanh((R[i] + wr[i] * 0.6) * pre) * fadeOut;
  peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i]));
}
const gain = 0.89 / peak;
const pcm = Buffer.alloc(44 + N * 4);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write('WAVE', 8);
pcm.write('fmt ', 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34);
pcm.write('data', 36); pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.round(clamp(mixL[i] * gain, -1, 1) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(clamp(mixR[i] * gain, -1, 1) * 32767), 46 + i * 4);
}
const outFile = process.argv[2] || 'showreel.wav';
writeFileSync(outFile, pcm);
console.log(`wrote ${outFile} (peak ${peak.toFixed(2)} -> normalised)`);
