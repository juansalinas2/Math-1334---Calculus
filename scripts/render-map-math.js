// Run with Node or "quarto run". Use the same vendored TeX/CHTML renderer and
// New Computer Modern files as the lectures, before a student opens the map.
async function renderMap() {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { default: process } = await import("node:process");
  const { createRequire } = await import("node:module");
  const require = createRequire(path.resolve("scripts/render-map-math.js"));
  const source = path.resolve("assets/course-map");
  const output = process.argv[2] || "_site/map";
  const mathRoot = path.resolve("assets/mathjax-4.1.3");
  const font = "mathjax-newcm-font";
  const fontPath = path.join(mathRoot, font);
  globalThis.MathJax = {
    loader: {
      paths: { mathjax: mathRoot },
      source: { "adaptors/liteDOM": path.resolve("scripts/vendor/mathjax-4.1.3/liteDOM.js") },
      load: ["adaptors/liteDOM"], require,
    },
    startup: { typeset: false },
    options: { enableEnrichment: false, enableSpeech: false, enableBraille: false },
    output: { font: "mathjax-newcm", fontPath },
  };
  require(path.join(mathRoot, "tex-chtml.js"));
  const mj = globalThis.MathJax;
  await mj.startup.promise;
  const adaptor = mj.startup.adaptor;
  const read = name => fs.readFileSync(path.join(source, name), "utf8");
  const notes = JSON.parse(read("notes.json"));
  const requested = { inline: new Set(), display: new Set() };
  const collect = (value, mode) => {
    if (typeof value !== "string") return;
    for (const match of value.matchAll(/\$([^$\n]+)\$/g)) requested[mode].add(match[1]);
  };
  for (const topic of Object.values(notes)) {
    for (const note of [topic, ...topic.parts]) {
      for (const [field, value] of Object.entries(note)) {
        collect(value, field === "formula" ? "display" : "inline");
      }
      collect(note.symbol || note.formula.split("\n")[0], "inline");
    }
  }
  // Relation descriptions and hub symbols are plain JS string literals.
  for (const match of read("graph.js").matchAll(/"(?:\\.|[^"\\])*"/g)) {
    if (match[0].includes("$")) collect(JSON.parse(match[0]), "inline");
  }

  const equations = { inline: {}, display: {} };
  const clean = html => html.replace(/\sdata-latex="[^"]*"/g, "");
  try {
    for (const [mode, expressions] of Object.entries(requested)) {
      const display = mode === "display";
      for (const tex of expressions) {
        const node = await mj.tex2chtmlPromise(tex, { display });
        const visual = clean(adaptor.outerHTML(node));
        if (visual.includes("<mjx-merror")) throw new Error("Invalid map formula: " + tex);
        const accessible = clean(await mj.tex2mmlPromise(tex, { display }));
        equations[mode][tex] = '<span class="math-ink" aria-hidden="true">' + visual +
          '</span><span class="math-reading">' + accessible + '</span>';
      }
    }
    const css = adaptor.textContent(mj.chtmlStylesheet())
      .split(fontPath.split(path.sep).join("/")).join("../assets/mathjax-4.1.3/" + font);
    const js = "const courseTopics = " + JSON.stringify(notes) + ";\nconst mapEquations = " +
      JSON.stringify(equations) + ";\n" + read("topics.js");
    fs.writeFileSync(path.join(output, "topics.js"), js);
    fs.writeFileSync(path.join(output, "math.css"), css + "\n" + read("math.css"));
  } finally {
    mj.done();
  }
}
renderMap();
