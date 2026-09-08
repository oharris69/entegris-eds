/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-solutions. Base: cards.
 * Source: https://www.entegris.com/en/home.html
 * Container block: first row = block name (added by createBlock); each subsequent
 * row is one card. Model `card` fields → columns:
 *   col 1: image (reference)  — imageAlt collapses into the <img alt>
 *   col 2: text (richtext)    — title/description/CTA
 * Source is an icon list: each <li> has an icon <img> and a linked label; the
 * whole card links to a solution-area page.
 */
export default function parse(element, { document }) {
  const fieldComment = (name) => document.createComment(` field:${name} `);

  const items = Array.from(element.querySelectorAll('ul.icon-list > li, .icon-list > li'));
  const cells = [];

  items.forEach((li) => {
    const link = li.querySelector('a');
    const img = li.querySelector('img');
    const label = li.querySelector('.icon-text');

    // Image cell.
    const imageCell = [];
    if (img) imageCell.push(fieldComment('image'), img.cloneNode(true));

    // Text cell: label wrapped in the card's link so the CTA target is preserved.
    const textCell = [fieldComment('text')];
    const labelText = (label ? label.textContent : li.textContent).trim();
    if (labelText) {
      const href = link ? link.getAttribute('href') : null;
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = labelText;
        textCell.push(a);
      } else {
        const p = document.createElement('p');
        p.textContent = labelText;
        textCell.push(p);
      }
    }

    if (imageCell.length > 1 || textCell.length > 1) {
      cells.push([imageCell, textCell]);
    }
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-solutions', cells });
  element.replaceWith(block);
}
