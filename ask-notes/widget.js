// Network functions for the class-code tutor. The lecture owns the popup and the free notes.
(() => {
  const endpoint = document.currentScript.dataset.endpoint;
  async function ask(question, section, history, code) {
    const response = await fetch(endpoint, {
      method: "POST", credentials: "omit", signal: AbortSignal.timeout(29000),
      headers: {"Content-Type": "application/json", "X-Class-Code": code},
      body: JSON.stringify({mode: "conversation", question, section, history})
    });
    const data = await response.json();
    if (!response.ok) {
      let message = data.error || "Couldn’t get a reply. Try again or choose Worked hint.";
      if (response.status === 429) {
        message = /allowance/i.test(message)
          ? "The class has used this month’s question allowance. Worked hints are still available."
          : "Several questions arrived at once. Try again in a moment.";
      }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return data;
  }
    function offerFeedback(output, data, code) {
      if (!data.receipt) return;
      const box = document.createElement("details");
      box.className = "ask-feedback";
      box.innerHTML = `
        <summary>Share with Juan</summary>
        <form><label>After reading this answer
          <select required><option value="">Choose one</option><option value="helped">I can continue</option>
          <option value="stuck">I’m still stuck</option><option value="check">Please check the explanation</option></select></label>
          <label>Your next step or what is still unclear (optional)
          <textarea rows="2" maxlength="600" placeholder="I think my next step is…"></textarea></label>
          <p>This question, its answer and sources, and your response will be available to Juan for 90 days.
          Leave out names and student IDs.</p><button type="submit">Share with instructor</button>
          <span role="status" aria-live="polite"></span></form>`;
      output.append(box);
      box.querySelector("form").addEventListener("submit", async e => {
        e.preventDefault();
        const send = box.querySelector("button"), message = box.querySelector('[role="status"]');
        if (send.disabled) return;
        send.disabled = true;
        message.textContent = "Sending…";
        try {
          const res = await fetch(new URL("feedback", new URL(endpoint, location.href)), {
            method: "POST", credentials: "omit", signal: AbortSignal.timeout(12000),
            headers: {"Content-Type": "application/json", "X-Class-Code": code},
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

  window.courseTutor = {ask, offerFeedback};
})();
