// The construction follows the two circle equations in the original handout.
// Keep formulas and intercept values out of the student-facing controls.
(() => {
  const card = document.getElementById('circle-intercept-explorer');
  if (!card) return;
  const slider = card.querySelector('input');
  const svg = card.querySelector('svg');
  const readout = card.querySelector('.graph-readout');
  const ns = 'http://www.w3.org/2000/svg';
  const X = x => 140 + 100 * x;
  const Y = y => 180 - 100 * y;
  const blue = '#24536e', orange = '#b15318', green = '#217655';
  function element(tag, attrs, parent) {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    parent.appendChild(node);
    return node;
  }
  const plot = element('g', {'aria-hidden': 'true'}, svg);
  function line(x1, y1, x2, y2, color, width = 1) {
    return element('line', {x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2), stroke: color, 'stroke-width': width}, plot);
  }
  function label(x, y, text, dx = 0, dy = 0, anchor = 'middle') {
    element('text', {x: X(x) + dx, y: Y(y) + dy, 'text-anchor': anchor}, plot).textContent = text;
  }
  function point(x, y, name, dx, dy) {
    element('circle', {cx: X(x), cy: Y(y), r: 3.5, fill: '#293137'}, plot);
    label(x, y, name, dx, dy);
  }
  function draw() {
    const r = Number(slider.value);
    // Subtract the circle equations; use a stable form for the intercept.
    const qx = r * r / 2;
    const qy = r * Math.sqrt(1 - r * r / 4);
    const intercept = 2 + Math.sqrt(4 - r * r);
    const slope = -r / intercept;
    plot.replaceChildren();
    for (let x = -1; x <= 4; x++) line(x, -1.1, x, 1.1, '#e6ebeb');
    for (let y = -1; y <= 1; y++) line(-1.1, y, 4.4, y, '#e6ebeb');
    line(-1.15, 0, 4.45, 0, '#7c878c');
    line(0, -1.2, 0, 1.3, '#7c878c');
    label(4.6, 0, 'x', 0, 5);
    label(0, 1.4, 'y', 10, 0);
    for (const x of [-1, 1, 2, 3, 4]) {
      line(x, -.04, x, .04, '#7c878c');
      label(x, 0, String(x), 0, 19);
    }
    element('circle', {cx: X(1), cy: Y(0), r: 100, fill: 'none', stroke: blue, 'stroke-width': 2.5}, plot);
    element('circle', {cx: X(0), cy: Y(0), r: 100 * r, fill: 'none', stroke: orange, 'stroke-width': 2.5}, plot);
    line(0, 0, 0, r, orange, 3);
    line(-.45, r + slope * -.45, 4.4, r + slope * 4.4, green, 2.5);
    point(0, 0, 'O', -15, 20);
    point(0, r, 'P', -15, -13);
    point(qx, qy, 'Q', 15, -13);
    point(intercept, 0, 'R', 0, -14);
    label(1.65, .95, 'fixed', 0, -9);
    readout.textContent = `Radius r = ${r.toFixed(2)}`;
    slider.setAttribute('aria-valuetext', `Radius r equals ${r.toFixed(2)}`);
  }
  slider.disabled = false;
  slider.addEventListener('input', draw);
  draw();
})();
