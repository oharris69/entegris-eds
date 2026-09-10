# Entegris EDS — AEM content package

**`entegris-eds-full-1.0.0.zip`** is the single, ready-to-upload AEM content package
for the migrated Entegris content.

## Install

1. Open Package Manager on the author:
   `https://author-p7954-e2285674.adobeaemcloud.com/crx/packmgr`
2. **Upload Package** → choose `entegris-eds-full-1.0.0.zip`
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

Regenerates `entegris-eds-full-1.0.0.zip` from the migrated `content/**.plain.html`
pages and local image binaries. Helpers: `build-package.mjs` (content),
`build-dam-package.mjs` (assets), `plain2md.mjs` (block → JCR conversion).

## Notes

- Page images reference the bundled DAM assets at
  `/content/dam/entegris-eds/<name>` (exact 1:1 by filename), so imagery
  resolves from the package with no separate asset-mapping step.
- The header/footer blocks (`blocks/header`, `blocks/footer`) must be deployed
  to this environment for nav/footer to render.
- Chinese content is machine-translated — flag for native review before publish.
