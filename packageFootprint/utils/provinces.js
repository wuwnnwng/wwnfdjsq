/**
 * 34 个省级行政区：稳定 id、短名、专属色
 */
const PROVINCES = [
  { id: 'beijing', name: '北京', region: '华北', color: '#4ade80' },
  { id: 'tianjin', name: '天津', region: '华北', color: '#22d3ee' },
  { id: 'hebei', name: '河北', region: '华北', color: '#f472b6' },
  { id: 'shanxi', name: '山西', region: '华北', color: '#86efac' },
  { id: 'neimenggu', name: '内蒙古', region: '华北', color: '#2dd4bf' },
  { id: 'liaoning', name: '辽宁', region: '东北', color: '#60a5fa' },
  { id: 'jilin', name: '吉林', region: '东北', color: '#fdba74' },
  { id: 'heilongjiang', name: '黑龙江', region: '东北', color: '#ef4444' },
  { id: 'shanghai', name: '上海', region: '华东', color: '#e879f9' },
  { id: 'jiangsu', name: '江苏', region: '华东', color: '#a78bfa' },
  { id: 'zhejiang', name: '浙江', region: '华东', color: '#f9a8d4' },
  { id: 'anhui', name: '安徽', region: '华东', color: '#fbbf24' },
  { id: 'fujian', name: '福建', region: '华东', color: '#38bdf8' },
  { id: 'jiangxi', name: '江西', region: '华东', color: '#34d399' },
  { id: 'shandong', name: '山东', region: '华东', color: '#fb7185' },
  { id: 'henan', name: '河南', region: '华中', color: '#c084fc' },
  { id: 'hubei', name: '湖北', region: '华中', color: '#818cf8' },
  { id: 'hunan', name: '湖南', region: '华中', color: '#facc15' },
  { id: 'guangdong', name: '广东', region: '华南', color: '#f472b6' },
  { id: 'guangxi', name: '广西', region: '华南', color: '#4ade80' },
  { id: 'hainan', name: '海南', region: '华南', color: '#67e8f9' },
  { id: 'chongqing', name: '重庆', region: '西南', color: '#fb923c' },
  { id: 'sichuan', name: '四川', region: '西南', color: '#d8b4fe' },
  { id: 'guizhou', name: '贵州', region: '西南', color: '#86efac' },
  { id: 'yunnan', name: '云南', region: '西南', color: '#5eead4' },
  { id: 'xizang', name: '西藏', region: '西南', color: '#93c5fd' },
  { id: 'shaanxi', name: '陕西', region: '西北', color: '#f87171' },
  { id: 'gansu', name: '甘肃', region: '西北', color: '#fb7185' },
  { id: 'qinghai', name: '青海', region: '西北', color: '#a3e635' },
  { id: 'ningxia', name: '宁夏', region: '西北', color: '#f472b6' },
  { id: 'xinjiang', name: '新疆', region: '西北', color: '#fbbf24' },
  { id: 'hongkong', name: '香港', region: '港澳台', color: '#c084fc' },
  { id: 'macao', name: '澳门', region: '港澳台', color: '#f43f5e' },
  { id: 'taiwan', name: '台湾', region: '港澳台', color: '#3b82f6' }
]

const CHIP_ORDER = [
  'beijing', 'tianjin', 'shanghai', 'chongqing', 'neimenggu', 'guangxi', 'xizang',
  'ningxia', 'xinjiang', 'hebei', 'shanxi', 'liaoning', 'jilin', 'heilongjiang',
  'jiangsu', 'zhejiang', 'anhui', 'fujian', 'jiangxi', 'shandong', 'henan',
  'hubei', 'hunan', 'guangdong', 'hainan', 'sichuan', 'guizhou', 'yunnan',
  'shaanxi', 'gansu', 'qinghai', 'taiwan', 'hongkong', 'macao'
]

const PROVINCE_MAP = {}
PROVINCES.forEach((item) => {
  PROVINCE_MAP[item.id] = item
})

const TINY_IDS = ['beijing', 'tianjin', 'shanghai', 'hongkong', 'macao', 'ningxia', 'hainan', 'taiwan']

const HIT_ORDER = TINY_IDS.concat(PROVINCES.map((item) => item.id).filter((id) => TINY_IDS.indexOf(id) < 0))

const DRAW_ORDER = PROVINCES.map((item) => item.id).filter((id) => TINY_IDS.indexOf(id) < 0).concat(TINY_IDS)

function getProvince(id) {
  return PROVINCE_MAP[id] || null
}

function hexToRgba(hex, alpha) {
  const raw = String(hex || '').replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const n = parseInt(full, 16)
  if (!Number.isFinite(n) || full.length < 6) return `rgba(148, 163, 184, ${alpha})`
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

module.exports = {
  PROVINCES,
  PROVINCE_MAP,
  CHIP_ORDER,
  TINY_IDS,
  HIT_ORDER,
  DRAW_ORDER,
  getProvince,
  hexToRgba
}
