/**
 * 时间单位换算、日期相差、日期推算
 */

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const TIME_UNITS = [
  { key: 'ms', name: '毫秒', factor: 1 },
  { key: 's', name: '秒', factor: 1000 },
  { key: 'min', name: '分钟', factor: 60 * 1000 },
  { key: 'h', name: '小时', factor: 3600 * 1000 },
  { key: 'd', name: '天', factor: 86400 * 1000 },
  { key: 'w', name: '周', factor: 7 * 86400 * 1000 }
]

const OFFSET_UNITS = [
  { key: 'd', name: '天' },
  { key: 'w', name: '周' },
  { key: 'm', name: '月' },
  { key: 'y', name: '年' }
]

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatYMD(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function formatDateText(date) {
  if (!date) return ''
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function formatWeekday(date) {
  return WEEKDAYS[date.getDay()]
}

function todayParts() {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  }
}

function todayYMD() {
  const t = todayParts()
  return formatYMD(t.year, t.month, t.day)
}

function addDaysYMD(ymd, days) {
  const date = parseYMD(ymd)
  if (!date) return todayYMD()
  date.setDate(date.getDate() + Number(days || 0))
  return formatYMD(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function parseYMD(text) {
  const matched = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(text || '').trim())
  if (!matched) return null
  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  date.setHours(0, 0, 0, 0)
  return date
}

function parseAmount(text) {
  if (text === '' || text === null || text === undefined) return null
  const value = Number(String(text).trim())
  return Number.isFinite(value) ? value : NaN
}

function formatAmount(value) {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e12 || (abs > 0 && abs < 1e-6)) {
    return value.toExponential(4).replace(/\.?0+e/, 'e')
  }
  let digits = 6
  if (abs >= 100000) digits = 2
  else if (abs >= 1000) digits = 4
  else if (abs >= 1) digits = 6
  else digits = 8
  let text = value.toFixed(digits)
  if (text.indexOf('.') >= 0) {
    text = text.replace(/\.?0+$/, '')
  }
  return text
}

function convertDuration(inputValue, fromKey, toKey) {
  const amount = parseAmount(inputValue)
  const from = TIME_UNITS.find((item) => item.key === fromKey)
  const to = TIME_UNITS.find((item) => item.key === toKey)
  if (amount === null) {
    return { valid: false, message: '请输入时间数值' }
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return { valid: false, message: '请输入有效的非负数值' }
  }
  if (!from || !to) {
    return { valid: false, message: '请选择时间单位' }
  }
  const ms = amount * from.factor
  const result = ms / to.factor
  const list = TIME_UNITS.map((item) => ({
    key: item.key,
    name: item.name,
    value: formatAmount(ms / item.factor)
  }))
  return {
    valid: true,
    value: result,
    valueText: formatAmount(result),
    fromName: from.name,
    toName: to.name,
    formulaText: `${formatAmount(amount)} ${from.name} =`,
    list
  }
}

function daysBetween(fromDate, toDate) {
  return Math.round((toDate - fromDate) / 86400000)
}

function calendarMonthDiff(fromDate, toDate) {
  let months = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth())
  let leftoverDays = toDate.getDate() - fromDate.getDate()
  if (leftoverDays < 0) {
    months -= 1
    const prevMonthLast = new Date(toDate.getFullYear(), toDate.getMonth(), 0).getDate()
    leftoverDays += prevMonthLast
  }
  return { months, leftoverDays }
}

function diffDates(fromText, toText) {
  const fromDate = parseYMD(fromText)
  const toDate = parseYMD(toText)
  if (!fromDate || !toDate) {
    return { valid: false, message: '请选择完整的起止日期' }
  }
  const signedDays = daysBetween(fromDate, toDate)
  const absDays = Math.abs(signedDays)
  const weeks = Math.floor(absDays / 7)
  const weekRemain = absDays % 7
  const monthDiff = calendarMonthDiff(fromDate, toDate)
  const absMonths = Math.abs(monthDiff.months)
  const years = Math.floor(absMonths / 12)
  const yearRemainMonths = absMonths % 12
  let direction = 'same'
  if (signedDays > 0) direction = 'after'
  if (signedDays < 0) direction = 'before'
  const directionText =
    direction === 'same' ? '同一天' : direction === 'after' ? '结束日更晚' : '结束日更早'
  const weekText = weekRemain ? `${weeks} 周 ${weekRemain} 天` : `${weeks} 周`
  const monthText = monthDiff.leftoverDays
    ? `${absMonths} 个月 ${monthDiff.leftoverDays} 天`
    : `${absMonths} 个月`
  const yearText = yearRemainMonths ? `${years} 年 ${yearRemainMonths} 个月` : `${years} 年`
  return {
    valid: true,
    signedDays,
    absDays,
    direction,
    directionText,
    fromText: formatDateText(fromDate),
    toText: formatDateText(toDate),
    fromWeekday: formatWeekday(fromDate),
    toWeekday: formatWeekday(toDate),
    daysText: `${absDays} 天`,
    weekText,
    monthText,
    yearText,
    heroText: `${absDays} 天`,
    heroSub:
      direction === 'same'
        ? '起止为同一天'
        : `${fromDate.getMonth() + 1}月${fromDate.getDate()}日 至 ${toDate.getMonth() + 1}月${toDate.getDate()}日 · ${weekText}`
  }
}

function addOffset(baseText, amountText, unitKey, direction) {
  const base = parseYMD(baseText)
  const amount = parseAmount(amountText)
  const unit = OFFSET_UNITS.find((item) => item.key === unitKey)
  if (!base) return { valid: false, message: '请选择起始日期' }
  if (amount === null) return { valid: false, message: '请输入天数或周期' }
  if (!Number.isFinite(amount)) return { valid: false, message: '请输入有效数值' }
  if (!unit) return { valid: false, message: '请选择推算单位' }

  const signed = (direction === 'before' ? -1 : 1) * amount
  const result = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  if (unit.key === 'd') result.setDate(result.getDate() + signed)
  if (unit.key === 'w') result.setDate(result.getDate() + signed * 7)
  if (unit.key === 'm') result.setMonth(result.getMonth() + signed)
  if (unit.key === 'y') result.setFullYear(result.getFullYear() + signed)

  const deltaDays = daysBetween(base, result)
  const absDays = Math.abs(deltaDays)
  const action = direction === 'before' ? '之前' : '之后'
  return {
    valid: true,
    date: result,
    ymd: formatYMD(result.getFullYear(), result.getMonth() + 1, result.getDate()),
    dateText: formatDateText(result),
    weekday: formatWeekday(result),
    year: result.getFullYear(),
    month: result.getMonth() + 1,
    day: result.getDate(),
    deltaDays,
    absDays,
    heroText: `${result.getMonth() + 1}月${result.getDate()}日`,
    heroSub: `${formatDateText(result)} · ${formatWeekday(result)}`,
    formulaText: `${formatDateText(base)} ${formatAmount(amount)} ${unit.name}${action}`
  }
}

module.exports = {
  TIME_UNITS,
  OFFSET_UNITS,
  WEEKDAYS,
  todayYMD,
  addDaysYMD,
  formatYMD,
  formatDateText,
  formatWeekday,
  parseYMD,
  convertDuration,
  diffDates,
  addOffset
}
