(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const {junctionRunner:runner,junctionRules:rules,junctionScores:board} = window;
  const names = {exam3:"Exam 3",final:"Final review",theory:"Theory",vocab:"Vocabulary"};
  const levels = ["easy","medium","hard","insane"];
  const hints = {
    easy:"Your chicken hat gives you one feather to retry a missed jump.",
    medium:"Every third landing earns an eraser. Use it to remove two wrong choices.",
    hard:"Multi-step lecture problems. One miss ends your run.",
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
  let unlocked=board.stored("insane")==="yes", saveTicket=0, firstClockDelay=0;
  const diff=()=>el("difficulty").value, order=()=>el("order").value;
  const scope=()=>course==="lecture" ? el("line").value : course;
  const routeLength=()=>el("length").value==="endless"?0:Number(el("length").value)||10;
  const goal=()=>routeLength()||Infinity;
  const settings=()=>({key:scope(),diff:diff(),order:order(),length:routeLength(),version:7});
  let character=board.stored("character")||"pip", cycle=0, offset=0, banked=false, settingTarget=false;
  const showPortrait=()=>{el("runner-portrait").innerHTML=runner.portrait(character,diff());};
  function selectCharacter(id){
    character=runner.characters.some(a=>a.id===id)?id:"pip";
    runner.character(character);
    for(const select of ["character","lobby-character"])el(select).value=character;
    showPortrait();
    board.stored("character",character);
  }
  for(const id of ["character","lobby-character"]){
    const select=el(id);
    select.replaceChildren(...runner.characters.map(a=>new Option(a.name,a.id)));
    select.onchange=()=>selectCharacter(select.value);
  }
  selectCharacter(character);
  const title=()=>names[course] || el("line").selectedOptions[0]?.textContent || "One lecture";
  const randomSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
  const edition=document.body.dataset.edition;
  const timed=()=>el("clock-mode").value!=="practice";
  const difficultyName=id=>({easy:"Easy",medium:"Normal",hard:"Hard",insane:"Insane"})[id];
  let historyItems=[], times=[], bonus=null, extra="", bonusActive=false;
  let timerId=0, deadline=0, turn=0;
  let personalBest=Number(board.stored("best-streak"))||0;
  const encodeSeconds = n => n.toString(36).padStart(2,"0");
  function personalRecord() {
    personalBest=Math.max(personalBest,Number(board.stored("best-streak"))||0);
    if(run.best>personalBest){personalBest=run.best;board.stored("best-streak",personalBest);}
    el("personal-best").textContent=personalBest;
    el("crown-record").hidden=board.stored("sun-crown")!=="yes";
  }
  window.addEventListener("storage",personalRecord);
  const currentQuestion=()=>bonusActive ? bonus : route[run.cleared-offset];
  const currentLevel=()=>bonusActive ? rules.nextLevel(diff()) : diff();
  const jumpIndex=()=>run.cleared;
  function stopClock() {clearTimeout(timerId);timerId=0;deadline=0;el("clock").hidden=true;}
  function remaining() {return deadline ? Math.max(0,(deadline-Date.now())/1000) : 0;}
  function startClock() {
    stopClock();
    if (!timed()) return;
    deadline=Date.now()+1000*rules.seconds[currentLevel()]-firstClockDelay;firstClockDelay=0;
    el("clock").hidden=false;
    function update() {
      if (state!=="question" || !deadline) return;
      const seconds=remaining(), left=Math.ceil(seconds),duration=rules.seconds[currentLevel()],clock=el("clock");
      const percent=value=>Math.max(0,Math.min(100,100*value))+"%";
      el("seconds").textContent=left;clock.dataset.urgent=String(seconds<=10);
      clock.style.setProperty("--clock-fill",String(seconds/duration));
      clock.style.setProperty("--clock-warm",percent((duration-seconds)/(duration-30)));
      clock.style.setProperty("--clock-hot",percent((30-seconds)/20));
      if (!left) submit(null,true);
      else timerId=setTimeout(update,Math.max(30,Math.min(200,deadline-Date.now())));
    }
    update();
  }
  function screen(id,next) {
    state=next;document.body.dataset.state=next;el("home").hidden=next==="lobby" || next==="loading";
    for (const panel of ["lobby","play","feedback"]) el(panel).hidden=panel!==id;
  }
  function gate() {
    if(unlocked && !Array.from(el("difficulty").options).some(option=>option.value==="insane")) {
      el("difficulty").append(new Option("Insane","insane"));
    }
  }
  function score() {
    el("score").querySelector("b").textContent=run.points;
    el("streak").textContent="Streak "+run.streak;personalRecord();
  }
  function showAward(points) {
    const badge=el("award");
    badge.textContent="+"+points;badge.hidden=false;
    if(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      badge.animate?.([{opacity:.3,transform:"translateY(4px)"},{opacity:1,transform:"translateY(0)"}],{duration:260});
    }
  }
  function renderBoard(data) {
    const rows=data.rows;
    el("record").textContent=data.best ?? 0;
    el("leaders").replaceChildren(...rows.map((row,i)=>{
      const li=document.createElement("li"), rank=document.createElement("span"), label=document.createElement("b"), streak=document.createElement("span");
      rank.className="place";rank.textContent=String(i+1);label.textContent=board.name(row.alias);streak.textContent=(row.points||0).toLocaleString()+" pts";
      li.append(rank,label,streak);return li;
    }));
    el("board-caption").textContent="All timed courses · Best score per player";
    el("board-empty").hidden=rows.length>0;
  }
  async function refresh() {
    clearTimeout(poll);const ticket=++latestRead;
    if (document.hidden || !lectures.length || !el("board").open) return;
    try {
      const data=await board.request(settings());
      if (ticket!==latestRead) return;
      if(el("board").open)renderBoard(data);
    } catch {
      if (ticket!==latestRead) return;
      el("board-caption").textContent="Class standings are temporarily offline. Reconnecting…";
      el("board-empty").hidden=true;

    } finally {
      if (ticket===latestRead) poll=setTimeout(refresh,6000);
    }
  }
  function changeCourse(next) {
    course=next;el("lecture-picker").hidden=next!=="lecture";
    el("course").value=next;
    runner.difficulty(diff());showPortrait();gate();
    const length=routeLength(), distance=length?length+" jumps":"Endless";
    const count=rules.poolSize(lectures,scope(),diff());
    el("rules-hint").textContent=distance+" · "+count+" "+difficultyName(diff())+" questions · "+(timed()?rules.seconds[diff()]+" seconds per question":"No time limit")+". "+rules.basePoints[diff()]+" points per landing"+(timed()?" + 2 per second left. ":". ")+hints[diff()];
    if(!length && ["hard","insane"].includes(diff()))el("rules-hint").textContent+=" Bank at least 10 jumps for the "+(diff()==="hard"?"difficulty unlock.":"Sun Crown.");
    el("run-summary").textContent=distance+" · "+(timed()?rules.seconds[diff()]+" s each":"untimed");
    el("invite").hidden=Boolean(room);
    el("scope").textContent=next==="lecture" ? "Questions follow this lecture PDF." : descriptions[next];
    el("start").disabled=el("invite").disabled=!count;
    refresh();
  }
  el("open-board").onclick=event=>{
    event.preventDefault();el("board").showModal();el("close-board").focus();refresh();
  };
  el("close-board").onclick=()=>el("board").close();
  el("board").addEventListener("close",()=>{el("open-board").focus({preventScroll:true});refresh();});
  function resetLink() {
    race.leave();pace=null;room=null;settingTarget=false;el("pace-score").hidden=true;el("room-panel").hidden=true;el("pace").hidden=true;el("invite-link").hidden=true;el("racers").replaceChildren();
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
  function scoreData() {
    return {steps:steps.join(""),times:times.map(encodeSeconds).join(""),extra,banked};
  }
  function payload() {
    return {...settings(),seed,...scoreData(),player:board.player,alias:playerAlias,action:"save",publishName:true};
  }
  let boardWrite=Promise.resolve();
  function postBoard(snapshot) {
    const task=boardWrite.then(()=>board.request(snapshot,true));
    boardWrite=task.catch(()=>{});return task;
  }
  function setRoomCourse(r){
    const named=Object.hasOwn(names,r.key);
    if(!named)el("line").value=r.key;
    el("length").value=r.length?String(r.length):"endless";el("clock-mode").value="timed";el("difficulty").value=r.diff;el("order").value=r.order;
    changeCourse(named?r.key:"lecture");
  }
  const race=window.createCriticalRace({el,board,edition,runner,character:()=>character,
    setup:()=>({...settings(),seed:randomSeed()}),
    allowed:r=>r.diff!=="insane"||unlocked,
    courseLabel:r=>(names[r.key]||sections[r.key.slice(1)]||"Lecture")+" · "+difficultyName(r.diff),
    enter:r=>{turn++;saveTicket++;stopClock();banked=false;bonusActive=false;el("bonus-offer").hidden=true;el("award").hidden=true;runner.home();room=r;pace=null;run=rules.newRun(r.diff);score();setRoomCourse(r);screen(null,"waiting");el("round").textContent="Waiting for runners";},
    begin:(r,late)=>{room=r;setRoomCourse(r);firstClockDelay=late;start();}, depart:()=>home()
  });
  function solution(q) {
    const frag=document.createDocumentFragment();
    const prompt=document.createElement("p"), correct=document.createElement("p"), reason=document.createElement("p"), source=document.createElement("a");
    prompt.innerHTML=q.prompt;
    correct.innerHTML="<strong>Correct answer</strong> · "+(q.choices ? q.choices[0] : q.answer);
    reason.innerHTML=q.why;source.href=q.pdf+(q.handoutPage?"#page="+q.handoutPage:"");source.target="_blank";source.rel="noopener";
    source.textContent=(sections[q.section] || "Lecture notes")+" (PDF)";
    frag.append(prompt);
    if(q.graphPrompt)frag.append(window.gameGraph(q.graphPrompt));
    frag.append(correct);
    if(q.graphChoices)frag.append(window.gameGraph(q.graphChoices[0]));
    frag.append(reason,source);
    if(q.pdfPage){const book=document.createElement("a");book.href="../downloads/math-1334-calculus-lecture-notes.pdf#page="+q.pdfPage;
      book.target="_blank";book.rel="noopener";book.textContent="Collected notes, p. "+(q.pdfPage-2);frag.append(" · ",book);}
    if(q.reviewPdf){const review=document.createElement("a");review.href=q.reviewPdf;review.target="_blank";review.rel="noopener";
      review.textContent=q.reference || "Exam review worksheet";frag.append(" · ",review);}
    else if(q.reference){const credit=document.createElement("p");credit.textContent=q.reference;frag.append(credit);}
    return frag;
  }
  function ask() {
    if(!bonusActive && !routeLength() && run.cleared-offset===route.length){
      const last=route[route.length-1];
      offset=run.cleared;
      route=rules.makeRoute(lectures,scope(),seed,diff(),order(),0,++cycle);
      if(route.length>1 && route[0]===last)[route[0],route[1]]=[route[1],route[0]];
    }
    turn++;const q=currentQuestion();assisted=false;answers=rules.options(seed,jumpIndex());
    runner.stage(jumpIndex(),bonusActive ? run.cleared+1 : goal());screen("play","question");score();
    el("round").textContent=bonusActive?"Extra credit · "+difficultyName(currentLevel()):(routeLength()?"Jump "+(run.cleared+1)+" / "+routeLength():"Endless · Jump "+(run.cleared+1))+(run.feather?" · 1 feather":"");
    el("bank-run").hidden=!!routeLength()||bonusActive||!run.cleared;
    el("pace-score").hidden=!pace;
    if(pace)el("pace-score").textContent="Target "+pace.points.toLocaleString()+" pts";
    el("prompt").innerHTML=q.prompt;
    el("prompt-graph").replaceChildren();el("prompt-graph").hidden=!q.graphPrompt;
    if(q.graphPrompt)el("prompt-graph").append(window.gameGraph(q.graphPrompt));
    el("numeric").hidden=!q.answer;el("choices").hidden=Boolean(q.answer);
    el("number-answer").value="";el("number-answer").disabled=false;el("number-hint").textContent="";
    el("choices").classList.toggle("graphs",Boolean(q.graphChoices));
    el("choices").replaceChildren(...(q.choices ? answers : []).map((choice,index)=>{
      const b=document.createElement("button"), key=document.createElement("span"), text=document.createElement("span");
      key.className="choice-key";key.textContent=letters[index];text.innerHTML=q.choices[choice];b.append(key,text);if(q.graphChoices){const plot=window.gameGraph(q.graphChoices[choice]);plot.setAttribute("aria-hidden","true");b.append(plot);}
      b.onfocus=b.onpointerenter=()=>{if(state==="question")runner.aim(index);};
      b.onblur=b.onpointerleave=()=>{if(state==="question")runner.aim(-1);};
      b.disabled=!bonusActive && index===run.missed;if(b.disabled)b.classList.add("closed");b.onclick=()=>submit(index);return b;
    }));
    el("signal").hidden=bonusActive || !run.eraser;el("previous").open=false;el("previous").querySelector("summary").textContent=timed()?"Previous solution · clock keeps running":"Previous jump · Show solution";
    (q.answer?el("number-answer"):el("prompt")).focus({preventScroll:true});startClock();
  }
  function start() {
    if(diff()==="insane"&&!unlocked)return;
    seed=room?.seed ?? pace?.seed ?? randomSeed();
    cycle=0;offset=0;banked=false;route=rules.makeRoute(lectures,scope(),seed,diff(),order(),routeLength());if(!route.length)return;
    historyItems=[];el("recap").open=false;el("prize-panel").hidden=true;el("insane-start").hidden=true;
    stopClock();run=rules.newRun(diff());steps=[];times=[];extra="";bonusActive=false;
    bonus=rules.bonusQuestion(lectures,scope(),seed,diff());el("bonus-offer").hidden=true;runner.difficulty(diff());
    saveTicket++;
    el("award").hidden=true;el("previous").hidden=true;el("save-score").hidden=true;el("saved").textContent="";el("share-state").textContent="";
    runner.reset(goal());if(el("board").open)el("board").close();ask();
  }
  function recap() {
    el("recap").hidden=!historyItems.length;
    el("recap-list").replaceChildren(...historyItems.map(({q,caption})=>{
      const li=document.createElement("li"), entry=document.createElement("details"), heading=document.createElement("summary");
      heading.textContent=caption;entry.append(heading);
      entry.addEventListener("toggle",function reveal(){
        if(!entry.open)return;
        entry.append(solution(q));entry.removeEventListener("toggle",reveal);
      });
      li.append(entry);return li;
    }));
  }
  function showPrize(crown) {
    el("prize-panel").hidden=false;el("prize-panel").dataset.reward=crown?"crown":"unlock";
    el("prize-symbol").textContent=crown?"☀":"✦";
    el("prize-name").textContent=crown?"Sun Crown earned":"Insane mode unlocked";
    el("prize-detail").textContent=crown?"You outran the eruption. Your crown is saved on this device.":"You cleared Hard. The volcano course is open. Bring an integer or fraction for every jump.";
    el("insane-start").hidden=crown;el("encore").hidden=!crown;
  }
  async function saveScore() {
    if(!timed()||!board.nicknameOK(playerAlias))return;
    const ticket=++saveTicket;
    try {
      await postBoard(payload());
      if(ticket!==saveTicket)return;
      el("saved").textContent="Class score saved for "+board.name(playerAlias)+".";
      el("save-score").hidden=true;
      refresh();
    } catch {if(ticket===saveTicket)el("saved").textContent="Score couldn’t sync. Use Post to class leaderboard to retry.";}
  }
  function finish(q,won,bonusMessage="") {
    stopClock();screen("feedback",won?"won":"lost");score();el("round").textContent=won?"Finish line":"Run over";
    let unlockedNow=false;
    if(won && !bonusMessage){
      if(banked)runner.stage(run.cleared,run.cleared);
      const qualifies=!banked||run.cleared>=10;
      runner.celebrate(diff()==="insane"&&qualifies);
      if(qualifies && diff()==="insane"){board.stored("sun-crown","yes");personalRecord();showPrize(true);}
      if(qualifies && diff()==="hard"&&!unlocked){unlocked=true;unlockedNow=true;board.stored("insane","yes");gate();showPrize(false);}
    }
    el("verdict").textContent=bonusMessage || (won ? (banked?"Endless score banked.":diff()==="insane"?"You conquered the volcano!":unlockedNow?"Congratulations! Hard cleared.":"Course cleared!") : "Run over");
    const summary=document.createElement("p");
    summary.textContent=run.points+" points · "+run.cleared+(routeLength()?" / "+routeLength():"")+" jumps cleared · Longest streak "+run.best+".";
    el("result").replaceChildren(summary);recap();
    if(pace){const p=document.createElement("p");p.textContent=run.points===pace.points?"You tied the target!":run.points>pace.points?"You beat the target!":"Target to beat: "+pace.points+" points.";el("result").append(p);}
    if(won){const d=document.createElement("details"),label=document.createElement("summary");label.textContent=bonusMessage?"Show bonus solution":"Show final solution";d.append(label,solution(q));el("result").append(d);}
    else el("result").append(solution(q));
    el("review").hidden=true;el("change").hidden=false;el("change").textContent="Start page";
    el("advance").textContent=room?"View race room":"Run again";
    el("race-link").hidden=true;el("share").hidden=!run.points||!timed();el("save-score").hidden=!run.points||!timed();
    el("bonus-offer").hidden=!won||!bonus||Boolean(bonusMessage);
    el("bonus-description").textContent=(diff()==="insane"?"One final numeric challenge": "One "+difficultyName(rules.nextLevel(diff()))+" question")+
      (timed()?" · "+rules.seconds[rules.nextLevel(diff())]+" seconds.":".")+" Your completed run is already banked.";
    if(run.points&&timed()){el("nickname").value=board.stored("nickname")||"";el("name-error").textContent="";el("nickname").removeAttribute("aria-invalid");el("saved").textContent="";}
    if(settingTarget && run.points && timed())el("share-state").textContent="Your target is ready. Copy the challenge link to send this course to a friend.";
    el("verdict").focus({preventScroll:true});
  }
  el("bank-run").onclick=()=>{
    if(state!=="question"||bonusActive||routeLength()||!run.cleared)return;
    if(deadline && !remaining()){submit(null,true);return;}
    banked=true;run.ended=true;
    if(room)race.progress(scoreData());
    finish(historyItems.findLast(h=>h.hit).q,true);
  };
  function submit(index,timeout=false) {
    if(state!=="question")return;
    const q=currentQuestion();
    if(deadline && !remaining())timeout=true;
    if(timeout) {
      index=answers.findIndex((choice,i)=>choice!==0 && (!q.choices || !el("choices").children[i].disabled));
    } else if(q.answer) {
      const input=el("number-answer").value;
      if(!rules.rational(input)){el("number-hint").textContent="Enter an integer, a fraction such as 3/4, or a finite decimal.";return;}
      index=answers.indexOf(rules.equivalent(input,q.answer)?0:1);
    } else if(!el("choices").children[index]||el("choices").children[index].disabled)return;
    const left=timed()&&!timeout?Math.min(rules.seconds[currentLevel()],Math.floor(remaining())):0, hit=answers[index]===0;
    const landing=bonusActive?{hit}:rules.land(run,seed,goal(),index,assisted,left);
    if(!landing)return;
    const isBonus=bonusActive, ticket=turn, points=rules.earned(currentLevel(),left);
    state="moving";el("bank-run").hidden=true;stopClock();
    for(const b of el("choices").children)b.disabled=true;
    if(q.choices)el("choices").children[index].classList.add("taken");
    el("number-answer").disabled=true;el("signal").hidden=true;
    if(isBonus){
      extra=String(index)+encodeSeconds(left);
      if(hit)run.points+=points;
    } else {
      steps.push(index+(assisted?4:0));times.push(left);
    }
    if(hit)showAward(points);else el("award").hidden=true;
    historyItems.push({q,hit,caption:(isBonus?"Bonus":"Jump "+(hit?run.cleared:run.cleared+1))+" · "+(hit?"Correct":timeout?"Time expired":"Missed")});
    score();if(room)race.progress(scoreData());
    if(!hit){
      const scene=el("rails");
      if(scene.getBoundingClientRect && scene.getBoundingClientRect().bottom<64)scene.scrollIntoView({block:"start"});
    }
    runner.travel(index,hit,()=>{
      if(ticket!==turn)return;
      if(isBonus){
        bonusActive=false;if(hit || diff()==="insane")runner.celebrate(diff()==="insane"&&(!banked||run.cleared>=10));
        finish(q,true,hit?"Bonus cleared! +"+points+" points.":timeout?"Bonus time expired. Route cleared!":"Route cleared! Bonus missed.");return;
      }
      if(landing.retry){
        screen("feedback","retry");el("round").textContent="Feather used";
        el("verdict").textContent=timeout?"Time’s up!":"You missed the jump!";
        el("result").textContent="Your feather gives you one more try at this question. "+(timeout?"The timer starts fresh.":"Your streak starts over.");
        el("advance").textContent="Retry jump";for(const id of ["review","change","share","race-link","save-score","bonus-offer"])el(id).hidden=true;
        el("verdict").focus({preventScroll:true});return;
      }
      if(run.ended){finish(q,hit);if(timeout)el("verdict").textContent="Time’s up";return;}
      el("previous-content").replaceChildren(solution(q));el("previous").hidden=false;ask();
    },timeout);
  }
  el("numeric").onsubmit=e=>{e.preventDefault();submit(null);};
  el("take-bonus").onclick=()=>{
    if(state!=="won"||!bonus||el("bonus-offer").hidden)return;
    bonusActive=true;el("bonus-offer").hidden=true;runner.difficulty(rules.nextLevel(diff()));ask();
  };
  el("skip-bonus").onclick=()=>{el("bonus-offer").hidden=true;el("advance").focus();};
  function loadLink() {
    const [kind,encoded]=location.hash.slice(1).split("=");
    if(!["room","race"].includes(kind)||!encoded||encoded.length>200000)return;
    const notify=msg=>{el("pace").hidden=false;el("target").textContent=msg;};
    if(kind==="room"){
      if(/^[A-HJ-NP-Z2-9]{6}$/.test(encoded))race.showHub(encoded);
      else notify("This invite is from an earlier race. Ask the host for a new room code.");
      return;
    }
    try {
      const data=JSON.parse(decodeURIComponent(encoded));if(!Array.isArray(data))return;
      if(data[0]!==edition){notify("This invite used an earlier question bank. Start a fresh run or ask for a new invite.");return;}
      const [,key,initial,length,difficulty,ordering,alias,transcript,clock,bonusCode,didBank,avatar]=data;
      if(data.length!==12||!Number.isInteger(initial)||initial<0||initial>0xffffffff||
        ![0,5,10,15].includes(length)||!levels.includes(difficulty)||!["ordered","shuffled"].includes(ordering)||
        !(Object.hasOwn(names,key)||typeof key==="string"&&key.startsWith("s")&&Object.hasOwn(sections,key.slice(1)))||
        (alias!==null&&!board.nicknameOK(alias)) || typeof didBank!=="boolean" || (didBank&&length!==0) ||
        typeof transcript!=="string"||!/^[0-7]+$/.test(transcript)||typeof clock!=="string"||
        clock.length!==2*transcript.length||!/^[0-9a-z]+$/.test(clock)||typeof bonusCode!=="string"||!/^([0-3][0-9a-z]{2})?$/.test(bonusCode))return;
      if(difficulty==="insane"&&!unlocked){notify("Clear a Hard course, then reopen this challenge.");return;}
      const replay=rules.newRun(difficulty);
      for(let i=0;i<transcript.length;i++){
        const code=Number(transcript[i]),left=parseInt(clock.slice(2*i,2*i+2),36);
        if(!rules.land(replay,initial,length||Infinity,code%4,code>=4,left))return;
      }
      if(!replay.points || (didBank ? replay.ended : !replay.ended))return;
      let target=replay.points;
      if(bonusCode){
        const left=parseInt(bonusCode.slice(1),36);
        if((!didBank&&replay.cleared!==length)||left>rules.seconds[rules.nextLevel(difficulty)])return;
        if(rules.options(initial,replay.cleared)[Number(bonusCode[0])]===0)target+=rules.earned(rules.nextLevel(difficulty),left);
      }
      setRoomCourse({key,diff:difficulty,order:ordering,length});
      pace={seed:initial,points:target};
      const runnerName=runner.characters.find(a=>a.id===avatar)?.name;
      notify((alias?"Beat "+alias+"’s score":"Score to beat")+" · "+target+" points on the same questions"+(runnerName?" · "+runnerName:"."));
      
      el("start").textContent="Play score challenge";
    } catch {notify("This invite is incomplete. You can start a fresh run.");}
  }
  el("score-challenge").onclick=()=>{
    el("race-hub").close();resetLink();settingTarget=true;el("clock-mode").value="timed";changeCourse(course);start();
  };
  el("share").onclick=()=>copy(link("race",[edition,scope(),seed,routeLength(),diff(),order(),board.alias(),steps.join(""),times.map(encodeSeconds).join(""),extra,banked,character]),"race-link","share-state","Score challenge copied. Your friend will play the same jumps.");
  el("save-score").onsubmit=e=>{
    e.preventDefault();if(!run.ended||!run.points)return;
    const input=el("nickname"), raw=input.value.trim();
    const alias=raw.toUpperCase();
    if(!/^[A-Za-z]{1,5}$/.test(raw) || !board.nicknameOK(alias)){
      el("name-error").textContent=/^[A-Za-z]{1,5}$/.test(raw)?"Choose another nickname for the class board.":"Use 1–5 letters, A to Z.";
      input.setAttribute("aria-invalid","true");input.focus();return;
    }
    input.value=alias;input.removeAttribute("aria-invalid");el("name-error").textContent="";
    playerAlias=alias;board.stored("nickname",alias);saveScore();
  };
  el("signal").onclick=()=>{
    if(state!=="question"||bonusActive||!run.eraser||assisted)return;assisted=true;
    const disabled=rules.erasedChoices(seed,run.cleared,run.erasersUsed);
    for(const i of disabled){const b=el("choices").children[i];b.disabled=true;b.classList.add("closed");}
    runner.close(disabled);el("signal").hidden=true;el("choices").querySelector("button:enabled").focus({preventScroll:true});
  };
  el("advance").onclick=()=>state==="retry"?ask():room?race.focus():start();
  function home() {
    turn++;saveTicket++;stopClock();el("award").hidden=true;bonusActive=false;firstClockDelay=0;el("bonus-offer").hidden=true;
    resetLink();run=rules.newRun(diff());score();screen("lobby","lobby");runner.home();
    el("round").textContent="At the starting line";el("start").textContent="Start run";changeCourse(course);el("start").focus();
  }
  el("home").onclick=el("change").onclick=home;
  el("insane-start").onclick=()=>{if(!unlocked)return;home();el("difficulty").value="insane";fresh(course);start();};
  el("course").onchange=()=>fresh(el("course").value);
  el("difficulty").onchange=el("length").onchange=el("order").onchange=el("clock-mode").onchange=()=>fresh(course);
  el("line").onchange=()=>fresh("lecture");el("dismiss-pace").onclick=()=>fresh(course);el("start").onclick=start;
  const nativeFull=()=>document.fullscreenElement||document.webkitFullscreenElement;
  function syncFull(){
    const full=Boolean(nativeFull()||document.body.classList.contains("full-window"));
    const wide=document.body.classList.contains("wide-game");document.body.classList.toggle("screen-active",full);
    const fallback=document.body.classList.contains("full-window");
    const status=el("screen-status");status.hidden=!fallback;
    if(fallback){
      const ua=navigator.userAgent || "";
      const shortcut=/iPhone|iPad|Android/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints>1) ? "" :
        /Mac/.test(ua) ? " Use Control–Command–F for browser full screen." : " Use F11 for browser full screen.";
      status.textContent="This browser is using the full window."+shortcut;
    }
    el("fullscreen").textContent=full?"Exit full screen":"Full screen";el("fullscreen").setAttribute("aria-pressed",String(full));
    el("enlarge").textContent=wide?"Standard size":"Enlarge";el("enlarge").setAttribute("aria-pressed",String(wide));el("enlarge").hidden=full;
  }
  el("enlarge").onclick=()=>{document.body.classList.toggle("wide-game");syncFull();};
  el("fullscreen").onclick=async()=>{
    const root=document.documentElement;
    if(nativeFull())await (document.exitFullscreen||document.webkitExitFullscreen).call(document);
    else if(document.body.classList.contains("full-window"))document.body.classList.remove("full-window");
    else {
      try {
        if(root.requestFullscreen)await root.requestFullscreen();
        else {
          const enter=root.webkitRequestFullscreen||root.webkitRequestFullScreen;
          if(!enter)throw new Error("Full screen unavailable");
          enter.call(root);
          setTimeout(()=>{if(!nativeFull()){document.body.classList.add("full-window");syncFull();}},350);
        }
      }
      catch{document.body.classList.add("full-window");}
    }
    syncFull();
  };
  document.addEventListener("fullscreenchange",syncFull);document.addEventListener("webkitfullscreenchange",syncFull);
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&!el("board").open){document.body.classList.remove("full-window");syncFull();}
    if(el("board").open||state!=="question"||currentQuestion()?.answer||e.repeat||e.altKey||e.metaKey||e.ctrlKey||e.isComposing)return;
    const i=letters.indexOf(e.key.toUpperCase());if(i>=0&&e.key.length===1){e.preventDefault();submit(i);}
  });
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&state==="question"&&deadline&&!remaining())submit(null,true);refresh();});
  personalRecord();gate();
  runner.home();
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
      el("line").replaceChildren(...Object.keys(sections).sort((a,b)=>a.localeCompare(b,"en",{numeric:true})).map(n=>new Option(sections[n],"s"+n)));
      const request=new URLSearchParams(location.search).get("lecture");
      const section=sections[request?.slice(1)] ? request : "s"+(lectures.find(l=>!l.review&&l.id===request)?.questions[0]?.section||"");
      const single=Object.hasOwn(sections,section.slice(1));if(single)el("line").value=section;
      screen("lobby","lobby");changeCourse(single?"lecture":request==="exam3"?"exam3":"final");loadLink();el("load-state").textContent="";
    }catch{const retry=document.createElement("button");retry.textContent="Retry";retry.onclick=load;el("load-state").replaceChildren("Questions couldn’t load. ",retry);}
  }
  load();
})();
