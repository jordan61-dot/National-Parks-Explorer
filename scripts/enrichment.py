"""Compile retained official article evidence without network or personal data."""
import re, hashlib
from urllib.parse import urljoin, urlparse

def topic(url):
 if '/learn/historyculture/' in url:return 'History & culture'
 if '/learn/nature/' in url:return 'Nature & geology'
 if 'accessib' in url.lower():return 'Accessibility'
 if 'directions' in url.lower():return 'Directions & access'
 if re.search(r'(hiking|trails|things2do)',url):return 'Activities & trails'
 return None

TOPICS={'History & culture':'learn/historyculture/index.htm','Nature & geology':'learn/nature/index.htm','Accessibility':'planyourvisit/accessibility.htm','Directions & access':'planyourvisit/directions.htm','Activities & trails':'planyourvisit/things2do.htm'}
def candidates(park,page):
 selected=selections(park,page);result={}
 for label,path in TOPICS.items():
  urls=[]
  if park['parkCode'] and urlparse(park['website']).hostname=='www.nps.gov':urls.append('https://www.nps.gov/'+park['parkCode']+'/'+path)
  if selected.get(label) and selected[label] not in urls:urls.append(selected[label])
  if urls:result[label]=urls
 return result

def selections(park, page):
 selected={}
 for href,title in sorted(page.get('links',[]),key=lambda x:0 if x[0].endswith('/index.htm') else 1):
  url=urljoin(park['website'],href).removesuffix('#');t=topic(url)
  if t and t not in selected and urlparse(url).hostname=='www.nps.gov' and park['parkCode'] and '/'+park['parkCode']+'/' in url:selected[t]=url
 return selected

def enrich(park, page, details, slug):
 park['articles']=[]
 seen={a['source'] for a in park['attractions']};ids={a['id'] for a in park['attractions']}
 for subject,urls in candidates(park,page).items():
  url=next((u for u in urls if details.get(u,{}).get('text') and details.get(u,{}).get('retrievedAt')),urls[0])
  evidence=details.get(url,{})
  if not evidence.get('text') or not evidence.get('retrievedAt'):continue
  park['articles'].append(dict(topic=subject,title=evidence.get('title') or subject,text=evidence['text'],source=url,retrievedAt=evidence['retrievedAt'],lastUpdated=evidence.get('lastUpdated')))
  park['sources'].append(dict(url=url,label='Official NPS '+subject,retrievedAt=evidence['retrievedAt']))
  for place in evidence.get('places',[]):
   source=place['url'];name=place['title'].strip()
   if urlparse(source).hostname!='www.nps.gov' or not urlparse(source).path.startswith('/places/') or not name or source in seen:continue
   ident='place-'+hashlib.sha256(source.encode()).hexdigest()[:20]
   if ident in ids:ident=ident[:65]+'-'+hashlib.sha256(source.encode()).hexdigest()[:10]
   lower=name.lower();kind='place'
   for pattern,value in [('trail','trail'),('visitor center','visitor-center'),('visitor centre','visitor-center'),('overlook','overlook'),('waterfall','waterfall'),('scenic drive','scenic-drive')]:
    if pattern in lower:kind=value;break
   park['attractions'].append(dict(id=ident,name=name,kind=kind,description='Linked by the official park '+subject.lower()+' page. See the source for its relationship to the park, details and current access.',source=source,retrievedAt=evidence['retrievedAt']))
   seen.add(source);ids.add(ident)
