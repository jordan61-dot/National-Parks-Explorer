# National Parks Explorer

A reusable local-first Explorer application with a bundled official NPS catalog, interactive offline atlas, park profiles, visit journal, local photographs, statistics, saved destinations and ordered trip plans. This repository owns the public module and reference compiler. It contains no personal history or credentials.

## Development

Use Node 22 or later and Python 3. Run `npm ci`, `npm run check`, `npm test`, and `npm run reference:build`. See [DATA_SOURCES.md](DATA_SOURCES.md) for evidence, source licensing, refresh instructions and actual coverage. The test suite exercises validation, concurrency conflicts, image ownership, history previews, statistics, plans and reference integrity. Explorer additionally tests the real IndexedDB host, JSON and binary backups, corrupted restore handling, interruption recovery and namespace isolation.

## Host API 1

`createNationalParksModule(host)` returns an Explorer module manifest. The private Explorer host supplies atomic scoped storage, reporting, confirmation UI and local image optimization through `src/host.ts`. React is a peer dependency. The module owns namespace `national-parks`, schema 1; it never reads FlavorQuest stores. JSON and binary backup capability is declared through validated snapshot contracts. Automatic personal-record merge is deliberately unavailable; restoration uses Explorer's preview and confirmation flow.

Hosts consume an immutable Git commit in the lockfile. Source is TypeScript/React for bundling by the host. Public reference code loads lazily, then participates in Explorer's existing service-worker cache. No runtime network is needed for bundled reference, atlas, visits or plans. Official external links require connectivity.

## Delivery status

The missing domain, screen and data sources have been implemented and type-check and unit tests pass. Integrated release verification is recorded in Explorer's private Phase 7 handoff. Do not infer physical Android, assistive-technology or production acceptance from these module checks.

The complete official inventory is supplemented by dated offline article excerpts, verified named attractions, full-state-name search and explicit missing-topic notices. See the generated [coverage report](src/data/coverage.json) for measured totals. Detailed encyclopedia fields and trail attributes remain incomplete; the app labels missing coverage and links to official sources. Current conditions are never inferred from cached data.
