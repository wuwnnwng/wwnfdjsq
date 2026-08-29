/**
 * 星座日期区间，以及恋爱 / 交心配对（趣味参考）
 */

const CONSTELLATIONS = [
  { name: '白羊座', symbol: '♈', rangeText: '3月21日 – 4月19日' },
  { name: '金牛座', symbol: '♉', rangeText: '4月20日 – 5月20日' },
  { name: '双子座', symbol: '♊', rangeText: '5月21日 – 6月21日' },
  { name: '巨蟹座', symbol: '♋', rangeText: '6月22日 – 7月22日' },
  { name: '狮子座', symbol: '♌', rangeText: '7月23日 – 8月22日' },
  { name: '处女座', symbol: '♍', rangeText: '8月23日 – 9月22日' },
  { name: '天秤座', symbol: '♎', rangeText: '9月23日 – 10月23日' },
  { name: '天蝎座', symbol: '♏', rangeText: '10月24日 – 11月22日' },
  { name: '射手座', symbol: '♐', rangeText: '11月23日 – 12月21日' },
  { name: '摩羯座', symbol: '♑', rangeText: '12月22日 – 1月19日' },
  { name: '水瓶座', symbol: '♒', rangeText: '1月20日 – 2月18日' },
  { name: '双鱼座', symbol: '♓', rangeText: '2月19日 – 3月20日' }
]

const LOVE_PAIRS = {
  白羊座: [
    { name: '狮子座', hint: '同样要强，约会很容易热起来' },
    { name: '天秤座', hint: '一个直球一个会撩，互补得很明显' },
    { name: '水瓶座', hint: '新鲜感够，谁也不容易把谁绑死' }
  ],
  金牛座: [
    { name: '巨蟹座', hint: '一个给安全感，一个给被需要的感觉' },
    { name: '处女座', hint: '节奏接近，适合慢慢把生活过细' },
    { name: '摩羯座', hint: '都看重稳定，恋爱更像搭伙过日子' }
  ],
  双子座: [
    { name: '天秤座', hint: '聊天不停，约会也像连续剧' },
    { name: '水瓶座', hint: '脑回路对得上，越聊越想见面' },
    { name: '白羊座', hint: '一个出点子一个敢行动' }
  ],
  巨蟹座: [
    { name: '天蝎座', hint: '情感浓度高，容易认定同一个人' },
    { name: '双鱼座', hint: '都偏柔软，适合细水长流' },
    { name: '金牛座', hint: '被安稳接住，恋爱更踏实' }
  ],
  狮子座: [
    { name: '白羊座', hint: '热情对等，谁都愿意把对方放在亮处' },
    { name: '双子座', hint: '一个爱表现，一个会接梗' },
    { name: '天秤座', hint: '体面又浪漫，适合被当回事' }
  ],
  处女座: [
    { name: '金牛座', hint: '都讲究品质，生活细节能对上' },
    { name: '摩羯座', hint: '务实同频，越相处越放心' },
    { name: '巨蟹座', hint: '一个操心一个照顾，容易互相依赖' }
  ],
  天秤座: [
    { name: '双子座', hint: '社交和审美都对味，约会不冷场' },
    { name: '狮子座', hint: '被认真对待，仪式感也拉得满' },
    { name: '射手座', hint: '轻松不黏人，恋爱更像结伴玩' }
  ],
  天蝎座: [
    { name: '巨蟹座', hint: '都重感情，适合深交后的亲密' },
    { name: '双鱼座', hint: '直觉接近，容易把心事交给对方' },
    { name: '处女座', hint: '一个深一个细，关系能慢慢磨合' }
  ],
  射手座: [
    { name: '白羊座', hint: '都爱往前冲，恋爱很少无聊' },
    { name: '狮子座', hint: '热闹同频，愿意一起把日子过亮' },
    { name: '水瓶座', hint: '给彼此空间，反而更想靠近' }
  ],
  摩羯座: [
    { name: '金牛座', hint: '步调稳，适合奔着长期去' },
    { name: '处女座', hint: '认真对认真，信任来得比较快' },
    { name: '天蝎座', hint: '外冷内热，认定了就不轻易换' }
  ],
  水瓶座: [
    { name: '双子座', hint: '想法密，恋爱也像头脑风暴' },
    { name: '天秤座', hint: '尊重彼此，不容易把关系逼紧' },
    { name: '射手座', hint: '都要自由，也都能给自由' }
  ],
  双鱼座: [
    { name: '巨蟹座', hint: '心软对心软，适合被温柔接住' },
    { name: '天蝎座', hint: '情感深，容易把对方当成自己人' },
    { name: '金牛座', hint: '一个做梦一个落地，刚好成双' }
  ]
}

const FRIEND_PAIRS = {
  白羊座: [
    { name: '射手座', hint: '一起折腾也不累，适合当玩伴兼损友' },
    { name: '狮子座', hint: '互相打气，心事说出来也不怕被泼冷水' },
    { name: '双子座', hint: '话密、反应快，适合随时吐槽' }
  ],
  金牛座: [
    { name: '处女座', hint: '价值观接近，适合慢慢交成自己人' },
    { name: '摩羯座', hint: '都靠谱，托付小事也放心' },
    { name: '双鱼座', hint: '一个稳一个软，聊天能把情绪放下' }
  ],
  双子座: [
    { name: '水瓶座', hint: '脑内世界重叠，适合深聊到忘时间' },
    { name: '天秤座', hint: '说话不冲，适合把纠结摊开讲' },
    { name: '射手座', hint: '轻松不评判，适合当树洞以外的出口' }
  ],
  巨蟹座: [
    { name: '双鱼座', hint: '都懂情绪，适合把脆弱交给对方' },
    { name: '天蝎座', hint: '守口如瓶，交心不容易外传' },
    { name: '摩羯座', hint: '一个倾诉一个托底，关系很稳' }
  ],
  狮子座: [
    { name: '射手座', hint: '正能量对得上，适合互相撑场面' },
    { name: '白羊座', hint: '直来直去，心里话不用绕弯' },
    { name: '天秤座', hint: '会给面子也给建议，适合做长期朋友' }
  ],
  处女座: [
    { name: '摩羯座', hint: '都务实，交心时也能一起想办法' },
    { name: '金牛座', hint: '节奏慢、耐心够，适合细聊' },
    { name: '巨蟹座', hint: '一个分析一个安慰，刚好配得上' }
  ],
  天秤座: [
    { name: '水瓶座', hint: '讲道理不伤人，适合把心事理顺' },
    { name: '双子座', hint: '话题多，越聊越知道对方怎么想' },
    { name: '双鱼座', hint: '一个平衡一个共情，适合深夜长谈' }
  ],
  天蝎座: [
    { name: '双鱼座', hint: '不害怕沉重话题，适合把真心掏出来' },
    { name: '巨蟹座', hint: '都重承诺，交心之后不容易淡' },
    { name: '摩羯座', hint: '话不多但靠得住，适合当后台朋友' }
  ],
  射手座: [
    { name: '白羊座', hint: '说到做到，适合当一起往前走的同伴' },
    { name: '水瓶座', hint: '不黏不腻，适合把真实想法摊开' },
    { name: '狮子座', hint: '互相给台阶，也互相给勇气' }
  ],
  摩羯座: [
    { name: '处女座', hint: '同频务实，交心也能落到具体事上' },
    { name: '金牛座', hint: '不催不吵，适合慢慢成为深交' },
    { name: '天蝎座', hint: '都把信任看得重，适合当自己人' }
  ],
  水瓶座: [
    { name: '天秤座', hint: '尊重边界，适合把复杂想法讲清楚' },
    { name: '双子座', hint: '思维跳跃也能接住，适合当灵魂搭子' },
    { name: '白羊座', hint: '一个想一个做，聊完就想去试' }
  ],
  双鱼座: [
    { name: '天蝎座', hint: '懂得那些说不清的情绪' },
    { name: '巨蟹座', hint: '互相心软，适合把委屈说完' },
    { name: '处女座', hint: '一个感受一个整理，交心更完整' }
  ]
}

const BY_NAME = {}
CONSTELLATIONS.forEach((item) => {
  BY_NAME[item.name] = item
})

function toMatchCard(pair) {
  const meta = BY_NAME[pair.name]
  if (!meta) return null
  return {
    name: meta.name,
    symbol: meta.symbol,
    rangeText: meta.rangeText,
    hint: pair.hint
  }
}

function getConstellationMatch(name) {
  const self = BY_NAME[name]
  if (!self) {
    return {
      valid: false,
      love: [],
      friends: []
    }
  }
  const love = (LOVE_PAIRS[name] || []).map(toMatchCard).filter(Boolean)
  const friends = (FRIEND_PAIRS[name] || []).map(toMatchCard).filter(Boolean)
  return {
    valid: true,
    self,
    love,
    friends,
    loveNames: love.map((item) => item.name).join('、'),
    friendNames: friends.map((item) => item.name).join('、')
  }
}

module.exports = {
  CONSTELLATIONS,
  getConstellationMatch
}
