import { it, expect } from "vitest";
import { loadReference, safeUrl } from "../src/reference";
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
 const r=await loadReference();
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
