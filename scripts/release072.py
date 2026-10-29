"""Reviewed additions and deterministic, validated detail shards (no acquisition)."""
import copy, hashlib, json, re, shutil, tempfile, unicodedata
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

def normalized(s):
 return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip()

def merge(park, data):
 extra=data.get('parks',{}).get(park['id'],{})
 if extra.get('description') and not park['description']:
  assert extra.get('source') and extra.get('retrievedAt')
  park.update(description=extra['description'],descriptionKind='summary')
  if park['website'].endswith('/aboutus/national-park-system.htm'):park['website']=extra['source']
  park['sources'].append(dict(url=extra['source'],label='Official source for introduction summary',retrievedAt=extra['retrievedAt']))
 for a in extra.get('articles',[]):
  assert a['retrievedAt'] and a['contentKind']=='summary' and len(a['text'].split())>10
  if not any(x['source']==a['source'] and x['text']==a['text'] for x in park['articles']):park['articles'].append(a)
  if not any(s['url']==a['source'] for s in park['sources']):park['sources'].append(dict(url=a['source'],label='Official source for summary',retrievedAt=a['retrievedAt']))
 for a in extra.get('attractions',[]):
  assert urlparse(a['source']).hostname=='www.nps.gov' and a['retrievedAt'] and a['evidence']
  # Name reconciliation keeps the old identity when a new guide adds attributes.
  existing=next((x for x in park['attractions'] if normalized(x['name'])==normalized(a['name'])),None)
  value={k:v for k,v in a.items() if k not in {'evidence','id','pageMetadata'}}
  value['descriptionKind']=a.get('descriptionKind','summary')
  if existing:
   if existing['source']!=a['source']:value['relatedSources']=sorted(set(existing.get('relatedSources',[])+[existing['source']]))
   existing.update(value)
  else:
   key=a['source']+'#'+a.get('sourceKey','')
   park['attractions'].append(dict(id='place-'+hashlib.sha256(key.encode()).hexdigest()[:20],**value))
 for h in extra.get('history',[]):
  if h not in park.setdefault('history',[]):park['history'].append(h)
 if extra.get('photographs'):park['photographs']=extra['photographs']
 if any(a['kind']=='trail' for a in park['attractions']):park['activities']=sorted(set(park['activities']+['Hiking']))

def compact(value):
 strings=Counter()
 def count(v):
  if isinstance(v,str) and len(v)>=60:strings[v]+=1
  elif isinstance(v,dict):
   for x in v.values():count(x)
  elif isinstance(v,list):
   for x in v:count(x)
 count(value);table=sorted(s for s,n in strings.items() if n>1);indices={s:i for i,s in enumerate(table)}
 def pack(v):
  if isinstance(v,str) and v in indices:return {'$':indices[v]}
  if isinstance(v,dict):return {k:pack(x) for k,x in v.items()}
  if isinstance(v,list):return [pack(x) for x in v]
  return v
 return dict(strings=table,reference=pack(value))

def validate(data,root):
 ids=set()
 for p in data['units']:
  assert p['id'] not in ids;ids.add(p['id'])
  seen=set();names=set();keys=set()
  for a in p['attractions']:
   assert a['id'] not in seen;seen.add(a['id'])
   key=(a['source'],a.get('sourceKey',''));assert key not in keys,(p['id'],key);keys.add(key)
   assert urlparse(a['source']).scheme=='https' and urlparse(a['source']).hostname=='www.nps.gov'
   if a.get('length'):assert a['kind']=='trail' and a['length']['value']>0 and a['length']['unit'] in {'mi','km'} and a['length']['method']
   if 'latitude' in a:assert a.get('locationSource') and a.get('locationKind') and -90<=a['latitude']<=90 and -180<=a['longitude']<=180
  for photo in p.get('photographs',[]):
   assert photo['license'] and photo['credit'] and photo['alt'] and re.search(r'public domain',photo['rightsEvidence'],re.I) and urlparse(photo['source']).hostname=='npgallery.nps.gov'
   path=(root/photo['asset']).resolve();assert path.is_relative_to((root/'src/media072').resolve())
   assert path.stat().st_size<=200000 and hashlib.sha256(path.read_bytes()).hexdigest()==photo['sha256']
 baseline=json.loads((root/'docs/BASELINE072.json').read_text())['identities']
 assert set(baseline)==ids
 for p in data['units']:assert set(baseline[p['id']])<=set(a['id'] for a in p['attractions']),p['id']

def emit(root,result,coverage):
 validate(result,root)
 core=copy.deepcopy(result);shards=[{} for _ in range(16)]
 for p in core['units']:
  shard=int(hashlib.sha256(p['id'].encode()).hexdigest()[:2],16)%16
  p['detailShard']=shard;p['articleCount']=len(p['articles'])
  p['searchTerms']=' '.join(sorted(set(normalized(' '.join(a['text']+' '+a['title'] for a in p['articles'])).split())))
  shards[shard][p['id']]={k:p.pop(k) for k in ('articles','research','sources')}
  p.update(articles=[],research=[],sources=[{'url':result['rosterUrl'],'label':'Official NPS roster'}])
 # Validate everything before promoting a complete directory; rollback on failure.
 with tempfile.TemporaryDirectory(dir=root/'src') as temporary:
  target=Path(temporary)/'data';target.mkdir()
  values={'parks.json':result,'compact.json':compact(result),'catalog.json':compact(core),'coverage.json':coverage}
  values.update({f'details-{i:02}.json':compact(s) for i,s in enumerate(shards)})
  for name,value in values.items():(target/name).write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n')
  (target/'loaders.ts').write_text('export const detailLoaders = [\n'+''.join(f'()=>import("./details-{i:02}.json"),\n' for i in range(16))+'];\n')
  photos=[x for p in result['units'] for x in p.get('photographs',[])]
  (target/'media.ts').write_text('export const mediaImages:Record<string,string>={\n'+''.join(json.dumps(x['id'])+':new URL('+json.dumps('../media072/'+Path(x['asset']).name)+',import.meta.url).href,\n' for x in photos)+'};\n')
  current=root/'src/data';backup=Path(temporary)/'previous'
  current.rename(backup)
  try:target.rename(current)
  except BaseException:backup.rename(current);raise
