/**
 * 汇率（兑人民币）
 * 数据源：https://api.exchangerate-api.com/v4/latest/USD
 * 本地缓存 24 小时，支持 API 返回的全部货币
 *
 * 小程序 request 合法域名：
 * - https://api.exchangerate-api.com
 */

const { getCurrencyLabel, sortCurrencyCodes } = require('./currencyNames')

const STORAGE_KEY = 'exchange_rate_cache_v2'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const API_URL = 'https://api.exchangerate-api.com/v4/latest/USD'

const FALLBACK_CODES = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD', 'KRW', 'AUD']

const FALLBACK_RATES_USD_BASE = {
  CNY: 6.76,
  USD: 1,
  EUR: 0.864,
  GBP: 0.739,
  JPY: 159.59,
  HKD: 7.84,
  KRW: 1411.93,
  AUD: 1.41
}

function buildUnitsFromUsdRates(ratesMap) {
  const cnyPerUsd = Number(ratesMap.CNY)
  if (!Number.isFinite(cnyPerUsd) || cnyPerUsd <= 0) return []

  const codes = sortCurrencyCodes(Object.keys(ratesMap))
  return codes
    .map((code) => {
      const apiRate = Number(ratesMap[code])
      if (!Number.isFinite(apiRate) || apiRate <= 0) return null
      const key = code.toLowerCase()
      const factor = code === 'CNY' ? 1 : cnyPerUsd / apiRate
      return {
        key,
        code,
        label: getCurrencyLabel(code),
        factor
      }
    })
    .filter(Boolean)
}

function buildFallbackUnits() {
  return buildUnitsFromUsdRates(FALLBACK_RATES_USD_BASE)
}

function buildDisplayResult(partial) {
  const units =
    (partial.units && partial.units.length && partial.units) || buildFallbackUnits()
  let note = '数据来源于 ExchangeRate-API，仅供参考；实际交易以银行柜台为准'
  if (partial.source === 'fallback') {
    note = '暂未获取最新汇率，已使用本地参考汇率；实际交易以银行柜台为准'
  } else if (partial.source === 'cache' && partial.stale) {
    note = '已使用本地缓存汇率（24 小时内有效）；可点「刷新汇率」重试'
  }
  return {
    units,
    unitCount: units.length,
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

/**
 * API 以 USD 为基准：rates.CNY = 1 USD 兑换多少 CNY
 * 换算为 1 单位外币 = ? CNY：factor(X) = rates.CNY / rates[X]
 */
function parseExchangeRateApi(payload) {
  const ratesMap = payload && payload.rates
  if (!ratesMap || typeof ratesMap !== 'object') return null

  const units = buildUnitsFromUsdRates(ratesMap)
  if (!units.length) return null

  const hasUsd = units.some((item) => item.key === 'usd')
  const hasCny = units.some((item) => item.key === 'cny')
  if (!hasUsd || !hasCny) return null

  return {
    units,
    publishedAt: String(payload.date || '').slice(0, 10),
    source: 'exchangerate-api'
  }
}

async function fetchLatestRates() {
  try {
    const payload = await requestJson(API_URL)
    return parseExchangeRateApi(payload)
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
    units: buildFallbackUnits(),
    source: 'fallback',
    error: '暂未获取最新汇率：请检查网络，并配置合法域名 api.exchangerate-api.com'
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
    units: buildFallbackUnits(),
    source: 'fallback'
  })
}

module.exports = {
  loadExchangeRates,
  getExchangeRateDisplay,
  buildFallbackUnits,
  API_URL,
  CACHE_TTL_MS
}
