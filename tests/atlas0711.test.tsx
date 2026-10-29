// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import {
  areaBounds, collisionClusters, isTerritory, projectedPoint,
  territories, withinBounds, zoomBounds,
} from "../src/atlas-geometry";
import { Atlas } from "../src/Atlas";
import type { Park } from "../src/reference";

function park(id: string, name: string, states: string[], lat?: number, lon?: number): Park {
  return {
    id, parkCode: id, name, states, designation: "National Historic Site",
    classification: "system-unit", website: "https://www.nps.gov/",
    description: "Synthetic record", sources: [], research: [], activities: [],
    topics: [], attractions: [], ...(lat === undefined || lon === undefined ? {} :
      { location: { latitude: lat, longitude: lon, kind: "administrative", source: "https://www.nps.gov/" } }),
  };
}
const ohio = park("oh", "Ohio Unit", ["OH"], 40.1, -82.7);
const ohioTwo = park("oh2", "Second Ohio Unit", ["OH"], 40.1, -82.7);
const puertoRico = park("pr", "Puerto Rico Unit", ["PR"], 18.34, -66.1);
const guam = park("gu", "Guam Unit", ["GU"], 13.4, 144.75);
const marianas = park("mp", "Marianas Unit", ["MP"], 15.18, 145.75);
const samoa = park("as", "Samoa Unit", ["AS"], -14.28, -170.7);
const virginIslands = park("vi", "Virgin Islands Unit", ["VI"], 18.34, -64.9);
const data = [ohio, ohioTwo, puertoRico, guam, marianas, samoa, virginIslands];
afterEach(() => cleanup());

describe("large atlas projection and layout", () => {
  it("covers all five territories with focused reference points", () => {
    expect(territories).toEqual(["AS", "GU", "MP", "PR", "VI"]);
    for (const p of [puertoRico, guam, marianas, samoa, virginIslands]) {
      const area = p.states[0];
      expect(isTerritory(area)).toBe(true);
      const point = projectedPoint(p, area)!;
      expect(point).toBeDefined();
      expect(withinBounds(point, areaBounds(area, data, 1.5))).toBe(true);
      expect(projectedPoint(p, "world")).toBeDefined();
      expect(projectedPoint(p, "us")).toBeUndefined();
    }
  });
  it("zooms to a state rather than showing all states at the original scale", () => {
    const full = areaBounds("us", data, 1.7);
    const state = areaBounds("OH", [ohio], 1.7);
    expect(state.width).toBeLessThan(full.width / 2);
    expect(withinBounds(projectedPoint(ohio, "OH")!, state)).toBe(true);
    expect(projectedPoint(puertoRico, "OH")).toBeUndefined();
    const zoomed = zoomBounds(state, 2, { x: 0, y: 0 });
    expect(zoomed.width).toBeCloseTo(state.width / 2);
    expect(zoomed.height).toBeCloseTo(state.height / 2);
  });
  it("groups overlapping hits by screen pixels, avoiding overlapping 44px buttons", () => {
    const points = [ohio, ohioTwo, park("far", "Farther Unit", ["OH"], 41.5, -84.3)]
      .map(p => projectedPoint(p, "OH")!);
    const bounds = areaBounds("OH", data, 1.8);
    const clusters = collisionClusters(points, bounds, 1000, 560);
    expect(clusters.some(c => c.points.map(x => x.park.id).sort().join(",") === "oh,oh2")).toBe(true);
    for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) {
      const dx = (clusters[i].x - clusters[j].x) / bounds.width * 1000;
      const dy = (clusters[i].y - clusters[j].y) / bounds.height * 560;
      expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(52);
    }
  });
  it("preserves parks with unknown coordinates in the jurisdiction selector", () => {
    const missing = park("missing", "Unknown Position", ["PR"]);
    render(<Atlas parks={[puertoRico, missing]} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Puerto Rico.*places in current filters/ }));
    expect(screen.getByRole("option", { name: /Unknown Position.*location unknown/ })).toBeTruthy();
    expect(screen.getByText(/1 of 2 matching places have reference coordinates/)).toBeTruthy();
  });
  it("supports selecting a territory or a state, opening an overlap list, and keyboard selection", () => {
    const onSelect = vi.fn(), onStateChange = vi.fn();
    render(<Atlas parks={data} onSelect={onSelect} onStateChange={onStateChange} />);
    expect(screen.getByRole("button", { name: /American Samoa.*places in current filters/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Map area"), { target: { value: "OH" } });
    expect(onStateChange).toHaveBeenCalledWith("OH");
    const marker = screen.getByRole("button", { name: /2 nearby park units: open list/ });
    fireEvent.click(marker);
    expect(screen.getByRole("heading", { name: "2 parks at this map marker" })).toBeTruthy();
    fireEvent.click(within(screen.getByRole("region", {name:"Overlapping park units"})).getByRole("button", { name: "Second Ohio Unit" }));
    expect(onSelect).toHaveBeenCalledWith("oh2");
    fireEvent.change(screen.getByLabelText("Map area"), { target: { value: "VI" } });
    expect(screen.getByLabelText(/Geographic outlines for U.S. Virgin Islands/)).toBeTruthy();
    expect(onStateChange).toHaveBeenCalledWith("VI");
    const viMarker = document.querySelector('.np-atlas-pin[aria-label="Virgin Islands Unit"]') as HTMLButtonElement;
    expect(viMarker).toBeTruthy();
    fireEvent.click(viMarker);
    expect(onSelect).toHaveBeenCalledWith("vi");
  });
});

describe('verified jurisdiction coverage and resilience',()=>{
 it('offers all 50 states, DC, and five territories with sourced outlines',async()=>{
  const {boundaryByCode,jurisdictions}=await import('../src/atlas-geometry');
  expect(jurisdictions).toHaveLength(56);
  for(const [code] of jurisdictions){const f=boundaryByCode[code];expect(f,code).toBeTruthy();expect(f.path.length,code).toBeGreaterThan(40);expect(f.bounds[2],code).toBeGreaterThan(0);expect(f.bounds[3],code).toBeGreaterThan(0)}
 });
 it('wraps Alaska across the date line and projects real mainland and island records within their jurisdiction',async()=>{
  const {loadReference}=await import('../src/reference'); const {wrappedLongitude}=await import('../src/atlas-geometry'); const r=await loadReference();
  expect(Math.abs(wrappedLongitude(179.5,-160)-wrappedLongitude(-179.5,-160))).toBeLessThan(2);
  for(const code of ['OH','CA','DC','MA','AK','HI','PR','GU','AS','MP','VI']){
   const records=r.units.filter(p=>p.states.includes(code)&&p.location);expect(records.length,code).toBeGreaterThan(0);
   const bounds=areaBounds(code,records,1.6,true);expect(records.some(p=>withinBounds(projectedPoint(p,code)!,bounds)),code).toBe(true);
  }
 });
 it('keeps multistate records selectable even where their reference point is outside the focused state',()=>{
  const p=park('multi','Cross-border Unit',['OH','WV'],40.1,-84.7);const point=projectedPoint(p,'WV')!;expect(point).toBeTruthy();expect(withinBounds(point,areaBounds('WV',[p],1.6,true))).toBe(false);
  render(<Atlas parks={[p]} onSelect={()=>{}} stateFilter="WV"/>);expect(screen.getByRole('option',{name:'Cross-border Unit'})).toBeTruthy();
 });
 it('bounds zoom and pan, and separates nonidentical dense clusters as zoom increases',()=>{
  const b={x:0,y:0,width:100,height:100}; const clamped=zoomBounds(b,100,{x:100,y:-100});expect(clamped.width).toBeCloseTo(6.25);expect(clamped.x+clamped.width).toBeLessThanOrEqual(100);expect(clamped.y).toBeGreaterThanOrEqual(0);
  const points=[{park:ohio,x:50,y:50},{park:ohioTwo,x:52,y:50}];expect(collisionClusters(points,b,400,400)).toHaveLength(1);expect(collisionClusters(points,zoomBounds(b,8,{x:0,y:0}),400,400)).toHaveLength(2);
 });
 it('opens full map, navigates island views, and exits with Escape',()=>{
  render(<Atlas parks={data} onSelect={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Expand map'}));expect(screen.getByRole('button',{name:'Close map'})).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Map area'),{target:{value:'AS'}});expect(screen.getByLabelText(/Geographic outlines for American Samoa/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Show entire island chain'}));expect(screen.getByRole('button',{name:'Focus main islands'})).toBeTruthy();fireEvent.keyDown(window,{key:'Escape'});expect(screen.getByRole('button',{name:'Expand map'})).toBeTruthy();
 });
});

it('activates overlapping markers with a pointer and keeps all cluster members selectable',()=>{
 const onSelect=vi.fn();render(<Atlas parks={[ohio,ohioTwo]} stateFilter="OH" onSelect={onSelect}/>);
 const marker=screen.getByRole('button',{name:'2 nearby park units: open list'});fireEvent.pointerDown(marker,{pointerId:1,pointerType:'touch'});
 const group=screen.getByRole('region',{name:'Overlapping park units'});expect(within(group).getByRole('button',{name:'Ohio Unit'})).toBeTruthy();
 fireEvent.click(within(group).getByRole('button',{name:'Second Ohio Unit'}));expect(onSelect).toHaveBeenCalledWith('oh2');
});
