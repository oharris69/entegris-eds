# Entegris EDS — AEM content package

**`entegris-eds-full-1.2.2.zip`** is the single, ready-to-upload AEM content package
for the migrated Entegris content.

## Install

1. Open Package Manager on the author:
   `https://author-p7954-e2285674.adobeaemcloud.com/crx/packmgr`
2. **Upload Package** → choose `entegris-eds-full-1.2.2.zip`
3. **Install**

That's it — one package, one install. No need to install anything else.

## What's inside

A standard CRX/FileVault package (`jcr_root/` + `META-INF/vault/`) containing:

- **22 content pages** under `/content/entegris-eds/language-masters/{en,zh}`
  (homepage, locations, products index, product detail, the 4 solution-area
  pages, the Component Technical Information page, the ChemLock Filter Housing
  technical-information hub + its 2 topic pages, the `/zh` clones, and nav +
  footer for each language). `en` and `zh` are language siblings, matching
  `paths.json`.
- **24 DAM assets** under `/content/dam/entegris-eds`.

The two ChemLock topic pages carry data tables (chemical-compatibility matrices,
the wrenches part-number list) authored as **Table blocks** — see
`blocks/table/` for the block and `_table.json` model (extended to 9 columns).

## Rebuilding the package

```bash
node tools/jcr-package/build-combined-package.mjs
```

Regenerates the versioned `entegris-eds-full-<ver>.zip` (set `PKG_VERSION`) from
the migrated `content/**.plain.html` pages and local image binaries. Helpers:
`build-package.mjs` (content), `build-dam-package.mjs` (assets), `plain2md.mjs`
(block → JCR conversion).

## Notes

- Page images reference the bundled DAM assets at
  `/content/dam/entegris-eds/<name>` (exact 1:1 by filename), so imagery
  resolves from the package with no separate asset-mapping step.
- The header/footer blocks (`blocks/header`, `blocks/footer`) must be deployed
  to this environment for nav/footer to render.
- Page-level metadata blocks map to `jcr:content` page properties
  (`jcr:title`, `jcr:description`) via md2jcr's page helper — they are not
  emitted as visible body content.
- DAM asset nodes declare the full `renditions/original` as an `nt:file` in
  `.content.xml`. Do NOT serialize `<renditions/>` as an empty self-closed
  folder — FileVault then treats the folder as childless, ignores the loose
  `original` binary, and imports an incomplete asset (which DAM drops, leaving
  the folder empty on install).
- Chinese content is machine-translated — flag for native review before publish.
