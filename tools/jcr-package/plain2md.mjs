/* eslint-disable */
/**
 * plain2md.mjs — convert an EDS .plain.html fragment into EDS block-table
 * (GridTable) markdown that @adobe/helix-md2jcr turns into block-faithful JCR.
 *
 * Builds an mdast tree (default content + gridTable nodes for blocks) and
 * serializes it with mdast-util-to-markdown + gridTablesToMarkdown, so the
 * emitted GridTable syntax is guaranteed valid (the block header row is what
 * md2jcr matches against the registered component Title).
 *
 * Each <div class="<block>"> in .plain.html becomes a gridTable:
 *   - header cell text = registered Title (e.g. "Cards Solutions")
 *   - each row div -> gtRow; each cell div -> gtCell (mdast flow content)
 * Non-block top-level content stays as default markdown (headings/paras/etc).
 * <div class="section-metadata"> becomes a "Section Metadata" gridTable.
 * Top-level sections are separated by thematic breaks (---).
 */

// ---- mdast builders ----
const txt = (v) => ({ type: 'text', value: v });
const para = (children) => ({ type: 'paragraph', children: children.length ? children : [txt('')] });
const gtCell = (children) => ({ type: 'gtCell', children });
const gtRow = (cells) => ({ type: 'gtRow', children: cells });

// Convert a DOM node's inline/flow content into mdast phrasing/flow children.
function domToMdast(node) {
  const out = [];
  for (const c of node.childNodes) {
    if (c.nodeType === 3) {
      const t = c.textContent.replace(/\s+/g, ' ');
      if (t.trim()) out.push(txt(t));
    } else if (c.nodeType === 1) {
      const tag = c.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        out.push({ type: 'heading', depth: +tag[1], children: [txt(c.textContent.trim())] });
      } else if (tag === 'p') {
        out.push(para(domToMdast(c)));
      } else if (tag === 'a') {
        const url = c.getAttribute('href') || '';
        const title = c.getAttribute('title');
        const node2 = { type: 'link', url, children: [txt(c.textContent.trim() || '')] };
        if (title) node2.title = title;
        out.push(node2);
      } else if (tag === 'img') {
        out.push({ type: 'image', url: c.getAttribute('src') || '', alt: c.getAttribute('alt') || '' });
      } else if (tag === 'picture') {
        const img = c.querySelector('img');
        if (img) out.push({ type: 'image', url: img.getAttribute('src') || '', alt: img.getAttribute('alt') || '' });
      } else if (tag === 'strong' || tag === 'b') {
        out.push({ type: 'strong', children: [txt(c.textContent.trim())] });
      } else if (tag === 'em' || tag === 'i') {
        out.push({ type: 'emphasis', children: [txt(c.textContent.trim())] });
      } else if (tag === 'ul' || tag === 'ol') {
        out.push({
          type: 'list', ordered: tag === 'ol',
          children: [...c.querySelectorAll(':scope > li')].map((li) => ({
            type: 'listItem', children: [para(domToMdast(li))],
          })),
        });
      } else {
        out.push(...domToMdast(c));
      }
    }
  }
  return out;
}

// Wrap raw phrasing nodes into a paragraph so cells/flow are well-formed.
function asFlow(children) {
  const flow = [];
  let buf = [];
  const flush = () => { if (buf.length) { flow.push(para(buf)); buf = []; } };
  for (const n of children) {
    if (['heading', 'paragraph', 'list', 'gridTable'].includes(n.type)) { flush(); flow.push(n); }
    else buf.push(n);
  }
  flush();
  return flow.length ? flow : [para([])];
}

function blockToGridTable(blockDiv, title) {
  const rowsDivs = [...blockDiv.children].filter((el) => el.tagName === 'DIV');
  const bodyRows = rowsDivs.map((r) => {
    const cellDivs = [...r.children].filter((el) => el.tagName === 'DIV');
    const cells = (cellDivs.length ? cellDivs : [r]).map((cell) => gtCell(asFlow(domToMdast(cell))));
    return gtRow(cells);
  });
  return {
    type: 'gridTable',
    children: [
      { type: 'gtHeader', children: [gtRow([gtCell([para([txt(title)])])])] },
      { type: 'gtBody', children: bodyRows },
    ],
  };
}

function sectionMetadataTable(div) {
  const rows = [...div.querySelectorAll(':scope > div')].map((r) => {
    const c = [...r.children];
    return gtRow([
      gtCell([para([txt((c[0]?.textContent || '').trim())])]),
      gtCell([para([txt((c[1]?.textContent || '').trim())])]),
    ]);
  });
  return {
    type: 'gridTable',
    children: [
      { type: 'gtHeader', children: [gtRow([gtCell([para([txt('Section Metadata')])])])] },
      { type: 'gtBody', children: rows },
    ],
  };
}

// The Table block cannot round-trip through md2jcr's markdown→JCR path (the
// parent model's `filter` field greedily consumes data cells as properties), so
// Table blocks are emitted as a placeholder paragraph here and their cell data
// collected on `tables`; build-package.mjs generates the Table block JCR
// directly and splices it in over the placeholder. Each cell keeps its inner
// HTML so rich content (sub/sup, strong, links) survives.
const TABLE_MARKER = (i) => `@@MDTABLE${i}@@`;

function collectTable(blockDiv) {
  const rowDivs = [...blockDiv.children].filter((el) => el.tagName === 'DIV');
  return rowDivs.map((r) => {
    const cellDivs = [...r.children].filter((el) => el.tagName === 'DIV');
    return (cellDivs.length ? cellDivs : [r]).map((cell) => cell.innerHTML.trim());
  });
}

export function plainHtmlToMdast(html, { titleById, JSDOM }) {
  const doc = new JSDOM(`<!DOCTYPE html><html><body><main>${html}</main></body></html>`).window.document;
  const main = doc.querySelector('main');
  const root = { type: 'root', children: [] };
  const tables = [];
  const sections = [...main.children].filter((el) => el.tagName === 'DIV');

  sections.forEach((section, si) => {
    if (si > 0) root.children.push({ type: 'thematicBreak' });
    for (const child of section.children) {
      const cls = child.classList && child.classList[0];
      if (child.classList && child.classList.contains('section-metadata')) {
        root.children.push(sectionMetadataTable(child));
      } else if (child.classList && child.classList.contains('table')) {
        // Table block — emit a placeholder paragraph isolated in its own
        // section (thematic breaks) so it lands as a standalone <text> node the
        // builder can cleanly replace with generated Table JCR. Collect data.
        const idx = tables.length;
        tables.push(collectTable(child));
        root.children.push({ type: 'thematicBreak' });
        root.children.push(para([txt(TABLE_MARKER(idx))]));
        root.children.push({ type: 'thematicBreak' });
      } else if (cls && titleById[cls]) {
        root.children.push(blockToGridTable(child, titleById[cls]));
      } else {
        root.children.push(...asFlow(domToMdast(child)));
      }
    }
  });
  root.tables = tables;
  return root;
}
