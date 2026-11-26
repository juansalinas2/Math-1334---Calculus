(() => {
  const directory = new URL(".", document.currentScript.src);
  const root = new URL("../", directory);
  const params = new URLSearchParams(location.search);
  const initialQuery = params.get("find");
  document.addEventListener("DOMContentLoaded", () => {
    const dialog = document.createElement("dialog");
    dialog.className = "course-search-dialog";
    dialog.setAttribute("aria-labelledby", "course-search-label");
    dialog.innerHTML = `
      <div class="course-search-heading">
        <label id="course-search-label" for="course-query">Search course notes</label>
        <button type="button" class="course-search-close" aria-label="Close search">Close</button>
      </div>
      <input type="search" id="course-query" placeholder="Topic, symbol, example, or section" autocomplete="off" aria-controls="course-matches">
      <p class="course-search-status" role="status"></p>
      <div id="course-matches"></div>`;
    document.body.append(dialog);
    const input = dialog.querySelector("input");
    const output = dialog.querySelector("#course-matches");
    const status = dialog.querySelector("[role=status]");
    let generation = 0;
    let limit = 12;
    function searchFor(query) {
      input.value = query;
      input.focus();
      limit = 12;
      render();
    }
    async function render() {
      const request = ++generation;
      const query = input.value.trim();
      output.replaceChildren();
      if (!query) {
        status.textContent = "Try a search";
        for (const query of ["dy/dx", "sliding ladder", "Exam 3 review"]) {
          const button = document.createElement("button");
          button.className = "course-search-suggestion";
          button.textContent = query;
          button.onclick = () => searchFor(query);
          output.append(button);
        }
        return;
      }
      status.textContent = "";
      let records;
      try { records = await CourseSearch.loadBook(); }
      catch (_) {
        if (request === generation) {
          status.textContent = "The search index could not be loaded.";
          const retry = document.createElement("button");
          retry.textContent = "Try again";
          retry.onclick = render;
          output.append(retry);
        }
        return;
      }
      if (request !== generation || !dialog.open) return;
      const hits = CourseSearch.rank(records, query, limit + 1);
      const more = hits.length > limit;
      status.textContent = !hits.length ? "No matches. Try a shorter phrase or a section number."
        : more ? `Showing the first ${limit} results` : `${hits.length} result${hits.length === 1 ? "" : "s"}`;
      for (const item of hits.slice(0, limit)) {
        const link = document.createElement("a");
        link.className = "course-search-hit";
        link.href = new URL(item.href, root);
        const title = document.createElement("span");
        title.textContent = item.title;
        const context = document.createElement("small");
        context.textContent = item.kind + (item.context !== item.title ? " · " + item.context : "");
        link.append(title, context);
        link.addEventListener("click", event => {
          if (!(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) dialog.close();
        });
        output.append(link);
      }
      if (more) {
        const next = document.createElement("button");
        next.textContent = "More results";
        next.onclick = async () => {
          const start = limit;
          limit += 12;
          await render();
          output.querySelectorAll("a")[start]?.focus();
        };
        output.append(next);
      }
      if (hits.some(item => item.title.includes("\\("))) {
        window.MathJax?.typesetPromise?.([output]).catch(() => {});
      }
    }
    input.addEventListener("input", () => { limit = 12; render(); });
    dialog.querySelector(".course-search-close").onclick = () => dialog.close();
    dialog.addEventListener("click", event => { if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    } });
    dialog.addEventListener("keydown", event => {
      // Prevent Escape in the dialog from also closing the mobile contents menu.
      if (event.key === "Escape") { event.stopPropagation(); dialog.close(); return; }
      const links = [...output.querySelectorAll("a")];
      const index = links.indexOf(document.activeElement);
      if (event.key === "Enter" && event.target === input && links.length) {
        event.preventDefault(); links[0].click();
      } else if (["ArrowUp", "ArrowDown"].includes(event.key) && links.length &&
                 (event.target === input || index >= 0)) {
        event.preventDefault();
        if (event.key === "ArrowUp" && index < 1) input.focus();
        else links[Math.min(links.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))].focus();
      }
    });
    window.quartoOpenSearch = () => {
      if (!dialog.open) dialog.showModal();
      input.focus(); input.select(); render();
    };
    if (initialQuery !== null) {
      input.value = initialQuery;
      window.quartoOpenSearch();
    }
  });
})();
