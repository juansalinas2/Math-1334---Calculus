// Both presentations open the same note and share its URL and search results.
const listGroups = new Map();
const listTopics = new Map();
let activeListTopic = null;

function buildTopicList() {
  const list = byId("topic-list");
  list.append(el("h2", "Course topics"));
  for (const [key, group] of Object.entries(families)) {
    const items = stations.filter(topic => topic.family === key);
    const section = el("details", "", "list-group");
    section.style.setProperty("--accent", group.color);
    const title = el("summary", "");
    title.append(el("span", group.label), el("small", items.length + " topics"));
    section.append(title);
    listGroups.set(key, section);
    for (const topic of items) {
      const row = el("div", "", "list-topic-row");
      const button = el("button", "", "list-topic");
      button.type = "button";
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-controls", "subtopics-" + topic.id);
      button.append(focusMark(topic), el("span", topic.title));
      const subtopics = el("div", "", "list-subtopics");
      subtopics.id = "subtopics-" + topic.id;
      subtopics.hidden = true;
      for (const part of topic.parts) {
        const child = el("button", part.title);
        child.type = "button";
        child.dataset.slug = partSlug(part);
        child.onclick = () => showTopic(topic.id, child.dataset.slug);
        subtopics.append(child);
      }
      button.onclick = () => {
        if (selected === topic.id && !selectedPart && !subtopics.hidden) {
          subtopics.hidden = true;
          button.setAttribute("aria-expanded", "false");
        } else showTopic(topic.id);
      };
      row.append(button, subtopics);
      section.append(row);
      listTopics.set(topic.id, {section, button, subtopics});
    }
    list.append(section);
  }
}

function syncTopicList(bringIntoView = false) {
  if (document.body.dataset.presentation !== "list") return;
  if (activeListTopic && activeListTopic !== selected) {
    const old = listTopics.get(activeListTopic);
    old.button.removeAttribute("aria-current");
    old.button.setAttribute("aria-expanded", "false");
    old.subtopics.hidden = true;
    old.subtopics.querySelector("[aria-current]")?.removeAttribute("aria-current");
  }
  activeListTopic = selected;
  if (!selected) {
    if (family !== "all") {
      const section = listGroups.get(family);
      section.open = true;
      section.scrollIntoView({block:"nearest"});
    }
    return;
  }
  const {section, button, subtopics} = listTopics.get(selected);
  section.open = true;
  subtopics.hidden = false;
  button.setAttribute("aria-expanded", "true");
  if (selectedPart) button.removeAttribute("aria-current");
  else button.setAttribute("aria-current", "page");
  let destination = button;
  for (const child of subtopics.children) {
    if (child.dataset.slug === selectedPart) {
      child.setAttribute("aria-current", "page");
      destination = child;
    } else child.removeAttribute("aria-current");
  }
  if (bringIntoView || !byId("topic-list").contains(document.activeElement)) {
    destination.scrollIntoView({block:"nearest"});
  }
}

function initializePresentation() {
  const key = "calculus-map-presentation";
  const url = new URL(location.href);
  // Old alternate-view links now resolve to the standard course entry.
  if (url.searchParams.has("view")) {
    url.searchParams.delete("view");
    history.replaceState(history.state, "", url);
  }
  let choice;
  try { choice = localStorage.getItem(key); } catch { /* Browser storage is optional. */ }
  if (["map","list"].includes(url.searchParams.get("layout"))) choice = url.searchParams.get("layout");
  function use(mode, save) {
    const inList = mode === "list";
    document.body.dataset.presentation = inList ? "list" : "map";
    for (const button of document.querySelectorAll(".presentation-switch button")) {
      button.setAttribute("aria-pressed", String(button.dataset.presentation === mode));
    }
    if (inList && !listGroups.size) buildTopicList();
    byId("topic-list").hidden = !inList;
    viewport.inert = inList;
    if (inList) syncTopicList(true);
    if (save) {
      try { localStorage.setItem(key, mode); } catch { /* Keep the in-page preference. */ }
      const current = new URL(location.href);
      if (current.searchParams.has("layout")) {
        current.searchParams.set("layout", mode);
        history.replaceState(history.state, "", current);
      }
    }
  }
  for (const button of document.querySelectorAll(".presentation-switch button")) {
    button.onclick = () => use(button.dataset.presentation, true);
  }
  use(choice === "list" ? "list" : "map", false);
}
