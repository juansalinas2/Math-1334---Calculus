// The preview and full-screen reader share one scrollable note and one map selection.
function installNoteSheet(detail, reader, setReading) {
  const compact = matchMedia("(max-width:760px), (max-width:1000px) and (orientation:portrait), (max-height:480px) and (orientation:landscape)");
  const reducedMotion = matchMedia("(prefers-reduced-motion:reduce)");
  let swipe = null;
  let animation = null;

  function reset() {
    swipe = null;
    animation?.cancel();
    animation = null;
    detail.classList.remove("sheet-moving");
    reader.style.removeProperty("--sheet-top");
    reader.style.removeProperty("--sheet-left");
  }

  function position(bounds, progress) {
    return {
      top: bounds.top * (1 - progress) + "px",
      left: bounds.left * (1 - progress) + "px",
    };
  }

  reader.addEventListener("touchstart", event => {
    if (event.touches.length !== 1 || !compact.matches) { reset(); return; }
    reset();
    const open = detail.classList.contains("reading");
    // Pull the toolbar from anywhere, or pull the text when already at its top.
    if (open && reader.scrollTop > 1 && !event.target.closest("#reader-tools")) return;
    const touch = event.touches[0];
    swipe = {
      x: touch.clientX, y: touch.clientY, open, progress: Number(open),
      bounds: detail.getBoundingClientRect(), dragging: false,
    };
  }, {passive:true});

  reader.addEventListener("touchmove", event => {
    if (!swipe) return;
    if (event.touches.length !== 1 || !event.cancelable) { reset(); return; }
    const touch = event.touches[0];
    const dx = touch.clientX - swipe.x, dy = touch.clientY - swipe.y;
    if (!swipe.dragging) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 5) return;
      if (Math.abs(dy) <= Math.abs(dx) || (swipe.open ? dy < 0 : dy > 0)) { reset(); return; }
      swipe.dragging = true;
      detail.classList.add("sheet-moving");
    }
    event.preventDefault();
    const travel = Math.max(swipe.bounds.top, window.innerHeight * .5);
    swipe.progress = Math.max(0, Math.min(1, Number(swipe.open) - dy / travel));
    const frame = position(swipe.bounds, swipe.progress);
    reader.style.setProperty("--sheet-top", frame.top);
    reader.style.setProperty("--sheet-left", frame.left);
  }, {passive:false});

  reader.addEventListener("touchend", event => {
    if (!swipe?.dragging) { reset(); return; }
    event.preventDefault();
    const {open, y, bounds, progress} = swipe;
    const distance = event.changedTouches[0].clientY - y;
    const threshold = Math.min(64, window.innerHeight * .12);
    const expand = open ? distance < threshold : distance < -threshold;
    if (expand === open) reset();
    else setReading(expand);
    if (reducedMotion.matches || progress === Number(expand)) return;
    const end = position(bounds, Number(expand));
    detail.classList.add("sheet-moving");
    reader.style.setProperty("--sheet-top", end.top);
    reader.style.setProperty("--sheet-left", end.left);
    animation = reader.animate([position(bounds, progress), end], {duration:180, easing:"ease-out"});
    animation.onfinish = reset;
  }, {passive:false});

  reader.addEventListener("touchcancel", reset);
  compact.addEventListener("change", () => setReading(false));
  return reset;
}
