/**
 * 年龄：周岁、虚岁、已活天数
 */
const { parseYMD, formatDateText, formatWeekday, todayYMD } = require('./datetimeCalc')
const { solarToLunar, formatLunarDate, formatSolarDate, getZodiac, getConstellation } = require('./lunar')

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function clampLeapBirthday(year, month, day) {
  if (month === 2 && day === 29 && daysInMonth(year, 2) < 29) {
    return { year, month: 2, day: 28 }
  }
  return { year, month, day }
}

function calendarDiff(from, to) {
  let years = to.year - from.year
  let months = to.month - from.month
  let days = to.day - from.day
  if (days < 0) {
    months -= 1
    const prevMonth = to.month === 1 ? 12 : to.month - 1
    const prevYear = to.month === 1 ? to.year - 1 : to.year
    days += daysInMonth(prevYear, prevMonth)
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  return { years, months, days }
}

function nextBirthday(birth, asOf) {
  let year = asOf.year
  const reached = asOf.month > birth.month || (asOf.month === birth.month && asOf.day >= birth.day)
  if (reached) year += 1
  return clampLeapBirthday(year, birth.month, birth.day)
}

function dateParts(date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  }
}

function toUtcDays(date) {
  return Math.round(date.getTime() / 86400000)
}

function calculateAge(birthdayText, asOfText) {
  const birthDate = parseYMD(birthdayText)
  const asOfDate = parseYMD(asOfText || todayYMD())
  if (!birthDate) {
    return { valid: false, message: '请选择出生日期' }
  }
  if (!asOfDate) {
    return { valid: false, message: '请选择计算日期' }
  }
  if (asOfDate.getTime() < birthDate.getTime()) {
    return { valid: false, message: '计算日期不能早于出生日期' }
  }

  const birth = dateParts(birthDate)
  const asOf = dateParts(asOfDate)
  const lived = calendarDiff(birth, asOf)
  const livedDays = toUtcDays(asOfDate) - toUtcDays(birthDate)
  const next = nextBirthday(birth, asOf)
  const nextDate = new Date(next.year, next.month - 1, next.day)
  nextDate.setHours(0, 0, 0, 0)
  const nextDays = Math.max(0, toUtcDays(nextDate) - toUtcDays(asOfDate))
  const isBirthday = asOf.month === birth.month && asOf.day === birth.day

  const birthLunar = solarToLunar(birth.year, birth.month, birth.day)
  const asOfLunar = solarToLunar(asOf.year, asOf.month, asOf.day)
  const nominalAge = asOfLunar.lunarYear - birthLunar.lunarYear + 1

  const yearText = `${lived.years}岁`
  const detailText = `${lived.years}岁 ${lived.months}个月 ${lived.days}天`

  return {
    valid: true,
    birthdayText: formatSolarDate(birth.year, birth.month, birth.day),
    birthdayWeek: formatWeekday(birthDate),
    birthdayLunar: formatLunarDate(birthLunar),
    asOfText: formatDateText(asOfDate),
    zodiac: getZodiac(birthLunar.lunarYear),
    constellation: getConstellation(birth.month, birth.day),
    yearAge: lived.years,
    yearText,
    detailText,
    nominalAge,
    nominalText: `${nominalAge}岁`,
    livedDays,
    livedDaysText: `${livedDays}`,
    lifeDayNumber: livedDays + 1,
    isBirthday,
    nextBirthdayText: formatSolarDate(next.year, next.month, next.day),
    nextDays,
    nextDaysText: isBirthday ? '今天就是生日' : `还有 ${nextDays} 天`
  }
}

module.exports = {
  calculateAge
}
