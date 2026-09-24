/**
 * 更多工具：入口列表与路由
 */
const TOOLS_HUB_SEEN_KEY = 'toolsHubSeen'

const CATEGORIES = [
  { id: 'travel', name: '出行', toolIds: ['fuel', 'oilprice', 'toll'] },
  { id: 'house', name: '房产生活', toolIds: ['mortgage', 'fitout', 'housetax', 'tax'] },
  { id: 'fun', name: '娱乐', toolIds: ['mbti', 'chance', 'drinkwheel', 'footprint', 'canvas', 'puzzle'] },
  { id: 'daily', name: '日常工具', toolIds: ['ershou', 'retire', 'pension', 'calendar', 'weather', 'qrcode', 'bmi', 'diet', 'exam'] },
  { id: 'calc', name: '计算工具', toolIds: ['safeperiod', 'duedate', 'age', 'datetime', 'anniversary', 'calc', 'compound', 'rmb', 'percent', 'base', 'currency', 'unit'] }
]

const TOOLS = [
  {
    id: 'ershou',
    name: '同城二手',
    shortName: '同城二手',
    icon: '🛍️',
    iconType: 'ershou',
    keywords: '同城二手闲置转卖二手交易跳蚤市场',
    miniProgramAppId: 'wx663931c101197d69'
  },
  {
    id: 'mortgage',
    name: '房贷计算',
    shortName: '房贷',
    icon: '🏠',
    iconType: 'mortgage',
    keywords: '房贷公积金商贷组合贷等额本息等额本金提前还款LPR月供',
    page: '/pages/tools/mortgage/mortgage'
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
    id: 'anniversary',
    name: '纪念日倒计时',
    shortName: '纪念日',
    icon: '🎉',
    iconType: 'anniversary',
    keywords: '纪念日倒计时恋爱结婚生日相识周年撒花',
    page: '/pages/tools/anniversary/anniversary'
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
    keywords: '年龄周岁虚岁生日天数生肖星座恋爱交心配对',
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
    id: 'diet',
    name: '减脂饮食搭配',
    shortName: '减脂餐',
    icon: '🥗',
    iconType: 'diet',
    keywords: '减脂饮食搭配减肥餐热量卡路里TDEEBMR蛋白质碳水脂肪食谱三餐高蛋白素食',
    page: '/pages/tools/diet/diet'
  },
  {
    id: 'fuel',
    name: '汽车油耗电耗',
    shortName: '油耗电耗',
    icon: '🚗',
    iconType: 'fuel',
    keywords: '出行汽车油耗电耗百公里油耗电耗加油充电油价电价燃油纯电花费今日油价',
    page: '/packageTravel/pages/fuel/fuel'
  },
  {
    id: 'oilprice',
    name: '今日油价',
    shortName: '今日油价',
    icon: '⛽',
    iconType: 'oilprice',
    keywords: '出行今日油价汽油柴油92号95号98号加油挂牌价各省油价',
    page: '/packageTravel/pages/oilprice/oilprice'
  },
  {
    id: 'toll',
    name: '高速过路费估算',
    shortName: '过路费',
    icon: '🛣️',
    iconType: 'toll',
    keywords: '出行高速过路费估算计算器ETC通行费桥梁隧道一类客车节假日免费收费站',
    page: '/packageTravel/pages/toll/toll'
  },
  {
    id: 'compound',
    name: '复利计算器',
    shortName: '复利',
    icon: '📈',
    iconType: 'compound',
    keywords: '复利理财本金年利率存款投资利息滚存',
    page: '/pages/tools/compound/compound'
  },
  {
    id: 'duedate',
    name: '预产期计算器',
    shortName: '预产期',
    icon: '🍼',
    iconType: 'duedate',
    keywords: '预产期孕周怀孕末次月经分娩产检',
    page: '/pages/tools/duedate/duedate'
  },
  {
    id: 'safeperiod',
    name: '安全期计算器',
    shortName: '安全期',
    icon: '🌙',
    iconType: 'safeperiod',
    keywords: '安全期排卵易孕月经周期生理期避孕',
    page: '/pages/tools/safeperiod/safeperiod'
  },
  {
    id: 'retire',
    name: '退休年龄',
    shortName: '退休年龄',
    icon: '⏰',
    iconType: 'retire',
    keywords: '退休年龄延迟退休法定退休社保缴费年限女干部女职工灵活就业企业男职工养老金',
    page: '/pages/tools/retire/retire'
  },
  {
    id: 'pension',
    name: '养老金估算',
    shortName: '养老金',
    icon: '🏦',
    iconType: 'pension',
    keywords: '养老金退休社保缴费基数社平工资替代率灵活就业城乡居民自己交社保',
    page: '/pages/tools/pension/pension'
  },
  {
    id: 'canvas',
    name: '画布',
    shortName: '画布',
    icon: '🎨',
    iconType: 'canvas',
    keywords: '画布涂鸦绘画调色会话画板草稿卡片',
    page: '/pages/tools/canvas/canvas'
  },
  {
    id: 'puzzle',
    name: '拼图',
    shortName: '拼图',
    icon: '🧩',
    iconType: 'puzzle',
    keywords: '拼图游戏切图益智卡片',
    page: '/pages/tools/puzzle/puzzle'
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
    id: 'unit',
    name: '单位换算',
    shortName: '换算',
    icon: '📏',
    iconType: 'unit',
    keywords: '单位换算长度面积体积重量体重温度速度压强功率公斤斤磅千克毫米厘米米亩坪公顷升毫升瓦千瓦马力',
    page: '/pages/tools/converter/converter'
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
    id: 'mbti',
    name: 'MBTI性格测试',
    shortName: 'MBTI',
    icon: '🧠',
    iconType: 'mbti',
    keywords: 'MBTI性格测试16型人格四字母INTJ INTP ENTJ ENTP INFJ INFP ENFJ ENFP ISTJ ISFJ ESTJ ESFJ ISTP ISFP ESTP ESFP人格性格',
    page: '/packageMbti/pages/mbti/mbti'
  },
  {
    id: 'chance',
    name: '掷骰子/投硬币',
    shortName: '骰子硬币',
    icon: '🎲',
    iconType: 'chance',
    keywords: '掷骰子投硬币抛硬币骰子点数正反面随机娱乐聚会',
    page: '/pages/tools/chance/chance'
  },
  {
    id: 'drinkwheel',
    name: '喝酒转盘',
    shortName: '喝酒转盘',
    icon: '🎡',
    iconType: 'drinkwheel',
    keywords: '喝酒转盘酒桌游戏真心话大冒险惩罚转盘聚会娱乐',
    page: '/pages/tools/drinkwheel/drinkwheel'
  },
  {
    id: 'footprint',
    name: '足迹地图',
    shortName: '足迹',
    icon: '🗺️',
    iconType: 'footprint',
    keywords: '足迹地图点亮省份去过旅行中国地图高德',
    page: '/packageFootprint/pages/footprint/footprint'
  },
  {
    id: 'exam',
    name: '公考题型技巧',
    shortName: '公考技巧',
    icon: '📘',
    iconType: 'exam',
    keywords: '公考行测申论常识言语数量判断资料概括对策公文大作文答题技巧',
    page: '/packageExam/pages/exam/exam'
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

function openMiniProgram(appId) {
  const id = String(appId || '').trim()
  if (!id || id === 'undefined' || id === 'null') return false
  wx.navigateToMiniProgram({
    appId: id,
    envVersion: 'release',
    fail(err) {
      const msg = (err && err.errMsg) || ''
      if (msg.indexOf('cancel') >= 0) return
      wx.showToast({ title: '暂无法打开该小程序', icon: 'none' })
    }
  })
  return true
}

function openToolItem(item) {
  if (!item) {
    wx.showToast({ title: '暂无工具', icon: 'none' })
    return
  }
  if (openMiniProgram(item.miniProgramAppId)) return
  if (item.page) {
    wx.navigateTo({ url: item.page })
    return
  }
  wx.showToast({ title: '暂无法打开', icon: 'none' })
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
  openToolItem,
  hasSeenToolsHub,
  markToolsHubSeen
}
