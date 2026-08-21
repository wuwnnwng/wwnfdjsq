/**
 * 更多工具：入口列表与路由
 */
const TOOLS_HUB_SEEN_KEY = 'toolsHubSeen'
const FEATURED_IDS = ['calendar', 'fitout', 'tax']

const TOOLS = [
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
    id: 'tax',
    name: '工资个税',
    shortName: '工资个税',
    icon: '🧾',
    iconType: 'tax',
    page: '/pages/tools/tax/tax'
  },
  {
    id: 'fitout',
    name: '装修材料',
    shortName: '装修材料',
    icon: '🧱',
    iconType: 'fitout',
    page: '/pages/tools/fitout/fitout'
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
  getFeaturedTools,
  hasSeenToolsHub,
  markToolsHubSeen
}
