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
function captionSize(node,compact,growth) {
  const key=[node.id,compact,growth,mapSizes.topic].join("/");
  if (captionMetrics.has(key)) return captionMetrics.get(key);
  const size=((node.symbol?(compact?15:20):(compact?11:13))+growth)*mapSizes.topic;
  labelMetrics.font=(node.symbol?"bold ":"600 ")+size+"px "+(node.symbol?"Georgia":"system-ui");
  const limit=((compact?94:133)+growth*5)*Math.sqrt(mapSizes.topic), lines=[];
  for(const word of node.label.split(/\s+/)) {
    const last=lines.length-1;
    if(last>=0 && labelMetrics.measureText(lines[last]+" "+word).width<=limit) lines[last]+=" "+word;
    else lines.push(word);
  }
  const w=Math.ceil(1.1*Math.max(...lines.map(s=>labelMetrics.measureText(s).width)))+8;
  const lineHeight=size*1.06, h=lines.length*lineHeight+5;
  const result={size,lines,w,h,lineHeight};
  captionMetrics.set(key,result);
  return result;
}
function placeLabels(view) {
  const width=viewport.clientWidth, height=viewport.clientHeight;
  if (view.k/fullMapScale() < unfoldEdge) { labelLayoutKey=""; return; }
  // Anchor placement to map coordinates so captions stay put during a pan.
  const key=[width,height,view.k.toFixed(3),insideId||"",portrait,mapSizes.topic,mapSizes.subtopic].join("/");
  if (key===labelLayoutKey) return;
  labelLayoutKey=key;
  const compact=width<600, fit=fullMapScale();
  const growth=Math.round((compact?5:3)*blend(1.05,2.25,view.k/fit));
  const nearFit=view.k<=fit*1.04 && !selected;
  const parentScale=Math.min(1,1.10/view.k);
  const markScale=parentScale*view.k;
  const diskScale=Math.min(2.7,Math.max(1,.54/view.k));
  const nodes=Array.from(document.querySelectorAll("#stops .station"), element=>{
    const node=d3.select(element).datum(), [x,y]=view.apply([node.x,node.y]);
    const radius=(node.symbol?21:17)*markScale*diskScale*mapSizes.topic;
    const hit=Math.max(22,radius+2)/markScale;
    d3.select(element).select(".station-mark > rect")
      .attr("x",-hit).attr("y",-hit).attr("width",2*hit).attr("height",2*hit).attr("rx",hit);
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
    const {size,lines,w,h,lineHeight}=captionSize(node,compact,growth);
    const vx=radius+4+w/2, vy=radius+4+h/2;
    const offsets=[[0,vy],[0,-vy],[vx,0],[-vx,0],[vx,-vy*.7],[-vx,-vy*.7],
      [vx,vy*.7],[-vx,vy*.7],[w*.28,vy+8],[-w*.28,vy+8],[w*.28,-vy-8],[-w*.28,-vy-8],
      [0,vy+16],[0,-vy-16],
      [vx+13,-h],[-vx-13,-h],[vx+13,h],[-vx-13,h],[w*.45,vy+24],[-w*.45,vy+24],
      [w*.45,-vy-24],[-w*.45,-vy-24],[0,vy+34],[0,-vy-34]];
    let best=null, score=Infinity;
    for(const [index,[offsetX,offsetY]] of offsets.entries()) {
      const dx=nearFit ? Math.max(bounds.left+w/2-x, Math.min(bounds.right-w/2-x,offsetX)) : offsetX;
      const dy=nearFit ? Math.max(bounds.top+h/2-y, Math.min(bounds.bottom-h/2-y,offsetY)) : offsetY;
      const rect=box(x+dx,y+dy,w,h);
      let cost=index*1.5 + .04*(Math.abs(dx-offsetX)+Math.abs(dy-offsetY));
      for(const other of obstacles) cost+=overlap(rect,other)*2;
      for(const other of occupied) cost+=overlap(rect,other)*1.6;
      if(cost<score) {score=cost;best={rect,dx,dy};}
      if(score===0) break;
    }
    // When all nearby slots are busy, find the nearest free space and tether
    // the caption to its symbol. This preserves every label on a narrow phone.
    const busy=[...occupied,...obstacles];
    if(compact && nearFit && busy.some(r=>overlap(best.rect,r)>0)) {
      let found=false;
      for(let distance=radius+12;distance<=Math.max(width,height) && !found;distance+=6) {
        for(let i=0;i<32;i++) {
          const angle=i*Math.PI/16;
          const dx=Math.cos(angle)*distance,dy=Math.sin(angle)*distance;
          const r=box(x+dx,y+dy,w,h);
          if(r.left<bounds.left || r.right>bounds.right || r.top<bounds.top || r.bottom>bounds.bottom) continue;
          if(busy.some(other=>overlap(other,r)>0)) continue;
          best={rect:r,dx,dy};found=true;break;
        }
      }
    }
    occupied.push(best.rect);
    const endX=Math.max(best.rect.left,Math.min(best.rect.right,x))-x;
    const endY=Math.max(best.rect.top,Math.min(best.rect.bottom,y))-y;
    const length=Math.hypot(endX,endY);
    let leader=element.querySelector(".caption-leader");
    if(length>radius+8) {
      if(!leader) leader=d3.select(element.querySelector(".station-mark")).insert("line",":first-child")
        .attr("class","caption-leader").attr("stroke","var(--muted)").attr("stroke-opacity",.55)
        .attr("vector-effect","non-scaling-stroke").attr("pointer-events","none").node();
      d3.select(leader).attr("display",null).attr("x1",endX*radius/length/markScale).attr("y1",endY*radius/length/markScale)
        .attr("x2",endX/markScale).attr("y2",endY/markScale);
    } else if(leader) leader.setAttribute("display","none");
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
