// @vitest-environment jsdom
import React from 'react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import axe from 'axe-core';
import {Atlas} from '../src/Atlas';
import {ComparisonStudio} from '../src/AtlasPanels';
import {summarize,filterAtlas,defaultFilters,validLocation,atlasRegions,metricValue} from '../src/atlas-data';
import {choroplethColor,markerColor,defaultLayers} from '../src/atlas-layers';
import {terrainInfo,terrainAvailability} from '../src/AtlasCartography';
import {projectedPoint,boundaryByCode,jurisdictions,areaBounds,wrappedLongitude} from '../src/atlas-geometry';
import {loadReference,type Park} from '../src/reference';

const p=(id:string,states=['OH'],classification:Park['classification']='system-unit'):Park=>({id,parkCode:id,name:'Unit '+id,designation:'National Park',classification,states,description:'Test fixture only',website:'https://www.nps.gov',sources:[],research:[],activities:[],topics:[],attractions:[],location:{latitude:40,longitude:-82,kind:'reference',source:'https://www.nps.gov'}});
const a=p('a',['OH','WV']),b=p('b'),c={...p('c',['GU'],'affiliated'),location:undefined};
a.attractions=[{id:'trail',name:'Test trail',kind:'trail',description:'fixture',source:'https://www.nps.gov'},{id:'museum',name:'Test museum',kind:'museum',description:'fixture',source:'https://www.nps.gov'}];
afterEach(cleanup);

describe('defensible geographic aggregation',()=>{
 it('deduplicates stable IDs nationally and counts a multistate unit in each listed jurisdiction',()=>{
  const data=[a,b,c,{...a}];expect(summarize(data,'all').total).toBe(3);expect(summarize(data,'all').official).toBe(2);expect(summarize(data,'all').affiliated).toBe(1);
  expect(summarize(data,'OH').total).toBe(2);expect(summarize(data,'WV').total).toBe(1);expect(summarize(data,'GU').total).toBe(1);
  expect(summarize(data,'WV').coordinates).toBe(1); // Association is independent of where the point falls.
 });
 it('uses distinct itemized visited IDs and a defined denominator, preserving unknown vs zero',()=>{
  const s=summarize([a,b,c],'all',new Set(['a','unknown']),new Set(['c']));expect(s.visited).toBe(1);expect(s.visitPercent).toBeCloseTo(100/3);expect(s.saved).toBe(1);
  expect(summarize([a,b],'OH').visitPercent).toBe(0);expect(summarize([a,b],'VI').visitPercent).toBeNull();expect(summarize([a,b],'VI').total).toBe(0);
 });
 it('counts documented trails and nontrail attractions separately and never invents missing coverage',()=>{
  const s=summarize([a,b,c],'all');expect([s.trails,s.attractions,s.trailRecords,s.attractionRecords]).toEqual([1,1,1,1]);expect(s.coordinates).toBe(2);expect(s.designations).toEqual({'National Park':3});
  expect(validLocation({...b,location:{...b.location!,longitude:190}})).toBe(false);expect(validLocation({...b,location:{...b.location!,latitude:NaN}})).toBe(false);
 });
 it('combines filters consistently for map points, inventories and summaries without mutation',()=>{
  const original=structuredClone([a,b,c]),visited=new Set(['a']),saved=new Set(['c']);
  const f=filterAtlas([a,b,c],{...defaultFilters,visit:'visited',attribute:'trails',region:'Midwest'},visited,saved);expect(f.map(x=>x.id)).toEqual(['a']);expect(summarize(f,'OH',visited).visitPercent).toBe(100);
  expect(filterAtlas([a,b,c],{...defaultFilters,query:'Ohio'},visited,saved).length).toBe(2);expect(filterAtlas([a,b,c],{...defaultFilters,attribute:'saved'},visited,saved).map(x=>x.id)).toEqual(['c']);
  expect([a,b,c]).toEqual(original);expect(filterAtlas([a,b,c],{...defaultFilters,visit:'unrecorded'},visited,saved).length).toBe(2);
 });
 it('covers every jurisdiction and retains all 467 actual roster records',async()=>{
  const r=await loadReference(),s=summarize(r.units,'all');expect([s.total,s.official,s.affiliated]).toEqual([467,434,33]);expect(jurisdictions).toHaveLength(56);
  expect(new Set(Object.values(atlasRegions).flat())).toEqual(new Set(jurisdictions.map(([c])=>c)));
  const sum=jurisdictions.reduce((n,[c])=>n+summarize(r.units,c).total,0);expect(sum).toBeGreaterThan(s.total);
 });
});

describe('cartographic layers and registered terrain',()=>{
 it('distinguishes zero and missing denominators, bounds the scale, and gives selected markers precedence',()=>{
  expect(choroplethColor(null,100)).not.toBe(choroplethColor(0,100));expect(choroplethColor(500,10)).toBe('#225e54');
  for(const mode of ['locations','designation','visitation','coverage'] as const)expect(markerColor(mode,{selected:true,allVisited:true,someVisited:true,designation:'Parks',coverage:true,mixed:false})).toBe('#b64c18');
 });
 it('retains exact terrain extents for every delivered focused jurisdiction and documents missing coverage',()=>{
  expect(Object.keys(terrainInfo.assets)).toHaveLength(53);expect(terrainInfo.sourceSha256).toBe('ff810f5f2747463fd8ffa612b23e5f5e5d593a345218976872b6749610976ab7');
  expect(terrainInfo.embeddedVersion).toBe('2.0.0');expect(terrainInfo.advertisedVersion).toBe('3.2.0');
  for(const [code,asset] of Object.entries(terrainInfo.assets)){expect(asset.width).toBeGreaterThan(0);expect(asset.bytes).toBeGreaterThan(0);expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);if(code!=='us'&&code!=='world')expect(asset.bounds).toEqual(boundaryByCode[code].bounds)}
  for(const c of ['AS','GU','MP','VI','DC'])expect(terrainAvailability(c)).toContain('too coarse');expect(terrainAvailability('OH')).toBeUndefined();expect(terrainAvailability('XX')).toContain('unavailable');
 });
 it('keeps Pacific longitude wrapping continuous and known focused map coordinates inside the registered relief domain',()=>{
  expect(Math.abs(wrappedLongitude(179.5,-160)-wrappedLongitude(-179.5,-160))).toBeLessThan(2);
  for(const [code,lat,lon] of [['CA',37.7,-119.6],['AK',63,-151],['HI',19.5,-155.5],['PR',18.2,-66.4]] as const){const pt=projectedPoint({...p('fixture',[code]),location:{latitude:lat,longitude:lon,kind:'reference',source:''}},code)!;const [x,y,w,h]=terrainInfo.assets[code].bounds;expect(pt.x).toBeGreaterThanOrEqual(x);expect(pt.x).toBeLessThanOrEqual(x+w);expect(pt.y).toBeGreaterThanOrEqual(y);expect(pt.y).toBeLessThanOrEqual(y+h)}
 });
 it('toggles layers without removing the accessible inventory and keeps zoom while changing marker modes',()=>{
  render(<Atlas parks={[a,b,c]} onSelect={()=>{}}/>);fireEvent.click(screen.getByText(/Layers & map style/));fireEvent.click(screen.getByLabelText(/Park reference points/));expect(document.querySelectorAll('.np-atlas-pin').length).toBe(0);expect(screen.getByRole('option',{name:'Unit c · location unknown'})).toBeTruthy();
fireEvent.click(screen.getByLabelText(/Park reference points/));expect(document.querySelectorAll('.np-atlas-pin').length).toBeGreaterThan(0);fireEvent.click(screen.getByRole('button',{name:'Zoom in'}));fireEvent.change(screen.getByLabelText('Marker coloring'),{target:{value:'designation'}});expect(screen.getByLabelText('Zoom 1.6 times')).toBeTruthy();expect(within(screen.getByLabelText('Map legend')).getByText('Monuments')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Reset layers'}));expect((screen.getByLabelText('Map style') as HTMLSelectElement).value).toBe('standard');
 });
 it('shows an honest terrain fallback and preserves territory navigation',async()=>{
  render(<Atlas parks={[a,c]} stateFilter="GU" onSelect={()=>{}}/>);fireEvent.click(screen.getByText(/Layers & map style/));fireEvent.change(screen.getByLabelText('Map style'),{target:{value:'terrain'}});expect(await screen.findByText(/Source resolution is too coarse/)).toBeTruthy();expect(screen.getByLabelText('Geographic outlines for Guam')).toBeTruthy();
 });
 it('provides exact accessible statistics for all 56 jurisdictions, including empty denominators',()=>{
  render(<Atlas parks={[a,b,c]} onSelect={()=>{}}/>);fireEvent.click(screen.getByText(/Jurisdiction statistics table/));const rows=within(screen.getByRole('table')).getAllByRole('row');expect(rows).toHaveLength(57);expect(rows.find(r=>r.textContent?.includes('Guam'))?.textContent).toContain('1');
 });
 it('compares two to four jurisdictions with a common scale and stable record links',()=>{
  function Wrapper(){const [codes,setCodes]=React.useState(['OH','GU']);return <ComparisonStudio codes={codes} onCodes={setCodes} summaries={jurisdictions.map(([code])=>summarize([a,b,c],code,new Set(['a'])))} metric="visitPercent" onMetric={()=>{}} onArea={()=>{}} discoveryHref={c=>'#/apps/national-parks/explore/state%3D'+c}/>}
  render(<Wrapper/>);expect(screen.getByText(/shared scale \(0–100%\)/)).toBeTruthy();expect(screen.getByText('50.0%')).toBeTruthy();expect(screen.getByText('0.0%')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Add jurisdiction'}));fireEvent.click(screen.getByRole('button',{name:'Add jurisdiction'}));expect((screen.getByRole('button',{name:'Add jurisdiction'}) as HTMLButtonElement).disabled).toBe(true);expect(screen.getAllByLabelText(/^Jurisdiction \d/)).toHaveLength(4);fireEvent.click(screen.getByRole('button',{name:'Remove Guam'}));expect(screen.getAllByLabelText(/^Jurisdiction \d/)).toHaveLength(3);
 });
 it('opens a rich cluster preview, closes it and keeps the input records unchanged',()=>{
  const before=structuredClone([a,b]);render(<Atlas parks={[a,b]} stateFilter="OH" visitedIds={new Set(['a'])} onSelect={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'2 nearby park units: open list'}));fireEvent.click(within(screen.getByRole('region',{name:'Overlapping park units'})).getByRole('button',{name:'Unit a'}));const preview=screen.getByRole('article',{name:'Selected park'});expect(preview.textContent).toContain('Recorded visited');expect(preview.textContent).toContain('Test museum');fireEvent.click(screen.getByRole('button',{name:'Close preview'}));expect(screen.queryByRole('article',{name:'Selected park'})).toBeNull();expect([a,b]).toEqual(before);
 });
 it('passes automated accessibility rules for layer controls, comparison, and exact statistics',async()=>{
  const view=render(<Atlas parks={[a,b,c]} onSelect={()=>{}}/>);fireEvent.click(screen.getByText(/Layers & map style/));fireEvent.click(screen.getByRole('button',{name:'Compare jurisdictions'}));fireEvent.click(screen.getByText(/Jurisdiction statistics table/));const result=await axe.run(view.container,{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});expect(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
 });
});
