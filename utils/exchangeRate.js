/**
 * 汇率（人民币中间价）
 * 优先请求中国货币网公开接口（与 LPR 同域，无需自建后端）：
 * https://www.chinamoney.com.cn/ags/ms/cm-u-bk-ccpr/CCPRList
 *
 * 小程序正式版需在微信后台配置 request 合法域名：
 * - https://www.chinamoney.com.cn
 */

const STORAGE_KEY = 'exchange_rate_cache_v1'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

const CHINAMONEY_URL =
  'https://www.chinamoney.com.cn/ags/ms/cm-u-bk-ccpr/CCPRList?lang=CN&pageNum=1&pageSize=30'

const CURRENCY_META = [
  { key: 'cny', label: '人民币 CNY', pair: null },
  { key: 'usd', label: '美元 USD', pair: 'USD/CNY' },
  { key: 'eur', label: '欧元 EUR', pair: 'EUR/CNY' },
  { key: 'gbp', label: '英镑 GBP', pair: 'GBP/CNY' },
  { key: 'jpy', label: '日元 JPY', pair: 'JPY/CNY' },
  { key: 'hkd', label: '港币 HKD', pair: 'HKD/CNY' },
  { key: 'krw', label: '韩元 KRW', pair: 'KRW/CNY' },
  { key: 'aud', label: '澳元 AUD', pair: 'AUD/CNY' }
]

// 接口失败时的兜底（factor = 1 外币兑换多少 CNY）
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

function formatDate(value) {
  if (!value) return ''
  const text = String(value)
  const cn = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (cn) {
    return `${cn[1]}-${cn[2].padStart(2, '0')}-${cn[3].padStart(2, '0')}`
  }
  const std = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (std) {
    return `${std[1]}-${std[2].padStart(2, '0')}-${std[3].padStart(2, '0')}`
  }
  const en = text.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/)
  if (en) {
    const months = {
      Jan: '01',
      Feb: '02',
      Mar: '03',
      Apr: '04',
      May: '05',
      Jun: '06',
      Jul: '07',
      Aug: '08',
      Sep: '09',
      Oct: '10',
      Nov: '11',
      Dec: '12'
    }
    const mm = months[en[2]]
    if (mm) {
      return `${en[3]}-${mm}-${String(en[1]).padStart(2, '0')}`
    }
  }
  return text.slice(0, 10)
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
  let note = '数据来源于中国货币网人民币汇率中间价，仅供参考；实际交易以银行柜台为准'
  if (partial.source === 'fallback') {
    note = '暂未获取最新中间价，已使用本地参考汇率；实际交易以银行柜台为准'
  } else if (partial.source === 'cache' && partial.stale) {
    note = '已使用本地缓存的中间价；下拉刷新或重新进入可尝试更新'
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

function requestJson(url) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      timeout: 10000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        reject(new Error(`HTTP ${res.statusCode}`))
      },
      fail(err) {
        reject(err || new Error('network fail'))
      }
    })
  })
}

function parsePairKey(row) {
  const pair = String(row.vrtEN || row.vrtCode || row.pair || '').toUpperCase()
  if (PAIR_ALIASES[pair]) return PAIR_ALIASES[pair]
  const foreign = String(row.foreignCcy || row.currency || '').toUpperCase()
  if (foreign === 'USD') return 'usd'
  if (foreign === 'EUR') return 'eur'
  if (foreign === 'GBP') return 'gbp'
  if (foreign === 'JPY') return 'jpy'
  if (foreign === 'HKD') return 'hkd'
  if (foreign === 'KRW') return 'krw'
  if (foreign === 'AUD') return 'aud'
  return ''
}

function parseRateValue(row) {
  const price = Number(row.price || row.midPrice || row.rate)
  if (!Number.isFinite(price) || price <= 0) return null

  const pair = String(row.vrtEN || row.vrtCode || '').toUpperCase()
  let unitCount = Number(row.vrtTC || row.tc || row.foreignAmount || 1)
  if (!Number.isFinite(unitCount) || unitCount <= 0) unitCount = 1
  if (pair.indexOf('100JPY') >= 0 || pair.indexOf('100KRW') >= 0) unitCount = 100
  return price / unitCount
}

function parseChinamoneyRates(payload) {
  const records =
    (payload && payload.records) ||
    (payload && payload.data && payload.data.records) ||
    []
  if (!Array.isArray(records) || !records.length) return null

  const rates = { cny: 1 }
  let publishedAt = ''

  records.forEach((row) => {
    const key = parsePairKey(row)
    if (!key || key === 'cny') return
    const factor = parseRateValue(row)
    if (!Number.isFinite(factor)) return
    rates[key] = factor
    if (!publishedAt) {
      publishedAt = formatDate(row.showDateCN || row.showDateEN || row.tradeDate || row.date)
    }
  })

  if (!rates.usd) return null
  return {
    rates,
    publishedAt,
    source: 'chinamoney'
  }
}

async function fetchLatestRates() {
  try {
    const payload = await requestJson(CHINAMONEY_URL)
    return parseChinamoneyRates(payload)
  } catch (e) {
    return null
  }
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
    error: '暂未获取最新中间价，已使用本地参考汇率'
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
  CHINAMONEY_URL
}
