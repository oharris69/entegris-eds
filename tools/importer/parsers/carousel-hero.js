/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-hero. Base: carousel.
 * Source: https://www.entegris.com/en/home.html
 * Container block. First row = block name (added by createBlock); each subsequent
 * row is one slide. Model `carousel-hero-item` fields → columns:
 *   col 1: media_image (reference)  — media_imageAlt collapses into the <img alt>
 *   col 2: content_text (richtext)  — heading, subheading, CTA
 */
export default function parse(element, { document }) {
  const fieldComment = (name) => document.createComment(` field:${name} `);

  // Each <li.orbit-slide> is a slide row.
  const slides = Array.from(element.querySelectorAll('li.orbit-slide'));
  const cells = [];

  slides.forEach((slide) => {
    // Image: the slide's picture/img (alt carries the slide label).
    const img = slide.querySelector('picture img, img');
    // Text content lives in .content-section (heading, subheading, CTA).
    const content = slide.querySelector('.content-section, [class*="content-section"]');

    const imageCell = [];
    if (img) imageCell.push(fieldComment('media_image'), img);

    const textCell = [fieldComment('content_text')];
    if (content) {
      Array.from(content.children).forEach((child) => {
        if (child.textContent.trim() || child.querySelector('img, a')) {
          textCell.push(child);
        }
      });
    }

    // A slide needs at least an image or text to be meaningful.
    if (imageCell.length || textCell.length > 1) {
      cells.push([imageCell, textCell]);
    }
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  element.replaceWith(block);
}
