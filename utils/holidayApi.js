/**
 * 中国法定节假日（国务院安排，含调休）
 * 数据源：https://timor.tech/api/holiday/year/{year}
 * 本地缓存 7 天
 *
 * 小程序 request 合法域名：https://timor.tech
 */

const { pad2 } = require('./lunar')

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const API_BASE = 'https://timor.tech/api/holiday/year'
const HOLIDAY_API_MIN_YEAR = 2013

function cacheKey(year) {
  return `holiday_cache_v2_${year}`
}

function readCache(year) {
  try {
    const cached = wx.getStorageSync(cacheKey(year))
    if (!cached || !cached.data) return null
    return {
      data: cached.data,
      fresh: Date.now() - Number(cached.ts || 0) < CACHE_TTL_MS
    }
  } catch (e) {
    return null
  }
}

function writeCache(year, data) {
  try {
    wx.setStorageSync(cacheKey(year), {
      ts: Date.now(),
      data
    })
  } catch (e) {
    // ignore
  }
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      timeout: 12000,
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        resolve(res.data)
      },
      fail(err) {
        reject(err || new Error('network fail'))
      }
    })
  })
}

function normalizeFestivalKey(entry) {
  if (entry.target) return entry.target
  const name = entry.name || ''
  if (/除夕|春节|初/.test(name)) return '春节'
  if (name.indexOf('元旦') >= 0) return '元旦'
  if (name.indexOf('清明') >= 0) return '清明节'
  if (name.indexOf('劳动') >= 0) return '劳动节'
  if (name.indexOf('端午') >= 0) return '端午节'
  if (name.indexOf('中秋') >= 0) return '中秋节'
  if (name.indexOf('国庆') >= 0) return '国庆节'
  return name
}

function parseHolidayPayload(year, payload) {
  const raw = payload && payload.holiday
  if (!raw || typeof raw !== 'object') return null

  const dayMap = {}
  const entries = []

  Object.keys(raw).forEach((key) => {
    const item = raw[key]
    if (!item || !item.date) return
    const dateKey = item.date
    const record = {
      date: dateKey,
      month: Number(dateKey.slice(5, 7)),
      day: Number(dateKey.slice(8, 10)),
      name: item.name || '',
      holiday: !!item.holiday,
      after: !!item.after,
      target: item.target || '',
      wage: item.wage || 1
    }
    dayMap[dateKey] = record
    entries.push(record)
  })

  entries.sort((a, b) => a.date.localeCompare(b.date))

  const legalBlocks = {}
  entries.forEach((entry) => {
    if (!entry.holiday) return
    const festival = normalizeFestivalKey(entry)
    if (!legalBlocks[festival]) {
      legalBlocks[festival] = { name: festival, dates: [], restDays: [] }
    }
    legalBlocks[festival].dates.push(entry.date)
    legalBlocks[festival].restDays.push(`${entry.month}月${entry.day}日`)
  })

  const makeupDays = entries
    .filter((entry) => !entry.holiday && (entry.after || /补班/.test(entry.name)))
    .map((entry) => ({
      festival: normalizeFestivalKey(entry),
      text: `${entry.month}月${entry.day}日`
    }))

  const legal = Object.keys(legalBlocks)
    .sort()
    .map((key) => {
      const block = legalBlocks[key]
      const dates = block.dates
      const start = dates[0]
      const end = dates[dates.length - 1]
      const startText = `${Number(start.slice(5, 7))}月${Number(start.slice(8, 10))}日`
      const endText = `${Number(end.slice(5, 7))}月${Number(end.slice(8, 10))}日`
      const rangeText = start === end ? startText : `${startText}-${endText.split('月')[1]}`
      const makeup = makeupDays
        .filter((item) => item.festival === key)
        .map((item) => item.text)
        .join('、')
      return {
        name: block.name,
        desc: `${year}年 ${rangeText} 放假`,
        note: makeup ? `补班：${makeup}` : '',
        type: 'legal',
        source: 'timor',
        targetYear: Number(start.slice(0, 4)),
        targetMonth: Number(start.slice(5, 7)),
        targetDay: Number(start.slice(8, 10)),
        endYear: Number(end.slice(0, 4)),
        endMonth: Number(end.slice(5, 7)),
        endDay: Number(end.slice(8, 10))
      }
    })
    .sort((a, b) => {
      const left = `${a.targetYear}-${pad2(a.targetMonth)}-${pad2(a.targetDay)}`
      const right = `${b.targetYear}-${pad2(b.targetMonth)}-${pad2(b.targetDay)}`
      return left.localeCompare(right)
    })

  return {
    year,
    dayMap,
    legal,
    source: 'timor'
  }
}

async function fetchYearHolidays(year) {
  const payload = await requestJson(`${API_BASE}/${year}`)
  if (!payload || payload.code !== 0) {
    throw new Error('invalid holiday payload')
  }
  const parsed = parseHolidayPayload(year, payload)
  if (!parsed || !parsed.legal.length) {
    throw new Error('empty holiday data')
  }
  return parsed
}

function emptyHolidayData(year, extra) {
  return {
    year,
    dayMap: {},
    legal: [],
    source: 'fallback',
    fromCache: false,
    stale: false,
    error: '',
    ...(extra || {})
  }
}

async function loadYearHolidays(year) {
  const y = Number(year)
  const maxYear = new Date().getFullYear() + 1
  if (!(y >= HOLIDAY_API_MIN_YEAR && y <= maxYear)) {
    return emptyHolidayData(y)
  }

  const cached = readCache(year)
  if (cached && cached.fresh) {
    return { ...cached.data, fromCache: true, stale: false }
  }

  try {
    const remote = await fetchYearHolidays(year)
    writeCache(year, remote)
    return { ...remote, fromCache: false, stale: false }
  } catch (e) {
    if (cached && cached.data) {
      return { ...cached.data, fromCache: true, stale: true, error: '节日数据更新失败，已显示缓存' }
    }
    return emptyHolidayData(year, {
      error: '暂未获取官方放假安排，请检查网络并配置合法域名 timor.tech'
    })
  }
}

function getDayHolidayRecord(dayMap, year, month, day) {
  if (!dayMap) return null
  const key = `${year}-${pad2(month)}-${pad2(day)}`
  return dayMap[key] || null
}

function getDayHolidayLabel(dayMap, year, month, day) {
  const record = getDayHolidayRecord(dayMap, year, month, day)
  if (!record) return ''
  if (record.holiday) {
    const festival = normalizeFestivalKey(record)
    if (/初/.test(record.name) || record.name === '除夕') return festival
    return record.name
  }
  if (/补班/.test(record.name)) return '班'
  return ''
}

module.exports = {
  loadYearHolidays,
  getDayHolidayRecord,
  getDayHolidayLabel,
  API_BASE,
  CACHE_TTL_MS
}
