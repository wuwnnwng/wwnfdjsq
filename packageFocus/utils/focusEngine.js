/**
 * 综合脑力自测：大类 → 小类 → 入门 / 经典 / 进阶 / 挑战。
 */

const LEVELS = [
  { id: 'intro', name: '入门', rounds: 4 },
  { id: 'classic', name: '经典', rounds: 5 },
  { id: 'advanced', name: '进阶', rounds: 5 },
  { id: 'challenge', name: '挑战', rounds: 6 }
]

const CATALOG = [
  {
    id: 'memory',
    name: '记忆力',
    hint: '看过、跟过，再认出来',
    subs: [
      { id: 'track', name: '动态小球跟踪', hint: '盯住被圈住的球，看它停在哪' },
      { id: 'digits', name: '数字闪记', hint: '数字闪过后，按顺序选出来' },
      { id: 'order', name: '顺序复原', hint: '记住符号从左到右的顺序' },
      { id: 'grid', name: '格子记忆', hint: '记住刚刚亮起的格子' }
    ]
  },
  {
    id: 'reaction',
    name: '反应力',
    hint: '看准再点，越快越高',
    subs: [
      { id: 'compare', name: '快速比大小', hint: '判断左右哪个数更大' },
      { id: 'color', name: '颜色速认', hint: '看到色块就选出颜色' },
      { id: 'arrow', name: '方向速点', hint: '按箭头要求尽快点对' },
      { id: 'odd', name: '异项点选', hint: '在一群里点出不一样的' }
    ]
  },
  {
    id: 'spatial',
    name: '空间力',
    hint: '转一转、走一走，再对上',
    subs: [
      { id: 'spin', name: '箭头转向', hint: '转过方向之后指向哪' },
      { id: 'mirror', name: '左右镜像', hint: '整排左右颠倒后变成什么' },
      { id: 'rotate', name: '图形旋转', hint: '格子图案转过之后是哪一个' },
      { id: 'path', name: '折线追踪', hint: '从亮格按箭头走，停在哪' }
    ]
  }
]

const HINTS = {
  track: {
    intro: '3 颗球，慢慢交换',
    classic: '4 颗球，中速交换',
    advanced: '5 颗球，加快并藏起字',
    challenge: '6 颗球，快速交换'
  },
  digits: {
    intro: '4 位数字，看得比较久',
    classic: '5 位数字',
    advanced: '6 位数字，闪得更快',
    challenge: '7 位数字，一闪而过'
  },
  order: {
    intro: '3 个符号',
    classic: '4 个符号',
    advanced: '5 个符号',
    challenge: '6 个符号，闪得更快'
  },
  grid: {
    intro: '九宫格，亮 3 格',
    classic: '九宫格，亮 4 格',
    advanced: '十六宫，亮 5 格',
    challenge: '十六宫，亮 6 格'
  },
  compare: {
    intro: '一位数，可以慢慢比',
    classic: '两位数',
    advanced: '很接近的两位数',
    challenge: '很接近的三位数'
  },
  color: {
    intro: '色块留在屏幕上',
    classic: '从更多颜色里认',
    advanced: '色块闪一下就消失',
    challenge: '闪得更短，选项更多'
  },
  arrow: {
    intro: '看箭头指向哪',
    classic: '点它的相反方向',
    advanced: '字和箭头不一致',
    challenge: '干扰更大，还要更快'
  },
  odd: {
    intro: '4 个里找不同',
    classic: '6 个里找不同',
    advanced: '8 个里找不同',
    challenge: '9 个里找不同'
  },
  spin: {
    intro: '顺时针转 90°',
    classic: '顺时针转 180°',
    advanced: '逆时针转 90°',
    challenge: '连续顺时针转两次'
  },
  mirror: {
    intro: '3 个，左右颠倒',
    classic: '4 个，左右颠倒',
    advanced: '5 个，左右颠倒',
    challenge: '6 个，左右颠倒'
  },
  rotate: {
    intro: '九宫格，转 90°',
    classic: '亮格更多，转 90°',
    advanced: '十六宫，转 90°',
    challenge: '十六宫，转 180°'
  },
  path: {
    intro: '九宫格，走 2 步',
    classic: '九宫格，走 3 步',
    advanced: '九宫格，走 4 步',
    challenge: '十六宫，走 5 步'
  }
}

const BALLS = [
  { label: '甲', color: '#e11d48' },
  { label: '乙', color: '#2563eb' },
  { label: '丙', color: '#d97706' },
  { label: '丁', color: '#16a34a' },
  { label: '戊', color: '#7c3aed' },
  { label: '己', color: '#ea580c' }
]
const SYMBOLS = ['星', '月', '云', '花', '叶', '山', '水', '火']
const COLORS = [
  { name: '红', hex: '#e11d48' },
  { name: '蓝', hex: '#2563eb' },
  { name: '黄', hex: '#eab308' },
  { name: '绿', hex: '#16a34a' },
  { name: '紫', hex: '#7c3aed' },
  { name: '橙', hex: '#ea580c' },
  { name: '青', hex: '#0891b2' },
  { name: '粉', hex: '#db2777' }
]
const ARROWS = ['↑', '↓', '←', '→']
const DIR_NAME = { '↑': '上', '↓': '下', '←': '左', '→': '右' }
const CW = { '↑': '→', '→': '↓', '↓': '←', '←': '↑' }
const CCW = { '↑': '←', '←': '↓', '↓': '→', '→': '↑' }
const OPP = { '↑': '↓', '↓': '↑', '←': '→', '→': '←' }
const HFLIP = { '←': '→', '→': '←', '↑': '↑', '↓': '↓', '●': '●', '★': '★' }
const KEYS = ['A', 'B', 'C', 'D', 'E', 'F']

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function shuffle(list) {
  const next = list.slice()
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
  }
  return next
}

function pick(list) {
  return list[randInt(0, list.length - 1)]
}

function sameCells(a, b) {
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function packCells(list) {
  return list.map((on, n) => ({ n, on: on ? 1 : 0, start: 0 }))
}

function rotate90(cells, n) {
  const next = new Array(n * n).fill(0)
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      next[c * n + (n - 1 - r)] = cells[r * n + c]
    }
  }
  return next
}

function fillCells(n, count) {
  const cells = new Array(n * n).fill(0)
  shuffle(cells.map((_, index) => index)).slice(0, count).forEach((index) => {
    cells[index] = 1
  })
  return cells
}

function distinctNear(base, count) {
  const wrongs = []
  let guard = 0
  while (wrongs.length < count && guard < 50) {
    guard += 1
    const next = base.slice()
    const index = randInt(0, next.length - 1)
    next[index] = next[index] ? 0 : 1
    if (sameCells(next, base)) continue
    if (wrongs.some((item) => sameCells(item, next))) continue
    wrongs.push(next)
  }
  return wrongs
}

function makeChoices(entries, answerIndex) {
  const tagged = entries.map((entry, index) => ({
    text: entry.text || '',
    cells: entry.cells ? packCells(entry.cells) : null,
    grid: !!entry.cells,
    gridSize: entry.gridSize || (entry.cells ? 3 : 0),
    answer: index === answerIndex
  }))
  const mixed = shuffle(tagged)
  let answer = KEYS[0]
  const options = mixed.map((entry, index) => {
    const key = KEYS[index]
    if (entry.answer) answer = key
    return {
      key,
      text: entry.text,
      cells: entry.cells,
      grid: entry.grid,
      gridSize: entry.gridSize,
      status: ''
    }
  })
  return { options, answer }
}

function findMeta(subId) {
  for (let i = 0; i < CATALOG.length; i += 1) {
    const dim = CATALOG[i]
    const sub = dim.subs.find((item) => item.id === subId)
    if (sub) return { dim, sub }
  }
  return null
}

function getHome() {
  return CATALOG.map((dim) => ({
    id: dim.id,
    name: dim.name,
    hint: dim.hint,
    count: dim.subs.length
  }))
}

function getSubs(dimId) {
  const dim = CATALOG.find((item) => item.id === dimId)
  if (!dim) return []
  return dim.subs.map((sub) => ({
    id: sub.id,
    name: sub.name,
    hint: sub.hint
  }))
}

function getLevels(subId) {
  const hints = HINTS[subId] || {}
  return LEVELS.map((level, index) => ({
    id: level.id,
    name: level.name,
    rounds: level.rounds,
    hint: hints[level.id] || '',
    bars: [1, 2, 3, 4].map((n) => ({ n, on: n <= index + 1 }))
  }))
}

function slotPos(count) {
  if (count <= 3) {
    return [
      { x: 22, y: 50 },
      { x: 50, y: 50 },
      { x: 78, y: 50 }
    ].slice(0, count)
  }
  if (count === 4) {
    return [
      { x: 30, y: 28 },
      { x: 70, y: 28 },
      { x: 30, y: 72 },
      { x: 70, y: 72 }
    ]
  }
  if (count === 5) {
    return [
      { x: 22, y: 28 },
      { x: 50, y: 22 },
      { x: 78, y: 28 },
      { x: 34, y: 74 },
      { x: 66, y: 74 }
    ]
  }
  return [
    { x: 22, y: 26 },
    { x: 50, y: 26 },
    { x: 78, y: 26 },
    { x: 22, y: 72 },
    { x: 50, y: 72 },
    { x: 78, y: 72 }
  ]
}

function makeTrack(levelId) {
  const cfg = {
    intro: { count: 3, swaps: 3, markMs: 1200, moveMs: 720, hideLabel: false },
    classic: { count: 4, swaps: 5, markMs: 1000, moveMs: 560, hideLabel: false },
    advanced: { count: 5, swaps: 7, markMs: 860, moveMs: 420, hideLabel: true },
    challenge: { count: 6, swaps: 9, markMs: 700, moveMs: 300, hideLabel: true }
  }[levelId]
  const balls = BALLS.slice(0, cfg.count).map((item, index) => ({
    id: 'b' + index,
    label: item.label,
    color: item.color,
    ink: '#ffffff'
  }))
  const startSlots = shuffle(balls.map((item) => item.id))
  const targetSlot = randInt(0, cfg.count - 1)
  const answer = startSlots[targetSlot]
  const swaps = []
  let guard = 0
  while (swaps.length < cfg.swaps && guard < 80) {
    guard += 1
    const a = randInt(0, cfg.count - 1)
    let b = randInt(0, cfg.count - 1)
    if (b === a) b = (b + 1) % cfg.count
    const prev = swaps[swaps.length - 1]
    if (prev && ((prev.a === a && prev.b === b) || (prev.a === b && prev.b === a))) continue
    swaps.push({ a, b })
  }
  let seen = false
  const sim = startSlots.slice()
  let slot = targetSlot
  swaps.forEach((swap) => {
    if (swap.a === slot || swap.b === slot) seen = true
    const tmp = sim[swap.a]
    sim[swap.a] = sim[swap.b]
    sim[swap.b] = tmp
    slot = sim.indexOf(answer)
  })
  if (!seen) swaps[0] = { a: targetSlot, b: (targetSlot + 1) % cfg.count }
  return {
    mode: 'track',
    timed: false,
    balls,
    startSlots,
    slotPos: slotPos(cfg.count),
    swaps,
    answer,
    markMs: cfg.markMs,
    moveMs: cfg.moveMs,
    hideLabel: cfg.hideLabel,
    prompt: '点中刚才被圈住的球',
    hint: '圈消失之后跟着它走'
  }
}

function makeDigits(levelId) {
  const cfg = {
    intro: { len: 4, flashMs: 2400 },
    classic: { len: 5, flashMs: 2200 },
    advanced: { len: 6, flashMs: 1800 },
    challenge: { len: 7, flashMs: 1500 }
  }[levelId]
  const digits = []
  for (let i = 0; i < cfg.len; i += 1) digits.push(randInt(0, 9))
  const answerText = digits.join(' ')
  const wrongs = []
  let guard = 0
  while (wrongs.length < 3 && guard < 40) {
    guard += 1
    const copy = digits.slice()
    if (Math.random() < 0.5) {
      const i = randInt(0, cfg.len - 1)
      let j = randInt(0, cfg.len - 1)
      if (j === i) j = (j + 1) % cfg.len
      const tmp = copy[i]
      copy[i] = copy[j]
      copy[j] = tmp
    } else {
      const i = randInt(0, cfg.len - 1)
      copy[i] = (copy[i] + randInt(1, 8)) % 10
    }
    const text = copy.join(' ')
    if (text !== answerText && wrongs.indexOf(text) < 0) wrongs.push(text)
  }
  const choices = makeChoices([answerText].concat(wrongs).map((text) => ({ text })), 0)
  return Object.assign({
    mode: 'flash',
    timed: false,
    flashMs: cfg.flashMs,
    boardFlash: { kind: 'digits', text: answerText, compact: cfg.len >= 7 },
    prompt: '刚才那串数字是？',
    hint: '按看到的顺序选'
  }, choices)
}

function makeOrder(levelId) {
  const len = { intro: 3, classic: 4, advanced: 5, challenge: 6 }[levelId]
  const row = shuffle(SYMBOLS).slice(0, len)
  const answerText = row.join(' · ')
  const wrongs = []
  let guard = 0
  while (wrongs.length < 3 && guard < 40) {
    guard += 1
    const text = shuffle(row).join(' · ')
    if (text !== answerText && wrongs.indexOf(text) < 0) wrongs.push(text)
  }
  const choices = makeChoices([answerText].concat(wrongs).map((text) => ({ text })), 0)
  return Object.assign({
    mode: 'flash',
    timed: false,
    flashMs: levelId === 'challenge' ? 1700 : levelId === 'advanced' ? 1900 : 2200,
    boardFlash: { kind: 'symbols', symbols: row },
    prompt: '刚才从左到右的顺序是？',
    hint: '按出现顺序选'
  }, choices)
}

function makeGrid(levelId) {
  const cfg = {
    intro: { n: 3, count: 3, flashMs: 2000 },
    classic: { n: 3, count: 4, flashMs: 1800 },
    advanced: { n: 4, count: 5, flashMs: 1700 },
    challenge: { n: 4, count: 6, flashMs: 1400 }
  }[levelId]
  const answerCells = fillCells(cfg.n, cfg.count)
  const wrongs = distinctNear(answerCells, 3)
  const choices = makeChoices(
    [{ cells: answerCells, gridSize: cfg.n }].concat(wrongs.map((cells) => ({ cells, gridSize: cfg.n }))),
    0
  )
  return Object.assign({
    mode: 'flash',
    timed: false,
    flashMs: cfg.flashMs,
    boardFlash: { kind: 'grid', cells: packCells(answerCells), gridSize: cfg.n },
    prompt: '刚才亮起的格子是哪一组？',
    hint: '选出同一组格子'
  }, choices)
}

function makeCompare(levelId) {
  let left = 1
  let right = 1
  if (levelId === 'intro') {
    left = randInt(1, 9)
    right = Math.random() < 0.28 ? left : randInt(1, 9)
  } else if (levelId === 'classic') {
    left = randInt(10, 49)
    right = Math.random() < 0.18 ? left : randInt(10, 49)
  } else if (levelId === 'advanced') {
    left = randInt(20, 90)
    right = Math.min(99, Math.max(10, left + randInt(1, 4) * (Math.random() < 0.5 ? -1 : 1)))
  } else {
    left = randInt(120, 860)
    right = Math.min(980, Math.max(100, left + randInt(1, 6) * (Math.random() < 0.5 ? -1 : 1)))
  }
  let answerText = '一样大'
  if (left > right) answerText = '左边'
  if (right > left) answerText = '右边'
  const labels = ['左边', '右边', '一样大']
  const choices = makeChoices(labels.map((text) => ({ text })), labels.indexOf(answerText))
  return Object.assign({
    mode: 'ask',
    timed: true,
    boardAsk: { kind: 'pair', left: String(left), right: String(right) },
    prompt: '哪边的数更大？',
    hint: '看准再点，越快越高'
  }, choices)
}

function makeColor(levelId) {
  const pool = levelId === 'intro' ? COLORS.slice(0, 4) : COLORS
  const color = pick(pool)
  const optionCount = levelId === 'challenge' ? 6 : 4
  const rest = shuffle(pool.filter((item) => item.name !== color.name)).slice(0, optionCount - 1)
  const choices = makeChoices([color].concat(rest).map((item) => ({ text: item.name })), 0)
  const flash = levelId === 'advanced' || levelId === 'challenge'
  return Object.assign({
    mode: flash ? 'flash' : 'ask',
    timed: true,
    flashMs: levelId === 'challenge' ? 520 : 780,
    boardFlash: { kind: 'swatch', swatch: color.hex },
    boardAsk: flash ? null : { kind: 'swatch', swatch: color.hex },
    prompt: '这是什么颜色？',
    hint: flash ? '色块消失后再选，越快越高' : '看准再点，越快越高'
  }, choices)
}

function makeArrow(levelId) {
  const arrow = pick(ARROWS)
  let target = arrow
  let prompt = '这个箭头指向哪？'
  let kind = 'glyph'
  let note = ''
  if (levelId === 'classic') {
    target = OPP[arrow]
    prompt = '和它相反的方向是？'
  } else if (levelId === 'advanced' || levelId === 'challenge') {
    note = DIR_NAME[pick(ARROWS.filter((item) => item !== arrow))]
    kind = 'stroop'
    prompt = '看箭头指向哪，别被字带跑'
  }
  const choices = makeChoices(ARROWS.map((item) => ({ text: DIR_NAME[item] })), ARROWS.indexOf(target))
  return Object.assign({
    mode: 'ask',
    timed: true,
    boardAsk: { kind, glyph: arrow, note },
    prompt,
    hint: '越快越准，分数越高'
  }, choices)
}

function makeOdd(levelId) {
  const count = { intro: 4, classic: 6, advanced: 8, challenge: 9 }[levelId]
  const pair = {
    intro: ['●', '○'],
    classic: ['■', '□'],
    advanced: ['▲', '△'],
    challenge: ['★', '☆']
  }[levelId]
  const oddAt = randInt(0, count - 1)
  const tapItems = []
  for (let i = 0; i < count; i += 1) {
    tapItems.push({
      id: 't' + i,
      text: i === oddAt ? pair[1] : pair[0],
      status: ''
    })
  }
  return {
    mode: 'tap',
    timed: true,
    tapItems,
    answer: 't' + oddAt,
    prompt: '点出不一样的那个',
    hint: '越快越准，分数越高'
  }
}

function makeSpin(levelId) {
  const arrow = pick(ARROWS)
  let target = CW[arrow]
  let prompt = '把它顺时针转 90°，会指向哪？'
  if (levelId === 'classic') {
    target = CW[CW[arrow]]
    prompt = '把它顺时针转 180°，会指向哪？'
  } else if (levelId === 'advanced') {
    target = CCW[arrow]
    prompt = '把它逆时针转 90°，会指向哪？'
  } else if (levelId === 'challenge') {
    target = CW[CW[arrow]]
    prompt = '先顺时针转 90°，再顺时针转 90°，会指向哪？'
  }
  const choices = makeChoices(ARROWS.map((item) => ({ text: DIR_NAME[item] })), ARROWS.indexOf(target))
  return Object.assign({
    mode: 'ask',
    timed: false,
    boardAsk: { kind: 'glyph', glyph: arrow },
    prompt,
    hint: '在心里转一下再选'
  }, choices)
}

function mirrorRow(row) {
  return row.slice().reverse().map((item) => HFLIP[item] || item)
}

function makeMirror(levelId) {
  const len = { intro: 3, classic: 4, advanced: 5, challenge: 6 }[levelId]
  const pool = ['←', '→', '↑', '↓', '●']
  let row = []
  let mirrored = []
  let guard = 0
  while (guard < 24) {
    guard += 1
    row = []
    for (let i = 0; i < len; i += 1) row.push(pick(pool))
    mirrored = mirrorRow(row)
    if (row.join('') !== mirrored.join('')) break
  }
  const answerText = mirrored.join(' ')
  const wrongs = []
  ;[row.join(' '), row.slice().reverse().join(' '), shuffle(row).join(' ')].forEach((text) => {
    if (text !== answerText && wrongs.indexOf(text) < 0) wrongs.push(text)
  })
  let extra = 0
  while (wrongs.length < 3 && extra < 20) {
    extra += 1
    const text = shuffle(pool.concat(pool)).slice(0, len).join(' ')
    if (text !== answerText && wrongs.indexOf(text) < 0) wrongs.push(text)
  }
  const choices = makeChoices([answerText].concat(wrongs.slice(0, 3)).map((text) => ({ text })), 0)
  return Object.assign({
    mode: 'ask',
    timed: false,
    boardAsk: { kind: 'symbols', symbols: row },
    prompt: '左右颠倒之后，会变成？',
    hint: '左右对调，朝左朝右也会反过来'
  }, choices)
}

function makeRotate(levelId) {
  const cfg = {
    intro: { n: 3, count: 3, times: 1 },
    classic: { n: 3, count: 4, times: 1 },
    advanced: { n: 4, count: 5, times: 1 },
    challenge: { n: 4, count: 6, times: 2 }
  }[levelId]
  let source = fillCells(cfg.n, cfg.count)
  let answerCells = source
  let guard = 0
  do {
    if (guard) source = fillCells(cfg.n, cfg.count)
    guard += 1
    answerCells = source
    for (let i = 0; i < cfg.times; i += 1) answerCells = rotate90(answerCells, cfg.n)
  } while (sameCells(source, answerCells) && guard < 12)
  const turned = rotate90(answerCells, cfg.n)
  const flipped = source.map((_, index) => {
    const r = Math.floor(index / cfg.n)
    const c = index % cfg.n
    return source[r * cfg.n + (cfg.n - 1 - c)]
  })
  const pool = [source, turned, flipped]
  const wrongs = []
  pool.forEach((item) => {
    if (sameCells(item, answerCells)) return
    if (wrongs.some((have) => sameCells(have, item))) return
    wrongs.push(item)
  })
  distinctNear(answerCells, 3).forEach((item) => {
    if (wrongs.length >= 3) return
    if (wrongs.some((have) => sameCells(have, item))) return
    wrongs.push(item)
  })
  const choices = makeChoices(
    [{ cells: answerCells, gridSize: cfg.n }].concat(wrongs.slice(0, 3).map((cells) => ({ cells, gridSize: cfg.n }))),
    0
  )
  return Object.assign({
    mode: 'ask',
    timed: false,
    boardAsk: { kind: 'grid', cells: packCells(source), gridSize: cfg.n },
    prompt: cfg.times === 1 ? '把它顺时针转 90°，是哪一个？' : '把它转 180°，是哪一个？',
    hint: '先盯住一个亮格，看它转到哪'
  }, choices)
}

function cellName(index, n) {
  const row = Math.floor(index / n) + 1
  const col = (index % n) + 1
  return '第' + row + '行第' + col + '列'
}

function stepPos(pos, dir, n) {
  const row = Math.floor(pos / n)
  const col = pos % n
  if (dir === '↑') return (row - 1) * n + col
  if (dir === '↓') return (row + 1) * n + col
  if (dir === '←') return row * n + (col - 1)
  return row * n + (col + 1)
}

function makePath(levelId) {
  const cfg = {
    intro: { n: 3, steps: 2 },
    classic: { n: 3, steps: 3 },
    advanced: { n: 3, steps: 4 },
    challenge: { n: 4, steps: 5 }
  }[levelId]
  const total = cfg.n * cfg.n
  let start = 0
  let moves = []
  let end = -1
  let guard = 0
  while (guard < 30 && (end < 0 || end === start)) {
    guard += 1
    start = randInt(0, total - 1)
    moves = []
    let pos = start
    for (let i = 0; i < cfg.steps; i += 1) {
      const row = Math.floor(pos / cfg.n)
      const col = pos % cfg.n
      const options = []
      if (row > 0) options.push('↑')
      if (row < cfg.n - 1) options.push('↓')
      if (col > 0) options.push('←')
      if (col < cfg.n - 1) options.push('→')
      const dir = pick(options)
      moves.push(dir)
      pos = stepPos(pos, dir, cfg.n)
    }
    end = pos
  }
  const answerText = cellName(end, cfg.n)
  const used = {}
  used[end] = true
  const wrongs = []
  let extra = 0
  while (wrongs.length < 3 && extra < 40) {
    extra += 1
    const index = randInt(0, total - 1)
    if (used[index]) continue
    used[index] = true
    wrongs.push(cellName(index, cfg.n))
  }
  const choices = makeChoices([answerText].concat(wrongs).map((text) => ({ text })), 0)
  const cells = []
  for (let i = 0; i < total; i += 1) {
    cells.push({ n: i, on: 0, start: i === start ? 1 : 0 })
  }
  return Object.assign({
    mode: 'ask',
    timed: false,
    boardAsk: { kind: 'path', text: moves.join('  '), cells, gridSize: cfg.n },
    prompt: '从亮格出发，按箭头走，停在哪？',
    hint: '这题的箭头都走在格子里面'
  }, choices)
}

const MAKERS = {
  track: makeTrack,
  digits: makeDigits,
  order: makeOrder,
  grid: makeGrid,
  compare: makeCompare,
  color: makeColor,
  arrow: makeArrow,
  odd: makeOdd,
  spin: makeSpin,
  mirror: makeMirror,
  rotate: makeRotate,
  path: makePath
}

function buildRun(subId, levelId) {
  const meta = findMeta(subId)
  const level = LEVELS.find((item) => item.id === levelId)
  const maker = MAKERS[subId]
  if (!meta || !level || !maker) return []
  const list = []
  for (let i = 0; i < level.rounds; i += 1) {
    list.push(Object.assign(maker(levelId), {
      no: i + 1,
      total: level.rounds,
      dim: meta.dim.id,
      dimName: meta.dim.name,
      subId: meta.sub.id,
      subName: meta.sub.name,
      levelId: level.id,
      levelName: level.name
    }))
  }
  return list
}

function reactionScore(elapsedMs, levelId) {
  const cuts = {
    intro: [1500, 2400, 3400, 4600],
    classic: [1100, 1800, 2700, 3800],
    advanced: [800, 1400, 2200, 3200],
    challenge: [650, 1100, 1700, 2500]
  }[levelId] || [1100, 1800, 2700, 3800]
  const scores = [100, 88, 74, 60, 46]
  const ms = elapsedMs > 0 ? elapsedMs : 99999
  for (let i = 0; i < cuts.length; i += 1) {
    if (ms <= cuts[i]) return scores[i]
  }
  return scores[scores.length - 1]
}

function scoreOf(quiz, answer, elapsedMs) {
  if (!quiz || String(answer) !== String(quiz.answer)) return 0
  if (quiz.timed) return reactionScore(elapsedMs, quiz.levelId)
  return 100
}

function average(list) {
  if (!list.length) return 0
  const sum = list.reduce((acc, item) => acc + item, 0)
  return Math.round(sum / list.length)
}

function liveScore(records) {
  return average((records || []).map((item) => item.score))
}

function band(score) {
  if (score >= 90) return 'high'
  if (score >= 75) return 'good'
  if (score >= 60) return 'mid'
  return 'low'
}

const DIM_COPY = {
  memory: {
    high: '这把记得又稳又全。',
    good: '大部分都对上了。',
    mid: '轮廓有了，细节还会漏。',
    low: '这把还在找节奏。'
  },
  reaction: {
    high: '判断和手速都跟得上。',
    good: '反应挺利落。',
    mid: '能对上，节奏还能再紧一点。',
    low: '这把手比眼睛快了一点。'
  },
  spatial: {
    high: '转向和路径都对得上。',
    good: '空间转换大体清楚。',
    mid: '方向有了，转完还会晃一下。',
    low: '这把转向还不太熟。'
  }
}

const SUB_TIP = {
  track: '先锁住颜色，再跟着位置走。',
  digits: '看的时候按顺序在心里过一遍。',
  order: '先抓头尾，再补中间。',
  grid: '把亮格连成一块来记。',
  compare: '先看位数，再看最高位。',
  color: '色块一出来就定名字。',
  arrow: '只盯题目要求的那个方向。',
  odd: '先扫一圈相同的，再点例外。',
  spin: '先选定箭头尖，再转它。',
  mirror: '从两端往中间对调。',
  rotate: '只跟踪一个亮格。',
  path: '走一步，就在格子里点一下当前位置。'
}

const GRADES = [
  { min: 90, name: '优秀', line: '这把发挥很完整。', tips: ['规则看完再动手，手感更稳', '隔几天换个难度再来'] },
  { min: 75, name: '良好', line: '整体顺，再细一点会更稳。', tips: ['看清再点，比抢答划算', '中间停一下，后面会更准'] },
  { min: 60, name: '普通', line: '中规中矩，熟了会更顺。', tips: ['每题只抓一个关键', '错了先看清差在哪'] },
  { min: 0, name: '起步', line: '这把当热身，再来一轮会更熟。', tips: ['先把这一难度打顺', '周围安静一点更好看清'] }
]

function buildResult(records, meta) {
  const score = liveScore(records)
  const info = meta || {}
  const grade = GRADES.find((item) => score >= item.min) || GRADES[GRADES.length - 1]
  const dimCopy = (DIM_COPY[info.dim] || DIM_COPY.memory)[band(score)]
  return {
    score,
    gradeName: grade.name,
    gradeLine: grade.line,
    dim: info.dim || '',
    dimName: info.dimName || '',
    subName: info.subName || '',
    levelName: info.levelName || '',
    comment: dimCopy,
    tip: SUB_TIP[info.subId] || '',
    tips: grade.tips
  }
}

module.exports = {
  LEVELS,
  getHome,
  getSubs,
  getLevels,
  buildRun,
  scoreOf,
  liveScore,
  buildResult
}
