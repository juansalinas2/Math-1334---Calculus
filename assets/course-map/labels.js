// Place captions around the drawn symbols at the current scale. No concept is culled.
let labelLayoutKey = "";
const labelMetrics = document.createElement("canvas").getContext("2d");
function overlap(a,b) {
  return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left)) *
    Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
}
function box(x,y,width,height) {
  return {left:x-width/2,right:x+width/2,top:y-height/2,bottom:y+height/2};
}
const captionMetrics = new Map();
function captionSize(node,compact) {
  const key=node.id+(compact?"/small":"/large");
  if (captionMetrics.has(key)) return captionMetrics.get(key);
  const size=node.symbol?(compact?15:20):(compact?11:13);
  labelMetrics.font=(node.symbol?"bold ":"600 ")+size+"px "+(node.symbol?"Georgia":"system-ui");
  const limit=compact?94:133, lines=[];
  for(const word of node.label.split(/\s+/)) {
    const last=lines.length-1;
    if(last>=0 && labelMetrics.measureText(lines[last]+" "+word).width<=limit) lines[last]+=" "+word;
    else lines.push(word);
  }
  const w=Math.ceil(Math.max(...lines.map(s=>labelMetrics.measureText(s).width)))+6;
  const lineHeight=size*1.06, h=lines.length*lineHeight+3;
  const result={size,lines,w,h,lineHeight};
  captionMetrics.set(key,result);
  return result;
}
function placeLabels(view) {
  const width=viewport.clientWidth, height=viewport.clientHeight;
  if (view.k/fullMapScale() < unfoldEdge) { labelLayoutKey=""; return; }
  // Anchor placement to map coordinates so captions stay put during a pan.
  const key=[width,height,view.k.toFixed(3),insideId||"",portrait].join("/");
  if (key===labelLayoutKey) return;
  labelLayoutKey=key;
  const compact=width<600, fit=fullMapScale();
  const nearFit=view.k<=fit*1.04 && !selected;
  const parentScale=Math.min(1,1.10/view.k);
  const markScale=parentScale*view.k;
  const diskScale=Math.min(2.7,Math.max(1,.54/view.k));
  const nodes=Array.from(document.querySelectorAll("#stops .station"), element=>{
    const node=d3.select(element).datum(), [x,y]=view.apply([node.x,node.y]);
    const radius=(node.symbol?21:17)*markScale*diskScale;
    return {node,x,y,radius,element};
  });
  const obstacles=nodes.map(n=>box(n.x,n.y,2*n.radius+4,2*n.radius+4));
  if (insideId && orbit) for (const r of orbit.obstacles) obstacles.push(r);
  const occupied=[];
  // Give the selected topic and the major concepts first choice of placement.
  nodes.sort((a,b)=>Number(b.node.id===insideId)-Number(a.node.id===insideId) ||
    Number(Boolean(b.node.symbol))-Number(Boolean(a.node.symbol)));
  const bounds=box(width/2,height/2,Math.max(1,width-6),Math.max(1,height-6));
  for(const {node,x,y,radius,element} of nodes) {
    const text=element.querySelector(".label");
    const {size,lines,w,h,lineHeight}=captionSize(node,compact);
    const vx=radius+4+w/2, vy=radius+4+h/2;
    const offsets=[[0,vy],[0,-vy],[vx,0],[-vx,0],[vx,-vy*.7],[-vx,-vy*.7],
      [vx,vy*.7],[-vx,vy*.7],[w*.28,vy+8],[-w*.28,vy+8],[w*.28,-vy-8],[-w*.28,-vy-8],
      [0,vy+16],[0,-vy-16]];
    let best=null, score=Infinity;
    for(const [index,[dx,dy]] of offsets.entries()) {
      const rect=box(x+dx,y+dy,w,h);
      let cost=index*1.5;
      for(const other of obstacles) cost+=overlap(rect,other)*2;
      for(const other of occupied) cost+=overlap(rect,other)*1.6;
      if(nearFit) cost+=(w*h-overlap(rect,bounds))*4;
      if(cost<score) {score=cost;best={rect,dx,dy};}
      if(score===0) break;
    }
    occupied.push(best.rect);
    const layout=lines.join("\n");
    if(text.dataset.lines!==layout) {
      text.replaceChildren();
      for(const [i,line] of lines.entries()) d3.select(text).append("tspan").attr("x",0).attr("dy",i?"1.06em":0).text(line);
      text.dataset.lines=layout;
    }
    const baseline=best.dy-(lines.length-1)*lineHeight/2+size*.34;
    text.setAttribute("y",0);
    text.style.fontSize=size+"px";
    text.setAttribute("transform","translate("+best.dx/markScale+","+baseline/markScale+") scale("+1/markScale+")");
  }
}
