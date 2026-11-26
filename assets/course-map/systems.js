// The wide views use the same D3 camera as the detailed map. Layout coordinates
// below are CSS pixels at each view's reference scale, keeping labels touchable.
const courseCenter = [700, 430];
const courseScale = .15, groupsScale = .42, topicsScale = 1;
const courseBoundary = .24, groupsBoundary = .61;
const skyView = new URLSearchParams(location.search).get("view") === "sky";
const representatives = { foundations: "unitcircle", limits: "limit", differentiation: "derivative", shape: "concavity", applications: "optimization" };
const systemLayer = document.getElementById("systems");
const systemNodes = document.getElementById("system-nodes");
const systemLines = d3.select("#system-lines").append("g");
let systemKey = "", systemLayout = [], systemKind = "", systemIntent = null;

function skyArt(id) {
  const icon = d3.create("svg:svg").attr("viewBox", "0 0 100 100")
    .attr("class", "sky-art").attr("aria-hidden", "true").attr("focusable", "false");
  icon.append("use").attr("href", "#sky-" + id).attr("width", 100).attr("height", 100);
  return icon.node();
}
function initializeSky() {
  document.body.dataset.view = skyView ? "sky" : "map";
  if (!skyView) return;
  document.title = "Celestial calculus · MATH 1334";
  document.querySelector("h1").textContent = "Celestial calculus";
  const link = document.getElementById("view-switch");
  link.textContent = "Standard map";
  link.href = "./";
  const stars = d3.select("#sky-stars").append("svg").attr("width", "100%").attr("height", "100%")
    .attr("viewBox", "0 0 1100 760").attr("preserveAspectRatio", "xMidYMid slice");
  let seed = 1334;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  for (let i = 0; i < 185; i++) {
    stars.append("circle").attr("cx", random() * 1100).attr("cy", random() * 760)
      .attr("r", .45 + random() ** 3 * 1.45).attr("fill", i % 7 ? "#dcf1ff" : "#ffd99d")
      .attr("opacity", .28 + random() * .6);
  }
}
initializeSky();

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
    if (skyView) illustration.append(skyArt(id));
    if (!skyView || node.topic) illustration.append(focusMark(note));
    if (!skyView && kind !== "family") {
      illustration.classList.add("aggregate-mark");
      for (let j = 0; j < 3; j++) illustration.append(el("i", "", "satellite"));
    }
    button.append(illustration, el("span", node.label, "cluster-label"));
    if (node.count) button.append(el("span", node.count, "cluster-count"));
    button.onclick = e => { if (!e.defaultPrevented) openSystemNode(kind, node.id); };
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
  if (skyView && kind === "groups") for (const r of [.85,1.12]) {
    systemLines.append("ellipse").attr("rx", Math.min(width*.36, 370)*r).attr("ry", Math.min(height*.22,130)*r)
      .attr("transform","rotate(-10)").attr("class","system-orbit");
  }
}
function drawSystem(view) {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  const kind = systemAt(view.k);
  systemLayer.hidden = !kind;
  world.attr("display", kind ? "none" : null);
  const tier = kind || (insideId ? "detail" : "topics");
  const label = {course:"Course",groups:"Topic groups",family:"Topics",topics:"Topics",detail:"Subtopics"}[tier];
  if (byId("map-level").textContent !== label) byId("map-level").textContent = label;
  byId("exit-path").hidden = !selected && family === "all" && !insideId;
  if (document.body.dataset.level !== tier) {
    const touch = matchMedia("(pointer: coarse), (max-width: 760px)").matches;
    const action = touch ? "Tap" : "Select";
    const hint = { course:action+" Calculus to explore", groups:action+" a group to explore", family:action+" a topic to open its moons", topics:touch?"Drag to pan · Pinch to zoom":"Drag to pan · Scroll to zoom", detail:action+" a moon to read" };
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
  const origin = kind === "course" ? [width / 2, height / 2] : view.apply(courseCenter);
  if (kind === "groups") {
    // All five groups stay recoverable after zooming out from a distant topic.
    origin[0] = Math.max(width*.32,Math.min(width*.68,origin[0]));
    origin[1] = Math.max(height*.26,Math.min(height*.74,origin[1]));
  }
  systemLines.attr("transform","translate("+origin+") scale("+ratio+")");
  for (const n of systemLayout) {
    n.element.style.transform = "translate(" + (origin[0]+n.x*ratio) + "px," + (origin[1]+n.y*ratio) + "px) translate(-50%,-50%) scale(" + growth + ")";
  }
}
