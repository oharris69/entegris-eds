/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS (both reused from the products template — no new parsers)
import teaserPromoParser from './parsers/teaser-promo.js';
import cardsProductsParser from './parsers/cards-products.js';

// TRANSFORMER IMPORTS (site-wide)
import cleanupTransformer from './transformers/entegris-cleanup.js';
import sectionsTransformer from './transformers/entegris-sections.js';
import dmImagesTransformer from './transformers/entegris-dm-images.js';

const parsers = {
  'teaser-promo': teaserPromoParser,
  'cards-products': cardsProductsParser,
};

const PAGE_TEMPLATE = {
  name: 'post-cmp-cleaning-solutions',
  description: 'Product detail page: title + intro prose, a featured-white-paper promo, and a 2-card solutions grid.',
  urls: ['https://www.entegris.com/en/home/products/chemistries/specialty-chemicals/post-cmp-cleaning-solutions/semiconductor-cleaning-solutions.html'],
  blocks: [
    { name: 'teaser-promo', instances: ['.espot.two-col', '.espot-wrapper.desktop'] },
    { name: 'cards-products', instances: ['.plp-container .card-list', '.card-list'] },
  ],
  sections: [
    { id: 'pcmp-main', name: 'Product detail content', selector: '#maincontent > div.one-column-page', style: null, blocks: ['teaser-promo', 'cards-products'], defaultContent: ['#maincontent > div.one-column-page'] },
  ],
};

// Single section → sections transformer not needed (no breaks), but kept behind the >1 guard for consistency.
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

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  const seen = new Set();
  template.blocks.forEach((blockDef) => {
    let matched = false;
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);
        matched = true;
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
    if (!matched) console.warn(`Block "${blockDef.name}" not found: ${blockDef.instances.join(', ')}`);
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    executeTransformers('afterTransform', main, payload);

    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
