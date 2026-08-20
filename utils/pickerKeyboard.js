function getWindowInfo() {
  try {
    if (typeof wx.getWindowInfo === 'function') {
      return wx.getWindowInfo()
    }
  } catch (e) {}
  return wx.getSystemInfoSync()
}

function getSafeBottom(info, ignore) {
  if (ignore) return 0
  if (info.safeAreaInsets && typeof info.safeAreaInsets.bottom === 'number') {
    return Math.max(0, info.safeAreaInsets.bottom)
  }
  if (info.safeArea && typeof info.safeArea.bottom === 'number') {
    return Math.max(0, (info.windowHeight || 0) - info.safeArea.bottom)
  }
  return 0
}

function rpxToPx(rpx, windowWidth) {
  return Math.round(((Number(rpx) || 0) * (Number(windowWidth) || 375)) / 750)
}

function calcPickerSheetLayout(keyboardHeight) {
  const info = getWindowInfo()
  const windowHeight = Number(info.windowHeight) || 0
  const screenHeight = Number(info.screenHeight) || windowHeight
  const kb = Math.max(0, Number(keyboardHeight) || 0)
  const windowShrunk = kb > 0 && windowHeight + kb < screenHeight - 48
  const offset = windowShrunk ? 0 : kb
  const safeBottom = getSafeBottom(info, offset > 0 || windowShrunk)
  const visible = Math.max(240, windowHeight - offset)
  const chrome =
    rpxToPx(28 + 44 + 20 + 96 + 16 + 20 + 48 + 28, info.windowWidth) + safeBottom
  const sheetMaxHeight = Math.min(Math.floor(windowHeight * 0.78), visible)
  const sheetHeight = offset > 0 || windowShrunk ? visible : sheetMaxHeight

  return {
    offset,
    keyboardOpen: kb > 0 || windowShrunk,
    sheetMaxHeight: sheetHeight,
    listHeight: Math.max(180, sheetHeight - chrome)
  }
}

function listenKeyboardHeight(handler) {
  if (typeof wx.onKeyboardHeightChange === 'function') {
    wx.onKeyboardHeightChange(handler)
  }
}

function unlistenKeyboardHeight(handler) {
  if (typeof wx.offKeyboardHeightChange === 'function' && handler) {
    wx.offKeyboardHeightChange(handler)
    return
  }
  if (typeof wx.onKeyboardHeightChange === 'function') {
    wx.onKeyboardHeightChange(function () {})
  }
}

module.exports = {
  calcPickerSheetLayout,
  listenKeyboardHeight,
  unlistenKeyboardHeight
}
