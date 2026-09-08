/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Entegris section breaks + Section Metadata.
 *
 * Driven by payload.template.sections (7 sections for the "home" template).
 * Section selectors are DOM-verified boundaries produced by page analysis and
 * are used directly.
 *
 * Sections with a `style` (→ Section Metadata block): rc8 (dark), rc9 (red),
 * rc10 (grey). rc3/rc4/rc5/rc6 have null style (breaks only, no metadata).
 * rc3 is the first section (index 0) → no leading break.
 *
 * Breaks are inserted in beforeTransform (while every section element still
 * exists, before block parsers replace them). Metadata blocks are inserted in
 * afterTransform, anchored to the marker <hr> that survives parsing. Both
 * hooks iterate sections in reverse so live-element inserts don't shift
 * unprocessed sections.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

export default function transform(hookName, element, payload) {
  const sections = payload.template.sections || [];

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue; // first section: no leading break
      const sectionEl = element.querySelector(section.selector);
      if (!sectionEl) continue; // selector didn't match — skip, never guess

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || element.querySelector(section.selector);
      if (!anchor) continue; // neither survived — skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break
      }
    }
  }
}
