import copy,unittest
from acquire_photo07143 import acceptable
from release072 import merge
from photo_coverage07143 import build_report

class PhotoRules(unittest.TestCase):
 def setUp(self):
  self.park={'id':'test','name':'Example National Park','designation':'National Park','parkCode':'exmp','attractions':[],'activities':[],'description':'','articles':[],'sources':[]}
  self.asset={'AssetID':'2e1d3747-d8c1-4ec9-bf3b-321c3454874a','PrimaryType':'image','NPSUnits':[{'Name':'Example National Park','Code':'EXMP'}],'ConstraintsInformation':{'Constraint':'Public domain','GrantingRights':'Full'},'PhotoCredit':'NPS / Photographer','Title':'Forest in Example National Park','AltText':'Forest on a hillside.'}
 def test_requires_explicit_unit_rights_and_credit(self):
  self.assertTrue(acceptable(self.asset,self.park))
  for change in ({'NPSUnits':[{'Name':'Example National Preserve','Code':'EXMP'}]},{'ConstraintsInformation':{'Constraint':'Public domain'}},{'PhotoCredit':'© Photographer'},{'AltText':''},{'Title':'Poster of Example National Park'},{'Title':'Bear Paw Battlefield','AltText':'Hillside at a different battlefield.'}):
   a={**self.asset,**change};self.assertFalse(acceptable(a,self.park))
 def test_merge_preserves_old_media_and_rejects_conflicts(self):
  old={'id':'old','source':'https://npgallery.nps.gov/AssetDetail/a'};new={'id':'new','source':'https://npgallery.nps.gov/AssetDetail/b'};p={**self.park,'photographs':[old]}
  merge(p,{'parks':{'test':{'photographs':[new]}}});self.assertEqual(p['photographs'],[old,new])
  merge(p,{'parks':{'test':{'photographs':[copy.deepcopy(new)]}}});self.assertEqual(p['photographs'],[old,new])
  with self.assertRaises(AssertionError):merge(p,{'parks':{'test':{'photographs':[{'id':'new','source':'https://npgallery.nps.gov/AssetDetail/conflict'}]}}})
 def test_coverage_counts_only_accepted_sources_and_rejects_duplicates(self):
  parks=[{'id':'test','name':'Test','classification':'system-unit'}]
  p={'id':'one','source':'https://example.org/one','sha256':'a'}
  result=build_report(parks,[{'parks':{'test':{'photographs':[p]}}}]);self.assertEqual(result['additionalPhotosNeeded'],4);self.assertEqual(result['parksWithAtLeastFive'],0)
  with self.assertRaises(ValueError):build_report(parks,[{'parks':{'test':{'photographs':[p,p]}}}])
if __name__=='__main__':unittest.main()
