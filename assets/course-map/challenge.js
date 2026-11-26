(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const runner = window.junctionRunner, board = window.junctionScores;
  const letters = "ABCD";
  let lectures = [], course = "exam3", route = [], answers = [], mode = "lobby";
  const rules = window.junctionRules;
  const courseNames = {exam3:"Exam 3", final:"Final review", theory:"Theory", vocab:"Vocabulary"};
  const difficulty = () => byId("difficulty").value;
  const order = () => byId("order").value;
  const scope = () => course === "lecture" ? byId("line").value : course;
  const title = () => courseNames[course] || byId("line").selectedOptions[0]?.textContent || "One lecture";
  // Existing scores belong to the original Medium, shuffled game.
  const boardKey = () => difficulty()==="medium" && order()==="shuffled" ? scope() : [scope(),difficulty(),order()].join("/");
  let run = rules.newRun("medium"), assisted = false, player = "";
  let seed = 0, attempts = [], pace = null;

  function screen(section, state) {
    mode = state;
    document.body.dataset.state = state;
    for (const id of ["lobby","play","feedback"]) byId(id).hidden = id !== section;
  }
  function listScores() {
    const entries = board.rows(boardKey());
    byId("board-mode").textContent = title()+" · "+byId("difficulty").selectedOptions[0].text+" · "+byId("order").selectedOptions[0].text;
    byId("leaders").replaceChildren(...entries.map((row,i) => {
      const li = document.createElement("li");
      const rank = document.createElement("span");rank.className="place";rank.textContent=String(i+1).padStart(2,"0");
      const name = document.createElement("b");name.textContent=row.name;
      const points = document.createElement("span");points.textContent=row.points+" pts";
      li.append(rank,name,points);return li;
    }));
    byId("board-empty").hidden = entries.length > 0;
    let old = 0;
    try { old = Number(localStorage.getItem("calculus-junction-best-v1-"+boardKey())) || 0; } catch {}
    byId("record").textContent = Math.max(old, ...entries.map(r=>r.cleared));
  }
  function selectMode(next) {
    course = next;
    byId("lecture-picker").hidden = course !== "lecture";
    document.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === course)));
    byId("scope").textContent = {
      exam3:"Ten jumps through related rates, extrema, curve sketching, optimization, and l’Hospital’s rule.",
      final:"Ten jumps across the course, from limits to applications of derivatives.",
      theory:"Decide what a theorem guarantees, which hypothesis it needs, or when a test is inconclusive.",
      vocab:"Match course terms and symbols to their meanings.",
      lecture:"Practice one lecture, one jump at a time.",
    }[course];
    byId("rules-hint").textContent = {
      easy:"Foundations and standard problems. Your chicken hat gives you one feather to retry a missed jump.",
      medium:"The full question pool. Clear three jumps to earn an eraser that removes two wrong answers.",
      hard:"Standard and advanced problems over lava. One miss ends the run. Every landing is unassisted.",
    }[difficulty()];
    runner.difficulty(difficulty());
    if (pace && (pace.key !== scope() || pace.difficulty !== difficulty() || pace.order !== order())) clearPace();
    listScores();
  }
  function clearPace() {
    pace = null;
    byId("pace").hidden = true;
    if (location.hash.startsWith("#race=")) history.replaceState(null,"",location.pathname+location.search);
  }
  function showNameError(error) {
    byId("name-error").textContent = error?.message || "";
    byId("bonk").hidden = error?.kind !== "bonk";
    byId("nickname").setAttribute("aria-invalid",String(Boolean(error)));
  }
  function score() { byId("score").querySelector("b").textContent = run.points; }
  function ask() {
    const q = route[run.cleared];
    assisted = false;
    // A shared round has the same prompts and positions on every device.
    answers = rules.options(seed, run.cleared);
    runner.stage(run.cleared,route.length);
    screen("play","question");
    byId("round").textContent = "Jump " + (run.cleared+1) + " / " + route.length + (run.feather ? " · 1 feather" : "");
    byId("prompt").innerHTML = q.prompt;
    const buttons = answers.map((choice,index) => {
      const b = document.createElement("button");
      const key = document.createElement("span");key.className="choice-key";key.textContent=letters[index];
      const text = document.createElement("span");text.innerHTML=q.choices[choice];
      b.append(key,text);
      b.onfocus = b.onpointerenter = () => { if (mode==="question") runner.aim(index); };
      b.onblur = b.onpointerleave = () => { if (mode==="question") runner.aim(-1); };
      b.disabled = index === run.missed;
      if (b.disabled) b.classList.add("closed");
      b.onclick = () => answer(index);
      return b;
    });
    byId("choices").replaceChildren(...buttons);
    byId("signal").hidden = !run.eraser;
    byId("prompt").focus({preventScroll:true});
  }
  function start() {
    seed = pace?.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
    route = rules.makeRoute(lectures,scope(),seed,difficulty(),order());
    if (!route.length) return;
    run = rules.newRun(difficulty()); attempts=[]; player="";
    byId("save-score").hidden=true;byId("saved").textContent="";showNameError(null);
    score();runner.reset(route.length);byId("board").open=false;ask();
  }
  function endRun() {
    byId("save-score").hidden = run.points === 0;
    byId("nickname").value = board.alias() || "";
    byId("share").hidden = run.points === 0;
    byId("share-state").textContent="";
    byId("race-link").hidden=true;
  }
  byId("save-score").onsubmit = event => {
    event.preventDefault();
    if (!run.ended || !run.points || byId("save-score").hidden) return;
    const validation = board.check(byId("nickname").value.trim() || board.randomName());
    if (!validation.name) { showNameError(validation);byId("nickname").focus();return; }
    player=validation.name;board.alias(player);board.record(boardKey(),player,run.points,run.cleared);
    byId("save-score").hidden=true;byId("saved").textContent="Score saved for "+player+".";
    listScores();byId("advance").focus();
  };
  function answer(index) {
    if (mode !== "question") return;
    const buttons = [...byId("choices").children];
    if (buttons[index].disabled) return;
    const q = route[run.cleared], hit = answers[index] === 0;
    const landing = rules.land(run,seed,route.length,index,assisted);
    if (!landing) return;
    mode = "moving";
    buttons.forEach(b => b.disabled=true);buttons[index].classList.add("taken");
    byId("signal").hidden = true;
    attempts.push(index + (assisted ? 4 : 0));
    runner.travel(index,hit,() => {
      if (landing.retry) {
        screen("feedback","retry");
        byId("round").textContent="Feather used";
        byId("verdict").textContent="Your chicken caught you!";
        byId("result").textContent="Try the same jump again. The answer you tried is crossed out.";
        byId("advance").textContent="Retry jump";
        for (const id of ["review","change","share","race-link","save-score"]) byId(id).hidden=true;
        byId("share-state").textContent="";byId("verdict").focus({preventScroll:true});return;
      }
      const {points,cleared:streak,ended}=run;
      const won = ended && hit, earned = landing.checkpoint, earnedPoints = landing.earned;
      score();byId("review").hidden=false;
      screen("feedback", won ? "won" : hit ? "correct" : "lost");
      byId("round").textContent = won ? "Finish line" : hit ? "Jump cleared" : "Took a tumble";
      byId("verdict").textContent = won ? "Finish line!" : hit ? (earned ? "Eraser earned!" : "Stuck the landing!") : "Run over · " + streak + " cleared";
      const result = byId("result");result.replaceChildren();
      const reason = document.createElement("p");reason.innerHTML = q.why;
      if (hit) {
        const message = document.createElement("p");
        message.textContent = "+" + earnedPoints + " points. " + (won ? "You cleared all " + streak + " jumps." : earned ? "Your eraser can remove two wrong choices on a later jump." : "Next up is jump " + (streak+1) + ".");
        const detail = document.createElement("details"), summary = document.createElement("summary");
        summary.textContent="Show solution";detail.append(summary,reason);result.append(message,detail);
      } else {
        const missed=document.createElement("p");missed.innerHTML=q.prompt;
        const correct=document.createElement("p");correct.innerHTML="<strong>Correct answer:</strong> "+letters[answers.indexOf(0)]+" · "+q.choices[0];
        result.append(missed,correct,reason);
      }
      if (ended && pace) {
        const comparison=document.createElement("p");
        comparison.textContent = points === pace.points ? "You tied the target!" : points > pace.points ? "You beat the target by "+(points-pace.points)+" points!" : (pace.points-points)+" points short of the target.";
        result.append(comparison);
      }
      byId("share").hidden=true;byId("share-state").textContent="";byId("race-link").hidden=true;
      byId("review").href="./#"+q.topic;byId("review").textContent="Review "+q.topicTitle+" (new tab)";
      byId("advance").textContent = ended ? "Run again" : "Next jump";
      byId("change").hidden=!ended;
      if (ended) endRun();
      byId("verdict").focus({preventScroll:true});
    });
  }
  function loadPace() {
    if (!location.hash.startsWith("#race=") || location.hash.length>550) return;
    try {
      const payload=JSON.parse(decodeURIComponent(location.hash.slice(6)));
      if (!Array.isArray(payload) || ![5,7].includes(payload.length)) return;
      const [version,key,initial,history,handle,diff="medium",ordering="shuffled"] = payload;
      const classic=payload.length===5 && version===document.body.dataset.classic;
      if ((!classic && version!==document.body.dataset.edition) ||
        (!["exam3","final"].includes(key) && !lectures.some(l=>l.id===key && (!classic || !l.review))) ||
        !["easy","medium","hard"].includes(diff) || !["ordered","shuffled"].includes(ordering) ||
        !Number.isInteger(initial) || initial<0 || initial>0xffffffff || typeof history!=="string" || !/^[0-7]{1,100}$/.test(history) || typeof handle!=="string") return;
      const name = board.check(handle).name;
      const deck = rules.makeRoute(lectures,key,initial,diff,ordering);
      if (!name || !deck.length || history.length>deck.length+1) return;
      const replay = rules.newRun(diff);
      for (const digit of history) if (!rules.land(replay,initial,deck.length,Number(digit)%4,Number(digit)>=4)) return;
      if (!replay.ended || !replay.points) return;
      const total=replay.points;
      byId("difficulty").value=diff;byId("order").value=ordering;
      if (!Object.hasOwn(courseNames,key)) byId("line").value=key;
      selectMode(Object.hasOwn(courseNames,key)?key:"lecture");
      pace={key,seed:initial,points:total,difficulty:diff,order:ordering};
      byId("target").textContent="Beat "+name+"’s "+total+" points on the same questions.";
      byId("pace").hidden=false;
    } catch { /* An incomplete link opens the regular game. */ }
  }
  byId("share").onclick = async () => {
    const url=new URL(location.href);
    url.search="";url.hash="race="+encodeURIComponent(JSON.stringify([document.body.dataset.edition,scope(),seed,attempts.join(""),player || "Runner",difficulty(),order()]));
    try { await navigator.clipboard.writeText(url.href);byId("share-state").textContent="Challenge link copied."; }
    catch { const field=byId("race-link");field.hidden=false;field.value=url.href;field.focus();field.select();byId("share-state").textContent="Copy this challenge link."; }
  };
  byId("signal").onclick = () => {
    if (mode!=="question" || !run.eraser || assisted) return;
    assisted=true;
    const disabled=rules.erasedChoices(seed,run.cleared,run.erasersUsed);
    disabled.forEach(i=>{const b=byId("choices").children[i];b.disabled=true;b.classList.add("closed");});
    runner.close(disabled);byId("signal").hidden=true;byId("choices").querySelector("button:enabled").focus({preventScroll:true});
  };
  byId("advance").onclick=()=>["correct","retry"].includes(mode)?ask():start();
  byId("change").onclick=()=>{run=rules.newRun(difficulty());score();screen("lobby","lobby");runner.reset(10);byId("round").textContent="At the starting line";byId("start").focus();};
  document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));
  byId("line").onchange=()=>selectMode("lecture");
  byId("roll").onclick=()=>{byId("nickname").value=board.randomName();showNameError(null);};
  byId("nickname").oninput=()=>showNameError(null);
  byId("dismiss-pace").onclick=clearPace;
  byId("start").onclick=()=>{if(lectures.length)start();};
  byId("difficulty").onchange=byId("order").onchange=()=>selectMode(course);
  document.addEventListener("keydown",e=>{
    if (mode!=="question" || e.repeat || e.altKey || e.metaKey || e.ctrlKey || e.isComposing) return;
    const i=letters.indexOf(e.key.toUpperCase());
    if(i>=0 && e.key.length===1){e.preventDefault();answer(i);}
  });
  window.addEventListener("storage",()=>{if(lectures.length)listScores();});
  runner.reset(10);
  async function load() {
    try {
      const res=await fetch(document.body.dataset.bank);
      if(!res.ok)throw new Error("Cannot load questions");
      lectures=await res.json();
      byId("line").replaceChildren(...lectures.filter(l=>!l.review).map(l=>new Option(l.title,l.id)));
      const requested=new URLSearchParams(location.search).get("lecture");
      const single=lectures.some(l=>!l.review && l.id===requested);
      if(single)byId("line").value=requested;
      byId("nickname").value=board.alias()||"";
      selectMode(single?"lecture":requested==="mixed"?"final":"exam3");loadPace();
      byId("start").disabled=false;byId("load-state").textContent="";
    } catch {
      const retry=document.createElement("button");retry.textContent="Retry";retry.onclick=load;
      byId("load-state").replaceChildren("Questions couldn’t load. ",retry);
    }
  }
  load();
})();
