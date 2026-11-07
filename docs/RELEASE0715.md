# Explorer 0.7.15 / National Parks Explorer 0.14.0 — Atlas 3.0

Baseline: main 683b3c85cbb9d415f0c7de155eb818f1c9106db2; previous published module b9c3fbe6f6aa5c62e9be9dd0de9aab52a3f47a9f / 0.13.1. The photography branch and scheduled workflow are preserved separately.

Implemented: field-atlas land/water styling, adaptive geographic labels, verified offline relief, explicit high-contrast mode, modular layer controls, designation/visitation/reference-coverage marker styles, current-filter jurisdiction choropleths, exact accessible statistics, regional filters, official/affiliated summaries, itemized visitation progress, two-to-four jurisdiction comparisons, rich approved-photo previews, cluster member lists, focused search/inventories and filtered Discovery links. All 56 jurisdictions remain available. Existing administrative point semantics and full island-chain navigation are retained.

The viewport/gesture engine is preserved. Desktop park context uses a side panel; narrow screens use a dismissible bottom sheet. Controls collapse into named panels. Expanded view has keyboard focus containment, Escape dismissal, focus restoration and body-scroll management. Legends, exact tables, inventories and native selectors provide alternatives to visual encodings. Reduced-motion rules suppress transitions. No claim of complete WCAG conformance or hardware testing is made.

See [geographic documentation](GEOGRAPHY_ATLAS3.md) for source checksums, licensing, projection, regeneration, layer order, aggregation and missing-data semantics. No runtime dependency, paid service, storage schema or backup-format change is introduced. No private records are uploaded. Existing approved imagery is used; photo candidates are never imported.

Verification is recorded in the Explorer host release report after final immutable integration. Known coverage limitations: coarse generalized relief, no focused relief for AS/GU/MP/VI/DC, no park land polygons, live conditions, routable trails, elevation measurements, new hydrology or new photography. Physical Galaxy S26 and TalkBack checks require genuine device access; browser viewport tests cannot establish hardware behavior.
