/**
 * 纪念日倒计时：本地存储与下次日期计算
 */

const { parseYMD, formatYMD, formatDateText, formatWeekday, todayYMD } = require('./datetimeCalc')
const { solarToLunar, formatLunarDate } = require('./lunar')

const STORAGE_KEY = 'anniversaryList'
const CELEBRATED_KEY = 'anniversaryCelebrated'
const MAX_ITEMS = 20
const NAME_MAX_LEN = 12

const TYPES = [
  { id: 'love', name: '恋爱', icon: '💑', defaultTitle: '恋爱纪念日' },
  { id: 'wedding', name: '结婚', icon: '💍', defaultTitle: '结婚纪念日' },
  { id: 'birthday', name: '生日', icon: '🎂', defaultTitle: '生日' },
  { id: 'meet', name: '相识', icon: '✨', defaultTitle: '相识纪念日' },
  { id: 'custom', name: '自定义', icon: '🎉', defaultTitle: '纪念日' }
]

const TYPE_MAP = TYPES.reduce((map, item) => {
  map[item.id] = item
  return map
}, {})

function formatCount(n) {
  const num = Math.trunc(Number(n) || 0)
  const sign = num < 0 ? '-' : ''
  return sign + String(Math.abs(num)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function daysBetween(fromDate, toDate) {
  return Math.round((toDate - fromDate) / 86400000)
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function dateOnYear(month, day, year) {
  const last = new Date(year, month, 0).getDate()
  return new Date(year, month - 1, Math.min(day, last))
}

function yearsReached(start, today) {
  let years = today.getFullYear() - start.getFullYear()
  const anniversaryThisYear = dateOnYear(start.getMonth() + 1, start.getDate(), today.getFullYear())
  if (today < anniversaryThisYear) years -= 1
  return Math.max(0, years)
}

function nextOccurrence(start, today, yearly) {
  if (!yearly) {
    return startOfDay(start)
  }
  let next = dateOnYear(start.getMonth() + 1, start.getDate(), today.getFullYear())
  if (next < today) {
    next = dateOnYear(start.getMonth() + 1, start.getDate(), today.getFullYear() + 1)
  }
  return next
}

function makeId() {
  return `a-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000).toString(36)}`
}

function readRaw(key) {
  try {
    return wx.getStorageSync(key)
  } catch (e) {
    return undefined
  }
}

function writeRaw(key, value) {
  try {
    wx.setStorageSync(key, value)
    return true
  } catch (e) {
    return false
  }
}

function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const date = parseYMD(raw.date)
  if (!date) return null
  const type = TYPE_MAP[raw.type] ? raw.type : 'custom'
  const name = String(raw.name || TYPE_MAP[type].defaultTitle || '纪念日')
    .trim()
    .slice(0, NAME_MAX_LEN)
  if (!name) return null
  return {
    id: String(raw.id || makeId()),
    name,
    date: formatYMD(date.getFullYear(), date.getMonth() + 1, date.getDate()),
    yearly: raw.yearly !== false,
    type
  }
}

function listAnniversaries() {
  const raw = readRaw(STORAGE_KEY)
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeItem).filter(Boolean)
}

function saveAnniversaries(list) {
  const next = (Array.isArray(list) ? list : []).map(normalizeItem).filter(Boolean)
  writeRaw(STORAGE_KEY, next)
  return next
}

function decorateItem(item, todayText) {
  const today = parseYMD(todayText || todayYMD())
  const start = parseYMD(item.date)
  if (!today || !start) return null
  const yearly = item.yearly !== false
  const type = TYPE_MAP[item.type] || TYPE_MAP.custom
  const next = nextOccurrence(start, today, yearly)
  const daysUntil = daysBetween(today, next)
  const daysSince = daysBetween(start, today)
  const isToday = daysUntil === 0
  const isPast = !yearly && daysUntil < 0
  const years = yearsReached(start, today)
  const lunar = solarToLunar(start.getFullYear(), start.getMonth() + 1, start.getDate())
  const nextLunar = solarToLunar(next.getFullYear(), next.getMonth() + 1, next.getDate())
  let heroValue = formatCount(Math.abs(daysUntil))
  let heroUnit = '天'
  let heroTitle = isToday ? '就是今天' : isPast ? '已经过去' : '还有'
  let heroSub = isToday
    ? years > 0
      ? `第 ${years} 周年`
      : '纪念日到了'
    : isPast
      ? `${formatDateText(start)} · 已过 ${formatCount(Math.abs(daysUntil))} 天`
      : `${formatDateText(next)} · ${formatWeekday(next)}`
  if (isToday) {
    if (years > 0) {
      heroValue = String(years)
      heroUnit = '周年'
    } else {
      heroValue = formatCount(Math.max(1, daysSince + 1))
    }
  }
  let yearsText = ''
  if (daysSince < 0) yearsText = '尚未到来'
  else if (years <= 0) yearsText = isToday ? '从今天开始' : '未满一年'
  else yearsText = yearly ? `第 ${years} 周年` : `已满 ${years} 年`

  return {
    ...item,
    icon: type.icon,
    typeName: type.name,
    dateText: formatDateText(start),
    weekday: formatWeekday(start),
    lunarText: formatLunarDate(lunar),
    nextDate: formatYMD(next.getFullYear(), next.getMonth() + 1, next.getDate()),
    nextDateText: formatDateText(next),
    nextWeekday: formatWeekday(next),
    nextLunarText: formatLunarDate(nextLunar),
    daysUntil,
    daysUntilText: formatCount(Math.abs(daysUntil)),
    daysSince,
    daysSinceText: formatCount(Math.max(0, daysSince)),
    isToday,
    isPast,
    years,
    yearsText,
    heroTitle,
    heroValue,
    heroUnit,
    heroSub,
    statusText: isToday ? '今天' : isPast ? '已过' : `${formatCount(daysUntil)} 天`
  }
}

function sortViews(list) {
  return list.slice().sort((a, b) => {
    const rank = (item) => {
      if (item.isToday) return 0
      if (item.daysUntil >= 0) return 1
      return 2
    }
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    if (ra === 1) return a.daysUntil - b.daysUntil
    if (ra === 2) return b.daysUntil - a.daysUntil
    return b.years - a.years || a.name.localeCompare(b.name, 'zh-CN')
  })
}

function listAnniversaryViews(todayText) {
  const today = todayText || todayYMD()
  return sortViews(
    listAnniversaries()
      .map((item) => decorateItem(item, today))
      .filter(Boolean)
  )
}

function upsertAnniversary(payload) {
  const current = listAnniversaries()
  const nextItem = normalizeItem({
    ...payload,
    id: payload && payload.id ? payload.id : makeId()
  })
  if (!nextItem) {
    return { ok: false, message: '请填写名称和日期', list: current }
  }
  const index = current.findIndex((item) => item.id === nextItem.id)
  if (index >= 0) {
    current[index] = nextItem
  } else {
    if (current.length >= MAX_ITEMS) {
      return { ok: false, message: `最多保存 ${MAX_ITEMS} 个纪念日`, list: current }
    }
    current.push(nextItem)
  }
  const list = saveAnniversaries(current)
  return { ok: true, item: nextItem, list }
}

function removeAnniversary(id) {
  const list = saveAnniversaries(listAnniversaries().filter((item) => item.id !== id))
  return { ok: true, list }
}

function readCelebratedMap() {
  const raw = readRaw(CELEBRATED_KEY)
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
}

function markCelebrated(id, todayText) {
  const map = readCelebratedMap()
  map[id] = todayText || todayYMD()
  writeRaw(CELEBRATED_KEY, map)
}

function shouldAutoCelebrate(item, todayText) {
  if (!item || !item.isToday) return false
  const map = readCelebratedMap()
  return map[item.id] !== (todayText || todayYMD())
}

module.exports = {
  TYPES,
  TYPE_MAP,
  MAX_ITEMS,
  NAME_MAX_LEN,
  todayYMD,
  listAnniversaries,
  listAnniversaryViews,
  decorateItem,
  upsertAnniversary,
  removeAnniversary,
  markCelebrated,
  shouldAutoCelebrate
}
