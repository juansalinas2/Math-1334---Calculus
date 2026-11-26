(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const {junctionRunner:runner,junctionRules:rules,junctionScores:board} = window;
  const names = {exam3:"Exam 3",final:"Final review",theory:"Theory",vocab:"Vocabulary"};
  const levels = ["easy","medium","hard","insane"];
  const hints = {
    easy:"Your chicken hat gives you one feather to retry a missed jump.",
    medium:"Every third landing earns an eraser. Use it to remove two wrong choices.",
    hard:"Multi-step lecture problems over lava. Clear the course to unlock Insane.",
    insane:"The toughest lecture examples and follow-ups. One miss ends your run."
  };
  const descriptions = {exam3:"Related rates, extrema, curve sketching, optimization and l’Hospital’s rule.",
    final:"A course-wide review, from one-sided limits to applications of derivatives.",
    theory:"Work with major definitions, theorem hypotheses, conclusions and counterexamples.",
    vocab:"Read calculus notation and distinguish closely related terms.",
    lecture:"Practice a single section of the course notes."};
  const letters = "ABCD";
  let lectures=[], sections={}, course="exam3", state="loading", route=[], run=rules.newRun("medium");
  let seed=0, steps=[], answers=[], assisted=false, pace=null, room=null, latestRead=0, poll, playerAlias=board.alias();
  let unlocked=board.stored("insane")==="yes", racePlayer="", saveTicket=0;
  const diff=()=>el("difficulty").value, order=()=>el("order").value;
  const scope=()=>course==="lecture" ? el("line").value : course;
  const settings=()=>({key:scope(),diff:diff(),order:order()});
  const title=()=>names[course] || el("line").selectedOptions[0]?.textContent || "One lecture";
  const randomSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
  const edition=document.body.dataset.edition;
  function screen(id,next) {
    state=next;document.body.dataset.state=next;
    for (const panel of ["lobby","play","feedback"]) el(panel).hidden=panel!==id;
  }
  function gate() {
    el("insane").disabled=!unlocked;
    el("insane").textContent=unlocked ? "Insane" : "Insane · beat Hard to unlock";
  }
  function score() {
    el("score").querySelector("b").textContent=run.points;
    el("streak").textContent="Streak "+run.streak;
  }
  function renderBoard(rows) {
    el("record").textContent=rows[0]?.best ?? 0;
    el("leaders").replaceChildren(...rows.map((row,i)=>{
      const li=document.createElement("li"), rank=document.createElement("span"), label=document.createElement("b"), streak=document.createElement("span");
      rank.className="place";rank.textContent=String(i+1);label.textContent=board.name(row.alias);streak.textContent=row.best+" in a row";
      li.append(rank,label,streak);return li;
    }));
    el("board-caption").textContent="Longest streaks across all players";
    el("board-empty").hidden=rows.length>0;
  }
  async function refresh() {
    clearTimeout(poll);
    if (document.hidden || !lectures.length) return;
    const ticket=++latestRead;
    try {
      const data=await board.request({...settings(),...(room ? {room:room.id,seed:room.seed} : {})});
      if (ticket!==latestRead) return;
      renderBoard(data.rows);
      if (room) {
        const sorted=data.racers.sort((a,b)=>b.cleared-a.cleared||b.best-a.best);
        el("racers").replaceChildren(...sorted.map(row=>{
          const li=document.createElement("li");
          const status={finished:"finished",out:"run over",playing:"on course"}[row.status];
          li.textContent=board.name(row.alias)+" · "+row.cleared+" cleared · "+status;return li;
        }));
        el("room-status").textContent=sorted.length ? "Live race standings" : "The race is open. Start when you’re ready.";
      }
    } catch {
      if (ticket!==latestRead) return;
      el("board-caption").textContent="Class standings are temporarily offline. Reconnecting…";
      el("board-empty").hidden=true;
      if (room) el("room-status").textContent="Reconnecting to the race…";
    } finally {
      if (ticket===latestRead) poll=setTimeout(refresh,room ? 6000 : 20000);
    }
  }
  function changeCourse(next) {
    course=next;el("lecture-picker").hidden=next!=="lecture";
    document.querySelectorAll("[data-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===next)));
    runner.difficulty(diff());gate();
    const length=rules.makeRoute(lectures,scope(),0,diff(),order()).length;
    el("rules-hint").textContent=length+" jumps. "+hints[diff()];
    el("scope").textContent=descriptions[next];
    el("board-mode").textContent=title()+" · "+el("difficulty").selectedOptions[0].textContent+" · "+el("order").selectedOptions[0].textContent;
    el("record").textContent="…";el("leaders").replaceChildren();el("board-empty").hidden=true;el("board-caption").textContent="Loading class standings…";
    el("start").disabled=el("invite").disabled=!length;
    refresh();
  }
  function resetLink() {
    pace=null;room=null;el("room-panel").hidden=true;el("pace").hidden=true;el("invite-link").hidden=true;el("racers").replaceChildren();
    if (location.hash) history.replaceState(null,"",location.pathname+location.search);
  }
  function fresh(next) {resetLink();el("invite").hidden=false;el("start").textContent="Start run";changeCourse(next);}
  function link(kind,data) {
    const url=new URL(location.href);url.search="";url.hash=kind+"="+encodeURIComponent(JSON.stringify(data));return url.href;
  }
  async function copy(url,field,status,message) {
    try {await navigator.clipboard.writeText(url);el(status).textContent=message;}
    catch {const input=el(field);input.hidden=false;input.value=url;input.focus();input.select();el(status).textContent="Copy the link below.";}
  }
  function openRoom(id,initial) {
    room={id,seed:initial};pace=null;racePlayer="";
    el("room-name").textContent="Everyone plays the same course. You’re "+board.name(playerAlias)+".";
    el("room-panel").hidden=false;el("room-status").textContent="Opening the race…";
    el("start").textContent="Start race";el("invite").hidden=true;
    el("pace").hidden=true;
    refresh();
  }
  function roomURL(){return link("room",[edition,scope(),room.seed,room.id,diff(),order()]);}
  function createRoom() {
    openRoom(board.token(12),randomSeed());history.replaceState(null,"",roomURL());
    copy(roomURL(),"invite-link","room-status","Friend invite copied.");
  }
  function leaveRoom() {
    resetLink();el("invite").hidden=false;el("start").textContent="Start run";refresh();
  }
  function payload(action) {
    return {...settings(),seed,length:route.length,steps:steps.join(""),player:board.player,alias:playerAlias,action};
  }
  // Send only the most recent snapshot after an in-flight update. Changes of course or
  // racer cannot overwrite another participant's progress.
  let pendingProgress=null, writingProgress=false;
  async function progress() {
    if (!room || !racePlayer) return;
    pendingProgress={...payload("progress"),room:room.id,player:racePlayer};
    if (writingProgress) return;
    writingProgress=true;
    while (pendingProgress) {
      const snapshot=pendingProgress;pendingProgress=null;
      try {await board.request(snapshot,true);}
      catch {if (room?.id===snapshot.room) el("room-status").textContent="Race update delayed.";}
    }
    writingProgress=false;refresh();
  }
  let boardWrite=Promise.resolve();
  function postBoard(snapshot) {
    const task=boardWrite.then(()=>board.request(snapshot,true));
    boardWrite=task.catch(()=>{});return task;
  }
  let pendingStreak=null, writingStreak=false;
  async function publishStreak() {
    if (!run.best) return;
    pendingStreak=payload("streak");
    if (writingStreak) return;
    writingStreak=true;
    while (pendingStreak) {
      const snapshot=pendingStreak;pendingStreak=null;
      try {await postBoard(snapshot);} catch { /* A later landing or the finish retries. */ }
    }
    writingStreak=false;refresh();
  }
  function solution(q) {
    const frag=document.createDocumentFragment();
    const prompt=document.createElement("p"), correct=document.createElement("p"), reason=document.createElement("p"), source=document.createElement("a");
    prompt.innerHTML=q.prompt;correct.innerHTML="<strong>Correct answer</strong> · "+q.choices[0];reason.innerHTML=q.why;
    source.href=q.source;source.target="_blank";source.rel="noopener";source.textContent=(q.section ? "§"+q.section+" · " : "")+"Read the course notes ↗";
    frag.append(prompt,correct,reason,source);return frag;
  }
  function ask() {
    const q=route[run.cleared];assisted=false;answers=rules.options(seed,run.cleared);
    runner.stage(run.cleared,route.length);screen("play","question");score();
    el("round").textContent="Jump "+(run.cleared+1)+" / "+route.length+(run.feather?" · 1 feather":"");
    el("prompt").innerHTML=q.prompt;
    el("choices").replaceChildren(...answers.map((choice,index)=>{
      const b=document.createElement("button"), key=document.createElement("span"), text=document.createElement("span");
      key.className="choice-key";key.textContent=letters[index];text.innerHTML=q.choices[choice];b.append(key,text);
      b.onfocus=b.onpointerenter=()=>{if(state==="question")runner.aim(index);};
      b.onblur=b.onpointerleave=()=>{if(state==="question")runner.aim(-1);};
      b.disabled=index===run.missed;if(b.disabled)b.classList.add("closed");b.onclick=()=>answer(index);return b;
    }));
    el("signal").hidden=!run.eraser;el("previous").open=false;el("prompt").focus({preventScroll:true});
  }
  function start() {
    if(diff()==="insane"&&!unlocked)return;
    if(room && run.ended && racePlayer){openRoom(board.token(12),randomSeed());history.replaceState(null,"",roomURL());}
    seed=room?.seed ?? pace?.seed ?? randomSeed();
    route=rules.makeRoute(lectures,scope(),seed,diff(),order());if(!route.length)return;
    run=rules.newRun(diff());steps=[];saveTicket++;racePlayer=room ? board.token(16) : "";
    el("previous").hidden=true;el("save-score").hidden=true;el("saved").textContent="";el("share-state").textContent="";
    runner.reset(route.length);el("board").open=false;ask();progress();
  }
  function pickAlias(id){el("adjective").value=String(Math.floor(id/board.nouns.length));el("noun").value=String(id%board.nouns.length);}
  async function saveScore(explicit=false) {
    const ticket=++saveTicket;
    try {
      await postBoard(payload("save"));
      if(ticket!==saveTicket)return;
      el("saved").textContent="Class score saved for "+board.name(playerAlias)+".";
      if(explicit)el("save-score").hidden=true;
      refresh();
    } catch {if(ticket===saveTicket)el("saved").textContent="Score couldn’t sync. Use Save nickname to retry.";}
  }
  function finish(q,won) {
    screen("feedback",won?"won":"lost");score();el("round").textContent=won?"Finish line":"Run over";
    let unlockedNow=false;
    if(won){runner.celebrate();if(diff()==="hard"&&!unlocked){unlocked=true;unlockedNow=true;board.stored("insane","yes");gate();}}
    el("verdict").textContent=won ? (unlockedNow?"Course cleared! Insane unlocked.":"Course cleared!") : "Run over";
    const summary=document.createElement("p");
    summary.textContent=run.points+" / "+route.length+" jumps cleared · Longest streak "+run.best+".";
    el("result").replaceChildren(summary);
    if(pace){const p=document.createElement("p");p.textContent=run.points===pace.points?"You tied the target!":run.points>pace.points?"You beat the target!":"Target to beat: "+pace.points+".";el("result").append(p);}
    if(won){const d=document.createElement("details"),s=document.createElement("summary");s.textContent="Show final solution";d.append(s,solution(q));el("result").append(d);}
    else el("result").append(solution(q));
    el("review").hidden=true;el("change").hidden=false;el("advance").textContent=room?"New race":"Run again";
    el("race-link").hidden=true;el("share").hidden=!run.points;el("save-score").hidden=!run.points;
    if(run.points){pickAlias(playerAlias);saveScore();}
    el("verdict").focus({preventScroll:true});
  }
  function answer(index) {
    if(state!=="question" || !el("choices").children[index] || el("choices").children[index].disabled)return;
    const q=route[run.cleared], hit=answers[index]===0, result=rules.land(run,seed,route.length,index,assisted);
    if(!result)return;state="moving";
    for(const b of el("choices").children)b.disabled=true;
    el("choices").children[index].classList.add("taken");el("signal").hidden=true;
    steps.push(index+(assisted?4:0));score();progress();if(hit&&!run.ended)publishStreak();
    runner.travel(index,hit,()=>{
      if(result.retry){
        screen("feedback","retry");el("round").textContent="Feather used";el("verdict").textContent="Your chicken caught you!";
        el("result").textContent="Try the same jump again. Your feather is spent and your streak starts over.";
        el("advance").textContent="Retry jump";for(const id of ["review","change","share","race-link","save-score"])el(id).hidden=true;
        el("verdict").focus({preventScroll:true});return;
      }
      if(run.ended){finish(q,hit);return;}
      el("previous-content").replaceChildren(solution(q));el("previous").hidden=false;ask();
    });
  }
  function loadLink() {
    const [kind,encoded]=location.hash.slice(1).split("=");
    if(!["room","race"].includes(kind)||!encoded||encoded.length>650)return;
    const notify=msg=>{el("pace").hidden=false;el("target").textContent=msg;};
    try {
      const data=JSON.parse(decodeURIComponent(encoded));if(!Array.isArray(data))return;
      if(data[0]!==edition){notify("This invite used an earlier question bank. Start a fresh run or ask for a new invite.");return;}
      const [,key,initial,value]=data;
      const [difficulty,ordering]=data.slice(-2);
      if(!Number.isInteger(initial)||initial<0||initial>0xffffffff||!levels.includes(difficulty)||!["ordered","shuffled"].includes(ordering)||
        !(Object.hasOwn(names,key)||typeof key==="string"&&key.startsWith("s")&&Object.hasOwn(sections,key.slice(1))))return;
      if(difficulty==="insane"&&!unlocked){notify("This is an Insane challenge. Clear a Hard course, then reopen the invite.");return;}
      if(kind==="room" && (!/^[0-9a-f]{24}$/.test(value)||data.length!==6))return;
      let target;
      if(kind==="race"){
        if(data.length!==7||typeof value!=="string"||!/^[0-7]{1,61}$/.test(value)||!board.valid(data[4]))return;
        const length=rules.makeRoute(lectures,key,initial,difficulty,ordering).length,r=rules.newRun(difficulty);
        for(const digit of value)if(!rules.land(r,initial,length,Number(digit)%4,Number(digit)>=4))return;
        if(!r.ended||!r.points)return;target=r.points;
      }
      el("difficulty").value=difficulty;el("order").value=ordering;
      if(!Object.hasOwn(names,key))el("line").value=key;
      changeCourse(names[key]?key:"lecture");
      if(kind==="room")openRoom(value,initial);
      else{pace={seed:initial,points:target};notify("Beat "+board.name(data[4])+"’s "+target+" on the same questions.");}
    } catch {notify("This invite is incomplete. You can start a fresh run.");}
  }
  el("invite").onclick=createRoom;el("room-copy").onclick=()=>copy(roomURL(),"invite-link","room-status","Friend invite copied.");
  el("leave-room").onclick=leaveRoom;
  el("share").onclick=()=>copy(link("race",[edition,scope(),seed,steps.join(""),playerAlias,diff(),order()]),"race-link","share-state","Challenge link copied.");
  el("save-score").onsubmit=e=>{
    e.preventDefault();if(!run.ended||!run.points)return;
    playerAlias=Number(el("adjective").value)*board.nouns.length+Number(el("noun").value);
    board.stored("alias",playerAlias);saveScore(true);progress();
    if(room)el("room-name").textContent="You’re "+board.name(playerAlias)+".";
  };
  el("roll").onclick=()=>pickAlias(board.randomAlias());
  el("signal").onclick=()=>{
    if(state!=="question"||!run.eraser||assisted)return;assisted=true;
    const disabled=rules.erasedChoices(seed,run.cleared,run.erasersUsed);
    for(const i of disabled){const b=el("choices").children[i];b.disabled=true;b.classList.add("closed");}
    runner.close(disabled);el("signal").hidden=true;el("choices").querySelector("button:enabled").focus({preventScroll:true});
  };
  el("advance").onclick=()=>state==="retry"?ask():start();
  el("change").onclick=()=>{leaveRoom();run=rules.newRun(diff());score();screen("lobby","lobby");runner.reset(10);el("round").textContent="At the starting line";changeCourse(course);el("start").focus();};
  document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>fresh(b.dataset.mode));
  el("difficulty").onchange=el("order").onchange=()=>fresh(course);
  el("line").onchange=()=>fresh("lecture");el("dismiss-pace").onclick=()=>{leaveRoom();};el("start").onclick=start;
  function syncFull(){
    const full=Boolean(document.fullscreenElement||document.body.classList.contains("full-window"));
    el("fullscreen").textContent=full?"Exit full screen":"Full screen";el("fullscreen").setAttribute("aria-pressed",String(full));
  }
  el("fullscreen").onclick=async()=>{
    if(document.fullscreenElement)await document.exitFullscreen();
    else if(document.body.classList.contains("full-window"))document.body.classList.remove("full-window");
    else {try{await document.documentElement.requestFullscreen();}catch{document.body.classList.add("full-window");}}
    syncFull();
  };
  document.addEventListener("fullscreenchange",syncFull);
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){document.body.classList.remove("full-window");syncFull();}
    if(state!=="question"||e.repeat||e.altKey||e.metaKey||e.ctrlKey||e.isComposing)return;
    const i=letters.indexOf(e.key.toUpperCase());if(i>=0&&e.key.length===1){e.preventDefault();answer(i);}
  });
  document.addEventListener("visibilitychange",refresh);
  el("adjective").replaceChildren(...board.adjectives.map((v,i)=>new Option(v,i)));
  el("noun").replaceChildren(...board.nouns.map((v,i)=>new Option(v,i)));
  runner.reset(10);
  async function load(){
    try {
      const bank=document.body.dataset.bank;
      async function readBank(){
        if(window.DecompressionStream){
          try{const res=await fetch(bank.replace(".json",".json.gz"));if(res.ok)return await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).json();}catch{}
        }
        const res=await fetch(bank);if(!res.ok)throw Error();return res.json();
      }
      lectures=await readBank();sections=Object.assign({},...lectures.map(l=>l.sections));
      el("line").replaceChildren(...Object.keys(sections).sort((a,b)=>a.localeCompare(b,"en",{numeric:true})).map(n=>new Option("§"+n+" · "+sections[n],"s"+n)));
      const request=new URLSearchParams(location.search).get("lecture");
      const section=sections[request?.slice(1)] ? request : "s"+(lectures.find(l=>!l.review&&l.id===request)?.questions[0]?.section||"");
      const single=Object.hasOwn(sections,section.slice(1));if(single)el("line").value=section;
      screen("lobby","lobby");changeCourse(single?"lecture":request==="mixed"?"final":"exam3");loadLink();el("load-state").textContent="";
    }catch{const retry=document.createElement("button");retry.textContent="Retry";retry.onclick=load;el("load-state").replaceChildren("Questions couldn’t load. ",retry);}
  }
  load();
})();
