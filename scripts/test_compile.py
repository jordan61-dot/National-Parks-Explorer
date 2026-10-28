import unittest
from compile import roster,Page,E
from details import Article
class CompilerTests(unittest.TestCase):
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
 def test_enrichment_preserves_ids_and_requires_evidence(self):
  from enrichment import enrich
  from compile import slug
  p={'parkCode':'test','website':'https://www.nps.gov/test/','sources':[], 'attractions':[{'id':'old-id','source':'https://www.nps.gov/places/trail.htm'}]}
  home={'links':[['/test/learn/historyculture/index.htm','History']]}
  url='https://www.nps.gov/test/learn/historyculture/index.htm'
  enrich(p,home,{url:{'text':'No date'}},slug);self.assertEqual(p['articles'],[])
  evidence={url:{'title':'History','text':'Verified text','retrievedAt':'2026-10-27T00:00:00Z','places':[{'url':'https://www.nps.gov/places/trail.htm','title':'New title'},{'url':'https://example.com/places/x.htm','title':'Foreign place'},{'url':'https://www.nps.gov/places/new.htm','title':'Named Overlook'}]}}
  enrich(p,home,evidence,slug);self.assertEqual(len(p['articles']),1);self.assertEqual(len(p['attractions']),2);self.assertEqual(p['attractions'][0]['id'],'old-id');self.assertEqual(p['attractions'][1]['kind'],'overlook')
if __name__=='__main__':unittest.main()
