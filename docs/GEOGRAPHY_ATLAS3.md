# Atlas 3.0 geographic pipeline

## Ownership and coordinates

National Parks Explorer owns geometry, reference data and atlas rendering. Explorer supplies the same storage, routes and offline shell as before. No personal storage migrations or new namespaces are introduced.

`atlas-geometry.ts` remains authoritative for projection, aspect fitting, zoom, pan and screen-space clustering. Focused Census jurisdiction geometry uses WGS84 longitude/latitude, cosine-scaled equirectangular coordinates around each feature's stored center: x = wrapped(lon − centerLon) × cos(centerLat), y = centerLat − lat. Longitude wraps around that center, preserving Alaska's Aleutian multipart geometry. Hawaii, American Samoa and the Northern Mariana Islands retain core/full-chain bounds.

The national overview retains its existing mainland and Alaska/Hawaii inset transforms. The world overview remains equirectangular. SVG `viewBox` and measured stage aspect ratio control all vector and raster positioning together. A raster never stretches independently of its registered bounds. Every focus feature preserves its multipart paths, including Michigan's two peninsulas. Administrative points remain distinct from park boundaries, entrances and trailheads.

## Sources and licenses

| Asset family | Source | License | Meaning |
| --- | --- | --- | --- |
| Focused jurisdictions | [Census 2025 state/equivalent cartographic boundaries](https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_state_500k.zip) | Public domain, existing provenance in atlas-boundaries.json | Generalized administrative outlines |
| National/world overview | [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) | Public domain | Small-scale geographic context |
| Relief | [Natural Earth Shaded Relief Basic](https://www.naturalearthdata.com/downloads/50m-raster-data/50m-shaded-relief/) / [NACIS ZIP](https://naciscdn.org/naturalearth/50m/raster/SR_50M.zip) | [Public domain; modification and redistribution permitted](https://www.naturalearthdata.com/about/terms-of-use/) | Downsampled SRTM Plus derived hillshade; not elevation values |
| Park points | [NPS Land Resources Division](https://www.arcgis.com/home/item.html?id=e62a2420170b4452b4a334db92130220) | Existing CC BY 4.0 attribution | Administrative/reference coordinates, not land polygons |
| Personal visitation | Existing itemized user records | Private local data | Distinct stable park IDs with experience = visited |

Relief source acquired 2026-11-07 UTC (2026-11-06 Eastern). Original GeoTIFF: 10,800 × 5,400, WGS84, 1/30° grid, world extent −180..180 / −90..90. The TFW identifies pixel centers at −179.983333°, 89.983333°. This is a generalized 1:50 million product, roughly 3.7 km north/south cells at the equator, not fine topography. The provider states small islands were accentuated with embossing. No invented mountain texture or numeric elevation is added.

The website advertises 3.2.0, but the downloaded archive's `SR_50M.VERSION.txt` contains 2.0.0. Both are retained in the manifest; the exact source SHA256 pins the actual input:

`ff810f5f2747463fd8ffa612b23e5f5e5d593a345218976872b6749610976ab7`

## Regeneration

Build requirement: Python and Pillow (Pillow's HPND license; build-time only). No new browser dependency, account, key, map service, tile subscription or hosting cost.

```sh
curl -L --fail https://naciscdn.org/naturalearth/50m/raster/SR_50M.zip -o /tmp/SR_50M.zip
python scripts/build-terrain.py /tmp/SR_50M.zip
python scripts/validate-terrain.py /tmp/SR_50M.zip
```

The generator verifies the pinned ZIP hash, grid transform, dimensions and embedded version. It resamples to WebP quality 78, using each jurisdiction's exact geometry bounds and inverse local projection. A triplicated longitude domain supports antimeridian crops. National assets composite the existing three transforms. The world asset is 1,800 × 900. Outputs and hashes live in `src/terrain/manifest.json`; raw 58 MB TIFF is not committed.

Delivered: 53 rasters, 368,004 bytes total: world, national overview, 50 states and Puerto Rico. AS, GU, MP, VI and DC deliberately use the geographic fallback because this source is too coarse for useful focused relief. Their outlines, inventories, statistics, comparisons and reference markers remain functional. Nearby ocean on focused views is a background style rather than a bathymetric measurement. Coastlines follow the existing boundary assets; generalized relief has a different source coastline and cannot establish precise coastal or legal boundaries. No extra hydrology dataset is claimed.

`validate-terrain.py` checks every output hash, byte size, dimensions and registered extent; with the source ZIP it additionally samples nine independent geographic fixtures, including national mainland, Alaska and Hawaii insets. Samples compare at output pixel centers to avoid pretending coarse cells resolve individual summits.

## Layer architecture and offline loading

`atlas-data.ts`: deterministic filtering, stable-ID deduplication and summaries.

`atlas-layers.ts`: layer registry, exclusive marker modes, shared color scales and precedence.

`AtlasCartography.tsx`: geographic outlines, collision-limited labels, relief registration and fallback.

`AtlasPanels.tsx`: accessible controls, legends, previews, summary cards, comparison and exact tables.

`Atlas.tsx`: viewport/gesture orchestration, clusters and current-session state. Existing pinch, pan, click suppression and clustering algorithms are preserved.

Composition: water → land → clipped relief → optional thematic fill/borders → labels → marker buttons. Relief, labels and top outlines do not intercept pointer events. Marker coloring is one explicit mode: locations, designation groups, visitation or reference coverage. Selected markers take precedence. Mixed clusters keep their counts and inspectable member lists. Designation groups are documented by the actual designation strings in `designationGroup`; they are browsing categories, not new NPS classifications.

Terrain URL registration loads through a separate dynamic import. Explorer disables raster inlining for this family so only the selected raster is requested for display; all compact derivatives are included in the established complete offline cache installation. Essential geometry and controls work while relief loads or fails. The existing service worker rejects incomplete installations without activating them. No personal IndexedDB contents are touched by map actions. Session view/layer/filter/comparison state is memory-only and does not change backup formats.

## Counting rules

Each unique stable park ID counts once in national totals, and once in every explicitly listed jurisdiction. Summed jurisdiction counts may exceed national totals. Reference point location never overrides jurisdiction metadata. Invalid/missing coordinates are excluded only from point counts, never inventories.

Official = `classification: system-unit`; affiliated = `affiliated`. Trail/attraction coverage counts records with at least one documented trail/nontrail attraction. Separate summary totals count unique parent-park + attraction IDs. Missing reference fields mean undocumented here, not absence in the landscape.

Recorded visitation uses distinct itemized visited IDs only. Pass-through visits and historical baseline estimates are excluded. Percentage = visited associated records / all matching associated records × 100. Zero matching records produces a null percentage, hatched on maps and labeled no denominator. Zero visits with a positive denominator is a true 0%. Saved destinations use existing saved entities.

All thematic metrics and comparison figures explicitly use the same filtered global subset. Changing the focused map area changes the regional inventory, not comparison denominators elsewhere. Comparison is two to four of all 56 jurisdictions and uses a shared count maximum or 0–100% scale. Raw record association counts are never described as geographic density, acreage or protected land footprint.

Regions: Census Northeast/Midwest/South/West for the states and DC; Explorer-specific Pacific territories (AS/GU/MP) and Caribbean territories (PR/VI). Membership is explicit in `atlasRegions`.

Filtered Discovery links use the existing `explore` route with bounded, whitelisted query keys. Explorer's strict stable-ID path validation is retained; only this module's Explore query contract is extended. Discovery validates values against actual jurisdictions, designations and supported filters. Back navigation restores the session atlas context.
