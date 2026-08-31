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
  { id: 'under', min: 0, max: 18.5, name: '体重过低', hint: '可适当增加营养与力量训练', color: '#60a5fa' },
  { id: 'normal', min: 18.5, max: 24, name: '体重正常', hint: '保持当前饮食和运动习惯', color: '#34d399' },
  { id: 'over', min: 24, max: 28, name: '超重', hint: '建议控制饮食并增加有氧运动', color: '#fbbf24' },
  { id: 'obese', min: 28, max: Infinity, name: '肥胖', hint: '建议咨询医生或营养师后再减重', color: '#f87171' }
]

/** 色条与指针共用刻度：14–36，与页面 flex 分段一致 */
const TRACK_MIN = 14
const TRACK_MAX = 36
const SCALE_TICKS = [18.5, 24, 28]

function levelOf(bmi) {
  return LEVELS.find((item) => bmi < item.max) || LEVELS[LEVELS.length - 1]
}

function trackFlex(item) {
  const start = Math.max(item.min, TRACK_MIN)
  const end = Math.min(item.max === Infinity ? TRACK_MAX : item.max, TRACK_MAX)
  return Math.max(0, end - start)
}

function markerPercentOf(bmi) {
  const pct = ((Number(bmi) - TRACK_MIN) / (TRACK_MAX - TRACK_MIN)) * 100
  return Math.round(Math.max(0, Math.min(100, pct)) * 10) / 10
}

function scaleTicksOf() {
  return SCALE_TICKS.map((value) => ({
    value,
    label: String(value),
    percent: markerPercentOf(value)
  }))
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
    markerPercent: markerPercentOf(bmi),
    scaleTicks: scaleTicksOf()
  }
}

module.exports = {
  LEVELS,
  TRACK_MIN,
  TRACK_MAX,
  trackFlex,
  calculateBmi,
  markerPercentOf
}
