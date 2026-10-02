const { readState, loadUsers } = require('../../utils/points')
const { getThemeId, applyThemeChrome } = require('../../utils/theme')

function formatTime(time) {
  const value = Number(time) || 0
  if (!value) return '未知'
  const date = new Date(value)
  const pad = (n) => (n < 10 ? '0' : '') + n
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
}

Page({
  data: {
    theme: getThemeId(),
    list: [],
    page: 1,
    total: 0,
    hasMore: false,
    loading: false
  },

  onShow() {
    const state = readState()
    if (!state.loggedIn || !state.admin) {
      wx.showToast({ title: '没有管理权限', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 400)
      return
    }
    this.setData({ theme: getThemeId() })
    applyThemeChrome(getThemeId())
    this.load(this.data.page || 1)
  },

  load(page) {
    if (this.data.loading) return
    this.setData({ loading: true })
    loadUsers(page).then((res) => {
      const list = (res.list || []).map((item) => Object.assign({}, item, {
        nickText: item.nick || '未设置昵称',
        statusText: item.online ? '登录' : '下线',
        timeText: formatTime(item.createdAt)
      }))
      this.setData({
        loading: false,
        list,
        page: res.page || page,
        total: res.total || 0,
        hasMore: !!res.hasMore
      })
    }).catch((err) => {
      this.setData({ loading: false })
      wx.showToast({ title: (err && err.message) || '没有加载成功', icon: 'none' })
    })
  },

  onPrev() {
    if (this.data.page <= 1 || this.data.loading) return
    this.load(this.data.page - 1)
  },

  onNext() {
    if (!this.data.hasMore || this.data.loading) return
    this.load(this.data.page + 1)
  }
})
