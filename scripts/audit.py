"""Deterministic quality audit; no network or personal input."""
import json, collections
from compile import E, ROOT

def audit():
 data=json.loads((ROOT/'src/data/parks.json').read_text());parks=data['units']
 details=json.loads((E/'details.json').read_text())
 failures=[dict(url=u,error=p['error'],category=p.get('errorCategory','unclassified-http' if p['error']=='HTTPError' else 'unverified-page' if p['error']=='No verified article' else 'network')) for u,p in sorted(details.items()) if p.get('error')]
 texts=collections.Counter(a['text'] for p in parks for a in p.get('articles',[]))
 return dict(coverage=json.loads((ROOT/'src/data/coverage.json').read_text()),parksWithAttractions=sum(bool(p['attractions']) for p in parks),structuredTrails=sum(a['kind']=='trail' and any(k in a for k in ['length','difficulty','accessibility']) for p in parks for a in p['attractions']),licensedPhotographs=sum(len(p.get('photographs',[])) for p in parks),missingDescriptions=[p['id'] for p in parks if not p['description']],missingTopics={t:[p['id'] for p in parks if not any(a['topic']==t for a in p.get('articles',[]))] for t in ['History & culture','Nature & geology','Accessibility','Activities & trails']},emptyArticles=sum(not a['text'].strip() for p in parks for a in p.get('articles',[])),duplicateArticleTextsAcrossEntries=sum(n-1 for n in texts.values() if n>1),duplicateAttractionSourcesWithinPark=sum(len(p['attractions'])-len({a['source'] for a in p['attractions']}) for p in parks),failureCategories=dict(collections.Counter(f['category'] for f in failures)),failures=failures,limitations=['Legacy HTTPError evidence did not retain status codes; missing pages, rate limits and server errors cannot be distinguished retrospectively.','Shared NPS websites explain some duplicate text across separately classified units.','Metrics count substantive excerpts (>10 words), not comprehensive encyclopedia coverage.','No photographic license is inferred from a government domain.'])

if __name__=='__main__':
 print(json.dumps(audit(),ensure_ascii=False,indent=2))
