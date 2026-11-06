// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PhotoGallery,availablePhotos} from '../src/PhotoGallery';
import {loadReference,type Park} from '../src/reference';
import {matchesParkTheme,parkThemes} from '../src/discovery';
afterEach(()=>{cleanup();vi.restoreAllMocks()});
it('builds subject collections from official designations and structured attraction kinds',async()=>{
 const r=await loadReference(),ohio=r.units.find(p=>p.name==='Cuyahoga Valley National Park')!,timp=r.units.find(p=>p.name==='Timpanogos Cave National Monument')!;
 expect(matchesParkTheme(ohio,'water')).toBe(true);expect(matchesParkTheme(timp,'caves')).toBe(true);
 expect(matchesParkTheme({...timp,attractions:[],description:'cave cave cave'},'caves')).toBe(false);
 expect(matchesParkTheme({...ohio,designation:'National Seashore',attractions:[]},'coasts')).toBe(true);
 expect(matchesParkTheme(ohio,'unknown')).toBe(false);
 for(const t of parkThemes)expect(r.units.some(p=>matchesParkTheme(p,t.id))).toBe(true);
 expect(r.units).toHaveLength(467);
});
it('navigates verified offline images, cites each source, and restores focus on close',async()=>{
 const r=await loadReference(),photos=availablePhotos(r.units);expect(photos.length).toBeGreaterThanOrEqual(4);
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute('open','')}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute('open')}});
 const user=userEvent.setup();render(<PhotoGallery parks={r.units}/>);const trigger=screen.getByRole('button',{name:'Open photo gallery'});await user.click(trigger);
 expect(screen.getByRole('dialog')).toBeTruthy();expect(screen.getByRole('heading',{name:photos[0].park.name})).toBeTruthy();
 expect(screen.getByRole('link',{name:'Image source and rights ↗'}).getAttribute('href')).toBe(photos[0].photo.source);
 await user.click(screen.getByRole('button',{name:'Next photograph'}));expect(screen.getByRole('heading',{name:photos[1].park.name})).toBeTruthy();
 await user.keyboard('{ArrowLeft}');expect(screen.getByRole('heading',{name:photos[0].park.name})).toBeTruthy();
 await user.click(screen.getByRole('button',{name:'Close gallery'}));expect(screen.queryByRole('dialog')).toBeNull();
 delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
});
it('omits a gallery when there is no bundled photograph',()=>{
 const park={id:'x',photographs:[{id:'unknown'}]} as Park;expect(availablePhotos([park])).toEqual([]);const view=render(<PhotoGallery parks={[park]}/>);expect(view.container.textContent).toBe('');
});
it('describes a single park without claiming its coverage is incomplete',async()=>{
 const r=await loadReference(),park=r.units.find(p=>(p.photographs?.length??0)>=5)!;
 const view=render(<PhotoGallery parks={[park]}/>);
 expect(view.container.textContent).toContain('available offline');expect(view.container.textContent).not.toContain('Coverage is incomplete');
 view.rerender(<PhotoGallery parks={[park,{...park,id:'no-photos',photographs:[]}]}/>);
 expect(view.container.textContent).toContain('Coverage is incomplete');
});
it('keeps gallery thumbnails bounded as the reference library grows',async()=>{
 const r=await loadReference();const imageParks=r.units.filter(p=>p.photographs?.length).slice(0,4);const many=Array.from({length:20},(_,i)=>({...imageParks[i%imageParks.length],id:'fixture-'+i}));
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute('open','')}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute('open')}});
 const user=userEvent.setup();render(<PhotoGallery parks={many}/>);await user.click(screen.getByRole('button',{name:'Open photo gallery'}));
 expect(screen.getAllByRole('button',{name:/Show photo/}).length).toBeLessThanOrEqual(9);
 delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
});
