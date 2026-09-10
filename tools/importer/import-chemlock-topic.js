/* eslint-disable */
/* global WebImporter */

// ChemLock technical topic pages (bowl-installation, chemical-compatibility).
// All default content (headings, prose, notes, images, tables) — no block
// parsers; reuse the site-wide cleanup + section transformers only.
import cleanupTransformer from './transformers/entegris-cleanup.js';
import sectionsTransformer from './transformers/entegris-sections.js';
import dmImagesTransformer from './transformers/entegris-dm-images.js';
import tablesTransformer from './transformers/entegris-tables.js';
import tableParser from './parsers/table.js';

const PAGE_TEMPLATE = {
  name: 'chemlock-topic',
  description: 'ChemLock technical topic pages (all default content).',
  urls: [
    'https://www.entegris.com/en/home/resources/technical-information/chemlock-filter-housing-technical-information/chemlock-filter-housing-bowl-installation.html',
    'https://www.entegris.com/en/home/resources/technical-information/chemlock-filter-housing-technical-information/chemlock-filter-housing-chemical-compatibility.html',
  ],
  blocks: [],
  sections: [],
};

// No section list (single flow of default content) — normalize data tables,
// then run cleanup + DM. Tables must be normalized before conversion so the
// compatibility matrices survive as tables rather than flattening to prose.
const transformers = [tablesTransformer, cleanupTransformer, dmImagesTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn.call(null, hookName, element, enhancedPayload); } catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;
    executeTransformers('beforeTransform', main, payload);
    // Data tables → Table blocks. The tables transformer (beforeTransform) has
    // already normalized each <table> into a clean rectangle with footnotes
    // lifted out; convert each surviving table to an EDS Table block.
    main.querySelectorAll('table').forEach((table) => {
      if (!table.parentNode) return;
      try { tableParser(table, { document, url, params }); } catch (e) { console.error('Failed to parse table:', e); }
    });
    executeTransformers('afterTransform', main, payload);
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
    const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);
    const tableCount = main.querySelectorAll('.table').length;
    return [{ element: main, path, report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: tableCount ? ['Table'] : [] } }];
  },
};
