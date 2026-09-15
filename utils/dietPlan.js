/**
 * 减脂饮食搭配：Mifflin-St Jeor 估算 BMR/TDEE，按目标赤字拆营养素，
 * 再从家常减脂餐模板里配一日三餐（参考薄荷健康 / Keep / 宏量计算器的常见做法）。
 */

const { calculateBmi } = require('./bmiCalc')

const SEX_OPTIONS = [
  { id: 'female', name: '女' },
  { id: 'male', name: '男' }
]

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', name: '久坐', factor: 1.2, hint: '很少运动' },
  { id: 'light', name: '轻度', factor: 1.375, hint: '每周 1–3 次' },
  { id: 'moderate', name: '中度', factor: 1.55, hint: '每周 3–5 次' },
  { id: 'active', name: '活跃', factor: 1.725, hint: '每周 6–7 次' },
  { id: 'very', name: '很活跃', factor: 1.9, hint: '体力活或一天两练' }
]

const DEFICIT_OPTIONS = [
  { id: 'mild', name: '温和', kcal: 300, hint: '每周约 0.3 公斤' },
  { id: 'standard', name: '标准', kcal: 500, hint: '每周约 0.5 公斤' },
  { id: 'strong', name: '加强', kcal: 750, hint: '每周约 0.7 公斤' }
]

const STYLE_OPTIONS = [
  { id: 'balanced', name: '家常', proteinPerKg: 1.8, fatRatio: 0.28 },
  { id: 'highProtein', name: '高蛋白', proteinPerKg: 2.2, fatRatio: 0.25 },
  { id: 'lowCarb', name: '低碳', proteinPerKg: 2.0, fatRatio: 0.38 },
  { id: 'vegetarian', name: '素食', proteinPerKg: 1.6, fatRatio: 0.26 }
]

const MEAL_COUNT_OPTIONS = [
  { id: '3', name: '三餐', count: 3 },
  { id: '4', name: '三餐+加餐', count: 4 }
]

const KCAL_PER_KG_FAT = 7700
const FEMALE_FLOOR = 1200
const MALE_FLOOR = 1500

/** 每 100 克/毫升可食部，约取中国食物成分表常用值 */
const FOODS = {
  oats: { name: '燕麦片', unit: 'g', kcal: 367, p: 15, c: 61.6, f: 6.7, minG: 25, maxG: 55, note: '干重' },
  bread: { name: '全麦面包', unit: 'g', kcal: 246, p: 13.4, c: 41, f: 3.5, minG: 30, maxG: 80 },
  egg: { name: '水煮蛋', unit: 'g', kcal: 144, p: 13.3, c: 1.3, f: 8.8, minG: 50, maxG: 120, pieceG: 50, pieceUnit: '个' },
  soyMilk: { name: '无糖豆浆', unit: 'ml', kcal: 31, p: 3, c: 1.2, f: 1.6, minG: 150, maxG: 350 },
  milk: { name: '低脂牛奶', unit: 'ml', kcal: 54, p: 3.6, c: 5, f: 1.7, minG: 150, maxG: 300 },
  yogurt: { name: '无糖酸奶', unit: 'g', kcal: 61, p: 3.2, c: 4.7, f: 2.7, minG: 100, maxG: 220 },
  greek: { name: '希腊酸奶', unit: 'g', kcal: 73, p: 10, c: 3.6, f: 0.7, minG: 80, maxG: 200 },
  banana: { name: '香蕉', unit: 'g', kcal: 93, p: 1.4, c: 22, f: 0.2, minG: 80, maxG: 140, pieceG: 120, pieceUnit: '根' },
  apple: { name: '苹果', unit: 'g', kcal: 54, p: 0.2, c: 13.5, f: 0.2, minG: 120, maxG: 220, pieceG: 180, pieceUnit: '个' },
  cherryTomato: { name: '小番茄', unit: 'g', kcal: 22, p: 0.9, c: 4, f: 0.2, minG: 80, maxG: 200 },
  cucumber: { name: '黄瓜', unit: 'g', kcal: 16, p: 0.8, c: 2.9, f: 0.1, minG: 80, maxG: 250 },
  sweetPotato: { name: '蒸红薯', unit: 'g', kcal: 86, p: 1.6, c: 20.1, f: 0.2, minG: 80, maxG: 220 },
  corn: { name: '玉米', unit: 'g', kcal: 112, p: 4, c: 22.8, f: 1.2, minG: 80, maxG: 200, pieceG: 180, pieceUnit: '根' },
  brownRice: { name: '糙米饭', unit: 'g', kcal: 116, p: 2.6, c: 25.6, f: 1, minG: 70, maxG: 280, note: '熟重' },
  rice: { name: '米饭', unit: 'g', kcal: 116, p: 2.6, c: 25.9, f: 0.3, minG: 70, maxG: 280, note: '熟重' },
  buckwheat: { name: '荞麦面', unit: 'g', kcal: 114, p: 3.4, c: 21.4, f: 0.5, minG: 80, maxG: 280, note: '熟重' },
  quinoa: { name: '藜麦饭', unit: 'g', kcal: 120, p: 4.4, c: 21.3, f: 1.9, minG: 70, maxG: 260, note: '熟重' },
  chicken: { name: '鸡胸肉', unit: 'g', kcal: 133, p: 19.4, c: 2.5, f: 5, minG: 80, maxG: 220, note: '少油' },
  fish: { name: '清蒸鲈鱼', unit: 'g', kcal: 105, p: 18.6, c: 0, f: 3.4, minG: 90, maxG: 250 },
  shrimp: { name: '虾仁', unit: 'g', kcal: 93, p: 18.6, c: 2.8, f: 0.8, minG: 80, maxG: 200 },
  beef: { name: '瘦牛肉', unit: 'g', kcal: 125, p: 20.2, c: 1.6, f: 4.2, minG: 70, maxG: 200 },
  pork: { name: '里脊肉', unit: 'g', kcal: 143, p: 20.3, c: 1.5, f: 6.2, minG: 70, maxG: 180 },
  salmon: { name: '三文鱼', unit: 'g', kcal: 139, p: 17.2, c: 0, f: 7.8, minG: 80, maxG: 200 },
  tofu: { name: '北豆腐', unit: 'g', kcal: 98, p: 12.2, c: 3.3, f: 4.8, minG: 100, maxG: 300 },
  edamame: { name: '毛豆', unit: 'g', kcal: 131, p: 13.1, c: 10.5, f: 5, minG: 40, maxG: 120 },
  broccoli: { name: '西兰花', unit: 'g', kcal: 36, p: 4.1, c: 4.3, f: 0.6, minG: 120, maxG: 280 },
  spinach: { name: '菠菜', unit: 'g', kcal: 24, p: 2.6, c: 3.1, f: 0.3, minG: 120, maxG: 280 },
  lettuce: { name: '生菜', unit: 'g', kcal: 16, p: 1.3, c: 2.1, f: 0.3, minG: 100, maxG: 250 },
  winterMelon: { name: '冬瓜', unit: 'g', kcal: 11, p: 0.4, c: 2.6, f: 0.1, minG: 150, maxG: 320 },
  mushroom: { name: '菌菇', unit: 'g', kcal: 26, p: 2.2, c: 4.1, f: 0.3, minG: 80, maxG: 220 },
  pumpkin: { name: '南瓜', unit: 'g', kcal: 22, p: 0.7, c: 4.6, f: 0.1, minG: 100, maxG: 250 },
  yam: { name: '山药', unit: 'g', kcal: 57, p: 1.9, c: 12.4, f: 0.2, minG: 80, maxG: 200 },
  konjac: { name: '魔芋丝', unit: 'g', kcal: 15, p: 0.5, c: 3.3, f: 0.1, minG: 80, maxG: 220 },
  cabbage: { name: '娃娃菜', unit: 'g', kcal: 13, p: 1.4, c: 2.2, f: 0.2, minG: 120, maxG: 280 },
  celery: { name: '西芹', unit: 'g', kcal: 14, p: 0.8, c: 2.9, f: 0.1, minG: 80, maxG: 220 },
  seaweed: { name: '海带', unit: 'g', kcal: 13, p: 1.2, c: 2.1, f: 0.1, minG: 50, maxG: 150 },
  oil: { name: '烹饪用油', unit: 'g', kcal: 899, p: 0, c: 0, f: 99.9, minG: 3, maxG: 10 },
  almond: { name: '原味杏仁', unit: 'g', kcal: 578, p: 22.5, c: 8.8, f: 50.6, minG: 6, maxG: 15 },
  blueberry: { name: '蓝莓', unit: 'g', kcal: 57, p: 0.7, c: 14.5, f: 0.3, minG: 40, maxG: 100 },
  grapefruit: { name: '柚子', unit: 'g', kcal: 42, p: 0.8, c: 9.5, f: 0.1, minG: 80, maxG: 180 },
  strawberry: { name: '草莓', unit: 'g', kcal: 32, p: 1, c: 7.1, f: 0.2, minG: 80, maxG: 180 }
}

const TEMPLATES = [
  {
    id: 'b-oat-egg',
    slot: 'breakfast',
    styles: ['balanced', 'highProtein'],
    title: '燕麦蛋奶碗',
    cook: '燕麦用热水或牛奶冲开，鸡蛋水煮。',
    swap: '鸡蛋可换成希腊酸奶。',
    items: [
      { id: 'oats', g: 40 },
      { id: 'egg', g: 50 },
      { id: 'soyMilk', g: 200 },
      { id: 'cherryTomato', g: 100 }
    ]
  },
  {
    id: 'b-bread-egg',
    slot: 'breakfast',
    styles: ['balanced', 'highProtein'],
    title: '全麦面包配蛋',
    cook: '面包烘热，鸡蛋水煮或少油煎。',
    swap: '牛奶可换成无糖豆浆。',
    items: [
      { id: 'bread', g: 60 },
      { id: 'egg', g: 100 },
      { id: 'milk', g: 200 },
      { id: 'cucumber', g: 100 }
    ]
  },
  {
    id: 'b-potato-greek',
    slot: 'breakfast',
    styles: ['balanced', 'vegetarian'],
    title: '红薯酸奶早餐',
    cook: '红薯蒸熟，酸奶原味无糖。',
    swap: '苹果可换成小番茄。',
    items: [
      { id: 'sweetPotato', g: 150 },
      { id: 'greek', g: 150 },
      { id: 'apple', g: 120 }
    ]
  },
  {
    id: 'b-corn-egg',
    slot: 'breakfast',
    styles: ['balanced', 'highProtein', 'vegetarian'],
    title: '玉米豆浆配蛋',
    cook: '玉米水煮，鸡蛋水煮。',
    swap: '玉米可换成蒸红薯。',
    items: [
      { id: 'corn', g: 180 },
      { id: 'egg', g: 100 },
      { id: 'soyMilk', g: 250 }
    ]
  },
  {
    id: 'b-overnight',
    slot: 'breakfast',
    styles: ['balanced', 'vegetarian'],
    title: '隔夜燕麦杯',
    cook: '燕麦加酸奶冷藏过夜，早上加浆果。',
    swap: '蓝莓可换成草莓。',
    items: [
      { id: 'oats', g: 40 },
      { id: 'yogurt', g: 150 },
      { id: 'blueberry', g: 60 },
      { id: 'almond', g: 8 }
    ]
  },
  {
    id: 'b-lowcarb',
    slot: 'breakfast',
    styles: ['lowCarb', 'highProtein'],
    title: '高蛋白轻碳早餐',
    cook: '鸡蛋水煮，酸奶原味，蔬菜生吃。',
    swap: '希腊酸奶可换成无糖豆浆。',
    items: [
      { id: 'egg', g: 100 },
      { id: 'greek', g: 150 },
      { id: 'cucumber', g: 150 },
      { id: 'cherryTomato', g: 100 },
      { id: 'almond', g: 8 }
    ]
  },
  {
    id: 'b-lowcarb-soy',
    slot: 'breakfast',
    styles: ['lowCarb', 'highProtein', 'vegetarian'],
    title: '豆浆蔬菜配蛋',
    cook: '鸡蛋水煮，蔬菜生吃，豆浆无糖。',
    swap: '鸡蛋可换成希腊酸奶。',
    items: [
      { id: 'egg', g: 100 },
      { id: 'soyMilk', g: 280 },
      { id: 'cucumber', g: 150 },
      { id: 'cherryTomato', g: 120 }
    ]
  },
  {
    id: 'b-veg-tofu',
    slot: 'breakfast',
    styles: ['vegetarian'],
    title: '豆浆燕麦素食早',
    cook: '燕麦冲豆浆，配水果。',
    swap: '香蕉可换成苹果。',
    items: [
      { id: 'oats', g: 40 },
      { id: 'soyMilk', g: 280 },
      { id: 'tofu', g: 80 },
      { id: 'banana', g: 80 }
    ]
  },
  {
    id: 'l-chicken-rice',
    slot: 'lunch',
    styles: ['balanced', 'highProtein'],
    title: '鸡胸杂粮饭',
    cook: '鸡胸少油煎或水煮，配清炒西兰花。',
    swap: '鸡胸可换成虾仁或鲈鱼。',
    items: [
      { id: 'brownRice', g: 120 },
      { id: 'chicken', g: 120 },
      { id: 'broccoli', g: 200 },
      { id: 'oil', g: 5 }
    ]
  },
  {
    id: 'l-shrimp-noodle',
    slot: 'lunch',
    styles: ['balanced', 'highProtein'],
    title: '荞麦面虾仁',
    cook: '荞麦面煮熟过凉，虾仁快炒，菠菜焯水。',
    swap: '虾仁可换成鸡胸丝。',
    items: [
      { id: 'buckwheat', g: 140 },
      { id: 'shrimp', g: 110 },
      { id: 'spinach', g: 180 },
      { id: 'oil', g: 5 }
    ]
  },
  {
    id: 'l-fish-rice',
    slot: 'lunch',
    styles: ['balanced', 'highProtein'],
    title: '清蒸鱼配糙米',
    cook: '鲈鱼清蒸，菌菇少油炒。',
    swap: '鲈鱼可换成虾仁。',
    items: [
      { id: 'brownRice', g: 110 },
      { id: 'fish', g: 150 },
      { id: 'mushroom', g: 150 },
      { id: 'cabbage', g: 150 },
      { id: 'oil', g: 4 }
    ]
  },
  {
    id: 'l-beef-potato',
    slot: 'lunch',
    styles: ['balanced', 'highProtein'],
    title: '牛肉红薯餐',
    cook: '瘦牛肉快炒，红薯蒸熟，西芹少油。',
    swap: '牛肉可换成里脊。',
    items: [
      { id: 'sweetPotato', g: 160 },
      { id: 'beef', g: 100 },
      { id: 'celery', g: 150 },
      { id: 'oil', g: 5 }
    ]
  },
  {
    id: 'l-salmon-quinoa',
    slot: 'lunch',
    styles: ['balanced', 'highProtein', 'lowCarb'],
    title: '三文鱼藜麦碗',
    cook: '三文鱼烤或煎，西兰花焯水。',
    swap: '三文鱼可换成清蒸鲈鱼。',
    items: [
      { id: 'quinoa', g: 90 },
      { id: 'salmon', g: 110 },
      { id: 'broccoli', g: 200 },
      { id: 'oil', g: 4 }
    ]
  },
  {
    id: 'l-salad',
    slot: 'lunch',
    styles: ['lowCarb', 'highProtein'],
    title: '鸡胸蔬菜沙拉',
    cook: '鸡胸水煮切条，蔬菜生吃或焯水，少油醋汁。',
    swap: '鸡胸可换成虾仁。',
    items: [
      { id: 'chicken', g: 140 },
      { id: 'lettuce', g: 150 },
      { id: 'cucumber', g: 120 },
      { id: 'cherryTomato', g: 100 },
      { id: 'corn', g: 60 },
      { id: 'oil', g: 6 }
    ]
  },
  {
    id: 'l-tofu-rice',
    slot: 'lunch',
    styles: ['vegetarian', 'balanced'],
    title: '豆腐毛豆糙米饭',
    cook: '北豆腐少油煎，毛豆煮熟，西兰花焯水。',
    swap: '毛豆可换成菌菇。',
    items: [
      { id: 'brownRice', g: 120 },
      { id: 'tofu', g: 180 },
      { id: 'edamame', g: 80 },
      { id: 'broccoli', g: 180 },
      { id: 'oil', g: 5 }
    ]
  },
  {
    id: 'l-veg-quinoa',
    slot: 'lunch',
    styles: ['vegetarian', 'balanced'],
    title: '藜麦豆腐碗',
    cook: '北豆腐少油煎，藜麦煮熟，蔬菜焯水。',
    swap: '藜麦可换成糙米饭。',
    items: [
      { id: 'quinoa', g: 110 },
      { id: 'tofu', g: 180 },
      { id: 'spinach', g: 160 },
      { id: 'edamame', g: 60 },
      { id: 'oil', g: 5 }
    ]
  },
  {
    id: 'l-pork-cabbage',
    slot: 'lunch',
    styles: ['balanced'],
    title: '里脊娃娃菜饭',
    cook: '里脊片快炒，娃娃菜蒜蓉，米饭适量。',
    swap: '里脊可换成鸡胸。',
    items: [
      { id: 'rice', g: 110 },
      { id: 'pork', g: 100 },
      { id: 'cabbage', g: 200 },
      { id: 'mushroom', g: 80 },
      { id: 'oil', g: 5 }
    ]
  },
  {
    id: 'd-fish-melon',
    slot: 'dinner',
    styles: ['balanced', 'highProtein', 'lowCarb'],
    title: '清蒸鱼配冬瓜',
    cook: '鱼清蒸，冬瓜海带煮汤，南瓜蒸熟。',
    swap: '鲈鱼可换成虾仁。',
    items: [
      { id: 'fish', g: 150 },
      { id: 'winterMelon', g: 220 },
      { id: 'seaweed', g: 60 },
      { id: 'pumpkin', g: 150 }
    ]
  },
  {
    id: 'd-shrimp-konjac',
    slot: 'dinner',
    styles: ['lowCarb', 'highProtein'],
    title: '虾仁魔芋西兰花',
    cook: '虾仁快炒，魔芋丝过水，西兰花焯水。',
    swap: '虾仁可换成鸡胸。',
    items: [
      { id: 'shrimp', g: 120 },
      { id: 'konjac', g: 150 },
      { id: 'broccoli', g: 200 },
      { id: 'oil', g: 4 }
    ]
  },
  {
    id: 'd-chicken-salad',
    slot: 'dinner',
    styles: ['balanced', 'highProtein', 'lowCarb'],
    title: '鸡胸沙拉配山药',
    cook: '鸡胸水煮，生菜黄瓜凉拌，山药蒸熟。',
    swap: '山药可换成南瓜。',
    items: [
      { id: 'chicken', g: 120 },
      { id: 'lettuce', g: 150 },
      { id: 'cucumber', g: 120 },
      { id: 'yam', g: 120 },
      { id: 'oil', g: 4 }
    ]
  },
  {
    id: 'd-beef-celery',
    slot: 'dinner',
    styles: ['balanced', 'highProtein', 'lowCarb'],
    title: '牛肉西芹魔芋',
    cook: '瘦牛肉快炒，西芹保持脆感，魔芋过水。',
    swap: '牛肉可换成里脊。',
    items: [
      { id: 'beef', g: 100 },
      { id: 'celery', g: 160 },
      { id: 'konjac', g: 140 },
      { id: 'oil', g: 5 }
    ]
  },
  {
    id: 'd-egg-spinach',
    slot: 'dinner',
    styles: ['balanced', 'vegetarian', 'highProtein'],
    title: '鸡蛋羹配菠菜',
    cook: '鸡蛋羹蒸熟，菠菜焯水，南瓜蒸。',
    swap: '南瓜可换成山药。',
    items: [
      { id: 'egg', g: 100 },
      { id: 'spinach', g: 200 },
      { id: 'pumpkin', g: 180 },
      { id: 'tofu', g: 80 }
    ]
  },
  {
    id: 'd-tofu-veg',
    slot: 'dinner',
    styles: ['vegetarian', 'balanced'],
    title: '豆腐菌菇青菜',
    cook: '北豆腐少油煎，菌菇娃娃菜清炒，少量糙米。',
    swap: '糙米可换成南瓜。',
    items: [
      { id: 'tofu', g: 180 },
      { id: 'mushroom', g: 150 },
      { id: 'cabbage', g: 180 },
      { id: 'brownRice', g: 70 },
      { id: 'oil', g: 5 }
    ]
  },
  {
    id: 'd-salmon-veg',
    slot: 'dinner',
    styles: ['highProtein', 'lowCarb'],
    title: '三文鱼配绿叶菜',
    cook: '三文鱼烤制，绿叶菜焯水少油。',
    swap: '三文鱼可换成清蒸鲈鱼。',
    items: [
      { id: 'salmon', g: 120 },
      { id: 'spinach', g: 180 },
      { id: 'broccoli', g: 150 },
      { id: 'oil', g: 4 }
    ]
  },
  {
    id: 's-apple-nut',
    slot: 'snack',
    styles: ['balanced', 'vegetarian', 'lowCarb'],
    title: '苹果配杏仁',
    cook: '两餐之间吃，坚果原味无盐。',
    swap: '苹果可换成柚子。',
    items: [
      { id: 'apple', g: 160 },
      { id: 'almond', g: 8 }
    ]
  },
  {
    id: 's-yogurt-berry',
    slot: 'snack',
    styles: ['balanced', 'highProtein', 'vegetarian'],
    title: '酸奶蓝莓杯',
    cook: '无糖酸奶加浆果。',
    swap: '蓝莓可换成草莓。',
    items: [
      { id: 'greek', g: 120 },
      { id: 'blueberry', g: 60 }
    ]
  },
  {
    id: 's-soy-cucumber',
    slot: 'snack',
    styles: ['balanced', 'vegetarian', 'lowCarb'],
    title: '豆浆配黄瓜',
    cook: '无糖豆浆，黄瓜当零食。',
    swap: '黄瓜可换成小番茄。',
    items: [
      { id: 'soyMilk', g: 250 },
      { id: 'cucumber', g: 150 }
    ]
  },
  {
    id: 's-grapefruit',
    slot: 'snack',
    styles: ['balanced', 'lowCarb', 'vegetarian'],
    title: '柚子加餐',
    cook: '选清甜柚子，控制份量。',
    swap: '柚子可换成草莓。',
    items: [{ id: 'grapefruit', g: 160 }]
  },
  {
    id: 's-edamame',
    slot: 'snack',
    styles: ['highProtein', 'vegetarian', 'balanced'],
    title: '毛豆加餐',
    cook: '水煮毛豆，少盐。',
    swap: '毛豆可换成希腊酸奶。',
    items: [{ id: 'edamame', g: 80 }]
  },
  {
    id: 's-strawberry-yogurt',
    slot: 'snack',
    styles: ['balanced', 'vegetarian', 'highProtein'],
    title: '草莓酸奶',
    cook: '草莓洗净配无糖酸奶。',
    swap: '草莓可换成蓝莓。',
    items: [
      { id: 'yogurt', g: 150 },
      { id: 'strawberry', g: 120 }
    ]
  }
]

const SLOT_META = {
  breakfast: { name: '早餐', order: 0 },
  lunch: { name: '午餐', order: 1 },
  dinner: { name: '晚餐', order: 2 },
  snack: { name: '加餐', order: 3 }
}

const MEAL_SPLITS = {
  3: { breakfast: 0.3, lunch: 0.4, dinner: 0.3 },
  4: { breakfast: 0.25, lunch: 0.35, dinner: 0.25, snack: 0.15 }
}

function parseNumber(text) {
  const raw = String(text == null ? '' : text)
    .trim()
    .replace(/,/g, '')
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : NaN
}

function formatNumber(value, digits) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(digits == null ? 0 : digits)
}

function formatInt(value) {
  return String(Math.round(Number(value) || 0))
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function optionById(list, id, fallbackId) {
  return list.find((item) => item.id === id) || list.find((item) => item.id === fallbackId) || list[0]
}

function nutrientsOf(food, grams) {
  const k = grams / 100
  return {
    kcal: food.kcal * k,
    p: food.p * k,
    c: food.c * k,
    f: food.f * k
  }
}

function addNutrients(a, b) {
  return {
    kcal: a.kcal + b.kcal,
    p: a.p + b.p,
    c: a.c + b.c,
    f: a.f + b.f
  }
}

function emptyNutrients() {
  return { kcal: 0, p: 0, c: 0, f: 0 }
}

function snapGrams(food, grams, maxOverride) {
  const maxG = maxOverride || food.maxG || 400
  let next = clamp(grams, food.minG || 5, maxG)
  if (food.pieceG) {
    const maxPieces = Math.max(1, Math.floor(maxG / food.pieceG))
    const pieces = clamp(Math.round((next / food.pieceG) * 2) / 2, 0.5, maxPieces)
    next = pieces * food.pieceG
    next = clamp(next, food.minG || food.pieceG, maxG)
  } else if (food.unit === 'ml') {
    const maxMl = Math.floor(maxG / 10) * 10
    next = Math.round(next / 10) * 10
    next = clamp(next, food.minG || 50, maxMl || maxG)
    return next
  } else if (food.name === '烹饪用油' || (food.maxG && food.maxG <= 15 && food.kcal > 500)) {
    next = Math.round(next)
  } else {
    next = Math.round(next / 5) * 5
  }
  return clamp(next, food.minG || 5, maxG)
}

function formatAmount(food, grams) {
  if (food.pieceG) {
    const pieces = Math.round((grams / food.pieceG) * 2) / 2
    const unit = food.pieceUnit || '个'
    if (Math.abs(pieces - Math.round(pieces)) < 0.01) return `${Math.round(pieces)} ${unit}`
    return `${pieces} ${unit}`
  }
  if (food.unit === 'ml') return `${Math.round(grams)} 毫升`
  return `${Math.round(grams)} 克`
}

function macrosFromKcal(kcal, proteinG, fatRatio, weightKg, styleId) {
  const minFatG = 0.7 * weightKg
  const maxProteinG = 2.4 * weightKg
  let protein = clamp(proteinG, 1.2 * weightKg, maxProteinG)
  let proteinKcal = protein * 4
  if (proteinKcal > kcal * 0.42) {
    protein = (kcal * 0.42) / 4
    proteinKcal = protein * 4
  }
  let fatKcal = kcal * fatRatio
  let fat = fatKcal / 9
  if (fat < minFatG) {
    fat = minFatG
    fatKcal = fat * 9
  }
  let carbKcal = kcal - proteinKcal - fatKcal
  const minCarb = styleId === 'lowCarb' ? 50 : 90
  if (carbKcal / 4 < minCarb) {
    const need = minCarb * 4
    const overflow = need - carbKcal
    fatKcal = Math.max(minFatG * 9, fatKcal - overflow)
    fat = fatKcal / 9
    carbKcal = kcal - proteinKcal - fatKcal
  }
  const carb = Math.max(0, carbKcal / 4)
  const total = protein * 4 + carb * 4 + fat * 9
  return {
    protein,
    carb,
    fat,
    proteinPct: total ? (protein * 4) / total : 0,
    carbPct: total ? (carb * 4) / total : 0,
    fatPct: total ? (fat * 9) / total : 0
  }
}

function listTemplates(slot, style) {
  const matched = TEMPLATES.filter((item) => item.slot === slot && item.styles.indexOf(style) >= 0)
  return matched.length ? matched : TEMPLATES.filter((item) => item.slot === slot)
}

function pickTemplate(slot, style, shuffleIndex, offset, used) {
  const pool = listTemplates(slot, style)
  const start = Math.abs((Number(shuffleIndex) || 0) * 3 + (Number(offset) || 0) * 7 + slot.charCodeAt(0)) % pool.length
  for (let i = 0; i < pool.length; i += 1) {
    const item = pool[(start + i) % pool.length]
    if (!used.has(item.id)) {
      used.add(item.id)
      return item
    }
  }
  return pool[start]
}

function toMealItem(foodId, grams) {
  const food = FOODS[foodId]
  const n = nutrientsOf(food, grams)
  return {
    id: foodId,
    name: food.name,
    amountText: formatAmount(food, grams),
    grams,
    kcal: n.kcal,
    p: n.p,
    c: n.c,
    f: n.f,
    note: food.note || ''
  }
}

function refreshMealItem(item) {
  return toMealItem(item.id, item.grams)
}

function mealTotal(items) {
  return items.reduce((sum, item) => addNutrients(sum, item), emptyNutrients())
}

const FILLER_IDS = {
  breakfast: ['oats', 'bread', 'egg', 'soyMilk'],
  lunch: ['brownRice', 'rice', 'quinoa', 'buckwheat', 'chicken', 'tofu'],
  dinner: ['brownRice', 'yam', 'sweetPotato', 'chicken', 'tofu', 'fish'],
  snack: ['greek', 'yogurt', 'edamame']
}

function fillerMax(foodId, targetKcal) {
  const food = FOODS[foodId]
  const extra = targetKcal > 700 ? 1.3 : targetKcal > 520 ? 1.12 : 1
  let maxG = Math.round((food.maxG || 200) * extra)
  if (food.unit === 'ml') maxG = Math.min(maxG, 400)
  if (food.pieceG) maxG = Math.min(maxG, food.pieceG * 4)
  if (['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp'].indexOf(foodId) >= 0) {
    maxG = Math.min(maxG, food.maxG || maxG)
  }
  if (['brownRice', 'rice', 'quinoa', 'buckwheat'].indexOf(foodId) >= 0) {
    maxG = Math.min(maxG, 300)
  }
  return maxG
}

function bumpItem(item, deltaKcal, targetKcal) {
  const food = FOODS[item.id]
  if (!food || food.name === '烹饪用油') return false
  const maxG = fillerMax(item.id, targetKcal)
  if (item.grams >= maxG - 1) return false
  const addG = (deltaKcal / food.kcal) * 100
  const next = snapGrams(food, item.grams + addG, maxG)
  if (next <= item.grams) return false
  item.grams = next
  return true
}

function addFiller(items, foodId, deltaKcal, targetKcal) {
  const food = FOODS[foodId]
  if (!food) return false
  const maxG = fillerMax(foodId, targetKcal)
  const grams = snapGrams(food, Math.max(food.minG || 40, (deltaKcal / food.kcal) * 100), maxG)
  if (grams < (food.minG || 30)) return false
  items.push(toMealItem(foodId, grams))
  return true
}

function fillersFor(slot, styleId) {
  if (styleId === 'vegetarian') {
    return (
      {
        breakfast: ['oats', 'bread', 'egg', 'soyMilk', 'tofu'],
        lunch: ['brownRice', 'rice', 'quinoa', 'tofu', 'edamame'],
        dinner: ['brownRice', 'yam', 'sweetPotato', 'tofu'],
        snack: ['greek', 'yogurt', 'edamame']
      }[slot] || FILLER_IDS.lunch
    )
  }
  if (styleId === 'lowCarb') {
    return (
      {
        breakfast: ['egg', 'greek', 'soyMilk'],
        lunch: ['chicken', 'tofu', 'salmon', 'quinoa'],
        dinner: ['chicken', 'tofu', 'fish', 'yam'],
        snack: ['greek', 'edamame']
      }[slot] || FILLER_IDS.dinner
    )
  }
  if (styleId === 'highProtein') {
    return (
      {
        breakfast: ['egg', 'greek', 'oats', 'soyMilk'],
        lunch: ['chicken', 'brownRice', 'tofu', 'fish'],
        dinner: ['chicken', 'tofu', 'fish', 'brownRice', 'yam'],
        snack: ['greek', 'edamame']
      }[slot] || FILLER_IDS.lunch
    )
  }
  return FILLER_IDS[slot] || FILLER_IDS.lunch
}

function isGrain(id) {
  return ['brownRice', 'rice', 'quinoa', 'buckwheat', 'oats'].indexOf(id) >= 0
}

function fillMealToTarget(items, slot, targetKcal, styleId) {
  const fillers = fillersFor(slot, styleId)
  for (let step = 0; step < 8; step += 1) {
    const total = mealTotal(items)
    const delta = targetKcal - total.kcal
    if (Math.abs(delta) <= 30) break
    if (delta > 0) {
      if (delta > 80) {
        const missingGrain = fillers.find((id) => isGrain(id) && !items.some((item) => isGrain(item.id)))
        if (missingGrain && addFiller(items, missingGrain, delta, targetKcal)) continue
      }
      let bumped = false
      for (let i = 0; i < fillers.length; i += 1) {
        const item = items.find((row) => row.id === fillers[i])
        if (item && bumpItem(item, delta, targetKcal)) {
          const idx = items.indexOf(item)
          items[idx] = refreshMealItem(item)
          bumped = true
          break
        }
      }
      if (bumped) continue
      const missing = fillers.find((id) => {
        if (items.some((item) => item.id === id)) return false
        if (isGrain(id) && items.some((item) => isGrain(item.id))) return false
        return true
      })
      if (missing && addFiller(items, missing, delta, targetKcal)) continue
      break
    }
    const carb = items.find((item) => isGrain(item.id) || item.id === 'sweetPotato' || item.id === 'yam')
    if (!carb) break
    const food = FOODS[carb.id]
    const next = snapGrams(food, carb.grams + (delta / food.kcal) * 100)
    if (next >= carb.grams) break
    carb.grams = next
    const idx = items.indexOf(carb)
    items[idx] = refreshMealItem(carb)
  }
  return items.map(refreshMealItem)
}

function scaleMeal(template, targetKcal, styleId) {
  const rawItems = template.items
    .map((row) => {
      const food = FOODS[row.id]
      if (!food) return null
      return { id: row.id, food, base: row.g }
    })
    .filter(Boolean)
  const base = rawItems.reduce((sum, item) => addNutrients(sum, nutrientsOf(item.food, item.base)), emptyNutrients())
  const scale = base.kcal > 0 ? clamp(targetKcal / base.kcal, 0.62, 1.85) : 1
  let items = rawItems.map((item) => toMealItem(item.id, snapGrams(item.food, item.base * scale)))
  items = fillMealToTarget(items, template.slot, targetKcal, styleId)
  const total = mealTotal(items)
  return {
    id: template.id,
    slot: template.slot,
    slotName: SLOT_META[template.slot].name,
    title: template.title,
    cook: template.cook,
    swap: template.swap,
    items,
    kcal: total.kcal,
    p: total.p,
    c: total.c,
    f: total.f,
    kcalText: formatInt(total.kcal),
    macroText: `蛋白 ${formatInt(total.p)}g · 碳水 ${formatInt(total.c)}g · 脂肪 ${formatInt(total.f)}g`
  }
}

function bmrOf(sex, weight, height, age) {
  const base = 10 * weight + 6.25 * height - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

function defaultOffsets() {
  return { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
}

function calculateDietPlan(input) {
  const sex = optionById(SEX_OPTIONS, input && input.sex, 'female').id
  const activity = optionById(ACTIVITY_OPTIONS, input && input.activity, 'light')
  const deficitOpt = optionById(DEFICIT_OPTIONS, input && input.deficit, 'standard')
  const style = optionById(STYLE_OPTIONS, input && input.style, 'balanced')
  const mealOpt = optionById(MEAL_COUNT_OPTIONS, String((input && input.mealCount) || '3'), '3')
  const age = parseNumber(input && input.age)
  const height = parseNumber(input && input.height)
  const weight = parseNumber(input && input.weight)

  if (age === null || height === null || weight === null) {
    return { valid: false, message: '请填写年龄、身高和体重' }
  }
  if (![age, height, weight].every((n) => Number.isFinite(n))) {
    return { valid: false, message: '请输入有效数字' }
  }
  if (age < 14 || age > 80) {
    return { valid: false, message: '年龄请输入 14–80 岁' }
  }
  if (height < 50 || height > 250) {
    return { valid: false, message: '身高请输入 50–250 厘米' }
  }
  if (weight < 30 || weight > 200) {
    return { valid: false, message: '体重请输入 30–200 公斤' }
  }

  const bmiResult = calculateBmi(height, weight)
  const bmr = bmrOf(sex, weight, height, age)
  const tdee = bmr * activity.factor
  const floor = sex === 'male' ? MALE_FLOOR : FEMALE_FLOOR
  const underweight = bmiResult.valid && bmiResult.levelId === 'under'
  let chosenDeficit = underweight ? 0 : deficitOpt.kcal
  let target = tdee - chosenDeficit
  let floored = false
  if (target < floor) {
    target = Math.min(tdee, floor)
    chosenDeficit = Math.max(0, tdee - target)
    floored = tdee > floor
  }
  if (tdee <= floor) {
    target = tdee
    chosenDeficit = 0
    floored = true
  }

  const macros = macrosFromKcal(target, style.proteinPerKg * weight, style.fatRatio, weight, style.id)
  const weeklyKg = (chosenDeficit * 7) / KCAL_PER_KG_FAT
  const waterMl = Math.round((weight * 35) / 50) * 50
  const shuffleIndex = Number(input && input.shuffleIndex) || 0
  const offsets = Object.assign(defaultOffsets(), (input && input.mealOffsets) || {})
  const split = MEAL_SPLITS[mealOpt.count]
  const slots = mealOpt.count === 4 ? ['breakfast', 'lunch', 'dinner', 'snack'] : ['breakfast', 'lunch', 'dinner']
  const used = new Set()
  const meals = slots.map((slot) => {
    const template = pickTemplate(slot, style.id, shuffleIndex, offsets[slot] || 0, used)
    return scaleMeal(template, target * split[slot], style.id)
  })
  const actual = meals.reduce((sum, meal) => addNutrients(sum, meal), emptyNutrients())
  const kcalDiff = actual.kcal - target
  const warnings = []
  if (age < 18) warnings.push('本工具按成人公式估算，未成年人请在家长或医生指导下使用。')
  if (underweight) warnings.push('当前体重偏低，已改为维持热量，不建议再制造赤字。')
  if (floored && !underweight) warnings.push(`目标热量已按${sex === 'male' ? '男性 1500' : '女性 1200'} 千卡安全下限保护。`)

  const proteinBar = Math.round(macros.proteinPct * 100)
  const carbBar = Math.round(macros.carbPct * 100)
  const fatBar = Math.max(0, 100 - proteinBar - carbBar)

  return {
    valid: true,
    sex,
    sexName: optionById(SEX_OPTIONS, sex).name,
    ageText: formatInt(age),
    heightText: formatNumber(height, height % 1 ? 1 : 0),
    weightText: formatNumber(weight, weight % 1 ? 1 : 0),
    activityId: activity.id,
    activityName: activity.name,
    deficitId: deficitOpt.id,
    deficitName: underweight ? '维持' : deficitOpt.name,
    styleId: style.id,
    styleName: style.name,
    mealCount: mealOpt.count,
    mealCountName: mealOpt.name,
    bmr,
    tdee,
    bmrText: formatInt(bmr),
    tdeeText: formatInt(tdee),
    target,
    targetText: formatInt(target),
    deficitKcal: Math.round(chosenDeficit),
    deficitText: `${formatInt(chosenDeficit)} 千卡`,
    weeklyKg,
    weeklyText: weeklyKg >= 0.05 ? `减重约 ${formatNumber(weeklyKg, 2)} 公斤` : '接近维持',
    heroSub: underweight
      ? '体重偏低，先按维持热量搭配'
      : `${deficitOpt.name}赤字 · ${style.name} · ${activity.name}活动`,
    bmiText: bmiResult.valid ? bmiResult.bmiText : '',
    bmiLevelName: bmiResult.valid ? bmiResult.levelName : '',
    macros,
    proteinText: `${formatInt(macros.protein)} 克`,
    carbText: `${formatInt(macros.carb)} 克`,
    fatText: `${formatInt(macros.fat)} 克`,
    proteinPctText: `${proteinBar}%`,
    carbPctText: `${carbBar}%`,
    fatPctText: `${fatBar}%`,
    proteinBar,
    carbBar,
    fatBar,
    proteinPerKgText: `${formatNumber(macros.protein / weight, 1)} 克/公斤`,
    waterText: `${waterMl} 毫升`,
    meals,
    actualKcalText: formatInt(actual.kcal),
    actualMacroText: `蛋白 ${formatInt(actual.p)}g · 碳水 ${formatInt(actual.c)}g · 脂肪 ${formatInt(actual.f)}g`,
    diffText: Math.abs(kcalDiff) < 40 ? '接近目标热量' : kcalDiff > 0 ? `大约超出 ${formatInt(kcalDiff)} 千卡` : `大约少 ${formatInt(-kcalDiff)} 千卡`,
    warnings,
    tips: [
      '烹饪以蒸、煮、炖、焯为主，酱料用醋、芥末、黑胡椒代替甜辣酱。',
      '蔬菜尽量每天 500 克以上，优先绿叶菜和菌菇，增加饱腹。',
      '蛋白质优先鸡胸、鱼虾、蛋奶、豆腐，有助于减脂时保住肌肉。',
      '每周体重下降 0.3–0.7 公斤更可持续，过快容易掉肌肉和反弹。'
    ],
    note: 'BMR 采用 Mifflin-St Jeor 公式。食物热量按可食部估算，实际以包装标签为准。结果仅供参考，不能替代医疗或营养师意见。'
  }
}

module.exports = {
  SEX_OPTIONS,
  ACTIVITY_OPTIONS,
  DEFICIT_OPTIONS,
  STYLE_OPTIONS,
  MEAL_COUNT_OPTIONS,
  calculateDietPlan
}
