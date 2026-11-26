// This local baseline finds lecture text by word overlap. Bedrock uses embeddings.
function makePreviewSearch(book) {
  const stop = new Set("and are does for from how its the their then this what when where which why with you".split(" "));
  function words(text) {
    return new Set((text.toLowerCase().match(/[a-z]{3,}/g) || [])
      .filter(word => !stop.has(word)).map(word => word.replace(/s$/, "")));
  }
  const entries = Object.entries(book).map(([key, item]) => ({
    key, title: words(item.title), body: words(item.text)
  }));
  const frequencies = new Map();
  for (const {body} of entries) {
    for (const term of body) frequencies.set(term, (frequencies.get(term) || 0) + 1);
  }
  return function find(question, section) {
    const query = words(question);
    let key = "", high = 0;
    for (const entry of entries) {
      let score = 0;
      for (const term of query) {
        if (entry.title.has(term)) score += 4;
        if (entry.body.has(term)) score += 1 / frequencies.get(term);
      }
      if (score > high) { high = score; key = entry.key; }
    }
    if (Object.hasOwn(book, section)) key = section;
    else if (high < 1) key = "";
    if (!key) return {preview: true, answer: "Which related-rates example do you mean? Name it or choose it under Reading.", sources: []};
    const title = book[key].title;
    return {preview: true, passage: key, answer: book[key].text,
      sources: [{id: 1, title, href: "lectures/related-rates.html#" + key}]};
  };
}

if (typeof window !== "undefined") {
  const book = JSON.parse(document.getElementById("course-passages").textContent);
  window.courseAskPreview = makePreviewSearch(book);
} else if (require.main === module) {
  // The instructor's offline evaluation runs the same search as the browser.
  const {book, questions} = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
  const find = makePreviewSearch(book);
  process.stdout.write(JSON.stringify(questions.map(([question, section]) =>
    find(question, section).passage || "")));
}
