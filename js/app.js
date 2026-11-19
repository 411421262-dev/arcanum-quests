import { FX } from './fx.js';
import { mount, cabinet } from './scenes.js';
import { CATS, DIFFS, HOUSES, RARITY, CARDS, PACKS, TALENTS, ACHS, RELICS, DEFAULT_REWARDS, CUR } from './data.js';

// ---------- 工具 ----------
const KEY = 'arcanum-save-v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => ymd(new Date());
const dayOff = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const ic = k => `<i class="ic ${k}"></i>`;

// ---------- 狀態 / 存檔 ----------
const fresh = () => ({
  v: 1, profile: { name: '', house: '' }, xp: 0, coins: 0, gems: 0, tickets: 0,
  talentPts: 0, talents: {}, tasks: [], ideas: [], rewards: structuredClone(DEFAULT_REWARDS), bag: [],
  cards: {}, ach: {}, timer: null, sound: true, world: { day: '', coins: [], dummies: [], chest: false, kills: 0, prof: [], rings: false },
  stats: { done: 0, coinsEarned: 0, packs: 0, streak: 0, best: 0, lastDone: '', redeemed: 0, ideas: 0 },
  // 學習：專注紀錄、記憶卡、回想筆記、探索能量（進入 3D 世界的分鐘數）
  study: { log: {}, rev: {}, goal: 60, energy: 15, gate: true, cards: [], notes: [], focusN: 0 }, focus: null,
});
let S = fresh();
try {
  const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (raw && raw.v === 1) S = { ...fresh(), ...raw, stats: { ...fresh().stats, ...raw.stats }, profile: { ...fresh().profile, ...raw.profile }, study: { ...fresh().study, ...raw.study } };
} catch (e) { /* 存檔毀損時使用新檔 */ }
let saveOk = true;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); saveOk = true; }
  catch (e) { if (saveOk) toast('⚠️ 無法寫入存檔（瀏覽器儲存空間被封鎖或已滿）'); saveOk = false; }
}
if (S.stats.lastDone && S.stats.lastDone < dayOff(-1)) S.stats.streak = 0;
FX.setMuted(!S.sound);

const need = l => 60 + l * 40;
function lv(xp = S.xp) { let l = 1; while (xp >= need(l)) { xp -= need(l); l++; } return { level: l, cur: xp, need: need(l) }; }
const tal = k => S.talents[k] || 0;
const owned = () => Object.keys(S.cards).filter(k => S.cards[k] > 0).length;
const isDone = t => t.daily ? t.lastDone === today() : !!t.doneAt;
const price = r => Math.max(1, Math.ceil(r.cost * (1 - .05 * tal('barter'))));

// ---------- UI 狀態 ----------
let tab = 'study', filter = 'all', showDone = false;
const draftF = { mins: 25, task: '' };
const draft = { cat: 'study', diff: 'normal', daily: false };
let obHouse = 'star';
const app = $('#app');

// ---------- 提示 / 浮字 / 彈窗 ----------
function toast(html, ms = 2600) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html;
  $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 400);
}
function floatText(x, y, html, cls = '') {
  const f = document.createElement('div'); f.className = 'float ' + cls; f.innerHTML = html;
  f.style.left = x + 'px'; f.style.top = y + 'px'; document.body.appendChild(f); setTimeout(() => f.remove(), 1500);
}
let chain = Promise.resolve();
const enqueue = fn => { chain = chain.then(fn).catch(e => console.error(e)); };
function overlay(html, onMount) {
  return new Promise(res => {
    const o = $('#overlay'); o.innerHTML = `<div class="ov">${html}</div>`; o.classList.add('on');
    o._close = () => { o.classList.remove('on'); o.innerHTML = ''; o._close = null; res(); };
    onMount && onMount(o);
  });
}

// ---------- 學院徽章 (原創 SVG) ----------
function crest(id, size = 120) {
  const h = HOUSES[id]; if (!h) return '';
  let g = '';
  if (h.glyph === 'flame') g = `<path d="M50 26C64 44 72 54 67 72C63 88 37 88 33 72C30 60 40 56 42 44C46 52 51 50 50 26Z"/><path d="M50 58C56 66 58 70 56 77C54 83 46 83 44 77C43 72 47 70 50 58Z" fill="${h.dark}"/>`;
  if (h.glyph === 'star') { const p = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 - 1.5708, r = i % 2 ? 10 : (i % 4 ? 22 : 32); p.push((50 + Math.cos(a) * r).toFixed(1) + ',' + (60 + Math.sin(a) * r).toFixed(1)); } g = `<polygon points="${p.join(' ')}"/><circle cx="50" cy="60" r="5" fill="${h.dark}"/>`; }
  if (h.glyph === 'leaf') g = `<path d="M50 28C76 42 76 76 50 94C24 76 24 42 50 28Z"/><path d="M50 36V92M50 52L38 44M50 52L62 44M50 66L36 57M50 66L64 57M50 79L40 72M50 79L60 72" stroke="${h.dark}" stroke-width="2.5" fill="none"/>`;
  if (h.glyph === 'moon') g = `<path d="M62 30A31 31 0 1 0 62 92A38 38 0 0 1 62 30Z"/><circle cx="66" cy="50" r="3"/><circle cx="74" cy="66" r="2"/>`;
  return `<svg class="crest" width="${size}" height="${size * 1.2}" viewBox="0 0 100 120">
    <defs><linearGradient id="cg-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${h.color}"/><stop offset="1" stop-color="${h.dark}"/></linearGradient>
    <linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="#d9b25f"/><stop offset="1" stop-color="#8a6a25"/></linearGradient></defs>
    <path d="M50 3L94 17V62C94 91 71 109 50 117C29 109 6 91 6 62V17Z" fill="url(#gg)"/>
    <path d="M50 10L88 22V62C88 87 68 103 50 110C32 103 12 87 12 62V22Z" fill="url(#cg-${id})"/>
    <path d="M50 16L82 26V62C82 83 65 97 50 103C35 97 18 83 18 62V26Z" fill="none" stroke="url(#gg)" stroke-width="1.2" opacity=".7"/>
    <g fill="url(#gg)">${g}</g></svg>`;
}

// ---------- 獎勵發放 ----------
function grant({ coins = 0, gems = 0, tickets = 0, xp = 0 }) {
  const before = lv().level;
  S.coins += coins; S.gems += gems; S.tickets += tickets; S.xp += xp;
  if (coins > 0) S.stats.coinsEarned += coins;
  const after = lv().level, ups = [];
  for (let l = before + 1; l <= after; l++) {
    S.talentPts++; S.gems += 2; if (l % 5 === 0) S.tickets++;
    ups.push(l);
  }
  return ups;
}
function levelUp(l) {
  FX.sound('level'); FX.fireworks(6);
  return overlay(`<div class="ov-card lvl">
    <div class="orn"><span>LEVEL UP</span></div>
    <div class="stage" id="stage3d"></div>
    <div class="hex big"><b>${l}</b></div>
    <p class="sub">你的魔力更加精純了</p>
    <div class="loot"><span>${ic('gems')} +2 星晶</span><span>🎴 +1 天賦點</span>${l % 5 === 0 ? `<span>${ic('tickets')} +1 通行票</span>` : ''}</div>
    <button class="btn gold" data-act="ov-close">繼續</button></div>`,
    o => mount($('#stage3d', o), 'gem', { spin: 1.6 }));
}
const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const achCtx = () => ({ S, level: lv().level, owned: owned(), focusN: S.study.focusN || 0, focusMin: sum(S.study.log), reviews: sum(S.study.rev) });
function checkAch() {
  const ctx = achCtx();
  for (const a of ACHS) {
    if (S.ach[a.id]) continue;
    const [v, g] = a.prog(ctx);
    if (v >= g) {
      S.ach[a.id] = Date.now(); S.gems += a.gems;
      enqueue(() => { FX.sound('ach'); FX.fireworks(3); return overlay(`<div class="ov-card">
        <div class="orn"><span>挑戰達成</span></div><div class="stage" id="stage3d"></div>
        <h3>${esc(a.name)}</h3><p class="sub">${esc(a.desc)}</p>
        <div class="loot"><span>🏺 珍寶：${RELICS[a.relic]}</span><span>${ic('gems')} +${a.gems} 星晶</span></div>
        <button class="btn gold" data-act="ov-close">收入陳列櫃</button></div>`, o => mount($('#stage3d', o), a.relic, { dist: 7.4, spin: .8 })).then(render); });
    }
  }
  save();
}

// ---------- 學習：連續天數、探索能量 ----------
const ST = () => S.study;
function bumpStreak() {
  const td = today(); if (S.stats.lastDone === td) return;
  S.stats.streak = S.stats.lastDone === dayOff(-1) ? S.stats.streak + 1 : 1;
  S.stats.lastDone = td; S.stats.best = Math.max(S.stats.best, S.stats.streak);
}
function addEnergy(m) { ST().energy = Math.min(180, Math.round((ST().energy + m) * 10) / 10); }
const minsToday = () => ST().log[today()] || 0;
const dueCards = deck => ST().cards.filter(c => c.due <= today() && (!deck || c.deck === deck));
const mmss = ms => { const x = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };

// ---------- 專注計時 ----------
let wake = null;
function startFocus() {
  if (S.focus) return showFocus();
  S.focus = { start: Date.now(), end: Date.now() + draftF.mins * 60000, mins: draftF.mins, taskId: draftF.task }; save();
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  FX.sound('cast'); showFocus();
}
function showFocus() {
  if (!S.focus || $('#focus')) return;
  const t = S.tasks.find(x => x.id === S.focus.taskId), el = document.createElement('div'); el.id = 'focus';
  el.innerHTML = `<div class="fc-in"><div class="fc-lab">專注修習中</div>
    <div class="fc-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54"/><circle id="fc-arc" cx="60" cy="60" r="54" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/></svg><b id="fc-t">--:--</b></div>
    <h3>${t ? esc(t.title) : '自由修習'}</h3>
    <p class="sub">把手機放遠一點，只做這一件事。<br>離開這個畫面也不會中斷計時。</p>
    <div class="fc-btns"><button class="btn ghost sm" data-act="focus-hide">縮小</button><button class="btn sm" data-act="focus-stop">提早結束</button></div></div>`;
  document.body.appendChild(el);
  try { navigator.wakeLock?.request('screen').then(w => wake = w).catch(() => {}); } catch (e) { /* 不支援 */ }
  tick();
}
function endFocus(full) {
  const f = S.focus; if (!f) return;
  const mins = full ? f.mins : Math.floor((Date.now() - f.start) / 60000), t = S.tasks.find(x => x.id === f.taskId);
  S.focus = null; $('#focus')?.remove(); document.title = '奧術學院 · 任務之書'; try { wake?.release(); } catch (e) { /* 忽略 */ } wake = null;
  if (mins < 5) { save(); render(); return toast('未滿 5 分鐘，這次不計入紀錄'); }
  ST().log[today()] = minsToday() + mins; ST().focusN++; bumpStreak();
  const coins = Math.round(mins * (full ? 1.2 : .7)), gems = full && mins >= 45 ? 1 : 0, en = Math.round(mins * .4);
  addEnergy(en); const ups = grant({ coins, gems, xp: mins }); save(); render();
  FX.sound(full ? 'level' : 'coin'); if (full) FX.fireworks(3);
  try { if (full && 'Notification' in window && Notification.permission === 'granted') new Notification('專注完成', { body: `${mins} 分鐘的修習結束了，休息一下吧` }); } catch (e) { /* 忽略 */ }
  enqueue(() => overlay(`<div class="ov-card"><div class="orn"><span>${full ? '專注完成' : '提早結束'}</span></div><div class="bigicon">🕯</div>
    <h3>${mins} 分鐘</h3>
    <div class="loot"><span>${ic('coins')} +${coins}</span><span>XP +${mins}</span>${gems ? `<span>${ic('gems')} +1</span>` : ''}<span>⚡ 探索能量 +${en} 分</span></div>
    <label class="recall">主動回想：不看資料，用自己的話寫下剛剛學到的重點（可略過）<textarea id="recall" rows="3" maxlength="600" placeholder="例如：今天弄懂了⋯"></textarea></label>
    ${t && !isDone(t) ? `<label class="chk"><input type="checkbox" id="fc-done"> 同時把任務「${esc(t.title)}」標記為完成</label>` : ''}
    <button class="btn gold" data-act="focus-save" data-task="${t ? t.id : ''}">收下</button></div>`).then(() => { render(); ups.forEach(l => enqueue(() => levelUp(l).then(render))); checkAch(); }));
}

// ---------- 記憶卡（間隔重複）----------
const IVL = { again: () => 0, hard: c => Math.max(1, Math.round(c.ivl * 1.2)), good: c => c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.round(c.ivl * c.ease), easy: c => c.reps === 0 ? 4 : Math.round(Math.max(c.ivl, 1) * c.ease * 1.3) };
const ivlText = d => d <= 0 ? '馬上再來' : d < 30 ? `${d} 天後` : d < 365 ? `${Math.round(d / 30)} 個月後` : `${(d / 365).toFixed(1)} 年後`;
let rv = null;
function addCard(deck, q, a) { q = q.trim(); a = a.trim(); if (!q || !a) return false; ST().cards.push({ id: uid(), deck: deck.trim() || '未分類', q: q.slice(0, 500), a: a.slice(0, 1000), due: today(), ivl: 0, ease: 2.5, reps: 0 }); return true; }
function startReview(deck) {
  const q = dueCards(deck).map(c => c.id); if (!q.length) return toast('目前沒有到期的記憶卡');
  for (let i = q.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [q[i], q[j]] = [q[j], q[i]]; }
  rv = { queue: q, shown: false, n: 0, seen: new Set() };
  const el = document.createElement('div'); el.id = 'review'; document.body.appendChild(el); drawReview();
}
function drawReview() {
  const el = $('#review'); if (!el || !rv) return;
  const c = ST().cards.find(x => x.id === rv.queue[0]); if (!c) { rv.queue.shift(); return rv.queue.length ? drawReview() : endReview(); }
  el.innerHTML = `<div class="rv-in"><div class="rv-top"><span>${esc(c.deck)}</span><span>剩下 ${rv.queue.length} 張</span><button class="btn ghost sm" data-act="rv-quit">結束</button></div>
    <div class="rv-card"><div class="rv-q">${esc(c.q)}</div>${rv.shown ? `<hr><div class="rv-a">${esc(c.a)}</div>` : ''}</div>
    ${rv.shown ? `<div class="rv-grade">${[['again', '忘了', '#d86a5a'], ['hard', '有點難', '#d8a04a'], ['good', '記得', '#6fbf73'], ['easy', '很簡單', '#5fa8d8']].map(([k, n, col], i) => `<button data-act="rv-grade" data-g="${k}" style="--cc:${col}"><b>${n}</b><small>${ivlText(IVL[k](c))}</small><kbd>${i + 1}</kbd></button>`).join('')}</div>`
      : `<p class="sub">先在心裡（或說出口）回答，再翻開答案</p><button class="btn gold big" data-act="rv-show">翻開答案 <kbd>空白鍵</kbd></button>`}</div>`;
}
function gradeCard(g) {
  if (!rv || !rv.shown) return; const c = ST().cards.find(x => x.id === rv.queue[0]); if (!c) return;
  const ivl = IVL[g](c); rv.queue.shift(); rv.shown = false;
  if (!rv.seen.has(c.id)) { rv.seen.add(c.id); rv.n++; }
  if (g === 'again') { c.reps = 0; c.ivl = 0; c.ease = Math.max(1.3, c.ease - .2); c.lapses = (c.lapses || 0) + 1; rv.queue.push(c.id); }
  else { c.ease = Math.max(1.3, c.ease + (g === 'hard' ? -.15 : g === 'easy' ? .15 : 0)); c.ivl = ivl; c.reps++; c.due = dayOff(ivl); }
  save(); FX.sound(g === 'again' ? 'deny' : 'flip'); rv.queue.length ? drawReview() : endReview();
}
function endReview() {
  const n = rv ? rv.n : 0; rv = null; $('#review')?.remove(); if (!n) return render();
  ST().rev[today()] = (ST().rev[today()] || 0) + n; bumpStreak();
  const coins = n * 2, en = Math.round(n * .5); addEnergy(en); const ups = grant({ coins, xp: n * 2 }); save(); render(); FX.sound('rare');
  enqueue(() => overlay(`<div class="ov-card"><div class="orn"><span>複習完成</span></div><div class="bigicon">🧠</div><h3>${n} 張記憶卡</h3>
    <div class="loot"><span>${ic('coins')} +${coins}</span><span>XP +${n * 2}</span><span>⚡ 探索能量 +${en} 分</span></div>
    <p class="sub">答不出來的卡片會更快再出現，記得的會隔更久。</p><button class="btn gold" data-act="ov-close">收下</button></div>`).then(() => { render(); ups.forEach(l => enqueue(() => levelUp(l).then(render))); checkAch(); }));
}

// ---------- 任務 ----------
function addTask(title, o = {}) {
  S.tasks.unshift({ id: uid(), title: title.trim(), note: o.note || '', cat: o.cat || draft.cat, diff: o.diff || draft.diff,
    daily: o.daily ?? draft.daily, due: o.due || '', created: Date.now(), doneAt: 0, lastDone: '' });
  save();
}
function completeTask(id, btn) {
  const t = S.tasks.find(x => x.id === id); if (!t || isDone(t)) return;
  const d = DIFFS[t.diff], td = today(), r = btn ? btn.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 }, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  bumpStreak(); addEnergy({ easy: 2, normal: 5, hard: 10, epic: 20 }[t.diff] || 3);
  const streakMul = 1 + Math.min(S.stats.streak - 1, 10) * .05;
  const crit = Math.random() < .1 + .05 * tal('luck');
  const coins = Math.round(d.coins * (1 + .1 * tal('gold')) * streakMul * (crit ? 2 : 1));
  const xp = Math.round(d.xp * (1 + .1 * tal('wisdom')));
  const gems = d.gems + (Math.random() < .08 * tal('gem') ? 1 : 0);
  if (t.daily) { t.lastDone = td; t.count = (t.count || 0) + 1; } else t.doneAt = Date.now();
  S.stats.done++;
  const ups = grant({ coins, gems, tickets: d.tickets, xp });
  save();
  const col = CATS[t.cat].color;
  btn?.closest('.quest')?.classList.add('casting');
  FX.spell(cx, cy, col); FX.sound('cast');
  floatText(cx, cy - 20, `+${coins} ${ic('coins')}　+${xp} XP`, crit ? 'crit' : '');
  if (crit) { floatText(cx, cy - 58, '完美施法 ×2', 'crit big'); FX.burst(cx, cy, '#fff', 60, 480); }
  setTimeout(() => FX.sound('coin'), 350);
  FX.fly(cx, cy, $('#cur-coins'), 3 + coins / 20, '#f1c75b', () => $('#cur-coins')?.classList.add('pulse'));
  if (gems) FX.fly(cx, cy, $('#cur-gems'), gems, '#57d0e6');
  if (d.tickets) FX.fly(cx, cy, $('#cur-tickets'), d.tickets, '#b07cf0');
  if (gems > d.gems) toast(`💎 晶石感應觸發，額外獲得 1 星晶`);
  setTimeout(() => { render(); ups.forEach(l => enqueue(() => levelUp(l).then(render))); checkAch(); }, 750);
}

// ---------- 商店 / 計時 ----------
function buy(id, btn) {
  const r = S.rewards.find(x => x.id === id); if (!r) return;
  const p = price(r);
  if (S[r.cur] < p) { FX.sound('deny'); btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 400); return toast(`${CUR[r.cur]}不足，還差 ${p - S[r.cur]}`); }
  S[r.cur] -= p; S.stats.redeemed++;
  S.bag.unshift({ id: uid(), name: r.name, icon: r.icon, minutes: r.minutes || 0, at: Date.now(), used: 0 });
  save(); FX.sound('buy');
  const b = btn.getBoundingClientRect(); FX.spell(b.left + b.width / 2, b.top, '#f1c75b');
  toast(`已兌換「${esc(r.name)}」，放入背包`); render(); checkAch();
}
function useItem(id) {
  const it = S.bag.find(x => x.id === id); if (!it || it.used) return;
  if (it.minutes) {
    if (S.timer && S.timer.end > Date.now()) return toast('已有一張計時券正在生效');
    S.timer = { end: Date.now() + it.minutes * 60000, name: it.name };
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    toast(`⏳ 「${esc(it.name)}」開始計時`);
  } else toast(`🎉 享受你的「${esc(it.name)}」！`);
  it.used = Date.now(); save(); FX.sound('rare'); FX.fireworks(2); render();
}
function tick() {
  if (S.focus) {
    const left = S.focus.end - Date.now(); if (left <= 0) endFocus(true);
    else { const tx = mmss(left); document.title = `${tx} 專注中`; const a = $('#fc-t'); if (a) { a.textContent = tx; $('#fc-arc').style.strokeDashoffset = 100 - left / (S.focus.mins * 600); } const b = $('#fc-mini'); if (b) b.textContent = tx; }
  }
  const el = $('#timer'); if (!S.timer) return;
  const left = S.timer.end - Date.now();
  if (left <= 0) {
    const name = S.timer.name; S.timer = null; save(); render(); FX.sound('alarm');
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('時間到', { body: `「${name}」已結束，回到任務之書吧` }); } catch (e) { /* 忽略 */ }
    enqueue(() => overlay(`<div class="ov-card"><div class="orn"><span>時間到</span></div><div class="bigicon">⏳</div><p class="sub">「${esc(name)}」的時效已結束<br>該回去累積下一份獎勵了</p><button class="btn gold" data-act="ov-close">我知道了</button></div>`));
    return;
  }
  if (el) { const s = Math.ceil(left / 1000); el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
}
setInterval(tick, 1000);

// ---------- 卡包 ----------
function rollCard(p) {
  let x = Math.random() * 100, r = 'c';
  for (const k of ['c', 'r', 'e', 'l']) { if (x < p.odds[k]) { r = k; break; } x -= p.odds[k]; r = k; }
  const order = ['c', 'r', 'e', 'l'];
  if (r !== 'l' && Math.random() < .04 * tal('fortune')) r = order[order.indexOf(r) + 1];
  const pool = CARDS.filter(c => c.r === r); return pool[Math.floor(Math.random() * pool.length)];
}
const cardFace = (c, n) => `<div class="tc r-${c.r}"><div class="tc-art">${c.icon}</div><div class="tc-name">${esc(c.name)}</div><div class="tc-rar">${RARITY[c.r].name}</div>${n > 1 ? `<div class="tc-n">×${n}</div>` : ''}</div>`;
function openPack(pid, btn) {
  const p = PACKS[pid];
  if (S[p.cur] < p.cost) { FX.sound('deny'); btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 400); return toast(`${CUR[p.cur]}不足，還差 ${p.cost - S[p.cur]}`); }
  S[p.cur] -= p.cost; S.stats.packs++;
  const got = []; let refund = 0;
  for (let i = 0; i < p.n; i++) {
    const c = rollCard(p), dup = (S.cards[c.id] || 0) > 0;
    S.cards[c.id] = (S.cards[c.id] || 0) + 1;
    if (dup) refund += RARITY[c.r].dup;
    got.push({ c, dup });
  }
  if (refund) grant({ coins: refund });
  save(); render();
  enqueue(() => overlay(`<div class="ov-pack">
      <div class="orn"><span>${p.name}</span></div>
      <div class="stage pack" id="stage3d"><div class="css-pack" style="--pc:${p.color}">✦</div></div>
      <p class="sub" id="pk-hint">點擊卡包，施放開封咒</p>
      <div class="reveal" id="reveal"></div>
      <div class="pk-foot" id="pk-foot"></div></div>`, async o => {
    const stage = $('#stage3d', o), h3d = await mount(stage, 'pack', { color: p.color, dist: 8 });
    if (h3d) $('.css-pack', stage)?.remove();
    let opened = false;
    stage.addEventListener('click', async () => {
      if (opened) return; opened = true; $('#pk-hint', o).textContent = '⋯';
      FX.sound('cast');
      const b = stage.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const sparks = setInterval(() => FX.burst(cx, cy, p.color, 10, 260), 120);
      if (h3d) await h3d.charge(); else { stage.classList.add('shake'); await new Promise(r => setTimeout(r, 900)); }
      clearInterval(sparks);
      FX.burst(cx, cy, '#ffffff', 120, 620); FX.ring(cx, cy, '#f1c75b', 260, .9);
      const fl = document.createElement('div'); fl.className = 'flash'; document.body.appendChild(fl); setTimeout(() => fl.remove(), 700);
      h3d && h3d.dispose(); stage.remove(); $('#pk-hint', o).textContent = '點擊卡牌翻開';
      const rv = $('#reveal', o);
      rv.innerHTML = got.map((g, i) => `<div class="flip" data-i="${i}" style="animation-delay:${i * 90}ms"><div class="flip-in"><div class="flip-back">✦</div><div class="flip-front">${cardFace(g.c)}${g.dup ? `<div class="dup">重複 +${RARITY[g.c.r].dup}${ic('coins')}</div>` : '<div class="new">NEW</div>'}</div></div></div>`).join('');
      let left = got.length;
      rv.addEventListener('click', e => {
        const f = e.target.closest('.flip'); if (!f || f.classList.contains('on')) return;
        f.classList.add('on'); const g = got[+f.dataset.i], fb = f.getBoundingClientRect();
        const big = g.c.r === 'e' || g.c.r === 'l'; FX.sound(big ? 'rare' : 'flip');
        FX.burst(fb.left + fb.width / 2, fb.top + fb.height / 2, RARITY[g.c.r].color, big ? 90 : 24, big ? 520 : 240);
        if (g.c.r === 'l') FX.fireworks(4);
        if (--left === 0) { $('#pk-hint', o).textContent = refund ? `重複卡牌已轉換為 ${refund} 金幣` : '全新收藏入手！'; $('#pk-foot', o).innerHTML = `<button class="btn gold" data-act="ov-close">收入圖鑑</button>`; }
      });
    });
  }).then(() => { render(); checkAch(); }));
}

// ---------- 畫面 ----------
const TABS = [['study', '修習', '🕯'], ['quests', '任務', '📜'], ['world', '世界', '🏰'], ['shop', '獎勵', '🏪'], ['cards', '卡牌', '🎴'], ['ach', '挑戰', '🏆'], ['profile', '檔案', '🧙']];
// 標題：第一個字做成彩飾首字
const orn = t => `<h2 class="orn"><span><b class="cap"><i>${t[0]}</i></b>${t.slice(1)}</span></h2>`;

function hud() {
  const L = lv(), h = HOUSES[S.profile.house];
  return `<header class="hud">
    <button class="who" data-act="tab" data-tab="profile">
      <div class="hex" style="--hc:${h.color}"><b>${L.level}</b></div>
      <div class="who-t"><div class="name">${esc(S.profile.name)}</div>
        <div class="xpbar"><i style="width:${(L.cur / L.need * 100).toFixed(1)}%"></i></div>
        <small>${h.name}　${S.stats.streak ? `🔥 連續 ${S.stats.streak} 天` : '今日尚未施法'}</small></div>
    </button>
    <nav class="tabs">${TABS.map(([k, n, e]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}"><em>${e}</em><span>${n}</span></button>`).join('')}</nav>
    <div class="purse">
      <span class="cur" id="cur-coins" title="金幣">${ic('coins')}${S.coins}</span>
      <span class="cur" id="cur-gems" title="星晶">${ic('gems')}${S.gems}</span>
      <span class="cur" id="cur-tickets" title="通行票">${ic('tickets')}${S.tickets}</span>
    </div></header>
    ${S.focus ? `<div class="timerbar fc">🕯 專注修習中　<b id="fc-mini">--:--</b><button data-act="focus-show">回到專注畫面</button></div>` : ''}
    ${S.timer ? `<div class="timerbar">⏳ ${esc(S.timer.name)}　<b id="timer">--:--</b><button data-act="stop-timer">提前結束</button></div>` : ''}`;
}

const pips = n => '◆'.repeat(n) + '◇'.repeat(4 - n);
function questRow(t) {
  const d = DIFFS[t.diff], c = CATS[t.cat], done = isDone(t), late = t.due && !done && t.due < today();
  return `<li class="quest ${done ? 'done' : ''}" data-id="${t.id}" style="--cc:${c.color}">
    <span class="dia"><em>${c.icon}</em></span>
    <div class="q-body">
      <div class="q-title" ${done ? '' : 'contenteditable="plaintext-only" spellcheck="false"'} data-edit="${t.id}">${esc(t.title)}</div>
      <div class="q-meta"><span class="pips">${pips(d.pips)}</span> ${d.name}・${c.name}${t.daily ? '・🔁 每日' : ''}${t.due ? `・<span class="${late ? 'late' : ''}">⏰ ${t.due.slice(5).replace('-', '/')}</span>` : ''}
        <span class="rw">${ic('coins')}${d.coins}　XP ${d.xp}${d.gems ? `　${ic('gems')}${d.gems}` : ''}${d.tickets ? `　${ic('tickets')}${d.tickets}` : ''}</span></div>
    </div>
    ${done ? '<span class="stamp">已完成</span>' : `<button class="cast" data-act="done" data-id="${t.id}">✦<span>施法完成</span></button>`}
    <button class="x" data-act="del-task" data-id="${t.id}" title="刪除">✕</button></li>`;
}
function vQuests() {
  const f = t => filter === 'all' || t.cat === filter;
  const sortFn = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || b.created - a.created;
  const daily = S.tasks.filter(t => t.daily && f(t)).sort((a, b) => isDone(a) - isDone(b));
  const open = S.tasks.filter(t => !t.daily && !t.doneAt && f(t)).sort(sortFn);
  const done = S.tasks.filter(t => !t.daily && t.doneAt && f(t)).sort((a, b) => b.doneAt - a.doneAt);
  return `${orn('任務之書')}
  <form class="add" id="f-task">
    <div class="add-row"><input name="title" placeholder="寫下一個任務、待辦或目標⋯ 按 Enter 加入" autocomplete="off" maxlength="120" required><button class="btn gold">＋ 立下誓約</button></div>
    <div class="add-opts">
      <div class="seg">${Object.entries(CATS).map(([k, c]) => `<button type="button" class="chip ${draft.cat === k ? 'on' : ''}" style="--cc:${c.color}" data-act="d-cat" data-v="${k}">${c.icon} ${c.name}</button>`).join('')}</div>
      <div class="seg">${Object.entries(DIFFS).map(([k, d]) => `<button type="button" class="chip ${draft.diff === k ? 'on' : ''}" data-act="d-diff" data-v="${k}">${d.name} <small>${ic('coins')}${d.coins}</small></button>`).join('')}</div>
      <div class="seg"><button type="button" class="chip ${draft.daily ? 'on' : ''}" data-act="d-daily">🔁 每日重複</button>
        <label class="chip date">⏰ 期限 <input type="date" name="due"></label></div>
    </div>
  </form>
  <div class="filters"><button class="chip ${filter === 'all' ? 'on' : ''}" data-act="filter" data-v="all">全部</button>${Object.entries(CATS).map(([k, c]) => `<button class="chip ${filter === k ? 'on' : ''}" style="--cc:${c.color}" data-act="filter" data-v="${k}">${c.icon} ${c.name}</button>`).join('')}</div>
  ${daily.length ? `<h3 class="sec">每日修行 <small>${daily.filter(isDone).length} / ${daily.length}</small></h3><ul class="quests">${daily.map(questRow).join('')}</ul>` : ''}
  <h3 class="sec">進行中的任務 <small>${open.length}</small></h3>
  ${open.length ? `<ul class="quests">${open.map(questRow).join('')}</ul>` : `<p class="empty">目前沒有任務。在上方寫下第一個誓約，完成後即可獲得金幣與經驗。</p>`}
  ${done.length ? `<h3 class="sec click" data-act="toggle-done">已完成 <small>${done.length}　${showDone ? '▲ 收合' : '▼ 展開'}</small></h3>${showDone ? `<ul class="quests">${done.slice(0, 50).map(questRow).join('')}</ul>` : ''}` : ''}
  ${vIdeas()}`;
}

function vStudy() {
  const st = ST(), mins = minsToday(), due = dueCards().length, open = S.tasks.filter(t => !isDone(t));
  const days = [...Array(7)].map((_, i) => dayOff(i - 6)), mx = Math.max(st.goal, ...days.map(d => st.log[d] || 0));
  const decks = [...new Set(st.cards.map(c => c.deck))];
  const next = !mins && due ? 'cards' : mins < st.goal ? 'focus' : due ? 'cards' : 'rest';
  return `${orn('今日修習')}
  <p class="lead c">${next === 'cards' ? `先花幾分鐘複習 <b class="gold-t">${due}</b> 張到期的記憶卡，再開始今天的專注。` : next === 'focus' ? `今天還差 <b class="gold-t">${st.goal - mins}</b> 分鐘達成目標。選一件事，開始專注。` : next === 'rest' ? '今天的目標已經達成，可以放心去探索世界或兌換獎勵了。' : ''}</p>
  <div class="st-top">
    <div><b>${mins}<small> / ${st.goal}</small></b><small>今日專注分鐘</small><div class="bar"><i style="width:${Math.min(100, mins / st.goal * 100)}%"></i></div></div>
    <div><b>${due}</b><small>張記憶卡到期</small></div>
    <div><b>⚡ ${Math.floor(st.energy)}</b><small>探索能量（分鐘）</small></div>
    <div><b>🔥 ${S.stats.streak}</b><small>連續天數</small></div>
  </div>
  <div class="week">${days.map(d => { const v = st.log[d] || 0; return `<div title="${d}：${v} 分鐘"><i style="height:${Math.round(v / mx * 100)}%" class="${v >= st.goal ? 'ok' : ''}"></i><small>${'日一二三四五六'[new Date(d + 'T12:00').getDay()]}</small></div>`; }).join('')}</div>
  <h3 class="sec">專注修習</h3>
  <div class="panel fstart">
    <select id="fc-task"><option value="">不指定任務（自由修習）</option>${open.map(t => `<option value="${t.id}" ${draftF.task === t.id ? 'selected' : ''}>${CATS[t.cat].icon} ${esc(t.title)}</option>`).join('')}</select>
    <div class="seg">${[15, 25, 45, 60].map(m => `<button class="chip ${draftF.mins === m ? 'on' : ''}" data-act="f-mins" data-v="${m}">${m} 分鐘</button>`).join('')}</div>
    <button class="btn gold big" data-act="focus-start">🕯 ${S.focus ? '回到專注畫面' : `開始專注 ${draftF.mins} 分鐘`}</button>
    <small class="dim">完成可得 ${ic('coins')}${Math.round(draftF.mins * 1.2)}、XP ${draftF.mins}、⚡${Math.round(draftF.mins * .4)} 分鐘探索能量${draftF.mins >= 45 ? `、${ic('gems')}1` : ''}。</small>
  </div>
  <form class="add quick" id="f-quick"><div class="add-row"><input name="title" placeholder="突然想到要做的事？先記下來，回頭再處理" autocomplete="off" maxlength="120" required><button class="btn">＋ 記下</button></div></form>
  <h3 class="sec">記憶卡複習 <small>共 ${st.cards.length} 張${st.rev[today()] ? `・今天已複習 ${st.rev[today()]} 張` : ''}</small></h3>
  ${st.cards.length ? `<div class="decks"><button class="deck all ${due ? '' : 'none'}" data-act="rv-start" data-deck=""><b>全部到期</b><span>${due} 張</span></button>${decks.map(d => { const n = dueCards(d).length; return `<button class="deck ${n ? '' : 'none'}" data-act="rv-start" data-deck="${esc(d)}"><b>${esc(d)}</b><span>${n} 張到期 / 共 ${st.cards.filter(c => c.deck === d).length}</span></button>`; }).join('')}</div>`
    : `<p class="empty">還沒有記憶卡。把課本重點、單字、公式寫成「問題 → 答案」，系統會在你快忘記的時候安排複習。</p>`}
  <details class="panel" ${st.cards.length ? '' : 'open'}><summary>＋ 新增記憶卡</summary>
    <form id="f-card" class="cform"><input name="deck" list="dl-decks" placeholder="牌組（例如：英文單字、微積分）" maxlength="30" value="${esc(draftF.deck || decks[0] || '')}"><datalist id="dl-decks">${decks.map(d => `<option value="${esc(d)}">`).join('')}</datalist>
      <textarea name="q" rows="2" placeholder="問題（正面）" maxlength="500"></textarea><textarea name="a" rows="2" placeholder="答案（背面）" maxlength="1000"></textarea>
      <textarea name="bulk" rows="3" placeholder="或一次貼上多張：每行一張，用「|」或 Tab 分隔問題與答案&#10;photosynthesis | 光合作用&#10;mitochondria | 粒線體"></textarea>
      <button class="btn gold">加入</button></form></details>
  ${st.cards.length ? `<details class="panel"><summary>管理記憶卡</summary><ul class="clist">${st.cards.slice(-200).reverse().map(c => `<li><div><b>${esc(c.q)}</b><small>${esc(c.a)}</small></div><span>${esc(c.deck)}<br>${c.due <= today() ? '到期' : c.due.slice(5).replace('-', '/')}</span><button class="x" data-act="del-card" data-id="${c.id}">✕</button></li>`).join('')}</ul></details>` : ''}
  ${st.notes.length ? `<h3 class="sec">回想筆記 <small>專注後寫下的重點</small></h3><ul class="ideas">${st.notes.slice(0, 12).map(x => `<li class="idea"><div class="idea-t">${esc(x.text)}</div><div class="idea-f"><small>${new Date(x.at).toLocaleDateString('zh-TW')}${x.task ? '・' + esc(x.task) : ''}</small><span><button class="btn sm ghost" data-act="del-note" data-id="${x.id}">刪除</button></span></div></li>`).join('')}</ul>` : ''}`;
}

function vIdeas() {
  return `<h3 class="sec">思緒瓶 <small>${S.ideas.length}</small></h3>
  <p class="lead">任何一閃而過的念頭、想做的事、還沒想清楚的計畫，先倒進瓶子裡，之後再決定要不要變成任務。</p>
  <form class="add" id="f-idea"><div class="add-row"><textarea name="text" rows="2" placeholder="把想法丟進來⋯（Ctrl + Enter 送出）" maxlength="1000" required></textarea><button class="btn gold">💧 存入</button></div></form>
  ${S.ideas.length ? `<ul class="ideas">${S.ideas.map(i => `<li class="idea"><div class="idea-t" contenteditable="plaintext-only" spellcheck="false" data-edit-idea="${i.id}">${esc(i.text)}</div>
    <div class="idea-f"><small>${new Date(i.created).toLocaleDateString('zh-TW')}</small><span><button class="btn sm" data-act="idea-task" data-id="${i.id}">📜 轉為任務</button><button class="btn sm ghost" data-act="del-idea" data-id="${i.id}">刪除</button></span></div></li>`).join('')}</ul>`
    : `<p class="empty">瓶子還是空的。</p>`}`;
}

function vShop() {
  const disc = tal('barter') * 5, bag = S.bag.filter(b => !b.used), used = S.bag.filter(b => b.used).slice(0, 8);
  return `${orn('獎勵商店')}
  <p class="lead">用任務賺來的貨幣，兌換現實生活中的獎勵。${disc ? `<b class="gold-t">商人話術生效中：全品項 -${disc}%</b>` : ''}</p>
  <div class="grid shop">${S.rewards.map(r => `<div class="item"><button class="x" data-act="del-reward" data-id="${r.id}" title="移除">✕</button>
    <div class="item-ic">${esc(r.icon)}</div><div class="item-n">${esc(r.name)}</div>${r.minutes ? `<div class="item-m">⏳ ${r.minutes} 分鐘計時</div>` : '<div class="item-m">&nbsp;</div>'}
    <button class="btn buy ${S[r.cur] >= price(r) ? 'gold' : 'dis'}" data-act="buy" data-id="${r.id}">${ic(r.cur)} ${price(r)}</button></div>`).join('')}</div>
  <details class="panel"><summary>＋ 自訂新的獎勵</summary>
    <form id="f-reward" class="rform">
      <label>圖示<input name="icon" value="🎁" maxlength="4" class="w-s"></label>
      <label class="grow">名稱<input name="name" placeholder="例如：看一場電影" maxlength="40" required></label>
      <label>價格<input name="cost" type="number" min="1" max="99999" value="100" class="w-m" required></label>
      <label>貨幣<select name="cur"><option value="coins">金幣</option><option value="gems">星晶</option><option value="tickets">通行票</option></select></label>
      <label>計時（分鐘，可留 0）<input name="minutes" type="number" min="0" max="600" value="0" class="w-m"></label>
      <button class="btn gold">加入商店</button>
    </form></details>
  <h3 class="sec">背包 <small>${bag.length} 件未使用</small></h3>
  ${bag.length ? `<ul class="bag">${bag.map(b => `<li><span class="bag-ic">${esc(b.icon)}</span><div><b>${esc(b.name)}</b><small>${b.minutes ? `使用後開始 ${b.minutes} 分鐘倒數` : '隨時可使用'}</small></div><button class="btn gold sm" data-act="use" data-id="${b.id}">使用</button></li>`).join('')}</ul>` : `<p class="empty">背包是空的。兌換的獎勵會先放在這裡，想用的時候再使用。</p>`}
  ${used.length ? `<h3 class="sec">最近使用</h3><ul class="bag used">${used.map(b => `<li><span class="bag-ic">${esc(b.icon)}</span><div><b>${esc(b.name)}</b><small>${new Date(b.used).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div></li>`).join('')}</ul>` : ''}`;
}

function vCards() {
  const n = owned();
  return `${orn('卡牌圖鑑')}
  <div class="grid packs">${Object.entries(PACKS).map(([k, p]) => `<div class="pack" style="--pc:${p.color}"><div class="pack-art"><i>✦</i><b>ARCANUM</b></div>
    <div class="item-n">${p.name}</div><div class="item-m">${p.desc}</div>
    <button class="btn buy ${S[p.cur] >= p.cost ? 'gold' : 'dis'}" data-act="pack" data-id="${k}">${ic(p.cur)} ${p.cost}</button></div>`).join('')}</div>
  <h3 class="sec">收藏進度 <small>${n} / ${CARDS.length}</small></h3>
  <div class="bar"><i style="width:${n / CARDS.length * 100}%"></i></div>
  <div class="grid coll">${CARDS.map(c => S.cards[c.id] ? `<div class="slot" title="${esc(c.lore)}">${cardFace(c, S.cards[c.id])}</div>` : `<div class="slot"><div class="tc unk r-${c.r}"><div class="tc-art">?</div><div class="tc-name">未發現</div><div class="tc-rar">${RARITY[c.r].name}</div></div></div>`).join('')}</div>`;
}

function vAch() {
  const ctx = achCtx(), got = ACHS.filter(a => S.ach[a.id]).length;
  return `${orn('挑戰')}
  <div class="trophy-hero"><div class="stage" id="trophy3d"></div><div><div class="big-n">${got} <small>/ ${ACHS.length}</small></div><p class="sub">已收藏的魔法珍寶<br>每項挑戰都會封存一件珍寶與星晶</p></div></div>
  <ul class="achs">${ACHS.map(a => { const [v, g] = a.prog(ctx), ok = !!S.ach[a.id]; return `<li class="ach ${ok ? 'ok' : ''}"><span class="relic" data-relic="${a.relic}" data-locked="${ok ? 0 : 1}" title="${ok ? RELICS[a.relic] : '尚未解鎖的珍寶'}"></span>
    <div class="q-body"><b>${a.name}</b><small>${a.desc}<br>${ok ? `🏺 ${RELICS[a.relic]}` : '🔒 封印中的珍寶'}</small><div class="bar"><i style="width:${Math.min(100, v / g * 100)}%"></i></div></div>
    <span class="ach-r">${ok ? '已領取' : `${Math.min(v, g)} / ${g}`}<br>${ic('gems')} ${a.gems}</span></li>`; }).join('')}</ul>`;
}

function vProfile() {
  const L = lv(), h = HOUSES[S.profile.house];
  return `${orn('巫師檔案')}
  <div class="sheet">
    <div class="sheet-l">${crest(S.profile.house, 150)}<h3>${esc(S.profile.name)}</h3><p class="sub">${h.name}・${h.en}</p>
      <div class="hex big" style="--hc:${h.color}"><b>${L.level}</b></div><div class="xpbar wide"><i style="width:${L.cur / L.need * 100}%"></i></div><small>${L.cur} / ${L.need} XP</small></div>
    <div class="sheet-r">
      <div class="stats">
        <div><b>${S.stats.done}</b><small>完成任務</small></div><div><b>${S.stats.streak}</b><small>連續天數</small></div>
        <div><b>${S.stats.best}</b><small>最長連續</small></div><div><b>${S.stats.coinsEarned}</b><small>累計金幣</small></div>
        <div><b>${owned()}</b><small>卡牌收藏</small></div><div><b>${S.stats.redeemed}</b><small>兌換獎勵</small></div>
      </div>
      <h3 class="sec">天賦 <small>可用天賦點：<b class="gold-t">${S.talentPts}</b>（每升 1 級獲得 1 點）</small></h3>
      <div class="grid talents">${Object.entries(TALENTS).map(([k, t]) => { const l = tal(k), can = S.talentPts > 0 && l < t.max; return `<button class="talent ${can ? 'can' : ''} ${l >= t.max ? 'max' : ''}" data-act="talent" data-id="${k}">
        <div class="tal-ic">${t.icon}</div><div class="tal-tr">${t.track}</div><b>${t.name}</b><small>${t.desc}</small><div class="tal-l">${'◆'.repeat(l)}${'◇'.repeat(t.max - l)}</div></button>`; }).join('')}</div>
    </div>
  </div>
  <h3 class="sec">設定與存檔</h3>
  <div class="panel settings">
    <label>巫師名<input id="set-name" value="${esc(S.profile.name)}" maxlength="20"></label>
    <div class="seg">${Object.entries(HOUSES).map(([k, x]) => `<button class="chip ${S.profile.house === k ? 'on' : ''}" style="--cc:${x.color}" data-act="set-house" data-v="${k}">${x.name}</button>`).join('')}</div>
    <div class="seg"><button class="chip ${ST().gate ? 'on' : ''}" data-act="gate">${ST().gate ? '🎓 學習優先模式：開啟（世界需要探索能量）' : '🎓 學習優先模式：關閉'}</button>
      <label class="chip">每日專注目標 <input id="set-goal" type="number" min="10" max="600" step="5" value="${ST().goal}" style="width:4.5em"> 分鐘</label></div>
    <div class="seg"><button class="chip ${S.sound ? 'on' : ''}" data-act="sound">${S.sound ? '🔊 音效開啟' : '🔇 音效關閉'}</button>
      <button class="chip" data-act="export">⬇ 匯出存檔</button><label class="chip">⬆ 匯入存檔<input type="file" id="imp" accept="application/json,.json" hidden></label>
      <button class="chip danger" data-act="reset">重置所有進度</button></div>
    <small class="dim">進度自動儲存在這台裝置的瀏覽器裡。換裝置或清除瀏覽資料前，請先匯出存檔。</small>
  </div>`;
}

function worldDay() { if (!S.world || S.world.day !== today()) S.world = { day: today(), coins: [], dummies: [], chest: false, kills: 0, prof: [] }; S.world.kills ??= 0; S.world.prof ??= []; return S.world; }
function vWorld() {
  const w = worldDay();
  return `${orn('學院世界')}
  <div class="world-hero"><div class="wh-in">
    <h3>奧術學院・湖畔古堡</h3>
    <p>走進懸崖上的魔法城堡：在庭院練習咒語、和學生與教授交談、走進星象大廳；騎上掃帚繞過觀星塔、鐘樓和湖上的木廊橋，或到森林深處驅逐暗影遊魂、尋找寶箱。</p>
    <div class="loot"><span>${ic('coins')} 金幣 ${w.coins.length} / 20</span><span>🎯 訓練假人 ${w.dummies.length} / 3</span><span>👻 遊魂 ${Math.min(w.kills, 10)} / 10</span><span>🧰 寶箱 ${w.chest ? 1 : 0} / 1</span><span>🎓 教授 ${w.prof.length} / 2</span><span>🧹 飛環巡禮 ${w.rings ? 1 : 0} / 1</span></div>
    <button class="btn gold big ${ST().gate && ST().energy < 1 ? 'dis' : ''}" data-act="enter-world">⚔ 進入世界${ST().gate ? `　⚡ ${Math.floor(ST().energy)} 分鐘` : ''}</button>
    <small>${ST().gate ? '探索世界會消耗探索能量。專注 25 分鐘可得 10 分鐘，複習記憶卡與完成任務也會累積。' : '學習優先模式已關閉，可以自由進出世界。'}世界獎勵每天重置一次。</small>
  </div></div>
  <h3 class="sec">操作方式</h3>
  <div class="grid keys"><div><b>WASD</b><small>移動</small></div><div><b>滑鼠</b><small>轉動視角</small></div><div><b>Shift</b><small>奔跑</small></div><div><b>空白鍵</b><small>跳躍</small></div>
    <div><b>左鍵 / F</b><small>基礎咒</small></div><div><b>Q</b><small>漂浮咒（傷害加倍）</small></div><div><b>E</b><small>烈焰咒</small></div><div><b>T</b><small>與學生、教授交談</small></div><div><b>R</b><small>騎上／收起飛天掃帚</small></div><div><b>空白 / C</b><small>飛行中上升／下降</small></div><div><b>手機</b><small>左搖桿＋右側拖曳</small></div></div>`;
}
let inWorld = false;
async function enterWorld() {
  if (inWorld) return;
  if (S.focus) return toast('專注修習進行中，結束後再來探索吧');
  if (ST().gate && ST().energy < 1) { FX.sound('deny'); tab = 'study'; render(); return toast('⚡ 探索能量用完了。先專注修習或複習記憶卡來補充', 4000); }
  inWorld = true; let spent = 0;
  const w = worldDay(), ups = [], give = (r, msg) => { ups.push(...grant(r)); save(); toast(msg, 1800); };
  try {
    const { openWorld } = await import('./world.js');
    await openWorld({
      color: HOUSES[S.profile.house].color, dark: HOUSES[S.profile.house].dark, done: w, toast, sound: FX.sound,
      // 每秒呼叫一次：扣除探索能量，回傳剩餘分鐘（關閉學習優先模式時為 null）
      spend: sec => { if (!ST().gate) return null; ST().energy = Math.max(0, ST().energy - sec / 60); if (++spent % 20 === 0) save(); return ST().energy; },
      onCoin: id => { w.coins.push(id); give({ coins: 2, xp: 1 }, `${ic('coins')} +2 金幣`); },
      onDummy: id => { w.dummies.push(id); give({ coins: 10, xp: 8 }, `🎯 擊倒假人　${ic('coins')} +10　XP +8`); },
      onKill: big => { w.kills++; give(big ? { coins: 15, xp: 12 } : { coins: 6, xp: 5 }, `👻 驅散${big ? '暗影統領' : '暗影遊魂'}　${ic('coins')} +${big ? 15 : 6}`); },
      profTalk: id => {
        const td = today(), n = S.tasks.filter(t => t.daily ? t.lastDone === td : t.doneAt && ymd(new Date(t.doneAt)) === td).length;
        if (w.prof.includes(id)) return '今天的報到已經完成了。明天再帶著新的成果來找我吧。';
        if (!n) return '歡迎。不過在我這裡，獎勵只給今天真正完成過任務的人——先去任務之書完成一件事，再回來找我。';
        w.prof.push(id); give({ coins: 15, gems: 1, xp: 10 }, `🎓 教授的獎勵　${ic('coins')} +15　${ic('gems')} +1`);
        return `很好，你今天已經完成了 ${n} 個任務。這是你應得的獎勵，繼續保持。`;
      },
      onRings: () => { w.rings = true; give({ coins: 25, gems: 1, xp: 15 }, `🧹 完成飛環巡禮！${ic('coins')} +25　${ic('gems')} +1`); },
      onChest: () => { w.chest = true; give({ coins: 20, gems: 1, xp: 15 }, `🧰 發現寶箱！${ic('coins')} +20　${ic('gems')} +1`); },
    });
  } catch (e) { console.error(e); document.getElementById('world')?.remove(); toast('⚠️ 無法載入 3D 世界（需要網路連線與支援 WebGL 的瀏覽器）', 4000); }
  inWorld = false; save(); render(); ups.forEach(l => enqueue(() => levelUp(l).then(render))); checkAch();
}

function vOnboard() {
  const h = HOUSES[obHouse];
  return `<div class="onboard"><div class="ob-l">
    <div class="sigil"></div>${orn('入學儀式')}
    <p class="lead c">歡迎來到奧術學院。選擇你的學院，開始把每天的任務變成一場修行。</p>
    <div class="ob-crests">${Object.keys(HOUSES).map(k => `<button class="ob-c ${obHouse === k ? 'on' : ''}" data-act="ob-house" data-v="${k}">${crest(k, 120)}</button>`).join('')}</div>
    ${orn(h.name)}<p class="lead c">${h.desc}</p>
    <form id="f-onboard" class="ob-form"><input name="name" placeholder="你的巫師名" maxlength="20" required autocomplete="off"><button class="btn gold">Ⓐ 入學</button></form>
  </div><div class="ob-r"><div class="stage" id="ob3d"></div></div></div>`;
}

const views = { study: vStudy, quests: vQuests, world: vWorld, shop: vShop, cards: vCards, ach: vAch, profile: vProfile };
function render() {
  if (!S.profile.house) {
    document.documentElement.style.setProperty('--house', HOUSES[obHouse].color);
    app.innerHTML = vOnboard();
    mount($('#ob3d'), 'gem', { color: HOUSES[obHouse].color, spin: .7, dist: 6.5 });
    return;
  }
  const y = scrollY;
  document.documentElement.style.setProperty('--house', HOUSES[S.profile.house].color);
  app.innerHTML = hud() + `<main class="view v-${tab}"><div class="sigil"></div><div class="sigil l"></div>${views[tab]()}</main>`;
  scrollTo(0, y); tick(); if (S.focus && !render.once) { render.once = 1; showFocus(); }
  if (tab === 'ach') {
    mount($('#trophy3d'), 'trophy', { tier: Math.min(2, Math.floor(Object.keys(S.ach).length / 7)), dist: 9 });
    cabinet([...document.querySelectorAll('.relic')].map(el => ({ el, kind: el.dataset.relic, locked: el.dataset.locked === '1' })));
  }
}

// ---------- 事件 ----------
const acts = {
  tab: el => { tab = el.dataset.tab; render(); scrollTo(0, 0); },
  'enter-world': () => enterWorld(),
  'f-mins': el => { draftF.mins = +el.dataset.v; render(); },
  'focus-start': () => startFocus(), 'focus-show': () => showFocus(), 'focus-hide': () => $('#focus')?.remove(),
  'focus-stop': () => { if (confirm('要提早結束這次專注嗎？已經過的時間仍會計入（滿 5 分鐘）。')) endFocus(false); },
  'focus-save': el => {
    const tx = $('#recall')?.value.trim(), t = S.tasks.find(x => x.id === el.dataset.task), fin = $('#fc-done')?.checked;
    if (tx) ST().notes.unshift({ id: uid(), text: tx, at: Date.now(), task: t ? t.title : '' }); save(); $('#overlay')._close?.();
    if (fin && t) completeTask(t.id, null);
  },
  'rv-start': el => startReview(el.dataset.deck), 'rv-show': () => { if (rv) { rv.shown = true; drawReview(); } }, 'rv-grade': el => gradeCard(el.dataset.g), 'rv-quit': () => endReview(),
  'del-card': el => { ST().cards = ST().cards.filter(c => c.id !== el.dataset.id); save(); el.closest('li').remove(); },
  'del-note': el => { ST().notes = ST().notes.filter(c => c.id !== el.dataset.id); save(); render(); },
  gate: () => { ST().gate = !ST().gate; save(); render(); },
  'ov-close': () => $('#overlay')._close?.(),
  'ob-house': el => { obHouse = el.dataset.v; const n = $('#f-onboard input')?.value; render(); if (n) $('#f-onboard input').value = n; FX.sound('flip'); },
  'd-cat': el => { draft.cat = el.dataset.v; keepForm(); },
  'd-diff': el => { draft.diff = el.dataset.v; keepForm(); },
  'd-daily': () => { draft.daily = !draft.daily; keepForm(); },
  filter: el => { filter = el.dataset.v; render(); },
  'toggle-done': () => { showDone = !showDone; render(); },
  done: el => completeTask(el.dataset.id, el),
  'del-task': el => { S.tasks = S.tasks.filter(t => t.id !== el.dataset.id); save(); render(); },
  'del-idea': el => { S.ideas = S.ideas.filter(t => t.id !== el.dataset.id); save(); render(); },
  'idea-task': el => { const i = S.ideas.find(t => t.id === el.dataset.id); if (!i) return; addTask(i.text.slice(0, 120), { note: '' }); S.ideas = S.ideas.filter(t => t !== i); save(); toast('已轉為任務（可到任務頁調整）'); render(); },
  buy: el => buy(el.dataset.id, el),
  'del-reward': el => { S.rewards = S.rewards.filter(r => r.id !== el.dataset.id); save(); render(); },
  use: el => useItem(el.dataset.id),
  'stop-timer': () => { S.timer = null; save(); render(); },
  pack: el => openPack(el.dataset.id, el),
  talent: el => {
    const k = el.dataset.id, t = TALENTS[k];
    if (tal(k) >= t.max) return toast('這項天賦已經滿級');
    if (S.talentPts < 1) { FX.sound('deny'); return toast('沒有可用的天賦點，升級後即可獲得'); }
    S.talentPts--; S.talents[k] = tal(k) + 1; save();
    const b = el.getBoundingClientRect(); FX.spell(b.left + b.width / 2, b.top + b.height / 2, '#b07cf0'); FX.sound('rare'); render();
  },
  'set-house': el => { S.profile.house = el.dataset.v; save(); render(); },
  sound: () => { S.sound = !S.sound; FX.setMuted(!S.sound); save(); render(); FX.sound('coin'); },
  export: () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
    a.download = `arcanum-save-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  reset: () => { if (confirm('確定要清除所有任務、貨幣與收藏嗎？此動作無法復原。')) { localStorage.removeItem(KEY); S = fresh(); tab = 'study'; render(); } },
};
function keepForm() {
  const f = $('#f-task'), v = f ? [f.elements.title.value, f.elements.due.value] : null; render();
  if (v) { const g = $('#f-task').elements; g.title.value = v[0]; g.due.value = v[1]; g.title.focus(); }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = acts[el.dataset.act]; if (fn) { if (el.tagName === 'BUTTON' && el.type !== 'submit') e.preventDefault(); fn(el); }
});
document.addEventListener('submit', e => {
  e.preventDefault(); const f = e.target, d = new FormData(f);
  if (f.id === 'f-task') { addTask(d.get('title'), { due: d.get('due') }); FX.sound('flip'); render(); $('#f-task input')?.focus(); }
  if (f.id === 'f-quick') { addTask(d.get('title')); FX.sound('flip'); toast('已記到任務之書'); render(); }
  if (f.id === 'f-card') {
    const deck = d.get('deck') || ''; let k = addCard(deck, d.get('q'), d.get('a')) ? 1 : 0;
    for (const line of d.get('bulk').split('\n')) { const i = line.search(/[|\t｜]/); if (i > 0 && addCard(deck, line.slice(0, i), line.slice(i + 1))) k++; }
    if (!k) return toast('請填寫問題與答案（或用「|」分隔的多行文字）');
    draftF.deck = deck; save(); FX.sound('flip'); toast(`已加入 ${k} 張記憶卡`); render();
  }
  if (f.id === 'f-idea') { S.ideas.unshift({ id: uid(), text: d.get('text').trim(), created: Date.now() }); S.stats.ideas++; save(); FX.sound('flip'); render(); checkAch(); }
  if (f.id === 'f-reward') { S.rewards.push({ id: uid(), name: d.get('name').trim(), icon: d.get('icon').trim() || '🎁', cost: Math.max(1, +d.get('cost') || 1), cur: d.get('cur'), minutes: Math.max(0, +d.get('minutes') || 0) }); save(); render(); toast('已加入商店'); }
  if (f.id === 'f-onboard') {
    S.profile = { name: d.get('name').trim(), house: obHouse }; S.coins = 100; S.gems = 3;
    addTask('完成入學儀式，立下第一個誓約', { cat: 'life', diff: 'easy', daily: false });
    save(); render(); FX.sound('level'); FX.fireworks(5);
    toast(`歡迎加入${HOUSES[obHouse].name}！獲得入學禮：100 金幣、3 星晶`, 4500);
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('[contenteditable]')) { e.preventDefault(); e.target.blur(); }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.matches('#f-idea textarea')) e.target.form.requestSubmit();
  if (e.key === 'Escape') $('#overlay .btn[data-act="ov-close"]')?.click();
  if (rv && !e.target.matches('input,textarea')) { if (!rv.shown && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); rv.shown = true; drawReview(); } else if (rv.shown && '1234'.includes(e.key)) gradeCard(['again', 'hard', 'good', 'easy'][e.key - 1]); }
});
document.addEventListener('focusout', e => {
  const el = e.target;
  if (el.dataset?.edit) { const t = S.tasks.find(x => x.id === el.dataset.edit), v = el.textContent.trim(); if (t && v) { t.title = v.slice(0, 120); save(); } else if (t) el.textContent = t.title; }
  if (el.dataset?.editIdea) { const t = S.ideas.find(x => x.id === el.dataset.editIdea), v = el.textContent.trim(); if (t && v) { t.text = v.slice(0, 1000); save(); } else if (t) el.textContent = t.text; }
  if (el.id === 'set-name') { const v = el.value.trim(); if (v) { S.profile.name = v; save(); render(); } }
});
document.addEventListener('change', e => {
  if (e.target.id === 'fc-task') { draftF.task = e.target.value; return; }
  if (e.target.id === 'set-goal') { ST().goal = Math.max(10, Math.min(600, +e.target.value || 60)); save(); return; }
  if (e.target.id !== 'imp') return;
  const file = e.target.files[0]; if (!file) return;
  file.text().then(txt => {
    const d = JSON.parse(txt);
    if (!d || d.v !== 1 || !d.profile || !Array.isArray(d.tasks)) throw new Error('bad');
    if (!confirm('匯入會覆蓋目前這台裝置上的進度，確定嗎？')) return;
    S = { ...fresh(), ...d, stats: { ...fresh().stats, ...d.stats }, study: { ...fresh().study, ...d.study } }; save(); render(); toast('存檔已匯入');
  }).catch(() => toast('⚠️ 這不是有效的存檔檔案'));
});
document.addEventListener('animationend', e => { if (e.animationName === 'pulse') e.target.classList.remove('pulse'); });

render();
if (S.profile.house) checkAch(); // 新增的挑戰若已達成，開啟時就頒發
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
