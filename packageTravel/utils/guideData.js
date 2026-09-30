const index = require('./guideIndex')
const { localOf } = require('./guideLocal')

const DEFAULT_CITY_ID = 'p50'

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
  if (place.overview) return provinceName(place.provinceId)
  const province = provinceName(place.provinceId)
  const city = index.cityName[place.cityCode] || ''
  if (!city || city === '市辖区' || city === '县' || city.indexOf('直辖') >= 0) return province
  const shortCity = city.replace(/市$/, '')
  if (shortCity === province) return province
  return `${province} · ${shortCity}`
}

function listsOf(place) {
  const key = `${place.provinceId}|${place.name}`
  if (place.overview || (index.extraFood[place.provinceId] && !index.provinceFood[place.provinceId])) {
    return {
      foods: index.provinceFood[place.provinceId] || index.extraFood[place.provinceId] || [],
      sights: index.provinceSight[place.provinceId] || index.extraSight[place.provinceId] || []
    }
  }
  return localOf(place)
}

function findPlace(id) {
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
  index.places.forEach((row) => {
    if (row[3] === provinceId) list.push(placeFromRow(row))
  })
  return list
}

function filterPlaces(keyword) {
  const text = (keyword || '').replace(/\s/g, '')
  if (!text) return []
  const hits = []
  for (let i = 0; i < index.places.length && hits.length < 80; i += 1) {
    if (index.places[i][1].indexOf(text) >= 0) hits.push(placeFromRow(index.places[i]))
  }
  return hits
}

module.exports = {
  DEFAULT_CITY_ID,
  provinces,
  placesOf,
  filterPlaces,
  findPlace,
  listsOf,
  regionOf
}
