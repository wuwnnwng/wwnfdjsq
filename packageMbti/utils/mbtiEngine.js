const { QUESTIONS } = require('../data/questions')
const { TYPES, GROUPS, GROUP_ORDER, FUNCTIONS } = require('../data/types')

const WEIGHTS = [2, 1, 0, -1, -2]
const ROLES = ['主导', '辅助', '第三', '劣势']
const OPPOSITE = { E: 'I', I: 'E', S: 'N', N: 'S', T: 'F', F: 'T', J: 'P', P: 'J' }

const AXES = [
  {
    id: 'EI',
    title: '能量来源',
    letters: [
      { id: 'E', name: '外向' },
      { id: 'I', name: '内向' }
    ]
  },
  {
    id: 'SN',
    title: '信息偏好',
    letters: [
      { id: 'S', name: '实感' },
      { id: 'N', name: '直觉' }
    ]
  },
  {
    id: 'TF',
    title: '决策方式',
    letters: [
      { id: 'T', name: '思考' },
      { id: 'F', name: '情感' }
    ]
  },
  {
    id: 'JP',
    title: '生活节奏',
    letters: [
      { id: 'J', name: '判断' },
      { id: 'P', name: '感知' }
    ]
  }
]

const TYPE_MAP = {}
TYPES.forEach((item) => {
  TYPE_MAP[item.code] = item
})

function getType(code) {
  return TYPE_MAP[String(code || '').toUpperCase()] || null
}

function questionRank(item) {
  if (item.quick) return 1
  if (item.deep) return 3
  return 2
}

function normalizeMode(mode) {
  if (mode === 'quick' || mode === 'deep') return mode
  return 'standard'
}

function modeRank(mode) {
  if (mode === 'quick') return 1
  if (mode === 'deep') return 3
  return 2
}

function buildQuiz(mode) {
  const rank = modeRank(mode)
  const pools = {}
  AXES.forEach((axis) => {
    pools[axis.id] = QUESTIONS.filter((item) => item.axis === axis.id && questionRank(item) <= rank)
  })
  const max = AXES.reduce((size, axis) => Math.max(size, pools[axis.id].length), 0)
  const list = []
  for (let i = 0; i < max; i += 1) {
    AXES.forEach((axis) => {
      if (pools[axis.id][i]) list.push(pools[axis.id][i])
    })
  }
  return list
}

function getModes() {
  return [
    {
      id: 'quick',
      name: '快速版',
      time: '约 3 分钟',
      desc: '先抓住大方向',
      count: buildQuiz('quick').length
    },
    {
      id: 'standard',
      name: '标准版',
      time: '约 6 分钟',
      desc: '四个维度更稳',
      badge: '更准',
      recommend: true,
      count: buildQuiz('standard').length
    },
    {
      id: 'deep',
      name: '深度版',
      time: '约 10 分钟',
      desc: '情境更全，偏好更稳',
      badge: '深度',
      premium: true,
      count: buildQuiz('deep').length
    }
  ]
}

function modeName(mode) {
  if (mode === 'quick') return '快速版'
  if (mode === 'deep') return '深度版'
  return '标准版'
}

function clarityOf(percent, tie) {
  if (tie || percent < 56) return '均衡'
  if (percent >= 76) return '鲜明'
  if (percent >= 64) return '清楚'
  return '轻微'
}

function makeDim(axis, winnerId, winnerPercent) {
  const left = axis.letters[0]
  const right = axis.letters[1]
  const safe = Math.max(50, Math.min(100, Math.round(Number(winnerPercent) || 50)))
  const winner = winnerId === left.id ? left : right
  const leftPercent = winner.id === left.id ? safe : 100 - safe
  const rightPercent = 100 - leftPercent
  const tie = leftPercent === rightPercent
  const percent = tie ? 50 : Math.max(leftPercent, rightPercent)
  return {
    key: axis.id,
    title: axis.title,
    leftLetter: left.id,
    leftName: left.name,
    leftPercent,
    leftWin: !tie && winner.id === left.id,
    rightLetter: right.id,
    rightName: right.name,
    rightPercent,
    rightWin: !tie && winner.id === right.id,
    winner: winner.id,
    winnerName: winner.name,
    percent,
    winnerSide: winner.id === left.id ? 'left' : 'right',
    fillFrom: tie || winner.id === left.id ? 'left' : 'right',
    fillPercent: tie ? 100 : percent,
    clarity: clarityOf(percent, tie),
    tie
  }
}

function scoreAxis(axis, quiz, answers) {
  const leftId = axis.letters[0].id
  const rightId = axis.letters[1].id
  let leftScore = 0
  let rightScore = 0
  let neutral = 0
  let answered = 0
  quiz.forEach((question) => {
    if (question.axis !== axis.id) return
    const idx = answers[question.id]
    if (typeof idx !== 'number' || idx < 0 || idx > 4) return
    answered += 1
    const weight = WEIGHTS[idx]
    if (!weight) {
      if (idx === 2) neutral += 1
      return
    }
    const toward = weight > 0 ? question.pole : OPPOSITE[question.pole]
    const mag = Math.abs(weight)
    if (toward === leftId) leftScore += mag
    else if (toward === rightId) rightScore += mag
  })
  const total = leftScore + rightScore
  const leftPercent = total ? Math.round((leftScore / total) * 100) : 50
  const rightPercent = total ? 100 - leftPercent : 50
  const winnerId = leftPercent > rightPercent ? leftId : rightId
  return {
    dim: makeDim(axis, winnerId, Math.max(leftPercent, rightPercent)),
    neutral,
    answered
  }
}

function cloneGroup(group) {
  return {
    id: group.id,
    name: group.name,
    mark: group.mark,
    blurb: group.blurb,
    color: group.color,
    color2: group.color2,
    ink: group.ink,
    card: group.card,
    cardInk: group.cardInk
  }
}

function linkType(entry) {
  const code = typeof entry === 'string' ? entry : entry.code
  const type = getType(code)
  if (!type) return null
  const group = GROUPS[type.group]
  return {
    code: type.code,
    name: type.name,
    color: group.color,
    ink: group.ink,
    line: (entry && entry.line) || ''
  }
}

function presentType(type) {
  const group = GROUPS[type.group]
  const functions = (type.functions || []).map((id, index) => {
    const info = FUNCTIONS[id] || { name: id, blurb: '' }
    return {
      code: id,
      name: info.name,
      blurb: info.blurb,
      role: ROLES[index] || ''
    }
  })
  return {
    code: type.code,
    name: type.name,
    motto: type.motto,
    keywords: type.keywords || [],
    summary: type.summary,
    strengths: type.strengths || [],
    blinds: type.blinds || [],
    work: type.work,
    careers: type.careers || [],
    relation: type.relation,
    love: type.love,
    advice: type.advice,
    figures: type.figures || [],
    ratioText: type.ratioText || '',
    letters: type.code.split(''),
    group: cloneGroup(group),
    functions,
    stackText: functions.slice(0, 2).map((item) => `${item.role} ${item.code}`).join(' · '),
    best: (type.best || []).map(linkType).filter(Boolean),
    grow: (type.grow || []).map(linkType).filter(Boolean),
    siblings: TYPES.filter((item) => item.group === type.group && item.code !== type.code).map(linkType).filter(Boolean)
  }
}

function focusOf(dims) {
  let top = null
  dims.forEach((dim) => {
    if (dim.tie) return
    if (!top || dim.percent > top.percent) top = dim
  })
  if (!top || top.clarity === '均衡' || top.clarity === '轻微') return ''
  return `最鲜明的偏好是${top.winnerName} ${top.percent}%`
}

function portraitOf(dims) {
  if (!dims || !dims.length) return ''
  return `${dims.map((dim) => `${dim.title}偏${dim.winnerName}`).join('，')}。`
}

function formatWhen(ts) {
  const time = Number(ts) || Date.now()
  const date = new Date(time)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  if (day === start) return '今天'
  if (day === start - 86400000) return '昨天'
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function buildResult(quiz, answers, mode, at) {
  let neutral = 0
  let answered = 0
  const dims = AXES.map((axis) => {
    const scored = scoreAxis(axis, quiz || [], answers || {})
    neutral += scored.neutral
    answered += scored.answered
    return scored.dim
  })
  const code = dims.map((dim) => dim.winner).join('')
  const type = getType(code) || TYPES[0]
  const result = presentType(type)
  const notes = []
  if (answered && neutral / answered >= 0.3) {
    notes.push('「说不准」偏多，字母会更靠近中间。换个状态再测，并尽量少选中立，会更清楚。')
  }
  const close = dims.some((dim) => dim.clarity === '轻微' || dim.clarity === '均衡')
  if (mode === 'quick' && close) {
    notes.push('有的维度还很接近。标准版或深度版题量更多，通常能把这种摇摆拉开。')
  } else if (mode === 'standard' && close) {
    notes.push('有的维度还很接近。深度版覆盖更多生活情境，通常能把这种摇摆拉开。')
  }
  const stamp = Number(at) || Date.now()
  result.dims = dims
  result.notes = notes
  result.focus = focusOf(dims)
  result.portrait = portraitOf(dims)
  result.preview = false
  result.shared = false
  result.mode = normalizeMode(mode)
  result.meta = `${modeName(result.mode)} · ${(quiz || []).length}题 · ${formatWhen(stamp)}`
  result.at = stamp
  return result
}

function buildPreview(code) {
  const type = getType(code)
  if (!type) return null
  const result = presentType(type)
  result.dims = []
  result.notes = []
  result.focus = ''
  result.portrait = ''
  result.preview = true
  result.shared = false
  result.mode = ''
  result.meta = '类型图鉴'
  result.at = 0
  return result
}

function parsePercents(raw) {
  const parts = String(raw || '').split('-')
  if (parts.length !== 4) return null
  const nums = parts.map((item) => Number(item))
  if (nums.some((num) => !isFinite(num) || num < 50 || num > 100)) return null
  return nums
}

function buildSharedResult(code, raw) {
  const type = getType(code)
  const percents = parsePercents(raw)
  if (!type || !percents) return null
  const letters = type.code.split('')
  const result = presentType(type)
  result.dims = AXES.map((axis, index) => makeDim(axis, letters[index], percents[index]))
  result.notes = []
  result.focus = focusOf(result.dims)
  result.portrait = portraitOf(result.dims)
  result.preview = false
  result.shared = true
  result.mode = ''
  result.meta = '好友的结果'
  result.at = 0
  return result
}

function getAtlas() {
  return GROUP_ORDER.map((id) => {
    const group = GROUPS[id]
    return {
      id,
      name: group.name,
      mark: group.mark,
      blurb: group.blurb,
      color: group.color,
      color2: group.color2,
      ink: group.ink,
      types: TYPES.filter((item) => item.group === id).map((item) => ({
        code: item.code,
        name: item.name
      }))
    }
  })
}

function summarizeHistory(item) {
  if (!item) return null
  const type = getType(item.code)
  if (!type) return null
  const group = GROUPS[type.group]
  return {
    at: item.at,
    code: type.code,
    name: item.name || type.name,
    color: group.color,
    ink: group.ink,
    when: formatWhen(item.at)
  }
}

function describeDraft(draft) {
  if (!draft || !draft.answers || typeof draft.answers !== 'object') return ''
  const count = Object.keys(draft.answers).filter((key) => typeof draft.answers[key] === 'number').length
  if (!count) return ''
  const total = buildQuiz(draft.mode).length
  return `继续${modeName(draft.mode)} · 已答 ${Math.min(count, total)}/${total}`
}

function firstOpenIndex(quiz, answers) {
  for (let i = 0; i < quiz.length; i += 1) {
    if (typeof answers[quiz[i].id] !== 'number') return i
  }
  return quiz.length
}

function formatClipboard(result) {
  if (!result) return ''
  const lines = [`${result.code} ${result.name}`, result.motto || '', '']
  if (result.dims && result.dims.length) {
    result.dims.forEach((dim) => {
      lines.push(`${dim.leftName} ${dim.leftPercent}%    ${dim.rightName} ${dim.rightPercent}%`)
    })
    lines.push('')
  }
  if (result.summary) {
    lines.push(result.summary)
    lines.push('')
  }
  lines.push('免责声明：趣味自测，仅供参考，非心理诊断，也不是 MBTI 官方测评。')
  lines.push('16型人格测试 · 小小便民工具箱')
  return lines.join('\n')
}

function shareQuery(result) {
  if (!result || !result.code) return ''
  if (result.preview || !result.dims || !result.dims.length) return `code=${result.code}`
  return `code=${result.code}&d=${result.dims.map((dim) => dim.percent).join('-')}`
}

module.exports = {
  AXES,
  getType,
  buildQuiz,
  getModes,
  buildResult,
  buildPreview,
  buildSharedResult,
  getAtlas,
  summarizeHistory,
  describeDraft,
  firstOpenIndex,
  formatClipboard,
  shareQuery,
  modeName
}
