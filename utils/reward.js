/**
 * 打赏 / 赞赏码
 * 把赞赏码图片放到：/images/reward-qr.jpg
 *
 * 说明：安卓微信预览大图通常不能直接识别二维码，
 * 推荐「保存到相册 → 扫一扫 → 从相册选取」。
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

function ensureAlbumAuth() {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success(setting) {
        if (setting.authSetting['scope.writePhotosAlbum']) {
          resolve(true)
          return
        }
        wx.authorize({
          scope: 'scope.writePhotosAlbum',
          success() {
            resolve(true)
          },
          fail() {
            wx.showModal({
              title: '需要相册权限',
              content: '保存赞赏码需要相册权限，请在设置中开启',
              confirmText: '去设置',
              success(res) {
                if (res.confirm) {
                  wx.openSetting({
                    success(openRes) {
                      resolve(!!openRes.authSetting['scope.writePhotosAlbum'])
                    },
                    fail: reject
                  })
                  return
                }
                reject(new Error('auth denied'))
              }
            })
          }
        })
      },
      fail: reject
    })
  })
}

/**
 * 保存赞赏码到相册，方便安卓用户用「扫一扫 - 相册」识别
 */
function saveRewardQrToAlbum() {
  return ensureAlbumAuth()
    .then(
      () =>
        new Promise((resolve, reject) => {
          wx.getImageInfo({
            src: REWARD_QR_PATH,
            success(info) {
              wx.saveImageToPhotosAlbum({
                filePath: info.path,
                success: resolve,
                fail: reject
              })
            },
            fail: reject
          })
        })
    )
    .then(() => {
      wx.showModal({
        title: '已保存到相册',
        content: '请打开微信「扫一扫」→ 点击右下角相册 → 选择这张赞赏码完成打赏',
        showCancel: false,
        confirmText: '知道了'
      })
    })
    .catch((err) => {
      if (err && err.message === 'auth denied') return
      wx.showToast({
        title: '保存失败，请长按图片另存',
        icon: 'none'
      })
    })
}

module.exports = {
  REWARD_QR_PATH,
  getRewardQrPath,
  previewRewardQr,
  saveRewardQrToAlbum
}
