/**
 * 汇率（兑人民币）
 *
 * 中国货币网旧接口 cm-u-bk-ccpr/CCPRList 已下线（返回 Path not found）。
 * 当前数据源（按顺序）：
 * 1) 东方财富 push2 外汇行情（实时）
 * 2) 中国货币网 cm-u-bk-currency/CcprList|CcprHis（若可用）
 * 3) 外汇管理局 SAFE 公布汇率
 *
 * 小程序 request 合法域名建议配置：
 * - https://push2.eastmoney.com
 * - https://www.chinamoney.com.cn
 * - https://www.safe.gov.cn
 */

const STORAGE_KEY = 'exchange_rate_cache_v1'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

const PUSH2_FOREX_URL =
  'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=50&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:120+t:1&fields=f12,f14,f2'

const PUSH2_FOREX_URL_ALT =
  'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=50&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:133+t:5&fields=f12,f14,f2'

const CHINAMONEY_CCPR_LIST_URL =
  'https://www.chinamoney.com.cn/ags/ms/cm-u-bk-currency/CcprList?lang=CN&pageNum=1&pageSize=40'

const SAFE_RMB_URL =
  'https://www.safe.gov.cn/AppStructured/hlw/exportRMBPara.do?pages=1&rows=30'

const CURRENCY_META = [
  { key: 'cny', label: '人民币 CNY' },
  { key: 'usd', label: '美元 USD' },
  { key: 'eur', label: '欧元 EUR' },
  { key: 'gbp', label: '英镑 GBP' },
  { key: 'jpy', label: '日元 JPY' },
  { key: 'hkd', label: '港币 HKD' },
  { key: 'krw', label: '韩元 KRW' },
  { key: 'aud', label: '澳元 AUD' }
]

const FALLBACK_RATES = {
  cny: 1,
  usd: 7.25,
  eur: 7.85,
  gbp: 9.15,
  jpy: 0.0485,
  hkd: 0.93,
  krw: 0.0052,
  aud: 4.72
}

const PAIR_ALIASES = {
  'USD/CNY': 'usd',
  'EUR/CNY': 'eur',
  'GBP/CNY': 'gbp',
  'JPY/CNY': 'jpy',
  '100JPY/CNY': 'jpy',
  'HKD/CNY': 'hkd',
  'KRW/CNY': 'krw',
  '100KRW/CNY': 'krw',
  'AUD/CNY': 'aud'
}

const CODE_ALIASES = {
  USD: 'usd',
  EUR: 'eur',
  GBP: 'gbp',
  JPY: 'jpy',
  '100JPY': 'jpy',
  HKD: 'hkd',
  KRW: 'krw',
  '100KRW': 'krw',
  AUD: 'aud',
  USDCNY: 'usd',
  USDCNH: 'usd',
  EURCNY: 'eur',
  EURCNH: 'eur',
  GBPCNY: 'gbp',
  GBPCNH: 'gbp',
  JPYCNY: 'jpy',
  JPYCNH: 'jpy',
  HKDCNY: 'hkd',
  HKDCNH: 'hkd',
  KRWCNY: 'krw',
  KRWCNH: 'krw',
  AUDCNY: 'aud',
  AUDCNH: 'aud'
}

const SAFE_NAME_ALIASES = {
  美元: 'usd',
  欧元: 'eur',
  英镑: 'gbp',
  日元: 'jpy',
  港币: 'hkd',
  韩国元: 'krw',
  韩元: 'krw',
  澳大利亚元: 'aud',
  澳元: 'aud'
}

function formatDate(value) {
  if (!value) return ''
  const text = String(value)
  const cn = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (cn) {
    return `${cn[1]}-${cn[2].padStart(2, '0')}-${cn[3].padStart(2, '0')}`
  }
  const std = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (std) {
    return `${std[1]}-${std[2].padStart(2, '0')}-${std[3].padStart(2, '0')}`
  }
  return text.slice(0, 10)
}

function formatYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildUnits(rates) {
  return CURRENCY_META.map((item) => ({
    key: item.key,
    label: item.label,
    factor: rates[item.key] != null ? rates[item.key] : FALLBACK_RATES[item.key]
  }))
}

function buildDisplayResult(partial) {
  const rates = { ...FALLBACK_RATES, ...(partial.rates || {}) }
  rates.cny = 1
  const units = buildUnits(rates)
  let note = '数据来源于公开汇率，仅供参考；实际交易以银行柜台为准'
  if (partial.source === 'fallback') {
    note = '暂未获取最新汇率，已使用本地参考汇率；实际交易以银行柜台为准'
  } else if (partial.source === 'cache' && partial.stale) {
    note = '已使用本地缓存汇率；可点「刷新汇率」重试'
  } else if (partial.source === 'chinamoney') {
    note = '数据来源于中国货币网人民币汇率中间价，仅供参考；实际交易以银行柜台为准'
  } else if (partial.source === 'eastmoney') {
    note = '数据来源于东方财富外汇行情，仅供参考；实际交易以银行柜台为准'
  } else if (partial.source === 'safe') {
    note = '数据来源于外汇管理局公布汇率，仅供参考；实际交易以银行柜台为准'
  }
  return {
    rates,
    units,
    publishedAt: partial.publishedAt || '',
    source: partial.source || 'fallback',
    note,
    error: partial.error || ''
  }
}

function readCache() {
  try {
    const cached = wx.getStorageSync(STORAGE_KEY)
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
    wx.setStorageSync(STORAGE_KEY, {
      ts: Date.now(),
      data
    })
  } catch (e) {
    // ignore
  }
}

function normalizePayload(data) {
  if (data == null) return null
  if (typeof data === 'string') {
    const text = data.trim()
    if (!text || text[0] === '<') return null
    try {
      return JSON.parse(text)
    } catch (e) {
      return null
    }
  }
  return data
}

function hasApiError(payload) {
  if (!payload || typeof payload !== 'object') return true
  if (payload.Error) return true
  if (payload.error) return true
  if (payload.success === false) return true
  if (payload.code === 9501) return true
  return false
}

function extractRecords(payload) {
  if (!payload || hasApiError(payload)) return []
  if (Array.isArray(payload.records)) return payload.records
  if (payload.data) {
    if (Array.isArray(payload.data.records)) return payload.data.records
    if (Array.isArray(payload.data.rows)) return payload.data.rows
    if (Array.isArray(payload.data)) return payload.data
  }
  if (Array.isArray(payload.rows)) return payload.rows
  if (Array.isArray(payload.result && payload.result.data)) return payload.result.data
  if (Array.isArray(payload)) return payload
  return []
}

function requestJson(url, headerExtra) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      timeout: 15000,
      header: Object.assign(
        {
          'Content-Type': 'application/json'
        },
        headerExtra || {}
      ),
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        const payload = normalizePayload(res.data)
        if (!payload) {
          reject(new Error('invalid json'))
          return
        }
        if (hasApiError(payload)) {
          reject(new Error(payload.Error || payload.message || 'api error'))
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

function requestChinamoney(url) {
  return requestJson(url, {
    Referer: 'https://www.chinamoney.com.cn/chinese/bkccpr/',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  })
}

function parsePairKey(row) {
  const pair = String(row.vrtEN || row.vrtCode || row.pair || row.ccyPair || '').toUpperCase()
  if (PAIR_ALIASES[pair]) return PAIR_ALIASES[pair]

  const foreign = String(
    row.foreignCcy || row.currency || row.code || row.SECURITY_CODE || row.f12 || ''
  )
    .toUpperCase()
    .replace(/\s+/g, '')
  if (CODE_ALIASES[foreign]) return CODE_ALIASES[foreign]
  if (foreign.indexOf('100JPY') >= 0 || foreign.indexOf('JPY') >= 0) return 'jpy'
  if (foreign.indexOf('100KRW') >= 0 || foreign.indexOf('KRW') >= 0) return 'krw'
  if (foreign.indexOf('USD') >= 0) return 'usd'
  if (foreign.indexOf('EUR') >= 0) return 'eur'
  if (foreign.indexOf('GBP') >= 0) return 'gbp'
  if (foreign.indexOf('HKD') >= 0) return 'hkd'
  if (foreign.indexOf('AUD') >= 0) return 'aud'
  return ''
}

function parseRateValue(row) {
  const raw =
    row.price ||
    row.midPrice ||
    row.middlePrice ||
    row.midprice ||
    row.NEW_PRICE ||
    row.rate ||
    row.f2 ||
    row.zjj ||
    row.huiIn
  const text = String(raw == null ? '' : raw).replace(/,/g, '')
  const price = Number(text)
  if (!Number.isFinite(price) || price <= 0) return null

  const pair = String(row.vrtEN || row.vrtCode || row.pair || row.SECURITY_CODE || row.f12 || '').toUpperCase()
  const foreign = String(row.foreignCcy || row.currency || row.SECURITY_CODE || row.f12 || '').toUpperCase()
  const name = String(row.name || row.f14 || row.currencyName || '')

  let unitCount = Number(row.vrtTC || row.tc || row.foreignAmount || row.unit || 1)
  if (!Number.isFinite(unitCount) || unitCount <= 0) unitCount = 1

  if (
    pair.indexOf('100JPY') >= 0 ||
    pair.indexOf('100KRW') >= 0 ||
    foreign.indexOf('100JPY') >= 0 ||
    foreign.indexOf('100KRW') >= 0 ||
    name.indexOf('100日元') >= 0 ||
    name.indexOf('100韩元') >= 0
  ) {
    unitCount = 100
  }

  // SAFE / 牌价常见格式：100 外币 = price 人民币
  if (price >= 50 && (foreign.indexOf('USD') >= 0 || foreign === 'USD' || name === '美元')) {
    return price / 100
  }
  if (price >= 300 && (foreign.indexOf('JPY') >= 0 || name.indexOf('日元') >= 0)) {
    return price / 100
  }
  if (price >= 300 && unitCount === 1 && (foreign.indexOf('KRW') >= 0 || name.indexOf('韩元') >= 0)) {
    return price / 100
  }
  if (price > 20 && unitCount === 1 && (foreign.indexOf('EUR') >= 0 || name === '欧元')) {
    return price / 100
  }
  if (price > 20 && unitCount === 1 && (foreign.indexOf('GBP') >= 0 || name === '英镑')) {
    return price / 100
  }
  if (price > 20 && unitCount === 1 && (foreign.indexOf('AUD') >= 0 || name.indexOf('澳元') >= 0)) {
    return price / 100
  }

  return price / unitCount
}

function mergeRateRows(records, source) {
  if (!Array.isArray(records) || !records.length) return null

  const rates = { cny: 1 }
  let publishedAt = ''

  records.forEach((row) => {
    let key = parsePairKey(row)
    if (!key) {
      const name = String(row.name || row.f14 || row.currencyName || '')
      key = SAFE_NAME_ALIASES[name] || ''
    }
    if (!key || key === 'cny') return
    const factor = parseRateValue(row)
    if (!Number.isFinite(factor)) return
    rates[key] = factor
    if (!publishedAt) {
      publishedAt = formatDate(
        row.showDateCN ||
          row.showDateEN ||
          row.tradeDate ||
          row.date ||
          row.TRADE_DATE ||
          row.trade_date ||
          row.publishDate
      )
    }
  })

  if (!rates.usd) return null
  if (!publishedAt) publishedAt = formatYmd(new Date())
  return {
    rates,
    publishedAt,
    source
  }
}

function parsePush2Forex(payload) {
  const diff = payload && payload.data && payload.data.diff
  if (!Array.isArray(diff) || !diff.length) return null
  return mergeRateRows(diff, 'eastmoney')
}

function getChinamoneyHisUrl() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 40)
  return (
    'https://www.chinamoney.com.cn/ags/ms/cm-u-bk-currency/CcprHis?lang=CN&pageNum=1&pageSize=40' +
    `&startDate=${formatYmd(start)}&endDate=${formatYmd(end)}`
  )
}

function pickLatestHisRecords(records) {
  if (!Array.isArray(records) || !records.length) return []

  let latestDate = ''
  records.forEach((row) => {
    const date = formatDate(row.showDateCN || row.showDateEN || row.tradeDate || row.date)
    if (date && date > latestDate) latestDate = date
  })
  if (!latestDate) return records

  return records.filter((row) => {
    const date = formatDate(row.showDateCN || row.showDateEN || row.tradeDate || row.date)
    return date === latestDate
  })
}

async function fetchFromPush2() {
  const urls = [PUSH2_FOREX_URL, PUSH2_FOREX_URL_ALT]
  for (let i = 0; i < urls.length; i += 1) {
    try {
      const payload = await requestJson(urls[i], {
        Referer: 'https://quote.eastmoney.com/'
      })
      const parsed = parsePush2Forex(payload)
      if (parsed) return parsed
    } catch (e) {
      // try next
    }
  }
  return null
}

async function fetchFromChinamoney() {
  const urls = [CHINAMONEY_CCPR_LIST_URL, getChinamoneyHisUrl()]
  for (let i = 0; i < urls.length; i += 1) {
    try {
      const payload = await requestChinamoney(urls[i])
      const records =
        urls[i].indexOf('CcprHis') >= 0
          ? pickLatestHisRecords(extractRecords(payload))
          : extractRecords(payload)
      const parsed = mergeRateRows(records, 'chinamoney')
      if (parsed) return parsed
    } catch (e) {
      // try next
    }
  }
  return null
}

async function fetchFromSafe() {
  try {
    const payload = await requestJson(SAFE_RMB_URL, {
      Referer: 'https://www.safe.gov.cn/'
    })
    return mergeRateRows(extractRecords(payload), 'safe')
  } catch (e) {
    return null
  }
}

async function fetchLatestRates() {
  const push2 = await fetchFromPush2()
  if (push2) return push2

  const chinamoney = await fetchFromChinamoney()
  if (chinamoney) return chinamoney

  return fetchFromSafe()
}

async function loadExchangeRates(options) {
  const force = !!(options && options.force)
  const cached = readCache()

  if (!force && cached && cached.fresh && cached.data) {
    return buildDisplayResult({
      ...cached.data,
      source: 'cache',
      stale: false
    })
  }

  const remote = await fetchLatestRates()
  if (remote) {
    writeCache(remote)
    return buildDisplayResult(remote)
  }

  if (cached && cached.data) {
    return buildDisplayResult({
      ...cached.data,
      source: 'cache',
      stale: true,
      error: force ? '更新失败，已显示缓存汇率' : ''
    })
  }

  return buildDisplayResult({
    rates: FALLBACK_RATES,
    source: 'fallback',
    error:
      '暂未获取最新汇率：请检查网络，并在微信后台配置 request 合法域名（push2.eastmoney.com 等）'
  })
}

function getExchangeRateDisplay() {
  const cached = readCache()
  if (cached && cached.data) {
    return buildDisplayResult({
      ...cached.data,
      source: 'cache',
      stale: !cached.fresh
    })
  }
  return buildDisplayResult({
    rates: FALLBACK_RATES,
    source: 'fallback'
  })
}

module.exports = {
  loadExchangeRates,
  getExchangeRateDisplay,
  buildUnits,
  FALLBACK_RATES,
  PUSH2_FOREX_URL,
  CHINAMONEY_CCPR_LIST_URL,
  SAFE_RMB_URL
}
