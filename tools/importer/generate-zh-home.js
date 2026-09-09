/* eslint-disable */
/**
 * generate-zh-home.js
 *
 * Creates a Simplified-Chinese clone of the migrated English homepage.
 * There is no /zh source page on entegris.com, so this is a translation
 * scaffold derived deterministically from content/en/home.plain.html:
 *   - authored English strings → Simplified Chinese (ordered, longest-first)
 *   - block structure, images, and section styles are preserved verbatim
 *   - internal /en/... links are left intact (they point at the real migrated
 *     English targets; swap to /zh once localized subpages exist)
 *
 * Re-run after re-importing the English homepage to refresh the translation.
 *
 * Usage: node tools/importer/generate-zh-home.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../../content/en/home.plain.html');
const OUT = path.resolve(__dirname, '../../content/zh/home.plain.html');

// Ordered longest-first so multi-word phrases are replaced before their substrings.
const TRANSLATIONS = [
  // Hero carousel
  ["We're dedicated to solving complex customer challenges through innovative solutions, collaboration, and deep scientific expertise", '我们致力于通过创新解决方案、通力协作以及深厚的科学专业知识，解决复杂的客户难题'],
  ['From vision to value: unlock faster yield with co-optimized molybdenum solutions', '从愿景到价值：借助协同优化的钼解决方案实现更快产量'],
  ['Advancing interface integrity to improve yield, reliability, and performance', '提升界面完整性，以改善产量、可靠性与性能'],
  ['Explore our latest Corporate Social Responsibility report to learn how Entegris is driving innovation while helping build a more resilient future.', '浏览我们最新的企业社会责任报告，了解 Entegris 如何在推动创新的同时助力构建更具韧性的未来。'],
  ['At Entegris, we value your unique talents and invite you to be part of a culture where how we work matters as much as what we do.', '在 Entegris，我们珍视您独特的才华，诚邀您融入这样一种文化——我们如何工作与我们做什么同样重要。'],
  ['BRING YOUR IDEAS. CHANGE THE WORLD WITH US.', '带来您的创意，与我们一起改变世界。'],
  ['customer-driven solutions', '以客户为导向的解决方案'],
  ['Accelerate Speed-to-Yield', '加速产量提升'],
  ['FUTURE-PROOFING ADVANCED PACKAGING', '面向未来的先进封装'],
  ['Innovation with Impact', '富有影响力的创新'],

  // Intro sections
  ['Because rapid innovation is paramount. Quality is critical. And collaboration is key. Together, we can solve your most advanced technology challenges.', '因为快速创新至关重要，质量不可或缺，协作更是关键。携手合作，我们能够攻克您最先进的技术挑战。'],
  ['Through our technology expertise and strong employee culture, we provide science-based solutions to help you tackle your most advanced manufacturing challenges.', '凭借我们的技术专长与强大的员工文化，我们提供基于科学的解决方案，助您应对最先进的制造挑战。'],
  ['Innovation Together', '共同创新'],
  ['Success Together', '共创成功'],

  // Working Together (columns-media)
  ['Innovation is impatient. But progress takes time. The best solutions emerge from listening, understanding and sustaining relationships - and still work a decade or more later.', '创新不容等待，但进步需要时间。最佳的解决方案源于倾听、理解与持久的合作关系——并在十年乃至更久之后依然行之有效。'],
  ['see customer engagement model', '查看客户合作模式'],
  ['Working Together', '携手合作'],

  // Our Solutions (dark)
  ["Reducing defects. Speeding up cycle time. Improving yield. Whatever your challenge, we'll help you find an answer. Collaboration. That's how we solve problems.", '减少缺陷。缩短周期时间。提高产量。无论您面临何种挑战，我们都将助您找到答案。协作，正是我们解决问题的方式。'],
  ['Our Solutions', '我们的解决方案'],
  ['Contamination Control', '污染控制'],
  ['Fluid Management', '流体管理'],
  ['Specialty Materials', '特种材料'],
  ['Substrate Handling', '基板处理'],

  // Hiring banner (red)
  ['Entegris is hiring!', 'Entegris 正在招聘！'],
  ['Bring your ideas. Change the world with us.', '带来您的创意，与我们一起改变世界。'],
  ['Join our team', '加入我们的团队'],

  // Connect and Collaborate (grey) — headings, tags, card titles, CTA
  ['Connect and Collaborate', '联系与协作'],
  ['CMP Technology Day 2026', 'CMP 技术日 2026'],
  ['International Manufacturing Technology Show 2026', '国际制造技术展 2026'],
  ['From Lab to Fab: Capturing the Uncatchable in CMP Filtration', '从实验室到晶圆厂：捕获 CMP 过滤中难以捕捉的杂质'],
  ['What a Decade of Photochemical Purification Taught Us as EUV Scaled', '十年光化学纯化历程：EUV 规模化带来的启示'],
  ['Entegris Achieves Further Success in Defending Its CMP Slurry Patent Portfolio', 'Entegris 在捍卫其 CMP 抛光液专利组合方面再获成功'],
  ['Visit Newsroom', '访问新闻中心'],

  // Shared CTAs / category tags (short — replaced after long phrases above)
  ['Learn More', '了解更多'],
  ['Learn more', '了解更多'],
  ['learn more', '了解更多'],
  ['Explore', '探索'],
  ['>event<', '>活动<'],
  ['>blog<', '>博客<'],
  ['>news<', '>新闻<'],
];

// Month-name date rendering → Chinese "YYYY年M月D日".
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

function translate(html) {
  let out = html;
  for (const [en, zh] of TRANSLATIONS) {
    out = out.split(en).join(zh);
  }
  // Dates: "Oct 20, 2026" → "2026年10月20日"
  out = out.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s*(\d{4})\b/g,
    (_, mon, day, year) => `${year}年${MONTHS[mon]}月${parseInt(day, 10)}日`);
  return out;
}

const src = fs.readFileSync(SRC, 'utf-8');
const zh = translate(src);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, zh);

// Report any English authored strings that slipped through (heuristic: long ASCII runs inside > <).
const leftovers = [...zh.matchAll(/>([A-Za-z][A-Za-z ,'’.&:-]{6,})</g)]
  .map((m) => m[1].trim())
  .filter((t) => !/^(style|dark|red|grey|field|content_text|image|text)$/i.test(t));
console.log(`Wrote ${OUT}`);
if (leftovers.length) {
  console.log('Untranslated authored strings remaining (review):');
  [...new Set(leftovers)].forEach((t) => console.log('  -', t));
} else {
  console.log('No untranslated authored strings detected.');
}
