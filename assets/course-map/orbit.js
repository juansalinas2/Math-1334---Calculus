// Subtopics share the same SVG and camera as their parent and its neighbors.
const orbitTextMetrics = document.createElement("canvas").getContext("2d");
function orbitCaption(title, width) {
  const factor = mapSizes.subtopic;
  orbitTextMetrics.font = "600 12px system-ui";
  const limit = Math.max(54, Math.min(140, width / 3) / factor);
  const measure = text => orbitTextMetrics.measureText(text).width;
  const lines = [];
  for (const word of title.split(/\s+/)) {
    const last = lines.length - 1;
    if (last >= 0 && measure(lines[last] + " " + word) <= limit) lines[last] += " " + word;
    else lines.push(word);
  }
  return {lines, width:Math.ceil(Math.max(...lines.map(measure))*factor)+6,
    height:(13+(lines.length-1)*12*1.08)*factor+3};
}
function orbitRadii(width, height, topic) {
  const factor = mapSizes.subtopic;
  const layoutKey = [width, factor].join("/");
  if (orbit.layoutKey !== layoutKey) {
    for (const part of topic.parts) {
      const item = orbit.labels.get(part);
      item.metrics = orbitCaption(part.title,width);
      item.label.selectAll("tspan").data(item.metrics.lines).join("tspan")
        .attr("x",0).attr("dy",(_,i)=>i?"1.08em":0).text(line=>line);
    }
    orbit.layoutKey = layoutKey;
  }
  orbit.radii = {
    rx:Math.max(46,Math.min(145*factor,width*.44,(width-44*factor)/2)),
    ry:Math.max(40,Math.min(112*factor,height*.35,(height-65*factor)/2)),
  };
  return orbit.radii;
}
function orbitObstacles(part, cx, cy, x, y) {
  const factor = mapSizes.subtopic, centerX=cx+x, centerY=cy+y;
  const {label,leader,metrics} = orbit.labels.get(part);
  const width=viewport.clientWidth, height=viewport.clientHeight;
  const w=metrics.width,h=metrics.height, gap=19*factor;
  const dx=w/2+gap, dy=h/2+gap;
  // Keep enlarged captions near their own symbol, within the screen, and
  // out of the path of the other satellites, including ones still to draw.
  const occupied = [box(cx,cy,44*mapSizes.topic,44*mapSizes.topic), ...orbit.obstacles];
  for (const angle of orbit.angles) {
    const a=angle+orbit.rotation;
    occupied.push(box(cx+orbit.radii.rx*Math.cos(a),cy+orbit.radii.ry*Math.sin(a),34*factor,34*factor));
  }
  let best, cost=Infinity;
  for (const [i,[offsetX,offsetY]] of [[0,dy],[0,-dy],[dx,0],[-dx,0],
    [w*.35,dy],[-w*.35,dy],[w*.35,-dy],[-w*.35,-dy]].entries()) {
    let tx=centerX+offsetX,ty=centerY+offsetY;
    if (centerX>=0 && centerX<=width) tx=Math.max(w/2+3,Math.min(width-w/2-3,tx));
    if (centerY>=0 && centerY<=height) ty=Math.max(h/2+3,Math.min(height-h/2-3,ty));
    const rect=box(tx,ty,w,h);
    const drift=Math.abs(tx-centerX-offsetX)+Math.abs(ty-centerY-offsetY);
    const score=i+drift*.12+occupied.reduce((sum,r)=>sum+overlap(rect,r),0);
    if (score<cost) {best={tx,ty,rect};cost=score;}
    if (score===0) break;
  }
  if (occupied.some(r=>overlap(best.rect,r)>0) &&
      centerX>=0 && centerX<=width && centerY>=0 && centerY<=height) {
    // In a crowded orbit, every gap has an edge on a label, symbol, or the viewport.
    const xs=[centerX,w/2+2,width-w/2-2], ys=[centerY,h/2+2,height-h/2-2];
    for (const r of occupied) {
      xs.push(r.left-w/2-1,r.right+w/2+1); ys.push(r.top-h/2-1,r.bottom+h/2+1);
    }
    let nearest=Infinity;
    for (const tx of xs) for (const ty of ys) {
      const rect=box(tx,ty,w,h);
      const distance=(tx-centerX)**2+(ty-centerY)**2;
      if (distance>=nearest || rect.left<1 || rect.top<1 || rect.right>width-1 || rect.bottom>height-1) continue;
      if (occupied.some(r=>overlap(rect,r)>0)) continue;
      best={tx,ty,rect}; nearest=distance;
    }
  }
  const anchorX=Math.max(best.rect.left,Math.min(best.rect.right,centerX))-centerX;
  const anchorY=Math.max(best.rect.top,Math.min(best.rect.bottom,centerY))-centerY;
  leader.attr("x2",anchorX/factor).attr("y2",anchorY/factor)
    .attr("display",Math.hypot(anchorX,anchorY)>gap+6?null:"none");
  label.attr("transform","translate("+(best.tx-centerX)/factor+","+((best.ty-centerY-h/2)/factor+10)+")");
  return [box(centerX,centerY,34*factor,34*factor),best.rect];
}
function buildTopicOrbit(topic) {
  const layer=d3.select("#subtopic-orbit");
  layer.selectAll("*").remove();
  layer.style("--accent",families[topic.family].color).attr("aria-label","Subtopics of "+topic.title);
  layer.append("ellipse").attr("class","moon-track");
  const angles=topic.parts.map((_,i)=>-Math.PI/2+2*Math.PI*i/topic.parts.length);
  const moons=layer.selectAll("g").data(topic.parts).join("g").attr("class","map-moon")
    .attr("role","button").attr("tabindex",0).attr("aria-label",d=>d.title)
    .on("click",(e,d)=>{if(!e.defaultPrevented)showTopic(topic.id,partSlug(d));})
    .on("keydown",(e,d)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();showTopic(topic.id,partSlug(d));}});
  moons.append("title").text(d=>d.title);
  const faces=moons.append("g").attr("class","moon-face");
  const labels = new Map();
  faces.append("line").attr("class","moon-leader").each(function(part) {
    labels.set(part,{leader:d3.select(this)});
  });
  faces.append("circle").attr("r",23).attr("fill","transparent");
  faces.append("circle").attr("class","moon-disc").attr("r",15);
  drawMark(faces,21);
  faces.append("text").attr("text-anchor","middle").each(function(part) {
    labels.get(part).label=d3.select(this);
  });
  return {layer,moons,angles,labels,obstacles:[],angleKey:"",rotation:0};
}
