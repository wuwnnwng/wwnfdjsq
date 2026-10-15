const RISKY_TEXT = '所发布内容含违规信息'

function compress(filePath) {
  return new Promise((resolve) => {
    if (typeof wx.compressImage !== 'function') {
      resolve(filePath)
      return
    }
    wx.compressImage({
      src: filePath,
      quality: 30,
      compressedWidth: 480,
      success: (res) => resolve((res && res.tempFilePath) || filePath),
      fail: () => resolve(filePath)
    })
  })
}

function removeCloudFile(fileID) {
  if (!fileID || !wx.cloud || typeof wx.cloud.deleteFile !== 'function') return
  wx.cloud.deleteFile({ fileList: [fileID] })
}

function checkImage(filePath) {
  if (!filePath || !wx.cloud || typeof wx.cloud.uploadFile !== 'function') {
    return Promise.resolve({ risky: false })
  }
  return compress(filePath).then((path) => new Promise((resolve) => {
    wx.cloud.uploadFile({
      cloudPath: `sec-check/${Date.now()}-${Math.floor(Math.random() * 1000000)}.jpg`,
      filePath: path,
      success: (up) => {
        const fileID = up && up.fileID
        wx.cloud.callFunction({
          name: 'secCheck',
          data: { type: 'image', fileID },
          success: (res) => {
            removeCloudFile(fileID)
            const result = (res && res.result) || {}
            resolve({ risky: !!result.risky })
          },
          fail: () => {
            removeCloudFile(fileID)
            resolve({ risky: false })
          }
        })
      },
      fail: () => resolve({ risky: false })
    })
  }))
}

function showRisky() {
  wx.showModal({
    title: '提示',
    content: RISKY_TEXT,
    showCancel: false
  })
}

module.exports = {
  RISKY_TEXT,
  checkImage,
  showRisky
}
