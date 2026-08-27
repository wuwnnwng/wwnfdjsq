const PAPER = '#fffefb'

function drawStroke(ctx, stroke) {
  const points = (stroke && stroke.points) || []
  if (!points.length) return
  ctx.save()
  ctx.strokeStyle = stroke.eraser ? PAPER : stroke.color || '#14231c'
  ctx.lineWidth = stroke.size || 8
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  if (points.length === 1) {
    ctx.lineTo(points[0].x + 0.01, points[0].y)
  } else {
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y)
    }
  }
  ctx.stroke()
  ctx.restore()
}

function fillPaper(ctx, width, height) {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, width, height)
}

function drawStrokes(ctx, strokes) {
  ;(strokes || []).forEach((stroke) => drawStroke(ctx, stroke))
}

function redrawBoard(ctx, width, height, strokes) {
  fillPaper(ctx, width, height)
  drawStrokes(ctx, strokes)
}

function paintStrokesFitted(ctx, x, y, w, h, strokes, srcW, srcH) {
  const width = srcW || w
  const height = srcH || h
  const scale = Math.min(w / width, h / height)
  const ox = x + (w - width * scale) / 2
  const oy = y + (h - height * scale) / 2
  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(scale, scale)
  fillPaper(ctx, width, height)
  drawStrokes(ctx, strokes)
  ctx.restore()
}

module.exports = {
  PAPER,
  drawStroke,
  drawStrokes,
  fillPaper,
  redrawBoard,
  paintStrokesFitted
}
