"use strict";
const definitionDialog = document.getElementById("zoom-definition");
const definitionPage = definitionDialog.querySelector(".definition-page");
let previousWheelTime = null;
let wheelStartedAtEnd = false;
let definitionAim = null;
let lastGestureScale = 0;
let returnView = null;
let moonZoomOffset = null;

function definitionAt(target) {
  const node = target?.closest?.(".map-moon, .station");
  return node ? d3.select(node).datum() : null;
}

function definitionForControls() {
  const focused = definitionAt(document.activeElement);
  if (focused) return focused;
  const topic = byTopic.get(selected);
  const selectedHere = topic && (!insideId || insideId === selected);
  const part = selectedHere && topic.parts.find(note => partSlug(note) === selectedPart);
  if (part) return part;
  const rect = viewport.getBoundingClientRect();
  const center = [viewport.clientWidth / 2, viewport.clientHeight / 2];
  const centered = definitionAt(document.elementFromPoint(rect.left + center[0], rect.top + center[1]));
  return centered || (selectedHere && topic) || byTopic.get(insideId) || detailTopicAt(d3.zoomTransform(viewport), center);
}

function resetDefinitionAim(view) {
  definitionAim = null;
  lastGestureScale = view.k;
  returnView = view.k >= detailZoom() && view.k < maxZoom ? view : null;
}

function trackDefinitionAim(target, point, view, source) {
  const zoomingOut = view.k < lastGestureScale || (source.type === "wheel" && source.deltaY > 0);
  lastGestureScale = view.k;
  if (!point || zoomingOut) {
    definitionAim = null;
    return;
  }
  if (view.k >= detailZoom() && view.k <= maxZoom / 1.35) returnView = view;
  // The orbit stays readable in screen pixels. Keep the aimed-at subtopic if
  // its disc slides away from stationary fingers during the same gesture.
  if (definitionAim && Math.hypot(point[0] - definitionAim.point[0], point[1] - definitionAim.point[1]) > 30) {
    definitionAim = null;
  }
  const note = definitionAt(target);
  if (note && (!definitionAim || (definitionAim.note.parts && !note.parts))) {
    definitionAim = {note, point};
  }
}

function finishDefinitionZoom() {
  if (!definitionAim) return;
  const {note, point} = definitionAim;
  definitionAim = null;
  openZoomDefinition(note, point, returnView);
}

function openZoomDefinition(note, point, previous) {
  if (definitionDialog.open || document.body.dataset.presentation === "list") return;
  if (d3.zoomTransform(viewport).k >= maxZoom) {
    if (previous) svg.call(zoom.transform, previous);
    else svg.call(zoom.scaleTo, maxZoom / 1.35, point);
    rememberView();
  }
  const title = document.getElementById("definition-title");
  writeMapText(title, note.title);
  const parent = !note.parts && stations.find(topic => topic.parts.includes(note));
  const kind = note.kind === "Example" ? "Class example" : note.kind;
  document.getElementById("definition-context").textContent = parent ? parent.title + " · " + kind : kind;
  const text = document.getElementById("definition-text");
  text.replaceChildren(mapTextElement("p", note.definition));
  if (["Definition", "Theorem", "Rule"].includes(note.kind) && note.formula && !note.illustrativeFormula) {
    text.append(mapTextElement("div", note.formula, "equation"));
  }
  definitionDialog.dataset.size = note.parts ? "topic" : "subtopic";
  definitionDialog.showModal();
  definitionPage.scrollTop = 0;
  previousWheelTime = null;
}

function closeZoomDefinition() {
  if (definitionDialog.open) definitionDialog.close();
}
document.getElementById("definition-back").onclick = closeZoomDefinition;
definitionDialog.addEventListener("keydown", event => {
  event.stopPropagation();
  if (!event.metaKey && !event.ctrlKey && !event.altKey && ["-", "Escape"].includes(event.key)) {
    event.preventDefault();
    closeZoomDefinition();
  }
});
function definitionAtEnd() {
  return definitionPage.scrollHeight - definitionPage.clientHeight - definitionPage.scrollTop <= 2;
}
definitionDialog.addEventListener("wheel", event => {
  if (isSidewaysScroll(event) || !event.deltaY) return;
  // Keep the wheel stroke that reads the last line separate from the next
  // stroke. Trackpad momentum can continue long after the page stops moving.
  if (previousWheelTime === null || event.timeStamp - previousWheelTime > 150) {
    wheelStartedAtEnd = definitionAtEnd();
  }
  previousWheelTime = event.timeStamp;
  if (event.deltaY < 0) {
    wheelStartedAtEnd = false;
    return;
  }
  const scrollsText = definitionPage.contains(event.target) &&
    definitionPage.scrollHeight > definitionPage.clientHeight + 2;
  const canExitAtEnd = definitionAtEnd() && (wheelStartedAtEnd || event.deltaMode !== 0);
  if (!event.ctrlKey && scrollsText && !canExitAtEnd) return;
  event.preventDefault();
  closeZoomDefinition();
}, {passive:false});

let pinchStart = 0;
let swipeStart = null;
function fingerDistance(touches) {
  const [a, b] = touches;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
definitionDialog.addEventListener("touchstart", event => {
  swipeStart = null;
  if (event.touches.length === 2) {
    pinchStart = fingerDistance(event.touches);
    if (event.cancelable) event.preventDefault();
  } else if (event.touches.length === 1 && definitionAtEnd() && definitionPage.contains(event.target)) {
    const finger = event.touches[0];
    swipeStart = [finger.clientX, finger.clientY];
  }
}, {passive:false});
definitionDialog.addEventListener("touchmove", event => {
  if (!pinchStart || event.touches.length !== 2) return;
  event.preventDefault();
  if (fingerDistance(event.touches) < .8 * pinchStart) closeZoomDefinition();
}, {passive:false});
definitionDialog.addEventListener("touchend", event => {
  if (swipeStart && !event.touches.length) {
    const finger = event.changedTouches[0];
    const up = swipeStart[1] - finger.clientY;
    if (up > 64 && up > 2 * Math.abs(finger.clientX - swipeStart[0]) && definitionAtEnd()) closeZoomDefinition();
  }
  swipeStart = null;
  pinchStart = 0;
});
function resetDefinitionTouches() { swipeStart = null; pinchStart = 0; }
definitionDialog.addEventListener("touchcancel", resetDefinitionTouches);
definitionDialog.addEventListener("close", resetDefinitionTouches);
