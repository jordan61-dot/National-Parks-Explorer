"""Make the six documented 0.7.1 measurement conflicts visible as data.
No new measurements are chosen; retained supplemental evidence is the basis.
"""
import json
from compile import E,ROOT
def main():
 data=json.loads((ROOT/'src/data/parks.json').read_text());supplement=json.loads((E/'supplemental.json').read_text());out={'parks':{}}
 conflicts={
 'Long Point Trail':'The individual page pairs 1.6 miles with 1.29 km for a one-way distance; the units disagree.',
 'Sandstone Falls Boardwalk':'The individual page gives 0.2 miles one way and describes 0.25 mile; no numeric length has been selected.',
 'Brandywine Gorge Loop':'The activity page gives 1.5 miles round trip; the park hiking table lists 1.4 miles.',
 'Ledges Trail':'The dedicated page describes 1.8 miles around the formations; the hiking table lists 2.2 miles, with unresolved route scope.',
 'Riverside Walk':'The accessibility survey gives 1 mile one way; the spring 2026 guide gives 2.2 miles round trip.',
 "Pa'rus Trail":'The individual page describes 3.5 miles end-to-end and 1.6 miles one way in its survey; the spring 2026 guide labels 3.5 miles round trip.'}
 for code,extra in supplement['parks'].items():
  p=next(p for p in data['units'] if p['id']==extra['parkId'])
  for a in extra.get('attractions',[]):
   if a['name'] not in conflicts:continue
   value=dict(a);value['conflicts']=[dict(field='length',detail=conflicts[a['name']],sources=[a['source']]+(['https://www.nps.gov/cuva/planyourvisit/hiking.htm'] if code=='cuva' else ['https://www.nps.gov/zion/planyourvisit/upload/26-Spring-InfoGuide.pdf'] if code=='zion' else []))]
   out['parks'].setdefault(p['id'],{'attractions':[]})['attractions'].append(value)
 (E/'release072-conflicts.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
