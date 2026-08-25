const DEFAULT_COLORS = ['#f472b6', '#fb7185', '#fbbf24', '#34d399', '#60a5fa', '#c084fc', '#fb923c', '#f9a8d4']
const DEFAULT_FLOWERS = ['🌸', '🌺', '🌼', '💮', '🌷', '🌹', '✨']

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function createConfettiPieces(options) {
  const colors = (options && options.colors) || DEFAULT_COLORS
  const flowers = (options && options.flowers) || DEFAULT_FLOWERS
  const pieces = []
  let id = 0
  for (let i = 0; i < 20; i += 1) {
    const size = Math.round(rand(28, 46))
    pieces.push({
      id: id++,
      mode: 'burst',
      fall: i % 8,
      kind: 'flower',
      left: 50,
      top: '44%',
      delay: Math.round(rand(0, 0.22) * 100) / 100,
      duration: Math.round(rand(1.35, 2.15) * 100) / 100,
      color: 'transparent',
      size,
      height: size,
      emoji: flowers[i % flowers.length]
    })
  }
  for (let i = 0; i < 36; i += 1) {
    const isFlower = i % 4 === 0
    const size = Math.round(isFlower ? rand(24, 40) : rand(10, 18))
    pieces.push({
      id: id++,
      mode: 'rain',
      fall: i % 3,
      kind: isFlower ? 'flower' : i % 2 === 0 ? 'rect' : 'dot',
      left: Math.round(rand(2, 98)),
      top: '-48rpx',
      delay: Math.round(rand(0, 1.5) * 100) / 100,
      duration: Math.round(rand(2.3, 4.1) * 100) / 100,
      color: isFlower ? 'transparent' : colors[i % colors.length],
      size,
      height: isFlower ? size : Math.round(size * (i % 2 === 0 ? 1.7 : 1)),
      emoji: isFlower ? flowers[i % flowers.length] : ''
    })
  }
  return pieces
}

module.exports = {
  createConfettiPieces
}
