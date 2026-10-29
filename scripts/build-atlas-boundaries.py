"""Build offline state/territory outlines from Census 2025 1:500k cartographic boundaries.
Requires pyshp 3.1.6; input is the downloaded official Census ZIP. Output is deterministic.
"""
import hashlib, io, json, math, sys, zipfile
from pathlib import Path
import shapefile
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]); raw=source.read_bytes(); z=zipfile.ZipFile(io.BytesIO(raw)); stem='cb_2025_us_state_500k'
r=shapefile.Reader(shp=io.BytesIO(z.read(stem+'.shp')),shx=io.BytesIO(z.read(stem+'.shx')),dbf=io.BytesIO(z.read(stem+'.dbf')))
def simplify(points, tolerance):
 # iterative Douglas-Peucker, including the closed ring endpoint
 if len(points)<=4:return points
 keep={0,len(points)-1}; stack=[(0,len(points)-1)]; t2=tolerance*tolerance
 while stack:
  a,b=stack.pop(); x,y=points[a];dx=points[b][0]-x;dy=points[b][1]-y;den=dx*dx+dy*dy;best=t2;index=-1
  for i in range(a+1,b):
   px,py=points[i];u=max(0,min(1,((px-x)*dx+(py-y)*dy)/den)) if den else 0
   d=(px-x-u*dx)**2+(py-y-u*dy)**2
   if d>best:best=d;index=i
  if index>=0:keep.add(index);stack.extend([(a,index),(index,b)])
 out=[points[i] for i in sorted(keep)]
 return out if len(out)>=4 else points[::max(1,len(points)//4)]+[points[-1]]
features=[]
for sr in r.iterShapeRecords():
 record=sr.record.as_dict(); code=record['STUSPS']; xmin,ymin,xmax,ymax=sr.shape.bbox
 lon=-160 if code=='AK' else (xmin+xmax)/2
 lat=(ymin+ymax)/2; cosine=math.cos(math.radians(lat))
 parts=list(sr.shape.parts)+[len(sr.shape.points)]; paths=[];all_points=[];core_points=[]
 for start,end in zip(parts,parts[1:]):
  xy=[((((x-lon+540)%360)-180)*cosine,lat-y) for x,y in sr.shape.points[start:end]]
  xy=simplify(xy,0.0015)
  if len(xy)<4:continue
  paths.append('M'+'L'.join(f'{x:.4f},{y:.4f}' for x,y in xy)+'Z');all_points.extend(xy)
  for (raw_lon,raw_lat),(px,py) in zip(sr.shape.points[start:end], [((((x-lon+540)%360)-180)*cosine,lat-y) for x,y in sr.shape.points[start:end]]):
   if (code=='HI' and raw_lon > -161) or (code=='MP' and raw_lat < 16.5) or (code=='AS' and raw_lat < -13):core_points.append((px,py))
 xs=[p[0] for p in all_points];ys=[p[1] for p in all_points]
 feature={'code':code,'name':record['NAME'],'center':[round(lon,6),round(lat,6)],'bounds':[round(min(xs),5),round(min(ys),5),round(max(xs)-min(xs),5),round(max(ys)-min(ys),5)],'path':''.join(paths)}
 if core_points:
  cx=[p[0] for p in core_points];cy=[p[1] for p in core_points];feature['coreBounds']=[round(min(cx),5),round(min(cy),5),round(max(cx)-min(cx),5),round(max(cy)-min(cy),5)]
 features.append(feature)
assert len(features)==56 and {f['code'] for f in features}>={'AS','GU','MP','PR','VI','DC'}
out={'source':'U.S. Census Bureau 2025 Cartographic Boundary Files, State and Equivalent Entities, 1:500,000; generalized and simplified for screen display. Public domain (CC0).','url':'https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_state_500k.zip','sourceSha256':hashlib.sha256(raw).hexdigest(),'method':'Local equirectangular projection centered per jurisdiction; longitude wrapped around center; Douglas-Peucker 0.0015 degrees projected; rounded to 0.0001 degrees.','features':sorted(features,key=lambda f:f['code'])}
(root/'src/atlas-boundaries.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print(len(features),'jurisdictions;', (root/'src/atlas-boundaries.json').stat().st_size,'bytes; source sha256',out['sourceSha256'])
