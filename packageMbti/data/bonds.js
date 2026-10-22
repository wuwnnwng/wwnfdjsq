/**
 * 关系推荐。
 * 谈恋爱：外向/内向对调，计划/随性对调，信息偏好（感觉/直觉）不变。
 * 再给一个判断偏好也对调的类型，让来回不只剩同一种活法。
 * 交心：主导功能相同的那一个，再加上把你的辅助功能当作主导的那一个。
 * 两边不重复。这是偏好参照，不是配对鉴定。
 */
const BONDS = {
  INTJ: {
    romance: [
      { code: 'ENTP', line: '对方把可能性摊开，你收成一条能走的路。聊天有来回，也不容易停在空点子上。' },
      { code: 'ENFP', line: '对方把感受和热闹带进来，你负责方向。热乎有落点，就不容易只剩计划。' }
    ],
    confidant: [
      { code: 'INFJ', line: '你们都先在心里把图画完再开口，很多话不用铺垫对方就懂。' },
      { code: 'ENTJ', line: '对方把你第二顺手的安排和标准当成主业，谈计划和顾虑不用换一套语言。' }
    ]
  },
  INTP: {
    romance: [
      { code: 'ENTJ', line: '你把漏洞找出来，对方把结论推进去。一个想透，一个敢定。' },
      { code: 'ENFJ', line: '对方自然照顾关系和气氛，补上你不太会主动说出口的那一层在乎。' }
    ],
    confidant: [
      { code: 'ISTP', line: '你们都先在自己的逻辑里把事情拆开，可以一起安静地想，不必表演认同。' },
      { code: 'ENTP', line: '对方和你用的是同一对思考和可能，辩论是交心，不是抬杠。' }
    ]
  },
  ENTJ: {
    romance: [
      { code: 'INTP', line: '对方会追问你的前提，让推进不至于跑偏。你负责拍板，对方负责把逻辑补严。' },
      { code: 'INFP', line: '对方盯着这件事值不值得，你盯着怎么做成。价值感和执行力会互相校正。' }
    ],
    confidant: [
      { code: 'ESTJ', line: '你们都习惯用标准和结果说话，压力和取舍可以直接讲。' },
      { code: 'INTJ', line: '对方跟你看同一种长远结构，不需要你把每一步翻译成情绪。' }
    ]
  },
  ENTP: {
    romance: [
      { code: 'INTJ', line: '你抛出很多可能，对方帮你选一条并守住。来回很快，也不会永远停在点子上。' },
      { code: 'INFJ', line: '对方听得见话背后的意思，你负责把话打开。深和快可以同时在。' }
    ],
    confidant: [
      { code: 'ENFP', line: '你们都从一点迅速岔出很多可能，未完成的想法也可以放心丢给对方。' },
      { code: 'INTP', line: '对方比你更肯把一个模型想透，你可以把还没说圆的疑问交给对方。' }
    ]
  },
  INFJ: {
    romance: [
      { code: 'ENFP', line: '对方把人和新鲜事带到你面前，你把其中真正重要的留下来。' },
      { code: 'ENTP', line: '对方挑战你的结论，你把散乱的点收成一幅图。不容易闷，也不容易浅。' }
    ],
    confidant: [
      { code: 'INTJ', line: '你们都靠心里的图景理解世界，深话可以说完，不用怕被当成矫情。' },
      { code: 'ENFJ', line: '对方把你对内的在乎说出来，心事交出去会有人接住。' }
    ]
  },
  INFP: {
    romance: [
      { code: 'ENFJ', line: '对方会把你的在乎说进关系里，你负责确认这是不是自己真正要的。' },
      { code: 'ENTJ', line: '对方推进现实，你守住什么不能让。一边被带动，一边不被带跑。' }
    ],
    confidant: [
      { code: 'ISFP', line: '你们都先问这件事是否忠于自己，价值上的犹豫可以被听懂。' },
      { code: 'ENFP', line: '对方和你一样从可能出发，又肯把感受说得更明白，你不必独自消化。' }
    ]
  },
  ENFJ: {
    romance: [
      { code: 'INFP', line: '对方的在乎很深但不喧哗，你能感觉到自己被当真，而不是只被照顾。' },
      { code: 'INTP', line: '对方把事情想清楚，你把人安顿好。一个补逻辑，一个补温度。' }
    ],
    confidant: [
      { code: 'ESFJ', line: '你们都先看见气氛和别人的需要，照顾人的累可以互相说。' },
      { code: 'INFJ', line: '对方把你挂心的事想深一层，交心时不会停在客套。' }
    ]
  },
  ENFP: {
    romance: [
      { code: 'INFJ', line: '对方接得住你的热情，并帮你看出哪一件真正值得走下去。' },
      { code: 'INTJ', line: '对方给方向和边界，你给可能和人味。计划不再发干，想法也不再散。' }
    ],
    confidant: [
      { code: 'ENTP', line: '你们都停不下来地展开可能，兴奋和跑偏都可以被接住。' },
      { code: 'INFP', line: '对方把你随口的在乎听成认真的，适合把心里话落到实处。' }
    ]
  },
  ISTJ: {
    romance: [
      { code: 'ESTP', line: '你守住经验和分寸，对方把眼前的机会接住。日子会动起来，也不至于失序。' },
      { code: 'ESFP', line: '对方让当下变得具体、好玩，你负责把日子过稳。轻松有根。' }
    ],
    confidant: [
      { code: 'ISFJ', line: '你们都拿过去的经验和责任对照现在，担心和分寸不用解释太久。' },
      { code: 'ESTJ', line: '对方跟你一样把事情做完才安心，压力可以按步骤讲清楚。' }
    ]
  },
  ISFJ: {
    romance: [
      { code: 'ESFP', line: '对方活在现场，你记得人需要什么。一个把气氛点亮，一个把人接住。' },
      { code: 'ESTP', line: '对方行动快，你把后果和别人的感受补上。刺激还在，不至于伤人。' }
    ],
    confidant: [
      { code: 'ISTJ', line: '你们都记得细节和承诺，烦的是同一类事，说出来就有人懂。' },
      { code: 'ESFJ', line: '对方把你默默的照顾说出来、做出来，你不用一直自己扛。' }
    ]
  },
  ESTJ: {
    romance: [
      { code: 'ISTP', line: '你定标准，对方动手并把不必要的步骤拿掉。事情能成，也不那么僵。' },
      { code: 'ISFP', line: '对方提醒你人不是任务。你负责安排，对方负责这件事对人意味着什么。' }
    ],
    confidant: [
      { code: 'ENTJ', line: '你们都用结果和效率判断，委屈和决策可以直接摊开。' },
      { code: 'ISTJ', line: '对方跟你一样看重经验和责任，谈负担不用先把气氛做热。' }
    ]
  },
  ESFJ: {
    romance: [
      { code: 'ISFP', line: '对方的喜欢很安静、很具体，你能把这份在乎照顾进日常。' },
      { code: 'ISTP', line: '对方不爱空谈，你不爱冷场。一个把事做了，一个把关系顾上。' }
    ],
    confidant: [
      { code: 'ENFJ', line: '你们都把关系放在前面，谁受了委屈一听就明白。' },
      { code: 'ISFJ', line: '对方的在乎更安静，适合把不方便对外说的顾虑交出去。' }
    ]
  },
  ISTP: {
    romance: [
      { code: 'ESTJ', line: '你看得出现场该怎么下手，对方把责任和期限立住。自由还在，事情有着落。' },
      { code: 'ESFJ', line: '对方会问你过得怎么样，并真的安排到生活里。你不用自己经营气氛。' }
    ],
    confidant: [
      { code: 'INTP', line: '你们都先自己想清楚再决定要不要说，沉默也可以是在交心。' },
      { code: 'ESTP', line: '对方跟你一样盯着眼前什么能动手，麻烦可以讲得很具体。' }
    ]
  },
  ISFP: {
    romance: [
      { code: 'ESFJ', line: '对方把你的感受安放进具体的照顾里，你不用大声解释自己在意什么。' },
      { code: 'ESTJ', line: '对方把生活的骨架搭好，你保留什么是自己真正喜欢的。稳，但不被吞掉。' }
    ],
    confidant: [
      { code: 'INFP', line: '你们都用内心的喜欢和值不值得做判断，不必为自己的敏感辩护。' },
      { code: 'ESFP', line: '对方把你心里的感受活成看得见的快乐，话可以少，也能被懂。' }
    ]
  },
  ESTP: {
    romance: [
      { code: 'ISTJ', line: '你抓眼前的机会，对方记得上次怎样才没出事。快有人看住，也不至于熄火。' },
      { code: 'ISFJ', line: '对方留意谁被落在后面，你负责把场面做起来。热闹里还有人被顾到。' }
    ],
    confidant: [
      { code: 'ESFP', line: '你们都活在当下的现场，痛快和没劲都可以直说。' },
      { code: 'ISTP', line: '对方比你更肯把手法想透，交心时可以只谈事，不谈场面。' }
    ]
  },
  ESFP: {
    romance: [
      { code: 'ISFJ', line: '你把当下过热，对方把人记得牢。开心有人接，不容易只剩一阵。' },
      { code: 'ISTJ', line: '对方把承诺和步骤守住，你负责让日子不要只剩义务。' }
    ],
    confidant: [
      { code: 'ESTP', line: '你们都对眼前的人和事反应快，开心和不爽都不用绕。' },
      { code: 'ISFP', line: '对方把你外放的情绪收成真实的在乎，适合说不适合大声讲的话。' }
    ]
  }
}

function listBonds(code, key) {
  const row = BONDS[code]
  if (!row || !row[key]) return []
  return row[key]
}

module.exports = {
  BONDS,
  listBonds
}
