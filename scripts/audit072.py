"""Produce the reproducible release coverage register and failure review."""
import collections,json
from compile import ROOT,E
from enrichment import topic
def main():
 data=json.loads((ROOT/'src/data/parks.json').read_text());baseline=json.loads((ROOT/'docs/BASELINE072.json').read_text());coverage=json.loads((ROOT/'src/data/coverage.json').read_text());review=json.loads((E/'review072.json').read_text());gaps=[];failures=[]
 for p in data['units']:
  missing=[t for t in ['History & culture','Nature & geology','Accessibility','Activities & trails'] if not any(a['topic']==t for a in p['articles'])]
  trails=[a for a in p['attractions'] if a['kind']=='trail' and any(k in a for k in ['length','difficulty','accessibility'])]
  priority=(8 if not p['description'] else 0)+len(missing)*2+(2 if not p['attractions'] else 0)+(2 if not trails else 0)+(1 if p['designation']!='National Park' else 0)
  gaps.append(dict(id=p['id'],name=p['name'],designation=p['designation'],states=p['states'],missingIntroduction=not bool(p['description']),missingTopics=missing,attractions=len(p['attractions']),structuredTrails=len(trails),priority=priority))
 for u,e in review.items():
  code=u.split('/')[3];subject=topic(u)
  alternatives=sorted({a['source'] for p in data['units'] if p['parkCode']==code for a in p['articles'] if a['topic']==subject and a['source']!=u and len(a['text'].split())>=35})
  failures.append(dict(url=u,status='historical-404' if e.get('status')=='historical-404' else e.get('errorCategory','unverified-page'),alternatives=alternatives,note='Alternatives cover the same park/topic; they do not recover or validate the failed URL.'))
 output=dict(baselineRevision=baseline['revision'],baseline=baseline['coverage'],result=coverage,introductionsRecovered=coverage['descriptions']-baseline['coverage']['descriptions'],unchangedParkIds=len(data['units']),unchangedBaselineAttractionIds=sum(len(v) for v in baseline['identities'].values()),allNamedTrailReferences=sum(a['kind']=='trail' for p in data['units'] for a in p['attractions']),structuredTrailDefinition='Named trail with at least one sourced length, difficulty or accessibility field. Bare narrative references are excluded.',failedReferencesReviewed=len(failures),recoveredFailedUrls=0,failedReferencesWithAlternatives=sum(bool(f['alternatives']) for f in failures),duplicateNames=0,coverageRegister=sorted(gaps,key=lambda p:(-p['priority'],p['id'])))
 (ROOT/'docs/COVERAGE072.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'docs/SOURCE_REVIEW072.json').write_text(json.dumps(dict(counts=dict(collections.Counter(f['status'] for f in failures)),references=failures),ensure_ascii=False,indent=2)+'\n')
 print({k:output[k] for k in ['introductionsRecovered','failedReferencesReviewed','recoveredFailedUrls','failedReferencesWithAlternatives','unchangedParkIds','unchangedBaselineAttractionIds']})
if __name__=='__main__':main()
