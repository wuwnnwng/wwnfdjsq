/**
 * 节日：法定假日（API）、二十四节气、热门节日
 */
const { SOLAR_TERMS, solarToLunar, formatLunarDate, getSolarTerm } = require('./lunar')
const { loadYearHolidays, getDayHolidayLabel } = require('./holidayApi')

const POPULAR_FESTIVALS = [
  { name: '情人节', month: 2, day: 14 },
  { name: '妇女节', month: 3, day: 8 },
  { name: '儿童节', month: 6, day: 1 },
  { name: '七夕', lunarMonth: 7, lunarDay: 7 },
  { name: '教师节', month: 9, day: 10 },
  { name: '万圣节', month: 10, day: 31 },
  { name: '双十一', month: 11, day: 11 },
  { name: '圣诞节', month: 12, day: 25 },
  { name: '元宵节', lunarMonth: 1, lunarDay: 15 },
  { name: '重阳节', lunarMonth: 9, lunarDay: 9 }
]

const LEGAL_FALLBACK = [
  { name: '元旦', desc: '1月1日放假（参考）', note: '请以国务院当年安排为准', targetMonth: 1, targetDay: 1 },
  { name: '春节', desc: '农历新年放假（参考）', note: '请以国务院当年安排为准', lunarMonth: 1, lunarDay: 1 },
  { name: '清明节', desc: '清明前后放假（参考）', note: '请以国务院当年安排为准', targetMonth: 4, targetDay: 4 },
  { name: '劳动节', desc: '5月1日放假（参考）', note: '请以国务院当年安排为准', targetMonth: 5, targetDay: 1 },
  { name: '端午节', desc: '农历五月初五（参考）', note: '请以国务院当年安排为准', lunarMonth: 5, lunarDay: 5 },
  { name: '中秋节', desc: '农历八月十五（参考）', note: '请以国务院当年安排为准', lunarMonth: 8, lunarDay: 15 },
  { name: '国庆节', desc: '10月1-7日放假（参考）', note: '请以国务院当年安排为准', targetMonth: 10, targetDay: 1 }
]

function startOfDay(date) {
  const d = date || new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function formatCountdown(days) {
  if (days === 0) return '今天'
  return `${days}天后`
}

function calcDaysUntilTarget(targetYear, targetMonth, targetDay, fromDate) {
  const today = startOfDay(fromDate)
  let year = Number(targetYear)
  const month = Number(targetMonth)
  const day = Number(targetDay)
  if (!year || !month || !day) return null

  let target = new Date(year, month - 1, day)
  if (target < today) {
    year += 1
    target = new Date(year, month - 1, day)
  }
  return Math.round((target - today) / 86400000)
}

function resolveTargetDate(item, baseYear) {
  if (item.targetMonth && item.targetDay) {
    return {
      targetYear: item.targetYear || baseYear,
      targetMonth: item.targetMonth,
      targetDay: item.targetDay
    }
  }
  if (item.lunarMonth && item.lunarDay) {
    let year = baseYear
    let solar = findSolarByLunar(year, item.lunarMonth, item.lunarDay)
    const today = startOfDay(new Date())
    if (solar) {
      let target = new Date(year, solar.month - 1, solar.day)
      if (target < today) {
        year += 1
        solar = findSolarByLunar(year, item.lunarMonth, item.lunarDay)
      }
    }
    if (!solar) return null
    return {
      targetYear: year,
      targetMonth: solar.month,
      targetDay: solar.day
    }
  }
  return null
}

function withCountdown(item, baseYear, fromDate) {
  const target = resolveTargetDate(item, baseYear)
  if (!target) {
    return { ...item, countdownText: '' }
  }
  const days = calcDaysUntilTarget(target.targetYear, target.targetMonth, target.targetDay, fromDate)
  return {
    ...item,
    ...target,
    countdownText: days == null ? '' : formatCountdown(days)
  }
}

function attachCountdownList(list, baseYear, fromDate) {
  return (list || []).map((item) => withCountdown(item, baseYear, fromDate))
}

function termDate(year, n) {
  const off = [
    5.4055, 20.12, 3.87, 18.73, 5.63, 20.646, 4.81, 20.1, 5.52, 21.04, 5.678, 21.37, 7.108,
    22.83, 7.5, 23.13, 7.646, 23.042, 8.318, 23.438, 7.438, 22.36, 7.18, 21.94
  ]
  const month = Math.floor(n / 2) + 1
  const day = Math.floor(off[n] + 0.5 + (year - 2000) * 0.2422 - Math.floor((year - 2000) / 4))
  return { month, day }
}

function findSolarByLunar(year, lunarMonth, lunarDay) {
  for (let m = 1; m <= 12; m += 1) {
    const last = new Date(year, m, 0).getDate()
    for (let d = 1; d <= last; d += 1) {
      const lunar = solarToLunar(year, m, d)
      if (lunar.lunarMonth === lunarMonth && lunar.lunarDay === lunarDay && !lunar.isLeap) {
        return { month: m, day: d }
      }
    }
  }
  return null
}

function nthWeekdayOfMonth(year, month, weekday, nth) {
  let count = 0
  const last = new Date(year, month, 0).getDate()
  for (let d = 1; d <= last; d += 1) {
    if (new Date(year, month - 1, d).getDay() === weekday) {
      count += 1
      if (count === nth) return { month, day: d }
    }
  }
  return null
}

function buildSolarTerms(year) {
  return SOLAR_TERMS.map((name, index) => {
    const t = termDate(year, index)
    return {
      name,
      desc: `${year}年${t.month}月${t.day}日`,
      type: 'term',
      targetYear: year,
      targetMonth: t.month,
      targetDay: t.day
    }
  })
}

function buildPopularFestivals(year) {
  const motherSolar = nthWeekdayOfMonth(year, 5, 0, 2)
  const fatherSolar = nthWeekdayOfMonth(year, 6, 0, 3)
  const extras = [
    {
      name: '母亲节',
      desc: motherSolar ? `${year}年${motherSolar.month}月${motherSolar.day}日` : `${year}年5月`,
      note: '五月第二个周日',
      type: 'popular',
      targetYear: year,
      targetMonth: motherSolar ? motherSolar.month : 0,
      targetDay: motherSolar ? motherSolar.day : 0
    },
    {
      name: '父亲节',
      desc: fatherSolar ? `${year}年${fatherSolar.month}月${fatherSolar.day}日` : `${year}年6月`,
      note: '六月第三个周日',
      type: 'popular',
      targetYear: year,
      targetMonth: fatherSolar ? fatherSolar.month : 0,
      targetDay: fatherSolar ? fatherSolar.day : 0
    }
  ]

  const list = POPULAR_FESTIVALS.map((item) => {
    if (item.lunarMonth) {
      const solar = findSolarByLunar(year, item.lunarMonth, item.lunarDay)
      return {
        name: item.name,
        desc: solar
          ? `${year}年${solar.month}月${solar.day}日（${formatLunarDate(
              solarToLunar(year, solar.month, solar.day)
            )}）`
          : `农历${item.lunarMonth}月${item.lunarDay}日`,
        type: 'popular',
        targetYear: year,
        targetMonth: solar ? solar.month : 0,
        targetDay: solar ? solar.day : 0,
        lunarMonth: item.lunarMonth,
        lunarDay: item.lunarDay
      }
    }
    return {
      name: item.name,
      desc: `${year}年${item.month}月${item.day}日`,
      type: 'popular',
      targetYear: year,
      targetMonth: item.month,
      targetDay: item.day
    }
  })

  return extras.concat(list)
}

async function buildFestivalGroups(year, fromDate) {
  const holidayData = await loadYearHolidays(year)
  const refDate = fromDate || new Date()
  const legalRaw =
    holidayData.legal && holidayData.legal.length
      ? holidayData.legal
      : LEGAL_FALLBACK.map((item) => ({ ...item, type: 'legal', source: 'fallback' }))

  return {
    legal: attachCountdownList(legalRaw, year, refDate),
    terms: attachCountdownList(buildSolarTerms(year), year, refDate),
    popular: attachCountdownList(buildPopularFestivals(year), year, refDate),
    holidayDayMap: holidayData.dayMap || {},
    holidaySource: holidayData.source || 'fallback',
    holidayError: holidayData.error || '',
    holidayStale: !!holidayData.stale
  }
}

function getDayFestivalLabel(year, month, day, holidayDayMap) {
  const labels = []
  const official = getDayHolidayLabel(holidayDayMap, year, month, day)
  if (official) labels.push(official)

  POPULAR_FESTIVALS.forEach((item) => {
    if (item.month && item.month === month && item.day === day) {
      labels.push(item.name)
    }
    if (item.lunarMonth) {
      const lunar = solarToLunar(year, month, day)
      if (lunar.lunarMonth === item.lunarMonth && lunar.lunarDay === item.lunarDay) {
        labels.push(item.name)
      }
    }
  })

  const term = getSolarTerm(year, month, day)
  if (term && labels.indexOf(term) < 0) {
    labels.push(term)
  }

  return labels.slice(0, 2).join(' ')
}

module.exports = {
  buildFestivalGroups,
  getDayFestivalLabel,
  buildSolarTerms,
  buildPopularFestivals,
  attachCountdownList
}
