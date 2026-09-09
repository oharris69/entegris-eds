/* eslint-disable */
/**
 * generate-zh-page.js
 *
 * Creates a Simplified-Chinese clone of a migrated English .plain.html page.
 * There are no /zh source pages on entegris.com, so /zh pages are translation
 * scaffolds derived deterministically from the migrated English content:
 *   - authored English strings → Simplified Chinese via zh-translations.js
 *     (ordered longest-first so phrases replace before their substrings)
 *   - English month-name dates → Chinese "YYYY年M月D日"
 *   - internal root-relative /en/... anchor hrefs → /zh/...
 *   - block structure, images, and section styles preserved verbatim
 *
 * Image src="https://www.entegris.com/en/images/..." URLs are left untouched
 * (they resolve against the real English asset host; no /zh asset tree exists).
 *
 * Usage:
 *   node tools/importer/generate-zh-page.js <en-relative-path> [more...]
 *   # path is relative to content/, with or without .plain.html
 * Examples:
 *   node tools/importer/generate-zh-page.js en/home
 *   node tools/importer/generate-zh-page.js en/home/our-science/by-solution-area/contamination-control
 *   node tools/importer/generate-zh-page.js --all-solution-area
 */
const fs = require('fs');
const path = require('path');
const { translations } = require('./zh-translations.js');

const CONTENT = path.resolve(__dirname, '../../content');

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

// Longest-first so multi-word phrases win over their substrings.
const ORDERED = Object.entries(translations).sort((a, b) => b[0].length - a[0].length);

function translate(html) {
  let out = html;
  for (const [en, zh] of ORDERED) out = out.split(en).join(zh);
  out = out.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s*(\d{4})\b/g,
    (_, mon, day, year) => `${year}年${MONTHS[mon]}月${parseInt(day, 10)}日`);
  return out;
}

function repointLinks(html) {
  return html.replace(/href="\/en(\/[^"]*|)"/g, (_, rest) => `href="/zh${rest}"`);
}

function normalizeRel(rel) {
  return rel.replace(/^content\//, '').replace(/\.plain\.html$/, '').replace(/\.html$/, '');
}

let args = process.argv.slice(2);
if (args.includes('--all-solution-area')) {
  const dir = 'en/home/our-science/by-solution-area';
  args = ['contamination-control', 'fluid-management', 'specialty-materials', 'substrate-handling'].map((p) => `${dir}/${p}`);
}
if (!args.length) {
  console.error('Usage: node tools/importer/generate-zh-page.js <en-relative-path> [more...]');
  process.exit(1);
}

let anyLeftovers = false;
for (const rawRel of args) {
  const rel = normalizeRel(rawRel);
  if (!rel.startsWith('en/')) {
    console.error(`Skipping "${rawRel}": path must be under en/`);
    continue;
  }
  const src = path.join(CONTENT, `${rel}.plain.html`);
  const out = path.join(CONTENT, `${rel.replace(/^en\//, 'zh/')}.plain.html`);
  if (!fs.existsSync(src)) {
    console.error(`Missing source: ${src}`);
    continue;
  }
  const zh = repointLinks(translate(fs.readFileSync(src, 'utf-8')));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, zh);

  const leftovers = [...new Set(
    [...zh.matchAll(/>([A-Za-z][A-Za-z ,'’.&:()/-]{7,})</g)]
      .map((m) => m[1].trim())
      .filter((t) => !/^(style|dark|red|grey|field|content_text|image|text|Entegris)$/i.test(t)),
  )];
  const enHref = (zh.match(/href="\/en\//g) || []).length;
  console.log(`✅ ${path.relative(CONTENT, out)}  (/en hrefs remaining: ${enHref})`);
  if (leftovers.length) {
    anyLeftovers = true;
    console.log(`   untranslated authored strings (${leftovers.length}) — review:`);
    leftovers.slice(0, 20).forEach((t) => console.log(`     - ${t.slice(0, 90)}`));
  }
}
if (anyLeftovers) console.log('\nNote: some authored strings were left in English (add them to zh-translations.js).');
