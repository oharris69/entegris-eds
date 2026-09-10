# AEM Guides fit assessment — 3 Entegris PDFs

Prepared for Leroy Steinbacher to evaluate/build in his AEM Guides (DITA) environment.

## TL;DR

| PDF | Type | Pages | Guides/DITA fit | Recommendation |
|-----|------|:---:|:---:|----------------|
| **manual-chemlock-pfa-housings-6205** | Installation/operation **manual** | 11 | ⭐⭐⭐ **Strong** | **Best candidate — build this in Guides** |
| brochure-specialty-chemicals-industrial-applications-14174 | Marketing **brochure** | 6 | ⭐ Weak | Keep as web page / PDF; not DITA |
| pictogram-migrating-to-molybdenum-13203 | Single-page **infographic/pictogram** | 1 | ✗ None | Keep as image/PDF asset |

## Why the manual is the Guides candidate

`manual-chemlock-pfa-housings-6205` is a **product installation & operation manual** — the exact content class AEM Guides (DITA topic-based authoring) is designed for:

- **Procedural, task-oriented content** — installation steps, operation, maintenance, safety. Maps cleanly to DITA **`<task>`** topics (step/cmd/info), **`<concept>`** (overview), and **`<reference>`** (specs, torque tables, part numbers).
- **11 pages, multi-section** — long enough to benefit from topic decomposition and a DITA map.
- **Reuse potential** — Entegris has a whole `manuals-and-guides/` DAM folder; safety warnings, company boilerplate, spec tables, and shared procedures are prime **content-reference (conref)** reuse across the manual family.
- **Multi-language** — this manual already exists as `-ja` (Japanese) and the site has `-cn` datasheets. Guides + DITA translation management is a major win over maintaining parallel PDFs.
- **Multi-channel output** — Guides can publish the same DITA source to PDF (print manual), HTML5, and **EDS** — so the manual could live as web pages on this very site *and* as the downloadable PDF, from one source.

### Suggested DITA structure (starting point for Leroy)
```
chemlock-pfa-housings.ditamap
├─ concept:  product-overview
├─ reference: specifications (materials, pressure/temp ratings, dimensions)
├─ task:     bowl-installation        (reuses existing web topic: chemlock-filter-housing-bowl-installation)
├─ task:     cartridge-replacement
├─ task:     operation-and-startup
├─ reference: chemical-compatibility  (reuses: chemlock-filter-housing-chemical-compatibility)
└─ concept:  safety-and-warnings      (conref-shared across all Entegris manuals)
```
Note: Entegris **already has HTML technical-info topics** for this product (e.g.
`.../chemlock-filter-housing-technical-information/chemlock-filter-housing-bowl-installation.html`
and `...-chemical-compatibility.html`) — these are effectively DITA topics
already and are natural conref sources for the manual.

## Why the other two are NOT Guides candidates

- **Brochure (specialty-chemicals-industrial-applications):** marketing collateral — narrative value-prop, imagery, product family overview. Not task/concept/reference structured; no procedures. Belongs as a **web page** (migrate like the other solution pages) or stays a downloadable PDF. DITA would add overhead with no reuse/translation payoff.
- **Pictogram (migrating-to-molybdenum):** a **single-page visual infographic** (6 MB, 1 page, no tagged text structure). It's essentially an image. Keep as a DAM asset / embed on a page. Nothing to topic-decompose.

## Structural signals observed (from the PDFs)

- brochure: 6 pp, tagged (`/StructTreeRoot`) but marketing layout, no TOC/bookmarks
- manual: 11 pp, tagged structure, multi-section (the `-ja` variant was analyzed; EN variant returned 404 on the DAM at time of check — worth locating the EN source before Guides authoring)
- pictogram: 1 pp, image-dominant (5.9 MB), no tagged text structure

## Handoff notes for Leroy

1. **Start with the ChemLock PFA Housings manual** — richest task/reference content, existing HTML topics to seed conrefs, and a real multi-language/multi-channel case.
2. Locate the **English** source of `manual-chemlock-pfa-housings-6205` (only `-ja` resolved on the DAM in this pass) — or author EN as the DITA master and treat `-ja` as a translation.
3. The two existing `chemlock-filter-housing-technical-information/*.html` pages are the natural first topics to bring into the map.
4. Publishing target: Guides → EDS could surface these manual topics as web pages on this same `entegris-eds` site under `/en/home/resources/...`, alongside the PDF output.

## Source URLs
- manual (ja): https://www.entegris.com/content/dam/web/resources/manuals-and-guides/manual-chemlock-pfa-housings-6205-ja.pdf
- brochure: https://www.entegris.com/content/dam/web/resources/brochures/brochure-specialty-chemicals-industrial-applications-14174.pdf
- pictogram: https://www.entegris.com/content/dam/product-assets/molybdenummoo2cl2/pictogram-migrating-to-molybdenum-13203.pdf
