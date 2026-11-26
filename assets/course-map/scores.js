// Keep historic scoreboard aliases readable while new players enter up to five letters.
window.junctionScores = (() => {
  const endpoint = "https://script.google.com/macros/s/AKfycbx6FS0-q3B_OdW8oKX5iGP7JVb_p7fud38U0pIRXe46l_Huq0kHs-mjwgEBGZ94eNz8DA/exec";
  const adjectives = ["Wobbly","Brisk","Sunny","Dizzy","Sneaky","Peppy","Sleepy","Bouncy","Cosmic","Mighty","Lucky","Fuzzy"];
  const nouns = ["Otter","Pencil","Gecko","Raven","Tangent","Turnip","Moose","Slope","Moth","Badger","Panda","Kiwi"];
  function nicknameOK(value) {
    if(typeof value!=="string" || !/^[A-Z]{1,5}$/.test(value))return false;
    // Check both the whole name and recognizable roots, including doubled-letter variants.
    const exact=/^(ASS|ARS[E]?|BUM|TIT[S]?|WTF|STFU|GTFO|FML|AF|BS|BJ|KYS|KKK|NAZI[S]?|CUM[S]?|HO[E]?S?|THOT|SMD|STD|DONG|BONG|TWAT|SPERM|XXX|SMEG|TURD|JERK|ANUS|ANAL|PENIS|VAG|PORN|SEX[Y]?|COCK[S]?|HELL|DYKE[S]?|HOMO[S]?|CACA|NIG|NGA|NGR|FAG[S]?|GAYBO)$/;
    const roots=/F[UO]C?K|FCK|FUK|PH[UO]C?K|SH[IY]T|SHAT|SHT|B[IY]T?CH|BTCH|C[UI]NT|D[IY]CK|P[IY]SS|N[IY]G[GAK]|FAGG?|WHOR|SLUT|RAPE|RAPST|SPIC|K[IY]KE|CHINK|PUSSY|PUSS|WANK|PRICK|PUT[AO]|PUTT[AO]|CUL[OA]|COJON|VERGA|JOD[EA]|PENDE|MERDE|SCREW|TWATS?|BOOB|DILDO|DAMN|CRAP|METH|TITT|KUNT|BICH|ASSH|ARSE|MUFFS|DICKS|SHITE/;
    return ![value,value.replace(/(.)\1+/g,"$1")].some(s=>exact.test(s)||roots.test(s));
  }
  const legacy = id => Number.isInteger(id) && id>=0 && id<adjectives.length*nouns.length;
  const valid = id => legacy(id) || nicknameOK(id);
  const name = id => legacy(id) ? adjectives[Math.floor(id/nouns.length)]+" "+nouns[id%nouns.length] : nicknameOK(id) ? id : "Guest";
  const guestNames = ["FERN","QUILL","AERO","MINT","KITE","EMBER","ORBIT","NOVA","LUNA","PANDA","WREN","RAVEN","PIP","COMET","LYNX","SPARK"];
  const token = bytes => Array.from(crypto.getRandomValues(new Uint8Array(bytes)),n => n.toString(16).padStart(2,"0")).join("");
  const memory = new Map();
  function stored(key,value) {
    if (value !== undefined) memory.set(key,String(value));
    try {
      if (value !== undefined) localStorage.setItem("junction-run-3-"+key,value);
      return localStorage.getItem("junction-run-3-"+key) ?? memory.get(key);
    } catch { return memory.get(key); }
  }
  const player = stored("player") || token(16);
  stored("player",player);
  function alias() {
    const saved=stored("nickname");
    if(nicknameOK(saved))return saved;
    return guestNames[parseInt(player.slice(0,2),16)%guestNames.length];
  }
  async function request(params,write=false) {
    // This course's exam-practice lecture uses its own board under the original limits key.
    const data = {...params,key:params.key==="s2.7" ? "limits" : params.key};
    const url = new URL(endpoint);
    if (!write) url.search = new URLSearchParams(data);
    const response = await fetch(url,write ? {method:"POST",credentials:"omit",
      headers:{"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify(data)} : {credentials:"omit",cache:"no-store"});
    if (!response.ok) throw Error("The scoreboard is unavailable.");
    const result = await response.json();
    if (!result.ok) throw Error("The scoreboard could not accept this run.");
    return result;
  }
  return {valid,name,nicknameOK,token,stored,player,alias,request};
})();
