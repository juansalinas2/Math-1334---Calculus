function detailZoom() { return Math.max(.35, Math.min(1.5, fullMapScale()*2)); }
let insideId = null, zoomAnchor = null, orbit = null;
function partSlug(part) {
  return part.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/-$/,"");
}
function focusMark(note) {
  const svg=d3.create("svg:svg").attr("viewBox","-18 -18 36 36").attr("class","focus-mark").attr("aria-hidden","true");
  svg.append("circle").attr("r",16);
  drawMark(svg.datum(note),25);
  return svg.node();
}
function drawInterior(view) {
  const width=viewport.clientWidth, height=viewport.clientHeight;
  let topic=null;
  if (view.k>=detailZoom()) {
    if (selected) topic=byTopic.get(selected);
    else {
      const anchor=zoomAnchor || [width/2,height/2];
      let nearest=78;
      for (const node of stations) {
        const [x,y]=view.apply([node.x,node.y]);
        const distance=Math.hypot(x-anchor[0],y-anchor[1]);
        if(distance<nearest) { nearest=distance; topic=node; }
      }
    }
  }
  const id=topic?.id || null;
  if(id!==insideId) {
    insideId=id;
    const layer=d3.select("#subtopic-orbit").attr("display",id?null:"none");
    if (topic) orbit=buildTopicOrbit(topic);
    else {layer.selectAll("*").remove();orbit=null;}
  }
  if (!orbit) return;
  const rx=Math.min(145,Math.max(80,(width-118)/2)), ry=Math.min(112,Math.max(63,(height-110)/2));
  orbit.layer.attr("transform","translate("+topic.x+","+topic.y+") scale("+1/view.k+")");
  orbit.layer.select("ellipse").attr("rx",rx).attr("ry",ry);
  const angleKey=[width,height].join("/");
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
    const lines=labelLines(d.title,18),w=Math.max(...lines.map(s=>s.length))*6.4+4;
    orbit.obstacles.push(box(cx+x,cy+y,34,34),box(cx+x,cy+y+24+6*lines.length,w,14*lines.length+3));
    return "translate("+x+","+y+")";
  }).attr("aria-pressed",d=>String(selected===id && selectedPart===partSlug(d)));
}
