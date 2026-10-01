/**
 * 常见证件照规格。毫米尺寸按 300dpi 换算像素，报名站单独规定像素的按像素收录。
 */
const COLORS = [
  { id: 'blue', name: '蓝', hex: '#438EDB' },
  { id: 'white', name: '白', hex: '#FFFFFF' },
  { id: 'red', name: '红', hex: '#E10600' },
  { id: 'sky', name: '浅蓝', hex: '#6EB5E8' },
  { id: 'pale', name: '淡蓝', hex: '#A9D4F0' },
  { id: 'cyan', name: '青', hex: '#3CB4E6' }
]

const MORE_COLORS = [
  { id: 'navy', name: '深蓝', hex: '#1F4E89' },
  { id: 'gray', name: '灰', hex: '#C8C8C8' },
  { id: 'pink', name: '粉', hex: '#F4A7B9' }
]

const TABS = [
  { id: 'hot', name: '热门证件照' },
  { id: 'common', name: '常用寸照' },
  { id: 'career', name: '职业资格' },
  { id: 'edu', name: '学历/语言考试' },
  { id: 'receipt', name: '回执专区' },
  { id: 'civil', name: '公务员' }
]

function spec(id, name, group, width, height, mmW, mmH, extra) {
  return Object.assign({
    id,
    name,
    group,
    width,
    height,
    mmW,
    mmH,
    hot: false,
    bg: 'blue',
    fileType: 'jpg',
    maxKb: 0
  }, extra)
}

const SPECS = [
  spec('inch1', '一寸', 'common', 295, 413, 25, 35, { hot: true }),
  spec('inch2', '二寸', 'common', 413, 579, 35, 49, { hot: true }),
  spec('inch1l', '大一寸', 'common', 390, 567, 33, 48, { hot: true }),
  spec('inch1s', '小一寸', 'common', 260, 378, 22, 32, { hot: true }),
  spec('inch2s', '小二寸', 'common', 413, 531, 35, 45),
  spec('inch2l', '大二寸', 'common', 413, 626, 35, 53),
  spec('work1', '一寸工作证', 'common', 295, 413, 25, 35),
  spec('half1', '一寸半身照', 'common', 295, 413, 25, 35),
  spec('work2', '二寸工作证', 'common', 413, 579, 35, 49),
  spec('half2', '二寸半身照', 'common', 413, 579, 35, 49),
  spec('inch3', '三寸', 'common', 649, 992, 55, 84),
  spec('inch5', '五寸', 'common', 1051, 1500, 89, 127),
  spec('inch6', '六寸', 'common', 1205, 1795, 102, 152),
  spec('idcard', '身份证', 'common', 358, 441, 26, 32, { bg: 'white' }),
  spec('social', '社保卡', 'common', 358, 441, 26, 32, { bg: 'white' }),
  spec('drive', '驾驶证', 'common', 413, 579, 35, 49, { bg: 'white' }),
  spec('passport', '护照', 'common', 390, 567, 33, 48, { bg: 'white' }),
  spec('hkmo', '港澳通行证', 'common', 390, 567, 33, 48, { bg: 'white' }),
  spec('twpass', '台湾通行证', 'common', 390, 567, 33, 48, { bg: 'white' }),
  spec('visa', '签证照片', 'common', 413, 531, 35, 45, { bg: 'white' }),
  spec('usvisa', '美国签证', 'common', 600, 600, 51, 51, { bg: 'white' }),
  spec('jpvisa', '日本签证', 'common', 531, 531, 45, 45, { bg: 'white' }),
  spec('marriage', '结婚登记照', 'common', 413, 531, 35, 45, { bg: 'white' }),
  spec('student', '学生证', 'common', 295, 413, 25, 35),
  spec('residence', '居住证', 'common', 358, 441, 26, 32, { bg: 'white' }),

  spec('resume', '简历照片', 'career', 295, 413, 25, 35, { hot: true, bg: 'white' }),
  spec('teacher', '教师资格证', 'career', 295, 413, 25, 35, { hot: true, bg: 'white' }),
  spec('icbc-s', '工商银行网申（小）', 'career', 100, 140, 8, 12, { bg: 'white' }),
  spec('bocom', '交通银行网申', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('ccb', '建设银行网申', 'career', 120, 160, 10, 13, { bg: 'white' }),
  spec('pboc', '中国人民银行网申', 'career', 200, 260, 17, 22, { bg: 'white' }),
  spec('icbc', '工商银行网申', 'career', 240, 370, 20, 31, { bg: 'white' }),
  spec('icbc-life', '工商银行网申生活照', 'career', 240, 320, 20, 27, { bg: 'white' }),
  spec('cd-exam', '成都人事考试网', 'career', 102, 126, 9, 11),
  spec('bj-teacher', '北京教师信息网', 'career', 154, 189, 13, 16, { bg: 'white' }),
  spec('abc', '农业银行网申', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('ride', '网约车照片', 'career', 455, 661, 33, 48, { bg: 'white' }),
  spec('ride-op', '网约车运营证', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('health', '健康证（一寸）', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('cpa-junior', '初级会计', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('cpa', '注册会计师', 'career', 178, 220, 15, 19, { bg: 'white' }),
  spec('nurse', '护士执业资格', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('doctor', '医师资格', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('pharmacist', '执业药师', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('builder1', '一级建造师', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('builder2', '二级建造师', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('law', '法律职业资格', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('tour', '导游资格', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('social-work', '社会工作者', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('bank', '银行从业', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('stock', '证券从业', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('fire', '消防工程师', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('cost', '造价工程师', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('safety', '安全工程师', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('preschool', '幼师资格', 'career', 295, 413, 25, 35, { bg: 'white' }),
  spec('soft', '计算机技术资格', 'career', 295, 413, 25, 35, { bg: 'white' }),

  spec('gwy', '国家公务员', 'civil', 413, 531, 35, 45, { maxKb: 30 }),
  spec('shengkao', '省考报名', 'civil', 295, 413, 25, 35),
  spec('shiye', '事业单位', 'civil', 295, 413, 25, 35),
  spec('xuandiao', '选调生', 'civil', 413, 531, 35, 45),
  spec('sydw', '事业编联考', 'civil', 295, 413, 25, 35),
  spec('sanzi', '三支一扶', 'civil', 295, 413, 25, 35),
  spec('teacher-job', '教师招聘', 'civil', 295, 413, 25, 35, { bg: 'white' }),

  spec('cet', '英语四六级', 'edu', 144, 192, 0, 0, { maxKb: 200 }),
  spec('ncre', '计算机等级', 'edu', 144, 192, 0, 0, { maxKb: 200 }),
  spec('psc', '普通话水平测试', 'edu', 390, 567, 33, 48),
  spec('kaoyan', '考研报名', 'edu', 480, 640, 41, 54, { maxKb: 200 }),
  spec('chengkao', '成人高考', 'edu', 295, 413, 25, 35),
  spec('zikao', '自学考试', 'edu', 295, 413, 25, 35),
  spec('gaokao', '高考报名', 'edu', 295, 413, 25, 35),
  spec('zhongkao', '中考报名', 'edu', 295, 413, 25, 35),
  spec('zhuanshengben', '专升本', 'edu', 295, 413, 25, 35),
  spec('tem', '英语专四专八', 'edu', 144, 192, 0, 0, { maxKb: 200 }),
  spec('ielts', '雅思报名', 'edu', 413, 531, 35, 45, { bg: 'white' }),
  spec('toefl', '托福报名', 'edu', 413, 531, 35, 45, { bg: 'white' }),
  spec('jlpt', '日语能力考', 'edu', 295, 413, 25, 35),
  spec('degree-en', '学位英语', 'edu', 144, 192, 0, 0, { maxKb: 200 }),
  spec('graduate', '毕业登记照', 'edu', 413, 579, 35, 49),
  spec('bachelor', '学士学位', 'edu', 295, 413, 25, 35),
  spec('retest', '研究生复试', 'edu', 295, 413, 25, 35)
]

const RECEIPT_HEAD = [
  ['drv-guangdong', '广东驾驶证', 413, 579, 35, 49],
  ['id-guizhou', '贵州省身份证', 358, 441, 26, 32],
  ['guard-guangzhou', '广州市保安证', 358, 441, 26, 32],
  ['guard-shenzhen', '深圳市保安证', 358, 441, 26, 32],
  ['guard-dongguan', '东莞市保安证', 358, 441, 26, 32],
  ['guard-zhuhai', '珠海市保安证', 358, 441, 26, 32],
  ['guard-shantou', '汕头市保安证', 358, 441, 26, 32],
  ['guard-foshan', '佛山市保安证', 358, 441, 26, 32],
  ['guard-jiangmen', '江门市保安证', 358, 441, 26, 32],
  ['guard-zhanjiang', '湛江市保安证', 358, 441, 26, 32],
  ['guard-maoming', '茂名市保安证', 358, 441, 26, 32],
  ['guard-zhaoqing', '肇庆市保安证', 358, 441, 26, 32],
  ['guard-huizhou', '惠州市保安证', 358, 441, 26, 32],
  ['guard-meizhou', '梅州市保安证', 358, 441, 26, 32]
]

const RECEIPT_GUARDS = [
  ['shaoguan', '韶关'],
  ['shanwei', '汕尾'],
  ['heyuan', '河源'],
  ['yangjiang', '阳江'],
  ['qingyuan', '清远'],
  ['zhongshan', '中山'],
  ['chaozhou', '潮州'],
  ['jieyang', '揭阳'],
  ['yunfu', '云浮']
]

const RECEIPT_IDS = [
  ['beijing', '北京市身份证'],
  ['tianjin', '天津市身份证'],
  ['hebei', '河北省身份证'],
  ['shanxi', '山西省身份证'],
  ['neimeng', '内蒙古自治区身份证'],
  ['liaoning', '辽宁省身份证'],
  ['jilin', '吉林省身份证'],
  ['heilongjiang', '黑龙江省身份证'],
  ['shanghai', '上海市身份证'],
  ['jiangsu', '江苏省身份证'],
  ['zhejiang', '浙江省身份证'],
  ['anhui', '安徽省身份证'],
  ['fujian', '福建省身份证'],
  ['jiangxi', '江西省身份证'],
  ['shandong', '山东省身份证'],
  ['henan', '河南省身份证'],
  ['hubei', '湖北省身份证'],
  ['hunan', '湖南省身份证'],
  ['guangdong', '广东省身份证'],
  ['guangxi', '广西壮族自治区身份证'],
  ['hainan', '海南省身份证'],
  ['chongqing', '重庆市身份证'],
  ['sichuan', '四川省身份证'],
  ['yunnan', '云南省身份证'],
  ['xizang', '西藏自治区身份证'],
  ['shaanxi', '陕西省身份证'],
  ['gansu', '甘肃省身份证'],
  ['qinghai', '青海省身份证'],
  ['ningxia', '宁夏回族自治区身份证'],
  ['xinjiang', '新疆维吾尔自治区身份证']
]

const RECEIPT_DRIVES = [
  ['beijing', '北京驾驶证'],
  ['tianjin', '天津驾驶证'],
  ['hebei', '河北驾驶证'],
  ['shanxi', '山西驾驶证'],
  ['neimeng', '内蒙古驾驶证'],
  ['liaoning', '辽宁驾驶证'],
  ['jilin', '吉林驾驶证'],
  ['heilongjiang', '黑龙江驾驶证'],
  ['shanghai', '上海驾驶证'],
  ['jiangsu', '江苏驾驶证'],
  ['zhejiang', '浙江驾驶证'],
  ['anhui', '安徽驾驶证'],
  ['fujian', '福建驾驶证'],
  ['jiangxi', '江西驾驶证'],
  ['shandong', '山东驾驶证'],
  ['henan', '河南驾驶证'],
  ['hubei', '湖北驾驶证'],
  ['hunan', '湖南驾驶证'],
  ['guangxi', '广西驾驶证'],
  ['hainan', '海南驾驶证'],
  ['chongqing', '重庆驾驶证'],
  ['sichuan', '四川驾驶证'],
  ['guizhou', '贵州驾驶证'],
  ['yunnan', '云南驾驶证'],
  ['xizang', '西藏驾驶证'],
  ['shaanxi', '陕西驾驶证'],
  ['gansu', '甘肃驾驶证'],
  ['qinghai', '青海驾驶证'],
  ['ningxia', '宁夏驾驶证'],
  ['xinjiang', '新疆驾驶证']
]

RECEIPT_HEAD.forEach((row) => {
  SPECS.push(spec(row[0], row[1], 'receipt', row[2], row[3], row[4], row[5], { bg: 'white' }))
})
RECEIPT_GUARDS.forEach((row) => {
  SPECS.push(spec(`guard-${row[0]}`, `${row[1]}市保安证`, 'receipt', 358, 441, 26, 32, { bg: 'white' }))
})
RECEIPT_IDS.forEach((row) => {
  SPECS.push(spec(`id-${row[0]}`, row[1], 'receipt', 358, 441, 26, 32, { bg: 'white' }))
})
RECEIPT_DRIVES.forEach((row) => {
  SPECS.push(spec(`drv-${row[0]}`, row[1], 'receipt', 413, 579, 35, 49, { bg: 'white' }))
})

const BY_ID = {}
SPECS.forEach((item) => {
  BY_ID[item.id] = item
})

function colorById(id) {
  const all = COLORS.concat(MORE_COLORS)
  for (let i = 0; i < all.length; i += 1) {
    if (all[i].id === id) return all[i]
  }
  return COLORS[0]
}

function getSpec(id) {
  return BY_ID[id] || null
}

function specsOf(group) {
  if (group === 'hot') return SPECS.filter((item) => item.hot)
  return SPECS.filter((item) => item.group === group)
}

function searchSpecs(keyword) {
  const text = String(keyword || '').trim().toLowerCase()
  if (!text) return []
  return SPECS.filter((item) => {
    const bag = `${item.name} ${item.width} ${item.height} ${item.mmW} ${item.mmH}`.toLowerCase()
    return bag.indexOf(text) >= 0
  })
}

function columnsOf(list) {
  const left = []
  const right = []
  ;(list || []).forEach((item, index) => {
    if (index % 2) right.push(item)
    else left.push(item)
  })
  return { left, right }
}

function presentSpec(item) {
  return {
    id: item.id,
    name: item.name,
    px: `电子：${item.width} x ${item.height}px`,
    mm: item.mmW ? `冲印：${item.mmW} x ${item.mmH}mm` : '冲印：按报名像素',
    size: item.mmW ? `${item.mmW} x ${item.mmH}mm` : `${item.width} x ${item.height}px`,
    bg: item.bg
  }
}

module.exports = {
  COLORS,
  MORE_COLORS,
  TABS,
  SPECS,
  colorById,
  getSpec,
  specsOf,
  searchSpecs,
  presentSpec,
  columnsOf
}
