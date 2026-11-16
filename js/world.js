// 可遊玩的 3D 學院世界：模型角色與動畫、咒語戰鬥、敵人、學生與教授、城堡大廳
// api: { color, done:{coins,dummies,chest,kills,prof}, onCoin(id), onDummy(id), onChest(), onKill(), profTalk(id)->string, toast(html), sound(kind) }
// 角色模型：KayKit Adventurers / Skeletons（Kay Lousberg，CC0 授權）
const WORLD_R = 270, COIN_N = 20, HX = 2000, KILL_CAP = 10;
const CDN = 'https://cdn.jsdelivr.net/gh/KayKit-Game-Assets/';
const MODELS = {
  mage: CDN + 'KayKit-Character-Pack-Adventures-1.0@672074b73ba276876a19e8816ecdc5241817ab47/addons/kaykit_character_pack_adventures/Characters/gltf/Mage.glb',
  rogue: CDN + 'KayKit-Character-Pack-Adventures-1.0@672074b73ba276876a19e8816ecdc5241817ab47/addons/kaykit_character_pack_adventures/Characters/gltf/Rogue_Hooded.glb',
  skel: CDN + 'KayKit-Character-Pack-Skeletons-1.0@15b62b9bad122f72926c10fb14d622c73819fa54/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Minion.glb',
};
const HIDE = { mage: ['Spellbook', 'Spellbook_open', '2H_Staff'], prof: ['Spellbook', '1H_Wand', 'Spellbook_open'], rogue: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable'], skel: [] };

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const smooth = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
export function H(x, z) {
  if (x > 1000) return 0; // 室內區域
  const r = Math.hypot(x, z), k = smooth((r - 95) / 110);
  return k * (Math.sin(x * .035) * 5 + Math.cos(z * .04 + 1) * 5 + Math.sin((x + z) * .02) * 7 + (r - 95) * .05);
}
const CAMPS = [[150, -70], [-150, -90], [-120, 95]];

export async function openWorld(api) {
  const T = await import('three');
  const touch = matchMedia('(pointer:coarse)').matches;
  const el = document.createElement('div'); el.id = 'world';
  el.innerHTML = `<canvas class="w-cv"></canvas><div class="w-cross"></div><div class="w-vig"></div>
    <div class="w-top"><div class="w-obj" id="w-obj"></div><button class="btn sm" id="w-exit">✕ 離開世界</button></div>
    <div class="w-target" id="w-target" hidden><span></span><div class="bar"><i></i></div></div>
    <div class="w-zone" id="w-zone"></div>
    <canvas class="w-map" width="150" height="150"></canvas>
    <div class="w-hp"><div class="bar"><i id="w-hp"></i></div></div>
    <button class="w-talk" id="w-talk" hidden>💬 ${touch ? '交談' : '按 T 交談'}</button>
    <div class="w-dlg" id="w-dlg" hidden></div>
    <div class="w-slots">
      <button class="w-slot" data-s="lev" style="--sc:#d8b24a"><em>🪶</em><kbd>Q</kbd><i></i></button>
      <button class="w-slot" data-s="bolt" style="--sc:#5fa8d8"><em>✦</em><kbd>${touch ? '' : '左鍵'}</kbd><i></i></button>
      <button class="w-slot" data-s="jump" style="--sc:#6fbf73"><em>⤒</em><kbd>${touch ? '' : '空白'}</kbd><i></i></button>
      <button class="w-slot" data-s="blast" style="--sc:#d86a5a"><em>🔥</em><kbd>E</kbd><i></i></button>
    </div>
    <div class="w-joy" hidden><i></i></div>
    <div class="w-hint">${touch ? '左半邊拖曳移動・右半邊拖曳轉視角・右下角施放咒語' : '點擊畫面開始　WASD 移動・滑鼠轉視角・Shift 奔跑・空白鍵跳躍<br>左鍵 基礎咒・Q 漂浮咒・E 烈焰咒・T 交談・Esc 釋放滑鼠'}</div>
    <div class="w-fade on" id="w-fade"><span>正在召喚學院的居民⋯</span></div>`;
  document.body.appendChild(el);
  const $ = s => el.querySelector(s), cv = $('.w-cv');

  const R = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.25;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(60, 1, .1, 900);
  let skyTex; { // 黃昏天空漸層
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#060b1a'); gr.addColorStop(.45, '#12303f'); gr.addColorStop(.62, '#2f5a63'); gr.addColorStop(.72, '#7a6a55'); gr.addColorStop(1, '#16252b');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256); skyTex = new T.CanvasTexture(c); skyTex.colorSpace = T.SRGBColorSpace;
  }
  const fogOut = new T.FogExp2(0x1d3a44, .0085), fogHall = new T.FogExp2(0x0b1020, .004), hallBg = new T.Color(0x05070d);
  scene.add(new T.HemisphereLight(0x9fc4dd, 0x1c2a22, 1.5));
  const moon = new T.DirectionalLight(0xcfe0ff, 1.6); moon.position.set(-60, 90, 40); scene.add(moon);
  const outLights = new T.Group(), hallLights = new T.Group(); scene.add(outLights, hallLights);

  // ---------- 材質 ----------
  function canvasTex(w, h, draw, rep = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }
  const rr = rng(7);
  const stoneTex = canvasTex(256, 256, g => {
    g.fillStyle = '#5b666b'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) for (let x = -1; x < 4; x++) { const v = 78 + rr() * 34 | 0; g.fillStyle = `rgb(${v},${v + 8},${v + 12})`; g.fillRect(x * 64 + (y % 2) * 32 + 2, y * 32 + 2, 60, 28); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${rr() * .12})`; g.fillRect(rr() * 256, rr() * 256, 2, 2); }
  });
  const cob = rep => canvasTex(256, 256, g => {
    g.fillStyle = '#23292b'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { const v = 58 + rr() * 26 | 0; g.fillStyle = `rgb(${v},${v + 4},${v - 4 + rr() * 14 | 0})`; g.fillRect(x * 43 + 2, y * 43 + 2, 39, 39); }
  }, rep);
  const bookTex = canvasTex(256, 128, g => {
    g.fillStyle = '#2a1c10'; g.fillRect(0, 0, 256, 128); const cols = ['#7a2c2c', '#2c4a7a', '#2c6a4a', '#6a4a8a', '#8a6a2c', '#3a3a44'];
    for (let row = 0; row < 3; row++) { let x = 4; while (x < 250) { const w = 6 + rr() * 10; g.fillStyle = cols[rr() * cols.length | 0]; g.fillRect(x, row * 42 + 6 + rr() * 6, w, 34); x += w + 1; } }
  });
  const stone = new T.MeshStandardMaterial({ map: stoneTex, roughness: .92 });
  const slate = new T.MeshStandardMaterial({ color: 0x2c4a63, roughness: .7 });
  const wood = new T.MeshStandardMaterial({ color: 0x6a4a2c, roughness: .9 });
  const books = new T.MeshStandardMaterial({ map: bookTex, roughness: .9 });
  const glow = new T.MeshBasicMaterial({ color: 0xffd58a });
  const gold = new T.MeshStandardMaterial({ color: 0xe2b23c, metalness: .6, roughness: .3, emissive: 0x8a5a00, emissiveIntensity: .7 });
  const houseMat = new T.MeshStandardMaterial({ color: api.color || 0x3f73a8, roughness: .8, side: T.DoubleSide });

  // ---------- 碰撞體 ----------
  const boxes = [], circles = [];
  function box(w, h, d, x, z, mat = stone, y0 = 0, solid = true) {
    const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv, S = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    if (mat === stone) for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * S[f][0] / 5, uv.getY(k) * S[f][1] / 5); }
    const m = new T.Mesh(g, mat); m.position.set(x, y0 + h / 2, z); scene.add(m);
    if (solid) boxes.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]); return m;
  }
  function collide(p, r) {
    for (const b of boxes) { if (p.x > b[0] - r && p.x < b[1] + r && p.z > b[2] - r && p.z < b[3] + r) { const a = p.x - (b[0] - r), c = (b[1] + r) - p.x, d = p.z - (b[2] - r), e = (b[3] + r) - p.z, m = Math.min(a, c, d, e); if (m === a) p.x = b[0] - r; else if (m === c) p.x = b[1] + r; else if (m === d) p.z = b[2] - r; else p.z = b[3] + r; } }
    for (const c of circles) { const dx = p.x - c[0], dz = p.z - c[1], d = Math.hypot(dx, dz), q = c[2] + r; if (d < q && d > 1e-4) { p.x = c[0] + dx / d * q; p.z = c[1] + dz / d * q; } }
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
  const plane = (w, d, mat, x, y, z) => { const m = new T.Mesh(new T.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); return m; };

  // ---------- 戶外地形 ----------
  {
    const g = new T.PlaneGeometry(700, 700, 140, 140); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = H(x, z); p.setY(i, h);
      const n = Math.sin(x * .21) * Math.cos(z * .17) * .5 + .5;
      let burn = 0; for (const [cx, cz] of CAMPS.slice(0, 2)) burn = Math.max(burn, 1 - Math.hypot(x - cx, z - cz) / 22);
      burn = Math.max(0, burn);
      c.setRGB(.10 + n * .06 + h * .004 + burn * .08, (.22 + n * .10 + h * .006) * (1 - burn * .6), .12 + n * .04 - burn * .04); col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
    scene.add(new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
    plane(72, 84, new T.MeshStandardMaterial({ map: cob(9), roughness: .95 }), 0, .03, -6);
    plane(7, 62, new T.MeshStandardMaterial({ color: 0x4a4436, roughness: 1 }), 0, .04, 66);
    const lake = new T.Mesh(new T.CircleGeometry(22, 48), new T.MeshStandardMaterial({ color: 0x1c4a66, metalness: .7, roughness: .15, transparent: true, opacity: .9 }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(66, .06, 34); scene.add(lake); circles.push([66, 34, 21]);
  }
  // ---------- 城堡外觀 ----------
  box(44, 20, 22, 0, -58);
  { const roof = new T.Mesh(new T.ConeGeometry(1, 1, 4), slate); roof.rotation.y = Math.PI / 4; roof.scale.set(33, 10, 17.5); roof.position.set(0, 25, -58); scene.add(roof); }
  tower(-24, -47, 4.5, 28, 11); tower(24, -47, 4.5, 28, 11); tower(-24, -69, 5, 34, 12); tower(24, -69, 5, 34, 12); tower(0, -74, 6.5, 46, 16);
  { const wg = new T.ShapeGeometry(archShape(1.8, 5.5));
    for (const x of [-16, -11, -6, 6, 11, 16]) for (const y of [3, 11]) { const w = new T.Mesh(wg, glow); w.position.set(x, y, -46.93); scene.add(w); }
    const door = new T.Mesh(new T.ShapeGeometry(archShape(5, 8)), new T.MeshBasicMaterial({ color: 0xffc070 })); door.position.set(0, 0, -46.9); scene.add(door);
    const frame = new T.Mesh(new T.ShapeGeometry(archShape(6.2, 9.2)), slate); frame.position.set(0, 0, -46.95); scene.add(frame);
    const l = new T.PointLight(0xffb060, 80, 26, 1.8); l.position.set(0, 4, -43); outLights.add(l); }
  for (const sx of [-1, 1]) { box(1.6, 5, 38, sx * 36, -28); box(1.6, 5, 26, sx * 36, 22); box(2.6, 7, 2.6, sx * 36, -8); box(2.6, 7, 2.6, sx * 36, 8); }
  box(29, 5, 1.6, -21.5, 35); box(29, 5, 1.6, 21.5, 35); box(2.6, 7, 2.6, -6.5, 35); box(2.6, 7, 2.6, 6.5, 35);
  for (const [x, z] of [[-6.5, 35], [6.5, 35], [-36, -8], [-36, 8], [36, -8], [36, 8]]) { const b = new T.Mesh(new T.SphereGeometry(.45, 12, 8), glow); b.position.set(x, 7.6, z); scene.add(b); const l = new T.PointLight(0xffb060, 60, 28, 1.8); l.position.set(x, 7.8, z); outLights.add(l); }

  // ---------- 樹林 ----------
  {
    const N = 260, r = rng(42), trunk = new T.InstancedMesh(new T.CylinderGeometry(.22, .34, 3, 6), wood, N),
      leaf = new T.InstancedMesh(new T.ConeGeometry(2.1, 5.5, 7), new T.MeshStandardMaterial({ color: 0x1f4a36, roughness: 1, flatShading: true }), N * 2),
      m = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3();
    let n = 0;
    while (n < N) {
      const a = r() * 6.283, d = 48 + r() * 215, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < 46 && z > -90 && z < 44) continue; if (Math.abs(x) < 6 && z > 30 && z < 100) continue; if (Math.hypot(x - 66, z - 34) < 26) continue;
      if (CAMPS.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 17)) continue;
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
  // 骷髏營地：營火、殘牆、帳篷
  const fires = [];
  for (const [cx, cz] of CAMPS.slice(0, 2)) {
    const y = H(cx, cz), f = new T.Mesh(new T.ConeGeometry(.7, 1.8, 7), new T.MeshBasicMaterial({ color: 0xff8a30 })); f.position.set(cx, y + .9, cz); scene.add(f);
    for (let i = 0; i < 5; i++) { const lg = new T.Mesh(new T.CylinderGeometry(.12, .12, 1.6, 5), wood); lg.position.set(cx, y + .15, cz); lg.rotation.set(1.5708, 0, i * 1.26); scene.add(lg); }
    const l = new T.PointLight(0xff7a30, 160, 40, 1.6); l.position.set(cx, y + 2.2, cz); outLights.add(l); fires.push({ f, l }); circles.push([cx, cz, 1]);
    for (const [dx, dz, w, d] of [[-8, -5, 6, 1.2], [7, -8, 1.2, 7], [9, 6, 5, 1.2]]) { const m = box(w, 2.5 + (dx & 1), d, cx + dx, cz + dz); m.position.y += H(cx + dx, cz + dz) - .3; }
    for (const [dx, dz] of [[-6, 7], [3, 10]]) { const t = new T.Mesh(new T.ConeGeometry(2.6, 3.4, 4), new T.MeshStandardMaterial({ color: 0x4a3a3a, roughness: 1, flatShading: true })); t.position.set(cx + dx, H(cx + dx, cz + dz) + 1.7, cz + dz); t.rotation.y = .6; scene.add(t); circles.push([cx + dx, cz + dz, 2]); }
  }

  // ---------- 星象大廳（城堡內部）----------
  const orrery = new T.Group(), crystals = [];
  {
    plane(30, 72, new T.MeshStandardMaterial({ map: cob(7), roughness: .6, metalness: .2 }), HX, 0, 0);
    plane(4.5, 60, houseMat, HX, .02, 2);
    const ceil = plane(30, 72, new T.MeshStandardMaterial({ color: 0x070b1c, roughness: 1, side: T.BackSide }), HX, 14, 0); ceil.material.side = T.DoubleSide;
    box(1.5, 14, 75, HX - 15.75, 0); box(1.5, 14, 75, HX + 15.75, 0); box(33, 14, 1.5, HX, -36.75);
    box(12.5, 14, 1.5, HX - 9.25, 36.75); box(12.5, 14, 1.5, HX + 9.25, 36.75); box(6, 6, 1.5, HX, 36.75, stone, 8, false);
    const exit = new T.Mesh(new T.PlaneGeometry(6, 8), new T.MeshBasicMaterial({ color: 0x2f5a63 })); exit.position.set(HX, 4, 37.4); exit.rotation.y = Math.PI; scene.add(exit);
    const wg = new T.ShapeGeometry(archShape(2.2, 7));
    for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) {
      const z = -28 + i * 11, w = new T.Mesh(wg, new T.MeshBasicMaterial({ color: 0x8fc4ff })); w.position.set(HX + sx * 14.95, 4, z); w.rotation.y = -sx * Math.PI / 2; scene.add(w);
      const ban = new T.Mesh(new T.PlaneGeometry(1.6, 5), houseMat); ban.position.set(HX + sx * 14.9, 7, z + 5.5); ban.rotation.y = -sx * Math.PI / 2; scene.add(ban);
      if (i % 2 === 0) box(1.2, 4.2, 6, HX + sx * 14.3, z + 5.5, books);
    }
    // 中央星象儀
    const ped = new T.Mesh(new T.CylinderGeometry(1.6, 2, 1, 8), stone); ped.position.set(HX, .5, 0); scene.add(ped); circles.push([HX, 0, 2.1]);
    const sun = new T.Mesh(new T.SphereGeometry(.7, 20, 14), new T.MeshBasicMaterial({ color: 0xffd58a })); orrery.add(sun);
    [1.5, 2.2, 3].forEach((r, i) => { const t = new T.Mesh(new T.TorusGeometry(r, .05, 8, 60), gold); t.rotation.set(i * .9, i * .5, 0); const p = new T.Mesh(new T.SphereGeometry(.16 + i * .05, 10, 8), new T.MeshStandardMaterial({ color: [0x57d0e6, 0xb07cf0, 0x6fbf73][i], emissive: [0x57d0e6, 0xb07cf0, 0x6fbf73][i], emissiveIntensity: .8 })); p.position.x = r; t.add(p); orrery.add(t); });
    orrery.position.set(HX, 4.2, 0); scene.add(orrery);
    const ol = new T.PointLight(0xffd58a, 220, 46, 1.5); ol.position.set(HX, 5, 0); hallLights.add(ol);
    // 講台與書桌
    box(14, .5, 7, HX, -31, stone, 0, false); box(1.4, 1.3, .9, HX, -29, wood, .5);
    for (const sx of [-1, 1]) for (const z of [-14, 12, 24]) { box(5.5, .9, 1.6, HX + sx * 8, z, wood); box(5.5, .45, .7, HX + sx * 8, z + 1.7, wood, 0, false); }
    // 漂浮水晶燈
    const cg = new T.OctahedronGeometry(.3, 0), r = rng(11);
    for (let i = 0; i < 22; i++) { const m = new T.Mesh(cg, new T.MeshBasicMaterial({ color: i % 3 ? 0x9fe8ff : 0xffe0a0 })); m.position.set(HX + (r() - .5) * 24, 7 + r() * 4.5, (r() - .5) * 62); m.scale.y = 1.6; scene.add(m); crystals.push(m); }
    for (const z of [-26, 24]) { const l = new T.PointLight(0x9fd8ff, 150, 42, 1.5); l.position.set(HX, 9, z); hallLights.add(l); }
    // 天花板星點
    const sg = new T.BufferGeometry(), sa = new Float32Array(400 * 3); for (let i = 0; i < 400; i++) sa.set([HX + (r() - .5) * 29, 13.9, (r() - .5) * 71], i * 3);
    sg.setAttribute('position', new T.BufferAttribute(sa, 3)); scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xcfe8ff, size: .12, fog: false })));
  }

  // ---------- 星空與螢火 ----------
  { const g = new T.BufferGeometry(), a = new Float32Array(900 * 3), r = rng(3);
    for (let i = 0; i < 900; i++) { const th = r() * 6.283, ph = r() * 1.3, d = 600; a.set([Math.cos(th) * Math.sin(ph + .2) * d, Math.cos(ph + .2) * d * .9 + 20, Math.sin(th) * Math.sin(ph + .2) * d], i * 3); }
    g.setAttribute('position', new T.BufferAttribute(a, 3)); scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: .8 }))); }
  const dotTex = canvasTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const flies = new T.Points(new T.BufferGeometry(), new T.PointsMaterial({ color: 0xd8ff9a, size: .4, map: dotTex, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
  { const a = new Float32Array(260 * 3), r = rng(9); for (let i = 0; i < 260; i++) { const x = (r() - .5) * 320, z = (r() - .5) * 320; a.set([x, H(x, z) + .6 + r() * 3, z], i * 3); } flies.geometry.setAttribute('position', new T.BufferAttribute(a, 3)); flies.userData.base = a.slice(); scene.add(flies); }

  // ---------- 粒子池 ----------
  const PN = 800, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pMax = new Float32Array(PN), pBase = new Float32Array(PN * 3);
  const pGeo = new T.BufferGeometry(); pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new T.BufferAttribute(pCol, 3));
  const parts = new T.Points(pGeo, new T.PointsMaterial({ size: .55, map: dotTex, vertexColors: true, blending: T.AdditiveBlending, depthWrite: false, transparent: true })); parts.frustumCulled = false; scene.add(parts);
  let pi = 0; const tc = new T.Color();
  function puff(p, color, n = 20, speed = 4, life = .7, up = 0) {
    tc.set(color);
    for (let i = 0; i < n; i++) { const k = pi = (pi + 1) % PN, a = Math.random() * 6.283, b = Math.random() * 2 - 1, s = Math.sqrt(1 - b * b) * speed * (.3 + Math.random() * .7);
      pPos.set([p.x, p.y, p.z], k * 3); pVel.set([Math.cos(a) * s, b * speed * .7 + up, Math.sin(a) * s], k * 3); pBase.set([tc.r, tc.g, tc.b], k * 3); pLife[k] = pMax[k] = life * (.5 + Math.random() * .5); }
  }

  // ---------- 角色模型 ----------
  const lib = {};
  try {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'), SU = await import('three/addons/utils/SkeletonUtils.js'), ld = new GLTFLoader();
    const timeout = new Promise(r => setTimeout(r, 25000));
    await Promise.race([timeout, Promise.allSettled(Object.entries(MODELS).map(async ([k, u]) => { const g = await ld.loadAsync(u); lib[k] = { scene: g.scene, clips: Object.fromEntries(g.animations.map(c => [c.name, c])), clone: SU.clone }; }))]);
  } catch (e) { console.warn('模型載入失敗，改用簡易角色', e); }
  if (!el.isConnected) return;
  const actors = [];
  function label(text, color = '#f3dc9a') { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.font = '600 30px "Noto Serif TC",serif'; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = '#000c'; g.strokeText(text, 128, 42); g.fillStyle = color; g.fillText(text, 128, 42);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(2.6, .65, 1); return s; }
  // 建立角色：有模型時用骨架動畫，否則退回簡易造型
  function actor(kind, o = {}) {
    const root = new T.Group(), L = lib[kind === 'prof' ? 'mage' : kind], a = { root, cur: '', lock: 0, mixer: null, acts: {}, clips: null };
    if (L) {
      const m = L.clone(L.scene); m.scale.setScalar(o.scale || .95); root.add(m);
      m.traverse(n => { if (HIDE[kind].includes(n.name)) n.visible = false; if (n.isMesh) { n.frustumCulled = false; if (o.tint) { n.material = n.material.clone(); n.material.color.set(o.tint); } } });
      a.mixer = new T.AnimationMixer(m); a.clips = L.clips; a.mats = []; if (o.flash) m.traverse(n => { if (n.isMesh) { if (!o.tint) n.material = n.material.clone(); a.mats.push(n.material); } });
    } else {
      const col = o.tint || (kind === 'skel' ? 0xd8d2c0 : 0x1b1d24), mat = new T.MeshStandardMaterial({ color: col, roughness: .85 }); a.mats = [mat];
      const b = new T.Mesh(new T.CylinderGeometry(.24, .5, 1.25, 10), mat); b.position.y = .98; const h = new T.Mesh(new T.SphereGeometry(.2, 12, 8), new T.MeshStandardMaterial({ color: kind === 'skel' ? 0xe8e2d0 : 0xd9a47c })); h.position.y = 1.8; root.add(b, h);
    }
    if (o.name) { const s = label(o.name, o.nameColor); s.position.y = (o.scale || .95) * 2.75; root.add(s); }
    a.play = (n, once = false, fade = .18) => {
      if (!a.mixer || !a.clips[n] || (a.cur === n && !once)) return;
      const act = a.acts[n] || (a.acts[n] = a.mixer.clipAction(a.clips[n]));
      act.reset(); act.setLoop(once ? T.LoopOnce : T.LoopRepeat, Infinity); act.clampWhenFinished = once; act.fadeIn(fade).play();
      if (a.curA && a.curA !== act) a.curA.fadeOut(fade); a.curA = act; a.cur = n;
    };
    a.play('Idle'); scene.add(root); actors.push(a); return a;
  }
  const face = (root, x, z, dt, k = 10) => { let da = Math.atan2(x, z) - root.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); root.rotation.y += da * Math.min(1, dt * k); };

  // ---------- 玩家 ----------
  const pa = actor('mage'), player = pa.root; player.position.set(0, 0, 16); player.rotation.y = Math.PI;
  const blob = new T.Mesh(new T.CircleGeometry(.55, 16), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .35, depthWrite: false })); blob.rotation.x = -1.5708; scene.add(blob);
  const P = { vy: 0, ground: true, hp: 100, hurtAt: -9, dead: 0, door: 0 };

  // ---------- 目標：訓練假人 + 骷髏 ----------
  const targets = [];
  [[-10, -14], [0, -22], [10, -14]].forEach(([x, z], id) => {
    const g = new T.Group(), mat = new T.MeshStandardMaterial({ color: 0x8a6a45, roughness: .9 });
    const b = new T.Mesh(new T.CylinderGeometry(.34, .26, 1.2, 8), mat); b.position.y = 1.25;
    const h = new T.Mesh(new T.SphereGeometry(.26, 10, 8), mat); h.position.y = 2.12;
    const a = new T.Mesh(new T.BoxGeometry(1.5, .14, .14), mat); a.position.y = 1.62;
    const post = new T.Mesh(new T.CylinderGeometry(.07, .07, .7, 6), wood); post.position.y = .35;
    const sh = new T.Mesh(new T.CircleGeometry(.36, 10), new T.MeshStandardMaterial({ color: 0x2c4a63, metalness: .5, roughness: .4, side: T.DoubleSide })); sh.position.set(0, 1.3, .31);
    g.add(b, h, a, post, sh); g.position.set(x, 0, z); scene.add(g); circles.push([x, z, .5]);
    targets.push({ kind: 'dummy', id, name: '訓練假人', root: g, mats: [mat], hp: 6, max: 6, lev: 0, y: 0, wob: 0, dead: 0, flash: 0, ch: 1.4 });
  });
  const er = rng(77);
  const spawnSkel = (cx, cz, big) => {
    const a = er() * 6.283, d = 4 + er() * 6, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    const ac = actor('skel', { scale: big ? 1.5 : 1, tint: big ? 0xff9a8a : null, flash: true, name: big ? '骷髏隊長' : '遊蕩骷髏', nameColor: '#ff9a8a' });
    ac.root.position.set(x, H(x, z), z);
    targets.push({ kind: 'enemy', name: big ? '骷髏隊長' : '遊蕩骷髏', a: ac, root: ac.root, mats: ac.mats, home: new T.Vector3(x, 0, z), goal: new T.Vector3(x, 0, z), big,
      hp: big ? 14 : 5, max: big ? 14 : 5, lev: 0, y: 0, dead: 0, flash: 0, state: 'idle', t: er() * 4, struck: false, ch: big ? 1.4 : .95 });
  };
  for (let i = 0; i < 4; i++) spawnSkel(CAMPS[0][0], CAMPS[0][1], i === 0);
  for (let i = 0; i < 3; i++) spawnSkel(CAMPS[1][0], CAMPS[1][1], false);
  for (let i = 0; i < 2; i++) spawnSkel(CAMPS[2][0] + 14, CAMPS[2][1] - 6, false);
  const ring = new T.Mesh(new T.RingGeometry(.75, .9, 32), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, side: T.DoubleSide, depthWrite: false })); ring.rotation.x = -1.5708; ring.visible = false; scene.add(ring);

  // ---------- 學生與教授 ----------
  const TIPS = ['聽說立石陣那邊藏著寶箱，不過最近有骷髏在附近遊蕩。', '漂浮咒可以讓敵人動彈不得，這時候攻擊傷害會加倍喔。', '東北邊森林裡的營火？那是骷髏的營地，小心那個大隻的隊長。', '我今天的作業還沒寫完⋯你的任務之書清空了嗎？', '城堡大門是開著的，星象大廳的水晶燈晚上特別漂亮。', '先做最難的那件事，剩下的一整天都會輕鬆很多。', '被骷髏打倒也沒關係，會在庭院醒過來的。', '每天來找教授報到，有完成現實任務的話會有獎勵。', '湖邊很適合發呆，但別忘了你答應自己要做的事。', '一次只專心做一件事，這是我學到最有用的咒語。'];
  const npcs = [];
  const npc = (kind, name, zone, pts, o = {}) => {
    const a = actor(kind, { name, nameColor: o.prof ? '#c9a8ff' : '#bfe6ff', tint: o.tint, scale: o.scale });
    a.root.position.set(pts[0][0], H(pts[0][0], pts[0][1]), pts[0][1]); if (o.rot != null) a.root.rotation.y = o.rot;
    npcs.push({ a, name, zone, pts, i: 0, wait: 1 + Math.random() * 3, prof: o.prof, pose: o.pose, rot: o.rot, line: Math.random() * TIPS.length | 0 });
  };
  npc('prof', '葛雷姆教授', 'out', [[-17, -19]], { prof: 'grym', tint: 0xffb0a0, scale: 1.12, rot: 1.2 });
  npc('rogue', '學生 艾琳', 'out', [[-22, 12], [-22, -32], [-5, -38], [-5, 12]]);
  npc('rogue', '學生 諾亞', 'out', [[24, 22], [24, -26], [12, -36]], { tint: 0xa0c8ff });
  npc('mage', '學生 里歐', 'out', [[0, 44], [3, 92], [-3, 60]], { tint: 0xb8ffb8, scale: .88 });
  npc('rogue', '學生 米拉', 'out', [[30, 30]], { tint: 0xffd0f0, rot: -2.2, pose: 'Sit_Floor_Idle' });
  npc('prof', '薇絲珀教授', 'hall', [[HX, -30.5]], { prof: 'vesper', tint: 0xc0b0ff, scale: 1.12, rot: 0 });
  npc('rogue', '學生 芙蕾雅', 'hall', [[HX - 4, 26], [HX - 4, -22], [HX + 4, -22], [HX + 4, 26]], { tint: 0xffe0a0 });
  npc('mage', '學生 歐文', 'hall', [[HX + 11, 5], [HX + 11, -20], [HX + 5, 8]], { tint: 0xa0e8ff, scale: .88 });
  npc('rogue', '學生 希雅', 'hall', [[HX - 11.5, 3]], { rot: 1.57, pose: 'Sit_Floor_Idle' });
  npc('rogue', '學生 凱', 'hall', [[HX + 3.5, 4]], { tint: 0xc8ffc8, rot: -2.4, pose: 'Cheer' });

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

  // ---------- 區域切換 ----------
  let zone = '';
  function setZone(z) {
    zone = z; const hall = z === 'hall';
    scene.fog = hall ? fogHall : fogOut; scene.background = hall ? hallBg : skyTex;
    outLights.visible = !hall; hallLights.visible = hall; moon.intensity = hall ? .5 : 1.6;
    for (const n of npcs) n.a.root.visible = n.zone === z;
    for (const t of targets) if (t.kind === 'enemy') t.root.visible = !hall && t.dead < 22;
    const zt = $('#w-zone'); zt.textContent = hall ? '星象大廳' : '黃昏庭院'; zt.classList.remove('show'); void zt.offsetWidth; zt.classList.add('show');
  }
  const fadeEl = $('#w-fade');
  function travel(to, x, z, rot) {
    P.door = 1.2; fadeEl.querySelector('span').textContent = ''; fadeEl.classList.add('on'); api.sound('buy');
    setTimeout(() => { player.position.set(x, H(x, z), z); player.rotation.y = rot; yaw = rot + Math.PI; setZone(to); fadeEl.classList.remove('on'); }, 380);
  }

  // ---------- 輸入 ----------
  const keys = {}, joy = { id: null, x: 0, y: 0, ox: 0, oy: 0 }, look = { id: null, x: 0, y: 0 };
  let yaw = 0, pitch = .34, drag = false, alive = true;
  const locked = () => document.pointerLockElement === cv;
  const off = [], on = (t, e, f, o) => { t.addEventListener(e, f, o); off.push(() => t.removeEventListener(e, f, o)); };
  on(window, 'keydown', e => { if (e.target.matches?.('input,textarea')) return; keys[e.code] = true; if (e.code === 'Space') e.preventDefault(); if (e.code === 'KeyQ') cast('lev'); if (e.code === 'KeyE') cast('blast'); if (e.code === 'KeyF') cast('bolt'); if (e.code === 'KeyT' || e.code === 'Enter') talk(); });
  on(window, 'keyup', e => { keys[e.code] = false; });
  on(window, 'blur', () => { for (const k in keys) keys[k] = false; });
  on(cv, 'mousedown', e => { $('.w-hint').classList.add('off'); if (!locked()) { drag = true; try { const p = cv.requestPointerLock(); p && p.catch && p.catch(() => {}); } catch (x) { /* 不支援時改用拖曳 */ } } else if (e.button === 0) cast('bolt'); });
  on(window, 'mouseup', () => { drag = false; });
  on(window, 'mousemove', e => { if (locked() || drag) { yaw -= e.movementX * .0028; pitch = Math.max(-.25, Math.min(1.2, pitch + e.movementY * .0022)); } });
  on(cv, 'touchstart', e => { e.preventDefault(); $('.w-hint').classList.add('off');
    for (const t of e.changedTouches) { if (t.clientX < innerWidth * .45 && joy.id === null) { joy.id = t.identifier; joy.ox = t.clientX; joy.oy = t.clientY; const j = $('.w-joy'); j.hidden = false; j.style.left = t.clientX + 'px'; j.style.top = t.clientY + 'px'; } else if (look.id === null) { look.id = t.identifier; look.x = t.clientX; look.y = t.clientY; } } }, { passive: false });
  on(cv, 'touchmove', e => { e.preventDefault();
    for (const t of e.changedTouches) { if (t.identifier === joy.id) { let dx = (t.clientX - joy.ox) / 55, dy = (t.clientY - joy.oy) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } joy.x = dx; joy.y = dy; $('.w-joy i').style.transform = `translate(${dx * 34}px,${dy * 34}px)`; }
      if (t.identifier === look.id) { yaw -= (t.clientX - look.x) * .006; pitch = Math.max(-.25, Math.min(1.2, pitch + (t.clientY - look.y) * .004)); look.x = t.clientX; look.y = t.clientY; } } }, { passive: false });
  const tEnd = e => { for (const t of e.changedTouches) { if (t.identifier === joy.id) { joy.id = null; joy.x = joy.y = 0; $('.w-joy').hidden = true; $('.w-joy i').style.transform = ''; } if (t.identifier === look.id) look.id = null; } };
  on(cv, 'touchend', tEnd); on(cv, 'touchcancel', tEnd);
  el.querySelectorAll('.w-slot').forEach(b => on(b, 'pointerdown', e => { e.preventDefault(); b.dataset.s === 'jump' ? jump() : cast(b.dataset.s); }));
  on($('#w-talk'), 'pointerdown', e => { e.preventDefault(); talk(); }); on($('#w-dlg'), 'pointerdown', () => talk());
  function resize() { const w = el.clientWidth, h = el.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  on(window, 'resize', resize); resize();

  // ---------- 交談 ----------
  let nearNpc = null, dlgT = 0;
  function talk() {
    const d = $('#w-dlg'); if (!d.hidden) { d.hidden = true; dlgT = 0; return; }
    if (!nearNpc || P.dead) return; const n = nearNpc;
    const text = n.prof ? api.profTalk(n.prof) : TIPS[n.line++ % TIPS.length];
    d.innerHTML = `<b>${n.name}</b><p>${text}</p><small>${touch ? '點一下關閉' : '按 T 關閉'}</small>`; d.hidden = false; dlgT = 9;
    if (!n.pose) { n.a.play(n.prof ? 'Interact' : 'Cheer', true); n.a.lock = 1.3; } api.sound('flip'); objective();
  }

  // ---------- 咒語與戰鬥 ----------
  const CD = { bolt: .38, lev: 6, blast: 4, jump: 0 }, cd = { bolt: 0, lev: 0, blast: 0, jump: 0 }, shots = [];
  const tmp = new T.Vector3(), fwd = new T.Vector3();
  let target = null, time = 0;
  const center = t => tmp.copy(t.root.position).setY(t.root.position.y + t.ch);
  function jump() { if (P.ground && !P.dead) { P.vy = 7.5; P.ground = false; pa.play('Jump_Start', true, .1); pa.lock = .3; } }
  function cast(kind) {
    if (!alive || P.dead || cd[kind] > 0) return;
    if (kind === 'lev' && !target) return api.toast('漂浮咒需要一個目標，先面向假人或敵人');
    cd[kind] = CD[kind]; api.sound(kind === 'bolt' ? 'flip' : 'cast');
    if (target) player.rotation.y = Math.atan2(target.root.position.x - player.position.x, target.root.position.z - player.position.z);
    else player.rotation.y = yaw + Math.PI;
    pa.play(kind === 'lev' ? 'Spellcast_Raise' : 'Spellcast_Shoot', true, .08); pa.lock = kind === 'lev' ? .9 : .45;
    const from = new T.Vector3(Math.sin(player.rotation.y) * .7, 1.35, Math.cos(player.rotation.y) * .7).add(player.position);
    if (kind === 'lev') { target.lev = 4.5; puff(center(target), 0xffd860, 40, 3, 1, 2); return; }
    const dir = target ? center(target).sub(from).normalize().clone() : new T.Vector3(-Math.sin(yaw), .02, -Math.cos(yaw)).normalize();
    const big = kind === 'blast', col = big ? 0xff7a30 : 0x8fe6ff;
    const m = new T.Mesh(new T.SphereGeometry(big ? .3 : .12, 10, 8), new T.MeshBasicMaterial({ color: col })); m.position.copy(from); scene.add(m);
    shots.push({ m, dir, speed: big ? 26 : 42, life: 1.6, dmg: big ? 3 : 1, col, big });
    puff(from, col, 8, 2, .3);
  }
  function hit(t, s) {
    t.hp -= s.dmg * (t.lev > 0 ? 2 : 1); t.flash = .15; const p = center(t).clone();
    puff(p, s.col, s.big ? 60 : 22, s.big ? 9 : 5, .7); api.sound('coin');
    if (t.kind === 'dummy') t.wob = 1; else if (t.hp > 0) { t.a.play('Hit_A', true, .05); t.state = 'hurt'; t.t = .35; }
    if (t.hp > 0) return;
    puff(p, 0xffd860, 90, 10, 1.1, 3); t.lev = 0; api.sound('rare');
    if (t.kind === 'dummy') { t.dead = 6; t.root.visible = false; if (!api.done.dummies.includes(t.id)) api.onDummy(t.id); else api.toast('假人已被擊倒（今日獎勵已領取）'); }
    else { t.dead = 26; t.state = 'dead'; t.a.play('Death_A', true, .05); if (api.done.kills < KILL_CAP) api.onKill(t.big); else api.toast('擊倒骷髏（今日討伐獎勵已達上限）'); }
    objective();
  }
  function hurt(n) {
    if (P.dead) return; P.hp -= n; P.hurtAt = time; api.sound('deny'); el.classList.add('hurt'); setTimeout(() => el.classList.remove('hurt'), 250);
    puff(tmp.copy(player.position).setY(player.position.y + 1.2), 0xff4030, 16, 4, .4);
    if (P.hp <= 0) { P.hp = 0; P.dead = 2.6; pa.play('Death_A', true, .05); pa.lock = 9; api.toast('你昏倒了⋯'); fadeEl.querySelector('span').textContent = '你被送回了庭院'; setTimeout(() => fadeEl.classList.add('on'), 1500); }
    else if (pa.lock <= 0) { pa.play('Hit_A', true, .05); pa.lock = .3; }
  }

  // ---------- HUD ----------
  function objective() { const d = api.done; $('#w-obj').innerHTML = `◈ 今日探索　金幣 <b>${d.coins.length}/${COIN_N}</b>　假人 <b>${d.dummies.length}/3</b>　骷髏 <b>${Math.min(d.kills, KILL_CAP)}/${KILL_CAP}</b>　寶箱 <b>${d.chest ? 1 : 0}/1</b>　教授 <b>${d.prof.length}/2</b>`; }
  objective();
  const map = $('.w-map').getContext('2d'), slotI = {}; el.querySelectorAll('.w-slot').forEach(b => slotI[b.dataset.s] = b.querySelector('i'));
  const dot = (x, z, r, c) => { map.fillStyle = c; map.beginPath(); map.arc(x, z, r, 0, 6.283); map.fill(); };
  function drawMap() {
    const px = player.position.x, pz = player.position.z, hall = zone === 'hall', S = hall ? 1.9 : 1.15;
    map.clearRect(0, 0, 150, 150); map.save(); map.beginPath(); map.arc(75, 75, 73, 0, 6.283); map.clip();
    map.fillStyle = hall ? '#0d1220' : '#1c2f2a'; map.fillRect(0, 0, 150, 150);
    map.translate(75, 75); map.rotate(yaw); map.scale(S, S); map.translate(-px, -pz);
    if (hall) { map.fillStyle = '#39414f'; map.fillRect(HX - 15, -36, 30, 72); dot(HX, 0, 2, '#ffd58a'); map.fillStyle = '#6fe0c0'; map.fillRect(HX - 3, 35, 6, 2); }
    else { map.fillStyle = '#566064'; map.fillRect(-36, -48, 72, 84); dot(66, 34, 22, '#2a6a8c'); for (const [cx, cz] of CAMPS.slice(0, 2)) dot(cx, cz, 3, '#ff8a30'); }
    map.fillStyle = '#aab4b8'; for (const b of boxes) if (Math.abs(b[0] - px) < 90) map.fillRect(b[0], b[2], b[1] - b[0], b[3] - b[2]);
    if (!hall) { for (const c of circles) if (c[2] > 3 && c[2] < 10) dot(c[0], c[1], c[2], '#aab4b8'); map.fillStyle = '#6fe0c0'; map.fillRect(-3, -47.5, 6, 2.5);
      for (const c of coins) dot(c.m.position.x, c.m.position.z, 1.6, '#f1c75b');
      for (const t of targets) if (!t.dead) dot(t.root.position.x, t.root.position.z, t.big ? 2.6 : 1.7, '#ff6a5a');
      if (!api.done.chest) { map.fillStyle = '#b07cf0'; map.fillRect(chestPos.x - 2.5, chestPos.z - 2.5, 5, 5); } }
    for (const n of npcs) if (n.zone === zone) dot(n.a.root.position.x, n.a.root.position.z, hall ? 1 : 1.6, n.prof ? '#c9a8ff' : '#8fd8ff');
    map.restore();
    const edge = (x, z, c) => { const dx = x - px, dz = z - pz; if (Math.hypot(dx, dz) * S > 70) { const sx = dx * Math.cos(yaw) - dz * Math.sin(yaw), sy = dx * Math.sin(yaw) + dz * Math.cos(yaw), k = 66 / Math.hypot(sx, sy); map.fillStyle = c; map.beginPath(); map.arc(75 + sx * k, 75 + sy * k, 4, 0, 6.283); map.fill(); } };
    if (!hall) { if (!api.done.chest) edge(chestPos.x, chestPos.z, '#b07cf0'); edge(CAMPS[0][0], CAMPS[0][1], '#ff6a5a'); edge(0, -47, '#6fe0c0'); }
    const a = player.rotation.y, fx = Math.sin(a), fz = Math.cos(a), ax = fx * Math.cos(yaw) - fz * Math.sin(yaw), ay = fx * Math.sin(yaw) + fz * Math.cos(yaw);
    map.save(); map.translate(75, 75); map.rotate(Math.atan2(ax, -ay)); map.fillStyle = '#c9a8ff'; map.strokeStyle = '#fff'; map.beginPath(); map.moveTo(0, -8); map.lineTo(6, 7); map.lineTo(0, 3); map.lineTo(-6, 7); map.closePath(); map.fill(); map.stroke(); map.restore();
  }

  // ---------- 敵人 AI ----------
  function enemyAI(t, dt, pp) {
    const a = t.a, r = t.root, rp = r.position;
    if (t.state === 'dead') { t.dead -= dt; if (t.dead < 22) r.visible = false; if (t.dead <= 0) { t.dead = 0; t.hp = t.max; t.state = 'idle'; rp.copy(t.home); r.visible = zone === 'out'; a.play('Spawn_Ground', true, 0); a.lock = 1.2; } return; }
    t.flash = Math.max(0, t.flash - dt); for (const m of t.mats) m.emissive && m.emissive.setScalar(t.flash > 0 ? .8 : 0);
    t.lev = Math.max(0, t.lev - dt); t.y += ((t.lev > 0 ? 2.4 + Math.sin(time * 3) * .2 : 0) - t.y) * Math.min(1, dt * (t.lev > 0 ? 4 : 7));
    const gy = H(rp.x, rp.z); rp.y = gy + t.y; a.lock = Math.max(0, a.lock - dt);
    if (t.lev > 0) { a.play('Jump_Idle'); r.rotation.y += dt * 1.5; if ((time * 15 | 0) % 4 === 0) puff(tmp.copy(rp), 0xffd860, 1, 1, .6, -1); return; }
    const dx = pp.x - rp.x, dz = pp.z - rp.z, d = Math.hypot(dx, dz), sees = !P.dead && zone === 'out' && d < 20 && Math.hypot(rp.x - t.home.x, rp.z - t.home.z) < 55;
    if (t.state === 'hurt') { t.t -= dt; if (t.t <= 0) t.state = 'chase'; return; }
    if (t.state === 'attack') {
      t.t -= dt; face(r, dx, dz, dt, 6);
      if (!t.struck && t.t < .6) { t.struck = true; if (d < (t.big ? 3 : 2.3) && Math.abs(pp.y - rp.y) < 2) hurt(t.big ? 22 : 12); }
      if (t.t <= 0) t.state = 'chase'; return;
    }
    if (a.lock > 0) return;
    if (sees) {
      if (t.state !== 'chase') { t.state = 'chase'; a.play('Taunt', true); a.lock = .8; return; }
      face(r, dx, dz, dt);
      if (d < (t.big ? 2.4 : 1.7)) { t.state = 'attack'; t.t = 1.1; t.struck = false; a.play(t.big ? '2H_Melee_Attack_Chop' : '1H_Melee_Attack_Chop', true, .1); return; }
      const sp = t.big ? 3 : 3.9; rp.x += dx / d * sp * dt; rp.z += dz / d * sp * dt; collide(rp, .4); a.play('Running_A');
    } else {
      t.state = 'idle'; t.t -= dt; const gx = t.goal.x - rp.x, gz = t.goal.z - rp.z, gd = Math.hypot(gx, gz);
      if (gd > .5) { face(r, gx, gz, dt, 5); rp.x += gx / gd * 1.3 * dt; rp.z += gz / gd * 1.3 * dt; collide(rp, .4); a.play('Walking_D_Skeletons'); }
      else { a.play('Idle'); if (t.t <= 0) { t.t = 3 + Math.random() * 5; const an = Math.random() * 6.283, rd = Math.random() * 8; t.goal.set(t.home.x + Math.cos(an) * rd, 0, t.home.z + Math.sin(an) * rd); } }
    }
  }

  // ---------- 主迴圈 ----------
  let last = performance.now(), frame = 0;
  function loop(now) {
    if (!alive) return;
    const dt = Math.min((now - last) / 1000, .05); last = now; time += dt; frame++;
    const pp = player.position, hall = zone === 'hall';
    // 移動
    let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x, iz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y;
    if (P.dead) ix = iz = 0; else if (keys.Space) jump();
    const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
    const run = keys.ShiftLeft || keys.ShiftRight || (il > .95 && touch), sp = (run ? 9 : 5.5) * Math.min(il, 1);
    const sn = Math.sin(yaw), cs = Math.cos(yaw), mx = (-sn * iz + cs * ix), mz = (-cs * iz - sn * ix);
    if (il > .05) { pp.x += mx / Math.max(il, 1e-3) * sp * dt; pp.z += mz / Math.max(il, 1e-3) * sp * dt; if (pa.lock <= 0) face(player, mx, mz, dt, 12); }
    collide(pp, .45);
    if (!hall) { const pr = Math.hypot(pp.x, pp.z); if (pr > WORLD_R) { pp.x *= WORLD_R / pr; pp.z *= WORLD_R / pr; } }
    const gy = H(pp.x, pp.z); P.vy -= 20 * dt; pp.y += P.vy * dt; if (pp.y <= gy) { pp.y = gy; P.vy = 0; P.ground = true; } else if (pp.y > gy + .05) P.ground = false;
    blob.position.set(pp.x, gy + .05, pp.z);
    pa.lock = Math.max(0, pa.lock - dt);
    if (pa.lock <= 0 && !P.dead) pa.play(!P.ground ? 'Jump_Idle' : il > .05 ? (run ? 'Running_A' : 'Walking_A') : 'Idle');
    // 城堡大門
    P.door = Math.max(0, P.door - dt);
    if (!P.door && !P.dead) { if (!hall && Math.abs(pp.x) < 2.4 && pp.z < -45.9 && pp.z > -48) travel('hall', HX, 33, Math.PI); else if (hall && Math.abs(pp.x - HX) < 2.8 && pp.z > 35.4) travel('out', 0, -43.5, 0); }
    // 生命值
    if (P.dead) { P.dead -= dt; if (P.dead <= 0) { P.dead = 0; P.hp = 100; pa.lock = 0; pa.cur = ''; player.position.set(0, 0, 16); player.rotation.y = Math.PI; yaw = 0; setZone('out'); fadeEl.classList.remove('on'); } }
    else if (time - P.hurtAt > 5) P.hp = Math.min(100, P.hp + 6 * dt);
    $('#w-hp').style.width = P.hp + '%';
    // 鎖定目標
    target = null; let best = 1e9; fwd.set(-sn, 0, -cs);
    if (!hall) for (const t of targets) { if (t.dead) continue; tmp.copy(t.root.position).sub(pp).setY(0); const dist = tmp.length(); if (dist > 32) continue; const dotp = tmp.normalize().dot(fwd); if (dotp < .55) continue; const sc = dist * (1.6 - dotp); if (sc < best) { best = sc; target = t; } }
    ring.visible = !!target; if (target) { ring.position.set(target.root.position.x, H(target.root.position.x, target.root.position.z) + .08, target.root.position.z); ring.rotation.z = time * 2; ring.scale.setScalar(target.big ? 1.6 : 1); }
    const th = $('#w-target'); th.hidden = !target; if (target) { th.firstElementChild.textContent = target.name; th.querySelector('i').style.width = Math.max(0, target.hp / target.max * 100) + '%'; }
    // 假人與敵人
    if (!hall) for (const t of targets) {
      if (t.kind === 'enemy') { if (Math.abs(t.root.position.x - pp.x) < 110 && Math.abs(t.root.position.z - pp.z) < 110 || t.state === 'dead') enemyAI(t, dt, pp); continue; }
      if (t.dead) { t.dead -= dt; if (t.dead <= 0) { t.dead = 0; t.hp = t.max; t.root.visible = true; t.y = 0; puff(tmp.copy(t.root.position).setY(1), 0xffffff, 20, 3, .5); } continue; }
      t.lev = Math.max(0, t.lev - dt); t.y += ((t.lev > 0 ? 2.6 + Math.sin(time * 3) * .2 : 0) - t.y) * Math.min(1, dt * (t.lev > 0 ? 4 : 7)); t.root.position.y = t.y;
      t.wob *= Math.pow(.02, dt); t.root.rotation.x = Math.sin(time * 22) * .3 * t.wob; t.root.rotation.y += t.lev > 0 ? dt * 1.5 : 0;
      t.flash = Math.max(0, t.flash - dt); t.mats[0].emissive.setScalar(t.flash > 0 ? .9 : 0);
      if (t.lev > 0 && frame % 4 === 0) puff(tmp.copy(t.root.position).setY(t.y + .4), 0xffd860, 2, 1, .6, -1);
    }
    // 學生與教授
    nearNpc = null; let nd = 3.4;
    for (const n of npcs) {
      if (n.zone !== zone) continue; const r = n.a.root, rp = r.position, dx = pp.x - rp.x, dz = pp.z - rp.z, d = Math.hypot(dx, dz);
      if (d < nd) { nd = d; nearNpc = n; } n.a.lock = Math.max(0, n.a.lock - dt);
      if (n.pose) { n.a.play(n.pose); continue; }
      if (d < 3.4) { face(r, dx, dz, dt, 6); if (n.a.lock <= 0) n.a.play('Idle'); continue; }
      if (n.pts.length < 2) { if (n.rot != null) face(r, Math.sin(n.rot), Math.cos(n.rot), dt, 3); if (n.a.lock <= 0) n.a.play('Idle'); continue; }
      const g = n.pts[n.i], gx = g[0] - rp.x, gz = g[1] - rp.z, gd = Math.hypot(gx, gz);
      if (gd < .4) { n.wait -= dt; n.a.play('Idle'); if (n.wait <= 0) { n.i = (n.i + 1) % n.pts.length; n.wait = 1.5 + Math.random() * 4; } }
      else { face(r, gx, gz, dt, 5); rp.x += gx / gd * 1.5 * dt; rp.z += gz / gd * 1.5 * dt; rp.y = H(rp.x, rp.z); n.a.play('Walking_A'); }
    }
    $('#w-talk').hidden = !nearNpc || !$('#w-dlg').hidden; if (dlgT > 0) { dlgT -= dt; if (dlgT <= 0 || !nearNpc) $('#w-dlg').hidden = true; }
    // 動畫更新（只更新附近的角色）
    for (const a of actors) if (a.mixer && a.root.visible && Math.abs(a.root.position.x - pp.x) < 90 && Math.abs(a.root.position.z - pp.z) < 90) a.mixer.update(dt);
    // 投射物
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.m.position.addScaledVector(s.dir, s.speed * dt); s.life -= dt; puff(s.m.position, s.col, s.big ? 3 : 1, .8, .35);
      let gone = s.life <= 0 || s.m.position.y < H(s.m.position.x, s.m.position.z);
      if (!hall) for (const t of targets) { if (t.dead) continue; if (center(t).distanceTo(s.m.position) < (s.big ? 2.4 : 1.1)) { hit(t, s); gone = true; if (!s.big) break; } }
      if (gone) { if (s.life > 0) puff(s.m.position, s.col, 14, 4, .4); scene.remove(s.m); s.m.geometry.dispose(); s.m.material.dispose(); shots.splice(i, 1); }
    }
    // 收集物
    if (!hall) {
      for (let i = coins.length - 1; i >= 0; i--) { const c = coins[i]; c.m.rotation.y += dt * 3; c.m.position.y = c.y + Math.sin(time * 2 + c.id) * .18;
        if (Math.abs(c.m.position.x - pp.x) < 1.5 && Math.abs(c.m.position.z - pp.z) < 1.5 && Math.abs(c.m.position.y - pp.y - 1) < 2.2) { puff(c.m.position, 0xffd860, 30, 5, .7, 2); scene.remove(c.m); coins.splice(i, 1); api.onCoin(c.id); api.sound('coin'); objective(); } }
      if (!api.done.chest && pp.distanceTo(chestPos) < 2.6) { api.onChest(); chest.userData.light && chest.remove(chest.userData.light); puff(chestPos.clone().setY(chestPos.y + 1), 0xb07cf0, 120, 9, 1.4, 4); api.sound('level'); objective(); }
      for (const f of fires) { f.f.scale.set(1 + Math.sin(time * 13) * .12, 1 + Math.sin(time * 9) * .2, 1 + Math.cos(time * 11) * .12); f.l.intensity = 150 + Math.sin(time * 17) * 30; if (frame % 3 === 0 && Math.abs(f.f.position.x - pp.x) < 60) puff(f.f.position, 0xff8a30, 1, .6, 1, 2.5); }
      const a = flies.geometry.attributes.position, b = flies.userData.base; for (let i = 0; i < a.count; i++) { a.array[i * 3] = b[i * 3] + Math.sin(time * .6 + i) * 1.2; a.array[i * 3 + 1] = b[i * 3 + 1] + Math.sin(time * .9 + i * 1.7) * .5; } a.needsUpdate = true;
    } else {
      orrery.children.forEach((c, i) => { if (i) { c.rotation.z += dt * (.9 - i * .2); c.rotation.x += dt * .1; } });
      crystals.forEach((c, i) => { c.rotation.y += dt; c.position.y += Math.sin(time * 1.3 + i) * dt * .25; });
    }
    // 粒子
    for (let k = 0; k < PN; k++) { if (pLife[k] <= 0) continue; pLife[k] -= dt; const j = k * 3, f = Math.max(0, pLife[k] / pMax[k]);
      pVel[j + 1] -= 4 * dt; pPos[j] += pVel[j] * dt; pPos[j + 1] += pVel[j + 1] * dt; pPos[j + 2] += pVel[j + 2] * dt; pCol[j] = pBase[j] * f; pCol[j + 1] = pBase[j + 1] * f; pCol[j + 2] = pBase[j + 2] * f; }
    pGeo.attributes.position.needsUpdate = pGeo.attributes.color.needsUpdate = true;
    for (const k in cd) { cd[k] = Math.max(0, cd[k] - dt); if (slotI[k]) slotI[k].style.height = (CD[k] ? cd[k] / CD[k] * 100 : 0) + '%'; }
    // 相機（越肩視角）
    const cp = Math.cos(pitch), dist = hall ? 6.4 : 7.6, tx = pp.x + cs * .9, tz = pp.z - sn * .9, ty = pp.y + 2.35;
    let cx = tx + sn * cp * dist, cz = tz + cs * cp * dist, cy = ty + Math.sin(pitch) * dist;
    if (hall) { cx = Math.max(HX - 14.5, Math.min(HX + 14.5, cx)); cz = Math.max(-35.5, Math.min(35.5, cz)); cy = Math.min(13, Math.max(.5, cy)); } else cy = Math.max(cy, H(cx, cz) + .5);
    cam.position.set(cx, cy, cz); cam.lookAt(tx, ty, tz);
    R.render(scene, cam); if (frame % 3 === 0) drawMap();
    requestAnimationFrame(loop);
  }
  el.debug = { travel, player, hurt }; // 測試用
  setZone('out'); fadeEl.classList.remove('on');
  if (!lib.mage) api.toast('角色模型載入失敗，暫時使用簡易造型（請確認網路連線）', 4000);
  requestAnimationFrame(loop);

  return new Promise(res => {
    on($('#w-exit'), 'click', () => {
      alive = false; off.forEach(f => f()); if (locked()) document.exitPointerLock();
      scene.traverse(o => { o.geometry && o.geometry.dispose(); [].concat(o.material || []).forEach(m => { m.map && m.map.dispose(); m.dispose(); }); });
      skyTex.dispose(); R.dispose(); R.forceContextLoss(); el.remove(); res();
    });
  });
}
