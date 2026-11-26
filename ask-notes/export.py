"""Prepare only the public related-rates lecture for Bedrock and the local preview."""
import json
import shutil
import sys
from pathlib import Path
from practice import checks

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "scripts"))


PAGE = "lectures/related-rates.html"
BUILD = HERE / "build"


def read_passages(site):
    from course_search import BookPage
    page = site / PAGE
    if not page.is_file():
        raise SystemExit(f"Missing {page}. Render the course book with the related-rates lecture first.")
    parser = BookPage(PAGE)
    parser.feed(page.read_text())
    result = {}
    for record in parser.entries():
        key = record["href"].partition("#")[2]
        if key and record["text"] and not record["title"].startswith("Part "):
            if len(record["text"].encode()) > 2400:
                raise ValueError(f"Split the passage at {key} into smaller complete examples before exporting.")
            result[key] = {"title": record["title"], "text": record["text"]}
    if not {"the-three-steps", "ladder", "cone", "shadow"} <= result.keys():
        raise ValueError("The expected §4.1 example anchors are missing from the rendered lecture.")
    return result


def export(site):
    book = read_passages(site)
    if set(checks()) != set(book):
        raise ValueError("Match each §4.1 self-check to its published lecture section.")
    function = BUILD / "function"
    function.mkdir(parents=True, exist_ok=True)
    # Older bundles embedded a copy of the whole lecture. The live page is canonical.
    (function / "pilot.html").unlink(missing_ok=True)
    (function / "passages.json").write_text(json.dumps(book, ensure_ascii=False, indent=2))
    for name in ("app.py", "responses.py", "practice.py", "checks.json"):
        shutil.copyfile(HERE / name, function / name)
    return book


if __name__ == "__main__":
    print(f"Exported {len(export(ROOT / '_site'))} related-rates passages to ask-notes/build/.")
