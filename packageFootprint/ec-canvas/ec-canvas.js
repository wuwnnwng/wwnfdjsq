const WxCanvas = require('./wx-canvas')
const echarts = require('./echarts')

function compareVersion(v1, v2) {
  const a = String(v1 || '').split('.')
  const b = String(v2 || '').split('.')
  const len = Math.max(a.length, b.length)
  while (a.length < len) a.push('0')
  while (b.length < len) b.push('0')
  for (let i = 0; i < len; i += 1) {
    const n1 = parseInt(a[i], 10)
    const n2 = parseInt(b[i], 10)
    if (n1 > n2) return 1
    if (n1 < n2) return -1
  }
  return 0
}

function wrapTouch(event) {
  const touches = event.touches || []
  for (let i = 0; i < touches.length; i += 1) {
    touches[i].offsetX = touches[i].x
    touches[i].offsetY = touches[i].y
  }
  return event
}

Component({
  properties: {
    canvasId: {
      type: String,
      value: 'ec-canvas'
    },
    ec: {
      type: Object
    },
    forceUseOldCanvas: {
      type: Boolean,
      value: false
    }
  },

  data: {
    isUseNewCanvas: false
  },

  ready() {
    if (echarts.registerPreprocessor) {
      echarts.registerPreprocessor((option) => {
        if (!option || !option.series) return
        const list = Array.isArray(option.series) ? option.series : [option.series]
        list.forEach((series) => {
          if (series) series.progressive = 0
        })
      })
    }
    if (!this.data.ec) return
    if (!this.data.ec.lazyLoad) this.init()
  },

  methods: {
    init(callback) {
      const version = wx.getSystemInfoSync().SDKVersion
      const canUseNewCanvas = compareVersion(version, '2.9.0') >= 0
      const isUseNewCanvas = canUseNewCanvas && !this.data.forceUseOldCanvas
      this.setData({ isUseNewCanvas })
      if (isUseNewCanvas) this.initByNewWay(callback)
      else this.initByOldWay(callback)
    },

    initByOldWay(callback) {
      const ctx = wx.createCanvasContext(this.data.canvasId, this)
      const canvas = new WxCanvas(ctx, this.data.canvasId, false)
      if (echarts.setPlatformAPI) {
        echarts.setPlatformAPI({ createCanvas: () => canvas })
      } else if (echarts.setCanvasCreator) {
        echarts.setCanvasCreator(() => canvas)
      }
      wx.createSelectorQuery()
        .in(this)
        .select('.ec-canvas')
        .boundingClientRect((res) => {
          if (!res) return
          this._finishInit(callback, canvas, res.width, res.height, 1)
        })
        .exec()
    },

    initByNewWay(callback) {
      wx.createSelectorQuery()
        .in(this)
        .select('.ec-canvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          const info = res && res[0]
          if (!info || !info.node) return
          const canvasNode = info.node
          this.canvasNode = canvasNode
          const dpr = wx.getSystemInfoSync().pixelRatio || 1
          const ctx = canvasNode.getContext('2d')
          const canvas = new WxCanvas(ctx, this.data.canvasId, true, canvasNode)
          if (echarts.setPlatformAPI) {
            echarts.setPlatformAPI({
              createCanvas: () => canvas,
              loadImage: (src, onload, onerror) => {
                if (!canvasNode.createImage) return null
                const image = canvasNode.createImage()
                image.onload = onload
                image.onerror = onerror
                image.src = src
                return image
              }
            })
          } else if (echarts.setCanvasCreator) {
            echarts.setCanvasCreator(() => canvas)
          }
          this._finishInit(callback, canvas, info.width, info.height, dpr)
        })
    },

    _finishInit(callback, canvas, width, height, dpr) {
      if (typeof callback === 'function') {
        this.chart = callback(canvas, width, height, dpr)
      } else if (this.data.ec && typeof this.data.ec.onInit === 'function') {
        this.chart = this.data.ec.onInit(canvas, width, height, dpr)
      }
    },

    canvasToTempFilePath(opt) {
      if (this.data.isUseNewCanvas && this.canvasNode) {
        opt.canvas = this.canvasNode
        wx.canvasToTempFilePath(opt)
        return
      }
      if (!opt.canvasId) opt.canvasId = this.data.canvasId
      wx.canvasToTempFilePath(opt, this)
    },

    touchStart(e) {
      if (!this.chart || !e.touches || !e.touches.length) return
      const touch = e.touches[0]
      const handler = this.chart.getZr().handler
      handler.dispatch('mousedown', {
        zrX: touch.x,
        zrY: touch.y,
        preventDefault() {},
        stopImmediatePropagation() {},
        stopPropagation() {}
      })
      handler.dispatch('mousemove', {
        zrX: touch.x,
        zrY: touch.y,
        preventDefault() {},
        stopImmediatePropagation() {},
        stopPropagation() {}
      })
      handler.processGesture(wrapTouch(e), 'start')
    },

    touchMove(e) {
      if (!this.chart || !e.touches || !e.touches.length) return
      const touch = e.touches[0]
      const handler = this.chart.getZr().handler
      handler.dispatch('mousemove', {
        zrX: touch.x,
        zrY: touch.y,
        preventDefault() {},
        stopImmediatePropagation() {},
        stopPropagation() {}
      })
      handler.processGesture(wrapTouch(e), 'change')
    },

    touchEnd(e) {
      if (!this.chart) return
      const touch = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : {}
      const handler = this.chart.getZr().handler
      handler.dispatch('mouseup', {
        zrX: touch.x,
        zrY: touch.y,
        preventDefault() {},
        stopImmediatePropagation() {},
        stopPropagation() {}
      })
      handler.dispatch('click', {
        zrX: touch.x,
        zrY: touch.y,
        preventDefault() {},
        stopImmediatePropagation() {},
        stopPropagation() {}
      })
      handler.processGesture(wrapTouch(e), 'end')
    }
  }
})
