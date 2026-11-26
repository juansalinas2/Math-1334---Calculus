"use strict";
const el = mapTextElement;
const byId = (id) => document.getElementById(id);
const svg = d3.select("#canvas");
const viewport = byId("canvas");
const world = d3.select("#world");
const byTopic = new Map(stations.map((station) => [station.id, station]));
const detail = byId("detail");
const lookup = byId("lookup");
const results = byId("results");
const zoomIn = byId("in");
const zoomOut = byId("out");
const zoomLevel = byId("zoom-level");
const minZoom = .16;
const maxZoom = 3.6;
let selected = null;
let selectedPart = null;
let family = "all";
let cameraMode = "overview";
let cameraWidth = 0;
let cameraHeight = 0;
let renderedScale = 0;
let drawFrame = null;
let gesturing = false;
let hovered = null;

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
  .attr("class", "track").attr("d", trackPath)
  .attr("stroke", (edge) => families[byTopic.get(edge.target).family].color)
  .attr("stroke-dasharray", (edge) => edge.onSelection ? "6 5" : null);
const stops = d3.select("#stops").selectAll("g").data(stations).join("g")
  .attr("class", (d) => "station" + (d.symbol ? " hub" : ""))
  .attr("role", "button").attr("tabindex", 0).attr("aria-label", (d) => d.title)
  .attr("transform", (d) => "translate(" + d.x + "," + d.y + ")");
const marks = stops.append("g").attr("class", "station-mark");
marks.append("title").text((d) => d.title);
marks.append("rect").attr("x", -78).attr("y", -25).attr("width", 156).attr(
  "height",
  65,
).attr("fill", "transparent");
// Keep the notation in the SVG with the circles, including while the camera moves.
function drawMark(selection, size) {
  selection.append("use").attr("class", "node-ink").attr("aria-hidden", "true")
    .attr("href", d => "#mark-" + Array.from(d.mark, c => c.codePointAt(0).toString(16)).join("-"))
    .each(function (d) {
      const side = typeof size === "function" ? size(d) : size;
      d3.select(this).attr("x", -side / 2).attr("y", -side / 2)
        .attr("width", side).attr("height", side);
    });
}
const discs = marks.append("g").attr("class", "station-disc")
  .style("--node-color", d => families[d.family].color);
discs.append("circle").attr("class", "halo").attr("r", d => d.symbol ? 30 : 24)
  .attr("fill", d => families[d.family].color).attr("fill-opacity", .15);
discs.append("circle").attr("class", "disc").attr("r", d => d.symbol ? 21 : 17);
drawMark(discs, d => d.symbol ? 31 : 25);
marks.append("text").attr("class", "label").attr("text-anchor", "middle").attr(
  "y",
  (d) => d.symbol ? 52 : 46,
).text((d) => d.label);

function drawCamera() {
  drawFrame = null;
  const view = d3.zoomTransform(viewport);
  world.attr("transform", view);
  drawInterior(view);
  if (view.k === renderedScale) return;
  world.style("--parent-scale", Math.min(1, 1.20 / view.k));
  world.style("--disk-scale", Math.min(2, Math.max(1, .68 / view.k)));
  // Only the overview uses larger labels. Panning needs no text layout.
  const labelScale = Math.max(.55, view.k);
  if (view.k < .8 || renderedScale < .8) {
    world.style("--label-size", Math.max(17, 13 / labelScale) + "px")
      .style("--hub-size", Math.max(24, 18 / labelScale) + "px");
  }
  const percent = Math.round(100 * view.k) + "%";
  if (zoomLevel.textContent !== percent) zoomLevel.textContent = percent;
  zoomIn.disabled = view.k >= maxZoom;
  zoomOut.disabled = view.k <= minZoom;
  zoomIn.title = zoomIn.disabled ? "Maximum zoom" : "Zoom in (+)";
  zoomOut.title = zoomOut.disabled ? "Minimum zoom" : "Zoom out (−)";
  renderedScale = view.k;
}
const zoom = d3.zoom().scaleExtent([minZoom, maxZoom]).clickDistance(5)
  .duration(0)
  .on("start", (event) => {
    if (!event.sourceEvent) return;
    gesturing = true;
    if (hovered !== null) {
      hovered = null;
      paint();
    }
  })
  .on("zoom", (event) => {
    if (event.sourceEvent) {
      zoomAnchor = event.sourceEvent.type === "wheel"
        ? d3.pointer(event.sourceEvent, viewport)
        : null;
      cameraMode = "manual";
      if (drawFrame === null) drawFrame = requestAnimationFrame(drawCamera);
    } else {
      // A button, key, or concept selection takes effect in this event.
      if (drawFrame !== null) cancelAnimationFrame(drawFrame);
      drawCamera();
    }
  })
  .on("end", () => {
    gesturing = false;
  });
svg.call(zoom);

function move(x, y, scale) {
  cameraWidth = viewport.clientWidth;
  cameraHeight = viewport.clientHeight;
  const view = d3.zoomIdentity.translate(
    cameraWidth / 2,
    cameraHeight / 2,
  ).scale(scale).translate(-x, -y);
  svg.call(zoom.transform, view);
}
function frame() {
  const items = stations.filter((s) => family === "all" || s.family === family);
  const left = Math.min(...items.map((d) => d.x)) - 115;
  const right = Math.max(...items.map((d) => d.x)) + 115;
  const top = Math.min(...items.map((d) => d.y)) - 44;
  const bottom = Math.max(...items.map((d) => d.y)) + 72;
  const scale = Math.max(
    minZoom,
    Math.min(
      2,
      (viewport.clientWidth - 24) / (right - left),
      (viewport.clientHeight - 75) / (bottom - top),
    ),
  );
  move((left + right) / 2, (top + bottom) / 2 + 15 / scale, scale);
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
      .attr("opacity", active ? 1 : preview || !sameFamily ? .13 : .55)
      .attr("stroke-width", active ? 4.5 : 3.4);
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
function showTopic(id, slug = null, fromLocation = false) {
  const topic = byTopic.get(id);
  if (!topic) return;
  const part = topic.parts.find((item) => partSlug(item) === slug || item.oldSlugs?.includes(slug));
  selected = id;
  selectedPart = part ? partSlug(part) : null;
  interiorPage = part
    ? pagesOf(topic.parts).findIndex((page) => page.includes(part))
    : 0;
  zoomAnchor = null;
  hovered = null;
  cameraMode = "selected";
  family = "all";
  detail.hidden = false;
  byId("class-questions").open = false;
  byId("explore-tools").hidden = true;
  detail.style.setProperty("--accent", families[topic.family].color);
  const body = byId("detail-body");
  const note = part || topic;
  const heading = el("h2", note.title);
  heading.tabIndex = -1;
  const context = families[topic.family].label + (note.kind ? " · " + note.kind : "");
  body.replaceChildren(el("p", context, "family-name"));
  if (part) {
    const back = el("button", "← " + topic.title, "parent-link");
    back.onclick = () => showTopic(topic.id);
    body.append(back);
  }
  const link = el("a", "Read the lecture notes", "note-link");
  link.href = part?.href || topic.href;
  body.append(heading);
  appendMapNote(body, note, "equation", "h3");
  body.append(link, el("h3", "Explore " + topic.label), el("div", "", "part-links"));
  const parts = body.lastElementChild;
  for (const item of topic.parts) {
    const button = el("button", item.title);
    button.setAttribute("aria-pressed", String(item === part));
    button.onclick = () => showTopic(id, partSlug(item));
    parts.append(button);
  }
  body.append(el("h3", "Connected concepts"));
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
  const hash = "#" + id + (part ? "/" + selectedPart : "");
  if (location.hash !== hash) {
    if (fromLocation) history.replaceState(null, "", hash);
    else history.pushState(null, "", hash);
  }
  paint();
  move(
    topic.x,
    topic.y,
    Math.max(
      d3.zoomTransform(viewport).k,
      part ? formulaZoom + .18 : detailZoom + .03,
    ),
  );
  heading.focus({ preventScroll: true });
}
function overview(which = "all") {
  selected = null;
  selectedPart = null;
  zoomAnchor = null;
  hovered = null;
  family = which;
  cameraMode = "overview";
  detail.hidden = true;
  byId("explore-tools").hidden = false;
  byId("class-questions").open = false;
  if (location.hash) history.pushState(null, "", location.pathname + location.search);
  paint();
  frame();
}
stops.on("click", (event, d) => {
  if (!event.defaultPrevented) showTopic(d.id);
})
  .on("pointerenter", (event, d) => {
    if (
      !selected && !gesturing && event.pointerType === "mouse" && !event.buttons
    ) {
      hovered = d.id;
      paint(d.id);
    }
  })
  .on("pointerleave", () => {
    if (hovered !== null) {
      hovered = null;
      paint();
    }
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
      move(d.x, d.y, d3.zoomTransform(viewport).k);
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
  zoomAnchor = null;
  cameraMode = "manual";
  svg.call(zoom.scaleBy, factor);
}
zoomIn.onclick = () => scaleBy(1.35);
zoomOut.onclick = () => scaleBy(1 / 1.35);
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
    svg.call(zoom.translateBy, ...directions[event.key]);
  } else if (event.key === "Home") {
    event.preventDefault();
    overview();
  }
});
const searchEntries = CourseSearch.prepare(stations.flatMap(topic =>
  [topic, ...topic.parts].map(note => ({
    title: note.title, kind: note.kind, context: topic.title,
    aliases: [note.aliases || "", note === topic ? topic.label : ""],
    text: [note.definition, note.idea, note.formula, note.symbol, note.example].filter(Boolean).join(" "),
    href: "#" + topic.id + (note === topic ? "" : "/" + partSlug(note)),
    topic, note,
  }))
));
let searchGeneration = 0;
function search() {
  const request = ++searchGeneration;
  const query = lookup.value.trim();
  results.replaceChildren();
  results.hidden = !query;
  if (!query) return;
  const hits = CourseSearch.rank(searchEntries, query, 5);
  if (hits.length) results.append(el("p", "On the map", "result-group"));
  for (const {topic, note} of hits) {
    const btn = el("button", note.title);
    btn.append(el("small", [note.kind, note !== topic && topic.title].filter(Boolean).join(" · ")));
    btn.onclick = () => showTopic(topic.id, note === topic ? null : partSlug(note));
    results.append(btn);
  }
  if (!hits.length) results.append(el("p", "No matching concept on the map."));
  const allNotes = el("a", "Search all course notes →", "all-notes-search");
  allNotes.href = "../index.html?find=" + encodeURIComponent(query);
  results.append(allNotes);
  CourseSearch.loadBook().then(records => {
    if (request !== searchGeneration || results.hidden || lookup.value.trim() !== query) return;
    const reading = CourseSearch.rank(records, query, 3);
    if (!reading.length) return;
    allNotes.before(el("p", "In the notes", "result-group"));
    for (const item of reading) {
      const title = item.title.replace(/\\\((.*?)\\\)/g, (_, tex) => "$" + tex + "$");
      const link = el("a", title, "course-result");
      link.href = "../" + item.href;
      link.append(el("small", item.kind + (item.title === item.context ? "" : " · " + item.context)));
      allNotes.before(link);
    }
  }).catch(() => {}); // Local map results and the full-search link remain available.
}
lookup.oninput = search;
lookup.onfocus = search;
document.querySelector(".searchbox").addEventListener("keydown", event => {
  if (results.hidden) return;
  const choices = [...results.querySelectorAll("button, a")];
  const index = choices.indexOf(document.activeElement);
  if (event.target === lookup && event.key === "Enter") {
    event.preventDefault();
    choices[0]?.click();
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const next = index + (event.key === "ArrowDown" ? 1 : -1);
    if (next < 0) lookup.focus();
    else choices[Math.min(next, choices.length - 1)]?.focus();
  }
});
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest(".searchbox")) results.hidden = true;
  if (!e.target.closest(".class-questions")) byId("class-questions").open = false;
});
document.addEventListener("focusin", (e) => {
  if (!e.target.closest(".searchbox")) results.hidden = true;
});
document.addEventListener("keydown", (e) => {
  if (
    !e.metaKey && !e.ctrlKey && !e.altKey && !e.isComposing &&
    !e.target.closest("input, textarea, select, [contenteditable]") &&
    ["+", "=", "-"].includes(e.key)
  ) {
    e.preventDefault();
    scaleBy(e.key === "-" ? 1 / 1.35 : 1.35);
  }
  if (e.key === "Escape") {
    if (byId("class-questions").open) {
      byId("class-questions").open = false;
      byId("class-questions").querySelector("summary").focus();
    } else if (!results.hidden) {
      lookup.focus();
      results.hidden = true;
    } else if (selected) byId("close").click();
  }
});
function initialFrame() {
  if (viewport.clientWidth < 620) {
    // Start near the definition of the derivative at a readable phone scale.
    move(481 * horizontalSpacing, 268, .84);
  } else {
    frame();
  }
}
new ResizeObserver(() => {
  // Opening the panel already measured and used its new viewport.
  if (
    viewport.clientWidth === cameraWidth &&
    viewport.clientHeight === cameraHeight
  ) return;
  if (cameraMode === "overview") frame();
  else if (cameraMode === "initial") initialFrame();
  else if (cameraMode === "selected" && selected) {
    const node = byTopic.get(selected);
    move(node.x, node.y, d3.zoomTransform(viewport).k);
  }
}).observe(viewport);
function openLocation() {
  const [id, slug] = location.hash.slice(1).split("/");
  if (byTopic.has(id)) showTopic(id, slug, true);
  else {
    selected = null;
    selectedPart = null;
    zoomAnchor = null;
    family = "all";
    detail.hidden = true;
    byId("explore-tools").hidden = false;
    cameraMode = "initial";
    paint();
    initialFrame();
  }
}
window.addEventListener("hashchange", openLocation);
openLocation();
