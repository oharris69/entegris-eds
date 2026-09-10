/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: normalize data tables for clean Markdown conversion.
 *
 * Source compatibility matrices (ChemLock chemical-compatibility) are regular
 * grids EXCEPT for a trailing footnote row that uses a full-width `colspan`
 * cell (e.g. "Contact Entegris for..." / "A = Good; B = Fair..."). A row whose
 * column count differs from the rest makes the GFM table converter bail and
 * flatten the entire table to prose — dropping the matrix structure.
 *
 * For each table we:
 *   1. compute the max column count (summing colspans per row),
 *   2. lift any row that is a single cell spanning the full width out of the
 *      table and re-insert it as a <p> immediately after the table (footnotes),
 *   3. promote the first remaining row to a <thead>/<th> header so the
 *      converter reliably emits a Markdown table.
 *
 * The result is a rectangular table (renders as <table> in .plain.html) with
 * the footnotes preserved as paragraphs beneath it.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Column separator: a run of 2+ whitespace (incl. non-breaking spaces). The
// source aligns pseudo-table columns with runs of &nbsp;, while real column
// labels/values use single spaces internally ("Part number", "Chemlock wrench
// with integrated torque"), so a 2+ run reliably marks a column boundary.
const COL_SEP = /[\s ]{2,}/;

function splitCols(text) {
  return text.trim().split(COL_SEP).map((s) => s.trim()).filter((s, i, a) => i < a.length - 1 || s !== '');
}

/**
 * Reconstruct space-aligned pseudo-tables (a bold column-header <p> followed by
 * <br>-separated data <p>s) into real <table> elements so they render as Table
 * blocks instead of run-on prose. Tightly guarded: the header must be fully
 * bold and split into 2+ columns, and every data row must split into the SAME
 * column count — otherwise the paragraph is left untouched.
 */
function reconstructPseudoTables(root, document) {
  const paras = [...root.querySelectorAll('p')];
  paras.forEach((p) => {
    if (!p.parentNode) return;
    // Header must be a single bold run spanning the whole paragraph. The source
    // uses <b> or <strong> (the importer normalizes <b>→<strong> only later).
    const strong = p.querySelector(':scope > b, :scope > strong');
    if (!strong || strong.textContent.trim() !== p.textContent.trim()) return;
    const headerCols = splitCols(strong.textContent);
    if (headerCols.length < 2) return;

    // Collect following sibling <p> rows until one doesn't match the shape.
    const dataRows = [];
    let sib = p.nextElementSibling;
    while (sib && sib.tagName === 'P') {
      const lines = sib.innerHTML.split(/<br\s*\/?>/i)
        .map((html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; })
        .filter((t) => t.trim());
      const rows = lines.map(splitCols);
      if (!rows.length || !rows.every((r) => r.length === headerCols.length)) break;
      dataRows.push(...rows);
      const next = sib.nextElementSibling;
      sib.remove();
      sib = next;
    }
    if (!dataRows.length) return;

    const table = document.createElement('table');
    const mkRow = (vals, tag) => {
      const tr = document.createElement('tr');
      vals.forEach((v) => { const c = document.createElement(tag); c.textContent = v; tr.appendChild(c); });
      table.appendChild(tr);
    };
    mkRow(headerCols, 'th');
    dataRows.forEach((r) => mkRow(r, 'td'));
    p.replaceWith(table);
  });
}

function colCount(row) {
  return [...row.querySelectorAll(':scope > td, :scope > th')]
    .reduce((n, c) => n + (parseInt(c.getAttribute('colspan'), 10) || 1), 0);
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;
  const { document } = payload;
  // First rebuild space-aligned pseudo-tables into real <table> elements.
  reconstructPseudoTables(element, document);
  element.querySelectorAll('table').forEach((table) => {
    const rows = [...table.querySelectorAll('tr')];
    if (!rows.length) return;
    const maxCols = Math.max(...rows.map(colCount));

    // 1–2. Lift full-width single-cell rows (footnotes) out below the table.
    const footnotes = [];
    rows.forEach((row) => {
      const cells = [...row.querySelectorAll(':scope > td, :scope > th')];
      const spans = colCount(row);
      if (cells.length === 1 && spans >= maxCols && maxCols > 1) {
        footnotes.push(cells[0].textContent.trim());
        row.remove();
      }
    });

    // 3. Promote first remaining row to a header.
    const remaining = [...table.querySelectorAll('tr')];
    if (remaining.length && !table.querySelector('th')) {
      const first = remaining[0];
      first.querySelectorAll('td').forEach((td) => {
        const th = document.createElement('th');
        th.innerHTML = td.innerHTML;
        [...td.attributes].forEach((a) => th.setAttribute(a.name, a.value));
        td.replaceWith(th);
      });
    }

    footnotes.filter(Boolean).forEach((text) => {
      const p = document.createElement('p');
      const em = document.createElement('em');
      em.textContent = text;
      p.appendChild(em);
      if (table.parentNode) table.parentNode.insertBefore(p, table.nextSibling);
    });
  });
}
