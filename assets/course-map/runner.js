(() => {
  "use strict";
  const scene = document.getElementById("rails");
  if (!scene) return;
  const width = 600, floor = 156, stride = 288, startX = 91;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const letters = "ABCD";
  let cleared = 0, total = 0, camera = 0, active = null, frameId = 0;
  let blocked = [], aiming = -1;
  let difficulty = "medium";
  scene.classList.add("runner-scene");
  scene.setAttribute("viewBox", "0 0 600 210");
  scene.innerHTML = `
    <defs>
      <pattern id="run-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path class="runner-grid" d="M0 16V0h16"/></pattern>
      <pattern id="run-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="m-2 3 5-5M0 8l8-8m-3 11 6-6" stroke="#34534b" opacity=".32" fill="none" stroke-width="1"/></pattern>
      <pattern id="run-checks" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#f7f1d9"/><path d="M0 0h4v4H0zm4 4h4v4H4z" fill="#283f43"/></pattern>
      <pattern id="run-sunset" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 4.5h5" stroke="#f8e5bb" stroke-width="1.2"/></pattern>
      <g id="run-cloud" fill="var(--r-paper)" stroke="var(--r-ink)" stroke-width="1.05"><path d="M-4 1C-3-5 3-7 8-5c0-8 13-12 18-4 5-2 9 1 10 5 6-2 10 1 11 5z"/><path d="M7 4h18m6 0h6" fill="none"/></g>
      <g id="run-star"><path class="runner-spark" d="m0-8 2.5 5.2 5.9.8-4.3 4.3.9 6L0 5.5-5.4 8.3l1-6L-8.6-2l6.1-.8z" fill="#f8cd68"/><path d="m-2.4-1 .9-2" fill="none" stroke="#fff8da" stroke-width="1.6"/></g>
      <g id="run-birds" fill="none" stroke="#50665c" stroke-width="1.3"><path d="M0 3q4-3 8 2 2-5 7-5m10 6q3-2 6 1 2-3 5-3"/></g>
      <linearGradient id="lava-sky" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#24182c"/><stop offset=".62" stop-color="#7e3542"/><stop offset="1" stop-color="#e9834e"/></linearGradient>
      <g id="run-crater">
        <path d="M0 166 58 121 102 113 165 44 180 50 196 43 257 109 284 122 343 166Z" fill="#502a3b"/>
        <path d="m165 44 15 6 16-7 12 13-16-6-3 16-10 11-2 15-7 12 3-25 10-15-1-9-13-5z" fill="#ffad55"/>
        <path d="m154 62-25 40-16 11m94-44 22 36 15 8" fill="none" stroke="#9b4a4a" stroke-width="2"/>
        <g fill="#ffd27b"><path d="m170 32-3-6 5 4zm14 2 3-9 1 6zm10-6 5-6-2 7z"/><circle cx="176" cy="18" r="1.6"/></g>
      </g>
      <g id="run-flame"><path d="M-9 0c-8-12 3-13 0-23 6 4 6 9 6 12 4-5 6-12 4-18 15 13 1 16 10 18 4-2 4-6 4-7 4 9 3 15-3 18z" fill="#f06537"/><path d="M-3 0q-5-7 1-13 0 5 3 6l4-8q4 10 1 15z" fill="#ffce75"/></g>
    </defs>
    <rect width="600" height="210" fill="var(--r-paper)"/>
    <rect width="600" height="210" fill="url(#run-grid)"/>
    <g id="run-far"></g><g id="run-near"></g>
    <path d="M0 196q108-3 215 0t191 0 194-1v15H0z" fill="var(--r-wash)"/>
    <g id="run-world"></g>
    <ellipse id="run-shadow" cx="91" cy="158" rx="14" ry="2.5" fill="#283e39" opacity=".22"/>
    <g id="run-hero">
      <g id="run-lean">
        <g transform="translate(0,-17)">
          <g id="run-leg-back"><path class="runner-appendage runner-distant-leg" d="M0 0l-6 9 -2 8"/><path class="runner-shoe" d="m-8 17 5 0"/></g>
          <g id="run-leg-front"><path class="runner-appendage" d="M0 0l4 8 3 9"/><path class="runner-shoe" d="m7 17 6-1"/></g>
        </g>
        <path class="runner-appendage" d="M0-17q-2-9 2-20"/>
        <path d="M-1-33q-11-6-13 2l-1 6 12 3z" fill="#d79e4f" stroke="var(--r-ink)" stroke-width="2"/>
        <path d="m-12-31 7 2m-10.5 4 11 2" stroke="#785d3f" stroke-width="1.2"/>
        <g id="run-arm-back" transform="translate(-1,-32)"><path class="runner-appendage runner-distant-leg" d="m0 0-6 7-5-3"/></g>
        <g id="run-arm-front" transform="translate(1,-32)"><path class="runner-appendage" d="m0 0 7 7 5-5"/></g>
        <path id="run-scarf" d="m2-36-8 2-11-3-6 3 6-7 9 1z" fill="var(--r-scarf)" stroke="var(--r-ink)" stroke-width="1.3"/>
        <g id="run-head">
          <path d="M-7-43q-3-11 7-14 10-2 15 7 3 9-7 13-9 3-15-6z" fill="#fff1cd" stroke="var(--r-ink)" stroke-width="2.8"/>
          <path d="m-1-57-3-5 6 3 3-3 2 4" fill="none" stroke="var(--r-ink)" stroke-width="1.9"/>
          <path d="m5-50 .3 1.3m6-1.7 .2 1.3" stroke="var(--r-ink)" stroke-width="2"/>
          <path id="run-mouth" d="M5-44q3 2 6-.5" stroke="var(--r-ink)" stroke-width="1.4" fill="none"/>
          <g class="chicken-hat" stroke="#51382f" stroke-width="1.4">
            <path d="M-3-64q-5-6-2-8 3-1 5 4 0-8 4-7 3 1 2 7 5-5 7-2 1 3-6 7" fill="#e65a49"/>
            <path d="M-11-51q-1-15 10-16 13-3 18 11l-4 3q-9-3-16 0l-4 6-3-1z" fill="#fff6d7"/>
            <path d="m13-59 11 4-11 2z" fill="#f5ae42"/>
            <circle cx="10" cy="-61" r="1.35" fill="#332d2c" stroke="none"/>
          </g>
        </g>
      </g>
    </g>
    <g id="run-fx" pointer-events="none"></g>
    <g id="run-choice" data-runner-hidden=""><path class="runner-thought" d="M0-8q0-4 4-4h12q5 0 5 5v8q0 4-5 4H7l-5 4 1-5q-3 0-3-4z"/><text class="runner-digit" x="10" y="2"></text></g>
  `;
  const get = id => scene.querySelector("#run-" + id);
  const far = get("far"), near = get("near"), world = get("world"), fx = get("fx");
  const hero = get("hero"), lean = get("lean"), shadow = get("shadow");
  const legBack = get("leg-back"), legFront = get("leg-front");
  const armBack = get("arm-back"), armFront = get("arm-front");
  const scarf = get("scarf"), head = get("head"), mouth = get("mouth");
  const choice = get("choice");
  const set = (el, attr, value) => el.setAttribute(attr, value);
  const transform = (el, val) => set(el, "transform", val);
  const hide = (el, hidden) => el.toggleAttribute("data-runner-hidden", hidden);
  const clamp = t => Math.max(0, Math.min(1, t));

  function backdrop() {
    // Two repeat distances give the skyline a slower drift than the graph-paper hills.
    let horizon = "", hills = "";
    for (let i = -1; i <= 2; i++) {
      if (difficulty === "hard") {
        horizon += `<g transform="translate(${i*600})"><rect width="601" height="210" fill="url(#lava-sky)"/><circle cx="486" cy="48" r="25" fill="#ffac6a"/><use href="#run-crater" transform="translate(-38 3)"/><use href="#run-crater" transform="translate(270 18) scale(.95)"/></g>`;
        hills += `<g transform="translate(${i*510})"><path d="m0 141 48-23 13-27 15 19 8-8 24 27 47-6 32-22 12-31 8 24 19 4 5 19 39 18 40-6 29-21 21 9 54-23 20 26 66 21v58H0z" fill="#3b2735"/><path d="m73 126 24 13 43 1m60-36 3 14 13 4m118 17 21-11" fill="none" stroke="#8d4d4d" stroke-width="1.7"/></g>`;
        continue;
      }
      horizon += `<g transform="translate(${i*600})">
        <g transform="translate(450 46)"><circle r="29" fill="var(--r-sun)" stroke="#af8759" stroke-width="1"/><circle r="29" fill="url(#run-sunset)"/></g>
        <use href="#run-cloud" transform="translate(78 34) scale(.83)"/><use href="#run-cloud" transform="translate(491 66) scale(.7)"/>
        <use href="#run-birds" transform="translate(270 35)"/>
        <path d="M0 128Q46 86 74 88q41-1 76 33 43-35 61-30 31 5 53 18 37-71 69-67 18 1 42 32 26-41 49-34 23 5 53 48 45-27 74-8 29 15 49 48v63H0z" fill="var(--r-wash)" stroke="#829e90" stroke-width="1.3"/>
        <path class="runner-contour" d="m294 81 39-39-8 22 11-6 12 13m54-18 21-13 16 11-9-2 6 10"/>
      </g>`;
      hills += `<g transform="translate(${i*510})">
        <path d="M0 141c45-19 67-63 102-66 44-1 68 67 121 66s69-39 116-40 93 52 171 40v52H0z" fill="var(--r-hill)" stroke="#668779" stroke-width="1.5"/>
        <path class="runner-contour" d="M26 132q55-51 69-52m19 2q19 13 32 36m-25-33 28 34m-22-31 24 28m169-7q18-9 36-6m15 6 21 11"/>
      </g>`;
    }
    far.innerHTML = horizon;
    near.innerHTML = hills;
  }

  // Each gap has its own math doodle in the landscape.
  function obstacle(i) {
    const sign = '<g transform="translate(164 148) rotate(-7)"><path class="runner-pole" d="M0 7v-22"/><path d="M-10-29h20v15H-9z" fill="var(--r-paper)" stroke="var(--r-ink)" stroke-width="1.4"/>';
    switch (i % 4) {
      case 0: return sign + '<path d="m-6-19 4-6 4 5 4-2" class="runner-pencil"/></g><g transform="translate(208 179) rotate(-18)"><path d="M-12 0h32v8h-32z" fill="#edc275" stroke="var(--r-ink)" stroke-width="1.4"/><path d="M-8 0v4m5-4v2m5-2v4m5-4v2m5-2v4m5-4v2" class="runner-pencil"/></g>';
      case 1: return sign + '<text x="-5" y="-17" class="runner-symbol">f′</text></g><g transform="translate(213 182) rotate(-27)"><path d="M-3 9v-28l3-8 3 8V9z" fill="#ebbd65" stroke="var(--r-ink)" stroke-width="1.3"/><path d="M-3-19h6m-3-7v4" class="runner-pencil"/></g><path d="M224 147v40" class="runner-contour" stroke-dasharray="3 4"/>';
      case 2: return sign + '<path d="m-7-20 3 2 3-7h7" class="runner-pencil"/></g><g transform="translate(214 183) rotate(9)"><path d="M-16 0a16 16 0 1 1 32 0z M-9-1a9 9 0 0 1 18 0z" fill="#ccb9a3" fill-rule="evenodd" stroke="var(--r-ink)" stroke-width="1.3"/><path d="M0-15v4m-7-9 1.5 3.5m13-3.5L6-17m-18 8 3 2m20-3-3 2" class="runner-contour"/></g>';
      default: return sign + '<text x="-6" y="-17" class="runner-symbol">Δ</text></g><g transform="translate(215 180) rotate(-10)"><path d="M-16 5l6-13h24l-6 13z" fill="#e29283" stroke="var(--r-ink)" stroke-width="1.3"/><path d="m8 5 6-13 5 3-6 13-5-3" fill="#b76a5b" stroke="var(--r-ink)" stroke-width="1.2"/></g>';
    }
  }
  function flag(x, finish) {
    return `<g transform="translate(${x} 155)"><path class="runner-pole" d="m0 0 1-48"/>
      <path d="M1-48c10-4 16 6 31 0l-2 16c-12 6-18-5-30-1z" fill="${finish ? 'url(#run-checks)' : 'var(--r-scarf)'}" stroke="var(--r-ink)" stroke-width="1.6"/>
      ${finish ? '' : '<path d="m8-40 3 2 5-4" class="runner-pencil"/>'}</g>`;
  }
  function setTerrain() {
    let tiles = "";
    for (let i = cleared-1; i <= cleared+3; i++) {
      const solid = total > 0 && i >= total;
      const left = -41, right = solid ? stride-40 : 182;
      const terrain = `M${left} ${floor}H${right}l-3 11 3 9-6 10-2 12Q${right-21} 189 ${right-41} 194T${right-98} 195 ${left+68} 193 ${left+6} 197l-4-15-3-9 2-10z`;
      tiles += `<g transform="translate(${i*stride})"><path d="${terrain}" class="runner-ground"/>
        <path d="m${left+1} 161q57 2 111 0t${right-left-112} 0" class="runner-pencil"/>
        <path d="M${left+5} 172h${right-left-12}l-4 13q-38-8-72-1t-65 0-61 3z" fill="url(#run-hatch)" opacity=".85"/>
        <path d="m-26 184 9 2 11-3m83-12 10 1 5-2m48 16 7-3" class="runner-contour"/>
        <path d="m52 156 2-3 3 3m64 0 2-4 2 3 2-2 1 3" class="runner-pencil"/>
        ${difficulty === "hard" && !solid ? '<path d="M180 190q12-7 30-2t39-1v23h-69z" fill="#ffa346"/><path d="M184 192q10-5 24-2t30 0" fill="none" stroke="#ffe49a" stroke-width="2"/><use href="#run-flame" transform="translate(218 190) scale(.68)"/>' : ''}
        ${i>=0 && !solid ? obstacle(i) : ''}
        ${i>=0 && !solid ? '<g data-star-at="'+i+'" transform="translate(216 74)"><use href="#run-star"/></g>' : ''}
        ${i>=0 && (i===0 || (i>0 && i%3===0 && !solid) || i===total) ? flag(i===total && total>0 ? 109 : 36,i===total && total>0) : ''}
        ${i===total && total>0 ? '<path d="M109 108q45 18 94-4" fill="none" class="runner-pole"/><path d="m120 112 9 2-5 9z" fill="var(--r-scarf)"/><path d="m139 115 10 0-5 10z" fill="var(--r-sun)"/><path d="m159 114 10-1-4 11z" fill="var(--r-hill)"/><path d="m180 110 9-2-2 11z" fill="var(--r-scarf)"/><path d="M204 104v51" class="runner-pole"/>' : ''}
      </g>`;
    }
    world.innerHTML = tiles;
  }
  function cameraAt(distance) {
    camera = distance;
    transform(world, 'translate(' + -distance + ')');
    transform(near, 'translate(' + -(distance*.33 % 510) + ')');
    transform(far, 'translate(' + -(distance*.14 % 600) + ')');
  }
  function pose(x, y, options = {}) {
    const {swing=0, lift=0, angle=0, jump=0, cheer=false, wipeout=false} = options;
    transform(hero, `translate(${x} ${y})`);
    transform(lean, `rotate(${angle} 0 -23)`);
    transform(legBack,'rotate(' + (swing*37 - jump*45) + ')');
    transform(legFront,'rotate(' + (-swing*40 + jump*58) + ')');
    transform(armBack,'translate(-1,-32) rotate(' + (-swing*41 + jump*58 + (cheer?105:0)) + ')');
    transform(armFront,'translate(1,-32) rotate(' + (swing*42 - jump*90 - (cheer?91:0)) + ')');
    transform(head,'rotate(' + (wipeout?17:jump*-12-swing*3) + ' 2 -39)');
    set(scarf,'d',`m2-36-8 2-11 ${-3-lift*5+swing*1.5}-6 3 6-7 9 1z`);
    set(mouth,'d',wipeout ? 'M5-42q3-2 6-.8' : jump ? 'M6-43q3 3 4-1z' : 'M5-44q3 2 6-.5');
    set(shadow,"cx",x); set(shadow,"rx",14-lift*6); set(shadow,"opacity",wipeout?0:.22-lift*.13);
    transform(choice,`translate(${x+18} ${y-62})`);
  }
  function aim(index) {
    aiming = index;
    const show = index>=0 && index<letters.length && !blocked.includes(index) && !active;
    hide(choice,!show);
    if (show) choice.querySelector("text").textContent = letters[index];
  }
  function close(indices) {
    blocked = [...indices];
    aim(aiming);
  }
  function stage(done, length) {
    if (frameId) cancelAnimationFrame(frameId);
    active=null; frameId=0; cleared=Math.max(0,Math.trunc(done||0)); total=Math.max(0,Math.trunc(length||0));
    blocked=[]; aim(-1);
    set(scene,"data-chapter",total?Math.min(2,Math.floor(cleared/total*3)):0);
    const character = difficulty === "easy" ? "Runner in a chicken hat" : difficulty === "hard" ? "Runner on a volcanic course" : "Stick figure on the course";
    set(scene,"aria-label",total ? `${character}, ${cleared} of ${total} hurdles cleared.` : "A stick figure waits at the starting flag.");
    setTerrain(); cameraAt(cleared*stride); fx.replaceChildren(); pose(startX,floor);
  }
  function spark(x,y,radius,fade) {
    let dots='';
    for(let i=0;i<6;i++) {
      const angle=i*Math.PI/3+.3;
      const px=Math.cos(angle),py=Math.sin(angle);
      dots += `<path d="M${x+px*radius} ${y+py*radius}l${px*4} ${py*4}" stroke="${i%2?'#fff4c8':'#98672c'}" stroke-width="2.5"/>`;
    }
    fx.innerHTML='<g opacity="'+fade+'">'+dots+'</g>';
  }
  function finishBurst(x, t) {
    const confetti = [];
    for (let i=0; i<19; i++) {
      const a = Math.PI*(.05 + (i%9)/10);
      const speed = 36+(i*23)%70;
      const px=x+Math.cos(a)*speed*t, py=97-Math.sin(a)*speed*t+31*t*t;
      const color=["var(--r-scarf)","#f4ba4e","#689e88"][i%3];
      confetti.push(`<path d="M-1-2l2 4" transform="translate(${px} ${py}) rotate(${i*37+t*119})" stroke="${color}" stroke-width="3"/>`);
    }
    fx.innerHTML=confetti.join("");
  }
  function drawFrame(t) {
    const {hit,star}=active, smooth=t*t*(3-2*t);
    const distance=hit ? stride*smooth : 127*clamp(smooth*1.35);
    const worldX=startX+cleared*stride+distance;
    const scroll=hit ? stride*smooth - 37*Math.sin(Math.PI*t) : 62*smooth;
    cameraAt(cleared*stride+scroll);
    const x = worldX-camera;
    // Take off before the torn edge and land on the next piece of graph paper.
    const airborne=clamp((distance-58)/148);
    const height = hit ? Math.sin(Math.PI*airborne) : Math.sin(Math.PI*clamp((t-.17)/.52));
    const tumble = hit ? 0 : clamp((t-.51)/.40);
    const pace = Math.sin(distance/stride*Math.PI*14)*(1-height);
    const y = floor-(hit?67:35)*height+Math.abs(pace)*-2 + tumble*26;
    pose(x,y,{swing:pace,lift:height,jump:height,angle:hit ? 9*height :
      7*height+tumble*111,cheer:hit && t===1,wipeout:!hit && tumble>.4});
    if (hit && distance>120) {
      if (star) hide(star,true);
      const pop=clamp((distance-120)/51);
      if (pop<1) spark(216+cleared*stride-camera,74,5+pop*17,1-pop);
      else if (total>0 && cleared+1===total && t>.80) finishBurst(x+15,(t-.80)/.20);
      else fx.replaceChildren();
    } else if (!hit && tumble>.6) {
      const puff=clamp((t-.72)/.28);
      spark(x+20,166,4+10*puff,.95-.35*puff);
    }
  }
  function settle() {
    if (!active) return;
    if (frameId) cancelAnimationFrame(frameId);
    drawFrame(1);
    const {hit,finish}=active;
    active=null; frameId=0;
    set(scene,"aria-label",hit ? `Hurdle cleared. ${cleared+1} of ${total} complete.` : difficulty === "hard" ? "The runner misses the volcanic ledge." : "The runner tumbles into the paper gap.");
    finish();
  }
  function travel(index, hit, finish) {
    if (active) return;
    aim(-1);
    active={hit,finish,star:world.querySelector('[data-star-at="'+cleared+'"]')};
    const started=performance.now(), duration=hit ? 1030 : 900;
    function tick(now) {
      if (!active) return;
      const t=clamp((now-started)/duration);
      if (t>=1 || reducedMotion.matches || document.hidden) settle();
      else { drawFrame(t); frameId=requestAnimationFrame(tick); }
    }
    tick(started);
  }
  document.addEventListener("visibilitychange",() => { if (document.hidden) settle(); });
  backdrop();
  function setDifficulty(value) {
    if (value === difficulty) return;
    difficulty = value;
    set(scene,"data-difficulty",value);
    backdrop();stage(cleared,total);
  }
  window.junctionRunner = {reset:length=>stage(0,length),stage,travel,aim,close,difficulty:setDifficulty};
  stage(0,0);
})();
