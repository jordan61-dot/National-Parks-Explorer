import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Park } from "./reference";
import { stateNames } from "./reference";
import {
  areaBounds, collisionClusters, isTerritory, jurisdictions, outlines,
  projectedPoint, territoryCenters, territories, withinBounds, zoomBounds,
} from "./atlas-geometry";

type Point = ReturnType<typeof projectedPoint>;
export function Atlas({
  parks, selectedId, onSelect, visitedIds = new Set<string>(), stateFilter = "", onStateChange,
}: {
  parks: Park[];
  selectedId?: string;
  visitedIds?: Set<string>;
  onSelect: (id: string) => void;
  stateFilter?: string;
  onStateChange?: (code: string) => void;
}) {
  const [area, setArea] = useState(stateFilter || "us");
  const previousFilter = useRef(stateFilter);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [size, setSize] = useState({ width: 1000, height: 540 });
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    if (previousFilter.current !== stateFilter) {
      previousFilter.current = stateFilter;
      setArea(stateFilter || "us"); setZoom(1); setPan({ x: 0, y: 0 }); setGroupIds([]);
    }
  }, [stateFilter]);
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const measure = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (width > 0 && height > 0) setSize(s => s.width === width && s.height === height ? s : { width, height });
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [area]);
  const territory = isTerritory(area);
  const regionParks = useMemo(() => area === "us"
    ? parks.filter(p => p.states.some(s => !isTerritory(s)))
    : area === "world" ? parks : parks.filter(p => p.states.includes(area)), [parks, area]);
  const points = useMemo(() => regionParks.map(p => projectedPoint(p, area)).filter((p): p is NonNullable<Point> => !!p), [regionParks, area]);
  const base = useMemo(() => areaBounds(area, regionParks, size.width / size.height), [area, regionParks, size]);
  const viewport = useMemo(() => zoomBounds(base, zoom, pan), [base, zoom, pan]);
  const clusters = useMemo(() => collisionClusters(points, viewport, size.width, size.height), [points, viewport, size]);
  const visible = points.filter(p => withinBounds(p, viewport)).length;
  const title = area === "us" ? "United States · Alaska and Hawaii insets"
    : area === "world" ? "World and territories" : stateNames[area] ?? area;
  function changeArea(next: string) {
    setArea(next); setZoom(1); setPan({ x: 0, y: 0 }); setGroupIds([]);
    onStateChange?.(next === "us" || next === "world" ? "" : next);
  }
  function move(dx: number, dy: number) {
    if (zoom <= 1) return;
    setPan(p => ({
      x: Math.max(-1, Math.min(1, p.x + dx / zoom)),
      y: Math.max(-1, Math.min(1, p.y + dy / zoom)),
    }));
  }
  function reset() { setZoom(1); setPan({ x: 0, y: 0 }); setGroupIds([]); }
  const countByTerritory = (code: string) => parks.filter(p => p.states.includes(code)).length;
  return (
    <section className="np-atlas" aria-label="Interactive park atlas">
      <div className="np-atlas-heading">
        <div>
          <h3>Explore the national park atlas</h3>
          <p className="muted">Choose any state, Washington, D.C., or U.S. territory. Zoom and select grouped markers to uncover nearby parks.</p>
        </div>
        <div className="np-atlas-summary" aria-live="polite"><strong>{regionParks.length}</strong><span>units in {title}</span></div>
      </div>
      <div className="np-atlas-toolbar">
        <label className="np-atlas-area">Map area
          <select aria-label="Map area" value={area} onChange={e => changeArea(e.target.value)}>
            <option value="us">United States · mainland, Alaska and Hawaii</option>
            <option value="world">Entire world · all territories</option>
            <optgroup label="States and District of Columbia">
              {jurisdictions.filter(([code]) => !isTerritory(code)).map(([code, name]) => <option value={code} key={code}>{name}</option>)}
            </optgroup>
            <optgroup label="U.S. territories">
              {jurisdictions.filter(([code]) => isTerritory(code)).map(([code, name]) => <option value={code} key={code}>{name}</option>)}
            </optgroup>
          </select>
        </label>
        <div className="np-atlas-controls" aria-label="Map zoom and movement">
          <button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoom <= 1} onClick={() => { setZoom(z => Math.max(1, z / 1.65)); setGroupIds([]); }}>−</button>
          <span aria-live="polite" aria-label={"Zoom " + zoom.toFixed(1) + " times"}>{zoom.toFixed(1)}×</span>
          <button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoom >= 10} onClick={() => { setZoom(z => Math.min(10, z * 1.65)); setGroupIds([]); }}>+</button>
          <button type="button" onClick={reset}>Reset map</button>
        </div>
      </div>
      {area === "us" && (
        <div className="np-atlas-territories" aria-label="Territory inset navigation">
          <p><strong>U.S. territories</strong><span>Choose an island region for a full-sized map</span></p>
          <div className="np-atlas-territory-grid">
            {territories.map(code => <button type="button" key={code} onClick={() => changeArea(code)}>
              <span className="np-atlas-territory-code">{code}</span>
              <span>{stateNames[code]}</span>
              <small>{countByTerritory(code)} parks in current filters</small>
            </button>)}
          </div>
        </div>
      )}
      <div className="np-atlas-map-shell" role="region" aria-label={"Scrollable " + title + " atlas"}>
        <div
          ref={stageRef} className={"np-atlas-stage " + (area === "us" ? "np-atlas-stage-us" : area === "world" ? "np-atlas-stage-world" : "np-atlas-stage-focus")}
          aria-label={"Map showing " + title + " reference points"}
          onPointerDown={e => {
            if (zoom <= 1 || e.pointerType !== "mouse" || (e.target as HTMLElement).closest("button")) return;
            drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
            e.currentTarget.setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={e => {
            if (!drag.current) return;
            const d = drag.current;
            setPan({ x: Math.max(-1, Math.min(1, d.panX - (e.clientX - d.x) * 2 / (size.width * zoom))),
              y: Math.max(-1, Math.min(1, d.panY - (e.clientY - d.y) * 2 / (size.height * zoom))) });
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
        >
          <svg viewBox={[viewport.x, viewport.y, viewport.width, viewport.height].join(" ")}
            preserveAspectRatio="none" className="np-atlas-land" role="img"
            aria-label={territory ? "Coordinate grid; no territory coastlines in the bundled map" : "Natural Earth geographic outlines"}>
            {territory ? (
              <>
                {Array.from({ length: 13 }, (_, i) => <line key={"v" + i} x1={base.x + base.width * i / 12} x2={base.x + base.width * i / 12} y1={base.y} y2={base.y + base.height} className="np-atlas-gridline" />)}
                {Array.from({ length: 9 }, (_, i) => <line key={"h" + i} x1={base.x} x2={base.x + base.width} y1={base.y + base.height * i / 8} y2={base.y + base.height * i / 8} className="np-atlas-gridline" />)}
                <circle cx={0} cy={0} r={Math.min(base.width, base.height) / 15} fill="none" stroke="#6d9b9a" strokeWidth={base.width / 400} strokeDasharray="1 1" />
              </>
            ) : (area === "world" ? outlines.countries : outlines.states).map(s => (
              <path key={s.code} d={s.path}
                className={"np-atlas-outline" + (area === s.code ? " np-atlas-outline-active" : "")} />
            ))}
          </svg>
          <div className="np-atlas-marker-layer">
            {clusters.map(c => {
              const ids = c.points.map(p => p.park.id);
              const selected = ids.includes(selectedId ?? "");
              const visited = c.points.every(p => visitedIds.has(p.park.id));
              const label = c.points.length === 1 ? c.points[0].park.name : c.points.length + " nearby park units: open list";
              return <button type="button" key={ids.slice().sort().join(":")} aria-label={label}
                aria-pressed={selected} title={ids.length === 1 ? label : ids.length + " parks: open list"}
                className={"np-atlas-pin " + (selected ? "np-atlas-pin-selected" : visited ? "np-atlas-pin-visited" : "np-atlas-pin-default")}
                style={{ left: (c.x - viewport.x) / viewport.width * 100 + "%",
                  top: (c.y - viewport.y) / viewport.height * 100 + "%" }}
                onClick={() => {
                  setGroupIds(ids.length > 1 ? ids : []);
                  if (ids.length === 1) onSelect(ids[0]);
                }}>
                <span>{ids.length > 1 ? ids.length : ""}</span>
              </button>;
            })}
          </div>
          <div className="np-atlas-map-caption"><span>{title}</span><span>{visible} visible reference points</span></div>
          {territory && <div className="np-atlas-no-coast">Schematic coordinate grid · not a shoreline map</div>}
        </div>
      </div>
      <div className="np-atlas-bottom-bar">
        <p>{area === "us" || area === "world" ? "On smaller screens, scroll horizontally to view the complete large-format map." : "Select a marker or use the park selector below."} Drag the zoomed map with a mouse or use the directional controls.</p>
        <div className="np-atlas-pan" role="group" aria-label="Pan zoomed map">
          {([["←", -0.45, 0, "Pan left"], ["↑", 0, -0.45, "Pan up"], ["↓", 0, 0.45, "Pan down"], ["→", 0.45, 0, "Pan right"]] as const).map(([label, dx, dy, name]) =>
            <button type="button" key={name} aria-label={name} title={name} disabled={zoom <= 1} onClick={() => move(dx, dy)}>{label}</button>)}
        </div>
      </div>
      <div className="np-atlas-legend" aria-label="Map legend">
        <span><i className="np-atlas-key np-atlas-key-default" />Unvisited or mixed</span>
        <span><i className="np-atlas-key np-atlas-key-visited" />All visited</span>
        <span><i className="np-atlas-key np-atlas-key-selected" />Selected</span>
        <span><i className="np-atlas-key np-atlas-key-cluster">3</i>Cluster: select to list</span>
      </div>
      {groupIds.length > 1 && (
        <section className="np-atlas-group" aria-label="Overlapping park units">
          <div className="np-atlas-group-head"><h4>{groupIds.length} parks at this map marker</h4>
            <button type="button" onClick={() => setGroupIds([])}>Close list</button>
          </div>
          {zoom < 10 && <button type="button" onClick={() => { setZoom(z => Math.min(10, z * 2)); setGroupIds([]); }}>Zoom closer to separate markers</button>}
          <ul>{regionParks.filter(p => groupIds.includes(p.id)).sort((a,b) => a.name.localeCompare(b.name)).map(p =>
            <li key={p.id}><button type="button" onClick={() => { onSelect(p.id); setGroupIds([]); }}>{p.name}</button><small>{p.designation}</small></li>)}
          </ul>
        </section>
      )}
      <div className="np-atlas-selector">
        <label>Accessible location selector
          <select aria-label="Accessible location selector" value={regionParks.some(p => p.id === selectedId) ? selectedId : ""}
            onChange={e => { if (e.target.value) onSelect(e.target.value); }}>
            <option value="">Select a park in {title}</option>
            {regionParks.slice().sort((a,b) => a.name.localeCompare(b.name)).map(p =>
              <option key={p.id} value={p.id}>{p.name}{p.location ? "" : " · location unknown"}</option>)}
          </select>
        </label>
        <p aria-live="polite">{points.length} mapped of {regionParks.length} parks in this area; {visible} within the current map window. Units without suitable points remain available in the selector and encyclopedia.</p>
      </div>
      <small className="np-atlas-credit">
        Geographic outlines: <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth, public domain</a>.
        Park reference points: <a href="https://www.arcgis.com/home/item.html?id=e62a2420170b4452b4a334db92130220" target="_blank" rel="noreferrer">NPS Land Resources Division, CC BY 4.0</a>.
        Coordinates describe administrative reference points, not entrances, trailheads or verified boundaries. Territory detail uses a point-coordinate grid because the bundled outline set has no corresponding island boundaries. Bundled atlas works offline.
      </small>
    </section>
  );
}