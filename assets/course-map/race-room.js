// Ready rooms share a server timestamp, course seed and answer order.
// The public code and numbered seats are separate from each player's private token.
window.createCriticalRace = function ({el,board,edition,setup,allowed,enter,begin,depart,courseLabel,runner,character,crowned}) {
  const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let member=board.token(16),resumeCode="";
  try{if(window.performance?.getEntriesByType("navigation")[0]?.type==="reload")resumeCode=sessionStorage.getItem("critical-race-code")||"";}catch{}
  let current=null,seat=0,generation=0,poll=0,countdown=0,lastPulse=0,offset=0,startedRound=0;
  let actionPending=false,pendingProgress=null,writing=false,inviteCrown=null;
  const hub=el("race-hub");
  function newCode() {
    return Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>alphabet[n%alphabet.length]).join("");
  }
  function call(action,fields={},write=true) {
    return board.request({type:"room6",version:7,...fields,...(write?{action,member}:{})},write);
  }
  function wearsCrown(s,r) {
    if(s.seat===seat)return crowned();
    if(typeof s.crowned==="boolean")return s.crowned;
    return inviteCrown?.code===r.code && inviteCrown.round===r.round &&
      inviteCrown.seat===s.seat && inviteCrown.character===s.character && s.status!=="left";
  }
  function drawSeats(r){
    const sorted=[...r.racers].sort((a,b)=>Number(a.status==="left")-Number(b.status==="left")||b.points-a.points||b.cleared-a.cleared||a.seat-b.seat);
    el("racers").replaceChildren(...sorted.map(s=>{
      const row=document.createElement("li"),name=document.createElement("b"),status=document.createElement("span"),points=document.createElement("span"),bar=document.createElement("progress");
      name.className="racer-name";const avatar=runner.characters.find(a=>a.id===s.character)||runner.characters[0];
      name.innerHTML=runner.portrait(avatar.id,r.diff,wearsCrown(s,r));
      name.append(avatar.name+" · P"+s.seat+(s.seat===seat?" (you)":""));
      status.className="racer-status";status.textContent=s.status==="waiting"?(s.ready?"Ready":"Getting ready"):
        ({playing:"On course",finished:"Finished",out:"Run over",left:"Left the room"}[s.status]||"Waiting");
      if(s.seat===r.host)status.textContent+=" · Host";
      points.className="racer-points";points.textContent=r.startAt?s.points+" pts · "+s.cleared+(r.length?"/"+r.length:" jumps"):"";
      bar.value=s.cleared;bar.max=r.length||Math.max(1,...r.racers.map(s=>s.cleared));bar.hidden=!r.startAt;bar.setAttribute("aria-label","Runner "+s.seat+" jumps cleared");
      row.append(name,status,points,bar);return row;
    }));
  }
  function draw(){
    const r=current;if(!r)return;
    const me=r.racers.find(s=>s.seat===seat), active=r.racers.filter(s=>s.status!=="left");
    const ready=active.filter(s=>s.ready).length,done=Boolean(r.startAt)&&active.every(s=>s.status!=="playing");
    el("room-heading").textContent=r.startAt?(done?"Race results":"Live race"):"Race room";
    el("room-course").textContent=courseLabel(r)+" · "+(r.length?r.length+" jumps":"Endless");
    el("room-name").textContent="You’re Runner "+seat+(r.host===seat?" · Host":"");
    el("room-code").textContent=r.code;
    const toggle=el("room-ready"),launch=el("room-launch");
    toggle.hidden=Boolean(r.startAt);toggle.disabled=actionPending;
    toggle.textContent=me?.ready?"Ready ✓":"I’m ready";toggle.setAttribute("aria-pressed",String(!!me?.ready));
    launch.hidden=r.host!==seat || (!!r.startAt&&!done);
    launch.textContent=done?"Set up rematch":"Start race";
    launch.disabled=actionPending||(!done && (active.length<2 || ready!==active.length));
    el("room-status").textContent=done?"Final standings":r.startAt?"Live standings":active.length<2?"Share the code or invite link with a friend.":ready+" of "+active.length+" ready";
    drawSeats(r);
  }
  function tick(){
    clearTimeout(countdown);
    if(!current?.startAt || startedRound===current.round || current.racers.find(s=>s.seat===seat)?.status==="left"){el("room-countdown").hidden=true;return;}
    const ms=current.startAt-(Date.now()+offset);
    const label=el("room-countdown");
    if(ms>0){label.hidden=false;label.textContent="Starting in "+Math.ceil(ms/1000);countdown=setTimeout(tick,Math.min(180,ms));return;}
    label.hidden=true;startedRound=current.round;
    begin(current,Math.max(0,-ms));
  }
  function apply(reply,sent){
    if(!current||reply.room.code!==current.code || reply.room.revision<current.revision)return;
    const newRound=reply.room.round!==current.round;
    current=reply.room;
    if(newRound){pendingProgress=null;startedRound=0;enter(current);}
    runner.rivals(current.startAt?current.racers.map(s=>({...s,difficulty:current.diff,crowned:wearsCrown(s,current)})):[],seat);
    // Use the server time at the midpoint of the request, including clients with skewed clocks.
    offset=reply.now-(sent+Date.now())/2;
    draw();tick();
  }
  function schedule(){
    clearTimeout(poll);if(current)poll=setTimeout(refresh,current.startAt?2200:2000);
  }
  async function refresh(){
    const stamp=generation,sent=Date.now(),r=current;
    clearTimeout(poll);if(!r)return;
    const pulse=sent-lastPulse>22000;
    try{
      const reply=await call(pulse?"pulse":"read",pulse?{code:r.code,crowned:crowned()}:{code:r.code},pulse);
      if(stamp!==generation)return;
      if(pulse)lastPulse=sent;apply(reply,sent);
      if(pendingProgress&&!writing)flushProgress();
    }catch(error){if(stamp===generation)el("room-status").textContent=error.message.includes("expired")?error.message:"Reconnecting to the room…";}
    finally{if(stamp===generation)schedule();}
  }
  // Give gear changes their own ordered writes so the last selection reaches the room.
  let gearWrites=Promise.resolve();
  function appearance() {
    if(!current)return;
    drawSeats(current);
    const stamp=generation;
    gearWrites=gearWrites.then(async()=>{
      if(!current||generation!==stamp)return;
      const sent=Date.now();
      const reply=await call("pulse",{code:current.code,crowned:crowned()});
      if(generation===stamp)apply(reply,sent);
    }).catch(()=>{if(generation===stamp)lastPulse=0;});
  }
  function showHub(code="",champ=null){
    inviteCrown=null;
    const fields=typeof champ==="string"?champ.split("."):[];
    const [round,number,avatar]=fields;
    if(fields.length===3 && /^[1-9]\d{0,5}$/.test(round) && /^(?:[1-9]|1[0-2])$/.test(number) && runner.characters.some(c=>c.id===avatar))
      inviteCrown={code,round:Number(round),seat:Number(number),character:avatar};
    el("join-code").value=code;el("hub-status").textContent="";
    if(!hub.open)hub.showModal();
    (code?el("join-code"):el("host-room")).focus();
  }
  async function connect(host){
    if(actionPending)return;
    const code=host?newCode():el("join-code").value.trim().toUpperCase();
    if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code)){el("hub-status").textContent="Enter the six-character room code.";return;}
    const stamp=++generation;actionPending=true;el("host-room").disabled=true;
    el("hub-status").textContent=host?"Creating room…":"Joining room…";
    try {
      let roomSettings;
      if(!host && resumeCode===code){try{member=sessionStorage.getItem("critical-race-member")||member;}catch{}}
      resumeCode="";
      if(host){roomSettings=setup();}
      else {
        const found=await call("read",{code},false);
        if(found.room.edition!==edition)throw Error("This room uses a different question bank. Ask for a fresh room.");
        if(!allowed(found.room))throw Error("Clear a Hard run to enter this room.");
        roomSettings={};
      }
      const sent=Date.now(),reply=await call(host?"create":"join",{...roomSettings,code,edition,character:character(),crowned:crowned()});
      if(stamp!==generation){await call("leave",{code});return;}
      seat=reply.seat;
      try{sessionStorage.setItem("critical-race-code",code);sessionStorage.setItem("critical-race-member",member);}catch{}
      // Reopening an active race shows its standings. A reload cannot restart its clock.
      startedRound=reply.room.startAt?reply.room.round:0;
      if(reply.room.startAt && reply.room.racers.find(s=>s.seat===seat)?.status==="playing"){
        await call("leave",{code});throw Error("Your run ended when the page reloaded. Join again when the host opens a rematch.");
      }
      lastPulse=sent;current=reply.room;actionPending=false;
      hub.close();el("room-panel").hidden=false;el("invite-link").hidden=true;
      history.replaceState(null,"",location.pathname+location.search+"#room="+current.code);
      enter(current);apply(reply,sent);schedule();
    }catch(error){if(stamp===generation)el("hub-status").textContent=error.message;}
    finally{if(stamp===generation){actionPending=false;el("host-room").disabled=false;}}
  }
  async function change(action,fields={}){
    if(!current||actionPending)return;
    const stamp=generation,sent=Date.now();
    actionPending=true;draw();
    try{
      const reply=await call(action,{code:current.code,round:current.round,...fields});
      if(stamp===generation){actionPending=false;apply(reply,sent);}
    }catch(error){if(stamp===generation){actionPending=false;draw();el("room-status").textContent=error.message;}}
  }
  async function flushProgress(){
    if(writing)return;
    writing=true;
    try{
      while(pendingProgress && current){
        const packet=pendingProgress,stamp=generation,sent=Date.now();pendingProgress=null;
        try{const reply=await call("progress",packet);if(stamp===generation)apply(reply,sent);}
        catch{if(stamp===generation){pendingProgress=pendingProgress||packet;el("room-status").textContent="Race update delayed. Reconnecting…";}break;}
      }
    }finally{writing=false;}
  }
  function progress(packet){
    if(!current || current.round!==startedRound)return;
    pendingProgress={...packet,code:current.code,round:current.round};flushProgress();
  }
  function leave(){
    inviteCrown=null;
    const r=current;generation++;actionPending=false;pendingProgress=null;current=null;seat=0;startedRound=0;
    clearTimeout(countdown);clearTimeout(poll);runner.rivals([],0);el("room-countdown").hidden=true;el("room-panel").hidden=true;
    if(r){
      try{sessionStorage.removeItem("critical-race-code");sessionStorage.removeItem("critical-race-member");}catch{}
      call("leave",{code:r.code}).catch(()=>{});
    }
  }
  el("invite").onclick=()=>showHub();
  el("hub-close").onclick=()=>hub.close();
  hub.addEventListener("close",()=>{if(!current){generation++;actionPending=false;el("host-room").disabled=false;}});
  el("host-room").onclick=()=>connect(true);
  el("join-form").onsubmit=e=>{e.preventDefault();connect(false);};
  el("room-ready").onclick=()=>{
    const me=current?.racers.find(s=>s.seat===seat);if(me)change("ready",{ready:!me.ready});
  };
  el("room-launch").onclick=()=>change(current?.startAt?"rematch":"launch");
  el("room-copy").onclick=async()=>{
    if(!current)return;
    const url=new URL(location.href), invite=new URLSearchParams({room:current.code});
    if(crowned())invite.set("champ",[current.round,seat,character()].join("."));
    url.search="";url.hash=invite.toString();
    try{await navigator.clipboard.writeText(url.href);el("room-status").textContent="Invite link copied.";}
    catch{const box=el("invite-link");box.hidden=false;box.value=url.href;box.focus();box.select();}
  };
  el("leave-room").onclick=depart;
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&current){tick();refresh();}});
  return {leave,progress,appearance,showHub,focus:()=>{el("room-panel").scrollIntoView?.({block:"center"});(el("room-ready").hidden?el("room-copy"):el("room-ready")).focus();}};
};
