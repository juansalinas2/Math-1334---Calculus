// The guide remains fully readable without JavaScript. Enhance it with focused paths.
(() => {
  const root = document.querySelector('.concept-workbench');
  if (!root) return;
  const buttons = [...root.querySelectorAll('[data-route]')];
  const panels = [...root.querySelectorAll('.concept-guide')];
  const nodes = [...root.querySelectorAll('[data-node]')];
  const edges = [...root.querySelectorAll('[data-edge]')];
  const paths = {
    derivative: ['limit-derivative', 'derivative-rules', 'rules-trig'],
    motion: ['derivative-motion', 'rules-trig', 'trig-motion'],
    tangent: ['limit-derivative', 'derivative-rules', 'rules-tangent'],
    limit: ['laws-limit', 'bounds-limit'],
    continuity: ['limit-continuity', 'derivative-continuity'],
    existence: ['limit-continuity', 'continuity-ivt'],
  };
  const endpoints = {
    'laws-limit': ['laws', 'limits'], 'bounds-limit': ['bounds', 'limits'],
    'limit-continuity': ['limits', 'continuity'], 'continuity-ivt': ['continuity', 'ivt'],
    'limit-derivative': ['limits', 'derivative'], 'derivative-continuity': ['derivative', 'continuity'],
    'derivative-motion': ['derivative', 'motion'],
    'rules-trig': ['rules', 'trig'], 'trig-motion': ['trig', 'motion'],
    'derivative-rules': ['derivative', 'rules'], 'rules-tangent': ['rules', 'tangent'],
  };
  function select(button, announce = true) {
    const selectedEdges = new Set(paths[button.dataset.route]);
    const selectedNodes = new Set([...selectedEdges].flatMap(edge => endpoints[edge]));
    for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
    for (const panel of panels) panel.hidden = panel.id !== button.getAttribute('aria-controls');
    for (const edge of edges) edge.classList.toggle('is-active', selectedEdges.has(edge.dataset.edge));
    for (const node of nodes) node.classList.toggle('is-active', selectedNodes.has(node.dataset.node));
    if (announce) root.querySelector('.concept-status').textContent = `${button.textContent.trim()}: method and example shown below.`;
  }
  function fromHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    const panel = target?.closest('.concept-guide');
    const button = buttons.find(item => item.getAttribute('aria-controls') === panel?.id);
    if (button) {
      select(button, false);
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    }
    return button;
  }
  root.classList.add('is-interactive');
  buttons.forEach(button => button.addEventListener('click', () => select(button)));
  if (!fromHash()) select(buttons[0], false);
  window.addEventListener('hashchange', fromHash);
})();
