const { AD_UNITS } = require('../../utils/ads')

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
    adTheme: 'white',
    hidden: false,
    ready: false
  },

  observers: {
    theme(value) {
      this.setData({
        adTheme: value === 'nexus' ? 'black' : 'white'
      })
    }
  },

  lifetimes: {
    attached() {
      if (!this.properties.theme) {
        try {
          const app = getApp()
          const theme = (app && app.globalData && app.globalData.theme) || ''
          if (theme) {
            this.setData({
              adTheme: theme === 'nexus' ? 'black' : 'white'
            })
          }
        } catch (e) {}
      }
    }
  },

  methods: {
    onLoadAd() {
      this.setData({ hidden: false, ready: true })
    },

    onErrorAd() {
      this.setData({ hidden: true, ready: false })
    },

    onCloseAd() {
      this.setData({ hidden: true, ready: false })
    }
  }
})
