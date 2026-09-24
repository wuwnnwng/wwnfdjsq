/**
 * 原创四维偏好题。
 * pole 表示「很符合」所支持的字母；反向选项记到对侧。
 * quick 为 true 的题进入快速版（每维 6 题，两侧各 3 题）。
 */
const QUESTIONS = [
  { id: 'ei1', axis: 'EI', pole: 'E', quick: true, text: '聚会结束后，我常常还想再聊一会儿，而不是马上回家歇着。' },
  { id: 'ei2', axis: 'EI', pole: 'I', quick: true, text: '忙完一天社交，我需要一个人待着，才能把精神找回来。' },
  { id: 'ei3', axis: 'EI', pole: 'E', quick: true, text: '新想法我习惯先说出来，边说边整理。' },
  { id: 'ei4', axis: 'EI', pole: 'I', quick: true, text: '比较重要的话，我会先在心里过一遍，再决定要不要说。' },
  { id: 'ei5', axis: 'EI', pole: 'E', quick: true, text: '陌生的场合里，我通常能先开口打招呼。' },
  { id: 'ei6', axis: 'EI', pole: 'I', quick: true, text: '人一多、持续很久的场合，会让我明显变累。' },
  { id: 'ei7', axis: 'EI', pole: 'E', quick: false, text: '我喜欢同时和不少人保持联系，而不是只跟固定几个人说话。' },
  { id: 'ei8', axis: 'EI', pole: 'I', quick: false, text: '比起认识很多人，我更在意少数能深聊的关系。' },
  { id: 'ei9', axis: 'EI', pole: 'E', quick: false, text: '临时加入一场热闹的活动，我会觉得兴奋多于消耗。' },
  { id: 'ei10', axis: 'EI', pole: 'I', quick: false, text: '我更喜欢事先说好的小范围相处，而不是突然挤进一大群人。' },
  { id: 'ei11', axis: 'EI', pole: 'E', quick: false, text: '讨论时我常常会把气氛带动起来。' },
  { id: 'ei12', axis: 'EI', pole: 'I', quick: false, text: '很多判断我习惯先在自己脑子里完成，不一定要讲出来。' },

  { id: 'sn1', axis: 'SN', pole: 'S', quick: true, text: '我更相信自己亲眼见过、亲手做过的经验。' },
  { id: 'sn2', axis: 'SN', pole: 'N', quick: true, text: '我经常从一件具体的事，联想到更大的可能。' },
  { id: 'sn3', axis: 'SN', pole: 'S', quick: true, text: '讲一件事时，我习惯先把步骤和细节说清楚。' },
  { id: 'sn4', axis: 'SN', pole: 'N', quick: true, text: '比起细节，我更在意这件事背后的规律和含义。' },
  { id: 'sn5', axis: 'SN', pole: 'S', quick: true, text: '我喜欢沿用已经验证过的方法，把事情做稳。' },
  { id: 'sn6', axis: 'SN', pole: 'N', quick: true, text: '我很容易对「还能变成什么样」比对「现在是什么样」更有兴趣。' },
  { id: 'sn7', axis: 'SN', pole: 'S', quick: false, text: '聊天时我更关心实际发生了什么。' },
  { id: 'sn8', axis: 'SN', pole: 'N', quick: false, text: '我常用设想和类比来解释一个想法。' },
  { id: 'sn9', axis: 'SN', pole: 'S', quick: false, text: '我更容易记住具体事实，比如时间、地点和原话。' },
  { id: 'sn10', axis: 'SN', pole: 'N', quick: false, text: '我更容易记住整体印象，细节却会模糊。' },
  { id: 'sn11', axis: 'SN', pole: 'S', quick: false, text: '做决定前，我希望先看到现实里的例子。' },
  { id: 'sn12', axis: 'SN', pole: 'N', quick: false, text: '一个还没被验证的想法，也足够让我兴奋很久。' },

  { id: 'tf1', axis: 'TF', pole: 'T', quick: true, text: '做决定时，我更看逻辑能不能站得住。' },
  { id: 'tf2', axis: 'TF', pole: 'F', quick: true, text: '做决定时，我会先想这件事对相关的人意味着什么。' },
  { id: 'tf3', axis: 'TF', pole: 'T', quick: true, text: '别人觉得我说话直接，有时偏冷静。' },
  { id: 'tf4', axis: 'TF', pole: 'F', quick: true, text: '对方当下的情绪，我很难装作没看见。' },
  { id: 'tf5', axis: 'TF', pole: 'T', quick: true, text: '争论里我更想先把道理辩清楚。' },
  { id: 'tf6', axis: 'TF', pole: 'F', quick: true, text: '就算道理是对的，我也不愿让关系因此变僵。' },
  { id: 'tf7', axis: 'TF', pole: 'T', quick: false, text: '评价一件事，我习惯先问公不公平、效不效率。' },
  { id: 'tf8', axis: 'TF', pole: 'F', quick: false, text: '评价一件事，我习惯先问值不值得、人有没有被理解。' },
  { id: 'tf9', axis: 'TF', pole: 'T', quick: false, text: '被指出错误时，我更想先看论证，而不是先处理感受。' },
  { id: 'tf10', axis: 'TF', pole: 'F', quick: false, text: '夸奖或批评的语气，会明显影响我的状态。' },
  { id: 'tf11', axis: 'TF', pole: 'T', quick: false, text: '我能把私人感情和工作上的判断分开。' },
  { id: 'tf12', axis: 'TF', pole: 'F', quick: false, text: '如果一个选择会伤害在乎的人，我很难只按利弊来选。' },

  { id: 'jp1', axis: 'JP', pole: 'J', quick: true, text: '我喜欢提前把计划排好，并尽量按计划走。' },
  { id: 'jp2', axis: 'JP', pole: 'P', quick: true, text: '我喜欢给自己留余地，临近期限再冲刺也没问题。' },
  { id: 'jp3', axis: 'JP', pole: 'J', quick: true, text: '事情一直悬着不定，我会不舒服。' },
  { id: 'jp4', axis: 'JP', pole: 'P', quick: true, text: '选择一直开着，我会觉得更自由。' },
  { id: 'jp5', axis: 'JP', pole: 'J', quick: true, text: '我的待办和桌面，通常比较有秩序。' },
  { id: 'jp6', axis: 'JP', pole: 'P', quick: true, text: '我常常同时开着好几件事，做到哪算哪。' },
  { id: 'jp7', axis: 'JP', pole: 'J', quick: false, text: '出门前我习惯先列清楚要带什么。' },
  { id: 'jp8', axis: 'JP', pole: 'P', quick: false, text: '旅行时我更享受临时起意，而不是一份紧密的行程表。' },
  { id: 'jp9', axis: 'JP', pole: 'J', quick: false, text: '做完一件再做下一件，会让我更安心。' },
  { id: 'jp10', axis: 'JP', pole: 'P', quick: false, text: '计划被打断时，我通常能很快改道。' },
  { id: 'jp11', axis: 'JP', pole: 'J', quick: false, text: '我喜欢尽早把决定定下来。' },
  { id: 'jp12', axis: 'JP', pole: 'P', quick: false, text: '我经常到最后一刻，还想看看有没有更好的选择。' }
]

module.exports = {
  QUESTIONS
}
