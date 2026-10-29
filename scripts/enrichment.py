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

def enrich(park, page, details, slug, places=None):
 places=places or {}
 park['articles']=[]
 seen={a['source'] for a in park['attractions']};ids={a['id'] for a in park['attractions']}
 selected=candidates(park,page)
 for url in sorted(details):
  subject=topic(url)
  if subject and park['parkCode'] and urlparse(url).hostname=='www.nps.gov' and urlparse(url).path.startswith('/'+park['parkCode']+'/'):
   selected.setdefault(subject,[])
   if url not in selected[subject]:selected[subject].append(url)
 article_texts=set()
 for subject,urls in selected.items():
  for url in urls:
   add_evidence(park,subject,url,details.get(url,{}),places,seen,ids,article_texts)

def add_evidence(park,subject,url,evidence,places,seen,ids,article_texts):
  if not evidence.get('retrievedAt') or evidence.get('error'):return
  text=evidence.get('text','')
  if len(text.split())>10 and text not in article_texts:
   park['articles'].append(dict(topic=subject,title=evidence.get('title') or subject,text=text,source=url,retrievedAt=evidence['retrievedAt'],lastUpdated=evidence.get('lastUpdated'),contentKind='official-excerpt'))
   article_texts.add(text)
  park['sources'].append(dict(url=url,label='Official NPS '+subject,retrievedAt=evidence['retrievedAt']))
  for place in evidence.get('places',[]):
   source=place['url'];place_evidence=places.get(source,{});name=(place_evidence.get('title') or place['title']).strip()
   if re.fullmatch(r'(full description|learn more|read more|more|details|click here)',name,re.I):continue
   if place_evidence.get('error'):continue
   if not place_evidence.get('title') or not place_evidence.get('retrievedAt'):continue
   if urlparse(source).hostname!='www.nps.gov' or not urlparse(source).path.startswith('/places/') or not name or source in seen:continue
   ident='place-'+hashlib.sha256(source.encode()).hexdigest()[:20]
   if ident in ids:ident=ident[:65]+'-'+hashlib.sha256(source.encode()).hexdigest()[:10]
   lower=name.lower();kind='place'
   for pattern,value in [('trail','trail'),('visitor center','visitor-center'),('visitor centre','visitor-center'),('overlook','overlook'),('waterfall','waterfall'),(' falls','waterfall'),('scenic drive','scenic-drive'),('museum','museum'),('cave','cave'),('fort ','fort'),('battlefield','battlefield'),('monument','monument')]:
    if re.search(r'\b'+re.escape(pattern.strip())+r'\b',lower):kind=value;break
   park['attractions'].append(dict(id=ident,name=name,kind=kind,description=place_evidence.get('text') or 'Linked by the official park '+subject.lower()+' page. See the source for its relationship to the park, details and current access.',descriptionKind='official-excerpt' if place_evidence.get('text') else 'reference-note',source=source,retrievedAt=place_evidence.get('retrievedAt',evidence['retrievedAt'])))
   seen.add(source);ids.add(ident)

def supplement(park,data):
 """Reviewed summaries and attributes. Existing URL identities always win."""
 extra=data.get('parks',{}).get(park['parkCode'],{})
 # Shared administrative codes may describe different separately listed units.
 if extra.get('parkId') and extra['parkId']!=park['id']:return
 for a in extra.get('articles',[]):
  if not a.get('retrievedAt') or a.get('contentKind')!='summary':raise ValueError('Summary requires provenance')
  if not any(x['source']==a['source'] and x['text']==a['text'] for x in park['articles']):park['articles'].append({k:v for k,v in a.items() if k not in {'evidence','pageMetadata'}})
  if not any(s['url']==a['source'] for s in park['sources']):park['sources'].append(dict(url=a['source'],label='Official NPS source for summary',retrievedAt=a['retrievedAt']))
 if extra.get('history'):park['history']=[{k:v for k,v in h.items() if k not in {'evidence','pageMetadata'}} for h in extra['history']]
 for a in extra.get('attractions',[]):
  if urlparse(a['source']).hostname!='www.nps.gov' or not a.get('retrievedAt'):raise ValueError('Attraction requires official provenance')
  existing=next((x for x in park['attractions'] if x['source']==a['source']),None)
  value={k:v for k,v in a.items() if k not in {'evidence','id','pageMetadata'}}
  value['descriptionKind']='summary'
  if existing:existing.update(value)
  else:park['attractions'].append(dict(id='place-'+hashlib.sha256(a['source'].encode()).hexdigest()[:20],**value))
 park['activities']=sorted(set(park['activities'])|({'Hiking'} if any(a['kind']=='trail' for a in park['attractions']) else set()))
