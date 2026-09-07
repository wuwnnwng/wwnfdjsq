/**
 * 喝酒转盘：默认模板与自定义选项
 */

const STORAGE_KEY = 'drinkWheel:options'
const MIN_OPTIONS = 4
const MAX_OPTIONS = 12
const MAX_LABEL = 12
const DEFAULT_OPTIONS = [
  '喝一口',
  '喝两口',
  '指定一个人喝',
  '讲一个冷笑话',
  '下一轮免喝',
  '做十个深蹲',
  '唱一句歌',
  '真心话',
  '大冒险'
]
const SLICE_COLORS = [
  '#f87171',
  '#fb923c',
  '#fbbf24',
  '#34d399',
  '#22d3ee',
  '#60a5fa',
  '#818cf8',
  '#f472b6',
  '#fb7185',
  '#2dd4bf',
  '#c084fc',
  '#facc15'
]

function clampText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LABEL)
}

function sanitizeOptions(list) {
  const seen = new Set()
  const next = []
  ;(Array.isArray(list) ? list : []).forEach((item) => {
    const text = clampText(item)
    if (!text || seen.has(text)) return
    seen.add(text)
    next.push(text)
  })
  return next.slice(0, MAX_OPTIONS)
}

function normalizeOptions(list) {
  const next = sanitizeOptions(list)
  return next.length >= MIN_OPTIONS ? next : DEFAULT_OPTIONS.slice()
}

function isSameOptions(a, b) {
  const left = normalizeOptions(a)
  const right = normalizeOptions(b)
  if (left.length !== right.length) return false
  return left.every((item, i) => item === right[i])
}

function readOptions() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    return normalizeOptions(raw)
  } catch (e) {
    return DEFAULT_OPTIONS.slice()
  }
}

function writeOptions(list) {
  const next = sanitizeOptions(list)
  const saved = next.length >= MIN_OPTIONS ? next : readOptions()
  try {
    wx.setStorageSync(STORAGE_KEY, saved)
  } catch (e) {}
  return saved
}

function resetOptions() {
  return writeOptions(DEFAULT_OPTIONS.slice())
}

function buildWheelView(options) {
  const items = normalizeOptions(options)
  const n = items.length
  const slice = 360 / n
  const stops = items
    .map((text, i) => {
      const color = SLICE_COLORS[i % SLICE_COLORS.length]
      const start = (i * slice).toFixed(2)
      const end = ((i + 1) * slice).toFixed(2)
      return `${color} ${start}deg ${end}deg`
    })
    .join(', ')
  const fontSize = n >= 10 ? '20rpx' : n >= 8 ? '22rpx' : '24rpx'
  return {
    options: items,
    count: n,
    slice,
    wheelBg: `background: conic-gradient(${stops});`,
    slices: items.map((text, i) => ({
      id: `slice-${i}`,
      index: i,
      text,
      short: text.length > 6 ? `${text.slice(0, 5)}…` : text,
      style: `transform: rotate(${i * slice + slice / 2}deg); font-size: ${fontSize};`
    }))
  }
}

function pickIndex(count) {
  const n = Math.max(1, Number(count) || 1)
  return Math.floor(Math.random() * n)
}

function nextWheelDeg(currentDeg, count, index) {
  const n = Math.max(1, Number(count) || 1)
  const slice = 360 / n
  const jitter = (Math.random() - 0.5) * slice * 0.62
  const targetAngle = index * slice + slice / 2 + jitter
  const current = Number(currentDeg) || 0
  const currentMod = ((current % 360) + 360) % 360
  const targetMod = (360 - targetAngle + 360) % 360
  const extra = 360 * (5 + Math.floor(Math.random() * 3))
  return current + extra + ((targetMod - currentMod + 360) % 360)
}

module.exports = {
  MIN_OPTIONS,
  MAX_OPTIONS,
  MAX_LABEL,
  DEFAULT_OPTIONS,
  clampText,
  sanitizeOptions,
  normalizeOptions,
  isSameOptions,
  readOptions,
  writeOptions,
  resetOptions,
  buildWheelView,
  pickIndex,
  nextWheelDeg
}
