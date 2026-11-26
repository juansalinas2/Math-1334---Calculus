// Coordinate plots used by the graph-reading questions. Each named window is shared by
// every answer to that question so differences in scale never identify the answer.
(() => {
  "use strict";
  const tau = 2*Math.PI;
  const windows = {
    pinch: {x:[-2,4], y:[0,10], dx:1, dy:2},
    local: {x:[-2,4], y:[-3,6], dx:1, dy:1},
    restrictedBowl: {x:[-0.5,2.5], y:[-0.5,1.5], dx:0.5, dy:0.5},
    objectiveSlope: {x:[-1,7], y:[-7,7], dx:1, dy:2},
    ladder: {x:[-1,9], y:[-1,9], dx:2, dy:2, equalUnits:true},
    objective: {x:[-1,7], y:[-2,10], dx:1, dy:2},
    circle: {x:[-1,6], y:[-1,6], dx:1, dy:1, equalUnits:true},
    slopeField: {x:[-2,3], y:[-3,6], dx:1, dy:1},
    triangle: {x:[-2,14], y:[-2,10], dx:2, dy:2},
    square: {x:[-3,3], y:[-3,3], dx:1, dy:1},
    slopes: {x:[-2,4], y:[-4,6], dx:1, dy:2},
    holes: {x:[-2,4], y:[-1,8], dx:1, dy:1},
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
  plot("line-intact","holes","Unbroken rising line through (0, 2) and (2, 4).",x=>x+2);
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
  plot("inverse","poles","A dashed vertical guide passes through x = −1. The left branch falls without bound and the right branch rises without bound as they approach the guide.",x=>1/(x+1),pole);
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

  plot("extrema-cubic","cubic","Cubic with marked turning points. It rises to (−1, 20), falls to (1, 4), then rises.",x=>4*x**3-12*x+12,{closed:[[-1,20],[1,4]]});
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
  plot("even-three","poles","Dashed asymptotes at x = −1, x = 1 and y = 2. The outer branches approach 2 from above. Between the vertical guides, the middle branch peaks at the origin.",x=>2*x*x/(x*x-1),{...pairs,horizontal:[2]});
  plot("even-mirror","poles","Dashed asymptotes at x = −1, x = 1 and y = −2. The outer branches approach −2 from below. Between the vertical guides, the middle branch bottoms at the origin.",x=>-2*x*x/(x*x-1),{...pairs,horizontal:[-2]});
  plot("even-no-pole","poles","A smooth even valley touches the origin; its two tails approach y = 2 from below.",x=>2*x*x/(x*x+1),{horizontal:[2]});
  plot("even-swap","poles","Outer branches approach y = 2 from below. The central branch has its minimum at (0, 4).",x=>2-2/(x*x-1),{...pairs,horizontal:[2]});
  plot("exponential","square","A positive increasing curve passes through (0, 1), close to zero on the left.",Math.exp);
  plot("exponential-reverse","square","A positive decreasing curve passes through (0, 1), close to zero on the right.",x=>Math.exp(-x));
  plot("log","square","An increasing curve for positive x, crossing (1, 0), dropping without bound near zero.",Math.log,{breaks:[0]});
  plot("log-neg","square","A decreasing curve for positive x, crossing (1, 0), rising without bound near zero.",x=>-Math.log(x),{breaks:[0]});

  // Comparison lines are dashed; both curves and exact marked points have text alternatives.
  const between=(x,a,b)=> x>=a && x<=b;
  const closeBowl=x=>(x-1)**2;
  plot("closed-small-bowl","restrictedBowl","The curve descends from a filled endpoint (0, 1) to (1, 0) and rises to another filled endpoint (2, 1).",closeBowl,{domain:[0,2],closed:[[0,1],[2,1]]});
  plot("open-small-bowl","restrictedBowl","The curve descends from an open endpoint (0, 1) to (1, 0) and rises to another open endpoint (2, 1). The bottom is included.",closeBowl,{domain:[0,2],open:[[0,1],[2,1]]});
  plot("ladder-at-six","ladder","A ladder joins its top against the wall at (0, 8) to its foot on the ground at (6, 0). An arrow points right from the foot.",x=>8-4*x/3,{domain:[0,6],closed:[[0,8],[6,0]],segments:[[6.3,0,8.1,0],[8.1,0,7.6,0.3],[8.1,0,7.6,-0.3]]});
  plot("step-mark","local","A horizontal branch at height 3 ends with an open circle at (1, 3). The branch at height −1 begins with a filled point at (1, −1).",x=>x<1?3:-1,{breaks:[1],open:[[1,3]],closed:[[1,-1]]});
  plot("open-peak","local","A tent rises from (−1, 0) toward the open point (1, 4), then falls to (3, 0). Both endpoints are filled. A separate filled dot is at (1, 1).",x=>4-2*Math.abs(x-1),{domain:[-1,3],open:[[1,4]],closed:[[-1,0],[3,0],[1,1]]});
  plot("ivt-path","local","A continuous curve with filled endpoints (0, −2) and (3, 4), rising throughout and crossing the horizontal axis.",x=>(x+x*x)/2-2,{domain:[0,3],closed:[[0,-2],[3,4]]});
  plot("squeeze-five","pinch","The two enclosing parabolas meet at (1, 5). A solid curve lies between the dashed bounds.",x=>5+(x-1)**2*Math.sin(4*x),{overlays:[x=>5-(x-1)**2,x=>5+(x-1)**2],closed:[[1,5]]});
  plot("squeeze-zero","square","A wavy solid curve stays between dashed curves y = x squared and y = negative x squared. All meet at the origin.",x=>x===0?0:x*x*Math.sin(1/x),{overlays:[x=>x*x,x=>-x*x]});
  plot("tangent-one","local","An upward parabola through (1, 1). Its dashed tangent at this point also passes through the marked point (2, 3).",x=>x*x,{overlays:[x=>2*x-1],closed:[[1,1]],guidePoints:[[2,3]]});
  plot("secant01","local","The dashed secant joins two marked points (0, 0) and (2, 4) on an upward parabola.",x=>x*x,{overlays:[x=>2*x],closed:[[0,0],[2,4]]});
  plot("line-mapped","local","A rising straight line through the marked points (0, 1), (1, 3), and (2, 5).",x=>2*x+1,{closed:[[0,1],[1,3],[2,5]]});
  plot("line-outer","slopeField","A falling straight line through the marked points (0, 3), (1, 2), and (2, 1).",x=>3-x,{closed:[[0,3],[1,2],[2,1]]});
  plot("quarter-circle","circle","A quarter-circle of radius 5 in the first quadrant, joining (0, 5) to (5, 0) through the marked point (3, 4).",x=>Math.sqrt(25-x*x),{domain:[0,5],closed:[[0,5],[3,4],[5,0]]});
  plot("objective-arch","objective","On the closed interval from 0 to 6, a downward parabola has endpoints (0, 0) and (6, 0). Its peak is marked at (3, 9).",x=>x*(6-x),{domain:[0,6],closed:[[0,0],[3,9],[6,0]]});
  plot("rectangle-triangle","triangle","A dashed hypotenuse joins (0, 8) and (12, 0). A rectangle rests on the axes with its opposite corner at the marked point (6, 4).",x=>between(x,0,6)?4:NaN,{overlays:[x=>between(x,0,12)?8-2*x/3:NaN],segments:[[0,0,0,4],[0,0,6,0],[6,0,6,4]],closed:[[6,4]]});
  plot("paired-slopes","square","Two lines pass through the origin. The solid line goes through (1, 2). The dashed line goes through (1, −1).",x=>2*x,{overlays:[x=>-x],closed:[[1,2]],guidePoints:[[1,-1]]});
  plot("shifted-zero","local","Two straight lines vanish at x = 1. The solid line also passes through (2, 3); the dashed line passes through (2, 2).",x=>3*(x-1),{overlays:[x=>2*(x-1)],closed:[[1,0],[2,3]],guidePoints:[[2,2]]});
  plot("closed-extrema","local","Connected line segments join filled points (−1, 0), (0, 3), (1, 1), and (3, 5) in that order.",x=>{
    return x<=0 ? 3*x+3 : x<=1 ? 3-2*x : 2*x-1;
  },{domain:[-1,3],closed:[[-1,0],[0,3],[1,1],[3,5]]});
  plot("area-margin","objectiveSlope","On the interval from 0 to 5, a straight derivative line joins (0, −4) to (5, 6), crossing zero at 2.",x=>2*x-4,{domain:[0,5],closed:[[0,-4],[5,6]]});
  plot("cost-fall","objectiveSlope","On the interval from 0 to 6, a straight derivative line joins (0, 6) to (6, −6), crossing zero at 3.",x=>6-2*x,{domain:[0,6],closed:[[0,6],[6,-6]]});
  plot("two-motion","motion","The position is a straight line from the marked point (0, 1) through (2, 5) to (4, 9).",x=>1+2*x,{closed:[[0,1],[2,5],[4,9]]});

  // In lecture sign diagrams the columns are intervals and the dots are derivative zeros.
  const signs = new Map();
  function signGraph(id,symbol,cuts,signsAcross,description) {
    signs.set(id,{symbol,cuts,signsAcross,description});
  }
  signGraph("first-alternates","f′",[-1,1],["+","−","+"],"Sign chart for f prime. Positive before −1, negative between −1 and 1, and positive after 1. Zeros at −1 and 1.");
  signGraph("first-touches","f′",[0],["+","+"],"Sign chart for f prime. Positive on both sides of 0 and zero at 0.");
  signGraph("second-alternates","f″",[-2,1],["−","+","−"],"Sign chart for f double prime. Negative before −2, positive between −2 and 1, and negative after 1. Zeros at −2 and 1.");
  signGraph("second-touches","f″",[1],["+","+"],"Sign chart for f double prime. Positive on both sides of 1 and zero at 1.");
  signGraph("velocity-sign","v",[2,4],["−","+","−"],"The velocity is negative before 2, positive from 2 to 4, then negative. It vanishes at 2 and 4.");

  const ns = "http://www.w3.org/2000/svg";
  const paper = "var(--plot-paper, #13212c)", grid = "var(--plot-grid, #344854)";
  const ink = "var(--plot-ink, #d4e5ea)", curve = "var(--plot-curve, #77e7cc)", guide = "var(--plot-guide, #f5ba70)";
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
  function diagramRoot(description,viewBox) {
    const root=svg("svg",{viewBox,role:"img","aria-label":description,"class":"game-graph",focusable:"false"});
    root.style.cssText="display:block;width:100%;height:auto;max-width:32rem;margin:.25rem auto;flex:none;"
      +"--plot-paper:var(--surface-raised);--plot-grid:var(--line);--plot-ink:var(--ink);"
      +"--plot-curve:var(--family-limits);--plot-guide:var(--family-applications);";
    const title=svg("title",{});title.textContent=description;root.append(title);
    return root;
  }
  function signDiagram({symbol,cuts,signsAcross,description}) {
    const root=diagramRoot(description,"0 0 260 86");
    root.append(svg("rect",{width:260,height:86,rx:8,fill:paper}));
    const text=(x,y,value,size,color=ink)=>{
      const node=svg("text",{x,y,"text-anchor":"middle","font-size":size,"font-family":"system-ui,sans-serif",fill:color});
      node.textContent=value;root.append(node);
    };
    text(16,44,symbol,15);
    const left=34,right=244;
    root.append(svg("line",{x1:left,x2:right,y1:46,y2:46,stroke:ink,"stroke-width":1.5}));
    const width=(right-left)/signsAcross.length;
    signsAcross.forEach((sign,i)=>text(left+(i+.5)*width,35,sign,24,curve));
    cuts.forEach((cut,i)=>{
      const x=left+(i+1)*width;
      root.append(svg("circle",{cx:x,cy:46,r:3.5,fill:curve}));
      text(x,34,"0",15,ink);
      text(x,68,format(cut),15);
    });
    return root;
  }
  function shadowDiagram() {
    const description="A 6 m light and a 2 m person stand on level ground. The distance from the pole to the person is x. The shadow extends s farther to the tip. A ray through both tops ends at the tip.";
    const root=diagramRoot(description,"0 0 260 146");
    root.append(svg("rect",{width:260,height:146,rx:8,fill:paper}));
    const segment=(x1,y1,x2,y2,color,width=1.5,dash="")=>root.append(svg("line",{x1,y1,x2,y2,stroke:color,"stroke-width":width,"stroke-dasharray":dash}));
    const text=(x,y,value)=>{
      const node=svg("text",{x,y,"text-anchor":"middle","font-family":"system-ui,sans-serif","font-size":14,fill:ink});
      node.textContent=value;root.append(node);
    };
    segment(19,103,244,103,ink);
    segment(35,13,35,103,curve,3);segment(149,73,149,103,curve,3);
    segment(35,13,206,103,guide,2,"5 3");
    for(const [start,end,name] of [[35,149,"x"],[149,206,"s"]]){
      segment(start,117,end,117,ink,1);
      segment(start,113,start,121,ink,1);segment(end,113,end,121,ink,1);
      text((start+end)/2,137,name);
    }
    text(18,61,"6 m");text(128,92,"2 m");text(225,99,"tip");
    return root;
  }
  window.gameGraph = function(id) {
    if (id==="lamp-shadow") return shadowDiagram();
    if (signs.has(id)) return signDiagram(signs.get(id));
    const plot=plots.get(id);
    if (!plot) return null;
    const {x,y,dx,dy,xLabels,horizontal="x"}=plot.view;
    const h=118,w=plot.view.equalUnits?h:215,left=plot.view.equalUnits?66:31,top=13;
    const px = v => w*(v-x[0])/(x[1]-x[0]);
    const py = v => h*(y[1]-v)/(y[1]-y[0]);
    const root=diagramRoot(plot.description,"0 0 260 154");
    root.append(svg("rect",{x:0,y:0,width:260,height:154,rx:8,fill:paper}));
    const chart=svg("svg",{x:left,y:top,width:w,height:h,viewBox:"0 0 "+w+" "+h,overflow:"hidden"});
    root.append(chart);
    const line=(x1,y1,x2,y2,color,width=1,dash="")=>chart.append(svg("line",{x1,y1,x2,y2,stroke:color,"stroke-width":width,"stroke-dasharray":dash}));
    function label(x,y,value,anchor) {
      const node=svg("text",{x,y,fill:ink,"font-family":"system-ui,sans-serif","font-size":12.5,"text-anchor":anchor});
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
    const [start,end]=plot.domain??x;
    const edges=[start,...(plot.breaks??[]).filter(v=>v>start&&v<end),end];
    function drawBranch(fn,j,color,width,dash) {
      const lo=edges[j-1],hi=edges[j],n=Math.ceil((px(hi)-px(lo))*1.5);
      const commands=[];
      let drawing=false;
      for(let i=0;i<=n;i++) {
        // Approach an excluded endpoint from the inside even for a finite jump.
        const fraction=i===0&&j>1 ? .001/n : i===n&&j<edges.length-1 ? 1-.001/n : i/n;
        const u=lo+(hi-lo)*fraction, v=fn(u);
        if (!Number.isFinite(v)) {drawing=false;continue;}
        const screenY=Math.max(-2*h,Math.min(3*h,py(v)));
        commands.push((drawing?"L":"M")+px(u).toFixed(2)+" "+screenY.toFixed(2));
        drawing=true;
      }
      chart.append(svg("path",{d:commands.join(" "),fill:"none",stroke:color,"stroke-width":width,"stroke-dasharray":dash,"stroke-linejoin":"round","stroke-linecap":"round"}));
    }
    for (const fn of plot.overlays??[]) {
      for(let j=1;j<edges.length;j++) drawBranch(fn,j,guide,2,"5 3");
    }
    for(let j=1;j<edges.length;j++) drawBranch(plot.fn,j,curve,2.6,"");
    for(const [a,b,c,d] of plot.segments??[]) line(px(a),py(b),px(c),py(d),curve,2.6);
    for(const [points,fill] of [[plot.guidePoints??[],guide],[plot.open??[],paper],[plot.closed??[],curve]]) {
      for(const [u,v] of points) chart.append(svg("circle",{cx:px(u),cy:py(v),r:4,fill,stroke:fill===guide?guide:curve,"stroke-width":2.2}));
    }
    return root;
  };
})();
