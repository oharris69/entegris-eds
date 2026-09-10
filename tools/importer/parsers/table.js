/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the core EDS `Table` block. Base: table.
 * Source: ChemLock chemical-compatibility / bowl-installation data tables.
 *
 * Per the EDS Table convention: the first row contains only the block name
 * ("Table", added by createBlock); each subsequent row is one data row with two
 * or more cells, and every row has the same number of cells. Source <td>/<th>
 * cells map 1:1 to block cells. The runtime table.js renders the first data row
 * as <th> (header) and the rest as <td>, matching the source matrices whose
 * first row holds the column labels. Any column count is supported.
 *
 * The entegris-tables transformer runs first (beforeTransform) to lift trailing
 * full-width footnote rows out as <p> beneath the table and normalize the grid,
 * so by the time this parser runs each table is a clean rectangle.
 */
export default function parse(element, { document }) {
  const rows = Array.from(element.querySelectorAll(':scope > tbody > tr, :scope > thead > tr, :scope > tr'));
  if (!rows.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = rows.map((tr) => Array.from(tr.querySelectorAll(':scope > td, :scope > th')).map((cell) => {
    // Preserve rich content (sub/sup, strong, em, links) within each cell.
    const div = document.createElement('div');
    div.innerHTML = cell.innerHTML.trim();
    return div;
  }));

  const block = WebImporter.Blocks.createBlock(document, { name: 'Table', cells });
  element.replaceWith(block);
}
