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

Page({
  data: {
    calcMode: 'new',
    loanType: 'provident',
    method: 'equalInterest',
    showCommercial: false,
    showProvident: true,
    showMethodTip: false,
    showRemainingTip: false,

    commercialAmount: '100',
    commercialYears: '30',
    commercialRate: '3.45',

    providentAmount: '50',
    providentYears: '30',
    providentRate: '2.85',

    originalYears: '30',
    firstRepaymentDate: '',
    monthPrincipal: '766.02',
    monthInterest: '706.66',
    remainingPrincipal: '325383.31',

    derivedReady: false,
    derivedAnnualRate: '--',
    derivedRemainingYears: '--',
    derivedRemainingYearsText: '--',
    derivedRemainingMonths: '--',
    derivedMessage: ''
  },

  onLoad() {
    enableShareMenu()
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
    this.setData(
      {
        [field]: e.detail.value
      },
      () => this.refreshDerived()
    )
  },

  onFirstDateChange(e) {
    this.setData(
      {
        firstRepaymentDate: e.detail.value
      },
      () => this.refreshDerived()
    )
  },

  refreshDerived() {
    const {
      originalYears,
      firstRepaymentDate,
      monthPrincipal,
      monthInterest,
      remainingPrincipal
    } = this.data

    const hasAnyInput =
      originalYears ||
      firstRepaymentDate ||
      monthPrincipal ||
      monthInterest ||
      remainingPrincipal

    if (!hasAnyInput) {
      this.setData({
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
      monthPrincipal,
      monthInterest,
      remainingPrincipal
    })

    if (!derived.ok) {
      this.setData({
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
      monthPrincipal: this.data.monthPrincipal,
      monthInterest: this.data.monthInterest,
      remainingPrincipal: this.data.remainingPrincipal
    })

    if (!derived.ok) {
      wx.showToast({ title: derived.message, icon: 'none' })
      return false
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
      monthPrincipal: this.data.monthPrincipal,
      monthInterest: this.data.monthInterest,
      remainingPrincipal: this.data.remainingPrincipal
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
