const { loadNotices, markNoticesRead, removeNotice } = require('../../utils/points')
const { getThemeId, applyThemeChrome } = require('../../utils/theme')

function timeText(value) {
  const time = Number(value) || 0
  if (!time) return ''
  const date = new Date(time)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${date.getFullYear()}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`
}

Page({
  data: {
    theme: getThemeId(),
    list: [],
    canManage: false
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    this.load()
  },

  load() {
    loadNotices().then((res) => {
      const canManage = !!res.canManage
      const list = (res.list || []).map((item) => Object.assign({}, item, {
        time: timeText(item.updatedAt)
      }))
      this.setData({
        list,
        canManage
      })
    }).catch(() => {
      this.setData({ list: [] })
    })
  },

  onReadAll() {
    const list = this.data.list || []
    const ids = list.filter((item) => item.unread).map((item) => item.id)
    if (!ids.length) {
      wx.showToast({ title: '没有未读消息', icon: 'none' })
      return
    }
    if (this._busy) return
    this._busy = true
    markNoticesRead(ids).then(() => {
      this._busy = false
      this.setData({
        list: list.map((item) => Object.assign({}, item, { unread: false }))
      })
      wx.showToast({ title: '已全部标为已读', icon: 'none' })
    }).catch((err) => {
      this._busy = false
      wx.showToast({ title: (err && err.message) || '没有标成已读', icon: 'none' })
    })
  },

  onDelete() {
    const list = this.data.list || []
    if (!this.data.canManage) return
    if (!list.length) {
      wx.showToast({ title: '没有可删除的消息', icon: 'none' })
      return
    }
    wx.showModal({
      title: '删除消息',
      content: '删除后，所有用户都看不到这些通知。',
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm || this._busy) return
        this._busy = true
        wx.showLoading({ title: '正在删除', mask: true })
        const ids = list.map((item) => item.id)
        ids.reduce((chain, id) => chain.then(() => removeNotice(id)), Promise.resolve()).then(() => {
          this._busy = false
          wx.hideLoading()
          this.setData({ list: [] })
          wx.showToast({ title: '已删除', icon: 'none' })
        }).catch((err) => {
          this._busy = false
          wx.hideLoading()
          wx.showToast({ title: (err && err.message) || '没有删除成功', icon: 'none' })
          this.load()
        })
      }
    })
  },

  onOpen(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.list || []
    const item = list.find((row) => row.id === id)
    if (!item || !item.unread) return
    this.setData({
      list: list.map((row) => row.id === id ? Object.assign({}, row, { unread: false }) : row)
    })
    markNoticesRead([id]).catch(() => {
      this.load()
    })
  },

  onManage() {
    wx.navigateTo({ url: '/pages/mine/notice-edit' })
  }
})
