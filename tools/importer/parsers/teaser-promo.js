/* eslint-disable */
/* global WebImporter */
/**
 * Parser for teaser-promo. Base: teaser (custom key-value block).
 * Source: https://www.entegris.com/en/home/products.html
 *
 * teaser-promo is a KEY-VALUE block ("key-value": true in _teaser-promo.json and
 * decorate() reads config via readBlockConfig). Each authored property is a 2-cell
 * row: [ <label>, <value> ], where the label text is normalized (toClassName) to the
 * model field name the block reads. So we emit one row per property and put the
 * field-hint comment in the VALUE cell (label cell = plain key text, no hint).
 *
 * Source: teal "FEATURED VIDEO" promo box (.espot-wrapper.desktop):
 *   <h3>featured video</h3>            → eyebrow (rendered as the promo label)
 *   .description .heading a            → linked video title  → title (text) + btn-link
 *   a.button.secondary "view now"      → CTA  → buttonText + btn-link
 * The linked video title and the "VIEW NOW" CTA point at the same video page, which
 * becomes the button link (btn-link). teaserStyle is set to "video".
 *
 * Model fields (readBlockConfig keys via toClassName):
 *   title        (text)      — video title
 *   teaserStyle  (select)    — "video"
 *   buttonText   (text)      — CTA label ("View Now")
 *   btn-link     (aem-content) — video page URL
 */
export default function parse(element, { document }) {
  const fieldComment = (name) => document.createComment(` field:${name} `);

  // Use the first (desktop) espot wrapper; tablet/mobile are duplicates.
  const promo = element.querySelector('.espot-wrapper.desktop') || element.querySelector('.espot-wrapper') || element;

  // Linked video title.
  const titleLink = promo.querySelector('.espot-content .description .heading a, .description a, .heading a');
  const titleText = titleLink ? titleLink.textContent.trim() : '';
  const titleHref = titleLink ? (titleLink.getAttribute('href') || '') : '';

  // CTA link ("view now").
  const ctaLink = promo.querySelector('a.button, .clearfix a, a.secondary');
  const ctaText = ctaLink ? ctaLink.textContent.trim() : '';
  const ctaHref = ctaLink ? (ctaLink.getAttribute('href') || '') : '';

  const linkHref = ctaHref || titleHref;

  // Bail if there's no meaningful promo content.
  if (!titleText && !ctaText) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const keyCell = (label) => {
    const p = document.createElement('p');
    p.textContent = label;
    return [p];
  };

  const cells = [];

  // Row: title (video title text)
  if (titleText) {
    const p = document.createElement('p');
    p.textContent = titleText;
    cells.push([keyCell('title'), [fieldComment('title'), p]]);
  }

  // Row: teaserStyle = video (this is a featured VIDEO promo)
  {
    const p = document.createElement('p');
    p.textContent = 'video';
    cells.push([keyCell('teaserStyle'), [fieldComment('teaserStyle'), p]]);
  }

  // Row: buttonText (CTA label)
  if (ctaText) {
    const p = document.createElement('p');
    p.textContent = ctaText;
    cells.push([keyCell('buttonText'), [fieldComment('buttonText'), p]]);
  }

  // Row: btn-link (video page URL, as an anchor so readBlockConfig picks up href)
  if (linkHref) {
    const a = document.createElement('a');
    a.setAttribute('href', linkHref);
    a.textContent = ctaText || titleText || linkHref;
    cells.push([keyCell('btn-link'), [fieldComment('btn-link'), a]]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'teaser-promo', cells });
  element.replaceWith(block);
}
