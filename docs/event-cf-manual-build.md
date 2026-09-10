# Event Content Fragment Model — manual build spec

The `fragment-list` block on the homepage "Connect and Collaborate" grid is
already wired and rendering. Because CF models/fragments (like DAM assets) do
not import reliably via content packages on AEM Cloud, create them manually in
the author using the spec below. The homepage grid needs **no** config change —
it already points at `modelName = event` and folder
`/content/dam/entegris-eds/events`.

## 1. Create the CF Model

- **Location:** Tools → Assets → Content Fragment Models → (conf) **global**
- **Model title:** `Event`  (this yields model path
  `/conf/global/settings/dam/cfm/models/event` — the name the grid filters on)
- **Description:** Entegris event / blog / news card

### Fields (in this order)

| # | Field label | Property name | Type | Options / notes |
|---|---|---|---|---|
| 1 | Title | `title` | Single line text | **required** |
| 2 | Type | `eventType` | Enumeration / dropdown (single) | values: `event`, `blog`, `news`; default `event` |
| 3 | Date | `eventDate` | Date and time | display/value format `YYYY-MM-DD` |
| 4 | Summary | `summary` | Multi line text | |
| 5 | Link | `link` | Single line text | page path or external URL |
| 6 | Thumbnail | `thumbnail` | Content reference | root path `/content/dam/entegris-eds` |

> Property names must match exactly — the block reads them by name.

## 2. Create the fragments folder

- **Path:** `/content/dam/entegris-eds/events`

## 3. Create the 9 fragments

Create one Content Fragment per row (Model = Event), name = the slug column,
and set the fields on the **Master** variation. `summary` and `thumbnail` were
empty in the migration and can be filled in later.

| Fragment slug | title | eventType | eventDate | link |
|---|---|---|---|---|
| cmp-slurry-patent-portfolio | Entegris Achieves Further Success in Defending Its CMP Slurry Patent Portfolio | news | 2026-08-18 | /en/home/about-us/news/entegris-achieves-further-success-in-defending-its-cmp-slurry-pa.html |
| cmp-technology-day-2026 | CMP Technology Day 2026 | event | 2026-10-08 | /en/home/about-us/events/cmp-technology-day-2026.html |
| decade-photochemical-purification-euv | What a Decade of Photochemical Purification Taught Us as EUV Scaled | blog | 2026-08-18 | https://blog.entegris.com/what-a-decade-of-photochemical-purification-taught-us-as-euv-scaled |
| from-lab-to-fab-cmp-filtration | From Lab to Fab: Capturing the Uncatchable in CMP Filtration | blog | 2026-08-25 | https://blog.entegris.com/from-lab-to-fab-capturing-the-uncatchable-in-cmp-filtration |
| glasstec-2026 | glasstec 2026 | event | 2026-10-20 | /en/home/about-us/events/glasstec-2026.html |
| iit-2026 | IIT 2026 | event | 2026-09-20 | /en/home/about-us/events/iit-2026.html |
| imts-2026 | International Manufacturing Technology Show 2026 | event | 2026-09-14 | /en/home/about-us/events/imts-2026.html |
| semicon-taiwan-2026 | SEMICON Taiwan 2026 | event | 2026-09-02 | /en/home/about-us/events/semicon-taiwan-2026.html |
| ultrafacility-2026 | UltraFacility 2026 | event | 2026-09-16 | /en/home/about-us/events/ultrafacility-2026.html |

## 4. Publish

Publish the model, the `events` folder, and the 9 fragments. Then re-preview /
re-publish the homepage (`/`) so the grid re-fetches the fragment collection.

## Reference

The originals are captured in `tools/cf-model/entegris-eds-event-cf-1.0.0.zip`
(model at `jcr_root/conf/global/settings/dam/cfm/models/event`, fragments under
`jcr_root/content/dam/entegris-eds/events/`). The grid wiring is in
`tools/cf-model/build-connect-grid-package.mjs`; the block itself is
`blocks/fragment-list/` (definition/model registered in the component JSONs).

### If you switch to the standard CTA model instead

The grid config on the homepage sets `modelName = event`. To use a different
model, that value (and possibly `contentFragmentFolder`) must change on the
homepage's Fragment List block, then republish `/`. Ask and this can be scripted
+ republished.
