/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-masthead. Base: hero.
 * Source: https://www.entegris.com/en/home/products.html
 * Simple (1-column) block. First row = block name (added by createBlock).
 * Model `hero-masthead` fields → rows:
 *   row 2: image (reference)  — imageAlt collapses into the <img alt>
 *   row 3: text  (richtext)   — title / subheading / CTA (optional)
 * This products masthead is a static full-bleed background image with NO overlay
 * text or CTA, so only the image row is emitted.
 *
 * Image source resolution: the direct <img> child of .hero-pictures-container is a
 * lazy-load spinner placeholder (box-1x1-v2b-red-spinner.gif), and the orbit
 * <picture><img> has an empty src. The REAL hero asset is a Scene7 / Dynamic Media
 * URL carried on the responsive <source> (deskview srcset). We build a fresh <img>
 * pointing at that URL so it lands in the image field; the DM transformer rewrites
 * the DM <img> to its carrier anchor downstream.
 */
const SPINNER_RE = /spinner|1x1|blank|placeholder/i;

export default function parse(element, { document }) {
  const fieldComment = (name) => document.createComment(` field:${name} `);

  const firstSrcset = (el) => {
    if (!el) return '';
    const ss = (el.getAttribute('srcset') || '').trim();
    return ss ? ss.split(',')[0].trim().split(/\s+/)[0] : '';
  };

  // 1) Prefer the responsive <picture><source> asset (Scene7/DM lives here).
  let src = firstSrcset(element.querySelector('picture source.deskview[srcset]'))
    || firstSrcset(Array.from(element.querySelectorAll('picture source[srcset]'))
      .find((s) => (s.getAttribute('srcset') || '').trim() !== ''));

  // 2) Otherwise fall back to any real (non-spinner, non-empty) <img> src.
  if (!src) {
    const realImg = Array.from(element.querySelectorAll('img'))
      .find((img) => {
        const s = (img.getAttribute('src') || '').trim();
        return s !== '' && !SPINNER_RE.test(s);
      });
    if (realImg) src = realImg.getAttribute('src');
  }

  let bgImage = null;
  if (src) {
    bgImage = document.createElement('img');
    bgImage.setAttribute('src', src);
    bgImage.setAttribute('alt', 'Product Catalog');
  }

  const cells = [];

  // Row 2: image cell (only emitted if a real background image exists).
  if (bgImage) {
    cells.push([[fieldComment('image'), bgImage]]);
  }

  // No overlay title/subheading/CTA on this masthead → no text row.

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-masthead', cells });
  element.replaceWith(block);
}
