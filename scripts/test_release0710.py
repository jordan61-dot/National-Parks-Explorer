import copy,json,unittest
from pathlib import Path
from acquire0710 import MainText
from release072 import merge
ROOT=Path(__file__).resolve().parents[1]
class RegionalTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.old=json.loads((ROOT/'docs/BASELINE0710.json').read_text());cls.new=json.loads((ROOT/'src/data/parks.json').read_text());cls.curated=json.loads((ROOT/'scripts/evidence/release0710-trails.json').read_text());cls.sources=json.loads((ROOT/'scripts/evidence/acquired0710.json').read_text())
 def test_baseline_identities_and_unmodified_fields(self):
  units={p['id']:p for p in self.new['units']};self.assertEqual(len(units),467)
  for p in self.old['units']:
   q=units[p['id']]
   for k in ['id','classification','parkCode','history','photographs']:self.assertEqual(p.get(k),q.get(k))
   now={a['id']:a for a in q['attractions']}
   for a in p['attractions']:
    self.assertIn(a['id'],now)
    if a['name']!='Hopewell Mound Group trails':self.assertEqual(a,now[a['id']])
    else:
     for k in ['id','kind','source','difficulty','tags']:self.assertEqual(a.get(k),now[a['id']].get(k))
     self.assertEqual(a['length']['value'],now[a['id']]['length']['value'])
 def test_expansion_counts_and_balanced_associations(self):
  old={a['id'] for p in self.old['units'] for a in p['attractions']};added=[(p,a) for p in self.new['units'] for a in p['attractions'] if a['id'] not in old]
  self.assertEqual(sum(a['kind']=='trail' for p,a in added),25);self.assertEqual(sum(a['kind']!='trail' for p,a in added),11)
  self.assertEqual(len({p['id'] for p,a in added}),8)
  self.assertEqual(len({a['id'] for p,a in added}),36)
 def test_retained_evidence_traceability(self):
  self.assertEqual(len(self.sources),33)
  for p in self.curated['parks'].values():
   for a in p['attractions']:
    self.assertEqual(a['descriptionKind'],'summary');self.assertTrue(a['description']);self.assertTrue(a['retrievedAt'])
    for evidence in a['evidence']['sources']:
     self.assertTrue(evidence['url'].startswith('https://www.nps.gov/'));source=self.sources[evidence['url']];self.assertNotIn('error',source)
     self.assertEqual(len(source['responseSha256']),64)
     for excerpt in evidence['excerpts']:self.assertIn(excerpt,source['text'])
 def test_uncertain_lengths_and_one_way_meaning(self):
  a={a['name']:a for p in self.curated['parks'].values() for a in p['attractions']}
  for name in ['Billy Goat Trail Section A','Schoolhouse Ridge North Trail','Heritage Trail']:
   self.assertNotIn('length',a[name]);self.assertTrue(a[name]['conflicts'])
  self.assertEqual(a['Bluestone Turnpike Trail']['length']['value'],9.5);self.assertIn('one way',a['Bluestone Turnpike Trail']['length']['method'])
  self.assertNotIn('elevationGain',a['Cedar Sink Trail']);self.assertNotIn('elevationGain',a['Visitor Center to Lower Town Trail'])
 def test_coordinates_and_identity_reconciliation(self):
  located=[a for p in self.curated['parks'].values() for a in p['attractions'] if 'latitude' in a];self.assertEqual(len(located),5)
  for a in located:self.assertIn('trailhead',a['locationKind'].lower());self.assertIn(a['locationSource'],self.sources)
  for p in self.new['units']:
   before=copy.deepcopy(p['attractions']);merge(p,self.curated);self.assertEqual(before,p['attractions'])
 def test_main_extraction_does_not_stop_at_nested_nonroot_tags(self):
  p=MainText();p.feed('<main><h1>Guide</h1><div><p>First</p></div><p>Last verified detail</p></main><footer>Exclude</footer>')
  self.assertIn('Last verified detail',''.join(p.parts));self.assertNotIn('Exclude',''.join(p.parts))
if __name__=='__main__':unittest.main()
