import copy,unittest
from acquire_photo07143 import acceptable,candidate_priority
from release072 import merge,nps_description_matches
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
 def test_staging_prioritizes_park_views_without_approving_them(self):
  view={'Title':'Battlefield trail','AltText':'A footpath through the battlefield.'}
  event={'Title':'Festival display','AltText':'A volunteer at a display table.'}
  self.assertLess(candidate_priority(view),candidate_priority(event))
 def test_nps_wide_description_requires_exact_location_and_manual_method(self):
  photo={'locationMethod':'nps-description','unitEvidence':'NPS-wide, Code: NPS','locationEvidence':'Example National Park. A landscape photograph.'}
  self.assertTrue(nps_description_matches(self.park,photo))
  self.assertTrue(nps_description_matches(self.park,{**photo,'unitEvidence':'Example National Park, Code: EXMP'}))
  for change in ({'locationMethod':'nps-unit'},{'unitEvidence':'Another unit'},{'locationEvidence':'Example National Parkway is a different place.'},{'locationEvidence':'A place near Example National Park.'}):
   self.assertFalse(nps_description_matches(self.park,{**photo,**change}))
if __name__=='__main__':unittest.main()
