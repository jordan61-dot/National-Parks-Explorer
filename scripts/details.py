"""Resumeable official NPS enrichment. Extracted evidence stays separate from personal data."""
import json,re,datetime,concurrent.futures,sys
from html.parser import HTMLParser
from urllib.parse import urljoin,urlparse
from urllib.robotparser import RobotFileParser
from compile import E,ROOT,Page,fetch,clean,roster
from enrichment import candidates
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class Article(HTMLParser):
 def __init__(self):
  super().__init__();self.stack=[];self.parts=[];self.links=[];self.anchor=None;self.title='';self.heading=False;self.title_seen=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);parent=self.stack[-1] if self.stack else ('',False,False,False)
  main=parent[3] or a.get('id')=='main'
  active=parent[1] or ('ArticleTextGroup' in a.get('class','') and 'CaptionedImage' not in a.get('class','')) or 'nps-park-header__description' in a.get('class','')
  hidden=parent[2] or tag in {'script','style','figure','figcaption','nav'} or 'visually-hidden' in a.get('class','')
  if tag not in VOID:self.stack.append((tag,active,hidden,main))
  if tag=='h1' and main and not hidden and not self.title_seen and 'modal-title' not in a.get('class',''):self.heading=True;self.title_seen=True
  if tag=='a' and main and not hidden:self.anchor=[a.get('href',''),'']
  if active and tag in {'p','li','br','h2','h3','h4'}:self.parts.append('\n')
 def handle_data(self,data):
  if self.heading:self.title+=data
  if self.anchor:self.anchor[1]+=data
  if self.stack and self.stack[-1][1] and not self.stack[-1][2]:self.parts.append(data)
 def handle_endtag(self,tag):
  if tag=='h1':self.heading=False
  if tag=='a' and self.anchor:self.links.append(self.anchor);self.anchor=None
  if tag in {'p','li','h2','h3','h4'}:self.parts.append('\n')
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==tag:self.stack=self.stack[:i];break
 def excerpt(self):
  words=clean(' '.join(self.parts)).split();return ' '.join(words[:180])+(' …' if len(words)>180 else '')
def targets():
 parks,_,_=roster((E/'roster.html').read_text());pages=json.loads((E/'pages.json').read_text())
 return {p['id']:candidates(p,pages.get(p['website'],{})) for p in parks}
def write(path,data):
 temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n');temp.replace(path)
def main():
 robots=RobotFileParser();robots.parse(fetch('https://www.nps.gov/robots.txt').splitlines())
 path=E/'pages.json';pages=json.loads(path.read_text())
 parks,_,_=roster((E/'roster.html').read_text())
 for park in parks:
  if park['parkCode'] and urlparse(park['website']).hostname=='www.nps.gov':pages.setdefault('https://www.nps.gov/'+park['parkCode']+'/index.htm',{})
 def home(url):
  old=pages[url]
  if old.get('retrievedAt') and '--refresh' not in sys.argv:return url,old
  try:
   if not robots.can_fetch('ExplorerReference',url):return url,{**old,'error':'robots denied'}
   raw=fetch(url);p=Page();p.feed(raw);a=Article();a.feed(raw)
   return url,dict(description=max([p.description,a.excerpt()],key=len),links=[link for link in p.links if any(t in link[0] for t in ['/planyourvisit/','/learn/historyculture/','/learn/nature/'])],retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
  except Exception as e:return url,{**old,'error':type(e).__name__}
 if '--details-only' not in sys.argv:
  with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
   for i,(url,page) in enumerate(pool.map(home,sorted(pages)),1):
    pages[url]=page
    if i%25==0:write(path,pages);print(f'Homepages {i}/{len(pages)}',flush=True)
  write(path,pages)
 if '--homes-only' in sys.argv:return
 chosen=targets();path=E/'details.json';old=json.loads(path.read_text()) if path.exists() else {};data=dict(old)
 urls=sorted({u for choices in chosen.values() for urls in choices.values() for u in urls})
 if '--repair-titles' in sys.argv:urls=[u for u in urls if 'Embed Video' in old.get(u,{}).get('title','')]
 if '--batch' in sys.argv:
  n=int(sys.argv[sys.argv.index('--batch')+1]);urls=[u for u in urls if u not in old][:n]
 def collect(url):
  if old.get(url,{}).get('retrievedAt') and '--refresh' not in sys.argv and '--repair-titles' not in sys.argv:return url,old[url]
  try:
   if not robots.can_fetch('ExplorerReference',url):return url,{'error':'robots denied'}
   raw=fetch(url);a=Article();a.feed(raw);p=Page();p.feed(raw);updated=re.search(r'Last updated:\s*([^<]+)',raw)
   text=a.excerpt() or ' '.join(clean(p.description).split()[:180]);links=[];seen=set()
   if not clean(a.title) or re.search(r'page not found|page you requested|404|access denied',a.title,re.I):return url,{'error':'No verified article'}
   for href,title in a.links:
    href=urljoin(url,href);title=clean(title)
    if href.startswith('https://www.nps.gov/places/') and href not in seen and title:seen.add(href);links.append({'url':href,'title':title})
   return url,dict(title=clean(a.title),text=text,retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),lastUpdated=clean(updated[1]) if updated else None,places=links)
  except Exception as e:return url,{**old.get(url,{}),'error':type(e).__name__}
 with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
  for i,(url,page) in enumerate(pool.map(collect,urls),1):
   data[url]=page
   if i%25==0:write(path,data);print(f'Details {i}/{len(urls)}',flush=True)
 write(path,data)
 print(json.dumps({'pages':len(data),'withText':sum(bool(p.get('text')) for p in data.values()),'errors':sum(bool(p.get('error')) for p in data.values())}))
if __name__=='__main__':main()
