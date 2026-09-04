/**
 * 黄历：建除十二神、协纪辨方书宜忌、吉日筛选（离线规则，仅供参考）
 */
const { getGanZhiDay, solarToLunar, getSolarTermDate, getJieMonthZhiIndex } = require('./lunar')
const { buildDayMeta } = require('./almanacDayMeta')
const { buildXieJiYiJi } = require('./almanacYiJi')

const JIAN_CHU = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭']

const JIAN_CHU_DESC = {
  建: '建日万物成立，宜规划开局',
  除: '除日除旧布新，宜清洁整理',
  满: '满日丰盛圆满，宜祈福纳庆',
  平: '平日平稳顺遂，宜修造安和',
  定: '定日安定守成，宜订盟纳采',
  执: '执日固执守成，宜捕捉执行',
  破: '破日破而后立，宜破屋求医',
  危: '危日危中有机，宜安床祭祀',
  成: '成日事成圆满，宜开业婚嫁',
  收: '收日收敛收藏，宜纳财入学',
  开: '开日开通启动，宜出行搬家',
  闭: '闭日闭塞收藏，宜筑堤安葬'
}

const HOUR_SLOTS = [
  { zhi: '子', label: '子时', range: '23:00-00:59' },
  { zhi: '丑', label: '丑时', range: '01:00-02:59' },
  { zhi: '寅', label: '寅时', range: '03:00-04:59' },
  { zhi: '卯', label: '卯时', range: '05:00-06:59' },
  { zhi: '辰', label: '辰时', range: '07:00-08:59' },
  { zhi: '巳', label: '巳时', range: '09:00-10:59' },
  { zhi: '午', label: '午时', range: '11:00-12:59' },
  { zhi: '未', label: '未时', range: '13:00-14:59' },
  { zhi: '申', label: '申时', range: '15:00-16:59' },
  { zhi: '酉', label: '酉时', range: '17:00-18:59' },
  { zhi: '戌', label: '戌时', range: '19:00-20:59' },
  { zhi: '亥', label: '亥时', range: '21:00-22:59' }
]

/** 黄道黑道十二神，按串宫顺序轮值，不可把吉神连排 */
const HOUR_DEITIES = [
  '青龙',
  '明堂',
  '天刑',
  '朱雀',
  '金匮',
  '天德',
  '白虎',
  '玉堂',
  '天牢',
  '玄武',
  '司命',
  '勾陈'
]

const LUCKY_HOUR_DEITIES = {
  青龙: true,
  明堂: true,
  金匮: true,
  天德: true,
  玉堂: true,
  司命: true
}

/**
 * 时辰青龙所在：六冲同局（子午、丑未、寅申、卯酉、辰戌、巳亥）
 * 巳亥日午时起青龙，故辛巳日：巳时勾陈（凶）、未时明堂（吉）
 */
const QING_LONG_HOUR_BY_DAY = {
  子: '申',
  午: '申',
  丑: '戌',
  未: '戌',
  寅: '子',
  申: '子',
  卯: '寅',
  酉: '寅',
  辰: '辰',
  戌: '辰',
  巳: '午',
  亥: '午'
}

const YANG_GONG_DAYS = [
  [1, 13],
  [2, 11],
  [3, 9],
  [4, 7],
  [5, 5],
  [6, 3],
  [7, 1],
  [7, 29],
  [8, 27],
  [9, 25],
  [10, 23],
  [11, 21],
  [12, 19]
]

const SI_JUE_TERMS = [2, 8, 14, 20]
const SI_LI_TERMS = [5, 11, 17, 23]

const EVENT_ACTS = {
  marriage: ['嫁娶'],
  travel: ['出行'],
  move: ['移徙', '入宅'],
  alliance: ['结婚姻', '纳采'],
  haircut: ['剃头'],
  business: ['开市'],
  contract: ['立券', '交易'],
  renovation: ['修造', '动土'],
  pray: ['祈福'],
  medical: ['求医']
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

function isYangGongDay(lunar) {
  if (!lunar) return false
  return YANG_GONG_DAYS.some((item) => item[0] === lunar.lunarMonth && item[1] === lunar.lunarDay)
}

function isPrevDayOfTerm(year, month, day, termIndex) {
  const cur = Date.UTC(year, month - 1, day)
  for (let y = year - 1; y <= year + 1; y += 1) {
    const t = getSolarTermDate(y, termIndex)
    const term = Date.UTC(y, t.month - 1, t.day)
    if (term - cur === 86400000) return true
  }
  return false
}

function isSiJueDay(year, month, day) {
  return SI_JUE_TERMS.some((n) => isPrevDayOfTerm(year, month, day, n))
}

function isSiLiDay(year, month, day) {
  return SI_LI_TERMS.some((n) => isPrevDayOfTerm(year, month, day, n))
}

function isYuePoDay(year, month, day) {
  const monthZhi = getJieMonthZhiIndex(year, month, day)
  const dayZhi = getDayZhiIndex(year, month, day)
  return dayZhi === (monthZhi + 6) % 12
}

function getDayFlags(year, month, day, lunar) {
  return {
    yangGong: isYangGongDay(lunar),
    siJue: isSiJueDay(year, month, day),
    siLi: isSiLiDay(year, month, day),
    yuePo: isYuePoDay(year, month, day)
  }
}

function getMonthZhiIndex(year, month, day) {
  return getJieMonthZhiIndex(year, month, day)
}

function getDayZhiIndex(year, month, day) {
  const ganZhi = getGanZhiDay(year, month, day)
  const zhi = ganZhi.charAt(1)
  return '子丑寅卯辰巳午未申酉戌亥'.indexOf(zhi)
}

function getJianChu(year, month, day) {
  const monthZhi = getMonthZhiIndex(year, month, day)
  const dayZhi = getDayZhiIndex(year, month, day)
  const idx = (dayZhi - monthZhi + 12) % 12
  return JIAN_CHU[idx]
}

function buildJianChuList(current) {
  return JIAN_CHU.map((name) => ({
    name,
    desc: JIAN_CHU_DESC[name] || '',
    active: name === current
  }))
}

function getCurrentHourZhiIndex(date) {
  const d = date || new Date()
  const hour = d.getHours()
  if (hour >= 23 || hour < 1) return 0
  return Math.floor((hour + 1) / 2)
}

function buildHourLuckList(year, month, day, now) {
  const dayZhi = getGanZhiDay(year, month, day).charAt(1)
  const qingLongZhi = QING_LONG_HOUR_BY_DAY[dayZhi] || '子'
  const start = '子丑寅卯辰巳午未申酉戌亥'.indexOf(qingLongZhi)
  const currentZhi = now ? getCurrentHourZhiIndex(now) : -1

  return HOUR_SLOTS.map((slot, zhiIdx) => {
    const deity = HOUR_DEITIES[(zhiIdx - start + 12) % 12]
    const lucky = !!LUCKY_HOUR_DEITIES[deity]
    return {
      zhi: slot.zhi,
      label: slot.label,
      range: slot.range,
      deity,
      lucky,
      luckText: lucky ? '吉' : '凶',
      isNow: zhiIdx === currentZhi
    }
  })
}

function getAlmanac(year, month, day) {
  const jianChu = getJianChu(year, month, day)
  const ganZhi = getGanZhiDay(year, month, day)
  const lunar = solarToLunar(year, month, day)
  const monthZhiIndex = getJieMonthZhiIndex(year, month, day)
  const flags = getDayFlags(year, month, day, lunar)
  const meta = buildDayMeta(ganZhi, monthZhiIndex, lunar, { year, month, day }, flags)
  const merged = buildXieJiYiJi({
    jianChu,
    ganZhi,
    monthZhiIndex,
    meta,
    flags
  })
  return {
    jianChu,
    yi: merged.yiText || '诸事皆宜',
    ji: merged.jiText || '无',
    yiList: merged.yi.length ? merged.yi : ['诸事皆宜'],
    jiList: merged.ji.length ? merged.ji : ['无'],
    lunar,
    meta
  }
}

function isAuspiciousDay(year, month, day, eventId) {
  const keys = EVENT_ACTS[eventId]
  if (!keys) return false
  const almanac = getAlmanac(year, month, day)
  if (almanac.jiList.indexOf('诸事不宜') >= 0) return false
  const yiSet = {}
  const jiSet = {}
  almanac.yiList.forEach((item) => {
    yiSet[item] = true
  })
  almanac.jiList.forEach((item) => {
    jiSet[item] = true
  })
  if (keys.some((key) => jiSet[key])) return false
  return keys.some((key) => yiSet[key])
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

const WEEKDAY_FULL = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function buildHuangliDetail(dayInfo, now) {
  const almanac = getAlmanac(dayInfo.solarYear, dayInfo.solarMonth, dayInfo.solarDay)
  const isToday = !!(
    now &&
    now.getFullYear() === dayInfo.solarYear &&
    now.getMonth() + 1 === dayInfo.solarMonth &&
    now.getDate() === dayInfo.solarDay
  )
  const meta = almanac.meta || {}
  const hourLuckList = buildHourLuckList(
    dayInfo.solarYear,
    dayInfo.solarMonth,
    dayInfo.solarDay,
    isToday ? now : null
  )
  const currentHour = hourLuckList.find((item) => item.isNow) || null
  const weekdayIndex = new Date(dayInfo.solarYear, dayInfo.solarMonth - 1, dayInfo.solarDay).getDay()
  return Object.assign(
    {
      solarText: dayInfo.solarText,
      lunarText: dayInfo.lunarText,
      ganZhiYear: dayInfo.ganZhiYear,
      ganZhiMonth: dayInfo.ganZhiMonth,
      ganZhiDay: dayInfo.ganZhiDay,
      zodiac: dayInfo.zodiac,
      weekday: dayInfo.weekday,
      weekdayText: WEEKDAY_FULL[weekdayIndex] || '',
      weekText: dayInfo.weekText,
      isToday,
      jianChu: almanac.jianChu,
      jianChuDesc: JIAN_CHU_DESC[almanac.jianChu] || '',
      jianChuList: buildJianChuList(almanac.jianChu),
      hourLuckList,
      currentHour,
      yi: almanac.yi,
      ji: almanac.ji,
      yiList: almanac.yiList,
      jiList: almanac.jiList,
      solarTerm: dayInfo.solarTerm
    },
    meta
  )
}

module.exports = {
  AUSPICIOUS_EVENTS,
  JIAN_CHU,
  JIAN_CHU_DESC,
  getJianChu,
  getAlmanac,
  buildJianChuList,
  buildHourLuckList,
  getCurrentHourZhiIndex,
  isAuspiciousDay,
  getAuspiciousDaysInMonth,
  buildHuangliDetail
}
