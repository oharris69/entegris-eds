/* eslint-disable */
/**
 * build-combined-package.mjs — build ONE FileVault package containing both the
 * content pages and the DAM assets, for a single Package Manager install.
 *
 * Runs the content and DAM builders first (so their build/ trees are current),
 * then merges jcr_root/ from both and writes a unified filter.xml covering all
 * roots (language-masters/{en,zh} + /content/dam/entegris-eds).
 *
 * Output: tools/jcr-package/entegris-eds-full.zip
 * Usage:  node tools/jcr-package/build-combined-package.mjs [workspaceRoot]
 */
import {
  cpSync, mkdirSync, rmSync, existsSync, writeFileSync,
} from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const WS = resolve(process.argv[2] || '.');
const OUT_DIR = join(WS, 'tools/jcr-package');
const CONTENT_BUILD = join(OUT_DIR, 'build');
const DAM_BUILD = join(OUT_DIR, 'dam-build');
const COMBINED = join(OUT_DIR, 'full-build');
const PKG_NAME = 'entegris-eds-full';
const VERSION = process.env.PKG_VERSION || '1.0.0';
const SITE_ROOT = '/content/entegris-eds/language-masters';
const DAM_ROOT = '/content/dam/entegris-eds';

function run(script) {
  execSync(`node "${join(OUT_DIR, script)}" "${WS}"`, { stdio: 'inherit' });
}

function filterXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
  <filter root="${SITE_ROOT}/en"/>
  <filter root="${SITE_ROOT}/zh"/>
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
  <entry key="requiresRoot">false</entry>
  <entry key="allowIndexDefinitions">false</entry>
  <entry key="createdBy">excat-migration</entry>
</properties>
`;
}

// Build both sub-packages fresh so their jcr_root trees are current.
run('build-package.mjs');
run('build-dam-package.mjs');

if (existsSync(COMBINED)) rmSync(COMBINED, { recursive: true, force: true });
mkdirSync(join(COMBINED, 'jcr_root'), { recursive: true });
const vault = join(COMBINED, 'META-INF', 'vault');
mkdirSync(vault, { recursive: true });

// Merge both jcr_root trees (disjoint: content/entegris-eds vs content/dam/entegris-eds).
cpSync(join(CONTENT_BUILD, 'jcr_root'), join(COMBINED, 'jcr_root'), { recursive: true });
cpSync(join(DAM_BUILD, 'jcr_root'), join(COMBINED, 'jcr_root'), { recursive: true });

writeFileSync(join(vault, 'filter.xml'), filterXml());
writeFileSync(join(vault, 'properties.xml'), propertiesXml());

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
execSync(`python3 -c "${py.replace(/"/g, '\\"')}" "${COMBINED}" "${zipPath}"`, { stdio: 'inherit' });

console.log(`\n✅ Combined package: ${zipPath}`);
console.log('   filter roots: en, zh, /content/dam/entegris-eds');
