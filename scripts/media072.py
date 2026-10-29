"""Acquire individually rights-verified NPGallery thumbnails; never infer a license."""
import datetime,hashlib,io,json,re,time,sys
from urllib.request import urlopen
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from PIL import Image
from compile import ROOT,E
ASSETS=[('agfo','d316f176-98ff-42db-95d0-8c995cb22050'),('cuis','05582b75-1dd8-b71b-0b46-217d130f46ab'),('grba','e1c25a5a-17c3-4458-ae38-2944f58b2eb3'),('fous','bc98082c-93ba-4e19-b96d-fc4c7d70dddd')]
def main():
 out=json.loads((E/'release072-media.json').read_text()) if '--only' in sys.argv else {'parks':{}}
 evidence=json.loads((E/'media072-rights.json').read_text()) if '--only' in sys.argv else {}
 parks=json.loads((ROOT/'src/data/parks.json').read_text())['units'];(ROOT/'src/media072').mkdir(exist_ok=True)
 for code,ident in ASSETS:
  if '--only' in sys.argv and code!=sys.argv[sys.argv.index('--only')+1]:continue
  source='https://npgallery.nps.gov/AssetDetail/'+ident
  try:
   raw=urlopen(source,timeout=25).read(1500000);s=BeautifulSoup(raw,'html.parser');text=s.get_text(' ',strip=True)
   assert re.search(r'Constraints Information:\s*Public domain',text,re.I),'No explicit asset license'
   assert re.search(r'Code:\s*'+code,text,re.I),'Association not verified'
   credit=re.search(r'(?:PhotoCredit|Photographer):\s*(.*?)\s*(?:Constraints Information|Sponsor|Original NPS Focus)',text).group(1)
   assert re.search(r'NPS|National Park',credit,re.I),'Non-agency credit needs additional review'
   assert not re.search(r'All Rights Reserved|not for publication|copyrighted by',text,re.I),'Contradictory rights'
   title=re.search(r'Title:\s*(.*?)\s*(?:AltText|Description|Image Details|Publisher):',text).group(1)
   alt=re.search(r'(?:AltText|Image Details):\s*(.*?)\s*(?:Description|Publisher):',text)
   alt=alt.group(1) if alt else title
   href=next(a['href'] for a in s.select('a[href]') if '/proxylores.jpg' in a['href'])
   download=urljoin(source,href);imagebytes=urlopen(download,timeout=25).read(1000001);assert len(imagebytes)<1000000
   image=Image.open(io.BytesIO(imagebytes));image.thumbnail((700,700));dest=ROOT/'src/media072'/f'{code}.webp'
   kwargs={k:image.info[k] for k in ['exif','xmp'] if k in image.info}
   image.save(dest,'WEBP',quality=80,**kwargs);assert dest.stat().st_size<200000
   now=datetime.datetime.now(datetime.timezone.utc).isoformat();p=next(p for p in parks if p['parkCode']==code)
   rights=re.search(r'Constraints Information:\s*(.*?)\s*(?:Keywords|Resource Type|NPS Units):',text).group(1)
   photo=dict(id='photo072-'+code,asset='src/media072/'+dest.name,source=source,originalSource=source.replace('/AssetDetail/','/GetAsset/')+'/original.jpg',downloadUrl=download,retrievedAt=now,alt=alt,caption=title,credit=credit,license='Public domain (NPS asset declaration)',licenseUrl='https://www.nps.gov/aboutus/disclaimer.htm',rightsEvidence=rights,width=image.width,height=image.height,sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),bytes=dest.stat().st_size,changes='Resized NPS small version and encoded WebP; no visual alteration. Embedded EXIF/XMP preserved where present.')
   out['parks'][p['id']]={'photographs':[photo]};evidence[source]={'text':text,'retrievedAt':now};print(code,title,photo['bytes'],flush=True)
  except Exception as e:evidence[source]={'error':str(e)};print(code,str(e),flush=True)
  time.sleep(.5)
 (E/'media072-rights.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n');(E/'release072-media.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
