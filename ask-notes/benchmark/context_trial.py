"""Try adding course-map terms to the frozen passages scored by the existing retriever."""
import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

from run import cases, read_corpus
from course_index import Index


def compare(search_asset):
    book = read_corpus()
    asset = search_asset.read_bytes()
    rows = json.loads(asset.decode().strip().removeprefix("window.courseSearchIndex=").removesuffix(";"))
    context = defaultdict(set)
    for row in rows:
        key = row["href"]
        if "aliases" in row and "#" in key and key in book:
            context[key].update(term for term in [row["title"], *row["aliases"]] if term)
    augmented = {key: dict(row, text=row["text"] + " " + " ".join(sorted(context[key])))
                 if key in context else row for key, row in book.items()}
    baseline, candidate = Index(book), Index(augmented)
    candidate.book = book  # Only ranking terms change. Citations and exercise text stay identical.
    counts = defaultdict(lambda: [0, 0, 0])
    changed = []
    for row in cases():
        expected = set(row["targets"].split("|")) if row["targets"] else set()
        outcomes = []
        for index in (baseline, candidate):
            keys, clarification = index.search(row["question"], row["page"], row["section"])
            outcomes.append(bool(expected.intersection(keys[:2])) if expected else not keys and bool(clarification))
        totals = counts[row["split"]]
        totals[0] += 1
        totals[1] += outcomes[0]
        totals[2] += outcomes[1]
        if outcomes[0] != outcomes[1]:
            changed.append(row["id"])
    return {"search_asset_sha256": hashlib.sha256(asset).hexdigest(), "enriched_headings": len(context),
            "columns": ["questions", "baseline_correct", "candidate_correct"], "scores": dict(counts),
            "changed_outcomes": changed}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("search_asset", type=Path, help="Path to a rendered assets/course-search-index.js")
    print(json.dumps(compare(parser.parse_args().search_asset), indent=2))
