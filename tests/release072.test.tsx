// @vitest-environment jsdom
import React from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,waitFor,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {createScreen} from '../src/screen';
import {entity,entities,newVisit,Repository,validSnapshot,visits,type Stop} from '../src/domain';
import type {Host,Store,Snapshot} from '../src/host';
import type {Park,Reference} from '../src/reference';
let unavailable=false;
const p:Park={id:'fixture',parkCode:'test',name:'Synthetic Ohio Site',states:['OH'],designation:'National Historic Site',classification:'system-unit',description:'Synthetic test reference',website:'https://www.nps.gov/test/',sources:[],research:[],activities:[],topics:[],attractions:[{id:'known',name:'Known Route',kind:'trail',description:'Synthetic historic route',source:'https://www.nps.gov/test/route.htm',length:{value:1,unit:'mi',method:'one way'},difficulty:'Easy',routeType:'out-and-back',tags:['historic']},{id:'unknown',name:'Unknown Route',kind:'trail',description:'Synthetic route without measurements',source:'https://www.nps.gov/test/other.htm'}]};
vi.mock('../src/reference',async(original)=>({...await original<typeof import('../src/reference')>(),loadReference:async()=>{if(unavailable)throw Error('Synthetic missing cache');return {formatVersion:1,retrievedAt:'2026-10-29',rosterUrl:p.website,publishedSystemTotal:1,headingCounts:{},attribution:'Synthetic',licenseUrl:p.website,units:[p]} as Reference}}));
class Memory implements Store{
 data:Snapshot={records:[],settings:[]};async snapshot(){return structuredClone(this.data)}async asset(){return undefined}
 async atomic(change:(s:Snapshot)=>Snapshot){const next=change(await this.snapshot());if(!validSnapshot(next))throw Error('Invalid snapshot');this.data=structuredClone(next)}
}
const host:Host={apiVersion:1,Button:props=><button {...props}/>,Card:props=><div>{props.children}</div>,optimizeImage:async()=>new Blob(),ConfirmDialog:()=>null};
const Screen=createScreen(host);
function setup(route:string,store=new Memory()){const services={store,report:vi.fn(()=>''),events:{emit:vi.fn()}};return {store,...render(<Screen route={route} services={services}/>)};}
afterEach(()=>{cleanup();unavailable=false;location.hash=''});
it('combines region, difficulty and distance while keeping unknown routes separate',async()=>{
 const u=userEvent.setup();setup('trails');await screen.findByRole('heading',{name:'Trail discovery'});
 await u.selectOptions(screen.getByLabelText('Discovery region'),'Midwest');await u.selectOptions(screen.getByLabelText('Trail distance'),'short');await u.selectOptions(screen.getByLabelText('Trail difficulty'),'easy');
 expect(screen.getByText('1 sourced matches')).toBeTruthy();expect(screen.queryByRole('link',{name:'Unknown Route'})).toBeNull();
 await u.click(screen.getByRole('button',{name:'Reset attraction filters'}));await u.selectOptions(screen.getByLabelText('Trail difficulty'),'unknown');expect(screen.getByRole('link',{name:'Unknown Route'})).toBeTruthy();expect(screen.queryByRole('link',{name:'Known Route'})).toBeNull();
});
it('adds an independently identified attraction stop without rewriting visits or existing stops',async()=>{
 const store=new Memory(),repo=new Repository(store),plan=entity('plan',{name:'Synthetic trip',notes:'Keep trip notes',stops:[{id:'old-stop',parkId:'fixture',notes:'Keep stop notes',completed:true,attractions:['unavailable-reference']}]});
 await repo.save(plan);await repo.save(newVisit('fixture'));const before=visits(entities(store.data));
 const u=userEvent.setup();setup('attraction/fixture/known',store);await screen.findByRole('heading',{name:'Known Route'});await u.selectOptions(screen.getByLabelText('Trip for this attraction'),plan.id);await u.click(screen.getByRole('button',{name:'Add attraction stop'}));
 await waitFor(()=>expect((entities(store.data).find(e=>e.id===plan.id)!.stops as unknown as Stop[])).toHaveLength(2));
 const saved=entities(store.data).find(e=>e.id===plan.id)!,stops=saved.stops as unknown as Stop[];
 expect(stops[0]).toEqual((plan.stops as unknown as Stop[])[0]);expect(stops[1].attractions).toEqual(['known']);expect(stops[1].completed).toBe(false);expect(stops[1].id).not.toBe(stops[0].id);expect(visits(entities(store.data))).toEqual(before);
});
it('opens locally saved journal records even when the public catalog cache is missing',async()=>{
 const store=new Memory();await new Repository(store).save({...newVisit('fixture'),notes:'Keep this local memory'});unavailable=true;
 const u=userEvent.setup();setup('visits',store);await screen.findByText('Keep this local memory');expect(screen.getByText(/Reference catalog unavailable/)).toBeTruthy();
 unavailable=false;await u.click(screen.getByRole('button',{name:'Retry reference catalog'}));await screen.findByRole('link',{name:p.name});expect(visits(entities(store.data))).toHaveLength(1);
});
it('shows missing saved attraction references without silently removing them',async()=>{
 const store=new Memory(),plan=entity('plan',{name:'Fixture',notes:'',stops:[{id:'stop',parkId:'fixture',notes:'',completed:false,attractions:['retired-id']}]});await new Repository(store).save(plan);
 setup('plan/'+plan.id,store);await screen.findByText(/Some saved attraction references are unavailable/);expect((entities(store.data)[0].stops as unknown as Stop[])[0].attractions).toEqual(['retired-id']);
});
it('passes available axe rules on trail discovery and individual detail pages',async()=>{
 const v=setup('trails');await screen.findByRole('heading',{name:'Trail discovery'});
 expect((await axe.run(v.container,{rules:{'color-contrast':{enabled:false},region:{enabled:false}}})).violations).toEqual([]);
 cleanup();const detail=setup('attraction/fixture/unknown');await screen.findByRole('heading',{name:'Unknown Route'});
 expect((await axe.run(detail.container,{rules:{'color-contrast':{enabled:false},region:{enabled:false}}})).violations).toEqual([]);
});
it('adds to the chosen repeated stop, preserves other records and rejects duplicates',async()=>{
 const store=new Memory(),repo=new Repository(store),plan=entity('plan',{name:'Repeat trip',notes:'trip notes',stops:[{id:'first',parkId:'fixture',notes:'First day',completed:true,attractions:['unknown']},{id:'second',parkId:'fixture',notes:'Second day',completed:false,attractions:['retired-id']}]});
 await repo.save(plan);await repo.save(newVisit('fixture'));const before=visits(entities(store.data));
 const u=userEvent.setup();setup('attraction/fixture/known',store);await screen.findByRole('heading',{name:'Known Route'});await u.selectOptions(screen.getByLabelText('Trip for this attraction'),plan.id);await u.selectOptions(screen.getByLabelText('Park stop'),'second');await u.click(screen.getByRole('button',{name:'Add attraction stop'}));
 await screen.findByText(/existing stop updated/);const saved=entities(await store.snapshot()).find(e=>e.id===plan.id)!,stops=saved.stops as unknown as Stop[];
 expect(stops[0]).toEqual((plan.stops as unknown as Stop[])[0]);expect(stops[1]).toEqual({id:'second',parkId:'fixture',notes:'Second day',completed:false,attractions:['retired-id','known']});expect(visits(entities(store.data))).toEqual(before);
 await u.click(screen.getByRole('button',{name:'Add attraction stop'}));await screen.findByText(/already selected/);expect((entities(store.data).find(e=>e.id===plan.id)!.stops as unknown as Stop[])[1].attractions).toEqual(['retired-id','known']);
});
it('orders activities independently in repeated stops and persists missing references',async()=>{
 const store=new Memory(),repo=new Repository(store),plan=entity('plan',{name:'Order fixture',notes:'trip note',stops:[{id:'one',parkId:'fixture',notes:'keep note',completed:true,attractions:['known','retired-id','unknown']},{id:'two',parkId:'fixture',notes:'other stop',completed:false,attractions:['unknown','known']}]});
 await repo.save(plan);await repo.save(newVisit('fixture'));const before=visits(entities(store.data));const u=userEvent.setup();setup('plan/'+plan.id,store);
 await screen.findByText('Unavailable saved attraction reference: retired-id. It remains saved until you remove it.');
 expect((screen.getAllByRole('button',{name:'Move Known Route up'})[0] as HTMLButtonElement).disabled).toBe(true);
 await u.click(screen.getAllByRole('button',{name:'Move Unknown Route up'})[0]);await u.click(screen.getByRole('button',{name:'Save trip plan'}));
 await waitFor(()=>expect(((entities(store.data).find(e=>e.id===plan.id)!.stops as unknown as Stop[])[0]).attractions).toEqual(['known','unknown','retired-id']));
 const stops=entities(await store.snapshot()).find(e=>e.id===plan.id)!.stops as unknown as Stop[];expect(stops[0].notes).toBe('keep note');expect(stops[0].completed).toBe(true);expect(stops[1]).toEqual((plan.stops as unknown as Stop[])[1]);expect(visits(entities(store.data))).toEqual(before);
});
it('renders an ordered read-only itinerary with repeated parks, notes and missing references',async()=>{
 const store=new Memory(),plan=entity('plan',{name:'Overview fixture',notes:'First line\nSecond line',stops:[{id:'a',parkId:'fixture',notes:'Stop note',completed:true,attractions:['unknown','known','retired-id']},{id:'b',parkId:'fixture',notes:'Repeat stop',completed:false,attractions:[]},{id:'c',parkId:'missing-park',notes:'Missing park note',completed:false,attractions:['missing-place']}]});await new Repository(store).save(plan);const before=await store.snapshot();setup('itinerary/'+plan.id,store);
 await screen.findByRole('heading',{name:'Overview fixture'});expect(screen.getByText(/3 park stops · 1 completed · 4 planned activity selections/)).toBeTruthy();expect(screen.getByText(/First line/).textContent).toBe('First line\nSecond line');expect(screen.getByText('Stop note')).toBeTruthy();expect(screen.getByText('Repeat stop')).toBeTruthy();expect(screen.getByText(/Identifier: retired-id/)).toBeTruthy();expect(screen.getByText(/Park identifier: missing-park/)).toBeTruthy();expect(screen.getByText(/1 mi \(one way\)/)).toBeTruthy();expect(screen.getByText(/Distance unknown/)).toBeTruthy();expect(screen.getAllByRole('listitem')[0].textContent).toContain('Unknown Route');expect(screen.getAllByRole('listitem')[1].textContent).toContain('Known Route');expect(screen.getByRole('button',{name:'Print itinerary'})).toBeTruthy();expect(await store.snapshot()).toEqual(before);
});
it('provides a useful empty itinerary',async()=>{const store=new Memory(),plan=entity('plan',{name:'Empty fixture',notes:'',stops:[]});await new Repository(store).save(plan);setup('itinerary/'+plan.id,store);await screen.findByText(/No park stops planned yet/);expect(screen.getByRole('link',{name:'Edit trip'})).toBeTruthy()});
it('summarizes repeated stops, selections and next incomplete park without writing',async()=>{
 const store=new Memory(),repo=new Repository(store),plan=entity('plan',{name:'Dashboard fixture',notes:'private',stops:[{id:'one',parkId:'fixture',notes:'',completed:true,attractions:['known','retired-id']},{id:'two',parkId:'fixture',notes:'',completed:false,attractions:['known']},{id:'three',parkId:'missing',notes:'',completed:false,attractions:[]}]});await repo.save(plan);const before=await store.snapshot();setup('plans',store);await screen.findByRole('heading',{name:'Dashboard fixture'});expect(screen.getByText('3 park stops · 3 planned activities')).toBeTruthy();expect(screen.getByText('Progress: 1 of 3 stops completed')).toBeTruthy();expect(screen.getByText('Next incomplete stop: Synthetic Ohio Site')).toBeTruthy();expect(screen.getByRole('progressbar',{name:'Stop completion for Dashboard fixture'}).getAttribute('value')).toBe('1');expect(screen.getByRole('link',{name:'View itinerary for Dashboard fixture'}).getAttribute('href')).toContain('itinerary/'+plan.id);expect(screen.getByRole('link',{name:'Edit trip Dashboard fixture'}).getAttribute('href')).toContain('plan/'+plan.id);expect(await store.snapshot()).toEqual(before);
});
it('handles empty, completed and missing-park trips',async()=>{const store=new Memory(),repo=new Repository(store);for(const [name,stops] of [['Empty',[]],['Done',[{id:'a',parkId:'fixture',notes:'',completed:true,attractions:[]}]],['Missing',[{id:'b',parkId:'gone',notes:'',completed:false,attractions:[]}]]] as const)await repo.save(entity('plan',{name,notes:'',stops:stops as unknown as import('../src/host').Json[]}));setup('plans',store);await screen.findByText('No stops added yet.');expect(screen.getByText('All planned stops completed.')).toBeTruthy();expect(screen.getByText('Next incomplete stop: Park reference unavailable (gone)')).toBeTruthy();expect(screen.queryByRole('progressbar',{name:'Stop completion for Empty'})).toBeNull()});
