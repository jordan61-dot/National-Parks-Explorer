# National Parks Explorer 0.13.0

Adds a destination discovery route with image-led cards and compact results, filters for state/territory, designation, classification, recorded trails or attractions and personal visit or saved status. All available reference records participate, including affiliated areas and records without coordinates or photos. Four previously bundled NPS images appear in a featured section with attribution; missing photos use neutral abstract graphics. Search shortcuts are explicitly text matches, not asserted subject classifications.

A keyboard-accessible modal previews a park and links to its profile, its first three recorded attractions and other parks with a shared listed state. State links navigate to the existing atlas using lowercase route codes. Search and filters are retained in memory while navigating within the session. No personal record is modified by browsing. Existing atlas geometry and gesture code are unchanged.

Validation: TypeScript and 61 module tests, including a new discovery/preview and filter-continuity test and the existing atlas suite. Browser preview checked Ohio discovery, a park preview and the Ohio atlas handoff; physical Android touch and TalkBack are unverified. Bundled image count remains four; no new external assets or dependencies are introduced.
