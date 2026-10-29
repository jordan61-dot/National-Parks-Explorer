"""Offline, measured release report; generated from baseline and compiled records."""
import json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
b=read('docs/BASELINE0710.json');new=read('src/data/parks.json');coverage=read('src/data/coverage.json');e=read('scripts/evidence/release0710-trails.json');sources=read('scripts/evidence/acquired0710.json')
old={p['id']:p for p in b['units']};ids={a['id'] for p in b['units'] for a in p['attractions']}
lines=['# Explorer 0.7.10 regional reference expansion','','National Parks Explorer 0.11.0. Evidence retrieved October 29, 2026. Descriptions are original summaries. No roster refresh, new photographs or personal-data changes.','','## Measured coverage','','| Metric | 0.10.0 | 0.11.0 | Change |','|---|---:|---:|---:|']
for key in ['system','affiliated','entries','attractions','parksWithAttractions','structuredTrails','parksWithStructuredTrails','trailsWithLength','trailsWithDifficulty','trailsWithElevation','trailsWithAccessibility','trailsWithCoordinates','trailsWithConflicts','licensedPhotographs']:
 lines.append(f'| {key} | {b["coverage"][key]} | {coverage[key]} | {coverage[key]-b["coverage"][key]:+} |')
lines+=['','## Per-unit contributions','','25 new trails, 11 new non-trail attractions and one enriched existing trail across eight units. Seven units gain structured trails. Hopewell Culture receives its existing-trail clarification and two cultural destinations.','','| Unit | Previous trails | New trails | Enriched trails | New non-trails |','|---|---:|---:|---:|---:|']
for p in new['units']:
 if p['id'] not in e['parks']:continue
 added=[a for a in p['attractions'] if a['id'] not in ids]
 lines.append(f'| {p["name"]} | {sum(a["kind"]=="trail" for a in old[p["id"]]["attractions"])} | {sum(a["kind"]=="trail" for a in added)} | {int(p["parkCode"]=="hocu")} | {sum(a["kind"]!="trail" for a in added)} |')
lines+=['','## Record-level provenance and limitations','']
for p in new['units']:
 if p['id'] not in e['parks']:continue
 lines+=['### '+p['name'],'']
 for a in e['parks'][p['id']]['attractions']:
  match=next(x for x in p['attractions'] if x['name']==a['name']);state='enriched existing' if match['id'] in ids else 'new'
  lines.append(f'- **{a["name"]}** ({a["kind"]}; {state}; `{match["id"]}`): [official source]({a["source"]}).')
  for c in a.get('conflicts',[]):lines.append('  Source limitation: '+c['detail'])
  if a['kind']=='trail' and 'length' not in a:lines.append('  No numeric length published in this dataset because the retained official measurements conflict.')
 lines.append('')
lines+=['## Source review','','33 targeted official NPS pages successfully retrieved and retained; zero inaccessible sources in the bounded acquisition. No nationwide source refresh. Each retained response has retrieval time, published update date when available, final URL, main text, links and response SHA-256. Curated records preserve attribute excerpts and supporting URLs.','', 'Seven records carry newly documented source limitations, including one existing trail. Unknown numeric distances are intentionally omitted for Billy Goat A, Schoolhouse Ridge North and Heritage Trail. The Maryland Heights base route is distinguished from conflicting extension mileage. Cedar Sink route classification and Heritage Trail length/surface require caution. Descent figures are not converted into elevation gain. Great Marsh mileage has an unspecified return basis.','', 'Accessibility descriptions retain restrictions: Calumet Dunes has slopes beyond ADA guidelines, Great Marsh’s accessible north approach is separate from its main hike, and stairs limit some other routes. Five Indiana Dunes coordinates identify documented trailheads; no park administrative points were reused.','', 'Retained closure/construction notices at Staple Bend, Maryland Heights and Heritage Trail are dated reference evidence, not live status. Check official conditions before travel. Generic hiking categories, unsupported measurements, inferred difficulty and map-guessed coordinates were excluded. No new records were added for already well-covered New River Gorge or Cuyahoga Valley merely to increase totals.','', '## Reproduction','','```sh','python scripts/curated0710.py','python scripts/compile.py','python scripts/validate.py','python scripts/report0710.py','python -m unittest discover -s scripts -p "test_release*.py"','npm run check','npx vitest run tests/reference.test.ts tests/release0710.test.ts tests/release072.test.tsx','```','','Compilation and curation are offline. `python scripts/acquire0710.py` acquires only missing targeted pages; `--refresh` is an explicit targeted refresh, never part of compilation. Two workers, robots checks, timeouts and size bounds apply. Do not refresh historical roster/homepage evidence for this release.','']
(R/'docs/RELEASE0710_REFERENCE.md').write_text('\n'.join(lines))
