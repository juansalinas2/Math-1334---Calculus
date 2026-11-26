// The build prepends the lecture entries and their pre-rendered MathML.
function writeMapText(element, text) {
  const parts = text.split(/(\$[^$]+\$)/g);
  const fragment = document.createDocumentFragment();
  for (const part of parts) {
    if (part.startsWith("$") && part.endsWith("$")) {
      const holder = document.createElement("template");
      holder.innerHTML = mapEquations[part.slice(1, -1)];
      fragment.append(holder.content.cloneNode(true));
    } else {
      fragment.append(document.createTextNode(part));
    }
  }
  element.replaceChildren(fragment);
  return element;
}
