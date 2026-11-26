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

// Use the same reading order in the standalone map and the guide inside the book.
function appendMapNote(parent, note, formulaClass, sectionHeading) {
  const prose = (text) => mapTextElement("p", text, "note-prose");
  parent.append(prose(note.definition), mapTextElement("div", note.formula, formulaClass),
    mapTextElement(sectionHeading, "Idea"), prose(note.idea));
  function disclosure(title, content) {
    const details = document.createElement("details");
    details.className = "lecture-disclosure";
    details.append(mapTextElement("summary", title), content);
    parent.append(details);
    return details;
  }
  if (note.theorems?.length) {
    parent.append(mapTextElement(sectionHeading, "Theorems and rules"));
    for (const id of note.theorems) {
      const theorem = courseTheorems[id];
      const details = disclosure(theorem.title, prose(theorem.statement));
      const source = mapTextElement("a", "Read in the lecture", "theorem-source");
      source.href = theorem.href;
      details.append(source);
    }
  }
  if (note.reasoning) disclosure("Show the reasoning", prose(note.reasoning));
  if (note.example) disclosure("Class example", prose(note.example));
  if (note.figure) {
    const img = document.createElement("img");
    img.src = "../lectures/assets/" + note.figure.file;
    img.alt = note.figure.alt;
    img.loading = "lazy";
    disclosure("See the lecture figure", img);
  }
}
