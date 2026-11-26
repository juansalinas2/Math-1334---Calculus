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
let entryFamily = "all";
let cameraMode = "overview";
let cameraWidth = 0;
let cameraHeight = 0;
let renderedScale = 0;
let drawFrame = null;
let gesturing = false;
let rebasingPinch = false;
let hovered = null;
const routeViews = new Map();
let route = "";
let ready = false;
const reader = byId("reader");

function rememberView() {
  if (!ready || !viewport.clientWidth) return;
  const view = d3.zoomTransform(viewport);
  const center = view.invert([viewport.clientWidth / 2, viewport.clientHeight / 2]);
  routeViews.set(route, [...center, view.k]);
}
function setRoute(next, fromLocation) {
  route = next;
  const url = location.pathname + location.search + next;
  if (location.hash === next) return;
  if (fromLocation) history.replaceState(null, "", url);
  else history.pushState(null, "", url);
}
function breadcrumb(topic, part) {
  const trail = byId("trail");
  trail.replaceChildren();
  trail.hidden = !topic && family === "all";
  if (trail.hidden) return;
  function crumb(title, action) {
    const item = el(action ? "button" : "span", title);
    if (action) item.onclick = action;
    else item.setAttribute("aria-current", "page");
    if (trail.childElementCount) {
      const divider = el("span", "›", "trail-divider");
      divider.setAttribute("aria-hidden", "true");
      trail.append(divider);
    }
    trail.append(item);
  }
  crumb("Course map", () => overview("all", true));
  const key = topic?.family || family;
  crumb(families[key].label, topic ? () => overview(key, true) : null);
  if (topic) crumb(topic.title, part ? () => showTopic(topic.id) : null);
  if (part) crumb(part.title);
}
function setReading(open, jump = false) {
  detail.classList.toggle("reading", open);
  const toggle = byId("sheet-toggle");
  const example = byId("detail-body").querySelector(".note-example");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "Back to map" : example ? "Read example" : "Read note";
  if (open && jump && example) {
    const margin = byId("reader-tools").offsetHeight + 8;
    reader.scrollTop += example.getBoundingClientRect().top - reader.getBoundingClientRect().top - margin;
  }
  else { reader.scrollTop = 0; detail.scrollTop = 0; }
}
byId("sheet-toggle").onclick = () => setReading(!detail.classList.contains("reading"), true);

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
  world.style("--parent-scale", Math.min(1, 1.20 * detailScale(view.k) / view.k));
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
  .filter(event => {
    const content = event.target.closest?.(".focus-content");
    const scrollable = content && content.scrollHeight > content.clientHeight + 1;
    // Keep wheel and trackpad zoom working over an expanded card at every scale.
    // A single touch can scroll the card when the mobile list exceeds its height.
    if (scrollable && event.type === "touchstart" && event.touches.length === 1) return false;
    return (!event.ctrlKey || event.type === "wheel") && !event.button;
  })
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
    if (rebasingPinch) return;
    if (event.sourceEvent) {
      // Reset the pinch origin at a bound so reversing the fingers immediately
      // moves the map, even after they have continued spreading at maximum zoom.
      if (event.sourceEvent.type === "touchmove" && event.sourceEvent.touches.length === 2 &&
          (event.transform.k === maxZoom || event.transform.k === minZoom)) {
        rebasingPinch = true;
        try {
          svg.call(zoom.transform, event.transform);
        } finally {
          rebasingPinch = false;
        }
      }
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
  .on("end", event => {
    gesturing = false;
    if (event.sourceEvent && selected && event.transform.k < 1) {
      overview(entryFamily, true);
    }
    rememberView();
  });
svg.call(zoom).on("wheel.mapBoundary", event => {
  // D3 leaves a wheel event unhandled when it starts at a scale limit.
  // Keep it on the map so a trackpad pinch cannot start zooming the page.
  event.preventDefault();
}, { passive: false });

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
  const sameTopic = selected === id;
  if (!selected) entryFamily = family;
  rememberView();
  selected = id;
  selectedPart = part ? partSlug(part) : null;
  const next = "#" + id + (part ? "/" + selectedPart : "");
  setRoute(next, fromLocation);
  zoomAnchor = null;
  hovered = null;
  cameraMode = "selected";
  family = topic.family;
  document.body.classList.add("topic-open");
  detail.hidden = false;
  breadcrumb(topic, part);
  byId("class-questions").open = false;
  byId("explore-tools").hidden = true;
  detail.style.setProperty("--accent", families[topic.family].color);
  const body = byId("detail-body");
  const note = part || topic;
  byId("reader-label").textContent = note.title;
  const heading = el("h2", note.title);
  heading.tabIndex = -1;
  const context = families[topic.family].label + (note.kind ? " · " + note.kind : "");
  body.replaceChildren(el("p", context, "family-name"));
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
  setReading(false);
  results.hidden = true;
  lookup.value = "";
  paint();
  const previous = routeViews.get(next);
  if (previous && (fromLocation || (sameTopic && !part))) move(...previous);
  else if (!sameTopic || d3.zoomTransform(viewport).k < detailZoom) {
    move(topic.x, topic.y, Math.max(detailZoom + .03, d3.zoomTransform(viewport).k));
  } else drawCamera();
  if (!matchMedia("(max-width: 760px)").matches) heading.focus({preventScroll: true});
}
function overview(which = "all", restore = false, fromLocation = false) {
  rememberView();
  const next = which === "all" ? "" : "#family/" + which;
  setRoute(next, fromLocation);
  selected = null;
  selectedPart = null;
  zoomAnchor = null;
  hovered = null;
  family = which;
  cameraMode = "overview";
  document.body.classList.remove("topic-open");
  detail.classList.remove("reading");
  detail.hidden = true;
  breadcrumb();
  byId("explore-tools").hidden = false;
  byId("class-questions").open = false;
  paint();
  const previous = routeViews.get(next);
  if (restore && previous) {
    cameraMode = "manual";
    move(...previous);
  } else frame();
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
  if (selected && d3.zoomTransform(viewport).k < 1) overview(entryFamily, true);
}
zoomIn.onclick = () => scaleBy(1.35);
zoomOut.onclick = () => scaleBy(1 / 1.35);
byId("fit").onclick = () => overview();
byId("close").onclick = () => {
  if (detail.classList.contains("reading")) setReading(false);
  else if (selectedPart) showTopic(selected);
  else if (selected) {
    const previous = byTopic.get(selected);
    overview(previous.family, true);
    viewport.focus({preventScroll: true});
  }
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
const rawEntries = stations.flatMap(topic =>
  [topic, ...topic.parts].map(note => ({
    title: note.title, kind: note.kind, context: topic.title,
    aliases: [note.aliases || "", note === topic ? topic.label : ""],
    text: [note.definition, note.idea, note.formula, note.symbol, note.example].filter(Boolean).join(" "),
    href: "#" + topic.id + (note === topic ? "" : "/" + partSlug(note)),
    topic, note,
  }))
);
let searchEntries;
let searchGeneration = 0;
function search() {
  const request = ++searchGeneration;
  const query = lookup.value.trim();
  results.replaceChildren();
  results.hidden = !query;
  if (!query) return;
  const searchEngine = window.CourseSearch;
  if (searchEngine && !searchEntries) searchEntries = searchEngine.prepare(rawEntries);
  const hits = searchEngine ? searchEngine.rank(searchEntries, query, 5) :
    rawEntries.filter(entry => [entry.title, ...entry.aliases].join(" ").toLowerCase().includes(query.toLowerCase())).slice(0, 5);
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
  if (!searchEngine) return;
  searchEngine.loadBook().then(records => {
    if (request !== searchGeneration || results.hidden || lookup.value.trim() !== query) return;
    const reading = searchEngine.rank(records, query, 3);
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
  else if (id === "family" && Object.hasOwn(families, slug)) overview(slug, true, true);
  else if (ready) overview("all", true, true);
  else {
    cameraMode = "initial";
    paint();
    initialFrame();
  }
}
window.addEventListener("hashchange", openLocation);
openLocation();
ready = true;
