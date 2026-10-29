import unittest
from compile import roster,Page,E
from details import Article
class CompilerTests(unittest.TestCase):
 def test_west_virginia_does_not_imply_virginia(self):
  parks,_,_=roster((E/'roster.html').read_text())
  neri=next(p for p in parks if p['parkCode']=='neri');self.assertEqual(neri['states'],['WV'])
  harpers=next(p for p in parks if p['parkCode']=='hafe');self.assertEqual(set(harpers['states']),{'WV','VA','MD'})
 def test_alternate_evidence_contributes_without_duplicate_articles(self):
  from enrichment import enrich
  from compile import slug
  p={'parkCode':'test','website':'https://www.nps.gov/test/','sources':[],'attractions':[]}
  text='A distinct sufficiently detailed source fixture with twelve words and specific historical context.'
  base={'title':'History','text':text,'retrievedAt':'2026-10-28T00:00:00Z'}
  enrich(p,{}, {'https://www.nps.gov/test/learn/historyculture/index.htm':base,'https://www.nps.gov/test/learn/historyculture/people.htm':base,'https://www.nps.gov/other/learn/nature/index.htm':base},slug)
  self.assertEqual(len(p['articles']),1)
 def test_supplement_preserves_existing_url_id_and_explicit_unit_scope(self):
  from enrichment import supplement
  p={'id':'test','parkCode':'test','sources':[],'articles':[],'activities':[],'attractions':[{'id':'old','source':'https://www.nps.gov/places/test.htm','kind':'trail'}]}
  extra={'parks':{'test':{'parkId':'test','attractions':[{'name':'Verified Trail','kind':'trail','source':'https://www.nps.gov/places/test.htm','retrievedAt':'2026-10-28','description':'Fixture'}]}}}
  supplement(p,extra);self.assertEqual(p['attractions'][0]['id'],'old');self.assertEqual(len(p['attractions']),1)
  extra['parks']['test']['parkId']='different';extra['parks']['test']['attractions'][0]['name']='Wrong unit';supplement(p,extra);self.assertEqual(p['attractions'][0]['name'],'Verified Trail')
 def test_collection_canonicalizes_only_official_https_links(self):
  from expand import canonical
  self.assertEqual(canonical('https://www.nps.gov/test/','https://nps.gov/places/x.htm#section'),'https://www.nps.gov/places/x.htm')
  self.assertIsNone(canonical('https://www.nps.gov/test/','https://example.org/test.htm'))
 def test_collection_records_missing_page_status_without_retrying(self):
  from unittest.mock import patch,Mock
  from urllib.error import HTTPError
  from expand import collect,PAUSED
  PAUSED.clear();robots=Mock();robots.can_fetch.return_value=True
  with patch('expand.urlopen',side_effect=HTTPError('https://www.nps.gov/test/',404,'Not Found',{},None)) as fetch,patch('expand.time.sleep'):
   result=collect('https://www.nps.gov/test/',robots)
  self.assertEqual(result['errorCategory'],'missing-page');self.assertEqual(result['status'],404);fetch.assert_called_once()
 def test_collection_pauses_after_rate_limit(self):
  from unittest.mock import patch,Mock
  from urllib.error import HTTPError
  from expand import collect,PAUSED
  PAUSED.clear();robots=Mock();robots.can_fetch.return_value=True
  with patch('expand.urlopen',side_effect=HTTPError('https://www.nps.gov/test/',429,'Rate limited',{},None)) as fetch,patch('expand.time.sleep'):
   self.assertEqual(collect('https://www.nps.gov/test/',robots)['errorCategory'],'rate-limited')
   self.assertEqual(collect('https://www.nps.gov/test/other.htm',robots)['errorCategory'],'rate-limit-pause');fetch.assert_called_once()
  PAUSED.clear()
 def test_roster_counts_and_comma_names(self):
  parks,counts,total=roster((E/'roster.html').read_text());self.assertEqual(sum(p['classification']=='system-unit' for p in parks),total)
  p=next(p for p in parks if p['id']=='john-d-rockefeller');self.assertEqual(p['name'],'John D. Rockefeller, Jr. Memorial Parkway');self.assertEqual(p['states'],['WY'])
 def test_roster_rejects_count_drift(self):
  raw=(E/'roster.html').read_text().replace('National Parks (64)','National Parks (65)')
  with self.assertRaises(ValueError):roster(raw)
 def test_prefer_informative_description(self):
  p=Page();p.feed('<meta name="description" content="Park"><meta property="og:description" content="A longer official introduction.">');self.assertEqual(p.description,'A longer official introduction.')
 def test_excerpts_exclude_navigation_scripts_and_credits(self):
  a=Article();a.feed('<nav>Navigation</nav><div id="main"><h1>Page title</h1><div class="ArticleTextGroup"><p>Official text</p><script>bad()</script><figure>Credit</figure><a href="/places/trail.htm">Named Trail</a></div></div><footer>Footer</footer>');self.assertEqual(a.title,'Page title');self.assertEqual(a.excerpt(),'Official text Named Trail');self.assertEqual(a.links[0][0],'/places/trail.htm')
 def test_excerpt_is_bounded(self):
  a=Article();a.feed('<div class="ArticleTextGroup">'+('word '*250)+'</div>');self.assertEqual(len(a.excerpt().split()),181)
 def test_only_first_main_heading_is_the_page_title(self):
  a=Article();a.feed('<div id="main"><h1 class="modal-title">Embed Video</h1><h1>Named Visitor Center</h1><h1>Transcript title</h1><h1 class="modal-title">Embed Video</h1></div>');self.assertEqual(a.title,'Named Visitor Center')
 def test_enrichment_preserves_ids_and_requires_evidence(self):
  from enrichment import enrich
  from compile import slug
  p={'parkCode':'test','website':'https://www.nps.gov/test/','sources':[], 'attractions':[{'id':'old-id','source':'https://www.nps.gov/places/trail.htm'}]}
  home={'links':[['/test/learn/historyculture/index.htm','History']]}
  url='https://www.nps.gov/test/learn/historyculture/index.htm'
  enrich(p,home,{url:{'text':'No date'}},slug);self.assertEqual(p['articles'],[])
  evidence={url:{'title':'History','text':'This synthetic official article fixture has enough distinct words to represent a substantive source excerpt.','retrievedAt':'2026-10-27T00:00:00Z','places':[{'url':'https://www.nps.gov/places/trail.htm','title':'New title'},{'url':'https://example.com/places/x.htm','title':'Foreign place'},{'url':'https://www.nps.gov/places/new.htm','title':'Named Overlook'}]}}
  enrich(p,home,evidence,slug,{'https://www.nps.gov/places/new.htm':{'title':'Named Overlook','retrievedAt':'2026-10-28T00:00:00Z'}});self.assertEqual(len(p['articles']),1);self.assertEqual(len(p['attractions']),2);self.assertEqual(p['attractions'][0]['id'],'old-id');self.assertEqual(p['attractions'][1]['kind'],'overlook')
 def test_generic_place_labels_require_verified_title(self):
  from enrichment import enrich
  from compile import slug
  park={'parkCode':'test','website':'https://www.nps.gov/test/','sources':[], 'attractions':[]}
  url='https://www.nps.gov/test/planyourvisit/things2do.htm';place='https://www.nps.gov/places/lookout.htm'
  details={url:{'title':'Things To Do','text':'Things To Do','retrievedAt':'2026-10-28T00:00:00Z','places':[{'url':place,'title':'Full Description'}]}}
  enrich(park,{},details,slug);self.assertEqual(park['articles'],[]);self.assertEqual(park['attractions'],[])
  enrich(park,{},details,slug,{place:{'title':'Named Overlook','retrievedAt':'2026-10-28T00:00:00Z'}})
  self.assertEqual(park['attractions'][0]['name'],'Named Overlook');self.assertEqual(park['attractions'][0]['kind'],'overlook')
if __name__=='__main__':unittest.main()
