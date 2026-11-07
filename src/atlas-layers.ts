export type MarkerMode='locations'|'designation'|'visitation'|'coverage';
export type MapStyle='standard'|'terrain'|'contrast';
export type Layers={boundaries:boolean;markers:boolean;labels:boolean;choropleth:boolean};
export const defaultLayers:Layers={boundaries:true,markers:true,labels:true,choropleth:false};
export const layerRegistry=[
 {id:'boundaries',label:'Administrative boundaries',help:'Jurisdiction outlines; never park land boundaries.'},
 {id:'markers',label:'Park reference points',help:'Collision-aware groups retain every matching record.'},
 {id:'labels',label:'Geographic labels',help:'Labels adapt to the visible map and available space.'},
 {id:'choropleth',label:'Jurisdiction statistics',help:'Area shading uses the selected metric for the current filtered records.'},
] as const;
export const designationColors:Record<string,string>={'Parks':'#22634c','Monuments':'#824819','History & remembrance':'#684a83','Water & recreation':'#14687b','Other designations':'#536274'};
export const thematicColors=['#edf2d8','#c4d9ac','#8eb98a','#518970','#225e54'];
export function choroplethColor(value:number|null,max:number){if(value===null)return 'url(#atlas-missing)';if(value===0)return '#f3f1e9';return thematicColors[Math.min(4,Math.max(0,Math.ceil(value/Math.max(1,max)*5)-1))]}
export function markerColor(mode:MarkerMode,options:{selected:boolean;allVisited:boolean;someVisited:boolean;designation:string;coverage:boolean;mixed:boolean}){
 if(options.selected)return '#b64c18';
 if(mode==='visitation')return options.allVisited?'#176548':options.someVisited?'#8a5e13':'#536274';
 if(mode==='designation')return options.mixed?'#536274':designationColors[options.designation]??'#536274';
 if(mode==='coverage')return options.coverage?'#176548':'#78514f';
 return '#275c76';
}
