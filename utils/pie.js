/**
 * 在 canvas 上绘制本金 / 利息占比饼图
 */

function drawPieChart(canvas, ctx, options) {
  const {
    principal,
    interest,
    principalColor = '#1f6b52',
    interestColor = '#c45c26',
    dpr = 1
  } = options

  const width = canvas.width / dpr
  const height = canvas.height / dpr
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) * 0.36
  const total = principal + interest

  ctx.clearRect(0, 0, width, height)

  if (total <= 0) {
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(20, 35, 28, 0.08)'
    ctx.fill()
    return
  }

  const slices = [
    { value: principal, color: principalColor },
    { value: interest, color: interestColor }
  ]

  let start = -Math.PI / 2

  slices.forEach((slice) => {
    const angle = (slice.value / total) * Math.PI * 2
    if (angle <= 0) return

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, start, start + angle)
    ctx.closePath()
    ctx.fillStyle = slice.color
    ctx.fill()

    start += angle
  })

  // 中心挖空，做成环形图更清晰
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.58, 0, Math.PI * 2)
  ctx.fillStyle = '#f7f8f6'
  ctx.fill()

  ctx.fillStyle = '#14231c'
  ctx.font = `600 ${Math.round(radius * 0.22)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('还款构成', cx, cy - radius * 0.08)

  ctx.fillStyle = '#5f7268'
  ctx.font = `${Math.round(radius * 0.16)}px sans-serif`
  ctx.fillText('本金 · 利息', cx, cy + radius * 0.18)
}

/**
 * 初始化并绘制（兼容 type="2d" canvas）
 */
function renderPie(componentOrPage, canvasId, data) {
  const query = componentOrPage.createSelectorQuery()
  query
    .select(`#${canvasId}`)
    .fields({ node: true, size: true })
    .exec((res) => {
      const canvasInfo = res && res[0]
      if (!canvasInfo || !canvasInfo.node) return

      const canvas = canvasInfo.node
      const ctx = canvas.getContext('2d')
      const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio

      canvas.width = canvasInfo.width * dpr
      canvas.height = canvasInfo.height * dpr
      ctx.scale(dpr, dpr)

      drawPieChart(canvas, ctx, {
        principal: data.principal || 0,
        interest: data.interest || 0,
        dpr
      })
    })
}

module.exports = {
  drawPieChart,
  renderPie
}
