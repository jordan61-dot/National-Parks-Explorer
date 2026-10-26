# National Parks Explorer

Reusable local-first Explorer module and public National Park Service reference pipeline. This repository is the authoritative source for the module. Explorer's private parent repository consumes a pinned, integrity-checked snapshot. No personal visit history, photographs, credentials, or private Explorer fixtures belong here.

Development status: Phase 7 implementation in progress. Production readiness is not claimed by this checkpoint.

Host API 1 supplies independently scoped persistent storage, shared UI, error reporting, and local image optimization. React is a peer dependency. Public reference snapshots and their attribution are separate from user-owned visits and trip plans.

Run `npm install`, `npm run check`, and `npm test`. Reference-refresh and integration instructions will be recorded with the verified release.
