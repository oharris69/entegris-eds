// Entegris header — renders brand / nav sections (with dropdown depth) / tools
// from a content fragment. Content-first: all labels/links live in
// content/nav.plain.html; this file only reads that DOM and wires behaviour.

const isDesktop = window.matchMedia('(min-width: 900px)');

function closeAllSections(sections) {
  if (!sections) return;
  sections.querySelectorAll('.nav-drop[aria-expanded="true"]').forEach((li) => {
    li.setAttribute('aria-expanded', 'false');
  });
}

function toggleSection(li, sections, expand) {
  const willExpand = expand ?? (li.getAttribute('aria-expanded') !== 'true');
  closeAllSections(sections);
  li.setAttribute('aria-expanded', willExpand ? 'true' : 'false');
}

function toggleMenu(nav, expanded) {
  const button = nav.querySelector('.nav-hamburger button');
  const open = expanded ?? (nav.getAttribute('aria-expanded') !== 'true');
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.style.overflowY = open && !isDesktop.matches ? 'hidden' : '';
  if (button) button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
}

/**
 * Loads and decorates the header/nav.
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // The nav fragment is published per language under the language tree
  // (/en/nav, /zh/nav). Pick by the current page's language prefix, then fall
  // back to the other known locations so it resolves in every environment
  // (published EDS, local aem-up, DA).
  const lang = window.location.pathname.startsWith('/zh') ? 'zh' : 'en';
  const candidates = [
    `/${lang}/nav.plain.html`,
    '/en/nav.plain.html',
    '/content/nav.plain.html',
    '/nav.plain.html',
  ];
  // Try each candidate in order, resolving to the first OK response.
  const resp = await candidates.reduce(
    (prev, url) => prev.then((r) => (r && r.ok ? r : fetch(url))),
    Promise.resolve(null),
  );
  if (!resp || !resp.ok) return;

  // The nav fragment references the logo with a relative path
  // ("images/logo.svg"); make it absolute so it resolves from any page depth
  // (e.g. /en/home/about-us/locations) rather than 404ing.
  const html = (await resp.text()).replace(/src="images\//g, 'src="/images/');
  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const [brand, sections, tools] = nav.children;
  if (brand) brand.classList.add('nav-brand');
  if (sections) sections.classList.add('nav-sections');
  if (tools) tools.classList.add('nav-tools');

  // Ensure the brand logo is present. The published nav fragment can lose the
  // logo <img> (the source ref isn't a resolvable image at publish time), so
  // inject it into the brand link if it's missing.
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

  // Wire up dropdowns on the top-level nav items.
  if (sections) {
    sections.querySelectorAll(':scope > ul > li').forEach((li) => {
      if (li.querySelector('ul')) {
        li.classList.add('nav-drop');
        li.setAttribute('aria-expanded', 'false');
        const label = li.querySelector(':scope > a');
        // Desktop: hover opens; the label link still navigates on click.
        li.addEventListener('mouseenter', () => {
          if (isDesktop.matches) toggleSection(li, sections, true);
        });
        li.addEventListener('mouseleave', () => {
          if (isDesktop.matches) toggleSection(li, sections, false);
        });
        // Mobile: first tap on the label expands rather than navigates.
        if (label) {
          label.addEventListener('click', (e) => {
            if (!isDesktop.matches && li.getAttribute('aria-expanded') !== 'true') {
              e.preventDefault();
              toggleSection(li, sections);
            }
          });
        }
      }
    });
  }

  // Hamburger for mobile.
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav));
  nav.prepend(hamburger);

  // Close on Escape; adapt on breakpoint change.
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      closeAllSections(sections);
      if (!isDesktop.matches) toggleMenu(nav, false);
    }
  });
  isDesktop.addEventListener('change', () => {
    toggleMenu(nav, isDesktop.matches);
    closeAllSections(sections);
  });
  toggleMenu(nav, isDesktop.matches);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
