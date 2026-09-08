// Entegris footer — renders from content/footer.plain.html.
// Content-first: all links/copy live in the fragment; this file reads it.

/**
 * Loads and decorates the footer.
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // Dual-fetch: /content first (localhost / aem up), then root (DA/EDS prod).
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return;

  const html = await resp.text();
  const footer = document.createElement('div');
  footer.innerHTML = html;

  const [brand, links, social, legal] = footer.children;
  if (brand) brand.classList.add('footer-brand');
  if (links) links.classList.add('footer-links');
  if (social) social.classList.add('footer-social');
  if (legal) legal.classList.add('footer-legal');

  block.textContent = '';
  block.append(footer);
}
