const HINTS = [
  '必须',
  '不要',
  '不能',
  '务必',
  '优先',
  '一定',
  '关键',
  '排除',
  '先看',
  '先定',
  '先找',
  '先读',
  '材料',
  '原文',
  '题干',
  '论点',
  '论据',
  '基期',
  '现期',
  '转折',
  '对策',
  '主体',
  '范围',
  '单位',
  '原词',
  '拆桥',
  '搭桥',
  '逆否',
  '种属',
  '组成'
]

function uniqLongestFirst(list) {
  const seen = {}
  const out = []
  list.forEach((item) => {
    const text = String(item || '').trim()
    if (!text || text.length < 2 || seen[text]) return
    seen[text] = true
    out.push(text)
  })
  out.sort((a, b) => b.length - a.length)
  return out
}

function collectKeys(title, tag) {
  const keys = HINTS.slice()
  if (tag) keys.push(tag)
  String(title || '')
    .split(/[，、。；：\s·/]+/)
    .forEach((part) => {
      if (part.length >= 2) keys.push(part)
    })
  return uniqLongestFirst(keys)
}

function toParts(body, title, tag) {
  const text = String(body || '')
  const keys = collectKeys(title, tag)
  if (!text) return [{ text: '', em: false }]
  if (!keys.length) return [{ text, em: false }]
  const escaped = keys.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(escaped.join('|'), 'g')
  const parts = []
  let last = 0
  let match = re.exec(text)
  while (match) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), em: false })
    parts.push({ text: match[0], em: true })
    last = match.index + match[0].length
    match = re.exec(text)
  }
  if (last < text.length) parts.push({ text: text.slice(last), em: false })
  return parts.length ? parts : [{ text, em: false }]
}

function pack(rows) {
  return (rows || []).map((row, i) => ({
    no: String(i + 1).padStart(2, '0'),
    tag: row[0],
    title: row[1],
    body: row[2],
    parts: toParts(row[2], row[1], row[0])
  }))
}

module.exports = { pack, toParts }
