import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * cards-products: text-only category cards.
 * Authored rows are: [empty image cell] + [text cell: h3 > a (title), p (description)].
 * Renders a responsive grid of white cards, each with a teal chevron band on the
 * right edge. The whole card is clickable via a stretched link.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);

    // The text cell is the last cell that actually has content (title + copy).
    const cells = [...row.children];
    const textCell = cells.find((c) => c.querySelector('h1, h2, h3, h4, h5, h6, p'))
      || cells[cells.length - 1];

    const body = document.createElement('div');
    body.className = 'cards-products-card-body';
    while (textCell && textCell.firstElementChild) {
      body.append(textCell.firstElementChild);
    }
    li.append(body);

    // Whole-card clickable: promote the title link's href to a stretched link.
    const titleLink = body.querySelector('a[href]');
    if (titleLink) {
      li.classList.add('cards-products-linked');
      li.dataset.href = titleLink.getAttribute('href');
      titleLink.classList.add('cards-products-title-link');
    }

    // Teal chevron affordance band on the right edge.
    const chevron = document.createElement('span');
    chevron.className = 'cards-products-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    li.append(chevron);

    ul.append(li);
  });

  // Make the whole card clickable, keeping the real anchor for accessibility.
  ul.addEventListener('click', (e) => {
    const li = e.target.closest('li.cards-products-linked');
    if (!li || e.target.closest('a')) return;
    const link = li.querySelector('a[href]');
    if (link) link.click();
  });

  block.textContent = '';
  block.append(ul);
}
