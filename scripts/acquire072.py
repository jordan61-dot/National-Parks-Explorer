"""Bounded resumable source research. Requires beautifulsoup4 for acquisition only.
No automatic promotion: reviewed records are a separate compiler input.
"""
import concurrent.futures,datetime,json,re,sys,time,threading
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.robotparser import RobotFileParser
from bs4 import BeautifulSoup
from details import write
from compile import E,ROOT
from expand import collect
GUIDES={
'agfo':'planyourvisit/outdooractivities.htm','scbl':'planyourvisit/hiking.htm','pipe':'planyourvisit/hiking.htm',
'fobu':'planyourvisit/hiking-trails.htm','colm':'planyourvisit/short-hiking-trails.htm','elma':'planyourvisit/hiking.htm',
'cavo':'planyourvisit/hiking.htm','coro':'planyourvisit/hiking.htm','chcu':'planyourvisit/hiking.htm',
'chir':'planyourvisit/hiking.htm','dino':'planyourvisit/hikingtrails.htm','grba':'planyourvisit/hiking-information.htm',
'bith':'planyourvisit/hiking.htm','cato':'planyourvisit/hiking.htm','apco':'planyourvisit/hiking-trails.htm',
'anti':'planyourvisit/hiking.htm','moru':'planyourvisit/hiking.htm','jeca':'planyourvisit/hiking.htm',
'wica':'planyourvisit/hiking.htm','pefo':'planyourvisit/hiking.htm','band':'planyourvisit/hiking.htm',
'labe':'planyourvisit/hiking.htm','pinn':'planyourvisit/hikingtrails.htm','cuis':'planyourvisit/hiking.htm',
'wefa':'planyourvisit/hiking.htm','shil':'planyourvisit/hiking.htm','hobe':'planyourvisit/hiking.htm',
'hove':'planyourvisit/hiking.htm','bica':'planyourvisit/hiking.htm','cure':'planyourvisit/hiking.htm'}
def main():
 robots=RobotFileParser();robots.parse(urlopen('https://www.nps.gov/robots.txt',timeout=20).read(200000).decode().splitlines())
 if '--review' in sys.argv:
  old=json.loads((E/'details.json').read_text());path=E/'review072.json';result=json.loads(path.read_text()) if path.exists() else {}
  # Historical 404s are retained with their evidence; no repeated dead-end retries.
  for u,p in old.items():
   if p.get('error') and p.get('status')==404:result.setdefault(u,{'status':'historical-404','evidence':p})
  urls=[u for u,p in old.items() if p.get('error') and u not in result]
  def get(u):return u,collect(u,robots)
 else:
  path=E/'acquired072.json';result=json.loads(path.read_text()) if path.exists() else {}
  urls=['https://www.nps.gov/'+c+'/'+p for c,p in GUIDES.items()]
  urls=[u for u in urls if u not in result]
  def get(u):
   now=datetime.datetime.now(datetime.timezone.utc).isoformat()
   try:
    if not robots.can_fetch('ExplorerReference',u):return u,{'error':'robots denied','attemptedAt':now}
    with urlopen(Request(u,headers={'User-Agent':'ExplorerReference/0.4 public-reference research'}),timeout=20) as r:
     raw=r.read(3000001);assert len(raw)<=3000000
     s=BeautifulSoup(raw,'html.parser');main=s.select_one('#main')
     if not main:return u,{'error':'no substantive main','attemptedAt':now}
     blocks=main.select('.ArticleTextGroup');text='\n'.join(x.get_text(' ',strip=True) for x in blocks)
     tables=[[row.get_text(' | ',strip=True) for row in t.select('tr')] for t in main.select('table')]
     sections=[{'heading':h.get_text(' ',strip=True),'text':' '.join(x.get_text(' ',strip=True) for x in h.find_next_siblings() if x.name not in ['script','style'])[:18000]} for h in main.select('h2,h3,h4')]
     return u,dict(title=main.h1.get_text(' ',strip=True) if main.h1 else '',text=text[:150000],tables=tables,sections=sections,links=[{'href':a.get('href'),'title':a.get_text(' ',strip=True)} for a in main.select('a[href]')],retrievedAt=now,finalUrl=r.url)
   except Exception as e:return u,{'error':str(e)[:150],'attemptedAt':now}
   finally:time.sleep(.4)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for i,(u,p) in enumerate(pool.map(get,urls),1):
   result[u]=p;write(path,result)
   print(i,len(urls),u,p.get('error',p.get('title','verified')),flush=True)
 print('Complete',len(result),flush=True)
if __name__=='__main__':main()
