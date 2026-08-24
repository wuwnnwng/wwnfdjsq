/**
 * BMI / 体重：中国成人标准（WS/T 428）
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
  return n.toFixed(digits == null ? 1 : digits)
}

const LEVELS = [
  { id: 'under', max: 18.5, name: '体重过低', hint: '可适当增加营养与力量训练' },
  { id: 'normal', max: 24, name: '体重正常', hint: '保持当前饮食和运动习惯' },
  { id: 'over', max: 28, name: '超重', hint: '建议控制饮食并增加有氧运动' },
  { id: 'obese', max: Infinity, name: '肥胖', hint: '建议咨询医生或营养师后再减重' }
]

function levelOf(bmi) {
  return LEVELS.find((item) => bmi < item.max) || LEVELS[LEVELS.length - 1]
}

function calculateBmi(heightText, weightText) {
  const heightCm = parseNumber(heightText)
  const weightKg = parseNumber(weightText)
  if (heightCm === null || weightKg === null) {
    return { valid: false, message: '请输入身高和体重' }
  }
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg)) {
    return { valid: false, message: '请输入有效数字' }
  }
  if (heightCm < 50 || heightCm > 250) {
    return { valid: false, message: '身高请输入 50–250 厘米' }
  }
  if (weightKg < 10 || weightKg > 400) {
    return { valid: false, message: '体重请输入 10–400 公斤' }
  }

  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  const level = levelOf(bmi)
  const minWeight = 18.5 * heightM * heightM
  const maxWeight = 23.9 * heightM * heightM
  const marker = Math.max(0, Math.min(100, ((bmi - 14) / (36 - 14)) * 100))

  return {
    valid: true,
    bmi,
    bmiText: formatNumber(bmi, 1),
    levelId: level.id,
    levelName: level.name,
    hint: level.hint,
    heightText: formatNumber(heightCm, heightCm % 1 ? 1 : 0),
    weightText: formatNumber(weightKg, weightKg % 1 ? 1 : 0),
    rangeText: `${formatNumber(minWeight, 1)} – ${formatNumber(maxWeight, 1)} 公斤`,
    minWeightText: formatNumber(minWeight, 1),
    maxWeightText: formatNumber(maxWeight, 1),
    markerPercent: Math.round(marker * 10) / 10
  }
}

module.exports = {
  calculateBmi
}
