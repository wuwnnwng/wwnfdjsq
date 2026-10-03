const { loadNotices, removeNotice } = require('../../utils/points')
const { getThemeId, applyThemeChrome } = require('../../utils/theme')
const { readInbox, writeInbox, stamp, presentNotices } = require('../../utils/noticeInbox')

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
      const list = presentNotices(res.list, canManage).map((item) => Object.assign({}, item, {
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
    const inbox = readInbox()
    const list = this.data.list || []
    if (!list.length) {
      wx.showToast({ title: '没有未读消息', icon: 'none' })
      return
    }
    list.forEach((item) => {
      inbox.read[item.id] = stamp(item) || Date.now()
    })
    writeInbox(inbox)
    this.setData({
      list: list.map((item) => Object.assign({}, item, { unread: false }))
    })
    wx.showToast({ title: '已全部标为已读', icon: 'none' })
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

  onClear() {
    if (this.data.canManage) return
    const list = this.data.list || []
    if (!list.length) {
      wx.showToast({ title: '没有可清除的消息', icon: 'none' })
      return
    }
    wx.showModal({
      title: '清除消息',
      content: '清除后，这些通知不再显示在这里。',
      confirmText: '清除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return
        const inbox = readInbox()
        list.forEach((item) => {
          inbox.hidden[item.id] = stamp(item) || Date.now()
        })
        writeInbox(inbox)
        this.setData({ list: [] })
        wx.showToast({ title: '已清除', icon: 'none' })
      }
    })
  },

  onOpen(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.list || []
    const item = list.find((row) => row.id === id)
    if (!item || !item.unread) return
    const inbox = readInbox()
    inbox.read[id] = stamp(item) || Date.now()
    writeInbox(inbox)
    this.setData({
      list: list.map((row) => row.id === id ? Object.assign({}, row, { unread: false }) : row)
    })
  },

  onManage() {
    wx.navigateTo({ url: '/pages/mine/notice-edit' })
  }
})
