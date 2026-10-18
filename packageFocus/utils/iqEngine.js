/**
 * 短时智力估算。
 * 每份卷 16 题、4 个方面各 4 题，难度按该年龄能稳定完成的水平来写。
 * 年龄典型表现按对 10 题记为 100。原始分每离这个中心 2.5 题，指数大约变化 15。
 * 四选一随机大约对 4 题。对 6 题及以下不报指数。
 * 16 题的稳定度按 0.72 估计，90% 的波动大约上下 13 分。
 * 短卷区分不开 70 以下和 130 以上，报告限制在这个范围。
 * 这不是韦氏、瑞文或入学鉴定。
 */

const DOMAINS = [
  { id: 'verbal', name: '词语关系' },
  { id: 'number', name: '数量关系' },
  { id: 'space', name: '空间变换' },
  { id: 'reason', name: '逻辑推理' }
]

const MEAN_RAW = 10
const RAW_SD = 2.5
const RELIABILITY = 0.72
const BAND = 13
const FLOOR = 70
const CEILING = 130
const CHANCE_CUTOFF = 6

function q(domain, prompt, options, answer, note, rows) {
  return {
    domain,
    prompt,
    options,
    answer,
    note,
    rows: rows || []
  }
}

const FORMS = [
  {
    id: 'c68',
    group: 'child',
    name: '儿童卷',
    ageText: '6–8 岁',
    hint: '句子短，用身边的事物。适合小学低年级。',
    items: [
      q('verbal', '猫会「喵喵」叫，狗通常会怎样叫？', ['嘎嘎', '汪汪', '哞哞', '咩咩'], 1, '狗的叫声是汪汪。'),
      q('verbal', '鸟住的地方常叫鸟巢，蜜蜂住的地方常叫什么？', ['鱼缸', '书柜', '蜂巢', '鞋子'], 2, '蜜蜂住蜂巢。'),
      q('verbal', '冰摸上去是冷的，火靠近时主要是？', ['安静的', '方形的', '绿色的', '热的'], 3, '冷和热是一对。'),
      q('verbal', '医生多在医院工作，老师多在哪里工作？', ['学校', '厨房', '车站', '公园'], 0, '老师对应学校。'),
      q('number', '2、4、6、8，下一个数是？', ['9', '10', '12', '7'], 1, '每次加 2。'),
      q('number', '1、3、5、7，下一个数是？', ['9', '8', '10', '6'], 0, '每次加 2，都是单数。'),
      q('number', '10、9、8、7，下一个数是？', ['11', '5', '6', '4'], 2, '每次减 1。'),
      q('number', '5、10、15、20，下一个数是？', ['30', '22', '21', '25'], 3, '每次加 5。'),
      q('space', '图形按「白白黑」重复。○○●○○●○○ 的下一个是？', ['●', '○', '▲', '■'], 0, '每三个里的第三个是黑圆。', [['○', '○', '●'], ['○', '○', '●'], ['○', '○', '？']]),
      q('space', '上面一排是 △ □ ○，下面一排是 △ □ ？ 缺的是？', ['△', '○', '□', '★'], 1, '下面一排和上面一排相同。', [['△', '□', '○'], ['△', '□', '？']]),
      q('space', '箭头原来朝上 ↑，向右转一次后朝哪？', ['←', '↓', '→', '↑'], 2, '向右转一次，从上变为向右。'),
      q('space', '把「▲ ● ■」从右往左读，是哪一个？', ['▲ ● ■', '● ▲ ■', '■ ▲ ●', '■ ● ▲'], 3, '从右往左是 ■、●、▲。'),
      q('reason', '哪一个和其他三个不是一类？苹果、香蕉、汽车、葡萄', ['苹果', '香蕉', '汽车', '葡萄'], 2, '汽车不是水果。'),
      q('reason', '哪一个和其他三个不是一类？红、黄、蓝、椅子', ['红', '椅子', '黄', '蓝'], 1, '椅子不是颜色。'),
      q('reason', '哪一个不能飞？鸟、飞机、蜜蜂、石头', ['石头', '鸟', '飞机', '蜜蜂'], 0, '石头不能飞。'),
      q('reason', '小明比小红高，小红比小刚高。谁最高？', ['小红', '小刚', '一样高', '小明'], 3, '小明高于小红，小红高于小刚。')
    ]
  },
  {
    id: 'c911',
    group: 'child',
    name: '儿童卷',
    ageText: '9–11 岁',
    hint: '开始看对应关系和简单规律。适合小学中高年级。',
    items: [
      q('verbal', '医生对医院，老师对哪里？', ['车站', '银行', '商店', '学校'], 3, '老师对应学校。'),
      q('verbal', '铅笔用来写字，剪刀用来做什么？', ['阅读', '唱歌', '剪开', '跑步'], 2, '工具和它的用途对应。'),
      q('verbal', '白天很明亮，夜晚多是怎样的？', ['炎热', '黑暗', '方形', '绿色'], 1, '明亮对黑暗。'),
      q('verbal', '种子能长成植物，鸡蛋可以孵出什么？', ['石头', '书', '雨伞', '小鸡'], 3, '种子对植物，鸡蛋对小鸡。'),
      q('number', '3、6、9、12，下一个数是？', ['13', '14', '18', '15'], 3, '每次加 3。'),
      q('number', '1、2、4、8，下一个数是？', ['10', '12', '16', '9'], 2, '每次乘 2。'),
      q('number', '20、17、14、11，下一个数是？', ['8', '10', '9', '7'], 0, '每次减 3。'),
      q('number', '2、3、5、8、12，下一个数是？', ['14', '16', '15', '17'], 3, '相邻差依次是 1、2、3、4，下一次加 5。'),
      q('space', '每一行都把第一个图形移到最后。第三行 ▲ ？ ● 里，问号是？', ['○', '▲', '●', '■'], 0, '第三行应是 ▲ ○ ●。', [['○', '●', '▲'], ['●', '▲', '○'], ['▲', '？', '●']]),
      q('space', '正方形左上角有一个点。整个图形顺时针转 90 度后，这个点到了哪里？', ['右上角', '左下角', '右下角', '还在左上角'], 0, '顺时针转 90 度，左上到右上。'),
      q('space', '字母 b 只做左右翻转，更接近哪一个？', ['p', 'd', 'q', 'b'], 1, '左右翻转后，竖线到右边，半圆到左边，是 d。'),
      q('space', '出门向北走，再向右转，这时面向哪？', ['西', '南', '东', '北'], 2, '面向北时，右边是东。'),
      q('reason', '哪一个和其他三个不是一类？正方形、长方形、三角形、圆形', ['正方形', '长方形', '圆形', '三角形'], 2, '圆形没有角。'),
      q('reason', '所有玫瑰都是花。手里这支是玫瑰。可以确定什么？', ['所有花都是玫瑰', '这支是花', '这支不是花', '花都是红色'], 1, '玫瑰是花的一种，这支玫瑰也是花。不能反过来说所有花都是玫瑰。'),
      q('reason', '今天是星期一，再过两天是星期几？', ['星期二', '星期三', '星期四', '星期五'], 1, '星期一再过两天是星期三。'),
      q('reason', '每组第三个数是前两个相加。2 和 3 得到 5，4 和 1 得到 5，6 和 2 得到？', ['8', '7', '9', '4'], 0, '6+2=8。')
    ]
  },
  {
    id: 'c1215',
    group: 'child',
    name: '少年卷',
    ageText: '12–15 岁',
    hint: '词语相反、多步数列和简单推理。适合初中。',
    items: [
      q('verbal', '谨慎的反面更接近鲁莽。慷慨的反面更接近哪一个？', ['大方', '勇敢', '缓慢', '吝啬'], 3, '慷慨和吝啬是一对反义。'),
      q('verbal', '温度计用来表示温度，尺子用来表示什么？', ['长度', '重量', '时间', '声音'], 0, '尺子对应长度。'),
      q('verbal', '作家写出小说，画家画出什么？', ['歌曲', '画', '法律', '饭菜'], 1, '创作者和作品对应。'),
      q('verbal', '原因对应结果。在词语关系里，努力更常对应哪一个？', ['天气', '休息', '收获', '邻居'], 2, '这里只取最接近的词语对应，不是说努力一定有收获。'),
      q('number', '2、6、12、20、30，下一个数是？', ['36', '32', '40', '42'], 3, '相邻差依次是 4、6、8、10，下一次加 12。'),
      q('number', '81、27、9、3，下一个数是？', ['1', '6', '0', '12'], 0, '每次除以 3。'),
      q('number', '4、9、16、25，下一个数是？', ['30', '49', '36', '27'], 2, '这些是 2、3、4、5 的平方，下一个是 6 的平方。'),
      q('number', '1、1、2、3、5、8，下一个数是？', ['11', '13', '12', '15'], 1, '从第三个数起，每个数是前两个数相加。'),
      q('space', '正方体正面是 A，右侧是 B。向右滚 90 度，让原来的右侧转到正面。现在正面是？', ['A', '原来的顶面', 'B', '原来的背面'], 2, '题目已经说明：右侧转到正面。'),
      q('space', '正三角形绕中心转 120 度，看起来怎样？', ['和原来重合', '变成四边形', '边数变成 4', '一定会变成另一个不能重合的形状'], 0, '正三角形每转 120 度与原来重合。'),
      q('space', '图上 1 厘米表示实际 1 米。图上 2 厘米是实际多长？', ['2 厘米', '20 厘米', '20 米', '2 米'], 3, '1 厘米对应 1 米，2 厘米对应 2 米。'),
      q('space', '从正上方看一个圆锥，外轮廓更接近哪一个？', ['三角形', '圆形', '正方形', '长方形'], 1, '圆锥的俯视轮廓是圆。'),
      q('reason', '所有 A 都是 B，有些 B 是 C。能否由此说所有 A 都是 C？', ['能', '所有 C 都是 A', 'A 和 C 的数量相同', '不能'], 3, 'A 可能落在那些不是 C 的 B 里面。'),
      q('reason', '每行第三个数等于前两个相乘再减 1。2×3−1=5，3×3−1=8，4 和 2 得到？', ['8', '7', '6', '9'], 1, '4×2−1=7。'),
      q('reason', '甲比乙高，丙比甲高。三人里谁最矮？', ['乙', '甲', '丙', '一样高'], 0, '丙高于甲，甲高于乙。'),
      q('reason', '「如果下雨，地面会湿。」现在地面是湿的。可以确定什么？', ['一定下过雨', '一定没下雨', '不能确定是不是下雨弄湿的', '地面其实是干的'], 2, '地面湿了，也可能是洒水或其他原因。')
    ]
  },
  {
    id: 'adult',
    group: 'adult',
    name: '成人卷',
    ageText: '16 岁及以上',
    hint: '词语对应、多步数量关系和严密推理。',
    items: [
      q('verbal', '弥合对应裂缝，调解对应哪一个？', ['庆祝', '颜色', '距离', '争端'], 3, '弥合的是裂缝，调解的是争端。'),
      q('verbal', '提纲是文章的线索。目录通常是哪一种东西的线索？', ['书籍', '天气', '声音', '气味'], 0, '目录对应书籍。'),
      q('verbal', '蒸发离开的是液态。熔化离开的是哪一种状态？', ['气体', '液体', '真空', '固态'], 3, '熔化是固态变为液态。'),
      q('verbal', '稀疏的反面更接近哪一个？', ['稀少', '稠密', '遥远', '缓慢'], 1, '稀疏对稠密。稀少是近义词，不是反面。'),
      q('number', '3、5、9、17、33，下一个数是？', ['49', '65', '41', '66'], 1, '每个数乘 2 再减 1。'),
      q('number', '2、3、5、7、11，下一个数是？', ['12', '15', '13', '14'], 2, '这些是连续质数，下一个是 13。'),
      q('number', '7、10、16、28、52，下一个数是？', ['76', '80', '68', '100'], 3, '相邻差依次是 3、6、12、24，下一次加 48。'),
      q('number', '4、6、9，6、8、12，8、10、？ 问号是？', ['15', '12', '14', '16'], 0, '每三个一组：先加 2，再加 3、4、5。8 加 2 是 10，10 加 5 是 15。'),
      q('space', '字母 p 绕中心转 180 度，更接近哪一个？', ['b', 'q', 'd', 'p'], 2, 'p 转 180 度后是 d。'),
      q('space', '面向南，先左转，再左转，这时面向哪？', ['东', '北', '西', '南'], 1, '两次左转一共 180 度，从南转到北。'),
      q('space', '正方形先左右对折，再上下对折。剪掉四层叠在一起的那只角，展开后是怎样？', ['中心 1 个洞', '四个角各 1 个洞', '中心 4 个分开的洞', '没有洞'], 0, '四层叠住的那只角位于原纸中心，剪开后是中心的 1 个洞。'),
      q('space', '3 点整，时针和分针的夹角是多少？', ['0 度', '30 度', '180 度', '90 度'], 3, '3 点时分针指 12，时针指 3，夹角是 90 度。'),
      q('reason', '参加会议的人都带了工牌。小周没带工牌。可以确定什么？', ['小周没参加这次会议', '小周参加了会议', '工牌都是小周的', '不能确定小周在不在'], 0, '没带工牌，就不属于「参加会议的人」。'),
      q('reason', '第三个数等于前两个相加再加 1。2 和 4 得到 7，3 和 5 得到 9，6 和 1 得到？', ['6', '7', '8', '9'], 2, '6+1+1=8。'),
      q('reason', '甲比乙重，乙和丙一样重。谁最重？', ['乙', '丙', '甲', '三人一样重'], 2, '甲重于乙，乙等于丙。'),
      q('reason', '每个字母换成字母表里的下一个。CAT 变成 DBU。DOG 变成什么？', ['DPH', 'EPH', 'EPI', 'DOH'], 1, 'D→E，O→P，G→H。')
    ]
  }
]

function domainName(id) {
  const found = DOMAINS.find((item) => item.id === id)
  return found ? found.name : ''
}

function listForms() {
  return FORMS.map((form) => ({
    id: form.id,
    group: form.group,
    name: form.name,
    ageText: form.ageText,
    hint: form.hint,
    total: form.items.length
  }))
}

function getForm(id) {
  return FORMS.find((form) => form.id === id) || null
}

function clamp(value) {
  if (value < FLOOR) return FLOOR
  if (value > CEILING) return CEILING
  return value
}

function domainLabel(correct) {
  if (correct >= 4) return '这一项这次较稳'
  if (correct === 3) return '这一项接近卷面中等'
  if (correct === 2) return '这一项这次一般'
  if (correct === 1) return '这一项这次偏少'
  return '这一项这次没有对上'
}

function levelText(index) {
  if (index >= 115) return '这次高于本卷设定的典型水平'
  if (index >= 100) return '这次接近本卷设定的典型水平'
  if (index >= 85) return '这次略低于本卷设定的典型水平'
  return '这次低于本卷按年龄设定的典型水平'
}

function scoreAttempt(formId, answers) {
  const form = getForm(formId)
  if (!form) return null
  const picks = Array.isArray(answers) ? answers : []
  const domains = DOMAINS.map((item) => ({
    id: item.id,
    name: item.name,
    correct: 0,
    total: 0,
    label: ''
  }))
  const byDomain = {}
  domains.forEach((item) => {
    byDomain[item.id] = item
  })
  const misses = []
  let raw = 0
  form.items.forEach((item, index) => {
    const domain = byDomain[item.domain]
    if (domain) domain.total += 1
    const picked = picks[index]
    const right = picked === item.answer
    if (right) {
      raw += 1
      if (domain) domain.correct += 1
      return
    }
    misses.push({
      no: index + 1,
      domain: domainName(item.domain),
      prompt: item.prompt,
      yours: picked == null || picked < 0 ? '未作答' : item.options[picked] || '未作答',
      right: item.options[item.answer],
      note: item.note
    })
  })
  domains.forEach((item) => {
    item.label = domainLabel(item.correct)
  })
  const total = form.items.length
  const report = raw > CHANCE_CUTOFF
  let index = 0
  let low = 0
  let high = 0
  let ceiling = false
  let floorHit = false
  if (report) {
    const estimated = Math.round(100 + 15 * ((raw - MEAN_RAW) / RAW_SD))
    ceiling = estimated > CEILING
    floorHit = estimated < FLOOR
    index = clamp(estimated)
    low = clamp(index - BAND)
    high = clamp(index + BAND)
  }
  return {
    formId: form.id,
    formName: form.name,
    ageText: form.ageText,
    raw,
    total,
    report,
    index,
    low,
    high,
    ceiling,
    floorHit,
    levelText: report ? levelText(index) : '',
    domains,
    misses
  }
}

module.exports = {
  RELIABILITY,
  listForms,
  getForm,
  scoreAttempt
}
