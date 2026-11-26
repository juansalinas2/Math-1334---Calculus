// One local cluster is mounted at a time; the parent keeps its map coordinates.
const detailZoom = 1.5;
const formulaZoom = 2.1;
const interior = d3.select("#inside-topic");
const guides = d3.select("#orbit-guides");
let insideId = null;
let interiorPage = 0;
let mountedPage = -1;
let layoutKey = "";
let zoomAnchor = null;
const pageControls = document.getElementById("part-pages");

// A group of four divides into two pairs, leaving room for the parent in both views.
function pagesOf(parts) {
  const pages = [];
  let start = 0;
  while (start < parts.length) {
    const size = parts.length - start === 4 ? 2 : 3;
    pages.push(parts.slice(start, start + size));
    start += size;
  }
  return pages;
}
for (const [id, step] of [["previous-parts", -1], ["next-parts", 1]]) {
  document.getElementById(id).onclick = () => {
    interiorPage += step;
    drawInterior(d3.zoomTransform(viewport));
  };
}

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
    if (topic && insideId !== selected) interiorPage = 0;
    mountedPage = -1;
    layoutKey = "";
    interior.selectAll("*").remove();
    guides.selectAll("*").remove();
    world.classed("has-interior", Boolean(topic));
    stops.classed("inside-parent", (d) => d.id === insideId);
    interior.style("display", topic ? null : "none");
    pageControls.hidden = true;
  }
  if (!topic) return;
  const pages = pagesOf(topic.parts);
  const visible = pages[interiorPage];
  if (mountedPage !== interiorPage) {
    mountedPage = interiorPage;
    layoutKey = "";
    interior.selectAll("*").remove();
    guides.selectAll("*").remove();
    buildInterior(topic, visible);
    pageControls.hidden = pages.length < 2;
    document.getElementById("part-page").textContent = (interiorPage + 1) +
      " / " + pages.length;
    document.getElementById("previous-parts").disabled = interiorPage === 0;
    document.getElementById("next-parts").disabled =
      interiorPage === pages.length - 1;
  }
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
  const count = visible.length;
  const rx = Math.min(narrow ? width * .24 : width * .25, deep ? 180 : 138);
  const ry = Math.min(height * .23, deep ? 114 : 86);
  const positions = count === 1
    ? [[0, -ry]]
    : count === 2
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
    deep ? 90 : 62,
  );
  group.select("foreignObject").attr("x", -box / 2).attr("width", box);
  // Keep compact notation legible. A full equation is always available in the note.
  if (deep) {
    group.selectAll(".part-formula").each(function () {
      this.hidden = false;
      this.hidden = this.scrollWidth > box - 4;
    });
  }
}

function buildInterior(topic, visible) {
  const color = families[topic.family].color;
  guides.attr("stroke", color).attr("aria-hidden", "true");
  guides.append("ellipse").attr("class", "orbit");
  guides.selectAll("line").data(visible).join("line");
  interior.attr("aria-label", "Inside " + topic.title).style("--accent", color);
  const buttons = interior.selectAll("g.part").data(visible).join("g")
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
  buttons.append("rect").attr("y", -17).attr("fill", "transparent");
  buttons.append("circle").attr("r", 16).attr("stroke", color);
  drawMark(buttons, 24);
  const labels = buttons.append("foreignObject").attr("y", 18).attr(
    "height",
    85,
  )
    .append("xhtml:div").attr("class", "part-label");
  labels.append("xhtml:strong").text((p) => p.title);
  labels.append("xhtml:span").attr("class", "part-formula").each(function (p) {
    writeMapText(this, p.symbol || p.formula.split("\n")[0]);
  });
}
