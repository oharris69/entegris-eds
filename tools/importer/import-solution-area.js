/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroMastheadParser from './parsers/hero-masthead.js';
import columnsMediaParser from './parsers/columns-media.js';
import teaserPromoParser from './parsers/teaser-promo.js';
import cardsInsightsParser from './parsers/cards-insights.js';
import teaserCtaParser from './parsers/teaser-cta.js';
import cardsResourcesParser from './parsers/cards-resources.js';

// TRANSFORMER IMPORTS (site-wide)
import cleanupTransformer from './transformers/entegris-cleanup.js';
import sectionsTransformer from './transformers/entegris-sections.js';
import dmImagesTransformer from './transformers/entegris-dm-images.js';

const parsers = {
  'hero-masthead': heroMastheadParser,
  'columns-media': columnsMediaParser,
  'teaser-promo': teaserPromoParser,
  'cards-insights': cardsInsightsParser,
  'teaser-cta': teaserCtaParser,
  'cards-resources': cardsResourcesParser,
};

const PAGE_TEMPLATE = {
  name: 'solution-area',
  description: 'Solution-area landing page shared by all four by-solution-area pages.',
  urls: [
    'https://www.entegris.com/en/home/our-science/by-solution-area/contamination-control.html',
    'https://www.entegris.com/en/home/our-science/by-solution-area/fluid-management.html',
    'https://www.entegris.com/en/home/our-science/by-solution-area/specialty-materials.html',
    'https://www.entegris.com/en/home/our-science/by-solution-area/substrate-handling.html',
  ],
  blocks: [
    { name: 'hero-masthead', instances: ['#heroSection', '.hero-section'] },
    { name: 'columns-media', instances: ['.newcolumncontrol.basecomponent'] },
    { name: 'teaser-promo', instances: ['.spotlight.basecomponent'] },
    { name: 'cards-insights', instances: ['.eventproductfeature.basecomponent'] },
    { name: 'teaser-cta', instances: ['.contactus-espot.basecomponent'] },
    { name: 'cards-resources', instances: ['.mediacontainer.basecomponent .mediahomepage-wrap', '.mediahomepage-wrap'] },
  ],
  sections: [
    { id: 'sa-hero', name: 'Masthead', selector: 'body > div.main-wrapper > div.page-content > div:nth-of-type(2)', style: null, blocks: ['hero-masthead'], defaultContent: [] },
    { id: 'sa-title', name: 'Title', selector: '#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(1)', style: null, blocks: [], defaultContent: ['#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(1)'] },
    { id: 'sa-intro-cols', name: 'Intro columns', selector: '#maincontent > div.one-column-page > div.newcolumncontrol.basecomponent:nth-of-type(3)', style: null, blocks: ['columns-media'], defaultContent: [] },
    { id: 'sa-intro-prose', name: 'Intro prose', selector: '#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(4)', style: null, blocks: [], defaultContent: ['#maincontent > div.one-column-page > div.richtexteditor.basecomponent:nth-of-type(4)'] },
    { id: 'sa-promo', name: 'Featured promo', selector: '#maincontent > div.one-column-page > div.spotlight.basecomponent', style: null, blocks: ['teaser-promo'], defaultContent: [] },
    { id: 'sa-insights', name: 'Featured insights', selector: '#maincontent > div.one-column-page > div.eventproductfeature.basecomponent', style: null, blocks: ['cards-insights'], defaultContent: [] },
    { id: 'sa-contact', name: 'Contact / CTA bands', selector: '#maincontent > div.one-column-page > div.contactus-espot.basecomponent', style: null, blocks: ['teaser-cta'], defaultContent: [] },
    { id: 'sa-connect', name: 'Connect and Collaborate', selector: '#maincontent > div.one-column-page > div.mediacontainer.basecomponent', style: 'grey', blocks: ['cards-resources'], defaultContent: [] },
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
