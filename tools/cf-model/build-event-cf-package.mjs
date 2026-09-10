/* eslint-disable */
/**
 * build-event-cf-package.mjs — FileVault package for the Event Content Fragment
 * Model + the 9 event/blog/news Content Fragments migrated from the "Connect
 * and Collaborate" grid.
 *
 * Produces:
 *   /conf/global/settings/dam/cfm/models/event   (the CF Model)
 *   /content/dam/entegris-eds/events/<slug>       (9 CF instances)
 *
 * NOTE: the conf path is assumed to be /conf/global (AEM default). If this
 * site uses a site-specific conf (e.g. /conf/entegris-eds), set CONF env var:
 *   CONF=entegris-eds node tools/cf-model/build-event-cf-package.mjs
 * The CF instances' data/@cq:model is kept in sync with CONF automatically.
 *
 * Output: tools/cf-model/entegris-eds-event-cf-<version>.zip
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const WS = resolve(process.argv[2] || '.');
const OUT_DIR = join(WS, 'tools/cf-model');
const BUILD = join(OUT_DIR, 'build');
const CONF = process.env.CONF || 'global';
const MODEL_PATH = `/conf/${CONF}/settings/dam/cfm/models/event`;
const EVENTS_ROOT = '/content/dam/entegris-eds/events';
const VERSION = process.env.PKG_VERSION || '1.0.0';
const PKG_NAME = 'entegris-eds-event-cf';

// The 9 records from the Connect and Collaborate grid.
const EVENTS = [
  { slug: 'glasstec-2026', title: 'glasstec 2026', type: 'event', date: '2026-10-20', link: '/en/home/about-us/events/glasstec-2026.html' },
  { slug: 'cmp-technology-day-2026', title: 'CMP Technology Day 2026', type: 'event', date: '2026-10-08', link: '/en/home/about-us/events/cmp-technology-day-2026.html' },
  { slug: 'iit-2026', title: 'IIT 2026', type: 'event', date: '2026-09-20', link: '/en/home/about-us/events/iit-2026.html' },
  { slug: 'ultrafacility-2026', title: 'UltraFacility 2026', type: 'event', date: '2026-09-16', link: '/en/home/about-us/events/ultrafacility-2026.html' },
  { slug: 'imts-2026', title: 'International Manufacturing Technology Show 2026', type: 'event', date: '2026-09-14', link: '/en/home/about-us/events/imts-2026.html' },
  { slug: 'semicon-taiwan-2026', title: 'SEMICON Taiwan 2026', type: 'event', date: '2026-09-02', link: '/en/home/about-us/events/semicon-taiwan-2026.html' },
  { slug: 'from-lab-to-fab-cmp-filtration', title: 'From Lab to Fab: Capturing the Uncatchable in CMP Filtration', type: 'blog', date: '2026-08-25', link: 'https://blog.entegris.com/from-lab-to-fab-capturing-the-uncatchable-in-cmp-filtration' },
  { slug: 'decade-photochemical-purification-euv', title: 'What a Decade of Photochemical Purification Taught Us as EUV Scaled', type: 'blog', date: '2026-08-18', link: 'https://blog.entegris.com/what-a-decade-of-photochemical-purification-taught-us-as-euv-scaled' },
  { slug: 'cmp-slurry-patent-portfolio', title: 'Entegris Achieves Further Success in Defending Its CMP Slurry Patent Portfolio', type: 'news', date: '2026-08-18', link: '/en/home/about-us/news/entegris-achieves-further-success-in-defending-its-cmp-slurry-pa.html' },
];

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// --- Content Fragment Model (AEMaaCS structure) ---
// Fields: title (text), eventType (enum text), eventDate (date), summary (multiline),
// link (text), thumbnail (content-reference/asset).
function modelXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0"
    xmlns:nt="http://www.jcp.org/jcr/nt/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
    jcr:primaryType="cq:Page">
  <jcr:content
      jcr:primaryType="nt:unstructured"
      jcr:title="Event"
      jcr:description="Entegris event / blog / news card"
      sling:resourceType="dam/cfm/models/console/components/data/entity/default"
      status="enabled">
    <model
        jcr:primaryType="nt:unstructured"
        sling:resourceType="dam/cfm/models/console/components/data/entity"
        maxGraphQLPageSize="50">
      <cq:dialog jcr:primaryType="nt:unstructured"
          sling:resourceType="granite/ui/components/coral/foundation/container">
        <items jcr:primaryType="nt:unstructured">
          <items jcr:primaryType="nt:unstructured">
            <title
                jcr:primaryType="nt:unstructured"
                sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
                fieldLabel="Title" name="title" valueType="string" metaType="text-single"
                required="{Boolean}true" listOrder="1" renderReadOnly="{Boolean}false"/>
            <eventType
                jcr:primaryType="nt:unstructured"
                sling:resourceType="granite/ui/components/coral/foundation/form/select"
                fieldLabel="Type" name="eventType" valueType="string" metaType="enumeration"
                listOrder="2" defaultValue="event">
              <items jcr:primaryType="nt:unstructured">
                <event jcr:primaryType="nt:unstructured" text="Event" value="event"/>
                <blog jcr:primaryType="nt:unstructured" text="Blog" value="blog"/>
                <news jcr:primaryType="nt:unstructured" text="News" value="news"/>
              </items>
            </eventType>
            <eventDate
                jcr:primaryType="nt:unstructured"
                sling:resourceType="granite/ui/components/coral/foundation/form/datepicker"
                fieldLabel="Date" name="eventDate" valueType="calendar" metaType="date-time"
                listOrder="3" displayedFormat="YYYY-MM-DD" valueFormat="YYYY-MM-DD"/>
            <summary
                jcr:primaryType="nt:unstructured"
                sling:resourceType="granite/ui/components/coral/foundation/form/textarea"
                fieldLabel="Summary" name="summary" valueType="string" metaType="text-multi"
                listOrder="4"/>
            <link
                jcr:primaryType="nt:unstructured"
                sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
                fieldLabel="Link" name="link" valueType="string" metaType="text-single"
                listOrder="5"/>
            <thumbnail
                jcr:primaryType="nt:unstructured"
                sling:resourceType="dam/cfm/models/editor/components/contentreference"
                fieldLabel="Thumbnail" name="thumbnail" valueType="string" metaType="content-reference"
                listOrder="6" rootPath="/content/dam/entegris-eds"/>
          </items>
        </items>
      </cq:dialog>
    </model>
  </jcr:content>
</jcr:root>
`;
}

// --- A Content Fragment instance (dam:Asset with contentFragment + data/master) ---
function cfXml(ev) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
    xmlns:dam="http://www.day.com/dam/1.0" xmlns:dc="http://purl.org/dc/elements/1.1/"
    jcr:primaryType="dam:Asset">
  <jcr:content jcr:primaryType="dam:AssetContent" contentFragment="{Boolean}true">
    <data cq:model="${MODEL_PATH}" jcr:primaryType="nt:unstructured"
        xmlns:cq="http://www.day.com/jcr/cq/1.0">
      <master jcr:primaryType="nt:unstructured"
          title="${xmlEsc(ev.title)}"
          eventType="${xmlEsc(ev.type)}"
          eventDate="${xmlEsc(ev.date)}T00:00:00.000Z"
          link="${xmlEsc(ev.link)}"
          summary=""
          contentFragment="{Boolean}true"/>
    </data>
    <metadata jcr:primaryType="nt:unstructured"
        dc:title="${xmlEsc(ev.title)}" dc:description=""/>
  </jcr:content>
</jcr:root>
`;
}

function eventsFolderXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
    xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
    jcr:primaryType="sling:OrderedFolder">
  <jcr:content jcr:primaryType="nt:unstructured" jcr:title="Events"/>
</jcr:root>
`;
}

function filterXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
  <filter root="${MODEL_PATH}"/>
  <filter root="${EVENTS_ROOT}"/>
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

function write(path, content) {
  const full = join(BUILD, 'jcr_root', path.replace(/^\//, ''));
  mkdirSync(full, { recursive: true });
  writeFileSync(join(full, '.content.xml'), content);
}

if (existsSync(BUILD)) rmSync(BUILD, { recursive: true, force: true });
const vault = join(BUILD, 'META-INF', 'vault');
mkdirSync(vault, { recursive: true });
writeFileSync(join(vault, 'filter.xml'), filterXml());
writeFileSync(join(vault, 'properties.xml'), propertiesXml());

write(MODEL_PATH, modelXml());
write(EVENTS_ROOT, eventsFolderXml());
for (const ev of EVENTS) write(`${EVENTS_ROOT}/${ev.slug}`, cfXml(ev));

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
console.log(`\n✅ Event CF package: ${zipPath}`);
console.log(`   Model: ${MODEL_PATH}`);
console.log(`   ${EVENTS.length} fragments under ${EVENTS_ROOT}`);
console.log(`   (conf = ${CONF}; set CONF env to change)`);
