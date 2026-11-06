"""Release gate for five independently sourced images for every reference unit.

Counts only the four established baseline photos and accepted 0.7.14.3 evidence;
quarantined candidates are never counted. Exit 1 while any park is short.
"""
import argparse,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];E=ROOT/'scripts/evidence'
def build_report(parks,collections):
 rows=[]
 for park in parks:
  seen=set();photos=[]
  for collection in collections:
   for photo in collection.get('parks',{}).get(park['id'],{}).get('photographs',[]):
    identity=(photo.get('id'),photo.get('source'),photo.get('sha256'))
    if any(not v for v in identity) or any(any(a==b for a,b in zip(identity,old)) for old in seen):raise ValueError('Missing or duplicate photo identity for '+park['id'])
    seen.add(identity);photos.append(photo)
  rows.append({'parkId':park['id'],'name':park['name'],'classification':park['classification'],'photographs':len(photos),'needed':max(0,5-len(photos))})
 missing=[r for r in rows if r['needed']];return {'targetPerPark':5,'totalParks':len(rows),'parksWithAtLeastFive':len(rows)-len(missing),'photos':sum(r['photographs'] for r in rows),'additionalPhotosNeeded':sum(r['needed'] for r in rows),'missing':missing}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--json',action='store_true');args=parser.parse_args()
 parks=json.loads((ROOT/'src/data/parks.json').read_text())['units'];sources=[]
 for name in ('release072-media.json','release072z-photo07143.json','release072zz-commons07143.json'):
  path=E/name
  if path.exists():sources.append(json.loads(path.read_text()))
 report=build_report(parks,sources)
 if args.json:print(json.dumps(report,ensure_ascii=False,indent=2))
 else:
  print(f"{report['parksWithAtLeastFive']} of {report['totalParks']} units have at least five photos; {report['photos']} accepted photos; at least {report['additionalPhotosNeeded']} more needed.")
  for row in report['missing'][:15]:print(f"  {row['name']}: {row['photographs']}/5")
  if len(report['missing'])>15:print(f"  ... {len(report['missing'])-15} more units below target")
 return int(bool(report['missing']))
if __name__=='__main__':sys.exit(main())
