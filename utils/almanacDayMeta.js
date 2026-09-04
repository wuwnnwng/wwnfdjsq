/**
 * 黄历日值：五行、冲煞、值神、胎神、二十八宿、彭祖百忌、吉神凶神
 * 按通书常用规则离线推算，仅供生活参考
 */

const GAN = '甲乙丙丁戊己庚辛壬癸'
const ZHI = '子丑寅卯辰巳午未申酉戌亥'
const ZHI_ANIMAL = '鼠牛虎兔龙蛇马羊猴鸡狗猪'

const NAYIN = [
  '海中金', '海中金', '炉中火', '炉中火', '大林木', '大林木',
  '路旁土', '路旁土', '剑锋金', '剑锋金', '山头火', '山头火',
  '涧下水', '涧下水', '城头土', '城头土', '白蜡金', '白蜡金',
  '杨柳木', '杨柳木', '井泉水', '井泉水', '屋上土', '屋上土',
  '霹雳火', '霹雳火', '松柏木', '松柏木', '长流水', '长流水',
  '砂中金', '砂中金', '山下火', '山下火', '平地木', '平地木',
  '壁上土', '壁上土', '金箔金', '金箔金', '覆灯火', '覆灯火',
  '天河水', '天河水', '大驿土', '大驿土', '钗钏金', '钗钏金',
  '桑柘木', '桑柘木', '大溪水', '大溪水', '沙中土', '沙中土',
  '天上火', '天上火', '石榴木', '石榴木', '大海水', '大海水'
]

const SHA_DIR = ['南', '东', '北', '西', '南', '东', '北', '西', '南', '东', '北', '西']

const TIAN_SHEN = ['青龙', '明堂', '天刑', '朱雀', '金匮', '天德', '白虎', '玉堂', '天牢', '玄武', '司命', '勾陈']
const TIAN_SHEN_OFFSET = [4, 2, 0, 10, 8, 6, 4, 2, 0, 10, 8, 6]
const HUANG_DAO = {
  青龙: true,
  明堂: true,
  金匮: true,
  天德: true,
  玉堂: true,
  司命: true
}

const TAI_SHEN = [
  '占门碓外东南', '碓磨厕外东南', '厨灶炉外正南', '仓库门外正南',
  '房床栖外正南', '占门床外正南', '占碓磨外正南', '厨灶厕外西南',
  '仓库炉外西南', '房床门外西南', '占门碓外西南', '碓磨栖外西南',
  '厨灶床外西南', '仓库栖外西南', '房床厕外正南', '占门炉外正南',
  '碓磨门外正南', '厨灶栖外正南', '仓库床外正南', '房床碓外东南',
  '占门厕外东南', '碓磨炉外东南', '厨灶门外东南', '仓库碓外东南',
  '房床栖外东南', '占门床外东南', '占碓磨外东南', '厨灶厕外正东',
  '仓库炉外正东', '房床门外正东', '占大门外正东', '碓磨栖外正东',
  '厨灶碓外正东', '仓库床外正东', '房床厕外正东', '占门炉外正东',
  '碓磨门外东北', '厨灶栖外东北', '仓库碓外东北', '房床门外东北',
  '占门厕外东北', '碓磨炉外东北', '厨灶门外东北', '仓库栖外东北',
  '房床碓外正北', '占门床外正北', '占碓磨外正北', '厨灶厕外正北',
  '仓库炉外正北', '房床门外正北', '占门碓外正北', '碓磨栖外正北',
  '厨灶床外正北', '仓库栖外正西', '房床厕外正西', '占门炉外西北',
  '碓磨门外西北', '厨灶栖外西北', '仓库碓外西北', '房床门外西北'
]

const XIU = ['角', '亢', '氐', '房', '心', '尾', '箕', '斗', '牛', '女', '虚', '危', '室', '壁', '奎', '娄', '胃', '昴', '毕', '觜', '参', '井', '鬼', '柳', '星', '张', '翼', '轸']
const XIU_ELEM = ['木', '金', '土', '日', '月', '火', '水', '木', '金', '土', '日', '月', '火', '水', '木', '金', '土', '日', '月', '火', '水', '木', '金', '土', '日', '月', '火', '水']
const XIU_BEAST = ['蛟', '龙', '貉', '兔', '狐', '虎', '豹', '獬', '牛', '蝠', '鼠', '燕', '猪', '犴', '狼', '狗', '雉', '鸡', '乌', '猴', '猿', '犴', '羊', '獐', '马', '鹿', '蛇', '蚓']
const XIU_LUCK = [1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1]
const XIU_OFFSET = [11, 13, 15, 17, 19, 21, 23, 25, 27, 1, 3, 5]

const PENGZU_GAN_TEXT = {
  甲: '甲不开仓财物耗散',
  乙: '乙不栽植千株不长',
  丙: '丙不修灶必见灾殃',
  丁: '丁不剃头头必生疮',
  戊: '戊不受田田主不祥',
  己: '己不破券二比并亡',
  庚: '庚不经络织机虚张',
  辛: '辛不合酱主人不尝',
  壬: '壬不泱水更难提防',
  癸: '癸不词讼理弱敌强'
}

const PENGZU_ZHI_TEXT = {
  子: '子不问卜自惹祸殃',
  丑: '丑不冠带主不还乡',
  寅: '寅不祭祀神鬼不尝',
  卯: '卯不穿井水泉不香',
  辰: '辰不哭泣必主重丧',
  巳: '巳不远行财物伏藏',
  午: '午不苫盖屋主更张',
  未: '未不服药毒气入肠',
  申: '申不安床鬼祟入房',
  酉: '酉不会客醉坐颠狂',
  戌: '戌不吃犬作怪上床',
  亥: '亥不嫁娶不利新郎'
}

const TIAN_DE = ['巳', '庚', '丁', '申', '壬', '辛', '亥', '甲', '癸', '寅', '丙', '乙']
const GAN_HE = { 甲: '己', 乙: '庚', 丙: '辛', 丁: '壬', 戊: '癸', 己: '甲', 庚: '乙', 辛: '丙', 壬: '丁', 癸: '戊' }
const ZHI_HE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' }
const ZHI_HAI = { 子: '未', 丑: '午', 寅: '巳', 卯: '辰', 辰: '卯', 巳: '寅', 午: '丑', 未: '子', 申: '亥', 酉: '戌', 戌: '酉', 亥: '申' }
const YUE_DE = ['壬', '庚', '丙', '甲']
const TIAN_SHE = ['戊寅', '甲午', '戊申', '甲子']
const TIAN_YUAN = ['甲子', '甲午', '甲寅', '壬午', '戊午', '己未', '丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳']
const SI_XIANG = [['甲', '乙'], ['丙', '丁'], ['庚', '辛'], ['壬', '癸']]
const SI_FEI = [['庚申', '辛酉'], ['壬子', '癸亥'], ['甲寅', '乙卯'], ['丙午', '丁巳']]
const WANG_WANG_FROM_YIN = [2, 5, 8, 11, 3, 6, 9, 0, 4, 7, 10, 1]
const TIAN_EN = {
  甲子: true, 乙丑: true, 丙寅: true, 丁卯: true, 戊辰: true,
  己卯: true, 庚辰: true, 辛巳: true, 壬午: true, 癸未: true,
  甲申: true, 乙酉: true, 丙戌: true, 丁亥: true, 戊子: true,
  己酉: true, 庚戌: true, 辛亥: true, 壬子: true, 癸丑: true
}
const MU_CANG = [['亥', '子'], ['寅', '卯'], ['辰', '戌', '丑', '未'], ['申', '酉']]
const SAN_HE = [
  { jie: 5, zai: 6, tian: 7, daShi: 9 },
  { jie: 2, zai: 3, tian: 4, daShi: 6 },
  { jie: 11, zai: 0, tian: 1, daShi: 3 },
  { jie: 8, zai: 9, tian: 10, daShi: 0 }
]

function ganIndex(gan) {
  return GAN.indexOf(gan)
}

function zhiIndex(zhi) {
  return ZHI.indexOf(zhi)
}

function ganZhiIndex60(ganZhi) {
  const g = ganIndex(ganZhi.charAt(0))
  const z = zhiIndex(ganZhi.charAt(1))
  if (g < 0 || z < 0) return 0
  let i = g
  while (i % 12 !== z) i += 10
  return i % 60
}

function seasonIndex(monthZhiIndex) {
  return Math.floor(((monthZhiIndex + 10) % 12) / 3)
}

function pushUnique(list, name) {
  if (name && list.indexOf(name) < 0) list.push(name)
}

function xueJiZhi(monthZhiIndex) {
  const k = (monthZhiIndex - 2 + 12) % 12
  if (k % 2 === 0) return (1 + k / 2) % 12
  return (7 + (k - 1) / 2) % 12
}

function guiJiZhi(monthZhiIndex) {
  const r = monthZhiIndex % 3
  if (r === 2) return 1
  if (r === 0) return 2
  return 0
}

function tianZeiZhi(monthZhiIndex) {
  return (5 - monthZhiIndex + 12) % 12
}

function buildDayGods(monthZhiIndex, ganZhi) {
  const dayGan = ganZhi.charAt(0)
  const dayZhi = ganZhi.charAt(1)
  const dayZhiIndex = zhiIndex(dayZhi)
  const season = seasonIndex(monthZhiIndex)
  const yinOffset = (monthZhiIndex - 2 + 12) % 12
  const ji = []
  const xiong = []

  const tianDe = TIAN_DE[monthZhiIndex]
  if (dayGan === tianDe || dayZhi === tianDe) {
    pushUnique(ji, '天德')
  } else {
    const he = GAN_HE[tianDe] || ZHI_HE[tianDe]
    if (dayGan === he || dayZhi === he) pushUnique(ji, '天德合')
  }

  const yueDe = YUE_DE[monthZhiIndex % 4]
  if (dayGan === yueDe) pushUnique(ji, '月德')
  else if (dayGan === GAN_HE[yueDe]) pushUnique(ji, '月德合')

  if (TIAN_SHE[season] === ganZhi) pushUnique(ji, '天赦')
  if (TIAN_YUAN[yinOffset] === ganZhi) pushUnique(ji, '天愿')
  if (TIAN_EN[ganZhi]) pushUnique(ji, '天恩')
  if (MU_CANG[season].indexOf(dayZhi) >= 0) pushUnique(ji, '母仓')
  if (SI_XIANG[season].indexOf(dayGan) >= 0) pushUnique(ji, '四相')
  if (dayZhiIndex === (monthZhiIndex + 10) % 12) pushUnique(ji, '生气')
  if (dayZhi === '申' || dayZhi === '酉') pushUnique(ji, '除神')
  if (dayZhiIndex === (monthZhiIndex + 5) % 12) pushUnique(ji, '阳德')
  if (dayZhi === ZHI_HE[ZHI.charAt(monthZhiIndex)]) pushUnique(ji, '六合')

  const yiMaGroup = monthZhiIndex % 4
  const yiMaZhi = yiMaGroup === 0 ? 2 : yiMaGroup === 1 ? 11 : yiMaGroup === 2 ? 8 : 5
  if (dayZhiIndex === yiMaZhi) pushUnique(ji, '驿马')

  const wang = [2, 5, 8, 11][season]
  const guan = [3, 6, 9, 0][season]
  const shou = [4, 7, 10, 1][season]
  if (dayZhiIndex === wang) pushUnique(ji, '王日')
  if (dayZhiIndex === guan) pushUnique(ji, '官日')
  if (dayZhiIndex === shou) pushUnique(ji, '守日')

  if (dayZhiIndex === monthZhiIndex) pushUnique(xiong, '月建')
  if (dayZhiIndex === (monthZhiIndex + 6) % 12) pushUnique(xiong, '月破')
  if (dayZhi === ZHI_HAI[ZHI.charAt(monthZhiIndex)]) pushUnique(xiong, '月害')
  if (dayZhiIndex === (12 - monthZhiIndex) % 12) pushUnique(xiong, '月厌')

  const sha = SAN_HE[monthZhiIndex % 4]
  if (dayZhiIndex === sha.jie) pushUnique(xiong, '劫煞')
  if (dayZhiIndex === sha.zai) pushUnique(xiong, '灾煞')
  if (dayZhiIndex === sha.tian) pushUnique(xiong, '天煞')
  if (dayZhiIndex === sha.daShi) pushUnique(xiong, '大时')

  if (dayZhiIndex === (monthZhiIndex + 3) % 12) pushUnique(xiong, '死神')
  if (dayZhiIndex === (monthZhiIndex + 4) % 12) pushUnique(xiong, '死气')
  if (dayZhiIndex === tianZeiZhi(monthZhiIndex)) pushUnique(xiong, '天贼')
  if (dayZhiIndex === [10, 7, 4, 1][season]) pushUnique(xiong, '四击')
  if (dayZhiIndex === WANG_WANG_FROM_YIN[yinOffset]) pushUnique(xiong, '往亡')
  if (dayZhiIndex === (monthZhiIndex + 11) % 12) pushUnique(xiong, '血支')
  if (dayZhiIndex === xueJiZhi(monthZhiIndex)) pushUnique(xiong, '血忌')
  if (dayZhiIndex === guiJiZhi(monthZhiIndex)) pushUnique(xiong, '归忌')
  if (dayZhiIndex === (monthZhiIndex + 9) % 12) pushUnique(xiong, '上朔')
  if (dayZhiIndex === (monthZhiIndex + 2) % 12) pushUnique(xiong, '九坎')
  if (SI_FEI[season].indexOf(ganZhi) >= 0) pushUnique(xiong, '四废')

  return { jiShenList: ji, xiongShaList: xiong }
}

function buildDayMeta(ganZhiDay, monthZhiIndex, lunar) {
  const gan = ganZhiDay.charAt(0)
  const zhi = ganZhiDay.charAt(1)
  const dayZhiIndex = zhiIndex(zhi)
  const idx60 = ganZhiIndex60(ganZhiDay)
  const nayin = NAYIN[idx60] || ''
  const wuXing = nayin.slice(-1)
  const chongIndex = (dayZhiIndex + 6) % 12
  const chong = ZHI.charAt(chongIndex)
  const chongAnimal = ZHI_ANIMAL.charAt(chongIndex)
  const sha = SHA_DIR[dayZhiIndex] || ''
  const tianShen = TIAN_SHEN[(dayZhiIndex + TIAN_SHEN_OFFSET[monthZhiIndex]) % 12]
  const tianShenLucky = !!HUANG_DAO[tianShen]
  const lunarMonth = Math.min(12, Math.max(1, Number(lunar && lunar.lunarMonth) || 1))
  const lunarDay = Math.min(30, Math.max(1, Number(lunar && lunar.lunarDay) || 1))
  const xiuIndex = (XIU_OFFSET[lunarMonth - 1] + lunarDay - 1) % 28
  const xiu = XIU[xiuIndex]
  const xiuLucky = !!XIU_LUCK[xiuIndex]
  const gods = buildDayGods(monthZhiIndex, ganZhiDay)
  const pengzuGan = PENGZU_GAN_TEXT[gan] || ''
  const pengzuZhi = PENGZU_ZHI_TEXT[zhi] || ''

  return {
    nayin,
    wuXing,
    chong,
    chongAnimal,
    chongText: `冲${chongAnimal}(${chong})`,
    sha,
    shaText: `煞${sha}`,
    chongShaText: `冲${chongAnimal}(${chong}) 煞${sha}`,
    tianShen,
    tianShenType: tianShenLucky ? '黄道' : '黑道',
    tianShenLucky,
    tianShenLuckText: tianShenLucky ? '吉' : '凶',
    taiShen: TAI_SHEN[idx60] || '',
    xiu,
    xiuFull: `${xiu}${XIU_ELEM[xiuIndex]}${XIU_BEAST[xiuIndex]}`,
    xiuLucky,
    xiuLuckText: xiuLucky ? '吉' : '凶',
    pengzuGan,
    pengzuZhi,
    pengzuText: [pengzuGan, pengzuZhi].filter(Boolean).join(' '),
    pengzuLines: [pengzuGan, pengzuZhi].filter(Boolean),
    jiShenList: gods.jiShenList,
    xiongShaList: gods.xiongShaList
  }
}

module.exports = {
  buildDayMeta
}
