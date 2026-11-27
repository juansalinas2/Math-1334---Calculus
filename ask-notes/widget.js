// Network functions for the class-code tutor. The lecture owns the popup and the free notes.
(() => {
  const endpoint = document.currentScript.dataset.endpoint;
  // This shared course pass carries no student identifier or conversation data.
  const storageKey = "math1334:ask:class-code:" + endpoint;
  const lifetime = 90 * 24 * 60 * 60 * 1000;
  let tabCode = "";
  function savedCode() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return "";
      const entry = JSON.parse(raw);
      if (typeof entry?.code === "string" && entry.expires > Date.now()) return entry.code;
      localStorage.removeItem(storageKey);
    } catch { /* Storage can be unavailable in a private or restricted browser. */ }
    return "";
  }
  const access = {
    get() { return tabCode || savedCode(); },
    accept(code, remember) {
      tabCode = code;
      if (!remember) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify({code, expires: Date.now() + lifetime}));
        tabCode = "";
      } catch { /* The verified code still works in this tab. */ }
    },
    forget(code) {
      if (!code || code === tabCode) tabCode = "";
      if (!code || code === savedCode()) {
        try { localStorage.removeItem(storageKey); } catch { /* No saved access. */ }
      }
    }
  };
  async function ask(question, section, history, code, page) {
    const response = await fetch(endpoint, {
      method: "POST", credentials: "omit", signal: AbortSignal.timeout(29000),
      headers: {"Content-Type": "application/json", "X-Class-Code": code},
      body: JSON.stringify({mode: "course", question, section, history, page})
    });
    const data = await response.json();
    if (!response.ok) {
      let message = data.error || "Couldn’t get a reply. Try again or choose Worked hint.";
      if (response.status === 429) {
        message = /allowance/i.test(message)
          ? "The class has used this month’s question allowance. You can still read the relevant passage below."
          : "Several questions arrived at once. Try again in a moment.";
      }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return data;
  }
  function offerFeedback(output, data) {
    const box = document.createElement("details");
    box.className = "ask-feedback";
    box.innerHTML = `
      <summary>Comment or report</summary>
      <form>
        <label>Comment for Juan <textarea rows="2" maxlength="600"></textarea></label>
        <label>Feedback type <select>
          <option value="check">Comment or correction</option>
          <option value="stuck">I’m still stuck</option>
          <option value="helped">I can continue</option>
        </select></label>
        <label hidden>Class code <input type="password" maxlength="120" autocomplete="off"></label>
        <p>Sending shares this question, answer, sources and feedback with Juan for 90 days. Omit names and student IDs.</p>
        <button type="submit">Send to Juan</button>
        <span role="status" aria-live="polite"></span>
      </form>`;
    output.append(box);
    const form = box.querySelector("form");
    if (!data.receipt || !data.exchange) {
      form.replaceChildren(document.createTextNode("Feedback is unavailable for this reply. Ask again to get a new form."));
      return box;
    }
    const send = form.querySelector("button"), status = form.querySelector('[role="status"]');
    const password = form.querySelector("input"), note = form.querySelector("textarea");
    const category = form.querySelector("select");
    function requestCode() {
      password.parentElement.hidden = false;
      password.value = "";
      password.focus();
      status.textContent = "Re-enter your class code to send this feedback.";
    }
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (send.disabled) return;
      const code = password.value.trim() || access.get();
      if (!code) { requestCode(); return; }
      send.disabled = true;
      status.textContent = "Sending…";
      try {
        const response = await fetch(new URL("feedback", new URL(endpoint, location.href)), {
          method: "POST", credentials: "omit", signal: AbortSignal.timeout(12000),
          headers: {"Content-Type": "application/json", "X-Class-Code": code},
          body: JSON.stringify({share: true, receipt: data.receipt, exchange: data.exchange,
            rating: category.value, note: note.value})
        });
        if (response.status === 403) { access.forget(code); requestCode(); return; }
        if (response.status === 409) {
          status.textContent = "This form expired or was already sent. Copy your comment before starting a new question.";
          return;
        }
        if (!response.ok || (await response.json()).saved !== true) throw new Error();
        if (password.value) access.accept(code, false);
        form.replaceChildren(status);
        status.textContent = "Feedback sent to Juan.";
      } catch {
        status.textContent = "Couldn’t confirm delivery. Your comment is here. Try sending again.";
      } finally {
        password.value = "";
        send.disabled = false;
      }
    });
    return box;
  }

  window.courseTutor = {ask, offerFeedback, access};
})();
