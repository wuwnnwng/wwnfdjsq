const STORAGE_KEY = 'mortgagePlans'
const MAX_PLANS = 6
const NAME_MAX_LEN = 20

const LOAN_TYPE_LABEL = {
  provident: '公积金贷',
  commercial: '商贷',
  combo: '组合贷款'
}

const METHOD_LABEL = {
  equalInterest: '等额本息',
  equalPrincipal: '等额本金',
  interestFirst: '先息后本'
}

function readPlans() {
  try {
    const list = wx.getStorageSync(STORAGE_KEY)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function writePlans(list) {
  wx.setStorageSync(STORAGE_KEY, list)
}

function createId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function defaultPlanName(input) {
  const now = new Date()
  const md = `${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
  if (!input || input.mode === 'remaining') {
    return `已有贷款 ${md}`
  }
  const type = LOAN_TYPE_LABEL[input.loanType] || '贷款'
  return `${type} ${md}`
}

function formatWanFromYuan(yuan) {
  const n = Number(yuan)
  if (!(n > 0)) return ''
  const wan = Math.round((n / 10000) * 100) / 100
  return `${wan}万`
}

function getPlanSummary(input) {
  if (!input || typeof input !== 'object') return ''
  const method = METHOD_LABEL[input.method] || ''
  if (input.mode === 'remaining') {
    const amount = formatWanFromYuan(input.remainingPrincipal)
    return ['已有贷款', method, amount ? `剩余${amount}` : '']
      .filter(Boolean)
      .join(' · ')
  }
  const type = LOAN_TYPE_LABEL[input.loanType] || ''
  let amount = ''
  if (input.loanType === 'combo') {
    const total = Number(input.commercialAmount || 0) + Number(input.providentAmount || 0)
    amount = total > 0 ? `${total}万` : ''
  } else if (input.loanType === 'commercial') {
    amount = Number(input.commercialAmount) > 0 ? `${input.commercialAmount}万` : ''
  } else if (Number(input.providentAmount) > 0) {
    amount = `${input.providentAmount}万`
  }
  return [type, method, amount].filter(Boolean).join(' · ')
}

function decoratePlan(plan) {
  return {
    ...plan,
    summary: getPlanSummary(plan.input)
  }
}

function listPlans() {
  return readPlans().map(decoratePlan)
}

function getPlan(id) {
  const plan = readPlans().find((item) => item.id === id)
  return plan ? decoratePlan(plan) : null
}

function isPlanLimitReached() {
  return readPlans().length >= MAX_PLANS
}

function normalizeName(name) {
  const text = String(name || '').trim()
  if (!text) return ''
  return text.slice(0, NAME_MAX_LEN)
}

function cloneInput(input) {
  try {
    return JSON.parse(JSON.stringify(input))
  } catch (e) {
    return null
  }
}

function savePlan({ name, input }) {
  const cloned = cloneInput(input)
  if (!cloned || typeof cloned !== 'object') {
    return { ok: false, message: '当前结果无法保存' }
  }
  const trimmed = normalizeName(name)
  if (!trimmed) {
    return { ok: false, message: '请填写方案名称' }
  }
  const list = readPlans()
  if (list.length >= MAX_PLANS) {
    return { ok: false, message: `最多保存 ${MAX_PLANS} 条方案` }
  }
  list.unshift({
    id: createId(),
    name: trimmed,
    createdAt: Date.now(),
    input: cloned
  })
  writePlans(list)
  return { ok: true, list: list.map(decoratePlan) }
}

function renamePlan(id, name) {
  const trimmed = normalizeName(name)
  if (!trimmed) {
    return { ok: false, message: '请填写方案名称' }
  }
  const list = readPlans()
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) {
    return { ok: false, message: '方案不存在' }
  }
  list[index] = {
    ...list[index],
    name: trimmed
  }
  writePlans(list)
  return { ok: true, list: list.map(decoratePlan) }
}

function removePlan(id) {
  const list = readPlans().filter((item) => item.id !== id)
  writePlans(list)
  return { ok: true, list: list.map(decoratePlan) }
}

module.exports = {
  MAX_PLANS,
  NAME_MAX_LEN,
  defaultPlanName,
  listPlans,
  getPlan,
  isPlanLimitReached,
  savePlan,
  renamePlan,
  removePlan
}
