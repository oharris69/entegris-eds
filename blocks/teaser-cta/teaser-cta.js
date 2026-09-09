import {
  div, a, h3, span,
} from '../../scripts/dom-helpers.js';
import { readBlockConfig } from '../../scripts/aem.js';

/*
 * Teaser CTA — slim full-width clickable action band.
 *
 * Source: Entegris solution-area ".contactus-espot.basecomponent" bands
 * ("Interested in our ... solutions? Contact Us", "Need more details or local
 * office information? Find Us", "Zero Defects Newsletter Sign Up"). A heading on
 * the left and a single plain-text CTA on the right; the whole band is clickable.
 * Two variants: default light band (charcoal text, thin bottom rule) and a red
 * band (white heading, plexus pattern, white elliptical CTA cutout).
 *
 * Distinct from teaser-promo (a media/video promo tile with thumbnail + eyebrow).
 */
export default function decorate(block) {
  const properties = readBlockConfig(block);

  const title = properties.title || '';
  const buttonText = properties.buttontext || 'Learn More';
  const buttonLink = properties['btn-link'] || properties.link || '#';
  // Color variant: authored via `classes`/`color` row or the block variant class.
  const color = (properties.classes || properties.color || '').toString().toLowerCase();
  const link = buttonLink.toLowerCase();
  const isRed = color.includes('red') || color.includes('accent')
    // Fidelity fallback for un-authored content: the newsletter sign-up band is red.
    || /newsletter|subscri|sign\s*up|info\.entegris/.test(link)
    || /newsletter|sign\s*up/.test(buttonText.toLowerCase());
  if (isRed) block.classList.add('red');
  else block.classList.add('grey');

  const band = a(
    { href: buttonLink, class: 'teaser-cta-band' },
    div({ class: 'teaser-cta-heading' }, h3(title)),
    div(
      { class: 'teaser-cta-action' },
      span({ class: 'teaser-cta-label' }, buttonText),
    ),
  );

  block.innerHTML = '';
  block.appendChild(band);
}
