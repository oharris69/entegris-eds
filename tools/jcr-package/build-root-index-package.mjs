/* eslint-disable */
/**
 * build-root-index-package.mjs — supplemental package that gives the language
 * nodes their own page, so the site root resolves (English at root per
 * paths.json: language-masters/en -> /, language-masters/zh -> /zh).
 *
 * Places the home content AS the language node itself:
 *   /content/entegris-eds/language-masters/en/.content.xml  (from content/en/home.plain.html) -> serves at /
 *   /content/entegris-eds/language-masters/zh/.content.xml  (from content/zh/home.plain.html) -> serves at /zh
 *
 * Output: tools/jcr-package/entegris-eds-root-index.zip
 * Usage:  node tools/jcr-package/build-root-index-package.mjs [workspaceRoot]
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { plainHtmlToMdast } from './plain2md.mjs';

const NM = '/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-content-import/scripts/node_modules';
const { JSDOM } = await import(`${NM}/jsdom/lib/api.js`);
const { toMarkdown } = await import(`${NM}/mdast-util-to-markdown/index.js`);
const { gridTablesToMarkdown } = await import(`${NM}/@adobe/mdast-util-gridtables/src/index.js`);
const { md2jcr } = await import(`${NM}/@adobe/helix-md2jcr/src/index.js`);

const WS = resolve(process.argv[2] || '.');
const OUT_DIR = join(WS, 'tools/jcr-package');
const BUILD = join(OUT_DIR, 'root-index-build');
const SITE_ROOT = '/content/entegris-eds/language-masters';
const PKG_NAME = 'entegris-eds-root-index';
const VERSION = process.env.PKG_VERSION || '1.0.0';

const TITLE_BY_ID = {
  'carousel-hero': 'Carousel Hero', 'columns-media': 'Columns Media',
  'cards-solutions': 'Cards Solutions', 'cards-resources': 'Cards Resources',
  'cards-products': 'Cards Products', 'cards-insights': 'Cards Insights',
  'hero-masthead': 'Hero Masthead', 'teaser-promo': 'Teaser Promo', 'teaser-cta': 'Teaser CTA',
};
const components = {
  models: JSON.parse(readFileSync(join(WS, 'component-models.json'), 'utf8')),
  definition: JSON.parse(readFileSync(join(WS, 'component-definition.json'), 'utf8')),
  filters: JSON.parse(readFileSync(join(WS, 'component-filters.json'), 'utf8')),
};

// The language node pages: source home fragment -> JCR node AT the language root.
const NODES = [
  { src: 'content/en/home.plain.html', jcr: `${SITE_ROOT}/en` },
  { src: 'content/zh/home.plain.html', jcr: `${SITE_ROOT}/zh` },
];

const DAM_ROOT = '/content/dam/entegris-eds';
let DAM_BASENAMES = null;
function damBasenames() {
  if (DAM_BASENAMES) return DAM_BASENAMES;
  const set = new Set();
  for (const d of ['content/media-da', 'migration-work/images', 'content/images']) {
    const full = join(WS, d);
    if (existsSync(full)) for (const f of readdirSync(full)) set.add(f);
  }
  DAM_BASENAMES = set; return set;
}
function rewriteToDam(xml) {
  const names = damBasenames();
  return xml.replace(/((?:image|src|fileReference)=")([^"]+)(")/g, (m, pre, url, post) => {
    if (url.startsWith(DAM_ROOT)) return m;
    const base = url.split('?')[0].split('#')[0].split('/').pop();
    return (base && names.has(base)) ? `${pre}${DAM_ROOT}/${base}${post}` : m;
  });
}

async function toJcr(rel) {
  const html = readFileSync(join(WS, rel), 'utf8');
  const mdast = plainHtmlToMdast(html, { titleById: TITLE_BY_ID, JSDOM });
  const md = toMarkdown(mdast, { extensions: [gridTablesToMarkdown()], bullet: '-' });
  const jcr = await md2jcr(md, components);
  const escaped = jcr.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
  return rewriteToDam(escaped);
}

function filterXml() {
  // Import the en/zh node itself (as a cq:Page) + its jcr:content, but EXCLUDE
  // all child nodes so the existing child pages (home/, nav/, footer/, …) are
  // preserved untouched. Without the excludes, a filter rooted at the node would
  // delete children not present in this package.
  const rule = (root) => `  <filter root="${root}">
    <include pattern="${root}"/>
    <include pattern="${root}/jcr:content(/.*)?"/>
    <exclude pattern="${root}/[^/]+(/.*)?"/>
  </filter>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
${rule(`${SITE_ROOT}/en`)}
${rule(`${SITE_ROOT}/zh`)}
</workspaceFilter>
`;
}
function propertiesXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
  <comment>FileVault Package Definition</comment>
  <entry key="name">${PKG_NAME}</entry>
  <entry key="group">entegris</entry>
  <entry key="version">${VERSION}</entry>
  <entry key="packageType">content</entry>
  <entry key="createdBy">excat-migration</entry>
</properties>
`;
}

async function main() {
  if (existsSync(BUILD)) rmSync(BUILD, { recursive: true, force: true });
  const jcrRoot = join(BUILD, 'jcr_root');
  mkdirSync(jcrRoot, { recursive: true });
  const vault = join(BUILD, 'META-INF', 'vault');
  mkdirSync(vault, { recursive: true });
  writeFileSync(join(vault, 'filter.xml'), filterXml());
  writeFileSync(join(vault, 'properties.xml'), propertiesXml());

  for (const { src, jcr } of NODES) {
    const xml = await toJcr(src);
    const dir = join(jcrRoot, jcr.replace(/^\//, ''));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '.content.xml'), xml);
  }

  const zipPath = join(OUT_DIR, `${PKG_NAME}-${VERSION}.zip`);
  if (existsSync(zipPath)) rmSync(zipPath);
  const py = 'import zipfile,os,sys\n'
    + 'root=sys.argv[1]; out=sys.argv[2]\n'
    + "z=zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED)\n"
    + "for base in ('jcr_root','META-INF'):\n"
    + '  for dp,_,fs in os.walk(os.path.join(root,base)):\n'
    + '    for f in fs:\n'
    + '      fp=os.path.join(dp,f); z.write(fp, os.path.relpath(fp,root))\n'
    + 'z.close()\n';
  execSync(`python3 -c "${py.replace(/"/g, '\\"')}" "${BUILD}" "${zipPath}"`, { stdio: 'inherit' });
  console.log(`\n✅ Root-index package: ${zipPath}`);
  console.log('   en node -> serves at /   |   zh node -> serves at /zh');
}

main().catch((e) => { console.error('BUILD FAILED:', e.message); process.exit(1); });
