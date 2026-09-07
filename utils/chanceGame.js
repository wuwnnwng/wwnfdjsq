/**
 * 掷骰子 / 投硬币：点数与历史记录
 */

const STORAGE_KEY = 'chanceGame:records'
const MAX_RECORDS = 80
const DICE_PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
}

function pad2(n) {
  return n < 10 ? `0${n}` : String(n)
}

function buildDie(value) {
  const n = Math.min(6, Math.max(1, Number(value) || 1))
  const on = DICE_PIPS[n] || []
  const pips = []
  for (let i = 0; i < 9; i += 1) {
    pips.push({ key: `${n}-${i}`, on: on.indexOf(i) >= 0 })
  }
  return { value: n, pips }
}

function rollDice(count) {
  const n = Math.min(3, Math.max(1, Number(count) || 1))
  const dice = []
  for (let i = 0; i < n; i += 1) {
    dice.push(buildDie(1 + Math.floor(Math.random() * 6)))
  }
  const sum = dice.reduce((acc, item) => acc + item.value, 0)
  const valuesText = dice.map((item) => item.value).join(' + ')
  return {
    dice,
    sum,
    valuesText,
    title: n === 1 ? '骰子' : `骰子 ×${n}`,
    valueText: n === 1 ? String(sum) : `${valuesText} = ${sum}`
  }
}

function flipCoin() {
  const heads = Math.random() < 0.5
  return {
    heads,
    title: '硬币',
    valueText: heads ? '正面' : '反面',
    faceText: heads ? '正' : '反'
  }
}

function formatRecordTime(ts) {
  const d = new Date(Number(ts) || Date.now())
  const now = new Date()
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return `今天 ${hh}:${mm}`
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`
}

function normalizeRecord(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id || '')
  const at = Number(raw.at) || 0
  const kind = raw.kind === 'coin' ? 'coin' : 'dice'
  const title = String(raw.title || (kind === 'coin' ? '硬币' : '骰子'))
  const valueText = String(raw.valueText || '')
  if (!id || !at || !valueText) return null
  return {
    id,
    at,
    kind,
    title,
    valueText,
    timeText: formatRecordTime(at)
  }
}

function readRecords() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (!Array.isArray(raw)) return []
    return raw.map(normalizeRecord).filter(Boolean)
  } catch (e) {
    return []
  }
}

function writeRecords(list) {
  try {
    wx.setStorageSync(STORAGE_KEY, (list || []).slice(0, MAX_RECORDS))
  } catch (e) {}
}

function addRecord(entry) {
  const next = [entry].concat(readRecords()).slice(0, MAX_RECORDS)
  writeRecords(next)
  return next.map(normalizeRecord).filter(Boolean)
}

function clearRecords() {
  writeRecords([])
  return []
}

function makeRecordId() {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

module.exports = {
  MAX_RECORDS,
  buildDie,
  rollDice,
  flipCoin,
  readRecords,
  addRecord,
  clearRecords,
  makeRecordId
}
