/**
 * 掷骰子 / 投硬币
 */

const DICE_PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
}

const MIN_DICE = 1
const MAX_DICE = 6

function clampDiceCount(count) {
  const n = Math.floor(Number(count))
  if (!Number.isFinite(n)) return MIN_DICE
  return Math.min(MAX_DICE, Math.max(MIN_DICE, n))
}

function buildDie(value) {
  const n = Math.min(6, Math.max(1, Number(value) || 1))
  const on = DICE_PIPS[n] || []
  const pips = []
  for (let i = 0; i < 9; i += 1) {
    pips.push({ key: `${n}-${i}`, on: on.indexOf(i) >= 0 })
  }
  return { value: n, pips }
}

function rollDice(count) {
  const n = clampDiceCount(count)
  const dice = []
  for (let i = 0; i < n; i += 1) {
    dice.push(buildDie(1 + Math.floor(Math.random() * 6)))
  }
  const sum = dice.reduce((acc, item) => acc + item.value, 0)
  const valuesText = dice.map((item) => item.value).join(' + ')
  return {
    dice,
    sum,
    valuesText,
    title: n === 1 ? '骰子' : `骰子 ×${n}`,
    valueText: n === 1 ? String(sum) : `${valuesText} = ${sum}`
  }
}

function flipCoin() {
  const heads = Math.random() < 0.5
  return {
    heads,
    title: '硬币',
    valueText: heads ? '正面' : '反面',
    faceText: heads ? '正' : '反'
  }
}

module.exports = {
  MIN_DICE,
  MAX_DICE,
  clampDiceCount,
  buildDie,
  rollDice,
  flipCoin
}
