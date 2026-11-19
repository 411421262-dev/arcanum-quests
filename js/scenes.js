// Three.js 程式化 3D 模型：金幣、星晶、獎盃、卡包，以及每項挑戰專屬的魔法珍寶
let T = null, Room = null, failed = false;

async function lib() {
  if (failed) return false;
  if (T) return true;
  try {
    T = await import('three');
    ({ RoomEnvironment: Room } = await import('three/addons/environments/RoomEnvironment.js'));
    return true;
  } catch (e) { failed = true; return false; }
}

// ---------- 材質與小工具 ----------
const metal = (color, rough = .28) => new T.MeshStandardMaterial({ color, metalness: .62, roughness: rough, envMapIntensity: 1.6 });
const std = (color, o = {}) => new T.MeshStandardMaterial({ color, roughness: .6, ...o });
const emis = (color, k = 1.4, o = {}) => new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: .35, ...o });
const glass = (color = 0xe6f6ff, op = .26) => new T.MeshPhysicalMaterial({ color, roughness: .03, metalness: 0, transparent: true, opacity: op, clearcoat: 1, envMapIntensity: 2.2, side: T.DoubleSide, depthWrite: false });
const additive = (color, op = .85) => new T.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false });
const V2 = pts => pts.map(([x, y]) => new T.Vector2(x, y));
const lathe = (pts, mat, seg = 48) => new T.Mesh(new T.LatheGeometry(V2(pts), seg), mat);
const mesh = (geo, mat) => new T.Mesh(geo, mat);
function put(g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; }
// 兩點之間的圓柱（桿、腳架、窗格）
function rod(g, a, b, r, mat, seg = 8) {
  const A = new T.Vector3(...a), B = new T.Vector3(...b), d = B.clone().sub(A), m = mesh(new T.CylinderGeometry(r, r, d.length(), seg), mat);
  m.position.copy(A).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); g.add(m); return m;
}
function ctex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }
let haloTex = null;
function glow(color, s = 1.5, op = .85) {
  if (!haloTex) haloTex = ctex(128, 128, g => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.22, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  const sp = new T.Sprite(new T.SpriteMaterial({ map: haloTex, color, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false }));
  sp.scale.setScalar(s); sp.userData.glow = true; return sp;
}
function flame(h = .62, col = 0xffcf70) { return lathe([[0, 0], [.12, .08], [.15, .24], [.08, .46], [0, h]], new T.MeshBasicMaterial({ color: col }), 16); }
function starShape(R, r, n) {
  const s = new T.Shape();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? r : R;
    i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath(); return s;
}
// 新月形：大圓扣掉一個偏移的小圓
function crescent(R, dx, dy, r, N = 40) {
  const d = Math.hypot(dx, dy), a = (R * R - r * r + d * d) / (2 * d), b = Math.acos(a / R), tc = Math.atan2(dy, dx), pts = [];
  for (let k = 0; k <= N; k++) { const t = tc + b + (Math.PI * 2 - 2 * b) * k / N; pts.push([R * Math.cos(t), R * Math.sin(t)]); }
  const i1 = pts[0], i2 = pts[N], f2 = Math.atan2(i2[1] - dy, i2[0] - dx), f1 = Math.atan2(i1[1] - dy, i1[0] - dx);
  let span = ((f1 - f2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); const mid = f2 + span / 2;
  if (Math.hypot(dx + r * Math.cos(mid), dy + r * Math.sin(mid)) > R) span -= Math.PI * 2;
  for (let k = 1; k < N; k++) { const t = f2 + span * k / N; pts.push([dx + r * Math.cos(t), dy + r * Math.sin(t)]); }
  return new T.Shape(V2(pts));
}
// 墨水塗寫（書頁、卷軸用）
function scribble(c, x0, y0, w, h, rows, col = 'rgba(70,40,15,.75)') {
  c.strokeStyle = col; c.lineWidth = 1.4;
  for (let r = 0; r < rows; r++) { const y = y0 + r * h / rows; let x = x0; c.beginPath(); c.moveTo(x, y);
    while (x < x0 + w - 6) { const s = 4 + Math.random() * 10; c.quadraticCurveTo(x + s / 2, y - 3 - Math.random() * 3, x + s, y + Math.random() * 2 - 1); x += s + (Math.random() < .2 ? 7 : 1); c.moveTo(x, y); } c.stroke(); }
}
function rune(c, cx, cy, s) {
  c.beginPath(); const n = 3 + (Math.random() * 3 | 0);
  for (let i = 0; i < n; i++) { c.moveTo(cx + (Math.random() - .5) * s, cy + (Math.random() - .5) * s); c.lineTo(cx + (Math.random() - .5) * s, cy + (Math.random() - .5) * s); }
  c.stroke();
}
// 把物件置中並縮放到指定大小（不計光暈）
function fit(o, size = 2.7) {
  o.updateMatrixWorld(true); const b = new T.Box3();
  o.traverse(c => { if (c.isMesh && !c.userData.glow) { c.geometry.computeBoundingBox(); b.union(c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld)); } });
  const s = b.getSize(new T.Vector3()), k = size / Math.max(s.x, s.y, s.z), w = new T.Group();
  o.position.sub(b.getCenter(new T.Vector3())); w.add(o); w.scale.setScalar(k); w.userData = o.userData; return w;
}

// ---------- 模型 ----------
const build = {
  coin() {
    const g = new T.Group(), gold = metal(0xe2b23c), deep = metal(0xa87818, .45);
    const body = new T.Mesh(new T.CylinderGeometry(1.3, 1.3, .16, 64), deep); body.rotation.x = Math.PI / 2; g.add(body);
    const rim = new T.Mesh(new T.TorusGeometry(1.3, .1, 16, 64), gold); g.add(rim);
    const inner = new T.Mesh(new T.TorusGeometry(.95, .035, 12, 48), gold);
    const star = new T.ExtrudeGeometry(starShape(.7, .3, 8), { depth: .06, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 });
    for (const z of [1, -1]) {
      const m = new T.Mesh(star, gold); m.position.z = z > 0 ? .08 : -.08; if (z < 0) m.rotation.y = Math.PI; g.add(m);
      const i2 = inner.clone(); i2.position.z = .08 * z; g.add(i2);
    }
    return g;
  },
  gem(o) {
    const g = new T.Group(), col = new T.Color(o.color || 0x57d0e6);
    const mat = new T.MeshPhysicalMaterial({ color: col, metalness: .2, roughness: .05, flatShading: true, emissive: col, emissiveIntensity: .35, clearcoat: 1 });
    const core = new T.Mesh(new T.OctahedronGeometry(1.15, 0), mat); core.scale.y = 1.45; g.add(core);
    const halo = new T.Mesh(new T.TorusGeometry(1.75, .025, 8, 80), metal(0xe2b23c)); halo.rotation.x = Math.PI / 2.4; g.add(halo);
    for (let i = 0; i < 5; i++) {
      const s = new T.Mesh(new T.OctahedronGeometry(.16, 0), mat), a = i / 5 * Math.PI * 2;
      s.position.set(Math.cos(a) * 1.75, Math.sin(a * 2) * .35, Math.sin(a) * 1.75); g.add(s);
    }
    return g;
  },
  trophy(o) {
    const g = new T.Group(), col = [0xb87333, 0xc9d1d6, 0xe2b23c][o.tier ?? 2], m = metal(col, .22);
    m.side = T.DoubleSide;
    const pts = [[0, 0], [.95, 0], [.95, .18], [.4, .32], [.17, .55], [.17, 1.15], [.32, 1.35], [.9, 2.1], [1.12, 3], [1.02, 3], [.82, 2.25], [0, 2.05]];
    g.add(lathe(pts, m, 64));
    for (const sx of [1, -1]) {
      const h = new T.Mesh(new T.TorusGeometry(.42, .075, 12, 32, Math.PI * 1.3), m);
      h.position.set(sx * 1.05, 2.35, 0); h.rotation.z = sx > 0 ? -Math.PI * .65 : Math.PI * .35 - Math.PI; g.add(h);
    }
    const base = new T.Mesh(new T.CylinderGeometry(1.1, 1.25, .35, 6), new T.MeshStandardMaterial({ color: 0x2a1a10, roughness: .5, metalness: .4 }));
    base.position.y = -.17; g.add(base);
    const gemMat = new T.MeshPhysicalMaterial({ color: 0x57d0e6, emissive: 0x57d0e6, emissiveIntensity: .6, flatShading: true, roughness: .05 });
    const gem = new T.Mesh(new T.OctahedronGeometry(.34, 0), gemMat); gem.position.y = 3.55; gem.scale.y = 1.4; g.add(gem);
    g.userData.spinChild = gem;
    g.position.y = -1.7; const wrap = new T.Group(); wrap.add(g); wrap.scale.setScalar(.82); wrap.userData = g.userData; return wrap;
  },
  pack(o) {
    const col = o.color || '#3f73a8';
    const tex = ctex(512, 768, c => {
      const gr = c.createLinearGradient(0, 0, 512, 768); gr.addColorStop(0, col); gr.addColorStop(1, '#120a06');
      c.fillStyle = gr; c.fillRect(0, 0, 512, 768);
      c.strokeStyle = '#e9c66a'; c.lineWidth = 10; c.strokeRect(22, 22, 468, 724); c.lineWidth = 3; c.strokeRect(42, 42, 428, 684);
      c.save(); c.translate(256, 360); c.globalAlpha = .9; c.fillStyle = 'rgba(0,0,0,.35)'; c.strokeStyle = '#e9c66a'; c.lineWidth = 6;
      c.rotate(Math.PI / 4); c.fillRect(-120, -120, 240, 240); c.strokeRect(-120, -120, 240, 240); c.rotate(-Math.PI / 4);
      c.fillStyle = '#f3dc9a'; c.beginPath();
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 34 : 110; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fill(); c.restore();
      c.fillStyle = '#f3dc9a'; c.textAlign = 'center'; c.font = '600 44px Cinzel, serif'; c.fillText('ARCANUM', 256, 640);
      c.font = '26px Cinzel, serif'; c.fillText('✦  ✦  ✦', 256, 110);
    });
    const face = new T.MeshStandardMaterial({ map: tex, metalness: .55, roughness: .35 }), edge = metal(0xe2b23c, .3);
    const g = new T.Group(); g.add(new T.Mesh(new T.BoxGeometry(2.2, 3.3, .22), [edge, edge, edge, edge, face, face])); return g;
  },

  // ===== 挑戰珍寶 =====
  quill() { // 初心羽毛筆
    const g = new T.Group();
    put(g, lathe([[0, 0], [.78, 0], [.86, .08], [.88, .5], [.62, .74], [.34, .82], [.3, .98], [.38, 1.04], [.38, 1.1], [0, 1.1]], new T.MeshPhysicalMaterial({ color: 0x18264a, roughness: .06, metalness: .2, clearcoat: 1, envMapIntensity: 2 })), 0, -1.5);
    put(g, mesh(new T.CircleGeometry(.3, 24), std(0x04050a, { roughness: .1 })), 0, -.43, 0, -Math.PI / 2);
    put(g, mesh(new T.TorusGeometry(.37, .045, 8, 32), metal(0xe2b23c)), 0, -.42, 0, Math.PI / 2);
    const fs = new T.Shape(); fs.moveTo(0, 0); fs.bezierCurveTo(.42, .7, .5, 1.9, .1, 3.1); fs.bezierCurveTo(-.05, 2.3, -.34, 1.3, -.32, .55); fs.bezierCurveTo(-.3, .3, -.12, .08, 0, 0);
    const fg = new T.ShapeGeometry(fs, 32), p = fg.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.pow(p.getY(i), 2) * .045 + Math.abs(p.getX(i)) * .22);
    fg.computeVertexNormals();
    const tex = ctex(128, 512, (c, w, h) => {
      const gr = c.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#f6efe0'); gr.addColorStop(.55, '#e8e2f2'); gr.addColorStop(.8, '#5a6ad0'); gr.addColorStop(1, '#2a1e70');
      c.fillStyle = gr; c.fillRect(0, 0, w, h); c.lineWidth = 1;
      for (let y = 0; y < h; y += 3) { c.strokeStyle = `rgba(${y % 2 ? 255 : 60},${y % 2 ? 255 : 50},${y % 2 ? 255 : 90},.25)`; c.beginPath(); c.moveTo(51, y); c.lineTo(0, y - 26); c.moveTo(51, y); c.lineTo(w, y - 30); c.stroke(); }
      c.strokeStyle = '#d8c8a0'; c.lineWidth = 3; c.beginPath(); c.moveTo(51, h); c.lineTo(51, 0); c.stroke();
    });
    tex.repeat.set(1 / .9, 1 / 3.2); tex.offset.set(.4, 0);
    const fe = new T.Group(); put(fe, mesh(fg, std(0xffffff, { map: tex, side: T.DoubleSide, roughness: .7 })));
    rod(fe, [0, -1, 0], [0, 2.1, .2], .03, std(0xe8dcc0, { roughness: .4 }));
    put(g, fe, 0, -.35, 0, .12, 0, -.38);
    return g;
  },
  candle() { // 長明燭台
    const g = new T.Group(), gold = metal(0xe2b23c, .25);
    put(g, lathe([[0, 0], [1, 0], [1, .08], [.8, .16], [.25, .3], [.17, .9], [.3, 1.0], [.55, 1.08], [.55, 1.15], [0, 1.15]], gold), 0, -1.7);
    put(g, mesh(new T.TorusGeometry(.32, .05, 8, 24), gold), .95, -1.05, 0, 0, 0, Math.PI / 2);
    rod(g, [.18, -1.25, 0], [.8, -1.1, 0], .05, gold);
    const wax = std(0xf4ead0, { roughness: .45, emissive: 0x663311, emissiveIntensity: .12 });
    put(g, lathe([[0, 0], [.34, 0], [.34, 1.3], [.3, 1.36], [.05, 1.38], [0, 1.38]], wax), 0, -.55);
    for (const [a, l] of [[.3, .35], [2.2, .5], [4.1, .25]]) put(g, mesh(new T.CapsuleGeometry(.05, l, 4, 8), wax), Math.cos(a) * .33, .7 - l / 2, Math.sin(a) * .33);
    rod(g, [0, .8, 0], [0, .95, 0], .02, std(0x111111));
    const f = put(g, flame(), 0, .9); put(g, glow(0xffaa44, 2, .9), 0, 1.15);
    g.userData.tick = t => f.scale.set(1 + Math.sin(t * 13) * .06, 1 + Math.sin(t * 9) * .12, 1);
    return g;
  },
  wand() { // 晨星魔杖
    const g = new T.Group(), w = new T.Group(), gold = metal(0xe2b23c, .3);
    put(w, mesh(new T.CylinderGeometry(.03, .07, 2.6, 16), std(0x4a2a16, { roughness: .5 })), 0, .95);
    put(w, mesh(new T.CylinderGeometry(.095, .1, 1.0, 16), std(0x24120a, { roughness: .6 })), 0, -.85);
    for (let i = 0; i < 4; i++) put(w, mesh(new T.TorusGeometry(.1, .022, 8, 24), gold), 0, -1.3 + i * .3, 0, Math.PI / 2);
    put(w, mesh(new T.SphereGeometry(.12, 16, 12), gold), 0, -1.42);
    put(w, mesh(new T.SphereGeometry(.055, 12, 8), emis(0xd8f0ff, 2)), 0, 2.27); put(w, glow(0x9fd8ff, 1.3), 0, 2.27);
    const sp = new T.Group(); sp.position.y = 2.27; w.add(sp);
    for (let i = 0; i < 7; i++) { const s = put(sp, mesh(new T.OctahedronGeometry(.05, 0), emis(0xbfe8ff, 2)), Math.cos(i) * .4, Math.sin(i * 2.3) * .3, Math.sin(i) * .4); s.userData.p = i; }
    w.rotation.z = -.6; g.add(w);
    g.userData.tick = t => { sp.rotation.y = t * 1.6; sp.rotation.x = t * .7; };
    return g;
  },
  grimoire() { // 萬言魔典
    const g = new T.Group(), b = new T.Group(), lea = std(0x6a1c16, { roughness: .75 }), gold = metal(0xe2b23c, .3);
    const page = ctex(256, 320, (c, w, h) => { c.fillStyle = '#efe0bc'; c.fillRect(0, 0, w, h); scribble(c, 22, 30, w - 44, 120, 9);
      c.strokeStyle = 'rgba(150,40,25,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(w / 2, 230, 44, 0, 7); c.moveTo(w / 2, 186); c.lineTo(w / 2 + 38, 252); c.lineTo(w / 2 - 38, 252); c.closePath(); c.stroke(); scribble(c, 22, 290, w - 44, 20, 1); });
    const pm = std(0xe6dac0, { map: page, side: T.DoubleSide, roughness: .9 });
    for (const s of [-1, 1]) {
      put(b, mesh(new T.BoxGeometry(1.8, .08, 2.55), lea), s * .9, -.1, 0, 0, 0, s * .06);
      for (const [x, z] of [[1.62, 1.12], [1.62, -1.12]]) put(b, mesh(new T.BoxGeometry(.2, .1, .3), gold), s * x, -.08, z);
      put(b, mesh(new T.BoxGeometry(1.58, .1, 2.3), std(0xe8d6ac)), s * .82, -.02, 0);
      const pg = new T.PlaneGeometry(1.6, 2.3, 24, 1), p = pg.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = (p.getX(i) + .8) / 1.6; p.setZ(i, Math.sin(x * Math.PI * .8) * .3 + .06); }
      pg.computeVertexNormals(); const m = put(b, mesh(pg, pm), s * .8, .04, 0, -Math.PI / 2); if (s < 0) m.scale.x = -1;
    }
    b.rotation.x = .55; g.add(b);
    const rg = [0, 1, 2].map(() => ctex(64, 64, c => { c.strokeStyle = '#fff'; c.lineWidth = 4; c.lineCap = 'round'; c.shadowColor = '#fff'; c.shadowBlur = 6; rune(c, 32, 32, 36); }));
    const runes = [];
    for (let i = 0; i < 6; i++) { const m = put(g, mesh(new T.PlaneGeometry(.42, .42), new T.MeshBasicMaterial({ map: rg[i % 3], color: 0xffd27a, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })), (i % 3 - 1) * .7, 0, (i < 3 ? .2 : -.2)); m.userData.glow = true; runes.push(m); }
    put(g, glow(0xffc860, 3, .5), 0, .6);
    g.userData.sway = true;
    g.userData.tick = t => runes.forEach((r, i) => { const k = (t * .3 + i / 6) % 1; r.position.y = .3 + k * 1.8; r.material.opacity = Math.sin(k * Math.PI); r.rotation.y = t + i; });
    return g;
  },
  brazier() { // 不熄火盆
    const g = new T.Group(), br = metal(0x9a6a3a, .45);
    put(g, lathe([[0, 0], [.5, 0], [1.15, .35], [1.28, .62], [1.2, .64], [.5, .2], [0, .2]], br), 0, .05);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; rod(g, [Math.cos(a) * .55, .15, Math.sin(a) * .55], [Math.cos(a) * 1.05, -1.5, Math.sin(a) * 1.05], .06, br); }
    put(g, mesh(new T.TorusGeometry(.92, .045, 8, 40), br), 0, -1.05, 0, Math.PI / 2);
    for (let i = 0; i < 10; i++) { const a = i * 2.4, r = .2 + (i % 4) * .17; put(g, mesh(new T.DodecahedronGeometry(.2, 0), emis(0xff4a18, .9, { color: 0x3a1208 })), Math.cos(a) * r, .55, Math.sin(a) * r, i, i * 2, 0); }
    const fl = [];
    [[0, 0, 1.3, 0xffe08a], [.3, .1, .95, 0xff9a30], [-.28, .15, 1, 0xff7a20], [.05, -.3, .9, 0xffb040]].forEach(([x, z, h, c]) => { const f = put(g, mesh(new T.ConeGeometry(.3, h, 12), additive(c, .9)), x, .6 + h / 2, z); f.userData.glow = false; fl.push(f); });
    put(g, glow(0xff8a30, 3.4, .9), 0, 1.1);
    g.userData.tick = t => fl.forEach((f, i) => { f.scale.set(1 + Math.sin(t * 11 + i) * .1, 1 + Math.sin(t * 8 + i * 2) * .18, 1); f.rotation.y = t * (i + 1) * .5; });
    return g;
  },
  hourglass() { // 七日沙漏
    const g = new T.Group(), wd = std(0x5a3418, { roughness: .55 }), gold = metal(0xe2b23c, .3), gl = glass(0xf4fbff, .22);
    const bulb = [[.06, 0], [.14, .08], [.55, .35], [.72, .7], [.66, 1.05], [.4, 1.3], [.1, 1.42], [0, 1.44]];
    put(g, lathe(bulb, gl)); put(g, lathe(bulb, gl), 0, 0, 0, Math.PI);
    const sand = std(0xe6b866, { roughness: .9, emissive: 0x553300, emissiveIntensity: .25 });
    const top = put(g, mesh(new T.ConeGeometry(.52, .62, 32), sand), 0, .45, 0, Math.PI);
    put(g, mesh(new T.ConeGeometry(.6, .5, 32), sand), 0, -1.13);
    const stream = put(g, mesh(new T.CylinderGeometry(.018, .018, 1.25, 6), sand), 0, -.55);
    for (const y of [1.52, -1.52]) { put(g, mesh(new T.CylinderGeometry(1.02, 1.02, .16, 6), wd), 0, y); put(g, mesh(new T.TorusGeometry(.98, .035, 6, 6), gold), 0, y, 0, Math.PI / 2); }
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + .5; rod(g, [Math.cos(a) * .82, -1.45, Math.sin(a) * .82], [Math.cos(a) * .82, 1.45, Math.sin(a) * .82], .065, wd, 10); }
    g.userData.tick = t => { const k = (t * .05) % 1; top.scale.set(1 - k * .5, 1 - k * .5, 1 - k * .5); stream.visible = (t * 8 | 0) % 7 !== 0; };
    return g;
  },
  moon() { // 恆心彎月
    const g = new T.Group();
    put(g, mesh(new T.ExtrudeGeometry(crescent(1.25, .55, .2, 1.02), { depth: .28, bevelEnabled: true, bevelSize: .05, bevelThickness: .06, bevelSegments: 3, curveSegments: 40 }),
      new T.MeshStandardMaterial({ color: 0xe4ecff, metalness: .5, roughness: .2, emissive: 0x3a50a0, emissiveIntensity: .4, envMapIntensity: 1.8 })), 0, 0, -.14);
    const orb = new T.Group(); orb.rotation.set(.5, 0, .25); g.add(orb);
    const sg = new T.ExtrudeGeometry(starShape(.22, .09, 5), { depth: .06, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 1 }), sm = metal(0xf2c94c, .2);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; put(orb, mesh(sg, sm), Math.cos(a) * 1.8, 0, Math.sin(a) * 1.8); }
    put(orb, mesh(new T.TorusGeometry(1.8, .012, 6, 80), additive(0xbfd0ff, .5)), 0, 0, 0, Math.PI / 2);
    put(g, glow(0x9fb8ff, 3.4, .45), -.2, 0, -.4);
    g.userData.tick = t => { orb.rotation.y = t * .5; orb.children.forEach(s => { s.rotation.y = t * 2; }); };
    return g;
  },
  potion() { // 啟明藥劑
    const g = new T.Group();
    put(g, lathe([[0, -1.25], [.5, -1.23], [.9, -.95], [1.02, -.45], [.88, .05], [.4, .38], [.27, .5], [.27, 1.15], [.34, 1.2], [.34, 1.26], [.24, 1.27]], glass(0xeaf6ff, .28)));
    put(g, lathe([[0, -1.16], [.46, -1.14], [.84, -.9], [.94, -.45], [.84, -.05], [0, -.05]], new T.MeshStandardMaterial({ color: 0xc040ff, emissive: 0x8a20e0, emissiveIntensity: .9, transparent: true, opacity: .82, roughness: .2 })));
    put(g, mesh(new T.CircleGeometry(.84, 32), emis(0xe090ff, 1.2)), 0, -.05, 0, -Math.PI / 2);
    put(g, mesh(new T.CylinderGeometry(.25, .2, .42, 16), std(0xb08a5a, { roughness: .9 })), 0, 1.38);
    put(g, mesh(new T.CylinderGeometry(1.035, 1.035, .46, 32, 1, true, -.8, 1.6), std(0xe8d6a8, { side: T.DoubleSide, roughness: .9 })), 0, -.5);
    const bub = [];
    for (let i = 0; i < 7; i++) bub.push(put(g, mesh(new T.SphereGeometry(.05 + (i % 3) * .02, 8, 6), emis(0xffc0ff, 1.5)), Math.cos(i * 2) * .4, -1, Math.sin(i * 2) * .4));
    put(g, glow(0xc060ff, 2.6, .6), 0, -.55);
    g.userData.tick = t => bub.forEach((b, i) => { const k = (t * .4 + i / 7) % 1; b.position.y = -1.05 + k * 1.0; b.scale.setScalar(Math.sin(k * Math.PI) + .2); });
    return g;
  },
  astrolabe() { // 星軌渾天儀
    const g = new T.Group(), gold = metal(0xe2b23c, .25), br = metal(0xb07a3c, .35);
    put(g, mesh(new T.SphereGeometry(.42, 32, 20), new T.MeshStandardMaterial({ color: 0x2a5aa8, emissive: 0x3a7ae0, emissiveIntensity: .8, roughness: .3, metalness: .2 })), 0, .35);
    put(g, glow(0x8fc8ff, 1.9, .7), 0, .35);
    const rings = new T.Group(); rings.position.y = .35; g.add(rings);
    [[1.25, .05, gold, 0, 0], [1.13, .045, br, Math.PI / 2, 0], [1.02, .04, gold, Math.PI / 2, Math.PI / 2], [1.2, .09, br, 1.15, .4]].forEach(([r, tb, m, rx, rz]) => put(rings, mesh(new T.TorusGeometry(r, tb, 10, 80), m), 0, 0, 0, rx, 0, rz));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; put(rings.children[3], mesh(new T.BoxGeometry(.05, .18, .05), gold), Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0); }
    put(g, mesh(new T.TorusGeometry(1.45, .06, 8, 60, Math.PI), br), 0, .35, 0, 0, Math.PI / 2, -Math.PI / 2);
    put(g, lathe([[0, 0], [.9, 0], [.95, .1], [.6, .22], [.18, .4], [.12, .9], [0, .9]], br), 0, -1.95);
    g.userData.tick = t => { rings.rotation.y = t * .35; rings.children[1].rotation.y = t * .8; rings.children[2].rotation.x = t * .6; };
    return g;
  },
  coins() { // 第一桶金
    const g = new T.Group(), gold = metal(0xe2b23c, .25), deep = metal(0xc0901c, .35), cg = new T.CylinderGeometry(.62, .62, .13, 40), rim = new T.TorusGeometry(.62, .035, 8, 40);
    const sg = new T.ExtrudeGeometry(starShape(.36, .15, 8), { depth: .03, bevelEnabled: false });
    const coin = (x, y, z, rx = 0, ry = 0, rz = 0) => { const c = new T.Group(); c.add(mesh(cg, deep)); put(c, mesh(rim, gold), 0, 0, 0, Math.PI / 2); put(c, mesh(sg, gold), 0, .065, 0, -Math.PI / 2); return put(g, c, x, y, z, rx, ry, rz); };
    for (let i = 0; i < 7; i++) coin(Math.sin(i * 1.7) * .06, -1 + i * .135, Math.cos(i * 1.3) * .06, 0, i);
    for (let i = 0; i < 4; i++) coin(1.15 + Math.sin(i) * .05, -1 + i * .135, -.2, 0, i);
    coin(-1.05, -.55, .25, .2, 0, 1.25); coin(.4, -1.05, .9, 0, .5, 0); coin(-.3, -1.05, 1.0, .1, 1, .1);
    put(g, glow(0xffd070, 3, .35), 0, 0);
    return g;
  },
  chest() { // 龍穴寶箱
    const g = new T.Group(), wd = std(0x6a3e1e, { roughness: .75 }), gold = metal(0xe2b23c, .3);
    put(g, mesh(new T.BoxGeometry(2.2, 1.1, 1.3), wd), 0, -.55);
    for (const x of [-.75, .75]) put(g, mesh(new T.BoxGeometry(.14, 1.14, 1.34), gold), x, -.55);
    put(g, mesh(new T.BoxGeometry(2.24, .1, 1.34), gold), 0, -1.05);
    put(g, mesh(new T.BoxGeometry(.32, .38, .06), gold), 0, -.25, .66);
    const lid = new T.Group(); lid.position.set(0, 0, -.65); lid.rotation.x = -1.95; g.add(lid);
    put(lid, mesh(new T.CylinderGeometry(.65, .65, 2.2, 24, 1, false, 0, Math.PI), wd), 0, 0, .65, 0, 0, Math.PI / 2);
    for (const x of [-.75, .75]) put(lid, mesh(new T.CylinderGeometry(.68, .68, .14, 24, 1, false, 0, Math.PI), gold), x, 0, .65, 0, 0, Math.PI / 2);
    put(g, mesh(new T.SphereGeometry(.95, 24, 12), gold), 0, .02, 0).scale.set(1.05, .42, .6);
    const cg = new T.CylinderGeometry(.18, .18, .04, 16);
    for (let i = 0; i < 9; i++) put(g, mesh(cg, gold), Math.cos(i * 2.3) * .7, .3 + (i % 3) * .06, Math.sin(i * 2.3) * .32, i, i * 2, i * .5);
    [[.3, .42, .1, 0xe0304a], [-.45, .4, -.05, 0x3a8aff], [.0, .46, -.2, 0x40e080], [-.1, .38, .3, 0xb060ff]].forEach(([x, y, z, c]) => put(g, mesh(new T.OctahedronGeometry(.13, 0), new T.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: .4, roughness: .05, flatShading: true })), x, y, z));
    put(g, glow(0xffd070, 2.8, .7), 0, .5);
    g.rotation.x = .22; return g;
  },
  cards() { // 命運牌組
    const g = new T.Group(), edge = std(0xe8d6a8), cols = ['#3f73a8', '#b5452f', '#3f8a5c', '#7a56b8', '#b8862f'];
    cols.forEach((col, i) => {
      const tex = ctex(160, 240, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, col); gr.addColorStop(1, '#120a06'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#e9c66a'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16); c.lineWidth = 2; c.strokeRect(16, 16, w - 32, h - 32);
        c.save(); c.translate(w / 2, h / 2); c.fillStyle = '#f3dc9a'; c.beginPath();
        for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r = k % 2 ? 12 : 40 - (k % 4) * 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill();
        c.strokeStyle = '#f3dc9a'; c.beginPath(); c.arc(0, 0, 52, 0, 7); c.stroke(); c.restore();
      });
      const face = std(0xffffff, { map: tex, roughness: .4, metalness: .25 });
      const pv = new T.Group(); pv.rotation.z = (2 - i) * .28; pv.position.z = i * .035; g.add(pv);
      put(pv, mesh(new T.BoxGeometry(1.1, 1.65, .025), [edge, edge, edge, edge, face, face]), 0, .8);
    });
    put(g, glow(0xffd070, 2.6, .3), 0, .9, -.3);
    g.userData.sway = true; return g;
  },
  crystal() { // 遠見水晶球
    const g = new T.Group(), br = metal(0xb07a3c, .35);
    put(g, mesh(new T.SphereGeometry(1, 48, 32), glass(0xdff0ff, .2)), 0, .35);
    const core = put(g, mesh(new T.TorusKnotGeometry(.38, .07, 140, 10, 2, 5), additive(0xb080ff, .85)), 0, .35);
    put(g, mesh(new T.SphereGeometry(.22, 16, 12), emis(0xe8d0ff, 2)), 0, .35);
    put(g, glow(0xa070ff, 2.8, .7), 0, .35);
    put(g, lathe([[0, 0], [.95, 0], [1, .1], [.72, .26], [.45, .42], [.5, .58], [0, .6]], br), 0, -1.25);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; rod(g, [Math.cos(a) * .42, -.7, Math.sin(a) * .42], [Math.cos(a) * .8, -.15, Math.sin(a) * .8], .06, br); rod(g, [Math.cos(a) * .8, -.15, Math.sin(a) * .8], [Math.cos(a) * .7, .25, Math.sin(a) * .7], .05, br); }
    g.userData.tick = t => { core.rotation.y = t * .8; core.rotation.x = t * .5; };
    return g;
  },
  egg() { // 星火龍蛋
    const g = new T.Group(), pts = [];
    for (let k = 0; k <= 32; k++) { const v = -1 + 2 * k / 32; pts.push([Math.sqrt(Math.max(0, 1 - v * v)) * .95 * (1 - .16 * v), v * 1.3]); }
    const tex = ctex(512, 256, (c, w, h) => { c.fillStyle = '#3a0f22'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h + 16; y += 14) for (let x = (y / 14 % 2) * 12; x < w + 24; x += 24) { const gr = c.createRadialGradient(x, y - 4, 1, x, y, 14); gr.addColorStop(0, '#9a2a40'); gr.addColorStop(1, '#2a0814'); c.fillStyle = gr; c.beginPath(); c.arc(x, y, 12, 0, Math.PI); c.fill(); } });
    tex.wrapS = T.RepeatWrapping;
    const cr = ctex(512, 256, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffb060'; c.lineWidth = 2.5; c.shadowColor = '#ff8030'; c.shadowBlur = 8;
      for (let i = 0; i < 6; i++) { let x = Math.random() * w, y = h * (.2 + Math.random() * .6); c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (Math.random() - .3) * 30; y += (Math.random() - .5) * 26; c.lineTo(x, y); } c.stroke(); } });
    put(g, lathe(pts, new T.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 3, emissive: 0xffffff, emissiveMap: cr, emissiveIntensity: 1.6, roughness: .4, metalness: .3 })), 0, .25);
    for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; put(g, mesh(new T.DodecahedronGeometry(.22 + (i % 3) * .07, 0), std(0x5a5048, { flatShading: true, roughness: .9 })), Math.cos(a) * 1.05, -1.05, Math.sin(a) * 1.05, i, i, 0); }
    for (let i = 0; i < 6; i++) put(g, mesh(new T.SphereGeometry(.07, 8, 6), emis(0xff6a20, 2)), Math.cos(i * 1.9) * .6, -1.05, Math.sin(i * 1.9) * .6);
    put(g, glow(0xff6a20, 3.2, .45), 0, .1, -.5);
    return g;
  },
  chalice() { // 犒賞聖杯
    const g = new T.Group(), gold = metal(0xe2b23c, .2); gold.side = T.DoubleSide;
    put(g, lathe([[0, -1.4], [.8, -1.4], [.82, -1.3], [.3, -1.15], [.14, -.9], [.12, -.35], [.22, -.2], [.12, -.05], [.5, .08], [.78, .5], [.86, 1.12], [.8, 1.14], [.72, .56], [.45, .22], [0, .17]], gold, 64));
    put(g, mesh(new T.TorusGeometry(.2, .05, 8, 20), gold), 0, -.62, 0, Math.PI / 2);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, c = i % 2 ? 0xe0304a : 0x3a8aff; put(g, mesh(new T.OctahedronGeometry(.1, 0), new T.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: .5, roughness: .05, flatShading: true })), Math.cos(a) * .66, .5, Math.sin(a) * .66); }
    put(g, mesh(new T.CircleGeometry(.76, 40), emis(0xff7a50, .9, { color: 0x8a1020 })), 0, .9, 0, -Math.PI / 2);
    put(g, glow(0xffc860, 2.6, .6), 0, 1.1);
    return g;
  },
  bottle() { // 思緒瓶
    const g = new T.Group();
    put(g, lathe([[0, -1.3], [.62, -1.28], [.7, -1.1], [.72, .3], [.6, .62], [.24, .92], [.2, 1.3], [.27, 1.36], [.27, 1.42], [0, 1.42]], glass(0xeef8ff, .24)));
    const wisp = (col, ph) => { const c = new T.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => { const a = i * .55 + ph; return new T.Vector3(Math.cos(a) * .44 * (1 - i / 70), -1.15 + i * .05, Math.sin(a) * .44 * (1 - i / 70)); }));
      return put(g, mesh(new T.TubeGeometry(c, 220, .04, 6), additive(col, .8))); };
    const w1 = wisp(0xbfe8ff, 0), w2 = wisp(0xd8c0ff, Math.PI);
    put(g, mesh(new T.CylinderGeometry(.26, .2, .4, 16), std(0xb08a5a, { roughness: .9 })), 0, 1.6);
    put(g, mesh(new T.TorusGeometry(.24, .025, 6, 20), std(0xc8a870)), 0, 1.3, 0, Math.PI / 2);
    put(g, glow(0xbfe0ff, 2.4, .55), 0, -.2);
    g.userData.tick = t => { w1.rotation.y = t * 1.1; w2.rotation.y = -t * .8; };
    return g;
  },
  lantern() { // 心燈提燈
    const g = new T.Group(), iron = metal(0x2e2a28, .45), gold = metal(0xe2b23c, .3);
    put(g, mesh(new T.CylinderGeometry(.85, .95, .22, 6), iron), 0, -1.3);
    put(g, mesh(new T.CylinderGeometry(.82, .82, 1.9, 6, 1, true), glass(0xffd9a0, .22)), 0, -.3);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; rod(g, [Math.sin(a) * .84, -1.22, Math.cos(a) * .84], [Math.sin(a) * .84, .65, Math.cos(a) * .84], .045, iron); }
    put(g, mesh(new T.CylinderGeometry(.95, .85, .16, 6), iron), 0, .7);
    put(g, mesh(new T.ConeGeometry(.9, .75, 6), iron), 0, 1.15);
    put(g, mesh(new T.TorusGeometry(.32, .05, 8, 24), gold), 0, 1.78);
    put(g, mesh(new T.CylinderGeometry(.2, .2, .55, 16), std(0xf4ead0, { roughness: .45 })), 0, -.92);
    const f = put(g, flame(.55), 0, -.64); put(g, glow(0xffb050, 3, .9), 0, -.35);
    g.userData.tick = t => f.scale.set(1 + Math.sin(t * 13) * .06, 1 + Math.sin(t * 9) * .14, 1);
    return g;
  },
  key() { // 專注之鑰
    const g = new T.Group(), k = new T.Group(), gold = metal(0xe2b23c, .22);
    put(k, mesh(new T.TorusGeometry(.56, .09, 12, 40), gold), 0, 1.1);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; put(k, mesh(new T.TorusGeometry(.19, .045, 8, 24), gold), Math.cos(a) * .27, 1.1 + Math.sin(a) * .27); }
    put(k, mesh(new T.OctahedronGeometry(.15, 0), new T.MeshPhysicalMaterial({ color: 0x3a8aff, emissive: 0x3a8aff, emissiveIntensity: .7, roughness: .05, flatShading: true })), 0, 1.1, .05);
    put(k, mesh(new T.CylinderGeometry(.09, .09, 2.3, 16), gold), 0, -.35);
    for (const y of [.42, -.1]) put(k, mesh(new T.TorusGeometry(.12, .04, 8, 20), gold), 0, y, 0, Math.PI / 2);
    put(k, mesh(new T.BoxGeometry(.58, .15, .1), gold), .3, -1.38); put(k, mesh(new T.BoxGeometry(.44, .13, .1), gold), .24, -1.1); put(k, mesh(new T.BoxGeometry(.13, .4, .1), gold), .54, -1.25);
    put(k, glow(0x8fc0ff, 1.4, .6), 0, 1.1, .1);
    k.rotation.z = -.5; g.add(k); return g;
  },
  watch() { // 時光懷錶
    const g = new T.Group(), gold = metal(0xe2b23c, .22), steel = std(0x1a2a5a, { metalness: .6, roughness: .3 });
    const face = ctex(256, 256, (c, w) => { const r = w / 2, gr = c.createRadialGradient(r, r, 10, r, r, r); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#e8dcc0'); c.fillStyle = gr; c.fillRect(0, 0, w, w);
      c.fillStyle = '#2a1a10'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 24px Cinzel, serif';
      ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; c.fillText(n, r + Math.cos(a) * 92, r + Math.sin(a) * 92); });
      for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; c.fillRect(r + Math.cos(a) * 112 - 1, r + Math.sin(a) * 112 - 1, i % 5 ? 2 : 4, i % 5 ? 2 : 4); }
      c.strokeStyle = '#8a6420'; c.lineWidth = 2; c.beginPath(); c.arc(r, r + 46, 22, 0, 7); c.stroke(); });
    put(g, mesh(new T.CylinderGeometry(1, 1, .26, 48), gold), 0, 0, 0, Math.PI / 2);
    put(g, mesh(new T.TorusGeometry(1, .075, 12, 48), gold), 0, 0, .13);
    put(g, mesh(new T.CircleGeometry(.93, 48), std(0xffffff, { map: face, roughness: .4 })), 0, 0, .136);
    const hand = (len, wd) => { const geo = new T.BoxGeometry(wd, len, .02); geo.translate(0, len / 2 - .08, 0); return put(g, mesh(geo, steel), 0, 0, .16); };
    const hh = hand(.5, .07), mh = hand(.76, .045), sh = hand(.8, .018);
    put(g, mesh(new T.SphereGeometry(.95, 32, 12, 0, Math.PI * 2, 0, .5), glass(0xffffff, .15)), 0, 0, -.2, Math.PI / 2).scale.set(1, .35, 1);
    put(g, mesh(new T.CylinderGeometry(.12, .12, .26, 16), gold), 0, 1.13);
    put(g, mesh(new T.TorusGeometry(.26, .05, 8, 24), gold), 0, 1.45);
    for (let i = 0; i < 7; i++) put(g, mesh(new T.TorusGeometry(.09, .025, 6, 14), gold), -.35 - i * .2, 1.55 - i * i * .04, 0, 0, i % 2 ? Math.PI / 2 : 0, .4);
    g.userData.tick = () => { const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = d.getHours() % 12 + m / 60;
      sh.rotation.z = -s / 60 * Math.PI * 2; mh.rotation.z = -m / 60 * Math.PI * 2; hh.rotation.z = -h / 12 * Math.PI * 2; };
    g.userData.sway = true; return g;
  },
  scroll() { // 記憶捲軸
    const g = new T.Group(), s = new T.Group(), wd = std(0x5a3418), gold = metal(0xe2b23c, .3);
    const paper = ctex(256, 384, (c, w, h) => { c.fillStyle = '#efdfb8'; c.fillRect(0, 0, w, h); c.fillStyle = '#972a1b'; c.font = '700 30px serif'; c.textAlign = 'center'; c.fillText('✦ ✦ ✦', w / 2, 46); scribble(c, 24, 80, w - 48, 270, 14); });
    const pg = new T.PlaneGeometry(1.8, 2.6, 1, 30), p = pg.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getY(i) * 1.4) * .12);
    pg.computeVertexNormals(); put(s, mesh(pg, std(0xffffff, { map: paper, side: T.DoubleSide, roughness: .9 })));
    for (const y of [1.36, -1.36]) { put(s, mesh(new T.CylinderGeometry(.15, .15, 2.1, 20), wd), 0, y, Math.sin(y * 1.4) * .12, 0, 0, Math.PI / 2); for (const x of [-1.13, 1.13]) put(s, mesh(new T.SphereGeometry(.13, 12, 10), gold), x, y, Math.sin(y * 1.4) * .12); }
    put(s, mesh(new T.CylinderGeometry(.24, .24, .07, 24), std(0xa3261a, { roughness: .5 })), .45, -.85, .1, Math.PI / 2);
    put(s, mesh(new T.PlaneGeometry(.12, .6), std(0xa3261a, { side: T.DoubleSide })), .38, -1.15, .08, 0, 0, .2);
    put(s, mesh(new T.PlaneGeometry(.12, .6), std(0xa3261a, { side: T.DoubleSide })), .54, -1.15, .08, 0, 0, -.2);
    s.rotation.x = -.2; g.add(s); g.userData.sway = true; return g;
  },
  obelisk() { // 符文石碑
    const g = new T.Group();
    const stoneMap = ctex(128, 512, (c, w, h) => { c.fillStyle = '#4a4a52'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2000; i++) { c.fillStyle = `rgba(${Math.random() < .5 ? 0 : 255},${Math.random() < .5 ? 0 : 255},255,.05)`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
    const runeMap = ctex(128, 512, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 2.4; c.lineCap = 'round'; for (let col = 0; col < 4; col++) for (let y = 40; y < h - 30; y += 34) rune(c, col * 32 + 16, y, 16); });
    put(g, mesh(new T.CylinderGeometry(.42, .62, 3.0, 4, 1), new T.MeshStandardMaterial({ map: stoneMap, emissive: 0x6fe8ff, emissiveMap: runeMap, emissiveIntensity: 1.5, roughness: .85, flatShading: true })), 0, -.2, 0, 0, Math.PI / 4);
    put(g, mesh(new T.ConeGeometry(.42, .5, 4), std(0x55555e, { flatShading: true })), 0, 1.55, 0, 0, Math.PI / 4);
    put(g, mesh(new T.BoxGeometry(1.6, .22, 1.6), std(0x3a3a40)), 0, -1.8); put(g, mesh(new T.BoxGeometry(1.25, .16, 1.25), std(0x46464e)), 0, -1.62);
    const cr = put(g, mesh(new T.OctahedronGeometry(.3, 0), new T.MeshPhysicalMaterial({ color: 0x7ff0ff, emissive: 0x3fd0ff, emissiveIntensity: 1, roughness: .05, flatShading: true })), 0, 2.35); cr.scale.y = 1.6;
    put(g, glow(0x6fe8ff, 2.2, .8), 0, 2.35);
    g.userData.tick = t => { cr.rotation.y = t * 1.5; cr.position.y = 2.35 + Math.sin(t * 2) * .1; };
    return g;
  },
  crown() { // 賢者之冠
    const g = new T.Group(), gold = metal(0xe8b93c, .22); gold.side = T.DoubleSide;
    put(g, mesh(new T.CylinderGeometry(1, 1, .5, 48, 1, true), gold), 0, -.4);
    for (const y of [-.65, -.15]) put(g, mesh(new T.TorusGeometry(1, .06, 8, 48), gold), 0, y, 0, Math.PI / 2);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; put(g, mesh(new T.ConeGeometry(.17, .7, 4), gold), Math.cos(a) * .97, .2, Math.sin(a) * .97); put(g, mesh(new T.SphereGeometry(.07, 10, 8), std(0xf8f4ea, { roughness: .2 })), Math.cos(a) * .97, .58, Math.sin(a) * .97);
      const c = i % 2 ? 0xe0304a : 0x3a6aff; put(g, mesh(new T.SphereGeometry(.1, 12, 8), new T.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: .45, roughness: .05 })), Math.cos(a) * 1.02, -.4, Math.sin(a) * 1.02).scale.set(1, 1, .6); }
    for (const ry of [0, Math.PI / 2]) put(g, mesh(new T.TorusGeometry(.95, .05, 8, 40, Math.PI), gold), 0, -.15, 0, 0, ry, 0);
    put(g, mesh(new T.SphereGeometry(.14, 16, 12), gold), 0, .88); put(g, mesh(new T.BoxGeometry(.06, .34, .06), gold), 0, 1.1); put(g, mesh(new T.BoxGeometry(.22, .06, .06), gold), 0, 1.14);
    put(g, mesh(new T.SphereGeometry(.95, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0x7a1020, { roughness: .9 })), 0, -.15).scale.set(1, .8, 1);
    put(g, glow(0xffd070, 3, .35), 0, 0, -.4);
    return g;
  },
};
const RELIC = new Set(['quill', 'candle', 'wand', 'grimoire', 'brazier', 'hourglass', 'moon', 'potion', 'astrolabe', 'coins', 'chest', 'cards', 'crystal', 'egg', 'chalice', 'bottle', 'lantern', 'key', 'watch', 'scroll', 'obelisk', 'crown']);

function disposeScene(scene) {
  scene.traverse(o => { o.geometry && o.geometry.dispose(); [].concat(o.material || []).forEach(m => { m.map && m.map !== haloTex && m.map.dispose(); m.emissiveMap && m.emissiveMap.dispose(); m.dispose(); }); });
}

export async function mount(el, kind, opts = {}) {
  if (!(await lib()) || !el.isConnected || !build[kind]) return null;
  let r;
  try { r = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
  const w = el.clientWidth || 300, h = el.clientHeight || 300;
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.setSize(w, h);
  r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
  el.appendChild(r.domElement);
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(35, w / h, .1, 100);
  cam.position.set(0, 0, opts.dist || 7.5);
  const pm = new T.PMREMGenerator(r); scene.environment = pm.fromScene(new Room(), .04).texture;
  const key = new T.DirectionalLight(0xfff0cc, 2.2); key.position.set(3, 5, 6); scene.add(key);
  const rim = new T.PointLight(0x4fd0e0, 30); rim.position.set(-4, -1, -3); scene.add(rim);
  const obj = RELIC.has(kind) ? fit(build[kind](opts), 3) : build[kind](opts); scene.add(obj);
  const st = { shake: 0, spin: opts.spin ?? 1, dead: false, scale: 1 }, t0 = performance.now(), base = RELIC.has(kind) ? obj.scale.x : 1;
  function dispose() {
    st.dead = true; pm.dispose(); disposeScene(scene);
    r.dispose(); r.forceContextLoss && r.forceContextLoss(); r.domElement.remove();
  }
  let ang = 0, prev = t0;
  function loop(now) {
    if (st.dead) return;
    if (!el.isConnected) return dispose();
    const t = (now - t0) / 1000, dt = (now - prev) / 1000; prev = now;
    if (kind === 'pack' && st.spin <= 1) obj.rotation.y = Math.sin(t * .9) * .45;
    else if (obj.userData.sway && st.spin <= 1) obj.rotation.y = Math.sin(t * .7) * .6;
    else { ang += dt * st.spin; obj.rotation.y = ang; }
    obj.position.y = Math.sin(t * 1.6) * .1;
    obj.rotation.z = st.shake ? Math.sin(t * 46) * .07 * st.shake : 0;
    obj.scale.setScalar(base * st.scale * (1 + st.shake * .08));
    const sc = obj.userData.spinChild; if (sc) sc.rotation.y = -t * 2.5;
    obj.userData.tick && obj.userData.tick(t);
    r.render(scene, cam); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return {
    dispose,
    // 開包前的震動加速動畫
    charge(ms = 1100) {
      return new Promise(res => {
        const s = performance.now(); st.spin = 1.01;
        (function up() {
          const k = Math.min((performance.now() - s) / ms, 1);
          st.shake = k * 1.6; st.spin = 1.01 + k * k * 22; st.scale = 1 + k * .25;
          k < 1 && !st.dead ? requestAnimationFrame(up) : res();
        })();
      });
    },
  };
}

// 珍寶陳列：用一張全螢幕畫布，把每件珍寶畫進各自的格子（只佔用一個 WebGL）
export async function cabinet(items) {
  if (!items.length || !(await lib()) || !items[0].el.isConnected) return null;
  const cv = document.createElement('canvas'); cv.className = 'relic-cv'; document.body.appendChild(cv);
  let r; try { r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { cv.remove(); return null; }
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.2; r.setClearColor(0, 0);
  const pm = new T.PMREMGenerator(r), env = pm.fromScene(new Room(), .04).texture;
  const shade = new T.MeshStandardMaterial({ color: 0x241810, roughness: .55, metalness: .5, envMapIntensity: .35 });
  const views = items.map((it, i) => {
    const s = new T.Scene(); s.environment = env;
    const key = new T.DirectionalLight(0xfff0cc, 2.2); key.position.set(3, 5, 6); s.add(key);
    const rim = new T.PointLight(it.locked ? 0x806040 : 0x8fd0ff, 22); rim.position.set(-4, 1, -3); s.add(rim);
    const o = fit(build[it.kind]({}), 2.75); s.add(o);
    if (it.locked) { s.overrideMaterial = shade; o.traverse(c => { if (c.isSprite || c.userData.glow || (c.material && c.material.blending === T.AdditiveBlending)) c.visible = false; }); }
    const cam = new T.PerspectiveCamera(30, 1, .1, 50); cam.position.set(0, .4, 6.3); cam.lookAt(0, 0, 0);
    return { s, o, cam, el: it.el, locked: it.locked, ph: i * .7 };
  });
  let dead = false; const t0 = performance.now(), sz = new T.Vector2();
  function dispose() { if (dead) return; dead = true; views.forEach(v => disposeScene(v.s)); shade.dispose(); env.dispose(); pm.dispose(); r.dispose(); r.forceContextLoss && r.forceContextLoss(); cv.remove(); }
  function frame(now) {
    if (dead) return;
    if (!views[0].el.isConnected) return dispose();
    const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight, t = (now - t0) / 1000;
    r.getSize(sz); if (sz.x !== W || sz.y !== H) r.setSize(W, H, false);
    r.setScissorTest(false); r.clear(); r.setScissorTest(true);
    for (const v of views) {
      const b = v.el.getBoundingClientRect(); if (b.bottom < 0 || b.top > H || b.right < 0 || b.left > W || !b.width) continue;
      r.setViewport(b.left, H - b.bottom, b.width, b.height); r.setScissor(b.left, H - b.bottom, b.width, b.height);
      v.o.rotation.y = v.locked ? .5 + Math.sin(t * .4 + v.ph) * .3 : v.o.userData.sway ? Math.sin(t * .7 + v.ph) * .6 : t * .6 + v.ph;
      v.o.position.y = v.locked ? 0 : Math.sin(t * 1.5 + v.ph) * .08;
      if (!v.locked && v.o.userData.tick) v.o.userData.tick(t);
      r.render(v.s, v.cam);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { dispose };
}
