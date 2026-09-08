import {
  div, a, span, h3,
} from '../../scripts/dom-helpers.js';
import { readBlockConfig } from '../../scripts/aem.js';

/**
 * Derive the small uppercase eyebrow label shown at the top of the promo.
 * The source Entegris ".espot.two-col" promo shows "FEATURED VIDEO" when the
 * CTA points at a video and "FEATURED WHITE PAPER" when it points at a white
 * paper. We derive it from the CTA link path (most reliable) and fall back to
 * the authored teaserStyle, so a single generic style covers both variants.
 */
function deriveEyebrow(properties) {
  const link = (properties['btn-link'] || '').toLowerCase();
  const style = (properties.teaserstyle || '').toLowerCase();

  if (link.includes('white-paper') || link.includes('whitepaper')) return 'Featured White Paper';
  if (link.includes('webinar')) return 'Featured Webinar';
  if (link.includes('video')) return 'Featured Video';
  if (link.includes('case-stud')) return 'Featured Case Study';
  if (style === 'video') return 'Featured Video';
  return 'Featured';
}

export default function decorate(block) {
  const properties = readBlockConfig(block);

  const title = properties.title || '';
  const buttonText = properties.buttontext || 'View Now';
  const buttonLink = properties['btn-link'] || '#';
  const eyebrow = deriveEyebrow(properties);

  const card = div(
    { class: 'teaser-promo-card' },
    div(
      { class: 'teaser-promo-eyebrow' },
      h3(eyebrow),
    ),
    div(
      { class: 'teaser-promo-content' },
      div(
        { class: 'teaser-promo-description' },
        span(
          { class: 'teaser-promo-heading' },
          a({ href: buttonLink }, title),
        ),
      ),
      a(
        { href: buttonLink, class: 'button secondary teaser-promo-cta' },
        buttonText,
      ),
    ),
  );

  block.innerHTML = '';
  block.appendChild(card);
}
