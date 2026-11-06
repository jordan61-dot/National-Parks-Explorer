"""Recheck five fixed Commons file pages before accepting their public-domain images.

This is a small reviewed list, not a general category crawler. No Commons Action API
calls are made: Commons robots.txt currently disallows the query endpoints. The
listed image bytes are downloaded from the separately permitted media host.
"""
import datetime,hashlib,html,json,time,urllib.parse,urllib.request,urllib.robotparser
from acquire_photo07143 import AGENT,ROOT,E
PAGE=E/'commons07143-source.json';OUT=E/'release072zz-commons07143.json'
proof=json.loads(PAGE.read_text());photos=json.loads(OUT.read_text())['parks']['9-11-pentagon-memorial']['photographs'];assert len(photos)==5
req=urllib.request.Request('https://commons.wikimedia.org/robots.txt',headers={'User-Agent':AGENT});rules=urllib.request.urlopen(req,timeout=25).read().decode('utf8','replace');robots=urllib.robotparser.RobotFileParser();robots.parse(rules.splitlines())
for photo in photos:
 pid=photo['id'].rsplit('-',1)[1];evidence=proof['assets'][pid];source=photo['source'];assert robots.can_fetch(AGENT,source),'Commons file page is robots-disallowed'
 time.sleep(.7);request=urllib.request.Request(source,headers={'User-Agent':AGENT});raw=urllib.request.urlopen(request,timeout=35).read(2000001);assert len(raw)<2000000
 text=html.unescape(raw.decode('utf8','replace')).replace('_',' ').lower();assert 'pentagon memorial' in text and 'public domain' in text
 # The source must identify the same specific federal-work category and creator.
 category=evidence['categories'][1].lower();assert category in text
 credit=evidence['artist'].lower();assert credit and all(word in text for word in credit.split()[-2:] if len(word)>3)
 path=(ROOT/photo['asset']);assert hashlib.sha256(path.read_bytes()).hexdigest()==photo['sha256']
 evidence['filePageSha256']=hashlib.sha256(raw).hexdigest();evidence['filePageVerifiedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();print('verified',photo['caption'],flush=True)
proof.pop('api',None);proof['method']='Five fixed file description pages checked individually; Commons Action API is not used by this script.';PAGE.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
