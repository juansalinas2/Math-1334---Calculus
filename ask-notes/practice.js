(() => {
  const checks = /* COURSE_CHECKS */ null;
  const routing = /* COURSE_ROUTING */ null;
  const refPattern = new RegExp(routing.ref, "i");
  const partPattern = new RegExp(routing.part, "i");
  const startPattern = new RegExp(routing.start, "i");
  const script = document.currentScript;
  const endpoint = script.dataset.endpoint;

  function element(tag, text) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function shareForm(panel, section, check, choice) {
    const details = element("details");
    const form = element("form");
    const fields = element("label", "Class code ");
    const code = element("input");
    code.type = "password";
    code.required = true;
    code.maxLength = 120;
    fields.append(code);
    const comment = element("label", "Your reasoning (optional) ");
    const note = element("textarea");
    note.maxLength = 600;
    note.rows = 2;
    comment.append(note);
    const consent = element("p", "Juan will see this question, your first choice (“" + check.choices[choice] +
      "”), and any reasoning you add for 90 days. Leave out names and student IDs.");
    const send = element("button", "Share my first choice");
    const status = element("p");
    status.setAttribute("role", "status");
    const receipt = crypto.randomUUID();
    details.append(element("summary", "Share this attempt with Juan (optional)"), form);
    form.append(consent, fields, comment, send, status);
    panel.append(details);
    details.addEventListener("toggle", () => {
      if (details.open && !code.value) code.value = document.querySelector(".ask-code input")?.value || "";
    });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (send.disabled) return;
      send.disabled = true;
      status.textContent = "Sharing…";
      try {
        const response = await fetch(new URL("feedback", new URL(endpoint, location.href)), {
          method: "POST", credentials: "omit", signal: AbortSignal.timeout(12000),
          headers: {"Content-Type": "application/json", "X-Class-Code": code.value},
          body: JSON.stringify({kind: "practice", share: true, section, version: check.version,
            choice, note: note.value, attempt: receipt})
        });
        const result = await response.json();
        if (!response.ok || !result.saved) throw new Error(result.error || "Could not share. Try again.");
        form.replaceChildren(element("p", "Your first choice was shared with Juan."));
      } catch (error) {
        status.textContent = error.message;
        send.disabled = false;
      }
    });
  }

  function copyAttempt(panel, check, choice) {
    const details = element("details");
    const label = element("label", "Your reasoning (optional)");
    const note = element("textarea");
    note.rows = 2;
    note.maxLength = 600;
    label.append(note);
    const copy = element("button", "Copy response");
    copy.type = "button";
    const status = element("p");
    status.setAttribute("role", "status");
    details.append(element("summary", "Copy a response for Juan"), label, copy, status);
    copy.addEventListener("click", async () => {
      const value = [check.question, "My first choice: " + check.choices[choice], note.value.trim()].filter(Boolean).join("\n");
      try {
        await navigator.clipboard.writeText(value);
        status.textContent = "Copied. You can paste this in a private message to Juan.";
      } catch {
        const text = element("textarea");
        text.readOnly = true;
        text.value = value;
        text.setAttribute("aria-label", "Response to copy");
        status.replaceChildren(document.createTextNode("Select and copy this response."), text);
        text.select();
      }
    });
    panel.append(details);
  }

  function practicePanel(section) {
    const check = checks[section];
    if (!check) return;
    const panel = element("details");
    panel.className = "proof rr-self-check";
    const hint = element("details");
    hint.append(element("summary", "Hint"), element("p", check.hint));
    const group = element("fieldset");
    group.append(element("legend", check.question));
    const result = element("p");
    result.className = "rr-check-result";
    result.setAttribute("role", "status");
    let first = true;
    const buttons = check.choices.map((choice, index) => {
      const button = element("button", choice);
      button.type = "button";
      button.addEventListener("click", () => {
        const correct = index === check.correct;
        result.textContent = check.feedback[index] + (correct ? "" : " Try another choice.");
        if (correct) {
          for (const other of buttons) other.disabled = true;
          result.tabIndex = -1;
          result.focus({preventScroll: true});
        }
        if (first) {
          if (endpoint) shareForm(panel, section, check, index);
          else copyAttempt(panel, check, index);
        }
        first = false;
      });
      group.append(button);
      return button;
    });
    panel.append(element("summary", "Check your next step"), group, hint, result);
    return panel;
  }

  const names = Object.fromEntries(Object.entries(routing.aliases).map(([key, pattern]) => [key, new RegExp(pattern, "i")]));

  // Keep the panel on screen after dragging, rotating the phone, or opening its keyboard.
  function movablePanel(panel, header, moveButton) {
    let drag;
    let moved = false;
    let placed = false;
    const nav = document.querySelector(".reading-controls");
    function bounds() {
      const v = window.visualViewport;
      const x = (v?.offsetLeft || 0) + 8;
      const viewportTop = v?.offsetTop || 0;
      const y = Math.max(viewportTop, nav?.getBoundingClientRect().bottom || 0) + 8;
      return {x, y, right: Math.max(x, x + (v?.width || innerWidth) - panel.offsetWidth - 16),
        bottom: Math.max(y, viewportTop + (v?.height || innerHeight) - panel.offsetHeight - 8)};
    }
    function place(x, y) {
      const b = bounds();
      panel.style.left = Math.min(b.right, Math.max(b.x, x)) + "px";
      panel.style.top = Math.min(b.bottom, Math.max(b.y, y)) + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      placed = true;
    }
    header.addEventListener("pointerdown", e => {
      if (!e.isPrimary || e.button !== 0 || e.target.closest("button") && !moveButton.contains(e.target)) return;
      const rect = panel.getBoundingClientRect();
      moved = false;
      drag = {id: e.pointerId, x: e.clientX, y: e.clientY, left: rect.left, top: rect.top};
      e.target.setPointerCapture(e.pointerId);
    });
    header.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      place(drag.left + dx, drag.top + dy);
    });
    header.addEventListener("lostpointercapture", () => { drag = null; });
    moveButton.addEventListener("click", e => {
      if (moved && e.detail) { moved = false; return; }
      const b = bounds(), r = panel.getBoundingClientRect();
      if (b.right - b.x < 80) place(b.x, r.top < (b.y + b.bottom) / 2 ? b.bottom : b.y);
      else place(r.left < (b.x + b.right) / 2 ? b.right : b.x, r.top);
    });
    moveButton.addEventListener("keydown", e => {
      const delta = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[e.key];
      if (!delta) return;
      e.preventDefault();
      const r = panel.getBoundingClientRect();
      place(r.left + 32 * delta[0], r.top + 32 * delta[1]);
    });
    function fit() {
      if (!panel.open) return;
      const b = bounds();
      const r = panel.getBoundingClientRect();
      if (placed || r.top < b.y - 1 || r.top > b.bottom + 1 || r.left < b.x - 1 || r.left > b.right + 1) place(r.left, r.top);
    }
    new ResizeObserver(fit).observe(panel);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("scroll", fit);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const topics = new Map();
    for (const key of Object.keys(checks)) {
      const node = document.getElementById(key);
      if (!node) continue;
      const heading = node.querySelector("h2, h3");
      const steps = [...node.querySelectorAll(".rr-step-label")];
      steps.forEach((s, i) => { s.id = key + "-study-step-" + (i + 1); });
      const title = heading.childNodes[0].textContent.trim();
      const parts = new Map();
      const paragraphs = steps.map((label, i) => {
        const group = [];
        let p = label.closest("p").nextElementSibling;
        while (p?.tagName === "P" && !p.querySelector(".rr-step-label")) {
          const mark = /^\(([a-z])\)/i.exec(p.textContent.trim());
          if (mark) parts.set(mark[1], {step:i + 1, paragraph:p});
          group.push(p);
          p = p.nextElementSibling;
        }
        return group;
      });
      topics.set(key, {node, title, steps, paragraphs, parts, numbered:/^(example|practice)\s+(\d+)/i.exec(title)});
    }
    if (!topics.has("the-three-steps")) return;

    const box = element("details");
    box.className = "rr-help-box";
    box.id = "ask-for-help";
    const trigger = element("summary", "Ask for help");
    const popup = element("dialog");
    popup.className = "rr-help-popup";
    popup.setAttribute("aria-labelledby", "rr-answer-title");
    const bar = element("header");
    const title = element("h2", "From the notes");
    title.id = "rr-answer-title";
    title.tabIndex = -1;
    const move = element("button", "Move");
    move.type = "button";
    move.className = "rr-move";
    move.title = "Drag to move. Click to switch sides, or use the arrow keys.";
    move.setAttribute("aria-label", move.title);
    const hide = element("button", "Hide");
    hide.type = "button";
    hide.addEventListener("click", hidePanel);
    bar.append(title, move, hide);
    movablePanel(popup, bar, move);
    const asked = element("p");
    asked.className = "rr-asked";
    const answer = element("div");
    answer.className = "rr-help-answer";
    const thread = element("div");
    thread.setAttribute("aria-live", "polite");
    thread.append(asked, answer);
    let activeTopic = "";
    let activeStep = 0;
    let activePart = "";
    let pendingReply = null;
    let hintLevel = 0;
    let minimized = false;
    const attempts = new Map();

    function prompts(item) {
      return [item.help, ...(item.answers || []).filter(a => a.question)];
    }

    function questionForm(labelText, placeholder, getReading, isFollowup = false) {
      const form = element("form");
      form.className = "rr-question-form";
      const label = element("label", labelText);
      const field = element("input");
      field.type = "text";
      field.required = true;
      field.maxLength = 450;
      field.autocomplete = "off";
      field.placeholder = placeholder;
      label.append(field);
      const send = element("button", "Ask");
      send.type = "submit";
      const row = element("div");
      row.className = "rr-suggestion";
      const fill = element("button");
      fill.type = "button";
      const sample = element("span");
      const keycap = element("kbd", "Tab");
      fill.append(sample, keycap);
      const other = element("button", "↻");
      other.type = "button";
      other.setAttribute("aria-label", "Show another suggested question");
      other.title = "Show another suggested question";
      row.append(fill, other);
      const instructions = element("span", "Tab fills the suggested question. Enter asks your question. Escape dismisses the suggestion.");
      instructions.className = "rr-visually-hidden";
      instructions.id = isFollowup ? "rr-follow-keys" : "rr-question-keys";
      field.setAttribute("aria-describedby", instructions.id);
      sample.id = instructions.id + "-sample";
      form.append(label, send, row, instructions);

      let options = [], index = 0, reading = "", dismissed = false, filledReading = "";
      function update() {
        const raw = normalized(field.value);
        const ref = numbered(raw);
        reading = ref?.candidates.length === 1 ? ref.candidates[0] : getReading();
        const term = ref ? raw.replace(ref.match[0], "").trim() : raw;
        options = prompts(checks[reading]).map(a => a.question).filter(q => {
          if (ref && ref.candidates.length !== 1) return false;
          if (isFollowup && normalized(asked.textContent) === normalized(q)) return false;
          const text = normalized(q);
          if (!term) return true;
          if (text === term) return false;
          if (text.startsWith(term)) return true;
          return /^[a-z]{3,}$/.test(term) && text.split(/[^a-z]+/).some(word => word.startsWith(term));
        });
        if (index >= options.length) index = 0;
        row.hidden = dismissed || !options.length;
        if (!row.hidden) {
          sample.textContent = options[index];
          other.hidden = options.length < 2;
        }
        field.setAttribute("aria-describedby", row.hidden ? instructions.id : instructions.id + " " + sample.id);
      }
      function accept() {
        field.value = options[index];
        filledReading = reading;
        dismissed = true;
        update();
        field.focus({preventScroll:true});
      }
      field.addEventListener("input", () => {
        dismissed = false; filledReading = ""; index = 0; update();
      });
      field.addEventListener("focus", update);
      field.addEventListener("keydown", e => {
        if (e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || row.hidden) return;
        if (e.key === "Escape") {
          e.preventDefault(); e.stopPropagation(); dismissed = true; update();
        } else if (e.key === "Tab" && field.selectionStart === field.value.length && field.selectionEnd === field.value.length) {
          e.preventDefault(); accept();
        }
      });
      fill.addEventListener("click", accept);
      other.addEventListener("click", () => {
        index = (index + 1) % options.length; update(); field.focus({preventScroll:true});
      });
      form.addEventListener("submit", event => {
        event.preventDefault();
        const value = field.value.trim();
        if (value) show(value, filledReading || getReading());
        else field.focus();
      });
      return {form, field, update, reset() {
        field.value = ""; dismissed = false; filledReading = ""; index = 0; update();
      }};
    }

    function currentReading() {
      const line = Math.min(170, innerHeight / 3);
      let current = "the-three-steps";
      for (const [key, topic] of topics) {
        const r = topic.node.getBoundingClientRect();
        if (r.top <= line && r.bottom >= line) current = key;
      }
      return current;
    }

    function normalized(text) {
      return text.toLowerCase().replace(/[’‘]/g, "'").replace(/[?!.,]+$/g, "").trim();
    }

    function chooseReading(q, context) {
      if (["cone", "shadow"].includes(context) && /triangles?/.test(q) &&
          !/scaling factor|area|base and height|shadow|tank|cone|conical/.test(q)) return context;
      if (prompts(checks[context]).some(a => normalized(a.question) === q)) return context;
      const named = ["cone", "shadow", "similar-triangles", ...topics.keys()].find(k => names[k]?.test(q));
      if (named) return named;
      if (context !== "the-three-steps") return context;
      return [...topics.keys()].find(k => prompts(checks[k]).some(a => normalized(a.question) === q)) || context;
    }

    function cite(topic, target) {
      const link = element("a", topic.title + (target === topic.node ? "" : " · " + target.textContent.trim()));
      link.className = "rr-source";
      link.href = "#" + target.id;
      link.addEventListener("click", event => {
        event.preventDefault();
        for (let p = target.parentElement; p && p !== topic.node; p = p.parentElement) {
          if (p.tagName === "DETAILS") p.open = true;
        }
        target.tabIndex = -1;
        history.replaceState(null, "", link.hash);
        target.focus({preventScroll: true});
        target.scrollIntoView({block:"center"});
        const panelRect = popup.getBoundingClientRect(), sourceRect = target.getBoundingClientRect();
        if (sourceRect.left < panelRect.right && sourceRect.right > panelRect.left &&
            sourceRect.top < panelRect.bottom && sourceRect.bottom > panelRect.top) {
          const y = panelRect.top > innerHeight / 2 - 12 ? panelRect.top / 2 : (panelRect.bottom + innerHeight) / 2;
          window.scrollBy(0, sourceRect.top - y);
        }
      });
      answer.append(link);
    }

    function excerpt(node) {
      const copy = node.cloneNode(true);
      for (const el of [copy, ...copy.querySelectorAll("[id]")]) el.removeAttribute("id");
      answer.append(copy);
    }

    function numbered(q) {
      const match = refPattern.exec(q);
      if (!match) return null;
      const [, rawKind = "", rawNumber, suffix, packed] = match;
      const number = /^\d+$/.test(rawNumber) ? Number(rawNumber) : routing.words.indexOf(rawNumber);
      const kind = /^(practice|exercise)/.test(rawKind) ? "practice" : rawKind.startsWith("ex") ? "example" : "";
      const candidates = [...topics.keys()].filter(k => {
        const h = topics.get(k).numbered;
        return h && Number(h[2]) === number && (!kind || h[1].toLowerCase() === kind);
      });
      return {match, candidates, part: suffix || packed || ""};
    }

    function action(text, fn) {
      const button = element("button", text);
      button.type = "button";
      button.className = "rr-sample";
      button.addEventListener("click", fn);
      answer.append(button);
    }

    function authored(html) {
      const p = element("p");
      p.innerHTML = html; // Authored mathematics compiled at build time; questions remain plain text.
      answer.append(p);
    }

    function show(question, context) {
      const q = normalized(question);
      const ref = numbered(q);
      const lastReply = pendingReply;
      pendingReply = null;
      asked.textContent = question;
      answer.replaceChildren();
      if (ref && ref.candidates.length !== 1) {
        const choices = ref.candidates;
        answer.append(element("p", choices.length ? "Which reading do you mean?" :
          "That numbered problem isn’t in §4.1. Use an Example or Practice heading from this page."));
        for (const k of choices) {
          const name = topics.get(k).title;
          action(name, () => show(q.replace(ref.match[0], name.split(".")[0] + (ref.part || "")), k));
        }
        activeTopic = "";
        activeStep = 0; activePart = ""; hintLevel = 0;
        present();
        return;
      }
      const definition = /what (?:are|is) (?:a |the )?related.?rates?/.test(q);
      const reading = /\b(?:this|current) (?:example|practice|problem|reading)\b/.test(q) ? currentReading() : context;
      const key = ref?.candidates[0] || (definition ? "the-three-steps" : chooseReading(q, reading));
      const topic = topics.get(key), item = checks[key];
      const previous = key === activeTopic ? activeStep : 0;
      const remainder = ref ? q.replace(ref.match[0], "").trim() : q;
      const partMatch = partPattern.exec(remainder);
      const another = /^(?:(?:can|could) i (?:get|have) |give me )?(?:another|one more|next|second) hint(?: please)?$/.test(q);
      const part = partMatch?.slice(1).find(Boolean) || ref?.part || (another && key === activeTopic ? activePart : "");
      const continuingHint = another && key === activeTopic && hintLevel > 0;
      const lastHintLevel = continuingHint ? hintLevel : 0;
      activePart = part;
      hintLevel = 0;
      activeTopic = key;
      activeStep = 0;
      let supported = true;
      let step = 0;
      const next = /^(?:(?:ok(?:ay)?[, ]*|and )?(?:what(?:'s| is)? )?(?:comes? )?next(?: step)?|then what|go on|continue)$/.test(q);
      const hints = item.partHints || {};
      const entries = item.answers || [];
      const exact = prompts(item).find(a => normalized(a.question) === q);
      const authoredIndex = exact ? entries.indexOf(exact) :
        entries.findIndex(a => (!part || !a.parts || a.parts.includes(part)) && new RegExp(a.match, "i").test(q));
      // Short replies answer the last teaching question only within the same reading.
      const replying = lastReply && lastReply.key === key && !ref && !part && !exact &&
        q.split(/\s+/).length <= 9 && !/^(?:what|why|how|where|which|when)\b/.test(q) &&
        new RegExp(lastReply.rule.match, "i").test(q);
      const detail = /\b(?:why|what (?:is|does)|how fast|how much|units?|differentiat\w*|equation)\b/.test(q);
      const starter = /\bhint\b/.test(q) || (startPattern.test(q) && !detail && authoredIndex < 0 && !exact) ||
        (ref && !remainder.replace(/[.,;:!?]/g, "") && !part);
      if (part && !hints[part]) {
        supported = false;
        answer.append(element("p", topic.title + " has no part (" + part + "). " +
          (Object.keys(hints).length ? "Choose " + Object.keys(hints).map(p => "(" + p + ")").join(" or ") + "." : "Ask about its setup or rate equation.")));
      } else if (starter) {
        hintLevel = lastHintLevel + 1;
        if (hintLevel > 2) {
          answer.append(element("p", "Try the step from the last hint, then enter your equation or open the worked step below."));
        } else if (continuingHint && part && item["nudge_" + part]) {
          authored(item["nudge_" + part]);
        } else if (continuingHint) {
          answer.append(element("p", item.hint));
        } else authored(part ? item[part] : item.starterHtml);
        step = topic.steps.length ? 1 : 0;
        if (part) step = topic.parts.get(part)?.step || step;
        if (continuingHint && !part && topic.steps.length) step = 2;
      } else if (definition) {
        excerpt(topics.get("the-three-steps").node.querySelectorAll(":scope > p")[1]);
      } else if (replying) {
        authored(item["reply" + lastReply.index]);
        step = lastReply.rule.step;
      } else if (authoredIndex >= 0) {
        if (entries[authoredIndex].reply) pendingReply = {key, index:authoredIndex + 1, rule:entries[authoredIndex].reply};
        authored(item["answer" + authoredIndex]);
        step = entries[authoredIndex].step;
      } else if (exact === item.help || (!part && new RegExp(item.help.match, "i").test(q))) {
        if (item.help.reply) pendingReply = {key, index:0, rule:item.help.reply};
        authored(item.answerHtml);
        step = item.help.step;
      } else if (part && topic.parts.has(part)) {
        const hit = topic.parts.get(part);
        step = hit.step;
        excerpt(hit.paragraph);
      } else if (next || /\bstep\s*[123]\b/.test(q)) {
        step = next ? Math.min(previous + 1, 3) : Number(q.match(/\bstep\s*([123])\b/)[1]);
        showStep(topic, step);
      } else {
        const setup = /what (?:is|does).*d[a-z]\s*\/\s*dt|set.?up|givens?|given rate|sketch|draw|label|what.*(?:finding|find|asked)|what.*(?:stand for|represent)|what does.*mean/;
        const relation = /differentiat|chain rule|product rule|equation|relate the rates|relation|formula/;
        const values = /negative|positive|sign\b|increas|decreas|how fast|speed|plug|substitut|numerical|how (?:quickly|rapidly)/;
        step = setup.test(q) ? 1 : relation.test(q) ? 2 : values.test(q) ? 3 : 0;
        if (key === "the-three-steps" && /three steps/.test(q)) {
          excerpt(topic.node.querySelector(".rr-method ol"));
        } else if (step && (topic.steps.length || key === "the-three-steps")) {
          showStep(topic, step);
        } else {
          supported = false;
          answer.append(element("p", "I couldn’t place that step in “" + topic.title + ".” Which of these questions is closer?"));
          for (const a of prompts(item)) action(a.question, () => show(a.question, key));
        }
      }
      if (supported) {
        activeStep = step;
        cite(topic, topic.steps[step - 1] || topic.node);
        if (starter && !part && Object.keys(hints).length) {
          for (const letter of Object.keys(hints)) action("Hint for (" + letter + ")", () => show("Hint for part (" + letter + ")", key));
        } else if (step && step < 3 && topic.steps.length) {
          action("Next step", () => show("Next step", key));
        }
        if (!attempts.has(key)) attempts.set(key, practicePanel(key));
        answer.append(attempts.get(key));
      }
      if (endpoint) {
        action("Ask the course AI", () => {
          hidePanel();
          document.dispatchEvent(new CustomEvent("course-tutor-question", {detail: {question, section:key}}));
        });
      }
      present();
    }

    function showStep(topic, step) {
      const blocks = topic.paragraphs[step - 1];
      if (blocks?.length) {
        for (const p of blocks) excerpt(p);
      } else if (topic.node.id === "the-three-steps") {
        const row = topic.node.querySelectorAll(".rr-method li")[step - 1];
        const p = element("p");
        for (const node of row.childNodes) p.append(node.cloneNode(true));
        answer.append(p);
      } else {
        authored(checks[topic.node.id].starterHtml);
      }
    }

    function present() {
      follow.reset();
      if (!popup.open) popup.show();
      thread.scrollTop = 0;
      title.focus({preventScroll:true});
      if (window.MathJax?.typesetPromise && answer.querySelector(".math:not(:has(math, mjx-container))")) {
        window.MathJax.typesetPromise([answer]).catch(() => {});
      }
    }

    const first = questionForm("Your question", "Ask about this reading…", currentReading);
    const follow = questionForm("Ask a follow-up", "Enter a question or a line of work…", () => activeTopic || currentReading(), true);
    let pendingScroll = false;
    window.addEventListener("scroll", () => {
      if (pendingScroll || !box.open || popup.open) return;
      pendingScroll = true;
      requestAnimationFrame(() => { pendingScroll = false; first.update(); });
    }, {passive:true});
    box.append(trigger, first.form);
    popup.append(bar, thread, follow.form);
    document.body.append(box, popup);
    function hidePanel() {
      popup.close();
      box.open = false;
      minimized = true;
      trigger.textContent = "Resume help";
      trigger.focus({preventScroll:true});
    }
    box.addEventListener("toggle", () => {
      if (!box.open || popup.open) return;
      if (minimized) {
        minimized = false;
        popup.show();
        title.focus({preventScroll:true});
      } else first.field.focus({preventScroll:true});
    });
    popup.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); hidePanel(); }
    });
    box.addEventListener("keydown", e => {
      if (e.key === "Escape") { box.open = false; trigger.focus(); }
    });
  });
})();
