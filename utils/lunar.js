/**
 * 农历、干支、生肖、节气（1900-2100，离线计算）
 */

const GAN = '甲乙丙丁戊己庚辛壬癸'.split('')
const ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('')
const ZODIAC = '鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('')
const LUNAR_MONTHS = '正二三四五六七八九十冬腊'.split('')
const LUNAR_DAYS = [
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十',
  '廿一',
  '廿二',
  '廿三',
  '廿四',
  '廿五',
  '廿六',
  '廿七',
  '廿八',
  '廿九',
  '三十'
]

const SOLAR_TERMS = [
  '小寒',
  '大寒',
  '立春',
  '雨水',
  '惊蛰',
  '春分',
  '清明',
  '谷雨',
  '立夏',
  '小满',
  '芒种',
  '夏至',
  '小暑',
  '大暑',
  '立秋',
  '处暑',
  '白露',
  '秋分',
  '寒露',
  '霜降',
  '立冬',
  '小雪',
  '大雪',
  '冬至'
]

const lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14d55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252,
  0x0d520
]

function lunarYearDays(y) {
  let sum = 348
  const info = lunarInfo[y - 1900]
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += info & i ? 1 : 0
  }
  return sum + leapDays(y)
}

function leapMonth(y) {
  return lunarInfo[y - 1900] & 0xf
}

function leapDays(y) {
  if (leapMonth(y)) {
    return lunarInfo[y - 1900] & 0x10000 ? 30 : 29
  }
  return 0
}

function monthDays(y, m) {
  return lunarInfo[y - 1900] & (0x10000 >> m) ? 30 : 29
}

function solarToLunar(year, month, day) {
  const base = new Date(1900, 0, 31)
  const obj = new Date(year, month - 1, day)
  let offset = Math.floor((obj - base) / 86400000)

  let lunarYear = 1900
  let daysInYear = lunarYearDays(lunarYear)
  while (offset >= daysInYear && lunarYear < 2100) {
    offset -= daysInYear
    lunarYear += 1
    daysInYear = lunarYearDays(lunarYear)
  }

  const leap = leapMonth(lunarYear)
  let isLeap = false
  let lunarMonth = 1
  let daysInMonth = 0

  for (let m = 1; m <= 12; m += 1) {
    if (leap > 0 && m === leap + 1 && !isLeap) {
      lunarMonth -= 1
      isLeap = true
      daysInMonth = leapDays(lunarYear)
    } else {
      daysInMonth = monthDays(lunarYear, m)
    }

    if (offset < daysInMonth) break
    offset -= daysInMonth
    lunarMonth += 1
    if (isLeap && m === leap + 1) isLeap = false
  }

  const lunarDay = offset + 1
  return {
    lunarYear,
    lunarMonth,
    lunarDay,
    isLeap
  }
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatSolarDate(year, month, day) {
  return `${year}年${month}月${day}日`
}

function formatLunarDate(lunar) {
  if (!lunar) return ''
  const monthText = `${lunar.isLeap ? '闰' : ''}${LUNAR_MONTHS[lunar.lunarMonth - 1]}月`
  const dayText = LUNAR_DAYS[lunar.lunarDay - 1] || ''
  return `${monthText}${dayText}`
}

/** 日历格子用短农历：初一显示月份，其余显示初二、十五等 */
function formatLunarCell(lunar) {
  if (!lunar) return ''
  if (lunar.lunarDay === 1) {
    return `${lunar.isLeap ? '闰' : ''}${LUNAR_MONTHS[lunar.lunarMonth - 1]}月`
  }
  return LUNAR_DAYS[lunar.lunarDay - 1] || ''
}

function getGanZhiYear(lunarYear) {
  const gan = GAN[(lunarYear - 4) % 10]
  const zhi = ZHI[(lunarYear - 4) % 12]
  return `${gan}${zhi}`
}

/** 月干支：以农历月份推算，正月建寅，五虎遁月 */
function getGanZhiMonth(lunarYear, lunarMonth) {
  const month = Number(lunarMonth)
  if (!(month >= 1 && month <= 12)) return ''
  const yearGanIndex = (lunarYear - 4) % 10
  const firstMonthGanIndex = [2, 4, 6, 8, 0][yearGanIndex % 5]
  const monthGanIndex = (firstMonthGanIndex + month - 1) % 10
  const monthZhiIndex = (month + 1) % 12
  return `${GAN[monthGanIndex]}${ZHI[monthZhiIndex]}`
}

function getZodiac(lunarYear) {
  return ZODIAC[(lunarYear - 4) % 12]
}

/** 西历星座，常用日期分界 */
const CONSTELLATION_BOUNDS = [
  { name: '摩羯座', month: 1, day: 19 },
  { name: '水瓶座', month: 2, day: 18 },
  { name: '双鱼座', month: 3, day: 20 },
  { name: '白羊座', month: 4, day: 19 },
  { name: '金牛座', month: 5, day: 20 },
  { name: '双子座', month: 6, day: 21 },
  { name: '巨蟹座', month: 7, day: 22 },
  { name: '狮子座', month: 8, day: 22 },
  { name: '处女座', month: 9, day: 22 },
  { name: '天秤座', month: 10, day: 23 },
  { name: '天蝎座', month: 11, day: 22 },
  { name: '射手座', month: 12, day: 21 },
  { name: '摩羯座', month: 12, day: 31 }
]

function getConstellation(month, day) {
  const m = Number(month)
  const d = Number(day)
  if (!(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return ''
  for (let i = 0; i < CONSTELLATION_BOUNDS.length; i += 1) {
    const item = CONSTELLATION_BOUNDS[i]
    if (m < item.month || (m === item.month && d <= item.day)) {
      return item.name
    }
  }
  return '摩羯座'
}

function getGanZhiDay(year, month, day) {
  const base = new Date(1900, 0, 1)
  const cur = new Date(year, month - 1, day)
  const offset = Math.floor((cur - base) / 86400000)
  const gan = GAN[(offset + 10) % 10]
  const zhi = ZHI[(offset + 10) % 12]
  return `${gan}${zhi}`
}

function getWeekday(year, month, day) {
  const names = ['日', '一', '二', '三', '四', '五', '六']
  return names[new Date(year, month - 1, day).getDay()]
}

/** ISO 周次：返回所属周年份与第几周 */
function getWeekInfo(year, month, day) {
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  const dayNum = date.getDay() || 7
  date.setDate(date.getDate() + 4 - dayNum)
  const weekYear = date.getFullYear()
  const yearStart = new Date(weekYear, 0, 1)
  const weekNumber = Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  return {
    weekYear,
    weekNumber,
    weekText: `${weekYear}年第${weekNumber}周`
  }
}

function termDate(year, n) {
  const off = [
    5.4055, 20.12, 3.87, 18.73, 5.63, 20.646, 4.81, 20.1, 5.52, 21.04, 5.678, 21.37, 7.108,
    22.83, 7.5, 23.13, 7.646, 23.042, 8.318, 23.438, 7.438, 22.36, 7.18, 21.94
  ]
  const cal = [
    [6.11, 20.84, 4.15, 19.04, 6.04, 20.73, 4.81, 20.1, 5.52, 21.35, 6.06, 21.94],
    [6.11, 20.84, 4.629, 19.459, 6.382, 21.256, 5.59, 20.888, 6.318, 21.86, 6.5, 22.2],
    [5.4055, 20.12, 3.87, 18.73, 5.63, 20.646, 4.81, 20.1, 5.52, 21.04, 5.678, 21.37],
    [7.108, 22.83, 7.5, 23.13, 7.646, 23.042, 8.318, 23.438, 7.438, 22.36, 7.18, 21.94]
  ]
  const idx = Math.floor((year - 2000) / 4)
  const table = cal[Math.min(idx, cal.length - 1)]
  const day = Math.floor(off[n] + 0.5 + (year - 2000) * 0.2422 - Math.floor((year - 2000) / 4))
  const month = Math.floor(n / 2) + 1
  const d = Math.floor(table[n % 12] || day)
  return { month, day: d }
}

function getSolarTerm(year, month, day) {
  for (let i = 0; i < 24; i += 1) {
    const t = termDate(year, i)
    if (t.month === month && t.day === day) {
      return SOLAR_TERMS[i]
    }
  }
  return ''
}

function getNearestSolarTerm(year, month, day) {
  const cur = new Date(year, month - 1, day).getTime()
  let best = null
  for (let y = year - 1; y <= year + 1; y += 1) {
    for (let i = 0; i < 24; i += 1) {
      const t = termDate(y, i)
      const ts = new Date(y, t.month - 1, t.day).getTime()
      const diff = Math.abs(ts - cur)
      if (!best || diff < best.diff) {
        best = { name: SOLAR_TERMS[i], diff, date: `${y}-${pad2(t.month)}-${pad2(t.day)}` }
      }
    }
  }
  return best ? best.name : ''
}

function buildDayInfo(year, month, day) {
  const lunar = solarToLunar(year, month, day)
  const term = getSolarTerm(year, month, day)
  const weekInfo = getWeekInfo(year, month, day)
  return {
    solarYear: year,
    solarMonth: month,
    solarDay: day,
    solarText: formatSolarDate(year, month, day),
    weekday: getWeekday(year, month, day),
    weekNumber: weekInfo.weekNumber,
    weekYear: weekInfo.weekYear,
    weekText: weekInfo.weekText,
    lunar,
    lunarText: formatLunarDate(lunar),
    ganZhiYear: getGanZhiYear(lunar.lunarYear),
    ganZhiMonth: getGanZhiMonth(lunar.lunarYear, lunar.lunarMonth),
    ganZhiDay: getGanZhiDay(year, month, day),
    zodiac: getZodiac(lunar.lunarYear),
    constellation: getConstellation(month, day),
    solarTerm: term || getNearestSolarTerm(year, month, day)
  }
}

function compareDate(a, b) {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}

function isSameDate(a, b) {
  return a.year === b.year && a.month === b.month && a.day === b.day
}

function todayParts() {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  }
}

module.exports = {
  GAN,
  ZHI,
  SOLAR_TERMS,
  solarToLunar,
  formatLunarDate,
  formatLunarCell,
  formatSolarDate,
  getGanZhiYear,
  getGanZhiMonth,
  getGanZhiDay,
  getZodiac,
  getConstellation,
  getWeekInfo,
  getSolarTerm,
  getNearestSolarTerm,
  buildDayInfo,
  compareDate,
  isSameDate,
  todayParts,
  pad2
}
