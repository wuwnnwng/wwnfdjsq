const {
  calculateMortgage,
  calculateRemainingMortgage
} = require('./mortgage')

const APP_BRAND = '小小便民工具箱'
const TOOL_NAV_BRAND = APP_BRAND
const TOOLS_HUB_PATH = '/pages/tools/index'
const TOOLS_HUB_TITLE = `更多实用工具｜${APP_BRAND}`

function buildToolNavTitle(name) {
  const title = String(name || '').trim()
  if (!title || title === TOOL_NAV_BRAND) return TOOL_NAV_BRAND
  const prefix = `${TOOL_NAV_BRAND}｜`
  const suffix = `｜${TOOL_NAV_BRAND}`
  if (title.endsWith(suffix)) return title
  if (title.indexOf(prefix) === 0) {
    const rest = title.slice(prefix.length).trim()
    return rest ? `${rest}${suffix}` : TOOL_NAV_BRAND
  }
  return `${title}${suffix}`
}

/**
 * 开启右上角「转发好友 / 分享朋友圈」菜单
 * 不开启 withShareTicket：当前并不读取群信息，打开后部分微信版本会出现「第一次点卡片进不去」。
 */
function enableShareMenu() {
  if (!wx.showShareMenu) return
  wx.showShareMenu({
    withShareTicket: false,
    menus: ['shareAppMessage', 'shareTimeline']
  })
}

const SHARE_ENTER_SCENES = [1007, 1008, 1036, 1044, 1073, 1074, 1096, 1154, 1155, 1167]
let consumedShareEnterKey = ''

function isShareEnterScene(scene) {
  return SHARE_ENTER_SCENES.indexOf(Number(scene)) >= 0
}

function getEnterOptions() {
  let enter = {}
  let launch = {}
  let appEnter = {}
  try {
    if (wx.getEnterOptionsSync) enter = wx.getEnterOptionsSync() || {}
  } catch (e) {}
  try {
    if (wx.getLaunchOptionsSync) launch = wx.getLaunchOptionsSync() || {}
  } catch (e) {}
  try {
    const app = getApp()
    if (app && app.globalData && app.globalData.enterOptions) appEnter = app.globalData.enterOptions
  } catch (e) {}

  const query = {}
  fillQuery(query, enter.query)
  fillQuery(query, launch.query)
  fillQuery(query, appEnter.query)

  return {
    path: enter.path || launch.path || appEnter.path || '',
    scene: enter.scene || launch.scene || appEnter.scene,
    query
  }
}

function fillQuery(target, source) {
  if (!source || typeof source !== 'object') return target
  Object.keys(source).forEach((key) => {
    if (target[key] == null || target[key] === '') target[key] = source[key]
  })
  return target
}

function resolvePageQuery(pageOptions) {
  const query = {}
  fillQuery(query, pageOptions)
  const enter = getEnterOptions()
  fillQuery(query, enter.query)
  return query
}

function normalizeRoute(path) {
  return String(path || '')
    .replace(/^\//, '')
    .split('?')[0]
}

function buildUrlFromEnter(path, query) {
  const route = normalizeRoute(path)
  if (!route) return ''
  const keys = query && typeof query === 'object' ? Object.keys(query) : []
  const qs = keys
    .filter((key) => query[key] != null && query[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`)
    .join('&')
  return qs ? `/${route}?${qs}` : `/${route}`
}

function shareEnterKey(enter) {
  return `${enter.scene || ''}|${normalizeRoute(enter.path)}|${JSON.stringify(enter.query || {})}`
}

function consumeShareEnter(currentRoute) {
  const enter = getEnterOptions()
  if (!isShareEnterScene(enter.scene)) return false
  const target = normalizeRoute(enter.path)
  if (!target || target === 'pages/index/index') return false
  if (normalizeRoute(currentRoute) === target) return false
  const key = shareEnterKey(enter)
  if (consumedShareEnterKey === key) return false
  const url = buildUrlFromEnter(enter.path, enter.query)
  if (!url) return false
  consumedShareEnterKey = key
  wx.reLaunch({ url })
  return true
}

function isShareLanding() {
  return isShareEnterScene(getEnterOptions().scene)
}

function safeDecodeURIComponent(value) {
  const text = String(value == null ? '' : value)
  try {
    return decodeURIComponent(text)
  } catch (e) {
    return text
  }
}

function parseJsonQueryValue(value) {
  if (value == null || value === '') return null
  let text = String(value).replace(/\+/g, ' ')
  for (let i = 0; i < 2; i += 1) {
    try {
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed === 'object') return parsed
    } catch (e) {}
    const decoded = safeDecodeURIComponent(text)
    if (decoded === text) break
    text = decoded
  }
  return null
}

function buildToolShareTitle(name) {
  const title = String(name || '').trim()
  if (!title) return APP_BRAND
  return `${title}｜${APP_BRAND}`
}

function buildToolShareAppMessage(path, name) {
  return {
    title: buildToolShareTitle(name),
    path
  }
}

function buildToolShareTimeline(path, name) {
  const queryIndex = path.indexOf('?')
  return {
    title: buildToolShareTitle(name),
    query: queryIndex >= 0 ? path.slice(queryIndex + 1) : ''
  }
}

function getToolsHubShareAppMessage() {
  return buildToolShareAppMessage(TOOLS_HUB_PATH, '更多实用工具')
}

function getToolsHubShareTimeline() {
  return buildToolShareTimeline(TOOLS_HUB_PATH, '更多实用工具')
}

function getConverterToolShare(type) {
  const toolType = type || 'length'
  if (toolType === 'currency') {
    const path = '/pages/tools/converter/converter?type=currency'
    return {
      appMessage: buildToolShareAppMessage(path, '汇率'),
      timeline: buildToolShareTimeline(path, '汇率')
    }
  }
  const path = `/pages/tools/converter/converter?type=${encodeURIComponent(toolType)}`
  return {
    appMessage: buildToolShareAppMessage(path, '单位换算'),
    timeline: buildToolShareTimeline(path, '单位换算')
  }
}

function getCalcToolShare() {
  const path = '/pages/tools/calc/calc'
  return {
    appMessage: buildToolShareAppMessage(path, '算术计算器'),
    timeline: buildToolShareTimeline(path, '算术计算器')
  }
}

function getBaseToolShare() {
  const path = '/pages/tools/base/base'
  return {
    appMessage: buildToolShareAppMessage(path, '进制换算'),
    timeline: buildToolShareTimeline(path, '进制换算')
  }
}

function getCalendarToolShare() {
  const path = '/pages/tools/calendar/calendar'
  return {
    appMessage: buildToolShareAppMessage(path, '我的日历'),
    timeline: buildToolShareTimeline(path, '我的日历')
  }
}

function getWeatherToolShare() {
  const path = '/pages/tools/weather/weather'
  return {
    appMessage: buildToolShareAppMessage(path, '天气'),
    timeline: buildToolShareTimeline(path, '天气')
  }
}

function getTaxToolShare() {
  const path = '/pages/tools/tax/tax'
  return {
    appMessage: buildToolShareAppMessage(path, '工资个税'),
    timeline: buildToolShareTimeline(path, '工资个税')
  }
}

function getHouseTaxToolShare() {
  const path = '/pages/tools/housetax/housetax'
  return {
    appMessage: buildToolShareAppMessage(path, '房产交易税'),
    timeline: buildToolShareTimeline(path, '房产交易税')
  }
}

function getFitoutToolShare() {
  const path = '/pages/tools/fitout/fitout'
  return {
    appMessage: buildToolShareAppMessage(path, '装修材料'),
    timeline: buildToolShareTimeline(path, '装修材料')
  }
}

function getDatetimeToolShare() {
  const path = '/pages/tools/datetime/datetime'
  return {
    appMessage: buildToolShareAppMessage(path, '日期时间'),
    timeline: buildToolShareTimeline(path, '日期时间')
  }
}

function getQrcodeToolShare() {
  const path = '/pages/tools/qrcode/qrcode'
  return {
    appMessage: buildToolShareAppMessage(path, '二维码'),
    timeline: buildToolShareTimeline(path, '二维码')
  }
}

function getAnniversaryToolShare() {
  const path = '/pages/tools/anniversary/anniversary'
  return {
    appMessage: buildToolShareAppMessage(path, '纪念日倒计时'),
    timeline: buildToolShareTimeline(path, '纪念日倒计时')
  }
}

function getRmbToolShare() {
  const path = '/pages/tools/rmb/rmb'
  return {
    appMessage: buildToolShareAppMessage(path, '人民币大写'),
    timeline: buildToolShareTimeline(path, '人民币大写')
  }
}

function getPercentToolShare() {
  const path = '/pages/tools/percent/percent'
  return {
    appMessage: buildToolShareAppMessage(path, '百分比'),
    timeline: buildToolShareTimeline(path, '百分比')
  }
}

function getAgeToolShare() {
  const path = '/pages/tools/age/age'
  return {
    appMessage: buildToolShareAppMessage(path, '年龄'),
    timeline: buildToolShareTimeline(path, '年龄')
  }
}

function getBmiToolShare() {
  const path = '/pages/tools/bmi/bmi'
  return {
    appMessage: buildToolShareAppMessage(path, 'BMI体重'),
    timeline: buildToolShareTimeline(path, 'BMI体重')
  }
}

function getCanvasToolShare() {
  const path = '/pages/tools/canvas/canvas'
  return {
    appMessage: buildToolShareAppMessage(path, '画布'),
    timeline: buildToolShareTimeline(path, '画布')
  }
}

function getPuzzleToolShare() {
  const path = '/pages/tools/puzzle/puzzle'
  return {
    appMessage: buildToolShareAppMessage(path, '拼图'),
    timeline: buildToolShareTimeline(path, '拼图')
  }
}

function getCompoundToolShare() {
  const path = '/pages/tools/compound/compound'
  return {
    appMessage: buildToolShareAppMessage(path, '复利计算器'),
    timeline: buildToolShareTimeline(path, '复利计算器')
  }
}

function getDueDateToolShare() {
  const path = '/pages/tools/duedate/duedate'
  return {
    appMessage: buildToolShareAppMessage(path, '预产期计算器'),
    timeline: buildToolShareTimeline(path, '预产期计算器')
  }
}

function getSafePeriodToolShare() {
  const path = '/pages/tools/safeperiod/safeperiod'
  return {
    appMessage: buildToolShareAppMessage(path, '安全期计算器'),
    timeline: buildToolShareTimeline(path, '安全期计算器')
  }
}

function getPensionToolShare() {
  const path = '/pages/tools/pension/pension'
  return {
    appMessage: buildToolShareAppMessage(path, '养老金估算'),
    timeline: buildToolShareTimeline(path, '养老金估算')
  }
}

function getRetireToolShare() {
  const path = '/pages/tools/retire/retire'
  return {
    appMessage: buildToolShareAppMessage(path, '退休年龄'),
    timeline: buildToolShareTimeline(path, '退休年龄')
  }
}

function getShareAppMessage() {
  return {
    title: `公积金、商贷、组合贷一键算清｜${APP_BRAND}`,
    path: '/pages/index/index'
  }
}

function getShareTimeline() {
  return {
    title: `公积金、商贷、组合贷一键算清｜${APP_BRAND}`,
    query: ''
  }
}

/**
 * 计算结果分享文案
 */
function buildResultShareTitle({
  loanTypeLabel,
  methodLabel,
  paymentLabel,
  summaryPayment
}) {
  const typePart = [loanTypeLabel, methodLabel].filter(Boolean).join('·')
  const payPart = [paymentLabel, summaryPayment ? `${summaryPayment} 元` : '']
    .filter(Boolean)
    .join(' ')
  if (typePart && payPart) return `${typePart}｜${payPart}`
  if (payPart) return `房贷计算结果｜${payPart}`
  return '查看我的计算结果｜小小便民工具箱'
}

/**
 * 压缩计算入参，分享打开后本地重算完整还款计划
 * 新贷款: {v:2,m:'n',...}
 * 已有贷款: {v:2,m:'r',...}
 */
function encodeShareInput(shareInput) {
  if (!shareInput || typeof shareInput !== 'object') return null
  try {
    let snap
    if (shareInput.mode === 'remaining') {
      snap = {
        v: 2,
        m: 'r',
        mt: shareInput.method || '',
        oy: shareInput.originalYears || '',
        fd: shareInput.firstRepaymentDate || '',
        ar: shareInput.manualAnnualRate || '',
        mp: shareInput.monthPrincipal || '',
        mi: shareInput.monthInterest || '',
        rp: shareInput.remainingPrincipal || '',
        er: shareInput.earlyRepayment ? 1 : 0,
        pt: shareInput.prepayType || 'full',
        paw: shareInput.prepayAmountWan || '',
        am: shareInput.adjustMode || 'shorten'
      }
    } else {
      snap = {
        v: 2,
        m: 'n',
        lt: shareInput.loanType || '',
        mt: shareInput.method || '',
        ca: shareInput.commercialAmount || '',
        cy: shareInput.commercialYears || '',
        cr: shareInput.commercialRate || '',
        pa: shareInput.providentAmount || '',
        py: shareInput.providentYears || '',
        pr: shareInput.providentRate || ''
      }
    }
    return `p=${encodeURIComponent(JSON.stringify(snap))}`
  } catch (e) {
    return null
  }
}

function parseShareInputQuery(query) {
  if (!query || !query.p) return null
  try {
    const snap = parseJsonQueryValue(query.p)
    if (!snap || snap.v !== 2) return null
    if (snap.m === 'r') {
      return {
        mode: 'remaining',
        method: snap.mt || '',
        originalYears: snap.oy || '',
        firstRepaymentDate: snap.fd || '',
        manualAnnualRate: snap.ar || '',
        monthPrincipal: snap.mp || '',
        monthInterest: snap.mi || '',
        remainingPrincipal: snap.rp || '',
        earlyRepayment: !!snap.er,
        prepayType: snap.pt || 'full',
        prepayAmountWan: snap.paw || '',
        adjustMode: snap.am || 'shorten'
      }
    }
    return {
      mode: 'new',
      loanType: snap.lt || '',
      method: snap.mt || '',
      commercialAmount: snap.ca || '',
      commercialYears: snap.cy || '',
      commercialRate: snap.cr || '',
      providentAmount: snap.pa || '',
      providentYears: snap.py || '',
      providentRate: snap.pr || ''
    }
  } catch (e) {
    return null
  }
}

function rebuildResultFromShareInput(input) {
  if (!input || typeof input !== 'object') return null
  try {
    if (input.mode === 'remaining') {
      const { ok, result } = calculateRemainingMortgage({
        method: input.method,
        originalYears: input.originalYears,
        firstRepaymentDate: input.firstRepaymentDate,
        manualAnnualRate: input.manualAnnualRate,
        monthPrincipal: input.monthPrincipal,
        monthInterest: input.monthInterest,
        remainingPrincipal: input.remainingPrincipal,
        earlyRepayment: !!input.earlyRepayment,
        prepayType: input.prepayType || 'full',
        prepayAmountWan: input.prepayAmountWan || '',
        adjustMode: input.adjustMode || 'shorten'
      })
      if (!ok || !result) return null
      result.shareInput = input
      return result
    }
    const result = calculateMortgage({
      loanType: input.loanType,
      method: input.method,
      commercialAmount: input.commercialAmount,
      commercialYears: input.commercialYears,
      commercialRate: input.commercialRate,
      providentAmount: input.providentAmount,
      providentYears: input.providentYears,
      providentRate: input.providentRate
    })
    if (!result || !result.totalPrincipal) return null
    result.shareInput = input
    return result
  } catch (e) {
    return null
  }
}

/**
 * 旧版摘要分享（兼容已发出的链接）
 */
function encodeResultShareQuery(view) {
  const paramQuery = encodeShareInput(view && view.shareInput)
  if (paramQuery) return paramQuery

  const snap = {
    v: 1,
    lt: view.loanTypeLabel || '',
    ml: view.methodLabel || '',
    pl: view.paymentLabel || '',
    sp: view.summaryPayment || '',
    mo: Number(view.months) || 0,
    ir: view.isRemaining ? 1 : 0,
    ie: view.isEarlyRepayment ? 1 : 0,
    if: view.isFullPrepay ? 1 : 0,
    ip: view.isPartialPrepay ? 1 : 0,
    tp: (view.display && view.display.totalPrincipal) || '',
    ti: (view.display && view.display.totalInterest) || '',
    tt: (view.display && view.display.totalPayment) || '',
    ar: (view.display && view.display.annualRate) || '',
    ry: (view.display && view.display.remainingYears) || '',
    md: (view.display && view.display.monthlyDecrease) || '',
    ea: (view.earlyInfo && view.earlyInfo.prepayAmount) || '',
    es: (view.earlyInfo && view.earlyInfo.interestSaved) || '',
    ey: (view.earlyInfo && view.earlyInfo.afterYears) || '',
    pc: Number(view.piePrincipal) || 0,
    pi: Number(view.pieInterest) || 0
  }

  try {
    return `s=${encodeURIComponent(JSON.stringify(snap))}`
  } catch (e) {
    return ''
  }
}

function parseResultShareQuery(query) {
  if (!query || !query.s) return null
  try {
    const snap = parseJsonQueryValue(query.s)
    if (!snap || snap.v !== 1) return null
    return {
      fromShare: true,
      loanTypeLabel: snap.lt || '计算结果',
      methodLabel: snap.ml || '',
      paymentLabel: snap.pl || '每月还款',
      summaryPayment: snap.sp || '0.00',
      months: Number(snap.mo) || 0,
      isRemaining: !!snap.ir,
      isEarlyRepayment: !!snap.ie,
      isFullPrepay: !!snap.if,
      isPartialPrepay: !!snap.ip,
      display: {
        totalPrincipal: snap.tp || '--',
        totalInterest: snap.ti || '--',
        totalPayment: snap.tt || '--',
        annualRate: snap.ar || '',
        remainingYears: snap.ry || '',
        monthlyDecrease: snap.md || ''
      },
      earlyInfo: {
        prepayAmount: snap.ea || '',
        interestSaved: snap.es || '',
        afterYears: snap.ey || '',
        typeLabel: '',
        adjustLabel: '',
        afterMonths: '',
        nextRepaymentDate: ''
      },
      piePrincipal: Number(snap.pc) || 0,
      pieInterest: Number(snap.pi) || 0
    }
  } catch (e) {
    return null
  }
}

function getResultShareAppMessage(view) {
  const query = encodeResultShareQuery(view)
  const path = query ? `/pages/result/result?${query}` : '/pages/index/index'
  return {
    title: buildResultShareTitle(view),
    path
  }
}

function getResultShareTimeline(view) {
  return {
    title: buildResultShareTitle(view),
    query: encodeResultShareQuery(view)
  }
}

function tipShareTimeline() {
  wx.showModal({
    title: '分享到朋友圈',
    content: '请点击右上角「···」，选择「分享到朋友圈」',
    showCancel: false,
    confirmText: '知道了'
  })
}

module.exports = {
  buildToolNavTitle,
  enableShareMenu,
  resolvePageQuery,
  consumeShareEnter,
  isShareLanding,
  getShareAppMessage,
  getShareTimeline,
  getToolsHubShareAppMessage,
  getToolsHubShareTimeline,
  getConverterToolShare,
  getCalcToolShare,
  getBaseToolShare,
  getCalendarToolShare,
  getWeatherToolShare,
  getTaxToolShare,
  getHouseTaxToolShare,
  getFitoutToolShare,
  getDatetimeToolShare,
  getQrcodeToolShare,
  getAnniversaryToolShare,
  getRmbToolShare,
  getPercentToolShare,
  getAgeToolShare,
  getBmiToolShare,
  getCanvasToolShare,
  getPuzzleToolShare,
  getCompoundToolShare,
  getDueDateToolShare,
  getSafePeriodToolShare,
  getPensionToolShare,
  getRetireToolShare,
  buildResultShareTitle,
  encodeShareInput,
  parseShareInputQuery,
  rebuildResultFromShareInput,
  encodeResultShareQuery,
  parseResultShareQuery,
  getResultShareAppMessage,
  getResultShareTimeline,
  tipShareTimeline
}
