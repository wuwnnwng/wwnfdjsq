/**
 * 省级足迹：点亮记录与配色（名称与 echarts china 地图一致）
 */

const STORAGE_KEY = 'footprint:litProvinces'
const START_KEY = 'footprint:startProvince'
const UNLIT_DARK = '#243044'
const UNLIT_LIGHT = '#dbe3ee'
const BORDER_DARK = '#5b6b82'
const BORDER_LIGHT = '#94a3b8'

const PROVINCES = [
  { name: '北京', color: '#ef4444' },
  { name: '天津', color: '#f97316' },
  { name: '河北', color: '#eab308' },
  { name: '山西', color: '#84cc16' },
  { name: '内蒙古', color: '#22c55e' },
  { name: '辽宁', color: '#14b8a6' },
  { name: '吉林', color: '#06b6d4' },
  { name: '黑龙江', color: '#0ea5e9' },
  { name: '上海', color: '#3b82f6' },
  { name: '江苏', color: '#6366f1' },
  { name: '浙江', color: '#8b5cf6' },
  { name: '安徽', color: '#a855f7' },
  { name: '福建', color: '#d946ef' },
  { name: '江西', color: '#ec4899' },
  { name: '山东', color: '#f43f5e' },
  { name: '河南', color: '#fb7185' },
  { name: '湖北', color: '#fb923c' },
  { name: '湖南', color: '#facc15' },
  { name: '广东', color: '#4ade80' },
  { name: '广西', color: '#2dd4bf' },
  { name: '海南', color: '#67e8f9' },
  { name: '重庆', color: '#60a5fa' },
  { name: '四川', color: '#818cf8' },
  { name: '贵州', color: '#c084fc' },
  { name: '云南', color: '#e879f9' },
  { name: '西藏', color: '#f0abfc' },
  { name: '陕西', color: '#fda4af' },
  { name: '甘肃', color: '#fdba74' },
  { name: '青海', color: '#86efac' },
  { name: '宁夏', color: '#5eead4' },
  { name: '新疆', color: '#7dd3fc' },
  { name: '香港', color: '#a5b4fc' },
  { name: '澳门', color: '#d8b4fe' },
  { name: '台湾', color: '#f9a8d4' }
]

const COLOR_MAP = {}
PROVINCES.forEach((item) => {
  COLOR_MAP[item.name] = item.color
})

function readLitSet() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    const list = Array.isArray(raw) ? raw : []
    const set = {}
    list.forEach((name) => {
      if (COLOR_MAP[name]) set[name] = true
    })
    return set
  } catch (e) {
    return {}
  }
}

function writeLitSet(set) {
  const list = PROVINCES.map((item) => item.name).filter((name) => set[name])
  try {
    wx.setStorageSync(STORAGE_KEY, list)
  } catch (e) {}
  return list
}

function toggleLit(set, name) {
  const next = Object.assign({}, set)
  if (next[name]) delete next[name]
  else next[name] = true
  writeLitSet(next)
  return next
}

function clearLit() {
  writeLitSet({})
  return {}
}

function readStartName() {
  try {
    const name = wx.getStorageSync(START_KEY)
    return COLOR_MAP[name] ? name : ''
  } catch (e) {
    return ''
  }
}

function writeStartName(name) {
  const next = COLOR_MAP[name] ? name : ''
  try {
    if (next) wx.setStorageSync(START_KEY, next)
    else wx.removeStorageSync(START_KEY)
  } catch (e) {}
  return next
}

function buildChips(litSet, startName) {
  return PROVINCES.map((item) => ({
    name: item.name,
    color: item.color,
    lit: !!litSet[item.name],
    start: item.name === startName
  }))
}

function buildMapData(litSet, dark) {
  const unlit = dark ? UNLIT_DARK : UNLIT_LIGHT
  return PROVINCES.map((item) => {
    const lit = !!litSet[item.name]
    return {
      name: item.name,
      value: lit ? 1 : 0,
      itemStyle: {
        areaColor: lit ? item.color : unlit
      }
    }
  })
}

function buildMapOption(litSet, dark) {
  const unlit = dark ? UNLIT_DARK : UNLIT_LIGHT
  const border = dark ? BORDER_DARK : BORDER_LIGHT
  return {
    backgroundColor: 'transparent',
    tooltip: { show: false },
    series: [
      {
        type: 'map',
        map: 'china',
        roam: false,
        zoom: 1.16,
        top: 12,
        bottom: 12,
        selectedMode: false,
        data: buildMapData(litSet, dark),
        itemStyle: {
          areaColor: unlit,
          borderColor: border,
          borderWidth: 0.8
        },
        label: { show: false },
        emphasis: {
          disabled: true
        },
        select: {
          disabled: true
        }
      }
    ]
  }
}

module.exports = {
  PROVINCES,
  COLOR_MAP,
  readLitSet,
  writeLitSet,
  toggleLit,
  clearLit,
  readStartName,
  writeStartName,
  buildChips,
  buildMapOption
}
