/**
 * 复利：本金、年利率、年限、复利频率、每月追加
 */

const FREQUENCIES = [
  { key: 'yearly', name: '按年', times: 1 },
  { key: 'quarterly', name: '按季', times: 4 },
  { key: 'monthly', name: '按月', times: 12 },
  { key: 'daily', name: '按日', times: 365 }
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

function formatMoney(value, digits) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const places = digits == null ? 2 : digits
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const fixed = abs.toFixed(places)
  const parts = fixed.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return sign + parts.join('.')
}

function formatPercent(value, digits) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const text = n.toFixed(digits == null ? 2 : digits).replace(/\.?0+$/, '')
  return `${text}%`
}

function frequencyOf(key) {
  return FREQUENCIES.find((item) => item.key === key) || FREQUENCIES[2]
}

function calculateCompound({
  principalText,
  rateText,
  yearsText,
  frequencyKey,
  monthlyText
}) {
  const principal = parseNumber(principalText)
  const rate = parseNumber(rateText)
  const years = parseNumber(yearsText)
  const monthlyRaw = monthlyText == null || String(monthlyText).trim() === '' ? 0 : parseNumber(monthlyText)
  const freq = frequencyOf(frequencyKey)

  if (principal === null || rate === null || years === null) {
    return { valid: false, message: '请输入本金、年利率和年限' }
  }
  if (!Number.isFinite(principal) || !Number.isFinite(rate) || !Number.isFinite(years)) {
    return { valid: false, message: '请输入有效数字' }
  }
  if (principal < 0) return { valid: false, message: '本金不能为负数' }
  if (principal > 1e12) return { valid: false, message: '本金过大，请检查输入' }
  if (rate < 0 || rate > 100) return { valid: false, message: '年利率请输入 0–100' }
  if (years <= 0 || years > 80) return { valid: false, message: '年限请输入 0–80 年' }
  if (monthlyRaw === null || !Number.isFinite(monthlyRaw)) {
    return { valid: false, message: '每月追加请输入有效数字' }
  }
  if (monthlyRaw < 0) return { valid: false, message: '每月追加不能为负数' }
  if (monthlyRaw > 1e8) return { valid: false, message: '每月追加过大，请检查输入' }

  const times = freq.times
  const periods = Math.round(years * times)
  if (periods < 1) return { valid: false, message: '年限过短，请增加投资年限' }
  const ratePerPeriod = rate / 100 / times
  const depositPerPeriod = monthlyRaw * (12 / times)

  let balance = principal
  let contributed = principal
  const yearsRows = []
  const yearStep = times

  for (let i = 1; i <= periods; i += 1) {
    balance *= 1 + ratePerPeriod
    if (depositPerPeriod) {
      balance += depositPerPeriod
      contributed += depositPerPeriod
    }
    if (i % yearStep === 0 || i === periods) {
      const yearIndex = Math.ceil(i / yearStep)
      yearsRows.push({
        year: yearIndex,
        yearText: `第 ${yearIndex} 年`,
        balance,
        balanceText: formatMoney(balance),
        interest: balance - contributed,
        interestText: formatMoney(balance - contributed)
      })
    }
  }

  const interest = balance - contributed
  const multiple = contributed > 0 ? balance / contributed : 0
  const growthPct = contributed > 0 ? ((balance - contributed) / contributed) * 100 : 0

  return {
    valid: true,
    principal,
    rate,
    years,
    monthly: monthlyRaw,
    frequencyName: freq.name,
    finalAmount: balance,
    contributed,
    interest,
    multiple,
    heroText: formatMoney(balance),
    formulaText: `${formatMoney(principal)} 元 · ${formatPercent(rate)} · ${years} 年${monthlyRaw ? ` · 每月追加 ${formatMoney(monthlyRaw)}` : ''}`,
    interestText: formatMoney(interest),
    contributedText: formatMoney(contributed),
    principalText: formatMoney(principal),
    monthlyTotalText: formatMoney(contributed - principal),
    multipleText: `${multiple.toFixed(2)} 倍`,
    growthText: formatPercent(growthPct),
    yearsRows
  }
}

module.exports = {
  FREQUENCIES,
  formatMoney,
  formatPercent,
  calculateCompound
}
