/* eslint-disable */
/**
 * build-package.mjs — build an AEM FileVault content package from the migrated
 * EDS .plain.html pages, installable via Package Manager.
 *
 * Pipeline per page: .plain.html -> mdast (block GridTables) -> markdown
 * -> md2jcr (block-faithful JCR using project component models) -> .content.xml.
 * Pages land under the language-masters tree so /en and /zh are siblings
 * (matching paths.json):
 *   /en/... -> /content/entegris-eds/language-masters/en/...
 *   /zh/... -> /content/entegris-eds/language-masters/zh/...
 *
 * Output: tools/jcr-package/entegris-eds-content.zip
 * Usage:  node tools/jcr-package/build-package.mjs [workspaceRoot]
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
const SITE_ROOT = '/content/entegris-eds/language-masters';
const OUT_DIR = join(WS, 'tools/jcr-package');
const BUILD = join(OUT_DIR, 'build');
const PKG_NAME = 'entegris-eds-content';
// Package version — override with PKG_VERSION env var. Appears in both the
// FileVault manifest and the zip filename (entegris-eds-content-1.0.0.zip).
const VERSION = process.env.PKG_VERSION || '1.0.0';

const TITLE_BY_ID = {
  'carousel-hero': 'Carousel Hero',
  'columns-media': 'Columns Media',
  'cards-solutions': 'Cards Solutions',
  'cards-resources': 'Cards Resources',
  'cards-products': 'Cards Products',
  'cards-insights': 'Cards Insights',
  'hero-masthead': 'Hero Masthead',
  'teaser-promo': 'Teaser Promo',
  'teaser-cta': 'Teaser CTA',
};

const PAGES = [
  'content/en/home.plain.html',
  'content/en/home/about-us/locations.plain.html',
  'content/en/home/products.plain.html',
  'content/en/home/products/chemistries/specialty-chemicals/post-cmp-cleaning-solutions/semiconductor-cleaning-solutions.plain.html',
  'content/en/home/our-science/by-solution-area/contamination-control.plain.html',
  'content/en/home/our-science/by-solution-area/fluid-management.plain.html',
  'content/en/home/our-science/by-solution-area/specialty-materials.plain.html',
  'content/en/home/our-science/by-solution-area/substrate-handling.plain.html',
  'content/zh/home.plain.html',
  'content/zh/home/our-science/by-solution-area/contamination-control.plain.html',
  'content/zh/home/our-science/by-solution-area/fluid-management.plain.html',
  'content/zh/home/our-science/by-solution-area/specialty-materials.plain.html',
  'content/zh/home/our-science/by-solution-area/substrate-handling.plain.html',
];

// nav + footer render as per-language pages fetched by the header/footer blocks
// at <lang-root>/nav and <lang-root>/footer (see helix-query.yaml excludes and
// header.js/footer.js fetch of /content/{nav,footer}.plain.html). The English
// fragments live at content/{nav,footer}.plain.html; the Chinese at
// content/zh/{nav,footer}.plain.html. Map each explicitly to its language tree.
const FRAGMENT_PAGES = [
  { src: 'content/nav.plain.html', jcr: `${SITE_ROOT}/en/nav` },
  { src: 'content/footer.plain.html', jcr: `${SITE_ROOT}/en/footer` },
  { src: 'content/zh/nav.plain.html', jcr: `${SITE_ROOT}/zh/nav` },
  { src: 'content/zh/footer.plain.html', jcr: `${SITE_ROOT}/zh/footer` },
];

const components = {
  models: JSON.parse(readFileSync(join(WS, 'component-models.json'), 'utf8')),
  definition: JSON.parse(readFileSync(join(WS, 'component-definition.json'), 'utf8')),
  filters: JSON.parse(readFileSync(join(WS, 'component-filters.json'), 'utf8')),
};

function jcrPathFor(rel) {
  const clean = rel.replace(/^content\//, '').replace(/\.plain\.html$/, '');
  return `${SITE_ROOT}/${clean}`;
}

function escapeXmlAmps(xml) {
  return xml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
}

const DAM_ROOT = '/content/dam/entegris-eds';
// Rewrite image references in the JCR XML to their DAM asset path. The DAM
// package stores each image at /content/dam/entegris-eds/<basename>, and every
// content image ref maps 1:1 by basename (verified). Only rewrite refs whose
// binary we actually packaged (asset-mapping keys); leave anything else (e.g.
// external Scene7 chrome) untouched. Matches src=/image=/fileReference= values.
const DAM_REWRITE = process.env.DAM_REWRITE !== '0';
let DAM_BASENAMES = null;
function damBasenames() {
  if (DAM_BASENAMES) return DAM_BASENAMES;
  // Source of truth: the local binaries the DAM builder packages.
  const dirs = ['content/media-da', 'migration-work/images', 'content/images'];
  const set = new Set();
  for (const d of dirs) {
    const full = join(WS, d);
    if (existsSync(full)) for (const f of readdirSync(full)) set.add(f);
  }
  DAM_BASENAMES = set;
  return set;
}
function rewriteToDam(xml) {
  if (!DAM_REWRITE) return xml;
  const names = damBasenames();
  return xml.replace(/((?:image|src|fileReference)=")([^"]+)(")/g, (m, pre, url, post) => {
    if (url.startsWith(DAM_ROOT)) return m; // already DAM
    const base = url.split('?')[0].split('#')[0].split('/').pop();
    if (base && names.has(base)) return `${pre}${DAM_ROOT}/${base}${post}`;
    return m;
  });
}

async function toJcr(rel) {
  const html = readFileSync(join(WS, rel), 'utf8');
  const mdast = plainHtmlToMdast(html, { titleById: TITLE_BY_ID, JSDOM });
  const md = toMarkdown(mdast, { extensions: [gridTablesToMarkdown()], bullet: '-' });
  const jcr = await md2jcr(md, components);
  if (!jcr || !jcr.includes('cq:Page')) throw new Error(`bad jcr for ${rel}`);
  return rewriteToDam(escapeXmlAmps(jcr));
}

function filterXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
  <filter root="${SITE_ROOT}/en"/>
  <filter root="${SITE_ROOT}/zh"/>
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
  <entry key="requiresRoot">false</entry>
  <entry key="allowIndexDefinitions">false</entry>
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

  const report = [];
  const emit = (jcrPath, xml, blocks) => {
    const pageDir = join(jcrRoot, jcrPath.replace(/^\//, ''));
    mkdirSync(pageDir, { recursive: true });
    writeFileSync(join(pageDir, '.content.xml'), xml);
    report.push({ jcr: jcrPath, blocks });
  };
  for (const rel of PAGES) {
    const xml = await toJcr(rel);
    const blocks = [...new Set([...xml.matchAll(/model="([\w-]+)"/g)].map((m) => m[1]))]
      .filter((b) => TITLE_BY_ID[b] || ['card', 'column', 'carousel-hero-item'].includes(b));
    emit(jcrPathFor(rel), xml, blocks);
  }
  // nav + footer fragment pages (default content), one per language.
  for (const { src, jcr } of FRAGMENT_PAGES) {
    emit(jcr, await toJcr(src), ['(nav/footer fragment)']);
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

  console.log(`\n✅ Package: ${zipPath}`);
  console.log(`   ${report.length} pages under ${SITE_ROOT}/{en,zh}\n`);
  report.forEach((r) => console.log(`   - ${r.jcr}\n       blocks: ${r.blocks.join(', ') || '(default content only)'}`));
}

main().catch((e) => { console.error('BUILD FAILED:', e.message, '\n', e.stack); process.exit(1); });
