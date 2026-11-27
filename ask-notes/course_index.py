"""Small, read-only course index. Every result points to a heading in the public book."""
import json
import math
import re
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path
from typing import NamedTuple

from practice import REFERENCE, SHORT_REQUEST, WALKTHROUGH, WORDS

PUBLIC_PAGE = re.compile(r"^(?:(?:lectures|supplements)/[\w.-]+|index|lecture-pdfs)\.html(?:#[^\s]*)?$")
LABEL = re.compile(r"\b(Example|Practice(?: problem)?|Problem|Exercise)\s+(\d+)[.:](?=\s)")
STOP = set("a an and are as at be by can could did do does explain for from get give go how i in into is it its me my of on or our should show so that the their these this those through to us use walk we what when where which with would you why".split())
CONTEXT = re.compile(r"\b(this|that|they|them|those|here|previous|above|next|my answer|the first term|the second term)\b", re.I)
FOLLOWUP = re.compile(r"^(?:and |so )?(?:why|how come|does|but|then|which|what if)\b", re.I)
HELP = re.compile(r"\b(?:stuck|confused|hint|start|next step|walk me through|explain this|why)\b", re.I)
DETAIL = re.compile(r"^(?:so\b|why\b|how (?:come|did)\b|where (?:did|does)\b|what stays\b|if (?:only|the|we)\b|would that\b|which of\b)", re.I)
SWITCH = re.compile(r"\b(?:different|new|another) (?:topic|question|lecture)\b|\b(?:instead|switch to)\b", re.I)

# Worksheet headings can be "12. Products and powers" or "Problem 12".
NUMBERED_HEADING = re.compile(r"^(?:(example|practice(?: problem)?|exercise|problem|question)\s+(\d+)\b|(\d+)[.)]\s+)", re.I)
PART_LABEL = re.compile(r"(?<!\S)\(([a-z])\)(?=\s|$)", re.I)
# Require a reference-shaped phrase. In particular, "I got 12", "12 cm",
# "is 12 a critical number?" and "12a + 1" are mathematical content.
SHORTHAND = re.compile(
    r"(?:^\s*|\b(?:with|on|for|about|through|explain|solve|try|do)\s+)"
    r"(\d+)\s*(?:\(([a-z])\)|([a-z])\b)"
    r"(?=\s*(?:$|[?!,:;.](?:$|\s)|(?:from|in|on|please)\b))", re.I)
ON_SCREEN = re.compile(r"\b(?:this (?:problem|exercise|example|section|page|reading)|on (?:my|the) screen)\b", re.I)
PART_ONLY = re.compile(
    r"\bpart\s+\(?([a-z])\b|"
    r"(?:(?:^|\b(?:about|with|for|on|through|try|do)\s+)\(([a-z])\)|"
    r"\b(?:what about|how about)\s+([a-z])\b)(?=\s*(?:$|[?!,;:]|\.(?:\s|$)|please\b))|"
    r"^([a-z])[?.!]?$", re.I)


class ProblemRef(NamedTuple):
    kind: str
    number: int
    part: str


def problem_reference(question, *, first_turn=False):
    match = re.search(REFERENCE, question, re.I)
    if match:
        kind, number, suffix, packed = match.groups()
        number = number.lower()
        # The shared parser also accepts "problem twelve", "#12" and "ex. 12".
        spaced = re.match(r"\s+([a-z])\b(?=\s*(?:$|[?!,:;.]|(?:from|in|on)\s))", question[match.end():], re.I)
        part = suffix or packed or (spaced[1] if spaced else "")
        return ProblemRef((kind or "").lower(), WORDS.index(number) if number in WORDS else int(number), part.lower())
    match = SHORTHAND.search(question)
    if match:
        return ProblemRef("", int(match[1]), (match[2] or match[3]).lower())
    match = re.search(SHORT_REQUEST, question, re.I)
    if match:
        number = match[1].lower()
        return ProblemRef("", WORDS.index(number) if number in WORDS else int(number),
                          (match[2] or match[3] or "").lower())
    if first_turn and (match := re.fullmatch(r"\s*(\d+)\s*[?.!]?\s*", question)):
        return ProblemRef("", int(match[1]), "")
    return None


def requested_part(question, reference):
    if reference and reference.part:
        return reference.part
    match = PART_ONLY.search(question.strip())
    if match:
        return next(letter.lower() for letter in match.groups() if letter)
    return ""


def wants_exercise_start(question):
    """A reference and courtesy words alone ask for a way into the exercise."""
    if re.search(r"\b(?:solve|solution|answer|walk|walkthrough|explain|calculate|compute|all parts|step.by.step)\b", question, re.I):
        return False
    remainder = question
    for pattern in (REFERENCE, SHORT_REQUEST, SHORTHAND):
        match = re.search(pattern, question, re.I)
        if match:
            remainder = question[:match.start()] + " " + question[match.end():]
            break
    remainder = re.sub(r"\b(?:stuck|lost|confused)\b", " ", remainder.replace("’", "'"), flags=re.I).strip(" \t\n.,?!:;")
    return not remainder or remainder.isdigit() or bool(re.fullmatch(WALKTHROUGH, remainder, re.I))


def part_labels(text):
    """Only treat a sequence starting at (a) as worksheet labels."""
    labels = {}
    for match in PART_LABEL.finditer(text):
        letter = match[1].lower()
        if ord(letter) == ord("a") + len(labels):
            labels[letter] = match.start()
    return labels


def part_text(text, letter):
    labels = part_labels(text)
    if letter not in labels:
        return ""
    start = labels[letter]
    end = next((pos for pos in labels.values() if pos > start), len(text))
    return text[start:end].strip()


def formulas(text):
    for inline, display in re.findall(r"\\\((.*?)\\\)|\\\[(.*?)\\\]", text, re.S):
        formula = re.sub(r"\\(?:displaystyle|left|right)\b|\s+", "", inline or display)
        if len(formula) >= 12:
            yield formula


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
        self.numbered = defaultdict(list)
        self.worked = defaultdict(list)
        counts = Counter()
        for key, row in book.items():
            label = NUMBERED_HEADING.match(row["title"])
            if label:
                page = row["href"].split("#")[0]
                number = int(label[2] or label[3])
                self.numbered[page, number].append(((label[1] or "").lower(), key))
                statement, marker, _ = row["text"].partition("Show solution")
                if marker:
                    for formula in formulas(statement):
                        self.worked[formula].append(key)
            if not row["text"]:
                continue
            words = Counter(tokens(row["text"]))
            title = set(tokens(row["title"]))
            page = set(tokens(row["page"]))
            self.docs[key] = (words, sum(words.values()), title, page)
            counts.update(set(words) | title | page)
        self.idf = {w: math.log1p((len(self.docs) - n + .5) / (n + .5)) for w, n in counts.items()}

    def worked_example(self, section, statement):
        """Find a published worked exercise with the same displayed expression."""
        for formula in formulas(statement):
            variants = [formula]
            # A one-sided example can demonstrate a method for a two-sided limit.
            # Preserve the actual directions in the passages sent to the tutor.
            limit = re.match(r"\\lim_\{\w+\\to-?\d+\}", formula)
            if limit:
                end = limit.end() - 1
                variants.extend(formula[:end] + side + formula[end:] for side in ("^+", "^-"))
            for variant in variants:
                matches = [k for k in self.worked.get(variant, ())
                           if self.book[k]["href"] != self.book[section]["href"]]
                if matches:
                    return min(matches, key=lambda k: len(self.book[k]["text"]))
        return ""

    def search(self, question, page, section, *, followup=False):
        """Return trusted passage keys or a clarification before using any model tokens."""
        book = self.book
        page = page if page in book and "#" not in page else ""
        section = section if section in book else page
        ref = problem_reference(question, first_turn=not followup)
        part = requested_part(question, ref)
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
            name, number = ref.kind, ref.number
            family = "example" if name.startswith("ex") and not name.startswith("exercise") else "practice" if name.startswith(("practice", "exercise")) else ""
            matches = []
            for kind, key in self.numbered.get((page, number), ()):
                if not kind or not family or kind.startswith(family) or (family == "practice" and kind == "exercise"):
                    matches.append(key)
            close = [k for k in matches if section and book[k]["href"] == book[section]["href"]]
            matches = close or matches
            if len(matches) == 1:
                section = matches[0]
            else:
                where = book[page]["title"] if page else "this reading"
                if matches:
                    return [], "Which one in " + where + "? " + " or ".join(dict.fromkeys(book[k]["title"] for k in matches[:4])) + ". Open its heading and ask again."
                return [], f"I couldn’t find that numbered problem in {where}. What is its heading or first line?"
        if ref or (part and section in book and "#" in section and
                   (NUMBERED_HEADING.match(book[section]["title"]) or part_labels(book[section]["text"]))):
            if part:
                labels = part_labels(book[section]["text"])
                if labels and part not in labels:
                    available = ", ".join(f"({letter})" for letter in labels)
                    return [], f"{book[section]['page']} · {book[section]['title']} lists {available}. Which part do you mean?"
            return [section], ""
        if part and not selected:
            return [], "Which problem number or heading has the part you’re asking about?"
        if section in book and "#" in section and not selected and ON_SCREEN.search(question):
            return [section], ""
        if followup and section in book and re.fullmatch(r"\s*\d+\s*[?.!]?\s*", question):
            return [section], ""
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
        # An elliptical question about a worked exercise needs its givens, even when a
        # rare word also appears in a different lecture. Keep a second source for comparison.
        focused = local and (followup or re.match(r"^(?:Example|Problem|Practice|Exercise)\s+\d+", book[section]["title"], re.I))
        if focused and not selected and not SWITCH.search(question) and DETAIL.search(question):
            return [section] if book[first]["href"] == book[section]["href"] else [section, first], ""
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
