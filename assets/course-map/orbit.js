// Place each symbol on a fixed orbit. Clockwise order follows the lecture.
function buildTopicOrbit(topic) {
  const root = el("div", "", "topic-orbit focus-content");
  root.style.setProperty("--accent", families[topic.family].color);
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", topic.title);
  const scene = el("div", "", "orbit-scene");
  const parts = topic.parts;
  scene.dataset.moons = String(parts.length);

  const geometry = { cx: 50, cy: 43, rx: 36.5, ry: 32 };
  const anglesByCount = {
    2: [-104, 76],
    3: [-90, 30, 150],
    4: [-147, -33, 33, 147],
    5: [-90, -18, 54, 126, 198],
    6: [-90, -30, 30, 90, 150, 210],
  };
  const svgNS = "http://www.w3.org/2000/svg";
  const paths = document.createElementNS(svgNS, "svg");
  paths.setAttribute("class", "orbit-tracks");
  paths.setAttribute("viewBox", "0 0 100 100");
  paths.setAttribute("preserveAspectRatio", "none");
  paths.setAttribute("aria-hidden", "true");
  for (const scale of [1, .66]) {
    const ring = document.createElementNS(svgNS, "ellipse");
    ring.setAttribute("cx", geometry.cx);
    ring.setAttribute("cy", geometry.cy);
    ring.setAttribute("rx", geometry.rx * scale);
    ring.setAttribute("ry", geometry.ry * scale);
    ring.setAttribute("vector-effect", "non-scaling-stroke");
    if (scale < 1) ring.setAttribute("class", "inner-track");
    paths.append(ring);
  }
  scene.append(paths);

  function body(note, x, y, hint) {
    const isPlanet = note === topic;
    const button = el("button", "", isPlanet ? "orbit-body orbit-planet" : "orbit-body orbit-moon");
    button.type = "button";
    button.style.setProperty("--x", x + "%");
    button.style.setProperty("--y", y + "%");
    const slug = isPlanet ? null : partSlug(note);
    if (slug) button.dataset.part = slug;
    if (Math.abs(x - geometry.cx) < .01) button.classList.add("orbit-pole");
    const face = el("span", "", "orbit-face");
    if (skyView && isPlanet) face.append(skyArt(topic.family));
    face.append(focusMark(note));
    const visibleName = isPlanet ? (topic.label || topic.title) : note.title;
    button.append(face, el("span", visibleName, "orbit-name"));
    if (hint) button.append(el("span", hint, "orbit-hint"));
    if (isPlanet) button.setAttribute("aria-label", topic.title);
    button.onclick = event => {
      if (!event.defaultPrevented) showTopic(topic.id, slug);
    };
    scene.append(button);
  }

  body(topic, geometry.cx, geometry.cy);
  let branch;
  parts.forEach((part, i) => {
    const angles = anglesByCount[parts.length];
    const angle = (angles ? angles[i] : -90 + i * 360 / parts.length) * Math.PI / 180;
    let hint = "";
    if (topic.id === "limitmethods") {
      if (part.branch) branch = part.branch;
      hint = branch;
    } else if (topic.id === "rates") {
      hint = i < 3 ? "Step " + (i + 1) : "Supporting geometry";
    } else if (topic.id === "sketch") {
      hint = "Step " + (i + 1);
    }
    body(part, geometry.cx + Math.cos(angle) * geometry.rx,
      geometry.cy + Math.sin(angle) * geometry.ry, hint);
  });
  root.append(scene);
  return root;
}
