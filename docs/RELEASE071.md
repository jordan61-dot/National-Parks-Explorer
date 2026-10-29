# National Parks Explorer 0.3.0 — Explorer 0.7.1

October 28, 2026, America/New_York. This release extends the verified `ffc6514ffd2edb11a0d5dfb7f474a490be55e111` baseline. Public module code and evidence remain authoritative here; Explorer consumes a commit-addressed archive with SHA-512 lockfile integrity. No personal records, private historical sources or photographs are included.

## Reference coverage

| Measure | 0.2.0 | 0.3.0 |
| --- | ---: | ---: |
| Official system units | 434 | 434 |
| Affiliated areas | 33 | 33 |
| Substantive introductions | 437 | 437 |
| Entries with offline articles | 435 | 436 |
| Offline article sections | 1,858 | 2,375 |
| Entries with history/culture | 378 | 385 |
| Entries with nature/geology | 296 | 297 |
| Entries with accessibility | 409 | 410 |
| Entries with activities/trails | 349 | 350 |
| Named attraction records | 156 | 261 |
| Trails with length, difficulty or accessibility | 0 | 20 |
| Administrative reference points | 429 | 429 |
| Licensed reference photographs integrated | 0 | 0 |
| Article URLs attempted | 2,400 | 2,700 |
| Article retrieval/verification failures | 188 | 189 |
| Verified place pages | 201 | 238 |
| Duplicate attraction source URLs within a park | 0 | 0 |

The new evidence covers 300 additional official article URLs and 37 additional place pages. All 188 original failures were revisited once: one accessibility page was recovered, and two newly attempted pages failed verification. Remaining failures are 105 HTTP 404 pages and 84 pages lacking a verified article heading. No rate-limit or network failure remains in the current attempted set. These classifications describe retrieval evidence, not a claim that every remaining page is permanently unavailable. Non-substantive pages do not become articles merely because HTTP returned success.

The curated eight-park supplement adds 24 original history, nature and Indigenous-heritage summaries, 21 dated historical milestones and 20 trail records. Twelve trail records have published numeric lengths with route/approximation context. Inconsistent NPS measurements remain omitted; limitations are documented in [the research inventory](RESEARCH071.md). All 467 original park IDs and all 156 original attraction IDs are retained. Exact duplicate excerpts are omitted within a park; shared administrative websites can still legitimately produce repeated text across separately listed units.

## Experience and performance

Catalog and atlas add region and evidence-based trail filters alongside state, designation, scope and personal status. Attraction discovery combines park, state, trail attributes and personal records. Search caches normalized text, supports diacritics and prioritizes direct name matches. Historical names in sourced milestone text participate in search.

Profiles add keyboard-operable section navigation with focus targets, separate original summaries from official excerpts, distinguish historical designation stages, expose trail route context and accessibility limitations, and collapse repetitive source lists. Touch controls have 44-pixel minimum heights; mobile filters use one column. Geographic points retain their administrative labels and worldwide/territory atlas coverage. No entrance, trailhead, boundary or attraction coordinates are invented.

The compiler emits a lossless compact serialization of the readable reference. Python validation and TypeScript tests compare the full decoded result. Explorer's release handoff measures its production chunk, gzip size and cached-search timings; increased content is not presented as a smaller download without evidence. Offline loading remains lazy and compatible with the host's existing service-worker safeguards.

No imagery was reused without verified rights. The NPS ownership policy permits many federal works but explicitly identifies third-party exceptions; licensed reference photographs remain a gap. No paid infrastructure, API key or developer account is required.

## Verification

Fresh TypeScript checking, 22 public-module tests, 13 Python compiler tests, reference consistency checks and a byte-for-byte repeated compilation pass. Tests include compact serialization, evidence-only trail filtering, alternate article deduplication, canonical URLs, status classification and rate-limit pause behavior, stable identities, repeated unknown-date visits, stale edits, image relationships, trip plans and isolated UI behavior. Automated axe checks pass on catalog, profile and attraction discovery with color contrast and host landmarks explicitly excluded from the isolated DOM test.

Explorer must pin the exact published revision and run its own integration, backup/restore, production build, offline simulation and compiled Worker checks before deploying. Physical Galaxy S26, full assistive-technology testing and real multi-window offline upgrade acceptance remain unverified and are deferred by the owner. This repository does not claim those host/device checks.

## Next priorities

Expand source-reviewed trail coverage beyond the eight curated parks; resolve conflicting official route measurements; improve the 30 missing introductions and thin-topic coverage; verify individual media rights and accurate feature coordinates; investigate the 84 unverified article pages without manufacturing content; and split deeper article content further if measured phone performance warrants it. Preserve the pinned dependency and stable personal associations throughout.
