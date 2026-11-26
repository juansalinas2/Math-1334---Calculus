(() => {
  const script = document.currentScript;
  const endpoint = script.dataset.endpoint;
  const preview = script.dataset.mode === "preview";
  const standalone = preview || script.dataset.mode === "pilot";
  const root = script.dataset.root ? new URL(script.dataset.root) : new URL("../../", script.src);
  const page = "lectures/related-rates.html";

  function currentSection() {
    if (standalone) return document.querySelector("#reading")?.value || "";
    if (location.pathname !== new URL(page, root).pathname) return "";
    const headings = [...document.querySelectorAll("main section[id] > :is(h2,h3,h4)")];
    const line = Math.min(200, window.innerHeight * 0.32);
    const above = headings.filter(h => h.getBoundingClientRect().top <= line);
    const heading = above[above.length - 1];
    return heading?.parentElement.id || location.hash.slice(1);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const dialog = document.querySelector(".course-search-dialog");
    if (!dialog) return;
    const input = dialog.querySelector("#course-query");
    const panel = document.createElement("div");
    panel.className = "ask-notes";
    panel.innerHTML = `
      <details><summary>Ask the notes <small>· Related rates</small></summary>
        <form><label>Question about §4.1
          <textarea rows="2" minlength="3" maxlength="450" required
            placeholder="Why do we wait to plug in the numbers?"></textarea></label>
          <label class="ask-scope" hidden><select aria-label="Where to look"><option value="section">Use this example</option><option value="all">Search all related-rates notes</option></select></label>
          <label class="ask-code">Class code <input type="password" maxlength="120" autocomplete="off" required></label>
          <button type="submit"></button>
        </form>
        <p role="status" aria-live="polite"></p><div class="ask-answer"></div>
      </details>`;
    input.after(panel);
    const details = panel.querySelector("details");
    const form = panel.querySelector("form");
    const question = panel.querySelector("textarea");
    const code = panel.querySelector("input");
    const button = panel.querySelector("button");
    const status = panel.querySelector('[role="status"]');
    const output = panel.querySelector(".ask-answer");
    if (preview) panel.querySelector(".ask-code").hidden = true;
    code.required = !preview;
    button.textContent = preview ? "Find a passage" : "Ask";
    let request;
    let section = "";
    if (standalone) {
      details.open = true;
      const reading = document.querySelector("#reading");
      reading.value = "ladder";
      const starter = "Why can’t I plug in the 6 first?";
      question.value = starter;
      reading.addEventListener("change", () => {
        clear();
        if (!question.value || question.value === starter) question.value = reading.value === "ladder" ? starter : "";
      });
    }

    function clear() {
      request?.abort();
      request = null;
      button.disabled = false;
      status.textContent = "";
      window.MathJax?.typesetClear?.([output]);
      output.replaceChildren();
    }

    details.addEventListener("toggle", () => {
      if (!details.open) { clear(); return; }
      section = panel.dataset.selected || currentSection();
      panel.querySelector(".ask-scope").hidden = standalone || !section;
      if (input.value.trim()) question.value = input.value.trim().slice(0, 450);
      status.textContent = preview ? "Local preview · reads passages from the lecture." : "";
      if (!standalone) question.focus();
    });
    dialog.addEventListener("close", () => { details.open = false; delete panel.dataset.selected; clear(); });
    // The course search also handles arrow keys; editing an answer stays native.
    panel.addEventListener("keydown", e => {
      if (["Enter", "ArrowDown", "ArrowUp"].includes(e.key)) e.stopPropagation();
    });

    function link(source) {
      if (!source || !/^lectures\/related-rates\.html#[a-z0-9-]+$/.test(source.href)) return null;
      const a = document.createElement("a");
      a.href = new URL(source.href, root);
      a.textContent = source.title;
      if (!standalone) a.addEventListener("click", () => dialog.close());
      return a;
    }
    function offerFeedback(data) {
      if (!preview && !data.receipt) return;
      const box = document.createElement("details");
      box.className = "ask-feedback";
      box.innerHTML = `
        <summary>Share a response with Juan (optional)</summary>
        <form><label>After reading this answer
          <select required><option value="">Choose one</option><option value="helped">I can continue</option>
          <option value="stuck">I’m still stuck</option><option value="check">Please check the explanation</option></select></label>
          <label>Your next step or what is still unclear (optional)
          <textarea rows="2" maxlength="600" placeholder="I think my next step is…"></textarea></label>
          <p>Your question, the answer, its sources, and your response will be available to Juan for 90 days.
          Leave out names and student IDs.</p><button type="submit">Share with instructor</button>
          <span role="status" aria-live="polite"></span></form>`;
      output.append(box);
      box.querySelector("form").addEventListener("submit", async e => {
        e.preventDefault();
        const send = box.querySelector("button"), message = box.querySelector('[role="status"]');
        if (send.disabled) return;
        if (preview) { message.textContent = "Preview only. Your response stayed on this device."; return; }
        send.disabled = true;
        message.textContent = "Sending…";
        try {
          const res = await fetch(new URL("feedback", new URL(endpoint, location.href)), {
            method: "POST", credentials: "omit", signal: AbortSignal.timeout(12000),
            headers: {"Content-Type": "application/json", "X-Class-Code": code.value},
            body: JSON.stringify({share: true, receipt: data.receipt, exchange: data.exchange,
              rating: box.querySelector("select").value, note: box.querySelector("textarea").value})
          });
          if (!res.ok) throw new Error((await res.json()).error || "Please try sharing again.");
          box.querySelector("form").replaceChildren(document.createTextNode("Your response was shared with Juan."));
        } catch (err) {
          message.textContent = err.message; send.disabled = false;
        }
      });
    }

    if (!standalone && location.pathname === new URL(page, root).pathname) {
      for (const heading of document.querySelectorAll("main section[id] > h3")) {
        if (!/^(Example|Practice)\s+\d/.test(heading.textContent.trim())) continue;
        const ask = document.createElement("button");
        ask.type = "button"; ask.className = "ask-example"; ask.textContent = "Ask about this example";
        ask.addEventListener("click", () => {
          window.quartoOpenSearch();
          details.open = true;
          panel.dataset.selected = heading.parentElement.id;
          section = panel.dataset.selected;
          panel.querySelector(".ask-scope").hidden = false;
          panel.querySelector(".ask-scope select").value = "section";
          question.focus();
        });
        heading.after(ask);
      }
    }
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (request) return;
      clear();
      const controller = new AbortController();
      request = controller;
      button.disabled = true;
      status.textContent = "Reading the related-rates notes…";
      const timer = setTimeout(() => controller.abort(), 29000);
      try {
        let data;
        if (preview) {
          data = window.courseAskPreview(question.value.trim(), currentSection());
        } else {
          const response = await fetch(endpoint, {
            method: "POST", credentials: "omit", signal: controller.signal,
            headers: {"Content-Type": "application/json", "X-Class-Code": code.value},
            body: JSON.stringify({question: question.value.trim(), section: standalone ? currentSection() :
              (panel.querySelector(".ask-scope select").value === "all" ? "" : section)})
          });
          data = await response.json();
          if (request !== controller) return;
          if (!response.ok) throw new Error(data.error || "Ask is unavailable. Try course search.");
        }
        status.textContent = data.preview ? "From the lecture" : "";
        const answer = document.createElement("p");
        answer.textContent = data.answer;
        const excerpt = preview && data.passage && document.getElementById("passage-" + data.passage);
        output.append(excerpt ? excerpt.content.cloneNode(true) : answer);
        const sources = data.sources?.length ? data.sources : data.related || [];
        if (sources.length) {
          const label = document.createElement("strong");
          label.textContent = data.sources?.length ? "Read in the notes" : "Related passages";
          output.append(label);
          for (const source of sources) {
            const a = link(source);
            if (!a) continue;
            const row = document.createElement("div");
            if (data.sources?.length && !data.preview) row.append("[" + source.id + "] ");
            row.append(a);
            output.append(row);
          }
        }
        offerFeedback(data);
        await window.MathJax?.typesetPromise?.([output]);
      } catch (error) {
        if (request === controller) {
          status.textContent = error.name === "AbortError" ? "The request timed out. Try course search." : error.message;
        }
      } finally {
        clearTimeout(timer);
        if (request === controller) { request = null; button.disabled = false; }
      }
    });
  });
})();
