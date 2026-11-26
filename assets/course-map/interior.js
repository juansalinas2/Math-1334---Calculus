function detailZoom() {
  const touch = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  return touch
    ? Math.min(2.95, Math.max(1.70/(portrait ? portraitSpacing.y : 1), fullMapScale() * 4.75))
    : Math.min(2.75, Math.max(1.55, fullMapScale() * 3.1));
}
function topicZoom() {
  return Math.min(detailZoom() * .72, Math.max(.85, fullMapScale() * 1.85));
}
let insideId = null, zoomAnchor = null, zoomStation = null, orbit = null;
function partSlug(part) {
  return part.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/-$/,"");
}
function focusMark(note) {
  const svg=d3.create("svg:svg").attr("viewBox","-18 -18 36 36").attr("class","focus-mark").attr("aria-hidden","true");
  svg.append("circle").attr("r",16);
  drawMark(svg.datum(note),25);
  return svg.node();
}
function detailTopicAt(view, anchor) {
  const width=viewport.clientWidth, height=viewport.clientHeight;
  let closest=null, best=Infinity;
  for (const node of stations) {
    const [x,y]=view.apply([node.x,node.y]);
    if (x<0 || x>width || y<0 || y>height) continue;
    if (node.id===zoomStation || (cameraMode==="selected" && node.id===selected)) return node;
    // Favor the current orbit in a close call while dragging between notes.
    const distance=Math.hypot(x-anchor[0],y-anchor[1])-(node.id===insideId?24:0);
    if (distance<best) { best=distance; closest=node; }
  }
  return closest;
}
function drawInterior(view) {
  const width=viewport.clientWidth, height=viewport.clientHeight;
  // A little slack keeps the orbit steady during a two-finger pinch.
  const topic = view.k >= detailZoom() * (insideId ? .93 : 1)
    ? detailTopicAt(view, zoomAnchor || [width/2,height/2]) : null;
  const id=topic?.id || null;
  if(id!==insideId) {
    insideId=id;
    const layer=d3.select("#subtopic-orbit").attr("display",id?null:"none");
    if (topic) orbit=buildTopicOrbit(topic);
    else {layer.selectAll("*").remove();orbit=null;}
  }
  if (!orbit) return;
  const {rx,ry}=orbitRadii(width,height,topic);
  orbit.layer.attr("transform","translate("+topic.x+","+topic.y+") scale("+1/view.k+")");
  orbit.layer.select("ellipse").attr("rx",rx).attr("ry",ry);
  const angleKey=[width,height,mapSizes.subtopic].join("/");
  if (orbit.angleKey!==angleKey) {
    const neighborPoints=stations.filter(n=>n!==topic).map(n=>[(n.x-topic.x)*view.k,(n.y-topic.y)*view.k])
      .filter(([x,y])=>Math.abs(x)<rx+145 && Math.abs(y)<ry+85);
    // Pick a free arc once. Satellites then stay on that arc while zooming or panning.
    const separation=2*Math.PI/topic.parts.length;
    let least=Infinity;
    for(let i=0;i<16;i++) {
      const angle=(i%2?1:-1)*Math.ceil(i/2)*separation/16;
      let cost=i*.1;
      for (const a of orbit.angles) {
        const x=rx*Math.cos(a+angle),y=ry*Math.sin(a+angle);
        for(const [nx,ny] of neighborPoints) {
          cost+=Math.max(0,64-Math.hypot(x-nx,y-ny))**2;
          cost+=Math.max(0,54-Math.hypot((x-nx)*.73,y+32-ny))**2;
        }
      }
      if(cost<least) { least=cost;orbit.rotation=angle; }
    }
    orbit.angleKey=angleKey;
  }
  const [cx,cy]=view.apply([topic.x,topic.y]);
  orbit.obstacles=[];
  orbit.moons.attr("transform",(d,i)=>{
    const a=orbit.angles[i]+orbit.rotation,x=rx*Math.cos(a),y=ry*Math.sin(a);
    orbit.obstacles.push(...orbitObstacles(d,cx,cy,x,y));
    return "translate("+x+","+y+")";
  }).attr("aria-pressed",d=>String(selected===id && selectedPart===partSlug(d)));
}
