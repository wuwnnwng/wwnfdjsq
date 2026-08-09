/**
 * 在 canvas 上绘制本金 / 利息占比饼图
 * 比例文案直接标在扇区上
 */

function round1(n) {
  return Math.round(n * 10) / 10
}

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
  const outerRadius = Math.min(width, height) * 0.38
  const innerRadius = outerRadius * 0.56
  const labelRadius = (outerRadius + innerRadius) / 2
  const total = principal + interest

  ctx.clearRect(0, 0, width, height)

  if (total <= 0) {
    ctx.beginPath()
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(20, 35, 28, 0.08)'
    ctx.fill()
    return
  }

  const slices = [
    { value: principal, color: principalColor, name: '本金' },
    { value: interest, color: interestColor, name: '利息' }
  ]

  let start = -Math.PI / 2
  const labelItems = []

  slices.forEach((slice) => {
    const angle = (slice.value / total) * Math.PI * 2
    if (angle <= 0) return

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, outerRadius, start, start + angle)
    ctx.closePath()
    ctx.fillStyle = slice.color
    ctx.fill()

    const mid = start + angle / 2
    labelItems.push({
      name: slice.name,
      percent: round1((slice.value / total) * 100),
      angle: mid,
      sliceAngle: angle
    })

    start += angle
  })

  // 中心挖空，做成环形图更清晰
  ctx.beginPath()
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2)
  ctx.fillStyle = '#f7f8f6'
  ctx.fill()

  ctx.fillStyle = '#14231c'
  ctx.font = `600 ${Math.round(outerRadius * 0.2)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('还款构成', cx, cy)

  // 扇区上标注「本金 xx% / 利息 xx%」
  labelItems.forEach((item) => {
    // 过小扇区不画，避免重叠
    if (item.sliceAngle < Math.PI * 0.12) return

    const x = cx + Math.cos(item.angle) * labelRadius
    const y = cy + Math.sin(item.angle) * labelRadius
    const titleSize = Math.round(outerRadius * 0.13)
    const percentSize = Math.round(outerRadius * 0.16)

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.font = `500 ${titleSize}px sans-serif`
    ctx.fillText(item.name, x, y - titleSize * 0.7)

    ctx.font = `700 ${percentSize}px sans-serif`
    ctx.fillText(`${item.percent}%`, x, y + percentSize * 0.55)
  })

  // 若某一扇区过小，把标签放到环外并用引导线连接
  labelItems.forEach((item) => {
    if (item.sliceAngle >= Math.PI * 0.12) return

    const cos = Math.cos(item.angle)
    const sin = Math.sin(item.angle)
    const x1 = cx + cos * (outerRadius * 0.92)
    const y1 = cy + sin * (outerRadius * 0.92)
    const x2 = cx + cos * (outerRadius * 1.12)
    const y2 = cy + sin * (outerRadius * 1.12)
    const alignLeft = cos >= 0
    const x3 = x2 + (alignLeft ? 16 : -16)

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.lineTo(x3, y2)
    ctx.strokeStyle = item.name === '本金' ? principalColor : interestColor
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#14231c'
    ctx.textAlign = alignLeft ? 'left' : 'right'
    ctx.textBaseline = 'middle'
    ctx.font = `600 ${Math.round(outerRadius * 0.14)}px sans-serif`
    ctx.fillText(`${item.name} ${item.percent}%`, x3 + (alignLeft ? 6 : -6), y2)
  })
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
