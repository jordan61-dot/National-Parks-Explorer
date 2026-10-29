# Explorer 0.7.11 / National Parks Explorer 0.12.0 — atlas redesign

Implemented as a focused display/navigation release on top of Explorer 0.7.10 / Parks 0.11.0. No public park IDs, source records, reference locations, visit history, backup format, or private collections changed.

## Atlas experience

- Full-width large-format U.S. and world outlines; on narrow screens the overview has a horizontally scrollable map rather than shrinking 400+ markers to phone width.
- Jurisdiction selection for all 50 states, District of Columbia, and American Samoa, Guam, Northern Mariana Islands, Puerto Rico and U.S. Virgin Islands.
- State-focused geographic window built from the bundled Natural Earth outline, with zoom and directional pan controls. Alaska and Hawaii continue to use clearly labeled inset geography in the U.S. overview.
- Five explicit territory navigation tiles on the default view. Focused territory maps use a coordinate grid and sourced park reference locations; **do not imply verified island coastlines or park boundaries**. World outline includes Puerto Rico but is too coarse for other island geography.
- Collision-aware grouping based on on-screen pixel distance, 44px keyboard/touch accessible markers, a selectable park group panel, state/territory park selector, visit-status coloring and reset/zoom controls.
- Zoom and map state are transient UI state; no storage migration, hidden data rewriting, paid map tiles, external runtime API or online service is required.

## Known limits and acceptance

Official administrative reference locations are not entrances, trailheads, park boundaries, or precise jurisdiction-constrained points. A shared multistate unit's official reference point may fall outside a particular state view; its listing remains available. The supplied Natural Earth geometry omits detailed U.S. territory shapes, hence the explicit point-grid interpretation. Physical Android and full screen-reader/device acceptance require separate verification.

Tests added for state focus, all five territories, screen-space marker collision separation, missing-coordinate listing, area switching and selected marker behavior.
