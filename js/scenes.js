// Three.js 程式化 3D 模型：金幣、星晶、獎盃、卡包
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

const metal = (color, rough = .28) => new T.MeshStandardMaterial({ color, metalness: .62, roughness: rough, envMapIntensity: 1.6 });

function starShape(R, r, n) {
  const s = new T.Shape();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? r : R;
    i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath(); return s;
}

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
    const pts = [[0, 0], [.95, 0], [.95, .18], [.4, .32], [.17, .55], [.17, 1.15], [.32, 1.35], [.9, 2.1], [1.12, 3], [1.02, 3], [.82, 2.25], [0, 2.05]]
      .map(p => new T.Vector2(p[0], p[1]));
    const cup = new T.Mesh(new T.LatheGeometry(pts, 64), m); g.add(cup);
    for (const sx of [1, -1]) {
      const h = new T.Mesh(new T.TorusGeometry(.42, .075, 12, 32, Math.PI * 1.3), m);
      h.position.set(sx * 1.05, 2.35, 0); h.rotation.z = sx > 0 ? -Math.PI * .65 : Math.PI * .35 - Math.PI; g.add(h);
    }
    const base = new T.Mesh(new T.CylinderGeometry(1.1, 1.25, .35, 6), new T.MeshStandardMaterial({ color: 0x1b2a30, roughness: .5, metalness: .4 }));
    base.position.y = -.17; g.add(base);
    const gemMat = new T.MeshPhysicalMaterial({ color: 0x57d0e6, emissive: 0x57d0e6, emissiveIntensity: .6, flatShading: true, roughness: .05 });
    const gem = new T.Mesh(new T.OctahedronGeometry(.34, 0), gemMat); gem.position.y = 3.55; gem.scale.y = 1.4; g.add(gem);
    g.userData.spinChild = gem;
    g.position.y = -1.7; const wrap = new T.Group(); wrap.add(g); wrap.scale.setScalar(.82); wrap.userData = g.userData; return wrap;
  },
  pack(o) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 768;
    const c = cv.getContext('2d'), col = o.color || '#3f73a8';
    const gr = c.createLinearGradient(0, 0, 512, 768); gr.addColorStop(0, col); gr.addColorStop(1, '#0b1418');
    c.fillStyle = gr; c.fillRect(0, 0, 512, 768);
    c.strokeStyle = '#e9c66a'; c.lineWidth = 10; c.strokeRect(22, 22, 468, 724);
    c.lineWidth = 3; c.strokeRect(42, 42, 428, 684);
    c.save(); c.translate(256, 360);
    c.globalAlpha = .9; c.fillStyle = 'rgba(0,0,0,.35)'; c.strokeStyle = '#e9c66a'; c.lineWidth = 6;
    c.rotate(Math.PI / 4); c.fillRect(-120, -120, 240, 240); c.strokeRect(-120, -120, 240, 240); c.rotate(-Math.PI / 4);
    c.fillStyle = '#f3dc9a'; c.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 34 : 110; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill(); c.restore();
    c.fillStyle = '#f3dc9a'; c.textAlign = 'center'; c.font = '600 44px Cinzel, serif'; c.fillText('ARCANUM', 256, 640);
    c.font = '26px Cinzel, serif'; c.fillText('✦  ✦  ✦', 256, 110);
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
    const face = new T.MeshStandardMaterial({ map: tex, metalness: .55, roughness: .35 });
    const edge = metal(0xe2b23c, .3);
    const mesh = new T.Mesh(new T.BoxGeometry(2.2, 3.3, .22), [edge, edge, edge, edge, face, face]);
    const g = new T.Group(); g.add(mesh); return g;
  },
};

export async function mount(el, kind, opts = {}) {
  if (!(await lib()) || !el.isConnected) return null;
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
  const obj = build[kind](opts); scene.add(obj);
  const st = { shake: 0, spin: opts.spin ?? 1, dead: false, scale: 1 }, t0 = performance.now();
  function dispose() {
    st.dead = true; pm.dispose();
    scene.traverse(o => { o.geometry && o.geometry.dispose(); [].concat(o.material || []).forEach(m => { m.map && m.map.dispose(); m.dispose(); }); });
    r.dispose(); r.forceContextLoss && r.forceContextLoss(); r.domElement.remove();
  }
  let ang = 0, prev = t0;
  function loop(now) {
    if (st.dead) return;
    if (!el.isConnected) return dispose();
    const t = (now - t0) / 1000, dt = (now - prev) / 1000; prev = now;
    if (kind === 'pack' && st.spin <= 1) obj.rotation.y = Math.sin(t * .9) * .45;
    else { ang += dt * st.spin; obj.rotation.y = kind === 'pack' ? ang : ang; }
    obj.position.y = Math.sin(t * 1.6) * .1;
    obj.rotation.z = st.shake ? Math.sin(t * 46) * .07 * st.shake : 0;
    obj.scale.setScalar(st.scale * (1 + st.shake * .08));
    const sc = obj.userData.spinChild; if (sc) sc.rotation.y = -t * 2.5;
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
