// Subtopics share the same SVG and camera as their parent and its neighbors.
function labelLines(title, limit) {
  const lines = [];
  for (const word of title.split(/\s+/)) {
    const last = lines.length-1;
    if (last>=0 && lines[last].length+word.length+1<=limit) lines[last]+=" "+word;
    else lines.push(word);
  }
  return lines;
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
  moons.append("circle").attr("r",23).attr("fill","transparent");
  moons.append("circle").attr("class","moon-disc").attr("r",15);
  drawMark(moons,21);
  moons.each(function(d) {
    const label=d3.select(this).append("text").attr("text-anchor","middle").attr("y",29);
    for(const [i,line] of labelLines(d.title,18).entries()) label.append("tspan").attr("x",0).attr("dy",i?"1.08em":"0").text(line);
  });
  return {layer,moons,angles};
}
