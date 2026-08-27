/**
 * 更多工具：入口列表与路由
 */
const TOOLS_HUB_SEEN_KEY = 'toolsHubSeen'
const FEATURED_IDS = ['fitout', 'housetax', 'age', 'calendar', 'qrcode', 'bmi', 'weight']
const FEATURED_PAGE_SIZE = 4

const CATEGORIES = [
  { id: 'house', name: '房产生活', toolIds: ['fitout', 'housetax', 'tax'] },
  { id: 'daily', name: '日常工具', toolIds: ['calendar', 'weather', 'qrcode', 'datetime', 'age', 'bmi'] },
  { id: 'calc', name: '计算工具', toolIds: ['calc', 'rmb', 'percent', 'base'] },
  { id: 'unit', name: '单位换算', toolIds: ['currency', 'length', 'area', 'volume', 'weight', 'temperature', 'speed', 'pressure', 'power'] }
]

const TOOLS = [
  {
    id: 'fitout',
    name: '装修材料',
    shortName: '装修材料',
    icon: '🧱',
    iconType: 'fitout',
    page: '/pages/tools/fitout/fitout'
  },
  {
    id: 'tax',
    name: '工资个税',
    shortName: '工资个税',
    icon: '🧾',
    iconType: 'tax',
    page: '/pages/tools/tax/tax'
  },
  {
    id: 'housetax',
    name: '房产交易税',
    shortName: '房产交易税',
    icon: '🏡',
    iconType: 'housetax',
    keywords: '房产交易税契税增值税个税买房卖房税费满五唯一印花税购房',
    page: '/pages/tools/housetax/housetax'
  },
  {
    id: 'datetime',
    name: '日期时间',
    shortName: '日期时间',
    icon: '⏳',
    iconType: 'datetime',
    page: '/pages/tools/datetime/datetime'
  },
  {
    id: 'calendar',
    name: '我的日历',
    shortName: '日历',
    icon: '📅',
    iconType: 'calendar',
    page: '/pages/tools/calendar/calendar'
  },
  {
    id: 'weather',
    name: '天气',
    shortName: '天气',
    icon: '🌤️',
    iconType: 'weather',
    page: '/pages/tools/weather/weather'
  },
  {
    id: 'calc',
    name: '算术计算器',
    shortName: '计算器',
    icon: '🧮',
    iconType: 'calc',
    page: '/pages/tools/calc/calc'
  },
  {
    id: 'qrcode',
    name: '二维码',
    shortName: '二维码',
    icon: '🔳',
    iconType: 'qrcode',
    page: '/pages/tools/qrcode/qrcode'
  },
  {
    id: 'rmb',
    name: '人民币大写',
    shortName: '人民币大写',
    icon: '¥',
    iconType: 'rmb',
    keywords: '人民币大写金额收据合同壹贰',
    page: '/pages/tools/rmb/rmb'
  },
  {
    id: 'percent',
    name: '百分比',
    shortName: '百分比',
    icon: '％',
    iconType: 'percent',
    keywords: '百分比折扣增减占比税率',
    page: '/pages/tools/percent/percent'
  },
  {
    id: 'age',
    name: '年龄',
    shortName: '年龄',
    icon: '🎂',
    iconType: 'age',
    keywords: '年龄周岁虚岁生日天数生肖星座',
    page: '/pages/tools/age/age'
  },
  {
    id: 'bmi',
    name: 'BMI体重',
    shortName: 'BMI',
    icon: '🧍',
    iconType: 'bmi',
    keywords: 'BMI体重身高肥胖超重健康',
    page: '/pages/tools/bmi/bmi'
  },
  {
    id: 'currency',
    name: '汇率',
    shortName: '汇率',
    icon: '💱',
    iconType: 'currency',
    page: '/pages/tools/converter/converter?type=currency'
  },
  {
    id: 'area',
    name: '面积',
    shortName: '面积',
    icon: '📐',
    iconType: 'area',
    page: '/pages/tools/converter/converter?type=area'
  },
  {
    id: 'volume',
    name: '体积',
    shortName: '体积',
    icon: '🧊',
    iconType: 'volume',
    page: '/pages/tools/converter/converter?type=volume'
  },
  {
    id: 'weight',
    name: '重量',
    shortName: '体重',
    icon: '⚖️',
    iconType: 'weight',
    keywords: '重量体重公斤斤磅千克换算',
    page: '/pages/tools/converter/converter?type=weight'
  },
  {
    id: 'temperature',
    name: '温度',
    shortName: '温度',
    icon: '🌡️',
    iconType: 'temperature',
    page: '/pages/tools/converter/converter?type=temperature'
  },
  {
    id: 'speed',
    name: '速度',
    shortName: '速度',
    icon: '🏎️',
    iconType: 'speed',
    page: '/pages/tools/converter/converter?type=speed'
  },
  {
    id: 'pressure',
    name: '压强',
    shortName: '压强',
    icon: '🎛️',
    iconType: 'pressure',
    page: '/pages/tools/converter/converter?type=pressure'
  },
  {
    id: 'power',
    name: '功率',
    shortName: '功率',
    icon: '⚡',
    iconType: 'power',
    page: '/pages/tools/converter/converter?type=power'
  },
  {
    id: 'base',
    name: '进制',
    shortName: '进制',
    icon: '🔢',
    iconType: 'base',
    page: '/pages/tools/base/base'
  },
  {
    id: 'length',
    name: '长度',
    shortName: '长度',
    icon: '📏',
    iconType: 'length',
    page: '/pages/tools/converter/converter?type=length'
  }
]

function getToolById(id) {
  return TOOLS.find((item) => item.id === id) || null
}

function normalizeSearch(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function fuzzyScore(text, query) {
  const source = normalizeSearch(text)
  const needle = normalizeSearch(query)
  if (!source || !needle) return 0
  if (source === needle) return 100
  const index = source.indexOf(needle)
  if (index >= 0) return 80 - index
  let cursor = 0
  for (let i = 0; i < needle.length; i += 1) {
    const found = source.indexOf(needle[i], cursor)
    if (found < 0) return 0
    cursor = found + 1
  }
  return Math.max(10, 40 - (source.length - needle.length))
}

function searchTools(keyword) {
  const query = normalizeSearch(keyword)
  if (!query) return TOOLS.slice()
  return TOOLS.map((item) => {
    const score = Math.max(
      fuzzyScore(item.name, query),
      fuzzyScore(item.shortName || '', query),
      fuzzyScore(item.id, query),
      fuzzyScore(item.keywords || '', query)
    )
    return { item, score }
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'zh-CN'))
    .map((row) => row.item)
}

function toFeaturedChip(item) {
  if (!item) return null
  return {
    id: item.id,
    name: item.name,
    shortName: item.shortName || item.name,
    icon: item.icon,
    iconType: item.iconType,
    page: item.page
  }
}

function getFeaturedTools() {
  return FEATURED_IDS.map((id) => toFeaturedChip(getToolById(id))).filter(Boolean)
}

function padFeaturedPage(page, size) {
  const next = page.slice()
  let pad = 0
  while (next.length < size) {
    pad += 1
    next.push({
      id: `pad-${pad}`,
      isPad: true
    })
  }
  return next
}

function getFeaturedToolPages() {
  const random = {
    id: 'random',
    name: '随机工具',
    shortName: '随机',
    icon: '🎲',
    iconType: 'random',
    isRandom: true
  }
  const more = {
    id: 'more',
    name: '全部',
    shortName: '全部',
    icon: '',
    iconType: 'more',
    page: '/pages/tools/index',
    isMore: true
  }
  const besideMore = ['weather', 'rmb']
    .map((id) => toFeaturedChip(getToolById(id)))
    .filter(Boolean)
  const list = getFeaturedTools().concat(random, besideMore, more)
  const pages = []
  for (let i = 0; i < list.length; i += FEATURED_PAGE_SIZE) {
    const index = i / FEATURED_PAGE_SIZE
    pages.push({
      key: `featured-${index}`,
      tools: padFeaturedPage(list.slice(i, i + FEATURED_PAGE_SIZE), FEATURED_PAGE_SIZE)
    })
  }
  return pages
}

function pickRandomTool() {
  if (!TOOLS.length) return null
  const index = Math.floor(Math.random() * TOOLS.length)
  return TOOLS[index] || null
}

function groupTools(list) {
  const source = Array.isArray(list) ? list : TOOLS
  const byId = {}
  source.forEach((item) => {
    byId[item.id] = item
  })
  const used = new Set()
  const groups = CATEGORIES.map((cat) => {
    const tools = cat.toolIds
      .map((id) => {
        const item = byId[id]
        if (!item) return null
        used.add(id)
        return item
      })
      .filter(Boolean)
    return {
      id: cat.id,
      name: cat.name,
      tools
    }
  }).filter((group) => group.tools.length)

  const rest = source.filter((item) => !used.has(item.id))
  if (rest.length) {
    groups.push({
      id: 'other',
      name: '其他',
      tools: rest
    })
  }
  return groups
}

function hasSeenToolsHub() {
  try {
    return !!wx.getStorageSync(TOOLS_HUB_SEEN_KEY)
  } catch (e) {
    return false
  }
}

function markToolsHubSeen() {
  try {
    wx.setStorageSync(TOOLS_HUB_SEEN_KEY, 1)
  } catch (e) {}
}

module.exports = {
  TOOLS,
  CATEGORIES,
  getToolById,
  searchTools,
  groupTools,
  getFeaturedTools,
  getFeaturedToolPages,
  pickRandomTool,
  hasSeenToolsHub,
  markToolsHubSeen
}
