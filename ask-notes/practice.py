"""The same fixed questions are delivered to the browser and verified on voluntary sharing."""
from functools import lru_cache
import re
import subprocess
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


# Shared syntax for references typed by students. The index itself comes from the
# published headings, so moving an example does not require a second lookup table.
WORDS = "zero one two three four five six seven eight nine ten eleven twelve".split()
NUMBER = r"(\d+|" + "|".join(WORDS) + r")"
REFERENCE = (r"(?:\b(example|ex\.?|practice(?:\s+problem)?|exercise|problem|question)"
             r"\s*(?:(?:number|no\.)\s*)?#?\s*|#\s*)" + NUMBER +
             r"(?:\s*\(([a-z])\)|([a-z])\b)?(?![a-z0-9])")
START = (r"\b(?:stuck|lost|confused|hint|start(?:ed|ing)?|begin|first step|"
         r"help|don't (?:get|understand)|"
         r"do not (?:get|understand))\b")
# A whole-exercise request has no mathematical detail left after its reference is removed.
# Test the entire remainder so "walk through why the sign changes" keeps its specific intent.
REQUEST_WORDS = (r"can|could|would|will|shall|may|how|do|does|did|to|of|for|on|in|at|with|about|"
                 r"let'?s|let|please|pls|i|i'd|i'm|we|us|you|me|my|the|a|an|this|that|it|one|"
                 r"want|like|need|give|show|tell|take|help|see|try|solve|solving|work|worked|"
                 r"walk|walkthrough|talk|think|go|look|explain|explanation|understand|review|"
                 r"tackle|break|through|thru|over|out|down|step|steps|by|again|together|"
                 r"from|start|beginning|solution|setup|example|exercise|problem|practice|reading|first")
WALKTHROUGH = r"^(?:(?:" + REQUEST_WORDS + r")\b[\s.,!?:;*()–—\-]*)+$"
WALK_VERB = r"\b(?:walk(?:through)?|talk|go|work|solve|explain|review|break|tackle|step[ -]by[ -]step)\b"
ALIASES = {
    "parabola": r"\bparabol",
    "circle": r"\bcirc(?:le|ular)",
    "constant-product": r"constant product|\bxy\b",
    "balloon": r"\bballoon|\bsphere",
    "cube": r"\bcube\b",
    "rectangle": r"\brectang",
    "triangle": r"\btriangle\b|\bbase and height\b",
    "ladder": r"\bladder\b",
    "boat": r"\bboat\b|\brope\b|\bdock\b",
    "cone": r"\bcone\b|\bconical\b|\btank\b",
    "shadow": r"\bshadow\b|\blamppost\b",
    "similar-triangles": r"similar triangles|scaling factor",
    "the-three-steps": r"three steps|what (?:are|is) (?:a |the )?related.?rates?",
}
PART = r"(?:\bpart\s*\(?([a-z])\b|\(([abc])\)|^\s*([a-z])\s*[?.!]?$)"


def walkthrough_request(remainder, section, has_ref):
    name = re.compile("(?:" + ALIASES[section] + r")\w*", re.I)
    has_target = has_ref or name.search(remainder)
    words = name.sub(" ", re.sub(PART, " ", remainder, flags=re.I)).strip(" \t\n.,!?:;*()–—-")
    return bool((has_target or re.search(WALK_VERB, words, re.I)) and
                (not words or re.fullmatch(WALKTHROUGH, words, re.I)))


def reference_matches(question, book):
    found = re.search(REFERENCE, question, re.I)
    if not found:
        return None
    kind, number, suffix, letter = found.groups()
    number = number.lower()
    number = str(WORDS.index(number)) if number in WORDS else str(int(number))
    kind = (kind or "").lower()
    family = ("practice" if kind.startswith(("practice", "exercise")) else
              "example" if kind.startswith("ex") else None)
    keys = []
    for key, passage in book.items():
        heading = re.match(r"(example|practice)\s+(\d+)\b", passage["title"], re.I)
        if heading and heading[2] == number and (family is None or family == heading[1].lower()):
            keys.append(key)
    return found, keys, (suffix or letter or "").lower()


@lru_cache()
def checks():
    items = json.loads((HERE / "checks.json").read_text())
    for key, item in items.items():
        count = len(item["choices"])
        if count != len(item["feedback"]) or count < 2 or not 0 <= item["correct"] < count:
            raise ValueError(f"Check the choices, explanations and answer for {key}.")
        digest = hashlib.sha256(json.dumps(item, sort_keys=True).encode()).hexdigest()
        item["version"] = digest[:16]
    return items


@lru_cache()
def browser_script():
    # Render only the authored explanations at build time. Student inputs never enter HTML.
    items = checks()
    fields = [(key, field, text) for key, item in items.items()
              for field, text in {"answerHtml": item["help"]["explanation"], "starterHtml": item["starter"],
                                  **item.get("partHints", {}),
                                  **{"nudge_" + k: v for k, v in item.get("partNudges", {}).items()},
                                  **{f"reply{i}": entry["reply"]["text"] for i, entry in
                                     enumerate([item["help"], *item.get("answers", [])]) if "reply" in entry},
                                  **{f"answer{i}": v["text"] for i, v in enumerate(item.get("answers", []))}}.items()]
    paragraphs = "\n\n".join(text for _, _, text in fields)
    result = subprocess.run(["quarto", "pandoc", "-f", "markdown+tex_math_single_backslash-raw_html",
                             "-t", "html5", "--mathml", "--wrap=none"], input=paragraphs,
                            text=True, capture_output=True, check=True)
    rendered = re.findall(r"<p>(.*?)</p>", result.stdout, re.S)
    catalog = {key: dict(item) for key, item in items.items()}
    for (key, field, _), paragraph in zip(fields, rendered, strict=True):
        catalog[key][field] = paragraph
    data = json.dumps(catalog, ensure_ascii=False).replace("<", r"\u003c")
    routing = json.dumps({"ref": REFERENCE, "words": WORDS, "start": START, "part": PART,
                          "walk": WALKTHROUGH, "walkVerb": WALK_VERB, "aliases": ALIASES})
    return (HERE / "practice.js").read_text().replace("/* COURSE_CHECKS */ null", data).replace(
        "/* COURSE_ROUTING */ null", routing)
