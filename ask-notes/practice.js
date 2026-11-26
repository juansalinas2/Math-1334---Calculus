(() => {
  const checks = /* COURSE_CHECKS */ null;
  const script = document.currentScript;
  const endpoint = script.dataset.endpoint;
  const standalone = script.hasAttribute("data-standalone");

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

  // Open the exact paragraph in the published solution, including its typeset math.
  function readingHelp(target, section, check) {
    const box = element("details");
    box.className = "rr-help";
    box.append(element("summary", "Ask about this reading"));
    const steps = [...target.querySelectorAll(":scope .rr-step-label")];
    steps.forEach((step, index) => { step.id = section + "-study-step-" + (index + 1); });
    const form = element("form");
    const label = element("label", "Your question");
    const input = element("input");
    input.type = "search";
    input.required = true;
    input.maxLength = 450;
    input.placeholder = check.help.question;
    label.append(input);
    const send = element("button", "Find an answer");
    const example = element("button", check.help.question);
    example.type = "button";
    example.className = "rr-suggest";
    const reply = element("div");
    reply.className = "rr-reply";
    reply.setAttribute("role", "status");
    function show() {
      const q = input.value.trim().toLowerCase();
      reply.replaceChildren();
      const matched = new RegExp(check.help.match, "i").test(q);
      let number;
      if (matched) {
        number = check.help.step;
        const answer = element("p");
        // answerHtml contains only the published author text rendered by Pandoc.
        answer.innerHTML = check.answerHtml;
        reply.append(answer);
      } else if (/plug|substitut|instant/.test(q)) number = 3;
      else if (/equation|relate the rates|differentiat|product rule|chain rule/.test(q)) number = 2;
      else if (/set.?up|givens?|label|sketch|draw/.test(q)) number = 1;
      const step = number && steps[number - 1];
      if (!matched && !step) {
        reply.append(element("p", "I couldn’t match that question to a step in this reading. Try the suggested question or search the course notes."));
        return;
      }
      if (!matched) reply.append(element("p", "This part of the worked example addresses your question."));
      const link = element("a", step ? step.textContent.trim() : "Read the passage");
      link.href = "#" + (step ? step.id : section);
      if (step) link.addEventListener("click", () => {
        for (let parent = step.parentElement; parent && parent !== target; parent = parent.parentElement) {
          if (parent.tagName === "DETAILS") parent.open = true;
        }
        step.tabIndex = -1;
        step.focus({preventScroll: true});
      });
      reply.append(link);
    }
    form.addEventListener("submit", event => { event.preventDefault(); show(); });
    example.addEventListener("click", () => { input.value = check.help.question; show(); });
    form.append(label, send);
    box.append(form, example, reply);
    return box;
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

  function mount(container, section, initiallyOpen, target) {
    const check = checks[section];
    if (!check) return;
    const panel = element("details");
    panel.className = "proof rr-self-check";
    panel.open = initiallyOpen;
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
    if (target) {
      const help = readingHelp(target, section, check);
      help.classList.add("proof");
      container.append(help);
    }
    container.append(panel);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (standalone) {
      const reading = document.getElementById("reading");
      const container = document.getElementById("self-check");
      // Keep a student's work while they switch between examples on this page.
      const panels = new Map();
      function select() {
        container.replaceChildren();
        const section = reading.value;
        if (!checks[section]) return;
        if (!panels.has(section)) {
          mount(container, section, true);
          panels.set(section, container.firstElementChild);
        } else {
          container.append(panels.get(section));
        }
      }
      reading.addEventListener("change", select);
      select();
    } else {
      for (const section of Object.keys(checks)) {
        const target = document.getElementById(section);
        if (!target) continue;
        const solution = target.querySelector(":scope > details.practice-solution");
        const container = element("div");
        if (solution) solution.before(container);
        else target.append(container);
        mount(container, section, false, target);
      }
    }
  });
})();
