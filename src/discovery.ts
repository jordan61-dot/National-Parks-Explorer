import type {Park} from './reference';

/** Collections use official designation or the kind of a sourced attraction, not keyword inference. */
export const parkThemes=[
 {id:'history',label:'Historic places',description:'Official historic sites and historical parks, plus parks with recorded historic-site or museum attractions.',designations:['National Historic Site','National Historical Park','International Historic Site'],kinds:['historic-site','museum']},
 {id:'military',label:'Battlefields and forts',description:'Official battlefield and military park designations, plus parks with a recorded fort or battlefield attraction.',designations:['National Battlefield','National Battlefield Park','National Battlefield Site','National Military Park'],kinds:['fort','battlefield']},
 {id:'coasts',label:'Coasts and lakes',description:'Official national seashore and lakeshore designations.',designations:['National Seashore','National Lakeshore'],kinds:[]},
 {id:'water',label:'Rivers and waterfalls',description:'Official river designations, plus parks with a recorded waterfall attraction.',designations:['National River','National Wild and Scenic River'],kinds:['waterfall']},
 {id:'trails',label:'Trails and overlooks',description:'Official scenic trails and parks with a recorded trail or overlook attraction.',designations:['National Scenic Trail'],kinds:['trail','overlook']},
 {id:'caves',label:'Caves',description:'Parks with an attraction explicitly recorded as a cave.',designations:[],kinds:['cave']},
] as const;
export type ParkTheme=typeof parkThemes[number]['id'];
export function matchesParkTheme(p:Park,id:string):boolean {
 const theme=parkThemes.find(t=>t.id===id);
 return !!theme&&((theme.designations as readonly string[]).includes(p.designation)||p.attractions.some(a=>(theme.kinds as readonly string[]).includes(a.kind)));
}
