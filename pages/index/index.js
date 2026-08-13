const {
  calculateMortgage,
  calculateRemainingMortgage,
  deriveRemainingLoanInfo
} = require('../../utils/mortgage')
const {
  enableShareMenu,
  getShareAppMessage,
  getShareTimeline
} = require('../../utils/share')
const { getLprDisplay, loadLprDisplay } = require('../../utils/lpr')

Page({
  data: {
    calcMode: 'new',
    loanType: 'provident',
    method: 'equalInterest',
    showCommercial: false,
    showProvident: true,
    showMethodTip: false,
    showRemainingTip: false,
    showLprTip: false,

    commercialAmount: '100',
    commercialYears: '30',
    commercialRate: '3.45',

    providentAmount: '50',
    providentYears: '30',
    providentRate: '2.85',

    originalYears: '30',
    firstRepaymentDate: '',
    manualAnnualRate: '',
    hasManualRate: false,
    monthPrincipal: '766.02',
    monthInterest: '706.66',
    remainingPrincipal: '325383.31',

    earlyRepayment: false,
    prepayType: 'full',
    prepayAmountWan: '',
    adjustMode: 'shorten',

    lpr: getLprDisplay(),
    lprLoading: false,
    lprError: '',

    derivedReady: false,
    derivedAnnualRate: '--',
    derivedRemainingYears: '--',
    derivedRemainingYearsText: '--',
    derivedRemainingMonths: '--',
    derivedMessage: ''
  },

  onLoad() {
    enableShareMenu()
    this.refreshLpr()
  },

  async refreshLpr() {
    this.setData({ lprLoading: true, lprError: '' })
    try {
      const lpr = await loadLprDisplay()
      this.setData({
        lpr: {
          oneYear: lpr.oneYear,
          fiveYear: lpr.fiveYear,
          publishedAt: lpr.publishedAt
        },
        lprLoading: false,
        lprError: lpr.source === 'fallback' ? '暂用本地兜底数据' : ''
      })
    } catch (e) {
      this.setData({
        lpr: getLprDisplay(),
        lprLoading: false,
        lprError: '查询失败，已显示缓存/兜底'
      })
    }
  },

  onShareAppMessage() {
    return getShareAppMessage()
  },

  onShareTimeline() {
    return getShareTimeline()
  },

  onShowMethodTip() {
    this.setData({ showMethodTip: true })
  },

  onHideMethodTip() {
    this.setData({ showMethodTip: false })
  },

  onShowRemainingTip() {
    this.setData({ showRemainingTip: true })
  },

  onHideRemainingTip() {
    this.setData({ showRemainingTip: false })
  },

  onShowLprTip() {
    this.setData({ showLprTip: true })
    this.refreshLpr()
  },

  onHideLprTip() {
    this.setData({ showLprTip: false })
  },

  preventMove() {},

  onCalcModeChange(e) {
    const calcMode = e.currentTarget.dataset.mode
    const patch = { calcMode }

    // 已有贷款不支持先息后本
    if (calcMode === 'remaining' && this.data.method === 'interestFirst') {
      patch.method = 'equalInterest'
    }

    this.setData(patch)
    if (calcMode === 'remaining') {
      this.refreshDerived()
    }
  },

  onLoanTypeChange(e) {
    const loanType = e.currentTarget.dataset.type
    this.setData({
      loanType,
      showCommercial: loanType === 'commercial' || loanType === 'combo',
      showProvident: loanType === 'provident' || loanType === 'combo'
    })
  },

  onMethodChange(e) {
    this.setData({
      method: e.currentTarget.dataset.method
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [field]: e.detail.value
    })
  },

  onRemainingInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    const patch = { [field]: value }

    if (field === 'manualAnnualRate') {
      patch.hasManualRate = String(value || '').trim() !== ''
    }

    this.setData(patch, () => this.refreshDerived())
  },

  onFirstDateChange(e) {
    this.setData(
      {
        firstRepaymentDate: e.detail.value
      },
      () => this.refreshDerived()
    )
  },

  onEarlyRepaymentToggle(e) {
    const enabled = e.currentTarget.dataset.enabled === '1' || e.currentTarget.dataset.enabled === 1
    this.setData({ earlyRepayment: !!enabled })
  },

  onPrepayTypeChange(e) {
    this.setData({
      prepayType: e.currentTarget.dataset.type
    })
  },

  onAdjustModeChange(e) {
    this.setData({
      adjustMode: e.currentTarget.dataset.mode
    })
  },

  onPrepayAmountInput(e) {
    // 仅保留数字，过滤小数点等
    const raw = String(e.detail.value || '')
    const digits = raw.replace(/\D/g, '')
    this.setData({ prepayAmountWan: digits })
  },

  refreshDerived() {
    const {
      originalYears,
      firstRepaymentDate,
      manualAnnualRate,
      monthPrincipal,
      monthInterest,
      remainingPrincipal
    } = this.data

    const hasManualRate = String(manualAnnualRate || '').trim() !== ''

    const hasAnyInput =
      originalYears ||
      firstRepaymentDate ||
      manualAnnualRate ||
      monthPrincipal ||
      monthInterest ||
      remainingPrincipal

    if (!hasAnyInput) {
      this.setData({
        hasManualRate,
        derivedReady: false,
        derivedAnnualRate: '--',
        derivedRemainingYears: '--',
        derivedRemainingYearsText: '--',
        derivedRemainingMonths: '--',
        derivedMessage: ''
      })
      return
    }

    const derived = deriveRemainingLoanInfo({
      originalYears,
      firstRepaymentDate,
      manualAnnualRate,
      monthPrincipal,
      monthInterest,
      remainingPrincipal
    })

    if (!derived.ok) {
      this.setData({
        hasManualRate,
        derivedReady: false,
        derivedAnnualRate: '--',
        derivedRemainingYears: '--',
        derivedRemainingYearsText: '--',
        derivedRemainingMonths: '--',
        derivedMessage: derived.message
      })
      return
    }

    this.setData({
      hasManualRate,
      derivedReady: true,
      derivedAnnualRate: derived.annualRateDisplay,
      derivedRemainingYears: derived.remainingYearsDisplay,
      derivedRemainingYearsText: derived.remainingYearsText,
      derivedRemainingMonths: String(derived.remainingMonths),
      derivedMessage: ''
    })
  },

  isValidYears(years) {
    const n = Number(years)
    return Number.isInteger(n) && n >= 1 && n <= 30
  },

  validateNewLoan() {
    const {
      loanType,
      commercialAmount,
      commercialYears,
      commercialRate,
      providentAmount,
      providentYears,
      providentRate
    } = this.data

    const needCommercial = loanType === 'commercial' || loanType === 'combo'
    const needProvident = loanType === 'provident' || loanType === 'combo'

    if (needCommercial) {
      if (!(Number(commercialAmount) > 0)) {
        wx.showToast({ title: '请填写商贷金额', icon: 'none' })
        return false
      }
      if (!this.isValidYears(commercialYears)) {
        wx.showToast({ title: '商贷年限请填 1-30 的整数', icon: 'none' })
        return false
      }
      if (!(Number(commercialRate) >= 0)) {
        wx.showToast({ title: '请填写商贷利率', icon: 'none' })
        return false
      }
    }

    if (needProvident) {
      if (!(Number(providentAmount) > 0)) {
        wx.showToast({ title: '请填写公积金金额', icon: 'none' })
        return false
      }
      if (!this.isValidYears(providentYears)) {
        wx.showToast({ title: '公积金年限请填 1-30 的整数', icon: 'none' })
        return false
      }
      if (!(Number(providentRate) >= 0)) {
        wx.showToast({ title: '请填写公积金利率', icon: 'none' })
        return false
      }
    }

    return true
  },

  validateRemainingLoan() {
    const derived = deriveRemainingLoanInfo({
      originalYears: this.data.originalYears,
      firstRepaymentDate: this.data.firstRepaymentDate,
      manualAnnualRate: this.data.manualAnnualRate,
      monthPrincipal: this.data.monthPrincipal,
      monthInterest: this.data.monthInterest,
      remainingPrincipal: this.data.remainingPrincipal
    })

    if (!derived.ok) {
      wx.showToast({ title: derived.message, icon: 'none' })
      return false
    }

    if (this.data.earlyRepayment && this.data.prepayType === 'partial') {
      const wan = Number(this.data.prepayAmountWan)
      if (!Number.isInteger(wan) || wan < 1) {
        wx.showToast({ title: '部分还款金额请填正整数（万元）', icon: 'none' })
        return false
      }
      if (wan * 10000 >= derived.remainingPrincipal) {
        wx.showToast({ title: '部分还款须小于剩余本金', icon: 'none' })
        return false
      }
    }

    return true
  },

  onCalculate() {
    if (this.data.calcMode === 'remaining') {
      this.calculateRemaining()
      return
    }

    if (!this.validateNewLoan()) return

    const {
      loanType,
      method,
      commercialAmount,
      commercialYears,
      commercialRate,
      providentAmount,
      providentYears,
      providentRate
    } = this.data

    const result = calculateMortgage({
      loanType,
      method,
      commercialAmount,
      commercialYears,
      commercialRate,
      providentAmount,
      providentYears,
      providentRate
    })

    if (result.totalPrincipal <= 0) {
      wx.showToast({ title: '请输入有效贷款金额', icon: 'none' })
      return
    }

    this.goResult(result)
  },

  calculateRemaining() {
    if (!this.validateRemainingLoan()) return

    if (this.data.method === 'interestFirst') {
      wx.showToast({ title: '已有贷款暂不支持先息后本', icon: 'none' })
      return
    }

    const { ok, result, message } = calculateRemainingMortgage({
      method: this.data.method,
      originalYears: this.data.originalYears,
      firstRepaymentDate: this.data.firstRepaymentDate,
      manualAnnualRate: this.data.manualAnnualRate,
      monthPrincipal: this.data.monthPrincipal,
      monthInterest: this.data.monthInterest,
      remainingPrincipal: this.data.remainingPrincipal,
      earlyRepayment: this.data.earlyRepayment,
      prepayType: this.data.prepayType,
      prepayAmountWan: this.data.prepayAmountWan,
      adjustMode: this.data.adjustMode
    })

    if (!ok) {
      wx.showToast({ title: message || '计算失败', icon: 'none' })
      return
    }

    this.goResult(result)
  },

  goResult(result) {
    wx.setStorageSync('mortgageResult', result)
    wx.navigateTo({
      url: '/pages/result/result'
    })
  }
})
