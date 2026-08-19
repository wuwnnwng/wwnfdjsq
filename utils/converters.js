/**
 * 单位换算与进制转换逻辑
 */

function round(value, digits) {
  if (!Number.isFinite(value)) return ''
  const factor = Math.pow(10, digits)
  return Math.round(value * factor) / factor
}

function formatNumber(value, digits) {
  if (value === '' || value === null || value === undefined) return ''
  if (!Number.isFinite(value)) return '无效'
  const rounded = round(value, digits)
  const text = String(rounded)
  if (text.indexOf('e') >= 0 || text.indexOf('E') >= 0) {
    return rounded.toPrecision(8).replace(/\.?0+$/, '')
  }
  return text
}

function parseInput(text) {
  if (text === '' || text === null || text === undefined) return null
  const value = Number(String(text).trim())
  return Number.isFinite(value) ? value : NaN
}

function convertLinear(value, fromFactor, toFactor) {
  if (!Number.isFinite(value)) return NaN
  return (value * fromFactor) / toFactor
}

function toCelsius(value, unit) {
  if (!Number.isFinite(value)) return NaN
  if (unit === 'c') return value
  if (unit === 'f') return ((value - 32) * 5) / 9
  if (unit === 'k') return value - 273.15
  return NaN
}

function fromCelsius(value, unit) {
  if (!Number.isFinite(value)) return NaN
  if (unit === 'c') return value
  if (unit === 'f') return (value * 9) / 5 + 32
  if (unit === 'k') return value + 273.15
  return NaN
}

const CONVERTER_TYPES = {
  currency: {
    title: '汇率换算',
    note: '汇率为参考值，实际交易以银行柜台为准',
    digits: 4,
    units: [
      { key: 'cny', label: '人民币 CNY', factor: 1 },
      { key: 'usd', label: '美元 USD', factor: 7.25 },
      { key: 'eur', label: '欧元 EUR', factor: 7.85 },
      { key: 'gbp', label: '英镑 GBP', factor: 9.15 },
      { key: 'jpy', label: '日元 JPY', factor: 0.048 },
      { key: 'hkd', label: '港币 HKD', factor: 0.93 },
      { key: 'krw', label: '韩元 KRW', factor: 0.0052 },
      { key: 'aud', label: '澳元 AUD', factor: 4.72 }
    ]
  },
  length: {
    title: '长度换算',
    digits: 6,
    units: [
      { key: 'mm', label: '毫米 mm', factor: 0.001 },
      { key: 'cm', label: '厘米 cm', factor: 0.01 },
      { key: 'm', label: '米 m', factor: 1 },
      { key: 'km', label: '千米 km', factor: 1000 },
      { key: 'inch', label: '英寸 in', factor: 0.0254 },
      { key: 'ft', label: '英尺 ft', factor: 0.3048 },
      { key: 'mile', label: '英里 mi', factor: 1609.344 },
      { key: 'chi', label: '市尺', factor: 1 / 3 },
      { key: 'li', label: '里', factor: 500 }
    ]
  },
  area: {
    title: '面积换算',
    digits: 6,
    units: [
      { key: 'mm2', label: '平方毫米', factor: 0.000001 },
      { key: 'cm2', label: '平方厘米', factor: 0.0001 },
      { key: 'm2', label: '平方米', factor: 1 },
      { key: 'km2', label: '平方千米', factor: 1000000 },
      { key: 'mu', label: '亩', factor: 666.6666667 },
      { key: 'ping', label: '坪', factor: 3.305785 },
      { key: 'ha', label: '公顷', factor: 10000 },
      { key: 'ft2', label: '平方英尺', factor: 0.092903 }
    ]
  },
  volume: {
    title: '体积换算',
    digits: 6,
    units: [
      { key: 'ml', label: '毫升 mL', factor: 0.001 },
      { key: 'l', label: '升 L', factor: 1 },
      { key: 'm3', label: '立方米 m³', factor: 1000 },
      { key: 'cm3', label: '立方厘米', factor: 0.001 },
      { key: 'floz', label: '液体盎司', factor: 0.0295735 },
      { key: 'cup', label: '杯', factor: 0.236588 },
      { key: 'gal', label: '加仑', factor: 3.78541 },
      { key: 'ft3', label: '立方英尺', factor: 28.3168 }
    ]
  },
  weight: {
    title: '重量换算',
    digits: 6,
    units: [
      { key: 'mg', label: '毫克 mg', factor: 0.000001 },
      { key: 'g', label: '克 g', factor: 0.001 },
      { key: 'kg', label: '千克 kg', factor: 1 },
      { key: 't', label: '吨 t', factor: 1000 },
      { key: 'jin', label: '市斤', factor: 0.5 },
      { key: 'liang', label: '两', factor: 0.05 },
      { key: 'lb', label: '磅 lb', factor: 0.453592 },
      { key: 'oz', label: '盎司 oz', factor: 0.0283495 }
    ]
  },
  temperature: {
    title: '温度换算',
    digits: 2,
    units: [
      { key: 'c', label: '摄氏度 ℃', factor: 1 },
      { key: 'f', label: '华氏度 ℉', factor: 1 },
      { key: 'k', label: '开尔文 K', factor: 1 }
    ]
  },
  speed: {
    title: '速度换算',
    digits: 6,
    units: [
      { key: 'mps', label: '米/秒 m/s', factor: 1 },
      { key: 'kmh', label: '千米/时 km/h', factor: 1 / 3.6 },
      { key: 'mph', label: '英里/时 mph', factor: 0.44704 },
      { key: 'knot', label: '节 kn', factor: 0.514444 },
      { key: 'fts', label: '英尺/秒 ft/s', factor: 0.3048 },
      { key: 'mach', label: '马赫（15℃）', factor: 340.3 }
    ]
  },
  pressure: {
    title: '压强换算',
    digits: 6,
    units: [
      { key: 'pa', label: '帕 Pa', factor: 1 },
      { key: 'kpa', label: '千帕 kPa', factor: 1000 },
      { key: 'mpa', label: '兆帕 MPa', factor: 1000000 },
      { key: 'bar', label: '巴 bar', factor: 100000 },
      { key: 'atm', label: '标准大气压', factor: 101325 },
      { key: 'mmhg', label: '毫米汞柱', factor: 133.322 },
      { key: 'psi', label: '磅/平方英寸', factor: 6894.76 }
    ]
  },
  power: {
    title: '功率换算',
    digits: 6,
    units: [
      { key: 'w', label: '瓦 W', factor: 1 },
      { key: 'kw', label: '千瓦 kW', factor: 1000 },
      { key: 'mw', label: '兆瓦 MW', factor: 1000000 },
      { key: 'hp', label: '英制马力 hp', factor: 745.7 },
      { key: 'ps', label: '公制马力 ps', factor: 735.5 },
      { key: 'j_s', label: '焦耳/秒 J/s', factor: 1 }
    ]
  }
}

function getConverterType(type) {
  return CONVERTER_TYPES[type] || null
}

function getUnit(type, key) {
  const config = getConverterType(type)
  if (!config) return null
  return config.units.find((item) => item.key === key) || config.units[0]
}

function convertValue(type, value, fromKey, toKey) {
  if (!Number.isFinite(value)) return NaN
  if (fromKey === toKey) return value

  if (type === 'temperature') {
    const celsius = toCelsius(value, fromKey)
    return fromCelsius(celsius, toKey)
  }

  const fromUnit = getUnit(type, fromKey)
  const toUnit = getUnit(type, toKey)
  if (!fromUnit || !toUnit) return NaN
  return convertLinear(value, fromUnit.factor, toUnit.factor)
}

function convertAll(type, value, fromKey) {
  const config = getConverterType(type)
  if (!config) return []
  return config.units.map((unit) => ({
    key: unit.key,
    label: unit.label,
    value: convertValue(type, value, fromKey, unit.key)
  }))
}

function sanitizeBaseInput(text, base) {
  const raw = String(text || '').trim()
  if (!raw) return ''
  if (base === 10) {
    return raw.replace(/[^\d.\-]/g, '')
  }
  if (base === 16) {
    return raw.replace(/[^0-9a-fA-F.\-]/g, '')
  }
  return raw.replace(/[^0-9.\-]/g, '')
}

function parseBaseNumber(text, base) {
  const raw = sanitizeBaseInput(text, base)
  if (!raw || raw === '-' || raw === '.') return null
  const value = parseInt(raw, base)
  if (!Number.isFinite(value)) return NaN
  return value
}

function convertBase(text, fromBase) {
  const value = parseBaseNumber(text, fromBase)
  if (value === null) {
    return {
      valid: true,
      empty: true,
      decimal: null,
      binary: '',
      octal: '',
      decimalText: '',
      hex: ''
    }
  }
  if (!Number.isFinite(value)) {
    return {
      valid: false,
      empty: false,
      decimal: null,
      binary: '无效',
      octal: '无效',
      decimalText: '无效',
      hex: '无效'
    }
  }

  const safe = Math.trunc(value)
  return {
    valid: true,
    empty: false,
    decimal: safe,
    binary: safe.toString(2),
    octal: safe.toString(8),
    decimalText: String(safe),
    hex: safe.toString(16).toUpperCase()
  }
}

function tokenizeExpression(expr) {
  const text = String(expr || '').replace(/\s+/g, '')
  if (!text) return []
  const tokens = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if ('+-*/%()'.indexOf(ch) >= 0) {
      tokens.push(ch)
      i += 1
      continue
    }
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i + 1
      while (j < text.length) {
        const next = text[j]
        if ((next >= '0' && next <= '9') || next === '.') {
          j += 1
        } else {
          break
        }
      }
      tokens.push(text.slice(i, j))
      i = j
      continue
    }
    return null
  }
  return tokens
}

function toRpn(tokens) {
  const output = []
  const ops = []
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 }
  let prev = 'start'

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (/^\d*\.?\d+$/.test(token)) {
      output.push(Number(token))
      prev = 'number'
      continue
    }
    if (token === '%') {
      if (prev !== 'number') return null
      output.push('%')
      prev = 'percent'
      continue
    }
    if (token === '(') {
      ops.push(token)
      prev = '('
      continue
    }
    if (token === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') {
        output.push(ops.pop())
      }
      if (!ops.length) return null
      ops.pop()
      prev = ')'
      continue
    }
    if (precedence[token]) {
      if (
        (token === '-' || token === '+') &&
        (prev === 'start' || prev === '(' || prev === 'operator' || prev === 'percent')
      ) {
        output.push(0)
      } else if (prev !== 'number' && prev !== ')' && prev !== 'percent') {
        return null
      }
      while (
        ops.length &&
        ops[ops.length - 1] !== '(' &&
        precedence[ops[ops.length - 1]] >= precedence[token]
      ) {
        output.push(ops.pop())
      }
      ops.push(token)
      prev = 'operator'
      continue
    }
    return null
  }

  while (ops.length) {
    const op = ops.pop()
    if (op === '(' || op === ')') return null
    output.push(op)
  }
  return output
}

function evalRpn(rpn) {
  const stack = []
  for (let i = 0; i < rpn.length; i += 1) {
    const token = rpn[i]
    if (typeof token === 'number') {
      stack.push(token)
      continue
    }
    if (token === '%') {
      const value = stack.pop()
      if (value === undefined) return NaN
      stack.push(value / 100)
      continue
    }
    const right = stack.pop()
    const left = stack.pop()
    if (left === undefined || right === undefined) return NaN
    if (token === '+') stack.push(left + right)
    else if (token === '-') stack.push(left - right)
    else if (token === '*') stack.push(left * right)
    else if (token === '/') stack.push(right === 0 ? NaN : left / right)
    else return NaN
  }
  if (stack.length !== 1) return NaN
  return stack[0]
}

function evaluateExpression(expr) {
  const text = String(expr || '').trim()
  if (!text) return { ok: true, value: '0', error: '' }
  if (!/^[0-9+\-*/%.()\s]+$/.test(text)) {
    return { ok: false, value: '', error: '包含不支持的符号' }
  }

  const tokens = tokenizeExpression(text)
  if (!tokens) {
    return { ok: false, value: '', error: '表达式有误' }
  }
  const rpn = toRpn(tokens)
  if (!rpn) {
    return { ok: false, value: '', error: '表达式有误' }
  }
  const value = evalRpn(rpn)
  if (!Number.isFinite(value)) {
    return { ok: false, value: '', error: '无法计算' }
  }
  const display = formatNumber(round(value, 10), 10)
  return { ok: true, value: display, error: '' }
}

module.exports = {
  CONVERTER_TYPES,
  getConverterType,
  getUnit,
  convertValue,
  convertAll,
  formatNumber,
  parseInput,
  sanitizeBaseInput,
  convertBase,
  evaluateExpression
}
