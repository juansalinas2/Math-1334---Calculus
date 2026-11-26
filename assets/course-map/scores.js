// Nicknames and rankings belong to the game page. Keep the best run per player and course.
window.junctionScores = (() => {
  const prefix = "junction-run-board-v2-";
  const cache = new Map();
  const adjectives = ["Wobbly","Brisk","Sunny","Dizzy","Sneaky","Peppy","Sleepy","Bouncy","Cosmic","Mighty","Lucky","Fuzzy"];
  const nouns = ["Otter","Pencil","Gecko","Raven","Tangent","Turnip","Moose","Slope","Moth","Badger","Panda","Kiwi"];
  const pick = values => values[Math.floor(Math.random()*values.length)];
  function check(input) {
    const name = input.normalize("NFKC").trim().replace(/\s+/gu," ");
    const replacements = {"0":"o","1":"i","!":"i","3":"e","4":"a","@":"a","5":"s","$":"s","7":"t","8":"b"};
    const plain = name.normalize("NFKD").replace(/\p{Mark}/gu,"").toLowerCase()
      .replace(/[0134578!@$]/g,ch => replacements[ch]).replace(/[^a-z]/g,"");
    const collapsed = plain.replace(/(.)\1+/g,"$1");
    const banned = /fuck|fuk|phuck|shit|bitch|cunt|asshole|nigg|niga|fagg|fagot|kike|chink|whore|porn|penis|dickhead|pussy|rape|nazi|hitler|cockhead|wank|boobs|sexbot/;
    if (banned.test(plain) || banned.test(collapsed) || /^(ass|dick|cock|cum|sexy|tit|tits|sex|spic)$/.test(plain))
      return {kind:"bonk",message:"Bonk! Pick a classroom-friendly nickname."};
    if (!/^[\p{L}\p{N}][\p{L}\p{M}\p{N} _'’-]{0,19}$/u.test(name))
      return {kind:"format",message:"Use 1–20 letters, numbers, spaces, apostrophes, hyphens or underscores."};
    return {name};
  }
  function randomName() { return pick(adjectives)+" "+pick(nouns); }
  function alias(value) {
    try {
      if (value === undefined) return localStorage.getItem("junction-run-alias") || "";
      localStorage.setItem("junction-run-alias",value);
    } catch { /* Browser storage is optional. */ }
    return "";
  }
  function rows(mode) {
    let list = cache.get(mode) || [];
    try {
      const raw = localStorage.getItem(prefix+mode);
      if (raw) list = JSON.parse(raw);
    } catch { /* Keep the current session's ranking. */ }
    if (!Array.isArray(list)) return [];
    return list.filter(r => r && typeof r.name==="string" && check(r.name).name && Number.isInteger(r.points) && r.points>=0
      && Number.isInteger(r.cleared) && r.cleared>=0 && Number.isFinite(r.at));
  }
  function record(mode,name,points,cleared) {
    const approved = check(name).name;
    if (!approved || !cleared) return;
    const list = rows(mode);
    const same = list.find(row=>row.name.toLowerCase()===approved.toLowerCase());
    if (same && (same.points>points || (same.points===points && same.cleared>=cleared))) return;
    const next = [...list.filter(row=>row!==same),{name:approved,points,cleared,at:Date.now()}]
      .sort((a,b)=>b.points-a.points || b.cleared-a.cleared || a.at-b.at).slice(0,10);
    cache.set(mode,next);
    try { localStorage.setItem(prefix+mode,JSON.stringify(next)); } catch { /* Keep this session's scores. */ }
  }
  return {randomName,check,alias,rows,record};
})();
