const CALLS = [
  { id: 'happy', name: '开心', hint: '连声欢叫', sp: 'dog', ear: 'flop', mark: 'none', tongue: true, coat: '#f0b45a', earc: '#d0893c', snout: '#fde68a' },
  { id: 'excited', name: '兴奋', hint: '又急又响', sp: 'dog', ear: 'point', mark: 'wide', tongue: true, coat: '#d5dbe3', earc: '#64748b', snout: '#f8fafc' },
  { id: 'coy', name: '撒娇', hint: '细声汪汪', sp: 'dog', ear: 'point', mark: 'wide', tongue: false, coat: '#e07a3d', earc: '#c2410c', snout: '#fdba74' },
  { id: 'alert', name: '警惕', hint: '短促戒备', sp: 'dog', ear: 'tall', mark: 'none', tongue: false, coat: '#c4a574', earc: '#27272a', snout: '#a16207' },
  { id: 'angry', name: '生气', hint: '低吼猛叫', sp: 'dog', ear: 'point', mark: 'brow', tongue: false, coat: '#8d6a4a', earc: '#44403c', snout: '#d6b08c' },
  { id: 'scared', name: '害怕', hint: '发颤惊叫', sp: 'dog', ear: 'tall', mark: 'wide', tongue: false, coat: '#f3e6d0', earc: '#fde68a', snout: '#fff7ed' },
  { id: 'greet', name: '打招呼', hint: '热情汪汪', sp: 'dog', ear: 'flop', mark: 'none', tongue: true, coat: '#f0c36a', earc: '#d97706', snout: '#fde68a' },
  { id: 'sleepy', name: '犯困', hint: '慢吞吞', sp: 'dog', ear: 'fold', mark: 'sleepy', tongue: false, coat: '#d6b08c', earc: '#a16207', snout: '#f5d0a8' },
  { id: 'hungry', name: '饥饿', hint: '一直讨食', sp: 'dog', ear: 'flop', mark: 'spot', tongue: true, coat: '#b45309', earc: '#1c1917', snout: '#f5d0a8' },
  { id: 'play', name: '玩耍', hint: '蹦跳着叫', sp: 'dog', ear: 'flop', mark: 'spot', tongue: true, coat: '#f8fafc', earc: '#92400e', snout: '#fed7aa' },
  { id: 'wronged', name: '委屈', hint: '带着哭腔', sp: 'dog', ear: 'flop', mark: 'sad', tongue: false, coat: '#a8a29e', earc: '#57534e', snout: '#e7e5e4' },
  { id: 'guard', name: '护主', hint: '沉声驱赶', sp: 'dog', ear: 'tall', mark: 'mask', tongue: false, coat: '#d6b48a', earc: '#1c1917', snout: '#44403c' },
  { id: 'cuddle', name: '求抱', hint: '轻声哼叫', sp: 'dog', ear: 'fold', mark: 'none', tongue: false, coat: '#fde68a', earc: '#fcd34d', snout: '#fffbeb' },
  { id: 'warn', name: '警告', hint: '厉声示警', sp: 'dog', ear: 'point', mark: 'brow', tongue: false, coat: '#9a3412', earc: '#1c1917', snout: '#fdba74' },
  { id: 'lonely', name: '孤单', hint: '拉长了叫', sp: 'dog', ear: 'tall', mark: 'sad', tongue: false, coat: '#94a3b8', earc: '#475569', snout: '#e2e8f0' },
  { id: 'proud', name: '得意', hint: '昂着头叫', sp: 'dog', ear: 'point', mark: 'none', tongue: true, coat: '#f5f5f4', earc: '#e7e5e4', snout: '#1c1917' },
  { id: 'hurry', name: '着急', hint: '连珠炮', sp: 'dog', ear: 'tall', mark: 'wide', tongue: true, coat: '#fb923c', earc: '#ea580c', snout: '#ffedd5' },
  { id: 'content', name: '满足', hint: '心满意足', sp: 'dog', ear: 'flop', mark: 'sleepy', tongue: true, coat: '#ca8a04', earc: '#854d0e', snout: '#fef3c7' },
  { id: 'cat', name: '猫咪挑衅', hint: '低声挑衅', sp: 'cat', ear: 'point', mark: 'brow', tongue: false, coat: '#fdba74', earc: '#ea580c', snout: '#fff7ed' },
  { id: 'wolf', name: '狼嚎', hint: '仰头长嚎', sp: 'wolf', ear: 'tall', mark: 'none', tongue: false, coat: '#9ca3af', earc: '#4b5563', snout: '#d1d5db' },
  { id: 'tiger', name: '虎啸', hint: '沉声长啸', sp: 'tiger', ear: 'round', mark: 'none', tongue: false, coat: '#f97316', earc: '#c2410c', snout: '#ffedd5' }
]

function withSrc(list) {
  return list.map((item) => Object.assign({ src: `/packageBark/audio/${item.id}.mp3` }, item))
}

module.exports = {
  CALLS: withSrc(CALLS)
}
