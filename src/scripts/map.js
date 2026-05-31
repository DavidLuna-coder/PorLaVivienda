/**
 * Lógica D3 del mapa coroplético de provincias.
 * Los datos se leen del elemento <script id="plv-data" type="application/json">
 * inyectado por Map.astro en tiempo de build.
 */

const fmt = new Intl.NumberFormat("es-ES");
const pct = (v) => v.toFixed(1).replace(".", ",") + " %";

function loadD3() {
  return new Promise((res, rej) => {
    if (window.d3) return res();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/d3@7";
    s.onload = () => res();
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export async function initMap() {
  const dataEl = document.getElementById("plv-data");
  if (!dataEl) return;
  const { STATS, NAC, GEOJSON_URL, UMBRAL, NUMPROV } = JSON.parse(dataEl.textContent);

  await loadD3();
  const d3 = window.d3;

  let geo;
  try {
    geo = await (await fetch(GEOJSON_URL)).json();
  } catch (e) {
    document.getElementById("plv-map").outerHTML =
      '<p style="padding:2rem;color:var(--color-error)">No se pudo cargar ' +
      GEOJSON_URL + '. Copia provincias.geojson en public/data/.</p>';
    return;
  }

  const stage = document.querySelector(".plv-stage");
  const svg = d3.select("#plv-map");
  const tip = d3.select("#plv-tip");

  const RAMP = ["#f4ede3", "#ffe0c6", "#ffb088", "#ff8f57", "#ee6b33", "#b23c12"];
  const color = d3.scaleSequential(d3.interpolateRgbBasis(RAMP)).domain([0, 10]).clamp(true);
  const NA = cssVar("--color-base-300", "#d9d9dd");

  document.getElementById("plv-legend-bar").style.background =
    "linear-gradient(90deg," + RAMP.join(",") + ")";

  const projection = d3.geoMercator();
  const path = d3.geoPath(projection);

  const gZoom = svg.append("g");
  const gReg = gZoom.append("g");
  const gOv = gZoom.append("g");

  let selected = null, W = 0, H = 0;

  const zoom = d3.zoom().scaleExtent([1, 16]).on("zoom", (ev) => {
    gZoom.attr("transform", ev.transform);
    gReg.selectAll("path").style("stroke-width", 0.6 / ev.transform.k + "px");
    gOv.select(".plv-canary-box").attr("stroke-width", 1 / ev.transform.k);
  });
  svg.call(zoom).on("dblclick.zoom", null);

  function statOf(name) { return STATS[name]; }

  const regions = gReg.selectAll("path")
    .data(geo.features)
    .join("path")
      .attr("class", "plv-region")
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => d.properties.display)
      .attr("fill", (d) => {
        const s = statOf(d.properties.name);
        return s ? color(s.pct) : NA;
      })
      .on("mousemove", (ev, d) => {
        const r = stage.getBoundingClientRect();
        const s = statOf(d.properties.name);
        tip.style("left", ev.clientX - r.left + "px")
           .style("top", ev.clientY - r.top + "px")
           .style("opacity", 1)
           .html("<b>" + d.properties.display + "</b>" +
                 (s ? "<br>" + pct(s.pct) + " gran tenedor" : "<br>sin datos"));
      })
      .on("mouseleave", () => tip.style("opacity", 0))
      .on("click", (ev, d) => { ev.stopPropagation(); select(d); })
      .on("keydown", (ev, d) => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(d); }
      });

  svg.on("click", () => reset());

  function canaryBounds() {
    const features = geo.features.filter((d) => d.properties.canarias);
    if (!features.length) return null;
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const f of features) {
      const [[w, s], [e, n]] = d3.geoBounds(f);
      minLng = Math.min(minLng, w); minLat = Math.min(minLat, s);
      maxLng = Math.max(maxLng, e); maxLat = Math.max(maxLat, n);
    }
    return [[minLng, minLat], [maxLng, maxLat]];
  }

  function drawOverlay() {
    gOv.selectAll("*").remove();
    const cb = canaryBounds();
    if (!cb) return;
    const [[w, s], [e, n]] = cb;
    const m = 0.4;
    const p1 = projection([w - m, n + m]);
    const p2 = projection([e + m, s - m]);
    const x = Math.min(p1[0], p2[0]) - 4, y = Math.min(p1[1], p2[1]) - 4;
    const bw = Math.abs(p2[0] - p1[0]) + 8, bh = Math.abs(p2[1] - p1[1]) + 8;
    gOv.append("rect").attr("class", "plv-canary-box")
      .attr("x", x).attr("y", y).attr("width", bw).attr("height", bh).attr("rx", 6)
      .attr("fill", "none")
      .attr("stroke", cssVar("--color-base-300", "#d9d9dd"))
      .attr("stroke-dasharray", "4 4")
      .attr("stroke-width", "1");
    gOv.append("text").attr("class", "plv-canary-text")
      .attr("x", x + 6).attr("y", y - 6).text("Canarias")
      .attr("font-family", "ui-monospace, monospace")
      .attr("font-size", "9px")
      .attr("letter-spacing", ".1em")
      .attr("fill", cssVar("--color-base-content", "#1f2937"))
      .attr("opacity", "0.6")
      .style("text-transform", "uppercase");
  }

  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const pad = Math.min(W, H) * 0.05;
    projection.fitExtent([[pad, pad], [W - pad, H - pad]], geo);
    gReg.selectAll("path").attr("d", path);
    drawOverlay();
    if (selected) zoomTo(selected, false);
  }

  function zoomTo(d, animate) {
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    const dx = x1 - x0, dy = y1 - y0;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const scale = Math.min(13, 0.85 / Math.max(dx / W, dy / H));
    const t = d3.zoomIdentity.translate(W / 2, H / 2).scale(scale).translate(-cx, -cy);
    (animate ? svg.transition().duration(760).ease(d3.easeCubicInOut) : svg)
      .call(zoom.transform, t);
  }

  function reset() {
    selected = null;
    regions.classed("sel", false).classed("dim", false);
    svg.transition().duration(720).ease(d3.easeCubicInOut)
       .call(zoom.transform, d3.zoomIdentity);
    document.getElementById("plv-reset").classList.remove("show");
    fillPanel(null);
  }
  document.getElementById("plv-reset")
    .addEventListener("click", (e) => { e.stopPropagation(); reset(); });

  function select(d) {
    selected = d;
    regions.classed("sel", (x) => x === d).classed("dim", (x) => x !== d);
    zoomTo(d, true);
    document.getElementById("plv-reset").classList.add("show");
    fillPanel(d);
  }

  function setStat(id, value) { document.getElementById(id).textContent = value; }

  function fillPanel(d) {
    if (!d) {
      document.getElementById("plv-scope").textContent =
        "España · " + NUMPROV + " provincias con datos";
      document.getElementById("plv-name").textContent = "Vista general";
      setStat("plv-stat-inm", fmt.format(NAC.inmuebles));
      setStat("plv-stat-tit", fmt.format(NAC.titulares));
      setStat("plv-stat-gt", pct(NAC.pct));
      document.getElementById("plv-stat-gt-d").textContent =
        fmt.format(NAC.granTenedor) + " inmuebles · +" + UMBRAL;
      document.getElementById("plv-bar").style.width = Math.min(100, NAC.pct * 6) + "%";
      document.getElementById("plv-muni").textContent =
        fmt.format(NAC.municipios) + " municipios";
      return;
    }
    const s = statOf(d.properties.name);
    document.getElementById("plv-scope").textContent =
      s ? "Provincia seleccionada" : "Sin datos en el Catastro común";
    document.getElementById("plv-name").textContent = d.properties.display;
    if (!s) {
      ["plv-stat-inm", "plv-stat-tit", "plv-stat-gt"].forEach((i) => setStat(i, "—"));
      document.getElementById("plv-stat-gt-d").textContent = "catastro foral";
      document.getElementById("plv-bar").style.width = "0%";
      document.getElementById("plv-muni").textContent = "—";
      return;
    }
    setStat("plv-stat-inm", fmt.format(s.inmuebles));
    setStat("plv-stat-tit", fmt.format(s.titulares));
    setStat("plv-stat-gt", pct(s.pct));
    document.getElementById("plv-stat-gt-d").textContent =
      fmt.format(s.granTenedor) + " inmuebles · +" + UMBRAL;
    document.getElementById("plv-bar").style.width = Math.min(100, s.pct * 6) + "%";
    document.getElementById("plv-muni").textContent =
      fmt.format(s.municipios) + " municipios";
  }

  layout();
  fillPanel(null);
  regions.style("opacity", 0).transition()
    .delay((d, i) => 80 + i * 12).duration(420).style("opacity", 1);

  window.addEventListener("resize", layout);
}
