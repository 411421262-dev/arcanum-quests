// 可遊玩的 3D 學院世界：第三人稱操控、咒語、訓練假人、收集物
// api: { color, done:{coins:[],dummies:[],chest:bool}, onCoin(id), onDummy(id), onChest(), toast(html), sound(kind) }
const WORLD_R = 270, COIN_N = 20;

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const smooth = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
export function H(x, z) {
  const r = Math.hypot(x, z), k = smooth((r - 95) / 110);
  return k * (Math.sin(x * .035) * 5 + Math.cos(z * .04 + 1) * 5 + Math.sin((x + z) * .02) * 7 + (r - 95) * .05);
}

export async function openWorld(api) {
  const T = await import('three');
  const touch = matchMedia('(pointer:coarse)').matches;
  const el = document.createElement('div'); el.id = 'world';
  el.innerHTML = `<canvas class="w-cv"></canvas><div class="w-cross"></div>
    <div class="w-top"><div class="w-obj" id="w-obj"></div><button class="btn sm" id="w-exit">✕ 離開世界</button></div>
    <div class="w-target" id="w-target" hidden><span>訓練假人</span><div class="bar"><i></i></div></div>
    <canvas class="w-map" width="150" height="150"></canvas>
    <div class="w-slots">
      <button class="w-slot" data-s="lev" style="--sc:#d8b24a"><em>🪶</em><kbd>Q</kbd><i></i></button>
      <button class="w-slot" data-s="bolt" style="--sc:#5fa8d8"><em>✦</em><kbd>${touch ? '' : '左鍵'}</kbd><i></i></button>
      <button class="w-slot" data-s="jump" style="--sc:#6fbf73"><em>⤒</em><kbd>${touch ? '' : '空白'}</kbd><i></i></button>
      <button class="w-slot" data-s="blast" style="--sc:#d86a5a"><em>🔥</em><kbd>E</kbd><i></i></button>
    </div>
    <div class="w-joy" hidden><i></i></div>
    <div class="w-hint">${touch ? '左半邊拖曳移動・右半邊拖曳轉視角・右下角施放咒語' : '點擊畫面開始　WASD 移動・滑鼠轉視角・Shift 奔跑・空白鍵跳躍<br>左鍵 基礎咒・Q 漂浮咒・E 烈焰咒・Esc 釋放滑鼠'}</div>`;
  document.body.appendChild(el);
  const $ = s => el.querySelector(s), cv = $('.w-cv');

  const R = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.25;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(60, 1, .1, 900);
  { // 黃昏天空漸層
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#060b1a'); gr.addColorStop(.45, '#12303f'); gr.addColorStop(.62, '#2f5a63'); gr.addColorStop(.72, '#7a6a55'); gr.addColorStop(1, '#16252b');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; scene.background = tx;
  }
  scene.fog = new T.FogExp2(0x1d3a44, .0085);
  scene.add(new T.HemisphereLight(0x9fc4dd, 0x1c2a22, 1.5));
  const moon = new T.DirectionalLight(0xcfe0ff, 1.6); moon.position.set(-60, 90, 40); scene.add(moon);

  // ---------- 材質 ----------
  function canvasTex(w, h, draw, rep = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }
  const rr = rng(7);
  const stoneTex = canvasTex(256, 256, g => {
    g.fillStyle = '#5b666b'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) for (let x = -1; x < 4; x++) { const v = 78 + rr() * 34 | 0; g.fillStyle = `rgb(${v},${v + 8},${v + 12})`; g.fillRect(x * 64 + (y % 2) * 32 + 2, y * 32 + 2, 60, 28); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${rr() * .12})`; g.fillRect(rr() * 256, rr() * 256, 2, 2); }
  });
  const cobTex = canvasTex(256, 256, g => {
    g.fillStyle = '#23292b'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { const v = 58 + rr() * 26 | 0; g.fillStyle = `rgb(${v},${v + 4},${v - 4 + rr() * 14 | 0})`; g.fillRect(x * 43 + 2, y * 43 + 2, 39, 39); }
  }, 9);
  const stone = new T.MeshStandardMaterial({ map: stoneTex, roughness: .92 });
  const slate = new T.MeshStandardMaterial({ color: 0x2c4a63, roughness: .7 });
  const wood = new T.MeshStandardMaterial({ color: 0x6a4a2c, roughness: .9 });
  const glow = new T.MeshBasicMaterial({ color: 0xffd58a });
  const gold = new T.MeshStandardMaterial({ color: 0xe2b23c, metalness: .6, roughness: .3, emissive: 0x8a5a00, emissiveIntensity: .7 });

  // ---------- 碰撞體 ----------
  const boxes = [], circles = [];
  function box(w, h, d, x, z, mat = stone, y0 = 0, solid = true) {
    const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv, S = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * S[f][0] / 5, uv.getY(k) * S[f][1] / 5); }
    const m = new T.Mesh(g, mat); m.position.set(x, y0 + h / 2, z); scene.add(m);
    if (solid) boxes.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]); return m;
  }
  function tower(x, z, r, h, roofH) {
    const g = new T.CylinderGeometry(r, r * 1.08, h, 20), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * 6.28 / 5, uv.getY(i) * h / 5);
    const m = new T.Mesh(g, stone); m.position.set(x, h / 2, z); scene.add(m);
    const rim = new T.Mesh(new T.CylinderGeometry(r * 1.15, r, 1.2, 20), stone); rim.position.set(x, h, z); scene.add(rim);
    const roof = new T.Mesh(new T.ConeGeometry(r * 1.25, roofH, 20), slate); roof.position.set(x, h + .6 + roofH / 2, z); scene.add(roof);
    for (let i = 0; i < 4; i++) { const a = i * 1.5708 + .6, w = new T.Mesh(new T.PlaneGeometry(.8, 2.2), glow); w.position.set(x + Math.sin(a) * (r + .06), h * .68, z + Math.cos(a) * (r + .06)); w.rotation.y = a; scene.add(w); }
    circles.push([x, z, r * 1.08]);
  }
  function archShape(w, h) { const s = new T.Shape(), b = h - w * .9; s.moveTo(-w / 2, 0); s.lineTo(-w / 2, b); s.quadraticCurveTo(-w / 2, h * .92, 0, h); s.quadraticCurveTo(w / 2, h * .92, w / 2, b); s.lineTo(w / 2, 0); s.closePath(); return s; }

  // ---------- 地形 ----------
  {
    const g = new T.PlaneGeometry(700, 700, 140, 140); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = H(x, z); p.setY(i, h);
      const n = Math.sin(x * .21) * Math.cos(z * .17) * .5 + .5;
      c.setRGB(.10 + n * .06 + h * .004, .22 + n * .10 + h * .006, .12 + n * .04); col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
    scene.add(new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
    const yard = new T.Mesh(new T.PlaneGeometry(72, 84), new T.MeshStandardMaterial({ map: cobTex, roughness: .95 }));
    yard.rotation.x = -Math.PI / 2; yard.position.set(0, .03, -6); scene.add(yard);
    const path = new T.Mesh(new T.PlaneGeometry(7, 62), new T.MeshStandardMaterial({ color: 0x4a4436, roughness: 1 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, .04, 66); scene.add(path);
    const lake = new T.Mesh(new T.CircleGeometry(22, 48), new T.MeshStandardMaterial({ color: 0x1c4a66, metalness: .7, roughness: .15, transparent: true, opacity: .9 }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(66, .06, 34); scene.add(lake); circles.push([66, 34, 21]);
  }

  // ---------- 城堡 ----------
  box(44, 20, 22, 0, -58);
  { const roof = new T.Mesh(new T.ConeGeometry(1, 1, 4), slate); roof.rotation.y = Math.PI / 4; roof.scale.set(33, 10, 17.5); roof.position.set(0, 25, -58); scene.add(roof); }
  tower(-24, -47, 4.5, 28, 11); tower(24, -47, 4.5, 28, 11); tower(-24, -69, 5, 34, 12); tower(24, -69, 5, 34, 12); tower(0, -74, 6.5, 46, 16);
  { const wg = new T.ShapeGeometry(archShape(1.8, 5.5));
    for (const x of [-16, -11, -6, 6, 11, 16]) for (const y of [3, 11]) { const w = new T.Mesh(wg, glow); w.position.set(x, y, -46.93); scene.add(w); }
    const door = new T.Mesh(new T.ShapeGeometry(archShape(5, 8)), wood); door.position.set(0, 0, -46.92); scene.add(door);
    const frame = new T.Mesh(new T.ShapeGeometry(archShape(6, 9)), slate); frame.position.set(0, 0, -46.95); scene.add(frame); }
  // 庭院圍牆（留出東、西、南三個出口）
  for (const sx of [-1, 1]) { box(1.6, 5, 38, sx * 36, -28); box(1.6, 5, 26, sx * 36, 22); box(2.6, 7, 2.6, sx * 36, -8); box(2.6, 7, 2.6, sx * 36, 8); }
  box(29, 5, 1.6, -21.5, 35); box(29, 5, 1.6, 21.5, 35); box(2.6, 7, 2.6, -6.5, 35); box(2.6, 7, 2.6, 6.5, 35);
  // 提燈
  const lamps = [[-6.5, 35], [6.5, 35], [-36, -8], [-36, 8], [36, -8], [36, 8]];
  for (const [x, z] of lamps) { const b = new T.Mesh(new T.SphereGeometry(.45, 12, 8), glow); b.position.set(x, 7.6, z); scene.add(b); const l = new T.PointLight(0xffb060, 60, 28, 1.8); l.position.set(x, 7.8, z); scene.add(l); }

  // ---------- 樹林 ----------
  {
    const N = 260, r = rng(42), trunk = new T.InstancedMesh(new T.CylinderGeometry(.22, .34, 3, 6), wood, N),
      leaf = new T.InstancedMesh(new T.ConeGeometry(2.1, 5.5, 7), new T.MeshStandardMaterial({ color: 0x1f4a36, roughness: 1, flatShading: true }), N * 2),
      m = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3();
    let n = 0;
    while (n < N) {
      const a = r() * 6.283, d = 48 + r() * 215, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < 46 && z > -90 && z < 44) continue; if (Math.abs(x) < 6 && z > 30 && z < 100) continue; if (Math.hypot(x - 66, z - 34) < 26) continue; if (Math.hypot(x + 120, z - 95) < 16) continue;
      const k = .8 + r() * .9, y = H(x, z);
      m.compose(v.set(x, y + 1.5 * k, z), q, s.set(k, k, k)); trunk.setMatrixAt(n, m);
      m.compose(v.set(x, y + 4.6 * k, z), q, s.set(k, k, k)); leaf.setMatrixAt(n * 2, m);
      m.compose(v.set(x, y + 6.8 * k, z), q, s.set(k * .7, k * .8, k * .7)); leaf.setMatrixAt(n * 2 + 1, m);
      circles.push([x, z, .5 * k]); n++;
    }
    scene.add(trunk, leaf);
  }
  // 立石陣與寶箱
  const chestPos = new T.Vector3(-120, H(-120, 95), 95);
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, x = -120 + Math.cos(a) * 9, z = 95 + Math.sin(a) * 9, st = new T.Mesh(new T.BoxGeometry(1.6, 5 + (i % 3), 1), stone); st.position.set(x, H(x, z) + 2.4, z); st.rotation.y = -a; scene.add(st); circles.push([x, z, 1]); }
  const chest = new T.Group();
  { const b = new T.Mesh(new T.BoxGeometry(1.6, .9, 1), wood); b.position.y = .45; const lid = new T.Mesh(new T.CylinderGeometry(.5, .5, 1.6, 12, 1, false, 0, Math.PI), wood); lid.rotation.z = Math.PI / 2; lid.position.y = .9;
    const band = new T.Mesh(new T.BoxGeometry(.25, 1.45, 1.06), gold); band.position.y = .7; chest.add(b, lid, band); chest.position.copy(chestPos); scene.add(chest);
    if (!api.done.chest) { const l = new T.PointLight(0xffd070, 40, 18); l.position.set(0, 2, 0); chest.add(l); chest.userData.light = l; } }

  // ---------- 星空與螢火 ----------
  { const g = new T.BufferGeometry(), a = new Float32Array(900 * 3), r = rng(3);
    for (let i = 0; i < 900; i++) { const th = r() * 6.283, ph = r() * 1.3, d = 600; a.set([Math.cos(th) * Math.sin(ph + .2) * d, Math.cos(ph + .2) * d * .9 + 20, Math.sin(th) * Math.sin(ph + .2) * d], i * 3); }
    g.setAttribute('position', new T.BufferAttribute(a, 3)); scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: .8 }))); }
  const flies = new T.Points(new T.BufferGeometry(), new T.PointsMaterial({ color: 0xd8ff9a, size: .22, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
  { const a = new Float32Array(260 * 3), r = rng(9); for (let i = 0; i < 260; i++) { const x = (r() - .5) * 320, z = (r() - .5) * 320; a.set([x, H(x, z) + .6 + r() * 3, z], i * 3); } flies.geometry.setAttribute('position', new T.BufferAttribute(a, 3)); flies.userData.base = a.slice(); scene.add(flies); }

  // ---------- 粒子池 ----------
  const PN = 700, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pMax = new Float32Array(PN), pBase = new Float32Array(PN * 3);
  const pGeo = new T.BufferGeometry(); pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new T.BufferAttribute(pCol, 3));
  const dotTex = canvasTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  flies.material.map = dotTex; flies.material.size = .4;
  const parts = new T.Points(pGeo, new T.PointsMaterial({ size: .55, map: dotTex, vertexColors: true, blending: T.AdditiveBlending, depthWrite: false, transparent: true })); parts.frustumCulled = false; scene.add(parts);
  let pi = 0; const tc = new T.Color();
  function puff(p, color, n = 20, speed = 4, life = .7, up = 0) {
    tc.set(color);
    for (let i = 0; i < n; i++) { const k = pi = (pi + 1) % PN, a = Math.random() * 6.283, b = Math.random() * 2 - 1, s = Math.sqrt(1 - b * b) * speed * (.3 + Math.random() * .7);
      pPos.set([p.x, p.y, p.z], k * 3); pVel.set([Math.cos(a) * s, b * speed * .7 + up, Math.sin(a) * s], k * 3); pBase.set([tc.r, tc.g, tc.b], k * 3); pLife[k] = pMax[k] = life * (.5 + Math.random() * .5); }
  }

  // ---------- 玩家 ----------
  const robe = new T.MeshStandardMaterial({ color: 0x1b1d24, roughness: .85 }), skin = new T.MeshStandardMaterial({ color: 0xd9a47c, roughness: .8 }), trim = new T.MeshStandardMaterial({ color: api.color || 0x3f73a8, roughness: .7 });
  const player = new T.Group(), body = new T.Group(); player.add(body);
  const torso = new T.Mesh(new T.CylinderGeometry(.24, .5, 1.25, 10), robe); torso.position.y = .98; body.add(torso);
  const hood = new T.Mesh(new T.TorusGeometry(.2, .09, 8, 14), trim); hood.rotation.x = 1.5708; hood.position.y = 1.58; body.add(hood);
  const head = new T.Mesh(new T.SphereGeometry(.19, 14, 10), skin); head.position.y = 1.8; body.add(head);
  const hair = new T.Mesh(new T.SphereGeometry(.2, 14, 8, 0, 6.283, 0, 1.75), new T.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 1 })); hair.position.set(0, 1.82, -.02); body.add(hair);
  const limb = (x, y, len, mat) => { const p = new T.Group(); p.position.set(x, y, 0); const m = new T.Mesh(new T.CylinderGeometry(.075, .07, len, 6), mat); m.position.y = -len / 2; p.add(m); body.add(p); return p; };
  const armL = limb(-.3, 1.5, .7, robe), armR = limb(.3, 1.5, .7, robe), legL = limb(-.13, .55, .55, robe), legR = limb(.13, .55, .55, robe);
  const wand = new T.Mesh(new T.CylinderGeometry(.012, .02, .42, 5), wood); wand.position.set(0, -.78, .16); wand.rotation.x = 1.3; armR.add(wand);
  const tip = new T.Mesh(new T.SphereGeometry(.035, 6, 6), new T.MeshBasicMaterial({ color: 0xaef0ff })); tip.position.set(0, -.84, .37); armR.add(tip);
  const blob = new T.Mesh(new T.CircleGeometry(.55, 16), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .35, depthWrite: false })); blob.rotation.x = -1.5708; scene.add(blob);
  player.position.set(0, 0, 16); player.rotation.y = Math.PI; scene.add(player);
  const P = { vy: 0, ground: true, castT: 0, moving: 0, walk: 0 };

  // ---------- 訓練假人 ----------
  const dummies = [[-10, -14], [0, -22], [10, -14]].map(([x, z], id) => {
    const g = new T.Group(), mat = new T.MeshStandardMaterial({ color: 0x8a6a45, roughness: .9 });
    const b = new T.Mesh(new T.CylinderGeometry(.34, .26, 1.2, 8), mat); b.position.y = 1.25;
    const h = new T.Mesh(new T.SphereGeometry(.26, 10, 8), mat); h.position.y = 2.12;
    const a = new T.Mesh(new T.BoxGeometry(1.5, .14, .14), mat); a.position.y = 1.62;
    const post = new T.Mesh(new T.CylinderGeometry(.07, .07, .7, 6), wood); post.position.y = .35;
    const sh = new T.Mesh(new T.CircleGeometry(.36, 10), new T.MeshStandardMaterial({ color: 0x2c4a63, metalness: .5, roughness: .4, side: T.DoubleSide })); sh.position.set(0, 1.3, .31);
    g.add(b, h, a, post, sh); g.position.set(x, 0, z); scene.add(g); circles.push([x, z, .5]);
    return { id, g, mat, hp: 6, lev: 0, y: 0, wob: 0, dead: 0, flash: 0 };
  });
  const ring = new T.Mesh(new T.RingGeometry(.75, .9, 32), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, side: T.DoubleSide, depthWrite: false })); ring.rotation.x = -1.5708; ring.visible = false; scene.add(ring);

  // ---------- 金幣 ----------
  const coins = []; {
    const r = rng(2026), geo = new T.CylinderGeometry(.42, .42, .08, 20); geo.rotateX(1.5708);
    const spots = [[0, 4], [-14, 6], [14, 6], [-26, -30], [26, -30], [0, 46]];
    for (let id = 0; id < COIN_N; id++) {
      let x, z; if (id < spots.length) [x, z] = spots[id]; else do { const a = r() * 6.283, d = 50 + r() * 180; x = Math.cos(a) * d; z = Math.sin(a) * d; } while ((Math.abs(x) < 44 && z < 44 && z > -90) || Math.hypot(x - 66, z - 34) < 25);
      if (api.done.coins.includes(id)) continue;
      const m = new T.Mesh(geo, gold); m.position.set(x, H(x, z) + 1.1, z); scene.add(m); coins.push({ id, m, y: m.position.y });
    }
  }

  // ---------- 輸入 ----------
  const keys = {}, joy = { id: null, x: 0, y: 0, ox: 0, oy: 0 }, look = { id: null, x: 0, y: 0 };
  let yaw = 0, pitch = .28, drag = false, alive = true, started = false;
  const locked = () => document.pointerLockElement === cv;
  const off = [], on = (t, e, f, o) => { t.addEventListener(e, f, o); off.push(() => t.removeEventListener(e, f, o)); };
  on(window, 'keydown', e => { if (e.target.matches?.('input,textarea')) return; keys[e.code] = true; if (e.code === 'Space') e.preventDefault(); if (e.code === 'KeyQ') cast('lev'); if (e.code === 'KeyE') cast('blast'); if (e.code === 'KeyF') cast('bolt'); });
  on(window, 'keyup', e => { keys[e.code] = false; });
  on(window, 'blur', () => { for (const k in keys) keys[k] = false; });
  on(cv, 'mousedown', e => { started = true; $('.w-hint').classList.add('off'); if (!locked()) { drag = true; try { const p = cv.requestPointerLock(); p && p.catch && p.catch(() => {}); } catch (x) { /* 不支援時改用拖曳 */ } } else if (e.button === 0) cast('bolt'); });
  on(window, 'mouseup', () => { drag = false; });
  on(window, 'mousemove', e => { if (locked() || drag) { yaw -= e.movementX * .0028; pitch = Math.max(-.25, Math.min(1.2, pitch + e.movementY * .0022)); } });
  on(cv, 'touchstart', e => { e.preventDefault(); started = true; $('.w-hint').classList.add('off');
    for (const t of e.changedTouches) { if (t.clientX < innerWidth * .45 && joy.id === null) { joy.id = t.identifier; joy.ox = t.clientX; joy.oy = t.clientY; const j = $('.w-joy'); j.hidden = false; j.style.left = t.clientX + 'px'; j.style.top = t.clientY + 'px'; } else if (look.id === null) { look.id = t.identifier; look.x = t.clientX; look.y = t.clientY; } } }, { passive: false });
  on(cv, 'touchmove', e => { e.preventDefault();
    for (const t of e.changedTouches) { if (t.identifier === joy.id) { let dx = (t.clientX - joy.ox) / 55, dy = (t.clientY - joy.oy) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } joy.x = dx; joy.y = dy; $('.w-joy i').style.transform = `translate(${dx * 34}px,${dy * 34}px)`; }
      if (t.identifier === look.id) { yaw -= (t.clientX - look.x) * .006; pitch = Math.max(-.25, Math.min(1.2, pitch + (t.clientY - look.y) * .004)); look.x = t.clientX; look.y = t.clientY; } } }, { passive: false });
  const tEnd = e => { for (const t of e.changedTouches) { if (t.identifier === joy.id) { joy.id = null; joy.x = joy.y = 0; $('.w-joy').hidden = true; $('.w-joy i').style.transform = ''; } if (t.identifier === look.id) look.id = null; } };
  on(cv, 'touchend', tEnd); on(cv, 'touchcancel', tEnd);
  el.querySelectorAll('.w-slot').forEach(b => on(b, 'pointerdown', e => { e.preventDefault(); b.dataset.s === 'jump' ? jump() : cast(b.dataset.s); }));
  function resize() { const w = el.clientWidth, h = el.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  on(window, 'resize', resize); resize();

  // ---------- 咒語 ----------
  const CD = { bolt: .38, lev: 6, blast: 4, jump: 0 }, cd = { bolt: 0, lev: 0, blast: 0, jump: 0 }, shots = [];
  const tmp = new T.Vector3(), fwd = new T.Vector3();
  let target = null;
  function wandTip() { return tip.getWorldPosition(new T.Vector3()); }
  function jump() { if (P.ground) { P.vy = 7.5; P.ground = false; } }
  function cast(kind) {
    if (!alive || cd[kind] > 0) return;
    if (kind === 'lev' && !target) return api.toast('漂浮咒需要一個目標，靠近訓練假人試試');
    cd[kind] = CD[kind]; P.castT = .3; api.sound(kind === 'bolt' ? 'flip' : 'cast');
    if (target) player.rotation.y = Math.atan2(target.g.position.x - player.position.x, target.g.position.z - player.position.z);
    else if (kind !== 'lev') player.rotation.y = yaw + Math.PI;
    const from = wandTip();
    if (kind === 'lev') { target.lev = 4.5; puff(target.g.position.clone().setY(1.2), 0xffd860, 40, 3, 1, 2); return; }
    const dir = target ? tmp.copy(target.g.position).setY(target.g.position.y + 1.4).sub(from).normalize().clone() : new T.Vector3(-Math.sin(yaw), .02, -Math.cos(yaw)).normalize();
    const big = kind === 'blast', col = big ? 0xff7a30 : 0x8fe6ff;
    const m = new T.Mesh(new T.SphereGeometry(big ? .3 : .12, 10, 8), new T.MeshBasicMaterial({ color: col })); m.position.copy(from); scene.add(m);
    const l = new T.PointLight(col, big ? 50 : 22, 14); m.add(l);
    shots.push({ m, dir, speed: big ? 26 : 42, life: 1.6, dmg: big ? 3 : 1, col, big });
    puff(from, col, 8, 2, .3);
  }
  function hitDummy(d, s) {
    const dmg = s.dmg * (d.lev > 0 ? 2 : 1); d.hp -= dmg; d.wob = 1; d.flash = .15;
    const p = d.g.position.clone(); p.y += 1.4;
    puff(p, s.col, s.big ? 60 : 22, s.big ? 9 : 5, .7); api.sound('coin');
    if (d.hp <= 0) {
      puff(p, 0xffd860, 90, 10, 1.1, 3); d.dead = 6; d.g.visible = false; d.lev = 0; api.sound('rare');
      if (!api.done.dummies.includes(d.id)) api.onDummy(d.id); else api.toast('假人已被擊倒（今日獎勵已領取）');
      objective();
    }
  }

  // ---------- HUD ----------
  function objective() { $('#w-obj').innerHTML = `◈ 今日探索　金幣 <b>${api.done.coins.length}/${COIN_N}</b>　假人 <b>${api.done.dummies.length}/3</b>　寶箱 <b>${api.done.chest ? 1 : 0}/1</b>`; }
  objective();
  const map = $('.w-map').getContext('2d'), slotI = {}; el.querySelectorAll('.w-slot').forEach(b => slotI[b.dataset.s] = b.querySelector('i'));
  function drawMap() {
    const px = player.position.x, pz = player.position.z, S = 1.15;
    map.clearRect(0, 0, 150, 150); map.save(); map.beginPath(); map.arc(75, 75, 73, 0, 6.283); map.clip();
    map.fillStyle = '#1c2f2a'; map.fillRect(0, 0, 150, 150);
    map.translate(75, 75); map.rotate(yaw); map.scale(S, S); map.translate(-px, -pz);
    map.fillStyle = '#566064'; map.fillRect(-36, -48, 72, 84);
    map.fillStyle = '#2a6a8c'; map.beginPath(); map.arc(66, 34, 22, 0, 6.283); map.fill();
    map.fillStyle = '#aab4b8'; for (const b of boxes) map.fillRect(b[0], b[2], b[1] - b[0], b[3] - b[2]);
    for (const c of circles) if (c[2] > 3 && c[2] < 10) { map.beginPath(); map.arc(c[0], c[1], c[2], 0, 6.283); map.fill(); }
    map.fillStyle = '#f1c75b'; for (const c of coins) { map.beginPath(); map.arc(c.m.position.x, c.m.position.z, 1.6, 0, 6.283); map.fill(); }
    map.fillStyle = '#ff7a6a'; for (const d of dummies) if (!d.dead) { map.beginPath(); map.arc(d.g.position.x, d.g.position.z, 1.6, 0, 6.283); map.fill(); }
    if (!api.done.chest) { map.fillStyle = '#b07cf0'; map.fillRect(chestPos.x - 2.5, chestPos.z - 2.5, 5, 5); }
    map.restore();
    // 寶箱方向指示
    if (!api.done.chest) { const dx = chestPos.x - px, dz = chestPos.z - pz, d = Math.hypot(dx, dz); if (d * S > 70) { const sx = dx * Math.cos(yaw) - dz * Math.sin(yaw), sy = dx * Math.sin(yaw) + dz * Math.cos(yaw), k = 66 / Math.hypot(sx, sy); map.fillStyle = '#b07cf0'; map.beginPath(); map.arc(75 + sx * k, 75 + sy * k, 4, 0, 6.283); map.fill(); } }
    const a = player.rotation.y, fx = Math.sin(a), fz = Math.cos(a), ax = fx * Math.cos(yaw) - fz * Math.sin(yaw), ay = fx * Math.sin(yaw) + fz * Math.cos(yaw); // 玩家箭頭
    map.save(); map.translate(75, 75); map.rotate(Math.atan2(ax, -ay)); map.fillStyle = '#c9a8ff'; map.strokeStyle = '#fff'; map.beginPath(); map.moveTo(0, -8); map.lineTo(6, 7); map.lineTo(0, 3); map.lineTo(-6, 7); map.closePath(); map.fill(); map.stroke(); map.restore();
  }

  // ---------- 主迴圈 ----------
  let last = performance.now(), frame = 0, time = 0;
  function loop(now) {
    if (!alive) return;
    const dt = Math.min((now - last) / 1000, .05); last = now; time += dt; frame++;
    // 移動
    let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x, iz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y;
    if (keys.Space) jump();
    const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
    const sp = (keys.ShiftLeft || keys.ShiftRight || il > .95 && touch ? 9 : 5.5) * Math.min(il, 1);
    const sn = Math.sin(yaw), cs = Math.cos(yaw), mx = (-sn * iz + cs * ix), mz = (-cs * iz - sn * ix), pp = player.position;
    if (il > .05) {
      pp.x += mx / Math.max(il, 1e-3) * sp * dt; pp.z += mz / Math.max(il, 1e-3) * sp * dt;
      if (P.castT <= 0) { let da = Math.atan2(mx, mz) - player.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); player.rotation.y += da * Math.min(1, dt * 12); }
    }
    P.moving += ((il > .05 ? 1 : 0) - P.moving) * Math.min(1, dt * 10); P.walk += dt * sp * 1.7;
    // 碰撞
    for (const b of boxes) { const r = .45; if (pp.x > b[0] - r && pp.x < b[1] + r && pp.z > b[2] - r && pp.z < b[3] + r) { const a = pp.x - (b[0] - r), c = (b[1] + r) - pp.x, d = pp.z - (b[2] - r), e = (b[3] + r) - pp.z, m = Math.min(a, c, d, e); if (m === a) pp.x = b[0] - r; else if (m === c) pp.x = b[1] + r; else if (m === d) pp.z = b[2] - r; else pp.z = b[3] + r; } }
    for (const c of circles) { const dx = pp.x - c[0], dz = pp.z - c[1], d = Math.hypot(dx, dz), r = c[2] + .45; if (d < r && d > 1e-4) { pp.x = c[0] + dx / d * r; pp.z = c[1] + dz / d * r; } }
    const pr = Math.hypot(pp.x, pp.z); if (pr > WORLD_R) { pp.x *= WORLD_R / pr; pp.z *= WORLD_R / pr; }
    const gy = H(pp.x, pp.z); P.vy -= 20 * dt; pp.y += P.vy * dt; if (pp.y <= gy) { pp.y = gy; P.vy = 0; P.ground = true; } else if (pp.y > gy + .05) P.ground = false;
    blob.position.set(pp.x, gy + .05, pp.z);
    // 角色動畫
    const sw = Math.sin(P.walk) * .7 * P.moving; legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw * .7;
    P.castT = Math.max(0, P.castT - dt); armR.rotation.x += ((P.castT > 0 ? -1.9 : sw * .7 - .25) - armR.rotation.x) * Math.min(1, dt * 18);
    body.position.y = Math.abs(Math.sin(P.walk)) * .05 * P.moving; body.rotation.x = P.moving * .08;
    // 鎖定目標
    target = null; let best = 1e9; fwd.set(-sn, 0, -cs);
    for (const d of dummies) { if (d.dead) continue; tmp.copy(d.g.position).sub(pp).setY(0); const dist = tmp.length(); if (dist > 32) continue; const dot = tmp.normalize().dot(fwd); if (dot < .55) continue; const sc = dist * (1.6 - dot); if (sc < best) { best = sc; target = d; } }
    ring.visible = !!target; if (target) { ring.position.set(target.g.position.x, .08, target.g.position.z); ring.rotation.z = time * 2; }
    const th = $('#w-target'); th.hidden = !target; if (target) th.querySelector('i').style.width = Math.max(0, target.hp / 6 * 100) + '%';
    // 假人
    for (const d of dummies) {
      if (d.dead) { d.dead -= dt; if (d.dead <= 0) { d.dead = 0; d.hp = 6; d.g.visible = true; d.y = 0; puff(d.g.position.clone().setY(1), 0xffffff, 20, 3, .5); } continue; }
      d.lev = Math.max(0, d.lev - dt); d.y += ((d.lev > 0 ? 2.6 + Math.sin(time * 3) * .2 : 0) - d.y) * Math.min(1, dt * (d.lev > 0 ? 4 : 7)); d.g.position.y = d.y;
      d.wob *= Math.pow(.02, dt); d.g.rotation.x = Math.sin(time * 22) * .3 * d.wob; d.g.rotation.y += d.lev > 0 ? dt * 1.5 : 0;
      d.flash = Math.max(0, d.flash - dt); d.mat.emissive.setScalar(d.flash > 0 ? .9 : 0);
      if (d.lev > 0 && frame % 4 === 0) puff(d.g.position.clone().setY(d.y + .4), 0xffd860, 2, 1, .6, -1);
    }
    // 投射物
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.m.position.addScaledVector(s.dir, s.speed * dt); s.life -= dt; puff(s.m.position, s.col, s.big ? 3 : 1, .8, .35);
      let gone = s.life <= 0 || s.m.position.y < H(s.m.position.x, s.m.position.z);
      for (const d of dummies) { if (d.dead) continue; tmp.copy(d.g.position).setY(d.g.position.y + 1.4); const rad = s.big ? 2.2 : 1; if (tmp.distanceTo(s.m.position) < rad) { hitDummy(d, s); gone = true; if (!s.big) break; } }
      if (gone) { if (s.life > 0) puff(s.m.position, s.col, 14, 4, .4); scene.remove(s.m); s.m.geometry.dispose(); s.m.material.dispose(); shots.splice(i, 1); }
    }
    // 收集物
    for (let i = coins.length - 1; i >= 0; i--) { const c = coins[i]; c.m.rotation.y += dt * 3; c.m.position.y = c.y + Math.sin(time * 2 + c.id) * .18;
      if (Math.abs(c.m.position.x - pp.x) < 1.5 && Math.abs(c.m.position.z - pp.z) < 1.5 && Math.abs(c.m.position.y - pp.y - 1) < 2.2) { puff(c.m.position, 0xffd860, 30, 5, .7, 2); scene.remove(c.m); coins.splice(i, 1); api.onCoin(c.id); api.sound('coin'); objective(); } }
    if (!api.done.chest && pp.distanceTo(chestPos) < 2.6) { api.onChest(); chest.userData.light && chest.remove(chest.userData.light); puff(chestPos.clone().setY(chestPos.y + 1), 0xb07cf0, 120, 9, 1.4, 4); api.sound('level'); objective(); }
    // 粒子
    for (let k = 0; k < PN; k++) { if (pLife[k] <= 0) continue; pLife[k] -= dt; const j = k * 3, f = Math.max(0, pLife[k] / pMax[k]);
      pVel[j + 1] -= 4 * dt; pPos[j] += pVel[j] * dt; pPos[j + 1] += pVel[j + 1] * dt; pPos[j + 2] += pVel[j + 2] * dt; pCol[j] = pBase[j] * f; pCol[j + 1] = pBase[j + 1] * f; pCol[j + 2] = pBase[j + 2] * f; }
    pGeo.attributes.position.needsUpdate = pGeo.attributes.color.needsUpdate = true;
    { const a = flies.geometry.attributes.position, b = flies.userData.base; for (let i = 0; i < a.count; i++) { a.array[i * 3] = b[i * 3] + Math.sin(time * .6 + i) * 1.2; a.array[i * 3 + 1] = b[i * 3 + 1] + Math.sin(time * .9 + i * 1.7) * .5; } a.needsUpdate = true; }
    // 冷卻
    for (const k in cd) { cd[k] = Math.max(0, cd[k] - dt); if (slotI[k]) slotI[k].style.height = (CD[k] ? cd[k] / CD[k] * 100 : 0) + '%'; }
    // 相機（越肩視角）
    const cp = Math.cos(pitch), dist = 6.2, tx = pp.x + cs * .7, tz = pp.z - sn * .7, ty = pp.y + 1.7;
    let cx = tx + sn * cp * dist, cz = tz + cs * cp * dist, cy = ty + Math.sin(pitch) * dist; cy = Math.max(cy, H(cx, cz) + .5);
    cam.position.set(cx, cy, cz); cam.lookAt(tx, ty, tz);
    R.render(scene, cam); if (frame % 3 === 0) drawMap();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return new Promise(res => {
    on($('#w-exit'), 'click', () => {
      alive = false; off.forEach(f => f()); if (locked()) document.exitPointerLock();
      scene.traverse(o => { o.geometry && o.geometry.dispose(); [].concat(o.material || []).forEach(m => { m.map && m.map.dispose(); m.dispose(); }); });
      scene.background.dispose(); R.dispose(); R.forceContextLoss(); el.remove(); res();
    });
  });
}
