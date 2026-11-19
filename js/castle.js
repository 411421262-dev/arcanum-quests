// 湖畔懸崖上的大城堡：入口大廳、大禮堂、主塔、鐘樓、觀星塔、塔群、中庭、木廊橋、湖心守望塔與船屋
// 以經典魔法學院城堡的元素為靈感（哥德式塔群、湖畔懸崖），配置與造型為原創
export const LAKE = { x: 0, z: -240, rx: 230, rz: 92, y: -18 };
export const ISLAND = [66, -219];
export const lakeK = (x, z) => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);

export function buildCastle(T, o) {
  const { scene, boxes, circles, roofs, stone, cobble, H, merge, env, houses, rng } = o;
  const R = rng(91);
  const cv = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; };

  // ---------- 材質 ----------
  const slateTex = cv(256, 256, (g, w, h) => {
    g.fillStyle = '#1e262e'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 8; row++) for (let i = -1; i < 9; i++) {
      const x = i * 32 + (row % 2) * 16, y = row * 32, v = 70 + R() * 55 | 0;
      g.fillStyle = `rgb(${v * .6 | 0},${v * .72 | 0},${v * .86 | 0})`; g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + 31, y); g.lineTo(x + 31, y + 22); g.quadraticCurveTo(x + 16, y + 35, x + 1, y + 22); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.5; g.stroke();
    }
  });
  const slate = new T.MeshStandardMaterial({ map: slateTex, color: 0xb4c0d0, roughness: .5, metalness: .3, envMap: env, envMapIntensity: .7, side: T.DoubleSide }); slate.userData.uv = 3;
  const trim = stone.clone(); trim.color = new T.Color(0xf4ead8); trim.userData.uv = 4; stone.userData.uv = 4;
  const winLit = new T.MeshBasicMaterial({ color: new T.Color(2.1, 1.25, .5) });
  const winDark = new T.MeshStandardMaterial({ color: 0x0c1424, roughness: .12, metalness: .75, envMap: env, envMapIntensity: 1.3 });
  const wood = new T.MeshStandardMaterial({ color: 0x4e3220, roughness: .85 }); wood.userData.uv = 2;
  const gold = new T.MeshStandardMaterial({ color: 0xd8a840, metalness: .85, roughness: .3, envMap: env });
  const rock = new T.MeshStandardMaterial({ color: 0x8a837a, roughness: .95, flatShading: true });
  const plant = new T.MeshStandardMaterial({ color: 0x3a8a3a, roughness: 1, flatShading: true });
  const glassG = new T.MeshStandardMaterial({ color: 0xc8f0d0, transparent: true, opacity: .32, roughness: .08, metalness: .3, emissive: 0x4a8a40, emissiveIntensity: .45, envMap: env, depthWrite: false, side: T.DoubleSide });
  const lampM = new T.MeshBasicMaterial({ color: new T.Color(2.4, 1.6, .7) });
  const iron = new T.MeshStandardMaterial({ color: 0x24262a, roughness: .5, metalness: .7 });

  // ---------- 合併幾何：每種材質只留一個 mesh ----------
  const acc = new Map(), M4 = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), P = new T.Vector3(), S = new T.Vector3(), A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3();
  function add(geo, mat, x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, keepUV = false, rx = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    M4.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, 0)), S.set(sx, sy, sz)); g.applyMatrix4(M4);
    if (!keepUV) worldUV(g, mat.userData.uv || 4);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!acc.has(mat)) acc.set(mat, []); acc.get(mat).push(g);
  }
  // 依每個三角形的朝向投影貼圖座標，讓石磚大小在整座城堡一致
  function worldUV(g, s) {
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i += 3) {
      A.fromBufferAttribute(p, i); B.fromBufferAttribute(p, i + 1).sub(A); C.fromBufferAttribute(p, i + 2).sub(A); B.cross(C);
      const ax = Math.abs(B.x), ay = Math.abs(B.y), az = Math.abs(B.z);
      for (let k = i; k < i + 3; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
        if (ay >= ax && ay >= az) uv.setXY(k, x / s, z / s); else if (ax >= az) uv.setXY(k, z / s, y / s); else uv.setXY(k, x / s, y / s); }
    }
  }
  const arch = (w, h) => { const s = new T.Shape(), b = h - w * .9; s.moveTo(-w / 2, 0); s.lineTo(-w / 2, b); s.quadraticCurveTo(-w / 2, h * .92, 0, h); s.quadraticCurveTo(w / 2, h * .92, w / 2, b); s.lineTo(w / 2, 0); s.closePath(); return s; };
  const archCache = {}, archGeo = (w, h) => archCache[w + ':' + h] || (archCache[w + ':' + h] = new T.ShapeGeometry(arch(w, h), 5));

  // ---------- 部件 ----------
  function win(x, y, z, ry, w = 1.4, h = 3.4, lit = R() < .6) {
    const nx = Math.sin(ry), nz = Math.cos(ry);
    add(archGeo(w + .55, h + .45), trim, x - nx * .05, y - .2, z - nz * .05, ry, 1, 1, 1, true);
    add(archGeo(w, h), lit ? winLit : winDark, x, y, z, ry, 1, 1, 1, true);
    add(new T.BoxGeometry(w + .7, .25, .5), trim, x, y - .2, z, ry);
  }
  // 牆面上的窗列：face 是 n／s／e／w
  function wins(x0, x1, z0, z1, face, ys, gap = 4.6, w = 1.4, h = 3.4) {
    const horiz = face === 'n' || face === 's', a0 = horiz ? x0 : z0, a1 = horiz ? x1 : z1, L = a1 - a0;
    const n = Math.max(1, Math.floor((L - 2) / gap) + 1), st = (L - (n - 1) * gap) / 2, ry = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[face];
    for (const y of ys) for (let i = 0; i < n; i++) {
      const a = a0 + st + i * gap, x = horiz ? a : face === 'e' ? x1 + .09 : x0 - .09, z = horiz ? (face === 's' ? z1 + .09 : z0 - .09) : a;
      win(x, y, z, ry, w, h);
    }
  }
  const rowsFor = (h, wh = 3.4) => { const r = []; for (let y = 3.4; y + wh + 2.2 < h; y += 6.6) r.push(y); return r; };
  function merlons(ax, az, bx, bz, y) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 1.9)), ry = Math.atan2(-(bz - az), bx - ax), mg = new T.BoxGeometry(1, 1.2, .8);
    for (let i = 0; i <= n; i++) { const t = i / n; add(mg, trim, ax + (bx - ax) * t, y + .6, az + (bz - az) * t, ry); }
  }
  function battlements(x0, x1, z0, z1, y) { merlons(x0, z0, x1, z0, y); merlons(x1, z0, x1, z1, y); merlons(x1, z1, x0, z1, y); merlons(x0, z1, x0, z0, y); }
  function gable(cx, cz, w, L, y0, rise, alongX, ov = .9) {
    const hw = w / 2 + ov, k = rise / (w / 2), ye = y0 - ov * k, yr = y0 + rise, za = -L / 2 - ov, zb = L / 2 + ov, s = 3, sl = Math.hypot(hw, yr - ye) / s;
    const pos = [], uv = [], tri = (a, b, c, ua, ub, uc) => { pos.push(...a, ...b, ...c); uv.push(...ua, ...ub, ...uc); };
    let E1 = [-hw, ye, za], E2 = [-hw, ye, zb]; const R1 = [0, yr, za], R2 = [0, yr, zb];
    tri(E1, E2, R2, [za / s, 0], [zb / s, 0], [zb / s, sl]); tri(E1, R2, R1, [za / s, 0], [zb / s, sl], [za / s, sl]);
    E1 = [hw, ye, za]; E2 = [hw, ye, zb];
    tri(E1, R2, E2, [-za / s, 0], [-zb / s, sl], [-zb / s, 0]); tri(E1, R1, R2, [-za / s, 0], [-za / s, sl], [-zb / s, sl]);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const ry = alongX ? Math.PI / 2 : 0; add(g, slate, cx, 0, cz, ry, 1, 1, 1, true);
    const gp = [-w / 2, y0, L / 2, w / 2, y0, L / 2, 0, yr - .2, L / 2, w / 2, y0, -L / 2, -w / 2, y0, -L / 2, 0, yr - .2, -L / 2];
    const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(gp, 3)); gg.setAttribute('uv', new T.Float32BufferAttribute(new Array(12).fill(0), 2)); gg.computeVertexNormals();
    add(gg, stone, cx, 0, cz, ry);
    add(new T.BoxGeometry(.4, .4, L + ov * 2), trim, cx, yr + .05, cz, ry);
    roofs.push((x, z) => { const dx = x - cx, dz = z - cz, ac = alongX ? -dz : dx, al = alongX ? dx : dz; if (Math.abs(ac) > hw || Math.abs(al) > L / 2 + ov) return -1; return Math.max(ye, yr - Math.abs(ac) * k); });
    return yr;
  }
  // 建築主體：牆、簷口、腰線、窗、屋頂或城垛
  function block(x0, x1, z0, z1, h, o = {}) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    add(new T.BoxGeometry(w, h, d), stone, cx, h / 2, cz);
    add(new T.BoxGeometry(w + .9, 1.3, d + .9), trim, cx, .65, cz);
    add(new T.BoxGeometry(w + .5, .5, d + .5), trim, cx, Math.min(h * .45, 8.6), cz);
    add(new T.BoxGeometry(w + .8, .8, d + .8), trim, cx, h - .2, cz);
    boxes.push([x0, x1, z0, z1, h]);
    let top = h;
    if (o.roof) top = gable(cx, cz, o.roof === 'x' ? d : w, o.roof === 'x' ? w : d, h + .2, o.rise ?? Math.min(w, d) * .5, o.roof === 'x');
    else if (o.crenel !== false) battlements(x0 - .25, x1 + .25, z0 - .25, z1 + .25, h + .2);
    const ys = o.ys || rowsFor(h, o.wh);
    for (const f of 'nsew') if (!(o.skip || '').includes(f)) wins(x0, x1, z0, z1, f, ys, o.gap, o.ww, o.wh);
    return top;
  }
  function buttresses(x0, x1, z0, z1, face, h, gap) {
    const horiz = face === 'n' || face === 's', a0 = horiz ? x0 : z0, a1 = horiz ? x1 : z1, n = Math.floor((a1 - a0) / gap);
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, out = face === 's' || face === 'e' ? 1 : -1;
      for (const [dep, hh, wd] of [[2.8, h * .55, 1.6], [1.7, h * .92, 1.3]]) {
        const x = horiz ? a : (face === 'e' ? x1 : x0) + out * dep / 2, z = horiz ? (face === 's' ? z1 : z0) + out * dep / 2 : a;
        add(new T.BoxGeometry(horiz ? wd : dep, hh, horiz ? dep : wd), stone, x, hh / 2, z);
        add(new T.ConeGeometry(wd * .8, 1.6, 4), trim, x, hh + .8, z, Math.PI / 4);
      } }
  }
  const flags = [], clocks = [];
  function tower(x, z, r, h, o = {}) {
    const seg = o.seg || 20, rh = o.roofH ?? r * 3.2;
    add(new T.CylinderGeometry(r, r * 1.05, h, seg, 1, true), stone, x, h / 2, z);
    add(new T.CylinderGeometry(r * 1.08, r * 1.08, 1.3, seg), trim, x, .65, z);
    add(new T.CylinderGeometry(r * 1.06, r * 1.06, .45, seg, 1, true), trim, x, h * .45, z);
    add(new T.CylinderGeometry(r * 1.2, r, 1.6, seg, 1, true), trim, x, h - .5, z);
    add(new T.CylinderGeometry(r * 1.2, r * 1.2, .6, seg), trim, x, h + .55, z);
    const n = Math.max(3, Math.round(r * 2 * Math.PI / 6.5)), ww = Math.min(1.5, r * .32), wh = ww * 2.5;
    for (let y = 5, k = 0; y + wh + 2.4 < h; y += 8.5, k++) for (let i = 0; i < n; i++) { const a = (i + (k % 2) * .5) / n * Math.PI * 2 + (o.rot || .3); win(x + Math.sin(a) * (r + .07), y, z + Math.cos(a) * (r + .07), a, ww, wh); }
    const base = h + .85;
    if (o.flat) {
      for (let i = 0, m = Math.round(r * 1.2 * 2 * Math.PI / 1.9); i < m; i++) { const a = i / m * Math.PI * 2; add(new T.BoxGeometry(1, 1.2, .8), trim, x + Math.sin(a) * r * 1.13, base + .6, z + Math.cos(a) * r * 1.13, a); }
      roofs.push((px, pz) => Math.hypot(px - x, pz - z) < r * 1.2 ? base : -1); circles.push([x, z, r * 1.05, base + 1.2]);
      if (o.flag) flag(x, base, z, o.flag);
    } else {
      const rr = r * 1.24; add(new T.ConeGeometry(rr, rh, seg, 6, true), slate, x, base + rh / 2, z);
      add(new T.CylinderGeometry(.07, .12, 2.6, 6), gold, x, base + rh + 1, z); add(new T.SphereGeometry(.32, 10, 8), gold, x, base + rh + .25, z);
      roofs.push((px, pz) => { const d = Math.hypot(px - x, pz - z); return d < rr ? base + rh * (1 - d / rr) : -1; });
      circles.push([x, z, r * 1.05, base + rh * .45]);
      if (o.flag) flag(x, base + rh + 1.6, z, o.flag, 4);
    }
  }
  // 方形高塔＋四角錐屋頂＋四個角樓
  function keep(x, z, w, h, rh) {
    block(x - w / 2, x + w / 2, z - w / 2, z + w / 2, h, { crenel: false, gap: 4.2 });
    add(new T.ConeGeometry(w * .76, rh, 4, 4, true), slate, x, h + .4 + rh / 2, z, Math.PI / 4);
    add(new T.CylinderGeometry(.09, .14, 3.4, 6), gold, x, h + .4 + rh + 1.4, z); add(new T.SphereGeometry(.4, 10, 8), gold, x, h + rh + .6, z);
    roofs.push((px, pz) => { const k = Math.max(Math.abs(px - x), Math.abs(pz - z)) / (w * .54); return k < 1 ? h + .4 + rh * (1 - k) : -1; });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(x + sx * w / 2, z + sz * w / 2, 1.7, h + 3, { roofH: 7, seg: 12 });
  }
  function flag(x, y, z, color, pole = 5) {
    add(new T.CylinderGeometry(.07, .1, pole, 6), gold, x, y + pole / 2, z);
    const geo = new T.PlaneGeometry(3.2, 1.9, 12, 1); geo.translate(1.6, -.95, 0);
    const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color, roughness: .85, side: T.DoubleSide, emissive: color, emissiveIntensity: .2 }));
    m.position.set(x, y + pole - .1, z); m.rotation.y = .9; scene.add(m); flags.push({ m, base: geo.attributes.position.array.slice(), ph: x * .1 });
  }
  function clock(x, y, z, ry, r) {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
    const face = cv(256, 256, (c, w) => { const m = w / 2, gr = c.createRadialGradient(m, m, 10, m, m, m); gr.addColorStop(0, '#fff6dc'); gr.addColorStop(1, '#d8c494'); c.fillStyle = gr; c.fillRect(0, 0, w, w);
      c.fillStyle = '#2a1a10'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 26px Cinzel, serif';
      ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((t, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; c.fillText(t, m + Math.cos(a) * 96, m + Math.sin(a) * 96); });
      c.strokeStyle = '#2a1a10'; c.lineWidth = 3; c.beginPath(); c.arc(m, m, 122, 0, 7); c.stroke(); });
    const fm = new T.MeshBasicMaterial({ map: face }); fm.color.setScalar(1.25);
    g.add(new T.Mesh(new T.CircleGeometry(r, 40), fm));
    const ring = new T.Mesh(new T.TorusGeometry(r, .2, 8, 40), gold); ring.position.z = .05; g.add(ring);
    const hand = (len, wd) => { const geo = new T.BoxGeometry(wd, len, .1); geo.translate(0, len / 2 - .2, 0); const m = new T.Mesh(geo, iron); m.position.z = .15; g.add(m); return m; };
    clocks.push({ hh: hand(r * .55, .26), mh: hand(r * .82, .16) });
  }

  // ---------- 城堡配置 ----------
  // 入口大廳（正門在 z = -47，玄關傳送點不變）
  const eTop = block(-18, 18, -68, -47, 24, { roof: 'z', rise: 13, skip: 'n', ys: [12.5, 18.5] });
  wins(-18, -5, -68, -47, 's', [4], 4.4); wins(5, 18, -68, -47, 's', [4], 4.4);
  { const rose = cv(256, 256, (c, w) => { const m = w / 2; c.fillStyle = '#ffb860'; c.fillRect(0, 0, w, w); c.strokeStyle = '#3a2410'; c.lineWidth = 9;
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.beginPath(); c.moveTo(m, m); c.lineTo(m + Math.cos(a) * m, m + Math.sin(a) * m); c.stroke(); c.beginPath(); c.arc(m + Math.cos(a) * m * .62, m + Math.sin(a) * m * .62, m * .2, 0, 7); c.stroke(); }
      c.beginPath(); c.arc(m, m, m * .3, 0, 7); c.stroke(); c.beginPath(); c.arc(m, m, m - 5, 0, 7); c.stroke(); });
    const rm = new T.MeshBasicMaterial({ map: rose }); rm.color.setRGB(1.8, 1.4, 1); const rw = new T.Mesh(new T.CircleGeometry(3.4, 40), rm); rw.position.set(0, 29.5, -46.86); scene.add(rw);
    add(new T.TorusGeometry(3.5, .35, 8, 40), trim, 0, 29.5, -46.8, 0, 1, 1, 1, false); }
  tower(-20.5, -48.5, 4.6, 34, { roofH: 16, flag: houses[0] }); tower(20.5, -48.5, 4.6, 34, { roofH: 16, flag: houses[1] });
  // 西側連廊與大禮堂
  block(-26, -18, -66, -50, 18, { roof: 'x', rise: 6, skip: 'e' });
  block(-46, -26, -122, -54, 22, { roof: 'z', rise: 16, ys: [7], ww: 2.4, wh: 11, gap: 8, skip: 'n' });
  buttresses(-46, -26, -122, -54, 'w', 22, 8); buttresses(-46, -26, -122, -54, 'e', 22, 8);
  add(new T.CylinderGeometry(1.7, 1.9, 6, 8), trim, -36, 40, -88); add(new T.ConeGeometry(2.1, 13, 8, 2, true), slate, -36, 49.5, -88); add(new T.CylinderGeometry(.06, .1, 2.4, 6), gold, -36, 57, -88);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; win(-36 + Math.sin(a) * 1.85, 38.6, -88 + Math.cos(a) * 1.85, a, .6, 2.2, true); }
  tower(-50, -56, 4.6, 38, { roofH: 15 }); tower(-50, -104, 4, 32, { roofH: 12 });
  // 內院主樓與主塔
  block(-14, 14, -83, -68, 20, { roof: 'x', rise: 9, skip: 's' });
  keep(0, -90, 14, 52, 22);
  block(7, 30, -100, -84, 16, { roof: 'x', rise: 6, skip: 'w' });
  // 鐘樓與東翼
  block(18, 44, -78, -60, 18, { roof: 'x', rise: 8 });
  block(25, 35, -60, -50, 40, { crenel: false, gap: 3.6, ys: [6, 14, 22] });
  add(new T.ConeGeometry(10 * .76, 14, 4, 4, true), slate, 30, 40.4 + 7, -55, Math.PI / 4); add(new T.CylinderGeometry(.08, .14, 4, 6), gold, 30, 56, -55);
  roofs.push((px, pz) => { const k = Math.max(Math.abs(px - 30), Math.abs(pz + 55)) / 5.4; return k < 1 ? 40.4 + 14 * (1 - k) : -1; });
  clock(30, 32, -49.85, 0, 3.2); clock(35.15, 32, -55, Math.PI / 2, 3.2); clock(24.85, 32, -55, -Math.PI / 2, 3.2);
  block(30, 62, -104, -80, 20, { roof: 'x', rise: 9 });
  tower(64, -78, 5, 40, { roofH: 16 }); tower(66, -108, 5.5, 46, { roofH: 18, flag: houses[2] }); tower(46, -111, 4, 34, { roofH: 13 });
  // 北翼與觀星塔（最高）
  block(-40, 44, -136, -122, 18, { roof: 'x', rise: 8 });
  tower(-46, -132, 5, 44, { roofH: 16 }); tower(22, -141, 4.5, 50, { roofH: 18 }); tower(44, -130, 4, 36, { roofH: 13 });
  { const x = -12, z = -140, r = 6.5, h = 64;
    add(new T.CylinderGeometry(r, r * 1.05, h, 24, 1, true), stone, x, h / 2, z); add(new T.CylinderGeometry(r * 1.08, r * 1.08, 1.3, 24), trim, x, .65, z);
    for (let y = 6, k = 0; y < h - 6; y += 9, k++) for (let i = 0; i < 6; i++) { const a = (i + k * .5) / 6 * Math.PI * 2; win(x + Math.sin(a) * (r + .07), y, z + Math.cos(a) * (r + .07), a, 1.4, 3.4); }
    add(new T.CylinderGeometry(r * 1.38, r, 2.2, 24, 1, true), trim, x, h - .6, z); add(new T.CylinderGeometry(r * 1.38, r * 1.38, .6, 24), trim, x, h + .7, z);
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; add(new T.BoxGeometry(.9, 1.3, .7), trim, x + Math.sin(a) * r * 1.3, h + 1.65, z + Math.cos(a) * r * 1.3, a); }
    add(new T.CylinderGeometry(4.6, 4.6, 6, 16, 1, true), stone, x, h + 4, z);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; win(x + Math.sin(a) * 4.68, h + 2, z + Math.cos(a) * 4.68, a, 1.3, 3.2, true); }
    add(new T.ConeGeometry(5.6, 20, 16, 6, true), slate, x, h + 7 + 10, z); add(new T.CylinderGeometry(.09, .15, 4, 6), gold, x, h + 28.6, z);
    roofs.push((px, pz) => { const d = Math.hypot(px - x, pz - z); return d < 5.6 ? h + 7 + 20 * (1 - d / 5.6) : d < r * 1.38 ? h + 1 : -1; });
    circles.push([x, z, r * 1.05, h]); circles.push([x, z, 4.7, h + 18]);
    flag(x, h + 27.4, z, houses[3], 4); }
  // 外圍城牆
  for (const [ax, az, bx, bz] of [[-50, -61, -50, -99], [-49.5, -108, -46.5, -127], [46, -115, 44, -126], [64, -83, 65.5, -102]]) {
    const L = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2, ry = Math.atan2(bx - ax, bz - az);
    add(new T.BoxGeometry(2.2, 13, L), stone, cx, 6.5, cz, ry); boxes.push([Math.min(ax, bx) - 1.1, Math.max(ax, bx) + 1.1, Math.min(az, bz), Math.max(az, bz), 13]);
    merlons(ax, az, bx, bz, 13);
  }
  // 中庭：石板地與魔法噴泉
  for (const [x0, x1, z0, z1] of [[-26, -7, -122, -83], [7, 30, -122, -100], [-26, -14, -83, -66]]) { const m = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), cobble); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, .04, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); }
  add(new T.LatheGeometry([[0, 0], [4.2, 0], [4.4, .9], [3.9, 1], [3.8, .4], [0, .4]].map(([a, b]) => new T.Vector2(a, b)), 32), trim, -16, 0, -103);
  add(new T.CylinderGeometry(.5, .8, 3.4, 12), trim, -16, 1.7, -103); add(new T.LatheGeometry([[0, 0], [1.6, .2], [1.7, .5], [0, .4]].map(([a, b]) => new T.Vector2(a, b)), 24), trim, -16, 3.3, -103);
  circles.push([-16, -103, 4.4, 1.2]);
  const fount = new T.Mesh(new T.CircleGeometry(3.85, 32), new T.MeshStandardMaterial({ color: 0x2a8a9a, emissive: 0x40c0d0, emissiveIntensity: .7, roughness: .1, metalness: .4, envMap: env }));
  fount.rotation.x = -Math.PI / 2; fount.position.set(-16, .85, -103); scene.add(fount);
  const orb = new T.Mesh(new T.SphereGeometry(.55, 20, 14), new T.MeshBasicMaterial({ color: new T.Color(1.2, 2.4, 2.6) })); orb.position.set(-16, 4.6, -103); scene.add(orb);
  // 木廊橋：從東北塔通往湖心守望塔
  { const x = 66, z0 = -113, z1 = -213, y = 16, w = 5, L = z0 - z1, cz = (z0 + z1) / 2;
    add(new T.BoxGeometry(w + .6, .9, L), stone, x, y - .45, cz); boxes.push([x - w / 2 - .3, x + w / 2 + .3, z1, z0, y, y - 1.2]);
    for (let z = z0 - 8; z > z1 + 4; z -= 13) { const g = H(x, z) - 2, hh = y - .9 - g; add(new T.BoxGeometry(3.4, hh, 2.6), stone, x, g + hh / 2, z); add(new T.BoxGeometry(4.2, 1, 3.4), trim, x, y - 1.3, z); boxes.push([x - 1.7, x + 1.7, z - 1.3, z + 1.3, y - 1.8]); }
    for (let z = z0 - 1.5; z > z1 + 1; z -= 3.2) for (const sx of [-1, 1]) { add(new T.BoxGeometry(.32, 3.2, .32), wood, x + sx * (w / 2 - .1), y + 1.6, z); add(new T.BoxGeometry(.12, .12, 3.2), wood, x + sx * (w / 2 - .1), y + 1, z - 1.6); }
    gable(x, cz, w + .4, L, y + 3.2, 1.9, false, .5);
    for (let z = z0 - 6; z > z1; z -= 12) add(new T.SphereGeometry(.22, 8, 6), lampM, x, y + 2.7, z);
    tower(ISLAND[0], ISLAND[1], 6, 26, { flat: true, flag: houses[0] }); }
  // 湖畔船屋與小船
  { const x = -64, z = -162, y = LAKE.y;
    add(new T.BoxGeometry(14, .5, 12), wood, x, y + .55, z); boxes.push([x - 7, x + 7, z - 6, z + 6, y + .8]);
    add(new T.BoxGeometry(9, 4.5, 7), wood, x, y + 3, z - 1.5); gable(x, z - 1.5, 9.6, 7.6, y + 5.25, 3, false, .6);
    add(new T.BoxGeometry(4, 4, .2), new T.MeshBasicMaterial({ color: new T.Color(1.6, .95, .4) }), x, y + 2.8, z + 2.05, 0, 1, 1, 1, true);
    for (let i = 0; i < 6; i++) add(new T.CylinderGeometry(.2, .25, 4, 6), wood, x - 6.5 + (i % 3) * 6.5, y - 1, z + (i < 3 ? 5.8 : -5.8));
    const hull = new T.SphereGeometry(1, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    [[-52, -170, .3], [-60, -176, -.4], [-72, -173, .9]].forEach(([bx, bz, r]) => { add(hull, wood, bx, y + .45, bz, r, 1.1, .5, 2.8); add(new T.SphereGeometry(.2, 8, 6), lampM, bx, y + 1.3, bz + 1.8 * Math.cos(r)); }); }
  // 庭院旁的溫室
  for (const [gx, gz] of [[50, -22], [50, -2]]) {
    add(new T.BoxGeometry(16, .6, 10), trim, gx, .3, gz);
    const gh = new T.BoxGeometry(15, 3.6, 9); add(gh, glassG, gx, 2.4, gz, 0, 1, 1, 1, true);
    const rf = gable(gx, gz, 9.2, 15.2, 4.2, 2.6, true, .1);
    for (let i = -7; i <= 7; i += 2.5) for (const sz of [-4.55, 4.55]) add(new T.BoxGeometry(.14, 3.6, .14), iron, gx + i, 2.4, gz + sz);
    boxes.push([gx - 7.5, gx + 7.5, gz - 4.5, gz + 4.5, rf]);
    for (let i = 0; i < 7; i++) add(new T.SphereGeometry(.7 + R() * .5, 8, 6), plant, gx - 5.5 + i * 1.8, 1.4, gz + (R() - .5) * 5, 0, 1, 1, 1, true);
  }
  // 懸崖岩石
  { const rg = new T.IcosahedronGeometry(1, 1), p = rg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + .28 * Math.sin(x * 3.1 + y * 1.7) * Math.cos(z * 2.3 - y); p.setXYZ(i, x * k, y * k * .8, z * k); }
    rg.computeVertexNormals();
    for (let x = -118; x <= 118; x += 3.2) {
      const zs = LAKE.z + LAKE.rz * Math.sqrt(Math.max(0, 1 - (x / LAKE.rx) ** 2));
      for (let j = 0; j < 1; j++) { const z = zs - 2 - R() * 9, s = .9 + R() * 2; add(rg, rock, x + (R() - .5) * 2.5, Math.max(H(x, z), LAKE.y - 1) - s * .15, z, R() * 6, s, s * (.6 + R() * .6), s * (.8 + R() * .5), true); }
    }
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, s = 1.5 + R() * 2.5; add(rg, rock, ISLAND[0] + Math.cos(a) * 15, LAKE.y + .5, ISLAND[1] + Math.sin(a) * 15, R() * 6, s, s * .7, s, true); }
  }

  // ---------- 合併輸出 ----------
  const meshes = [];
  for (const [mat, geos] of acc) {
    const g = merge(geos, false); geos.forEach(x => x.dispose());
    const m = new T.Mesh(g, mat); m.castShadow = !mat.transparent && mat !== winLit && mat !== lampM; m.receiveShadow = true; m.userData.castle = true; scene.add(m); meshes.push(m);
  }
  return {
    meshes,
    update(t) {
      for (const f of flags) { const a = f.m.geometry.attributes.position, b = f.base; for (let i = 0; i < a.count; i++) { const x = b[i * 3]; a.array[i * 3 + 2] = Math.sin(x * 1.7 - t * 5 + f.ph) * .3 * (x / 3.2); } a.needsUpdate = true; f.m.rotation.y = .9 + Math.sin(t * .4 + f.ph) * .15; }
      if (clocks.length) { const d = new Date(), m = d.getMinutes() + d.getSeconds() / 60, h = d.getHours() % 12 + m / 60; for (const c of clocks) { c.mh.rotation.z = -m / 60 * Math.PI * 2; c.hh.rotation.z = -h / 12 * Math.PI * 2; } }
      orb.position.y = 4.6 + Math.sin(t * 1.5) * .25; orb.scale.setScalar(1 + Math.sin(t * 3) * .08);
    },
  };
}
