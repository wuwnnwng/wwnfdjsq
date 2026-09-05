const { formatMoneyWithComma } = require('../../utils/mortgage')
const { renderPie } = require('../../utils/pie')
const {
  enableShareMenu,
  getResultShareAppMessage,
  getResultShareTimeline,
  parseShareInputQuery,
  parseResultShareQuery,
  rebuildResultFromShareInput,
  resolvePageQuery,
  isShareLanding
} = require('../../utils/share')
const { getThemeId, getTheme, applyThemeChrome } = require('../../utils/theme')
const {
  MAX_PLANS,
  NAME_MAX_LEN,
  defaultPlanName,
  isPlanLimitReached,
  savePlan
} = require('../../utils/plans')
const { exportResultToExcel, openExcelFile, shareExcelFile } = require('../../utils/excel')
const { createConfettiPieces } = require('../../utils/confetti')

const LOAN_TYPE_LABEL = {
  provident: '公积金贷',
  commercial: '商贷',
  combo: '组合贷款',
  remaining: '已有贷款 · 剩余计划'
}

const METHOD_LABEL = {
  equalInterest: '等额本息',
  equalPrincipal: '等额本金',
  interestFirst: '先息后本'
}

const PAYMENT_LABEL = {
  equalInterest: '每月还款',
  equalPrincipal: '首月还款',
  interestFirst: '每月利息'
}

const PREPAY_TYPE_LABEL = {
  full: '一次性提前还清',
  partial: '部分提前还款'
}

const ADJUST_MODE_LABEL = {
  shorten: '缩短年限，月供基本不变',
  reduce: '减少月供，年限不变'
}

function decorateSchedule(list) {
  return (list || []).map((item) => ({
    ...item,
    paymentText: formatMoneyWithComma(item.payment),
    principalText: formatMoneyWithComma(item.principal),
    interestText: formatMoneyWithComma(item.interest),
    remainingText: formatMoneyWithComma(item.remaining)
  }))
}

function roundYears(months) {
  const n = Number(months) || 0
  return (Math.round((n / 12) * 100) / 100).toFixed(2)
}

Page({
  data: {
    ready: false,
    theme: getThemeId(),
    mode: 'new',
    isRemaining: false,
    isEarlyRepayment: false,
    isFullPrepay: false,
    isPartialPrepay: false,
    isCombo: false,
    loanType: '',
    method: '',
    loanTypeLabel: '',
    methodLabel: '',
    paymentLabel: '每月还款',
    summaryPayment: '0.00',
    display: {},
    earlyInfo: {},
    months: 0,
    commercialFirst: '0.00',
    providentFirst: '0.00',
    showAllSchedule: false,
    showEarlyInfo: false,
    visibleSchedule: [],
    fullSchedule: [],
    showSplitTip: false,
    showSavePlanTip: false,
    showInterestPopup: false,
    interestPopup: {
      kicker: '🌸',
      title: '',
      amount: '',
      unit: '元',
      sub: '',
      confirm: '知道了'
    },
    confettiPieces: [],
    planNameDraft: '',
    planNameMaxLen: NAME_MAX_LEN,
    fromShare: false,
    canExport: false,
    splitDetail: {
      month: 0,
      providentPrincipal: '0.00',
      providentInterest: '0.00',
      commercialPrincipal: '0.00',
      commercialInterest: '0.00'
    }
  },

  onLoad(options) {
    enableShareMenu()
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    this.applyEnterResult(options)
  },

  applyEnterResult(pageOptions) {
    if (this.data.ready) return true
    const query = resolvePageQuery(pageOptions || {})

    const shareInput = parseShareInputQuery(query)
    if (shareInput) {
      const result = rebuildResultFromShareInput(shareInput)
      if (result) {
        this.applyLocalResult(result, { fromShare: true })
        return true
      }
    }

    const shared = parseResultShareQuery(query)
    if (shared) {
      this.applySharedResult(shared)
      return true
    }

    if (query.p || query.s || isShareLanding()) {
      this.setData({ ready: false })
      return false
    }

    const result = wx.getStorageSync('mortgageResult')
    if (!result || !result.totalPrincipal) {
      this.setData({ ready: false })
      return false
    }

    this.applyLocalResult(result, { fromShare: false })
    return true
  },

  applySharedResult(shared) {
    this.shareInput = null
    this.pieData = {
      principal: shared.piePrincipal,
      interest: shared.pieInterest
    }

    this.setData({
      ready: true,
      fromShare: true,
      mode: shared.isRemaining ? 'remaining' : 'new',
      isRemaining: shared.isRemaining,
      isEarlyRepayment: shared.isEarlyRepayment,
      isFullPrepay: shared.isFullPrepay,
      isPartialPrepay: shared.isPartialPrepay,
      isCombo: false,
      loanType: shared.isRemaining ? 'remaining' : 'shared',
      method: '',
      loanTypeLabel: shared.loanTypeLabel,
      methodLabel: shared.methodLabel,
      paymentLabel: shared.paymentLabel,
      summaryPayment: shared.summaryPayment,
      display: shared.display,
      earlyInfo: shared.earlyInfo,
      months: shared.months,
      commercialFirst: '0.00',
      providentFirst: '0.00',
      showAllSchedule: false,
      showEarlyInfo: false,
      fullSchedule: [],
      visibleSchedule: [],
      canExport: false
    }, () => this.drawPieIfReady())
    this.scheduleInterestPopup({
      isEarlyRepayment: !!shared.isEarlyRepayment,
      isRemaining: !!shared.isRemaining,
      display: shared.display || {},
      earlyInfo: shared.earlyInfo || {},
      loanTypeLabel: shared.loanTypeLabel,
      methodLabel: shared.methodLabel
    })
  },

  applyLocalResult(result, options = {}) {
    const fromShare = !!options.fromShare

    const fullSchedule = decorateSchedule(result.schedule)
    const isRemaining = result.mode === 'remaining' || result.loanType === 'remaining'
    const isCombo = result.loanType === 'combo'
    const early = result.earlyRepayment || null
    const isEarlyRepayment = !!(early && early.enabled)
    const isFullPrepay = isEarlyRepayment && early.prepayType === 'full'
    const isPartialPrepay = isEarlyRepayment && early.prepayType === 'partial'

    let paymentLabel = PAYMENT_LABEL[result.method] || '每月还款'
    let summaryPayment = (result.display && result.display.firstMonthPayment) || '0.00'
    let loanTypeLabel = LOAN_TYPE_LABEL[result.loanType] || ''

    if (isFullPrepay) {
      loanTypeLabel = '已有贷款 · 提前还清'
      paymentLabel = '结清应还'
      summaryPayment = (result.display && result.display.firstMonthPayment) || '0.00'
    } else if (isPartialPrepay) {
      loanTypeLabel = '已有贷款 · 提前还款'
      paymentLabel = '调整后月供'
      summaryPayment =
        (result.display && result.display.afterMonthlyPayment) ||
        formatMoneyWithComma(early.afterFirstMonthPayment || 0)
    }

    this.shareInput = result.shareInput || null
    this.rawResult = result
    this.pieData = {
      principal: result.totalPrincipal,
      interest: result.totalInterest
    }

    this.setData({
      ready: true,
      fromShare,
      mode: result.mode || 'new',
      isRemaining,
      isEarlyRepayment,
      isFullPrepay,
      isPartialPrepay,
      isCombo,
      loanType: result.loanType,
      method: result.method,
      loanTypeLabel,
      methodLabel: METHOD_LABEL[result.method] || '',
      paymentLabel,
      summaryPayment,
      display: result.display,
      earlyInfo: isEarlyRepayment
        ? {
            typeLabel: PREPAY_TYPE_LABEL[early.prepayType] || '',
            adjustLabel: ADJUST_MODE_LABEL[early.adjustMode] || '',
            prepayAmount: formatMoneyWithComma(early.prepayAmountYuan || 0),
            interestSaved: formatMoneyWithComma(early.interestSaved || 0),
            afterMonths: String(early.afterMonths || 0),
            afterYears: roundYears(early.afterMonths || 0),
            nextRepaymentDate: early.nextRepaymentDate || ''
          }
        : {},
      months: result.months,
      commercialFirst: formatMoneyWithComma(
        (result.commercial && result.commercial.firstMonthPayment) || 0
      ),
      providentFirst: formatMoneyWithComma(
        (result.provident && result.provident.firstMonthPayment) || 0
      ),
      showAllSchedule: false,
      fullSchedule,
      visibleSchedule: [],
      canExport: fullSchedule.length > 0
    }, () => this.drawPieIfReady())
    this.scheduleInterestPopup({
      isEarlyRepayment,
      isRemaining,
      display: result.display || {},
      earlyInfo: isEarlyRepayment
        ? {
            typeLabel: PREPAY_TYPE_LABEL[early.prepayType] || '',
            interestSaved: formatMoneyWithComma(early.interestSaved || 0)
          }
        : {},
      loanTypeLabel,
      methodLabel: METHOD_LABEL[result.method] || ''
    })
  },

  scheduleInterestPopup(view) {
    if (this._earlySavedTimer) {
      clearTimeout(this._earlySavedTimer)
      this._earlySavedTimer = null
    }
    const isEarly = !!view.isEarlyRepayment
    const isRemaining = !!view.isRemaining
    let popup
    if (isEarly) {
      popup = {
        kicker: '🎉',
        title: '提前还款预计节省',
        amount: (view.earlyInfo && view.earlyInfo.interestSaved) || '0.00',
        unit: '元利息',
        sub: (view.earlyInfo && view.earlyInfo.typeLabel) || '',
        confirm: '太好了'
      }
    } else if (isRemaining) {
      popup = {
        kicker: '🌸',
        title: '已有贷款剩余利息',
        amount: (view.display && view.display.totalInterest) || '0.00',
        unit: '元',
        sub: [view.loanTypeLabel, view.methodLabel].filter(Boolean).join(' · '),
        confirm: '知道了'
      }
    } else {
      popup = {
        kicker: '🌸',
        title: '新贷款支付利息',
        amount: (view.display && view.display.totalInterest) || '0.00',
        unit: '元',
        sub: [view.loanTypeLabel, view.methodLabel].filter(Boolean).join(' · '),
        confirm: '知道了'
      }
    }
    this._earlySavedTimer = setTimeout(() => {
      this._earlySavedTimer = null
      this.setData({
        showInterestPopup: true,
        interestPopup: popup,
        confettiPieces: createConfettiPieces({
          colors: isEarly
            ? ['#fbbf24', '#34d399', '#f59e0b', '#10b981', '#60a5fa', '#fb923c', '#facc15', '#4ade80']
            : ['#f472b6', '#fb7185', '#fbbf24', '#34d399', '#60a5fa', '#c084fc', '#fb923c', '#f9a8d4']
        })
      })
    }, 280)
  },

  onEarlySavedDialogTap() {},

  onCloseEarlySavedPopup() {
    this.setData({ showInterestPopup: false, confettiPieces: [] })
  },

  getShareView() {
    return {
      loanTypeLabel: this.data.loanTypeLabel,
      methodLabel: this.data.methodLabel,
      paymentLabel: this.data.paymentLabel,
      summaryPayment: this.data.summaryPayment,
      months: this.data.months,
      isRemaining: this.data.isRemaining,
      isEarlyRepayment: this.data.isEarlyRepayment,
      isFullPrepay: this.data.isFullPrepay,
      isPartialPrepay: this.data.isPartialPrepay,
      display: this.data.display || {},
      earlyInfo: this.data.earlyInfo || {},
      piePrincipal: (this.pieData && this.pieData.principal) || 0,
      pieInterest: (this.pieData && this.pieData.interest) || 0,
      shareInput: this.shareInput || null
    }
  },

  onShareAppMessage() {
    if (!this.data.ready) {
      return {
        title: '公积金、商贷、组合贷一键算清｜小小便民工具箱',
        path: '/pages/index/index'
      }
    }
    return getResultShareAppMessage(this.getShareView())
  },

  onShareTimeline() {
    if (!this.data.ready) {
      return {
        title: '公积金、商贷、组合贷一键算清｜小小便民工具箱',
        query: ''
      }
    }
    return getResultShareTimeline(this.getShareView())
  },

  onExportExcel() {
    const result = this.rawResult
    if (!result || !Array.isArray(result.schedule) || !result.schedule.length) {
      wx.showToast({ title: '暂无可导出的还款计划', icon: 'none' })
      return
    }

    wx.showLoading({ title: '正在导出', mask: true })
    exportResultToExcel({
      loanTypeLabel: this.data.loanTypeLabel,
      methodLabel: this.data.methodLabel,
      paymentLabel: this.data.paymentLabel,
      summaryPayment: this.data.summaryPayment,
      months: this.data.months,
      method: this.data.method,
      isRemaining: this.data.isRemaining,
      isCombo: this.data.isCombo,
      isEarlyRepayment: this.data.isEarlyRepayment,
      isFullPrepay: this.data.isFullPrepay,
      isPartialPrepay: this.data.isPartialPrepay,
      display: this.data.display || {},
      earlyInfo: this.data.earlyInfo || {},
      commercialFirst: this.data.commercialFirst,
      providentFirst: this.data.providentFirst,
      shareInput: this.shareInput || result.shareInput || null,
      schedule: result.schedule
    })
      .then((filePath) => {
        wx.hideLoading()
        wx.showActionSheet({
          itemList: ['打开文件并保存到手机', '发送到微信（可转存）'],
          success(res) {
            const opener = res.tapIndex === 1 ? shareExcelFile : openExcelFile
            opener(filePath).catch(() => {
              wx.showToast({ title: '文件已生成，打开失败请重试', icon: 'none' })
            })
          }
        })
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '导出失败，请稍后重试', icon: 'none' })
      })
  },

  onShowSavePlan() {
    if (!this.shareInput) {
      wx.showToast({ title: '当前结果无法保存', icon: 'none' })
      return
    }
    if (isPlanLimitReached()) {
      wx.showToast({ title: `最多保存 ${MAX_PLANS} 条方案，请先删除`, icon: 'none' })
      return
    }
    this.setData({
      showSavePlanTip: true,
      planNameDraft: defaultPlanName(this.shareInput)
    })
  },

  onHideSavePlan() {
    this.setData({ showSavePlanTip: false })
  },

  onPlanNameInput(e) {
    this.setData({
      planNameDraft: e.detail.value
    })
  },

  onConfirmSavePlan() {
    const { ok, message } = savePlan({
      name: this.data.planNameDraft,
      input: this.shareInput
    })
    if (!ok) {
      wx.showToast({ title: message || '保存失败', icon: 'none' })
      return
    }
    this.setData({ showSavePlanTip: false })
    wx.showToast({ title: '方案已保存', icon: 'success' })
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    if (!this.data.ready) this.applyEnterResult()
  },

  onReady() {
    this._pageReady = true
    this.drawPieIfReady()
  },

  drawPieIfReady() {
    if (!this._pageReady || !this.data.ready) return
    setTimeout(() => {
      if (!this.data.ready) return
      const theme = getTheme(this.data.theme)
      renderPie(this, 'pieCanvas', {
        ...(this.pieData || {}),
        principalColor: theme.principal,
        interestColor: theme.interest,
        holeColor: theme.dialog,
        inkColor: theme.ink
      })
    }, 50)
  },

  onToggleSchedule() {
    // 旧版摘要分享页：无完整计划
    if (this.data.fromShare && (!this.data.fullSchedule || !this.data.fullSchedule.length)) {
      wx.showToast({ title: '请重新分享以查看还款计划', icon: 'none' })
      return
    }

    const showAllSchedule = !this.data.showAllSchedule
    this.setData({
      showAllSchedule,
      visibleSchedule: showAllSchedule ? this.data.fullSchedule : []
    })
  },

  onToggleEarlyInfo() {
    this.setData({
      showEarlyInfo: !this.data.showEarlyInfo
    })
  },

  onInterestTap(e) {
    if (!this.data.isCombo) return

    const index = e.currentTarget.dataset.index
    const item = this.data.visibleSchedule[index]
    if (!item || !item.commercial || !item.provident) return

    this.setData({
      showSplitTip: true,
      splitDetail: {
        month: item.month,
        providentPrincipal: formatMoneyWithComma(item.provident.principal),
        providentInterest: formatMoneyWithComma(item.provident.interest),
        commercialPrincipal: formatMoneyWithComma(item.commercial.principal),
        commercialInterest: formatMoneyWithComma(item.commercial.interest)
      }
    })
  },

  onHideSplitTip() {
    this.setData({ showSplitTip: false })
  },

  preventMove() {},

  onUnload() {
    if (this._earlySavedTimer) {
      clearTimeout(this._earlySavedTimer)
      this._earlySavedTimer = null
    }
  },

  onRecalculate() {
    if (this.data.fromShare) {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({ url: '/pages/index/index' })
      }
    })
  }
})
