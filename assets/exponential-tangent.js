// Optional Section 3.9 exploration; fixed axes make tangent slopes comparable.
(() => {
  const card = document.getElementById('exponential-tangent-explorer');
  if (!card) return;
  const slider = card.querySelector('input[type="range"]');
  const reset = card.querySelector('button');
  const svg = card.querySelector('svg');
  const readout = card.querySelector('.graph-readout');
  const observation = card.querySelector('.exponential-observation');
  const description = card.querySelector('desc');
  const ns = 'http://www.w3.org/2000/svg';
  const left = 58, right = 684, top = 48, bottom = 368;
  const xmin = -1.5, xmax = 1.5, ymin = -1, ymax = 5;
  const X = x => left + (x - xmin) / (xmax - xmin) * (right - left);
  const Y = y => bottom - (y - ymin) / (ymax - ymin) * (bottom - top);
  const number = n => Math.abs(n) < 1e-10 ? '0' : n.toFixed(3).replace(/\.?0+$/, '').replace('-', '−');
  function el(tag, attributes, parent = svg) {
    const element = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    parent.appendChild(element);
    return element;
  }
  function label(x, y, text, attributes = {}, parent = svg) {
    el('text', {x, y, ...attributes}, parent).textContent = text;
  }
  const defs = el('defs', {});
  const clip = el('clipPath', {id: 'exponential-tangent-clip'}, defs);
  el('rect', {x: left, y: top, width: right - left, height: bottom - top}, clip);
  const grid = el('g', {'aria-hidden': 'true'});
  for (let x = xmin; x <= xmax; x += .5) {
    el('line', {x1: X(x), x2: X(x), y1: top, y2: bottom, stroke: '#e6ebeb'}, grid);
    label(X(x), bottom + 24, number(x), {'text-anchor': 'middle'}, grid);
  }
  for (let y = ymin; y <= ymax; y++) {
    el('line', {x1: left, x2: right, y1: Y(y), y2: Y(y), stroke: '#e6ebeb'}, grid);
    label(left - 13, Y(y) + 5, number(y), {'text-anchor': 'end'}, grid);
  }
  el('line', {x1: left, x2: right, y1: Y(0), y2: Y(0), stroke: '#77838b'}, grid);
  el('line', {x1: X(0), x2: X(0), y1: top, y2: bottom, stroke: '#77838b'}, grid);
  label(right + 14, Y(0) + 5, 'x', {'font-style': 'italic'}, grid);
  label(X(0) - 14, top - 12, 'y', {'font-style': 'italic'}, grid);
  // Separate legend from the drawing so labels never collide with curves.
  el('line', {x1: left, x2: left + 31, y1: 20, y2: 20, stroke: '#0072B2', 'stroke-width': 3}, grid);
  const curveLabel = el('text', {x: left + 41, y: 25}, grid);
  curveLabel.textContent = 'y = a';
  el('tspan', {'baseline-shift': 'super', 'font-size': '11'}, curveLabel).textContent = 'x';
  el('line', {x1: right - 223, x2: right - 192, y1: 20, y2: 20, stroke: '#9C2B79', 'stroke-width': 2.5, 'stroke-dasharray': '8 5'}, grid);
  label(right - 182, 25, 'Tangent at (0, 1)', {}, grid);
  const plot = el('g', {'clip-path': 'url(#exponential-tangent-clip)', 'aria-hidden': 'true'});
  const exponential = el('path', {fill: 'none', stroke: '#0072B2', 'stroke-width': 3}, plot);
  const tangent = el('path', {fill: 'none', stroke: '#9C2B79', 'stroke-width': 2.5, 'stroke-dasharray': '8 5'}, plot);
  el('circle', {cx: X(0), cy: Y(1), r: 5, fill: '#293137', stroke: '#fff', 'stroke-width': 2}, plot);
  const pointLabel = el('text', {x: X(0) + 12, 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 5, 'stroke-linejoin': 'round'}, plot);
  pointLabel.textContent = '(0, 1)';
  function draw() {
    const a = Number(slider.value);
    const atE = Math.abs(a - Math.E) < 1e-12;
    const slope = atE ? 1 : Math.log(a);
    pointLabel.setAttribute('y', Y(1) + (slope < 0 ? -16 : 25));
    const points = Array.from({length: 501}, (_, i) => {
      const x = xmin + (xmax - xmin) * i / 500;
      return `${i ? 'L' : 'M'}${X(x).toFixed(2)},${Y(a ** x).toFixed(2)}`;
    });
    exponential.setAttribute('d', points.join(' '));
    tangent.setAttribute('d', `M${X(xmin)},${Y(1 + slope * xmin)} L${X(xmax)},${Y(1 + slope * xmax)}`);
    const baseText = atE ? 'a = e ≈ 2.71828' : `a = ${number(a)}`;
    readout.textContent = `${baseText} · Tangent slope = ${number(slope)}`;
    observation.textContent = atE
      ? 'At a = e, the tangent has slope 1: y = 1 + x.'
      : a < 1 ? 'For 0 < a < 1, the exponential decreases and the tangent slope is negative.'
      : a === 1 ? 'At a = 1, the graph and its tangent coincide: y = 1. The slope is 0.'
      : a < Math.E ? 'For 1 < a < e, the tangent slope is between 0 and 1.'
      : 'For a > e, the tangent slope is greater than 1.';
    slider.setAttribute('aria-valuetext', `${baseText}; tangent slope ${number(slope)}`);
    reset.setAttribute('aria-pressed', String(atE));
    description.textContent = `${baseText}. The solid exponential and dashed tangent meet at (0, 1). The tangent slope is ${number(slope)}. Axes stay fixed as the base changes.`;
  }
  slider.disabled = false;
  reset.disabled = false;
  slider.addEventListener('input', draw);
  // Keyboard steps are predictable; the e button selects the exact value.
  slider.addEventListener('keydown', event => {
    const direction = {ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1}[event.key];
    if (!direction) return;
    event.preventDefault();
    slider.value = String(Math.max(.1, Math.min(10, Math.round((Number(slider.value) + direction * .01) * 100) / 100)));
    draw();
  });
  reset.addEventListener('click', () => { slider.value = String(Math.E); draw(); });
  slider.value = String(Math.E);
  draw();
})();
