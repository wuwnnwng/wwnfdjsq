/**
 * 《协纪辨方书》宜忌铺注：神煞宜忌 + 等第 + 铺注条例，词条取通书用事
 */

const TONGSHU_ACTS = [
  '祭祀', '祈福', '求嗣', '上册', '上表章', '会亲友', '入学', '冠带',
  '出行', '上官', '赴任', '结婚姻', '纳采', '嫁娶', '进人口',
  '移徙', '入宅', '安床', '解除', '沐浴', '剃头', '整手足甲', '求医',
  '裁衣', '开光', '筑堤', '修造', '动土', '竖柱', '上梁', '修仓库',
  '鼓铸', '经络', '酝酿', '开市', '立券', '交易', '纳财', '开仓库',
  '出货财', '开渠', '穿井', '安碓硙', '补垣', '塞穴', '修饰垣墙',
  '平治道涂', '破屋', '坏垣', '伐木', '捕捉', '畋猎', '取鱼', '乘船',
  '栽种', '牧养', '纳畜', '破土', '安葬', '启攒', '修坟', '立碑',
  '谢土', '除服', '成服', '出师', '作灶'
]

const DE_GODS = {
  天德: true,
  月德: true,
  天德合: true,
  月德合: true,
  天赦: true,
  天愿: true,
  月恩: true,
  四相: true,
  时德: true
}

const DE_STILL_JI = {
  破土: true,
  安葬: true,
  启攒: true,
  修坟: true,
  立碑: true,
  出师: true,
  除服: true,
  成服: true
}

const DE_SKIP_JI = {
  进人口: true,
  安床: true,
  经络: true,
  酝酿: true,
  开市: true,
  立券: true,
  交易: true,
  纳财: true,
  开仓库: true,
  出货财: true
}

const OFFSET_SKIP_JI = {
  解除: true,
  剃头: true,
  整容: true,
  整手足甲: true,
  沐浴: true
}

const OFFSET_SKIP_BOTH = {
  修造: true,
  动土: true,
  竖柱: true,
  上梁: true,
  开渠: true,
  穿井: true,
  补垣: true,
  塞穴: true,
  修饰垣墙: true,
  平治道涂: true,
  筑堤: true,
  安碓硙: true
}

const GOD_LEVEL = {
  天德: 5,
  月德: 5,
  天赦: 5,
  天愿: 5,
  天德合: 4,
  月德合: 4,
  月恩: 4,
  四相: 4,
  时德: 4,
  天恩: 4,
  母仓: 4,
  六合: 4,
  三合: 4,
  阳德: 4,
  阴德: 4,
  生气: 4,
  天喜: 4,
  王日: 3,
  官日: 3,
  守日: 3,
  驿马: 3,
  除神: 3,
  月建: 3,
  月害: 3,
  月刑: 3,
  月厌: 3,
  劫煞: 3,
  灾煞: 3,
  月煞: 3,
  大时: 3,
  天吏: 3,
  血支: 3,
  血忌: 3,
  归忌: 3,
  上朔: 3,
  九坎: 3,
  死神: 2,
  死气: 2,
  天贼: 2,
  四击: 2,
  往亡: 2,
  月破: 1,
  四废: 1,
  杨公忌: 0,
  四绝: 0,
  四离: 0
}

const JIAN_CHU_LEVEL = {
  建: 3,
  除: 3,
  满: 3,
  平: 3,
  定: 3,
  执: 3,
  破: 1,
  危: 3,
  成: 3,
  收: 3,
  开: 3,
  闭: 3
}

const JIAN_CHU_YI_JI = {
  建: {
    yi: ['出行', '上官', '赴任', '会亲友', '上册', '上表章', '求嗣', '入学', '开市', '交易', '立券', '纳财', '栽种', '牧养', '开光', '祭祀', '祈福', '嫁娶', '结婚姻', '纳采'],
    ji: ['动土', '破土', '开仓库', '乘船', '安葬', '修造', '作灶', '开渠', '穿井']
  },
  除: {
    yi: ['解除', '沐浴', '剃头', '整手足甲', '求医', '破屋', '坏垣', '出货财', '开市', '交易', '祭祀', '祈福'],
    ji: ['嫁娶', '入宅', '出行', '栽种', '安葬', '移徙', '立券']
  },
  满: {
    yi: ['祭祀', '祈福', '开光', '求嗣', '嫁娶', '结婚姻', '纳采', '开市', '立券', '交易', '纳财', '栽种', '牧养', '开仓库', '入宅', '会亲友'],
    ji: ['破土', '安葬', '求医', '出师', '修造']
  },
  平: {
    yi: ['修饰垣墙', '平治道涂', '修造', '补垣', '塞穴', '开渠', '祭祀', '栽种'],
    ji: ['开市', '交易', '嫁娶', '破土', '安葬', '出行', '入宅', '立券', '移徙']
  },
  定: {
    yi: ['结婚姻', '纳采', '嫁娶', '祭祀', '祈福', '求嗣', '开光', '开市', '立券', '交易', '纳财', '栽种', '牧养', '安床', '会亲友', '冠带'],
    ji: ['出行', '求医', '安葬', '破土', '开仓库', '乘船']
  },
  执: {
    yi: ['捕捉', '畋猎', '取鱼', '纳财', '栽种', '牧养', '结婚姻', '纳采', '开仓库', '纳畜', '进人口', '会亲友', '祭祀'],
    ji: ['移徙', '出行', '开市', '破土', '安葬', '入宅', '嫁娶']
  },
  破: {
    yi: ['破屋', '坏垣', '求医', '解除'],
    ji: ['嫁娶', '结婚姻', '出行', '开市', '入宅', '安葬', '立券', '交易', '栽种', '移徙', '求嗣']
  },
  危: {
    yi: ['祭祀', '祈福', '安床', '成服', '除服', '纳畜', '栽种', '牧养'],
    ji: ['乘船', '嫁娶', '开市', '出行', '入宅', '立券', '移徙']
  },
  成: {
    yi: ['嫁娶', '入学', '交易', '求嗣', '出行', '入宅', '移徙', '开市', '立券', '纳财', '栽种', '牧养', '结婚姻', '纳采', '祭祀', '祈福', '开光'],
    ji: ['破土', '安葬', '开仓库', '穿井', '乘船']
  },
  收: {
    yi: ['纳畜', '进人口', '入学', '开仓库', '纳财', '捕捉', '畋猎', '牧养', '栽种', '祭祀', '祈福', '安床'],
    ji: ['开市', '出行', '安葬', '嫁娶', '破土', '移徙', '立券', '开光', '启攒']
  },
  开: {
    yi: ['出行', '嫁娶', '移徙', '求嗣', '入宅', '开市', '立券', '交易', '纳财', '祭祀', '祈福', '开光', '上官', '赴任', '入学', '会亲友'],
    ji: ['安葬', '破土', '伐木', '启攒', '修坟', '成服', '除服', '乘船']
  },
  闭: {
    yi: ['筑堤', '补垣', '塞穴', '安葬', '破土', '成服', '除服', '纳畜', '祭祀', '修坟', '立碑'],
    ji: ['出行', '嫁娶', '开市', '入宅', '开光', '上官', '赴任', '求嗣', '移徙', '立券', '交易', '栽种']
  }
}

const ALL_GOOD = [
  '祭祀', '祈福', '求嗣', '上册', '上表章', '会亲友', '入学', '冠带',
  '出行', '上官', '赴任', '结婚姻', '纳采', '嫁娶', '进人口',
  '移徙', '入宅', '安床', '解除', '沐浴', '剃头', '整手足甲', '求医',
  '裁衣', '开光', '修造', '动土', '竖柱', '上梁', '修仓库',
  '经络', '酝酿', '开市', '立券', '交易', '纳财', '开仓库',
  '出货财', '栽种', '牧养', '纳畜'
]

const GOD_YI_JI = {
  天德: { yi: ALL_GOOD, ji: [] },
  月德: { yi: ALL_GOOD, ji: [] },
  天德合: { yi: ALL_GOOD, ji: [] },
  月德合: { yi: ALL_GOOD, ji: [] },
  天赦: { yi: ALL_GOOD, ji: [] },
  天愿: {
    yi: ['祭祀', '祈福', '求嗣', '上册', '上表章', '冠带', '出行', '上官', '赴任', '结婚姻', '纳采', '嫁娶', '进人口', '移徙', '安床', '解除'],
    ji: []
  },
  月恩: {
    yi: ['祭祀', '祈福', '求嗣', '上册', '上表章', '冠带', '会亲友', '出行', '上官', '赴任', '结婚姻', '纳采', '嫁娶', '进人口', '移徙', '安床', '解除', '裁衣', '经络', '酝酿'],
    ji: []
  },
  四相: {
    yi: ['祭祀', '祈福', '求嗣', '上册', '上表章', '冠带', '会亲友', '入学', '出行', '上官', '赴任', '结婚姻', '纳采', '嫁娶', '进人口', '移徙', '安床', '解除', '裁衣', '修造', '竖柱', '上梁', '修仓库', '开市', '立券', '纳财', '栽种', '牧养', '纳畜', '经络', '酝酿'],
    ji: []
  },
  时德: {
    yi: ['祭祀', '祈福', '上册', '上表章', '冠带', '会亲友', '出行', '上官', '赴任', '结婚姻', '纳采', '嫁娶'],
    ji: []
  },
  天恩: {
    yi: ['祭祀', '祈福', '求嗣', '上册', '上表章', '冠带', '会亲友', '入学', '出行', '上官', '赴任', '结婚姻', '纳采', '嫁娶', '进人口', '移徙', '安床', '解除', '求医', '裁衣'],
    ji: []
  },
  母仓: {
    yi: ['开仓库', '出货财', '纳财', '牧养', '纳畜', '进人口', '栽种'],
    ji: []
  },
  六合: {
    yi: ['结婚姻', '纳采', '嫁娶', '进人口', '立券', '交易', '纳财', '会亲友'],
    ji: []
  },
  三合: {
    yi: ['修造', '动土', '竖柱', '上梁', '开市', '立券', '嫁娶', '结婚姻'],
    ji: []
  },
  阳德: {
    yi: ['上册', '上表章', '冠带', '会亲友', '出行', '上官', '赴任', '祭祀', '祈福'],
    ji: []
  },
  阴德: {
    yi: ['祭祀', '祈福', '求嗣', '解除', '求医', '进人口'],
    ji: []
  },
  生气: {
    yi: ['嫁娶', '求嗣', '栽种', '牧养', '纳畜'],
    ji: []
  },
  天喜: {
    yi: ['嫁娶', '会亲友', '结婚姻', '纳采'],
    ji: []
  },
  驿马: {
    yi: ['出行', '移徙', '上官', '赴任'],
    ji: []
  },
  王日: {
    yi: ['上册', '上表章', '上官', '赴任'],
    ji: []
  },
  官日: {
    yi: ['上官', '赴任'],
    ji: []
  },
  守日: {
    yi: ['安床', '入宅'],
    ji: []
  },
  除神: {
    yi: ['解除', '沐浴', '剃头', '整手足甲'],
    ji: []
  },
  月建: {
    yi: [],
    ji: ['修造', '动土', '开渠', '穿井', '出师']
  },
  月破: {
    yi: ['破屋', '坏垣'],
    ji: '*'
  },
  月害: {
    yi: [],
    ji: ['修造', '嫁娶', '纳畜', '结婚姻']
  },
  月刑: {
    yi: [],
    ji: ['求医', '修造', '动土']
  },
  月厌: {
    yi: [],
    ji: ['嫁娶', '出行', '上官', '赴任', '会亲友']
  },
  劫煞: {
    yi: [],
    ji: ['出行', '上官', '赴任', '嫁娶', '开市', '出师']
  },
  灾煞: {
    yi: [],
    ji: ['出行', '上官', '赴任', '嫁娶', '出师']
  },
  月煞: {
    yi: [],
    ji: ['修造', '安葬', '嫁娶', '动土']
  },
  大时: {
    yi: [],
    ji: ['出行', '上官', '赴任', '出师']
  },
  天吏: {
    yi: [],
    ji: ['出行', '上官', '赴任', '出师']
  },
  死神: {
    yi: [],
    ji: ['安葬', '求医', '嫁娶']
  },
  死气: {
    yi: [],
    ji: ['安葬', '修造', '栽种']
  },
  天贼: {
    yi: [],
    ji: ['开市', '出行', '纳财']
  },
  四击: {
    yi: [],
    ji: ['出师', '畋猎']
  },
  往亡: {
    yi: [],
    ji: ['出行', '上官', '赴任', '嫁娶', '安葬']
  },
  血支: {
    yi: [],
    ji: ['求医', '破土', '安葬']
  },
  血忌: {
    yi: [],
    ji: ['求医', '破土', '安葬']
  },
  归忌: {
    yi: [],
    ji: ['移徙', '入宅']
  },
  上朔: {
    yi: [],
    ji: ['会亲友', '嫁娶']
  },
  九坎: {
    yi: [],
    ji: ['修造', '开渠', '穿井', '安葬']
  },
  四废: {
    yi: [],
    ji: '*'
  },
  杨公忌: {
    yi: [],
    ji: '*'
  },
  四绝: {
    yi: [],
    ji: '*'
  },
  四离: {
    yi: [],
    ji: '*'
  }
}

const XIU_YI_JI = {
  角: { yi: ['修造', '嫁娶', '开市'], ji: ['安葬'] },
  亢: { yi: [], ji: ['修造', '嫁娶', '安葬'] },
  氐: { yi: [], ji: ['修造', '嫁娶', '出行'] },
  房: { yi: ['修造', '嫁娶', '安葬', '开市'], ji: [] },
  心: { yi: [], ji: ['修造', '嫁娶', '安葬'] },
  尾: { yi: ['修造', '嫁娶', '开市', '纳财'], ji: [] },
  箕: { yi: ['修造', '安葬', '开市', '纳财'], ji: [] },
  斗: { yi: ['修造', '开市', '纳财', '嫁娶'], ji: [] },
  牛: { yi: [], ji: ['修造', '嫁娶', '开市'] },
  女: { yi: [], ji: ['修造', '嫁娶', '安葬'] },
  虚: { yi: [], ji: ['修造', '嫁娶', '开市'] },
  危: { yi: [], ji: ['修造', '安葬'] },
  室: { yi: ['修造', '嫁娶', '开市', '纳财'], ji: [] },
  壁: { yi: ['修造', '嫁娶', '安葬', '开市'], ji: [] },
  奎: { yi: ['修造'], ji: ['安葬'] },
  娄: { yi: ['纳畜', '牧养', '求医', '嫁娶', '修造', '出行', '交易', '开市'], ji: [] },
  胃: { yi: ['修造', '嫁娶', '安葬'], ji: [] },
  昴: { yi: [], ji: ['修造', '安葬', '嫁娶'] },
  毕: { yi: ['修造', '安葬', '开市', '嫁娶'], ji: [] },
  觜: { yi: [], ji: ['修造', '安葬'] },
  参: { yi: ['修造', '开市'], ji: ['安葬', '嫁娶'] },
  井: { yi: ['修造', '开市', '纳财'], ji: ['安葬'] },
  鬼: { yi: ['安葬'], ji: ['修造', '嫁娶'] },
  柳: { yi: [], ji: ['修造', '安葬', '开市'] },
  星: { yi: ['修造'], ji: ['安葬'] },
  张: { yi: ['修造', '安葬', '开市', '嫁娶'], ji: [] },
  翼: { yi: [], ji: ['修造', '安葬', '嫁娶'] },
  轸: { yi: ['修造', '安葬', '开市', '嫁娶'], ji: [] }
}

const PENGZU_GAN = {
  甲: ['开仓库', '出货财'],
  乙: ['栽种', '纳畜'],
  丙: ['作灶'],
  丁: ['剃头'],
  戊: ['栽种'],
  己: ['立券', '交易'],
  庚: ['经络'],
  辛: ['酝酿'],
  壬: ['开渠', '穿井', '乘船'],
  癸: []
}

const PENGZU_ZHI = {
  子: [],
  丑: ['冠带'],
  寅: ['祭祀', '祈福'],
  卯: ['穿井'],
  辰: ['安葬', '成服'],
  巳: ['出行'],
  午: ['修造'],
  未: ['求医'],
  申: ['安床'],
  酉: ['会亲友'],
  戌: [],
  亥: ['嫁娶', '纳采']
}

function listHas(list, act) {
  return list === '*' || (list && list.indexOf(act) >= 0)
}

function uniqueActs(list) {
  const seen = {}
  const out = []
  list.forEach((item) => {
    if (!item || seen[item]) return
    seen[item] = true
    out.push(item)
  })
  return out
}

function actLevel(name, fallback) {
  const n = GOD_LEVEL[name]
  return n == null ? fallback : n
}

function decideAct(act, sources, hasDe) {
  const yiHit = sources.filter((item) => item.side === 'yi')
  const jiHit = sources.filter((item) => item.side === 'ji')
  if (!yiHit.length && !jiHit.length) return ''

  let worstJi = 5
  jiHit.forEach((item) => {
    if (item.level < worstJi) worstJi = item.level
  })

  if (!jiHit.length) return 'yi'
  if (!yiHit.length) return 'ji'

  if (OFFSET_SKIP_BOTH[act] && worstJi >= 2) return ''
  if (OFFSET_SKIP_JI[act] && worstJi >= 2 && !DE_STILL_JI[act]) {
    return 'yi'
  }

  if (hasDe && DE_SKIP_JI[act] && worstJi >= 2 && !DE_STILL_JI[act]) {
    return 'yi'
  }

  if (worstJi >= 5) return DE_STILL_JI[act] ? 'ji' : 'yi'
  if (worstJi === 4) {
    if (hasDe) return DE_STILL_JI[act] ? 'ji' : 'yi'
    return 'ji'
  }
  if (worstJi === 3) {
    if (hasDe) return DE_STILL_JI[act] ? 'ji' : 'yi'
    return 'ji'
  }
  if (worstJi === 2) {
    if (hasDe) return DE_STILL_JI[act] ? 'ji' : 'ji'
    return 'ji'
  }
  return 'ji'
}

function collectSources(act, jianChu, gods, xiu) {
  const sources = []
  const jc = JIAN_CHU_YI_JI[jianChu] || { yi: [], ji: [] }
  const jcLevel = JIAN_CHU_LEVEL[jianChu] == null ? 3 : JIAN_CHU_LEVEL[jianChu]
  if (listHas(jc.yi, act)) sources.push({ side: 'yi', level: jcLevel, name: `${jianChu}日` })
  if (listHas(jc.ji, act)) sources.push({ side: 'ji', level: jcLevel, name: `${jianChu}日` })

  gods.forEach((name) => {
    const spec = GOD_YI_JI[name]
    if (!spec) return
    const level = actLevel(name, 3)
    if (listHas(spec.yi, act)) sources.push({ side: 'yi', level, name })
    if (listHas(spec.ji, act)) sources.push({ side: 'ji', level, name })
  })

  if (xiu && XIU_YI_JI[xiu]) {
    const spec = XIU_YI_JI[xiu]
    if (listHas(spec.yi, act)) sources.push({ side: 'yi', level: 4, name: `${xiu}宿` })
    if (listHas(spec.ji, act)) sources.push({ side: 'ji', level: 3, name: `${xiu}宿` })
  }
  return sources
}

function emptyResult(yi, ji) {
  return {
    yi,
    ji,
    yiText: yi.join('、'),
    jiText: ji.join('、')
  }
}

function buildXieJiYiJi(input) {
  const jianChu = input.jianChu
  const ganZhi = input.ganZhi || ''
  const meta = input.meta || {}
  const flags = input.flags || {}

  if (flags.yangGong || flags.siJue || flags.siLi) {
    return emptyResult(['余事勿取'], ['诸事不宜'])
  }

  const gods = [].concat(meta.jiShenList || [], meta.xiongShaList || [])
  const hasDe = gods.some((name) => DE_GODS[name])
  const gan = ganZhi.charAt(0)
  const zhi = ganZhi.charAt(1)
  const pengzu = uniqueActs([].concat(PENGZU_GAN[gan] || [], PENGZU_ZHI[zhi] || []))
  const xiu = meta.xiu || ''

  if (flags.yuePo && !hasDe) {
    return emptyResult(['破屋', '坏垣'], ['诸事不宜'])
  }

  const yi = []
  const ji = []
  TONGSHU_ACTS.forEach((act) => {
    const decision = decideAct(act, collectSources(act, jianChu, gods, xiu), hasDe)
    if (decision === 'yi') yi.push(act)
    if (decision === 'ji') ji.push(act)
  })

  pengzu.forEach((act) => {
    if (hasDe && DE_SKIP_JI[act]) return
    const yiAt = yi.indexOf(act)
    if (yiAt >= 0) yi.splice(yiAt, 1)
    if (ji.indexOf(act) < 0) ji.push(act)
  })

  if (!yi.length && !ji.length) {
    return emptyResult(['诸事皆宜'], ['无'])
  }
  if (!yi.length) return emptyResult(['余事勿取'], ji.length ? ji : ['诸事不宜'])
  if (!ji.length) return emptyResult(yi, ['无'])
  return emptyResult(yi, ji)
}

module.exports = {
  TONGSHU_ACTS,
  buildXieJiYiJi
}
