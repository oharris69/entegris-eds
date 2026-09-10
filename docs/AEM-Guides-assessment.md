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
├─ concept:   product-overview          (from hub page: chemlock-filter-housing-technical-information)
├─ reference: specifications            (materials, pressure/temp ratings, dimensions)
├─ task:      bowl-installation         ← migrated EDS topic (see conref map below)
│   ├─ note (IMPORTANT):  o-ring changeout caution        → conref-ready
│   ├─ step 1–4:          four-step installation procedure (2 figures)
│   ├─ note (WARNING):    locking-ring compatibility hazard → conref-ready
│   ├─ reference:         Wrenches part-number table (YY4600005/06) → Table block
│   └─ task:              Retrofitting
├─ task:      cartridge-replacement
├─ task:      operation-and-startup
├─ reference: chemical-compatibility    ← migrated EDS topic
│   ├─ reference:  Locking-ring compatibility matrix (5-col) → Table block
│   ├─ reference:  O-ring compatibility matrix (9-col)       → Table block
│   └─ note (WARNING): locking-ring compatibility hazard     → SAME conref as above
└─ concept:   safety-and-warnings       (conref-shared across all Entegris manuals)
```

**These two topics are now migrated to EDS** (this repo) and are ready to seed the map:

| DITA topic | Migrated EDS page (this site) | Notable structured content |
|---|---|---|
| `bowl-installation.dita` (task) | `/en/home/resources/technical-information/chemlock-filter-housing-technical-information/chemlock-filter-housing-bowl-installation` | 4-step procedure, IMPORTANT + WARNING notes, **3-col Wrenches part-number table** |
| `chemical-compatibility.dita` (reference) | `.../chemlock-filter-housing-chemical-compatibility` | **5-col locking-ring matrix**, **9-col O-ring matrix**, 2 footnotes, WARNING note |
| `product-overview.dita` (concept) | `.../chemlock-filter-housing-technical-information` (hub) | intro + links to the two sub-topics |

**Conref reuse already visible across the two topics** — the *"Using a locking ring
that is not fully compatible … sudden breakage … chemical exposure"* WARNING appears
on **both** pages verbatim. That is the first, concrete conref candidate: author it once
(e.g. `warnings.dita#locking-ring-hazard`) and reference it from both topics.

The two compatibility matrices and the wrenches list migrated as **EDS Table blocks**
(rectangular, header row + footnotes lifted to captions); in DITA these become
`<table>`/`<simpletable>` inside the reference topics — a clean 1:1 mapping.

## Why the other two are NOT Guides candidates

- **Brochure (specialty-chemicals-industrial-applications):** marketing collateral — narrative value-prop, imagery, product family overview. Not task/concept/reference structured; no procedures. Belongs as a **web page** (migrate like the other solution pages) or stays a downloadable PDF. DITA would add overhead with no reuse/translation payoff.
- **Pictogram (migrating-to-molybdenum):** a **single-page visual infographic** (6 MB, 1 page, no tagged text structure). It's essentially an image. Keep as a DAM asset / embed on a page. Nothing to topic-decompose.

## Structural signals observed (from the PDFs)

- brochure: 6 pp, tagged (`/StructTreeRoot`) but marketing layout, no TOC/bookmarks
- manual: 11 pp, tagged structure, multi-section. **EN source confirmed** at `/content/dam/product-assets/chemlockfilterhousings/manual-chemlock-pfa-housings-6205.pdf` (3.5 MB, 11 pp) — the earlier 404 was a wrong DAM path; a `-ja` translation also exists
- pictogram: 1 pp, image-dominant (5.9 MB), no tagged text structure

## Handoff notes for Leroy

1. **Start with the ChemLock PFA Housings manual** — richest task/reference content, existing HTML topics to seed conrefs, and a real multi-language/multi-channel case.
2. **EN source is confirmed** (see path below) — author EN as the DITA master and treat `-ja` as a managed translation.
3. **The three `chemlock-filter-housing-technical-information` pages are now migrated to EDS in this repo** (hub + bowl-installation + chemical-compatibility) with their procedures, notes, and matrices intact as Table blocks — use them as the first topics/conref sources for the map (see table above).
4. **First conref to author:** the shared locking-ring-hazard WARNING (identical on both migrated topics).
5. Publishing target: Guides → EDS could surface these manual topics as web pages on this same `entegris-eds` site under `/en/home/resources/...`, alongside the PDF output. The migrated pages already sit at those paths.

## Source URLs
- manual (en): https://www.entegris.com/content/dam/product-assets/chemlockfilterhousings/manual-chemlock-pfa-housings-6205.pdf
- manual (ja): https://www.entegris.com/content/dam/web/resources/manuals-and-guides/manual-chemlock-pfa-housings-6205-ja.pdf
- brochure: https://www.entegris.com/content/dam/web/resources/brochures/brochure-specialty-chemicals-industrial-applications-14174.pdf
- pictogram: https://www.entegris.com/content/dam/product-assets/molybdenummoo2cl2/pictogram-migrating-to-molybdenum-13203.pdf
