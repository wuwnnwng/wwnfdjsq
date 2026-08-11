/**
 * 开启右上角「转发好友 / 分享朋友圈」菜单
 */
function enableShareMenu() {
  if (!wx.showShareMenu) return
  wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  })
}

function getShareAppMessage() {
  return {
    title: '房贷计算器｜公积金、商贷、组合贷一键算清',
    path: '/pages/index/index'
  }
}

function getShareTimeline() {
  return {
    title: '房贷计算器｜公积金、商贷、组合贷一键算清',
    query: ''
  }
}

module.exports = {
  enableShareMenu,
  getShareAppMessage,
  getShareTimeline
}
