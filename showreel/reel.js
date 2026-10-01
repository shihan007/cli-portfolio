// Showreel 2026 — a 15 second motion piece rendered entirely in code.
// Every frame is a pure function of time, so the same frame always renders
// identically: that is what lets render.mjs step through it frame by frame.
'use strict';

const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
const FPS = 60, DUR = 15, TAU = Math.PI * 2;
const params = new URLSearchParams(location.search);
const SUB = Number(params.get('sub')) || 4; // motion blur samples per frame
const SHUTTER = 0.5;                         // 180 degree shutter

// ---------------------------------------------------------------- utilities
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuart: t => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function ihash(n) {
  n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return n >>> 0;
}

// Improved Perlin noise.
const perm = new Uint8Array(512);
(() => {
  const p = [...Array(256).keys()], r = rng(7);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
function grad(h, x, y, z) {
  h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}
function noise3(x, y, z) {
  const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
  const X = fx & 255, Y = fy & 255, Z = fz & 255;
  x -= fx; y -= fy; z -= fz;
  const u = fade(x), v = fade(y), w = fade(z);
  const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
  const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
  return lerp(
    lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
         lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
    lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
         lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
}

// ------------------------------------------------------------------- colour
const P = {
  ink: [10, 10, 15], night: [7, 7, 12], paper: [243, 239, 231],
  hot: [255, 74, 28], violet: [123, 92, 255], cyan: [56, 242, 255], lime: [212, 255, 58],
  dim: [38, 38, 50],
};
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ------------------------------------------------------------------ canvases
function mk(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const out = document.getElementById('c'), octx = out.getContext('2d');
const sceneC = mk(), sctx = sceneC.getContext('2d');
const accC = mk(), actx = accC.getContext('2d');
const bufC = mk(), bctx = bufC.getContext('2d');
const shineC = mk(), shctx = shineC.getContext('2d');
const fx = [mk(), mk(), mk()].map(c => ({ c, g: c.getContext('2d') }));

function bgFill(g, col) { g.fillStyle = rgb(col); g.fillRect(-200, -200, W + 400, H + 400); }

// ------------------------------------------------------- impacts / camera
// [time, strength]. Drives camera shake and chromatic aberration.
const HITS = [[0.5, 5], [1.0, 28], [2.0, 9], [4.0, 7], [6.0, 9], [8.0, 7], [10.0, 7], [12.0, 34], [13.0, 6], [14.0, 12], [14.95, 7]];
const FLASHES = [[1.0, 0.85], [12.0, 1.0], [14.0, 0.25]];
function env(list, t, k) {
  let s = 0;
  for (const [h, a] of list) if (t >= h) s += a * Math.exp(-(t - h) * k);
  return s;
}
// Groove pulse on every beat while the beat is running.
function beatPulse(t, k = 8) {
  if (t < 2 || t >= 14) return 0;
  const b = Math.floor(t / 0.5) * 0.5;
  return Math.exp(-(t - b) * k);
}

// ---------------------------------------------------------------- text kit
function font(size, fam, weight = '') { return `${weight} ${size}px ${fam}`.trim(); }
const GLYPHS = '#%&@*+=/<>[]{}01X$?';
function scramble(str, t, t0, per, seed = 0) {
  let s = '';
  for (let j = 0; j < str.length; j++) {
    const ch = str[j];
    if (ch === ' ' || t >= t0 + j * per) { s += ch; continue; }
    s += GLYPHS[ihash(j * 131 + Math.floor(t * 30) * 7 + seed) % GLYPHS.length];
  }
  return s;
}

// ============================================================== 01 IMPACT
const FLOOR_Y = CY + 110, BALL_R = 30;
const S1P = (() => {
  const r = rng(11), a = [];
  for (let i = 0; i < 560; i++) {
    const roll = r();
    a.push({
      a: r() * TAU, sp: 260 + Math.pow(r(), 2.2) * 2600, k: 2.4 + r() * 2.2,
      spin: (r() - 0.5) * 1.4, size: 1.2 + r() * 3.6, life: 0.45 + r() * 0.8,
      col: roll < 0.22 ? P.hot : roll < 0.32 ? P.violet : roll < 0.38 ? P.cyan : P.paper,
    });
  }
  return a;
})();

function s1(g, t) {
  bgFill(g, P.ink);

  // faint dot grid that ripples outward from the explosion
  g.fillStyle = rgb(P.paper, 0.09);
  for (let y = 60; y < H; y += 60) {
    for (let x = 60; x < W; x += 60) {
      let s = 1.6;
      if (t > 1.0) {
        const d = Math.hypot(x - CX, y - FLOOR_Y + BALL_R);
        const front = (t - 1.0) * 1500;
        s += 3.5 * Math.exp(-Math.pow((d - front) / 70, 2));
      }
      g.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }

  // floor line drawn out by the first contact
  if (t >= 0.5) {
    const p = E.outExpo(prog(t, 0.5, 1.1)), f = 1 - prog(t, 1.0, 1.25);
    if (f > 0) {
      g.strokeStyle = rgb(P.paper, 0.55 * f); g.lineWidth = 2;
      g.beginPath(); g.moveTo(CX - 860 * p, FLOOR_Y); g.lineTo(CX + 860 * p, FLOOR_Y); g.stroke();
      g.fillStyle = rgb(P.paper, 0.55 * f);
      for (let k = -8; k <= 8; k++) {
        const x = CX + k * 100 * p;
        g.fillRect(x - 1, FLOOR_Y - (k % 4 === 0 ? 14 : 7), 2, k % 4 === 0 ? 28 : 14);
      }
      // contact ripple
      const q = prog(t, 0.5, 0.95);
      g.strokeStyle = rgb(P.hot, (1 - q) * 0.9); g.lineWidth = 3 * (1 - q) + 0.5;
      g.beginPath(); g.ellipse(CX, FLOOR_Y, 40 + 260 * E.outExpo(q), (40 + 260 * E.outExpo(q)) * 0.16, 0, 0, TAU); g.stroke();
    }
  }

  if (t < 1.0) {
    // bouncing ball with squash and stretch
    let y, stretch;
    if (t < 0.5) {
      const q = t / 0.5;
      y = lerp(-90, FLOOR_Y - BALL_R, q * q);
      stretch = 1 + 0.55 * q * q;
    } else {
      const q = (t - 0.5) / 0.5;
      y = FLOOR_Y - BALL_R - 320 * 4 * q * (1 - q);
      const sp = Math.abs(1 - 2 * q);
      stretch = 1 + 0.4 * sp * sp;
    }
    const squash = t >= 0.5 ? 0.52 * Math.exp(-Math.pow((t - 0.5) / 0.045, 2)) : 0;
    const sy = stretch * (1 - squash), sx = 1 / sy;
    const cy = Math.min(y, FLOOR_Y - BALL_R * sy);
    const glow = g.createRadialGradient(CX, cy, 0, CX, cy, 160);
    glow.addColorStop(0, rgb(P.hot, 0.35)); glow.addColorStop(1, rgb(P.hot, 0));
    g.fillStyle = glow; g.fillRect(CX - 160, cy - 160, 320, 320);
    g.fillStyle = rgb(P.paper);
    g.beginPath(); g.ellipse(CX, cy, BALL_R * sx, BALL_R * sy, 0, 0, TAU); g.fill();
    // contact shadow
    const h = clamp((FLOOR_Y - BALL_R - cy) / 320);
    g.fillStyle = rgb(P.paper, 0.18 * (1 - h));
    g.beginPath(); g.ellipse(CX, FLOOR_Y + 6, BALL_R * (1.6 - h), 5 * (1 - h * 0.7), 0, 0, TAU); g.fill();
    return;
  }

  // explosion
  const dt = t - 1.0, ox = CX, oy = FLOOR_Y - BALL_R;
  g.lineCap = 'round';
  for (const p of S1P) {
    const alpha = 1 - prog(dt, p.life * 0.45, p.life);
    if (alpha <= 0) continue;
    const e = Math.exp(-p.k * dt);
    const d = (p.sp / p.k) * (1 - e);
    const ang = p.a + p.spin * (1 - Math.exp(-2 * dt));
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const x = ox + ca * d, y = oy + sa * d * 0.82 + 140 * dt * dt;
    const len = Math.min(90, p.sp * e * 0.03) + p.size;
    g.strokeStyle = rgb(p.col, alpha); g.lineWidth = p.size;
    g.beginPath(); g.moveTo(x - ca * len, y - sa * len * 0.82); g.lineTo(x, y); g.stroke();
  }
  g.lineCap = 'butt';
  [[0, P.paper], [0.07, P.hot], [0.14, P.violet]].forEach(([delay, col], j) => {
    const p = prog(dt - delay, 0, 1.0);
    if (p <= 0 || p >= 1) return;
    const rad = 1150 * E.outExpo(p);
    g.strokeStyle = rgb(col, 1 - p); g.lineWidth = lerp(22 - j * 5, 0.5, E.outCubic(p));
    g.beginPath(); g.arc(ox, oy, rad, 0, TAU); g.stroke();
  });
  const core = prog(dt, 0, 0.18);
  if (core < 1) {
    g.fillStyle = rgb(P.paper, 1 - core);
    g.beginPath(); g.arc(ox, oy, 30 + 160 * E.outExpo(core), 0, TAU); g.fill();
  }
  // credit line foreshadowing the end card
  if (t > 1.12) {
    g.font = font(22, 'JetBrains Mono', 600); g.letterSpacing = '10px';
    g.textAlign = 'center'; g.fillStyle = rgb(P.paper, 0.85);
    g.fillText(scramble('CLAUDE  /  MOTION DESIGN  /  REEL 2026', t, 1.12, 0.008, 3), CX, FLOOR_Y + 120);
    g.letterSpacing = '0px'; g.textAlign = 'left';
  }
}

// ======================================================== 02 KINETIC TYPE
const S2 = {
  lines: [
    { txt: 'MOTION', t0: 2.0, style: 'fill' },
    { txt: 'IS MY', t0: 2.5, style: 'stroke' },
    { txt: 'LANGUAGE', t0: 3.0, style: 'bar' },
  ],
  FS: 270, LH: 248, capH: 0, widths: [],
};
function initS2() {
  bctx.font = font(S2.FS, 'Anton');
  S2.capH = bctx.measureText('M').actualBoundingBoxAscent;
  S2.widths = S2.lines.map(L => [...L.txt].map(ch => bctx.measureText(ch).width));
}
function s2(g, t) {
  bgFill(g, P.hot);
  g.save();
  const sc = 1 + 0.05 * E.outCubic(prog(t, 2, 4)) + 0.012 * beatPulse(t);
  g.translate(CX, CY); g.scale(sc, sc); g.translate(-CX, -CY);
  const { FS, LH, capH } = S2;
  const off = -(LH / 2) * (E.outExpo(prog(t, 2.5, 2.85)) + E.outExpo(prog(t, 3.0, 3.35)));
  g.font = font(FS, 'Anton'); g.textBaseline = 'alphabetic';
  const track = 6;
  S2.lines.forEach((L, i) => {
    if (t < L.t0) return;
    const ws = S2.widths[i];
    const total = ws.reduce((a, b) => a + b, 0) + track * (ws.length - 1);
    const midY = CY + i * LH + off, base = midY + capH / 2;
    let x = CX - total / 2;
    if (L.style === 'bar') {
      const bp = E.inOutExpo(prog(t, 3.0, 3.32));
      g.fillStyle = rgb(P.ink);
      g.fillRect(CX - total / 2 - 34, midY - capH / 2 - 26, (total + 68) * bp, capH + 52);
    }
    g.save();
    g.beginPath(); g.rect(0, midY - capH / 2 - 12, W, capH + 24); g.clip();
    [...L.txt].forEach((ch, j) => {
      const t0 = L.t0 + (L.style === 'bar' ? 0.09 : 0) + j * 0.028;
      const p = E.outExpo(prog(t, t0, t0 + 0.55));
      const dy = (1 - p) * (capH + 40);
      g.save();
      g.translate(x + ws[j] / 2, base + dy);
      g.rotate((1 - p) * 0.25);
      if (L.style === 'stroke') {
        g.strokeStyle = rgb(P.ink); g.lineWidth = 4; g.strokeText(ch, -ws[j] / 2, 0);
      } else {
        g.fillStyle = rgb(L.style === 'bar' ? P.hot : P.ink); g.fillText(ch, -ws[j] / 2, 0);
      }
      g.restore();
      x += ws[j] + track;
    });
    g.restore();
    // margin annotation per line
    const ap = E.outExpo(prog(t, L.t0 + 0.1, L.t0 + 0.5));
    g.font = font(18, 'JetBrains Mono', 700); g.fillStyle = rgb(P.ink, ap);
    g.fillText(`(0${i + 1})`, CX - total / 2 - 110 + (1 - ap) * -30, midY - capH / 2 + 18);
    g.font = font(FS, 'Anton');
  });
  g.restore();

  // marquee band
  const bp = E.outExpo(prog(t, 2.1, 2.5));
  const by = H - 150 + (1 - bp) * 120;
  g.fillStyle = rgb(P.ink); g.fillRect(-200, by, W + 400, 64);
  g.save(); g.beginPath(); g.rect(-200, by, W + 400, 64); g.clip();
  g.font = font(40, 'Anton'); g.fillStyle = rgb(P.hot); g.letterSpacing = '4px';
  const unit = 'MOTION / TYPE / TIMING / RHYTHM / FORM / ', uw = g.measureText(unit).width;
  let mx = -((t * 520) % uw);
  while (mx < W) { g.fillText(unit, mx, by + 49); mx += uw; }
  g.letterSpacing = '0px';
  g.restore();

  // vertical caption
  g.save(); g.translate(W - 70, CY); g.rotate(Math.PI / 2);
  g.font = font(16, 'JetBrains Mono', 700); g.fillStyle = rgb(P.ink, 0.9); g.textAlign = 'center';
  g.letterSpacing = '6px'; g.fillText('KINETIC TYPOGRAPHY — 2.000s', 0, 0); g.letterSpacing = '0px';
  g.restore(); g.textAlign = 'left';
}

// =============================================================== 03 FORM
const NS = 360;
function unitShape(kind) {
  const pts = [];
  for (let i = 0; i < NS; i++) {
    const u = i / NS;
    if (kind === 'circle') {
      const a = -Math.PI / 2 + TAU * u; pts.push([Math.cos(a), Math.sin(a)]);
    } else if (kind === 'star') {
      const k = 10, f = u * k, s = Math.floor(f), q = f - s;
      const v = j => { const a = -Math.PI / 2 + (TAU * j) / k, r = j % 2 ? 0.5 : 1.22; return [Math.cos(a) * r, Math.sin(a) * r]; };
      const a = v(s), b = v(s + 1); pts.push([lerp(a[0], b[0], q), lerp(a[1], b[1], q)]);
    } else {
      const k = kind === 'square' ? 4 : 3, sc = kind === 'square' ? 1.12 : 1.28;
      const off = kind === 'square' ? -Math.PI / 4 * 3 : -Math.PI / 2;
      const f = u * k, s = Math.floor(f), q = f - s;
      const v = j => { const a = off + (TAU * j) / k; return [Math.cos(a) * sc, Math.sin(a) * sc]; };
      const a = v(s), b = v(s + 1); pts.push([lerp(a[0], b[0], q), lerp(a[1], b[1], q)]);
    }
  }
  return pts;
}
const SHAPES = ['circle', 'square', 'triangle', 'star'].map(unitShape);
const MORPH_PTS = SHAPES[0].map(p => [p[0], p[1]]);
function s3State(t) {
  const lt = t - 4;
  for (let i = 0; i < NS; i++) { MORPH_PTS[i][0] = SHAPES[0][i][0]; MORPH_PTS[i][1] = SHAPES[0][i][1]; }
  let rot = lt * 0.45, sc = E.outBack(prog(t, 3.65, 4.1));
  for (let k = 1; k <= 3; k++) {
    const b = k * 0.5, m = E.outBack(prog(lt, b, b + 0.36));
    if (m !== 0) for (let i = 0; i < NS; i++) {
      MORPH_PTS[i][0] = lerp(MORPH_PTS[i][0], SHAPES[k][i][0], m);
      MORPH_PTS[i][1] = lerp(MORPH_PTS[i][1], SHAPES[k][i][1], m);
    }
    rot += (Math.PI / 2) * E.inOutCubic(prog(lt, b, b + 0.42));
    if (lt >= b) sc *= 1 + 0.14 * Math.exp(-(lt - b) * 9);
  }
  return { rot, sc };
}
function shapePath(g, R, rot, cx = CX, cy = CY) {
  const c = Math.cos(rot), s = Math.sin(rot);
  g.beginPath();
  for (let i = 0; i < NS; i++) {
    const [x, y] = MORPH_PTS[i];
    const px = cx + (x * c - y * s) * R, py = cy + (x * s + y * c) * R;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
}
const ORBITS = [
  { r: 380, tilt: 0.3, n: 24, w: 1.3, col: P.hot },
  { r: 480, tilt: -0.55, n: 36, w: -0.85, col: P.paper },
  { r: 580, tilt: 1.15, n: 48, w: 0.55, col: P.cyan },
];
function orbitDots(g, t, front) {
  const lt = t - 4;
  ORBITS.forEach((o, j) => {
    const sc = E.outExpo(prog(t, 3.8 + j * 0.08, 4.5 + j * 0.08));
    if (sc <= 0) return;
    const ct = Math.cos(o.tilt), st = Math.sin(o.tilt);
    for (let i = 0; i < o.n; i++) {
      const a = (TAU * i) / o.n + lt * o.w + beatPulse(t, 5) * 0.08;
      const z = Math.sin(a);
      if ((z >= 0) !== front) continue;
      const ex = Math.cos(a) * o.r * sc, ey = z * o.r * 0.32 * sc;
      const x = CX + ex * ct - ey * st, y = CY + ex * st + ey * ct;
      const s = 2.2 + 2.6 * (z + 1) / 2 + (i % 6 === 0 ? 2.5 : 0);
      g.fillStyle = rgb(o.col, 0.35 + 0.65 * (z + 1) / 2);
      g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
  });
}
function s3(g, t, maskScale = 1) {
  bgFill(g, P.ink);
  const lt = t - 4;
  // construction lines
  g.strokeStyle = rgb(P.paper, 0.06); g.lineWidth = 1;
  for (let r = 120; r < 1100; r += 120) { g.beginPath(); g.arc(CX, CY, r, 0, TAU); g.stroke(); }
  g.beginPath(); g.moveTo(0, CY); g.lineTo(W, CY); g.moveTo(CX, 0); g.lineTo(CX, H); g.stroke();
  g.save(); g.translate(CX, CY); g.rotate(lt * 0.3);
  g.setLineDash([3, 16]); g.strokeStyle = rgb(P.paper, 0.35); g.lineWidth = 2;
  g.beginPath(); g.arc(0, 0, 690, 0, TAU); g.stroke(); g.setLineDash([]);
  for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.fillStyle = rgb(P.hot); g.fillRect(686, -6, 8, 12); }
  g.restore();

  // orbit ellipses
  ORBITS.forEach((o, j) => {
    const sc = E.outExpo(prog(t, 3.8 + j * 0.08, 4.5 + j * 0.08));
    g.save(); g.translate(CX, CY); g.rotate(o.tilt);
    g.strokeStyle = rgb(P.paper, 0.1); g.lineWidth = 1;
    g.beginPath(); g.ellipse(0, 0, Math.max(0.1, o.r * sc), Math.max(0.1, o.r * 0.32 * sc), 0, 0, TAU); g.stroke();
    g.restore();
  });
  orbitDots(g, t, false);

  // echo trail
  const R = 240;
  for (let k = 11; k >= 1; k--) {
    const st = s3State(t - k * 0.032);
    const col = k < 6 ? mix(P.hot, P.violet, (k - 1) / 5) : mix(P.violet, P.cyan, (k - 6) / 5);
    shapePath(g, R * st.sc * (1 + k * 0.055) * maskScale, st.rot);
    g.strokeStyle = rgb(col, 0.9 * (1 - k / 12)); g.lineWidth = 3; g.stroke();
  }
  const st = s3State(t);
  shapePath(g, R * st.sc * maskScale, st.rot);
  g.fillStyle = rgb(P.ink); g.fill();
  g.strokeStyle = rgb(P.paper); g.lineWidth = 6; g.lineJoin = 'round'; g.stroke();
  g.fillStyle = rgb(P.hot);
  g.beginPath(); g.arc(CX, CY, (9 + 10 * beatPulse(t, 7)) * st.sc, 0, TAU); g.fill();
  orbitDots(g, t, true);

  // caption list highlighting the active shape
  const names = ['CIRCLE', 'SQUARE', 'TRIANGLE', 'STAR'];
  const active = clamp(Math.floor(lt / 0.5), 0, 3);
  g.font = font(18, 'JetBrains Mono', 700); g.letterSpacing = '4px';
  names.forEach((n, i) => {
    g.fillStyle = i === active ? rgb(P.hot) : rgb(P.paper, 0.3);
    g.fillText((i === active ? '> ' : '  ') + n, 70, CY - 40 + i * 30);
  });
  g.fillStyle = rgb(P.paper, 0.5);
  g.fillText(`MORPH ${(clamp(lt / 2) * 100).toFixed(0).padStart(3, '0')}%`, 70, CY + 110);
  g.letterSpacing = '0px';
  return st;
}

// ============================================================== 04 DEPTH
const COLS = 48, ROWS = 27, NP = COLS * ROWS, CELL = 40;
const D3 = { sph: [], cube: [], tor: [], plane: [], order: new Int32Array(NP), z: new Float32Array(NP), sx: new Float32Array(NP), sy: new Float32Array(NP), m: new Float32Array(NP) };
(() => {
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NP; i++) {
    const y = 1 - (i / (NP - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
    D3.sph.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    const face = i % 6, j = Math.floor(i / 6);
    const u = ((j % 15) / 14) * 2 - 1, v = (Math.floor(j / 15) / 14) * 2 - 1, h = 0.64;
    const f = [[h, u * h, v * h], [-h, u * h, v * h], [u * h, h, v * h], [u * h, -h, v * h], [u * h, v * h, h], [u * h, v * h, -h]][face];
    D3.cube.push(f);
    const tu = (TAU * (i % 54)) / 54, tv = (TAU * Math.floor(i / 54)) / 24;
    D3.tor.push([(1 + 0.42 * Math.cos(tv)) * Math.cos(tu) * 0.78, 0.42 * Math.sin(tv) * 0.78, (1 + 0.42 * Math.cos(tv)) * Math.sin(tu) * 0.78]);
    const col = i % COLS, row = Math.floor(i / COLS);
    D3.plane.push([(col - 23.5) * CELL, (row - 13) * CELL, 0]);
    D3.order[i] = i;
  }
})();
const FOCAL = 1500;
function rot3(x, y, z, ry, rx) {
  const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  return [x1, y * cx - z1 * sx, y * sx + z1 * cx];
}
function s4Rot(lt) {
  let ry = lt * 0.5 + 0.6, rx = 0.5 + 0.12 * Math.sin(lt * 1.4);
  for (const b of [0.5, 1.0]) ry += (Math.PI / 4) * E.inOutExpo(prog(lt, b, b + 0.4));
  return [ry, rx];
}
function s4(g, t) {
  bgFill(g, P.night);
  const lt = t - 6;
  const glow = g.createRadialGradient(CX, CY, 0, CX, CY, 760);
  glow.addColorStop(0, rgb(P.violet, 0.2)); glow.addColorStop(1, rgb(P.violet, 0));
  g.fillStyle = glow; g.fillRect(0, 0, W, H);

  const [ry, rx] = s4Rot(lt);
  const R = 360 * lerp(0.55, 1, E.outExpo(prog(t, 5.75, 6.3))) * (1 + 0.04 * beatPulse(t));
  const planeK = E.outCubic(prog(lt, 1.4, 1.98));

  // orbit ring around the form
  if (planeK < 1) {
    g.strokeStyle = rgb(P.paper, 0.18 * (1 - planeK)); g.lineWidth = 1.5; g.beginPath();
    for (let k = 0; k <= 120; k++) {
      const a = (TAU * k) / 120;
      const [x, y, z] = rot3(Math.cos(a) * R * 1.7, 0, Math.sin(a) * R * 1.7, ry * 0.5, rx + 0.5);
      const s = FOCAL / (FOCAL + z);
      k ? g.lineTo(CX + x * s, CY + y * s) : g.moveTo(CX + x * s, CY + y * s);
    }
    g.stroke();
  }

  for (let i = 0; i < NP; i++) {
    const delay = (i / NP) * 0.07;
    const m1 = E.inOutExpo(prog(lt, 0.5 + delay, 0.8 + delay));
    const m2 = E.inOutExpo(prog(lt, 1.0 + delay, 1.3 + delay));
    const a = D3.sph[i], b = D3.cube[i], c = D3.tor[i];
    const px = lerp(lerp(a[0], b[0], m1), c[0], m2) * R;
    const py = lerp(lerp(a[1], b[1], m1), c[1], m2) * R;
    const pz = lerp(lerp(a[2], b[2], m1), c[2], m2) * R;
    const [x, y, z] = rot3(px, py, pz, ry, rx);
    const pl = D3.plane[i];
    const d = Math.hypot(pl[0], pl[1]) / 1100;
    const m3 = E.inOutExpo(prog(lt, 1.42 + d * 0.1, 1.88 + d * 0.1));
    const fx = lerp(x, pl[0], m3), fy = lerp(y, pl[1], m3), fz = lerp(z, 0, m3);
    const s = FOCAL / (FOCAL + fz);
    D3.sx[i] = CX + fx * s; D3.sy[i] = CY + fy * s; D3.z[i] = fz; D3.m[i] = m3;
  }
  const ord = Array.from(D3.order).sort((p, q) => D3.z[q] - D3.z[p]);
  g.globalCompositeOperation = 'lighter';
  for (const i of ord) {
    const m3 = D3.m[i], z = D3.z[i];
    const tz = clamp((z / R + 1) / 2);
    const s = FOCAL / (FOCAL + z);
    const col = mix(mix(P.cyan, P.violet, tz), P.paper, m3);
    const a = lerp(lerp(1, 0.35, tz), 0.9, m3);
    const size = lerp(3.4 * s, 2, m3);
    g.fillStyle = rgb(col, a);
    g.beginPath(); g.arc(D3.sx[i], D3.sy[i], size, 0, TAU); g.fill();
  }
  g.globalCompositeOperation = 'source-over';

  // axis gizmo
  const ga = 1 - planeK;
  if (ga > 0) {
    const gx = 1745, gy = 880;
    [[1, 0, 0, P.hot, 'X'], [0, -1, 0, P.lime, 'Y'], [0, 0, 1, P.cyan, 'Z']].forEach(([x, y, z, col, l]) => {
      const [a, b] = rot3(x, y, z, ry, rx);
      g.strokeStyle = rgb(col, ga); g.lineWidth = 3;
      g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + a * 60, gy + b * 60); g.stroke();
      g.font = font(14, 'JetBrains Mono', 700); g.fillStyle = rgb(col, ga);
      g.fillText(l, gx + a * 74 - 4, gy + b * 74 + 5);
    });
    const names = ['SPHERE', 'CUBE', 'TORUS', 'PLANE'];
    g.font = font(18, 'JetBrains Mono', 700); g.letterSpacing = '4px';
    g.fillStyle = rgb(P.paper, 0.6 * ga);
    g.fillText(`MESH: ${names[clamp(Math.floor(lt / 0.5), 0, 3)]}  /  ${NP} VERTICES`, 70, H - 130);
    g.letterSpacing = '0px';
  }
}

// ============================================================= 05 RHYTHM
const TIMING_MASK = new Uint8Array(NP);
const CELL_RND = Float32Array.from({ length: NP }, (_, i) => (ihash(i * 7 + 3) % 1000) / 1000);
function initS5() {
  const c = mk(), g = c.getContext('2d');
  let size = 400;
  g.font = font(size, 'Archivo Black');
  size *= 1640 / g.measureText('TIMING').width;
  g.font = font(size, 'Archivo Black');
  const m = g.measureText('TIMING');
  g.fillStyle = '#fff'; g.textAlign = 'center';
  g.fillText('TIMING', CX, CY + m.actualBoundingBoxAscent / 2);
  const data = g.getImageData(0, 0, W, H).data;
  for (let i = 0; i < NP; i++) {
    const x = 20 + (i % COLS) * CELL, y = 20 + Math.floor(i / COLS) * CELL;
    TIMING_MASK[i] = data[(y * W + x) * 4 + 3] > 128 ? 1 : 0;
  }
}
function quad(g, x, y, s, rot) {
  const c = Math.cos(rot) * s / 2, sn = Math.sin(rot) * s / 2;
  g.beginPath();
  g.moveTo(x - c + sn, y - sn - c); g.lineTo(x + c + sn, y + sn - c);
  g.lineTo(x + c - sn, y + sn + c); g.lineTo(x - c - sn, y - sn + c);
  g.closePath(); g.fill();
}
function s5(g, t) {
  bgFill(g, P.ink);
  const lt = t - 8;
  const maxD = Math.hypot(CX, CY);
  for (let i = 0; i < NP; i++) {
    const col = i % COLS, row = Math.floor(i / COLS);
    const x = 20 + col * CELL, y = 20 + row * CELL;
    const d = Math.hypot(x - CX, y - CY) / maxD;
    const checker = (col + row) % 2 === 0;
    // A: radial bloom from the centre
    const a = E.inOutCubic(prog(lt, d * 0.42, d * 0.42 + 0.3));
    let size = lerp(4, 30, a), rot = 0, c = mix(P.paper, P.hot, a);
    // B: diagonal sweep that rotates the tiles
    const d2 = (col + row) / (COLS + ROWS - 2);
    const b = E.inOutCubic(prog(lt, 0.5 + d2 * 0.38, 0.8 + d2 * 0.38));
    rot = b * Math.PI / 2;
    size = lerp(size, checker ? 30 : 12, b);
    c = mix(c, checker ? P.hot : P.violet, b);
    // C: the word assembles out of the grid
    const cst = 1.0 + CELL_RND[i] * 0.18 + (col / COLS) * 0.1;
    const cc = E.outBack(prog(lt, cst, cst + 0.3)), cl = clamp(cc);
    if (TIMING_MASK[i]) {
      size = lerp(size, 38, cc); c = mix(c, (col + row) % 7 === 0 ? P.lime : P.paper, cl); rot = lerp(rot, Math.PI, cl);
    } else {
      size = lerp(size, 5, cl); c = mix(c, P.dim, cl); rot = lerp(rot, Math.PI / 4, cl);
    }
    // a scan line runs across the word
    if (lt > 1.35 && lt < 1.62 && TIMING_MASK[i]) {
      const sx = lerp(-100, W + 100, prog(lt, 1.35, 1.6));
      const k = Math.exp(-Math.pow((x - sx) / 90, 2));
      c = mix(c, P.hot, k);
    }
    // D: domino wipe to paper
    const dst = 1.6 + (col / (COLS - 1)) * 0.27 + CELL_RND[i] * 0.02;
    const dd = E.inOutCubic(prog(lt, dst, dst + 0.11));
    size = lerp(size, 42, dd); c = mix(c, P.paper, dd); rot = lerp(rot, Math.round(rot / (Math.PI / 2)) * (Math.PI / 2), dd);
    size *= 1 + 0.12 * beatPulse(t) * (1 - cl);
    g.fillStyle = rgb(c);
    quad(g, x, y, size, rot);
  }
  // tempo readout
  const fa = 1 - prog(lt, 1.55, 1.7);
  if (fa > 0) {
    g.font = font(18, 'JetBrains Mono', 700); g.letterSpacing = '4px'; g.fillStyle = rgb(P.paper, 0.7 * fa);
    g.fillText(`120 BPM  /  ${NP} CELLS  /  STAGGER ${(lt * 1000 | 0).toString().padStart(4, '0')}MS`, 70, H - 130);
    g.letterSpacing = '0px';
  }
}

// =============================================================== 06 FLOW
const NL = 52, LX0 = 140, LX1 = 1780, LSTEP = 6;
function s6(g, t) {
  bgFill(g, P.paper);
  const lt = t - 10;
  const collapse = E.inOutExpo(prog(lt, 1.3, 1.88));
  const flatten = 1 - E.inQuad(prog(lt, 1.55, 1.92));
  const build = 1 + 0.9 * E.inQuad(prog(lt, 0.9, 1.6));
  let pulse = 0;
  for (let b = 0; b <= lt; b += 0.5) pulse += Math.exp(-(lt - b) * 7);
  const A = 120 * (1 + 0.45 * pulse) * build * flatten;

  // big word behind the ridges
  const tp = E.outExpo(prog(t, 10.0, 10.45));
  g.save();
  g.translate(CX, CY + 40); g.scale(1, (1 - collapse) * lerp(0.6, 1, tp));
  g.font = font(620, 'Anton'); g.textAlign = 'center'; g.letterSpacing = '12px';
  g.fillStyle = rgb(P.hot, tp);
  g.fillText('FLOW', 0, 220);
  g.letterSpacing = '0px';
  g.restore(); g.textAlign = 'left';

  const xs = [];
  for (let x = LX0; x <= LX1; x += LSTEP) xs.push(x);
  g.lineJoin = 'round';
  for (let i = 0; i < NL; i++) {
    const base0 = 210 + (i * (900 - 210)) / (NL - 1);
    const base = lerp(base0, CY, collapse);
    const reveal = E.outExpo(prog(lt, i * 0.007, i * 0.007 + 0.6));
    const xEnd = lerp(LX0, LX1, reveal);
    if (xEnd <= LX0 + 1) continue;
    g.beginPath();
    let lastX = LX0;
    for (let k = 0; k < xs.length; k++) {
      let x = xs[k];
      if (x > xEnd) x = xEnd;
      const n = noise3(x * 0.0042, i * 0.21, lt * 0.95) * 0.5 + 0.5;
      const wob = CX + 200 * Math.sin(i * 0.31 + lt * 1.7);
      const bump = Math.exp(-Math.pow((x - CX) / 330, 2)) * (0.45 + 0.55 * Math.exp(-Math.pow((x - wob) / 210, 2)));
      const y = base - (A * bump * n * n * 1.6 + 5 * n * flatten);
      k ? g.lineTo(x, y) : g.moveTo(x, y);
      lastX = x;
      if (x >= xEnd) break;
    }
    // occlude what is behind, then ink the ridge
    g.save();
    g.lineTo(lastX, base + 1.5); g.lineTo(LX0, base + 1.5); g.closePath();
    g.fillStyle = rgb(P.paper); g.fill();
    g.restore();
    g.strokeStyle = rgb(i === 30 && lt > 0.9 ? mix(P.ink, P.hot, prog(lt, 0.9, 1.1)) : P.ink);
    g.lineWidth = 2.3; g.stroke();
  }
  const fa = 1 - prog(lt, 1.2, 1.4);
  if (fa > 0) {
    g.font = font(18, 'JetBrains Mono', 700); g.letterSpacing = '4px'; g.fillStyle = rgb(P.ink, 0.7 * fa);
    g.fillText(`${NL} LINES  /  PERLIN FIELD  /  AMP ${A.toFixed(1).padStart(5, '0')}`, 70, H - 130);
    g.letterSpacing = '0px';
  }
}

// ========================================================== 07 PARTICLES
const S7 = { pts: [], fs: 0, base: 0, top: 0, bottom: 0, left: 0, right: 0, word: 'CLAUDE' };
const TEXT_CY = CY - 50;
function initS7() {
  const c = mk(), g = c.getContext('2d');
  let fs = 400; g.font = font(fs, 'Archivo Black');
  fs *= 1480 / g.measureText(S7.word).width; g.font = font(fs, 'Archivo Black');
  const m = g.measureText(S7.word);
  const asc = m.actualBoundingBoxAscent;
  S7.fs = fs; S7.base = TEXT_CY + asc / 2;
  S7.top = S7.base - asc; S7.bottom = S7.base;
  S7.left = CX - m.width / 2; S7.right = CX + m.width / 2;
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(S7.word, CX, S7.base);
  const data = g.getImageData(0, 0, W, H).data;
  const r = rng(99), STEP = 6;
  const cols = [P.paper, P.hot, P.violet, P.cyan, P.paper, P.hot];
  for (let y = 0; y < H; y += STEP) for (let x = 0; x < W; x += STEP) {
    if (data[(y * W + x) * 4 + 3] < 128) continue;
    const up = r() < 0.5 ? -1 : 1;
    S7.pts.push({
      tx: x, ty: y,
      sx: LX0 + r() * (LX1 - LX0), sy: CY,
      vx: (r() - 0.5) * 1100, vy: up * (250 + Math.pow(r(), 1.5) * 1500), k: 2.8 + r() * 1.8,
      ph: r() * TAU, arc: (r() - 0.5) * 320,
      start: 12.38 + ((x - S7.left) / (S7.right - S7.left)) * 0.42 + r() * 0.12,
      dur: 0.5 + r() * 0.25, col: cols[Math.floor(r() * cols.length)], size: 2.4 + r() * 2.2,
    });
  }
}
function particlePos(p, t) {
  const dt = Math.max(0, t - 12);
  const e = 1 - Math.exp(-p.k * dt), sw = Math.min(dt * 3, 1);
  let ex = p.sx + (p.vx / p.k) * e + Math.sin(dt * 4 + p.ph) * 70 * sw;
  let ey = p.sy + (p.vy / p.k) * e + Math.cos(dt * 3.2 + p.ph) * 70 * sw;
  // vortex: inner particles orbit faster than outer ones
  const dx = ex - CX, dy = ey - CY, rr = Math.hypot(dx, dy);
  const va = 1.6 * (1 - Math.exp(-1.8 * dt)) * (420 / (rr + 260));
  const cv = Math.cos(va), sv = Math.sin(va);
  ex = CX + dx * cv - dy * sv; ey = CY + dx * sv + dy * cv;
  const m = E.inOutCubic(prog(t, p.start, p.start + p.dur));
  return [lerp(ex, p.tx, m) + Math.sin(Math.PI * m) * p.arc * 0.3, lerp(ey, p.ty, m) + Math.sin(Math.PI * m) * p.arc, m];
}
function drawParticles(g, t, alpha = 1) {
  const sweep = lerp(S7.left - 200, S7.right + 200, prog(t, 13.35, 13.85));
  for (const p of S7.pts) {
    const [x, y, m] = particlePos(p, t);
    let col = mix(p.col, P.paper, m), size = lerp(p.size, 3.6, m);
    if (m >= 1) {
      const k = Math.exp(-Math.pow((x - sweep) / 90, 2));
      col = mix(col, P.hot, k); size += 1.6 * k;
    }
    g.fillStyle = rgb(col, alpha);
    g.fillRect(x - size / 2, y - size / 2, size, size);
  }
}
function subtitle(g, t, a = 1) {
  const y = S7.bottom + 110;
  g.font = font(40, 'Space Grotesk', 700); g.letterSpacing = '22px'; g.textAlign = 'center';
  const str = 'MOTION DESIGNER';
  const s = scramble(str, t, 13.05, 0.04, 17);
  // reveal characters progressively, unresolved glyphs in accent
  const shown = Math.floor(clamp((t - 12.9) / 0.2) * str.length);
  const vis = s.slice(0, shown);
  const resolved = Math.floor(clamp((t - 13.05) / (0.04 * str.length)) * str.length);
  g.fillStyle = rgb(P.paper, a);
  const full = g.measureText(str).width;
  // draw resolved + unresolved parts left aligned from the centred origin
  g.textAlign = 'left';
  const x0 = CX - full / 2 + 11;
  const resPart = vis.slice(0, resolved), rest = vis.slice(resolved);
  g.fillText(resPart, x0, y);
  g.fillStyle = rgb(P.hot, a);
  g.fillText(rest, x0 + g.measureText(resPart).width, y);
  g.letterSpacing = '0px';
  // rules either side
  const rp = E.outExpo(prog(t, 13.1, 13.6));
  g.fillStyle = rgb(P.paper, 0.6 * a);
  const gap = full / 2 + 40, len = (S7.right - S7.left) / 2 - gap;
  g.fillRect(CX - gap - len * rp, y - 15, len * rp, 2);
  g.fillRect(CX + gap, y - 15, len * rp, 2);
  return y;
}
function brackets(g, t, a = 1) {
  const bp = E.outExpo(prog(t, 13.15, 13.6));
  if (bp <= 0) return;
  const pad = lerp(0, 60, bp), L = 46;
  const x0 = S7.left - pad, x1 = S7.right + pad, y0 = S7.top - pad, y1 = S7.bottom + 150 + pad;
  g.strokeStyle = rgb(P.paper, bp * a); g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x0, y0 + L); g.lineTo(x0, y0); g.lineTo(x0 + L, y0);
  g.moveTo(x1 - L, y0); g.lineTo(x1, y0); g.lineTo(x1, y0 + L);
  g.moveTo(x1, y1 - L); g.lineTo(x1, y1); g.lineTo(x1 - L, y1);
  g.moveTo(x0 + L, y1); g.lineTo(x0, y1); g.lineTo(x0, y1 - L);
  g.stroke();
  g.font = font(16, 'JetBrains Mono', 700); g.letterSpacing = '4px'; g.fillStyle = rgb(P.hot, bp * a);
  g.fillText(`${S7.pts.length} PARTICLES`, x0, y0 - 18);
  g.textAlign = 'right'; g.fillText('SR—2026', x1, y0 - 18); g.textAlign = 'left';
  g.letterSpacing = '0px';
}
function s7(g, t) {
  bgFill(g, P.ink);
  const glow = g.createRadialGradient(CX, TEXT_CY, 0, CX, TEXT_CY, 900);
  glow.addColorStop(0, rgb(P.violet, 0.16 * prog(t, 12.3, 13.2))); glow.addColorStop(1, rgb(P.violet, 0));
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  drawParticles(g, t);
  if (t > 12.9) subtitle(g, t);
  brackets(g, t);
}

// ============================================================ 08 RESOLVE
function s8(g, t) {
  bgFill(g, P.ink);
  const sy = lerp(1, 0.006, E.inExpo(prog(t, 14.5, 14.72)));
  const sx = 1 - E.inExpo(prog(t, 14.7, 14.86));
  const group = 1 - prog(t, 14.62, 14.72);
  const midY = (S7.top + S7.bottom + 150) / 2;

  if (group > 0) {
    g.save();
    g.translate(CX, midY); g.scale(1, sy); g.translate(-CX, -midY);
    const glow = g.createRadialGradient(CX, TEXT_CY, 0, CX, TEXT_CY, 900);
    glow.addColorStop(0, rgb(P.violet, 0.16)); glow.addColorStop(1, rgb(P.violet, 0));
    g.fillStyle = glow; g.fillRect(0, 0, W, H);
    const sa = E.outCubic(prog(t, 14.0, 14.14));
    if (sa < 1) drawParticles(g, t, 1 - sa);
    // solid wordmark with a colour sweep through it
    shctx.setTransform(1, 0, 0, 1, 0, 0);
    shctx.clearRect(0, 0, W, H);
    shctx.font = font(S7.fs, 'Archivo Black'); shctx.textAlign = 'center';
    shctx.fillStyle = rgb(P.paper); shctx.fillText(S7.word, CX, S7.base);
    shctx.globalCompositeOperation = 'source-atop';
    const bx = lerp(S7.left - 400, S7.right + 400, E.inOutCubic(prog(t, 14.04, 14.48)));
    const gr = shctx.createLinearGradient(bx - 220, 0, bx + 220, 0);
    gr.addColorStop(0, rgb(P.hot, 0)); gr.addColorStop(0.35, rgb(P.hot, 1)); gr.addColorStop(0.5, rgb(P.lime, 1));
    gr.addColorStop(0.65, rgb(P.hot, 1)); gr.addColorStop(1, rgb(P.hot, 0));
    shctx.fillStyle = gr; shctx.fillRect(0, 0, W, H);
    shctx.globalCompositeOperation = 'source-over';
    g.globalAlpha = sa * group; g.drawImage(shineC, 0, 0); g.globalAlpha = 1;
    subtitle(g, t, group);
    brackets(g, t, group);
    const ta = E.outCubic(prog(t, 14.1, 14.35)) * group;
    g.font = font(18, 'JetBrains Mono', 600); g.textAlign = 'center';
    g.letterSpacing = `${lerp(18, 8, ta)}px`; g.fillStyle = rgb(P.paper, 0.7 * ta);
    g.fillText('SHOWREEL 2026  ·  15 SECONDS  ·  EVERY FRAME WRITTEN IN CODE', CX, S7.bottom + 260);
    g.letterSpacing = '0px'; g.textAlign = 'left';
    g.restore();
  }
  // squashed wordmark becomes a line, the line becomes the dot we started with
  const la = prog(t, 14.6, 14.7);
  if (la > 0 && t < 14.88) {
    const w = (S7.right - S7.left) * sx;
    g.fillStyle = rgb(P.paper, la);
    g.fillRect(CX - w / 2, midY - 2, w, 4);
  }
  if (t >= 14.84 && t < 14.95) {
    const q = prog(t, 14.84, 14.95);
    g.fillStyle = rgb(P.paper);
    g.beginPath(); g.arc(CX, midY, 6 + 22 * Math.sin(Math.PI * q) * (1 - q * 0.4), 0, TAU); g.fill();
  }
  if (t >= 14.95) {
    const q = prog(t, 14.95, 15.0);
    g.strokeStyle = rgb(P.hot, 1 - q); g.lineWidth = 4 * (1 - q) + 0.5;
    g.beginPath(); g.arc(CX, midY, 20 + 140 * E.outExpo(q), 0, TAU); g.stroke();
  }
}

// ============================================================== timeline
function world(g, t) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const sh = env(HITS, t, 9);
  const zoom = 1 + 0.008 * beatPulse(t, 10);
  g.translate(CX + sh * noise3(t * 31, 0.5, 0) * 1.6, CY + sh * noise3(0.5, t * 31, 4) * 1.6);
  g.rotate(sh * 0.0007 * noise3(t * 17, 9.5, 2));
  g.scale(zoom, zoom);
  g.translate(-CX, -CY);

  if (t < 1.5) s1(g, t);
  else if (t < 2.0) {
    s1(g, t);
    const r1 = 1250 * E.inOutExpo(prog(t, 1.5, 1.94));
    const r2 = 1250 * E.inOutExpo(prog(t, 1.57, 2.0));
    const ox = CX, oy = FLOOR_Y - BALL_R;
    g.fillStyle = rgb(P.violet); g.beginPath(); g.arc(ox, oy, r1, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(ox, oy, r2, 0, TAU); g.clip(); s2(g, t); g.restore();
  } else if (t < 3.55) s2(g, t);
  else if (t < 4.0) {
    s3(g, t);
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    s2(bctx, t);
    const N = 9, sh2 = H / N;
    for (let i = 0; i < N; i++) {
      const st = 3.55 + i * 0.022, dir = i % 2 ? 1 : -1;
      const pv = E.inOutQuart(prog(t, st + 0.05, st + 0.25));
      const ph = E.inOutQuart(prog(t, st, st + 0.2));
      g.fillStyle = rgb(P.violet);
      g.fillRect(dir * W * pv - (dir < 0 ? 0 : 0), i * sh2, W, sh2 + 1);
      g.drawImage(bufC, 0, i * sh2, W, sh2 + 1, dir * W * ph, i * sh2, W, sh2 + 1);
    }
  } else if (t < 5.72) s3(g, t);
  else if (t < 6.0) {
    const M = 1 + 13 * E.inExpo(prog(t, 5.72, 6.0));
    const st = s3(g, t, M);
    g.save(); shapePath(g, 240 * st.sc * M, st.rot); g.clip(); s4(g, t); g.restore();
    shapePath(g, 240 * st.sc * M, st.rot); g.strokeStyle = rgb(P.paper); g.lineWidth = 6; g.stroke();
  } else if (t < 8.0) s4(g, t);
  else if (t < 10.0) s5(g, t);
  else if (t < 12.0) s6(g, t);
  else if (t < 14.0) s7(g, t);
  else s8(g, t);
  g.restore();
}

// ------------------------------------------------------------------- HUD
const LABELS = [[0, 'IMPACT'], [2, 'KINETIC TYPE'], [4, 'FORM'], [6, 'DEPTH'], [8, 'RHYTHM'], [10, 'FLOW'], [12, 'PARTICLES'], [14, 'RESOLVE']];
function hud(g, t, frame) {
  const a = prog(t, 0, 0.3) * (1 - prog(t, 14.55, 14.8));
  if (a <= 0) return;
  g.save();
  g.globalCompositeOperation = 'difference';
  g.fillStyle = `rgba(255,255,255,${0.92 * a})`;
  g.strokeStyle = `rgba(255,255,255,${0.92 * a})`;
  // frame marks
  const m = 40, L = 28;
  g.lineWidth = 2; g.beginPath();
  g.moveTo(m, m + L); g.lineTo(m, m); g.lineTo(m + L, m);
  g.moveTo(W - m - L, m); g.lineTo(W - m, m); g.lineTo(W - m, m + L);
  g.moveTo(W - m, H - m - L); g.lineTo(W - m, H - m); g.lineTo(W - m - L, H - m);
  g.moveTo(m + L, H - m); g.lineTo(m, H - m); g.lineTo(m, H - m - L);
  g.stroke();
  g.font = font(17, 'JetBrains Mono', 700); g.letterSpacing = '3px';
  // scene label
  let idx = 0; for (let i = 0; i < LABELS.length; i++) if (t >= LABELS[i][0]) idx = i;
  const [lt0, name] = LABELS[idx];
  g.fillText(`(0${idx + 1}) ${scramble(name, t, lt0, 0.03, idx * 13)}`, 70, 82);
  // timecode
  const ss = Math.floor(frame / FPS), ff = frame % FPS;
  g.textAlign = 'right';
  g.fillText(`TC 00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`, W - 70, 82);
  // specs + beat counter
  g.textAlign = 'left';
  g.fillText('1920×1080 / 60FPS / 120BPM', 70, H - 64);
  const beat = Math.floor(t / 0.5) % 4;
  for (let k = 0; k < 4; k++) {
    const x = W - 70 - (3 - k) * 26 - 14;
    if (k === beat && t >= 2 && t < 14) g.fillRect(x, H - 78, 14, 14);
    else { g.lineWidth = 1.5; g.strokeRect(x + 0.75, H - 77.25, 12.5, 12.5); }
  }
  // progress
  g.fillRect(70, H - 50, (W - 140) * (t / DUR), 2);
  g.globalAlpha = 0.3 * a; g.fillRect(70, H - 50, W - 140, 2);
  g.restore();
}

// ------------------------------------------------------------- post / fx
const VIG = mk();
(() => {
  const g = VIG.getContext('2d');
  const gr = g.createRadialGradient(CX, CY, 300, CX, CY, 1150);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.42)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
})();
const GRAIN = [0, 1, 2, 3].map(s => {
  const c = mk(256, 256), g = c.getContext('2d'), img = g.createImageData(256, 256), r = rng(1000 + s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (r() * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return octx.createPattern(c, 'repeat');
});

function renderFrame(frame, sub = SUB) {
  const tc = frame / FPS;
  for (let s = 0; s < sub; s++) {
    const off = sub > 1 ? ((s + 0.5) / sub - 0.5) * SHUTTER : 0;
    const t = clamp((frame + off) / FPS, 0, DUR - 1e-4);
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over';
    world(sctx, t);
    actx.globalAlpha = 1 / (s + 1);
    actx.drawImage(sceneC, 0, 0);
  }
  actx.globalAlpha = 1;

  const ab = env(HITS, tc, 10) * 0.7;
  octx.globalCompositeOperation = 'source-over'; octx.globalAlpha = 1;
  if (ab > 0.6) {
    const tints = ['#f00', '#0f0', '#00f'];
    fx.forEach(({ g }, i) => {
      g.globalCompositeOperation = 'source-over'; g.drawImage(accC, 0, 0);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = tints[i]; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    });
    octx.fillStyle = '#000'; octx.fillRect(0, 0, W, H);
    octx.globalCompositeOperation = 'lighter';
    const ay = ab * (H / W);
    octx.drawImage(fx[0].c, -ab, -ay, W + 2 * ab, H + 2 * ay);
    octx.drawImage(fx[1].c, 0, 0);
    octx.drawImage(fx[2].c, ab, ay, W - 2 * ab, H - 2 * ay);
    octx.globalCompositeOperation = 'source-over';
  } else {
    octx.drawImage(accC, 0, 0);
  }
  const fl = env(FLASHES, tc, 13);
  if (fl > 0.005) { octx.fillStyle = `rgba(255,255,255,${Math.min(1, fl)})`; octx.fillRect(0, 0, W, H); }
  octx.drawImage(VIG, 0, 0);
  // film grain
  octx.save();
  octx.globalCompositeOperation = 'overlay'; octx.globalAlpha = 0.07;
  const r = ihash(frame + 1);
  octx.translate(r % 256, (r >>> 8) % 256);
  octx.fillStyle = GRAIN[frame % 4]; octx.fillRect(-256, -256, W + 512, H + 512);
  octx.restore();
  hud(octx, tc, frame);
}

// ------------------------------------------------------------- bootstrap
window.REEL = { W, H, FPS, DUR, frames: DUR * FPS };
window.ready = (async () => {
  await Promise.all([
    document.fonts.load('100px Anton'), document.fonts.load('100px "Archivo Black"'),
    document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('700 20px "Space Grotesk"'),
  ]);
  initS2(); initS5(); initS7();
  return true;
})();
window.renderFrame = renderFrame;
window.grabFrame = (frame) => { renderFrame(frame); return out.toDataURL('image/png'); };

if (!params.has('render')) {
  // live preview: loops in real time with a single sample per frame
  window.ready.then(() => {
    const start = performance.now();
    const tick = () => {
      const f = Math.floor(((performance.now() - start) / 1000) * FPS) % (DUR * FPS);
      renderFrame(f, 1);
      requestAnimationFrame(tick);
    };
    const jump = params.get('t');
    if (jump !== null) renderFrame(Math.round(Number(jump) * FPS));
    else tick();
  });
}
