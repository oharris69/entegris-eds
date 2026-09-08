/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import columnsMediaParser from './parsers/columns-media.js';
import cardsSolutionsParser from './parsers/cards-solutions.js';
import cardsResourcesParser from './parsers/cards-resources.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/entegris-cleanup.js';
import sectionsTransformer from './transformers/entegris-sections.js';
import dmImagesTransformer from './transformers/entegris-dm-images.js';

// PARSER REGISTRY
const parsers = {
  'carousel-hero': carouselHeroParser,
  'columns-media': columnsMediaParser,
  'cards-solutions': cardsSolutionsParser,
  'cards-resources': cardsResourcesParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'home',
  description: 'Entegris homepage: hero carousel, intro statements, working-together columns, solutions icons, hiring banner, and resource card grid.',
  urls: [
    'https://www.entegris.com/en/home.html',
  ],
  blocks: [
    {
      name: 'carousel-hero',
      instances: ['.slider-container #heroSection', '.hero-section .orbit', '.slider-container'],
    },
    {
      name: 'columns-media',
      instances: ['.slideout.basecomponent .slideout-variation1', '.slideout.basecomponent'],
    },
    {
      name: 'cards-solutions',
      instances: ['.section-2 .icon-list', '.section-2 .wrap-section'],
    },
    {
      name: 'cards-resources',
      instances: ['.mediacontainer.basecomponent .mediahomepage-wrap', '.mediahomepage-wrap'],
    },
  ],
  sections: [
    {
      id: 'rc3',
      name: 'Hero Carousel',
      selector: 'body > div.main-wrapper > div.page-content > div:nth-of-type(2)',
      style: null,
      blocks: ['carousel-hero'],
      defaultContent: [],
    },
    {
      id: 'rc4',
      name: 'Innovation Together',
      selector: '#maincontent > div.one-column-page > div.contentcomponent.basecomponent:nth-of-type(1)',
      style: null,
      blocks: [],
      defaultContent: ['#maincontent > div.one-column-page > div.contentcomponent.basecomponent:nth-of-type(1)'],
    },
    {
      id: 'rc5',
      name: 'Success Together',
      selector: '#maincontent > div.one-column-page > div.contentcomponent.basecomponent:nth-of-type(2)',
      style: null,
      blocks: [],
      defaultContent: ['#maincontent > div.one-column-page > div.contentcomponent.basecomponent:nth-of-type(2)'],
    },
    {
      id: 'rc6',
      name: 'Working Together',
      selector: '#maincontent > div.one-column-page > div.slideout.basecomponent',
      style: null,
      blocks: ['columns-media'],
      defaultContent: [],
    },
    {
      id: 'rc8',
      name: 'Our Solutions',
      selector: '#maincontent > div.one-column-page > div.contentcomponent.basecomponent:nth-of-type(5)',
      style: 'dark',
      blocks: ['cards-solutions'],
      defaultContent: ['#maincontent > div.one-column-page > div.contentcomponent.basecomponent:nth-of-type(5)'],
    },
    {
      id: 'rc9',
      name: 'Entegris is hiring',
      selector: '#maincontent > div.one-column-page > div.contentcomponent.basecomponent:nth-of-type(6)',
      style: 'red',
      blocks: [],
      defaultContent: ['#maincontent > div.one-column-page > div.contentcomponent.basecomponent:nth-of-type(6)'],
    },
    {
      id: 'rc10',
      name: 'Connect and Collaborate',
      selector: '#maincontent > div.one-column-page > div.mediacontainer.basecomponent',
      style: 'grey',
      blocks: ['cards-resources'],
      defaultContent: ['#maincontent > div.one-column-page > div.mediacontainer.basecomponent'],
    },
  ],
};

// TRANSFORMER REGISTRY - cleanup first, then sections (adds breaks/metadata),
// then dm-images (rewrites DM <img> to carrier anchors). Each self-gates by hookName.
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
  dmImagesTransformer,
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - The hook name ('beforeTransform' or 'afterTransform')
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - The payload containing { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration.
 * De-duplicates by element so the union selectors (multiple fallbacks per block)
 * don't parse the same element twice.
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  const seen = new Set();

  template.blocks.forEach((blockDef) => {
    let matched = false;
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);
        matched = true;
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
    if (!matched) {
      console.warn(`Block "${blockDef.name}" not found with any selector: ${blockDef.instances.join(', ')}`);
    }
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return; // Already replaced by an earlier parser
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

    // 4. afterTransform (final cleanup + section breaks/metadata + DM image anchors)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path. Map the root/homepage URL to /index to avoid
    //    an empty path crashing the bundled importer (.cwd is not a function).
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
