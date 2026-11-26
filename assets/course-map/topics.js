// The build prepends the lecture entries and their pre-rendered MathML.
function writeMapText(element, text) {
  const parts = text.split(/(\$[^$]+\$)/g);
  const fragment = document.createDocumentFragment();
  for (const part of parts) {
    if (part.startsWith("$") && part.endsWith("$")) {
      const holder = document.createElement("template");
      holder.innerHTML = mapEquations[part.slice(1, -1)];
      const math = holder.content.firstElementChild;
      math.classList.add("course-math");
      if (element.matches(".map-equation, .equation")) {
        math.setAttribute("display", "block");
      }
      fragment.append(math);
    } else {
      fragment.append(document.createTextNode(part));
    }
  }
  element.replaceChildren(fragment);
  return element;
}
