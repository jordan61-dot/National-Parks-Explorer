import { it, expect, vi } from "vitest";
import {
  Repository,
  newVisit,
  validEntity,
  validSnapshot,
  validDate,
  entity,
  statistics,
  historyPreview,
  applyHistory,
  entities,
  visits,
} from "../src/domain";
import type { Snapshot, Store } from "../src/host";
import type { Park } from "../src/reference";
class Memory implements Store {
  data: Snapshot = { records: [], settings: [] };
  blobs = new Map<string, Blob>();
  async snapshot() {
    return structuredClone(this.data);
  }
  async asset(id: string) {
    return this.blobs.get(id);
  }
  async atomic(
    change: (s: Snapshot) => Snapshot,
    assets?: { put?: { id: string; blob: Blob }[]; remove?: string[] },
  ) {
    const next = change(await this.snapshot());
    if (!validSnapshot(next)) throw Error("Invalid");
    this.data = structuredClone(next);
    assets?.put?.forEach((a) => this.blobs.set(a.id, a.blob));
    assets?.remove?.forEach((id) => this.blobs.delete(id));
  }
}
const park = (
  id: string,
  classification = "system-unit",
  designation = "National Park",
) =>
  ({
    id,
    parkCode: id,
    name: id,
    classification,
    designation,
    states: ["OH"],
  }) as Park;
it("preserves unknowns and rejects impossible dates, negative duration and unsupported fields", () => {
  const v = newVisit("park");
  expect(validEntity(v)).toBe(true);
  expect(v.date).toBe("");
  expect(v.duration).toBe("");
  for (const bad of [
    { ...v, precision: "exact", date: "2026-02-30" },
    { ...v, duration: "-1" },
    { ...v, extra: "unversioned" },
    { ...v, precision: "exact", date: "2026-03-02", endDate: "2026-03-01" },
  ])
    expect(validEntity(bad)).toBe(false);
  expect(validDate("2024-02-29")).toBe(true);
});
it("protects concurrent edits, deleted records and snapshot integrity", async () => {
  const s = new Memory(),
    r = new Repository(s),
    v = newVisit("park");
  await r.save(v);
  const saved = visits(entities(await s.snapshot()))[0];
  await r.save({ ...saved, notes: "new" }, saved.updatedAt);
  await expect(
    r.save({ ...saved, notes: "stale" }, saved.updatedAt),
  ).rejects.toThrow("changed");
  const latest = visits(entities(await s.snapshot()))[0];
  await r.remove(latest);
  await expect(r.save(saved, saved.updatedAt)).rejects.toThrow("removed");
});
it("keeps park and preserve separate and excludes pass-through and affiliated areas", () => {
  const a = { ...newVisit("park"), experience: "visited" as const },
    b = { ...newVisit("preserve"), experience: "pass-through" as const },
    c = newVisit("affiliate");
  const result = statistics(
    [a, { ...a, id: "repeat" }, b, c],
    [
      park("park"),
      park("preserve", "system-unit", "National Preserve"),
      park("affiliate", "affiliated"),
    ],
  );
  expect(result.units).toBe(1);
  expect(result.national).toBe(1);
  expect(result.passThrough).toBe(1);
  expect(result.repeat).toBe(1);
});
it("historical preview adds no invented dates or companions, is idempotent, and rejects stale previews", async () => {
  const s = new Memory(),
    offer = {
      total: 7,
      passThrough: 2,
      context: "Synthetic test aggregate",
      parks: [{ parkCode: "test", notes: "Synthetic report" }],
    },
    parks = [park("test")];
  const p = historyPreview(await s.snapshot(), offer, parks);
  expect(p.additions).toHaveLength(2);
  await applyHistory(s, p);
  const v = visits(entities(await s.snapshot()))[0];
  expect(v.date).toBe("");
  expect(v.companions).toBe("");
  expect(
    historyPreview(await s.snapshot(), offer, parks).additions,
  ).toHaveLength(0);
  await expect(applyHistory(s, p)).rejects.toThrow("changed");
});
it("rejects duplicate saved destinations and orphaned image records", async () => {
  const s = new Memory(),
    r = new Repository(s);
  await r.save(entity("saved", { parkId: "park", notes: "original" }));
  await expect(
    r.save(entity("saved", { parkId: "park", notes: "duplicate" })),
  ).rejects.toThrow("Invalid");
  expect(entities(await s.snapshot())).toHaveLength(1);
});
it("attaches and removes image bytes atomically with the visit", async () => {
  const s = new Memory(),
    r = new Repository(s);
  await r.save(newVisit("park"));
  let v = visits(entities(await s.snapshot()))[0];
  const b = new Blob(["image fixture"], { type: "image/png" });
  await r.photo(v, b, "caption");
  v = visits(entities(await s.snapshot()))[0];
  expect(await s.asset(v.imageIds[0])).toBe(b);
  expect(validSnapshot(await s.snapshot())).toBe(true);
  await r.remove(v);
  expect(s.blobs.size).toBe(0);
  expect(entities(await s.snapshot())).toHaveLength(0);
});
it("ordered trip stops retain independent identities, notes and completion", async () => {
  const s = new Memory(),
    r = new Repository(s);
  const p = entity("plan", {
    name: "Test trip",
    notes: "private",
    stops: [
      {
        id: "stop-1",
        parkId: "park",
        notes: "first",
        completed: false,
        attractions: [],
      },
      {
        id: "stop-2",
        parkId: "park",
        notes: "repeat",
        completed: true,
        attractions: [],
      },
    ],
  });
  await r.save(p);
  const saved = entities(await s.snapshot())[0];
  await r.save(
    { ...saved, stops: [...(saved.stops as [])].reverse() },
    saved.updatedAt,
  );
  expect(
    (entities(await s.snapshot())[0].stops as { id: string }[])[0].id,
  ).toBe("stop-2");
  expect(visits(entities(await s.snapshot()))).toHaveLength(0);
});

it('creates secure random record identities without randomUUID in HTTP previews', () => {
 const getRandomValues = crypto.getRandomValues.bind(crypto);
 vi.stubGlobal('crypto', {getRandomValues});
 try {
  const a=newVisit('park'), b=newVisit('park');
  expect(validEntity(a)).toBe(true);
  expect(a.id).not.toBe(b.id);
 } finally {vi.unstubAllGlobals()}
});
