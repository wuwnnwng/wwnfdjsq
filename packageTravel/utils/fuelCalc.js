/**
 * 汽车油耗 / 电耗：按行程反推百公里消耗，或按已知消耗估费用。
 */

function parseNumber(text) {
  const raw = String(text == null ? '' : text)
    .trim()
    .replace(/,/g, '')
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : NaN
}

function formatNumber(value, digits) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(digits == null ? 2 : digits)
}

function formatMoney(value) {
  return formatNumber(value, 2)
}

function unitsOf(kind) {
  if (kind === 'ev') {
    return {
      amount: '度',
      rate: '度/100km',
      consumeName: '电耗',
      amountName: '充电量',
      priceName: '电价',
      rateName: '百公里电耗'
    }
  }
  return {
    amount: '升',
    rate: 'L/100km',
    consumeName: '油耗',
    amountName: '加油量',
    priceName: '油价',
    rateName: '百公里油耗'
  }
}

function consumptionHint(kind, per100) {
  if (kind === 'ev') {
    if (per100 < 13) return '比较省电。常见纯电轿车多在 12–18 度/100km。'
    if (per100 <= 18) return '属于常见纯电家用水平。'
    return '电耗偏高，高速、低温和急加速都会更费电。'
  }
  if (per100 < 6) return '比较省油。常见家用燃油车多在 6–10 升/100km。'
  if (per100 <= 10) return '属于常见家用燃油车水平。'
  return '油耗偏高，路况、载重和驾驶习惯都会影响结果。'
}

function parsePrice(priceText, priceName) {
  const price = parseNumber(priceText)
  if (price === null) return { ok: true, hasPrice: false, price: null }
  if (!Number.isFinite(price)) {
    return { ok: false, message: `请输入有效${priceName}` }
  }
  if (price < 0) {
    return { ok: false, message: `${priceName}不能为负数` }
  }
  return { ok: true, hasPrice: true, price }
}

function calculateTrip({ kind, distanceText, amountText, priceText }) {
  const units = unitsOf(kind)
  const distance = parseNumber(distanceText)
  const amount = parseNumber(amountText)
  if (distance === null || amount === null) {
    return { valid: false, message: `请输入行驶里程和${units.amountName}` }
  }
  if (!Number.isFinite(distance) || !Number.isFinite(amount)) {
    return { valid: false, message: '请输入有效数字' }
  }
  if (distance <= 0) return { valid: false, message: '行驶里程须大于 0' }
  if (amount <= 0) return { valid: false, message: `${units.amountName}须大于 0` }
  const priced = parsePrice(priceText, units.priceName)
  if (!priced.ok) return { valid: false, message: priced.message }

  const per100 = (amount / distance) * 100
  const perKm = amount / distance
  const kmPerUnit = distance / amount
  const cost = priced.hasPrice ? amount * priced.price : null
  const rows = [
    { label: units.rateName, value: `${formatNumber(per100)} ${units.rate}` },
    { label: `每公里${units.consumeName}`, value: `${formatNumber(perKm, 3)} ${units.amount}/km` },
    { label: '每单位续航', value: `${formatNumber(kmPerUnit, 1)} km/${units.amount}` }
  ]
  if (priced.hasPrice) {
    rows.push(
      { label: '本次花费', value: `${formatMoney(cost)} 元` },
      { label: '百公里花费', value: `${formatMoney(per100 * priced.price)} 元` },
      { label: '每公里花费', value: `${formatMoney(cost / distance)} 元` }
    )
  }

  return {
    valid: true,
    formulaText: `${formatNumber(amount)} ${units.amount} ÷ ${formatNumber(distance)} 公里 × 100`,
    heroText: `${formatNumber(per100)} ${units.rate}`,
    subText: priced.hasPrice ? `本次花费 ${formatMoney(cost)} 元` : `每单位续航 ${formatNumber(kmPerUnit, 1)} 公里`,
    hint: consumptionHint(kind, per100),
    rows
  }
}

function calculatePlan({ kind, rateText, distanceText, priceText }) {
  const units = unitsOf(kind)
  const rate = parseNumber(rateText)
  const distance = parseNumber(distanceText)
  if (rate === null || distance === null) {
    return { valid: false, message: `请输入${units.rateName}和行驶里程` }
  }
  if (!Number.isFinite(rate) || !Number.isFinite(distance)) {
    return { valid: false, message: '请输入有效数字' }
  }
  if (rate <= 0) return { valid: false, message: `${units.rateName}须大于 0` }
  if (distance <= 0) return { valid: false, message: '行驶里程须大于 0' }
  const priced = parsePrice(priceText, units.priceName)
  if (!priced.ok) return { valid: false, message: priced.message }

  const amount = (rate / 100) * distance
  const cost = priced.hasPrice ? amount * priced.price : null
  const rows = [
    { label: `预计${units.amountName}`, value: `${formatNumber(amount)} ${units.amount}` },
    { label: units.rateName, value: `${formatNumber(rate)} ${units.rate}` },
    { label: '行驶里程', value: `${formatNumber(distance, 1)} 公里` }
  ]
  if (priced.hasPrice) {
    rows.push(
      { label: '预计花费', value: `${formatMoney(cost)} 元` },
      { label: '百公里花费', value: `${formatMoney(rate * priced.price)} 元` },
      { label: '每公里花费', value: `${formatMoney(cost / distance)} 元` }
    )
  }

  return {
    valid: true,
    formulaText: `${formatNumber(rate)} ${units.rate} × ${formatNumber(distance)} 公里`,
    heroText: priced.hasPrice ? `${formatMoney(cost)} 元` : `${formatNumber(amount)} ${units.amount}`,
    subText: priced.hasPrice
      ? `约需 ${formatNumber(amount)} ${units.amount}`
      : `按 ${formatNumber(rate)} ${units.rate} 估算`,
    hint: consumptionHint(kind, rate),
    rows
  }
}

function calculateFuel(input) {
  const kind = input && input.kind === 'ev' ? 'ev' : 'fuel'
  const mode = input && input.mode === 'plan' ? 'plan' : 'trip'
  if (mode === 'plan') return calculatePlan(Object.assign({}, input, { kind }))
  return calculateTrip(Object.assign({}, input, { kind }))
}

module.exports = {
  calculateFuel,
  calculateTrip,
  calculatePlan,
  unitsOf
}
