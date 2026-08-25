/**
 * 个人住房交易税费测算
 * 契税：财政部 税务总局 住房城乡建设部公告 2024 年第 16 号（2024-12-01 起）
 * 增值税：财政部 税务总局公告 2025 年第 17 号（2026-01-01 起，不满 2 年按 3% 全额）
 * 印花税：个人销售或购买住房暂免（财政部 税务总局公告 2024 年第 3 号）
 * 土地增值税：个人销售住房暂免
 * 个人所得税：满五唯一免征；否则核定按转让收入 1%，核实按差价 20%
 */

const DEED_AREA_THRESHOLD = 140
const VAT_RATE = 0.03
const SURCHARGE_RATE = 0.12
const PIT_ASSESSED_RATE = 0.01
const PIT_VERIFIED_RATE = 0.2
const DEED_THIRD_RATE = 0.03

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return NaN
  const n = Number(String(value).trim())
  return Number.isFinite(n) ? n : NaN
}

function round2(value) {
  if (!Number.isFinite(value)) return NaN
  return Math.round(value * 100) / 100
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return '—'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const parts = abs.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${parts[0]}.${parts[1]}`
}

function formatRate(rate) {
  if (!Number.isFinite(rate)) return '—'
  const pct = round2(rate * 100)
  return `${pct}%`
}

function wanToYuan(wan) {
  return round2(wan * 10000)
}

function deedRate(homeSet, area) {
  const over = Number(area) > DEED_AREA_THRESHOLD
  if (homeSet === 'first') return over ? 0.015 : 0.01
  if (homeSet === 'second') return over ? 0.02 : 0.01
  return DEED_THIRD_RATE
}

function deedRateLabel(homeSet, area) {
  const over = Number(area) > DEED_AREA_THRESHOLD
  if (homeSet === 'first') return over ? '家庭唯一住房且面积超过 140 ㎡' : '家庭唯一住房且面积 140 ㎡及以下'
  if (homeSet === 'second') return over ? '家庭第二套住房且面积超过 140 ㎡' : '家庭第二套住房且面积 140 ㎡及以下'
  return '第三套及以上，按法定税率 3% 测算'
}

function calculateBuyerTax(input) {
  const priceWan = toNumber(input.priceWan)
  const area = toNumber(input.area)
  const homeSet = input.homeSet || 'first'
  if (!Number.isFinite(priceWan) || priceWan <= 0) {
    return { valid: false, message: '请输入成交总价' }
  }
  if (!Number.isFinite(area) || area <= 0) {
    return { valid: false, message: '请输入建筑面积' }
  }

  const price = wanToYuan(priceWan)
  const rate = deedRate(homeSet, area)
  const deedTax = round2(price * rate)
  const stampTax = 0
  const total = round2(deedTax + stampTax)

  return {
    valid: true,
    message: '',
    role: 'buy',
    price,
    area: round2(area),
    homeSet,
    deedRate: rate,
    deedRateText: formatRate(rate),
    deedRuleText: deedRateLabel(homeSet, area),
    deedTax,
    deedTaxText: formatMoney(deedTax),
    stampTax,
    stampTaxText: '暂免',
    vat: 0,
    vatText: '买方不缴',
    incomeTax: 0,
    incomeTaxText: '买方不缴',
    total,
    totalText: formatMoney(total),
    totalRateText: formatRate(price > 0 ? total / price : 0)
  }
}

function calculateSellerTax(input) {
  const priceWan = toNumber(input.priceWan)
  const originalWan = toNumber(input.originalWan)
  const hold = input.hold || 'over5'
  const onlyHome = input.onlyHome === true || input.onlyHome === 'yes'
  const pitMethod = input.pitMethod === 'verified' ? 'verified' : 'assessed'
  if (!Number.isFinite(priceWan) || priceWan <= 0) {
    return { valid: false, message: '请输入成交总价' }
  }
  if (pitMethod === 'verified' && !(hold === 'over5' && onlyHome)) {
    if (!Number.isFinite(originalWan) || originalWan < 0) {
      return { valid: false, message: '核实征收请填写房屋原值' }
    }
  }

  const price = wanToYuan(priceWan)
  const original = Number.isFinite(originalWan) ? wanToYuan(originalWan) : 0
  const vatDue = hold === 'under2'
  const vat = vatDue ? round2(price * VAT_RATE) : 0
  const surcharge = vatDue ? round2(vat * SURCHARGE_RATE) : 0
  const fiveUnique = hold === 'over5' && onlyHome
  let incomeTax = 0
  let incomeTaxRule = ''
  if (fiveUnique) {
    incomeTax = 0
    incomeTaxRule = '满五唯一，免征个人所得税'
  } else if (pitMethod === 'verified') {
    const taxable = round2(Math.max(0, price - original - vat - surcharge))
    incomeTax = round2(taxable * PIT_VERIFIED_RATE)
    incomeTaxRule = '核实征收：差价扣除增值税及附加后按 20%'
  } else {
    incomeTax = round2(price * PIT_ASSESSED_RATE)
    incomeTaxRule = '核定征收：按转让收入 1%'
  }

  const stampTax = 0
  const landVat = 0
  const total = round2(vat + surcharge + incomeTax + stampTax + landVat)

  return {
    valid: true,
    message: '',
    role: 'sell',
    price,
    original,
    hold,
    onlyHome,
    pitMethod,
    fiveUnique,
    vatDue,
    vatRateText: vatDue ? formatRate(VAT_RATE) : '免征',
    vat,
    vatText: vatDue ? formatMoney(vat) : '免征',
    surcharge,
    surchargeText: vatDue ? formatMoney(surcharge) : '免征',
    surchargeRateText: formatRate(SURCHARGE_RATE),
    incomeTax,
    incomeTaxText: fiveUnique ? '免征' : formatMoney(incomeTax),
    incomeTaxRule,
    stampTax,
    stampTaxText: '暂免',
    landVat,
    landVatText: '暂免',
    total,
    totalText: formatMoney(total),
    totalRateText: formatRate(price > 0 ? total / price : 0)
  }
}

function calculateHouseTax(input) {
  if (input && input.role === 'sell') return calculateSellerTax(input)
  return calculateBuyerTax(input)
}

module.exports = {
  DEED_AREA_THRESHOLD,
  VAT_RATE,
  formatMoney,
  calculateBuyerTax,
  calculateSellerTax,
  calculateHouseTax
}
