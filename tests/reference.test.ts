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
