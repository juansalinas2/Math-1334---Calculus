// Keep text and symbols adjustable independently of the map's zoom level.
const mapSizes = {topic:1, subtopic:1};
(() => {
  const key = "calculus-map-node-sizes";
  const menu = document.getElementById("map-sizes");
  const choices = [1, 1.25, 1.5];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
  for (const kind of ["topic", "subtopic"]) {
    const select = document.getElementById(kind + "-size");
    function apply(value) {
      mapSizes[kind] = choices.includes(value) ? value : 1;
      select.value = String(mapSizes[kind]);
      document.documentElement.style.setProperty("--" + kind + "-size", select.value);
    }
    apply(saved[kind]);
    select.addEventListener("change", () => {
      apply(Number(select.value));
      try { localStorage.setItem(key, JSON.stringify(mapSizes)); } catch {}
      drawCamera();
    });
  }
  function closeOutside(event) {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  }
  document.addEventListener("pointerdown", closeOutside);
  document.addEventListener("focusin", closeOutside);
  menu.addEventListener("keydown", event => {
    if (menu.open && event.key === "Escape") {
      event.stopPropagation();
      menu.open = false;
      menu.querySelector("summary").focus();
    }
  });
})();
