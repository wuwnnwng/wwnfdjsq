/**
 * 预产期：末次月经（Naegele 法则 +280 天）或受孕日（+266 天）
 */

const { parseYMD, formatDateText, formatWeekday, formatYMD } = require('./datetimeCalc')
const { solarToLunar, formatLunarDate } = require('./lunar')

const PREGNANCY_DAYS = 280
const CONCEPTION_TO_DUE = 266
const OVULATION_OFFSET = 14

const MILESTONES = [
  { day: 84, name: '建档产检', hint: '约 12 周' },
  { day: 140, name: '大排畸', hint: '约 20 周' },
  { day: 196, name: '孕晚期开始', hint: '约 28 周' },
  { day: 259, name: '足月', hint: '约 37 周' },
  { day: 280, name: '预产期', hint: '40 周' }
]

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + Number(days || 0))
  return next
}

function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86400000)
}

function attachDateInfo(date) {
  const lunar = solarToLunar(date.getFullYear(), date.getMonth() + 1, date.getDate())
  return {
    date,
    ymd: formatYMD(date.getFullYear(), date.getMonth() + 1, date.getDate()),
    dateText: formatDateText(date),
    weekday: formatWeekday(date),
    lunarText: formatLunarDate(lunar),
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  }
}

function trimesterOf(gestDay) {
  if (gestDay < 0) return { id: 'none', name: '尚未进入孕期' }
  const week = gestDay / 7
  if (week < 14) return { id: 'early', name: '孕早期' }
  if (week < 28) return { id: 'mid', name: '孕中期' }
  return { id: 'late', name: '孕晚期' }
}

function gestationalText(gestDay) {
  if (gestDay < 0) return '尚未进入孕期'
  const weeks = Math.floor(gestDay / 7)
  const remain = gestDay % 7
  if (weeks > 42) return `已超过 42 周`
  if (remain === 0) return `${weeks} 周`
  return `${weeks} 周 ${remain} 天`
}

function calculateDueDate({ mode, baseDateText, asOfText }) {
  const base = parseYMD(baseDateText)
  if (!base) {
    return { valid: false, message: mode === 'conception' ? '请选择受孕日期' : '请选择末次月经日期' }
  }
  const asOf = parseYMD(asOfText) || startOfDay(new Date())
  const lmp = mode === 'conception' ? addDays(base, -OVULATION_OFFSET) : base
  const due = addDays(lmp, PREGNANCY_DAYS)
  const conception = mode === 'conception' ? base : addDays(lmp, OVULATION_OFFSET)
  const gestDay = daysBetween(lmp, asOf)
  const remain = daysBetween(asOf, due)
  const trimester = trimesterOf(gestDay)

  const milestones = MILESTONES.map((item) => {
    const date = addDays(lmp, item.day)
    const info = attachDateInfo(date)
    const delta = daysBetween(asOf, date)
    let status = 'upcoming'
    if (delta === 0) status = 'today'
    else if (delta < 0) status = 'passed'
    return {
      ...item,
      ...info,
      delta,
      status,
      statusText: delta === 0 ? '就是今天' : delta > 0 ? `还有 ${delta} 天` : `已过 ${-delta} 天`
    }
  })

  const dueInfo = attachDateInfo(due)
  const lmpInfo = attachDateInfo(lmp)
  const conceptionInfo = attachDateInfo(conception)
  const overdue = remain < 0

  return {
    valid: true,
    mode,
    dueYmd: dueInfo.ymd,
    dueText: dueInfo.dateText,
    dueWeekday: dueInfo.weekday,
    dueLunar: dueInfo.lunarText,
    heroText: `${due.getMonth() + 1}月${due.getDate()}日`,
    heroSub: `${dueInfo.dateText} · ${dueInfo.weekday}`,
    formulaText: overdue ? '已过预产期' : remain === 0 ? '预产期就是今天' : `距离预产期还有 ${remain} 天`,
    remainDays: remain,
    remainText: overdue ? `已超过 ${-remain} 天` : remain === 0 ? '今天' : `${remain} 天`,
    gestDay,
    gestText: gestationalText(gestDay),
    trimesterId: trimester.id,
    trimesterName: trimester.name,
    lmpText: lmpInfo.dateText,
    lmpWeekday: lmpInfo.weekday,
    conceptionText: conceptionInfo.dateText,
    conceptionWeekday: conceptionInfo.weekday,
    asOfText: formatDateText(asOf),
    milestones,
    note:
      mode === 'conception'
        ? '按受孕日加 266 天估算，相当于末次月经后 40 周。实际预产期以医院超声为准。'
        : '按末次月经第一天加 280 天（Naegele 法则）估算，相当于 40 周。实际预产期以医院超声为准。'
  }
}

module.exports = {
  PREGNANCY_DAYS,
  CONCEPTION_TO_DUE,
  calculateDueDate
}
