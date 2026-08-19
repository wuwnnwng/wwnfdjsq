/**
 * 科学计算器表达式求值（四则运算 + 三角函数）
 */

function round(value, digits) {
  if (!Number.isFinite(value)) return NaN
  const factor = Math.pow(10, digits)
  return Math.round(value * factor) / factor
}

function formatNumber(value, digits) {
  if (!Number.isFinite(value)) return '无效'
  const rounded = round(value, digits)
  const text = String(rounded)
  if (text.indexOf('e') >= 0 || text.indexOf('E') >= 0) {
    return rounded.toPrecision(8).replace(/\.?0+$/, '')
  }
  return text
}

const FUNCTIONS = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan']
const CONSTANTS = {
  pi: Math.PI,
  e: Math.E
}

function toRadians(value, angleMode) {
  return angleMode === 'deg' ? (value * Math.PI) / 180 : value
}

function fromRadians(value, angleMode) {
  return angleMode === 'deg' ? (value * 180) / Math.PI : value
}

function applyFunction(name, arg, angleMode) {
  if (!Number.isFinite(arg)) return NaN
  if (name === 'sin') return Math.sin(toRadians(arg, angleMode))
  if (name === 'cos') return Math.cos(toRadians(arg, angleMode))
  if (name === 'tan') return Math.tan(toRadians(arg, angleMode))
  if (name === 'asin') return fromRadians(Math.asin(arg), angleMode)
  if (name === 'acos') return fromRadians(Math.acos(arg), angleMode)
  if (name === 'atan') return fromRadians(Math.atan(arg), angleMode)
  return NaN
}

function tokenizeExpression(expr) {
  const text = String(expr || '').replace(/\s+/g, '')
  if (!text) return []
  const tokens = []
  let i = 0

  while (i < text.length) {
    const ch = text[i]
    if ('+-*/%(),'.indexOf(ch) >= 0) {
      tokens.push(ch)
      i += 1
      continue
    }
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i + 1
      while (j < text.length) {
        const next = text[j]
        if ((next >= '0' && next <= '9') || next === '.') j += 1
        else break
      }
      tokens.push(text.slice(i, j))
      i = j
      continue
    }
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === 'π') {
      let j = i + 1
      while (j < text.length) {
        const next = text[j]
        if (
          (next >= 'a' && next <= 'z') ||
          (next >= 'A' && next <= 'Z')
        ) {
          j += 1
        } else {
          break
        }
      }
      const word = ch === 'π' ? 'pi' : text.slice(i, j).toLowerCase()
      tokens.push(word)
      i = ch === 'π' ? i + 1 : j
      continue
    }
    return null
  }
  return tokens
}

function isNumberToken(token) {
  return /^\d*\.?\d+$/.test(token)
}

function isConstantToken(token) {
  return Object.prototype.hasOwnProperty.call(CONSTANTS, token)
}

function isFunctionToken(token) {
  return FUNCTIONS.indexOf(token) >= 0
}

function toRpn(tokens) {
  const output = []
  const ops = []
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 }
  let prev = 'start'

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    const next = tokens[i + 1]

    if (isNumberToken(token)) {
      output.push(Number(token))
      prev = 'number'
      continue
    }

    if (isConstantToken(token)) {
      output.push(CONSTANTS[token])
      prev = 'number'
      continue
    }

    if (isFunctionToken(token)) {
      ops.push(token)
      prev = 'func'
      continue
    }

    if (token === '%') {
      if (prev !== 'number' && prev !== ')') return null
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
      if (ops.length && isFunctionToken(ops[ops.length - 1])) {
        output.push(ops.pop())
      }
      prev = ')'
      continue
    }

    if (precedence[token]) {
      if (
        (token === '-' || token === '+') &&
        (prev === 'start' || prev === '(' || prev === 'operator' || prev === 'func' || prev === 'percent')
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

function evalRpn(rpn, angleMode) {
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
    if (isFunctionToken(token)) {
      const arg = stack.pop()
      if (arg === undefined) return NaN
      stack.push(applyFunction(token, arg, angleMode))
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

function evaluateScientificExpression(expr, angleMode) {
  const text = String(expr || '').trim()
  if (!text) return { ok: true, value: '0', error: '' }
  if (!/^[0-9a-zA-Z+\-*/%.(),\sπ]+$/.test(text)) {
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
  const value = evalRpn(rpn, angleMode === 'rad' ? 'rad' : 'deg')
  if (!Number.isFinite(value)) {
    return { ok: false, value: '', error: '无法计算' }
  }
  return {
    ok: true,
    value: formatNumber(value, 10),
    error: ''
  }
}

module.exports = {
  evaluateScientificExpression
}
