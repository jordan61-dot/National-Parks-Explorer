# Explorer 0.7.1 supplemental research

Research retrieved **October 28, 2026 (America/New_York, day precision)**; handoff finalized **2026-10-29 UTC**. The evidence root records retrieval timezone and precision; publication dates remain as reported by NPS. This is a bounded, manually curated addition to the existing evidence set.

## Changed paths and integration

- `scripts/evidence/supplemental.json` — new reviewed records only.
- `docs/RESEARCH071.md` — this source inventory, methodology, and quality report.

All eight park objects include an explicit `parkId` matching the checkout's roster. The eight selected codes each currently resolve to one roster entry; the explicit guards also prevent application to a differently listed unit if a code is shared later. No article, attraction, or milestone IDs are supplied. The parent integration owns URL-based identities and public-data generation.

No existing code or generated files were edited by this research task. No commit or push was made. Other changes visible in the shared checkout belong to the parallel compiler/UI work.

## Coverage

| Park code | Park | Summaries | Milestones | Named trail records | Published lengths retained |
| --- | --- | ---: | ---: | ---: | ---: |
| `neri` | New River Gorge National Park and Preserve | 3 | 2 | 3 | 1 |
| `cuva` | Cuyahoga Valley National Park | 3 | 2 | 2 | 0 |
| `acad` | Acadia National Park | 3 | 3 | 2 | 2 |
| `yose` | Yosemite National Park | 3 | 3 | 3 | 3 |
| `zion` | Zion National Park | 3 | 3 | 3 | 1 |
| `cong` | Congaree National Park | 3 | 3 | 2 | 2 |
| `hocu` | Hopewell Culture National Historical Park | 3 | 3 | 3 | 1 |
| `gumo` | Guadalupe Mountains National Park | 3 | 2 | 2 | 2 |
| **Total** | **8 parks** | **24** | **21** | **20** | **12** |

Each park has one summary on history/culture, one on nature/geology, and one on Indigenous heritage. Every trail has a primary official source URL, retrieval date, page metadata, an evidence excerpt, and at least one of length, difficulty, or accessibility. All 20 attraction source URLs are distinct. The records use **49 distinct primary NPS pages** in total.

Canonical filter tags were added where supported by the primary trail page: `forest` on 8 records, `geology` on 6, `overlook` on 5, `historic` on 4, and `waterfall` on 4. Existing descriptive tags remain. A waterfall tag can indicate a documented view of a waterfall, as on Cook's Meadow. A historic tag marks an identified historic or archaeological feature, such as the Nuttallburg Mine landscape or Hopewell earthworks. Tags were not inferred solely from a park's overall character.

## Research and retention method

- Used web search restricted by query to official NPS pages, followed by opening the retained pages and inspecting their substantive text, headings, captions, or accessibility sections. Both search engines were used, including the stronger engine for authoritative date checks and missing results. Every retained primary URL was successfully opened; failed candidate URLs were discarded.
- Used browsing only. No direct HTTP crawler, bulk fetch, robots exception, login, API key, or circumvention was used. Search discovery was broader than the retained set, but there was no recursive crawl.
- Summaries and trail descriptions are original paraphrases. All 24 articles are explicitly marked `contentKind: "summary"`.
- `evidence` contains short source fragments; semicolons separate fragments, and whitespace is normalized. Each structured trail has retained evidence. Quoted measurement context appears in `length.method`. Combined retained evidence fragments and measurement quotations stay below 200 words per primary source; the local check also verifies the stricter ceiling of 25 words.
- Every record has `pageMetadata` with the source page title, publisher, and content type. An observed page update date is retained where checked. A missing `lastUpdated` means it was not recorded, rather than that the page has never changed. Retrieval dates are actual browsing dates, not page publication dates.
- All retained source URLs use `https://www.nps.gov/` with tracking queries and fragments removed. Retained normalized URLs were opened directly, rather than being assumed equivalent to search results on `home.nps.gov`.
- Individual trail/place/activity pages are preferred for deduplication. Congaree's Weston Lake Trail uses the official trail index because it contains the route-specific entry. It is the only retained attraction using that index URL.
- No images, image downloads, image URLs, coordinates, derived elevations, guessed durations, inferred difficulty ratings, or invented route measurements were added. No image license claim is made.

## Measurements, date precision, and quality gaps

### Omitted or contextual measurements

| Trail | Decision and source limitation |
| --- | --- |
| Long Point Trail | Length omitted: the individual page pairs **1.6 miles** with **1.29 km** for the same one-way distance. The units disagree; neither was repaired or converted. Moderate difficulty and the documented overlook/forest features remain. |
| Sandstone Falls Boardwalk | Length omitted: the individual page lists **0.2 miles one way** in its length field and **0.25 mile** in its description. Accessible-boardwalk wording and the easy rating remain. |
| Brandywine Gorge Loop | Length omitted: the dedicated activity page gives **1.5 miles round trip**, while the park hiking table gives **1.4 miles**. The loop and its accessibility limitations are supported directly. |
| Ledges Trail | Length omitted: the dedicated Ledges page says **1.8 miles** around the formations; the park hiking table lists **2.2 miles** for Ledges Trail. The relationship between these measurements was not resolved. |
| Riverside Walk | Length omitted: the individual page's accessibility survey lists **1 mile one way**, while the spring 2026 park guide lists **2.2 miles round trip**. No conversion or reconciliation was imposed. |
| Pa'rus Trail | Length omitted: the individual page describes **3.5 miles from one end to the other**, yet its accessibility survey lists **1.6 miles one way**. The spring 2026 guide labels **3.5 miles round trip**. |
| Mound City Group nature trail | Length omitted: its page says **just under one mile**. An upper bound was not converted into a precise numeric length. |
| Hopeton Earthworks overlook trail | Length omitted: the primary activity page does not provide a numeric trail distance. The historical length of the parallel earthwork walls is not a hiking distance. |
| Endless Wall Trail | The retained **2.4 miles** is explicitly one way. It excludes the road return and the separately described shorter Diamond Point outing. |
| Mirror Lake Trail | The retained **2 miles** is the lake-and-back option. The same page's separate **5-mile** loop is not another record with the same URL. |
| Watchman Trail | The retained **3.3 miles round trip** is the published whole-hike description, not a sum or doubling of the separately assessed approach and overlook-loop segments. |
| Congaree Boardwalk Loop | The dedicated page, updated August 27, 2025, and the trail index both give **2.6 miles**. Older getaway text gives **2.4 miles** and was not used as measurement evidence. Retaining a route description does not verify construction completion or flood access. |
| Weston Lake Trail | The retained **4.5 miles round trip** comes from the named entry. NPS says index mileages are approximate and assume all trails are passable. |
| Hopewell Mound Group trails | The retained **about 2.5 miles** describes the site's trails. The record does not claim that it is a precisely measured perimeter loop. Its name is a descriptive label for the documented site trails. |
| Smith Spring Trail Loop | The overview rating is **Easy - Moderate**; the page also calls the hike moderate in its activity text. The overview wording is preserved. Only the section to Manzanita Spring is described as paved. |

Accessibility descriptions preserve route or segment qualifications. Examples include the eastern portion of Lower Yosemite Fall, the first loop at Ship Harbor, the unadapted museum connector off Pa'rus, and concrete steps at Mound City. Paved surfaces, accessible parking, or a short paved entrance were not generalized into wheelchair access for a whole trail. Accessibility surveys and page descriptions are snapshots, not current-condition guarantees.

### Historical dates

Dates retain source precision: year-only values are intentional for Acadia's three naming/protection stages, Yosemite's 1906 transfer, Congaree's 1917 logging cessation, and Guadalupe advocacy beginning in 1925. No January 1 placeholders were invented. Initial protection and later national park designation are separate records where both are sourced.

New River Gorge's designation is **December 27, 2020**, supported by NPS's systemwide changes table. The NPS geodiversity page instead gives January 20, 2021, and another park narrative says 2021. Those later dates were not adopted as the legal redesignation date; the geodiversity page is used only for its explicit November 10, 1978 establishment evidence.

Guadalupe's formal establishment is recorded as **September 30, 1972**. The cited anniversary page distinguishes it from congressional authorization six years earlier; no inferred authorization date was inserted. The 1925 advocacy record is a historical event, not legal protection.

The Yosemite history source is an NPS archived news release, marked `archived` in metadata and used for stable historical events only. Zion's monitoring-network page explicitly summarizes a 2004 plan; only its historical sequence and dates are used, not potentially outdated species counts, acreage, or management conditions.

### Remaining limits

- This is a curated eight-park sample, not complete nationwide trail, cultural, or historical coverage. Hopewell site trails are not split into invented individual routes.
- Contemporary Tribal relationships are directly represented where the retained pages support them, including Acadia, Cuyahoga Valley, Yosemite, Zion, and Guadalupe Mountains. The bounded NERI, Congaree, and Hopewell selections support archaeological or historical summaries but do not establish a comprehensive present-day affiliation list. No modern Tribe was assigned by inference, and Hopewell is explicitly not presented as a Tribal name.
- Summaries about Indigenous peoples are based on NPS interpretation; this task did not separately verify them against Tribal publications. It does not identify archaeological site coordinates or collect artifacts.
- Omitted optional fields remain absent. Surface descriptions are qualitative; no slope, elevation, ADA certification, open/closed status, permit status, or travel time was inferred.
- Live trail closures, weather, construction access, and service conditions require the linked park's current information. This evidence set makes no present-tense availability assertion.

## Exact retained primary sources

Every URL below is stored on one or more records in `supplemental.json`. Roles identify the material used; a shared page is listed once.

### NERI — 8 pages

| Role | Official source |
| --- | --- |
| History summary | [History & Culture](https://www.nps.gov/neri/learn/historyculture/index.htm) |
| Nature summary | [Nature & Science](https://www.nps.gov/neri/learn/nature/index.htm) |
| Indigenous summary | [Arrowheads of the Past and Present](https://www.nps.gov/neri/learn/historyculture/arrowheads-of-the-past-and-present.htm) |
| 1978 milestone | [NPS Geodiversity Atlas—New River Gorge National River, West Virginia](https://www.nps.gov/articles/nps-geodiversity-atlas-new-river-gorge-national-river-west-virginia.htm) |
| 2020 redesignation | [Recent Changes to the National Park System](https://www.nps.gov/aboutus/recent-changes.htm) |
| Trail | [Endless Wall Trail](https://www.nps.gov/places/endless-wall-trail.htm) |
| Trail | [Long Point Trail](https://www.nps.gov/places/long-point-trail.htm) |
| Trail | [Sandstone Falls Boardwalk](https://www.nps.gov/places/sandstone-falls-boardwalk.htm) |

### CUVA — 6 pages

| Role | Official source |
| --- | --- |
| History summary | [History & Culture](https://www.nps.gov/cuva/learn/historyculture/index.htm) |
| Nature summary | [Nature & Science](https://www.nps.gov/cuva/learn/nature/index.htm) |
| Indigenous summary | [Native American Heritage](https://www.nps.gov/cuva/learn/native-american-heritage.htm) |
| Both milestones | [Press Kit, Park Creation section](https://www.nps.gov/cuva/learn/news/presskit.htm) |
| Trail | [Hike the Brandywine Gorge Loop](https://www.nps.gov/thingstodo/hike-the-brandywine-gorge-loop.htm) |
| Trail | [The Ledges](https://www.nps.gov/cuva/the-ledges.htm) |

### ACAD — 5 pages

| Role | Official source |
| --- | --- |
| History summary and all milestones | [Founding Acadia](https://www.nps.gov/acad/learn/historyculture/founding.htm) |
| Nature summary | [Nature](https://www.nps.gov/acad/learn/nature/index.htm) |
| Indigenous summary | [Wabanaki Nations](https://www.nps.gov/acad/learn/historyculture/wabanaki.htm) |
| Trail | [Hike Jordan Pond Path](https://www.nps.gov/thingstodo/hike-jordan-pond-path.htm) |
| Trail | [Hike Ship Harbor Trail](https://www.nps.gov/thingstodo/hike-ship-harbor-trail.htm) |

### YOSE — 6 pages

| Role | Official source |
| --- | --- |
| History summary and all milestones | [Yosemite National Park Celebrates 120th Birthday on October 1](https://www.nps.gov/yose/learn/news/yose120.htm) |
| Nature summary | [Geology](https://www.nps.gov/yose/learn/nature/geology.htm) |
| Indigenous summary | [Surviving Communities](https://www.nps.gov/yose/learn/historyculture/surviving-communities.htm) |
| Trail | [Lower Yosemite Fall Trail](https://www.nps.gov/yose/planyourvisit/lowerfalltrail.htm) |
| Trail | [Cook's Meadow Loop](https://www.nps.gov/yose/planyourvisit/cooksmeadowtrail.htm) |
| Trail | [Mirror Lake Trail](https://www.nps.gov/yose/planyourvisit/mirrorlaketrail.htm) |

### ZION — 6 pages

| Role | Official source |
| --- | --- |
| History summary and all milestones | [Biophysical Description of Zion National Park](https://www.nps.gov/im/ncpn/bpd-zion.htm) |
| Nature summary | [Nature & Science](https://www.nps.gov/zion/learn/nature/index.htm) |
| Indigenous summary | [Archeology in Zion](https://www.nps.gov/zion/learn/historyculture/archeology-in-zion.htm) |
| Trail | [Watchman Trail](https://www.nps.gov/thingstodo/hike-watchman-trail.htm) |
| Trail | [Riverside Walk](https://www.nps.gov/thingstodo/hike-riverside-walk.htm) |
| Trail | [Pa'rus Trail](https://www.nps.gov/thingstodo/hike-pa-rus-trail.htm) |

### CONG — 5 pages

| Role | Official source |
| --- | --- |
| History/Indigenous summaries and logging milestone | [People in the Floodplain](https://www.nps.gov/cong/learn/historyculture/history-culture.htm) |
| Nature summary | [Nature & Science](https://www.nps.gov/cong/learn/nature/index.htm) |
| Protection/designation milestones | [NPS Geodiversity Atlas—Congaree National Park, South Carolina](https://www.nps.gov/articles/nps-geodiversity-atlas-congree-national-park.htm) |
| Trail | [Boardwalk Loop](https://www.nps.gov/cong/planyourvisit/boardwalk.htm) |
| Weston Lake Trail entry | [Trail Information](https://www.nps.gov/cong/planyourvisit/trail-information.htm) |

### HOCU — 7 pages

| Role | Official source |
| --- | --- |
| History summary and visitor-center dedication | [History & Culture](https://www.nps.gov/hocu/learn/historyculture/index.htm) |
| Nature summary | [Nature & Science](https://www.nps.gov/hocu/learn/nature/index.htm) |
| Indigenous summary | [Hopewell Earthworks](https://www.nps.gov/places/hopewell-earthworks.htm) |
| Protection/designation milestones | [NPS Geodiversity Atlas—Hopewell Culture National Historical Park, Ohio](https://www.nps.gov/articles/nps-geodiversity-atlas-hopewell-culture-national-historical-park-ohio.htm) |
| Site trails | [Hiking & Exploring Hopewell Mound Group](https://www.nps.gov/thingstodo/hiking-exploring-hopewell-mound-group.htm) |
| Nature trail | [Hiking & Exploring Mound City Group](https://www.nps.gov/thingstodo/hiking-exploring-mound-city-group.htm) |
| Overlook trail | [Hiking & Exploring Hopeton Earthworks](https://www.nps.gov/thingstodo/hiking-exploring-hopeton-earthworks.htm) |

### GUMO — 6 pages

| Role | Official source |
| --- | --- |
| History summary | [History & Culture](https://www.nps.gov/gumo/learn/historyculture/index.htm) |
| Nature summary | [Nature & Science](https://www.nps.gov/gumo/learn/nature/index.htm) |
| Indigenous summary | [Mescalero Apaches](https://www.nps.gov/gumo/learn/historyculture/apaches.htm) |
| Both milestones | [Preserving the Guadalupe Mountains](https://www.nps.gov/gumo/learn/historyculture/gumo50.htm) |
| Trail | [Smith Spring Trail Loop](https://www.nps.gov/thingstodo/gumo_hike_smith_springs_trail.htm) |
| Trail | [McKittrick Canyon Nature Trail](https://www.nps.gov/thingstodo/gumo_hike_mckittrick_canyon_nature_trail.htm) |

## Additional official pages used for conflict checks

These pages informed the omissions and caveats above; they are not additional retained attractions or primary article sources.

- [Cuyahoga Valley hiking table](https://www.nps.gov/cuva/planyourvisit/hiking.htm) — conflicting Brandywine and Ledges distances.
- [Zion spring 2026 information guide](https://www.nps.gov/zion/planyourvisit/upload/26-Spring-InfoGuide.pdf) — Riverside and Pa'rus round-trip context.
- [National Park Getaway: Congaree](https://www.nps.gov/articles/000/getaway-cong.htm) — older boardwalk distance.
- [Congaree boardwalk construction updates](https://www.nps.gov/cong/boardwalk-construction-updates.htm) — basis for withholding a construction-completion assertion.
- [A River Runs Through It](https://www.nps.gov/neri/a-river-runs-through-it.htm) — competing year for the NERI redesignation.

## Validation and handoff

Read-only checks validate JSON syntax and expected shape; roster/`parkId` alignment; eight required park entries; 24 summary markers; 21 permitted-kind milestones; 20 distinct trail URLs; 12 positive lengths with quoted measurement context; official HTTPS source hosts; parseable date precision; evidence and metadata on every trail; per-source excerpt ceilings; canonical tag counts; and coverage of every retained primary source by this inventory.

The checks do not regenerate the public dataset or modify compiler/UI files. Integration should keep the explicit park guards, assign IDs from primary URLs, and omit research-only evidence/metadata from shipped records according to the parent compiler's policy. Missing distances should remain missing until the official conflicts are resolved.
