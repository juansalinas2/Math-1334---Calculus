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
