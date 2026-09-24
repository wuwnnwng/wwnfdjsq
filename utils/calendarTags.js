const STORAGE_KEY = 'calendarDayTags'
const PROMPT_KEY = 'calendarTagPromptDate'

const HOLIDAY_TYPES = ['事假', '年假', '病假', '调休', '婚假', '产假', '陪产假', '丧假']

function pad2(value) {
  const num = Number(value) || 0
  return num < 10 ? `0${num}` : String(num)
}

function dateKey(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function todayParts() {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  }
}

function todayKey() {
  const today = todayParts()
  return dateKey(today.year, today.month, today.day)
}

function isPastDate(year, month, day) {
  return dateKey(year, month, day) < todayKey()
}

function readRaw() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    return raw
  } catch (e) {
    return {}
  }
}

function writeRaw(map) {
  try {
    wx.setStorageSync(STORAGE_KEY, map)
  } catch (e) {}
}

function normalizeTag(tag) {
  if (!tag || (tag.kind !== 'memorial' && tag.kind !== 'holiday')) return null
  const label = String(tag.label || '').trim()
  if (!label) return null
  return {
    kind: tag.kind,
    label: label.slice(0, 8)
  }
}

function loadDayTags() {
  const today = todayKey()
  const raw = readRaw()
  const next = {}
  Object.keys(raw).forEach((key) => {
    if (key < today) return
    const tag = normalizeTag(raw[key])
    if (tag) next[key] = tag
  })
  if (Object.keys(next).length !== Object.keys(raw).length) writeRaw(next)
  return next
}

function getDayTag(year, month, day) {
  return loadDayTags()[dateKey(year, month, day)] || null
}

function saveDayTag(year, month, day, kind, label) {
  if (isPastDate(year, month, day)) {
    return { ok: false, message: '已过的日期不能打标签' }
  }
  const tag = normalizeTag({ kind, label })
  if (!tag) {
    return { ok: false, message: kind === 'holiday' ? '请选择假期类型' : '请填写类型' }
  }
  if (kind === 'holiday' && HOLIDAY_TYPES.indexOf(tag.label) < 0) {
    return { ok: false, message: '请选择请假类型' }
  }
  const map = loadDayTags()
  map[dateKey(year, month, day)] = tag
  writeRaw(map)
  return { ok: true, tag }
}

function clearDayTag(year, month, day) {
  const map = loadDayTags()
  delete map[dateKey(year, month, day)]
  writeRaw(map)
}

function consumeTodayPrompt() {
  const today = todayKey()
  const tag = loadDayTags()[today]
  if (!tag) return null
  let prompted = ''
  try {
    prompted = wx.getStorageSync(PROMPT_KEY)
  } catch (e) {}
  if (prompted === today) return null
  try {
    wx.setStorageSync(PROMPT_KEY, today)
  } catch (e) {}
  return tag
}

function markTodayPrompted() {
  try {
    wx.setStorageSync(PROMPT_KEY, todayKey())
  } catch (e) {}
}

module.exports = {
  HOLIDAY_TYPES,
  dateKey,
  isPastDate,
  loadDayTags,
  getDayTag,
  saveDayTag,
  clearDayTag,
  consumeTodayPrompt,
  markTodayPrompted
}
