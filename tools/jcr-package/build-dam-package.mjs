/* eslint-disable */
/**
 * build-dam-package.mjs — build an AEM FileVault DAM package containing the
 * images referenced by the migrated content pages, plus a rewrite map from
 * source image URL -> DAM path.
 *
 * Collects every <img src> / <source srcset> across content/**.plain.html,
 * resolves each to a local binary (content/media-da, migration-work/images,
 * content/images), and emits under jcr_root/content/dam/entegris-eds/<file>:
 *   - <file>              (the binary)
 *   - <file>.dir/.content.xml   (dam:Asset + jcr:content/renditions/original)
 * Skips non-content chrome (Scene7 busyicon, open-graph meta image) and
 * unresolvable remote-only URLs (reported, not fetched).
 *
 * Output: tools/jcr-package/entegris-eds-dam.zip
 *         tools/jcr-package/dam-rewrite-map.json  (srcUrl -> /content/dam/...)
 * Usage:  node tools/jcr-package/build-dam-package.mjs [workspaceRoot]
 */
import {
  readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync, readdirSync, statSync,
} from 'fs';
import { join, resolve, basename, extname } from 'path';
import { execSync } from 'child_process';

const WS = resolve(process.argv[2] || '.');
const OUT_DIR = join(WS, 'tools/jcr-package');
const BUILD = join(OUT_DIR, 'dam-build');
const DAM_ROOT = '/content/dam/entegris-eds';
const PKG_NAME = 'entegris-eds-dam';
const VERSION = process.env.PKG_VERSION || '1.0.0';

// Local dirs to search for a binary by basename (first match wins).
const SEARCH_DIRS = [
  join(WS, 'content/media-da'),
  join(WS, 'migration-work/images'),
  join(WS, 'migration-work/about-us/images'),
  join(WS, 'migration-work/products/images'),
  join(WS, 'migration-work/solution-area/images'),
  join(WS, 'content/images'),
  join(WS, 'en/images'),
];

// URLs that are chrome / not content assets — skip.
const SKIP = [
  /scene7\.com\/s7sdk\//i, // busy/loader icons
  /open-graph/i, // og meta image
];

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

function collectUrls() {
  const urls = new Set();
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.plain.html')) {
        const h = readFileSync(p, 'utf8');
        for (const m of h.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)) urls.add(m[1]);
        for (const m of h.matchAll(/<source[^>]*\ssrcset="([^"]+)"/g)) urls.add(m[1].split(/\s/)[0]);
      }
    }
  };
  walk(join(WS, 'content'));
  return [...urls];
}

function localBinaryFor(url) {
  const name = basename(url.split('?')[0]);
  for (const d of SEARCH_DIRS) {
    const cand = join(d, name);
    if (existsSync(cand) && statSync(cand).isFile()) return cand;
  }
  return null;
}

function assetContentXml(mime) {
  // dam:Asset node. CRITICAL: the .content.xml must NOT serialize the
  // renditions folder as empty (self-closed) — that tells FileVault the folder
  // has no children, so the loose `original` binary on disk is IGNORED and the
  // asset imports with no image (which DAM then drops, emptying the folder).
  //
  // The correct (standard vault) serialization declares the full path down to
  // the `original` rendition as an nt:file with an nt:resource jcr:content;
  // vault then attaches the physical binary placed at the matching aggregate
  // path (_jcr_content/renditions/original). AEM fills width/height and extra
  // renditions on asset (re)processing.
  return `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
    xmlns:dam="http://www.day.com/dam/1.0" xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
    jcr:primaryType="dam:Asset">
  <jcr:content jcr:primaryType="dam:AssetContent">
    <metadata jcr:primaryType="nt:unstructured" dc:format="${mime}"/>
    <renditions jcr:primaryType="nt:folder">
      <original jcr:primaryType="nt:file">
        <jcr:content jcr:primaryType="nt:resource" jcr:mimeType="${mime}"/>
      </original>
    </renditions>
  </jcr:content>
</jcr:root>
`;
}

function filterXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
  <filter root="${DAM_ROOT}"/>
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

function main() {
  if (existsSync(BUILD)) rmSync(BUILD, { recursive: true, force: true });
  const damDir = join(BUILD, 'jcr_root', DAM_ROOT.replace(/^\//, ''));
  mkdirSync(damDir, { recursive: true });
  const vault = join(BUILD, 'META-INF', 'vault');
  mkdirSync(vault, { recursive: true });
  writeFileSync(join(vault, 'filter.xml'), filterXml());
  writeFileSync(join(vault, 'properties.xml'), propertiesXml());

  const urls = collectUrls();
  const rewrite = {};
  const packed = [];
  const skipped = [];
  const missing = [];
  const seenNames = new Set();

  for (const url of urls) {
    if (SKIP.some((re) => re.test(url))) { skipped.push(url); continue; }
    const bin = localBinaryFor(url);
    const name = basename(url.split('?')[0]);
    if (!bin) { missing.push(url); continue; }
    const ext = extname(name).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const damPath = `${DAM_ROOT}/${name}`;
    rewrite[url] = damPath;
    if (seenNames.has(name)) continue; // same binary reused across pages
    seenNames.add(name);
    // FileVault asset layout: <name> file node dir + .content.xml (dam:Asset)
    const assetDir = join(damDir, name);
    mkdirSync(assetDir, { recursive: true });
    writeFileSync(join(assetDir, '.content.xml'), assetContentXml(mime));
    // renditions/original binary as a vault file: jcr_root/.../<name>/_jcr_content/renditions/original
    const origDir = join(assetDir, '_jcr_content', 'renditions');
    mkdirSync(origDir, { recursive: true });
    copyFileSync(bin, join(origDir, 'original'));
    packed.push({ name, damPath, from: bin.replace(`${WS}/`, '') });
  }

  writeFileSync(join(OUT_DIR, 'dam-rewrite-map.json'), JSON.stringify(rewrite, null, 2));

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

  console.log(`\n✅ DAM package: ${zipPath}`);
  console.log(`   ${packed.length} assets under ${DAM_ROOT}`);
  console.log(`   rewrite map: tools/jcr-package/dam-rewrite-map.json (${Object.keys(rewrite).length} url mappings)`);
  if (skipped.length) console.log(`   skipped (chrome): ${skipped.length}`);
  if (missing.length) {
    console.log(`   ⚠️  no local binary (not packed): ${missing.length}`);
    missing.forEach((u) => console.log(`      - ${u}`));
  }
}

main();
