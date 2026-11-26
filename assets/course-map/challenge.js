(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const svgNS = "http://www.w3.org/2000/svg";
  const letters = "ABCD";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let lectures = [], route = [], answers = [], streak = 0, signal = false, mode = "lobby";
  let branches = [], best = 0;

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function svg(tag, attrs) {
    const element = document.createElementNS(svgNS, tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    return element;
  }
  function drawTracks(stage) {
    const layer = byId("tracks");
    layer.replaceChildren();
    const turn = 260 + (stage * 37) % 110;
    const origin = 94 + (stage ? Math.round(16 * Math.sin(stage * 1.7)) : 0);
    branches = [27, 71, 115, 159].map((y, i) => {
      const group = svg("g", {class:"route"});
      const d = 'M56 ' + origin + ' H' + (turn-36) + ' Q' + turn + ' ' + origin + ' ' + (turn+23) + ' ' + (origin+(y-origin)*.33) + ' L' + (turn+86) + ' ' + (origin+(y-origin)*.88) + ' Q' + (turn+102) + ' ' + y + ' ' + (turn+132) + ' ' + y + ' H613';
      const rail = svg("path", {d,class:"track"});
      group.append(svg("path", {d,class:"track-bed"}),rail,
        svg("rect",{x:613,y:y-13,width:34,height:26,rx:6,class:"gate"}));
      const label = svg("text",{x:630,y}); label.textContent = letters[i];
      group.append(label); layer.append(group);
      return {group, rail};
    });
    positionCar(branches[0].rail, 0);
  }
  function positionCar(path, progress) {
    const length = path.getTotalLength();
    const at = progress * length;
    const p = path.getPointAtLength(at);
    const ahead = path.getPointAtLength(Math.min(length, at + 1));
    const angle = progress === 1 ? 0 : Math.atan2(ahead.y-p.y,ahead.x-p.x) * 180 / Math.PI;
    byId("car").setAttribute("transform", 'translate(' + p.x + ' ' + p.y + ') rotate(' + angle + ')');
  }
  function travel(index, hit, finish) {
    const branch = branches[index];
    branch.group.classList.add(hit ? "success" : "miss");
    const started = performance.now();
    function frame(now) {
      const t = reducedMotion.matches ? 1 : Math.min(1,(now-started)/650);
      positionCar(branch.rail, t*(2-t));
      if (t < 1) requestAnimationFrame(frame);
      else finish();
    }
    frame(started);
  }
  function screen(section, state) {
    mode = state;
    document.body.dataset.state = state;
    for (const id of ["lobby","play","feedback"]) byId(id).hidden = id !== section;
  }
  function updateRecord(save = false) {
    const key = "calculus-junction-best-v1-" + byId("line").value;
    try {
      const stored = Number(localStorage.getItem(key));
      best = save ? Math.max(best,streak,stored || 0) : stored || 0;
      if (save) localStorage.setItem(key,String(best));
    } catch { best = save ? Math.max(best,streak) : 0; }
    byId("record").textContent = best;
  }
  function score() { byId("score").querySelector("b").textContent = streak; }
  function aim(index) {
    branches.forEach((branch,i) => branch.group.classList.toggle("aim",mode === "question" && index === i));
  }
  function ask() {
    const q = route[streak];
    answers = shuffle([0,1,2,3]);
    drawTracks(streak+1);
    screen("play","question");
    byId("round").textContent = "Junction " + (streak+1) + " / " + route.length;
    byId("prompt").innerHTML = q.prompt;
    const buttons = answers.map((choice,index) => {
      const b = document.createElement("button");
      const key = document.createElement("span");
      key.className = "choice-key"; key.textContent = letters[index];
      const text = document.createElement("span"); text.innerHTML = q.choices[choice];
      b.append(key,text);
      b.onfocus = b.onpointerenter = () => aim(index);
      b.onblur = b.onpointerleave = () => aim(-1);
      b.onclick = () => answer(index);
      return b;
    });
    byId("choices").replaceChildren(...buttons);
    byId("signal").hidden = !signal;
    byId("prompt").focus({preventScroll:true});
  }
  function start() {
    const line = byId("line").value;
    route = shuffle(lectures.filter(l => line === "mixed" || l.id === line).flatMap(l => l.questions));
    if (!route.length) return;
    streak = 0; signal = false; score(); ask();
  }
  function answer(index) {
    if (mode !== "question") return;
    const buttons = [...byId("choices").children];
    if (buttons[index].disabled) return;
    const q = route[streak], hit = answers[index] === 0;
    mode = "moving"; aim(-1);
    buttons.forEach(b => b.disabled=true);
    buttons[index].classList.add("taken");
    byId("signal").hidden = true;
    travel(index,hit,() => {
      if (hit) { streak++; score(); updateRecord(true); }
      const won = hit && streak === route.length;
      const ended = !hit || won;
      const earned = hit && !won && streak % 3 === 0 && !signal;
      if (earned) signal = true;
      screen("feedback", won ? "won" : hit ? "correct" : "lost");
      byId("round").textContent = won ? "Terminus reached" : hit ? "Track clear" : "Line closed";
      byId("verdict").textContent = won ? "Line complete!" : hit ? (earned ? "Signal earned!" : "Track clear!") : "Run over · " + streak + " correct";
      const result = byId("result");
      result.replaceChildren();
      const reason = document.createElement("p"); reason.innerHTML = q.why;
      if (hit) {
        const message = document.createElement("p");
        message.textContent = won ? "Every junction cleared. Final streak: " + streak + "." : earned ? "Use your signal at any junction to close two wrong tracks." : "Streak " + streak + " · Next stop, junction " + (streak+1) + ".";
        const detail = document.createElement("details"), summary = document.createElement("summary");
        summary.textContent = "Show solution"; detail.append(summary,reason);
        result.append(message,detail);
      } else {
        branches[answers.indexOf(0)].group.classList.add("success");
        const missed = document.createElement("p");
        missed.innerHTML = q.prompt;
        const answerLine = document.createElement("p");
        answerLine.innerHTML = "<strong>Correct track:</strong> " + letters[answers.indexOf(0)] + " · " + q.choices[0];
        result.append(missed,answerLine,reason);
      }
      byId("review").href = "./#" + q.topic;
      byId("review").textContent = "Review " + q.topicTitle + " (new tab)";
      byId("advance").textContent = ended ? "Play again" : "Next junction";
      byId("change").hidden = !ended;
      byId("verdict").focus({preventScroll:true});
    });
  }
  byId("signal").onclick = () => {
    if (mode !== "question" || !signal) return;
    signal = false;
    const disabled = shuffle(answers.map((choice,i) => choice === 0 ? -1 : i).filter(i=>i>=0)).slice(0,2);
    disabled.forEach(i => {
      const button = byId("choices").children[i];
      button.disabled = true; button.classList.add("closed"); branches[i].group.classList.add("closed");
    });
    byId("signal").hidden = true;
    byId("choices").querySelector("button:enabled").focus({preventScroll:true});
  };
  byId("advance").onclick = () => mode === "correct" ? ask() : start();
  byId("change").onclick = () => {
    streak=0; score(); screen("lobby","lobby"); drawTracks(0);
    byId("round").textContent = "At the station"; byId("line").focus();
  };
  byId("line").onchange = () => updateRecord();
  document.addEventListener("keydown", e => {
    if (mode !== "question" || e.repeat || e.altKey || e.metaKey || e.ctrlKey) return;
    const i = letters.indexOf(e.key.toUpperCase());
    if (i >= 0 && e.key.length === 1) { e.preventDefault(); answer(i); }
  });
  byId("start").onclick = start;
  drawTracks(0);
  async function load() {
    try {
      const res = await fetch(document.body.dataset.bank);
      if (!res.ok) throw new Error("Cannot load questions");
      lectures = await res.json();
      for (const lecture of lectures) byId("line").add(new Option(lecture.title,lecture.id));
      const requested = new URLSearchParams(location.search).get("lecture");
      if (lectures.some(l=>l.id===requested)) byId("line").value = requested;
      updateRecord(); byId("line").disabled = false; byId("start").disabled = false;
      byId("load-state").textContent = "";
    } catch {
      const retry = document.createElement("button"); retry.textContent = "Retry"; retry.onclick = load;
      byId("load-state").replaceChildren("Questions couldn’t load. ",retry);
    }
  }
  load();
})();
