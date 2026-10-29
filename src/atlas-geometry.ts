import type { Park } from "./reference";
import { stateNames } from "./reference";
import outlines from "./map-outlines.json";

export type Bounds = { x: number; y: number; width: number; height: number };
export type AtlasPoint = { park: Park; x: number; y: number };
export type AtlasCluster = { points: AtlasPoint[]; x: number; y: number };
export const territories = ["AS", "GU", "MP", "PR", "VI"] as const;
export const isTerritory = (s: string) => (territories as readonly string[]).includes(s);
export const jurisdictions = Object.entries(stateNames).sort((a, b) => a[1].localeCompare(b[1]));
export const territoryCenters: Record<string, { latitude: number; longitude: number }> = {
  AS: { latitude: -14.3, longitude: -170.7 },
  GU: { latitude: 13.45, longitude: 144.78 },
  MP: { latitude: 15.2, longitude: 145.75 },
  PR: { latitude: 18.22, longitude: -66.45 },
  VI: { latitude: 18.34, longitude: -64.9 },
};

export function pathBounds(path: string): Bounds {
  // The bundled Natural Earth paths are M/L coordinate pairs followed by Z.
  const nums = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (nums.length < 4 || nums.length % 2) throw Error("Invalid outline coordinates");
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
const stateBounds: Record<string, Bounds> = Object.fromEntries(
  outlines.states.map(s => [s.code, pathBounds(s.path)]),
);
export function wrappedLongitude(value: number, center: number) {
  return ((value - center + 540) % 360) - 180;
}
export function projectedPoint(park: Park, area: string): AtlasPoint | undefined {
  const loc = park.location;
  if (!loc || !Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) return;
  const lat = loc.latitude, lng = loc.longitude;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
  if (area !== "us" && area !== "world" && !park.states.includes(area)) return;
  let x: number, y: number;
  if (area === "world") {
    x = (lng + 180) * 2; y = (90 - lat) * 2;
  } else if (isTerritory(area)) {
    const origin = territoryCenters[area];
    x = wrappedLongitude(lng, origin.longitude) * 20 * Math.cos(origin.latitude * Math.PI / 180);
    y = (origin.latitude - lat) * 20;
  } else if (park.states.includes("AK")) {
    x = ((lng > 0 ? lng - 360 : lng) + 180) * 3;
    y = (72 - lat) * 3 + 240;
  } else if (park.states.includes("HI")) {
    x = (lng + 161) * 7 + 210;
    y = (23 - lat) * 7 + 245;
  } else {
    if (park.states.every(isTerritory)) return;
    x = (lng + 126) * 10; y = (50 - lat) * 10;
  }
  return { park, x, y };
}

export function areaBounds(area: string, parks: Park[], ratio: number): Bounds {
  if (area === "world") return fitBounds({ x: 0, y: 0, width: 720, height: 360 }, ratio);
  if (area === "us") return fitBounds({ x: 0, y: 0, width: 660, height: 360 }, ratio);
  if (isTerritory(area)) {
    const points = parks.map(p => projectedPoint(p, area)).filter((x): x is AtlasPoint => !!x);
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const minX = xs.length ? Math.min(...xs) : -14, maxX = xs.length ? Math.max(...xs) : 14;
    const minY = ys.length ? Math.min(...ys) : -12, maxY = ys.length ? Math.max(...ys) : 12;
    const w = Math.max(22, maxX - minX + 12), h = Math.max(18, maxY - minY + 12);
    return fitBounds({ x: (minX + maxX - w) / 2, y: (minY + maxY - h) / 2, width: w, height: h }, ratio);
  }
  const b = stateBounds[area];
  if (!b) return fitBounds({ x: 0, y: 0, width: 660, height: 360 }, ratio);
  const padding = Math.max(5, Math.max(b.width, b.height) * 0.18);
  const width = Math.max(12, b.width + padding * 2), height = Math.max(12, b.height + padding * 2);
  return fitBounds({ x: b.x + b.width / 2 - width / 2, y: b.y + b.height / 2 - height / 2, width, height }, ratio);
}
export function fitBounds(b: Bounds, ratio: number): Bounds {
  const aspect = Number.isFinite(ratio) && ratio > 0 ? ratio : 1.7;
  const midpointX = b.x + b.width / 2, midpointY = b.y + b.height / 2;
  const width = Math.max(b.width, b.height * aspect);
  const height = width / aspect;
  return { x: midpointX - width / 2, y: midpointY - height / 2, width, height };
}
export function zoomBounds(base: Bounds, zoom: number, pan: { x: number; y: number }): Bounds {
  const z = Math.max(1, Math.min(10, zoom));
  const width = base.width / z, height = base.height / z;
  const cx = Math.max(base.x + width / 2, Math.min(base.x + base.width - width / 2,
    base.x + base.width / 2 + pan.x * base.width / 2));
  const cy = Math.max(base.y + height / 2, Math.min(base.y + base.height - height / 2,
    base.y + base.height / 2 + pan.y * base.height / 2));
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}
export const withinBounds = (p: AtlasPoint, b: Bounds) =>
  p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
export function collisionClusters(points: AtlasPoint[], b: Bounds, width: number, height: number, spacing = 52): AtlasCluster[] {
  const visible = points.filter(p => withinBounds(p, b));
  const groups: AtlasCluster[] = visible.map(p => ({ points: [p], x: p.x, y: p.y }));
  // Iteratively combine by on-screen center distance, rather than a fixed geographic grid.
  // This guarantees that 44px targets don't mask other targets on either phone or desktop.
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
      const a = groups[i], c = groups[j];
      const dx = (a.x - c.x) / b.width * width, dy = (a.y - c.y) / b.height * height;
      if (dx * dx + dy * dy < spacing * spacing) {
        const merged = [...a.points, ...c.points];
        groups[i] = { points: merged,
          x: merged.reduce((n, p) => n + p.x, 0) / merged.length,
          y: merged.reduce((n, p) => n + p.y, 0) / merged.length };
        groups.splice(j, 1);
        changed = true;
        break outer;
      }
    }
  }
  return groups.sort((a, c) => a.y - c.y || a.x - c.x);
}
export { outlines, stateBounds };