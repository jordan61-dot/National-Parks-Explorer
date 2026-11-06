"""Stage source-documented NPS photo candidates for visual and geographic review.

The collector uses public NPGallery search, then rechecks each individual asset page.
It respects robots.txt, uses bounded requests, stops on rate limits, and preserves
previously collected metadata and files. Candidates are not counted or published until reviewed.
"""
import argparse, datetime, hashlib, io, json, os, re, time, urllib.error, urllib.parse, urllib.request, urllib.robotparser
from html.parser import HTMLParser
from pathlib import Path
from PIL import Image
from release072 import explicit_photo_location,normalized

ROOT=Path(__file__).resolve().parents[1]; E=ROOT/'scripts/evidence'; PHOTO=E/'release072z-photo07143.json'; CANDIDATES=E/'photo07143-candidates.json'; QUARANTINE=E/'photo07143-quarantine.json'; REPORT=E/'photo07143-report.json'; IMG=ROOT/'src/media072'
AGENT='ExplorerParkPhotoResearch/0.7.14.3 (https://github.com/jordan61-dot/National-Parks-Explorer; reference photo collection)'
class Text(HTMLParser):
 def __init__(self):super().__init__();self.text=[]
 def handle_data(self,value):self.text.append(value)
def plain(html):
 p=Text();p.feed(html);return ' '.join(' '.join(p.text).split())
def label(raw,name):
 m=re.search(r'<label[^>]*>\s*'+re.escape(name)+r':\s*</label>\s*<div[^>]*>(.*?)</div>',raw,re.I|re.S)
 return plain(m.group(1)) if m else ''
def norm(v):return re.sub(r'[^a-z0-9]','',v.casefold())
def read(url,limit=3000000):
 time.sleep(.45)
 req=urllib.request.Request(url,headers={'User-Agent':AGENT,'Accept':'text/html,image/jpeg;q=0.9,*/*;q=0.5'})
 with urllib.request.urlopen(req,timeout=35) as r:
  b=r.read(limit+1)
  if len(b)>limit:raise ValueError('response exceeds size limit')
  return b

def check_robots():
 """Fail closed when the policy cannot be fetched or explicitly parsed."""
 url='https://npgallery.nps.gov/robots.txt'
 try:
  policy=read(url,500000).decode('utf-8','strict')
 except urllib.error.HTTPError as exc:
  if exc.code in (404,410):return
  raise SystemExit('Cannot verify NPGallery robots policy: HTTP '+str(exc.code)) from exc
 except (OSError, ValueError, UnicodeError) as exc:
  raise SystemExit('Cannot verify NPGallery robots policy: '+str(exc)) from exc
 robots=urllib.robotparser.RobotFileParser(url)
 robots.parse(policy.splitlines())
 if not robots.entries and not robots.default_entry:
  raise SystemExit('Cannot verify NPGallery robots policy: no rules found')
 for path in ('SearchResults','AssetDetail/example','GetAsset/example/proxylores.jpg'):
  if not robots.can_fetch(AGENT,'https://npgallery.nps.gov/'+path):
   raise SystemExit('NPGallery robots denies '+path)

def save(path,value):
 tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');os.replace(tmp,path)

def search(park,page=1):
 params={'allFields':park['name'],'allFieldsFormat':'AllWords','PageSize':60,'filters':'default','view':'grid','Page':page}
 url='https://npgallery.nps.gov/SearchResults?'+urllib.parse.urlencode(params)
 raw=read(url).decode('utf-8','replace'); marker='var search = '; pos=raw.index(marker)+len(marker)
 data,_=json.JSONDecoder().raw_decode(raw[pos:]); return [v.get('Asset',{}) for v in data.get('Results',[])]
def candidate_priority(asset):
 """Prefer identifiable views; ordering is only triage, never approval."""
 text=(asset.get('Title') or '')+' '+(asset.get('AltText') or '')
 scenic=bool(re.search(r'\b(landscape|overlook|battlefield|trail|fort|historic building|monument|memorial|coast|mountain|river|forest|entrance|visitor center)\b',text,re.I))
 event=bool(re.search(r'\b(event|festival|reenact|interpreter|volunteer|display|cookies|recipe|presentation|costume|portrait)\b',text,re.I))
 return (event,not scenic)

def candidates(park):
 found_assets=[]
 for page in range(1,4):
  found=search(park,page)
  if not found:break
  found_assets.extend(found)
 yield from sorted(found_assets,key=candidate_priority)

def acceptable(a,park):
 rights=a.get('ConstraintsInformation') or {}; credit=a.get('PhotoCredit') or a.get('Photographer') or '';units=a.get('NPSUnits') or []
 return (a.get('PrimaryType')=='image' and re.fullmatch(r'[0-9a-fA-F-]{36}',a.get('AssetID','')) and
         rights.get('Constraint','').casefold()=='public domain' and rights.get('GrantingRights','').casefold()=='full' and
         any(norm(u.get('Name',''))==norm(park['name']) and (not park['parkCode'] or u.get('Code','').lower()==park['parkCode'].lower()) for u in units) and
         bool(re.search(r'\bNPS\b|National Park Service',credit,re.I)) and not re.search(r'©|copyright|courtesy',credit,re.I) and
         bool((a.get('AltText') or '').strip()) and bool((a.get('Title') or '').strip()) and not re.search(r'\b(poster|painting|illustration|drawing|diagram|graphic|map|logo)\b',a.get('Title','')+' '+a.get('AltText',''),re.I) and explicit_photo_location(park,a.get('Title',''),a.get('AltText','')))
def acquire(a,park,seen,description_location=False,site_description=None,allow_uncredited=False):
 ident=a['AssetID'].lower(); source='https://npgallery.nps.gov/AssetDetail/'+ident
 html=read(source,2000000).decode('utf-8','replace'); rights=label(html,'Constraints Information');units=label(html,'NPS Units'); credit=label(html,'PhotoCredit') or label(html,'Photographer');title=label(html,'Title');alt=label(html,'AltText');description=label(html,'Description')
 if not re.search(r'^Public domain\s*:\s*Full Granting Rights$',rights,re.I):raise ValueError('asset page lacks explicit public-domain full rights')
 exact_unit=norm(park['name']) in norm(units) and (not park['parkCode'] or re.search(r'\bCode:\s*'+re.escape(park['parkCode'])+r'\b',units,re.I))
 # Some NPS cultural landscape assets are catalogued NPS-wide but begin their
 # actual description with the exact location. This is an opt-in manual path.
 exact_description=description_location and normalized(description).startswith(normalized(park['name'])+' ') and (exact_unit or bool(re.search(r'\bNPS-wide\b',units,re.I)))
 exact_site=site_description=='Stones River National Cemetery' and park['id']=='stones-river-national-battlefield' and exact_unit and normalized(description).startswith(normalized(site_description)+' ')
 grady_site=site_description=='Grady Monument' and park['id']=='moores-creek-national-battlefield' and exact_unit and 'grady monument' in normalized(title+' '+alt)
 if not (exact_unit or exact_description):raise ValueError('asset page does not identify exact unit or an explicit NPS-wide source location')
 if not credit and allow_uncredited:credit='Photographer unknown; source: NPS Gallery'
 elif not re.search(r'\bNPS\b|National Park Service',credit,re.I) or re.search(r'©|copyright|courtesy',credit,re.I):raise ValueError('ambiguous author credit')
 if not title or not alt:raise ValueError('title or descriptive alternative text missing')
 if not explicit_photo_location(park,title,alt) and not exact_description and not exact_site and not grady_site:raise ValueError('title and alternative text do not explicitly identify this park')
 m=re.search(r'href="([^"]*/proxylores\.jpg[^\"]*)"',html,re.I)
 if not m:raise ValueError('no verified small image')
 download=urllib.parse.urljoin(source,m.group(1))
 parsed=urllib.parse.urlparse(download)
 if parsed.scheme!='https' or parsed.hostname!='npgallery.nps.gov' or not parsed.path.startswith('/GetAsset/'):raise ValueError('untrusted asset URL')
 image=Image.open(io.BytesIO(read(download,2000000)));image.load();image.thumbnail((700,700));out=io.BytesIO();kwargs={k:image.info[k] for k in ('exif','xmp') if k in image.info};image.save(out,'WEBP',quality=80,**kwargs); blob=out.getvalue()
 if len(blob)>200000:raise ValueError('converted image exceeds size limit')
 sha=hashlib.sha256(blob).hexdigest()
 if sha in seen:raise ValueError('duplicate image content')
 dest=IMG/('photo07143-'+ident+'.webp');dest.write_bytes(blob);now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 return dict(id='photo07143-'+ident,asset='src/media072/'+dest.name,source=source,sourcePageSha256=hashlib.sha256(html.encode('utf-8')).hexdigest(),originalSource='https://npgallery.nps.gov/GetAsset/'+ident+'/original.jpg',downloadUrl=download,retrievedAt=now,alt=alt[:1500],caption=title[:500],credit=credit[:300],license='Public domain (NPS asset declaration)',licenseUrl='https://www.nps.gov/aboutus/disclaimer.htm',rightsEvidence=rights,unitEvidence=units,locationEvidence=('Grady Monument: https://www.nps.gov/mocr/planyourvisit/park-brochure.htm' if grady_site else description[:1500] if (exact_description or exact_site) else 'Park name or distinctive park name appears in the NPS title or alternative text; NPS asset explicitly identifies this unit.'),locationMethod='nps-grady-site' if grady_site else ('nps-site-description' if exact_site else ('nps-description' if exact_description else 'nps-unit')),width=image.width,height=image.height,sha256=sha,bytes=len(blob),changes='Resized NPS small version and encoded WebP; no visual alteration. Embedded EXIF/XMP preserved where present.')
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--limit',type=int,default=10);parser.add_argument('--candidate-limit',type=int,default=10);parser.add_argument('--park',action='append',default=[]);args=parser.parse_args();IMG.mkdir(exist_ok=True)
 if args.candidate_limit < 1:parser.error('--candidate-limit must be positive')
 check_robots()
 parks=json.loads((ROOT/'src/data/parks.json').read_text())['units']; existing=json.loads(PHOTO.read_text()) if PHOTO.exists() else {'parks':{}}; report=json.loads(REPORT.read_text()) if REPORT.exists() else {'parks':{}};pending=json.loads(CANDIDATES.read_text()) if CANDIDATES.exists() else {'parks':{}};quarantine=json.loads(QUARANTINE.read_text()) if QUARANTINE.exists() else {'parks':{}};existing072=json.loads((E/'release072-media.json').read_text())['parks'];commons_file=E/'release072zz-commons07143.json';commons=json.loads(commons_file.read_text())['parks'] if commons_file.exists() else {}
 # A checkpoint may omit unreviewed binaries. Never let stale metadata prevent
 # their safe reacquisition, and never treat it as evidence of a downloaded file.
 for unit in pending['parks'].values():
  unit['photographs']=[p for p in unit.get('photographs',[]) if (ROOT/p['asset']).is_file() and hashlib.sha256((ROOT/p['asset']).read_bytes()).hexdigest()==p['sha256']]
 seen={p['sha256'] for source in (existing072,commons,existing['parks'],pending['parks']) for v in source.values() for p in v.get('photographs',[])}
 parks=[p for p in parks if (not args.park or p['id'] in args.park) and len(existing072.get(p['id'],{}).get('photographs',[]))+len(commons.get(p['id'],{}).get('photographs',[]))+len(existing['parks'].get(p['id'],{}).get('photographs',[]))<5][:args.limit]
 for park in parks:
  base=existing072.get(park['id'],{}).get('photographs',[])+commons.get(park['id'],{}).get('photographs',[])+existing['parks'].get(park['id'],{}).get('photographs',[]);entry=pending['parks'].setdefault(park['id'],{'photographs':[]});base_ids={p['id'] for p in base};entry['photographs']=[p for p in entry['photographs'] if p['id'] not in base_ids];photos=entry['photographs']; rejected=[x['photo'] for x in quarantine['parks'].get(park['id'],[])];errors=[];titles={norm(p['caption']) for p in base+photos+rejected};alts={norm(p['alt']) for p in base+photos+rejected};ids={p['id'] for p in base+photos+rejected}
  try:
   for a in candidates(park):
    if len(base)+len(photos)>=args.candidate_limit:break
    if not acceptable(a,park) or 'photo07143-'+a['AssetID'].lower() in ids or norm(a['Title']) in titles or norm(a['AltText']) in alts:continue
    try:
     p=acquire(a,park,seen);photos.append(p);seen.add(p['sha256']);titles.add(norm(p['caption']));alts.add(norm(p['alt']));ids.add(p['id']);save(CANDIDATES,pending);print('  staged candidate',park['id'],p['caption'],flush=True)
    except urllib.error.HTTPError as e:
     if e.code in (403,429,503):raise
     errors.append('asset '+a['AssetID']+': HTTP '+str(e.code))
    except Exception as e:errors.append('asset '+a.get('AssetID','?')+': '+str(e))
  except urllib.error.HTTPError as e:
   errors.append('search or source HTTP '+str(e.code)); report['parks'][park['id']]={'accepted':len(base),'candidates':len(photos),'lastChecked':datetime.datetime.now(datetime.timezone.utc).isoformat(),'errors':errors};save(CANDIDATES,pending);save(REPORT,report)
   if e.code in (403,429,503):raise SystemExit('Stopped on rate limit or service unavailable')
  except Exception as e:errors.append('search failed: '+str(e))
  report['parks'][park['id']]={'accepted':len(base),'candidates':len(photos),'lastChecked':datetime.datetime.now(datetime.timezone.utc).isoformat(),'errors':errors};save(CANDIDATES,pending);save(REPORT,report);print('park',park['id'],'accepted',len(base),'candidates',len(photos),'issues',len(errors),flush=True)
if __name__=='__main__':main()
