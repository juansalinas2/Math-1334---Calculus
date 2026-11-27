"""Offline retrieval benchmark and optional, bounded end-to-end audit of Ask."""
import argparse
import csv
import gzip
import hashlib
import importlib.util
import json
import random
import statistics
import sys
import time
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = HERE.parent
sys.path.insert(0, str(APP))


def sha(data):
    return hashlib.sha256(data).hexdigest()


def cases():
    with (HERE / "cases.csv").open(newline="") as f:
        rows = list(csv.DictReader(f))
    if len({r["id"] for r in rows}) != len(rows):
        raise ValueError("Case IDs must be unique")
    families = {s: {r["family"] for r in rows if r["split"] == s} for s in ("dev", "test")}
    if families["dev"] & families["test"]:
        raise ValueError("Development and test families overlap")
    return rows


def read_corpus():
    return json.loads(gzip.decompress((HERE / "corpus.json.gz").read_bytes()))


def run_score(args):
    book = read_corpus()
    spec = importlib.util.spec_from_file_location("evaluated_index", args.retriever)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    index = module.Index(book)
    results = []
    for row in cases():
        if row["split"] != args.split:
            continue
        gold = row["targets"].split("|") if row["targets"] else []
        if row["section"] not in book or any(k not in book for k in gold):
            raise ValueError("Unresolvable label in " + row["id"])
        hits, message = index.search(row["question"], row["page"], row["section"])
        rank = next((i for i, k in enumerate(hits[:2], 1) if k in gold), 0)
        success = bool(rank) if gold else not hits and bool(message)
        results.append(dict(id=row["id"], family=row["family"], slice=row["slice"], targets=gold, retrieved=hits,
                            message=message, rank=rank, success=success))
    return dict(split=args.split, cases_sha=sha((HERE/"cases.csv").read_bytes()),
                corpus_sha=sha((HERE/"corpus.json.gz").read_bytes()), retriever_sha=sha(args.retriever.read_bytes()),
                metrics=metrics(results), rows=results)


def metrics(rows):
    positives = [r for r in rows if r["targets"]]
    negatives = [r for r in rows if not r["targets"]]
    def rate(values):
        return statistics.mean(values) if values else None
    return dict(n=len(rows), routed=sum(r["success"] for r in rows), answerable=len(positives),
                hit1=sum(r["rank"] == 1 for r in positives), hit2=sum(r["rank"] > 0 for r in positives),
                mrr2=rate([1/r["rank"] if r["rank"] else 0 for r in positives]),
                must_clarify=len(negatives), clarified=sum(r["success"] for r in negatives))


def compare(args):
    before, after = [json.loads(p.read_text()) for p in (args.before, args.after)]
    for k in ("split","corpus_sha","cases_sha"):
        if before[k] != after[k]:
            raise ValueError("Runs differ on " + k)
    a, b = before["rows"], after["rows"]
    if [r["id"] for r in a] != [r["id"] for r in b]:
        raise ValueError("Unpaired cases")
    differences = defaultdict(list)
    wins, losses = [], []
    for old, new in zip(a, b):
        d = int(new["success"]) - int(old["success"])
        differences[old["family"]].append(d)
        if d == 1:
            wins.append(old["id"])
        elif d == -1:
            losses.append(old["id"])
    rng = random.Random(1334)
    families = list(differences.values())
    bootstrap = []
    for _ in range(10000):
        sample = [d for family in rng.choices(families,k=len(families)) for d in family]
        bootstrap.append(sum(sample)/len(sample))
    bootstrap.sort()
    return dict(before=before["metrics"], after=after["metrics"], wins=wins, losses=losses,
                delta=(len(wins)-len(losses))/len(a), families=len(families),
                paired_family_bootstrap_95=[bootstrap[249],bootstrap[9749]],
                slices={s: [metrics([r for r in run if r["slice"] == s]) for run in (a,b)]
                        for s in sorted({r["slice"] for r in a})})


def live(args):
    from deploy import post
    code = args.class_code_file.read_text().strip()
    endpoint = (APP/"pilot-endpoint.txt").read_text().strip()
    if not endpoint.startswith("https://"):
        raise ValueError("Expected the deployed HTTPS course endpoint")
    rows = [r for r in cases() if r["split"] == "test" and r["audit"]]
    if len(rows) > 10:
        raise ValueError("The live audit allows at most ten calls.")
    audit = []
    for row in rows:
        payload = dict(mode="course", question=row["question"], section=row["section"], page=row["page"], history=[])
        start = time.monotonic()
        try:
            result = post(endpoint, code, payload)
            audit.append(dict(id=row["id"], answer=result["answer"], section=result["section"],
                              hrefs=[s["href"] for s in result["sources"]], seconds=round(time.monotonic()-start,2)))
        except Exception as e:
            audit.append(dict(id=row["id"], error=type(e).__name__, seconds=round(time.monotonic()-start,2)))
        # Never export receipts, codes, identifiers or student submissions.
        args.output.write_text(json.dumps(audit, ensure_ascii=False, indent=2)+"\n")
    return audit


def dialogues(args):
    from deploy import post
    code = args.class_code_file.read_text().strip()
    endpoint = (APP / "pilot-endpoint.txt").read_text().strip()
    tests = json.loads((HERE / "dialogues.json").read_text())
    if sum(len(test["questions"]) for test in tests) > 8 or not endpoint.startswith("https://"):
        raise ValueError("Expected a bounded run against the configured course endpoint.")
    rows = []
    for test in tests:
        history = []
        for turn, question in enumerate(test["questions"], start=1):
            payload = dict(mode="course", page=test["page"], section=test["anchor"], question=question, history=history)
            try:
                result = post(endpoint, code, payload)
            except Exception as exc:
                rows.append(dict(id=test["id"], turn=turn, error=type(exc).__name__))
                break
            rows.append(dict(id=test["id"], turn=turn, answer=result["answer"], section=result["section"],
                             hrefs=[s["href"] for s in result["sources"]]))
            if result["sources"]:
                history.append(dict(question=question, answer=result["answer"][:1600], section=result["section"]))
            args.output.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")
    return rows


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    modes = cli.add_subparsers(dest="mode", required=True)
    score_parser = modes.add_parser("score")
    score_parser.add_argument("--split", choices=["dev", "test"], required=True)
    score_parser.add_argument("--retriever", type=Path, default=APP / "course_index.py")
    comparison_parser = modes.add_parser("compare")
    comparison_parser.add_argument("before", type=Path)
    comparison_parser.add_argument("after", type=Path)
    live_parser = modes.add_parser("live")
    live_parser.add_argument("--class-code-file", type=Path, required=True)
    dialog_parser = modes.add_parser("dialogues")
    dialog_parser.add_argument("--class-code-file", type=Path, required=True)
    for parser in (score_parser, comparison_parser, live_parser, dialog_parser):
        parser.add_argument("--output", type=Path, required=True)
    args = cli.parse_args()
    operation = {"score": run_score, "compare": compare, "live": live, "dialogues": dialogues}[args.mode]
    data = operation(args)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(data["metrics"] if args.mode == "score" else f"Wrote {args.output}")


if __name__ == "__main__":
    main()
