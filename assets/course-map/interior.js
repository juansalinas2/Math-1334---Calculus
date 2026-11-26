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
  const heading = el("button", "", "focus-heading");
  heading.type = "button";
  heading.append(focusMark(topic), el("strong", topic.title));
  heading.onclick = () => showTopic(topic.id);
  const content = el("div", "", "focus-content");
  function group(title, parts, numbered = false) {
    const section = el("section", "", "focus-group");
    if (title) section.append(el("h3", title));
    const list = el(numbered ? "ol" : "ul", "", "focus-choices");
    parts.forEach((part, index) => {
      const li = el("li", "");
      const button = el("button", "", "focus-choice");
      button.dataset.part = partSlug(part);
      if (numbered) button.append(el("span", String(index + 1), "step-number"));
      button.append(focusMark(part), el("span", part.title, "choice-title"));
      button.onclick = e => {
        if (!e.defaultPrevented) showTopic(topic.id, partSlug(part));
      };
      li.append(button);
      list.append(li);
    });
    section.append(list);
    content.append(section);
  }
  const parts = topic.parts;
  if (topic.id === "limitmethods") {
    content.classList.add("decision");
    content.append(el("p", "What does direct substitution give?", "focus-question"));
    group(parts[0].branch, parts.slice(0, 1));
    group(parts[1].branch, parts.slice(1, 2));
    group(parts[2].branch, parts.slice(2, 5));
    group(parts[5].branch, parts.slice(5));
  } else if (topic.id === "rates") {
    group("", parts.slice(0, 3), true);
    group("Supporting geometry", parts.slice(3));
  } else {
    group("", parts, topic.id === "sketch");
  }
  focusCard.setAttribute("aria-label", "Inside " + topic.title);
  focusCard.style.setProperty("--accent", families[topic.family].color);
  focusCard.replaceChildren(heading, content);
}

function drawInterior(view) {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  let topic;
  if (view.k >= detailZoom) {
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
  const scale = detailScale(view.k);
  const narrow = width < 550;
  // On a phone the card can scroll vertically while its header stays in view.
  const allowedWidth = Math.min(620, (width - 24) / (narrow ? scale : 1));
  focusCard.style.width = Math.max(170, allowedWidth) + "px";
  focusCard.style.maxHeight = Math.max(100, (height - 20) / scale) + "px";
  focusCard.classList.toggle("narrow", narrow);
  focusCard.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ") translate(-50%,-50%)";
  focusCard.querySelectorAll("[data-part]").forEach(button => {
    const pressed = String(selected === id && selectedPart === button.dataset.part);
    if (button.getAttribute("aria-pressed") !== pressed) button.setAttribute("aria-pressed", pressed);
  });
}
