/* eslint-disable */
/* global WebImporter */

// TRANSFORMER IMPORTS (site-wide; no block parsers — this template is all default content)
import cleanupTransformer from './transformers/entegris-cleanup.js';
import sectionsTransformer from './transformers/entegris-sections.js';
import dmImagesTransformer from './transformers/entegris-dm-images.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json (about-us)
const PAGE_TEMPLATE = {
  name: 'about-us',
  description: 'Entegris Locations page: title, regional maps image, and address directories for North America, Europe/Israel, and Asia/Pacific. All default content.',
  urls: [
    'https://www.entegris.com/en/home/about-us/locations.html',
  ],
  blocks: [],
  sections: [
    { id: 'loc-title', name: 'Title', selector: '#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(1)', style: null, blocks: [], defaultContent: ['#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(1)'] },
    { id: 'loc-divider', name: 'Divider', selector: '#maincontent > div.one-column-page > div.horizontalline.basecomponent:nth-of-type(2)', style: null, blocks: [], defaultContent: ['#maincontent > div.one-column-page > div.horizontalline.basecomponent:nth-of-type(2)'] },
    { id: 'loc-maps', name: 'Regional Maps', selector: '#maincontent > div.one-column-page > div.basicimage.basecomponent:nth-of-type(3)', style: null, blocks: [], defaultContent: ['#maincontent > div.one-column-page > div.basicimage.basecomponent:nth-of-type(3)'] },
    { id: 'loc-hq', name: 'Corporate Headquarters heading', selector: '#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(4)', style: null, blocks: [], defaultContent: ['#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(4)'] },
    { id: 'loc-north-america', name: 'North America addresses', selector: '#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(5)', style: null, blocks: [], defaultContent: ['#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(5)'] },
    { id: 'loc-europe-heading', name: 'Europe and Israel heading', selector: '#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(6)', style: null, blocks: [], defaultContent: ['#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(6)'] },
    { id: 'loc-europe-body', name: 'Europe and Israel addresses', selector: '#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(7)', style: null, blocks: [], defaultContent: ['#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(7)'] },
    { id: 'loc-asia-heading', name: 'Asia/Pacific heading', selector: '#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(8)', style: null, blocks: [], defaultContent: ['#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(8)'] },
    { id: 'loc-asia-body', name: 'Asia/Pacific addresses', selector: '#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(9)', style: null, blocks: [], defaultContent: ['#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(9)'] },
  ],
};

const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
  dmImagesTransformer,
];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    // 1. beforeTransform (cleanup overlays)
    executeTransformers('beforeTransform', main, payload);

    // 2. No block parsers — this template is entirely default content.

    // 3. afterTransform (chrome removal + section breaks + DM image anchors)
    executeTransformers('afterTransform', main, payload);

    // 4. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 5. Sanitized path (map root to /index defensively).
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: [] },
    }];
  },
};
