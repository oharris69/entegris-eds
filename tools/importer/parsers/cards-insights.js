/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-insights. Base: cards (container block).
 * Source: https://www.entegris.com/en/... (solution-area template)
 *
 * Container block: first row = block name (added by createBlock); each subsequent
 * row is one card mapped to the `insight` child model:
 *   col 1: image (reference)  — imageAlt collapses into the <img alt>
 *   col 2: text  (richtext)   — linked title (heading/link) + short description
 *
 * Source is a "Featured Insights" list (.event-product-feature): an <h2.eyebrow>
 * heading followed by ~6 <div.item> rows. Each row has a thumbnail
 * (.custom-3.columns.product picture>img) and a text column (.medium-9.columns)
 * with a linked title (a.title) and a description (.rich-text-editor p).
 * We iterate the a.title anchors so nested/sibling .item markup is handled uniformly.
 *
 * NOTE: the section heading "Featured Insights" (h2.eyebrow) has no field in the
 * cards container model, so it is not emitted here (handled as section content).
 */
export default function parse(element, { document }) {
  const fieldComment = (name) => document.createComment(` field:${name} `);

  // One card per linked title; walk up to its row/column container.
  const titles = Array.from(element.querySelectorAll('a.title'));
  const cells = [];

  titles.forEach((titleLink) => {
    const row = titleLink.closest('.row') || titleLink.closest('.item') || titleLink.parentElement;
    if (!row) return;

    // Image cell — thumbnail from the product/image column.
    const img = row.querySelector('.product img, picture img, img');
    const imageCell = [];
    if (img) imageCell.push(fieldComment('image'), img.cloneNode(true));

    // Text cell — linked title as a heading, followed by the description.
    const textCell = [fieldComment('text')];

    const titleText = titleLink.textContent.trim();
    if (titleText) {
      const h = document.createElement('h3');
      const a = document.createElement('a');
      a.setAttribute('href', titleLink.getAttribute('href') || '');
      a.textContent = titleText;
      h.appendChild(a);
      textCell.push(h);
    }

    const rte = row.querySelector('.rich-text-editor');
    if (rte) {
      const paras = Array.from(rte.querySelectorAll('p'));
      if (paras.length) {
        paras.forEach((p) => {
          if (p.textContent.trim()) textCell.push(p.cloneNode(true));
        });
      } else if (rte.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = rte.textContent.trim();
        textCell.push(p);
      }
    }

    // Only emit a card if it has real content; keep 2-column shape (pad image cell).
    if (textCell.length > 1 || imageCell.length) {
      cells.push([imageCell, textCell]);
    }
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-insights', cells });
  element.replaceWith(block);
}
