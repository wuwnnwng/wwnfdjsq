const index = require('./guideIndex')
const { localOf } = require('./guideLocal')
const { fillCity } = require('./guideFill')

const DEFAULT_CITY_ID = 'p50'

const CAPITAL_CODE = {
  '13': '1301',
  '14': '1401',
  '15': '1501',
  '21': '2101',
  '22': '2201',
  '23': '2301',
  '32': '3201',
  '33': '3301',
  '34': '3401',
  '35': '3501',
  '36': '3601',
  '37': '3701',
  '41': '4101',
  '42': '4201',
  '43': '4301',
  '44': '4401',
  '45': '4501',
  '46': '4601',
  '51': '5101',
  '52': '5201',
  '53': '5301',
  '54': '5401',
  '61': '6101',
  '62': '6201',
  '63': '6301',
  '64': '6401',
  '65': '6501'
}

function defaultPlaceId(provinceId) {
  const code = CAPITAL_CODE[provinceId]
  if (code && cityLabel(code)) return `c${code}`
  if (index.extraFood[provinceId]) {
    const row = index.places.find((item) => item[3] === provinceId)
    if (row) return row[0]
  }
  return `p${provinceId}`
}

function cityLabel(cityCode) {
  const city = index.cityName[cityCode] || ''
  if (!city || city === '市辖区' || city === '县' || city.indexOf('直辖') >= 0) return ''
  return city.replace(/市$/, '').replace(/特别行政区$/, '')
}

function cityPlace(cityCode, provinceId) {
  return {
    id: `c${cityCode}`,
    name: cityLabel(cityCode),
    cityCode,
    provinceId,
    overview: false,
    citywide: true
  }
}

function isDistrictPlace(name) {
  if (/林区$/.test(name)) return false
  if (/区$/.test(name)) return true
  return /开发区$|园区$|示范区$|实验区$|管理区$|新城$/.test(name)
}

function isUrbanDistrict(row) {
  if (/[县旗市]$/.test(row[1])) return false
  if (isDistrictPlace(row[1])) return true
  return !!cityLabel(row[2])
}

function mergedLists(cityCode) {
  const foods = (index.cityFood[cityCode] || []).slice(0, 10)
  const sights = (index.citySight[cityCode] || []).slice(0, 10)
  if (foods.length || sights.length) return { foods, sights }
  const filled = fillCity(cityCode)
  if (filled.foods.length || filled.sights.length) return filled
  const rolledFoods = []
  const rolledSights = []
  index.places.forEach((row) => {
    if (row[2] !== cityCode || !isUrbanDistrict(row)) return
    const local = localOf(placeFromRow(row))
    local.foods.forEach((name) => {
      if (rolledFoods.indexOf(name) < 0 && rolledFoods.length < 10) rolledFoods.push(name)
    })
    local.sights.forEach((name) => {
      if (rolledSights.indexOf(name) < 0 && rolledSights.length < 10) rolledSights.push(name)
    })
  })
  return { foods: rolledFoods, sights: rolledSights }
}

function provinceById(id) {
  return index.provinces.find((item) => item.id === id)
}

function provinceName(id) {
  const row = provinceById(id)
  return row ? row.name : ''
}

function placeFromRow(row) {
  return {
    id: row[0],
    name: row[1],
    cityCode: row[2],
    provinceId: row[3],
    overview: false
  }
}

function overview(provinceId) {
  return {
    id: `p${provinceId}`,
    name: provinceName(provinceId),
    cityCode: '',
    provinceId,
    overview: true
  }
}

function regionOf(place) {
  if (place.overview || place.citywide) return provinceName(place.provinceId)
  const province = provinceName(place.provinceId)
  const city = index.cityName[place.cityCode] || ''
  if (!city || city === '市辖区' || city === '县' || city.indexOf('直辖') >= 0) return province
  const shortCity = city.replace(/市$/, '')
  if (shortCity === province) return province
  return `${province} · ${shortCity}`
}

function listsOf(place) {
  if (place.citywide) return mergedLists(place.cityCode)
  if (place.overview || (index.extraFood[place.provinceId] && !index.provinceFood[place.provinceId])) {
    return {
      foods: index.provinceFood[place.provinceId] || index.extraFood[place.provinceId] || [],
      sights: index.provinceSight[place.provinceId] || index.extraSight[place.provinceId] || []
    }
  }
  return localOf(place)
}

function findPlace(id) {
  if (id && id.charAt(0) === 'c' && cityLabel(id.slice(1))) {
    const code = id.slice(1)
    const row = index.places.find((item) => item[2] === code)
    if (row) return cityPlace(code, row[3])
  }
  if (id && id.charAt(0) === 'p' && provinceById(id.slice(1))) return overview(id.slice(1))
  const row = index.places.find((item) => item[0] === id)
  return row ? placeFromRow(row) : overview('50')
}

function provinces() {
  const chongqing = index.provinces.find((item) => item.id === '50')
  return [chongqing].concat(index.provinces.filter((item) => item.id !== '50'))
}

function placesOf(provinceId) {
  if (index.extraFood[provinceId]) {
    return index.places.filter((row) => row[3] === provinceId).map(placeFromRow)
  }
  const list = [overview(provinceId)]
  const seen = {}
  index.places.forEach((row) => {
    if (row[3] !== provinceId) return
    if (isUrbanDistrict(row)) {
      if (cityLabel(row[2]) && !seen[row[2]]) {
        list.push(cityPlace(row[2], provinceId))
        seen[row[2]] = true
      }
      return
    }
    list.push(placeFromRow(row))
  })
  return list
}

function filterPlaces(keyword) {
  const text = (keyword || '').replace(/\s/g, '')
  if (!text) return []
  const hits = []
  const seen = {}
  index.provinces.forEach((province) => {
    if (province.name.indexOf(text) >= 0) hits.push(overview(province.id))
  })
  Object.keys(index.cityName).forEach((code) => {
    const name = cityLabel(code)
    if (!name || name.indexOf(text) < 0 || seen[code]) return
    const row = index.places.find((item) => item[2] === code && isUrbanDistrict(item))
    if (!row) return
    seen[code] = true
    hits.push(cityPlace(code, row[3]))
  })
  for (let i = 0; i < index.places.length && hits.length < 80; i += 1) {
    if (isUrbanDistrict(index.places[i])) continue
    if (index.places[i][1].indexOf(text) >= 0) hits.push(placeFromRow(index.places[i]))
  }
  return hits.slice(0, 80)
}

module.exports = {
  DEFAULT_CITY_ID,
  defaultPlaceId,
  provinces,
  placesOf,
  filterPlaces,
  findPlace,
  listsOf,
  regionOf
}
