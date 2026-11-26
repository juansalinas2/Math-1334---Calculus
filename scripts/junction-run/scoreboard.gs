// Critical Point class scores persist in Script Properties. Friend rooms expire after six hours.
const COURSES = ['exam3','final','theory','vocab','limits','continuity','derivative-motion','derivative-rules','chain','inverse-implicit','related-rates','global-extrema','extrema','sketch','optimize','lhospital'];
const LEVELS = ['easy','medium','hard','insane'];
const ORDER = ['ordered','shuffled'];
const CHARACTERS = ['pip','fox','owl','cat','frog','robot'];
function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function scopeKey(v) {
  if (!COURSES.includes(v.key) && !/^s(?:2\.[1-6]|3\.[1-9]|4\.[1-7])$/.test(v.key)) throw Error();
  if (!LEVELS.includes(v.diff) || !ORDER.includes(v.order)) throw Error();
  return [Number(v.version)===5?'board5':Number(v.version)===4?'board4':'board3',v.key,v.diff,v.order].join('-');
}
function roomKey(v) {
  if (!v.room) return '';
  if (!/^[0-9a-f]{24}$/.test(v.room) || !/^\d{1,10}$/.test(String(v.seed))) throw Error();
  return ['race',scopeKey(v),v.seed,v.room].join('-');
}
function list(store,key) { return JSON.parse((store.getProperty ? store.getProperty(key) : store.get(key)) || '[]'); }
function publicRows(rows) {
  return rows.map(r => ({alias:r.alias,best:r.best,cleared:r.cleared,status:r.status,points:r.points}));
}
function classRecord(db) {
  const saved=db.getProperty('class-top-scores');
  if(saved)return JSON.parse(saved);
  // Seed the public board with the timed scores and longest streaks already on record.
  const result={best:0,rows:[]};
  const properties=db.getProperties();
  for(const key of Object.keys(properties)) {
    if(!/^board[34]-/.test(key))continue;
    for(const row of JSON.parse(properties[key])) {
      result.best=Math.max(result.best,row.best||0);
      if(row.points>0)rankScore(result,row);
    }
  }
  return result;
}
function namedRecords(db) {
  const saved=db.getProperty('class-named-scores');
  if(saved)return JSON.parse(saved);
  const old=classRecord(db);
  // Historic guest labels and deliberately entered versions of those same words
  // were indistinguishable. Keep legacy data intact; a fresh opt-in can use any valid name.
  const guests=['FERN','QUILL','AERO','MINT','KITE','EMBER','ORBIT','NOVA','LUNA','PANDA','WREN','RAVEN','PIP','COMET','LYNX','SPARK'];
  const rows=old.rows.filter(row=>nicknameOK(row.alias)&&!guests.includes(row.alias));
  return {best:rows.reduce((n,row)=>Math.max(n,row.best),0),rows:rows};
}
function rankScore(record,row) {
  const old=record.rows.find(r=>r.id===row.id);
  if(!old || row.points>old.points || (row.points===old.points && row.best>=old.best)) {
    record.rows=record.rows.filter(r=>r.id!==row.id).concat(row)
      .sort((a,b)=>b.points-a.points || b.best-a.best || a.id.localeCompare(b.id)).slice(0,10);
  } else {
    old.alias=row.alias;
  }
}
function doGet(e) {
  try {
    const v=e.parameter;
    if(v.type==='room6')return roomRead(v);
    const key=scopeKey(v),room=roomKey(v);
    const db=PropertiesService.getScriptProperties();
    const racers=room ? publicRows(list(CacheService.getScriptCache(),room)) : [];
    if(Number(v.version)>=5){
      const record=Number(v.version)>=6?namedRecords(db):classRecord(db);
      return json({ok:true,rows:publicRows(record.rows),best:record.best,racers:racers});
    }
    return json({ok:true,rows:publicRows(list(db,key)),racers:racers});
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
  if (!Number.isInteger(v.seed)||v.seed<0||v.seed>4294967295 || !Number.isInteger(v.length) ||
      typeof v.steps!=='string'||!/^[0-7]*$/.test(v.steps))throw Error();
  const modern=Number(v.version)===7, endless=modern && v.length===0;
  if(modern){
    if(![0,5,10,15].includes(v.length) || (v.banked && (!endless || v.banked!==true)))throw Error();
  }else{
    const exam=v.key==='exam3'||v.key==='final', review=v.key==='theory'||v.key==='vocab';
    const max={easy:8,medium:10,hard:exam?20:12,insane:exam?15:review?12:8}[v.diff];
    if(v.length<1||v.length>max || (['hard','insane'].includes(v.diff)&&v.length!==max))throw Error();
  }
  if(!endless && v.steps.length>v.length+1)throw Error();
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
  if(v.banked){if(ended || !cleared)throw Error();return {best,cleared,status:'finished'};}
  return {best,cleared,status:ended?(cleared===v.length?'finished':'out'):'playing'};
}
function nicknameOK(value) {
  if(typeof value!=="string" || !/^[A-Z]{1,5}$/.test(value))return false;
  // Check both the whole name and recognizable roots, including doubled-letter variants.
  const exact=/^(ASS|ARS[E]?|BUM|TIT[S]?|WTF|STFU|GTFO|FML|AF|BS|BJ|KYS|KKK|NAZI[S]?|CUM[S]?|HO[E]?S?|THOT|SMD|STD|DONG|BONG|TWAT|SPERM|XXX|SMEG|TURD|JERK|ANUS|ANAL|PENIS|VAG|PORN|SEX[Y]?|COCK[S]?|HELL|DYKE[S]?|HOMO[S]?|CACA|NIG|NGA|NGR|FAG[S]?|GAYBO)$/;
  const roots=/F[UO]C?K|FCK|FUK|PH[UO]C?K|SH[IY]T|SHAT|SHT|B[IY]T?CH|BTCH|C[UI]NT|D[IY]CK|P[IY]SS|N[IY]G[GAK]|FAGG?|WHOR|SLUT|RAPE|RAPST|SPIC|K[IY]KE|CHINK|PUSSY|PUSS|WANK|PRICK|PUT[AO]|PUTT[AO]|CUL[OA]|COJON|VERGA|JOD[EA]|PENDE|MERDE|SCREW|TWATS?|BOOB|DILDO|DAMN|CRAP|METH|TITT|KUNT|BICH|ASSH|ARSE|MUFFS|DICKS|SHITE/;
  return ![value,value.replace(/(.)\1+/g,"$1")].some(s=>exact.test(s)||roots.test(s));
}
function doPost(e) {
  const lock=LockService.getScriptLock();
  try {
    if(!e.postData||e.postData.length>250000)throw Error();
    const v=JSON.parse(e.postData.contents);
    if(v.type==='room6'){
      if(!lock.tryLock(5000))return json({ok:false,error:'Room is busy. Try again.'});
      return roomWrite(v);
    }
    const key=scopeKey(v),room=roomKey(v);
    if(Number(v.version)>=6 && (v.action!=='save'||v.publishName!==true))throw Error();
    if (!/^[0-9a-f]{32}$/.test(v.player)||!(Number(v.version)>=5 ? nicknameOK(v.alias) : Number.isInteger(v.alias)&&v.alias>=0&&v.alias<144)||
        !['save','streak','progress'].includes(v.action))throw Error();
    const score=timedScore(v,replay(v),options);
    if(v.action==='save' && (score.status==='playing'||!score.cleared))throw Error();
    if(v.action==='streak'&&!score.best)throw Error();
    if(v.action==='progress'&&!room)throw Error();
    const row={id:v.player,alias:v.alias,...score};
    if(!lock.tryLock(5000))return json({ok:false});
    const db=PropertiesService.getScriptProperties(),cache=CacheService.getScriptCache();
    if([6,7].includes(Number(v.version))){
      const record=namedRecords(db);
      record.best=Math.max(record.best,row.best);rankScore(record,row);
      db.setProperty('class-named-scores',JSON.stringify(record));
      return json({ok:true});
    }
    // Older clients posted both streaks and final scores without an opt-in.
    // Preserve their archived results and let existing friend races finish.
    if(v.action!=='progress')return json({ok:false,error:'Reload Critical Point to post a named class score.'});
    if(room) {
      const racers=list(cache,room), old=racers.find(r=>r.id===row.id);
      if ((!old && racers.length<24) || (old && old.status!=="left" && v.steps.startsWith(old.steps) && (row.points||0)>=(old.points||0))) {
        cache.put(room,JSON.stringify(racers.filter(r=>r.id!==row.id).concat({...row,steps:v.steps})),21600);
      }
    }
    return json({ok:true});
  } catch(_){return json({ok:false});} finally{if(lock.hasLock())lock.releaseLock();}
}
// Version 4 used one base-36 digit per time. Version 5 uses two for the longer clocks.
function timedScore(v,score,choicesAt) {
  const version=Number(v.version);
  if(![4,5,6,7].includes(version))return score;
  const modern=version>=5, width=modern?2:1;
  const level=LEVELS.indexOf(v.diff), clocks=modern?[75,65,55,45]:[30,25,20,15];
  const base=modern?[50,100,200,350]:[1,1,1,1];
  if(typeof v.times!=='string' || v.times.length!==width*v.steps.length || !/^[0-9a-z]*$/.test(v.times) ||
    typeof v.extra!=='string' || (v.extra!=='' && !(modern?/^[0-3][0-9a-z]{2}$/:/^[0-3][0-9a-u]$/).test(v.extra)))throw Error();
  let points=0,jump=0;
  for(let i=0;i<v.steps.length;i++){
    const left=parseInt(v.times.slice(width*i,width*(i+1)),36);
    if(left>clocks[level])throw Error();
    if(choicesAt(v.seed,jump)[Number(v.steps[i])%4]===0){points+=base[level]+2*left;jump++;}
  }
  if(v.extra){
    const left=parseInt(v.extra.slice(1),36), next=Math.min(level+1,3);
    if(score.status!=='finished'||left>clocks[next])throw Error();
    if(choicesAt(v.seed,jump)[Number(v.extra[0])]===0)points+=base[next]+2*left;
  }
  if(v.retired===true && score.status==='playing')score.status='left';
  return Object.assign(score,{points:points});
}

// A room has a public six-character code and a private random token per player.
// Only the shared start time and numbered public seats leave the service.
function raceKey(code) {
  if(typeof code!=='string'||!/^[A-HJ-NP-Z2-9]{6}$/.test(code))throw Error();
  return 'critical-room-'+code;
}
function roomView(r,now) {
  return {code:r.code,edition:r.edition,key:r.key,diff:r.diff,order:r.order,seed:r.seed,length:r.length,version:r.version||6,
    round:r.round,startAt:r.startAt,host:r.host,revision:r.revision,
    racers:r.seats.map(s=>({seat:s.seat,character:s.character||'pip',crowned:s.crowned===true,ready:s.ready,status:s.status,cleared:s.cleared,points:s.points}))};
}
function roomReply(r,now,seat) {
  return json({ok:true,room:roomView(r,now),now:now,seat:seat||0});
}
function roomRead(v) {
  const raw=CacheService.getScriptCache().get(raceKey(v.code));
  return raw?roomReply(JSON.parse(raw),Date.now()):json({ok:false,error:'Room expired or code not found.'});
}
function blankSeat(token,n,now,character) {
  return {token:token,seat:n,character:CHARACTERS.includes(character)?character:'pip',seen:now,ready:false,status:'waiting',cleared:0,points:0,steps:'',extra:''};
}
function roomWrite(v) {
  const key=raceKey(v.code), cache=CacheService.getScriptCache(),now=Date.now();
  if(!/^[a-f0-9]{32}$/.test(v.member))throw Error();
  const raw=cache.get(key);
  let r=raw?JSON.parse(raw):null;
  if((v.action==='create'||v.action==='join') && v.character!==undefined && !CHARACTERS.includes(v.character))throw Error();
  if(v.action==='create'){
    if(r && r.seats[0].token!==v.member)return json({ok:false,error:'Code in use.'});
    if(!r){
      scopeKey(v);
      if(!/^[0-9a-f]{12}$/.test(v.edition))throw Error();
      replay(Object.assign({},v,{steps:''}));
      r={code:v.code,edition:v.edition,key:v.key,diff:v.diff,order:v.order,seed:v.seed,length:v.length,
        version:Number(v.version)===7?7:6,round:1,startAt:0,host:1,revision:0,seats:[blankSeat(v.member,1,now,v.character)]};
    }
  }
  if(!r)return json({ok:false,error:'Room expired or code not found.'});
  let self=r.seats.find(s=>s.token===v.member);
  // Lapsed tabs must not hold up the next race or retain the host seat.
  for(const s of r.seats)if(s!==self && now-s.seen>100000 && s.status!=='left'){s.status='left';s.ready=false;}
  if(v.action==='join'){
    if(v.edition!==r.edition)return json({ok:false,error:'This room uses an earlier question bank. Create a new room.'});
    if(!self || self.status==='left'){
      if(r.startAt)return json({ok:false,error:'This race has started. Join after the host opens a rematch.'});
      if(!self){
        const retired=r.seats.findIndex(s=>s.status==='left');
        if(retired>=0){self=blankSeat(v.member,r.seats[retired].seat,now,v.character);r.seats[retired]=self;}
        else {
          if(r.seats.length>=12)return json({ok:false,error:'This room has reached 12 runners.'});
          self=blankSeat(v.member,r.seats.length+1,now,v.character);r.seats.push(self);
        }
      }else Object.assign(self,blankSeat(v.member,self.seat,now,v.character));
    }
  }
  if(!self)return json({ok:false,error:'Join the room first.'});
  self.seen=now;
  if(!['join','create','leave','pulse'].includes(v.action) && v.round!==r.round)return roomReply(r,now,self.seat);
  const active=()=>r.seats.filter(s=>s.status!=='left');
  if(!active().some(s=>s.seat===r.host))r.host=active()[0]?.seat||0;
  switch(v.action){
    case 'create':case 'join':case 'pulse':
      if(v.crowned!==undefined){
        if(typeof v.crowned!=='boolean')throw Error();
        self.crowned=v.crowned;
      }
      break;
    case 'leave':self.status='left';self.ready=false;break;
    case 'ready':
      if(r.startAt || self.status==='left' || typeof v.ready!=='boolean')throw Error();
      self.ready=v.ready;break;
    case 'launch':
      if(self.seat!==r.host)throw Error();
      if(r.startAt)break;
      if(active().length<2||active().some(s=>!s.ready))return json({ok:false,error:'At least two runners must join, and everyone must be ready.'});
      r.startAt=now+7000;
      for(const s of active())s.status='playing';
      break;
    case 'rematch':
      if(self.seat!==r.host||!r.startAt||active().some(s=>s.status==='playing'))return json({ok:false,error:'Wait for every runner to finish.'});
      r.startAt=0;r.round++;r.seed=(Math.random()*4294967296)>>>0;
      for(const s of active())Object.assign(s,blankSeat(s.token,s.seat,s.seen,s.character));
      break;
    case 'progress':{
      if(!r.startAt || now<r.startAt-400 || self.status==='left')throw Error();
      const packet=Object.assign({},v,{version:r.version||6,key:r.key,diff:r.diff,order:r.order,seed:r.seed,length:r.length});
      const result=timedScore(packet,replay(packet),options);
      if((self.status==='playing'||self.status===result.status) && v.steps.startsWith(self.steps) && result.points>=self.points && (!self.extra || v.extra===self.extra)){
        Object.assign(self,{steps:v.steps,cleared:result.cleared,points:result.points,status:result.status,extra:v.extra});
      }
      break;
    }
    default:throw Error();
  }
  if(!active().some(s=>s.seat===r.host))r.host=active()[0]?.seat||0;
  r.revision++;cache.put(key,JSON.stringify(r),21600);return roomReply(r,now,self.seat);
}
