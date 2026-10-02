// Each explorer is independent and uses only local SVG and native controls.
(() => {
  const ns = 'http://www.w3.org/2000/svg';
  const fmt = value => Number(value.toFixed(3)).toString();
  document.querySelectorAll('[data-explorer]').forEach((card, index) => {
    const kind = card.dataset.explorer;
    const slider = card.querySelector('input');
    const svg = card.querySelector('svg');
    const readout = card.querySelector('.graph-readout');
    const bounds = kind === 'secant' ? [-0.25, 2.25, -1, 5] : [-0.25, 4.25, -0.5, 8.5];
    const [xmin, xmax, ymin, ymax] = bounds;
    const X = x => 52 + (x - xmin) / (xmax - xmin) * 556;
    const Y = y => 316 - (y - ymin) / (ymax - ymin) * 292;
    function el(tag, attrs, parent = svg) {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      parent.appendChild(node);
      return node;
    }
    const clipId = `plot-clip-${index}`;
    const defs = el('defs', {});
    const clip = el('clipPath', {id: clipId}, defs);
    el('rect', {x: 52, y: 24, width: 556, height: 292}, clip);
    const grid = el('g', {'aria-hidden': 'true'});
    for (let x = Math.ceil(xmin); x <= xmax; x++) {
      el('line', {x1: X(x), y1: 24, x2: X(x), y2: 316, stroke: '#e6ebeb'}, grid);
      el('text', {x: X(x), y: 337, 'text-anchor': 'middle'}, grid).textContent = x;
    }
    for (let y = Math.ceil(ymin); y <= ymax; y++) {
      el('line', {x1: 52, y1: Y(y), x2: 608, y2: Y(y), stroke: '#e6ebeb'}, grid);
      el('text', {x: 42, y: Y(y) + 5, 'text-anchor': 'end'}, grid).textContent = y;
    }
    el('line', {x1: 52, y1: Y(0), x2: 608, y2: Y(0), stroke: '#7c878c'}, grid);
    el('line', {x1: X(0), y1: 24, x2: X(0), y2: 316, stroke: '#7c878c'}, grid);
    el('text', {x: 623, y: Y(0) + 5}, grid).textContent = 'x';
    el('text', {x: X(0) + 10, y: 16}, grid).textContent = 'y';
    const plot = el('g', {'clip-path': `url(#${clipId})`, 'aria-hidden': 'true'});
    function curve(fn, color, dash = '') {
      const points = Array.from({length: 301}, (_, i) => {
        const x = xmin + (xmax - xmin) * i / 300;
        return `${i ? 'L' : 'M'}${X(x)},${Y(fn(x))}`;
      }).join(' ');
      return el('path', {d: points, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-dasharray': dash}, plot);
    }
    function point(x, y, fill, label) {
      el('circle', {cx: X(x), cy: Y(y), r: 6, fill, stroke: '#245a67', 'stroke-width': 2.5}, plot);
      if (label) el('text', {x: X(x) + 11, y: Y(y) - 11}, plot).textContent = label;
    }
    function draw() {
      const value = Number(slider.value);
      plot.replaceChildren();
      if (kind === 'secant') {
        curve(x => x * x, '#245a67');
        curve(x => 2 * x - 1, '#655486', '2 6');
        if (value !== 0) curve(x => 1 + (2 + value) * (x - 1), '#9a581f', '9 6');
        point(1, 1, '#245a67', 'P');
        if (value !== 0) point(1 + value, (1 + value) ** 2, '#fff', 'Q');
        readout.textContent = value === 0
          ? 'h = 0 · Q = P · The secant quotient is undefined. The limiting slope is 2.'
          : `h = ${fmt(value)} · Q = (${fmt(1 + value)}, ${fmt((1 + value) ** 2)}) · Secant slope = ${fmt(2 + value)} · Tangent slope = 2`;
      } else {
        curve(x => x + 2, '#245a67');
        point(2, 4, '#fff');
        if (kind === 'limit') {
          if (value !== 0) point(2 + value, 4 + value, '#245a67');
          readout.textContent = value === 0
            ? 'h = 0 · x = 2 · f(2) is undefined. The limit is 4.'
            : `h = ${fmt(value)} · x = ${fmt(2 + value)} · f(x) = ${fmt(4 + value)} · Approaching from the ${value < 0 ? 'left' : 'right'}`;
        } else {
          point(2, value, '#245a67');
          readout.textContent = `g(2) = ${fmt(value)} · Limit at 2 = 4 · ${value === 4 ? 'Continuous: the value equals the limit.' : 'Removable discontinuity: the value differs from the limit.'}`;
        }
      }
      slider.setAttribute('aria-valuetext', readout.textContent);
    }
    slider.disabled = false;
    slider.addEventListener('input', draw);
    draw();
  });
})();
