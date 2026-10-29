// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { createScreen } from '../src/screen';
import { entities, newVisit, Repository, validSnapshot, visits, type Stop } from '../src/domain';
import type { Host, Snapshot, Store } from '../src/host';
const fixture = { id:'test-park', parkCode:'test', name:'Synthetic Park', designation:'National Park', classification:'system-unit', states:['OH'], website:'https://www.nps.gov/test/', description:'Synthetic reference for isolated tests.', sources:[], research:[], activities:[], topics:[], attractions:[], location:{latitude:40,longitude:-82,kind:'Administrative reference point',source:'https://www.nps.gov/'}, articles:[{topic:'History & culture',title:'Synthetic history',text:'Synthetic official article fixture.',source:'https://www.nps.gov/test/learn/historyculture/index.htm',retrievedAt:'2026-10-27T00:00:00Z'}] };
vi.mock('../src/reference', async (original) => ({...await original<typeof import('../src/reference')>(), loadReference:async()=>({formatVersion:1,retrievedAt:'2026-10-27',rosterUrl:'https://www.nps.gov/',publishedSystemTotal:1,headingCounts:{'Affiliated Areas':0},attribution:'Synthetic fixture',licenseUrl:'https://www.nps.gov/',units:[fixture]})}));
class Memory implements Store {
 data:Snapshot={records:[],settings:[]};
 async snapshot(){return structuredClone(this.data)}
 async asset(){return undefined}
 async atomic(change:(s:Snapshot)=>Snapshot){const next=change(await this.snapshot());if(!validSnapshot(next))throw Error('Invalid snapshot');this.data=structuredClone(next)}
}
const host:Host={apiVersion:1,Button:p=><button {...p}/>,Card:p=><div>{p.children}</div>,optimizeImage:async()=>new Blob(),ConfirmDialog:p=>p.open?<div role="dialog" aria-label={p.title}>{p.children}<button onClick={p.onConfirm}>{p.confirm}</button><button onClick={p.onCancel}>Cancel</button></div>:null};
const Screen=createScreen(host);
function setup(route:string,store=new Memory()){
 const services={store,report:vi.fn(()=>''),events:{emit:vi.fn()}};
 const view=render(<Screen route={route} services={services}/>);
 return {store,services,...view,go:(route:string)=>view.rerender(<Screen route={route} services={services}/>)};
}
afterEach(()=>{cleanup();location.hash='';vi.restoreAllMocks()});
it('creates, edits, reopens and deletes a visit while preserving unknown dates',async()=>{
 const u=userEvent.setup(),v=setup('visit/new/test-park');
 await screen.findByRole('heading',{name:'Record visit'});
 await u.selectOptions(screen.getByLabelText('Experience'),'pass-through');
 await u.type(screen.getByLabelText('Personal notes'),'Synthetic test notes');
 await u.click(screen.getByRole('button',{name:'Save visit'}));
 await waitFor(()=>expect(visits(entities(v.store.data))).toHaveLength(1));
 let record=visits(entities(v.store.data))[0];
 expect(record.date).toBe('');expect(record.duration).toBe('');expect(record.experience).toBe('pass-through');
 v.go('visit/'+record.id);await screen.findByRole('heading',{name:'Edit visit'});
 await u.selectOptions(screen.getByLabelText('Date precision'),'approximate');
 await u.type(screen.getByLabelText('Approximate period'),'Summer, year uncertain');
 await u.click(screen.getByRole('button',{name:'Save visit'}));
 await waitFor(()=>expect(visits(entities(v.store.data))[0].date).toBe('Summer, year uncertain'));
 v.go('visits');await screen.findByText('Synthetic test notes');v.go('visit/'+record.id);
 expect((await screen.findByLabelText('Approximate period') as HTMLInputElement).value).toBe('Summer, year uncertain');
 await u.click(screen.getByRole('button',{name:'Delete visit'}));expect(visits(entities(v.store.data))).toHaveLength(1);
 await u.click(screen.getByRole('button',{name:'Confirm'}));await waitFor(()=>expect(v.store.data.records).toHaveLength(0));
});
it('preserves repeat itinerary stops, reorders their notes, and never creates visits from completion',async()=>{
 const u=userEvent.setup(),v=setup('plan/new');await screen.findByLabelText('Trip name');
 await u.type(screen.getByLabelText('Trip name'),'Synthetic itinerary');
 await u.selectOptions(screen.getByLabelText('Park to add'),'test-park');
 await u.click(screen.getByRole('button',{name:'Add stop'}));
 await u.selectOptions(screen.getByLabelText('Park to add'),'test-park');
 await u.click(screen.getByRole('button',{name:'Add stop'}));
 await u.type(screen.getByLabelText('Stop 1 notes'),'First stop');await u.type(screen.getByLabelText('Stop 2 notes'),'Return stop');
 await u.click(screen.getAllByRole('button',{name:'Move up'})[1]);
 await u.click(screen.getAllByLabelText('Stop completed')[0]);await u.click(screen.getByRole('button',{name:'Save trip plan'}));
 await waitFor(()=>expect(entities(v.store.data)).toHaveLength(1));
 const plan=entities(v.store.data)[0],stops=plan.stops as unknown as Stop[];
 expect(stops.map(s=>s.notes)).toEqual(['Return stop','First stop']);expect(stops[0].completed).toBe(true);expect(stops[0].id).not.toBe(stops[1].id);expect(visits(entities(v.store.data))).toHaveLength(0);
 v.go('plans');await screen.findByText(/1 of 2 stops completed/);v.go('plan/'+plan.id);
 expect((await screen.findByLabelText('Stop 1 notes') as HTMLTextAreaElement).value).toBe('Return stop');
});
it('blocks a stale edit after another window changes a record and permits explicit reload',async()=>{
 const s=new Memory(),repo=new Repository(s);await repo.save(newVisit('test-park'));const old=visits(entities(s.data))[0];
 const u=userEvent.setup();setup('visit/'+old.id,s);await screen.findByLabelText('Personal notes');
 await u.type(screen.getByLabelText('Personal notes'),'Unsaved draft');
 await repo.save({...old,notes:'Other window'},old.updatedAt);
 await act(async()=>{window.dispatchEvent(new Event('focus'))});
 await screen.findByText('Saved visit changed.');expect((screen.getByRole('button',{name:'Save visit'}).closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
 await u.click(screen.getByRole('button',{name:'Discard draft and reload saved visit'}));
 expect((screen.getByLabelText('Personal notes') as HTMLTextAreaElement).value).toBe('Other window');
});
it('filters the catalog, selects the atlas through keyboard controls, and displays sourced offline articles',async()=>{
 const u=userEvent.setup(),v=setup('catalog');await screen.findByLabelText('Search parks');
 await u.type(screen.getByLabelText('Search parks'),'missing');expect(screen.getByText('0 matching places')).toBeTruthy();
 await u.clear(screen.getByLabelText('Search parks'));await u.type(screen.getByLabelText('Search parks'),'Ohio');expect(screen.getByText('1 matching places')).toBeTruthy();
 v.go('atlas');await screen.findByLabelText('Accessible location selector');
 await u.selectOptions(screen.getByLabelText('Accessible location selector'),'test-park');
 expect(screen.getByRole('article',{name:'Selected park'}).textContent).toContain('Synthetic Park');
 expect(screen.getByRole('link',{name:'Open park profile →'}).getAttribute('href')).toContain('park/test-park');
 v.go('park/test-park');await screen.findByText('Synthetic official article fixture.');
 expect(screen.getByRole('link',{name:'Read the full official article ↗'}).getAttribute('href')).toBe(fixture.articles[0].source);
});
it('reports failed writes and preserves the current draft for retry',async()=>{
 const u=userEvent.setup(),v=setup('visit/new/test-park');await screen.findByLabelText('Personal notes');
 await u.type(screen.getByLabelText('Personal notes'),'Keep this draft');
 vi.spyOn(v.store,'atomic').mockRejectedValueOnce(Error('Storage unavailable'));
 await u.click(screen.getByRole('button',{name:'Save visit'}));await screen.findByRole('alert');
 expect((screen.getByLabelText('Personal notes') as HTMLTextAreaElement).value).toBe('Keep this draft');expect(v.store.data.records).toHaveLength(0);
 await u.click(screen.getByRole('button',{name:'Save visit'}));await waitFor(()=>expect(v.store.data.records).toHaveLength(1));
});
it('combines region and evidence-based trail filters and resets empty results',async()=>{
 const u=userEvent.setup();setup('catalog');await screen.findByLabelText('Region');
 await u.selectOptions(screen.getByLabelText('Region'),'West');expect(screen.getByText('0 matching places')).toBeTruthy();
 await u.click(screen.getByRole('button',{name:'Reset filters'}));expect(screen.getByText('1 matching places')).toBeTruthy();
 await u.selectOptions(screen.getByLabelText('Trail discovery'),'Waterfalls');expect(screen.getByText('0 matching places')).toBeTruthy();
 expect(screen.getByText(/structured information is missing/)).toBeTruthy();
});
it('passes available automated accessibility rules on catalog, profile and attraction filters',async()=>{
 const v=setup('catalog');await screen.findByLabelText('Search parks');
 for(const route of ['catalog','park/test-park','discover']){
  v.go(route);await screen.findByRole('heading',{name:route==='catalog' ? 'Park encyclopedia' : route==='discover' ? 'Attractions & trails' : 'Synthetic Park'});
  const result=await axe.run(v.container,{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});
  expect(result.violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)}))).toEqual([]);
 }
});
