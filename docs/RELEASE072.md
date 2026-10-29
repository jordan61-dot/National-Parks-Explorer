# National Parks Explorer 0.4.0 · Explorer 0.7.2

October 29, 2026, America/New_York. Public baseline: `e4e84442f6857eb31bcd36462e4332501b2b72f2` (0.3.0). The public repository remains authoritative; Explorer must consume the verified commit archive with lockfile integrity. No personal data or private fixtures are included.

## Delivered reference coverage

| Measure | Verified 0.7.1 baseline | 0.7.2 |
| --- | ---: | ---: |
| Official system units / affiliated areas | 434 / 33 | 434 / 33 |
| Substantive introductions | 437 | 450 |
| Entries with offline articles | 436 | 446 |
| Offline article sections | 2,375 | 2,387 |
| History/culture coverage | 385 | 393 |
| Nature/geology coverage | 297 | 298 |
| Accessibility / activities coverage | 410 / 350 | 410 / 351 |
| Named attractions / parks represented | 261 / 65 | 355 / 78 |
| Trails with structured attributes / parks | 20 / 8 | 108 / 20 |
| Numeric trail lengths | 12 | 92 |
| Trails with difficulty / elevation gain | 13 / 0 | 59 / 4 |
| Trails with accessibility evidence | 16 | 26 |
| Structured history milestones | 21 | 28 |
| Licensed photographs | 0 | 4 |
| Administrative reference points | 429 | 429 |
| Failed/unverified legacy articles | 189 | 189 |
| Duplicate attraction identities removed | 0 | 0 |

Counts come from generated data. `COVERAGE072.json` contains the complete prioritized per-unit gap register; `BASELINE072.json` preserves all 467 original park IDs and 261 baseline attraction IDs. All remain present. Structured trails require at least one sourced length, difficulty or accessibility field; bare narrative trail references are excluded. Coverage counts follow the prior release's >10-word threshold and do not imply complete historical or scholarly treatment. Individual attraction/trail coordinates remain unverified and absent.

The expansion covers Colorado National Monument, Capulin Volcano, Chaco Culture, Appomattox Court House, Antietam, Lava Beds, Wind Cave, Bighorn Canyon, Hovenweep, Agate Fossil Beds, Scotts Bluff and Pipestone, alongside the eight earlier curated parks. Trail measurements retain one-way, round-trip, loop, approximate and park-segment context. No elevation gain is calculated by subtracting endpoint elevations. Four gains are explicitly described by their sources. Nine structured trails display unresolved distance conflicts, including six inherited from 0.7.1. Other unmeasured routes remain unknown.

Thirteen missing introductions were recovered: Fort Caroline, Statue of Liberty, White Sands, John D. Rockefeller Memorial Parkway, Lake Chelan, Ross Lake, Chicago Portage, Father Marquette, and five Brown v. Board associated schools/museums. New school histories and affiliation dates preserve separate ownership and classification. Other milestones distinguish authorization and designation; they do not replace earlier park identities or personal visit associations. Seventeen introductions still lack sufficient reviewed source material.

## Sources, failures and media

`scripts/evidence/acquired072*.json` and `follow072.json` retain official guide text, source URLs, actual retrieval timestamps and publication/update information present in source text. `release072-*.json` contains reviewed compiler inputs. `reviewed072.py`, `curated072.py` and `conflicts072.py` reproduce those inputs without network acquisition. Government text is attributed; original summaries are distinguished from official excerpts.

All 189 legacy failures were reviewed. The 105 previously observed HTTP 404s were retained without another dead-end request. The other 84 were attempted once using the bounded collector; none produced a verified article. `SOURCE_REVIEW072.json` distinguishes retained 404 evidence, unresolved verification and alternative sources for the same park/topic. Alternatives do not constitute recovery of a failed URL. Current NPS “Page In-Progress” responses are now explicitly recognized by future collection instead of being conflated with parser failures. New research candidates that failed are also retained, separately from the legacy 189. Acquisition checks robots, caps responses and timeouts, checkpoints progress and limits workers. Publication uses only reviewed inputs; an unsuccessful acquisition does not overwrite the working reference.

Four individually verified NPGallery photographs are bundled: Agate Fossil Beds bluffs, Cumberland Island's Dungeness ruins, Fort Union Trading Post museum tools, and a Great Basin bobcat camera-trap image. Their asset records explicitly declare public-domain status and identify NPS credits and park associations. Full rights evidence, attribution, original/download URLs, hashes and changes are retained in `media072-rights.json` and `release072-media.json`. The Great Basin candidate initially failed metadata parsing because its rights field was not followed by keywords; correcting that parser and checking its explicit license and credit allowed inclusion. No government-domain blanket license assumption was used. The four WebP thumbnails total **168,712 bytes**, have explicit alt text and dimensions, and load lazily. Embedded EXIF/XMP is preserved when supplied. Personal photographs use independent private storage.

## Experience, performance and safety

A dedicated Trails screen combines park, state/territory, region, published distance, difficulty, route type, supported scenery and personal-status filters. Unknown measurements/difficulty have explicit choices. Individual detail pages expose measurement basis, accessibility limitations, source differences and visitor context. An attraction can be added as a new incomplete itinerary stop using the existing schema; existing stops and visits are untouched. Missing saved attraction IDs stay preserved and are visibly identified in plan editing.

Search normalizes diacritics and punctuation, gives direct park-name matches priority and restricts exact full-state-name/postal-code searches to genuine state associations. Existing longest-name roster parsing protects West Virginia/Virginia and multi-state units. The offline atlas retains worldwide/territory coverage, designation/state/region/trail and personal filters, and its keyboard location selector. No paid map tiles, fabricated coordinates or routing estimates were added.

The searchable catalog is separated from detailed articles into 16 deterministic hash shards. Core search retains all article tokens, attractions, milestones and media metadata. A profile loads one cached detail shard, with retry after failure and compact native disclosure controls for long reading. Full reconstruction is validated against readable source. All shards and four bounded media files remain in Explorer's offline shell cache; splitting reduces catalog initialization while preserving offline text. Catalog failure also permits access to local personal records by saved identifiers. Explorer's handoff records actual Vite byte counts and Node timings; these are not Android measurements.

Compilation validates evidence, identity preservation, source keys, units, coordinate provenance and media rights/hash/size before atomically promoting a complete generated directory, with rollback on promotion failure. Public reference updates do not change the `national-parks` schema-1 namespace, Explorer backup format 3, personal photos, visits or FlavorQuest.

## Verification and remaining limits

The resumed release passed 14 targeted reference/UI tests, eight Python compiler safeguards and complete source/index validation. These cover lossless shard reconstruction, source/identity protection, invalid measurement/media rejection, failed-publication safety, combined trail filters, independent itinerary selections, unknown saved references, local-record fallback and available axe rules. The isolated DOM axe checks exclude color contrast and host-document landmarks; they are not accessibility certification. Explorer integration, TypeScript/build, Worker, offline and actual browser verification are recorded separately in the parent release handoff. Unchanged application suites were not rerun indiscriminately.

National coverage remains incomplete: 17 introductions, 189 failed legacy articles, most units without structured trails, unknown individual feature coordinates, and only four licensed images. Physical Galaxy S26, full assistive technology, real secure-browser restoration and live multi-window offline update acceptance remain environment-specific checks. These are not claimed as performed.

For 0.7.3, prioritize reviewed trails outside the present 20 units (especially Alaska, territories and underrepresented eastern units), additional missing introductions and nature coverage, authoritative measurement reconciliation, precise official feature geography and independently licensed imagery. Measure representative Android startup and interaction before choosing further partitioning changes.
