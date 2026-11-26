// Apply the course's saved theme before the map paints. The remaining reading
// preferences share this storage key and belong to the lecture pages.
(() => {
  const key = "calculus-notes-reading";
  const valid = ["system", "light", "dark", "paper", "darker"];
  const system = matchMedia("(prefers-color-scheme: dark)");
  const root = document.documentElement;
  const backgrounds = { light: "#faf9f3", paper: "#f5efe3", dark: "#172123", darker: "#101516" };

  function preferences() {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
    } catch { return {}; }
  }
  function savedTheme() {
    const saved = preferences().theme;
    return valid.includes(saved) ? saved : "system";
  }
  let choice = savedTheme();
  function apply() {
    const resolved = choice === "system" ? (system.matches ? "dark" : "light") : choice;
    root.dataset.mapTheme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = backgrounds[resolved];
    const select = document.getElementById("map-theme");
    if (select) {
      select.value = choice;
      select.closest("label").title = "Theme · " + select.selectedOptions[0].text;
    }
  }
  apply();
  system.addEventListener("change", apply);
  window.addEventListener("storage", event => {
    if (event.key === key || event.key === null) {
      choice = savedTheme();
      apply();
    }
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) { choice = savedTheme(); apply(); }
  });
  function bind() {
    const select = document.getElementById("map-theme");
    if (!select) return;
    apply();
    select.addEventListener("change", () => {
      choice = select.value;
      try {
        localStorage.setItem(key, JSON.stringify({ ...preferences(), theme: choice }));
      } catch { /* Keep the current tab's choice when storage is unavailable. */ }
      apply();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, {once: true});
  else bind();
})();
