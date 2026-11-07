"""Validate generated relief integrity, extents and registration against source when supplied."""
import hashlib,io,json,math,pathlib,sys,zipfile
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
m=json.loads((root/'src/terrain/manifest.json').read_text())
f={x['code']:x for x in json.loads((root/'src/atlas-boundaries.json').read_text())['features']}
for code,a in m['assets'].items():
 raw=(root/'src/terrain'/f'{code}.webp').read_bytes()
 assert hashlib.sha256(raw).hexdigest()==a['sha256'],code
 assert len(raw)==a['bytes'],code
 assert Image.open(io.BytesIO(raw)).size==(a['width'],a['height']),code
 if code in f:assert a['bounds']==f[code]['bounds'],code
assert set(m['assets'])|set(m['unavailable'])==set(f)|{'us','world'}
if len(sys.argv)>1:
 raw=pathlib.Path(sys.argv[1]).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['sourceSha256']
 source=Image.open(zipfile.ZipFile(io.BytesIO(raw)).open('SR_50M.tif'));source.load()
 # Independently verify landmark registration on state rasters, national mainland,
 # Alaska and Hawaii insets, and world. Lossy/resampled hillshade is approximate.
 for code,lat,lon in [('CA',37.745,-119.533),('WA',46.852,-121.760),('AK',63.069,-151.007),('HI',19.421,-155.287),('PR',18.222,-66.494),('us',46.852,-121.760),('us',63.069,-151.007),('us',19.421,-155.287),('world',37.745,-119.533)]:
  a=m['assets'][code];x,y,w,h=a['bounds'];im=Image.open(root/'src/terrain'/f'{code}.webp').convert('L')
  if code=='world':px=(lon+180)*2;py=(90-lat)*2
  elif code=='us':
   if lat>50:px=(lon+180)*3;py=(72-lat)*3+240
   elif lon<-150:px=(lon+161)*7+210;py=(23-lat)*7+245
   else:px=(lon+126)*10;py=(50-lat)*10
  else:
   center=f[code]['center'];px=((lon-center[0]+540)%360-180)*math.cos(math.radians(center[1]));py=center[1]-lat
  ix=round((px-x)/w*im.width-.5);iy=round((py-y)/h*im.height-.5)
  # Compare at the selected OUTPUT pixel center, rather than the exact summit:
  # coarse national cells do not resolve an individual mountain summit.
  qx=x+(ix+.5)/im.width*w;qy=y+(iy+.5)/im.height*h
  if code=='world':qlon=qx/2-180;qlat=90-qy/2
  elif code=='us':
   if lat>50:qlon=qx/3-180;qlat=72-(qy-240)/3
   elif lon<-150:qlon=(qx-210)/7-161;qlat=23-(qy-245)/7
   else:qlon=qx/10-126;qlat=50-qy/10
  else:qlon=f[code]['center'][0]+qx/math.cos(math.radians(f[code]['center'][1]));qlat=f[code]['center'][1]-qy
  sx=(qlon+180)*30-.5;sy=(90-qlat)*30-.5
  bx=math.floor(sx);by=math.floor(sy);fx=sx-bx;fy=sy-by
  expected=sum(source.getpixel((bx+dx,by+dy))*(fx if dx else 1-fx)*(fy if dy else 1-fy) for dx in [0,1] for dy in [0,1]);actual=im.getpixel((ix,iy))
  assert abs(expected-actual)<40,(code,lat,lon,expected,actual)
print('PASS: 53 relief assets, SHA256/dimensions/registered extents; all 56 jurisdictions covered or explicitly unavailable'+('; 9 independent landmark samples aligned' if len(sys.argv)>1 else ''))
