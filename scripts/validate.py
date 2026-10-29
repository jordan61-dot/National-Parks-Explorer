"""Cross-check source associations, attributes and lossless compact output."""
import json
from urllib.parse import urlparse
from compile import ROOT

def validate():
 data=json.loads((ROOT/'src/data/parks.json').read_text());bundle=json.loads((ROOT/'src/data/compact.json').read_text())
 def unpack(v):
  if isinstance(v,dict):return bundle['strings'][v['$']] if set(v)=={'$'} else {k:unpack(x) for k,x in v.items()}
  if isinstance(v,list):return [unpack(x) for x in v]
  return v
 assert unpack(bundle['reference'])==data,'Compact reference differs'
 from release072 import validate as validate_generated
 validate_generated(data,ROOT)
 catalog=json.loads((ROOT/'src/data/catalog.json').read_text())
 def decode(b):
  def one(v):
   if isinstance(v,dict):return b['strings'][v['$']] if set(v)=={'$'} else {k:one(x) for k,x in v.items()}
   if isinstance(v,list):return [one(x) for x in v]
   return v
  return one(b['reference'])
 core=decode(catalog)
 shards=[decode(json.loads((ROOT/f'src/data/details-{i:02}.json').read_text())) for i in range(16)]
 restored=[]
 for p in core['units']:
  p=dict(p);detail=shards[p.pop('detailShard')][p['id']];p.pop('articleCount');p.pop('searchTerms');p.update(detail);restored.append(p)
 assert restored==data['units'],'Detail shards do not reconstruct reference'
 assert len({p['id'] for p in data['units']})==len(data['units'])
 for p in data['units']:
  assert len({(a['source'],a.get('sourceKey','')) for a in p['attractions']})==len(p['attractions']),p['id']
  assert len({a['id'] for a in p['attractions']})==len(p['attractions']),p['id']
  for a in p['articles']:
   assert a['text'].strip() and a['retrievedAt']
   assert urlparse(a['source']).hostname=='www.nps.gov'
   assert a.get('contentKind') in {'summary','official-excerpt'}
   assert any(s['url']==a['source'] for s in p['sources'])
  for a in p['attractions']:
   if 'length' in a:assert a['kind']=='trail' and a['length']['value']>0 and a['length']['method'] and a['length']['unit'] in {'mi','km'}
   assert ('latitude' in a)==('longitude' in a)
  for h in p.get('history',[]):assert h['date'] and h['event'] and h['retrievedAt'] and urlparse(h['source']).hostname=='www.nps.gov'
 print('PASS: reference identities, source associations, structured attributes and compact round trip')
if __name__=='__main__':validate()
