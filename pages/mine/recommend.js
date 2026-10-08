const { readState, loadRecommend, saveRecommend } = require('../../utils/points')
const { getThemeId, applyThemeChrome } = require('../../utils/theme')
const { groupTools, applyRecommendResult, MAX_RECOMMEND_TOOLS, getToolById } = require('../../utils/toolsConfig')

function decorate(groups, ids) {
  const order = {}
  ids.forEach((id, index) => {
    order[id] = index + 1
  })
  return (groups || []).map((group) => ({
    id: group.id,
    name: group.name,
    tools: (group.tools || []).map((tool) => ({
      id: tool.id,
      name: tool.name,
      icon: tool.icon,
      picked: !!order[tool.id],
      order: order[tool.id] || 0
    }))
  }))
}

Page({
  data: {
    theme: getThemeId(),
    groups: [],
    ids: [],
    max: MAX_RECOMMEND_TOOLS,
    saving: false
  },

  onShow() {
    const state = readState()
    if (!state.loggedIn || !state.admin) {
      wx.showToast({ title: '没有管理权限', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 400)
      return
    }
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    this._groups = groupTools()
    this.setData({ groups: decorate(this._groups, this.data.ids) })
    loadRecommend().then((result) => {
      const ids = applyRecommendResult(result)
      this.setData({ ids, groups: decorate(this._groups, ids) })
    }).catch((err) => {
      const msg = (err && err.message) || ''
      wx.showToast({ title: msg && msg !== 'cloud' && msg !== 'fail' ? msg : '没有读到推荐', icon: 'none' })
    })
  },

  onToggle(e) {
    const id = e.currentTarget.dataset.id
    if (!id || !getToolById(id)) return
    const ids = this.data.ids.slice()
    const at = ids.indexOf(id)
    if (at >= 0) ids.splice(at, 1)
    else if (ids.length >= this.data.max) {
      wx.showToast({ title: '最多选择 3 个', icon: 'none' })
      return
    } else ids.push(id)
    this.setData({ ids, groups: decorate(this._groups, ids) })
  },

  onSave() {
    if (this.data.saving) return
    this.setData({ saving: true })
    saveRecommend(this.data.ids).then((result) => {
      const ids = applyRecommendResult(result)
      this.setData({ saving: false, ids, groups: decorate(this._groups, ids) })
      wx.showToast({ title: '已保存', icon: 'success' })
    }).catch((err) => {
      this.setData({ saving: false })
      const msg = (err && err.message) || ''
      wx.showToast({ title: msg && msg !== 'cloud' && msg !== 'fail' ? msg : '没有保存成功', icon: 'none' })
    })
  }
})
