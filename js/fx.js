// 2D 粒子特效（全螢幕 canvas）＋ 音效
const c = document.getElementById('fx');
const x = c.getContext('2d');
let W = 0, H = 0, P = [], motes = [];

function size() {
  const d = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  c.width = W * d; c.height = H * d;
  x.setTransform(d, 0, 0, d, 0, 0);
}
addEventListener('resize', size); size();

for (let i = 0; i < 46; i++) motes.push({
  x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .4,
  s: Math.random() * .00012 + .00004, p: Math.random() * 6.28,
});

const rnd = (a, b) => a + Math.random() * (b - a);

function dot(px, py, r, color, a) {
  x.globalAlpha = a * .25; x.fillStyle = color;
  x.beginPath(); x.arc(px, py, r * 3, 0, 6.283); x.fill();
  x.globalAlpha = a; x.beginPath(); x.arc(px, py, r, 0, 6.283); x.fill();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  x.clearRect(0, 0, W, H);
  x.globalCompositeOperation = 'lighter';
  // 環境浮塵
  for (const m of motes) {
    m.y -= m.s * dt * 1000; m.p += dt;
    if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); }
    dot((m.x + Math.sin(m.p * .5) * .01) * W, m.y * H, m.r, '#e8d9a8', .25 + Math.sin(m.p) * .15);
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.t += dt;
    const k = p.t / p.life;
    if (k >= 1) { P.splice(i, 1); p.done && p.done(); continue; }
    if (p.type === 'fly') {
      const e = k * k * (3 - 2 * k), u = 1 - e;
      const px = u * u * p.x0 + 2 * u * e * p.cx + e * e * p.x1;
      const py = u * u * p.y0 + 2 * u * e * p.cy + e * e * p.y1;
      dot(px, py, p.r, p.color, 1);
      x.globalAlpha = 1; x.fillStyle = '#fff8dc'; x.beginPath(); x.arc(px, py, p.r * .45, 0, 6.283); x.fill();
    } else if (p.type === 'ring') {
      x.globalAlpha = (1 - k) * .8; x.strokeStyle = p.color; x.lineWidth = 3 * (1 - k) + .5;
      x.beginPath(); x.arc(p.x, p.y, p.r * (0.2 + k), 0, 6.283); x.stroke();
    } else if (p.type === 'orbit') {
      const a = p.a + p.t * p.w, rr = p.r * (1 - k * .2) * (0.3 + k);
      dot(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * .55 - k * 40, p.s, p.color, 1 - k);
    } else {
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      dot(p.x, p.y, p.s * (1 - k * .6), p.color, 1 - k);
    }
  }
  x.globalAlpha = 1;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function burst(px, py, color = '#f1c75b', n = 40, power = 320) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, v = rnd(.2, 1) * power;
    P.push({ type: 'spark', x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 260, drag: .955,
             s: rnd(1.2, 3.2), color: Math.random() < .25 ? '#ffffff' : color, t: 0, life: rnd(.5, 1.2) });
  }
}
function ring(px, py, color, r = 90, life = .6) { P.push({ type: 'ring', x: px, y: py, r, color, t: 0, life }); }

// 施法：環繞光點 + 光環 + 爆裂
function spell(px, py, color) {
  for (let i = 0; i < 26; i++)
    P.push({ type: 'orbit', x: px, y: py, a: Math.random() * 6.283, w: rnd(6, 11), r: rnd(30, 70),
             s: rnd(1.5, 3), color: i % 3 ? color : '#fff', t: 0, life: rnd(.5, .9) });
  ring(px, py, color, 70, .5); ring(px, py, '#ffffff', 120, .7);
  setTimeout(() => burst(px, py, color, 36, 300), 180);
}

// 貨幣飛向 HUD
function fly(px, py, el, n, color, onHit) {
  if (!el) return;
  const r = el.getBoundingClientRect(), tx = r.left + 12, ty = r.top + r.height / 2;
  n = Math.max(1, Math.min(14, Math.round(n)));
  for (let i = 0; i < n; i++) {
    const sx = px + rnd(-30, 30), sy = py + rnd(-30, 30);
    P.push({ type: 'fly', x0: sx, y0: sy, x1: tx, y1: ty, cx: (sx + tx) / 2 + rnd(-160, 160), cy: Math.min(sy, ty) - rnd(40, 200),
             r: rnd(3.5, 5.5), color, t: -i * .05, life: rnd(.7, 1),
             done: () => { burst(tx, ty, color, 4, 80); onHit && onHit(); } });
  }
}

function fireworks(times = 5) {
  const cols = ['#f1c75b', '#5fa8d8', '#b07cf0', '#6fbf73', '#ff8a6a'];
  for (let i = 0; i < times; i++) setTimeout(() => {
    const px = rnd(.15, .85) * W, py = rnd(.15, .55) * H, col = cols[i % cols.length];
    burst(px, py, col, 70, 420); ring(px, py, col, 140, .8);
  }, i * 260);
}

// ---- 音效 (WebAudio) ----
let ac = null; let muted = false;
function tone(freq, t0, dur, type = 'sine', vol = .12) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime + t0);
  g.gain.linearRampToValueAtTime(vol, ac.currentTime + t0 + .015);
  g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + t0 + dur);
  o.connect(g).connect(ac.destination); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + dur + .05);
}
function sound(kind) {
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const seq = {
      cast:  [[660, 0, .25], [990, .07, .3], [1320, .14, .5]],
      coin:  [[1568, 0, .12, 'triangle'], [2093, .06, .25, 'triangle']],
      level: [[523, 0, .3], [659, .12, .3], [784, .24, .3], [1047, .36, .8], [1319, .48, .9]],
      ach:   [[784, 0, .25], [1047, .15, .25], [1568, .3, .8]],
      flip:  [[880, 0, .1, 'triangle']],
      rare:  [[784, 0, .2], [1175, .1, .3], [1568, .2, .6]],
      buy:   [[440, 0, .15, 'triangle'], [660, .08, .3, 'triangle']],
      alarm: [[880, 0, .3, 'square', .06], [880, .4, .3, 'square', .06], [880, .8, .5, 'square', .06]],
      deny:  [[200, 0, .2, 'sawtooth', .05]],
    }[kind] || [];
    for (const [f, t, d, ty, v] of seq) tone(f, t, d, ty, v);
  } catch (e) { /* 無音訊裝置時忽略 */ }
}

export const FX = { burst, ring, spell, fly, fireworks, sound, setMuted: m => { muted = m; }, center: () => [W / 2, H / 2] };
