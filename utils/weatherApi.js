/**
 * 天气
 * 数据源：Open-Meteo（无需密钥）
 * - 预报 https://api.open-meteo.com/v1/forecast
 * - 城市检索 https://geocoding-api.open-meteo.com/v1/search
 * 仅缓存上次选择的城市；每次进入或切换城市都会重新拉取天气
 *
 * 小程序 request 合法域名：
 * - https://api.open-meteo.com
 * - https://geocoding-api.open-meteo.com
 */

const STORAGE_PLACE = 'weather_last_place_v1'
const STORAGE_CACHE_PREFIX = 'weather_cache_v1_'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'

const DEFAULT_PLACE = {
  id: 'beijing',
  name: '北京',
  region: '北京市',
  latitude: 39.9042,
  longitude: 116.4074
}

const HOT_CITIES = [
  DEFAULT_PLACE,
  { id: 'shanghai', name: '上海', region: '上海市', latitude: 31.2304, longitude: 121.4737 },
  { id: 'guangzhou', name: '广州', region: '广东省', latitude: 23.1291, longitude: 113.2644 },
  { id: 'shenzhen', name: '深圳', region: '广东省', latitude: 22.5431, longitude: 114.0579 },
  { id: 'hangzhou', name: '杭州', region: '浙江省', latitude: 30.2741, longitude: 120.1551 },
  { id: 'chengdu', name: '成都', region: '四川省', latitude: 30.5728, longitude: 104.0668 },
  { id: 'chongqing', name: '重庆', region: '重庆市', latitude: 29.563, longitude: 106.5516 },
  { id: 'wuhan', name: '武汉', region: '湖北省', latitude: 30.5928, longitude: 114.3055 },
  { id: 'xian', name: '西安', region: '陕西省', latitude: 34.3416, longitude: 108.9398 },
  { id: 'nanjing', name: '南京', region: '江苏省', latitude: 32.0603, longitude: 118.7969 },
  { id: 'suzhou', name: '苏州', region: '江苏省', latitude: 31.2989, longitude: 120.5853 },
  { id: 'tianjin', name: '天津', region: '天津市', latitude: 39.3434, longitude: 117.3616 },
  { id: 'changsha', name: '长沙', region: '湖南省', latitude: 28.2282, longitude: 112.9388 },
  { id: 'zhengzhou', name: '郑州', region: '河南省', latitude: 34.7466, longitude: 113.6254 },
  { id: 'qingdao', name: '青岛', region: '山东省', latitude: 36.0671, longitude: 120.3826 },
  { id: 'xiamen', name: '厦门', region: '福建省', latitude: 24.4798, longitude: 118.0894 },
  { id: 'hefei', name: '合肥', region: '安徽省', latitude: 31.8206, longitude: 117.2272 },
  { id: 'jinan', name: '济南', region: '山东省', latitude: 36.6512, longitude: 117.1201 },
  { id: 'shenyang', name: '沈阳', region: '辽宁省', latitude: 41.8057, longitude: 123.4315 },
  { id: 'dalian', name: '大连', region: '辽宁省', latitude: 38.914, longitude: 121.6147 },
  { id: 'harbin', name: '哈尔滨', region: '黑龙江省', latitude: 45.8038, longitude: 126.5349 },
  { id: 'kunming', name: '昆明', region: '云南省', latitude: 25.0389, longitude: 102.7183 },
  { id: 'nanning', name: '南宁', region: '广西', latitude: 22.817, longitude: 108.3665 },
  { id: 'haikou', name: '海口', region: '海南省', latitude: 20.044, longitude: 110.1983 },
  { id: 'hongkong', name: '香港', region: '香港', latitude: 22.3193, longitude: 114.1694 },
  { id: 'taipei', name: '台北', region: '台湾', latitude: 25.033, longitude: 121.5654 }
]

const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WIND_DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']

const WEATHER_MAP = {
  0: { text: '晴', day: '☀️', night: '🌙' },
  1: { text: '大部晴朗', day: '🌤️', night: '🌙' },
  2: { text: '多云', day: '⛅', night: '☁️' },
  3: { text: '阴', day: '☁️', night: '☁️' },
  45: { text: '雾', day: '🌫️', night: '🌫️' },
  48: { text: '雾凇', day: '🌫️', night: '🌫️' },
  51: { text: '小毛毛雨', day: '🌦️', night: '🌧️' },
  53: { text: '毛毛雨', day: '🌦️', night: '🌧️' },
  55: { text: '大毛毛雨', day: '🌧️', night: '🌧️' },
  56: { text: '冻毛毛雨', day: '🌧️', night: '🌧️' },
  57: { text: '强冻毛毛雨', day: '🌧️', night: '🌧️' },
  61: { text: '小雨', day: '🌦️', night: '🌧️' },
  63: { text: '中雨', day: '🌧️', night: '🌧️' },
  65: { text: '大雨', day: '🌧️', night: '🌧️' },
  66: { text: '冻雨', day: '🌧️', night: '🌧️' },
  67: { text: '强冻雨', day: '🌧️', night: '🌧️' },
  71: { text: '小雪', day: '🌨️', night: '🌨️' },
  73: { text: '中雪', day: '❄️', night: '❄️' },
  75: { text: '大雪', day: '❄️', night: '❄️' },
  77: { text: '雪粒', day: '🌨️', night: '🌨️' },
  80: { text: '小阵雨', day: '🌦️', night: '🌧️' },
  81: { text: '阵雨', day: '🌧️', night: '🌧️' },
  82: { text: '强阵雨', day: '🌧️', night: '🌧️' },
  85: { text: '小阵雪', day: '🌨️', night: '🌨️' },
  86: { text: '阵雪', day: '❄️', night: '❄️' },
  95: { text: '雷阵雨', day: '⛈️', night: '⛈️' },
  96: { text: '雷暴伴冰雹', day: '⛈️', night: '⛈️' },
  99: { text: '强雷暴伴冰雹', day: '⛈️', night: '⛈️' }
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function roundCoord(value) {
  return Math.round(Number(value) * 100) / 100
}

function weatherInfo(code, isDay) {
  const item = WEATHER_MAP[Number(code)] || { text: '未知', day: '🌡️', night: '🌡️' }
  return {
    text: item.text,
    icon: isDay ? item.day : item.night
  }
}

function windText(degree, speedKmh) {
  const speed = Number(speedKmh)
  const deg = Number(degree)
  const dir = Number.isFinite(deg)
    ? `${WIND_DIRS[Math.round(deg / 45) % 8]}风`
    : '风'
  if (!Number.isFinite(speed)) return dir
  return `${dir} ${Math.round(speed)} km/h`
}

function formatClock(iso) {
  if (!iso) return '--'
  const match = String(iso).match(/T(\d{2}:\d{2})/)
  if (match) return match[1]
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--'
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function formatUpdatedAt(iso) {
  const clock = formatClock(iso)
  return clock === '--' ? '' : `更新于 ${clock}`
}

function weekdayLabel(dateStr, index) {
  if (index === 0) return '今天'
  if (index === 1) return '明天'
  const date = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  return WEEK_LABELS[date.getDay()]
}

function buildPlace(partial) {
  const latitude = Number(partial && partial.latitude)
  const longitude = Number(partial && partial.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const name = (partial && partial.name) || '当前位置'
  const region = (partial && partial.region) || ''
  return {
    id: (partial && partial.id) || `${roundCoord(latitude)}_${roundCoord(longitude)}`,
    name,
    region,
    latitude,
    longitude,
    displayName: region && region !== name ? `${name} · ${region}` : name
  }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearestHotCity(latitude, longitude) {
  let best = null
  let bestKm = Infinity
  HOT_CITIES.forEach((city) => {
    const km = haversineKm(latitude, longitude, city.latitude, city.longitude)
    if (km < bestKm) {
      bestKm = km
      best = city
    }
  })
  if (!best || bestKm > 80) return null
  return buildPlace(best)
}

function clearWeatherDataCache() {
  try {
    const info = wx.getStorageInfoSync()
    const keys = (info && info.keys) || []
    keys.forEach((key) => {
      if (String(key).indexOf(STORAGE_CACHE_PREFIX) === 0) {
        wx.removeStorageSync(key)
      }
    })
  } catch (e) {
    // ignore
  }
}

function getLastPlace() {
  clearWeatherDataCache()
  try {
    return buildPlace(wx.getStorageSync(STORAGE_PLACE))
  } catch (e) {
    return null
  }
}

function saveLastPlace(place) {
  const next = buildPlace(place)
  if (!next) return
  try {
    wx.setStorageSync(STORAGE_PLACE, next)
  } catch (e) {
    // ignore
  }
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      timeout: 15000,
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        if (!res.data || typeof res.data !== 'object') {
          reject(new Error('invalid json'))
          return
        }
        resolve(res.data)
      },
      fail(err) {
        reject(err || new Error('network fail'))
      }
    })
  })
}

function pickHourly(hourly) {
  if (!hourly || !hourly.time || !hourly.time.length) return []
  const now = Date.now() - 20 * 60 * 1000
  const items = []
  for (let i = 0; i < hourly.time.length; i += 1) {
    const iso = hourly.time[i]
    const date = new Date(iso)
    if (Number.isNaN(date.getTime()) || date.getTime() < now) continue
    const hour = date.getHours()
    const isDay = hour >= 6 && hour < 19
    const info = weatherInfo(hourly.weather_code && hourly.weather_code[i], isDay)
    const pop = hourly.precipitation_probability && hourly.precipitation_probability[i]
    const popValue = Number.isFinite(Number(pop)) ? Math.round(Number(pop)) : null
    items.push({
      key: iso,
      label: items.length === 0 ? '现在' : `${hour}时`,
      temp: Math.round(Number(hourly.temperature_2m[i])),
      icon: info.icon,
      pop: popValue,
      showPop: popValue !== null
    })
    if (items.length >= 12) break
  }
  return items
}

function pickDaily(daily) {
  if (!daily || !daily.time || !daily.time.length) return []
  return daily.time.map((dateStr, index) => {
    const info = weatherInfo(daily.weather_code && daily.weather_code[index], true)
    const pop = daily.precipitation_probability_max && daily.precipitation_probability_max[index]
    const popValue = Number.isFinite(Number(pop)) ? Math.round(Number(pop)) : null
    return {
      key: dateStr,
      label: weekdayLabel(dateStr, index),
      icon: info.icon,
      text: info.text,
      min: Math.round(Number(daily.temperature_2m_min[index])),
      max: Math.round(Number(daily.temperature_2m_max[index])),
      pop: popValue,
      showPop: popValue !== null
    }
  })
}

function parseForecast(payload, place) {
  const current = payload && payload.current
  if (!current || current.temperature_2m === undefined) return null
  const isDay = Number(current.is_day) === 1
  const info = weatherInfo(current.weather_code, isDay)
  const daily = pickDaily(payload.daily)
  const today = daily[0] || null
  return {
    place,
    icon: info.icon,
    text: info.text,
    temperature: Math.round(Number(current.temperature_2m)),
    apparent: Math.round(Number(current.apparent_temperature)),
    humidity: Math.round(Number(current.relative_humidity_2m)),
    wind: windText(current.wind_direction_10m, current.wind_speed_10m),
    precipitation: Number(current.precipitation) || 0,
    todayMin: today ? today.min : '--',
    todayMax: today ? today.max : '--',
    sunrise: formatClock(payload.daily && payload.daily.sunrise && payload.daily.sunrise[0]),
    sunset: formatClock(payload.daily && payload.daily.sunset && payload.daily.sunset[0]),
    updatedAt: formatUpdatedAt(current.time),
    hourly: pickHourly(payload.hourly),
    daily,
    source: 'open-meteo'
  }
}

function buildForecastUrl(latitude, longitude) {
  return [
    FORECAST_URL,
    `?latitude=${encodeURIComponent(latitude)}`,
    `&longitude=${encodeURIComponent(longitude)}`,
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day',
    '&hourly=temperature_2m,weather_code,precipitation_probability',
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    '&timezone=auto',
    '&forecast_days=7'
  ].join('')
}

async function fetchForecast(place) {
  const payload = await requestJson(buildForecastUrl(place.latitude, place.longitude))
  const parsed = parseForecast(payload, place)
  if (!parsed) throw new Error('invalid weather payload')
  return parsed
}

async function loadWeather(place) {
  const nextPlace = buildPlace(place) || DEFAULT_PLACE
  saveLastPlace(nextPlace)

  try {
    const remote = await fetchForecast(nextPlace)
    return {
      ...remote,
      fromCache: false,
      stale: false,
      error: ''
    }
  } catch (e) {
    return {
      place: nextPlace,
      icon: '🌡️',
      text: '暂无数据',
      temperature: '--',
      apparent: '--',
      humidity: '--',
      wind: '--',
      precipitation: 0,
      todayMin: '--',
      todayMax: '--',
      sunrise: '--',
      sunset: '--',
      updatedAt: '',
      hourly: [],
      daily: [],
      fromCache: false,
      stale: false,
      error: '暂未获取天气：请检查网络，并配置合法域名 api.open-meteo.com'
    }
  }
}

function parseGeoResults(payload) {
  const list = payload && payload.results
  if (!Array.isArray(list)) return []
  return list
    .map((item) => {
      const region = [item.admin1, item.country]
        .filter(Boolean)
        .filter((part, index, arr) => arr.indexOf(part) === index)
        .join(' · ')
      return buildPlace({
        id: String(item.id || `${item.latitude}_${item.longitude}`),
        name: item.name,
        region,
        latitude: item.latitude,
        longitude: item.longitude
      })
    })
    .filter(Boolean)
}

async function searchCities(keyword) {
  const q = String(keyword || '').trim()
  if (!q) return []
  const local = HOT_CITIES.filter((city) => city.name.indexOf(q) >= 0 || city.region.indexOf(q) >= 0)
    .map(buildPlace)
  try {
    const payload = await requestJson(
      `${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=8&language=zh&format=json`
    )
    const remote = parseGeoResults(payload)
    const seen = {}
    return local.concat(remote).filter((item) => {
      const key = item.displayName
      if (seen[key]) return false
      seen[key] = true
      return true
    }).slice(0, 12)
  } catch (e) {
    return local
  }
}

function placeFromLocation(latitude, longitude) {
  const nearest = nearestHotCity(latitude, longitude)
  if (nearest) return nearest
  return buildPlace({
    name: '当前位置',
    region: '',
    latitude,
    longitude
  })
}

module.exports = {
  HOT_CITIES,
  DEFAULT_PLACE,
  getLastPlace,
  saveLastPlace,
  loadWeather,
  searchCities,
  placeFromLocation,
  buildPlace
}
