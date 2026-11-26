window.junctionRules = (() => {
  const sequence = ["limits","continuity","derivative-motion","derivative-rules","chain","inverse-implicit","related-rates","global-extrema","extrema","sketch","optimize","lhospital"];
  function generator(initial) {
    let state = initial >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let n = Math.imul(state ^ state >>> 15, 1 | state);
      n = (n + Math.imul(n ^ n >>> 7, 61 | n)) ^ n;
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(items, random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function makeRoute(lectures, key, seed, difficulty, order) {
    const random = generator(seed);
    const exam = key === "final" || key === "exam3";
    const sources = lectures.filter(l => exam ? l.exams.includes(key) : l.id === key);
    const eligible = q => difficulty === "easy" ? q.level <= 2 : difficulty === "hard" ? q.level >= 2 : true;
    const pools = sources.map(l => shuffle(l.questions.filter(eligible), random));
    const available = pools.reduce((n,p) => n + p.length, 0);
    const limit = exam ? Math.min(10, available) : available;
    const deck = [];
    // Rotate among lectures so a ten-question review covers the course.
    while (deck.length < limit) {
      for (const pool of shuffle(pools.filter(p => p.length),random)) {
        deck.push(pool.pop());
        if (deck.length === limit) break;
      }
    }
    if (order === "shuffled") return shuffle(deck, random);
    const chosen = new Set(deck);
    return [...sources].sort((a,b) => sequence.indexOf(a.id)-sequence.indexOf(b.id))
      .flatMap(l => l.questions.filter(q => chosen.has(q)));
  }
  const options = (seed, jump) => shuffle([0,1,2,3],generator((seed ^ Math.imul(jump+1,2654435761)) >>> 0));
  function newRun(difficulty) {
    return {difficulty, cleared:0, points:0, feather:difficulty === "easy", eraser:false, erasersUsed:0, missed:-1, ended:false};
  }
  function erasedChoices(seed, jump, usedCount) {
    const wrong = options(seed,jump).map((choice,i) => choice === 0 ? -1 : i).filter(i => i >= 0);
    const random = generator(seed ^ 0xf302de47);
    for (let i = 0; i < usedCount * 2; i++) random();
    return shuffle(wrong, random).slice(0,2);
  }
  // Live play and shared-score replay use the same rules. A rescued jump keeps its options.
  function land(run, seed, length, index, used) {
    if (run.ended || !Number.isInteger(index) || index<0 || index>3 || index===run.missed) return null;
    if (used && (!run.eraser || erasedChoices(seed,run.cleared,run.erasersUsed).includes(index))) return null;
    if (used) { run.eraser = false; run.erasersUsed++; }
    const hit = options(seed,run.cleared)[index] === 0;
    if (!hit && run.feather) {
      run.feather = false; run.missed = index;
      return {retry:true};
    }
    let earned = 0, checkpoint = false;
    if (hit) {
      run.cleared++;
      earned = (used || run.missed >= 0 ? 75 : 100) + (run.cleared % 3 === 0 ? 50 : 0);
      run.points += earned;
      run.missed = -1;
      checkpoint = run.difficulty === "medium" && run.cleared%3 === 0 && run.cleared<length && !run.eraser;
      if (checkpoint) run.eraser = true;
    }
    run.ended = !hit || run.cleared === length;
    return {hit, earned, checkpoint};
  }
  return {makeRoute, options, newRun, land, erasedChoices};
})();
