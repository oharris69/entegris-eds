/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-products. Base: cards.
 * Source: https://www.entegris.com/en/home/products.html
 * Container block. First row = block name (added by createBlock); each subsequent
 * row is one card. Model `card` fields → columns:
 *   col 1: image (reference)  — imageAlt collapses into the <img alt>
 *   col 2: text  (richtext)   — title (heading link) + description
 *
 * Source cards are <div.column.card> tiles inside .card-list. Each card is a single
 * <a href> wrapping:
 *   .card-header  → bold category title (becomes a linked heading)
 *   <p>           → description
 *   .card-border  → chevron decoration (dropped)
 * These cards are TEXT-ONLY (no <img>), so the image cell is emitted empty per the
 * cards convention ("an image or text cell may be empty, but must still be included").
 * The card's <a> href is preserved by making the title a linked heading.
 */
export default function parse(element, { document }) {
  const fieldComment = (name) => document.createComment(` field:${name} `);

  const cards = Array.from(element.querySelectorAll(':scope > .column.card, .column.card'));
  const cells = [];

  cards.forEach((card) => {
    const link = card.querySelector('.card-data a, a');
    const href = link ? (link.getAttribute('href') || '') : '';

    const headerEl = card.querySelector('.card-header');
    const title = headerEl ? headerEl.textContent.trim() : '';

    const descEl = card.querySelector('.card-data p, p');
    const desc = descEl ? descEl.textContent.trim() : '';

    if (!title && !desc) return;

    // Image cell — text-only cards have no image; emit an empty cell.
    const imageCell = [];

    // Text cell — linked title heading + description.
    const textCell = [fieldComment('text')];
    if (title) {
      const h3 = document.createElement('h3');
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = title;
        h3.appendChild(a);
      } else {
        h3.textContent = title;
      }
      textCell.push(h3);
    }
    if (desc) {
      const p = document.createElement('p');
      p.textContent = desc;
      textCell.push(p);
    }

    cells.push([imageCell, textCell]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-products', cells });
  element.replaceWith(block);
}
