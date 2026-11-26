// The expanded note shares the map coordinates of its parent station.
const detailZoom = 1.5;
const detailScale = level => Math.sqrt(Math.max(1, level / detailZoom));
const focusCard = document.getElementById("inside-topic");
let insideId = null;
let zoomAnchor = null;

function partSlug(part) {
  return part.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
}

function focusMark(note) {
  const svg = d3.create("svg:svg").attr("viewBox", "-18 -18 36 36")
    .attr("class", "focus-mark").attr("aria-hidden", "true");
  svg.append("circle").attr("r", 16);
  drawMark(svg.datum(note), 25);
  return svg.node();
}

function buildInterior(topic) {
  focusCard.setAttribute("aria-label", "Inside " + topic.title);
  focusCard.style.setProperty("--accent", families[topic.family].color);
  focusCard.replaceChildren(buildTopicOrbit(topic));
}

function drawInterior(view) {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  let topic;
  if (view.k >= detailZoom && !systemAt(view.k)) {
    if (selected) topic = byTopic.get(selected);
    else {
      const [x, y] = view.invert(zoomAnchor || [width / 2, height / 2]);
      let distance = Infinity;
      for (const node of stations) {
        if (family !== "all" && node.family !== family) continue;
        const delta = (node.x - x) ** 2 + (node.y - y) ** 2;
        if (delta < distance) { distance = delta; topic = node; }
      }
    }
  }
  const id = topic?.id || null;
  if (insideId !== id) {
    insideId = id;
    focusCard.hidden = !topic;
    world.classed("has-interior", Boolean(topic));
    stops.classed("inside-parent", d => d.id === id);
    if (topic) buildInterior(topic);
  }
  if (!topic) return;
  const [x, y] = view.apply([topic.x, topic.y]);
  const scale = Math.max(1, Math.min(detailScale(view.k), (width - 12) / 314));
  const allowedWidth = Math.min(640, (width - 12) / scale);
  focusCard.style.width = Math.max(120, allowedWidth) + "px";
  focusCard.style.maxHeight = Math.max(100, (height - 20) / scale) + "px";
  focusCard.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ") translate(-50%,-50%)";
  focusCard.querySelectorAll("[data-part]").forEach(button => {
    const pressed = String(selected === id && selectedPart === button.dataset.part);
    if (button.getAttribute("aria-pressed") !== pressed) button.setAttribute("aria-pressed", pressed);
  });
}
