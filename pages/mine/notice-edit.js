const { readState, loadNoticeManage, saveNotice, removeNotice } = require('../../utils/points')

Page({
  data: {
    list: [],
    editing: false,
    id: '',
    title: '',
    body: '',
    published: true
  },

  onShow() {
    if (!readState().loggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 400)
      return
    }
    this.reload()
  },

  reload() {
    loadNoticeManage().then((res) => {
      this.setData({ list: res.list || [] })
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || '没有打开管理', icon: 'none' })
    })
  },

  onCreate() {
    this.setData({ editing: true, id: '', title: '', body: '', published: true })
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.list || []).find((row) => row.id === id)
    if (!item) return
    this.setData({
      editing: true,
      id: item.id,
      title: item.title,
      body: item.body,
      published: !!item.published
    })
  },

  onClose() {
    this.setData({ editing: false })
  },

  onHold() {},

  onTitle(e) {
    this.setData({ title: (e.detail && e.detail.value) || '' })
  },

  onBody(e) {
    this.setData({ body: (e.detail && e.detail.value) || '' })
  },

  onPublished(e) {
    this.setData({ published: !!(e.detail && e.detail.value) })
  },

  onSave() {
    saveNotice({
      id: this.data.id,
      title: this.data.title,
      body: this.data.body,
      published: this.data.published
    }).then((res) => {
      this.setData({ list: res.list || [], editing: false })
      wx.showToast({ title: '已保存', icon: 'none' })
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || '没有保存成功', icon: 'none' })
    })
  },

  onRemove() {
    if (!this.data.id) {
      this.setData({ editing: false })
      return
    }
    removeNotice(this.data.id).then((res) => {
      this.setData({ list: res.list || [], editing: false })
      wx.showToast({ title: '已删除', icon: 'none' })
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || '没有删除成功', icon: 'none' })
    })
  }
})
