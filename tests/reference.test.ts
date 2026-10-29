import { it, expect } from "vitest";
import { loadReference, loadCompleteReference, loadParkDetails, matchesParkSearch, matchesTrailDetails, safeUrl, parkSearchText, matchesTrail, unpackReference, normalizeSearch } from "../src/reference";
import readable from '../src/data/parks.json';
import compact from '../src/data/compact.json';
it("matches the published official roster without collapsing shared administrative codes", async () => {
  const r = await loadReference();
  expect(
    r.units.filter((p) => p.classification === "system-unit"),
  ).toHaveLength(r.publishedSystemTotal);
  expect(r.units.filter((p) => p.classification === "affiliated")).toHaveLength(
    r.headingCounts["Affiliated Areas"],
  );
  expect(new Set(r.units.map((p) => p.id)).size).toBe(r.units.length);
  expect(r.units.filter((p) => p.parkCode === "dena").length).toBe(2);
  expect(r.units.filter((p) => p.designation === "National Park")).toHaveLength(
    r.headingCounts["National Parks"],
  );
});

it('losslessly decodes the compact offline reference and rejects invalid pointers',()=>{
 expect(unpackReference(compact)).toEqual(readable);
 expect(()=>unpackReference({strings:[],reference:{$:0}})).toThrow('Invalid reference');
});
it('only filters trails with supported structured attributes',()=>{
 const a={id:'fixture',name:'Fixture',kind:'trail' as const,description:'Waterfall words alone do not establish a tag',source:'https://www.nps.gov/'};
 expect(matchesTrail(a,'Waterfalls')).toBe(false);
 expect(matchesTrail(a,'Short trails (up to 2 mi)')).toBe(false);
 expect(matchesTrail({...a,length:{value:3,unit:'km',method:'round trip'}},'Short trails (up to 2 mi)')).toBe(true);
 expect(matchesTrail({...a,tags:['waterfall']},'Waterfalls')).toBe(true);
 expect(matchesTrail({...a,kind:'place',tags:['waterfall']},'Waterfalls')).toBe(false);
 expect(matchesTrail(a,'Accessibility described')).toBe(false);
 expect(normalizeSearch('Hōnaunau')).toBe('honaunau');
});
it("validates route-safe IDs, coordinates, citations and private-data exclusion", async () => {
  const r = await loadReference();
  for (const p of r.units) {
    expect(p.id).toMatch(/^[a-z0-9][a-z0-9._-]{0,79}$/);
    expect(p.sources.length).toBeGreaterThan(0);
    expect(safeUrl(p.website)).toBeTruthy();
    if (p.location) {
      expect(Math.abs(p.location.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(p.location.longitude)).toBeLessThanOrEqual(180);
    }
    expect(p).not.toHaveProperty("visits");
    expect(p).not.toHaveProperty("companions");
  }
});

it("validates article provenance and stable attraction identities",async()=>{
 const r=await loadCompleteReference();
 for(const p of r.units){
  expect(new Set(p.attractions.map(a=>a.id)).size).toBe(p.attractions.length);
  for(const a of p.articles??[]){
   expect(a.text.length).toBeGreaterThan(0);
   expect(a.text.split(/\s+/).length).toBeLessThanOrEqual(181);
   expect(new URL(a.source).hostname).toBe('www.nps.gov');
   expect(Number.isFinite(Date.parse(a.retrievedAt))).toBe(true);
   expect(p.sources.some(s=>s.url===a.source)).toBe(true);
  }
  for(const a of p.attractions){expect(safeUrl(a.source)).toBeTruthy();expect(a.id).toMatch(/^[a-z0-9][a-z0-9._-]{0,79}$/)}
 }
});
it('loads a compact searchable catalog and reconstructs every detailed park losslessly',async()=>{
 const catalog=await loadReference(),full=await loadCompleteReference();
 expect(catalog.units.every(p=>!p.articles?.length)).toBe(true);
 expect(full.units.map(({articleCount,detailShard,searchTerms,...p})=>p)).toEqual(readable.units);
 expect(await loadParkDetails('not-an-official-unit')).toBeUndefined();
});
it('matches exact state names, punctuation and diacritics without confusing Virginia and West Virginia',async()=>{
 const r=await loadReference(),neri=r.units.find(p=>p.parkCode==='neri')!;
 expect(matchesParkSearch(neri,'Virginia')).toBe(false);expect(matchesParkSearch(neri,'West Virginia')).toBe(true);
 expect(matchesParkSearch(neri,'WV')).toBe(true);expect(matchesParkSearch(neri,'VA')).toBe(false);
 expect(normalizeSearch("Pa’rus—Hōnaunau")).toBe('pa rus honaunau');
});
it('keeps missing difficulty and distance distinct from easy short trails',()=>{
 const a={id:'fixture',name:'Fixture',kind:'trail' as const,description:'Fixture',source:'https://www.nps.gov/'};
 expect(matchesTrailDetails(a,'short','easy','')).toBe(false);
 expect(matchesTrailDetails(a,'unknown','unknown','')).toBe(true);
 expect(matchesTrailDetails({...a,kind:'place'},'unknown','','')).toBe(false);
 expect(matchesTrailDetails({...a,length:{value:3,unit:'km',method:'one way'}},'short','','')).toBe(true);
});

it("finds full state names and sourced article or attraction terms",async()=>{
 const r=await loadReference(),p=r.units.find(p=>p.id==='cuyahoga-valley-national-park')!;
 expect(parkSearchText(p)).toContain('ohio');
 const fixture={...p,articles:[{topic:'Nature',title:'Ecology',text:'Synthetic habitat phrase',source:p.website,retrievedAt:r.retrievedAt}]};
 expect(parkSearchText(fixture)).toContain('synthetic habitat phrase');
});
