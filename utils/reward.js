/**
 * 打赏 / 赞赏码
 * 把赞赏码图片放到：/images/reward-qr.jpg
 */
const REWARD_QR_PATH = '/images/reward-qr.jpg'

function getRewardQrPath() {
  return REWARD_QR_PATH
}

function previewRewardQr() {
  wx.previewImage({
    urls: [REWARD_QR_PATH],
    current: REWARD_QR_PATH,
    fail() {
      wx.showToast({
        title: '赞赏码加载失败，请检查图片',
        icon: 'none'
      })
    }
  })
}

module.exports = {
  REWARD_QR_PATH,
  getRewardQrPath,
  previewRewardQr
}
