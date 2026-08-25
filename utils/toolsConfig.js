/**
 * 更多工具：入口列表与路由
 */
const TOOLS_HUB_SEEN_KEY = 'toolsHubSeen'
const FEATURED_IDS = ['fitout', 'tax', 'age']

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
    icon: '🧊',
    iconType: 'volume',
    page: '/pages/tools/converter/converter?type=volume'
  },
  {
    id: 'weight',
    name: '重量',
    icon: '⚖️',
    iconType: 'weight',
    page: '/pages/tools/converter/converter?type=weight'
  },
  {
    id: 'temperature',
    name: '温度',
    icon: '🌡️',
    iconType: 'temperature',
    page: '/pages/tools/converter/converter?type=temperature'
  },
  {
    id: 'speed',
    name: '速度',
    icon: '🏎️',
    iconType: 'speed',
    page: '/pages/tools/converter/converter?type=speed'
  },
  {
    id: 'pressure',
    name: '压强',
    icon: '🎛️',
    iconType: 'pressure',
    page: '/pages/tools/converter/converter?type=pressure'
  },
  {
    id: 'power',
    name: '功率',
    icon: '⚡',
    iconType: 'power',
    page: '/pages/tools/converter/converter?type=power'
  },
  {
    id: 'base',
    name: '进制',
    icon: '🔢',
    iconType: 'base',
    page: '/pages/tools/base/base'
  },
  {
    id: 'length',
    name: '长度',
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

function getFeaturedTools() {
  return FEATURED_IDS.map((id) => {
    const item = getToolById(id)
    if (!item) return null
    return {
      id: item.id,
      name: item.name,
      shortName: item.shortName || item.name,
      icon: item.icon,
      iconType: item.iconType,
      page: item.page
    }
  }).filter(Boolean)
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
  getToolById,
  searchTools,
  getFeaturedTools,
  hasSeenToolsHub,
  markToolsHubSeen
}
