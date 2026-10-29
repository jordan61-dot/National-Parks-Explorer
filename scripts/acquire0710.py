"""Targeted, resumable NPS evidence acquisition; never run by the compiler."""
import concurrent.futures, datetime, hashlib, json, re, time, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [
 'alpo/planyourvisit/hiking-and-biking.htm', 'alpo/planyourvisit/lemon-tavern.htm',
 'alpo/planyourvisit/engine-house-6.htm', 'alpo/learn/historyculture/staplebend.htm',
 'hafe/planyourvisit/hikes.htm', 'places/john-brown-s-fort.htm',
 'hafe/learn/historyculture/storer-college.htm',
 'choh/planyourvisit/billy-goat-trail.htm', 'places/bluestone-turnpike-trail.htm',
 'indu/planyourvisit/hiking.htm',
 'places/bailly-homestead-chellberg-farm-little-calumet-river-mnoke-prairie-trails.htm',
 'indu/learn/historyculture/bailly_homestead.htm', 'indu/learn/historyculture/chellberg-farm.htm',
 'piro/planyourvisit/hikes.htm', 'places/miners-castle.htm', 'piro/planyourvisit/au-sable.htm',
 'maca/planyourvisit/visitor-center-area-and-south-side-trails.htm',
 'thingstodo/cedar-sink-trail.htm', 'maca/planyourvisit/mammoth-cave-map-guide.htm',
 'hocu/learn/historyculture/hopewell-mound-group.htm', 'places/seip.htm',
 'thingstodo/hiking-exploring-hopewell-mound-group.htm',
 'hafe/planyourvisit/maryland-heights-trail.htm',
 'hafe/planyourvisit/murphy-chambers-farm-trail.htm',
 'hafe/planyourvisit/schoolhouse-ridge-north-trail.htm',
 'hafe/planyourvisit/visitor-center-to-lower-town-trail.htm',
 'indu/planyourvisit/cb16.htm', 'indu/planyourvisit/cd16.htm',
 'indu/planyourvisit/dr16.htm', 'indu/planyourvisit/gm16.htm',
 'maca/planyourvisit/accessible-activities.htm', 'thingstodo/heritage-trail.htm',
 'maca/learn/news/heritage-trail-rehabilitation-project-for-mammoth-cave-national-park.htm',
]

class MainText(HTMLParser):
 def __init__(self):
  super().__init__(); self.active=False; self.depth=0; self.skip=0; self.parts=[]; self.links=[]; self.title=[]; self.in_title=False; self.root_tag=''
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if not self.active and (tag=='main' or a.get('id')=='main'): self.active=True; self.depth=1; self.root_tag=tag; return
  if not self.active:return
  if tag==self.root_tag:self.depth+=1
  if tag in {'script','style'}:self.skip+=1
  if tag=='h1':self.in_title=True
  if tag=='a' and a.get('href'):self.links.append(a['href'])
  if tag in {'h1','h2','h3','h4','p','li','tr','br','div'}:self.parts.append('\n')
 def handle_endtag(self,tag):
  if not self.active:return
  if tag in {'script','style'}:self.skip=max(0,self.skip-1)
  if tag=='h1':self.in_title=False
  if tag==self.root_tag:self.depth-=1
  if self.depth<=0:self.active=False
 def handle_data(self,data):
  if self.active and not self.skip:
   self.parts.append(data)
   if self.in_title:self.title.append(data)

def main():
 robots=RobotFileParser()
 with urlopen('https://www.nps.gov/robots.txt',timeout=20) as response:
  raw=response.read(200001);assert len(raw)<=200000;robots.parse(raw.decode().splitlines())
 path=ROOT/'scripts/evidence/acquired0710.json';results=json.loads(path.read_text()) if path.exists() else {}
 urls=['https://www.nps.gov/'+p for p in TARGETS if '--refresh' in sys.argv or 'https://www.nps.gov/'+p not in results]
 def get(url):
  now=datetime.datetime.now(datetime.timezone.utc).isoformat()
  try:
   if not robots.can_fetch('ExplorerReference',url):return url,dict(error='robots denied',attemptedAt=now)
   with urlopen(Request(url,headers={'User-Agent':'ExplorerReference/0.11 targeted public reference research'}),timeout=20) as response:
    raw=response.read(3000001);assert len(raw)<=3000000
    assert urlparse(response.url).hostname in {'www.nps.gov','home.nps.gov'}
    parser=MainText();parser.feed(raw.decode('utf-8'));text='\n'.join(re.sub(r'\s+',' ',x).strip() for x in ''.join(parser.parts).splitlines() if x.strip())
    assert len(text)>200 and parser.title,'Missing substantive main content'
    dates=re.findall(r'Last updated:\s*([^\n]+)',text)
    return url,dict(title=' '.join(parser.title).strip(),text=text,links=sorted(set(urljoin(url,x) for x in parser.links)),retrievedAt=now,finalUrl=response.url,sourceUpdated=dates[-1] if dates else None,responseSha256=hashlib.sha256(raw).hexdigest())
  except Exception as e:return url,dict(error=str(e)[:200],attemptedAt=now)
  finally:time.sleep(.5)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for url,value in pool.map(get,urls):
   results[url]=value;path.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print(url,value.get('error',value.get('title')),flush=True)
if __name__=='__main__':main()
