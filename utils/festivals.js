/**
 * 节日：法定假日（API）、二十四节气、热门节日
 */
const { SOLAR_TERMS, buildDayInfo, solarToLunar, formatLunarDate } = require('./lunar')
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
  { name: '元旦', desc: '1月1日放假（参考）', note: '请以国务院当年安排为准' },
  { name: '春节', desc: '农历新年放假（参考）', note: '请以国务院当年安排为准' },
  { name: '清明节', desc: '清明前后放假（参考）', note: '请以国务院当年安排为准' },
  { name: '劳动节', desc: '5月1日放假（参考）', note: '请以国务院当年安排为准' },
  { name: '端午节', desc: '农历五月初五（参考）', note: '请以国务院当年安排为准' },
  { name: '中秋节', desc: '农历八月十五（参考）', note: '请以国务院当年安排为准' },
  { name: '国庆节', desc: '10月1-7日放假（参考）', note: '请以国务院当年安排为准' }
]

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
      month: t.month,
      day: t.day
    }
  })
}

function buildPopularFestivals(year) {
  const extras = [
    {
      name: '母亲节',
      desc: (() => {
        const solar = nthWeekdayOfMonth(year, 5, 0, 2)
        return solar ? `${year}年${solar.month}月${solar.day}日` : `${year}年5月`
      })(),
      note: '五月第二个周日',
      type: 'popular'
    },
    {
      name: '父亲节',
      desc: (() => {
        const solar = nthWeekdayOfMonth(year, 6, 0, 3)
        return solar ? `${year}年${solar.month}月${solar.day}日` : `${year}年6月`
      })(),
      note: '六月第三个周日',
      type: 'popular'
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
        type: 'popular'
      }
    }
    return {
      name: item.name,
      desc: `${year}年${item.month}月${item.day}日`,
      type: 'popular'
    }
  })

  return extras.concat(list)
}

async function buildFestivalGroups(year) {
  const holidayData = await loadYearHolidays(year)
  const legal =
    holidayData.legal && holidayData.legal.length
      ? holidayData.legal
      : LEGAL_FALLBACK.map((item) => ({ ...item, type: 'legal', source: 'fallback' }))

  return {
    legal,
    terms: buildSolarTerms(year),
    popular: buildPopularFestivals(year),
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

  const info = buildDayInfo(year, month, day)
  if (info.solarTerm && labels.indexOf(info.solarTerm) < 0) {
    labels.push(info.solarTerm)
  }

  return labels.slice(0, 2).join(' ')
}

module.exports = {
  buildFestivalGroups,
  getDayFestivalLabel,
  buildSolarTerms,
  buildPopularFestivals
}
