function WxCanvas(ctx, canvasId, isNew, canvasNode) {
  this.ctx = ctx
  this.canvasId = canvasId
  this.chart = null
  this.isNew = isNew
  if (isNew) {
    this.canvasNode = canvasNode
  } else {
    this._initStyle(ctx)
  }
  this._initEvent()
}

WxCanvas.prototype.getContext = function (contextType) {
  if (contextType === '2d') return this.ctx
  return null
}

WxCanvas.prototype.setChart = function (chart) {
  this.chart = chart
}

WxCanvas.prototype.addEventListener = function () {}

WxCanvas.prototype.attachEvent = function () {}

WxCanvas.prototype.detachEvent = function () {}

WxCanvas.prototype._initStyle = function (ctx) {
  const raw = ctx.createRadialGradient
  ctx.createRadialGradient = function () {
    return raw ? raw.apply(ctx, arguments) : ctx.createCircularGradient.apply(ctx, arguments)
  }
}

WxCanvas.prototype._initEvent = function () {
  this.event = {}
}

Object.defineProperty(WxCanvas.prototype, 'width', {
  get() {
    return this.canvasNode ? this.canvasNode.width : 0
  },
  set(w) {
    if (this.canvasNode) this.canvasNode.width = w
  }
})

Object.defineProperty(WxCanvas.prototype, 'height', {
  get() {
    return this.canvasNode ? this.canvasNode.height : 0
  },
  set(h) {
    if (this.canvasNode) this.canvasNode.height = h
  }
})

module.exports = WxCanvas
