# Entegris EDS — AEM content packages

Installable AEM content packages (CRX/FileVault format: `jcr_root/` +
`META-INF/vault/`) for the migrated Entegris content, targeting site
`/content/entegris-eds` on `author-p7954-e2285674.adobeaemcloud.com`.

Pages land under the `language-masters` tree so `en` and `zh` are language
siblings (matching `paths.json`):
`/content/entegris-eds/language-masters/{en,zh}/...`

## Deliverables

| File | Contents |
|------|----------|
| **`entegris-eds-full.zip`** | Combined: 17 content pages (incl. nav/footer, en+zh) **+** 23 DAM assets. One-shot install. |
| `entegris-eds-content.zip` | 17 content pages only. |
| `entegris-eds-dam.zip` | 23 DAM assets only (`/content/dam/entegris-eds`). |
| `asset-mapping.json` | Source-image-URL → DAM-path map (for the `aem upload` flow below). |
| `local-assets/` | The 22 referenced image binaries (for `--local-assets`). |

## Install — Option A: Package Manager (manual)

1. Open Package Manager on the author: `https://author-p7954-e2285674.adobeaemcloud.com/crx/packmgr`
2. **Upload Package** → choose `entegris-eds-full.zip`
3. **Install**

This is a standard CRX package; it installs content + assets as-is. Images in
the pages still reference their source URLs (see "Repointing images" below).

## Install — Option B: aem-import-helper (EMA-standard, one command)

Downloads the referenced images, uploads them to AEM Assets, rewrites the page
XML to the DAM paths, and installs the package — all in one step:

```bash
npx @adobe/aem-import-helper aem upload \
  --zip tools/jcr-package/entegris-eds-content.zip \
  --asset-mapping tools/jcr-package/asset-mapping.json \
  --local-assets tools/jcr-package/local-assets \
  --target https://author-p7954-e2285674.adobeaemcloud.com \
  --token <AEM_TOKEN_OR_TOKEN_FILE>
```

- `--local-assets` makes the tool use the bundled binaries (the `/media-da/*`
  refs aren't publicly fetchable URLs), falling back to download for any misses.
- Use `entegris-eds-content.zip` here (NOT the `-full` zip) — this flow manages
  assets itself, so the separate DAM package is redundant with `--asset-mapping`.
- Get `--token` from Adobe IMS for the target environment (Developer Console).

## Repointing images to the DAM

The migrated pages reference the original/source image URLs (per project
decision). Option B rewrites them to `/content/dam/entegris-eds/...`
automatically. For Option A, the DAM assets are loaded but pages keep their
source URLs until repointed — rebuild the content package with the rewrite map
(`dam-rewrite-map.json`) applied if you want DAM-backed references.

## Rebuilding

```bash
node tools/jcr-package/build-package.mjs           # content zip
node tools/jcr-package/build-dam-package.mjs       # DAM zip + rewrite map
node tools/jcr-package/build-combined-package.mjs  # full zip (runs both, merges)
```
