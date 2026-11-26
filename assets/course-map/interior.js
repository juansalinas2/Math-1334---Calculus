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
  orbit.moons.attr("transform",(_,i)=>"translate("+rx*Math.cos(orbit.angles[i])+","+ry*Math.sin(orbit.angles[i])+")")
    .attr("aria-pressed",d=>String(selected===id && selectedPart===partSlug(d)));
}
