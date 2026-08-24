/**
 * 人民币金额转中文大写（银行惯例，精确到分）
 */

const DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']

function parseAmount(text) {
  const raw = String(text == null ? '' : text)
    .trim()
    .replace(/,/g, '')
    .replace(/￥|¥|元/g, '')
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : NaN
}

function formatMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,')
}

function sectionToChinese(n) {
  const num = Number(n) || 0
  if (num <= 0) return ''
  const units = ['', '拾', '佰', '仟']
  let text = ''
  let pendingZero = false
  const padded = String(num).padStart(4, '0')
  for (let i = 0; i < 4; i += 1) {
    const digit = Number(padded[i])
    const unit = units[3 - i]
    if (digit === 0) {
      pendingZero = text.length > 0
    } else {
      if (pendingZero) text += '零'
      pendingZero = false
      text += DIGITS[digit] + unit
    }
  }
  return text
}

function integerToChinese(integer) {
  if (integer <= 0) return ''
  const yi = Math.floor(integer / 100000000)
  const wan = Math.floor((integer % 100000000) / 10000)
  const ge = integer % 10000
  let text = ''
  if (yi) text += sectionToChinese(yi) + '亿'
  if (wan) {
    if (yi && wan < 1000) text += '零'
    text += sectionToChinese(wan) + '万'
  } else if (yi && ge) {
    text += '零'
  }
  if (ge) {
    if (wan && ge < 1000) text += '零'
    text += sectionToChinese(ge)
  }
  return text
}

function toRmbUpper(input) {
  const amount = parseAmount(input)
  if (amount === null) {
    return { valid: false, message: '请输入金额' }
  }
  if (!Number.isFinite(amount)) {
    return { valid: false, message: '请输入有效金额' }
  }
  if (amount < 0) {
    return { valid: false, message: '金额不能为负数' }
  }
  if (amount > 9999999999999.99) {
    return { valid: false, message: '金额过大，请控制在万亿元以内' }
  }

  const totalFen = Math.round(amount * 100)
  const amountText = formatMoney(totalFen / 100)
  if (totalFen === 0) {
    return { valid: true, upper: '零元整', amountText }
  }

  const integer = Math.floor(totalFen / 100)
  const jiao = Math.floor((totalFen % 100) / 10)
  const fen = totalFen % 10
  let upper = integerToChinese(integer)
  if (integer) upper += '元'
  if (jiao === 0 && fen === 0) {
    upper += '整'
  } else {
    if (!integer) upper = ''
    if (jiao) {
      upper += DIGITS[jiao] + '角'
      if (fen) upper += DIGITS[fen] + '分'
    } else if (fen) {
      upper += (integer ? '零' : '') + DIGITS[fen] + '分'
    }
  }

  return { valid: true, upper, amountText }
}

module.exports = {
  parseAmount,
  formatMoney,
  toRmbUpper
}
