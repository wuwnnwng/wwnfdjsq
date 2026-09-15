const {
  SEX_OPTIONS,
  ACTIVITY_OPTIONS,
  DEFICIT_OPTIONS,
  STYLE_OPTIONS,
  MEAL_COUNT_OPTIONS,
  calculateDietPlan
} = require('../../../utils/dietPlan')
const { getThemeId, getTheme, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getDietToolShare } = require('../../../utils/share')
const { saveResultCard, handleSaveError, drawDietCard } = require('../../../utils/resultCard')
const { createLastInput } = require('../../../utils/toolLastInput')

const lastInput = createLastInput('diet', [
  'sex',
  'age',
  'height',
  'weight',
  'activity',
  'deficit',
  'style',
  'mealCount',
  'shuffleIndex',
  'mealOffsets'
])

function defaultOffsets() {
  return { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
}

Page({
  data: {
    theme: getThemeId(),
    sexOptions: SEX_OPTIONS,
    activityOptions: ACTIVITY_OPTIONS,
    deficitOptions: DEFICIT_OPTIONS,
    styleOptions: STYLE_OPTIONS,
    mealCountOptions: MEAL_COUNT_OPTIONS,
    sex: 'female',
    age: '28',
    height: '165',
    weight: '58',
    activity: 'light',
    deficit: 'standard',
    style: 'balanced',
    mealCount: '3',
    shuffleIndex: 0,
    mealOffsets: defaultOffsets(),
    activityHint: '每周 1–3 次',
    result: null,
    savingCard: false
  },

  onLoad() {
    enableShareMenu()
    const saved = lastInput.restore()
    const mealOffsets = Object.assign(defaultOffsets(), saved.mealOffsets || {})
    const activityIds = ACTIVITY_OPTIONS.map((item) => item.id)
    const deficitIds = DEFICIT_OPTIONS.map((item) => item.id)
    const styleIds = STYLE_OPTIONS.map((item) => item.id)
    this.setData(
      {
        sex: saved.sex === 'male' ? 'male' : 'female',
        age: saved.age || this.data.age,
        height: saved.height || this.data.height,
        weight: saved.weight || this.data.weight,
        activity: activityIds.indexOf(saved.activity) >= 0 ? saved.activity : this.data.activity,
        deficit: deficitIds.indexOf(saved.deficit) >= 0 ? saved.deficit : this.data.deficit,
        style: styleIds.indexOf(saved.style) >= 0 ? saved.style : this.data.style,
        mealCount: saved.mealCount === '4' ? '4' : '3',
        shuffleIndex: Number(saved.shuffleIndex) || 0,
        mealOffsets
      },
      () => this.recalculate()
    )
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onHide() {
    lastInput.flush(this)
  },

  onUnload() {
    lastInput.flush(this)
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: e.detail.value }, () => this.recalculate())
  },

  onSelect(e) {
    const field = e.currentTarget.dataset.field
    const value = e.currentTarget.dataset.value
    if (!field || value == null || value === this.data[field]) return
    const patch = { [field]: value }
    if (field === 'style' || field === 'mealCount') {
      patch.mealOffsets = defaultOffsets()
    }
    this.setData(patch, () => this.recalculate())
  },

  onShuffle() {
    this.setData(
      {
        shuffleIndex: (Number(this.data.shuffleIndex) || 0) + 1,
        mealOffsets: defaultOffsets()
      },
      () => this.recalculate()
    )
  },

  onSwapMeal(e) {
    const slot = e.currentTarget.dataset.slot
    if (!slot) return
    const mealOffsets = Object.assign(defaultOffsets(), this.data.mealOffsets || {})
    mealOffsets[slot] = (Number(mealOffsets[slot]) || 0) + 1
    this.setData({ mealOffsets }, () => this.recalculate())
  },

  recalculate() {
    const result = calculateDietPlan({
      sex: this.data.sex,
      age: this.data.age,
      height: this.data.height,
      weight: this.data.weight,
      activity: this.data.activity,
      deficit: this.data.deficit,
      style: this.data.style,
      mealCount: this.data.mealCount,
      shuffleIndex: this.data.shuffleIndex,
      mealOffsets: this.data.mealOffsets
    })
    const activity = ACTIVITY_OPTIONS.find((item) => item.id === this.data.activity)
    this.setData(
      {
        result,
        activityHint: activity ? activity.hint : ''
      },
      () => lastInput.save(this)
    )
  },

  onSaveCard() {
    const result = this.data.result
    if (!result || !result.valid) {
      wx.showToast({ title: '请先算出结果', icon: 'none' })
      return
    }
    if (this._savingCard) return
    this._savingCard = true
    this.setData({ savingCard: true })
    wx.showLoading({ title: '正在生成', mask: true })
    saveResultCard(this, 'resultCard', (ctx, width, height) => {
      drawDietCard(ctx, width, height, result, getTheme(this.data.theme))
    })
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      })
      .catch((err) => {
        wx.hideLoading()
        handleSaveError(err)
      })
      .then(() => {
        this._savingCard = false
        this.setData({ savingCard: false })
      })
  },

  onShareAppMessage() {
    return getDietToolShare().appMessage
  },

  onShareTimeline() {
    return getDietToolShare().timeline
  }
})
