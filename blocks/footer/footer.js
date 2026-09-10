// Entegris footer — renders from content/footer.plain.html.
// Content-first: all links/copy live in the fragment; this file reads it.

/**
 * Loads and decorates the footer.
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // The footer fragment is published per language under the language tree
  // (/en/footer, /zh/footer). Pick by the current page's language prefix, then
  // fall back to the other known locations so it resolves in every environment.
  const lang = window.location.pathname.startsWith('/zh') ? 'zh' : 'en';
  const candidates = [
    `/${lang}/footer.plain.html`,
    '/en/footer.plain.html',
    '/content/footer.plain.html',
    '/footer.plain.html',
  ];
  // Try each candidate in order, resolving to the first OK response.
  const resp = await candidates.reduce(
    (prev, url) => prev.then((r) => (r && r.ok ? r : fetch(url))),
    Promise.resolve(null),
  );
  if (!resp || !resp.ok) return;

  // Make the relative logo path ("images/logo.svg") absolute so it resolves
  // from any page depth rather than 404ing.
  const html = (await resp.text()).replace(/src="images\//g, 'src="/images/');
  const footer = document.createElement('div');
  footer.innerHTML = html;

  const [brand, links, social, legal] = footer.children;
  if (brand) brand.classList.add('footer-brand');
  if (links) links.classList.add('footer-links');
  if (social) social.classList.add('footer-social');
  if (legal) legal.classList.add('footer-legal');

  // Inject the brand logo if the published fragment lost the <img> (same reason
  // as the header).
  if (brand) {
    const brandLink = brand.querySelector('a');
    if (brandLink && !brandLink.querySelector('img')) {
      const logo = document.createElement('img');
      logo.src = '/images/logo.svg';
      logo.alt = 'Entegris';
      logo.width = 130;
      brandLink.append(logo);
    }
  }

  block.textContent = '';
  block.append(footer);
}
