# Explorer 0.7.11 / National Parks Explorer 0.12.0: atlas redesign

Based on Explorer 0.7.10 and National Parks Explorer 0.11.0. The exploratory atlas branch was reviewed and extended; it was not treated as a completed release. No reference records, IDs, storage schemas, backups, visit records, photographs, trip plans or FlavorQuest data changed.

## Atlas

The map now has a wide national overview, Alaska and Hawaii insets, clickable state outlines, a 56-jurisdiction selector, a larger dedicated state or territory map and an expanded overlay. The atlas defaults to both official units and affiliated areas, so American Memorial Park in the Northern Mariana Islands is discoverable. Search and classification, geography, designation and visited filters remain available above the atlas. Counts describe the currently filtered results; visited means an itemized recorded visit, not a complete historical estimate.

Focused maps include all 50 states, D.C. and all five inhabited territories. Hawaii, American Samoa and the Northern Mariana Islands default to their main islands and offer the entire chain. Every reference record remains in the searchable non-map list, including places without coordinates and multistate parks whose administrative point is outside the selected jurisdiction. No park locations were fabricated. Markers identify administrative reference points, not entrances or park boundaries.

Markers group using screen-space 44px targets and a 52px collision buffer. Group lists permit selecting individual parks, including identical coordinates; zooming can split nearby groups. Pointer gestures, pinch, wheel, zoom, directional pan, reset, selected park details and profile links are supported. Zoom and selected area are transient; no storage write is required. The map has an accessible list, marker labels, focus indicators, visual legend, reduced-motion handling and light/dark styling.

## Geographic data and offline behavior

Focused jurisdiction outlines derive from the U.S. Census Bureau's [2025 1:500,000 cartographic boundary state and equivalent entities file](https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_state_500k.zip), public domain. Source archive SHA-256: `9cbfe171dad1555e11770c981d8f4db9e687a65c86f5bdae684eeb487e2e9b80`. The offline build script `scripts/build-atlas-boundaries.py` uses pyshp 3.1.6, longitude wrapping, per-jurisdiction equirectangular projection and Douglas–Peucker simplification of 0.0015 projected degrees; geometry is generalized for display. National/world outlines remain Natural Earth public domain; NPS Land Resources Division administrative points retain CC BY 4.0 attribution. No mapping API, paid service, runtime network request or account is needed.

## Validation and limitations

The 0.7.10 baseline contains 434 official units and 33 affiliated areas; all 467 IDs and reference records remain unchanged. The atlas reports 429 records with reference coordinates and 38 without at the unfiltered baseline. Some administrative points are outside an associated state and remain selectable in the list. Boundary generation reproduces byte-for-byte from the stated archive. The module suite, compiler validation, host integration, offline tests, build and browser acceptance are documented in the host release record after execution.

Browser checks use desktop and 393 × 852 / 852 × 393 CSS pixel frames, not a physical Samsung Galaxy S26. Physical touch/pinch, device performance, operating-system fullscreen, TalkBack and comprehensive assistive technology acceptance remain unverified. Expanded map is an in-app full-window overlay, not a native OS fullscreen request. The national mobile map can scroll horizontally; focused state/territory views fit the viewport. Coastlines are generalized and are not authoritative legal boundaries. Dated NPS reference material is not live closure or access information.
