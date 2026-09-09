/* eslint-disable */
/* global WebImporter */
/**
 * Parser for teaser-cta. Base: teaser (custom key-value block).
 * Source: https://www.entegris.com/en/... (solution-area template)
 *
 * teaser-cta is a KEY-VALUE block ("key-value": true in _teaser-cta.json; decorate()
 * reads config via readBlockConfig). Each authored property is a 2-cell row
 * [ <label>, <value> ], where the label text normalizes (toClassName) to the model
 * field name. The field-hint comment goes in the VALUE cell.
 *
 * Source is a slim full-width clickable colored action band (.contactus-espot):
 * a single <a.full-clickable-div href=...> wraps the whole band, containing an
 * <h3> heading and a .content div with the CTA label ("Contact Us"). The band is
 * rendered three times (mobile / tablet / desktop duplicates) — we use the FIRST
 * occurrence only.
 *
 * Model fields (readBlockConfig keys via toClassName):
 *   title       (text)        — band heading (h3)
 *   buttonText  (text)        — CTA label (.content text)
 *   btn-link    (aem-content) — href the whole band links to
 * The `classes` (color) field is intentionally omitted per field-hinting Rule 5.
 */
export default function parse(element, { document }) {
  const fieldComment = (name) => document.createComment(` field:${name} `);

  // Use the first clickable band; tablet/mobile/desktop copies are duplicates.
  const link = element.querySelector('a.full-clickable-div') || element.querySelector('a[href]');
  const scope = link || element;

  const heading = scope.querySelector('h3, h2, [class*="heading"]');
  const headingText = heading ? heading.textContent.trim() : '';

  const content = scope.querySelector('.content');
  const ctaText = content ? content.textContent.trim() : '';

  const href = link ? (link.getAttribute('href') || '') : '';

  // Bail if there's no meaningful content.
  if (!headingText && !ctaText && !href) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const keyCell = (label) => {
    const p = document.createElement('p');
    p.textContent = label;
    return [p];
  };

  const cells = [];

  // Row: title (band heading)
  if (headingText) {
    const p = document.createElement('p');
    p.textContent = headingText;
    cells.push([keyCell('title'), [fieldComment('title'), p]]);
  }

  // Row: buttonText (CTA label)
  if (ctaText) {
    const p = document.createElement('p');
    p.textContent = ctaText;
    cells.push([keyCell('buttonText'), [fieldComment('buttonText'), p]]);
  }

  // Row: btn-link (band destination, as an anchor so readBlockConfig picks up href)
  if (href) {
    const a = document.createElement('a');
    a.setAttribute('href', href);
    a.textContent = ctaText || headingText || href;
    cells.push([keyCell('btn-link'), [fieldComment('btn-link'), a]]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'teaser-cta', cells });
  element.replaceWith(block);
}
