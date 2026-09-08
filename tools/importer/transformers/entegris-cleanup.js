/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Entegris site-wide cleanup.
 *
 * Removes non-authorable site chrome (multi-tier navigation, header, utility
 * nav, search overlays, footer, back-to-top, tracking iframe, HubSpot
 * interactive widgets) so the import contains only page-level authorable
 * content.
 *
 * All selectors verified in migration-work/cleaned.html:
 *   - <header>                                  (line 1214)
 *   - nav.utility-nav                           (line 1232)
 *   - .bottom-utility-nav                        (line 1285)
 *   - .search-overlay                            (line 1229)
 *   - .language-flyout (search-flyout)           (line 1245)
 *   - .mobile-search                             (multi-tier nav search)
 *   - .multi-tier-container                      (multi-tier nav)
 *   - #menu                                      (multi-tier nav slider container)
 *   - footer.page-footer-new / footer           (line 1989)
 *   - .back-to-top                               (after </footer>, line 2140)
 *   - iframe (Adobe ID syncing / demdex)         (line 2146)
 *   - [id^="hs-web-interactives"]                (HubSpot widgets, post-footer)
 *   - #hs-interactives-modal-overlay             (HubSpot overlay)
 *
 * NOTE: bare `section` and bare `nav` are intentionally NOT removed — the
 * authorable content lives under `<section id="maincontent">` and the hero
 * carousel uses `nav.orbit-bullets` (handled by the carousel-hero parser).
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Overlays / widgets that can interfere with block parsing.
    WebImporter.DOMUtils.remove(element, [
      '.search-overlay',
      '.language-flyout',
      '.mobile-search',
      '#hs-interactives-modal-overlay',
      '[id^="hs-web-interactives"]',
      '#ccc', // Civic Cookie Control consent banner/overlay
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome removed after block parsing has run.
    WebImporter.DOMUtils.remove(element, [
      'header',
      'nav.utility-nav',
      '.bottom-utility-nav',
      '.multi-tier-container',
      '#menu',
      'footer',
      '.back-to-top',
      'iframe',
    ]);
  }
}
