(() => {
  "use strict";
  const scene = document.getElementById("rails");
  if (!scene) return;
  const floor = 156, stride = 288, startX = 91;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const letters = "ABCD";
  // Head shapes share the same eye line, chin and neck so every runner can
  // wear the chicken hat, take a tumble and receive the Sun Crown.
  const avatars = {
    pip: {name:"Pip", color:"#f45d9e",
      head:'<path d="M-7-43q-3-11 7-14 10-2 15 7 3 9-7 13-9 3-15-6z" fill="#fff1cd"/>', coat:""},
    fox: {name:"Juniper", color:"#e9914c",
      head:'<path d="m-9-48-1-13 10 6q4-2 7 0l7-8 1 12 6 5-5 7-9 4-11-3-5-6z" fill="#ed9255"/><path d="m-7-57 5 3-4 3zm16 3 4-5 0 7z" fill="#613e45" stroke="none"/><path d="m-7-46 6 4 5-3 6 1 7-3-3 7-8 4-9-4z" fill="#fff2d1" stroke="none"/><path d="m14-46 4 0-2 2z" fill="#3a3438" stroke="none"/>',
      coat:'<path d="M-6-22q-12 5-18-9 0 17 15 17l6-3z" fill="#ea8348"/><path d="m-24-31 7 10-4-1 3 5q-6-4-6-14z" fill="#ffeac6" stroke="none"/><path d="m-4-33 9 0 2 14-12 1z" fill="#398881"/><path d="m-4-29 9-1" fill="none" stroke="#a6e1c3"/>'},
    owl: {name:"Orbit", color:"#bd9ddd",
      head:'<path d="m-11-58 9 3q5-2 11 0l7-5-1 9q4 11-1 15-8 6-19 0-6-5-5-14z" fill="#8c73a5"/><path d="M-6-49q-1-6 4-6 4 0 6 3 5-5 10-1 4 5-1 9-6 7-13 1-5-1-6-6z" fill="#f8e7c5" stroke="#644f71" stroke-width="1.1"/><path d="m7-48 4 1-3 3z" fill="#ecab55" stroke="none"/>',
      coat:'<path d="M-6-34q7-3 13 2l-1 12-6 4-7-6z" fill="#997eac"/><path d="m-7-32-4 10 6-3 2-7zm13 1 3 9-5-3z" fill="#675a7a"/><path d="m-3-24 2 2 2-2m0-4 2 2 2-2" fill="none" stroke="#f5d7ac" stroke-width="1.4"/>'},
    cat: {name:"Mica", color:"#8bb6eb",
      head:'<path d="m-10-50-1-13 10 7q5-2 9 0l7-7 2 14q2 10-9 14-14 2-18-7z" fill="#465577"/><path d="m-8-59 5 4-4 3zm19 5 3-5 1 6z" fill="#ef99aa" stroke="none"/><path d="M-2-50q6-6 9-2 5-5 8 0 2 4-1 8l-6 5-8-2z" fill="#cdc7df" stroke="none"/><path d="m-5-44-10-2m12 5-10 2m25-5 10-3m-10 5 9 1" fill="none" stroke-width="1.4"/>',
      coat:'<path d="M-5-21q-15 5-15-7 0-5-3-3-4 4 0 12 6 9 19 4" fill="#657292"/><path d="m-5-33 11-1 2 16-15-2z" fill="#557fae"/><path d="m-4-24 10 2" fill="none" stroke="#b8dff3"/>'},
    frog: {name:"Skip", color:"#70bd88",
      head:'<path d="M-9-48q-1-8 5-11 6-3 9 3 6-7 11-2 4 4 1 10 6 10-6 13-14 3-20-4-3-4 0-9z" fill="#91c97d"/><path d="M-7-45q3-4 10-1 7 3 14-2 1 10-9 11-11 1-15-8z" fill="#e8e9aa" stroke="none"/><path d="m-6-52 3-1m12-1 2-1" fill="none" stroke="#4e8657" stroke-width="1.4"/>',
      coat:'<path d="m-5-33 11-1 2 16-17 1z" fill="#e7ac56"/><path d="m-4-31 3 7 3-1 2-8" fill="none" stroke="#825047" stroke-width="1.9"/><path d="m-2-23 4-1v4l-3 1z" fill="#e8db9a" stroke-width="1"/>'},
    robot: {name:"Bolt", color:"#6ecbcf",
      head:'<path d="m-1-57-3-7 4-3" fill="none" stroke-width="2.1"/><circle cx="1" cy="-67" r="2.5" fill="#f8ac59" stroke-width="1.5"/><rect x="-10" y="-57" width="28" height="22" rx="5" fill="#9dafb2"/><rect x="-7" y="-54" width="23" height="16" rx="3" fill="#b7eee1" stroke="#497175" stroke-width="1.6"/><path d="m-7-39 2 0m17-15 2 0" stroke="#ecf5d8" stroke-width="1.1"/>',
      coat:'<path d="m-6-33 13-1 1 15-15 1z" fill="#72a9ac"/><path d="m-3-24 8 0m-8 3 4 0" fill="none" stroke="#426569" stroke-width="1"/><circle cx="1" cy="-28" r="2" fill="#f9cd6c" stroke-width="1"/>'}
  };
  const characters = Object.keys(avatars).map(id=>({id,name:avatars[id].name}));
  const avatarId = id => Object.hasOwn(avatars,id) ? id : "pip";
  let localCharacter = "pip";
  // The original head ribbon meets at (2, -59), just above Pip's hairline.
  const bow = `<g class="head-bow" stroke="#752044" stroke-width="1.1">
    <path d="M2-59Q-1-62-4-62q-1 3 1 6 3 0 5-2 3 2 6 1 1-3-1-6-3 0-5 4Z" fill="#ff278e"/>
    <path d="m-2-60 2 1m4 0 2-2" stroke="#ffb8da" stroke-width=".8" fill="none"/>
    <rect x=".6" y="-60.6" width="2.9" height="3.4" rx=".9" fill="#ff65b1"/>
  </g>`;
  const chicken = `<g stroke="#51382f" stroke-width="1.4">
        <path d="M-3-64q-5-6-2-8 3-1 5 4 0-8 4-7 3 1 2 7 5-5 7-2 1 3-6 7" fill="#e65a49"/>
        <path d="M-11-51q-1-15 10-16 13-3 18 11l-4 3q-9-3-16 0l-4 6-3-1z" fill="#fff6d7"/>
        <path d="m13-59 11 4-11 2z" fill="#f5ae42"/><circle cx="10" cy="-61" r="1.35" fill="#332d2c" stroke="none"/>
      </g>`;
  const headwear = bow+'<use class="chicken-hat" href="#run-chicken"/>';
  const relaxedFace = '<g fill="none" stroke="#243740"><path d="m5-50 .3 1.3m6-1.7 .2 1.3" stroke-width="2.2"/><path d="M5-44q3 2 6-.5" stroke-width="1.4"/></g>';
  function portrait(id,level) {
    const a=avatars[avatarId(id)];
    const easy=level==="easy";
    return '<svg class="runner-portrait" xmlns="http://www.w3.org/2000/svg" viewBox="'+(easy?"-23 -78 50 51":"-23 -72 50 45")+'" width="44" height="40" aria-hidden="true" focusable="false"><g stroke="#243740" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2">'+a.head+relaxedFace+(easy?chicken:bow)+'</g></svg>';
  }
  let cleared = 0, total = 0, camera = 0, active = null, frameId = 0;
  let blocked = [], aiming = -1;
  let difficulty = "medium";
  let celebrating = false;
  let compact = false, frameWidth = 600, frameLeft = 0;
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
      <linearGradient id="run-dawn" x2="0" y2="1"><stop stop-color="#493a62"/><stop offset=".68" stop-color="#d87667"/><stop offset="1" stop-color="#ffe29b"/></linearGradient>
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
      <g id="run-chicken">${chicken}</g>
      <g id="run-leaf"><path d="m-8-7 14-2 4 12-13 4z" fill="#fff3d2" stroke="#776d5d" stroke-width="1.2"/><path d="m-4-3 7-1m-6 5 8-1" stroke="#71978b" stroke-width="1.3"/></g>
      <g id="run-plane"><path d="m-13 2 25-9-10 17-2-8-7 4z" fill="#fff0c6" stroke="#8c7861" stroke-width="1.4"/><path d="m0 2 12-9" stroke="#8c7861"/></g>
      <g id="run-meteor"><path d="M-5-2C7-8 12-23 42-34c-9 7-8 13-15 18 13-2 18-8 26-8C37-12 25-2 6 6z" fill="#fc7145"/><path d="M-2-1q11-13 29-22-10 12-13 13 7-1 12-3Q15 0 4 5z" fill="#ffcf6c"/><path d="m-7-5 7-4 7 3 2 7-5 6-8-1-5-5z" fill="#552c3c" stroke="#ffb75b" stroke-width="2"/><path d="m-3-4 3 3 4-1m-4 1-2 5" fill="none" stroke="#d8754c"/></g>
      <g id="run-smoke" fill="#564153" stroke="#322934" stroke-width="1.8"><path d="M-28 1q-6-10 5-14-2-13 12-13 3-9 12-6 11-5 16 7 14 0 12 12 9 8-1 15z"/><path d="M-15-10q2-7 10-6m9-7q8-2 10 7" fill="none" stroke="#9a7776"/></g>
      <g id="run-star-rays" fill="none" stroke-width="2.4"><path d="M9 1l4 1m-9 6 2 4m-12-4-2 4m-3-12-4-1m9-8-2-4m12 4 2-4" stroke="#865319"/><path d="M9-5l4-2m-12 16 1 4m-12-12-4-1m10-10-1-4" stroke="#ffdb7e"/></g>
      <g id="run-sky-trails" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".58"><path d="M-17 0q8-4 18 0t21 0m-29 5h12"/></g>
      <g id="sun-crown" stroke="#5b3435" stroke-width="1.7">
        <path d="m-13-3-3-13 10 7 4-14 7 14 10-9-3 15z" fill="#ffd567"/>
        <path d="m-13-4 26-1-1 5-24 1z" fill="#eaa348"/>
        <path d="m-3-13 4-5 4 6-4 4z" fill="#8fffe1"/>
        <path d="m-8-1 3-.3m9-.5 3-.3" fill="none" stroke="#fff2ae" stroke-width="1.3"/>
      </g>
      <g id="flick-palm" stroke="#3e3943" stroke-width="2.4">
        <path d="m-15-14 19-4q9-5 24-11 8-3 11 2 2 5-5 9l-13 8 20-5q9-3 11 3 1 5-9 9l-15 7q-13 12-31 6l-12 1z" fill="#fff0cd"/>
        <path d="M6 13q8 3 17-3l9-7q7-7 1-10-5-2-11 4l-6 4m9 6 8-5" fill="#edc999"/>
        <path d="M-17-15h12l2 35h-15z" fill="#96c9bd"/><path d="m-16-9 10-1m-9 23 11-1" stroke="#487875"/>
        <path d="m-38-14 20-1 1 35-24 4z" fill="#396669"/>
      </g>
      <g id="flick-loaded" fill="#fff0cd" stroke="#3e3943" stroke-width="2.4">
        <path d="M7-8q5-9 11-13 7-5 13 1l6 8q4 6-2 11-5 3-9-2l-5-7-7 6"/>
        <path d="m22-10 4 7q5 7 11 3l11-9q6-5 2-9-4-4-9 0l-9 6-2-3"/>
      </g>
      <g id="flick-extended" fill="#fff0cd" stroke="#3e3943" stroke-width="2.4">
        <path d="M4-9q8-10 20-10l40-5q8-1 9 4 1 4-7 6L26-4l-9 8"/>
        <path d="M14 5q11 3 19-2l12-9q5-5 1-8-4-4-9 0l-8 6"/>
        <path d="m58-19 5-.6" fill="none" stroke="#b18d79" stroke-width="1.4"/>
      </g>
      <g id="flick-spark" fill="none" stroke="#603939" stroke-width="2.4">
        <path d="m-5-5-8-7m16 5 2-9m4 16 10-7m-7 14 7 4"/>
        <path d="m-5-5-8-7m16 5 2-9m4 16 10-7m-7 14 7 4" transform="translate(1 -1)" stroke="#ffe79a"/>
      </g>
      <g id="festival-burst" fill="none" stroke="currentColor" stroke-width="2.4">
        <path d="M0-10v-19m5 20 11-16M10-4l18-7M10 3l18 8M5 8l11 17M-1 10l-2 18M-6 8l-12 14M-10 2l-18 4m19-11-14-10m18 7-8-18"/>
        <g fill="#ffe6a5" stroke="none"><circle cy="-33" r="2.4"/><circle cx="31" cy="-11" r="2"/><circle cx="-30" cy="6" r="2.3"/><circle cx="18" cy="27" r="2"/></g>
      </g>
    </defs>
    <rect x="-100%" width="300%" height="210" fill="var(--r-paper)"/>
    <rect x="-100%" width="300%" height="210" fill="url(#run-grid)"/>
    <rect class="runner-lava-sky" x="-100%" width="300%" height="210" fill="url(#lava-sky)"/>
    <rect class="runner-eclipse" x="-100%" width="300%" height="210" fill="url(#ash-sky)"/>
    <rect id="run-afterglow" x="-100%" width="300%" height="210" fill="url(#run-dawn)" opacity="0"/>
    <g id="run-daylight" transform="translate(450 46)"><circle r="29" fill="var(--r-sun)" stroke="#af8759"/><circle r="29" fill="url(#run-sunset)"/></g>
    <g id="run-far"></g><g id="run-weather" aria-hidden="true"></g>
    <g class="runner-eclipse">
      <g id="run-sun" transform="translate(494 53)">
        <path d="m0-42 5 10 9-7 1 10 12-4-2 10 12-1-6 8 11 6-12 3 7 10-12-1 2 11-10-5-2 11-8-8-7 11-5-12-10 6 1-11-12 2 5-9-11-4 10-6-10-7 12-2-4-11 10 4 2-11 8 8z" fill="#fc7744"/>
        <circle r="31" fill="url(#sun-fire)" stroke="#601f34" stroke-width="2"/>
        <g id="run-sun-glare"><g class="eclipse-eyes" fill="#391c31">
          <path d="M-23-12q11 1 21 10-10 5-18-1zM23-12Q12-11 2-2q10 5 18-1z"/>
          <path d="m-12-5 4 2-3 1zm24 0-4 2 3 1z" fill="#fff4bc"/>
        </g>
        <path d="m-1-3-3 9 6-1" fill="none" stroke="#ad4b3d" stroke-width="2"/>
        <path d="M-19 7q17 11 38-1-5 19-18 18T-19 7z" fill="#451b2c"/>
        <path d="m-13 11 6 2-1 6zm20 2 7-3-5 9zm-7 9 3-4 2 5z" fill="#fff0b8"/></g>
        <g id="run-sun-surprise" fill="#421d35" data-runner-hidden="">
          <path d="M-19-10q6-5 12-3m14 0q7-4 12 0" fill="none" stroke="#763339" stroke-width="2.5"/>
          <ellipse cx="-11" cy="-3" rx="5" ry="6"/><ellipse cx="11" cy="-3" rx="5" ry="6"/>
          <circle cx="-13" cy="-5" r="1.6" fill="#fff2bd"/><circle cx="9" cy="-5" r="1.6" fill="#fff2bd"/>
          <ellipse cy="13" rx="5" ry="6"/>
        </g>
        <g id="run-sun-smile" data-runner-hidden="">
          <path d="M-19-3q5-8 12-1M7-4q6-7 12 1" fill="none" stroke="#713f39" stroke-width="3"/>
          <ellipse cx="-18" cy="7" rx="5" ry="2.5" fill="#ec8053"/><ellipse cx="18" cy="7" rx="5" ry="2.5" fill="#ec8053"/>
          <path d="M-9 9q9 5 19-1-2 11-9 12-7 0-10-11z" fill="#75433b"/>
          <path d="M-4 16q5-3 10-1-5 5-10 1z" fill="#ffa382"/>
        </g>
        <use id="run-boss-crown" href="#sun-crown" transform="translate(0 -28) scale(.78)"/>
      </g>
    </g>
    <g id="run-near"></g>
    <g id="run-festival" aria-hidden="true"></g>
    <rect x="-100%" y="196" width="300%" height="14" fill="var(--r-wash)"/>
    <g id="run-world"></g>
    <g id="run-podium" data-runner-hidden="" pointer-events="none">
      <path d="M-52 16-46 6-28 5-24 0h47l6 5 17 1 8 10z" fill="#dc9b56" stroke="#513044" stroke-width="2"/>
      <path d="M-46 6h92l7 9H-52z" fill="#8a514a"/><path d="m-40 8 13 1m55 0 12-1" stroke="#f2b366" stroke-width="2"/>
      <ellipse cy="1" rx="25" ry="4" fill="#ffe49b" stroke="#785441" stroke-width="1.5"/>
      <path d="m0 6 2 3 4 1-3 2v4l-3-2-3 2v-4l-3-2 4-1z" fill="#ffe49b"/>
    </g>
    <g id="run-solar-halo" data-runner-hidden="" pointer-events="none" fill="none">
      <ellipse cy="-32" rx="38" ry="45" stroke="#fff2c4" stroke-width="1.2" stroke-dasharray="2 9"/>
      <g stroke="#ffdd8c" stroke-width="2.2">
        <path d="m-39-62-8-6m-3 24-10-1m12 23-10 4m22-63-4-8m56 9 4-8m19 29 10-4m-9 29 10 3M-18-86l-1-5m22-2 1-6"/>
      </g>
    </g>
    <g id="run-rivals" pointer-events="none"></g>
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
        <g id="run-outfit" stroke="var(--r-ink)" stroke-width="1.7"></g>
        <g id="run-arm-back" transform="translate(-1,-32)"><path class="runner-appendage runner-distant-leg" d="m0 0-6 7-5-3"/></g>
        <g id="run-arm-front" transform="translate(1,-32)"><path class="runner-appendage" d="m0 0 7 7 5-5"/></g>
        <g id="run-win-arms" data-runner-hidden="" fill="none">
          <path d="m-1-32-11-7-5-9m18 16 12-5 8-12" stroke="#fff1c8" stroke-width="4.7"/>
          <path d="m-1-32-11-7-5-9m18 16 12-5 8-12" class="runner-appendage"/>
          <path d="m-17-48-1-4m1 4-4-2m42 1 1-4m-1 4 4-2" stroke="var(--r-ink)" stroke-width="1.8"/>
        </g>
        <g id="run-head">
          <g id="run-face-shape" stroke="var(--r-ink)" stroke-width="2.6">${avatars.pip.head}</g>
          <path id="run-eyes" d="m5-50 .3 1.3m6-1.7 .2 1.3" fill="none" stroke="var(--r-ink)" stroke-width="2"/>
          <path id="run-mouth" d="M5-44q3 2 6-.5" stroke="var(--r-ink)" stroke-width="1.4" fill="none"/>
          ${headwear}
          <use id="run-prize" class="champion-crown" href="#sun-crown" transform="translate(3 -57) scale(.9)" data-runner-hidden=""/>
          <path class="runner-soot" d="m-5-45 4 2m0 2 2 1m10-3 2-1" fill="none" stroke="#82625e" stroke-width="2.5"/>
        </g>
      </g>
    </g>
    <g id="run-fx" pointer-events="none"></g>
    <g id="run-last-meteor" data-runner-hidden="" pointer-events="none"><use href="#run-meteor"/></g>
    <g id="run-parry" data-runner-hidden="" pointer-events="none">
      <circle r="12" fill="none" stroke="#ffeab4" stroke-width="1.4"/><use href="#run-star-rays" transform="scale(1.5)"/>
    </g>
    <g id="run-crown-flight" data-runner-hidden="" pointer-events="none">
      <g fill="none" stroke="#ffeba2" stroke-width="1.5"><path d="M9 1q13 6 21 3m-19 1q10 8 18 9m-11-18h9"/></g>
      <use href="#sun-crown"/>
    </g>
    <g id="run-choice" data-runner-hidden=""><path class="runner-thought" d="M0-8q0-4 4-4h12q5 0 5 5v8q0 4-5 4H7l-5 4 1-5q-3 0-3-4z"/><text class="runner-digit" x="10" y="2"></text></g>
    <g id="run-rival-signs" pointer-events="none"></g>
  `;
  const get = id => scene.querySelector("#run-" + id);
  const far = get("far"), near = get("near"), world = get("world"), fx = get("fx");
  const incident = get("incident"), weather = get("weather"), sun = get("sun");
  const festival = get("festival"), flyingCrown = get("crown-flight");
  const crown = get("prize"), glare = get("sun-glare"), surprise = get("sun-surprise"), afterglow = get("afterglow");
  const sunSmile=get("sun-smile"), bossCrown=get("boss-crown"), lastMeteor=get("last-meteor"), parry=get("parry"), podium=get("podium"), solarHalo=get("solar-halo");
  const hero = get("hero"), lean = get("lean"), shadow = get("shadow");
  const legBack = get("leg-back"), legFront = get("leg-front");
  const armBack = get("arm-back"), armFront = get("arm-front");
  const winArms = get("win-arms");
  const head = get("head"), mouth = get("mouth");
  const eyes = get("eyes");
  const choice = get("choice");
  const set = (el, attr, value) => el.setAttribute(attr, value);
  const transform = (el, val) => set(el, "transform", val);
  const hide = (el, hidden) => el.toggleAttribute("data-runner-hidden", hidden);
  const clamp = t => Math.max(0, Math.min(1, t));
  const ease = t => t*t*(3-2*t);
  const rivalLayer = get("rivals"), signLayer = get("rival-signs");
  let rivals = [], rivalFrame = 0, rivalSignature = "";

  function setCharacter(value) {
    const id=avatarId(value);
    localCharacter=id;
    get("face-shape").innerHTML=avatars[id].head;
    get("outfit").innerHTML=avatars[id].coat;
    set(hero,"data-character",id);
    if(!total) set(scene,"aria-label",avatars[id].name+" waits at the starting flag.");
  }
  function ghostSprite(r) {
    const a=avatars[r.character];
    return `<g id="run-rival-${r.seat}" class="runner-ghost" data-seat="${r.seat}" data-character="${r.character}">
      <title id="run-rival-title-${r.seat}"></title>
      <ellipse cy="1" rx="13" ry="2" fill="#30414b" opacity=".30"/>
      <g id="run-rival-body-${r.seat}" class="runner-ghost-body" stroke="#253b43" stroke-width="2.4">
        <g fill="none" stroke-width="3.7">
          <path d="m0-18-6 8-2 8 5 1m4-17 5 8 1 8 5-1" />
          <path d="m0-17 2-17m-2 3-7 7-5-3m14-4 6 6 5-4"/>
        </g>
        <path d="M-1-33q-10-5-12 1l-1 7 12 3z" fill="#cea15a" stroke-width="1.9"/>
        ${a.coat}${a.head}${relaxedFace}${headwear}
      </g>
      <g id="run-rival-tag-${r.seat}" class="rival-marker">
        <rect width="38" height="15" x="-19" y="-68" rx="7"/><circle cx="-11" cy="-60.5" r="3.2" fill="${a.color}"/>
        <text id="run-rival-tagtext-${r.seat}" x="3" y="-56.9">P${r.seat}</text>
      </g></g>`;
  }
  function edgeSprite(r) {
    return `<g id="run-edge-${r.seat}" class="rival-marker" data-runner-hidden="">
      <rect width="66" height="17" x="-33" y="-8.5" rx="8"/>
      <path id="run-rival-chevron-${r.seat}" d="m-2-3 3 3-3 3" fill="none" stroke="${avatars[r.character].color}" stroke-width="2.2"/>
      <text id="run-edge-text-${r.seat}" y="3.6"></text></g>`;
  }
  function positionAt(r,now) {
    if(now>=r.until || reducedMotion.matches || document.hidden) return r.cleared;
    return r.from+(r.cleared-r.from)*ease(clamp(1-(r.until-now)/r.duration));
  }
  function drawRivals(now=performance.now()) {
    if(!rivals.length) return false;
    const edges=[[],[]], groups=new Map();
    let moving=false;
    for(const r of rivals){
      const lane=groups.get(r.cleared)||[];
      lane.push(r);groups.set(r.cleared,lane);
    }
    for(const r of rivals){
      const position=positionAt(r,now), worldX=startX+stride*position;
      const group=groups.get(r.cleared), index=group.indexOf(r);
      // Adjacent shadows share one landing. Leave the center for the local runner.
      const space=group.length>1 || r.cleared===Math.round(camera/stride);
      const lane=space ? [-30,34,-58][Math.min(index,2)] : 0;
      const x=worldX-camera+lane, onScreen=x>=frameLeft+18 && x<=frameLeft+frameWidth-18;
      const inFlight=position!==r.cleared;
      moving ||= inFlight;
      hide(r.sprite,!onScreen || index>=3);
      hide(r.edge,true);
      if(!onScreen){
        edges[x<frameLeft+18 ? 0 : 1].push(r);
        continue;
      }
      if(index>=3) continue;
      const arc=inFlight ? Math.max(0, Math.sin(Math.PI*clamp((position-Math.floor(position)-.16)/.65))) : 0;
      transform(r.sprite,`translate(${x} ${floor-2})`);
      transform(r.body,`translate(0 ${-41*arc}) rotate(${5*arc}) scale(.76)`);
      transform(r.tag,`translate(0 ${-37*arc-(group.length>2&&index===2?15:0)})`);
      const status=r.status==="finished"?"✓":r.status==="out"?"×":"";
      r.tagText.textContent=index===2 && group.length>3 ? "+"+(group.length-2) : "P"+r.seat+status;
    }
    edges.forEach((list,side)=>{
      list.sort((a,b)=>Math.abs(a.cleared-camera/stride)-Math.abs(b.cleared-camera/stride)||a.seat-b.seat);
      list.slice(0,3).forEach((r,i)=>{
        const sign=side?1:-1, overflow=i===2 && list.length>3;
        const diff=r.cleared-Math.round(camera/stride);
        const label=overflow ? (list.length-2)+" racers" : "P"+r.seat+" · "+(diff>0?"+":"")+diff;
        hide(r.edge,false);
        transform(r.edge,`translate(${frameLeft+(side?frameWidth-37:37)} ${15+i*20})`);
        transform(r.chevron,`translate(${25*sign} 0) scale(${sign} 1)`);
        set(r.edgeText,"x",-4*sign);r.edgeText.textContent=label;
      });
    });
    return moving;
  }
  function tickRivals(now) {
    rivalFrame=drawRivals(now) ? requestAnimationFrame(tickRivals) : 0;
  }
  function setRivals(roster,localSeat) {
    const before=new Map(rivals.map(r=>[r.seat,r])), now=performance.now(), seen=new Set();
    const next=[];
    for(const s of Array.isArray(roster)?roster:[]){
      if(!s || !Number.isInteger(s.seat) || s.seat<1 || s.seat>12 || s.seat===localSeat || seen.has(s.seat) || !["playing","out","finished"].includes(s.status)) continue;
      seen.add(s.seat);
      const progress=Number.isSafeInteger(s.cleared)&&s.cleared>=0?s.cleared:0, character=avatarId(s.character);
      const prior=before.get(s.seat), r=prior || {seat:s.seat,cleared:progress,from:progress,until:0,duration:0};
      if(reducedMotion.matches || document.hidden){
        r.from=progress;r.until=0;
      } else if(r.cleared!==progress){
        r.from=progress<r.cleared ? progress : positionAt(r,now);
        r.duration=Math.min(1100,580+110*Math.abs(r.from-progress));r.until=now+r.duration;
      }
      r.cleared=progress;r.character=character;r.status=s.status;next.push(r);
    }
    rivals=next.sort((a,b)=>a.seat-b.seat);
    const signature=rivals.map(r=>r.seat+"/"+r.character).join(",");
    if(signature!==rivalSignature){
      rivalSignature=signature;
      rivalLayer.innerHTML=rivals.map(ghostSprite).join("");signLayer.innerHTML=rivals.map(edgeSprite).join("");
      for(const r of rivals){
        r.sprite=get("rival-"+r.seat);r.body=get("rival-body-"+r.seat);r.tag=get("rival-tag-"+r.seat);r.tagText=get("rival-tagtext-"+r.seat);
        r.title=get("rival-title-"+r.seat);r.edge=get("edge-"+r.seat);r.edgeText=get("edge-text-"+r.seat);r.chevron=get("rival-chevron-"+r.seat);
      }
    }
    for(const r of rivals){
      set(r.sprite,"data-status",r.status);
      r.title.textContent=`Player ${r.seat}, ${avatars[r.character].name}, ${r.cleared} cleared. ${r.status==="out"?"Run over.":r.status==="finished"?"Finished.":""}`;
    }
    if(rivalFrame) cancelAnimationFrame(rivalFrame);
    tickRivals(now);
  }

  const sunX = () => Math.round(frameLeft+frameWidth*(compact ? .838 : .823));
  function fitScene(size) {
    if (!size) return;
    const nextCompact = size < 530;
    const heightLimit = Math.max(138,Math.min(size>=1400 ? 410 : 315,(window.innerHeight || 900)*(size>=1400 ? .39 : .32)));
    const nextWidth = nextCompact ? 408 : Math.max(600,Math.round(size*210/heightLimit));
    if (nextWidth === frameWidth) return;
    compact = nextCompact; frameWidth = nextWidth;
    // Show more terrain on both sides; keep the runner in the left third.
    frameLeft = -Math.round(Math.max(0,frameWidth-600)*.32);
    set(scene,"viewBox",`${frameLeft} 0 ${frameWidth} 210`);
    set(scene,"data-frame",compact ? "close" : frameWidth>600 ? "panorama" : "wide");
    transform(sun,`translate(${sunX()} 53)`);
    transform(get("daylight"),`translate(${sunX()-34} 46)`);
    backdrop(); courseWeather(); setTerrain(); cameraAt(camera);
    if (active?.hit) {
      active.star=world.querySelector('[data-star-at="'+cleared+'"]');
      if (active.star && active.collected) hide(active.star,true);
    }
    if (celebrating?.epic) { openFestival(); if (!frameId) victoryPose(1); }
  }
  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(([entry])=>set(scene,"data-offscreen",entry.isIntersecting ? "no" : "yes")).observe(scene);
  }

  let weatherKey = "";
  function courseWeather() {
    const progress = courseProgress(cleared);
    const intensity = progress >= .82 ? 3 : progress >= .52 ? 2 : progress >= .26 ? 1 : 0;
    set(scene,"data-intensity",intensity);
    const key = difficulty + intensity + ":" + frameWidth;
    if (key === weatherKey) return;
    weatherKey = key;
    const volcanic = difficulty === "hard" || difficulty === "insane";
    const objects = [];
    const count = Math.ceil(((difficulty === "insane" ? 4 : 2) + 2*intensity)*Math.max(1,frameWidth/600));
    for (let i=0; i<count; i++) {
      const x = frameLeft+44+(i*137+i*i*11)%(frameWidth-80), y = 21+i*37%80;
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
    for (let i = Math.floor(frameLeft/510)-1; i <= Math.ceil((frameLeft+frameWidth)/510)+1; i++) {
      if (difficulty === "hard" || difficulty === "insane") {
        const cones = ["translate(-38 3)", "translate(270 18) scale(.95)"].map((place,j) => {
          const eruption = difficulty === "insane" ? `<g transform="translate(180 47)" class="crater-vent vent-${j}"><use class="lava-jet" href="#eruption-jet"/><use class="lava-cinders" href="#eruption-cinders"/></g>` : "";
          return `<g transform="${place}">${eruption}<use href="#run-crater"/></g>`;
        }).join("");
        horizon += `<g transform="translate(${i*600})">${cones}</g>`;
        hills += `<g transform="translate(${i*510})"><path d="m0 141 48-23 13-27 15 19 8-8 24 27 47-6 32-22 12-31 8 24 19 4 5 19 39 18 40-6 29-21 21 9 54-23 20 26 66 21v58H0z" fill="#3b2735"/><path d="m73 126 24 13 43 1m60-36 3 14 13 4m118 17 21-11" fill="none" stroke="#8d4d4d" stroke-width="1.7"/></g>`;
        continue;
      }
      horizon += `<g transform="translate(${i*600})">
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
    for (let i = cleared+Math.floor(frameLeft/stride)-1; i <= cleared+Math.ceil((frameLeft+frameWidth)/stride)+1; i++) {
      const solid = total > 0 && i >= total;
      const left = -41, right = solid ? stride-40 : 182;
      const terrain = `M${left} ${floor}H${right}l-3 11 3 9-6 10-2 12Q${right-21} 189 ${right-41} 194T${right-98} 195 ${left+68} 193 ${left+6} 197l-4-15-3-9 2-10z`;
      let cracks = "";
      if (!solid && courseProgress(i)>=.52) {
        const fracture = courseProgress(i)>=.82 ? "m51 156 7 5-4 6 10 7m-12-6-4 2M136 156l-5 6 7 7-9 10m8-11 8 3" : "m131 156-3 5 6 6-4 5";
        cracks = `<path d="${fracture}" class="runner-fractures"/>`;
      }
      const volcanic=difficulty==="hard" || difficulty==="insane";
      const lateGap = !solid && courseProgress(i)>=.52;
      const splinters = lateGap ? `<g transform="translate(193 165)" fill="${volcanic?"#ffe197":"#ac9378"}" stroke="${volcanic?"#d55535":"#756856"}">
        <g class="rift-debris" style="--rift-delay:${-(Math.abs(i)%4)*.6}s"><path d="m0 0 5-3 2 5-5 2zm14 6 4-3 3 3-5 2zm21-12 3-2 2 3-3 1z"/></g></g>` : "";
      tiles += `<g transform="translate(${i*stride})"><path d="${terrain}" class="runner-ground"/>
        <path d="m${left+1} 161q57 2 111 0t${right-left-112} 0" class="runner-pencil"/>
        <path d="M${left+5} 172h${right-left-12}l-4 13q-38-8-72-1t-65 0-61 3z" fill="url(#run-hatch)" opacity=".85"/>
        <path d="m-26 184 9 2 11-3m83-12 10 1 5-2m48 16 7-3" class="runner-contour"/>
        <path d="m52 156 2-3 3 3m64 0 2-4 2 3 2-2 1 3" class="runner-pencil"/>
        ${cracks}
        ${volcanic && !solid ? '<path d="M180 190q12-7 30-2t39-1v23h-69z" fill="#ffa346"/><path d="M184 192q10-5 24-2t30 0" fill="none" stroke="#ffe49a" stroke-width="2"/><g transform="translate(218 190) scale(.68)"><use class="rift-flame" href="#run-flame"/></g>' : ''}
        ${splinters}
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
    drawRivals();
  }
  function pose(x, y, options = {}) {
    const {swing=0, lift=0, angle=0, jump=0, cheer=false, wipeout=false} = options;
    transform(hero, `translate(${x} ${y})`);
    transform(lean, `rotate(${angle} 0 -23)`);
    transform(legBack,'rotate(' + (swing*37 - jump*45) + ')');
    transform(legFront,'rotate(' + (-swing*40 + jump*58) + ')');
    transform(armBack,'translate(-1,-32) rotate(' + (-swing*41 + jump*58 + (cheer?105:0)) + ')');
    transform(armFront,'translate(1,-32) rotate(' + (swing*42 - jump*90 - (cheer?91:0)) + ')');
    hide(winArms,!cheer); hide(armBack,cheer); hide(armFront,cheer);
    transform(head,'rotate(' + (wipeout?17:jump*-12-swing*3) + ' 2 -39)');
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
  // Endless ramps up over the first 20 platforms and keeps the far side open.
  function courseProgress(index) {
    return total>1 ? clamp(index/(Number.isFinite(total)?total-1:20)) : 0;
  }
  function stage(done, length) {
    if (frameId) cancelAnimationFrame(frameId);
    active=null; celebrating=false; frameId=0; cleared=Math.max(0,Math.trunc(done||0)); total=Math.max(0,Math.trunc(length||0));
    set(scene,"data-phase",total ? "ready" : "home");
    set(scene,"data-impact","off");
    set(scene,"data-finale","none");
    hide(flyingCrown,true);
    hide(crown,true); hide(glare,false); hide(surprise,true);hide(sunSmile,true);hide(bossCrown,false);
    for(const piece of [lastMeteor,parry,podium,solarHalo]) hide(piece,true);
    set(afterglow,"opacity",0); set(scene,"data-dance","off");
    festival.replaceChildren();
    set(eyes,"d","m5-50 .3 1.3m6-1.7 .2 1.3");
    set(mouth,"fill","none");
    blocked=[]; aim(-1);
    set(scene,"data-chapter",Math.min(2,Math.floor(courseProgress(cleared)*3)));
    const character = avatars[localCharacter].name+(({easy:" in a chicken hat", hard:" on a volcanic course", insane:" beneath an angry sun and erupting volcanoes"})[difficulty] || " on the course");
    set(scene,"aria-label",total ? `${character}, ${cleared}${Number.isFinite(total)?" of "+total:""} hurdles cleared.` : avatars[localCharacter].name+" waits at the starting flag.");
    if(!total) setRivals([],0);
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
        const fromX = sunX();
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
  // The cocked finger waits at the runner's shoulder before the snap. Keep the
  // existing landing for each difficulty, including Easy's feather rescue.
  function flickFrame(t) {
    const snapAt = .32;
    const approach = ease(clamp(t/.22));
    const released = t >= snapAt;
    const flight = clamp((t-snapAt)/(1-snapAt));
    const recoil = Math.sin(Math.PI*clamp(flight/.19));
    const retreat = ease(clamp((flight-.17)/.31));
    missFrame(Math.pow(flight,.74));
    const edge = frameLeft-87;
    const x = reducedMotion.matches ? 1 : edge+(24-edge)*approach+(edge-24)*retreat;
    transform(active.hand,`translate(${x-3*recoil} ${127+19*(1-approach)+8*retreat}) rotate(${-6*approach+5*recoil})`);
    hide(active.hand,retreat===1 && !reducedMotion.matches);
    hide(active.loaded,released); hide(active.extended,!released);
    const glint = clamp(flight/.22);
    transform(active.contact,`translate(92 101) scale(${.65+1.35*glint})`);
    set(active.contact,"opacity",released ? 1-glint : 0);
    if (!released) {
      pose(startX,floor,{angle:3*approach});
      set(mouth,"d","M4-43q3-2 6-.5");
    }
  }
  function firework(x,y,size,color,delay) {
    return `<g transform="translate(${x} ${y}) scale(${size})" style="color:${color};--burst-delay:${delay}s">
      <g class="festival-shell"><path d="M0 71Q-3 33 0 0" fill="none" stroke="currentColor" stroke-width="1.7"/><circle r="2.5" fill="#fff3cb"/></g>
      <g class="festival-sparks"><use href="#festival-burst"/></g></g>`;
  }
  function openFestival() {
    const palette = ["#ffdb83","#91f0d1","#ffb3a5"];
    const count = Math.max(4,Math.ceil(frameWidth/116));
    festival.innerHTML = Array.from({length:count},(_,i)=>{
      const x = frameLeft+((i+.5)/count)*frameWidth;
      return firework(Math.round(x),[48,26,42,79,55][i%5],[.82,.56,.86,.54][i%4],palette[i%3],[0,1.12,.45,1.46,.24][i%5]);
    }).join("");
  }
  function victoryPose(t) {
    const epic = celebrating.epic;
    // Leave the sky clear over the champion during the last, higher leap.
    const pan = clamp(t/.42), eased = pan*pan*(3-2*pan);
    const shift = epic ? frameLeft+frameWidth*.5-startX : 120;
    const x = startX+shift*eased;
    cameraAt(total*stride-shift*eased);
    const hops = epic ? 4 : 3;
    const hop = Math.abs(Math.sin(Math.PI*hops*t));
    const y = floor-(epic ? 40 : 32)*hop;
    pose(x, y, {lift:hop, jump:.40*hop, angle:-3*hop, cheer:true});
    set(mouth,"d","M2-45q5 2 11-1-1 7-6 7-4 0-5-6z");
    if (t===1) set(scene,"data-dance","on");
    if (!epic) return;
    const crowned = t >= .76;
    set(scene,"data-finale", crowned ? "crowned" : t>=.24 ? "launch" : "eruption");
    hide(crown,!crowned); hide(glare,t>=.24); hide(surprise,t<.24 || crowned);
    hide(sunSmile,!crowned);hide(bossCrown,t>=.24);
    set(afterglow,"opacity",ease(clamp((t-.23)/.47)));
    const zoom = 1+.21*eased;
    transform(hero,`translate(${x} ${y}) scale(${zoom})`);
    const u = ease(clamp((t-.24)/.52));
    const fromX = sunX();
    // The last meteor skims the champion's raised hand. A shower of sparks
    // sends it back toward the eclipse before the crown crosses the sky.
    const contactT=.16, leaveT=.30;
    const punchX=startX+shift*ease(contactT/.42)+22;
    const punchY=floor-40*Math.abs(Math.sin(Math.PI*hops*contactT))-51;
    const incoming=t<contactT, mt=clamp(incoming?t/contactT:(t-contactT)/(leaveT-contactT));
    const travelX=incoming ? fromX+(punchX-fromX)*mt : punchX+(fromX-punchX)*mt;
    const travelY=incoming ? 64+(punchY-64)*mt-18*Math.sin(Math.PI*mt) : punchY+(52-punchY)*mt-22*Math.sin(Math.PI*mt);
    transform(lastMeteor,`translate(${travelX} ${travelY}) scale(${incoming ? .49 : -.60} .5) rotate(-8)`);
    hide(lastMeteor,t>=leaveT);hide(parry,t<contactT||t>=.27);
    const impact=clamp((t-contactT)/.11);
    transform(parry,`translate(${punchX} ${punchY}) scale(${.8+impact*1.8})`);
    set(parry,"opacity",1-impact);
    const entrance=ease(clamp((t-.64)/.16));
    hide(podium,!entrance);hide(solarHalo,!entrance);
    transform(podium,`translate(${x} ${floor+16*(1-entrance)}) scale(${entrance} 1)`);
    transform(solarHalo,`translate(${x} ${y}) scale(${zoom})`);
    set(solarHalo,"opacity",entrance*.9);
    const crownX = fromX + (x+3*zoom-fromX)*u;
    const crownY = 25+(y-57*zoom-25)*u-27*Math.sin(Math.PI*u);
    const bloom = clamp(t/.12);
    transform(flyingCrown,`translate(${crownX} ${crownY}) rotate(${-20*Math.sin(Math.PI*u)}) scale(${(.78+.31*u)*bloom})`);
    hide(flyingCrown,crowned || t<.24 || !bloom);
  }
  function celebrate(epic=false) {
    if (active || celebrating || !total || cleared+1 < total) return;
    const celebration = {epic:epic && difficulty==="insane"};
    celebrating=celebration;
    set(scene,"data-impact","off"); incident.replaceChildren();
    set(scene,"data-phase","victory");
    set(scene,"aria-label",celebration.epic
      ? "Insane course cleared! "+avatars[localCharacter].name+" sends the last meteor back. The volcanoes burst into fireworks, the sun smiles, and the champion lands on the golden podium wearing the Sun Crown."
      : `All ${total} hurdles cleared. The runner jumps for joy under a shower of confetti!`);
    set(eyes,"d","m2-50q2-3 4 0m3-.5q2-3 4-.5");
    set(mouth,"fill","var(--r-ink)");
    const colors=["#ffbf53","#e26457","#5aa8a3","#e5d4f3","#fff2b4"];
    fx.innerHTML=Array.from({length:Math.max(24,Math.round(frameWidth/17))},(_,i)=>{
      const x=frameLeft+22+(i*149)%(frameWidth-44), y=13+(i*i*17+i*37)%96;
      const shape=i%4===0 ? "m-3-2q4-2 3 1t3 2" : "m-2-1 4 2";
      return `<g transform="translate(${x} ${y})"><g class="victory-paper" style="--delay:${i%7*45}ms"><path transform="rotate(${i*37%180})" d="${shape}" fill="none" stroke="${colors[i%5]}" stroke-width="${2+i%3}"/></g></g>`;
    }).join("");
    if (celebration.epic) openFestival();
    const start=performance.now();
    function tick(now) {
      if (celebrating!==celebration) return;
      const duration=celebration.epic ? 4200 : 2350;
      const t=reducedMotion.matches || document.hidden ? 1 : clamp((now-start)/duration);
      victoryPose(t);
      frameId=t<1 ? requestAnimationFrame(tick) : 0;
    }
    tick(start);
  }
  function drawFrame(t) {
    if (!active.hit) { if(active.hand) flickFrame(t); else missFrame(t); return; }
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
    const {hit,finish,hand}=active;
    active=null; frameId=0;
    set(scene,"data-phase",hit ? "landed" : "missed");
    set(scene,"aria-label",hit ? `Hurdle cleared. ${cleared+1}${Number.isFinite(total)?" of "+total:""} complete.` : (hand ? "Time expired. A giant hand flicks the runner off the platform. " : "")+misses[difficulty].label);
    finish();
  }
  function travel(index, hit, finish, timeout=false) {
    if (active || celebrating || !total) return;
    aim(-1);
    set(scene,"data-phase",hit ? "jump" : "miss");
    const miss = misses[difficulty];
    if (hit) {
      fx.innerHTML='<g id="run-pop" opacity="0"><use href="#run-star-rays"/></g>';
      active={hit,finish,spark:get("pop"),star:world.querySelector('[data-star-at="'+cleared+'"]')};
    } else {
      incident.innerHTML=`<g id="run-landing">${miss.landing}</g>`;
      const hand = timeout ? `<g id="run-hand"><path d="M${frameLeft-130} -17 L-20 -14 -18 20 ${frameLeft-130} 27Z" fill="#396669" stroke="#3e3943" stroke-width="2.4"/>
        <use href="#flick-palm"/><use id="run-loaded" href="#flick-loaded"/><use id="run-extended" href="#flick-extended" data-runner-hidden=""/></g><g id="run-contact" opacity="0"><use href="#flick-spark"/></g>` : "";
      fx.innerHTML=`<g id="run-prop">${miss.prop}</g><g id="run-air">${miss.air}</g>${hand}`;
      active={hit,finish,landing:get("landing"),prop:get("prop"),air:get("air")};
      if (timeout) Object.assign(active,{hand:get("hand"),loaded:get("loaded"),extended:get("extended"),contact:get("contact")});
    }
    const jump=active, started=performance.now(), duration=hit ? 1030 : miss.duration+(timeout ? 650 : 0);
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
    if(rivalFrame){ cancelAnimationFrame(rivalFrame);rivalFrame=0;drawRivals(); }
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
  window.junctionRunner = {reset:length=>stage(0,length),home:()=>stage(0,0),stage,travel,aim,close,celebrate,difficulty:setDifficulty,
    characters,portrait,character:setCharacter,rivals:setRivals};
  set(scene,"data-difficulty",difficulty);
  stage(0,0);
  fitScene(scene.clientWidth);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(([entry])=>fitScene(entry.contentRect.width)).observe(scene);
  }
  window.addEventListener?.("resize",()=>fitScene(scene.clientWidth));
})();
