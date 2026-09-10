# Entegris EDS — AEM content package

**`entegris-eds-full.zip`** is the single, ready-to-upload AEM content package
for the migrated Entegris content.

## Install

1. Open Package Manager on the author:
   `https://author-p7954-e2285674.adobeaemcloud.com/crx/packmgr`
2. **Upload Package** → choose `entegris-eds-full.zip`
3. **Install**

That's it — one package, one install. No need to install anything else.

## What's inside

A standard CRX/FileVault package (`jcr_root/` + `META-INF/vault/`) containing:

- **17 content pages** under `/content/entegris-eds/language-masters/{en,zh}`
  (homepage, locations, products index, product detail, the 4 solution-area
  pages, their `/zh` clones, and nav + footer for each language). `en` and `zh`
  are language siblings, matching `paths.json`.
- **23 DAM assets** under `/content/dam/entegris-eds`.

## Rebuilding the package

```bash
node tools/jcr-package/build-combined-package.mjs
```

Regenerates `entegris-eds-full.zip` from the migrated `content/**.plain.html`
pages and local image binaries. Helpers: `build-package.mjs` (content),
`build-dam-package.mjs` (assets), `plain2md.mjs` (block → JCR conversion).

## Notes

- Page images reference their original source URLs (per project decision); the
  bundled DAM assets are loaded into AEM and available to authors.
- The header/footer blocks (`blocks/header`, `blocks/footer`) must be deployed
  to this environment for nav/footer to render.
- Chinese content is machine-translated — flag for native review before publish.
