// Templates hold the same MathJax output used by the course notes. A camera
// move never typesets mathematics; a new topic only clones the expressions it uses.
const equationTemplates = new Map();
function writeMapText(element, text) {
  const mode = element.matches(".map-equation, .equation") ? "display" : "inline";
  const fragment = document.createDocumentFragment();
  for (const token of text.split(/(\$[^$\n]+\$)/g)) {
    if (!token.startsWith("$") || !token.endsWith("$")) {
      fragment.append(document.createTextNode(token));
      continue;
    }
    const tex = token.slice(1, -1);
    const key = mode + ":" + tex;
    let template = equationTemplates.get(key);
    if (!template) {
      template = document.createElement("template");
      template.innerHTML = mapEquations[mode][tex];
      equationTemplates.set(key, template);
    }
    const wrapper = document.createElement("span");
    wrapper.className = "map-notation " + mode;
    wrapper.append(template.content.cloneNode(true));
    fragment.append(wrapper);
  }
  element.replaceChildren(fragment);
  return element;
}

function mapTextElement(tag, text, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text.includes("$")) writeMapText(element, text);
  else element.textContent = text;
  return element;
}

// Both the full-page map and the book guide use this reading order.
function appendMapNote(parent, note, formulaClass, sectionHeading) {
  const el = mapTextElement;
  const prose = text => el("p", text, "note-prose");
  const intro = el("div", "", "note-intro");
  intro.append(prose(note.idea));

  function disclosure(container, label, ...children) {
    const details = el("details", "", "lecture-disclosure");
    details.append(el("summary", label), ...children);
    container.append(details);
    return details;
  }
  const lectureLabels = {
    Definition: "Definition and notation",
    Example: "Example setup",
    Method: "Method and formula",
    Rule: "Rule and formula",
    Theorem: "Theorem statement",
  };
  disclosure(intro, lectureLabels[note.kind], prose(note.definition), el("div", note.formula, formulaClass));
  parent.append(intro);

  const figure = note.figure;
  if (figure) {
    const example = el("section", "", "note-example");
    example.append(el(sectionHeading, "Class example"));
    const img = document.createElement("img");
    img.src = "../lectures/assets/" + figure.file;
    img.alt = figure.alt;
    img.loading = "lazy";
    if (figure.prompt) example.append(prose(figure.prompt));
    if (figure.placement === "solution") {
      disclosure(example, "Show reasoning and figure", prose(figure.reasoning), img);
    } else {
      example.append(img);
      if (figure.reasoning) disclosure(example, "Show reasoning", prose(figure.reasoning));
    }
    parent.append(example);
  }
  if (note.reasoning && !figure?.reasoning) disclosure(parent, "Show the reasoning", prose(note.reasoning));
  if (note.example && note.example !== figure?.prompt) disclosure(parent, figure ? "Another class example" : "Class example", prose(note.example));
  if (note.theorems?.length) {
    parent.append(el(sectionHeading, "Theorems and rules"));
    for (const id of note.theorems) {
      const theorem = courseTheorems[id];
      const source = el("a", "Read in the lecture", "theorem-source");
      source.href = theorem.href;
      disclosure(parent, theorem.title, prose(theorem.statement), source);
    }
  }
}
