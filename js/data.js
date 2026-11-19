// 遊戲資料：學派、難度、學院、卡牌、卡包、天賦、成就
export const CATS = {
  study:  { name: '學識', icon: '📖', color: '#5fa8d8' },
  work:   { name: '職務', icon: '⚒️', color: '#d8b24a' },
  health: { name: '體魄', icon: '🌿', color: '#6fbf73' },
  create: { name: '創造', icon: '✨', color: '#a47be0' },
  life:   { name: '生活', icon: '🕯️', color: '#d86a5a' },
};

export const DIFFS = {
  easy:   { name: '簡單', pips: 1, xp: 10,  coins: 15,  gems: 0, tickets: 0 },
  normal: { name: '普通', pips: 2, xp: 25,  coins: 40,  gems: 0, tickets: 0 },
  hard:   { name: '困難', pips: 3, xp: 60,  coins: 100, gems: 1, tickets: 0 },
  epic:   { name: '史詩', pips: 4, xp: 150, coins: 250, gems: 3, tickets: 1 },
};

export const HOUSES = {
  ember: { name: '焰心院', en: 'EMBERHEART', color: '#b5452f', dark: '#5a1d14', glyph: 'flame',
           desc: '焰心院，以勇於行動、說做就做聞名' },
  star:  { name: '星識院', en: 'STARLORE', color: '#3f73a8', dark: '#182f4d', glyph: 'star',
           desc: '星識院，以求知若渴、深思熟慮聞名' },
  root:  { name: '根木院', en: 'ROOTWOOD', color: '#3f8a5c', dark: '#173a27', glyph: 'leaf',
           desc: '根木院，以耐心、踏實與持之以恆聞名' },
  moon:  { name: '月影院', en: 'MOONSHADE', color: '#7a56b8', dark: '#2c1c4d', glyph: 'moon',
           desc: '月影院，以遠大志向與精於謀劃聞名' },
};

export const RARITY = {
  c: { name: '普通', color: '#9fb0b3', dup: 10 },
  r: { name: '稀有', color: '#5fa8d8', dup: 30 },
  e: { name: '史詩', color: '#b07cf0', dup: 80 },
  l: { name: '傳說', color: '#f1c75b', dup: 200 },
};

const C = (id, name, icon, r, lore) => ({ id, name, icon, r, lore });
export const CARDS = [
  C('c01', '螢光甲蟲', '🪲', 'c', '夜讀時最忠實的小燈。'),
  C('c02', '低語羽毛筆', '🪶', 'c', '會在你分心時輕咳一聲。'),
  C('c03', '月光蘑菇', '🍄', 'c', '只在滿月的溫室裡發亮。'),
  C('c04', '銅製望遠鏡', '🔭', 'c', '天文塔的標準配備。'),
  C('c05', '信差貓頭鷹', '🦉', 'c', '從不遲到，只是偶爾繞路。'),
  C('c06', '沸騰坩堝', '⚗️', 'c', '裡頭的東西最好別問。'),
  C('c07', '星塵沙漏', '⏳', 'c', '流下的每一粒都是專注。'),
  C('c08', '咒語卷軸', '📜', 'c', '字跡會隨心情改變。'),
  C('c09', '夜行蝙蝠', '🦇', 'c', '地窖走廊的常客。'),
  C('c10', '黑貓使魔', '🐈‍⬛', 'c', '牠挑選你，而不是你挑選牠。'),
  C('r01', '霜紋獨角獸', '🦄', 'r', '蹄印所到之處結出冰花。'),
  C('r02', '預言水晶球', '🔮', 'r', '只顯示你願意努力的未來。'),
  C('r03', '疾風掃帚', '🧹', 'r', '比風還急著出發。'),
  C('r04', '千門之鑰', '🗝️', 'r', '據說能打開拖延的鎖。'),
  C('r05', '煉金天平', '⚖️', 'r', '衡量付出與收穫。'),
  C('r06', '雷雲精魄', '🌩️', 'r', '脾氣和效率一樣驚人。'),
  C('r07', '秘銀護盾', '🛡️', 'r', '擋下一切干擾。'),
  C('e01', '餘燼幼龍', '🐉', 'e', '打噴嚏時請遠離作業。'),
  C('e02', '星圖羅盤', '🧭', 'e', '永遠指向你的下一個目標。'),
  C('e03', '不滅燭火', '🕯️', 'e', '燃燒了三百年的意志。'),
  C('e04', '逆時懷錶', '⌚', 'e', '替你多偷一小時。'),
  C('e05', '深湖巨怪', '🐙', 'e', '黑湖底下的溫柔守望者。'),
  C('l01', '不死焰鳥', '🔥', 'l', '每一次失敗後都從灰燼重生。'),
  C('l02', '賢者之冠', '👑', 'l', '只為完成者加冕。'),
  C('l03', '星辰古龍', '🌌', 'l', '牠的鱗片即是夜空。'),
];

// 卡牌套組：集滿一組可得星晶與稱號；hue 是卡面背景的色相
export const SETS = [
  { id: 'desk',     name: '學徒書桌', icon: '🪶', hue: 36,  cards: ['c02', 'c07', 'c08', 'c04', 'r05'], gems: 5,  title: '博學學徒' },
  { id: 'beasts',   name: '夜行奇獸', icon: '🦉', hue: 196, cards: ['c01', 'c05', 'c09', 'c10', 'r01'], gems: 6,  title: '馴獸師' },
  { id: 'arcana',   name: '祕法器物', icon: '🔮', hue: 268, cards: ['r02', 'r03', 'r04', 'r07', 'e04'], gems: 10, title: '祕法收藏家' },
  { id: 'elements', name: '元素之力', icon: '🔥', hue: 14,  cards: ['c03', 'c06', 'r06', 'e03', 'e02'], gems: 10, title: '元素調和者' },
  { id: 'legends',  name: '傳說之境', icon: '🐉', hue: 46,  cards: ['e01', 'e05', 'l01', 'l02', 'l03'], gems: 30, title: '傳說見證者' },
];
export const STAR_AT = [1, 3, 6]; // 同一張卡擁有 1／3／6 張時為 ★1／★2／★3，★3 是閃卡

export const PACKS = {
  apprentice: { name: '學徒卡包', n: 3, cost: 200, cur: 'coins',   color: '#3f73a8', odds: { c: 70, r: 25, e: 4.5, l: 0.5 }, desc: '3 張卡牌，入門首選' },
  arcane:     { name: '祕法卡包', n: 5, cost: 5,   cur: 'gems',    color: '#7a56b8', odds: { c: 45, r: 38, e: 14, l: 3 },   desc: '5 張卡牌，稀有率提升' },
  legend:     { name: '傳說卡包', n: 5, cost: 2,   cur: 'tickets', color: '#b8862f', odds: { c: 0, r: 50, e: 38, l: 12 },   desc: '5 張卡牌，保證稀有以上' },
};

export const TALENTS = {
  gold:    { name: '點金術',   icon: '🪙', track: '咒語',     max: 3, desc: '任務金幣 +10%／級' },
  wisdom:  { name: '博學',     icon: '📚', track: '核心',     max: 3, desc: '任務經驗 +10%／級' },
  luck:    { name: '完美施法', icon: '🍀', track: '核心',     max: 3, desc: '雙倍金幣機率 +5%／級' },
  gem:     { name: '晶石感應', icon: '💎', track: '祕術',     max: 3, desc: '任意任務 8%／級 機率額外掉落星晶' },
  barter:  { name: '商人話術', icon: '🤝', track: '應變',     max: 3, desc: '獎勵商店價格 -5%／級' },
  fortune: { name: '卡牌占卜', icon: '🃏', track: '占卜',     max: 3, desc: '開包時 4%／級 機率使卡牌升一階稀有度' },
};

// prog(ctx) 回傳 [目前進度, 目標]；relic 是達成後獲得的 3D 珍寶
const A = (id, name, desc, gems, relic, prog) => ({ id, name, desc, gems, relic, prog });
export const ACHS = [
  A('t1',     '初試啼聲',   '完成第 1 個任務',          1,  'quill',     x => [x.S.stats.done, 1]),
  A('t10',    '勤奮學徒',   '完成 10 個任務',           3,  'candle',    x => [x.S.stats.done, 10]),
  A('t50',    '資深巫師',   '完成 50 個任務',           8,  'wand',      x => [x.S.stats.done, 50]),
  A('t200',   '任務大師',   '完成 200 個任務',          20, 'grimoire',  x => [x.S.stats.done, 200]),
  A('f1',     '點亮心燈',   '完成第 1 次專注修習',      1,  'lantern',   x => [x.focusN, 1]),
  A('fm600',  '專注之鑰',   '累計專注 600 分鐘',        8,  'key',       x => [x.focusMin, 600]),
  A('fm3000', '時光守護者', '累計專注 3000 分鐘',       25, 'watch',     x => [x.focusMin, 3000]),
  A('rv100',  '記憶捲軸',   '複習 100 張記憶卡',        4,  'scroll',    x => [x.reviews, 100]),
  A('rv1000', '過目不忘',   '複習 1000 張記憶卡',       20, 'obelisk',   x => [x.reviews, 1000]),
  A('s3',     '三日之火',   '連續 3 天完成任務或修習',  2,  'brazier',   x => [x.S.stats.best, 3]),
  A('s7',     '七日誓約',   '連續 7 天完成任務或修習',  5,  'hourglass', x => [x.S.stats.best, 7]),
  A('s30',    '月之恆心',   '連續 30 天完成任務或修習', 20, 'moon',      x => [x.S.stats.best, 30]),
  A('l5',     '嶄露頭角',   '達到 5 級',                3,  'potion',    x => [x.level, 5]),
  A('l15',    '學院之星',   '達到 15 級',               10, 'astrolabe', x => [x.level, 15]),
  A('l30',    '賢者之路',   '達到 30 級',               25, 'crown',     x => [x.level, 30]),
  A('g1k',    '小有積蓄',   '累計賺取 1000 金幣',       3,  'coins',     x => [x.S.stats.coinsEarned, 1000]),
  A('g10k',   '龍穴金庫',   '累計賺取 10000 金幣',      15, 'chest',     x => [x.S.stats.coinsEarned, 10000]),
  A('p1',     '拆封的喜悅', '開啟第 1 個卡包',          1,  'cards',     x => [x.S.stats.packs, 1]),
  A('c10',    '收藏家',     '收集 10 種卡牌',           4,  'crystal',   x => [x.owned, 10]),
  A('call',   '圖鑑完成',   '收集全部卡牌',             30, 'egg',       x => [x.owned, CARDS.length]),
  A('r1',     '犒賞自己',   '兌換第 1 個獎勵',          1,  'chalice',   x => [x.S.stats.redeemed, 1]),
  A('i10',    '靈感泉湧',   '在思緒瓶記下 10 個想法',   2,  'bottle',    x => [x.S.stats.ideas, 10]),
];
export const RELICS = {
  quill: '初心羽毛筆', candle: '長明燭台', wand: '晨星魔杖', grimoire: '萬言魔典', lantern: '心燈提燈', key: '專注之鑰', watch: '時光懷錶',
  scroll: '記憶捲軸', obelisk: '符文石碑', brazier: '不熄火盆', hourglass: '七日沙漏', moon: '恆心彎月', potion: '啟明藥劑', astrolabe: '星軌渾天儀',
  crown: '賢者之冠', coins: '第一桶金', chest: '龍穴寶箱', cards: '命運牌組', crystal: '遠見水晶球', egg: '星火龍蛋', chalice: '犒賞聖杯', bottle: '思緒瓶',
};

export const DEFAULT_REWARDS = [
  { id: 'd1', name: '遊戲時間 30 分鐘', icon: '🎮', cost: 150, cur: 'coins',   minutes: 30 },
  { id: 'd2', name: '遊戲時間 1 小時',  icon: '🕹️', cost: 1,   cur: 'tickets', minutes: 60 },
  { id: 'd3', name: '追劇一集',         icon: '📺', cost: 120, cur: 'coins',   minutes: 45 },
  { id: 'd4', name: '手搖飲一杯',       icon: '🧋', cost: 300, cur: 'coins',   minutes: 0 },
  { id: 'd5', name: '吃一頓好料',       icon: '🍜', cost: 8,   cur: 'gems',    minutes: 0 },
  { id: 'd6', name: '買一件想要的東西', icon: '🎁', cost: 25,  cur: 'gems',    minutes: 0 },
];

export const CUR = { coins: '金幣', gems: '星晶', tickets: '通行票' };
