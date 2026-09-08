/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-media. Base: columns.
 * Source: https://www.entegris.com/en/home.html
 * Columns block: first row = block name (added by createBlock); second row has
 * one cell per column. Per hinting rules, Columns blocks use NO field comments —
 * cells hold default content only. Layout here: 2 columns (media + text).
 *
 * The page-templates instances[] include both the outer wrapper
 * (.slideout.basecomponent) and the inner (.slideout-variation1). To yield the
 * same full content for either selector, content is extracted by semantic tag
 * (heading/paragraph/CTA/image) rather than relying on wrapper classes, and
 * nodes are cloned so overlapping instances don't cannibalise each other.
 */
export default function parse(element, { document }) {
  // Media column: primary notch image (fall back to any content image).
  const mediaImg = element.querySelector(
    'img.notch-img, img.notch-img-mobile, .non-content img, picture img, img'
  );

  // Text column: headings + non-empty paragraphs in document order, then CTA.
  const seen = new Set();
  const textCell = [];
  element.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach((node) => {
    const text = node.textContent.trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    textCell.push(node.cloneNode(true));
  });

  const cta = element.querySelector('a.cta-button, a.popup-button, a.button');
  if (cta && cta.textContent.trim() && !seen.has(cta.textContent.trim())) {
    textCell.push(cta.cloneNode(true));
  }

  const mediaCell = [];
  if (mediaImg) mediaCell.push(mediaImg.cloneNode(true));

  if (!mediaCell.length && !textCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[mediaCell, textCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-media', cells });
  element.replaceWith(block);
}
