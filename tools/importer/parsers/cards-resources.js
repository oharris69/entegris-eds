/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-resources. Base: cards.
 * Source: https://www.entegris.com/en/home.html
 * Container block: first row = block name (added by createBlock); each subsequent
 * row is one card. Model `card` fields → columns:
 *   col 1: image (reference)  — imageAlt collapses into the <img alt>
 *   col 2: text (richtext)    — category tag, title link, date
 * Source cards are <article.media-tile> tiles: category in .tip, linked title in
 * .description, publish date in .date. Card images are CSS backgrounds
 * (empty .image-container spans), so most cards have no <img>; the image cell is
 * still emitted (possibly empty) per the cards convention.
 */
export default function parse(element, { document }) {
  const fieldComment = (name) => document.createComment(` field:${name} `);

  const tiles = Array.from(element.querySelectorAll('article.media-tile'));
  const cells = [];

  tiles.forEach((tile) => {
    // Image cell — usually empty (CSS background); include any real <img>.
    const img = tile.querySelector('.img img, .image-container img');
    const imageCell = [];
    if (img) imageCell.push(fieldComment('image'), img.cloneNode(true));

    // Text cell — category tag, title link, date.
    const textCell = [fieldComment('text')];

    const tag = tile.querySelector('.tip');
    const tagText = tag ? tag.textContent.trim() : '';
    if (tagText) {
      const p = document.createElement('p');
      p.textContent = tagText;
      textCell.push(p);
    }

    const titleLink = tile.querySelector('.description a, .title a');
    if (titleLink && titleLink.textContent.trim()) {
      const h = document.createElement('h3');
      const a = document.createElement('a');
      a.setAttribute('href', titleLink.getAttribute('href') || '');
      a.textContent = titleLink.textContent.trim();
      h.appendChild(a);
      textCell.push(h);
    }

    const date = tile.querySelector('.date');
    if (date && date.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = date.textContent.trim();
      textCell.push(p);
    }

    if (imageCell.length || textCell.length > 1) {
      cells.push([imageCell, textCell]);
    }
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-resources', cells });
  element.replaceWith(block);
}
