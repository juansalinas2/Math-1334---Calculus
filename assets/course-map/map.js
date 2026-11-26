"use strict";
const byId = (id) => document.getElementById(id);
const svg = d3.select("#canvas");
const viewport = byId("canvas");
const world = d3.select("#world");
const byTopic = new Map(stations.map((station) => [station.id, station]));
const detail = byId("detail");
const lookup = byId("lookup");
const results = byId("results");
let selected = null;
let family = "all";
let cameraMode = "overview";
const bounds = {
  left: -15 * horizontalSpacing,
  top: 10,
  right: 1450 * horizontalSpacing,
  bottom: 842,
};

function trackPath(edge) {
  const a = byTopic.get(edge.source);
  const b = byTopic.get(edge.target);
  const curve = Math.abs(a.x - b.x) >= Math.abs(a.y - b.y)
    ? d3.curveBumpX
    : d3.curveBumpY;
  return d3.line().x((n) => n.x).y((n) => n.y).curve(curve)([a, b]);
}
const tracks = d3.select("#rails").selectAll("path").data(connections).join(
  "path",
)
  .attr("class", "track").attr("d", trackPath);
const stops = d3.select("#stops").selectAll("g").data(stations).join("g")
  .attr("class", (d) => "station" + (d.symbol ? " hub" : ""))
  .attr("role", "button").attr("tabindex", 0).attr("aria-label", (d) => d.title)
  .attr("transform", (d) => "translate(" + d.x + "," + d.y + ")");
stops.append("title").text((d) => d.title);
stops.append("rect").attr("x", -78).attr("y", -25).attr("width", 156).attr(
  "height",
  65,
).attr("fill", "transparent");
stops.append("circle").attr("class", "halo").attr(
  "r",
  (d) => d.symbol ? 31 : 21,
)
  .attr("fill", (d) => families[d.family].color).attr("fill-opacity", .15);
stops.append("circle").attr("r", (d) => d.symbol ? 20 : 8).attr(
  "stroke-width",
  (d) => d.symbol ? 3 : 4,
)
  .attr("fill", (d) => d.symbol ? families[d.family].color : "#fffef8").attr(
    "stroke",
    (d) => families[d.family].color,
  );
stops.filter((d) => d.symbol).append("text").attr("class", "formula").attr(
  "text-anchor",
  "middle",
).attr("y", 6).text((d) => d.symbol);
stops.append("text").attr("class", "label").attr("text-anchor", "middle").attr(
  "y",
  (d) => d.symbol ? 49 : 31,
).text((d) => d.label);

const zoom = d3.zoom().scaleExtent([.16, 3.6]).clickDistance(5).on(
  "zoom",
  (event) => {
    world.attr("transform", event.transform);
    // Keep labels readable when the entire desktop map fits on screen.
    const labelScale = Math.max(.55, event.transform.k);
    world.style("--label-size", Math.max(17, 13 / labelScale) + "px")
      .style("--hub-size", Math.max(24, 18 / labelScale) + "px");
    byId("zoom-level").textContent = Math.round(100 * event.transform.k) + "%";
    if (event.sourceEvent) cameraMode = "manual";
  },
);
svg.call(zoom);

function move(x, y, scale, animated = true) {
  const view = d3.zoomIdentity.translate(
    viewport.clientWidth / 2,
    viewport.clientHeight / 2,
  ).scale(scale).translate(-x, -y);
  svg.interrupt();
  const target =
    animated && !matchMedia("(prefers-reduced-motion: reduce)").matches
      ? svg.transition().duration(260)
      : svg;
  target.call(zoom.transform, view);
}
function frame(animate = true) {
  const items = stations.filter((s) => family === "all" || s.family === family);
  const left = family === "all"
    ? bounds.left
    : Math.min(...items.map((d) => d.x)) - 100;
  const right = family === "all"
    ? bounds.right
    : Math.max(...items.map((d) => d.x)) + 100;
  const top = family === "all"
    ? bounds.top
    : Math.min(...items.map((d) => d.y)) - 42;
  const bottom = family === "all"
    ? bounds.bottom
    : Math.max(...items.map((d) => d.y)) + 62;
  const scale = Math.max(
    .16,
    Math.min(
      2,
      (viewport.clientWidth - 24) / (right - left),
      (viewport.clientHeight - 75) / (bottom - top),
    ),
  );
  move((left + right) / 2, (top + bottom) / 2 + 15 / scale, scale, animate);
}
function nearby(id) {
  return connections.filter((e) => e.source === id || e.target === id);
}
function paint(preview = selected) {
  const linked = new Set([preview]);
  nearby(preview).forEach((e) => {
    linked.add(e.source);
    linked.add(e.target);
  });
  tracks.each(function (e) {
    const active = preview && (e.source === preview || e.target === preview);
    const sameFamily = family === "all" ||
      [e.source, e.target].some((id) => byTopic.get(id).family === family);
    d3.select(this).attr("display", e.onSelection && !active ? "none" : null)
      .attr("stroke", families[byTopic.get(e.target).family].color)
      .attr("opacity", active ? 1 : preview || !sameFamily ? .13 : .55)
      .attr("stroke-width", active ? 4.5 : 3.4).attr(
        "stroke-dasharray",
        e.onSelection ? "6 5" : null,
      );
  });
  stops.classed("active", (d) => d.id === selected).attr(
    "aria-pressed",
    (d) => String(d.id === selected),
  )
    .attr(
      "opacity",
      (d) =>
        preview
          ? (linked.has(d.id) ? 1 : .36)
          : (family === "all" || family === d.family ? 1 : .35),
    );
  document.querySelectorAll("[data-family]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.family === family))
  );
}
function el(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}
function showTopic(id, animate = true) {
  const topic = byTopic.get(id);
  if (!topic) return;
  selected = id;
  cameraMode = "selected";
  family = "all";
  detail.hidden = false;
  detail.style.setProperty("--accent", families[topic.family].color);
  const body = byId("detail-body");
  const heading = el("h2", topic.title);
  heading.tabIndex = -1;
  const link = el("a", "Read the lecture notes ↗", "note-link");
  link.href = topic.href;
  body.replaceChildren(
    el("p", families[topic.family].label, "family-name"),
    heading,
    el("p", topic.summary),
    el("h3", "From class"),
    el("p", topic.example),
    link,
    el("h3", "Follow a connection"),
  );
  nearby(id).forEach((edge) => {
    const other = byTopic.get(edge.source === id ? edge.target : edge.source);
    const button = el("button", "", "neighbor");
    button.append(el("b", other.title + " →"), el("small", edge.explanation));
    button.onclick = () => showTopic(other.id);
    body.append(button);
  });
  detail.scrollTop = 0;
  results.hidden = true;
  lookup.value = "";
  history.replaceState(null, "", "#" + id);
  paint();
  move(
    topic.x,
    topic.y,
    Math.max(
      d3.zoomTransform(viewport).k,
      Math.min(1.35, viewport.clientWidth / 550),
    ),
    animate,
  );
  heading.focus({ preventScroll: true });
}
function overview(which = "all") {
  selected = null;
  family = which;
  cameraMode = "overview";
  detail.hidden = true;
  history.replaceState(null, "", location.pathname + location.search);
  paint();
  frame();
}
stops.on("click", (event, d) => {
  if (!event.defaultPrevented) showTopic(d.id);
})
  .on("pointerenter", (event, d) => {
    if (!selected && event.pointerType === "mouse" && !event.buttons) {
      paint(d.id);
    }
  })
  .on("pointerleave", () => {
    if (!selected) paint();
  })
  .on("keydown", (event, d) => {
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      showTopic(d.id);
    }
  })
  .on("focus", (event, d) => {
    if (!event.target.matches(":focus-visible")) return;
    const point = d3.zoomTransform(viewport).apply([d.x, d.y]);
    if (
      point[0] < 70 || point[0] > viewport.clientWidth - 70 || point[1] < 35 ||
      point[1] > viewport.clientHeight - 55
    ) {
      move(d.x, d.y, d3.zoomTransform(viewport).k, false);
    }
  });
for (const [id, group] of Object.entries(families)) {
  const btn = el("button", "", "family");
  btn.dataset.family = id;
  const dot = el("span", "", "swatch");
  dot.style.setProperty("--accent", group.color);
  btn.append(dot, document.createTextNode(group.label));
  byId("families").append(btn);
}
document.querySelectorAll("[data-family]").forEach((btn) =>
  btn.onclick = () => overview(btn.dataset.family)
);
function scaleBy(factor) {
  cameraMode = "manual";
  svg.interrupt().call(zoom.scaleBy, factor);
}
byId("in").onclick = () => scaleBy(1.35);
byId("out").onclick = () => scaleBy(1 / 1.35);
byId("fit").onclick = () => overview();
byId("close").onclick = () => {
  const last = selected;
  overview();
  stops.filter((d) => d.id === last).node()?.focus({ preventScroll: true });
};
viewport.addEventListener("keydown", (event) => {
  const step = 60 / d3.zoomTransform(viewport).k;
  const directions = {
    ArrowLeft: [step, 0],
    ArrowRight: [-step, 0],
    ArrowUp: [0, step],
    ArrowDown: [0, -step],
  };
  if (directions[event.key]) {
    event.preventDefault();
    cameraMode = "manual";
    svg.interrupt().call(zoom.translateBy, ...directions[event.key]);
  } else if (["+", "=", "-"].includes(event.key)) {
    event.preventDefault();
    scaleBy(event.key === "-" ? 1 / 1.35 : 1.35);
  } else if (event.key === "Home") {
    event.preventDefault();
    overview();
  }
});
// Accept the shorthand students see on the board and type on a keyboard.
const aliases = {
  ivt: "IVT",
  evt: "EVT",
  derivative: "f' f′ dy/dx difference quotient",
  derivatives: "f'' f″ d²y/dx²",
  monotonic: "MVT monotonicity",
  exp: "ln x e^x",
  lhospital: "L'Hopital L'Hôpital L'Hospital",
};
function normalizeQuery(text) {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/[’′]/g, "'").replace(/″/g, "''").trim();
}
function search() {
  const q = normalizeQuery(lookup.value);
  results.replaceChildren();
  results.hidden = !q;
  if (!q) return;
  const hits = stations.filter((s) =>
    normalizeQuery([s.label, s.title, aliases[s.id] || "", s.summary].join(" "))
      .includes(q)
  );
  hits.sort((a, b) =>
    Number(b.title.toLowerCase().includes(q)) -
    Number(a.title.toLowerCase().includes(q))
  );
  hits.forEach((s) => {
    const btn = el("button", s.title);
    btn.onclick = () => showTopic(s.id);
    results.append(btn);
  });
  if (!hits.length) results.append(el("p", "No matching concept."));
}
lookup.oninput = search;
lookup.onfocus = search;
lookup.onkeydown = (event) => {
  const first = results.querySelector("button");
  if (first && !results.hidden && ["Enter", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    if (event.key === "Enter") first.click();
    else first.focus();
  }
};
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest(".searchbox")) results.hidden = true;
});
document.addEventListener("focusin", (e) => {
  if (!e.target.closest(".searchbox")) results.hidden = true;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!results.hidden) {
      lookup.focus();
      results.hidden = true;
    } else if (selected) byId("close").click();
  }
});
function initialFrame() {
  if (viewport.clientWidth < 620) {
    // Start near the definition of the derivative at a readable phone scale.
    move(481 * horizontalSpacing, 268, .84, false);
  } else {
    frame(false);
  }
}
new ResizeObserver(() => {
  if (cameraMode === "overview") frame(false);
  else if (cameraMode === "initial") initialFrame();
  else if (cameraMode === "selected" && selected) {
    const node = byTopic.get(selected);
    move(node.x, node.y, d3.zoomTransform(viewport).k, false);
  }
}).observe(viewport);
function openLocation() {
  const id = location.hash.slice(1);
  if (byTopic.has(id)) showTopic(id, false);
  else {
    selected = null;
    family = "all";
    detail.hidden = true;
    cameraMode = "initial";
    paint();
    initialFrame();
  }
}
window.addEventListener("hashchange", openLocation);
openLocation();
