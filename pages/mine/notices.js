const { loadNotices } = require('../../utils/points')

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
    list: [],
    canManage: false,
    empty: false
  },

  onShow() {
    loadNotices().then((res) => {
      const list = (res.list || []).map((item) => Object.assign({}, item, { time: timeText(item.updatedAt) }))
      this.setData({
        list,
        canManage: !!res.canManage,
        empty: !list.length
      })
    }).catch(() => {
      this.setData({ empty: true })
    })
  },

  onManage() {
    wx.navigateTo({ url: '/pages/mine/notice-edit' })
  }
})
