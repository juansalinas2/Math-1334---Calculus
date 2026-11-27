"""Paired test of reusable demonstrations using the same model and course evidence."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import random
import secrets
import sys
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import app

# All examples use other problems. The model chooses the move from the dialogue.
DEMONSTRATIONS = r"""
Teaching examples. Use these only as models of interaction. Use the student's own
symbols, numbers and goal from the course passage in the actual answer.
Student: I took west as positive. Is my velocity of +3 wrong if the key says -3?
Tutor: With west positive, +3 describes motion west. The key's sign is consistent
with east positive. Both describe the same motion if the units and speed agree.
Student: I have 3(t+2)=3t+2. Did I copy the left side wrong?
Tutor: Your left side is fine. The 3 multiplies both terms, giving 3t+6.
Student: I still can't picture what a midpoint means.
Tutor: Mark 2 and 8 on a line. Moving 3 units inward from either end takes you to 5.
Student: What does n in Z mean?
Tutor: It says n is an integer, for example -2, 0, or 7.
If the student has proposed a method, test it on its own terms. Give evidence
for your judgment. Stop once their question is answered.
"""


def cases_and_book():
    cases = json.loads((HERE / "teaching-cases.json").read_text())
    with gzip.open(HERE / "corpus.json.gz", "rt") as f:
        book = json.load(f)
    assert len(cases) == len({c["id"] for c in cases})
    for case in cases:
        assert book[case["section"]]["text"] and case["criterion"]
    return cases, book


def trial(cases, book, directory):
    # Creating a new directory protects earlier blinded assignments and samples.
    directory.mkdir(parents=True, exist_ok=False)
    seed = secrets.randbits(64)
    rng = random.Random(seed)
    order = list(cases)
    rng.shuffle(order)
    assignments = {}
    jobs = []
    for c in order:
        arms = ["baseline", "demonstrations"]
        rng.shuffle(arms)
        assignments[c["id"]] = dict(zip(("A", "B"), arms))
        jobs.extend((c, label, arm) for label, arm in assignments[c["id"]].items())
    rng.shuffle(jobs)
    (directory / "key.json").write_text(json.dumps(assignments, indent=2))
    used = 0
    original_reserve, original_settle = app.reserve_request, app.settle_request

    def reserve(bound):
        nonlocal used
        if used + bound > 100_000:
            raise RuntimeError("This run reached its ten-cent model reservation limit.")
        month = original_reserve(bound)
        if month:
            used += bound
        return month

    def settle(month, bound, usage):
        nonlocal used
        original_settle(month, bound, usage)
        counts = [usage.get(k) for k in ("inputTokens", "outputTokens")]
        if all(type(n) is int and n >= 0 for n in counts):
            used -= max(0, bound - app.cost_bound(*counts))

    with (directory / "answers.jsonl").open("x") as out:
        for c, label, arm in jobs:
            section = c["section"]
            history = ([dict(question=c["prior"][0], answer=c["prior"][1], section=section)]
                       if "prior" in c else [])
            extra = DEMONSTRATIONS if arm == "demonstrations" else ""
            with patch.multiple(app, INSTRUCTIONS=app.INSTRUCTIONS + extra,
                                HINT_INSTRUCTIONS=app.HINT_INSTRUCTIONS + extra,
                                reserve_request=reserve, settle_request=settle):
                reply = app.generate(c["question"], section, [section], history, book,
                                     c.get("part", ""), open_reading={
                                         "page": book[section]["page"], "heading": book[section]["title"]})
            print(json.dumps(dict(id=c["id"], label=label, **reply), ensure_ascii=False), file=out, flush=True)
    manifest = {"model": app.MODEL, "temperature": 0, "seed": seed, "model_microdollars": used,
                "cases_sha256": hashlib.sha256((HERE / "teaching-cases.json").read_bytes()).hexdigest(),
                "corpus_sha256": hashlib.sha256((HERE / "corpus.json.gz").read_bytes()).hexdigest()}
    (directory / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"{len(jobs)} answers. Model usage at configured rates: ${used / 1_000_000:.5f}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", type=Path, help="New output directory. Omitting this runs free input checks.")
    args = parser.parse_args()
    cases, book = cases_and_book()
    if args.run:
        if not os.environ.get("QUOTA_TABLE"):
            parser.error("Set QUOTA_TABLE to the existing Oregon Ask quota table for a metered run.")
        trial(cases, book, args.run)
    else:
        print(f"{len(cases)} cases have matching frozen course passages.")
