/**
 * 年龄：周岁、虚岁、已活天数
 */
const { parseYMD, formatDateText, formatWeekday, todayYMD } = require('./datetimeCalc')
const {
  solarToLunar,
  lunarToSolar,
  formatLunarDate,
  formatSolarDate,
  getZodiac,
  getConstellation,
  leapMonth,
  leapDays,
  monthDays
} = require('./lunar')
const { getConstellationMatch } = require('./constellationMatch')

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

function lunarBirthdaySolar(lunarYear, birthLunar) {
  const hasLeap = leapMonth(lunarYear) === birthLunar.lunarMonth
  const useLeap = !!birthLunar.isLeap && hasLeap
  const maxDay = useLeap ? leapDays(lunarYear) : monthDays(lunarYear, birthLunar.lunarMonth)
  const day = Math.min(birthLunar.lunarDay, maxDay || 1)
  return lunarToSolar(lunarYear, birthLunar.lunarMonth, day, useLeap)
}

function sameLunarBirthday(asOfLunar, birthLunar) {
  if (asOfLunar.lunarMonth !== birthLunar.lunarMonth || asOfLunar.lunarDay !== birthLunar.lunarDay) {
    return false
  }
  if (!birthLunar.isLeap) return !asOfLunar.isLeap
  return !!asOfLunar.isLeap || leapMonth(asOfLunar.lunarYear) !== birthLunar.lunarMonth
}

function nextLunarBirthday(birthLunar, asOf) {
  const asOfLunar = solarToLunar(asOf.year, asOf.month, asOf.day)
  let lunarYear = asOfLunar.lunarYear
  let solar = lunarBirthdaySolar(lunarYear, birthLunar)
  if (
    solar.year < asOf.year ||
    (solar.year === asOf.year &&
      (solar.month < asOf.month || (solar.month === asOf.month && solar.day <= asOf.day)))
  ) {
    solar = lunarBirthdaySolar(lunarYear + 1, birthLunar)
  }
  return solar
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

function formatCount(n) {
  const num = Math.trunc(Number(n) || 0)
  const sign = num < 0 ? '-' : ''
  return sign + String(Math.abs(num)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 国家统计局公布的人均预期寿命（岁），用于趣味生命进度 */
const AVERAGE_LIFE_YEARS = 79.25
const DAYS_PER_YEAR = 365.25

function formatOneDecimal(n) {
  return (Math.round(Number(n) * 10) / 10).toFixed(1)
}

function buildLifeProgress(livedDays) {
  const days = Math.max(0, Number(livedDays) || 0)
  const expectedDays = AVERAGE_LIFE_YEARS * DAYS_PER_YEAR
  const percent = expectedDays > 0 ? (days / expectedDays) * 100 : 0
  const bar = Math.max(0, Math.min(100, percent))
  const remainingYears = Math.max(0, (expectedDays - days) / DAYS_PER_YEAR)
  const over = percent > 100
  return {
    averageLifeYears: AVERAGE_LIFE_YEARS,
    lifeProgressPercent: percent,
    lifeProgressBar: bar,
    lifeProgressText: `${formatOneDecimal(percent)}%`,
    lifeRemainingYearsText: `${formatOneDecimal(remainingYears)} 年`,
    lifeOver: over,
    lifeProgressHint: over
      ? '已超过参考人均寿命，愿余生悠长'
      : `参考人均寿命 ${AVERAGE_LIFE_YEARS} 岁，大约还剩 ${formatOneDecimal(remainingYears)} 年`
  }
}

function calculateAge(birthdayText, asOfText, options) {
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
  const birthLunar = solarToLunar(birth.year, birth.month, birth.day)
  const asOfLunar = solarToLunar(asOf.year, asOf.month, asOf.day)
  const useLunarBirthday = options && options.birthdayCalendar === 'lunar'
  const next = useLunarBirthday ? nextLunarBirthday(birthLunar, asOf) : nextBirthday(birth, asOf)
  const nextDate = new Date(next.year, next.month - 1, next.day)
  nextDate.setHours(0, 0, 0, 0)
  const nextDays = Math.max(0, toUtcDays(nextDate) - toUtcDays(asOfDate))
  const isBirthday = useLunarBirthday
    ? sameLunarBirthday(asOfLunar, birthLunar)
    : asOf.month === birth.month && asOf.day === birth.day
  const nominalAge = asOfLunar.lunarYear - birthLunar.lunarYear + 1

  const yearText = `${lived.years}岁`
  const detailText = `${lived.years}岁 ${lived.months}个月 ${lived.days}天`
  const constellation = getConstellation(birth.month, birth.day)
  const match = getConstellationMatch(constellation)
  const constellationMeta = match.self || { name: constellation, symbol: '', rangeText: '' }

  return {
    valid: true,
    birthdayText: formatSolarDate(birth.year, birth.month, birth.day),
    birthdayWeek: formatWeekday(birthDate),
    birthdayLunar: formatLunarDate(birthLunar),
    asOfText: formatDateText(asOfDate),
    zodiac: getZodiac(birthLunar.lunarYear),
    constellation,
    constellationSymbol: constellationMeta.symbol,
    constellationRange: constellationMeta.rangeText,
    yearAge: lived.years,
    yearText,
    detailText,
    nominalAge,
    nominalText: `${nominalAge}岁`,
    livedDays,
    livedDaysText: formatCount(livedDays),
    lifeDayNumber: livedDays + 1,
    lifeDayNumberText: formatCount(livedDays + 1),
    isBirthday,
    nextBirthdayText: formatSolarDate(next.year, next.month, next.day),
    nextBirthdayShort: `${next.month}月${next.day}日`,
    nextDays,
    nextDaysText: isBirthday ? '今天就是生日' : `还有 ${nextDays} 天`,
    nextHeroText: isBirthday ? '今天就是生日' : `下次生日 ${next.month}月${next.day}日 · 还有 ${nextDays} 天`,
    loveMatches: match.love,
    friendMatches: match.friends,
    loveNames: match.loveNames,
    friendNames: match.friendNames,
    ...buildLifeProgress(livedDays)
  }
}

module.exports = {
  AVERAGE_LIFE_YEARS,
  calculateAge
}
