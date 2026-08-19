/**
 * 节日：法定假日、二十四节气、热门节日
 */
const { SOLAR_TERMS, buildDayInfo, pad2, solarToLunar, formatLunarDate } = require('./lunar')

const POPULAR_FESTIVALS = [
  { name: '情人节', month: 2, day: 14, tag: '热门' },
  { name: '妇女节', month: 3, day: 8, tag: '热门' },
  { name: '劳动节', month: 5, day: 1, tag: '热门' },
  { name: '母亲节', month: 5, day: 11, tag: '热门', note: '五月第二个周日' },
  { name: '儿童节', month: 6, day: 1, tag: '热门' },
  { name: '父亲节', month: 6, day: 15, tag: '热门', note: '六月第三个周日' },
  { name: '七夕', lunarMonth: 7, lunarDay: 7, tag: '热门' },
  { name: '教师节', month: 9, day: 10, tag: '热门' },
  { name: '国庆节', month: 10, day: 1, tag: '热门' },
  { name: '万圣节', month: 10, day: 31, tag: '热门' },
  { name: '双十一', month: 11, day: 11, tag: '热门' },
  { name: '圣诞节', month: 12, day: 25, tag: '热门' },
  { name: '元宵节', lunarMonth: 1, lunarDay: 15, tag: '热门' },
  { name: '端午节', lunarMonth: 5, lunarDay: 5, tag: '热门' },
  { name: '中秋节', lunarMonth: 8, lunarDay: 15, tag: '热门' },
  { name: '重阳节', lunarMonth: 9, lunarDay: 9, tag: '热门' }
]

const LEGAL_HOLIDAY_RULES = [
  {
    name: '元旦',
    type: 'legal',
    match(year, month, day) {
      return month === 1 && day === 1
    },
    rangeText: '1月1日'
  },
  {
    name: '春节',
    type: 'legal',
    match(year, month, day) {
      const lunar = solarToLunar(year, month, day)
      if (lunar.lunarMonth !== 1) return false
      return lunar.lunarDay >= 1 && lunar.lunarDay <= 7
    },
    rangeText: '农历正月初一至初七'
  },
  {
    name: '清明节',
    type: 'legal',
    match(year, month, day) {
      return month === 4 && day >= 4 && day <= 6
    },
    rangeText: '4月4-6日'
  },
  {
    name: '劳动节',
    type: 'legal',
    match(year, month, day) {
      return month === 5 && day >= 1 && day <= 5
    },
    rangeText: '5月1-5日'
  },
  {
    name: '端午节',
    type: 'legal',
    match(year, month, day) {
      const lunar = solarToLunar(year, month, day)
      return lunar.lunarMonth === 5 && lunar.lunarDay === 5
    },
    rangeText: '农历五月初五'
  },
  {
    name: '中秋节',
    type: 'legal',
    match(year, month, day) {
      const lunar = solarToLunar(year, month, day)
      return lunar.lunarMonth === 8 && lunar.lunarDay === 15
    },
    rangeText: '农历八月十五'
  },
  {
    name: '国庆节',
    type: 'legal',
    match(year, month, day) {
      return month === 10 && day >= 1 && day <= 7
    },
    rangeText: '10月1-7日'
  }
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

function buildFestivalGroups(year) {
  const legal = LEGAL_HOLIDAY_RULES.map((item) => ({
    name: item.name,
    desc: item.rangeText,
    type: 'legal'
  }))

  const terms = SOLAR_TERMS.map((name, index) => {
    const t = termDate(year, index)
    return {
      name,
      desc: `${year}年${t.month}月${t.day}日`,
      type: 'term',
      month: t.month,
      day: t.day
    }
  })

  const popular = POPULAR_FESTIVALS.map((item) => {
    if (item.name === '母亲节') {
      const solar = nthWeekdayOfMonth(year, 5, 0, 2)
      return {
        name: item.name,
        desc: solar ? `${year}年${solar.month}月${solar.day}日` : `${year}年5月`,
        note: '五月第二个周日',
        type: 'popular'
      }
    }
    if (item.name === '父亲节') {
      const solar = nthWeekdayOfMonth(year, 6, 0, 3)
      return {
        name: item.name,
        desc: solar ? `${year}年${solar.month}月${solar.day}日` : `${year}年6月`,
        note: '六月第三个周日',
        type: 'popular'
      }
    }
    if (item.lunarMonth) {
      const solar = findSolarByLunar(year, item.lunarMonth, item.lunarDay)
      return {
        name: item.name,
        desc: solar
          ? `${year}年${solar.month}月${solar.day}日（${formatLunarDate(
              solarToLunar(year, solar.month, solar.day)
            )}）`
          : `农历${item.lunarMonth}月${item.lunarDay}日`,
        note: item.note || '',
        type: 'popular'
      }
    }
    return {
      name: item.name,
      desc: `${year}年${item.month}月${item.day}日`,
      note: item.note || '',
      type: 'popular'
    }
  })

  return { legal, terms, popular }
}

function getDayFestivalLabel(year, month, day) {
  const labels = []
  LEGAL_HOLIDAY_RULES.forEach((item) => {
    if (item.match(year, month, day)) labels.push(item.name)
  })
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
  if (info.solarTerm) labels.push(info.solarTerm)
  return labels.slice(0, 2).join(' ')
}

module.exports = {
  buildFestivalGroups,
  getDayFestivalLabel
}
