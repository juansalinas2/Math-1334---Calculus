// Native buttons keep the concept map usable with touch and a keyboard.
(() => {
  const map = document.querySelector('.concept-map');
  if (!map) return;
  const buttons = [...map.querySelectorAll('[data-concept]')];
  const panels = [...document.querySelectorAll('.concept-detail')];
  function select(button) {
    for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
    for (const panel of panels) panel.hidden = panel.id !== button.getAttribute('aria-controls');
  }
  for (const button of buttons) button.addEventListener('click', () => select(button));
  select(buttons[0]);
})();
