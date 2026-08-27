/**
 * 30 款热门拼图题材（原创插画，覆盖星空、樱花、萌宠、海岛、甜品等市面常见主题）
 */

const PUZZLES = [
  { id: 'starry', name: '星空夜曲', type: 'sky', colors: ['#0b1220', '#1d4ed8', '#fbbf24'] },
  { id: 'sakura', name: '富士樱花', type: 'mountain', colors: ['#93c5fd', '#fb7185', '#ffffff'] },
  { id: 'catnap', name: '午后橘猫', type: 'animal', colors: ['#fed7aa', '#fb923c', '#7c2d12'] },
  { id: 'golden', name: '金毛草地', type: 'animal', colors: ['#bbf7d0', '#f59e0b', '#365314'] },
  { id: 'sunset', name: '海边日落', type: 'sea', colors: ['#fb923c', '#f43f5e', '#1d4ed8'] },
  { id: 'autumn', name: '秋日森林', type: 'forest', colors: ['#fdba74', '#b45309', '#166534'] },
  { id: 'lavender', name: '薰衣草田', type: 'field', colors: ['#c4b5fd', '#7c3aed', '#fef3c7'] },
  { id: 'balloon', name: '热气球节', type: 'sky', colors: ['#7dd3fc', '#f43f5e', '#fbbf24'] },
  { id: 'paris', name: '巴黎黄昏', type: 'city', colors: ['#1e1b4b', '#f59e0b', '#64748b'] },
  { id: 'santorini', name: '蓝顶小岛', type: 'sea', colors: ['#38bdf8', '#ffffff', '#0ea5e9'] },
  { id: 'sunflower', name: '向日葵田', type: 'field', colors: ['#facc15', '#65a30d', '#92400e'] },
  { id: 'koi', name: '锦鲤荷塘', type: 'pond', colors: ['#86efac', '#fb7185', '#0f766e'] },
  { id: 'snowpeak', name: '雪山倒影', type: 'mountain', colors: ['#e0f2fe', '#64748b', '#0ea5e9'] },
  { id: 'reef', name: '热带鱼群', type: 'sea', colors: ['#0ea5e9', '#22d3ee', '#f97316'] },
  { id: 'neon', name: '霓虹都市', type: 'city', colors: ['#0f172a', '#22d3ee', '#e879f9'] },
  { id: 'wheat', name: '田园麦浪', type: 'field', colors: ['#fde68a', '#ca8a04', '#3f6212'] },
  { id: 'teagarden', name: '江南茶园', type: 'forest', colors: ['#86efac', '#166534', '#f8fafc'] },
  { id: 'coral', name: '珊瑚秘境', type: 'sea', colors: ['#0891b2', '#fb7185', '#fbbf24'] },
  { id: 'aurora', name: '极光雪原', type: 'sky', colors: ['#022c22', '#34d399', '#a78bfa'] },
  { id: 'bamboo', name: '翠竹幽径', type: 'forest', colors: ['#bbf7d0', '#15803d', '#365314'] },
  { id: 'desert', name: '沙漠星夜', type: 'sky', colors: ['#1c1917', '#fb923c', '#fde68a'] },
  { id: 'maple', name: '红叶古寺', type: 'mountain', colors: ['#fecaca', '#b91c1c', '#57534e'] },
  { id: 'harbor', name: '渔港晨光', type: 'sea', colors: ['#fdba74', '#0369a1', '#f8fafc'] },
  { id: 'flower', name: '花市春色', type: 'garden', colors: ['#fecdd3', '#fb7185', '#4ade80'] },
  { id: 'castle', name: '童话城堡', type: 'city', colors: ['#ddd6fe', '#7c3aed', '#fbbf24'] },
  { id: 'macaron', name: '马卡龙塔', type: 'food', colors: ['#fce7f3', '#f9a8d4', '#67e8f9'] },
  { id: 'panda', name: '竹林熊猫', type: 'animal', colors: ['#d1fae5', '#111827', '#ffffff'] },
  { id: 'peacock', name: '孔雀开屏', type: 'garden', colors: ['#0f766e', '#22c55e', '#fbbf24'] },
  { id: 'landmark', name: '世界地标', type: 'city', colors: ['#dbeafe', '#1d4ed8', '#f59e0b'] },
  { id: 'map', name: '复古航海图', type: 'map', colors: ['#fef3c7', '#b45309', '#0e7490'] }
]

function hexToRgb(hex) {
  const n = String(hex || '').replace('#', '')
  const v = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16)
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 }
}

function mix(a, b, t) {
  const pa = hexToRgb(a)
  const pb = hexToRgb(b)
  const r = Math.round(pa.r + (pb.r - pa.r) * t)
  const g = Math.round(pa.g + (pb.g - pa.g) * t)
  const bch = Math.round(pa.b + (pb.b - pa.b) * t)
  return `rgb(${r},${g},${bch})`
}

function fillGrad(ctx, x, y, w, h, c0, c1, vertical) {
  const g = vertical
    ? ctx.createLinearGradient(x, y, x, y + h)
    : ctx.createLinearGradient(x, y, x + w, y)
  g.addColorStop(0, c0)
  g.addColorStop(1, c1)
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
}

function oval(ctx, x, y, rx, ry, color) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}

function sun(ctx, x, y, r, color) {
  oval(ctx, x, y, r, r, color)
  ctx.globalAlpha = 0.18
  oval(ctx, x, y, r * 1.7, r * 1.7, color)
  ctx.globalAlpha = 1
}

function stars(ctx, w, h, count, color) {
  ctx.fillStyle = color
  for (let i = 0; i < count; i += 1) {
    const x = ((i * 97) % 1000) / 1000 * w
    const y = ((i * 53) % 700) / 700 * h * 0.55
    const r = 0.8 + (i % 4)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function hills(ctx, w, h, y, color, amp) {
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.lineTo(0, y)
  const steps = 8
  for (let i = 1; i <= steps; i += 1) {
    const x = (i / steps) * w
    const yy = y + Math.sin(i * 1.2) * amp
    ctx.lineTo(x, yy)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function drawSky(ctx, w, h, p) {
  fillGrad(ctx, 0, 0, w, h, p.colors[0], p.colors[1], true)
  stars(ctx, w, h, 46, 'rgba(255,255,255,0.85)')
  sun(ctx, w * 0.72, h * 0.28, Math.min(w, h) * 0.08, p.colors[2])
  if (p.id === 'balloon') {
    ;[0.22, 0.4, 0.58].forEach((x, i) => {
      const cx = w * x
      const cy = h * (0.32 + i * 0.06)
      oval(ctx, cx, cy, 16, 20, i === 1 ? '#f43f5e' : '#fbbf24')
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.beginPath()
      ctx.moveTo(cx, cy + 20)
      ctx.lineTo(cx, cy + 36)
      ctx.stroke()
      ctx.fillStyle = '#fdba74'
      ctx.fillRect(cx - 6, cy + 34, 12, 8)
    })
  }
  if (p.id === 'aurora') {
    ctx.globalAlpha = 0.45
    hills(ctx, w, h * 0.7, h * 0.22, '#34d399', 28)
    hills(ctx, w, h * 0.7, h * 0.3, '#a78bfa', 18)
    ctx.globalAlpha = 1
  }
  hills(ctx, w, h, h * 0.72, mix(p.colors[0], '#022c22', 0.4), 16)
}

function drawMountain(ctx, w, h, p) {
  fillGrad(ctx, 0, 0, w, h, p.colors[0], mix(p.colors[0], '#fff', 0.35), true)
  sun(ctx, w * 0.78, h * 0.22, 22, p.colors[2] || '#fff')
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.lineTo(w * 0.18, h * 0.42)
  ctx.lineTo(w * 0.36, h * 0.62)
  ctx.lineTo(w * 0.52, h * 0.28)
  ctx.lineTo(w * 0.7, h * 0.58)
  ctx.lineTo(w * 0.88, h * 0.36)
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = p.colors[1]
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.beginPath()
  ctx.moveTo(w * 0.52, h * 0.28)
  ctx.lineTo(w * 0.46, h * 0.4)
  ctx.lineTo(w * 0.58, h * 0.4)
  ctx.closePath()
  ctx.fill()
  if (p.id === 'sakura') {
    for (let i = 0; i < 18; i += 1) {
      oval(ctx, ((i * 47) % w), h * 0.55 + (i % 5) * 12, 7, 5, 'rgba(251,113,133,0.7)')
    }
  }
  hills(ctx, w, h, h * 0.78, mix(p.colors[1], '#365314', 0.5), 10)
}

function drawSea(ctx, w, h, p) {
  fillGrad(ctx, 0, 0, w, h * 0.55, mix(p.colors[0], '#fff', 0.35), p.colors[0], true)
  fillGrad(ctx, 0, h * 0.5, w, h * 0.5, p.colors[0], p.colors[2] || '#0369a1', true)
  sun(ctx, w * 0.5, h * 0.42, 26, p.colors[1])
  ctx.globalAlpha = 0.35
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath()
    ctx.moveTo(0, h * (0.58 + i * 0.07))
    ctx.quadraticCurveTo(w * 0.5, h * (0.54 + i * 0.07), w, h * (0.6 + i * 0.07))
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 3
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  if (p.id === 'santorini') {
    ctx.fillStyle = '#fff'
    ctx.fillRect(w * 0.18, h * 0.46, 70, 46)
    oval(ctx, w * 0.3, h * 0.46, 22, 16, p.colors[2])
  }
  if (p.id === 'reef' || p.id === 'coral') {
    oval(ctx, w * 0.28, h * 0.72, 16, 8, '#f97316')
    oval(ctx, w * 0.62, h * 0.78, 18, 9, '#22d3ee')
    oval(ctx, w * 0.45, h * 0.84, 12, 6, '#fbbf24')
  }
}

function drawForest(ctx, w, h, p) {
  fillGrad(ctx, 0, 0, w, h, mix(p.colors[0], '#fff', 0.4), p.colors[0], true)
  hills(ctx, w, h, h * 0.62, p.colors[1], 14)
  for (let i = 0; i < 7; i += 1) {
    const x = w * (0.08 + i * 0.13)
    ctx.fillStyle = p.colors[2] || '#365314'
    ctx.fillRect(x + 10, h * 0.58, 8, h * 0.28)
    oval(ctx, x + 14, h * 0.52, 22, 28, p.colors[1])
  }
}

function drawField(ctx, w, h, p) {
  fillGrad(ctx, 0, 0, w, h * 0.45, '#7dd3fc', '#fef3c7', true)
  fillGrad(ctx, 0, h * 0.42, w, h * 0.58, p.colors[0], p.colors[1], true)
  sun(ctx, w * 0.8, h * 0.18, 20, '#fde68a')
  for (let i = 0; i < 16; i += 1) {
    const x = ((i * 37) % 100) / 100 * w
    const y = h * 0.5 + ((i * 19) % 40)
    oval(ctx, x, y, 10, 14, p.colors[0])
    ctx.fillStyle = p.colors[2]
    ctx.fillRect(x - 2, y, 4, 18)
  }
}

function drawAnimal(ctx, w, h, p) {
  fillGrad(ctx, 0, 0, w, h, mix(p.colors[0], '#fff', 0.3), p.colors[0], true)
  hills(ctx, w, h, h * 0.7, mix(p.colors[0], p.colors[2], 0.4), 12)
  const cx = w * 0.5
  const cy = h * 0.58
  oval(ctx, cx, cy + 18, 54, 40, p.colors[1])
  oval(ctx, cx, cy - 8, 36, 32, p.colors[1])
  if (p.id === 'panda') {
    oval(ctx, cx, cy - 8, 36, 32, '#fff')
    oval(ctx, cx, cy + 18, 54, 40, '#fff')
    oval(ctx, cx - 14, cy - 12, 10, 12, '#111')
    oval(ctx, cx + 14, cy - 12, 10, 12, '#111')
    oval(ctx, cx - 8, cy - 4, 4, 5, '#111')
    oval(ctx, cx + 8, cy - 4, 4, 5, '#111')
  } else if (p.id === 'catnap') {
    ctx.beginPath()
    ctx.moveTo(cx - 28, cy - 18)
    ctx.lineTo(cx - 16, cy - 38)
    ctx.lineTo(cx - 6, cy - 16)
    ctx.fillStyle = p.colors[1]
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx + 28, cy - 18)
    ctx.lineTo(cx + 16, cy - 38)
    ctx.lineTo(cx + 6, cy - 16)
    ctx.fill()
    oval(ctx, cx - 10, cy - 6, 4, 5, '#111')
    oval(ctx, cx + 10, cy - 6, 4, 5, '#111')
  } else {
    oval(ctx, cx - 22, cy - 22, 12, 16, p.colors[1])
    oval(ctx, cx + 22, cy - 22, 12, 16, p.colors[1])
    oval(ctx, cx - 10, cy - 6, 4, 5, '#111')
    oval(ctx, cx + 10, cy - 6, 4, 5, '#111')
  }
}

function drawCity(ctx, w, h, p) {
  fillGrad(ctx, 0, 0, w, h, p.colors[0], mix(p.colors[0], p.colors[1], 0.4), true)
  sun(ctx, w * 0.78, h * 0.22, 18, p.colors[1])
  const heights = [0.45, 0.32, 0.5, 0.28, 0.4, 0.34, 0.48]
  heights.forEach((hh, i) => {
    const x = w * (0.08 + i * 0.13)
    const y = h * (0.35 + hh)
    ctx.fillStyle = i % 2 ? p.colors[2] : mix(p.colors[2], '#000', 0.2)
    ctx.fillRect(x, y, w * 0.1, h - y)
    ctx.fillStyle = p.colors[1]
    ctx.globalAlpha = 0.55
    for (let r = 0; r < 4; r += 1) {
      ctx.fillRect(x + 6, y + 10 + r * 14, 8, 8)
    }
    ctx.globalAlpha = 1
  })
  if (p.id === 'castle') {
    ctx.fillStyle = p.colors[1]
    ctx.fillRect(w * 0.38, h * 0.4, 70, h * 0.4)
    ctx.beginPath()
    ctx.moveTo(w * 0.38, h * 0.4)
    ctx.lineTo(w * 0.5, h * 0.26)
    ctx.lineTo(w * 0.38 + 70, h * 0.4)
    ctx.fill()
  }
}

function drawPond(ctx, w, h, p) {
  fillGrad(ctx, 0, 0, w, h, '#bbf7d0', p.colors[2], true)
  oval(ctx, w * 0.5, h * 0.62, w * 0.42, h * 0.22, mix(p.colors[2], '#fff', 0.2))
  oval(ctx, w * 0.34, h * 0.64, 18, 8, p.colors[1])
  oval(ctx, w * 0.58, h * 0.7, 16, 7, '#fb923c')
  oval(ctx, w * 0.22, h * 0.4, 26, 10, '#4ade80')
  oval(ctx, w * 0.7, h * 0.36, 22, 9, '#86efac')
}

function drawGarden(ctx, w, h, p) {
  fillGrad(ctx, 0, 0, w, h, '#e0f2fe', p.colors[0], true)
  hills(ctx, w, h, h * 0.68, p.colors[2], 10)
  for (let i = 0; i < 12; i += 1) {
    const x = w * (0.1 + (i % 6) * 0.15)
    const y = h * (0.45 + Math.floor(i / 6) * 0.18)
    oval(ctx, x, y, 14, 14, i % 2 ? p.colors[1] : p.colors[0])
    ctx.fillStyle = '#365314'
    ctx.fillRect(x - 2, y, 4, 22)
  }
  if (p.id === 'peacock') {
    oval(ctx, w * 0.5, h * 0.55, 70, 50, p.colors[0])
    oval(ctx, w * 0.5, h * 0.58, 18, 22, p.colors[1])
    oval(ctx, w * 0.5, h * 0.42, 22, 16, p.colors[2])
  }
}

function drawFood(ctx, w, h, p) {
  fillGrad(ctx, 0, 0, w, h, '#fff7ed', p.colors[0], true)
  const colors = ['#f9a8d4', '#67e8f9', '#fde68a', '#c4b5fd', '#86efac']
  for (let i = 0; i < 5; i += 1) {
    oval(ctx, w * 0.5, h * (0.78 - i * 0.1), 48 - i * 4, 16, colors[i])
  }
  oval(ctx, w * 0.5, h * 0.28, 22, 10, '#fb7185')
}

function drawMap(ctx, w, h, p) {
  fillGrad(ctx, 0, 0, w, h, p.colors[0], mix(p.colors[0], p.colors[1], 0.2), true)
  ctx.strokeStyle = p.colors[1]
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(w * 0.12, h * 0.3)
  ctx.bezierCurveTo(w * 0.3, h * 0.1, w * 0.5, h * 0.6, w * 0.82, h * 0.28)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(w * 0.18, h * 0.7)
  ctx.bezierCurveTo(w * 0.4, h * 0.5, w * 0.6, h * 0.85, w * 0.88, h * 0.62)
  ctx.stroke()
  oval(ctx, w * 0.32, h * 0.38, 8, 8, p.colors[2])
  oval(ctx, w * 0.7, h * 0.48, 8, 8, p.colors[2])
  ctx.strokeStyle = p.colors[2]
  ctx.beginPath()
  ctx.arc(w * 0.5, h * 0.52, 36, 0, Math.PI * 2)
  ctx.stroke()
}

function drawPuzzleArt(ctx, w, h, puzzle) {
  const drawers = {
    sky: drawSky,
    mountain: drawMountain,
    sea: drawSea,
    forest: drawForest,
    field: drawField,
    animal: drawAnimal,
    city: drawCity,
    pond: drawPond,
    garden: drawGarden,
    food: drawFood,
    map: drawMap
  }
  const draw = drawers[puzzle.type] || drawSky
  draw(ctx, w, h, puzzle)
}

function getPuzzleById(id) {
  return PUZZLES.find((item) => item.id === id) || PUZZLES[0]
}

function tileBgPos(col, row, cols, rows) {
  const x = cols <= 1 ? 0 : (col / (cols - 1)) * 100
  const y = rows <= 1 ? 0 : (row / (rows - 1)) * 100
  return `${x}% ${y}%`
}

function shuffleOrder(count) {
  const order = []
  for (let i = 0; i < count; i += 1) order.push(i)
  for (let i = count - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = order[i]
    order[i] = order[j]
    order[j] = tmp
  }
  const solved = order.every((v, i) => v === i)
  if (solved && count > 1) {
    const tmp = order[0]
    order[0] = order[1]
    order[1] = tmp
  }
  return order
}

function isSolved(order) {
  return (order || []).every((v, i) => v === i)
}

function buildTiles(order, cols) {
  const rows = cols
  return (order || []).map((source, index) => {
    const sc = source % cols
    const sr = Math.floor(source / cols)
    const dc = index % cols
    const dr = Math.floor(index / cols)
    return {
      index,
      source,
      col: dc,
      row: dr,
      bgPos: tileBgPos(sc, sr, cols, rows)
    }
  })
}

module.exports = {
  PUZZLES,
  getPuzzleById,
  drawPuzzleArt,
  tileBgPos,
  shuffleOrder,
  isSolved,
  buildTiles
}
