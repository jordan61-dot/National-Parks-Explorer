"""Fetch only explicitly selected official follow-up URLs with resumable evidence."""
import concurrent.futures,datetime,json,time
from urllib.parse import urljoin,urlparse
from urllib.request import urlopen,Request
from urllib.robotparser import RobotFileParser
from bs4 import BeautifulSoup
from compile import E
from details import write
def main():
 robots=RobotFileParser();robots.parse(urlopen('https://www.nps.gov/robots.txt',timeout=20).read(200000).decode().splitlines())
 targets=json.loads((E/'targets072.json').read_text())
 acquired=json.loads((E/'acquired072.json').read_text())
 bica=next(p for u,p in acquired.items() if '/bica/' in u)
 targets+= [urljoin('https://www.nps.gov',a['href']) for a in bica['links'] if a['href'].startswith('/bica/planyourvisit/') and any(w in a['href'].lower() for w in ['trail','pond.htm'])]
 path=E/'follow072.json';data=json.loads(path.read_text()) if path.exists() else {}
 urls=sorted(set(targets)-set(data))
 def get(u):
  try:
   assert urlparse(u).hostname=='www.nps.gov' and robots.can_fetch('ExplorerReference',u)
   with urlopen(Request(u,headers={'User-Agent':'ExplorerReference/0.4 public-reference research'}),timeout=20) as r:
    raw=r.read(3000001);assert len(raw)<=3000000
    s=BeautifulSoup(raw,'html.parser');m=s.select_one('#main');assert m
    for el in m.select('script,style,nav,footer'):el.decompose()
    return u,dict(text=m.get_text(' ',strip=True)[:150000],title=s.title.get_text() if s.title else '',retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),finalUrl=r.url)
  except Exception as e:return u,dict(error=str(e)[:200],attemptedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
  finally:time.sleep(.4)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for u,p in pool.map(get,urls):data[u]=p;write(path,data);print(u,p.get('error',len(p['text']) if 'text' in p else ''),flush=True)
if __name__=='__main__':main()
