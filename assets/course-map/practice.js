// Use the same lecture questions in the map without loading the game on first paint.
const practiceData = JSON.parse(document.getElementById("practice-data").textContent);
const practiceDecks = new Map();
let lectureBank;
function addLecturePractice(intro, topicId) {
  const lectureId = practiceData.topics[topicId];
  if (!lectureId) return;
  const section = document.createElement("section");
  section.className = "lecture-practice";
  const draw = document.createElement("button");
  draw.type = "button";
  draw.textContent = "Give me a practice problem";
  const card = document.createElement("div");
  card.setAttribute("aria-live", "polite");
  section.append(draw, card);
  intro.after(section);
  draw.onclick = async () => {
    draw.disabled = true;
    try {
      lectureBank ??= fetch(practiceData.bank).then(response => {
        if (!response.ok) throw new Error("Question bank unavailable");
        return response.json();
      }).catch(error => { lectureBank = null; throw error; });
      const lecture = (await lectureBank).find(item => item.id === lectureId);
      let deck = practiceDecks.get(topicId);
      if (!deck?.length) {
        deck = lecture.questions.filter(q => q.topic === topicId && q.choices && !q.graphChoices && !q.graphPrompt && q.level < 4);
        if (!deck.length) deck = lecture.questions.filter(q => q.choices && !q.graphChoices && !q.graphPrompt);
        practiceDecks.set(topicId, deck);
      }
      const index = Math.floor(Math.random() * deck.length);
      const [question] = deck.splice(index, 1);
      const prompt = document.createElement("p");
      prompt.innerHTML = question.prompt;
      const options = document.createElement("ul");
      const remaining = [...question.choices];
      while (remaining.length) {
        const item = document.createElement("li");
        item.innerHTML = remaining.splice(Math.floor(Math.random()*remaining.length), 1)[0];
        options.append(item);
      }
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Show solution";
      const answer = document.createElement("p");
      answer.innerHTML = question.choices[0] + " · " + question.why;
      const link = document.createElement("a");
      link.href = "./challenge.html?lecture=" + encodeURIComponent("s" + question.section);
      link.textContent = "Play this lecture in Critical Point";
      details.append(summary, answer);
      card.replaceChildren(prompt, options, details, link);
      draw.textContent = "Give me another problem";
    } catch {
      card.textContent = "The questions couldn’t load. Try again.";
    } finally { draw.disabled = false; }
  };
}
