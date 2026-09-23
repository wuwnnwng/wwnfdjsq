Page({
  onLoad(options) {
    const query = Object.keys(options || {})
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`)
      .join('&')
    const url = `/packageTravel/pages/fuel/fuel${query ? `?${query}` : ''}`
    const go = () => wx.redirectTo({ url })
    if (typeof wx.nextTick === 'function') wx.nextTick(go)
    else setTimeout(go, 0)
  }
})
