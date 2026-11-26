// The wide views use the same D3 camera as the detailed map. Layout coordinates
// below are CSS pixels at each view's reference scale, keeping labels touchable.
const courseCenter = [700, 430];
const courseScale = .15, groupsScale = .42, topicsScale = 1;
const courseBoundary = .24, groupsBoundary = .61;
const representatives = { foundations: "unitcircle", limits: "limit", differentiation: "derivative", shape: "concavity", applications: "optimization" };
const systemLayer = document.getElementById("systems");
const systemNodes = document.getElementById("system-nodes");
const systemLines = d3.select("#system-lines").append("g");
let systemKey = "", systemLayout = [], systemKind = "", systemIntent = null;

function systemAt(k) {
  if (k < courseBoundary) return "course";
  if (k < groupsBoundary) return "groups";
  return !selected && family !== "all" ? "family" : "";
}
function setSystemIntent(event) {
  systemIntent = null;
  if (!systemKind || !event) return;
  // A two-finger gesture can begin on open space between the fingers.
  let target = event.target.closest?.("[data-system-id]");
  if (event.touches?.length === 2) {
    const t = event.touches;
    const x = (t[0].clientX + t[1].clientX) / 2, y = (t[0].clientY + t[1].clientY) / 2;
    target = document.elementFromPoint(x, y)?.closest("[data-system-id]") || target;
  }
  if (target) systemIntent = {kind: systemKind, id: target.dataset.systemId, k: d3.zoomTransform(viewport).k};
}
function layoutSystem(kind, width, height) {
  if (kind === "course") return [{id:"calculus", x:0, y:0, label:"Calculus", count:Object.keys(families).length + " topic groups"}];
  const compact = width < 630;
  if (kind === "groups") {
    const spanX = Math.min(width - 14, 1000), spanY = Math.min(Math.max(230, height - 80), 520);
    const offsets = compact
      ? [[-.25,.31],[-.25,-.31],[0,0],[.25,-.31],[.25,.31]]
      : [[-.35,.26],[-.30,-.27],[0,.02],[.30,-.27],[.35,.26]];
    return Object.keys(families).map((id, i) => ({
      id, x:offsets[i][0] * spanX, y:offsets[i][1] * spanY,
      label:families[id].label, count:stations.filter(n => n.family === id).length + " topics",
    }));
  }
  const nodes = stations.filter(n => n.family === family);
  const cols = Math.min(nodes.length, width < 465 ? 2 : width < 740 ? 3 : 4);
  const rows = Math.ceil(nodes.length / cols);
  const dx = Math.min(205, (width - 16) / cols);
  const dy = Math.min(116, Math.max(85, (height - 76) / rows));
  return nodes.map((topic, i) => {
    const row = Math.floor(i / cols), col = i % cols;
    const rowLength = Math.min(cols, nodes.length - row * cols);
    return {id:topic.id, topic, label:topic.label,
      x:(col - (rowLength - 1) / 2) * dx + (cols > 2 && rows > 1 ? (row % 2 ? .09 : -.09) * dx : 0),
      y:(row - (rows - 1) / 2) * dy + (cols > 2 && rows > 1 ? Math.sin(col * Math.PI / (cols - 1)) * 14 : 0)};
  });
}
function openSystemNode(kind, id) {
  if (kind === "course") overview();
  else if (kind === "groups") overview(id);
  else showTopic(id);
}
function buildSystem(kind, width, height) {
  systemLayout = layoutSystem(kind, width, height);
  systemLayer.setAttribute("aria-label", kind === "course" ? "Course" : kind === "groups" ? "Course topic groups" : families[family].label + " topics");
  systemNodes.replaceChildren();
  systemLines.selectAll("*").remove();
  for (const node of systemLayout) {
    const id = kind === "family" ? family : node.id;
    const button = el("button", "", "cluster-button");
    button.type = "button";
    button.dataset.systemId = node.id;
    button.style.setProperty("--accent", families[id]?.color || "var(--family-calculus)");
    button.setAttribute("aria-label", node.label + (node.count ? ", " + node.count : "") + ". Explore");
    const illustration = el("span", "", "cluster-symbol");
    const note = node.topic || byTopic.get(representatives[id] || "derivative");
    illustration.append(focusMark(note));
    if (kind !== "family") {
      illustration.classList.add("aggregate-mark");
      for (let j = 0; j < 3; j++) illustration.append(el("i", "", "satellite"));
    }
    button.append(illustration, el("span", node.label, "cluster-label"));
    if (node.count) button.append(el("span", node.count, "cluster-count"));
    button.onclick = e => { if (!e.defaultPrevented) openSystemNode(kind, node.id); };
    button.onfocus = () => {
      if (kind !== "family" || !button.matches(":focus-visible")) return;
      const box = button.getBoundingClientRect(), bounds = viewport.getBoundingClientRect();
      const dy = Math.min(0, box.top - bounds.top - 6) + Math.max(0, box.bottom - bounds.bottom + 6);
      if (dy) {
        cameraMode = "manual";
        svg.call(zoom.translateBy, 0, -dy / d3.zoomTransform(viewport).k);
      }
    };
    systemNodes.append(button);
    node.element = button;
  }
  if (kind === "course") {
    for (const r of [1, 1.55]) systemLines.append("ellipse").attr("rx", 105*r).attr("ry", 48*r)
      .attr("transform", "rotate(-17)").attr("class", "system-orbit");
    return;
  }
  const points = new Map(systemLayout.map(n => [n.id,n]));
  const drawn = new Set();
  for (const edge of connections) {
    const a = points.get(kind === "groups" ? byTopic.get(edge.source).family : edge.source);
    const b = points.get(kind === "groups" ? byTopic.get(edge.target).family : edge.target);
    if (!a || !b || a === b || edge.onSelection) continue;
    const pair = [a.id,b.id].sort().join("/");
    if (drawn.has(pair)) continue;
    drawn.add(pair);
    const path = d3.line().x(n => n.x).y(n => n.y).curve(d3.curveBumpX)([a,b]);
    systemLines.append("path").attr("d", path).attr("class", "system-connection");
  }

}
function drawSystem(view) {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  const kind = systemAt(view.k);
  if (systemLayer.hidden !== !kind) {
    systemLayer.hidden = !kind;
    world.attr("display", kind ? "none" : null).attr("aria-hidden", kind ? "true" : null);
    byId("drawing").setAttribute("aria-hidden", String(Boolean(kind)));
    stops.attr("tabindex", kind ? -1 : 0);
  }
  const tier = kind || (insideId ? "detail" : "topics");
  const label = {course:"Course",groups:"Topic groups",family:"Topics",topics:"Topics",detail:"Subtopics"}[tier];
  if (byId("map-level").textContent !== label) byId("map-level").textContent = label;
  byId("exit-path").hidden = !selected && family === "all" && !insideId;
  if (document.body.dataset.level !== tier) {
    const touch = matchMedia("(pointer: coarse), (max-width: 760px)").matches;
    const action = touch ? "Tap" : "Select";
    const hint = { course:action+" Calculus to explore", groups:action+" a group to explore", family:action+" a topic to see its subtopics", topics:touch?"Drag to pan · Pinch to zoom":"Drag to pan · Scroll to zoom", detail:action+" a subtopic to read" };
    document.querySelector(".gesture-hint").textContent = hint[tier];
  }
  systemKind = kind;
  document.body.dataset.level = tier;
  if (!kind) { systemKey = ""; return; }
  const key = [kind,kind === "family" ? family : "",width,height].join("/");
  if (key !== systemKey) { buildSystem(kind, width, height); systemKey = key; }
  const ref = kind === "course" ? courseScale : kind === "groups" ? groupsScale : topicsScale;
  const ratio = view.k / ref;
  const growth = kind === "course" ? Math.min(1.35,Math.max(.85,Math.pow(ratio,.50))) : Math.min(1.4,Math.max(.88,Math.pow(ratio,.40)));
  const spread = kind === "groups" ? Math.max(width < 630 ? .96 : .81, Math.min(ratio, 1.14)) : ratio;
  const origin = kind === "course" ? [width / 2, height / 2] : view.apply(courseCenter);
  if (kind === "groups") {
    // All five groups stay recoverable after zooming out from a distant topic.
    const dx = Math.max(0, width/2 - Math.max(...systemLayout.map(n => Math.abs(n.x))) * spread - (width < 630 ? 79 : 106) * growth);
    const dy = Math.max(0, height/2 - Math.max(...systemLayout.map(n => Math.abs(n.y))) * spread - 65 * growth);
    origin[0] = Math.max(width/2-dx, Math.min(width/2+dx, origin[0]));
    origin[1] = Math.max(height/2-dy, Math.min(height/2+dy, origin[1]));
  }
  systemLines.attr("transform","translate("+origin+") scale("+spread+")");
  for (const n of systemLayout) {
    n.element.style.transform = "translate(" + (origin[0]+n.x*spread) + "px," + (origin[1]+n.y*spread) + "px) translate(-50%,-50%) scale(" + growth + ")";
  }
}
