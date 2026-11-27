(() => {
  const checks = /* COURSE_CHECKS */ null;
  const routing = /* COURSE_ROUTING */ null;
  const refPattern = new RegExp(routing.ref, "i");
  const shortRefPattern = new RegExp(routing.shortRef, "i");
  const partPattern = new RegExp(routing.part, "i");
  const startPattern = new RegExp(routing.start, "i");
  const walkPattern = new RegExp(routing.walk, "i");
  const walkVerb = new RegExp(routing.walkVerb, "i");
  const script = document.currentScript;
  const endpoint = script.dataset.endpoint;
  const address = location.pathname.match(/(?:^|\/)((?:lectures|supplements)\/[\w.-]+\.html)$/);
  const page = address?.[1] || script.dataset.page;
  if (!page) return;
  const relatedRates = page === "lectures/related-rates.html";

  function element(tag, text) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function rememberOption() {
    const label = element("label");
    label.className = "rr-remember";
    const input = element("input");
    input.type = "checkbox";
    input.checked = true;
    label.append(input, "Remember on this browser for 90 days");
    return {label, input};
  }

  function shareForm(panel, section, check, choice) {
    const details = element("details");
    const form = element("form");
    const fields = element("label", "Class code ");
    const code = element("input");
    code.type = "password";
    code.maxLength = 120;
    fields.append(code);
    const remember = rememberOption();
    const access = window.courseTutor.access;
    function refreshCodeFields() {
      const known = Boolean(access.get());
      fields.hidden = remember.label.hidden = known;
      code.required = !known;
    }
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
    form.append(consent, fields, remember.label, comment, send, status);
    panel.append(details);
    details.addEventListener("toggle", () => {
      if (details.open) refreshCodeFields();
      else code.value = "";
    });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (send.disabled) return;
      const known = access.get();
      const supplied = known || code.value.trim();
      if (!supplied) {
        refreshCodeFields();
        code.focus();
        return;
      }
      send.disabled = true;
      status.textContent = "Sharing…";
      try {
        const response = await fetch(new URL("feedback", new URL(endpoint, location.href)), {
          method: "POST", credentials: "omit", signal: AbortSignal.timeout(12000),
          headers: {"Content-Type": "application/json", "X-Class-Code": supplied},
          body: JSON.stringify({kind: "practice", share: true, section, version: check.version,
            choice, note: note.value, attempt: receipt})
        });
        const result = await response.json();
        if (response.status === 403) {
          access.forget(supplied);
          code.value = "";
          refreshCodeFields();
        }
        if (!response.ok || !result.saved) throw new Error(result.error || "Could not share. Try again.");
        if (!known && form.isConnected) access.accept(supplied, remember.input.checked);
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
    for (const key of relatedRates ? Object.keys(checks) : []) {
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
    const firstTopic = relatedRates ? "the-three-steps" : page;
    if (!relatedRates) {
      const main = document.querySelector("main");
      if (!main) return;
      for (const node of [main, ...main.querySelectorAll("section[id]")]) {
        const heading = node === main ? node.querySelector("h1") : node.querySelector(":scope > :is(h2,h3,h4,h5,h6)");
        if (!heading) continue;
        const name = heading.cloneNode(true);
        name.querySelectorAll("a.anchorjs-link, a.anchor-section, .anchorjs-link").forEach(a => a.remove());
        const title = name.textContent.trim();
        const key = node === main ? page : page + "#" + node.id;
        const numbered = /^(?:(example|practice(?: problem)?|exercise|problem|question)\s+(\d+)\b|(\d+)[.)]\s+)/i.exec(title);
        topics.set(key, {node, title, numbered});
      }
    }
    if (!topics.has(firstTopic)) return;
    const pageTitle = document.querySelector("main h1")?.textContent.trim() || topics.get(firstTopic).title;

    const trigger = element("button", "Ask");
    trigger.type = "button";
    trigger.id = "ask-for-help";
    trigger.className = "rr-help-trigger";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", "rr-tutor");
    trigger.setAttribute("aria-expanded", "false");
    const popup = element("dialog");
    popup.id = "rr-tutor";
    popup.className = "rr-help-popup";
    popup.setAttribute("aria-labelledby", "rr-answer-title");
    const bar = element("header");
    const title = element("h2", "Ask");
    title.id = "rr-answer-title";
    title.tabIndex = -1;
    const readingLabel = element("span");
    readingLabel.className = "rr-reading";
    const move = element("button");
    move.type = "button";
    move.className = "rr-move";
    move.title = "Drag to move. Click to switch sides, or use the arrow keys.";
    move.setAttribute("aria-label", "Move panel");
    const hide = element("button");
    hide.className = "rr-minimize";
    hide.title = "Minimize";
    hide.setAttribute("aria-label", "Minimize");
    hide.type = "button";
    hide.addEventListener("click", hidePanel);
    const fresh = element("button", "New question");
    fresh.type = "button";
    fresh.className = "rr-new-question";
    fresh.hidden = true;
    fresh.addEventListener("click", newQuestion);
    const heading = element("div");
    heading.className = "rr-heading";
    heading.append(title, readingLabel);
    bar.append(heading, fresh, move, hide);
    movablePanel(popup, bar, move);
    const asked = element("p");
    asked.className = "rr-asked";
    const answer = element("div");
    answer.className = "rr-help-answer";
    const thread = element("div");
    thread.setAttribute("aria-live", "polite");
    thread.hidden = true;
    thread.append(asked, answer);
    let activeTopic = "";
    let activeStep = 0;
    let activePart = "";
    let pendingReply = null;
    let hintLevel = 0;
    const attempts = new Map();

    const chat = endpoint && window.courseTutor;
    const history = [];
    let previousView = "";
    const feedbackForms = new WeakMap();
    let pending = null;

    function newQuestion() {
      pending = null;
      history.length = 0;
      previousView = "";
      attempts.clear();
      activeTopic = ""; activePart = ""; activeStep = 0;
      pendingReply = null; hintLevel = 0;
      asked.textContent = "";
      answer.replaceChildren();
      thread.hidden = true;
      composer.setBusy(false);
      composer.reset();
      composer.field.focus({preventScroll:true});
    }

    function remember(question, text, section) {
      if (!section || !text) return;
      if (relatedRates && topics.has(section)) section = page + "#" + section;
      const turn = {question:question.slice(0,450), answer:text.slice(0,1600), section};
      history.push(turn);
      if (history.length > 3) history.shift();
      return turn;
    }

    function replyText(text, sources = []) {
      const body = element("div");
      body.className = "rr-generated-answer";
      const sourceIds = new Set(sources.map(source => String(source.id)));
      for (const chunk of text.split(/(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$)/)) {
        if (chunk.startsWith("\\[") || chunk.startsWith("$$")) {
          const block = element("div", "\\[" + chunk.slice(2, -2).trim() + "\\]");
          block.className = "rr-equation";
          body.append(block);
          continue;
        }
        for (const paragraph of chunk.split(/\n\s*\n/)) {
          const line = element("p");
          for (const part of paragraph.trim().split(/(\\\([\s\S]*?\\\)|\*\*[^*\n]+\*\*)/)) {
            if (part.startsWith("\\(")) line.append(element("span", part));
            else if (part.startsWith("**") && part.endsWith("**")) line.append(element("strong", part.slice(2, -2)));
            else line.append(document.createTextNode(part.replace(/\s*\[(\d+)\]/g, (mark, id) => sourceIds.has(id) ? "" : mark)));
          }
          if (line.textContent.trim()) body.append(line);
        }
      }
      return body;
    }

    function typesetReply(body) {
      const common = "frac dfrac tfrac sqrt left right bigl bigr Bigl Bigr mathrm mathbb mathbf mathcal mathit operatorname text cdot times pi theta ell Delta delta epsilon varepsilon alpha beta phi lambda mu sigma";
      const calculus = "sin cos tan sec csc cot arcsin arccos arctan log ln exp lim limsup liminf max min inf sup sum prod int partial nabla prime infty to mapsto longmapsto rightarrow longrightarrow implies iff Rightarrow Longrightarrow Leftrightarrow Longleftrightarrow";
      const notation = "approx le leq ge geq ne neq equiv sim simeq pm mp in notin cup cap setminus subset subseteq forall exists mid vert Vert lvert rvert ldots cdots quad qquad boxed begin end aligned displaystyle textstyle overset underbrace overbrace underline overline hline deg";
      const allowed = new Set((common + " " + calculus + " " + notation).split(" "));
      const nodes = [...body.querySelectorAll("span, .rr-equation")].filter(node =>
        (node.textContent.match(/\\[a-zA-Z]+/g) || []).every(m => allowed.has(m.slice(1))));
      if (nodes.length) window.MathJax?.typesetPromise?.(nodes).catch(() => {});
    }

    async function askTutor(question, section, code, rememberOnSuccess, view) {
      if (pending) return;
      const request = {};
      pending = request;
      composer.setBusy(true);
      asked.textContent = question;
      answer.replaceChildren(element("p", "Reading your question…"));
      present();
      try {
        const data = await chat.ask(question, section, history, code, page, view, previousView);
        if (pending !== request) return;
        if (rememberOnSuccess !== undefined) chat.access.accept(code, rememberOnSuccess);
        answer.replaceChildren();
        const body = replyText(data.answer, data.sources);
        answer.append(body);
        if (data.detail) {
          const detail = element("details");
          detail.className = "rr-detail";
          const explanation = replyText(data.detail.text, data.sources);
          detail.append(element("summary", data.detail.title), explanation);
          detail.addEventListener("toggle", () => { if (detail.open) typesetReply(explanation); }, {once:true});
          answer.append(detail);
        }
        const sourceKey = relatedRates && data.section?.startsWith(page + "#")
          ? data.section.slice(page.length + 1) : data.section;
        activeTopic = topics.has(sourceKey) ? sourceKey : section;
        activeStep = 0; pendingReply = null; hintLevel = 0; activePart = "";
        for (const source of data.sources || []) {
          const [path, anchor] = source.href.split("#");
          const topic = topics.get(relatedRates ? anchor : source.href);
          if (path === page && topic && topic.node.id) cite(topic, topic.node, source.title);
          else if (/^(?:(?:lectures|supplements)\/[\w.-]+|index|lecture-pdfs)\.html$/.test(path)) {
            const link = element("a", source.title);
            link.className = "rr-source";
            link.href = new URL(source.href, new URL(script.dataset.root || "../", location.href)).href;
            if (path !== page) {
              link.target = "_blank";
              link.rel = "noopener";
              link.setAttribute("aria-label", source.title + " (opens in a new tab)");
            }
            answer.append(link);
          }
        }
        const prior = history.slice();
        if (prior.length) {
          const earlier = element("details");
          earlier.className = "rr-history";
          earlier.append(element("summary", "Earlier replies"));
          const replies = prior.map(turn => {
            const reply = replyText(turn.answer);
            earlier.append(element("strong", turn.question), reply);
            const feedback = feedbackForms.get(turn);
            if (feedback) earlier.append(feedback);
            return reply;
          });
          earlier.addEventListener("toggle", () => {
            if (earlier.open) replies.forEach(typesetReply);
          }, {once:true});
          answer.prepend(earlier);
        }
        const feedback = chat.offerFeedback(answer, data);
        if (data.sources?.length) {
          const turn = remember(question, data.exchange?.answer || data.answer, data.section);
          if (turn) previousView = view;
          if (turn && feedback) feedbackForms.set(turn, feedback);
        }
        typesetReply(body);
      } catch (error) {
        if (pending !== request) return;
        activeTopic = section;
        answer.replaceChildren(element("p", error.status ? error.message : "Couldn’t get a reply. Try again or open the notes below."));
        if (error.status === 403) {
          chat.access.forget(code);
          composer.requestCode(question, section, view);
        } else {
          composer.field.value = question;
        }
      } finally {
        if (pending === request) {
          pending = null;
          composer.setBusy(false);
          composer.update();
        }
      }
    }

    function prompts(item) {
      return [item.help, ...(item.answers || []).filter(a => a.question)];
    }

    function questionForm() {
      const getReading = () => chat ? currentReading() : activeTopic || currentReading();
      let queued = null;
      const form = element("form");
      form.className = "rr-question-form";
      const label = element("label");
      const caption = element("span", "Your question");
      caption.className = "rr-visually-hidden";
      const field = element("input");
      field.type = "text";
      field.required = true;
      field.maxLength = 450;
      field.autocomplete = "off";
      field.placeholder = "Ask a question…";
      label.append(caption, field);
      const send = element("button", "↑");
      send.type = "submit";
      send.className = "rr-submit";
      send.setAttribute("aria-label", "Send question");
      send.title = "Send question";
      const row = element("div");
      row.className = "rr-suggestion";
      const fill = element("button");
      fill.type = "button";
      const sample = element("span");
      const keycap = element("kbd", "Tab");
      fill.append(sample, keycap);
      row.append(fill);
      const instructions = element("span", "Tab fills the suggested question. Enter asks your question. Escape dismisses the suggestion.");
      instructions.className = "rr-visually-hidden";
      instructions.id = "rr-question-keys";
      field.setAttribute("aria-describedby", instructions.id);
      sample.id = instructions.id + "-sample";
      form.append(label, send, row, instructions);
      const remember = rememberOption();
      remember.label.hidden = true;
      const tools = element("div");
      tools.className = "rr-tools";
      const hint = element("button", relatedRates ? "Worked hint" : "Read this passage");
      hint.type = "button";
      hint.className = "rr-free-hint";
      const edit = element("button", "Edit question");
      edit.type = "button";
      edit.hidden = true;
      edit.className = "rr-edit-question";
      const about = element("button", "About Ask");
      about.type = "button";
      about.setAttribute("aria-expanded", "false");
      about.setAttribute("aria-controls", "rr-about");
      const notice = element("div");
      notice.id = "rr-about";
      notice.hidden = true;
      const forget = element("button", "Forget class code");
      forget.type = "button";
      notice.append(element("p", "Ask sends your question and up to three recent exchanges to AWS. New question clears that conversation. Worked hints stay in your browser. You choose which replies to share with Juan."), forget);
      const savedQuestion = element("p");
      savedQuestion.className = "rr-pending-question";
      savedQuestion.hidden = true;
      if (chat) {
        const options = element("details");
        options.className = "rr-options";
        options.append(element("summary", "Options"), tools, notice);
        tools.append(hint, about);
        form.prepend(savedQuestion);
        form.append(remember.label, edit, options);
        about.addEventListener("click", () => {
          notice.hidden = !notice.hidden;
          forget.hidden = !chat.access.get();
          about.setAttribute("aria-expanded", String(!notice.hidden));
        });
        forget.addEventListener("click", () => {
          chat.access.forget();
          notice.hidden = true;
          about.setAttribute("aria-expanded", "false");
          newQuestion();
        });
        hint.addEventListener("click", () => {
          const question = queued?.question || field.value.trim() || "First step";
          const section = queued?.section || filledReading || getReading();
          if (relatedRates) show(question, section, true);
          else readPassage(section);
        });
        edit.addEventListener("click", () => {
          const draft = queued;
          reset();
          field.value = draft.question;
          filledReading = draft.section;
          update();
          field.focus({preventScroll:true});
        });
      }

      let suggestion = "", reading = "", dismissed = false, filledReading = "";
      function requestCode(question, section, view) {
        queued = {question, section, view};
        field.value = "";
        field.type = "password";
        field.maxLength = 120;
        field.placeholder = "Enter your class code";
        caption.textContent = "Class code";
        send.title = "Unlock and send";
        send.setAttribute("aria-label", send.title);
        remember.label.hidden = false;
        fresh.hidden = false;
        savedQuestion.textContent = question;
        savedQuestion.hidden = asked.textContent === question && !thread.hidden;
        edit.hidden = false;
        row.hidden = true;
        field.removeAttribute("aria-describedby");
        if (popup.open && popup.contains(document.activeElement)) field.focus({preventScroll:true});
      }
      function reset() {
        queued = null;
        field.value = "";
        field.type = "text";
        field.maxLength = 450;
        field.placeholder = "Ask a question…";
        send.title = "Send question";
        send.setAttribute("aria-label", send.title);
        savedQuestion.hidden = true;
        savedQuestion.textContent = "";
        remember.label.hidden = true;
        edit.hidden = true;
        dismissed = false; filledReading = "";
        update();
      }
      function update() {
        fresh.hidden = !queued && thread.hidden;
        if (chat && !notice.hidden) forget.hidden = !chat.access.get();
        if (queued) return;
        caption.textContent = asked.textContent ? "Ask a follow-up" : "Your question";
        field.placeholder = asked.textContent ? "Ask a follow-up…" : "Ask a question…";
        const raw = normalized(field.value);
        const ref = numbered(raw);
        reading = ref?.candidates.length === 1 ? ref.candidates[0] : getReading();
        const term = ref ? raw.replace(ref.match[0], "").trim() : raw;
        const topic = topics.get(reading);
        readingLabel.textContent = reading === page ? pageTitle : pageTitle + " · " + topic.title;
        readingLabel.title = readingLabel.textContent;
        const samples = relatedRates ? prompts(checks[reading]).map(a => a.question) :
          (topic.numbered || /example|practice|problem|sketch/i.test(topic.title)
            ? ["What is the first step in this problem?", "Which rule applies here, and why?"]
            : ["Can you explain this idea with an example?", "What assumptions do I need here?"]);
        suggestion = samples.find(q => {
          if (ref && ref.candidates.length !== 1) return false;
          if (normalized(asked.textContent) === normalized(q)) return false;
          const text = normalized(q);
          if (!term) return true;
          if (text === term) return false;
          if (text.startsWith(term)) return true;
          return /^[a-z]{3,}$/.test(term) && text.split(/[^a-z]+/).some(word => word.startsWith(term));
        });
        row.hidden = pending || dismissed || !suggestion || !raw;
        if (!row.hidden) sample.textContent = suggestion;
        field.setAttribute("aria-describedby", row.hidden ? instructions.id : instructions.id + " " + sample.id);
      }
      function accept() {
        const ref = numbered(normalized(field.value));
        field.value = ref && !relatedRates ? ref.label + ". " + suggestion : suggestion;
        filledReading = reading;
        dismissed = true;
        update();
        field.focus({preventScroll:true});
      }
      field.addEventListener("input", () => {
        dismissed = false; filledReading = ""; update();
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
      form.addEventListener("submit", event => {
        event.preventDefault();
        if (pending) return;
        const value = field.value.trim();
        if (!value) { field.focus(); return; }
        if (queued) {
          const {question, section, view} = queued;
          askTutor(question, section, value, remember.input.checked, view);
          return;
        }
        const view = currentReading();
        const section = filledReading || (chat ? view : getReading());
        const code = chat?.access?.get();
        if (!chat) {
          if (relatedRates) show(value, section);
          else readPassage(section);
        }
        else if (code) askTutor(value, section, code, undefined, view);
        else requestCode(value, section, view);
      });
      return {form, field, update, reset, requestCode, setBusy(busy) {
        send.disabled = hint.disabled = busy;
        field.readOnly = busy;
      }};
    }

    function currentReading() {
      const line = Math.min(170, innerHeight / 3);
      // A linked heading can land low in the viewport, especially for the last exercise.
      if (location.hash) {
        const anchor = location.hash.slice(1);
        const key = relatedRates ? anchor : page + "#" + anchor;
        const target = topics.get(key)?.node;
        if (target) {
          const bounds = target.getBoundingClientRect();
          const atEnd = window.scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
          if (bounds.top >= 0 && bounds.top < (atEnd ? innerHeight : line + 1)) return key;
        }
      }
      let current = firstTopic;
      for (const [key, topic] of topics) {
        const r = topic.node.getBoundingClientRect();
        if (r.top <= line && r.bottom >= line) current = key;
      }
      return current;
    }

    function normalized(text) {
      return text.toLowerCase().replace(/[’‘]/g, "'").trim().replace(/[?!.,:;*]+$/g, "").trim();
    }

    function wantsWalkthrough(remainder, key, ref) {
      const name = new RegExp("(?:" + names[key].source + ")\\w*", "i");
      const words = remainder.replace(partPattern, " ").replace(name, " ").replace(/^[\s.,!?:;*()–—\-]+|[\s.,!?:;*()–—\-]+$/g, "");
      return (ref || name.test(remainder) || walkVerb.test(words)) && (!words || walkPattern.test(words));
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

    function cite(topic, target, title) {
      const link = element("a", title || topic.title + (target === topic.node ? "" : " · " + target.textContent.trim()));
      link.className = "rr-source";
      link.href = "#" + target.id;
      link.addEventListener("click", event => {
        event.preventDefault();
        for (let p = target.parentElement; p && p !== topic.node; p = p.parentElement) {
          if (p.tagName === "DETAILS") p.open = true;
        }
        target.tabIndex = -1;
        window.history.replaceState(null, "", link.hash);
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

    function readPassage(section) {
      const topic = topics.get(section);
      activeTopic = section;
      asked.textContent = topic.title;
      answer.replaceChildren(element("small", "From the open notes"));
      const paragraph = [...topic.node.querySelectorAll("p")].find(p => p.textContent.trim().length > 55);
      if (paragraph) excerpt(paragraph);
      cite(topic, topic.node);
      present();
    }

    function numbered(q) {
      let match = refPattern.exec(q);
      let kindText = "", numberText, suffix, packed;
      if (match) {
        [, kindText = "", numberText, suffix, packed] = match;
      } else {
        match = shortRefPattern.exec(q) || (!history.length && /^(\d+)$/.exec(q));
        if (match) [, numberText, suffix, packed] = match;
      }
      if (!match) return null;
      const number = /^\d+$/.test(numberText) ? Number(numberText) : routing.words.indexOf(numberText);
      const kind = /^(practice|exercise)/.test(kindText) ? "practice" : kindText.startsWith("ex") ? "example" : "";
      const candidates = [...topics.keys()].filter(k => {
        const h = topics.get(k).numbered;
        return h && Number(h[2] || h[3]) === number && (!kind || !h[1] || h[1].toLowerCase().startsWith(kind) ||
          (kind === "practice" && h[1].toLowerCase() === "exercise"));
      });
      const part = suffix || packed || "";
      const label = (kindText || "Problem") + " " + number + (part ? "(" + part + ")" : "");
      return {match, candidates, part, label};
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

    function show(question, context, requestHint = false) {
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
          action(name, () => show(q.replace(ref.match[0], name.split(".")[0] + (ref.part || "")), k, requestHint));
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
      const next = /^(?:ok(?:ay)?[, ]+|and )?(?:what do (?:i|we) do next|(?:what(?:'s| is)? )?(?:the |comes? )?next(?: step)?|then what|and then|go on|continue)(?: please)?$/.test(q);
      const another = /^(?:(?:can|could) i (?:get|have) |give me )?(?:another|one more|next|second) hint(?: please)?$/.test(q);
      const part = partMatch?.slice(1).find(Boolean) || ref?.part || ((another || next) && key === activeTopic ? activePart : "");
      const continuingHint = another && key === activeTopic && hintLevel > 0;
      const lastHintLevel = continuingHint ? hintLevel : 0;
      activePart = part;
      hintLevel = 0;
      activeTopic = key;
      activeStep = 0;
      let supported = true;
      let step = 0;
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
      const starter = requestHint || /\bhint\b/.test(q) || (!exact && !next && !definition && wantsWalkthrough(remainder, key, ref)) ||
        (startPattern.test(q) && !detail && authoredIndex < 0 && !exact);
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
        if (part && topic.steps.length) step = 2;
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
      } else if (!next && part && topic.parts.has(part)) {
        const hit = topic.parts.get(part);
        step = hit.step;
        excerpt(hit.paragraph);
      } else if (next || /\bstep\s*[123]\b/.test(q)) {
        step = next ? Math.min(previous + 1, 3) : Number(q.match(/\bstep\s*([123])\b/)[1]);
        const hit = part && topic.parts.get(part);
        if (hit && hit.step === step) excerpt(hit.paragraph);
        else showStep(topic, step);
      } else {
        const setup = /what (?:is|does).*d[a-z]\s*\/\s*dt|set.?up|givens?|given rate|sketch|draw|label|what.*(?:finding|find|asked)|what.*(?:stand for|represent)|what does.*mean/;
        const relation = /differentiat|derivative|chain rule|product rule|equation|relate the rates|relation|formula/;
        const values = /negative|positive|sign\b|increas|decreas|how fast|speed|plug|substitut|numerical|how (?:quickly|rapidly)/;
        step = setup.test(q) ? 1 : relation.test(q) ? 2 : values.test(q) ? 3 : 0;
        if (key === "the-three-steps" && /three steps/.test(q)) {
          excerpt(topic.node.querySelector(".rr-method ol"));
        } else if (step && (topic.steps.length || key === "the-three-steps")) {
          showStep(topic, step);
        } else if (topic.steps.length && (ref || names[key].test(q))) {
          // We located a worked exercise. Offer its actual setup even for unfamiliar wording.
          answer.append(element("p", "Here is the setup from " + topic.title + "."));
          step = 1;
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
      if (chat && supported) {
        const copy = answer.cloneNode(true);
        copy.querySelectorAll("details, button, a").forEach(node => node.remove());
        copy.querySelectorAll("math").forEach(node => node.replaceWith(node.querySelector("annotation")?.textContent || node.textContent));
        remember(question, copy.textContent, key);
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
      thread.hidden = false;
      composer.reset();
      thread.scrollTop = 0;
      title.focus({preventScroll:true});
      if (window.MathJax?.typesetPromise && answer.querySelector(".math:not(:has(math, mjx-container))")) {
        window.MathJax.typesetPromise([answer]).catch(() => {});
      }
    }

    const composer = questionForm();
    popup.append(bar, thread, composer.form);
    document.body.append(trigger, popup);
    trigger.addEventListener("click", () => {
      popup.show();
      trigger.hidden = true;
      trigger.setAttribute("aria-expanded", "true");
      composer.update();
      composer.field.focus({preventScroll:true});
    });
    function hidePanel() {
      popup.close();
      if (composer.field.type === "password") composer.field.value = "";
      trigger.hidden = false;
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus({preventScroll:true});
    }
    popup.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); hidePanel(); }
    });
    let pendingScroll = false;
    window.addEventListener("scroll", () => {
      if (pendingScroll || !popup.open || (!chat && activeTopic)) return;
      pendingScroll = true;
      requestAnimationFrame(() => { pendingScroll = false; composer.update(); });
    }, {passive:true});
  });
})();
