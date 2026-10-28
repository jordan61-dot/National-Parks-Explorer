"""Rebuild the public reference from official, retained source evidence.
Use --refresh to retrieve current sources. No credentials or personal data.
"""
import json,re,html,hashlib,unicodedata,sys,datetime,concurrent.futures
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse,urljoin
from html.parser import HTMLParser
from enrichment import enrich
ROOT=Path(__file__).resolve().parents[1]; E=ROOT/'scripts/evidence'; E.mkdir(exist_ok=True)
ROSTER='https://www.nps.gov/aboutus/national-park-system.htm'
POINTS='https://services1.arcgis.com/fBc8EJBxQRMcHlei/ArcGIS/rest/services/NPS_Land_Resources_Division_Boundary_and_Tract_Data_Service/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=json'
def fetch(url):
 with urlopen(Request(url,headers={'User-Agent':'ExplorerReference/0.1 public-reference compiler'}),timeout=25) as r:
  data=r.read(6000000)
  if len(data)>=6000000: raise ValueError('Response exceeds bound')
  return data.decode('utf-8')
def clean(s): return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]*>',' ',s))).strip()
def slug(s):
 s=re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
 return s if len(s)<=80 else s[:70].rstrip('-')+'-'+hashlib.sha256(s.encode()).hexdigest()[:8]
def roster(raw):
 counts={};parks=[]
 blocks=re.findall(r'<button[^>]*aria-controls="([^"]+)"[^>]*>(.*?)</button>',raw,re.S)
 names={'National Parks':'National Park','Other Designations':'Other Designation','Affiliated Areas':'Affiliated Area','National Wild and Scenic Rivers':'National Wild and Scenic River'}
 for ident,heading in blocks:
  match=re.fullmatch(r'(.+) \((\d+)\)',clean(heading))
  if not match: continue
  label,total=match[1],int(match[2])
  if label=='Authorized Areas': break
  body=re.search(r'<div id="'+re.escape(ident)+r'"[^>]*>(.*?)</div>',raw,re.S)
  if not body: raise ValueError('Missing roster section')
  rows=[s for s in re.split(r'<br\s*/?>|</p>',body[1]) if clean(s)]
  if len(rows)!=total: raise ValueError(f'{label}: {len(rows)} != {total}')
  counts[label]=total
  for row in rows:
   text=clean(row); anchors=re.findall(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>',row,re.S)
   if anchors and 'Klondike Gold Rush' not in text: name=clean(anchors[0][1]); location=text[len(name):].lstrip(', ')
   else:
    split=re.search(r', (?=(?:'+ '|'.join(re.escape(v) for v in STATE.values()) +r'|Canada)\b)',text)
    if not split:raise ValueError('No recognizable location in '+text)
    name,location=text[:split.start()],text[split.end():]
   links=[urljoin(ROSTER,html.unescape(a[0])) for a in anchors];website=links[0] if links else ROSTER
   match=re.search(r'nps.gov/([a-z]{4})/',website);code=match[1] if match else ''
   states=[k for k,v in STATE.items() if re.search(r'\b'+re.escape(v)+r'\b',location)]
   parks.append(dict(id=('john-d-rockefeller' if name=='John D. Rockefeller, Jr. Memorial Parkway' else slug(name)),parkCode=code,name=name,designation=names.get(label,label[:-1]),classification='affiliated' if label=='Affiliated Areas' else 'system-unit',states=states,website=website,description='',sources=[dict(url=ROSTER,label='Official NPS roster')],research=[],activities=[],topics=[],attractions=[],coverageNote='Roster location: '+location+'. Detailed visitor coverage may be incomplete.'))
 published=int(re.search(r'manages\s+(\d+)\s+individual units',clean(raw))[1])
 assert sum(p['classification']=='system-unit' for p in parks)==published
 assert len({p['id'] for p in parks})==len(parks)
 return parks,counts,published
STATE=dict(x.split(':',1) for x in 'AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|DC:District of Columbia|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming|AS:American Samoa|GU:Guam|MP:Saipan|PR:Puerto Rico|VI:Virgin Islands'.split('|'))
class Page(HTMLParser):
 def __init__(self): super().__init__();self.description='';self.links=[];self.link=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta' and (a.get('name','').lower()=='description' or a.get('property','').lower()=='og:description') and len(a.get('content',''))>len(self.description): self.description=a.get('content','')
  if tag=='a': self.link=[a.get('href',''),'']
 def handle_data(self,data):
  if self.link:self.link[1]+=data
 def handle_endtag(self,tag):
  if tag=='a' and self.link:self.links.append(self.link);self.link=None
def main():
 if '--refresh' in sys.argv:
  from urllib.robotparser import RobotFileParser
  robots=RobotFileParser(); robots.parse(fetch('https://www.nps.gov/robots.txt').splitlines())
  if not robots.can_fetch('ExplorerReference',ROSTER):raise ValueError('Robots denies roster')
  raw=fetch(ROSTER);(E/'roster.html').write_text(raw);(E/'date.txt').write_text(datetime.datetime.now(datetime.timezone.utc).isoformat())
  parks,_,_=roster(raw)
  def home(url):
   try:
    if not robots.can_fetch('ExplorerReference',url):return url,{'error':'robots denied'}
    p=Page();p.feed(fetch(url));return url,{'description':p.description,'links':[link for link in p.links if any(t in link[0] for t in ['/planyourvisit/','/learn/historyculture/','/learn/nature/'])]}
   except Exception as e:return url,{'error':type(e).__name__}
  urls=sorted({p['website'] for p in parks if p['website'].startswith('https://www.nps.gov/') and p['website']!=ROSTER})
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: pages=dict(pool.map(home,urls))
  (E/'pages.json').write_text(json.dumps(pages,ensure_ascii=False,separators=(',',':')))
  (E/'points.json').write_text(fetch(POINTS))
 parks,counts,total=roster((E/'roster.html').read_text());pages=json.loads((E/'pages.json').read_text()) if (E/'pages.json').exists() else {}
 points=json.loads((E/'points.json').read_text()).get('features',[]) if (E/'points.json').exists() else []
 details=json.loads((E/'details.json').read_text()) if (E/'details.json').exists() else {}
 for p in parks:
  page=pages.get(p['website'],{});p['description']=clean(page.get('description',''))
  if p['description']:p['sources'].append(dict(url=p['website'],label='Official NPS park homepage'))
  seen=set()
  for href,title in page.get('links',[]):
   url=urljoin(p['website'],href); title=clean(title)
   if urlparse(url).hostname=='www.nps.gov' and p['parkCode'] and '/'+p['parkCode']+'/' in url and any(t in url for t in ['/planyourvisit/','/learn/historyculture/','/learn/nature/']) and title and url not in seen:
    seen.add(url);p['research'].append(dict(title=title,url=url))
  p['research']=p['research'][:25]
  extra=E/(p['parkCode']+'-hiking.html')
  if p['parkCode'] and extra.exists():
   seen_attractions=set()
   for href,title in re.findall(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>',extra.read_text(),re.S):
    title=clean(title);href=html.unescape(href)
    if href.startswith('https://www.nps.gov/places/') and title.endswith('Trail') and href not in seen_attractions:
     seen_attractions.add(href);p['attractions'].append(dict(id=slug(title),name=title,kind='trail',description='Listed by the official park hiking guide. Check the linked trail page for route details and current access.',source=href))
   p['sources'].append(dict(url='https://www.nps.gov/'+p['parkCode']+'/planyourvisit/hiking.htm',label='Official hiking guide; individual trails linked'))
  enrich(p,page,details,slug)
  exact=[f for f in points if slug(f['attributes'].get('UNIT_NAME',''))==slug(p['name'])]
  matching=exact or [f for f in points if p['parkCode'] and f['attributes'].get('UNIT_CODE','').lower()==p['parkCode']]
  if len(matching)==1:
   g=matching[0].get('geometry',{});lat=g.get('y');lon=g.get('x')
   if isinstance(lat,(float,int)) and isinstance(lon,(float,int)) and -90<=lat<=90 and -180<=lon<=180:p['location']=dict(latitude=lat,longitude=lon,kind='Administrative reference point; not an entrance or trailhead',source=POINTS)
  if not p['description']:p['coverageNote']+=' No description retrieved.'
 result=dict(formatVersion=1,retrievedAt=(E/'date.txt').read_text().strip(),rosterUrl=ROSTER,publishedSystemTotal=total,headingCounts=counts,attribution='Roster and text: National Park Service. Geometry: NPS Land Resources Division; CC BY 4.0. Outlines: Natural Earth, public domain.',licenseUrl='https://www.nps.gov/aboutus/disclaimer.htm',units=parks)
 (ROOT/'src/data').mkdir(exist_ok=True);(ROOT/'src/data/parks.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
 print(json.dumps(dict(system=total,affiliated=counts['Affiliated Areas'],descriptions=sum(bool(p['description']) for p in parks),locations=sum('location' in p for p in parks))))
if __name__=='__main__':main()
