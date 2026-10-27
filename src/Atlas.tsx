import React, { useMemo, useState } from "react";
import type { Park } from "./reference";
import shapes from "./map-outlines.json";
export function Atlas({
  parks,
  selectedId,
  onSelect,
  visitedIds = new Set<string>(),
}: {
  parks: Park[];
  selectedId?: string;
  visitedIds?: Set<string>;
  onSelect: (id: string) => void;
}) {
  const [view, setView] = useState("states"),
    [zoom, setZoom] = useState(1),
    [group, setGroup] = useState<string[]>([]);
  const points = useMemo(
    () =>
      parks.flatMap((p) => {
        const l = p.location;
        if (!l || !Number.isFinite(l.latitude) || !Number.isFinite(l.longitude))
          return [];
        let x: number, y: number;
        if (view === "world") {
          x = (l.longitude + 180) * 2;
          y = (90 - l.latitude) * 2;
        } else if (p.states.includes("AK")) {
          let lon = l.longitude;
          if (lon > 0) lon -= 360;
          x = (lon + 180) * 3;
          y = (72 - l.latitude) * 3 + 240;
        } else if (p.states.includes("HI")) {
          x = (l.longitude + 161) * 7 + 210;
          y = (23 - l.latitude) * 7 + 245;
        } else {
          if (
            !p.states.some((s) => !["AS", "GU", "MP", "PR", "VI"].includes(s))
          )
            return [];
          x = (l.longitude + 126) * 10;
          y = (50 - l.latitude) * 10;
        }
        return [{ park: p, x, y }];
      }),
    [parks, view],
  );
  const clusters = useMemo(() => {
    const cells = new Map<string, typeof points>();
    for (const p of points) {
      const cell = 8 / zoom,
        key = Math.round(p.x / cell) + "," + Math.round(p.y / cell);
      cells.set(key, [...(cells.get(key) ?? []), p]);
    }
    return [...cells.values()];
  }, [points, zoom]);
  return (
    <section aria-label="Interactive park atlas">
      <p>
        Official NPS administrative reference points. These are not entrances or
        trailheads; use official visitor directions. The catalog also lists
        parks without coordinates.
      </p>
      <div className="actions">
        <label>
          Map coverage{" "}
          <select
            value={view}
            onChange={(e) => {
              setView(e.target.value);
              setGroup([]);
              setZoom(1);
            }}
          >
            <option value="states">
              United States · Alaska and Hawaii insets
            </option>
            <option value="world">
              World · territories and Pacific locations
            </option>
          </select>
        </label>
        <button
          type="button"
          disabled={zoom >= 4}
          onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
        >
          Zoom in
        </button>
        <button
          type="button"
          disabled={zoom <= 1}
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
        >
          Zoom out
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setGroup([]);
          }}
        >
          Reset
        </button>
      </div>
      <div
        style={{
          overflow: "auto",
          maxHeight: "65vh",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
        tabIndex={0}
        aria-label="Scrollable map; zoom then scroll to pan"
      >
        <svg
          viewBox={view === "states" ? "0 0 660 360" : "0 0 720 360"}
          style={{
            width: zoom * 100 + "%",
            minWidth: "100%",
            display: "block",
          }}
          role="group"
          aria-label="Park reference points and geographic outlines"
        >
          {(view === "states" ? shapes.states : shapes.countries).map((s) => (
            <path
              key={s.code}
              d={s.path}
              fill="var(--surface-2, #d8e3dc)"
              stroke="var(--muted, #64756d)"
              strokeWidth={0.5}
            >
              <title>{s.name}</title>
            </path>
          ))}
          {clusters.map((c, i) => {
            const x = c.reduce((n, p) => n + p.x, 0) / c.length,
              y = c.reduce((n, p) => n + p.y, 0) / c.length,
              activate = () => {
                setGroup(c.map((p) => p.park.id));
                if (c.length === 1) onSelect(c[0].park.id);
              };
            return (
              <g
                key={i}
                role="button"
                tabIndex={0}
                aria-label={
                  c.length === 1
                    ? c[0].park.name
                    : `${c.length} overlapping park units: select to list`
                }
                onClick={activate}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    activate();
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={c.some((p) => p.park.id === selectedId) ? 6 : 4}
                  fill={
                    c.some((p) => p.park.id === selectedId)
                      ? "#c85825"
                      : c.every((p) => visitedIds.has(p.park.id))
                        ? "#155e43"
                        : "#596780"
                  }
                  stroke="white"
                  strokeWidth={1}
                />
                {c.length > 1 && (
                  <text
                    x={x}
                    y={y + 2}
                    textAnchor="middle"
                    fontSize={5}
                    fill="white"
                    aria-hidden="true"
                  >
                    {c.length}
                  </text>
                )}
                <title>{c.map((p) => p.park.name).join("; ")}</title>
              </g>
            );
          })}
          {view === "states" && (
            <>
              <text x="22" y="345" fontSize="10">
                Alaska inset
              </text>
              <text x="210" y="310" fontSize="10">
                Hawaii inset
              </text>
            </>
          )}
        </svg>
      </div>
      <p>
        Legend: green means all units at the marker have a visited record; slate
        means at least one is unvisited; orange marks the selection. Numbered
        markers group nearby units. Use the selection list for a text
        alternative.
      </p>
      <p>
        {points.length} mapped units in this view.{" "}
        {parks.filter((p) => !p.location).length} filtered units have no mapped
        reference point. Territories appear in World view; small islands may
        lack visible outlines at this scale.
      </p>
      <label>
        Accessible location selector
        <select
          value={selectedId ?? ""}
          onChange={(e) => {
            if (e.target.value) onSelect(e.target.value);
          }}
        >
          <option value="">Select a park</option>
          {parks.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.location ? "" : " · location unknown"}
            </option>
          ))}
        </select>
      </label>
      {group.length > 1 && (
        <ul aria-label="Overlapping park units">
          {parks
            .filter((p) => group.includes(p.id))
            .map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onSelect(p.id)}>
                  {p.name}
                </button>
              </li>
            ))}
        </ul>
      )}
      <small>
        Outlines:{" "}
        <a
          href="https://www.naturalearthdata.com/about/terms-of-use/"
          target="_blank"
          rel="noreferrer"
        >
          Natural Earth (public domain)
        </a>
        . Points:{" "}
        <a
          href="https://www.arcgis.com/home/item.html?id=e62a2420170b4452b4a334db92130220"
          target="_blank"
          rel="noreferrer"
        >
          NPS Land Resources Division (CC BY 4.0)
        </a>
        . Bundled map works offline after installation. Park boundaries are not
        shown.
      </small>
    </section>
  );
}
