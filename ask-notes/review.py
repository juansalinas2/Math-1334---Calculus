"""Create a private instructor report using the instructor's signed-in AWS identity."""
import argparse
from collections import Counter
from datetime import datetime, timezone
from html import escape
import json
import os
from pathlib import Path
import time

from deploy import STACK, aws
from responses import RATINGS


def read_responses(table):
    result = aws("dynamodb", "scan", "--table-name", table, "--consistent-read",
                 "--filter-expression", "attribute_exists(response_json) AND expires_at > :now",
                 "--expression-attribute-values", json.dumps({":now": {"N": str(int(time.time()))}}),
                 "--projection-expression", "response_json, shared_at")
    return [(int(item["shared_at"]["N"]), json.loads(item["response_json"]["S"])) for item in result["Items"]]


def report(rows):
    checks = [r for _, r in rows if r.get("kind") == "practice"]
    counts = Counter(r["rating"] for _, r in rows if r.get("kind") != "practice")
    summary = " · ".join(f"{label}: {counts[key]}" for key, label in RATINGS.items())
    parts = ['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">',
             '<title>Shared student responses</title><style>body{max-width:48rem;margin:3rem auto;padding:0 1rem;font:1rem/1.6 system-ui}article{border-top:1px solid #aaa}dd{margin:0 0 .8rem;white-space:pre-wrap;overflow-wrap:anywhere}dt{font-weight:bold}</style>',
             '<main><h1>Shared student responses</h1>', f'<p>Tutor exchanges: {sum(counts.values())} · {escape(summary)}</p>']
    if checks:
        parts.append(f'<h2>Self-check first choices</h2><p>{len(checks)} voluntarily shared attempts.</p>')
        totals = Counter(r["section"] for r in checks)
        misses = Counter(r["section"] for r in checks if not r["correct"])
        parts.append('<table><tr><th scope="col">Reading</th><th scope="col">Shared attempts</th><th scope="col">Incorrect first choice</th></tr>')
        for section in sorted(totals, key=lambda s: (-misses[s], s)):
            parts.append(f'<tr><td>{escape(section)}</td><td>{totals[section]}</td><td>{misses[section]}</td></tr>')
        parts.append('</table>')
    if not rows:
        parts.append('<p>No student has shared a response in the current retention window.</p>')
    for stamp, row in sorted(rows, key=lambda item: item[0], reverse=True):
        day = datetime.fromtimestamp(stamp, timezone.utc).date().isoformat()
        if row.get("kind") == "practice":
            parts.append(f'<article><h2>Self-check · {escape(row["section"])}</h2><p>{escape(row["offering"])} · {day} UTC</p><dl>')
            fields = [("Question", row["question"]), ("First choice", row["first_choice"]),
                      ("Feedback on this choice", row["feedback"]), ("Student’s reasoning", row["note"] or "—")]
            parts.extend(f'<dt>{label}</dt><dd>{escape(value)}</dd>' for label, value in fields)
            parts.append('</dl></article>')
            continue
        parts.append(f'<article><h2>{escape(RATINGS[row["rating"]])}</h2><p>{escape(row["offering"])} · {day} UTC</p><dl>')
        fields = [("Reading", row["section"] or "Whole lecture"), ("Question", row["question"]),
                  ("Tutor answer", row["answer"]), ("Student’s next step or comment", row["note"] or "—"),
                  ("Cited notes", ", ".join(row["sources"]) or "—")]
        for name, value in fields:
            parts.append(f'<dt>{name}</dt><dd>{escape(value)}</dd>')
        parts.append("</dl></article>")
    return "".join(parts) + "</main></html>"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="New report file outside the course website")
    args = parser.parse_args()
    out = args.output or Path.home() / ("math1334-responses-" + datetime.now().strftime("%Y%m%d-%H%M%S") + ".html")
    stack = aws("cloudformation", "describe-stacks", "--stack-name", STACK)["Stacks"][0]
    table = next(o["OutputValue"] for o in stack["Outputs"] if o["OutputKey"] == "ResponseTable")
    content = report(read_responses(table))
    with os.fdopen(os.open(out, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600), "w") as f:
        f.write(content)
    print("Private report:", out)
