// Junction Run's public score endpoint. Script Properties hold the top ten per course.
// Live room progress expires from Script Cache. All displayed names are word-list indices.
const COURSES = ['exam3','final','theory','vocab','limits','continuity','derivative-motion','derivative-rules','chain','inverse-implicit','related-rates','global-extrema','extrema','sketch','optimize','lhospital'];
const LEVELS = ['easy','medium','hard','insane'];
const ORDER = ['ordered','shuffled'];
function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function scopeKey(v) {
  if (!COURSES.includes(v.key) && !/^s(?:2\.[1-6]|3\.[1-9]|4\.[1-7])$/.test(v.key)) throw Error();
  if (!LEVELS.includes(v.diff) || !ORDER.includes(v.order)) throw Error();
  return ['board3',v.key,v.diff,v.order].join('-');
}
function roomKey(v) {
  if (!v.room) return '';
  if (!/^[0-9a-f]{24}$/.test(v.room) || !/^\d{1,10}$/.test(String(v.seed))) throw Error();
  return ['race',scopeKey(v),v.seed,v.room].join('-');
}
function list(store,key) { return JSON.parse((store.getProperty ? store.getProperty(key) : store.get(key)) || '[]'); }
function publicRows(rows) {
  return rows.map(r => ({alias:r.alias,best:r.best,cleared:r.cleared,status:r.status}));
}
function doGet(e) {
  try {
    const v=e.parameter, key=scopeKey(v), room=roomKey(v);
    const rows=list(PropertiesService.getScriptProperties(),key);
    const racers=room ? list(CacheService.getScriptCache(),room) : [];
    return json({ok:true,rows:publicRows(rows),racers:publicRows(racers)});
  } catch (_) {return json({ok:false});}
}
function options(seed,jump) {
  let state=(seed ^ Math.imul(jump+1,2654435761))>>>0;
  const a=[0,1,2,3];
  for(let i=3;i>0;i--){
    state=(state+0x6d2b79f5)>>>0;
    let n=Math.imul(state^state>>>15,1|state);
    n=(n+Math.imul(n^n>>>7,61|n))^n;
    const j=Math.floor((((n^n>>>14)>>>0)/4294967296)*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function replay(v) {
  if (!Number.isInteger(v.seed)||v.seed<0||v.seed>4294967295 || !Number.isInteger(v.length)||v.length<1||v.length>60 ||
      typeof v.steps!=='string'||!/^[0-7]{0,61}$/.test(v.steps) || v.steps.length>v.length+1) throw Error();
  const exam=v.key==='exam3'||v.key==='final', review=v.key==='theory'||v.key==='vocab';
  const max={easy:8,medium:10,hard:exam?20:12,insane:exam?15:review?12:8}[v.diff];
  if(v.length>max || (['hard','insane'].includes(v.diff)&&v.length!==max))throw Error();
  let best=0,streak=0,cleared=0,feather=v.diff==='easy',missed=-1,eraser=false,ended=false,erasures=0;
  for(const ch of v.steps) {
    const digit=Number(ch),index=digit%4,used=digit>=4;
    if(ended || index===missed || (used&&!eraser)) throw Error();
    const choices=options(v.seed,cleared);
    if(used) {
      // The eraser always leaves the correct answer and one deterministic distractor.
      const wrong=[0,1,2,3].filter(i=>choices[i]!==0);
      let state=(v.seed^0xf302de47)>>>0;
      function random(){state=(state+0x6d2b79f5)>>>0;let n=Math.imul(state^state>>>15,1|state);n=(n+Math.imul(n^n>>>7,61|n))^n;return ((n^n>>>14)>>>0)/4294967296;}
      for(let i=0;i<erasures*2;i++)random();
      for(let i=2;i>0;i--){const j=Math.floor(random()*(i+1));[wrong[i],wrong[j]]=[wrong[j],wrong[i]];}
      if(wrong.slice(0,2).includes(index))throw Error();
      eraser=false;erasures++;
    }
    if(choices[index]===0) {
      cleared++;streak++;best=Math.max(best,streak);missed=-1;
      if(v.diff==='medium'&&cleared%3===0)eraser=true;
      ended=cleared===v.length;
    } else {
      streak=0;
      if(feather){feather=false;missed=index;}else ended=true;
    }
  }
  return {best,cleared,status:ended?(cleared===v.length?'finished':'out'):'playing'};
}
function doPost(e) {
  const lock=LockService.getScriptLock();
  try {
    if(!e.postData||e.postData.length>1800)throw Error();
    const v=JSON.parse(e.postData.contents), key=scopeKey(v),room=roomKey(v);
    if (!/^[0-9a-f]{32}$/.test(v.player)||!Number.isInteger(v.alias)||v.alias<0||v.alias>=144||
        !['save','streak','progress'].includes(v.action))throw Error();
    const score=replay(v);
    if(v.action==='save' && (score.status==='playing'||!score.cleared))throw Error();
    if(v.action==='streak'&&!score.best)throw Error();
    if(v.action==='progress'&&!room)throw Error();
    const row={id:v.player,alias:v.alias,...score};
    if(!lock.tryLock(5000))return json({ok:false});
    const db=PropertiesService.getScriptProperties(),cache=CacheService.getScriptCache();
    if (v.action!=='progress') {
      const rows=list(db,key), old=rows.find(r=>r.id===row.id);
      if(!old||row.best>old.best||(row.best===old.best&&row.cleared>=old.cleared)){
        const next=rows.filter(r=>r.id!==row.id).concat(row).sort((a,b)=>b.best-a.best||b.cleared-a.cleared);
        db.setProperty(key,JSON.stringify(next.slice(0,10)));
      } else if (v.action==='save' && row.alias!==old.alias) {
        old.alias=row.alias;db.setProperty(key,JSON.stringify(rows));
      }
    }
    if(room) {
      const racers=list(cache,room), old=racers.find(r=>r.id===row.id);
      if ((!old && racers.length<24) || (old && v.steps.startsWith(old.steps))) {
        cache.put(room,JSON.stringify(racers.filter(r=>r.id!==row.id).concat({...row,steps:v.steps})),21600);
      }
    }
    return json({ok:true});
  } catch(_){return json({ok:false});} finally{if(lock.hasLock())lock.releaseLock();}
}
