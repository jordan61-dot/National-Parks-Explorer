import {it,expect} from 'vitest';
import {loadReference,loadParkDetails,matchesParkSearch,matchesTrailDetails,parkRegions} from '../src/reference';
import {entity,setActivityCompleted,validEntity} from '../src/domain';
it('finds regional additions through the real catalog, detail shards and structured discovery',async()=>{
 const catalog=await loadReference();const p=catalog.units.find(p=>p.parkCode==='indu')!;
 expect(parkRegions(p)).toContain('Midwest');expect(matchesParkSearch(p,'Calumet Dunes')).toBe(true);expect(matchesParkSearch(p,'Chellberg Farm')).toBe(true);
 const detailed=(await loadParkDetails(p.id))!;const trail=detailed.attractions.find(a=>a.name==='Calumet Dunes Trail')!;
 expect(trail.length).toMatchObject({value:.5,unit:'mi'});expect(trail.length!.method).toContain('loop');expect(matchesTrailDetails(trail,'short','easy','')).toBe(true);
 expect(trail.accessibility).toContain('ADA');expect(trail.locationKind).toMatch(/trailhead/i);
 const hafe=await loadParkDetails('harpers-ferry-national-historical-park');const uncertain=hafe!.attractions.find(a=>a.name==='Schoolhouse Ridge North Trail')!;
 expect(uncertain.length).toBeUndefined();expect(matchesTrailDetails(uncertain,'short','','')).toBe(false);expect(uncertain.conflicts?.length).toBeGreaterThan(0);
});
it('uses new public IDs in existing trip selections and independent activity completion without rewriting missing references',async()=>{
 const p=(await loadParkDetails('indiana-dunes-national-park'))!,a=p.attractions.find(a=>a.name==='Calumet Dunes Trail')!;
 const plan=entity('plan',{name:'Isolated reference integration',notes:'Keep notes',stops:[{id:'first',parkId:p.id,notes:'Keep stop note',completed:false,attractions:['unavailable-reference',a.id]},{id:'repeat',parkId:p.id,notes:'Return visit',completed:true,attractions:[a.id]}]});
 const changed=setActivityCompleted(plan,'first',a.id,true);expect(validEntity(changed)).toBe(true);expect(changed.stops).toEqual([{id:'first',parkId:p.id,notes:'Keep stop note',completed:false,attractions:['unavailable-reference',a.id],completedAttractions:[a.id]},{id:'repeat',parkId:p.id,notes:'Return visit',completed:true,attractions:[a.id]}]);
 expect(setActivityCompleted(changed,'first',a.id,false).stops).toEqual([{id:'first',parkId:p.id,notes:'Keep stop note',completed:false,attractions:['unavailable-reference',a.id],completedAttractions:[]},{id:'repeat',parkId:p.id,notes:'Return visit',completed:true,attractions:[a.id]}]);
});
