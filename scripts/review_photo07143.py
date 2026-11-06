"""Promote explicitly reviewed photo candidates; never perform automatic acceptance.

Inspect the image, title, alt text, source, unit and rights evidence first. Each
accepted image needs a concrete reason, retained in the review ledger. This tool
only updates public reference evidence; it never reads or writes personal records.
"""
import argparse,hashlib,json,os
from pathlib import Path
from acquire_photo07143 import ROOT,E,PHOTO,CANDIDATES,save

def promote(park,photo_id,reason):
 if len(reason.strip())<30:raise ValueError('Provide a specific review explanation of at least 30 characters.')
 pending=json.loads(CANDIDATES.read_text());choices=pending.get('parks',{}).get(park,{}).get('photographs',[]);photo=next((p for p in choices if p['id']==photo_id),None)
 if not photo:raise ValueError('Candidate not found for this park.')
 path=(ROOT/photo['asset']).resolve()
 if not path.is_relative_to((ROOT/'src/media072').resolve()) or hashlib.sha256(path.read_bytes()).hexdigest()!=photo['sha256']:raise ValueError('Candidate file or hash is invalid.')
 accepted=json.loads(PHOTO.read_text()) if PHOTO.exists() else {'parks':{}};ledger_path=E/'photo07143-review.json';ledger=json.loads(ledger_path.read_text()) if ledger_path.exists() else {'reviews':{}}
 for other,entry in accepted['parks'].items():
  if other!=park and any(p['id']==photo_id or p['source']==photo['source'] or p['sha256']==photo['sha256'] for p in entry['photographs']):raise ValueError('Image already assigned to another park; investigate the association.')
 for filename in ('release072-media.json','release072zz-commons07143.json'):
  evidence=E/filename
  if evidence.exists():
   for other,entry in json.loads(evidence.read_text())['parks'].items():
    if any(p['id']==photo_id or p['source']==photo['source'] or p['sha256']==photo['sha256'] for p in entry.get('photographs',[])):raise ValueError('Image already exists in baseline or another accepted source.')
 rows=accepted['parks'].setdefault(park,{'photographs':[]})['photographs'];old=next((p for p in rows if p['id']==photo_id or p['source']==photo['source'] or p['sha256']==photo['sha256']),None)
 if old and old!=photo:raise ValueError('Candidate conflicts with an accepted image.')
 if not old:rows.append(photo)
 ledger['reviews'][photo_id]={'parkId':park,'decision':'accepted','method':reason.strip()}
 # The compiler refuses any photo without its ledger entry. Save that entry first.
 save(ledger_path,ledger);save(PHOTO,accepted)
 return len(rows)
def main():
 p=argparse.ArgumentParser();p.add_argument('--park',required=True);p.add_argument('--photo-id',required=True);p.add_argument('--reason',required=True);a=p.parse_args();print('Accepted; reviewed photos in new source:',promote(a.park,a.photo_id,a.reason))
if __name__=='__main__':main()
