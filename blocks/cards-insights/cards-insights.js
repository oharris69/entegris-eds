import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/*
 * Cards Insights — horizontal media-row list variant of cards.
 *
 * Source: Entegris solution-area ".event-product-feature" / "Featured Insights"
 * list. Each item is a row with a small (~200px) thumbnail on the left and a
 * linked title + short description on the right. Distinct from cards-resources
 * (image-on-top responsive grid): here the layout is a single-column vertical
 * list of horizontal media rows separated by hairline dividers.
 *
 * Authored structure: one block row per insight, two cells:
 *   cell 1 = image (either a <picture> or a Scene7 image URL wrapped in <a>)
 *   cell 2 = title (linked <h3><a>) + description rich text
 */

// Heuristic: a Scene7 / image-service link that should render as an <img>.
function looksLikeImageLink(href) {
  return /scene7\.com|\/is\/image\/|\.(?:jpe?g|png|gif|webp|avif)(?:[?#]|$)/i.test(href);
}

export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    const cells = [...li.children];
    cells.forEach((col, i) => {
      // First cell is always the thumbnail, second is the body. Fall back to
      // content sniffing if a row somehow has a single cell.
      const isImageCell = cells.length > 1 ? i === 0 : !col.querySelector('h1,h2,h3,h4,h5,h6,p');
      col.className = isImageCell ? 'cards-insights-card-image' : 'cards-insights-card-body';
    });

    ul.append(li);
  });

  // Normalise thumbnails. Scene7 links (no local <picture>) are converted to
  // real <img> so production renders the source imagery; locally they may 404,
  // in which case the CSS placeholder keeps the layout intact.
  ul.querySelectorAll('.cards-insights-card-image').forEach((cell) => {
    const link = cell.querySelector('a[href]');
    if (link && !cell.querySelector('picture, img') && looksLikeImageLink(link.getAttribute('href'))) {
      const img = document.createElement('img');
      img.src = link.getAttribute('href');
      img.alt = link.textContent.trim() === 'Image without alt text' ? '' : link.textContent.trim();
      img.loading = 'lazy';
      const container = link.closest('.button-container') || link.closest('p') || link;
      container.replaceWith(img);
    }
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.textContent = '';
  block.append(ul);
}
