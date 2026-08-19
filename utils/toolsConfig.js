/**
 * 更多工具：入口列表与路由
 */
const TOOLS = [
  {
    id: 'currency',
    name: '汇率',
    desc: '常见货币换算',
    page: '/pages/tools/converter/converter?type=currency'
  },
  {
    id: 'length',
    name: '长度',
    desc: '米、千米、尺、英里等',
    page: '/pages/tools/converter/converter?type=length'
  },
  {
    id: 'area',
    name: '面积',
    desc: '平方米、亩、坪等',
    page: '/pages/tools/converter/converter?type=area'
  },
  {
    id: 'volume',
    name: '体积',
    desc: '升、毫升、立方米等',
    page: '/pages/tools/converter/converter?type=volume'
  },
  {
    id: 'weight',
    name: '重量',
    desc: '千克、斤、磅等',
    page: '/pages/tools/converter/converter?type=weight'
  },
  {
    id: 'temperature',
    name: '温度',
    desc: '摄氏、华氏、开尔文',
    page: '/pages/tools/converter/converter?type=temperature'
  },
  {
    id: 'speed',
    name: '速度',
    desc: '千米/时、米/秒、节等',
    page: '/pages/tools/converter/converter?type=speed'
  },
  {
    id: 'pressure',
    name: '压强',
    desc: '帕、千帕、标准大气压等',
    page: '/pages/tools/converter/converter?type=pressure'
  },
  {
    id: 'power',
    name: '功率',
    desc: '瓦、千瓦、马力等',
    page: '/pages/tools/converter/converter?type=power'
  },
  {
    id: 'base',
    name: '进制',
    desc: '二/八/十/十六进制互转',
    page: '/pages/tools/base/base'
  },
  {
    id: 'calc',
    name: '算术计算器',
    desc: '加减乘除与百分比',
    page: '/pages/tools/calc/calc'
  }
]

function getToolById(id) {
  return TOOLS.find((item) => item.id === id) || null
}

module.exports = {
  TOOLS,
  getToolById
}
