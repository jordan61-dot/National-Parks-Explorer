"""Reproducible Natural Earth SR_50M -> offline registered WebP derivatives.
Usage: python scripts/build-terrain.py /absolute/path/SR_50M.zip
Build dependency: Pillow; no GIS package or browser service required.
"""
import hashlib, io, json, math, pathlib, sys, zipfile
from PIL import Image

ROOT=pathlib.Path(__file__).resolve().parents[1]
raw=pathlib.Path(sys.argv[1]).read_bytes()
assert hashlib.sha256(raw).hexdigest()=='ff810f5f2747463fd8ffa612b23e5f5e5d593a345218976872b6749610976ab7', 'Source checksum changed; review provenance before regeneration'
z=zipfile.ZipFile(io.BytesIO(raw))
embedded_version=z.read('SR_50M.VERSION.txt').decode().strip()
assert embedded_version=='2.0.0', 'Unexpected source version; inspect source before regeneration'
tfw=[float(v) for v in z.read('SR_50M.tfw').decode().split()]
assert abs(tfw[0]-1/30)<1e-10 and abs(tfw[3]+1/30)<1e-10
source=Image.open(z.open('SR_50M.tif')); source.load()
assert source.size==(10800,5400)
features=json.loads((ROOT/'src/atlas-boundaries.json').read_text())['features']
out=ROOT/'src/terrain';out.mkdir(exist_ok=True)
manifest={'provider':'Natural Earth / NACIS','dataset':'Shaded Relief Basic SR_50M','advertisedVersion':'3.2.0','embeddedVersion':embedded_version,'url':'https://naciscdn.org/naturalearth/50m/raster/SR_50M.zip','license':'Public domain','licenseUrl':'https://www.naturalearthdata.com/about/terms-of-use/','retrievedAt':'2026-11-07','sourceSha256':hashlib.sha256(raw).hexdigest(),'sourceSize':source.size,'resolutionDegrees':1/30,'projection':'WGS84 geographic; locally cosine-scaled equirectangular derivatives','limitations':'Generalized SRTM Plus hillshade; not elevation measurements. Small islands were accentuated by the provider. No local navigation or fine terrain detail. Provider advertises 3.2.0 but ZIP version file says 2.0.0; source is pinned by SHA256.','assets':{},'unavailable':{c:'Source resolution is too coarse for useful local relief; use the standard geographic map.' for c in ['AS','GU','MP','VI','DC']}}

def render(bounds,center,width):
 x,y,w,h=bounds; lon,lat=center;cos=math.cos(math.radians(lat))
 height=max(1,round(width*h/w))
 # Image.transform uses pixel corner coordinates. Geographic pixel edges map
 # exactly to the source -180..180, 90..-90 extent (half-pixel TFW convention).
 result=Image.new('L',(width,height),160)
 # Triplicate longitude supports Aleutians across the date line without seams.
 tiled=Image.new('L',(source.width*3,source.height));tiled.paste(source,(0,0));tiled.paste(source,(source.width,0));tiled.paste(source,(source.width*2,0))
 return tiled.transform((width,height),Image.Transform.AFFINE,(w/width/cos*30,0,(lon+x/cos+540)*30,0,h/height*30,(90-lat+y)*30),Image.Resampling.BICUBIC)

def save(code,img,bounds):
 path=out/(code+'.webp');img.save(path,'WEBP',quality=78,method=6)
 manifest['assets'][code]={'bounds':bounds,'width':img.width,'height':img.height,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

for f in features:
 if f['code'] in manifest['unavailable']:continue
 bounds=f['bounds']
 width=min(1000,max(160,round(bounds[2]*30/math.cos(math.radians(f['center'][1])))))
 save(f['code'],render(bounds,f['center'],width),bounds)
world=source.resize((1800,900),Image.Resampling.LANCZOS);save('world',world,[0,0,720,360])
national=source.transform((1320,720),Image.Transform.AFFINE,(1.5,0,54*30,0,1.5,40*30),Image.Resampling.BICUBIC)
# Existing national insets: x=(lon+180)*3,y=(72-lat)*3+240;
# Hawaii x=(lon+161)*7+210,y=(23-lat)*7+245.
tiled=Image.new('L',(source.width*3,source.height));tiled.paste(source,(0,0));tiled.paste(source,(source.width,0));tiled.paste(source,(source.width*2,0))
ak=tiled.transform((420,144),Image.Transform.AFFINE,(5,0,360*30,0,5,18*30),Image.Resampling.BICUBIC);national.paste(ak,(0,480))
hi=source.transform((180,110),Image.Transform.AFFINE,(30/14,0,19*30,0,30/14,67*30),Image.Resampling.BICUBIC);national.paste(hi,(420,490))
save('us',national,[0,0,660,360])
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(out/'assets.ts').write_text('export const terrainAssets:Record<string,string>={\n'+''.join(f' {json.dumps(code)}:new URL("./{code}.webp",import.meta.url).href,\n' for code in manifest['assets'])+'};\n')
print(f"Generated {len(manifest['assets'])} assets: {sum(a['bytes'] for a in manifest['assets'].values())} bytes")
