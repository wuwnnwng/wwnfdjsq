/**
 * 黄历：建除十二神、宜忌、吉日筛选（离线规则，仅供参考）
 */
const { getGanZhiDay, solarToLunar, getSolarTermDate, getJieMonthZhiIndex } = require('./lunar')
const { buildDayMeta } = require('./almanacDayMeta')

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

const HOUR_DEITIES = [
  '青龙',
  '明堂',
  '金匮',
  '天德',
  '玉堂',
  '司命',
  '天刑',
  '朱雀',
  '白虎',
  '天牢',
  '玄武',
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

/** 通胜建除用事（事项名与手机黄历、中华万年历常用口径一致） */
const JIAN_CHU_YI_JI = {
  建: {
    yi: '出行 上任 会亲友 上书 见贵 求职 开市 交易 立券 纳财 栽种 牧养 开光 求嗣 祭祀 祈福 嫁娶 订盟 入学',
    ji: '动土 破土 开仓 乘船 安葬 行丧 盖屋 作灶 安门 开渠'
  },
  除: {
    yi: '解除 沐浴 整容 剃头 理发 求医 治病 扫舍 破屋 坏垣 拆卸 出货 开市 交易 祭祀 祈福',
    ji: '嫁娶 入宅 远行 出行 栽种 安葬 移徙 开业 搬家 立券'
  },
  满: {
    yi: '祭祀 祈福 开光 求嗣 嫁娶 订盟 纳采 开市 立券 交易 纳财 栽种 牧养 开仓 入宅 会亲友',
    ji: '破土 安葬 行丧 服药 针灸 出师 求医 盖屋'
  },
  平: {
    yi: '修饰垣墙 平治道涂 修造 装修 补垣 塞穴 拆卸 开池 祭祀 扫舍 栽种',
    ji: '开市 交易 嫁娶 破土 安葬 出行 开业 入宅 立券 搬家'
  },
  定: {
    yi: '订盟 纳采 嫁娶 祭祀 祈福 求嗣 开光 开市 立券 交易 纳财 栽种 牧养 开业 安床 会亲友',
    ji: '词讼 诉讼 出行 求医 安葬 行丧 破土 开仓 乘船'
  },
  执: {
    yi: '捕捉 畋猎 取鱼 结网 纳财 栽种 牧养 订盟 纳采 开仓 纳畜 进人口 会亲友 祭祀',
    ji: '搬家 远行 开市 破土 安葬 出行 入宅 开业 嫁娶 移徙'
  },
  破: {
    yi: '破屋 坏垣 求医 治病 解除 拆卸 扫舍 沐浴',
    ji: '嫁娶 订盟 出行 开市 开业 入宅 安葬 立券 交易 栽种 搬家 求嗣'
  },
  危: {
    yi: '祭祀 祈福 安床 入殓 移柩 成服 除服 纳畜 栽种 牧养',
    ji: '登高 行船 乘船 嫁娶 开市 出行 开业 入宅 立券 搬家'
  },
  成: {
    yi: '嫁娶 开业 入学 交易 求嗣 出行 入宅 移徙 开市 立券 纳财 栽种 牧养 订盟 纳采 祭祀 祈福 搬家 开光',
    ji: '诉讼 词讼 破土 安葬 行丧 开仓 掘井 乘船'
  },
  收: {
    yi: '纳畜 进人口 入学 开仓 纳财 捕捉 畋猎 牧养 栽种 祭祀 祈福 入宅 安床',
    ji: '开业 求医 出行 安葬 开市 嫁娶 破土 搬家 立券 开光'
  },
  开: {
    yi: '开业 出行 嫁娶 搬家 求嗣 入宅 移徙 开市 立券 交易 纳财 祭祀 祈福 开光 上任 入学 会亲友',
    ji: '安葬 破土 伐木 行丧 开生坟 合寿木 入殓 乘船'
  },
  闭: {
    yi: '筑堤 补垣 塞穴 安葬 破土 入殓 移柩 成服 除服 纳畜 祭祀',
    ji: '开业 出行 嫁娶 开市 入宅 开光 上任 求嗣 搬家 立券 交易 栽种'
  }
}

const PENGZU_GAN = {
  甲: ['开仓', '出货'],
  乙: ['栽种', '纳畜'],
  丙: ['作灶'],
  丁: ['剃头', '理发', '整容'],
  戊: ['耕种'],
  己: ['立券', '交易'],
  庚: ['经络'],
  辛: ['酝酿'],
  壬: ['开渠', '穿井', '乘船', '行船'],
  癸: ['词讼', '诉讼']
}

const PENGZU_ZHI = {
  子: ['问卜'],
  丑: ['冠带'],
  寅: ['祭祀', '祈福'],
  卯: ['穿井', '掘井'],
  辰: ['哭泣', '行丧'],
  巳: ['远行', '出行'],
  午: ['苫盖', '盖屋'],
  未: ['服药', '求医', '治病'],
  申: ['安床'],
  酉: ['会亲友'],
  戌: ['吃犬'],
  亥: ['嫁娶', '纳采']
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
const YUE_PO_EXTRA_JI = ['修造', '动土', '嫁娶', '开市', '安葬', '移徙', '入宅', '开业']

function splitYiJiItems(text) {
  if (Array.isArray(text)) return text.filter(Boolean)
  return String(text || '')
    .split(/[\s、,，]+/)
    .filter(Boolean)
}

function uniqueYiJiItems(list) {
  const seen = {}
  const out = []
  list.forEach((item) => {
    if (!item || seen[item]) return
    seen[item] = true
    out.push(item)
  })
  return out
}

function mergeYiJi(parts) {
  let yi = []
  let ji = []
  parts.forEach((part) => {
    if (!part) return
    yi = yi.concat(splitYiJiItems(part.yi))
    ji = ji.concat(splitYiJiItems(part.ji))
  })
  yi = uniqueYiJiItems(yi)
  ji = uniqueYiJiItems(ji)
  const jiSet = {}
  ji.forEach((item) => {
    jiSet[item] = true
  })
  yi = yi.filter((item) => !jiSet[item])
  return {
    yi,
    ji,
    yiText: yi.join('、'),
    jiText: ji.join('、')
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

function pengzuForbidden(gan, zhi) {
  return uniqueYiJiItems([].concat(PENGZU_GAN[gan] || [], PENGZU_ZHI[zhi] || []))
}

function buildTongShuYiJi(year, month, day, jianChu, ganZhi, lunar) {
  if (isYangGongDay(lunar) || isSiJueDay(year, month, day) || isSiLiDay(year, month, day)) {
    return {
      yi: ['余事勿取'],
      ji: ['诸事不宜'],
      yiText: '余事勿取',
      jiText: '诸事不宜'
    }
  }

  const base = JIAN_CHU_YI_JI[jianChu] || { yi: '', ji: '' }
  const gan = ganZhi.charAt(0)
  const zhi = ganZhi.charAt(1)
  const extraJi = pengzuForbidden(gan, zhi).concat(isYuePoDay(year, month, day) ? YUE_PO_EXTRA_JI : [])
  return mergeYiJi([{ yi: base.yi, ji: `${base.ji} ${extraJi.join(' ')}` }])
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

function getQingLongStartZhiIndex(dayZhiIndex) {
  if (dayZhiIndex === 0 || dayZhiIndex === 1) return 8
  if (dayZhiIndex === 2 || dayZhiIndex === 3) return 10
  if (dayZhiIndex === 4 || dayZhiIndex === 5) return 0
  if (dayZhiIndex === 6 || dayZhiIndex === 7) return 2
  if (dayZhiIndex === 8 || dayZhiIndex === 9) return 4
  return 6
}

function getCurrentHourZhiIndex(date) {
  const d = date || new Date()
  const hour = d.getHours()
  if (hour >= 23 || hour < 1) return 0
  return Math.floor((hour + 1) / 2)
}

function buildHourLuckList(year, month, day, now) {
  const dayZhiIndex = getDayZhiIndex(year, month, day)
  const startZhi = getQingLongStartZhiIndex(dayZhiIndex)
  const currentZhi = now ? getCurrentHourZhiIndex(now) : -1

  return HOUR_SLOTS.map((slot, zhiIdx) => {
    const offset = (zhiIdx - startZhi + 12) % 12
    const deity = HOUR_DEITIES[offset]
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
  const merged = buildTongShuYiJi(year, month, day, jianChu, ganZhi, lunar)
  return {
    jianChu,
    yi: merged.yiText || '诸事皆宜',
    ji: merged.jiText || '诸事不宜',
    yiList: merged.yi.length ? merged.yi : ['诸事皆宜'],
    jiList: merged.ji.length ? merged.ji : ['诸事不宜'],
    lunar
  }
}

function isAuspiciousDay(year, month, day, eventId) {
  const event = AUSPICIOUS_EVENTS.find((item) => item.id === eventId)
  if (!event) return false
  const jianChu = getJianChu(year, month, day)
  if (event.jianChu.indexOf(jianChu) < 0) return false
  const ji = getAlmanac(year, month, day).ji || ''
  if (ji.indexOf('诸事不宜') >= 0) return false
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

const WEEKDAY_FULL = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function buildHuangliDetail(dayInfo, now) {
  const almanac = getAlmanac(dayInfo.solarYear, dayInfo.solarMonth, dayInfo.solarDay)
  const isToday = !!(
    now &&
    now.getFullYear() === dayInfo.solarYear &&
    now.getMonth() + 1 === dayInfo.solarMonth &&
    now.getDate() === dayInfo.solarDay
  )
  const monthZhiIndex = getJieMonthZhiIndex(dayInfo.solarYear, dayInfo.solarMonth, dayInfo.solarDay)
  const lunar = dayInfo.lunar || solarToLunar(dayInfo.solarYear, dayInfo.solarMonth, dayInfo.solarDay)
  const meta = buildDayMeta(dayInfo.ganZhiDay, monthZhiIndex, lunar)
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
