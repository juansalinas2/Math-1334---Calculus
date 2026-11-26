// Scale thresholds are relative to fitting the entire graph, on every screen.
const landscapeBounds = {left:-185, top:-102, width:1840, height:1084};
let mapBounds = landscapeBounds, courseCenterFit = [735,440], portrait = false;
const sourcePositions = new Map(stations.map(n=>[n.id,[n.x,n.y]]));
const courseFloor = .085, courseEdge = .105, groupFloor = .17;
const groupEdge = .26, unfoldEdge = .42;
const representatives = {foundations:"unitcircle", limits:"limit", differentiation:"derivative", shape:"concavity", applications:"optimization"};
const systems = document.getElementById("systems");
const systemNodes = document.getElementById("system-nodes");
const systemLines = d3.select("#system-lines");
const familiesOnMap = new Map();
let rootBody, locatorWindow, locatorFocus, wasFolding = false;

// Transpose the diagram on tall screens and keep every symbol and caption upright.
function orientMap() {
  const main = document.querySelector("main");
  const tall = main.clientWidth < 1000 && main.clientHeight > main.clientWidth*1.18;
  if (tall === portrait) return false;
  portrait = tall;
  const b = landscapeBounds;
  mapBounds = tall ? {left:b.top,top:b.left,width:b.height,height:b.width} : b;
  courseCenterFit = [mapBounds.left + mapBounds.width/2,mapBounds.top + mapBounds.height/2];
  for (const n of stations) {
    const [x,y]=sourcePositions.get(n.id);
    n.x=tall?y:x; n.y=tall?x:y;
  }
  for (const group of familiesOnMap.values()) group.center=[d3.mean(group.topics,n=>n.x),d3.mean(group.topics,n=>n.y)];
  return true;
}
orientMap();
function fullMapScale() {
  const main = document.querySelector("main");
  return Math.max(.08, Math.min(1.25, (main.clientWidth-18)/mapBounds.width, (main.clientHeight-96)/mapBounds.height));
}
function blend(low, high, value) {
  const t = Math.max(0, Math.min(1, (value-low)/(high-low)));
  return t*t*(3-2*t);
}
function groupScale() { return fullMapScale() * .22; }
function courseScale() { return fullMapScale() * courseFloor; }
function bodyButton(id, label, count, note, color, open) {
  const button = el("button", "", "cluster-button");
  button.type = "button";
  button.dataset.systemId = id;
  button.style.setProperty("--accent", color);
  button.setAttribute("aria-label", label + ", " + count + ". Explore");
  const face = el("span", "", "cluster-symbol aggregate-mark");
  face.append(focusMark(note));
  button.append(face, el("span", label, "cluster-label"), el("span", count, "cluster-count"));
  button.onclick = event => { if (!event.defaultPrevented) open(); };
  systemNodes.append(button);
  return button;
}
function placeBody(button, point, opacity) {
  const active = opacity >= .5;
  button.hidden = opacity <= .001;
  button.inert = !active;
  button.style.pointerEvents = active ? "auto" : "none";
  button.style.opacity = opacity;
  button.style.transform = "translate(" + point[0] + "px," + point[1] + "px) translate(-50%,-50%)";
}
function initializeSystems() {
  const coords = {foundations:[-.72,.52], limits:[-.64,-.64], differentiation:[.15,-.98], shape:[.90,-.12], applications:[.56,.77]};
  for (const [id, group] of Object.entries(families)) {
    const topics = stations.filter(n=>n.family===id);
    const center = [d3.mean(topics,n=>n.x), d3.mean(topics,n=>n.y)];
    const button = bodyButton(id, group.label, topics.length + " topics", byTopic.get(representatives[id]), group.color, ()=>overview(id));
    familiesOnMap.set(id, {topics, center, offset:coords[id], button});
  }
  rootBody = bodyButton("calculus", "Calculus", familiesOnMap.size + " topic groups", byTopic.get("derivative"), "var(--family-calculus)", ()=>overview("all",false,false,groupScale()));
  refreshLocator();
  const navigator = d3.select("#locator-plot");
  locatorFocus = navigator.append("circle").attr("r",44).attr("class","locator-focus");
  locatorWindow = navigator.append("rect").attr("class","locator-window");
  byId("locator").onclick = ()=>overview();
}
function refreshLocator() {
  const diagram = d3.select("#locator-plot").attr("viewBox",[mapBounds.left,mapBounds.top,mapBounds.width,mapBounds.height].join(" "));
  diagram.selectAll("line").data(connections.filter(e=>!e.onSelection)).join("line")
    .attr("x1",e=>byTopic.get(e.source).x).attr("y1",e=>byTopic.get(e.source).y)
    .attr("x2",e=>byTopic.get(e.target).x).attr("y2",e=>byTopic.get(e.target).y);
  diagram.selectAll(".locator-node").data(stations).join("circle").attr("class","locator-node")
    .attr("cx",d=>d.x).attr("cy",d=>d.y).attr("r",d=>d.symbol?30:23).attr("fill",d=>families[d.family].color);
}
function familyFrame(key) {
  const {topics} = familiesOnMap.get(key);
  const xs=topics.map(n=>n.x), ys=topics.map(n=>n.y);
  const width = d3.max(xs)-d3.min(xs)+215, height = d3.max(ys)-d3.min(ys)+155;
  const fit = Math.min(viewport.clientWidth/width,viewport.clientHeight/height);
  move((d3.min(xs)+d3.max(xs))/2,(d3.min(ys)+d3.max(ys))/2,Math.max(fullMapScale()*1.12,Math.min(1.4,fit)));
}
function drawLocator(view, fit) {
  const button = byId("locator");
  const center = view.invert([viewport.clientWidth/2,viewport.clientHeight/2]);
  const far = Math.abs(center[0]-courseCenterFit[0])>mapBounds.width*.12 || Math.abs(center[1]-courseCenterFit[1])>mapBounds.height*.12;
  button.hidden = !(view.k > fit*1.28 || (view.k >= fit*.8 && far));
  if (button.hidden) return;
  const active=byTopic.get(insideId || selected);
  locatorFocus.attr("display",active?null:"none");
  if(active) locatorFocus.attr("cx",active.x).attr("cy",active.y);
  const [x,y]=view.invert([0,0]);
  locatorWindow.attr("x",x).attr("y",y).attr("width",viewport.clientWidth/view.k).attr("height",viewport.clientHeight/view.k);
}
function drawSystem(view) {
  const fit=fullMapScale(), level=view.k/fit;
  const topicWeight=blend(groupEdge,unfoldEdge,level);
  const groupWeight=blend(courseEdge,groupFloor,level);
  const folding=topicWeight<1;
  const width=viewport.clientWidth, height=viewport.clientHeight;
  const tier = topicWeight>=.5 ? (insideId ? "detail":"topics") : groupWeight>=.5 ? "groups":"course";
  if (document.body.dataset.level!==tier) {
    document.body.dataset.level=tier;
    byId("map-level").textContent={course:"Calculus",groups:"5 topic groups",topics:stations.length+" concepts",detail:"Subtopics"}[tier];
    const touch=matchMedia("(pointer: coarse)").matches;
    document.querySelector(".gesture-hint").textContent={
      course:"Open Calculus to explore", groups:"Choose a group to explore",
      topics:touch?"Drag to pan · Pinch to zoom":"Drag to pan · Scroll to zoom", detail:"Select a subtopic to read"
    }[tier];
  }
  byId("exit-path").hidden=!selected && family==="all" && !insideId;
  drawLocator(view,fit);
  if (!folding && !wasFolding) return;
  systems.hidden=!folding;
  if (folding) {
    const mid=[width/2,height/2], rx=Math.max(65,Math.min(445,width*.5-(width<640?62:107))), ry=Math.max(45,Math.min(230,height*.48-41));
    const offsets = width<640 ? [[-.92,.6],[-.91,-.52],[0,-1],[.91,-.31],[.83,.70]] : null;
    const worldPositions=new Map();
    let i=0;
    for (const group of familiesOnMap.values()) {
      const off=offsets?.[i++] || group.offset;
      const groupPosition=[mid[0]+rx*off[0]*groupWeight,mid[1]+ry*off[1]*groupWeight];
      const mapPosition=view.apply(group.center);
      const screen=groupPosition.map((x,j)=>x+(mapPosition[j]-x)*topicWeight);
      placeBody(group.button, screen, (1-topicWeight)*groupWeight);
      const clump=view.invert(groupPosition);
      for (const node of group.topics) worldPositions.set(node.id,{x:clump[0]+(node.x-clump[0])*topicWeight,y:clump[1]+(node.y-clump[1])*topicWeight});
    }
    placeBody(rootBody,mid,1-groupWeight);
    systemLines.attr("viewBox","0 0 "+width+" "+height);
    systemLines.selectAll("ellipse").data([.67,1]).join("ellipse").attr("class","system-orbit")
      .attr("cx",mid[0]).attr("cy",mid[1]).attr("rx",r=>r*rx*(.58+.42*groupWeight))
      .attr("ry",r=>r*ry*(.58+.42*groupWeight)).attr("opacity",.48*(1-topicWeight));
    stops.attr("transform",d=>{const p=worldPositions.get(d.id);return "translate("+p.x+","+p.y+")";});
    tracks.attr("d",e=>trackPath(e,worldPositions));
  } else {
    stops.attr("transform",d=>"translate("+d.x+","+d.y+")");
    tracks.attr("d",e=>trackPath(e));
  }
  world.attr("opacity",topicWeight).attr("visibility",topicWeight===0?"hidden":null)
    .attr("aria-hidden",topicWeight<.5?"true":null);
  stops.attr("tabindex",topicWeight<.5?-1:0).style("pointer-events",topicWeight<.5?"none":null);
  wasFolding=folding;
}
