const { todayYMD } = require('../../../utils/datetimeCalc')
const { calculateAge } = require('../../../utils/ageCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getAgeToolShare } = require('../../../utils/share')

function defaultBirthday() {
  const now = new Date()
  const year = now.getFullYear() - 18
  const month = now.getMonth() + 1
  const day = Math.min(now.getDate(), new Date(year, month, 0).getDate())
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

Page({
  data: {
    theme: getThemeId(),
    today: todayYMD(),
    birthday: defaultBirthday(),
    asOf: todayYMD(),
    result: null
  },

  onLoad() {
    enableShareMenu()
    this.recalculate()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme, today: todayYMD() })
    applyThemeChrome(theme)
  },

  onBirthdayChange(e) {
    this.setData({ birthday: e.detail.value }, () => this.recalculate())
  },

  onAsOfChange(e) {
    this.setData({ asOf: e.detail.value }, () => this.recalculate())
  },

  recalculate() {
    this.setData({ result: calculateAge(this.data.birthday, this.data.asOf) })
  },

  onShareAppMessage() {
    return getAgeToolShare().appMessage
  },

  onShareTimeline() {
    return getAgeToolShare().timeline
  }
})
