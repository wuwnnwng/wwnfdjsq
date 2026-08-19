/**
 * 黄历：建除十二神、宜忌、吉日筛选（离线规则，仅供参考）
 */
const { getGanZhiDay, solarToLunar } = require('./lunar')

const JIAN_CHU = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭']

const JIAN_CHU_YI_JI = {
  建: {
    yi: '出行 上任 会友 求职 签约',
    ji: '动土 开仓 嫁娶 开市'
  },
  除: {
    yi: '除旧 沐浴 求医 扫舍 解除',
    ji: '嫁娶 搬家 开市 入宅'
  },
  满: {
    yi: '祈福 祭祀 结亲 开市 纳财',
    ji: '服药 出行 赴任 栽种'
  },
  平: {
    yi: '修造 装修 平整 补垣',
    ji: '开市 交易 嫁娶 破土'
  },
  定: {
    yi: '订婚 订盟 纳采 开业 签约',
    ji: '诉讼 出行 求医 安葬'
  },
  执: {
    yi: '捕捉 渔猎 纳财 执行 订盟',
    ji: '搬家 远行 开市 破土'
  },
  破: {
    yi: '破屋 坏垣 求医 解除',
    ji: '嫁娶 签约 出行 开市'
  },
  危: {
    yi: '安床 入殓 移柩 祭祀',
    ji: '登高 行船 嫁娶 开市'
  },
  成: {
    yi: '结婚 开业 入学 交易 求嗣',
    ji: '诉讼 词讼 破土 安葬'
  },
  收: {
    yi: '收财 纳畜 进人口 入学',
    ji: '开业 求医 出行 安葬'
  },
  开: {
    yi: '开业 出行 嫁娶 搬家 求嗣',
    ji: '安葬 破土 伐木 行丧'
  },
  闭: {
    yi: '筑堤 补穴 收纳 安葬',
    ji: '开业 出行 嫁娶 开市'
  }
}

const AUSPICIOUS_EVENTS = [
  { id: 'marriage', name: '结婚', jianChu: ['成', '定', '开', '满'] },
  { id: 'travel', name: '出行', jianChu: ['开', '除', '定', '成'] },
  { id: 'move', name: '搬新家', jianChu: ['开', '成', '定', '满'] },
  { id: 'alliance', name: '订盟', jianChu: ['定', '成', '开', '满'] },
  { id: 'haircut', name: '理发', jianChu: ['除', '成', '开', '平'] },
  { id: 'business', name: '开业', jianChu: ['成', '开', '满', '定'] },
  { id: 'contract', name: '签约', jianChu: ['成', '定', '开', '执'] },
  { id: 'renovation', name: '装修', jianChu: ['平', '定', '成', '开'] },
  { id: 'pray', name: '祈福', jianChu: ['满', '成', '开', '定'] },
  { id: 'medical', name: '求医', jianChu: ['除', '成', '开', '定'] }
]

function getMonthZhiIndex(year, month) {
  const base = (year - 1900) * 12 + (month - 1)
  return (base + 2) % 12
}

function getDayZhiIndex(year, month, day) {
  const ganZhi = getGanZhiDay(year, month, day)
  const zhi = ganZhi.charAt(1)
  return '子丑寅卯辰巳午未申酉戌亥'.indexOf(zhi)
}

function getJianChu(year, month, day) {
  const monthZhi = getMonthZhiIndex(year, month)
  const dayZhi = getDayZhiIndex(year, month, day)
  const idx = (dayZhi - monthZhi + 12) % 12
  return JIAN_CHU[idx]
}

function getAlmanac(year, month, day) {
  const jianChu = getJianChu(year, month, day)
  const pair = JIAN_CHU_YI_JI[jianChu] || { yi: '诸事皆宜', ji: '诸事不宜' }
  const lunar = solarToLunar(year, month, day)
  return {
    jianChu,
    yi: pair.yi,
    ji: pair.ji,
    yiList: pair.yi.split(/\s+/).filter(Boolean),
    jiList: pair.ji.split(/\s+/).filter(Boolean),
    lunar
  }
}

function isAuspiciousDay(year, month, day, eventId) {
  const event = AUSPICIOUS_EVENTS.find((item) => item.id === eventId)
  if (!event) return false
  const jianChu = getJianChu(year, month, day)
  if (event.jianChu.indexOf(jianChu) < 0) return false
  const ji = (JIAN_CHU_YI_JI[jianChu] && JIAN_CHU_YI_JI[jianChu].ji) || ''
  const conflict = {
    marriage: '嫁娶',
    travel: '出行',
    move: '搬家',
    business: '开业',
    haircut: '理发'
  }
  const key = conflict[eventId]
  if (key && ji.indexOf(key) >= 0) return false
  return true
}

function getAuspiciousDaysInMonth(year, month, eventId) {
  const lastDay = new Date(year, month, 0).getDate()
  const days = []
  for (let d = 1; d <= lastDay; d += 1) {
    if (isAuspiciousDay(year, month, d, eventId)) {
      days.push(d)
    }
  }
  return days
}

function buildHuangliDetail(dayInfo) {
  const almanac = getAlmanac(dayInfo.solarYear, dayInfo.solarMonth, dayInfo.solarDay)
  return {
    solarText: dayInfo.solarText,
    lunarText: dayInfo.lunarText,
    ganZhiYear: dayInfo.ganZhiYear,
    ganZhiDay: dayInfo.ganZhiDay,
    zodiac: dayInfo.zodiac,
    weekday: dayInfo.weekday,
    jianChu: almanac.jianChu,
    yi: almanac.yi,
    ji: almanac.ji,
    yiList: almanac.yiList,
    jiList: almanac.jiList,
    solarTerm: dayInfo.solarTerm
  }
}

module.exports = {
  AUSPICIOUS_EVENTS,
  JIAN_CHU,
  getJianChu,
  getAlmanac,
  isAuspiciousDay,
  getAuspiciousDaysInMonth,
  buildHuangliDetail
}
