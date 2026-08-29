/**
 * 养老金地区参数 —— 每年只改这个文件即可，计算页不用动。
 *
 * 每年更新：
 * 1) YEAR、EMPLOYEE_ACCOUNT_RATE、DEFAULT_RESIDENT_ACCOUNT_RATE
 * 2) 各省 averageWage（全口径月均，元）、basicPension（城乡居民基础养老金，元/月）
 * 3) 有新公布的居民账户年化、缴费补贴表时，改对应省份字段
 *
 * 字段说明：
 *   averageWage           职工/灵活就业用的社平工资，元/月
 *                         口径=该年度社保缴费所用全口径月均（通常是上一年统计数）
 *                         不要填当年统计公报里、要到下一年度才用于缴费的新工资
 *   wageYear              社保缴费年度（例如 2025 表示 2025 年度缴费所用）
 *   wageOfficial          true=已按人社缴费基数/全口径公布；false=估算
 *   basicPension          城乡居民基础养老金，元/月（同年省级最低/代表性标准，县市可能更高）
 *   residentAccountRate   可选，城乡居民个人账户记账利率（%）；缺省用文件顶部的默认值
 *   subsidies             可选，[{ fee, subsidy }] 年缴费档次与政府补贴；缺省用 DEFAULT_SUBSIDIES
 *
 * 职工账户年化全国统一，写在文件顶部。城乡居民账户年化由各省公布。
 */

const YEAR = 2025

/** 2025 年城镇职工基本养老保险个人账户记账利率，全国统一 */
const EMPLOYEE_ACCOUNT_RATE = 1.5

/** 未单独公布时的城乡居民账户记账利率缺省值 */
const DEFAULT_RESIDENT_ACCOUNT_RATE = 3

const DEFAULT_PROVINCE_ID = 'bj'

/** 多数省份通用的年缴费档次 / 政府补贴（元/年），各地不同请在省份上覆盖 */
const DEFAULT_SUBSIDIES = [
  { fee: 200, subsidy: 40 },
  { fee: 300, subsidy: 50 },
  { fee: 500, subsidy: 60 },
  { fee: 1000, subsidy: 80 },
  { fee: 2000, subsidy: 120 },
  { fee: 3000, subsidy: 160 },
  { fee: 5000, subsidy: 200 },
  { fee: 8000, subsidy: 200 }
]

const BEIJING_SUBSIDIES = [
  { fee: 1000, subsidy: 60 },
  { fee: 2000, subsidy: 90 },
  { fee: 4000, subsidy: 120 },
  { fee: 6000, subsidy: 150 },
  { fee: 9000, subsidy: 150 }
]

const SHANGHAI_SUBSIDIES = [
  { fee: 800, subsidy: 270 },
  { fee: 1300, subsidy: 400 },
  { fee: 1700, subsidy: 450 },
  { fee: 2300, subsidy: 525 },
  { fee: 3300, subsidy: 575 },
  { fee: 5300, subsidy: 675 },
  { fee: 7300, subsidy: 730 }
]

const PROVINCES = [
  {
    id: 'bj',
    name: '北京',
    averageWage: 11937,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 998,
    subsidies: BEIJING_SUBSIDIES
  },
  {
    id: 'tj',
    name: '天津',
    averageWage: 8540,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 347
  },
  {
    id: 'he',
    name: '河北',
    averageWage: 6678,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 143
  },
  {
    id: 'sx',
    name: '山西',
    averageWage: 6997,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 148
  },
  {
    id: 'nm',
    name: '内蒙古',
    averageWage: 8179,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 197
  },
  {
    id: 'ln',
    name: '辽宁',
    averageWage: 7265,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 174
  },
  {
    id: 'jl',
    name: '吉林',
    averageWage: 7322,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 145
  },
  {
    id: 'hl',
    name: '黑龙江',
    averageWage: 7570,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 163
  },
  {
    id: 'sh',
    name: '上海',
    averageWage: 12434,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 1555,
    subsidies: SHANGHAI_SUBSIDIES
  },
  {
    id: 'js',
    name: '江苏',
    averageWage: 8254,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 246
  },
  {
    id: 'zj',
    name: '浙江',
    averageWage: 8433,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 220
  },
  {
    id: 'ah',
    name: '安徽',
    averageWage: 7185,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 195,
    residentAccountRate: 3.59
  },
  {
    id: 'fj',
    name: '福建',
    averageWage: 7536,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 180,
    residentAccountRate: 3.16
  },
  {
    id: 'jx',
    name: '江西',
    averageWage: 6525,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 143
  },
  {
    id: 'sd',
    name: '山东',
    averageWage: 7506,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 188
  },
  {
    id: 'ha',
    name: '河南',
    averageWage: 6385,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 148
  },
  {
    id: 'hb',
    name: '湖北',
    averageWage: 7496,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 143
  },
  {
    id: 'hn',
    name: '湖南',
    averageWage: 6787,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 176
  },
  {
    id: 'gd',
    name: '广东',
    averageWage: 9183,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 220,
    residentAccountRate: 2.49
  },
  {
    id: 'gx',
    name: '广西',
    averageWage: 6905,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 143,
    residentAccountRate: 3.84
  },
  {
    id: 'hi',
    name: '海南',
    averageWage: 8188,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 271
  },
  {
    id: 'cq',
    name: '重庆',
    averageWage: 7339,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 165
  },
  {
    id: 'sc',
    name: '四川',
    averageWage: 7646,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 193
  },
  {
    id: 'gz',
    name: '贵州',
    averageWage: 7325,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 148
  },
  {
    id: 'yn',
    name: '云南',
    averageWage: 7263,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 143,
    residentAccountRate: 3.71
  },
  {
    id: 'xz',
    name: '西藏',
    averageWage: 11777,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 295
  },
  {
    id: 'sn',
    name: '陕西',
    averageWage: 7750,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 143
  },
  {
    id: 'gs',
    name: '甘肃',
    averageWage: 7338,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 173,
    residentAccountRate: 3.74
  },
  {
    id: 'qh',
    name: '青海',
    averageWage: 8816,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 205
  },
  {
    id: 'nx',
    name: '宁夏',
    averageWage: 8258,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 215
  },
  {
    id: 'xj',
    name: '新疆',
    averageWage: 8448,
    wageYear: 2025,
    wageOfficial: true,
    basicPension: 180
  }
]

const PROVINCE_NAMES = PROVINCES.map((item) => item.name)

const STORAGE_KEY = 'pension_region_id'

function getProvince(id) {
  return PROVINCES.find((item) => item.id === id) || PROVINCES[0]
}

function getProvinceIndex(id) {
  const index = PROVINCES.findIndex((item) => item.id === id)
  return index < 0 ? 0 : index
}

function subsidiesOf(region) {
  if (region && Array.isArray(region.subsidies) && region.subsidies.length) return region.subsidies
  return DEFAULT_SUBSIDIES
}

function residentRateOf(region) {
  if (region && region.residentAccountRate != null && Number.isFinite(Number(region.residentAccountRate))) {
    return Number(region.residentAccountRate)
  }
  return DEFAULT_RESIDENT_ACCOUNT_RATE
}

function subsidyOfFee(fee, grades) {
  const list = grades && grades.length ? grades : DEFAULT_SUBSIDIES
  let found = list[0]
  const value = Number(fee)
  list.forEach((item) => {
    if (Number.isFinite(value) && value >= item.fee) found = item
  })
  return found ? found.subsidy : 0
}

function gradesViewOf(subsidies) {
  return subsidiesOf({ subsidies }).map((item) => ({
    fee: item.fee,
    subsidy: item.subsidy,
    feeText: String(item.fee),
    label: String(item.fee)
  }))
}

function formatInt(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return '—'
  const sign = n < 0 ? '-' : ''
  return sign + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatRate(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (Math.abs(n - Math.round(n)) < 1e-8) return String(Math.round(n))
  return String(n)
}

function preferredFeeOf(list) {
  return (list.find((item) => item.fee === 2000) || list[Math.min(4, list.length - 1)]).fee
}

function nearestFeeOf(subsidies, currentFee) {
  const list = subsidiesOf({ subsidies })
  const fee = Number(currentFee)
  if (!Number.isFinite(fee) || fee <= 0) return preferredFeeOf(list)
  let best = list[0]
  let bestDiff = Infinity
  list.forEach((item) => {
    const diff = Math.abs(item.fee - fee)
    if (diff < bestDiff) {
      best = item
      bestDiff = diff
    }
  })
  return best.fee
}

function keepFeeOf(subsidies, currentFee) {
  const list = subsidiesOf({ subsidies })
  const fee = Number(currentFee)
  if (!Number.isFinite(fee) || fee <= 0) return preferredFeeOf(list)
  if (fee < list[0].fee) return list[0].fee
  return fee
}

function regionFill(region, type, current) {
  const item = region || getProvince(DEFAULT_PROVINCE_ID)
  if (type === 'resident') {
    const subsidies = subsidiesOf(item)
    const snapFee = !current || current.snapFee !== false
    const fee = snapFee
      ? nearestFeeOf(subsidies, current && current.annualFee)
      : keepFeeOf(subsidies, current && current.annualFee)
    const rate = residentRateOf(item)
    return {
      basicPension: String(item.basicPension),
      annualFee: String(fee),
      subsidy: String(subsidyOfFee(fee, subsidies)),
      returnRate: formatRate(rate),
      residentGrades: gradesViewOf(subsidies)
    }
  }
  return {
    average: String(item.averageWage),
    returnRate: formatRate(EMPLOYEE_ACCOUNT_RATE)
  }
}

function regionHintText(region, type) {
  const item = region || getProvince(DEFAULT_PROVINCE_ID)
  if (type === 'resident') {
    return `${item.name} · 基础养老金 ${formatInt(item.basicPension)} 元/月 · 年化 ${formatRate(residentRateOf(item))}%`
  }
  const year = item.wageYear || YEAR
  const tag = item.wageOfficial ? `${year}年全口径` : `${year}年估算`
  return `${item.name} · ${tag} ${formatInt(item.averageWage)} 元 · 年化 ${formatRate(EMPLOYEE_ACCOUNT_RATE)}%`
}

function readSavedRegionId() {
  try {
    const id = wx.getStorageSync(STORAGE_KEY)
    if (id && getProvince(id) && getProvince(id).id === id) return id
  } catch (e) {}
  return DEFAULT_PROVINCE_ID
}

function saveRegionId(id) {
  try {
    wx.setStorageSync(STORAGE_KEY, id || DEFAULT_PROVINCE_ID)
  } catch (e) {}
}

module.exports = {
  YEAR,
  EMPLOYEE_ACCOUNT_RATE,
  DEFAULT_RESIDENT_ACCOUNT_RATE,
  DEFAULT_PROVINCE_ID,
  DEFAULT_SUBSIDIES,
  PROVINCES,
  PROVINCE_NAMES,
  getProvince,
  getProvinceIndex,
  subsidiesOf,
  subsidyOfFee,
  gradesViewOf,
  regionFill,
  regionHintText,
  readSavedRegionId,
  saveRegionId
}
