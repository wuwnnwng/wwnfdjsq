/**
 * 银行存款利息：活期按日、整存整取按单利到期支取
 */

const TERMS = [
  { key: 'm3', name: '3个月', years: 0.25 },
  { key: 'm6', name: '6个月', years: 0.5 },
  { key: 'y1', name: '1年', years: 1 },
  { key: 'y2', name: '2年', years: 2 },
  { key: 'y3', name: '3年', years: 3 },
  { key: 'y5', name: '5年', years: 5 }
]

function parseNumber(text) {
  const raw = String(text == null ? '' : text)
    .trim()
    .replace(/,/g, '')
    .replace(/%/g, '')
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : NaN
}

function formatMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const parts = abs.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return sign + parts.join('.')
}

function termOf(key) {
  return TERMS.find((item) => item.key === key) || TERMS[2]
}

function calculateDeposit({
  kind,
  principalText,
  rateText,
  daysText,
  termKey
}) {
  const principal = parseNumber(principalText)
  const rate = parseNumber(rateText)
  const demand = kind === 'demand'
  const days = demand ? parseNumber(daysText) : null
  const term = termOf(termKey)

  if (principal === null || rate === null || (demand && days === null)) {
    return { valid: false, message: demand ? '请输入本金、年利率和天数' : '请输入本金和年利率' }
  }
  if (!Number.isFinite(principal) || !Number.isFinite(rate) || (demand && !Number.isFinite(days))) {
    return { valid: false, message: '请输入有效数字' }
  }
  if (principal <= 0) return { valid: false, message: '本金需要大于 0' }
  if (principal > 1e12) return { valid: false, message: '本金过大，请检查输入' }
  if (rate < 0 || rate > 100) return { valid: false, message: '年利率请输入 0–100' }
  if (demand && (days <= 0 || days > 36500)) return { valid: false, message: '天数请输入 1–36500' }

  const years = demand ? days / 360 : term.years
  const interest = principal * (rate / 100) * years
  const total = principal + interest
  const termText = demand ? `${days} 天` : term.name
  const formulaText = demand
    ? '利息 = 本金 × 年利率 × 天数 ÷ 360'
    : '利息 = 本金 × 年利率 × 存期'

  return {
    valid: true,
    demand,
    formulaText,
    termText,
    principalText: formatMoney(principal),
    rateText: String(rate),
    interestText: formatMoney(interest),
    totalText: formatMoney(total),
    heroText: formatMoney(total)
  }
}

module.exports = {
  TERMS,
  calculateDeposit
}
