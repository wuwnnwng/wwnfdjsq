/**
 * 更多工具：入口列表与路由
 */
const TOOLS = [
  {
    id: 'calendar',
    name: '我的日历',
    icon: '📅',
    iconType: 'calendar',
    page: '/pages/tools/calendar/calendar'
  },
  {
    id: 'calc',
    name: '算术计算器',
    icon: '🧮',
    iconType: 'calc',
    page: '/pages/tools/calc/calc'
  },
  {
    id: 'currency',
    name: '汇率',
    icon: '💱',
    iconType: 'currency',
    page: '/pages/tools/converter/converter?type=currency'
  },
  {
    id: 'area',
    name: '面积',
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

module.exports = {
  TOOLS,
  getToolById
}
