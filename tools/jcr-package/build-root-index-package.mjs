/* eslint-disable */
/**
 * build-root-index-package.mjs — supplemental package that gives the site root
 * a real `index` PAGE, so `/` resolves AND is refetchable by AEM Sidekick.
 *
 * Earlier this placed the home content AS the language node itself
 * (language-masters/en/.content.xml). That renders in preview/live, but AEM's
 * franklin.delivery pipeline cannot serve a bare language container node as a
 * root document — Sidekick "Update" on `/` fails with
 * "not authorized to access resource: .../main/" (AEM_BACKEND_FETCH_FAILED).
 *
 * Fix: write the home content to a real child page named `index`:
 *   /content/entegris-eds/language-masters/en/index  -> mapped to /   (paths.json)
 *   /content/entegris-eds/language-masters/zh/index  -> mapped to /zh
 * A named `index` page is a normal published cq:Page, served exactly like
 * /en/home (which works), so Sidekick can refetch it. Requires the matching
 * paths.json mapping (language-masters/en/index:/ , language-masters/zh/index:/zh).
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

// Home content -> a real `index` child page under each language root. Mapped by
// paths.json: language-masters/en/index -> / , language-masters/zh/index -> /zh.
const NODES = [
  { src: 'content/en/home.plain.html', jcr: `${SITE_ROOT}/en/index` },
  { src: 'content/zh/home.plain.html', jcr: `${SITE_ROOT}/zh/index` },
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
  // Each `index` page is its own discrete node, so a plain filter rooted at it
  // is safe — it touches only that page and leaves the language node and all
  // sibling pages (home/, nav/, footer/, …) untouched.
  return `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
  <filter root="${SITE_ROOT}/en/index"/>
  <filter root="${SITE_ROOT}/zh/index"/>
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
