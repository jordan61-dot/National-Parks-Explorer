import copy,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from compile import ROOT
from release072 import merge,validate,emit,compact
class ReleaseTests(unittest.TestCase):
 def setUp(self):self.data=json.loads((ROOT/'src/data/parks.json').read_text())
 def test_no_baseline_identity_disappears(self):validate(self.data,ROOT)
 def test_invalid_distance_unit_is_rejected_before_publication(self):
  a=next(a for p in self.data['units'] for a in p['attractions'] if 'length' in a);a['length']['unit']='yards'
  with self.assertRaises(AssertionError):validate(self.data,ROOT)
 def test_coordinates_need_distinct_precision_and_source(self):
  a=self.data['units'][0]['attractions'];a.append(dict(id='invalid-coordinate',name='Invalid',kind='place',source='https://www.nps.gov/places/test.htm',latitude=20,longitude=30))
  with self.assertRaises(AssertionError):validate(self.data,ROOT)
 def test_media_without_explicit_rights_is_rejected(self):
  p=next(p for p in self.data['units'] if p.get('photographs'));p['photographs'][0]['rightsEvidence']='Government website'
  with self.assertRaises(AssertionError):validate(self.data,ROOT)
 def test_changed_media_hash_is_rejected(self):
  p=next(p for p in self.data['units'] if p.get('photographs'));p['photographs'][0]['sha256']='invalid'
  with self.assertRaises(AssertionError):validate(self.data,ROOT)
 def test_two_named_routes_can_share_guide_but_not_identity(self):
  p={'id':'fixture','website':'https://www.nps.gov/','description':'','articles':[],'sources':[],'activities':[],'attractions':[]}
  def a(name,key):return dict(name=name,kind='trail',description=name,source='https://www.nps.gov/test/guide.htm',sourceKey=key,retrievedAt='2026-10-29',evidence='fixture')
  merge(p,{'parks':{'fixture':{'attractions':[a('First Trail','first'),a('Second Trail','second')]}}})
  self.assertNotEqual(p['attractions'][0]['id'],p['attractions'][1]['id'])
  original=p['attractions'][0]['id'];merge(p,{'parks':{'fixture':{'attractions':[a('First Trail','first')]}}});self.assertEqual(len(p['attractions']),2);self.assertEqual(p['attractions'][0]['id'],original)
 def test_bad_refresh_does_not_modify_existing_generated_data(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'src/data').mkdir(parents=True);marker=root/'src/data/sentinel';marker.write_text('previous complete reference')
   invalid=copy.deepcopy(self.data);invalid['units']=[invalid['units'][0],invalid['units'][0]]
   with self.assertRaises(AssertionError):emit(root,invalid,{})
   self.assertEqual(marker.read_text(),'previous complete reference')
 def test_compact_serialization_is_deterministic(self):self.assertEqual(compact(self.data),compact(copy.deepcopy(self.data)))
if __name__=='__main__':unittest.main()
