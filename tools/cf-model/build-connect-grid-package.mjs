/* eslint-disable */
/**
 * build-connect-grid-package.mjs — rewire the "Connect and Collaborate" grid on
 * en/home + zh/home from the hand-authored cards-resources block to a
 * fragment-list block that renders the Event Content Fragments dynamically
 * (folder /content/dam/entegris-eds/events, model "event").
 *
 * Rebuilds the two home pages' .content.xml (via the normal converter) but,
 * for the grey Connect section, emits a fragment-list block node instead of
 * cards-resources. Scoped filter targets ONLY the two home pages' jcr:content.
 *
 * Output: tools/cf-model/entegris-eds-connect-grid-<version>.zip
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const NM = '/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-content-import/scripts/node_modules';
const { JSDOM } = await import(`${NM}/jsdom/lib/api.js`);
const { toMarkdown } = await import(`${NM}/mdast-util-to-markdown/index.js`);
const { gridTablesToMarkdown } = await import(`${NM}/@adobe/mdast-util-gridtables/src/index.js`);
const { md2jcr } = await import(`${NM}/@adobe/helix-md2jcr/src/index.js`);
const { plainHtmlToMdast } = await import(`${resolve(process.argv[2] || '.')}/tools/jcr-package/plain2md.mjs`);

const WS = resolve(process.argv[2] || '.');
const OUT_DIR = join(WS, 'tools/cf-model');
const BUILD = join(OUT_DIR, 'connect-build');
const SITE_ROOT = '/content/entegris-eds/language-masters';
const VERSION = process.env.PKG_VERSION || '1.0.0';
const PKG_NAME = 'entegris-eds-connect-grid';
const EVENTS_FOLDER = '/content/dam/entegris-eds/events';

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

const PAGES = [
  { src: 'content/en/home.plain.html', jcr: `${SITE_ROOT}/en/home`, subtitle: 'Connect and Collaborate' },
  { src: 'content/zh/home.plain.html', jcr: `${SITE_ROOT}/zh/home`, subtitle: '联系与协作' },
];

// A fragment-list block as a key-value table (two cells per row: field name +
// value). Use ONLY field names present in the block's persisted modelFields
// (title, subtitle, layout, contentFragmentFolder, modelName, …) — including a
// field the model doesn't persist (e.g. dataSourceType) breaks md2jcr's
// key-value mapping. dataSourceType defaults to content-fragments in the block.
function fragmentListBlock(doc, sectionTitle) {
  const div = doc.createElement('div');
  div.className = 'fragment-list';
  // md2jcr maps rows POSITIONALLY to this block's persisted field order:
  // [title, subtitle, layout, contentFragmentFolder, modelName]. Keys are
  // cosmetic; the SECOND cell's value is what lands in the Nth field.
  const rows = [
    ['title', sectionTitle],       // -> title
    ['subtitle', ''],              // -> subtitle
    ['layout', 'grid'],            // -> layout
    ['contentFragmentFolder', EVENTS_FOLDER], // -> contentFragmentFolder
    ['modelName', 'event'],        // -> modelName
  ];
  for (const [k, v] of rows) {
    const row = doc.createElement('div');
    const kc = doc.createElement('div'); kc.append(doc.createTextNode(k));
    const vc = doc.createElement('div'); vc.append(doc.createTextNode(v));
    row.append(kc, vc); div.append(row);
  }
  return div;
}

function escapeXmlAmps(xml) {
  return xml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
}
const DAM_ROOT = '/content/dam/entegris-eds';
function rewriteToDam(xml, names) {
  return xml.replace(/((?:image|src|fileReference)=")([^"]+)(")/g, (m, pre, url, post) => {
    if (url.startsWith(DAM_ROOT)) return m;
    const base = url.split('?')[0].split('#')[0].split('/').pop();
    return (base && names.has(base)) ? `${pre}${DAM_ROOT}/${base}${post}` : m;
  });
}
import { readdirSync } from 'fs';
const damNames = (() => {
  const s = new Set();
  for (const d of ['content/media-da', 'migration-work/images', 'content/images']) {
    const f = join(WS, d);
    if (existsSync(f)) for (const n of readdirSync(f)) s.add(n);
  }
  return s;
})();

async function toJcr(page) {
  const html = readFileSync(join(WS, page.src), 'utf8');
  // Parse, swap the cards-resources block inside the Connect section for fragment-list.
  const dom = new JSDOM(`<!DOCTYPE html><html><body><main>${html}</main></body></html>`);
  const doc = dom.window.document;
  const cr = doc.querySelector('.cards-resources');
  if (cr) cr.replaceWith(fragmentListBlock(doc, page.subtitle));
  const swapped = doc.querySelector('main').innerHTML;

  const mdast = plainHtmlToMdast(swapped, { titleById: { ...TITLE_BY_ID, 'fragment-list': 'Fragment List' }, JSDOM });
  const md = toMarkdown(mdast, { extensions: [gridTablesToMarkdown()], bullet: '-' });
  const jcr = await md2jcr(md, components);
  if (!jcr.includes('cq:Page')) throw new Error(`bad jcr for ${page.src}`);
  return rewriteToDam(escapeXmlAmps(jcr), damNames);
}

function filterXml() {
  const rule = (root) => `  <filter root="${root}/jcr:content"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
${PAGES.map((p) => rule(p.jcr)).join('\n')}
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

if (existsSync(BUILD)) rmSync(BUILD, { recursive: true, force: true });
const jcrRoot = join(BUILD, 'jcr_root');
mkdirSync(jcrRoot, { recursive: true });
const vault = join(BUILD, 'META-INF', 'vault');
mkdirSync(vault, { recursive: true });
writeFileSync(join(vault, 'filter.xml'), filterXml());
writeFileSync(join(vault, 'properties.xml'), propertiesXml());

for (const page of PAGES) {
  const xml = await toJcr(page);
  const dir = join(jcrRoot, page.jcr.replace(/^\//, ''));
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
console.log(`\n✅ Connect-grid package: ${zipPath}`);
console.log(`   en/home + zh/home Connect grid -> fragment-list (folder ${EVENTS_FOLDER}, model event)`);
