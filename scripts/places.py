"""Retain verified titles and excerpts for places linked by collected NPS pages."""
import json,re,sys,datetime,concurrent.futures
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser
from compile import E,fetch,Page,clean
from details import Article,write

def main():
 data=json.loads((E/'details.json').read_text())
 path=E/'places.json';places=json.loads(path.read_text()) if path.exists() else {}
 urls=sorted({p['url'] for page in data.values() for p in page.get('places',[]) if urlparse(p['url']).hostname=='www.nps.gov'})
 if '--repair-titles' in sys.argv:urls=[u for u in urls if 'Embed Video' in places.get(u,{}).get('title','')]
 robots=RobotFileParser();robots.parse(fetch('https://www.nps.gov/robots.txt').splitlines())
 def collect(url):
  if places.get(url,{}).get('retrievedAt') and '--refresh' not in sys.argv and '--repair-titles' not in sys.argv:return url,places[url]
  try:
   if not robots.can_fetch('ExplorerReference',url):return url,{'error':'robots denied'}
   raw=fetch(url);a=Article();a.feed(raw);p=Page();p.feed(raw)
   title=clean(a.title);text=max([a.excerpt(),' '.join(clean(p.description).split()[:180])],key=len)
   if not title or re.search(r'page not found|404|access denied',title,re.I):return url,{'error':'No verified title'}
   return url,dict(title=title,text=text if len(text.split())>10 else '',retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
  except Exception as e:return url,{'error':type(e).__name__}
 with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
  for i,(url,page) in enumerate(pool.map(collect,urls),1):
   places[url]=page
   if i%25==0:write(path,places);print(f'Places {i}/{len(urls)}',flush=True)
 write(path,places)
 print(json.dumps({'places':len(places),'verifiedTitles':sum(bool(p.get('title')) for p in places.values())}))
if __name__=='__main__':main()
