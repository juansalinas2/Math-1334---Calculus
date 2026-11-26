// Coordinate plots used by the graph-reading questions. Each named window is shared by
// every answer to that question so differences in scale never identify the answer.
(() => {
  "use strict";
  const tau = 2*Math.PI;
  const windows = {
    square: {x:[-3,3], y:[-3,3], dx:1, dy:1},
    slopes: {x:[-2,4], y:[-4,6], dx:1, dy:2},
    holes: {x:[-2,4], y:[-2,8], dx:1, dy:2},
    poles: {x:[-4,4], y:[-5,5], dx:1, dy:2},
    spring: {x:[0,tau], y:[-1.5,1.5], dx:Math.PI/2, dy:1, xLabels:["0","π/2","π","3π/2","2π"], horizontal:"t"},
    motion: {x:[0,4], y:[-4,10], dx:1, dy:2, horizontal:"t"},
    shortMotion: {x:[0,3], y:[-3.5,3.5], dx:.5, dy:1, horizontal:"t"},
    cubic: {x:[-2,2], y:[-16,24], dx:1, dy:8},
    hump: {x:[-4,4], y:[-1.55,1.55], dx:1, dy:.5},
    tails: {x:[-4,4], y:[-4,4], dx:1, dy:1}
  };
  const plots = new Map();
  function plot(id,window,description,fn,options={}) {
    plots.set(id,{...options,view:windows[window],description,fn});
  }

  plot("line-hole","holes","Rising line with an open circle at (2, 4).",x=>x+2,{open:[[2,4]]});
  plot("line-intact","holes","Unbroken rising line through (2, 4).",x=>x+2);
  plot("line-redefined","holes","Rising line with an open circle at (2, 4) and a filled point at (2, 7).",x=>x+2,{open:[[2,4]],closed:[[2,7]]});
  plot("line-other-hole","holes","Rising line with an open circle at (0, 2).",x=>x+2,{open:[[0,2]]});
  plot("root-right","square","Curve starts at the origin and rises to the right, bending downward.",x=>Math.sqrt(x),{closed:[[0,0]]});
  plot("root-left","square","Curve in the upper-left quadrant ends at the origin.",x=>Math.sqrt(-x),{closed:[[0,0]]});
  plot("root-low","square","Curve starts at the origin and falls to the right.",x=>-Math.sqrt(x),{closed:[[0,0]]});
  plot("bowl","square","Smooth U-shaped curve with its lowest point at the origin.",x=>x*x);
  plot("corner","square","Two straight rays meet at a V-shaped corner at the origin.",Math.abs);
  plot("sign","square","Horizontal ray at −1 on the left and at 1 on the right, both open at x = 0.",Math.sign,{breaks:[0],open:[[0,-1],[0,1]]});
  plot("neg-sign","square","Horizontal ray at 1 on the left and at −1 on the right, both open at x = 0.",x=>-Math.sign(x),{breaks:[0],open:[[0,1],[0,-1]]});
  plot("rising-origin","square","Rising line through the origin and (1, 1).",x=>x);
  plot("slope-two","square","Rising line through the origin and (1, 2).",x=>2*x);
  plot("slope-neg-two","square","Falling line through the origin and (1, −2).",x=>-2*x);
  plot("square-derivative","square","Upward parabola touching the origin and passing through (1, 3).",x=>3*x*x);
  plot("negative-bowl","square","Downward parabola touching the origin and passing through (1, −3).",x=>-3*x*x);
  plot("cubic-raised","square","An increasing S-curve that flattens at (0, 1).",x=>x*x*x+1);

  plot("arch","slopes","Downward parabola crossing the horizontal axis at 0 and 3.",x=>3*x-x*x);
  plot("down-intercept","slopes","Falling line crossing the vertical axis at 3 and the horizontal axis at 1.5.",x=>3-2*x);
  plot("up-intercept","slopes","Rising line crossing the vertical axis at −3 and the horizontal axis at 1.5.",x=>2*x-3);
  plot("down-origin","slopes","Falling line through the origin with slope −2.",x=>-2*x);
  plot("below","slopes","Horizontal line two units below the x-axis.",()=>-2);
  plot("above","slopes","Horizontal line two units above the x-axis.",()=>2);
  plot("on-axis","slopes","Horizontal line along the x-axis.",()=>0);

  const pole = {breaks:[-1],vertical:[-1]};
  plot("inverse","poles","At x = −1 the left branch approaches negative infinity and the right branch approaches positive infinity.",x=>1/(x+1),pole);
  plot("inverse-neg","poles","Branches approach positive infinity on the left of −1 and negative infinity on its right.",x=>-1/(x+1),pole);
  plot("inverse-square","poles","Both branches rise above the axis toward positive infinity at −1.",x=>1/(x+1)**2,pole);
  plot("inverse-neg-square","poles","Both branches fall below the axis toward negative infinity at −1.",x=>-1/(x+1)**2,pole);
  plot("up-saturate","poles","Increasing branches approach x = −1 and y = 1. The right branch passes through the origin.",x=>x/(x+1),{...pole,horizontal:[1]});
  plot("down-saturate","poles","Decreasing branches approach x = −1 and y = 1. The right branch passes through (0, 2).",x=>1+1/(x+1),{...pole,horizontal:[1]});
  plot("right-pole","poles","Branches approach x = 1 and y = 1. The left branch passes through the origin.",x=>x/(x-1),{breaks:[1],vertical:[1],horizontal:[1]});
  plot("negative-tail","poles","Decreasing branches approach x = −1 and y = −1, crossing at the origin.",x=>-x/(x+1),{...pole,horizontal:[-1]});

  plot("sin","spring","A wave starts at 0, rises to 1 at π/2, then dips to −1 at 3π/2.",Math.sin);
  plot("neg-sin","spring","A wave starts at 0, dips to −1 at π/2, then peaks at 1 at 3π/2.",x=>-Math.sin(x));
  plot("cos","spring","A wave starts at 1 and reaches −1 at π.",Math.cos);
  plot("neg-cos","spring","A wave starts at −1 and reaches 1 at π.",x=>-Math.cos(x));

  plot("speed-v","shortMotion","A V starts at height 3, touches zero at t = 1.5, and ends at height 3.",x=>Math.abs(3-2*x));
  plot("velocity-fall","shortMotion","A falling line starts at height 3 and ends at −3.",x=>3-2*x);
  plot("velocity-rise","shortMotion","A rising line starts at −3 and ends at 3.",x=>2*x-3);
  plot("position-arch","shortMotion","An arch starts and ends at zero, with its peak at t = 1.5.",x=>3*x-x*x);
  plot("cubic-position","motion","A curve rising to (1, 6), falling to (3, 2), then rising again.",x=>x**3-6*x*x+9*x+2);
  plot("velocity-bowl","motion","An upward parabola with zeros at 1 and 3 and a low point at (2, −3).",x=>3*(x-1)*(x-3));
  plot("velocity-cap","motion","A downward parabola with zeros at 1 and 3 and a high point at (2, 3).",x=>-3*(x-1)*(x-3));
  plot("acceleration-line","motion","A rising line crossing the horizontal axis at 2.",x=>6*x-12);

  plot("extrema-cubic","cubic","Cubic rising to (−1, 20), falling to (1, 4), then rising.",x=>4*x**3-12*x+12);
  plot("extrema-slopes","cubic","Upward parabola crossing at −1 and 1 with a minimum at (0, −12).",x=>12*x*x-12);
  plot("extrema-neg-slopes","cubic","Downward parabola crossing at −1 and 1 with a maximum at (0, 12).",x=>12-12*x*x);
  plot("extrema-tangent","cubic","A rising straight line crossing the origin.",x=>24*x);
  plot("extrema-shift","cubic","Upward parabola with a minimum at (0, 12), above the x-axis.",x=>12*x*x+12);

  plot("bell","hump","Single positive, symmetric hump centered on the y-axis; both tails approach zero.",x=>4/(x*x+3));
  plot("bell-low","hump","Single negative, symmetric trough centered on the y-axis; both tails approach zero.",x=>-4/(x*x+3));
  plot("bell-slope","hump","One positive lobe on the left followed by a negative lobe on the right, crossing the origin.",x=>-8*x/(x*x+3)**2);
  plot("bell-neg-slope","hump","One negative lobe on the left followed by a positive lobe on the right, crossing the origin.",x=>8*x/(x*x+3)**2);

  plot("slant-smooth","tails","An increasing curve through the origin with a flat tangent there and tails approaching y = x.",x=>x**3/(1+x*x),{oblique:[1,0]});
  plot("slant-pole","tails","Two increasing branches approach x = 0 and y = x. Both cross the x-axis.",x=>x-1/x,{breaks:[0],vertical:[0],oblique:[1,0]});
  plot("slant-pole-plus","tails","Two branches separated at x = 0 approach y = x and never cross the x-axis.",x=>x+1/x,{breaks:[0],vertical:[0],oblique:[1,0]});
  plot("slant-negative","tails","A decreasing curve through the origin with a flat tangent there and tails approaching y = −x.",x=>-(x**3)/(1+x*x),{oblique:[-1,0]});

  const pairs = {breaks:[-1,1],vertical:[-1,1]};
  plot("even-three","poles","Two outer branches sit above y = 2. Between the poles the middle branch peaks at the origin.",x=>2*x*x/(x*x-1),{...pairs,horizontal:[2]});
  plot("even-mirror","poles","Two outer branches sit below y = −2. The central branch bottoms at the origin.",x=>-2*x*x/(x*x-1),{...pairs,horizontal:[-2]});
  plot("even-no-pole","poles","A smooth even valley touches the origin; its two tails approach y = 2 from below.",x=>2*x*x/(x*x+1),{horizontal:[2]});
  plot("even-swap","poles","Outer branches approach y = 2 from below. The central branch has its minimum at (0, 4).",x=>2-2/(x*x-1),{...pairs,horizontal:[2]});
  plot("exponential","square","A positive increasing curve passes through (0, 1), close to zero on the left.",Math.exp);
  plot("exponential-reverse","square","A positive decreasing curve passes through (0, 1), close to zero on the right.",x=>Math.exp(-x));
  plot("log","square","An increasing curve for positive x, crossing (1, 0), dropping without bound near zero.",Math.log,{breaks:[0]});
  plot("log-neg","square","A decreasing curve for positive x, crossing (1, 0), rising without bound near zero.",x=>-Math.log(x),{breaks:[0]});

  const ns = "http://www.w3.org/2000/svg";
  const paper = "#13212c", grid = "#344854", ink = "#d4e5ea", curve = "#77e7cc", guide = "#f5ba70";
  function svg(tag,attrs) {
    const node = document.createElementNS(ns,tag);
    for (const [name,value] of Object.entries(attrs)) node.setAttribute(name,value);
    return node;
  }
  function ticks(range,step) {
    const first = Math.ceil(range[0]/step), last = Math.floor(range[1]/step);
    return Array.from({length:last-first+1},(_,i)=>(first+i)*step);
  }
  function format(value) {
    return String(Number(value.toFixed(2))).replace("-", "−");
  }
  window.gameGraph = function(id) {
    const plot=plots.get(id);
    if (!plot) return null;
    const {x,y,dx,dy,xLabels,horizontal="x"}=plot.view;
    const w=220,h=118,left=26,top=13;
    const px = v => w*(v-x[0])/(x[1]-x[0]);
    const py = v => h*(y[1]-v)/(y[1]-y[0]);
    const root=svg("svg",{viewBox:"0 0 260 154",role:"img","aria-label":plot.description,"class":"game-graph",focusable:"false"});
    root.style.cssText="display:block;width:100%;height:auto;max-width:32rem;margin:.25rem auto;flex:none;";
    const title=svg("title",{});title.textContent=plot.description;root.append(title);
    root.append(svg("rect",{x:0,y:0,width:260,height:154,rx:8,fill:paper}));
    const chart=svg("svg",{x:left,y:top,width:w,height:h,viewBox:"0 0 "+w+" "+h,overflow:"hidden"});
    root.append(chart);
    const line=(x1,y1,x2,y2,color,width=1,dash="")=>chart.append(svg("line",{x1,y1,x2,y2,stroke:color,"stroke-width":width,"stroke-dasharray":dash}));
    function label(x,y,value,anchor) {
      const node=svg("text",{x,y,fill:ink,"font-family":"system-ui,sans-serif","font-size":11.5,"text-anchor":anchor});
      node.textContent=value;root.append(node);
    }
    ticks(x,dx).forEach((n,i)=>{
      line(px(n),0,px(n),h,grid);
      label(left+px(n),top+h+15,xLabels?.[i]??format(n),"middle");
    });
    for (const n of ticks(y,dy)) {
      line(0,py(n),w,py(n),grid);
      label(left-5,top+py(n)+4,format(n),"end");
    }
    line(0,py(0),w,py(0),ink,1.1);line(px(0),0,px(0),h,ink,1.1);
    label(left+w+6,top+py(0)+4,horizontal,"start");label(left+px(0),10,"y","middle");
    for (const v of plot.vertical??[]) line(px(v),0,px(v),h,guide,1.2,"4 4");
    for (const v of plot.horizontal??[]) line(0,py(v),w,py(v),guide,1.2,"4 4");
    if (plot.oblique) {
      const [m,b]=plot.oblique;line(0,py(m*x[0]+b),w,py(m*x[1]+b),guide,1.2,"4 4");
    }
    // Sample each continuous branch separately. Never join opposite sides of an asymptote.
    const edges=[x[0],...(plot.breaks??[]).filter(v=>v>x[0]&&v<x[1]),x[1]];
    for(let j=1;j<edges.length;j++) {
      const lo=edges[j-1],hi=edges[j],n=Math.ceil((px(hi)-px(lo))*1.5);
      const commands=[];
      let drawing=false;
      for(let i=0;i<=n;i++) {
        // Approach an excluded endpoint from the inside even for a finite jump.
        const fraction=i===0&&j>1 ? .001/n : i===n&&j<edges.length-1 ? 1-.001/n : i/n;
        const u=lo+(hi-lo)*fraction, v=plot.fn(u);
        if (!Number.isFinite(v)) {drawing=false;continue;}
        const screenY=Math.max(-2*h,Math.min(3*h,py(v)));
        commands.push((drawing?"L":"M")+px(u).toFixed(2)+" "+screenY.toFixed(2));
        drawing=true;
      }
      chart.append(svg("path",{d:commands.join(" "),fill:"none",stroke:curve,"stroke-width":2.6,"stroke-linejoin":"round","stroke-linecap":"round"}));
    }
    for(const [points,fill] of [[plot.open??[],paper],[plot.closed??[],curve]]) {
      for(const [u,v] of points) chart.append(svg("circle",{cx:px(u),cy:py(v),r:4,fill,stroke:curve,"stroke-width":2.2}));
    }
    return root;
  };
})();
