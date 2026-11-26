// One local cluster is mounted at a time; the parent keeps its map coordinates.
const detailZoom = 1.5;
const formulaZoom = 2.1;
const interior = d3.select("#inside-topic");
const guides = d3.select("#orbit-guides");
let insideId = null;
let layoutKey = "";
let zoomAnchor = null;

function partSlug(part) {
  return part.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
}

function drawInterior(view) {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  let topic = null;
  if (view.k >= detailZoom) {
    if (selected) topic = byTopic.get(selected);
    else {
      const [x, y] = view.invert(zoomAnchor || [width / 2, height / 2]);
      let distance = Infinity;
      for (const node of stations) {
        if (family !== "all" && node.family !== family) continue;
        const delta = (node.x - x) ** 2 + (node.y - y) ** 2;
        if (delta < distance) {
          topic = node;
          distance = delta;
        }
      }
    }
  }
  if (insideId !== (topic?.id ?? null)) {
    insideId = topic?.id ?? null;
    layoutKey = "";
    interior.selectAll("*").remove();
    guides.selectAll("*").remove();
    world.classed("has-interior", Boolean(topic));
    stops.classed("inside-parent", (d) => d.id === insideId);
    interior.style("display", topic ? null : "none");
    if (topic) buildInterior(topic);
  }
  if (!topic) return;
  const transform = "translate(" + [topic.x, topic.y] + ") scale(" +
    1 / view.k + ")";
  interior.attr("transform", transform);
  guides.attr("transform", transform);
  const deep = view.k >= formulaZoom;
  interior.classed("with-formulas", deep);
  const key = [width, height, deep, selectedPart].join("/");
  if (key === layoutKey) return;
  layoutKey = key;
  const narrow = width < 560;
  const count = topic.parts.length;
  const rx = Math.min(narrow ? width * .24 : width * .25, deep ? 180 : 138);
  const ry = Math.min(height * .21, deep ? 96 : 79);
  const positions = count === 2
    ? narrow ? [[0, -ry], [0, ry]] : [[-rx, -ry * .57], [rx, ry * .57]]
    : [[-rx, -ry * .72], [rx, -ry * .72], [0, ry]];
  const box = Math.max(
    100,
    Math.min(204, narrow && count === 3 ? width * .46 : width * .8),
  );
  guides.select("ellipse").attr(
    "rx",
    narrow && count === 2 ? Math.max(48, rx * .68) : rx,
  )
    .attr("ry", ry);
  guides.selectAll("line").attr("x2", (_, i) => positions[i][0]).attr(
    "y2",
    (_, i) => positions[i][1],
  );
  const group = interior.selectAll("g.part")
    .attr("transform", (_, i) => "translate(" + positions[i] + ")")
    .attr("aria-pressed", (d) => String(selectedPart === partSlug(d)));
  group.select("rect").attr("x", -box / 2).attr("width", box).attr(
    "height",
    deep ? 74 : 48,
  );
  group.select("foreignObject").attr("x", -box / 2).attr("width", box);
  // A long formula fits its own label without typesetting or resizing the graph.
  if (deep) {
    group.selectAll(".part-formula").each(function () {
      const formula = this.querySelector("math");
      if (formula) {
        formula.style.fontSize = "14px";
        const natural = formula.getBoundingClientRect().width;
        if (natural > box - 10) {
          formula.style.fontSize = (14 * (box - 10) / natural) + "px";
        }
      }
    });
  }
}

function buildInterior(topic) {
  const color = families[topic.family].color;
  guides.attr("stroke", color).attr("aria-hidden", "true");
  guides.append("ellipse").attr("class", "orbit");
  guides.selectAll("line").data(topic.parts).join("line");
  interior.attr("aria-label", "Inside " + topic.title).style("--accent", color);
  const buttons = interior.selectAll("g.part").data(topic.parts).join("g")
    .attr("class", "part").attr("role", "button").attr("tabindex", 0)
    .attr("aria-label", (p) => topic.title + ", " + p.title)
    .on("click", (event, p) => {
      if (!event.defaultPrevented) showTopic(topic.id, partSlug(p));
    })
    .on("keydown", (event, p) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showTopic(topic.id, partSlug(p));
      }
    });
  buttons.append("rect").attr("y", -13).attr("fill", "transparent");
  buttons.append("circle").attr("r", 6).attr("stroke", color);
  const labels = buttons.append("foreignObject").attr("y", 10).attr(
    "height",
    66,
  )
    .append("xhtml:div").attr("class", "part-label");
  labels.append("xhtml:strong").text((p) => p.title);
  labels.append("xhtml:span").attr("class", "part-formula").each(function (p) {
    writeMapText(this, p.formula);
  });
}
