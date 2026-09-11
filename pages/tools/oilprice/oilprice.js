Page({
  onLoad(options) {
    const query = Object.keys(options || {})
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`)
      .join('&')
    wx.redirectTo({
      url: `/packageTravel/pages/oilprice/oilprice${query ? `?${query}` : ''}`
    })
  }
})
