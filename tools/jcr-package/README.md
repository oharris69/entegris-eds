# Entegris EDS — AEM content package

**`entegris-eds-full-1.2.5.zip`** is the single, ready-to-upload AEM content package
for the migrated Entegris content.

## Install

1. Open Package Manager on the author:
   `https://author-p7954-e2285674.adobeaemcloud.com/crx/packmgr`
2. **Upload Package** → choose `entegris-eds-full-1.2.5.zip`
3. **Install**

That's it — one package, one install. No need to install anything else.

> **1.2.5** fixes the "Working Together" section: the *see customer engagement
> model* button (empty `link` on the source, which was a JS popup) now points to
> `about-us/corporate-overview.html` per language, and a leftover empty button
> was removed. Applies to the `en`/`zh` `index` and `home` pages.
>
> **1.2.4** folds the site-root `index` pages (`language-masters/{en,zh}/index`,
> served at `/` and `/zh`) into this package. Earlier they shipped as a separate
> `entegris-eds-root-index` package — but the full package's filter is rooted at
> the whole `en`/`zh` subtrees in replace mode, so installing the full package
> afterwards silently wiped the root pages (leaving `/` blank). They now live in
> one package, so a single install is always safe and complete. Do **not**
> install the old standalone `root-index` package on top of this.

## What's inside

A standard CRX/FileVault package (`jcr_root/` + `META-INF/vault/`) containing:

- **content pages** under `/content/entegris-eds/language-masters/{en,zh}`
  (homepage, locations, products index, product detail, the 4 solution-area
  pages, the Component Technical Information page, the ChemLock Filter Housing
  technical-information hub + its 2 topic pages, the `/zh` clones, and nav +
  footer for each language), **plus the `en/index` and `zh/index` root pages**
  that serve `/` and `/zh`. `en` and `zh` are language siblings, matching
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
- The site root `/` is served by a real `index` **page**
  (`language-masters/en/index`, and `language-masters/zh/index` → `/zh`),
  mapped in `paths.json`. As of **1.2.4** these pages ship **inside this full
  package** (see `INDEX_PAGES` in `build-package.mjs`) — they are no longer a
  separate install. This matters because the package filter is rooted at the
  whole `en`/`zh` subtrees in replace mode: a separately-installed root-index
  package was silently wiped by any later full-package install, blanking `/`.
  The standalone `build-root-index-package.mjs` / `entegris-eds-root-index-*.zip`
  are superseded — do not install them on top of the full package.
  Do NOT put the home content directly on the bare language node
  (`language-masters/en`): it renders in preview/live but AEM's
  `franklin.delivery` pipeline cannot refetch a bare language container as a
  root document, so Sidekick "Update" on `/` fails with
  `AEM_BACKEND_FETCH_FAILED … not authorized to access resource: .../main/`.
  A named `index` page is a normal cq:Page and refetches like any other.
- DAM asset nodes declare the full `renditions/original` as an `nt:file` in
  `.content.xml`. Do NOT serialize `<renditions/>` as an empty self-closed
  folder — FileVault then treats the folder as childless, ignores the loose
  `original` binary, and imports an incomplete asset (which DAM drops, leaving
  the folder empty on install).
- Chinese content is machine-translated — flag for native review before publish.
