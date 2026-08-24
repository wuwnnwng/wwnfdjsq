/**
 * 百分比：求数值、求占比、增减幅
 */

function parseNumber(text) {
  const raw = String(text == null ? '' : text)
    .trim()
    .replace(/,/g, '')
    .replace(/%/g, '')
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : NaN
}

function formatNumber(value, digits) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  const max = digits == null ? 4 : digits
  const text = n.toFixed(max)
  if (max === 0) return text
  return text.replace(/\.?0+$/, '')
}

function formatPercent(value) {
  const text = formatNumber(value, 4)
  return text === '' ? '' : `${text}%`
}

function percentOf(baseText, percentText) {
  const base = parseNumber(baseText)
  const percent = parseNumber(percentText)
  if (base === null || percent === null) {
    return { valid: false, message: '请输入基数和百分比' }
  }
  if (!Number.isFinite(base) || !Number.isFinite(percent)) {
    return { valid: false, message: '请输入有效数字' }
  }
  const part = (base * percent) / 100
  const plus = base * (1 + percent / 100)
  const minus = base * (1 - percent / 100)
  return {
    valid: true,
    formulaText: `${formatNumber(base)} 的 ${formatPercent(percent)}`,
    valueText: formatNumber(part),
    plusText: formatNumber(plus),
    minusText: formatNumber(minus),
    percentText: formatPercent(percent)
  }
}

function isPercent(partText, wholeText) {
  const part = parseNumber(partText)
  const whole = parseNumber(wholeText)
  if (part === null || whole === null) {
    return { valid: false, message: '请输入部分值和整体值' }
  }
  if (!Number.isFinite(part) || !Number.isFinite(whole)) {
    return { valid: false, message: '请输入有效数字' }
  }
  if (whole === 0) {
    return { valid: false, message: '整体值不能为 0' }
  }
  const percent = (part / whole) * 100
  return {
    valid: true,
    formulaText: `${formatNumber(part)} 是 ${formatNumber(whole)} 的`,
    valueText: formatPercent(percent),
    restText: formatNumber(whole - part)
  }
}

function percentChange(fromText, toText) {
  const from = parseNumber(fromText)
  const to = parseNumber(toText)
  if (from === null || to === null) {
    return { valid: false, message: '请输入原值和新值' }
  }
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return { valid: false, message: '请输入有效数字' }
  }
  if (from === 0) {
    return { valid: false, message: '原值不能为 0' }
  }
  const delta = to - from
  const percent = (delta / Math.abs(from)) * 100
  const direction = delta > 0 ? '增加' : delta < 0 ? '减少' : '持平'
  return {
    valid: true,
    formulaText: `从 ${formatNumber(from)} 到 ${formatNumber(to)}`,
    valueText: delta === 0 ? '持平' : `${direction} ${formatPercent(Math.abs(percent))}`,
    deltaText: formatNumber(delta),
    percentText: formatPercent(percent)
  }
}

module.exports = {
  parseNumber,
  formatNumber,
  formatPercent,
  percentOf,
  isPercent,
  percentChange
}
