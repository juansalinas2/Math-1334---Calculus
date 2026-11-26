(() => {
  const checks = /* COURSE_CHECKS */ null;
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

  const names = {
    parabola: /\bparabol/, circle: /\bcirc(?:le|ular)/, "constant-product": /constant product|\bxy\b/,
    balloon: /\bballoon|\bsphere/, cube: /\bcube\b/, rectangle: /\brectang/,
    triangle: /\btriangle\b|\bbase and height\b/, ladder: /\bladder\b/, boat: /\bboat\b|\brope\b|\bdock\b/,
    cone: /\bcone\b|\bconical\b|\btank\b/, shadow: /\bshadow\b|\blamppost\b/,
    "similar-triangles": /similar triangles|scaling factor/, "the-three-steps": /three steps|what (?:are|is) (?:a |the )?related.?rates?/
  };

  document.addEventListener("DOMContentLoaded", () => {
    const topics = new Map();
    for (const key of Object.keys(checks)) {
      const node = document.getElementById(key);
      if (!node) continue;
      const heading = node.querySelector("h2, h3");
      const steps = [...node.querySelectorAll(".rr-step-label")];
      steps.forEach((s, i) => { s.id = key + "-study-step-" + (i + 1); });
      topics.set(key, {node, heading, title: heading.childNodes[0].textContent.trim(), steps});
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
    const close = element("button", "Close");
    close.type = "button";
    close.addEventListener("click", () => popup.close());
    bar.append(title, close);
    const asked = element("p");
    asked.className = "rr-asked";
    const answer = element("div");
    answer.className = "rr-help-answer";
    const thread = element("div");
    thread.setAttribute("aria-live", "polite");
    thread.append(asked, answer);
    let activeTopic = "";
    const attempts = new Map();

    function questionForm(labelText, placeholder, submit) {
      const form = element("form");
      const label = element("label", labelText);
      const field = element("input");
      field.type = "text";
      field.required = true;
      field.maxLength = 450;
      field.placeholder = placeholder;
      label.append(field);
      const send = element("button", "Ask");
      send.type = "submit";
      form.append(label, send);
      form.addEventListener("submit", event => {
        event.preventDefault();
        if (!field.value.trim()) { field.focus(); return; }
        submit(field.value.trim());
      });
      return {form, field};
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
      const named = ["cone", "shadow", "similar-triangles", ...topics.keys()].find(k => names[k]?.test(q));
      if (named) return named;
      if (context !== "the-three-steps") return context;
      return [...topics.keys()].find(k => normalized(checks[k].help.question) === q) || context;
    }

    function cite(topic, target) {
      const link = element("a", topic.title + (target === topic.node ? "" : " · " + target.textContent.trim()));
      link.className = "rr-source";
      link.href = "#" + target.id;
      link.addEventListener("click", event => {
        event.preventDefault();
        popup.close();
        box.open = false;
        for (let p = target.parentElement; p && p !== topic.node; p = p.parentElement) {
          if (p.tagName === "DETAILS") p.open = true;
        }
        target.tabIndex = -1;
        history.replaceState(null, "", link.hash);
        target.focus({preventScroll: true});
        target.scrollIntoView({block: "center"});
      });
      answer.append(link);
    }

    function excerpt(node) {
      const copy = node.cloneNode(true);
      for (const el of [copy, ...copy.querySelectorAll("[id]")]) el.removeAttribute("id");
      answer.append(copy);
    }

    function show(question, context) {
      const q = normalized(question);
      const definition = /what (?:are|is) (?:a |the )?related.?rates?/.test(q);
      const key = definition ? "the-three-steps" : chooseReading(q, context);
      const topic = topics.get(key);
      const item = checks[key];
      activeTopic = key;
      asked.textContent = question;
      answer.replaceChildren();
      const general = topics.get("the-three-steps");
      let target = topic.node;
      let supported = true;
      if (definition) {
        excerpt(general.node.querySelectorAll(":scope > p")[1]);
      } else if (new RegExp(item.help.match, "i").test(q)) {
        const para = element("p");
        para.innerHTML = item.answerHtml; // Only pre-rendered instructor math enters HTML.
        answer.append(para);
        target = topic.steps[item.help.step - 1] || topic.node;
      } else {
        const setup = /get started|where.*start|how.*start|set.?up|givens?|sketch|draw|label|hint|first step/;
        const relation = /differentiat|chain rule|product rule|equation|relate the rates|relation|formula/;
        const values = /negative|positive|sign\b|increas|decreas|how fast|speed|plug|substitut|numerical|how (?:quickly|rapidly)/;
        let step = setup.test(q) ? 1 : relation.test(q) ? 2 : values.test(q) ? 3 : 0;
        if (key === "the-three-steps" && /three steps/.test(q)) {
          excerpt(general.node.querySelector(".rr-method ol"));
        } else if (key === "the-three-steps" && step) {
          const line = general.node.querySelectorAll(".rr-method li")[step - 1];
          const p = element("p");
          for (const child of line.childNodes) p.append(child.cloneNode(true));
          answer.append(p);
        } else if (step && topic.steps[step - 1]) {
          target = topic.steps[step - 1];
          let part = target.closest("p").nextElementSibling;
          const subpart = /part\s*\(?([abc])\b/.exec(q)?.[1] ||
            (key === "ladder" && /negative|downward|slides? down/.test(q) ? "a" : "");
          while (part?.tagName === "P" && !part.querySelector(".rr-step-label")) {
            const marker = /^\(([abc])\)/.exec(part.textContent.trim());
            if (!marker || !subpart || marker[1] === subpart) excerpt(part);
            part = part.nextElementSibling;
          }
        } else {
          supported = false;
          answer.append(element("p", "I couldn’t find an answer to that in §4.1. Name the example and the step you’re asking about, or try this question."));
          const sample = element("button", item.help.question);
          sample.type = "button";
          sample.className = "rr-sample";
          sample.addEventListener("click", () => show(item.help.question, key));
          answer.append(sample);
        }
      }
      if (supported) {
        cite(topic, target);
        if (!attempts.has(key)) attempts.set(key, practicePanel(key));
        answer.append(attempts.get(key));
      }
      if (endpoint) {
        const live = element("button", "Ask the course AI");
        live.type = "button";
        live.addEventListener("click", () => {
          popup.close();
          document.dispatchEvent(new CustomEvent("course-tutor-question", {detail: {question, section: key}}));
        });
        answer.append(live);
      }
      follow.field.value = "";
      if (!popup.open) popup.showModal();
      popup.scrollTop = 0;
      title.focus({preventScroll: true});
      if (window.MathJax?.typesetPromise && answer.querySelector(".math:not(:has(math, mjx-container))")) {
        window.MathJax.typesetPromise([answer]).catch(() => {});
      }
    }

    const first = questionForm("Your question", "Why can’t I plug in 6 first?", q => show(q, currentReading()));
    const follow = questionForm("Ask a follow-up", "What is still unclear?", q => show(q, activeTopic));
    box.append(trigger, first.form);
    popup.append(bar, thread, follow.form);
    document.body.append(box, popup);
    box.addEventListener("toggle", () => { if (box.open && !popup.open) first.field.focus({preventScroll: true}); });
    popup.addEventListener("click", event => {
      if (event.target !== popup) return;
      const r = popup.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) popup.close();
    });
    box.addEventListener("keydown", event => {
      if (event.key === "Escape") { box.open = false; trigger.focus(); }
    });
  });
})();
