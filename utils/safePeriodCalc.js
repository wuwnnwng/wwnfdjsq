/**
 * 安全期：日历法估算排卵日与易孕期
 * 仅供了解生理周期，不能作为可靠避孕手段
 */

const { parseYMD, formatDateText, formatWeekday, formatYMD } = require('./datetimeCalc')

const KINDS = {
  period: { id: 'period', name: '月经期', short: '月经' },
  fertile: { id: 'fertile', name: '易孕期', short: '易孕' },
  ovulation: { id: 'ovulation', name: '排卵日', short: '排卵' },
  safe: { id: 'safe', name: '相对安全期', short: '安全' }
}

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

function parsePositiveInt(text, fallback) {
  if (text === '' || text == null) return fallback
  const value = Number(String(text).trim())
  return Number.isFinite(value) ? value : NaN
}

function kindOf(cycleDay, periodLength, ovulationDay, fertileStart, fertileEnd) {
  if (cycleDay === ovulationDay) return KINDS.ovulation
  if (cycleDay >= 1 && cycleDay <= periodLength) return KINDS.period
  if (cycleDay >= fertileStart && cycleDay <= fertileEnd) return KINDS.fertile
  return KINDS.safe
}

function formatRange(start, end) {
  if (!start || !end) return ''
  if (start.getTime() === end.getTime()) return formatDateText(start)
  return `${formatDateText(start)} – ${formatDateText(end)}`
}

function calculateSafePeriod({ lastPeriodText, cycleText, periodText, asOfText }) {
  const lastPeriod = parseYMD(lastPeriodText)
  if (!lastPeriod) return { valid: false, message: '请选择末次月经第一天' }

  const cycleLength = parsePositiveInt(cycleText, 28)
  const periodLength = parsePositiveInt(periodText, 5)
  if (!Number.isFinite(cycleLength) || !Number.isFinite(periodLength)) {
    return { valid: false, message: '请输入有效的周期和经期天数' }
  }
  if (cycleLength < 21 || cycleLength > 45) {
    return { valid: false, message: '月经周期请输入 21–45 天' }
  }
  if (periodLength < 2 || periodLength > 10) {
    return { valid: false, message: '经期天数请输入 2–10 天' }
  }
  if (periodLength >= cycleLength - 8) {
    return { valid: false, message: '经期过长，请核对周期天数' }
  }

  const ovulationDay = cycleLength - 14
  const fertileStart = Math.max(periodLength + 1, ovulationDay - 5)
  const fertileEnd = Math.min(cycleLength, ovulationDay + 1)
  if (ovulationDay <= periodLength) {
    return { valid: false, message: '周期过短，难以估算排卵日' }
  }

  const asOf = parseYMD(asOfText) || startOfDay(new Date())
  let cycleStart = lastPeriod
  let offset = daysBetween(cycleStart, asOf)
  if (offset < 0) {
    return { valid: false, message: '末次月经不能晚于今天' }
  }
  while (offset >= cycleLength) {
    cycleStart = addDays(cycleStart, cycleLength)
    offset = daysBetween(cycleStart, asOf)
  }
  const cycleDay = offset + 1
  const nextPeriod = addDays(cycleStart, cycleLength)
  const ovulationDate = addDays(cycleStart, ovulationDay - 1)
  const fertileFrom = addDays(cycleStart, fertileStart - 1)
  const fertileTo = addDays(cycleStart, fertileEnd - 1)
  const periodEnd = addDays(cycleStart, periodLength - 1)
  const todayKind = kindOf(cycleDay, periodLength, ovulationDay, fertileStart, fertileEnd)

  const days = []
  for (let i = 1; i <= cycleLength; i += 1) {
    const date = addDays(cycleStart, i - 1)
    const kind = kindOf(i, periodLength, ovulationDay, fertileStart, fertileEnd)
    days.push({
      day: i,
      ymd: formatYMD(date.getFullYear(), date.getMonth() + 1, date.getDate()),
      dateText: `${date.getMonth() + 1}/${date.getDate()}`,
      weekday: formatWeekday(date),
      kind: kind.id,
      kindName: kind.short,
      isToday: i === cycleDay
    })
  }

  const remainToPeriod = daysBetween(asOf, nextPeriod)
  const remainToOvulation = daysBetween(asOf, ovulationDate)

  return {
    valid: true,
    cycleLength,
    periodLength,
    ovulationDay,
    cycleDay,
    todayKind: todayKind.id,
    todayKindName: todayKind.name,
    heroText: todayKind.name,
    formulaText: `本周期第 ${cycleDay} 天 · 周期 ${cycleLength} 天`,
    heroSub:
      todayKind.id === 'ovulation'
        ? '今天可能是排卵日，受孕几率较高'
        : todayKind.id === 'fertile'
          ? '当前处于易孕期，安全期避孕不可靠'
          : todayKind.id === 'period'
            ? '当前处于月经期'
            : '日历法认为今天相对不易受孕，但仍有失败可能',
    lastPeriodText: formatDateText(cycleStart),
    periodRangeText: formatRange(cycleStart, periodEnd),
    ovulationText: `${formatDateText(ovulationDate)} · ${formatWeekday(ovulationDate)}`,
    fertileRangeText: formatRange(fertileFrom, fertileTo),
    nextPeriodText: `${formatDateText(nextPeriod)} · ${formatWeekday(nextPeriod)}`,
    remainToPeriod,
    remainToPeriodText: remainToPeriod === 0 ? '就是今天' : `${remainToPeriod} 天`,
    remainToOvulation,
    remainToOvulationText:
      remainToOvulation === 0 ? '就是今天' : remainToOvulation > 0 ? `${remainToOvulation} 天` : `已过 ${-remainToOvulation} 天`,
    days
  }
}

module.exports = {
  KINDS,
  calculateSafePeriod
}
