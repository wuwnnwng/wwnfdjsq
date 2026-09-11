/**
 * 今日油价
 * 数据源：https://v2.xxapi.cn/api/oilPrice（无需密钥，一次返回各省报价）
 * 本地缓存 6 小时
 *
 * 小程序 request 合法域名：
 * - https://v2.xxapi.cn
 */

const STORAGE_CACHE = 'oilPrice:cache_v1'
const STORAGE_PROVINCE = 'oilPrice:lastProvinceId'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const API_URL = 'https://v2.xxapi.cn/api/oilPrice'

const GRADES = [
  { key: 'p92', label: '92号汽油', short: '92#' },
  { key: 'p95', label: '95号汽油', short: '95#' },
  { key: 'p98', label: '98号汽油', short: '98#' },
  { key: 'p0', label: '0号柴油', short: '0#' }
]

const PROVINCES = [
  { id: 'bj', name: '北京' },
  { id: 'tj', name: '天津' },
  { id: 'he', name: '河北' },
  { id: 'sx', name: '山西' },
  { id: 'nm', name: '内蒙古' },
  { id: 'ln', name: '辽宁' },
  { id: 'jl', name: '吉林' },
  { id: 'hl', name: '黑龙江' },
  { id: 'sh', name: '上海' },
  { id: 'js', name: '江苏' },
  { id: 'zj', name: '浙江' },
  { id: 'ah', name: '安徽' },
  { id: 'fj', name: '福建' },
  { id: 'jx', name: '江西' },
  { id: 'sd', name: '山东' },
  { id: 'ha', name: '河南' },
  { id: 'hb', name: '湖北' },
  { id: 'hn', name: '湖南' },
  { id: 'gd', name: '广东' },
  { id: 'gx', name: '广西' },
  { id: 'hi', name: '海南' },
  { id: 'cq', name: '重庆' },
  { id: 'sc', name: '四川' },
  { id: 'gz', name: '贵州' },
  { id: 'yn', name: '云南' },
  { id: 'xz', name: '西藏' },
  { id: 'sn', name: '陕西' },
  { id: 'gs', name: '甘肃' },
  { id: 'qh', name: '青海' },
  { id: 'nx', name: '宁夏' },
  { id: 'xj', name: '新疆' }
]

const DEFAULT_PROVINCE_ID = 'bj'
const PROVINCE_NAMES = PROVINCES.map((item) => item.name)
const PROVINCE_BY_ID = {}
const PROVINCE_BY_KEY = {}
PROVINCES.forEach((item, index) => {
  PROVINCE_BY_ID[item.id] = item
  PROVINCE_BY_KEY[normalizeName(item.name)] = item
  item.index = index
})

function normalizeName(name) {
  return String(name || '')
    .replace(/特别行政区/g, '')
    .replace(/维吾尔自治区|壮族自治区|回族自治区|自治区/g, '')
    .replace(/省|市/g, '')
    .replace(/\s+/g, '')
    .trim()
}

function getProvince(id) {
  return PROVINCE_BY_ID[id] || PROVINCE_BY_ID[DEFAULT_PROVINCE_ID]
}

function getProvinceByIndex(index) {
  return PROVINCES[Number(index)] || PROVINCES[0]
}

function getProvinceIndex(id) {
  const item = getProvince(id)
  return item ? item.index : 0
}

function matchProvince(name) {
  const key = normalizeName(name)
  return PROVINCE_BY_KEY[key] || null
}

function readLastProvinceId() {
  try {
    const id = wx.getStorageSync(STORAGE_PROVINCE)
    if (id && PROVINCE_BY_ID[id]) return id
  } catch (e) {}
  return DEFAULT_PROVINCE_ID
}

function writeLastProvinceId(id) {
  if (!id || !PROVINCE_BY_ID[id]) return
  try {
    wx.setStorageSync(STORAGE_PROVINCE, id)
  } catch (e) {}
}

function toPrice(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

function toChange(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) / 100
}

function formatPrice(value) {
  const n = toPrice(value)
  return n == null ? '--' : n.toFixed(2)
}

function formatChange(value) {
  const n = toChange(value)
  if (n == null || n === 0) {
    return { text: '持平', dir: 'flat' }
  }
  const abs = Math.abs(n).toFixed(2)
  if (n > 0) return { text: `+${abs}`, dir: 'up' }
  return { text: `-${abs}`, dir: 'down' }
}

function pickRawList(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return null
  if (Array.isArray(payload.data)) return payload.data
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data
  if (Array.isArray(payload.result)) return payload.result
  return null
}

function parseRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  const province = matchProvince(raw.regionName || raw.province || raw.city || raw.name)
  if (!province) return null
  const p92 = toPrice(raw.n92 != null ? raw.n92 : raw.p92)
  const p95 = toPrice(raw.n95 != null ? raw.n95 : raw.p95)
  const p98 = toPrice(raw.n98 != null ? raw.n98 : raw.p98)
  const p0 = toPrice(raw.n0 != null ? raw.n0 : raw.p0)
  if (p92 == null && p95 == null && p98 == null && p0 == null) return null
  return {
    id: province.id,
    name: province.name,
    index: province.index,
    p92,
    p95,
    p98,
    p0,
    c92: toChange(raw.n92Change != null ? raw.n92Change : raw.c92),
    c95: toChange(raw.n95Change != null ? raw.n95Change : raw.c95),
    c98: toChange(raw.n98Change != null ? raw.n98Change : raw.c98),
    c0: toChange(raw.n0Change != null ? raw.n0Change : raw.c0),
    date: String(raw.date || '').slice(0, 10)
  }
}

function parsePayload(payload) {
  if (payload && typeof payload === 'object' && payload.code != null && Number(payload.code) !== 200) {
    return null
  }
  const list = pickRawList(payload)
  if (!list || !list.length) return null
  const byId = {}
  list.forEach((item) => {
    const row = parseRow(item)
    if (!row) return
    byId[row.id] = row
  })
  const rows = PROVINCES.map((item) => byId[item.id]).filter(Boolean)
  if (!rows.length) return null
  const date = rows.find((item) => item.date) ? rows.find((item) => item.date).date : ''
  return {
    date,
    rows,
    source: 'xxapi'
  }
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      timeout: 15000,
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        const payload = res.data
        if (!payload || typeof payload !== 'object') {
          reject(new Error('invalid json'))
          return
        }
        resolve(payload)
      },
      fail(err) {
        reject(err || new Error('network fail'))
      }
    })
  })
}

function readCache() {
  try {
    const cached = wx.getStorageSync(STORAGE_CACHE)
    if (!cached || !cached.data) return null
    return {
      data: cached.data,
      fresh: Date.now() - Number(cached.ts || 0) < CACHE_TTL_MS
    }
  } catch (e) {
    return null
  }
}

function writeCache(data) {
  try {
    wx.setStorageSync(STORAGE_CACHE, {
      ts: Date.now(),
      data
    })
  } catch (e) {}
}

function gradeValue(row, key) {
  if (!row) return null
  if (key === 'p95') return row.p95
  if (key === 'p98') return row.p98
  if (key === 'p0') return row.p0
  return row.p92
}

function gradeChange(row, key) {
  if (!row) return null
  if (key === 'p95') return row.c95
  if (key === 'p98') return row.c98
  if (key === 'p0') return row.c0
  return row.c92
}

function buildGradeCards(row) {
  return GRADES.map((item) => {
    const price = gradeValue(row, item.key)
    const change = formatChange(gradeChange(row, item.key))
    return {
      key: item.key,
      label: item.label,
      short: item.short,
      price,
      priceText: formatPrice(price),
      changeText: change.text,
      changeDir: change.dir
    }
  })
}

function buildProvinceRows(rows, selectedId, gradeKey) {
  const key = gradeKey || 'p92'
  return (rows || []).map((item) => {
    const price = gradeValue(item, key)
    const change = formatChange(gradeChange(item, key))
    return {
      id: item.id,
      name: item.name,
      price,
      priceText: formatPrice(price),
      changeText: change.text,
      changeDir: change.dir,
      active: item.id === selectedId
    }
  })
}

function buildView(data, options) {
  const rows = (data && data.rows) || []
  const wanted = getProvince((options && options.provinceId) || readLastProvinceId())
  const selected = rows.find((item) => item.id === wanted.id) || null
  const provinceId = wanted.id
  const gradeKey = (options && options.gradeKey) || 'p92'
  const grade = GRADES.find((item) => item.key === gradeKey) || GRADES[0]
  const heroPrice = gradeValue(selected, grade.key)
  const heroChange = formatChange(gradeChange(selected, grade.key))
  const source = (options && options.source) || (data && data.source) || 'fallback'
  let note = '数据来自公开油价接口，仅供参考，以加油站挂牌价为准。'
  if (source === 'fallback') {
    note = '暂未获取最新油价，请检查网络，并在小程序后台配置合法域名 v2.xxapi.cn。'
  } else if (source === 'cache' && options && options.stale) {
    note = '已显示本地缓存油价。可点「刷新」重试。'
  }
  return {
    provinceId,
    provinceName: wanted.name,
    provinceIndex: getProvinceIndex(provinceId),
    gradeKey: grade.key,
    gradeLabel: grade.label,
    heroPrice,
    heroPriceText: formatPrice(heroPrice),
    heroChangeText: heroChange.text,
    heroChangeDir: heroChange.dir,
    cards: buildGradeCards(selected),
    list: buildProvinceRows(rows, provinceId, grade.key),
    date: (data && data.date) || '',
    source,
    note,
    error: (options && options.error) || ''
  }
}

async function fetchLatest() {
  try {
    const payload = await requestJson(API_URL)
    return parsePayload(payload)
  } catch (e) {
    return null
  }
}

async function loadOilPrices(options) {
  const force = !!(options && options.force)
  const provinceId = (options && options.provinceId) || readLastProvinceId()
  const gradeKey = (options && options.gradeKey) || 'p92'
  const cached = readCache()

  if (!force && cached && cached.fresh && cached.data) {
    return buildView(cached.data, {
      provinceId,
      gradeKey,
      source: 'cache',
      stale: false
    })
  }

  const remote = await fetchLatest()
  if (remote) {
    writeCache(remote)
    return buildView(remote, {
      provinceId,
      gradeKey,
      source: 'xxapi'
    })
  }

  if (cached && cached.data) {
    return buildView(cached.data, {
      provinceId,
      gradeKey,
      source: 'cache',
      stale: true,
      error: force ? '更新失败，已显示缓存油价' : ''
    })
  }

  return buildView(null, {
    provinceId,
    gradeKey,
    source: 'fallback',
    error: '暂未获取今日油价：请检查网络，并配置合法域名 v2.xxapi.cn'
  })
}

module.exports = {
  API_URL,
  CACHE_TTL_MS,
  GRADES,
  PROVINCES,
  PROVINCE_NAMES,
  DEFAULT_PROVINCE_ID,
  getProvince,
  getProvinceByIndex,
  getProvinceIndex,
  readLastProvinceId,
  writeLastProvinceId,
  formatPrice,
  loadOilPrices
}
