(() => {
  "use strict";
  const scene = document.getElementById("rails");
  if (!scene) return;
  const floor = 156, stride = 288, startX = 91;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const letters = "ABCD";
  let cleared = 0, total = 0, camera = 0, active = null, frameId = 0;
  let blocked = [], aiming = -1;
  let difficulty = "medium";
  let celebrating = false;
  let compact = false;
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
      <linearGradient id="ash-sky" x2="0" y2="1"><stop stop-color="#241327"/><stop offset=".48" stop-color="#80283c"/><stop offset="1" stop-color="#f67338"/></linearGradient>
      <radialGradient id="sun-fire" cx=".4" cy=".38" r=".7"><stop stop-color="#ffe99b"/><stop offset=".66" stop-color="#ffae4f"/><stop offset="1" stop-color="#ed5836"/></radialGradient>
      <g id="eruption-jet">
        <path d="M-14 1q4-13-7-23 11 4 15 12-2-19-8-31 11 7 15 23 2-18 12-33-3 16-4 31 6-8 17-14-10 14-12 32z" fill="#f86636"/>
        <path d="M-7 1q1-8-4-17 7 4 10 11l3-20 2 19 8-8-5 15z" fill="#ffd275"/>
      </g>
      <g id="eruption-cinders" fill="#ffc178"><path d="m-20-26-4-6 5 4zm31-10 4-8 1 6zm14 8 5-4-2 5zm-32-17-3-6 4 3z"/><circle cx="5" cy="-43" r="1.4"/></g>
      <g id="run-crater">
        <path d="M0 166 58 121 102 113 165 44 180 50 196 43 257 109 284 122 343 166Z" fill="#502a3b"/>
        <path d="m165 44 15 6 16-7 12 13-16-6-3 16-10 11-2 15-7 12 3-25 10-15-1-9-13-5z" fill="#ffad55"/>
        <path d="m154 62-25 40-16 11m94-44 22 36 15 8" fill="none" stroke="#9b4a4a" stroke-width="2"/>
        <g fill="#ffd27b"><path d="m170 32-3-6 5 4zm14 2 3-9 1 6zm10-6 5-6-2 7z"/><circle cx="176" cy="18" r="1.6"/></g>
      </g>
      <g id="run-flame"><path d="M-9 0c-8-12 3-13 0-23 6 4 6 9 6 12 4-5 6-12 4-18 15 13 1 16 10 18 4-2 4-6 4-7 4 9 3 15-3 18z" fill="#f06537"/><path d="M-3 0q-5-7 1-13 0 5 3 6l4-8q4 10 1 15z" fill="#ffce75"/></g>
      <g id="run-feather"><path d="M-9 6q1-14 15-14 1 10-9 14z" fill="#fff4cf" stroke="#8e7454" stroke-width="1.3"/><path d="m-11 9 14-14" fill="none" stroke="#8e7454"/></g>
      <g id="run-chicken"><g stroke="#51382f" stroke-width="1.4">
        <path d="M-3-64q-5-6-2-8 3-1 5 4 0-8 4-7 3 1 2 7 5-5 7-2 1 3-6 7" fill="#e65a49"/>
        <path d="M-11-51q-1-15 10-16 13-3 18 11l-4 3q-9-3-16 0l-4 6-3-1z" fill="#fff6d7"/>
        <path d="m13-59 11 4-11 2z" fill="#f5ae42"/><circle cx="10" cy="-61" r="1.35" fill="#332d2c" stroke="none"/>
      </g></g>
      <g id="run-leaf"><path d="m-8-7 14-2 4 12-13 4z" fill="#fff3d2" stroke="#776d5d" stroke-width="1.2"/><path d="m-4-3 7-1m-6 5 8-1" stroke="#71978b" stroke-width="1.3"/></g>
      <g id="run-plane"><path d="m-13 2 25-9-10 17-2-8-7 4z" fill="#fff0c6" stroke="#8c7861" stroke-width="1.4"/><path d="m0 2 12-9" stroke="#8c7861"/></g>
      <g id="run-meteor"><path d="M-5-2C7-8 12-23 42-34c-9 7-8 13-15 18 13-2 18-8 26-8C37-12 25-2 6 6z" fill="#fc7145"/><path d="M-2-1q11-13 29-22-10 12-13 13 7-1 12-3Q15 0 4 5z" fill="#ffcf6c"/><path d="m-7-5 7-4 7 3 2 7-5 6-8-1-5-5z" fill="#552c3c" stroke="#ffb75b" stroke-width="2"/><path d="m-3-4 3 3 4-1m-4 1-2 5" fill="none" stroke="#d8754c"/></g>
      <g id="run-smoke" fill="#564153" stroke="#322934" stroke-width="1.8"><path d="M-28 1q-6-10 5-14-2-13 12-13 3-9 12-6 11-5 16 7 14 0 12 12 9 8-1 15z"/><path d="M-15-10q2-7 10-6m9-7q8-2 10 7" fill="none" stroke="#9a7776"/></g>
      <g id="run-star-rays" fill="none" stroke-width="2.4"><path d="M9 1l4 1m-9 6 2 4m-12-4-2 4m-3-12-4-1m9-8-2-4m12 4 2-4" stroke="#865319"/><path d="M9-5l4-2m-12 16 1 4m-12-12-4-1m10-10-1-4" stroke="#ffdb7e"/></g>
      <g id="run-sky-trails" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".58"><path d="M-17 0q8-4 18 0t21 0m-29 5h12"/></g>
    </defs>
    <rect width="600" height="210" fill="var(--r-paper)"/>
    <rect width="600" height="210" fill="url(#run-grid)"/>
    <rect class="runner-eclipse" width="600" height="210" fill="url(#ash-sky)"/>
    <g id="run-far"></g><g id="run-weather" aria-hidden="true"></g>
    <g class="runner-eclipse">
      <g id="run-sun" transform="translate(494 53)">
        <path d="m0-42 5 10 9-7 1 10 12-4-2 10 12-1-6 8 11 6-12 3 7 10-12-1 2 11-10-5-2 11-8-8-7 11-5-12-10 6 1-11-12 2 5-9-11-4 10-6-10-7 12-2-4-11 10 4 2-11 8 8z" fill="#fc7744"/>
        <circle r="31" fill="url(#sun-fire)" stroke="#601f34" stroke-width="2"/>
        <g class="eclipse-eyes" fill="#391c31">
          <path d="M-23-12q11 1 21 10-10 5-18-1zM23-12Q12-11 2-2q10 5 18-1z"/>
          <path d="m-12-5 4 2-3 1zm24 0-4 2 3 1z" fill="#fff4bc"/>
        </g>
        <path d="m-1-3-3 9 6-1" fill="none" stroke="#ad4b3d" stroke-width="2"/>
        <path d="M-19 7q17 11 38-1-5 19-18 18T-19 7z" fill="#451b2c"/>
        <path d="m-13 11 6 2-1 6zm20 2 7-3-5 9zm-7 9 3-4 2 5z" fill="#fff0b8"/>
      </g>
    </g>
    <g id="run-near"></g>
    <path d="M0 196q108-3 215 0t191 0 194-1v15H0z" fill="var(--r-wash)"/>
    <g id="run-world"></g>
    <g id="run-incident" pointer-events="none"></g>
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
          <path id="run-eyes" d="m5-50 .3 1.3m6-1.7 .2 1.3" fill="none" stroke="var(--r-ink)" stroke-width="2"/>
          <path id="run-mouth" d="M5-44q3 2 6-.5" stroke="var(--r-ink)" stroke-width="1.4" fill="none"/>
          <g class="chicken-hat"><use href="#run-chicken"/></g>
          <path class="runner-soot" d="m-5-45 4 2m0 2 2 1m10-3 2-1" fill="none" stroke="#82625e" stroke-width="2.5"/>
        </g>
      </g>
    </g>
    <g id="run-fx" pointer-events="none"></g>
    <g id="run-choice" data-runner-hidden=""><path class="runner-thought" d="M0-8q0-4 4-4h12q5 0 5 5v8q0 4-5 4H7l-5 4 1-5q-3 0-3-4z"/><text class="runner-digit" x="10" y="2"></text></g>
  `;
  const get = id => scene.querySelector("#run-" + id);
  const far = get("far"), near = get("near"), world = get("world"), fx = get("fx");
  const incident = get("incident"), weather = get("weather"), sun = get("sun");
  const hero = get("hero"), lean = get("lean"), shadow = get("shadow");
  const legBack = get("leg-back"), legFront = get("leg-front");
  const armBack = get("arm-back"), armFront = get("arm-front");
  const scarf = get("scarf"), head = get("head"), mouth = get("mouth");
  const eyes = get("eyes");
  const choice = get("choice");
  const set = (el, attr, value) => el.setAttribute(attr, value);
  const transform = (el, val) => set(el, "transform", val);
  const hide = (el, hidden) => el.toggleAttribute("data-runner-hidden", hidden);
  const clamp = t => Math.max(0, Math.min(1, t));
  const ease = t => t*t*(3-2*t);

  function fitScene(size) {
    const nextCompact = size > 0 && size < 530;
    if (nextCompact === compact) return;
    compact = nextCompact;
    set(scene,"viewBox",compact ? "0 0 408 210" : "0 0 600 210");
    set(scene,"data-frame",compact ? "close" : "wide");
    transform(sun,`translate(${compact ? 342 : 494} 53)`);
  }
  fitScene(scene.clientWidth);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(([entry])=>fitScene(entry.contentRect.width)).observe(scene);
  }
  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(([entry])=>set(scene,"data-offscreen",entry.isIntersecting ? "no" : "yes")).observe(scene);
  }

  let weatherKey = "";
  function courseWeather() {
    const progress = total > 1 ? cleared/(total-1) : 0;
    const intensity = progress >= .82 ? 3 : progress >= .52 ? 2 : progress >= .26 ? 1 : 0;
    set(scene,"data-intensity",intensity);
    const key = difficulty + intensity;
    if (key === weatherKey) return;
    weatherKey = key;
    const volcanic = difficulty === "hard" || difficulty === "insane";
    const objects = [];
    const count = (difficulty === "insane" ? 4 : 2) + 2*intensity;
    for (let i=0; i<count; i++) {
      const x = 65+i*113%530, y = 21+i*37%80;
      let symbol, drift, scale;
      if (volcanic) {
        const meteor = i%3===1 && intensity>0;
        symbol = meteor ? "run-meteor" : "eruption-cinders";
        drift = meteor ? "sky-meteor" : "sky-embers";
        scale = .62;
      } else {
        symbol = "run-sky-trails";
        if (i>=2) symbol = i%3===2 ? "run-plane" : "run-leaf";
        drift = "sky-wind";
        scale = .8;
      }
      objects.push(`<g transform="translate(${x} ${y})"><g class="${drift}" style="--drift-delay:-${(i*31)%97/10}s"><use href="#${symbol}" transform="scale(${scale})"/></g></g>`);
    }
    weather.innerHTML = objects.join("");
  }

  function backdrop() {
    // Two repeat distances give the skyline a slower drift than the graph-paper hills.
    let horizon = "", hills = "";
    for (let i = -1; i <= 2; i++) {
      if (difficulty === "hard" || difficulty === "insane") {
        const sky = difficulty === "hard" ? '<rect width="601" height="210" fill="url(#lava-sky)"/><circle cx="486" cy="48" r="25" fill="#ffac6a"/>' : "";
        const cones = ["translate(-38 3)", "translate(270 18) scale(.95)"].map((place,j) => {
          const eruption = difficulty === "insane" ? `<g transform="translate(180 47)" class="crater-vent vent-${j}"><use class="lava-jet" href="#eruption-jet"/><use class="lava-cinders" href="#eruption-cinders"/></g>` : "";
          return `<g transform="${place}">${eruption}<use href="#run-crater"/></g>`;
        }).join("");
        horizon += `<g transform="translate(${i*600})">${sky}${cones}</g>`;
        hills += `<g transform="translate(${i*510})"><path d="m0 141 48-23 13-27 15 19 8-8 24 27 47-6 32-22 12-31 8 24 19 4 5 19 39 18 40-6 29-21 21 9 54-23 20 26 66 21v58H0z" fill="#3b2735"/><path d="m73 126 24 13 43 1m60-36 3 14 13 4m118 17 21-11" fill="none" stroke="#8d4d4d" stroke-width="1.7"/></g>`;
        continue;
      }
      horizon += `<g transform="translate(${i*600})">
        <g transform="translate(450 46)"><circle r="29" fill="var(--r-sun)" stroke="#af8759" stroke-width="1"/><circle r="29" fill="url(#run-sunset)"/></g>
        <g class="cloud-drift"><use href="#run-cloud" transform="translate(78 34) scale(.83)"/><use href="#run-cloud" transform="translate(491 66) scale(.7)"/></g>
        <g class="birds-drift"><use href="#run-birds" transform="translate(270 35)"/></g>
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
    const sign = '<g transform="translate(164 147) rotate(-4)"><path class="runner-pole" d="M0 8v-22"/><path d="M-15-34h30v23h-30z" fill="#fff5cf" stroke="var(--r-ink)" stroke-width="1.7"/>';
    switch (i % 4) {
      case 0: return sign + '<path d="m-10-16 7-13 7 10 6-4" class="runner-pencil"/></g><g transform="translate(208 179) rotate(-18)"><path d="M-12 0h32v8h-32z" fill="#edc275" stroke="var(--r-ink)" stroke-width="1.4"/><path d="M-8 0v4m5-4v2m5-2v4m5-4v2m5-2v4m5-4v2" class="runner-pencil"/></g>';
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
      let cracks = "";
      if (!solid && total>1 && i/(total-1)>=.52) {
        const fracture = i/(total-1)>=.82 ? "m51 156 7 5-4 6 10 7m-12-6-4 2M136 156l-5 6 7 7-9 10m8-11 8 3" : "m131 156-3 5 6 6-4 5";
        cracks = `<path d="${fracture}" class="runner-fractures"/>`;
      }
      tiles += `<g transform="translate(${i*stride})"><path d="${terrain}" class="runner-ground"/>
        <path d="m${left+1} 161q57 2 111 0t${right-left-112} 0" class="runner-pencil"/>
        <path d="M${left+5} 172h${right-left-12}l-4 13q-38-8-72-1t-65 0-61 3z" fill="url(#run-hatch)" opacity=".85"/>
        <path d="m-26 184 9 2 11-3m83-12 10 1 5-2m48 16 7-3" class="runner-contour"/>
        <path d="m52 156 2-3 3 3m64 0 2-4 2 3 2-2 1 3" class="runner-pencil"/>
        ${cracks}
        ${(difficulty === "hard" || difficulty === "insane") && !solid ? '<path d="M180 190q12-7 30-2t39-1v23h-69z" fill="#ffa346"/><path d="M184 192q10-5 24-2t30 0" fill="none" stroke="#ffe49a" stroke-width="2"/><use href="#run-flame" transform="translate(218 190) scale(.68)"/>' : ''}
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
    const show = index>=0 && index<letters.length && !blocked.includes(index) && !active && !celebrating;
    hide(choice,!show);
    if (show) choice.querySelector("text").textContent = letters[index];
  }
  function close(indices) {
    blocked = [...indices];
    aim(aiming);
  }
  function stage(done, length) {
    if (frameId) cancelAnimationFrame(frameId);
    active=null; celebrating=false; frameId=0; cleared=Math.max(0,Math.trunc(done||0)); total=Math.max(0,Math.trunc(length||0));
    set(scene,"data-phase",total ? "ready" : "home");
    set(scene,"data-impact","off");
    set(eyes,"d","m5-50 .3 1.3m6-1.7 .2 1.3");
    set(mouth,"fill","none");
    blocked=[]; aim(-1);
    set(scene,"data-chapter",total?Math.min(2,Math.floor(cleared/total*3)):0);
    const character = ({easy:"Runner in a chicken hat", hard:"Runner on a volcanic course", insane:"Runner beneath an angry sun and erupting volcanoes"})[difficulty] || "Stick figure on the course";
    set(scene,"aria-label",total ? `${character}, ${cleared} of ${total} hurdles cleared.` : "A stick figure waits at the starting flag.");
    courseWeather(); setTerrain(); cameraAt(cleared*stride); fx.replaceChildren(); incident.replaceChildren(); pose(startX,floor);
  }
  // Build each scene once. The animation only moves existing SVG groups.
  const misses = {
    easy: {
      duration:1120, label:"The chicken hat takes flight as the runner bounces into a haystack.",
      landing:'<path d="M-43 4q4-18 13-17-1-13 9-8 8-15 16-5 8-12 14 0 9-6 13 4 14 2 17 15z" fill="#e2aa50" stroke="#8d643c" stroke-width="2"/><path d="m-30-6 9-7m-8 16 15-12m0 9 13-17m3 12 7-9m8 16 7-11" fill="none" stroke="#ffda7b" stroke-width="2.2"/>',
      air:'<use href="#run-feather" transform="translate(-26 -1) rotate(-12)"/><use href="#run-feather" transform="translate(26 0) rotate(72)"/><use href="#run-feather" transform="translate(43 14) rotate(30)"/>',
      prop:'<use href="#run-chicken" transform="translate(0 59)"/><path d="m-7 1q-9-8-15-3 9 6 14 5z" fill="#fff4cf" stroke="#8e7454"/>'
    },
    medium: {
      duration:980, label:"The runner tumbles into the paper gap.",
      landing:'<path d="M-39 1q14-13 31-8l30-7-5 12 23 4-20 9-44-2z" fill="#f9eac8" stroke="#786b5e" stroke-width="2"/><path d="m-39 1 24 0 7-8 7 10 23-17M1 3l16-5m-32 3 4 6" fill="none" stroke="#a68b71"/>',
      air:'<use href="#run-leaf" transform="translate(-23 -9) rotate(-36)"/><use href="#run-leaf" transform="translate(29 -7) rotate(23)"/><use href="#run-leaf" transform="translate(42 9) rotate(52)"/>',
      prop:'<path d="M-18 0q12-9 30-2" fill="none" stroke="#aa7b3e"/><use href="#run-star" transform="translate(-19 0) scale(.5)"/><use href="#run-star" transform="translate(14 -2) scale(.58)"/>'
    },
    hard: {
      duration:1280, label:"A lava geyser launches the runner onto a smoking rock.",
      landing:'<ellipse cy="1" rx="35" ry="8" fill="#fb9d49"/><path d="m-34 0 10-12 26-6 27 7 6 8-12 5-37 1z" fill="#513542" stroke="#fbb46a" stroke-width="2"/><path d="m-18-7 10 2 6-7 7 5 14-1" fill="none" stroke="#bd7461"/>',
      air:'<use href="#run-smoke" transform="translate(-14 0) scale(.70)"/><use href="#run-smoke" transform="translate(23 5) scale(.47)"/><g fill="#fdc26a"><circle cx="-32" cy="-14" r="2.5"/><circle cx="22" cy="-24" r="2"/></g>',
      prop:'<use href="#run-flame" transform="scale(1.45 2.1)"/>'
    },
    insane: {
      duration:1680, label:"The angry sun hurls a meteor. The runner disappears into an ash cloud and peeks out of the crater.",
      landing:'<ellipse cy="2" rx="49" ry="10" fill="#f87740"/><ellipse rx="37" ry="6" fill="#ffd171"/><path d="m-43 2 9-9 11 6 12-10 9 6 11-8 8 9 17-5 10 9-17 7-49 1z" fill="#4b2d40" stroke="#ed8850" stroke-width="1.8"/><path d="m-15-2 8 4 7-5 6 3 10-2" fill="none" stroke="#ffba6d"/>',
      air:'<use href="#run-smoke" transform="translate(-24 1) scale(.86)"/><use href="#run-smoke" transform="translate(0 -10) scale(1.03)"/><use href="#run-smoke" transform="translate(28 0) scale(.80)"/><path d="m-53-12-4-9 8 5zm90-9 6-10-1 13zm-54-25-4-8 8 5zm52 5 6-5-3 7z" fill="#ffcc81"/>',
      prop:'<use href="#run-meteor" transform="scale(1.16)"/>'
    }
  };
  function missFrame(t) {
    const advance = ease(clamp(t/.62)), impact = clamp((t-.58)/.42);
    const worldDistance = 124*advance, scroll = 63*advance;
    cameraAt(cleared*stride+scroll);
    const x = startX + worldDistance-scroll, gap = 216-scroll;
    const arc = Math.sin(Math.PI*clamp((t-.14)/.47));
    let y = floor-44*arc+25*ease(clamp((t-.43)/.23));
    let angle = 12*arc + 88*ease(clamp((t-.42)/.27));
    const settleX = x + 5*impact;
    let propX = gap, propY = 183, propAngle = 0, propScale = 1;
    let airY = 160-15*impact, airScale = .65+.45*impact, airOpacity = impact;
    const lift = Math.sin(Math.PI*impact);
    switch (difficulty) {
      case "easy":
        y -= 20*lift; angle -= 71*impact;
        propX = x+41*impact; propY = y-56-31*lift; propAngle = -28*lift+15*impact;
        airY = y-44-13*lift; break;
      case "hard":
        y -= 59*lift; angle += 248*impact;
        propScale = .4+1.25*lift;
        airY = 151-37*impact; airOpacity = Math.min(1,impact*3)*(.9-.46*impact); break;
      case "insane": {
        const incoming = ease(clamp((t-.16)/.47));
        const fromX = compact ? 342 : 494;
        propX = fromX+(gap-fromX)*incoming; propY=57+122*incoming;
        propScale=.28+.95*incoming; propAngle=-8+21*incoming;
        y += 20*lift; angle += 28*lift-69*impact;
        airY=174-31*impact; airScale=.38+1.05*ease(clamp(impact*2));
        airOpacity=Math.min(1,impact*5)*(1-.58*impact); break;
      }
      default:
        propX=x+4; propY=139-8*lift; propAngle=14*Math.sin(impact*Math.PI*2);
        angle -= 24*impact;
    }
    pose(settleX,y,{swing:Math.sin(advance*Math.PI*6)*(1-arc), lift:arc, jump:arc+.27*lift, angle, wipeout:t>.41});
    if (t>.43 && !active.impact) { active.impact=true; set(scene,"data-impact","on"); }
    const landingScale = ease(clamp((t-.47)/.17));
    transform(active.landing,`translate(${gap} 187) scale(${landingScale} ${landingScale*(1-.24*lift)})`);
    transform(active.air,`translate(${gap} ${airY}) scale(${airScale})`);
    set(active.air,"opacity",airOpacity);
    transform(active.prop,`translate(${propX} ${propY}) rotate(${propAngle}) scale(${propScale})`);
    const trailStart = difficulty==="insane" ? .16 : difficulty==="easy" ? .43 : .54;
    set(active.prop,"opacity",clamp((t-trailStart)/.08));
  }
  function victoryPose(t) {
    // Bring the finish banner into the center as the runner makes three happy hops.
    const pan = clamp(t/.42), eased = pan*pan*(3-2*pan);
    const x = startX+120*eased;
    cameraAt(total*stride-120*eased);
    const hop = Math.abs(Math.sin(Math.PI*3*t));
    pose(x, floor-32*hop, {lift:hop, jump:.40*hop, angle:-3*hop, cheer:true});
    set(mouth,"d","M2-45q5 2 11-1-1 7-6 7-4 0-5-6z");
  }
  function celebrate() {
    if (active || celebrating || !total || cleared+1 < total) return;
    const celebration = {};
    celebrating=celebration;
    set(scene,"data-phase","victory");
    set(scene,"aria-label",`All ${total} hurdles cleared. The runner jumps for joy under a shower of confetti!`);
    set(eyes,"d","m2-50q2-3 4 0m3-.5q2-3 4-.5");
    set(mouth,"fill","var(--r-ink)");
    const colors=["#ffbf53","#e26457","#5aa8a3","#e5d4f3","#fff2b4"];
    fx.innerHTML=Array.from({length:34},(_,i)=>{
      const x=22+(i*149)%553, y=13+(i*i*17+i*37)%96;
      const shape=i%4===0 ? "m-3-2q4-2 3 1t3 2" : "m-2-1 4 2";
      return `<g transform="translate(${x} ${y})"><g class="victory-paper" style="--delay:${i%7*45}ms"><path transform="rotate(${i*37%180})" d="${shape}" fill="none" stroke="${colors[i%5]}" stroke-width="${2+i%3}"/></g></g>`;
    }).join("");
    const start=performance.now();
    function tick(now) {
      if (celebrating!==celebration) return;
      const t=reducedMotion.matches || document.hidden ? 1 : clamp((now-start)/2350);
      victoryPose(t);
      frameId=t<1 ? requestAnimationFrame(tick) : 0;
    }
    tick(start);
  }
  function drawFrame(t) {
    if (!active.hit) { missFrame(t); return; }
    const {star}=active, smooth=ease(t);
    const distance=stride*smooth;
    const worldX=startX+cleared*stride+distance;
    const scroll=stride*smooth - 37*Math.sin(Math.PI*t);
    cameraAt(cleared*stride+scroll);
    const x = worldX-camera;
    // Take off before the torn edge and land on the next piece of graph paper.
    const airborne=clamp((distance-58)/148);
    const height = Math.sin(Math.PI*airborne);
    const pace = Math.sin(distance/stride*Math.PI*14)*(1-height);
    const y = floor-67*height-Math.abs(pace)*2;
    pose(x,y,{swing:pace,lift:height,jump:height,angle:9*height,cheer:t===1});
    if (distance>120) {
      if (!active.collected) { if (star) hide(star,true); active.collected=true; }
      const pop=clamp((distance-120)/51);
      transform(active.spark,`translate(${216+cleared*stride-camera} 74) scale(${.5+pop*1.6})`);
      set(active.spark,"opacity",1-pop);
    }
  }
  function settle() {
    if (!active) return;
    if (frameId) cancelAnimationFrame(frameId);
    drawFrame(1);
    const {hit,finish}=active;
    active=null; frameId=0;
    set(scene,"data-phase",hit ? "landed" : "missed");
    set(scene,"aria-label",hit ? `Hurdle cleared. ${cleared+1} of ${total} complete.` : misses[difficulty].label);
    finish();
  }
  function travel(index, hit, finish) {
    if (active || celebrating || !total) return;
    aim(-1);
    set(scene,"data-phase",hit ? "jump" : "miss");
    const miss = misses[difficulty];
    if (hit) {
      fx.innerHTML='<g id="run-pop" opacity="0"><use href="#run-star-rays"/></g>';
      active={hit,finish,spark:get("pop"),star:world.querySelector('[data-star-at="'+cleared+'"]')};
    } else {
      incident.innerHTML=`<g id="run-landing">${miss.landing}</g>`;
      fx.innerHTML=`<g id="run-prop">${miss.prop}</g><g id="run-air">${miss.air}</g>`;
      active={hit,finish,landing:get("landing"),prop:get("prop"),air:get("air")};
    }
    const jump=active, started=performance.now(), duration=hit ? 1030 : miss.duration;
    function tick(now) {
      if (active!==jump) return;
      const t=clamp((now-started)/duration);
      if (t>=1 || reducedMotion.matches || document.hidden) settle();
      else { drawFrame(t); frameId=requestAnimationFrame(tick); }
    }
    tick(started);
  }
  document.addEventListener("visibilitychange",() => {
    set(scene,"data-paused",document.hidden ? "yes" : "no");
    if (!document.hidden) return;
    settle();
    if (celebrating && frameId) { cancelAnimationFrame(frameId); frameId=0; victoryPose(1); }
  });
  backdrop();
  function setDifficulty(value) {
    if (value === difficulty || !Object.hasOwn(misses,value)) return;
    difficulty = value;
    set(scene,"data-difficulty",value);
    backdrop();stage(cleared,total);
  }
  window.junctionRunner = {reset:length=>stage(0,length),home:()=>stage(0,0),stage,travel,aim,close,celebrate,difficulty:setDifficulty};
  set(scene,"data-difficulty",difficulty);
  stage(0,0);
})();
