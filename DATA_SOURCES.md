# Public reference provenance

Snapshot retrieved October 27, 2026. `scripts/evidence/date.txt` records the timestamp. The official roster reports **434 National Park System units** and lists **33 affiliated areas**, stored separately. It lists 64 units in the National Parks designation. Counts are read from the source headings, never substituted with an anticipated count.

- Inventory and classifications: https://www.nps.gov/aboutus/national-park-system.htm
- Park text and research links: each unit's linked official NPS page; extracted metadata is retained in `scripts/evidence/pages.json`.
- Administrative reference points: NPS Land Resources Division, https://www.arcgis.com/home/item.html?id=e62a2420170b4452b4a334db92130220 . The query URL is recorded in `scripts/compile.py` and each point. These points are **not entrances, visitor centers, trailheads or navigable routes**. Attribution: CC BY 4.0 as stated by the published item.
- Base outlines: Natural Earth, public domain, https://www.naturalearthdata.com/about/terms-of-use/ . Geometry was part of the existing module groundwork; country/state outlines are simplified and do not show park boundaries.
- Initial trail entries: New River Gorge official hiking guide, https://www.nps.gov/neri/planyourvisit/hiking.htm . Individual official place pages are linked. Distances, difficulty, accessibility and coordinates remain unknown unless explicitly compiled from source evidence.

## Reproduction and updates

`npm run reference:build` rebuilds `src/data/parks.json` solely from committed evidence. It should produce no diff. `npm run reference:refresh` retrieves the current official roster, park-page metadata and NPS points with bounded concurrency, robots checks, response bounds and no credentials. Review the source diff, counts, missing coverage, new/renamed IDs, and references before committing a refresh. Retained supplemental hiking pages currently require explicit refresh/review; their provenance must be maintained independently. Do not label these sources as live conditions.

The roster separates parks and preserves that share an NPS code. IDs derive from the full official roster name, not the administrative code. A future rename requires an explicit alias/data migration review so personal references are preserved; do not silently collapse records.

## Observed coverage and limitations

467 total reference entries: 434 official units and 33 affiliated areas. 286 have retrieved homepage descriptions and 428 have an unambiguous administrative reference point. Missing and ambiguous values are retained as missing, never fabricated. The snapshot supplies official research links where available. Structured history, establishment dates, ecology, activities, accessibility, visitor centers and trails are not comprehensively covered yet. The interface exposes those gaps. No real-time closures, travel durations, bookings, park photographs, or full NPS API snapshot are claimed.

Public reference builds must never read personal visits, private historical sources, photographs, backups, credentials or Explorer's private fixtures. No API key or subscription is required.
