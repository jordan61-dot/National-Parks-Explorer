"""Bounded, resumable follow-up collection from retained official links.

Each URL attempted once unless explicitly refreshed. Two workers, per-request
bounds, robots checks, status/redirect diagnostics and atomic checkpoints.
"""
import json, sys, datetime, concurrent.futures, time, threading
from urllib.parse import urljoin,urlparse,urldefrag
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
from urllib.robotparser import RobotFileParser
from compile import E,Page,clean,roster
from details import Article,write
from enrichment import topic
PAUSED=threading.Event()

def canonical(base,href):
 u=urldefrag(urljoin(base,href))[0]
 p=urlparse(u)
 if p.hostname not in {'www.nps.gov','nps.gov'} or p.scheme!='https' or p.query:return None
 return u.replace('https://nps.gov/','https://www.nps.gov/')

def collect(url,robots):
 now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 if PAUSED.is_set():return {'error':'Collection paused after rate limit','errorCategory':'rate-limit-pause','attemptedAt':now}
 if not robots.can_fetch('ExplorerReference',url):return {'error':'robots denied','errorCategory':'robots','attemptedAt':now}
 try:
  with urlopen(Request(url,headers={'User-Agent':'ExplorerReference/0.3 public-reference research'}),timeout=15) as r:
   raw=r.read(3000001)
   if len(raw)>3000000:raise ValueError('Response exceeds bound')
   final=r.url;status=r.status;raw=raw.decode('utf-8')
  expected=urlparse(url).path.split('/')[1];actual=urlparse(final).path.split('/')[1]
  if urlparse(final).hostname not in {'www.nps.gov','nps.gov'} or expected!=actual:return dict(error='Unverified redirect association',errorCategory='redirect-association',status=status,finalUrl=final,attemptedAt=now)
  a=Article();a.feed(raw);p=Page();p.feed(raw)
  title=clean(a.title);text=a.excerpt() or ' '.join(clean(p.description).split()[:180])
  import re
  document_title=re.search(r'<title[^>]*>(.*?)</title>',raw,re.S|re.I)
  if document_title and re.search(r'page in.progress',clean(document_title[1]),re.I):return dict(error='Official source page in progress',errorCategory='source-in-progress',status=status,finalUrl=final,attemptedAt=now,documentTitle=clean(document_title[1]))
  if not title or any(t in title.lower() for t in ['page not found','access denied','404']):return dict(error='No verified article',errorCategory='unverified-page',status=status,finalUrl=final,attemptedAt=now,documentTitle=clean(document_title[1]) if document_title else None)
  places={}
  for href,label in a.links:
   link=canonical(url,href)
   if link and '/places/' in link and clean(label):places[link]={'url':link,'title':clean(label)}
  import re
  updated=re.search(r'Last updated:\s*([^<]+)',raw)
  return dict(title=title,text=text,retrievedAt=now,lastUpdated=clean(updated[1]) if updated else None,places=list(places.values()),status=status,finalUrl=final,substantive=len(text.split())>10)
 except HTTPError as e:
  if e.code==429:PAUSED.set()
  category='missing-page' if e.code in {404,410} else 'rate-limited' if e.code==429 else 'unavailable' if e.code>=500 else 'http-error'
  return dict(error=type(e).__name__,errorCategory=category,status=e.code,attemptedAt=now)
 except Exception as e:return dict(error=type(e).__name__,errorCategory='response-bound' if isinstance(e,ValueError) else 'network',attemptedAt=now)
 finally:time.sleep(.3)

def main():
 robots=RobotFileParser()
 with urlopen(Request('https://www.nps.gov/robots.txt',headers={'User-Agent':'ExplorerReference/0.3'}),timeout=15) as r:robots.parse(r.read(200000).decode().splitlines())
 details=json.loads((E/'details.json').read_text());pages=json.loads((E/'pages.json').read_text())
 parks,_,_=roster((E/'roster.html').read_text());targets=set()
 for park in parks:
  for home in {park['website'],'https://www.nps.gov/'+park['parkCode']+'/index.htm'}:
   for href,title in pages.get(home,{}).get('links',[]):
    u=canonical(home,href)
    if u and park['parkCode'] and '/'+park['parkCode']+'/' in u and topic(u):targets.add(u)
 urls=sorted(u for u in targets if u not in details)
 if '--retry-failures' in sys.argv:urls=sorted(u for u,p in details.items() if p.get('error') and not p.get('attemptedAt'))
 limit=int(sys.argv[sys.argv.index('--limit')+1]) if '--limit' in sys.argv else 250
 urls=urls[:limit]
 def run(url):return url,collect(url,robots)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for i,(url,page) in enumerate(pool.map(run,urls),1):
   details[url]=page
   if i%10==0:write(E/'details.json',details);print(f'Articles {i}/{len(urls)}',flush=True)
 write(E/'details.json',details)
 places=json.loads((E/'places.json').read_text())
 urls=sorted({p['url'] for d in details.values() for p in d.get('places',[]) if p['url'] not in places})[:limit]
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for i,(url,page) in enumerate(pool.map(run,urls),1):
   places[url]=page
   if i%10==0:write(E/'places.json',places);print(f'Places {i}/{len(urls)}',flush=True)
 write(E/'places.json',places)
 print('Collection complete',flush=True)
if __name__=='__main__':main()
