// Public display names are assembled from these two menus, including in shared links.
window.junctionScores = (() => {
  const endpoint = "https://script.google.com/macros/s/AKfycbx6FS0-q3B_OdW8oKX5iGP7JVb_p7fud38U0pIRXe46l_Huq0kHs-mjwgEBGZ94eNz8DA/exec";
  const adjectives = ["Wobbly","Brisk","Sunny","Dizzy","Sneaky","Peppy","Sleepy","Bouncy","Cosmic","Mighty","Lucky","Fuzzy"];
  const nouns = ["Otter","Pencil","Gecko","Raven","Tangent","Turnip","Moose","Slope","Moth","Badger","Panda","Kiwi"];
  const valid = id => Number.isInteger(id) && id >= 0 && id < adjectives.length*nouns.length;
  const name = id => valid(id) ? adjectives[Math.floor(id/nouns.length)]+" "+nouns[id%nouns.length] : "Runner";
  const randomAlias = () => Math.floor(Math.random()*adjectives.length*nouns.length);
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
    const saved = stored("alias");
    return saved !== undefined && valid(Number(saved)) ? Number(saved) : randomAlias();
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
  return {adjectives,nouns,valid,name,randomAlias,token,stored,player,alias,request};
})();
