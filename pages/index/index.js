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
const {
  getThemeId,
  setThemeId,
  applyThemeChrome,
  THEME_LIST
} = require('../../utils/theme')
const {
  MAX_PLANS,
  NAME_MAX_LEN,
  listPlans,
  getPlan,
  renamePlan,
  removePlan
} = require('../../utils/plans')
const {
  shouldShowFavoriteTip,
  markFavoriteTipDismissed,
  getFavoriteTipLayout
} = require('../../utils/favoriteTip')

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
    showFavoriteTip: false,
    favoriteTipStyle: '',
    favoriteArrowStyle: '',
    showPlans: false,
    showRenamePlan: false,
    planList: [],
    planMaxCount: MAX_PLANS,
    planNameDraft: '',
    planNameMaxLen: NAME_MAX_LEN,
    renamePlanId: '',
    theme: getThemeId(),
    themeList: THEME_LIST,

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
    prepayAmountWan: '10',
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
    this.applyTheme(getThemeId())
    this.refreshLpr()
    this.maybeShowFavoriteTip()

    const now = new Date()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    this.setData(
      {
        firstRepaymentDate: `${now.getFullYear()}-${mm}-${dd}`
      },
      () => this.refreshDerived()
    )
  },

  onShow() {
    this.applyTheme(getThemeId())
    // 用户可能刚在菜单里添加了「我的小程序」，回来后不再展示
    this.maybeShowFavoriteTip()
  },

  async maybeShowFavoriteTip() {
    if (this._favoriteTipChecking) return
    this._favoriteTipChecking = true
    try {
      const show = await shouldShowFavoriteTip()
      if (!show) {
        if (this.data.showFavoriteTip) {
          this.setData({ showFavoriteTip: false })
        }
        return
      }
      this.setData({ showFavoriteTip: true }, () => {
        this.updateFavoriteTipLayout()
      })
    } finally {
      this._favoriteTipChecking = false
    }
  },

  updateFavoriteTipLayout() {
    this.setData(getFavoriteTipLayout())
  },

  onReady() {
    if (this.data.showFavoriteTip) {
      this.updateFavoriteTipLayout()
      setTimeout(() => this.updateFavoriteTipLayout(), 100)
    }
  },

  onHideFavoriteTip() {
    markFavoriteTipDismissed()
    this.setData({ showFavoriteTip: false })
  },

  applyTheme(themeId) {
    const theme = setThemeId(themeId)
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onThemeChange(e) {
    const theme = e.currentTarget.dataset.theme
    if (!theme || theme === this.data.theme) return
    this.applyTheme(theme)
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

  onShowPlans() {
    this.setData({
      showPlans: true,
      planList: listPlans()
    })
  },

  onHidePlans() {
    this.setData({ showPlans: false })
  },

  getPlanByEvent(e) {
    const id = e.currentTarget.dataset.id
    const plan = getPlan(id)
    if (!plan || !plan.input) {
      wx.showToast({ title: '方案不存在', icon: 'none' })
      return null
    }
    return plan
  },

  buildFormPatch(input) {
    if (input.mode === 'remaining') {
      const method = input.method || 'equalInterest'
      const hasMonthPrincipal =
        input.monthPrincipal !== undefined &&
        input.monthPrincipal !== null &&
        String(input.monthPrincipal) !== ''
      return {
        calcMode: 'remaining',
        method,
        originalYears: input.originalYears || '',
        firstRepaymentDate: input.firstRepaymentDate || '',
        manualAnnualRate: input.manualAnnualRate || '',
        hasManualRate: String(input.manualAnnualRate || '').trim() !== '',
        monthPrincipal: method === 'interestFirst'
          ? '0'
          : (hasMonthPrincipal ? String(input.monthPrincipal) : ''),
        monthInterest: input.monthInterest || '',
        remainingPrincipal: input.remainingPrincipal || '',
        earlyRepayment: !!input.earlyRepayment,
        prepayType: input.prepayType || 'full',
        prepayAmountWan: input.prepayAmountWan || '10',
        adjustMode: input.adjustMode || 'shorten'
      }
    }

    const method = input.method || 'equalInterest'
    const loanType = method === 'interestFirst'
      ? 'commercial'
      : (input.loanType || 'provident')
    return {
      calcMode: 'new',
      method,
      ...this.loanTypePatch(loanType),
      commercialAmount: input.commercialAmount || '',
      commercialYears: input.commercialYears || '',
      commercialRate: input.commercialRate || '',
      providentAmount: input.providentAmount || '',
      providentYears: input.providentYears || '',
      providentRate: input.providentRate || ''
    }
  },

  loanTypePatch(loanType) {
    return {
      loanType,
      showCommercial: loanType === 'commercial' || loanType === 'combo',
      showProvident: loanType === 'provident' || loanType === 'combo'
    }
  },

  applyPlanToForm(input, callback) {
    const patch = {
      showPlans: false,
      ...this.buildFormPatch(input)
    }
    this.setData(patch, () => {
      if (patch.calcMode === 'remaining') {
        this.refreshDerived()
      }
      if (typeof callback === 'function') callback()
    })
  },

  onSelectPlan(e) {
    const plan = this.getPlanByEvent(e)
    if (!plan) return
    this.applyPlanToForm(plan.input, () => {
      wx.showToast({ title: '已填入，可修改后开始计算', icon: 'none' })
    })
  },

  onEditPlan(e) {
    const plan = this.getPlanByEvent(e)
    if (!plan) return
    this.setData({
      showPlans: false,
      showRenamePlan: true,
      renamePlanId: plan.id,
      planNameDraft: plan.name
    })
  },

  onHideRenamePlan() {
    this.setData({
      showRenamePlan: false,
      showPlans: true,
      renamePlanId: '',
      planNameDraft: '',
      planList: listPlans()
    })
  },

  onPlanNameInput(e) {
    this.setData({
      planNameDraft: e.detail.value
    })
  },

  onConfirmRenamePlan() {
    const { ok, message, list } = renamePlan(this.data.renamePlanId, this.data.planNameDraft)
    if (!ok) {
      wx.showToast({ title: message || '保存失败', icon: 'none' })
      return
    }
    this.setData({
      showRenamePlan: false,
      showPlans: true,
      renamePlanId: '',
      planNameDraft: '',
      planList: list || listPlans()
    })
    wx.showToast({ title: '名称已更新', icon: 'success' })
  },

  onDeletePlan(e) {
    const plan = this.getPlanByEvent(e)
    if (!plan) return
    wx.showModal({
      title: '删除方案',
      content: `确定删除「${plan.name}」？`,
      confirmText: '删除',
      confirmColor: '#c45c26',
      success: (res) => {
        if (!res.confirm) return
        const { list } = removePlan(plan.id)
        this.setData({ planList: list || listPlans() })
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  },

  preventMove() {},

  onCalcModeChange(e) {
    const calcMode = e.currentTarget.dataset.mode
    const patch = { calcMode }

    if (calcMode === 'remaining' && this.data.method === 'interestFirst') {
      patch.monthPrincipal = '0'
    }

    this.setData(patch)
    if (calcMode === 'remaining') {
      this.refreshDerived()
    }
  },

  onLoanTypeChange(e) {
    const loanType = e.currentTarget.dataset.type
    if (this.data.method === 'interestFirst' && loanType !== 'commercial') {
      wx.showToast({ title: '先息后本仅支持商贷', icon: 'none' })
      return
    }
    this.setData(this.loanTypePatch(loanType))
  },

  onMethodChange(e) {
    const method = e.currentTarget.dataset.method
    const patch = { method }
    if (method === 'interestFirst') {
      Object.assign(patch, this.loanTypePatch('commercial'))
      if (this.data.calcMode === 'remaining') {
        patch.monthPrincipal = '0'
      }
    }
    this.setData(patch, () => {
      if (this.data.calcMode === 'remaining') {
        this.refreshDerived()
      }
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
    if (field === 'monthPrincipal' && this.data.method === 'interestFirst') {
      this.setData({ monthPrincipal: '0' })
      return
    }
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
      method: this.data.method,
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

    if (this.data.method === 'interestFirst' && loanType !== 'commercial') {
      wx.showToast({ title: '先息后本仅支持商贷', icon: 'none' })
      return false
    }

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
      method: this.data.method,
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

    const shareInput = {
      mode: 'new',
      loanType,
      method,
      commercialAmount,
      commercialYears,
      commercialRate,
      providentAmount,
      providentYears,
      providentRate
    }

    const result = calculateMortgage(shareInput)

    if (result.totalPrincipal <= 0) {
      wx.showToast({ title: '请输入有效贷款金额', icon: 'none' })
      return
    }

    result.shareInput = shareInput
    this.goResult(result)
  },

  calculateRemaining() {
    if (!this.validateRemainingLoan()) return

    const shareInput = {
      mode: 'remaining',
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
    }

    const { ok, result, message } = calculateRemainingMortgage(shareInput)

    if (!ok) {
      wx.showToast({ title: message || '计算失败', icon: 'none' })
      return
    }

    result.shareInput = shareInput
    this.goResult(result)
  },

  goResult(result) {
    wx.setStorageSync('mortgageResult', result)
    wx.navigateTo({
      url: '/pages/result/result'
    })
  }
})
