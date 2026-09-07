const { getTypeMeta } = require('./catalog')

const LOADERS = {
  changshi: () => require('./changshi'),
  tiankong: () => require('./tiankong'),
  pianduan: () => require('./pianduan'),
  yuju: () => require('./yuju'),
  shuxue: () => require('./shuxue'),
  tuxing: () => require('./tuxing'),
  dingyi: () => require('./dingyi'),
  leibi: () => require('./leibi'),
  luoji: () => require('./luoji'),
  ziliao: () => require('./ziliao'),
  gaikuo: () => require('./gaikuo'),
  fenxi: () => require('./fenxi'),
  duice: () => require('./duice'),
  zhixing: () => require('./zhixing'),
  wenzhang: () => require('./wenzhang')
}

function loadCards(typeId) {
  const loader = LOADERS[typeId]
  if (!loader) return []
  const cards = loader()
  return Array.isArray(cards) ? cards : []
}

function loadType(typeId) {
  const meta = getTypeMeta(typeId)
  if (!meta) return null
  const cards = loadCards(typeId)
  return Object.assign({}, meta, { cards, count: cards.length })
}

module.exports = {
  loadCards,
  loadType
}
