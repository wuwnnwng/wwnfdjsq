/**
 * LPR 基准利率
 * 优先请求公开接口（无需自建后端）：
 * 1) 东方财富 datacenter-web
 * 2) 中国货币网 chinamoney（全国银行间同业拆借中心）
 *
 * 小程序正式版需在微信后台配置 request 合法域名：
 * - https://datacenter-web.eastmoney.com
 * - https://www.chinamoney.com.cn
 */

const STORAGE_KEY = 'lpr_cache_v1'
const CACHE_TTL_MS = 12 * 60 * 60 * 1000

// 接口失败时的兜底（与 2026-07-20 最新公布一致）
const FALLBACK = {
  oneYear: '3.00',
  fiveYear: '3.50',
  publishedAt: '2026-07-20',
  source: 'fallback'
}

const EASTMONEY_URL =
  'https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=TRADE_DATE&sortTypes=-1&pageSize=1&pageNumber=1&reportName=RPTA_WEB_RATE&columns=ALL'

const CHINAMONEY_URL =
  'https://www.chinamoney.com.cn/ags/ms/cm-u-bk-currency/LprHis?lang=CN&pageNum=1&pageSize=1'

function formatRate(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(2)
}

function formatDate(value) {
  if (!value) return ''
  const text = String(value)
  const m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!m) return ''
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

function normalizeResult(partial) {
  const oneYear = formatRate(partial.oneYear)
  const fiveYear = formatRate(partial.fiveYear)
  const publishedAt = formatDate(partial.publishedAt)
  if (!oneYear || !fiveYear || !publishedAt) return null
  return {
    oneYear,
    fiveYear,
    publishedAt,
    source: partial.source || ''
  }
}

function readCache() {
  try {
    const cached = wx.getStorageSync(STORAGE_KEY)
    if (!cached || !cached.data) return null
    const data = normalizeResult(cached.data)
    if (!data) return null
    return {
      data,
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

function parseEastmoney(payload) {
  const row =
    payload &&
    payload.result &&
    Array.isArray(payload.result.data) &&
    payload.result.data[0]
  if (!row) return null
  return normalizeResult({
    oneYear: row.LPR1Y,
    fiveYear: row.LPR5Y,
    publishedAt: row.TRADE_DATE,
    source: 'eastmoney'
  })
}

function parseChinamoney(payload) {
  const row = payload && Array.isArray(payload.records) && payload.records[0]
  if (!row) return null
  return normalizeResult({
    oneYear: row['1Y'],
    fiveYear: row['5Y'],
    publishedAt: row.showDateCN || row.showDateEN,
    source: 'chinamoney'
  })
}

async function fetchLatestLpr() {
  try {
    const east = parseEastmoney(await requestJson(EASTMONEY_URL))
    if (east) return east
  } catch (e) {
    // try next
  }

  try {
    const china = parseChinamoney(await requestJson(CHINAMONEY_URL))
    if (china) return china
  } catch (e) {
    // fallback below
  }

  return null
}

/**
 * 获取 LPR 展示数据
 * @returns {Promise<{oneYear:string,fiveYear:string,publishedAt:string,source:string,fromCache:boolean}>}
 */
async function loadLprDisplay() {
  const cached = readCache()
  if (cached && cached.fresh) {
    return { ...cached.data, fromCache: true }
  }

  const remote = await fetchLatestLpr()
  if (remote) {
    writeCache(remote)
    return { ...remote, fromCache: false }
  }

  if (cached && cached.data) {
    return { ...cached.data, fromCache: true }
  }

  return { ...FALLBACK, fromCache: false }
}

function getLprDisplay() {
  const cached = readCache()
  if (cached && cached.data) return cached.data
  return { ...FALLBACK }
}

module.exports = {
  loadLprDisplay,
  getLprDisplay,
  EASTMONEY_URL,
  CHINAMONEY_URL
}
