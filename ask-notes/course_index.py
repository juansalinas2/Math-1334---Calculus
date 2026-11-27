"""Small, read-only course index. Every result points to a heading in the public book."""
import json
import math
import re
from collections import Counter
from functools import lru_cache
from pathlib import Path

from practice import REFERENCE, WORDS

PUBLIC_PAGE = re.compile(r"^(?:(?:lectures|supplements)/[\w.-]+|index|lecture-pdfs)\.html(?:#[^\s]*)?$")
LABEL = re.compile(r"\b(Example|Practice(?: problem)?|Problem|Exercise)\s+(\d+)[.:](?=\s)")
STOP = set("a an and are as at be by can could did do does explain for from get give go how i in into is it its me my of on or our should show so that the their these this those through to us use walk we what when where which with would you why".split())
CONTEXT = re.compile(r"\b(this|that|they|them|those|here|previous|above|next|my answer|the first term|the second term)\b", re.I)
FOLLOWUP = re.compile(r"^(?:and |so )?(?:why|how come|does|but|then|which|what if)\b", re.I)
HELP = re.compile(r"\b(?:stuck|confused|hint|start|next step|walk me through|explain this|why)\b", re.I)


def build(rows):
    book = {}
    for row in rows:
        href = row["href"]
        if row.get("aliases") is not None or row["kind"] == "PDF" or not PUBLIC_PAGE.fullmatch(href):
            continue
        body = row["text"].strip()
        base = dict(title=row["title"], page=row["context"], href=href, text=body)
        book[href] = base
        if re.match(r"^(Example|Practice|Problem|Exercise)\s+\d+\b", row["title"], re.I):
            continue
        marks = list(LABEL.finditer(body))
        for n, mark in enumerate(marks):
            label = mark[0].rstrip(".:")
            chunk = body[mark.start():marks[n + 1].start() if n + 1 < len(marks) else None].strip()
            book[f"{href}::{n + 1}"] = dict(base, title=f"{label} · {row['title']}", text=chunk)
    return book


@lru_cache(maxsize=1)
def corpus():
    return json.loads(Path(__file__).with_name("course.json").read_text())


def tokens(text):
    text = text.casefold().replace("’", "'").replace("l'hôpital", "lhospital").replace("l'hospital", "lhospital")
    for short, name in (("ivt", "intermediate value theorem"), ("mvt", "mean value theorem"),
                        ("evt", "extreme value theorem"), ("derivatives", "derivative"),
                        ("limits", "limit"), ("differentiating", "derivative"), ("differentiate", "derivative"),
                        ("differentiation", "derivative"), ("functions", "function")):
        text = re.sub(r"\b" + short + r"\b", name, text)
    return [w for w in re.findall(r"[a-z]{2,}|\d+", text) if w not in STOP]


class Index:
    def __init__(self, book):
        self.book = book
        self.docs = {}
        counts = Counter()
        for key, row in book.items():
            if not row["text"]:
                continue
            words = Counter(tokens(row["text"]))
            title = set(tokens(row["title"]))
            page = set(tokens(row["page"]))
            self.docs[key] = (words, sum(words.values()), title, page)
            counts.update(set(words) | title | page)
        self.idf = {w: math.log1p((len(self.docs) - n + .5) / (n + .5)) for w, n in counts.items()}

    def search(self, question, page, section):
        """Return trusted passage keys or a clarification before using any model tokens."""
        book = self.book
        page = page if page in book and "#" not in page else ""
        section = section if section in book else page
        ref = re.search(REFERENCE, question, re.I)
        words = set(tokens(question))
        selected = re.search(r"(?:§|\bsection\s*)\s*(\d+\.\d+)\b", question, re.I)
        if selected:
            wanted = selected[1]
            page = next((k for k, r in book.items() if "#" not in k and r["page"].split(" ")[0] == wanted), "")
            if not page:
                return [], f"I couldn’t find section {wanted} in the published notes."
            section = page
        if ref:
            if not selected:
                for candidate, row in book.items():
                    if "#" in candidate or not candidate.startswith("lectures/") or "::" in candidate:
                        continue
                    name = re.sub(r"^[\d.]+\s+|^the\s+", "", row["page"].casefold()).removeprefix("the ")
                    if name and re.search(r"\b(?:from|in|on)\s+(?:the\s+)?" + re.escape(name) + r"\b", question, re.I):
                        page = candidate
                        break
            name, number = (ref[1] or "").lower(), ref[2].lower()
            number = str(WORDS.index(number)) if number in WORDS else str(int(number))
            family = "example" if name.startswith("ex") and not name.startswith("exercise") else "practice" if name.startswith(("practice", "exercise")) else ""
            pattern = re.compile(r"^(example|practice(?: problem)?|exercise|problem|question)\s+" + number + r"\b", re.I)
            matches = []
            for key, row in book.items():
                label = pattern.match(row["title"])
                if row["href"].split("#")[0] != page or not label:
                    continue
                if not family or label[1].lower().startswith(family) or (family == "practice" and label[1].lower() == "exercise"):
                    matches.append(key)
            close = [k for k in matches if section and book[k]["href"] == book[section]["href"]]
            matches = close or matches
            if len(matches) == 1:
                return matches, ""
            where = book[page]["title"] if page else "this reading"
            if matches:
                return [], "Which one in " + where + "? " + " or ".join(dict.fromkeys(book[k]["title"] for k in matches[:4])) + ". Open its heading and ask again."
            return [], f"I couldn’t find that numbered problem in {where}. What is its heading or first line?"
        known = section in self.docs
        local = known and "#" in section
        recognized = words & self.idf.keys()
        # An unrelated query can share one incidental word with hundreds of course passages.
        # Preserve short requests for help as well as expressions such as dy/dt or x².
        if (words and len(recognized) / len(words) < .45 and
                not (local and (HELP.search(question) or re.search(r"[=^/²³]", question)))):
            return [], "I couldn’t connect that question to the course notes. Which calculus topic or problem do you mean?"
        ranked = []
        query_terms = sorted(words)
        for key, (counts, length, title, page_words) in self.docs.items():
            score = 0
            for w in query_terms:
                n = counts[w]
                score += self.idf.get(w, 0) * (2.2*n/(n+1.2*(.35+.65*length/80)) + 2.5*(w in title) + .45*(w in page_words))
            if score:
                if len(words) >= 2 and words == title:
                    score += sum(self.idf[w] for w in query_terms)
                if book[key]["href"].split("#")[0] == page:
                    score *= 1.15
                if key == section:
                    score *= 1.25
                # A lecture or reference entry is more useful for explanation than a review checklist.
                if book[key]["href"].startswith(("supplements/limits-map.html", "supplements/self-checks.html")):
                    score *= .72
                ranked.append((score, key))
        ranked.sort(reverse=True)
        if known and (not ranked or (CONTEXT.search(question) and ranked[0][0] < 13) or
                      len(words) <= 2 and ranked[0][0] < 7):
            return [section], ""
        if not ranked:
            return [], "Which topic or example in the notes are you asking about?"
        top, first = ranked[0]
        if known and CONTEXT.search(question) and first != section:
            if book[first]["href"] == book[section]["href"]:
                return [section], ""
            return [section, first], ""
        if local and FOLLOWUP.search(question) and first != section:
            counts, _, title, _ = self.docs[section]
            if len(words.intersection(counts.keys() | title)) >= 2:
                return [section, first] if book[section]["href"] != book[first]["href"] else [section], ""
        keys = [first]
        for score, key in ranked[1:]:
            if score < .64 * top:
                break
            if book[key]["href"] != book[first]["href"]:
                keys.append(key)
                break
        return keys, ""


@lru_cache(maxsize=1)
def index():
    return Index(corpus())
