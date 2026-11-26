// The book and the map use the same vocabulary and ranking.
window.CourseSearch = (() => {
  const indexURL = new URL("../assets/course-search-index.js", document.currentScript.src);
  let documents;
  const names = {
    "Prime and Leibniz notation": ["dy/dx", "d/dx", "f'(x)", "f'", "f prime", "dy over dx", "Leibniz notation"],
    "Derivative at a point": ["h", "h=x-a", "f'(a)", "f prime at a"],
    "Difference quotient": ["delta x", "delta y over delta x", "secant slope"],
    "Unit-circle coordinates": ["theta", "angle theta"],
    "Sine and cosine": ["derivative of sin x", "derivative of cos x", "differentiate sine", "differentiate cosine"],
    "Tangent and cotangent": ["derivative of tan x", "derivative of cot x"],
    "Secant and cosecant": ["derivative of sec x", "derivative of csc x"],
    "Indeterminate powers": ["1^infinity", "infinity^0", "0^0"],
    "Higher-order derivatives": ["f''(x)", "f''", "f double prime", "d²y/dx²", "d^2y/dx^2"],
    "Intermediate Value Theorem": ["ivt"],
    "Extreme Value Theorem": ["evt"],
    "The sign of the derivative": ["mvt", "mean value theorem", "monotonicity"],
    "l’Hospital’s rule": ["lhospital", "lhopital", "lhopitals rule", "l'hopital"],
    "Zero over zero": ["0/0", "0 over 0"],
    "Two-sided limit criterion": ["DNE", "limit does not exist", "different one-sided limits"],
    "Removable discontinuity": ["hole in a graph", "hole"],
    "Jump discontinuity": ["jump in a graph"],
    "Inflection points": ["change in concavity", "changes concavity"],
    "Infinity over infinity": ["∞/∞", "infinity/infinity", "infty/infty"],
    "One-sided limits": ["left hand limit", "right hand limit", "limit from the left", "limit from the right"],
    "Slant asymptote by division": ["polynomial long division", "long division", "divide polynomials"],
    "Global extrema": ["absolute extrema", "absolute maximum", "absolute minimum"],
    "Folding a box": ["open top box", "open box", "cardboard box"],
    "Multiply by the conjugate": ["rationalize", "rationalizing", "conjugate"],
    "Limit strategies": ["limit methods", "algebraic limits"],
  };
  function normalize(text = "") {
    return text.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "")
      .replace(/[′’‘]/g, "'").replace(/″/g, "''").replace(/−/g, "-")
      .replace(/\\(?:d|t)?frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
      .replace(/(?:\\infty|∞|\binfty\b)/g, "infinity")
      .replace(/(?:\\delta|δ)\s*([xy])/g, "delta $1").replace(/(?:\\theta|θ)/g, "theta")
      .replace(/\ba\s*\^?[-−](?=\s|$)/g, "left hand limit").replace(/\ba\s*\^?\+(?=\s|$)/g, "right hand limit")
      .replace(/\s*\/\s*/g, "/").replace(/l[' ]?h[oô]spital|l[' ]?hopital/g, "lhospital")
      .replace(/([a-z])'s\b/g, "$1s").replace(/[-–]/g, " ").trim();
  }
  const stop = new Set("a an the of at in on for from with by to is are was what where when which can could would should do does did i we you my how find use using me show please mean means section".split(" "));
  function words(text) {
    return (text.match(/[a-z]\d*(?:'{1,3})(?:\([a-z]\))?|\d+\.\d+|[a-z0-9]+(?:\/[a-z0-9]+)+|[a-z0-9]+/g) || [])
      .filter(w => !stop.has(w)).map(w => {
        if (w === "rising") return "rise";
        return w.length > 4 ? w.replace(/ies$/, "y").replace(/(?<!s)s$/, "") : w;
      });
  }
  function field(value) { return words(normalize(value)).join(" "); }
  function prepare(records) {
    return records.map(item => {
      const title = field(item.title);
      const aliases = [...(names[item.title] || []), ...(item.aliases || [])].map(field).filter(Boolean);
      return {item, title, aliases, context: field(item.context), kind: field(item.kind),
        body: new Set(words(normalize(item.text))), titleWords: title.split(" "),
        aliasWords: aliases.join(" ").split(" "), contextWords: field(item.context).split(" ")};
    });
  }
  // Only use near spellings when the complete query has no direct matches.
  function oneEdit(a, b) {
    if (a === b || Math.abs(a.length - b.length) > 1) return false;
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    if (a.length !== b.length) {
      return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
    }
    return a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] && b[i] === a[i + 1] && a.slice(i + 2) === b.slice(i + 2));
  }
  function rank(records, query, limit = 12, allowTypos = false) {
    const tokens = [...new Set(words(normalize(query)))];
    if (!tokens.length) return [];
    const section = query.trim().match(/^(?:section\s*|§\s*)?(\d+\.\d+)\b/i)?.[1];
    const phrase = tokens.join(" ");
    const hits = [];
    for (const record of records) {
      const {item, title, aliases, context, kind, titleWords, aliasWords, contextWords, body} = record;
      if (section && !contextWords.includes(section) && !titleWords.includes(section)) continue;
      let score = 0;
      for (const token of tokens) {
        let weight = 0;
        if (titleWords.includes(token)) weight = 15;
        else if (aliasWords.includes(token)) weight = 14;
        else if (kind.split(" ").includes(token)) weight = 15;
        else if (contextWords.includes(token)) weight = 6;
        else if (body.has(token)) weight = 3;
        else if (token.length >= 3 && [...titleWords, ...aliasWords].some(w => w.startsWith(token))) weight = 2;
        if (!weight && allowTypos && token.length >= 5 &&
            titleWords.concat(aliasWords).some(word => oneEdit(token, word))) weight = 1;
        if (!weight) { score = 0; break; }
        score += weight;
      }
      if (!score) continue;
      if (aliases.includes(phrase) || title === phrase) score += 55;
      else if ((" " + title + " ").includes(" " + phrase + " ")) score += 18;
      if ((tokens.includes("practice") || tokens.includes("example")) &&
          (kind === "practice" || kind === "example")) score += 14;
      if (context === phrase && item.href && !item.href.includes("#")) score += 10;
      if (section === phrase && !item.href.includes("#") && context.startsWith(section + " ")) score += 50;
      if (kind === "pdf" && !tokens.includes("pdf") && !tokens.includes("worksheet")) score -= 4;
      if (item.href?.startsWith("lectures/")) score += 1;
      hits.push({item, score});
    }
    if (!hits.length && !allowTypos && tokens.some(t => t.length >= 5)) return rank(records, query, limit, true);
    hits.sort((a, b) => b.score - a.score || a.item.title.length - b.item.title.length);
    const seen = new Set();
    const labels = new Set();
    return hits.filter(({item}) => {
      const label = item.href.split("#")[0] + "|" + field(item.title);
      if (seen.has(item.href) || labels.has(label) && !/^(practice|example|problem)( \d+)?$/.test(field(item.title))) return false;
      labels.add(label);
      seen.add(item.href);
      return true;
    }).slice(0, limit).map(hit => hit.item);
  }
  function loadBook() {
    if (!documents) {
      documents = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = indexURL;
        script.onload = () => resolve(prepare(window.courseSearchIndex));
        script.onerror = () => { documents = null; reject(new Error("Index unavailable")); };
        document.head.append(script);
      });
    }
    return documents;
  }
  return {prepare, rank, loadBook};
})();
