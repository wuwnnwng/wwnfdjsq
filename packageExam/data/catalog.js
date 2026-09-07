const CATALOG = [
  {
    id: 'xingce',
    name: '行测',
    kicker: '常识 · 言语 · 数量 · 判断 · 资料',
    types: [
      { id: 'changshi', name: '常识判断', hint: '时政法律科技人文', count: 32 },
      { id: 'tiankong', name: '逻辑填空', hint: '语境词语搭配', count: 32 },
      { id: 'pianduan', name: '片段阅读', hint: '主旨细节推断', count: 32 },
      { id: 'yuju', name: '语句表达', hint: '排序衔接填空', count: 32 },
      { id: 'shuxue', name: '数学运算', hint: '工程行程排列', count: 32 },
      { id: 'tuxing', name: '图形推理', hint: '数量样式位置', count: 32 },
      { id: 'dingyi', name: '定义判断', hint: '拆点对照排除', count: 32 },
      { id: 'leibi', name: '类比推理', hint: '关系纵向验证', count: 32 },
      { id: 'luoji', name: '逻辑判断', hint: '论证翻译朴素', count: 32 },
      { id: 'ziliao', name: '资料分析', hint: '增长比重速算', count: 32 }
    ]
  },
  {
    id: 'shenlun',
    name: '申论',
    kicker: '概括 · 分析 · 对策 · 公文 · 大作文',
    types: [
      { id: 'gaikuo', name: '归纳概括', hint: '找点分类书写', count: 32 },
      { id: 'fenxi', name: '综合分析', hint: '解释评论关系', count: 32 },
      { id: 'duice', name: '提出对策', hint: '针对可行具体', count: 32 },
      { id: 'zhixing', name: '贯彻执行', hint: '格式对象目的', count: 32 },
      { id: 'wenzhang', name: '申发论述', hint: '立意结构论证', count: 32 }
    ]
  }
]

function getTypeMeta(typeId) {
  for (let i = 0; i < CATALOG.length; i += 1) {
    const section = CATALOG[i]
    const found = section.types.find((item) => item.id === typeId)
    if (found) {
      return {
        sectionId: section.id,
        sectionName: section.name,
        typeId: found.id,
        name: found.name,
        hint: found.hint,
        count: found.count
      }
    }
  }
  return null
}

module.exports = {
  CATALOG,
  getTypeMeta
}
