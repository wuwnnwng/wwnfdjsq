const { AD_UNITS, shouldMountNativeAd } = require('../../utils/ads')

function themeToAdTheme(theme) {
  return theme === 'nexus' ? 'black' : 'white'
}

Component({
  properties: {
    unitId: {
      type: String,
      value: AD_UNITS.banner
    },
    theme: {
      type: String,
      value: ''
    }
  },

  data: {
    mount: false,
    adTheme: 'white',
    ready: false
  },

  lifetimes: {
    attached() {
      if (!shouldMountNativeAd()) return

      let theme = this.properties.theme
      if (!theme) {
        try {
          const app = getApp()
          theme = (app && app.globalData && app.globalData.theme) || ''
        } catch (e) {}
      }

      this.setData({
        mount: true,
        adTheme: themeToAdTheme(theme)
      })
    }
  },

  methods: {
    onLoadAd() {
      this.setData({ ready: true })
    },

    onErrorAd() {}
  }
})
