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
  const theorems = JSON.parse(read("theorems.json"));
  const lectures = JSON.parse(read("challenge-questions.json"));
  const sections = JSON.parse(read("challenge-sections.json"));
  for (const lecture of lectures) {
    lecture.questions.push(...JSON.parse(read("challenge-lectures/" + lecture.id + ".json")));
    for (const q of lecture.questions) {
      if (!lecture.review && !sections[q.section]) throw Error("Missing note section: " + q.prompt);
      if (!/^\.\.\/lectures\/[\w-]+\.html#[\w.-]+$/.test(q.source)) throw Error("Missing lecture anchor: " + q.source);
    }
    lecture.sections = Object.fromEntries(Object.entries(sections).filter(([id]) => lecture.questions.some(q => q.section === id)));
  }
  const marks = fs.readFileSync(path.resolve("scripts/figures/map-node-marks.svg"), "utf8");
  const requested = { inline: new Set(), display: new Set() };
  for (const tex of JSON.parse(process.argv[3] || "[]")) requested.inline.add(tex);
  const collect = (value, mode) => {
    if (typeof value !== "string") return;
    for (const match of value.matchAll(/\$([^$\n]+)\$/g)) requested[mode].add(match[1]);
  };
  for (const topic of Object.values(notes)) {
    for (const note of [topic, ...topic.parts]) {
      const markId = "mark-" + Array.from(note.mark, c => c.codePointAt(0).toString(16)).join("-");
      if (!marks.includes('id="' + markId + '"')) throw new Error("Missing graph symbol: " + note.title);
      for (const key of note.theorems || []) {
        if (!theorems[key]) throw new Error("Missing theorem for " + note.title + ": " + key);
      }
      for (const [field, value] of Object.entries(note)) {
        collect(value, field === "formula" ? "display" : "inline");
      }
      for (const text of Object.values(note.figure || {})) collect(text, "inline");
      collect(note.symbol || note.formula.split("\n")[0], "inline");
    }
  }
  for (const theorem of Object.values(theorems)) {
    collect(theorem.title, "inline");
    collect(theorem.statement, "inline");
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
    // The game and in-note practice share a separately loaded, pre-typeset deck.
    const escape = text => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const gameMath = new Map();
    async function gameText(text) {
      const pieces = [];
      let end = 0;
      for (const match of text.matchAll(/\\\((.+?)\\\)/g)) {
        pieces.push(escape(text.slice(end, match.index)));
        const tex = match[1];
        if (!gameMath.has(tex)) {
          const visual = clean(adaptor.outerHTML(await mj.tex2chtmlPromise(tex, {display:false})));
          if (visual.includes("<mjx-merror")) throw new Error("Invalid game formula: " + tex);
          const spoken = clean(await mj.tex2mmlPromise(tex, {display:false}));
          gameMath.set(tex, '<span class="map-notation inline"><span class="math-ink" aria-hidden="true">' +
            visual + '</span><span class="math-reading">' + spoken + '</span></span>');
        }
        pieces.push(gameMath.get(tex));
        end = match.index + match[0].length;
      }
      return pieces.join("") + escape(text.slice(end));
    }
    for (const lecture of lectures) {
      for (const q of lecture.questions) {
        const numeric = q.level === 4;
        const validAnswer = numeric ? /^-?\d+(?:\/[1-9]\d*)?$/.test(q.answer) && !q.choices :
          Array.isArray(q.choices) && q.choices.length === 4 && new Set(q.choices).size === 4;
        if (!notes[q.topic] || !validAnswer || !/^\.\.\/downloads\/[a-z0-9-]+\.pdf$/.test(q.pdf) || /Mean Value Theorem|Rolle[’']/i.test(JSON.stringify(q))) {
          throw new Error("Invalid game question: " + q.prompt);
        }
        q.topicTitle = notes[q.topic].title;
        q.prompt = await gameText(q.prompt);
        q.why = await gameText(q.why);
        if (q.choices) for (let i=0; i<q.choices.length; i++) q.choices[i] = await gameText(q.choices[i]);
      }
    }
    fs.writeFileSync(path.join(output, "challenge-bank.json"), JSON.stringify(lectures));
    const css = adaptor.textContent(mj.chtmlStylesheet())
      .split(fontPath.split(path.sep).join("/")).join("../assets/mathjax-4.1.3/" + font);
    const js = "const courseTopics = " + JSON.stringify(notes) + ";\nconst courseTheorems = " +
      JSON.stringify(theorems) + ";\nconst mapEquations = " +
      JSON.stringify(equations) + ";\n" + read("topics.js");
    fs.writeFileSync(path.join(output, "topics.js"), js);
    fs.writeFileSync(path.join(output, "math.css"), css + "\n" + read("math.css"));
  } finally {
    mj.done();
  }
}
renderMap();
