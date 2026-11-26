// Keep text and symbols adjustable independently of the map's zoom level.
const mapSizes = {topic:1, subtopic:1};
(() => {
  const key = "calculus-map-node-sizes";
  const menu = document.getElementById("map-sizes");
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
  for (const kind of ["topic", "subtopic"]) {
    const slider = document.getElementById(kind + "-size");
    const valueLabel = document.getElementById(kind + "-size-value");
    if (Number.isFinite(saved[kind])) slider.value = String(Math.round(saved[kind] * 100));
    function apply() {
      mapSizes[kind] = slider.valueAsNumber / 100;
      const percent = slider.value + "%";
      valueLabel.textContent = percent;
      slider.setAttribute("aria-valuetext", percent);
      document.documentElement.style.setProperty("--" + kind + "-size", String(mapSizes[kind]));
    }
    apply();
    slider.addEventListener("input", () => {
      apply();
      if (drawFrame === null) drawFrame = requestAnimationFrame(drawCamera);
    });
    slider.addEventListener("change", () => {
      try { localStorage.setItem(key, JSON.stringify(mapSizes)); } catch {}
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
