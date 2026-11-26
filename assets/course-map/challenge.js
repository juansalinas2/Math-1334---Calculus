(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const runner = window.junctionRunner, board = window.junctionScores;
  const letters = "ABCD";
  let lectures = [], course = "exam3", route = [], answers = [], mode = "lobby";
  let streak = 0, points = 0, eraser = false, assisted = false, player = "";
  let seed = 0, attempts = [], pace = null;
  const scope = () => course === "lecture" ? byId("line").value : course;
  const title = () => course === "lecture" ? byId("line").selectedOptions[0]?.textContent : course === "exam3" ? "Exam 3" : "Final review";
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
  function makeRoute(key, initial) {
    const random = generator(initial);
    const exam = key === "exam3" || key === "final";
    const pools = lectures.filter(l => exam ? l.exams.includes(key) : key === l.id).map(l => shuffle(l.questions,random));
    const available = pools.reduce((n,p)=>n+p.length,0);
    const limit = exam ? Math.min(10,available) : available;
    const deck = [];
    // Distribute the round across topics, even when their banks differ in size.
    while (deck.length < limit) {
      for (const pool of shuffle(pools.filter(p=>p.length),random)) {
        deck.push(pool.pop());
        if (deck.length === limit) break;
      }
    }
    return shuffle(deck,random);
  }
  function choicesAt(initial,cleared) {
    return shuffle([0,1,2,3],generator((initial ^ Math.imul(cleared+1,2654435761)) >>> 0));
  }
  function erasedAt(initial,cleared,options) {
    const wrong = [0,1,2,3].filter(i => options[i]!==0);
    return shuffle(wrong,generator(initial ^ Math.imul(cleared+1,0x27d4eb2d))).slice(0,2);
  }
  function screen(section,state) {
    mode=state;document.body.dataset.state=state;
    for (const id of ["lobby","play","feedback"]) byId(id).hidden=id!==section;
  }
  function listScores() {
    const entries=board.rows(scope());
    byId("board-mode").textContent=title() || "One lecture";
    byId("leaders").replaceChildren(...entries.map((row,i)=>{
      const li=document.createElement("li"),rank=document.createElement("span"),name=document.createElement("b"),score=document.createElement("span");
      rank.className="place";rank.textContent=String(i+1).padStart(2,"0");name.textContent=row.name;score.textContent=row.points+" pts";
      li.append(rank,name,score);return li;
    }));
    byId("board-empty").hidden=entries.length>0;
    let old=0;
    try { old=Number(localStorage.getItem("calculus-junction-best-v1-"+scope())) || 0; } catch {}
    byId("record").textContent=Math.max(old,...entries.map(r=>r.cleared));
  }
  function clearPace() {
    pace=null;byId("pace").hidden=true;
    if (location.hash.startsWith("#race=")) history.replaceState(null,"",location.pathname+location.search);
  }
  function selectMode(next) {
    course=next;byId("lecture-picker").hidden=course!=="lecture";
    document.querySelectorAll("[data-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===course)));
    byId("scope").textContent=course==="exam3" ? "Ten jumps through related rates, extrema, optimization, curve sketching, and l’Hospital’s rule."
      : course==="final" ? "Ten jumps drawn across the course, from limits and continuity to applications of derivatives." : "Practice one lecture, one jump at a time.";
    if (pace && pace.key!==scope()) clearPace();
    listScores();
  }
  function nameError(error) {
    byId("name-error").textContent=error?.message || "";byId("bonk").hidden=error?.kind!=="bonk";
    byId("nickname").setAttribute("aria-invalid",String(Boolean(error)));
  }
  function score() { byId("score").querySelector("b").textContent=points; }
  function ask() {
    const q=route[streak];assisted=false;answers=choicesAt(seed,streak);
    runner.stage(streak,route.length);screen("play","question");
    byId("round").textContent="Jump "+(streak+1)+" / "+route.length;byId("prompt").innerHTML=q.prompt;
    byId("choices").replaceChildren(...answers.map((choice,index)=>{
      const b=document.createElement("button"),key=document.createElement("span"),text=document.createElement("span");
      key.className="choice-key";key.textContent=letters[index];text.innerHTML=q.choices[choice];b.append(key,text);
      b.onfocus=b.onpointerenter=()=>{if(mode==="question")runner.aim(index);};
      b.onblur=b.onpointerleave=()=>{if(mode==="question")runner.aim(-1);};
      b.onclick=()=>answer(index);return b;
    }));
    byId("signal").hidden=!eraser;byId("prompt").focus({preventScroll:true});
  }
  function start() {
    const valid=board.check(byId("nickname").value.trim() || board.randomName());
    if(!valid.name){screen("lobby","lobby");nameError(valid);byId("nickname").focus();return;}
    player=valid.name;byId("nickname").value=player;board.alias(player);nameError(null);
    seed=pace?.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
    route=makeRoute(scope(),seed);if(!route.length)return;
    streak=0;points=0;eraser=false;attempts=[];score();runner.reset(route.length);byId("board").open=false;ask();
  }
  function award(cleared,used) { return (used?75:100)+(cleared%3===0?50:0); }
  function answer(index) {
    if(mode!=="question")return;
    const buttons=[...byId("choices").children];if(buttons[index].disabled)return;
    const q=route[streak],hit=answers[index]===0;mode="moving";
    buttons.forEach(b=>b.disabled=true);buttons[index].classList.add("taken");byId("signal").hidden=true;
    attempts.push(index+(assisted?4:0));
    runner.travel(index,hit,()=>{
      let gained=0;
      if(hit){streak++;gained=award(streak,assisted);points+=gained;score();}
      const won=hit && streak===route.length,ended=!hit || won;
      const earned=hit && !won && streak%3===0 && !eraser;
      if(earned)eraser=true;
      screen("feedback",won?"won":hit?"correct":"lost");
      byId("round").textContent=won?"Finish line":hit?"Jump cleared":"Took a tumble";
      byId("verdict").textContent=won?"Finish line!":hit?(earned?"Eraser earned!":"Stuck the landing!"):"Run over · "+streak+" cleared";
      const result=byId("result");result.replaceChildren();
      const reason=document.createElement("p");reason.innerHTML=q.why;
      if(hit){
        const msg=document.createElement("p");msg.textContent="+"+gained+" points. "+(won?"You cleared all "+streak+" jumps.":earned?"Your eraser can remove two wrong choices on a later jump.":"Next up: jump "+(streak+1)+".");
        const detail=document.createElement("details"),summary=document.createElement("summary");summary.textContent="Show solution";detail.append(summary,reason);result.append(msg,detail);
      }else{
        const prompt=document.createElement("p"),correct=document.createElement("p");prompt.innerHTML=q.prompt;
        correct.innerHTML="<strong>Correct answer:</strong> "+letters[answers.indexOf(0)]+" · "+q.choices[0];result.append(prompt,correct,reason);
      }
      if(ended && pace){const cmp=document.createElement("p");cmp.textContent=points===pace.points?"You tied the target!":points>pace.points?"You beat the target by "+(points-pace.points)+" points!":(pace.points-points)+" points short of the target.";result.append(cmp);}
      byId("share").hidden=!(ended && streak);byId("share-state").textContent="";byId("race-link").hidden=true;
      byId("review").href="./#"+q.topic;byId("review").textContent="Review "+q.topicTitle+" (new tab)";
      byId("advance").textContent=ended?"Run again":"Next jump";byId("change").hidden=!ended;
      if(ended){board.record(scope(),player,points,streak);listScores();}
      byId("verdict").focus({preventScroll:true});
    });
  }
  // Recompute a shared target from its choices. Do not take points from URL input.
  function loadPace() {
    if(!location.hash.startsWith("#race=") || location.hash.length>800)return;
    try{
      const [version,key,initial,steps,handle]=JSON.parse(decodeURIComponent(location.hash.slice(6)));
      if(version!==document.body.dataset.edition || !["exam3","final",...lectures.map(l=>l.id)].includes(key) ||
        !Number.isInteger(initial) || initial<0 || initial>0xffffffff || typeof steps!=="string" || !/^[0-7]{1,20}$/.test(steps) || typeof handle!=="string")return;
      const name=board.check(handle).name,deck=makeRoute(key,initial);if(!name || steps.length>deck.length)return;
      let cleared=0,total=0,available=false,missed=false;
      for(const step of steps){
        const digit=Number(step),used=digit>=4,choice=digit%4,options=choicesAt(initial,cleared);
        if(missed || (used && (!available || erasedAt(initial,cleared,options).includes(choice))))return;
        if(used)available=false;
        if(options[choice]!==0){missed=true;continue;}
        cleared++;total+=award(cleared,used);if(cleared%3===0)available=true;
      }
      if(!cleared || (!missed && cleared!==deck.length))return;
      if(!["exam3","final"].includes(key))byId("line").value=key;
      selectMode(["exam3","final"].includes(key)?key:"lecture");pace={key,seed:initial,points:total,cleared,name};
      byId("target").textContent="Beat "+name+"’s "+total+" points on the same questions.";byId("pace").hidden=false;
    }catch{ /* Incomplete or outdated links open the regular game. */ }
  }
  byId("keep-score").onclick=()=>{
    if(!pace)return;board.record(pace.key,pace.name,pace.points,pace.cleared);listScores();byId("board").open=true;
    byId("keep-score").disabled=true;byId("keep-score").textContent="Added to this board";
  };
  byId("share").onclick=async()=>{
    const url=new URL(location.href);url.search="";url.hash="race="+encodeURIComponent(JSON.stringify([document.body.dataset.edition,scope(),seed,attempts.join(""),player]));
    try{await navigator.clipboard.writeText(url.href);byId("share-state").textContent="Challenge link copied.";}
    catch{const field=byId("race-link");field.hidden=false;field.value=url.href;field.focus();field.select();byId("share-state").textContent="Copy this challenge link.";}
  };
  byId("signal").onclick=()=>{
    if(mode!=="question" || !eraser)return;eraser=false;assisted=true;
    const disabled=erasedAt(seed,streak,answers);
    disabled.forEach(i=>{const b=byId("choices").children[i];b.disabled=true;b.classList.add("closed");});
    runner.close(disabled);byId("signal").hidden=true;byId("choices").querySelector("button:enabled").focus({preventScroll:true});
  };
  byId("advance").onclick=()=>mode==="correct"?ask():start();
  byId("change").onclick=()=>{streak=0;points=0;score();screen("lobby","lobby");runner.reset(10);byId("round").textContent="At the starting line";byId("start").focus();};
  document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));
  byId("line").onchange=()=>selectMode("lecture");
  byId("roll").onclick=()=>{byId("nickname").value=board.randomName();nameError(null);};
  byId("nickname").oninput=()=>nameError(null);byId("dismiss-pace").onclick=clearPace;
  byId("enter").onsubmit=e=>{e.preventDefault();if(lectures.length)start();};
  document.addEventListener("keydown",e=>{
    if(mode!=="question" || e.repeat || e.altKey || e.metaKey || e.ctrlKey || e.isComposing)return;
    const i=letters.indexOf(e.key.toUpperCase());if(i>=0 && e.key.length===1){e.preventDefault();answer(i);}
  });
  window.addEventListener("storage",()=>{if(lectures.length)listScores();});
  runner.reset(10);
  async function load(){
    try{
      const response=await fetch(document.body.dataset.bank);if(!response.ok)throw new Error("Cannot load questions");
      lectures=await response.json();byId("line").replaceChildren(...lectures.map(l=>new Option(l.title,l.id)));
      const requested=new URLSearchParams(location.search).get("lecture"),single=lectures.some(l=>l.id===requested);
      if(single)byId("line").value=requested;
      byId("nickname").value=board.alias() || "";selectMode(single?"lecture":requested==="mixed"?"final":"exam3");loadPace();
      byId("start").disabled=false;byId("load-state").textContent="";
    }catch{
      const retry=document.createElement("button");retry.textContent="Retry";retry.onclick=load;
      byId("load-state").replaceChildren("Questions couldn’t load. ",retry);
    }
  }
  load();
})();
