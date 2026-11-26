"""Exercise ten independent, two-turn conversations through the actual class API."""
import argparse
import json
from pathlib import Path
from deploy import post

# The second message assumes the student and tutor still have the same problem open.
CASES = {
    "rectangle": ("I added 3 and -1 and got 2. What does my 2 actually measure?",
                  "So where does the 5 come from in the first term?", "side lengths vs area; width multiplies the length rate"),
    "cone": ("I flipped the triangle and got r=3h. Could that still work?",
             "At a depth of 3, what radius would that predict compared with the real one?", "proposed 9 m vs correct 1 m"),
    "ladder": ("Can we start part a without finishing it for me?",
               "Which length stays constant in that picture?", "one setup hint; rigid 10-ft ladder"),
    "shadow": ("I measured the part on the pavement and got 1. Is that what the light sees?",
               "Why do I add the person's walking speed to that?", "length vs tip; moving starting point"),
    "boat": ("If I pull in a meter of rope, why wouldn't the boat move exactly a meter?",
             "At the instant in the notes, which rate has the larger magnitude?", "diagonal/horizontal; boat 5/4 vs rope 1"),
    "cube": ("I think each edge loses 12 meters a second. Is my unit conversion right?",
             "What number do I divide by when the edge is two?", "volume vs edge; factor 12 square meters"),
    "balloon": ("How could air keep coming in at a steady rate while the radius slows down?",
                "If the radius doubles and the inflow stays the same, what happens to that speed?", "surface area; one quarter"),
    "circle": ("I differentiated the radius and got zero. Does that mean the point stops?",
               "Which coordinate decreases when it moves to the right here?", "constant radius; y decreases at (3,4)"),
    "parabola": ("I know the slope is 6. Is that already the answer?",
                 "Which other rate goes into the multiplication?", "slope vs time rate; horizontal rate 2"),
    "constant-product": ("I differentiated 12 and got zero. Could both coordinates still be moving?",
                         "If one coordinate grows here, which way does the other go?", "opposite signs at positive coordinates")
}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--endpoint", required=True)
    cli.add_argument("--class-code-file", required=True, type=Path)
    cli.add_argument("--output", type=Path, default=Path("pilot-evaluation.json"))
    args = cli.parse_args()
    code = args.class_code_file.read_text().strip()
    report = []
    for section, (first, follow, rubric) in CASES.items():
        history = []
        case = {"section": section, "review_for": rubric, "turns": []}
        for question in (first, follow):
            result = post(args.endpoint, code, {"mode": "conversation", "question": question,
                                               "section": section, "history": history})
            history.append({"question": question, "answer": result["answer"][:1600], "section": section})
            case["turns"].append({"question": question, "answer": result["answer"], "sources": result["sources"]})
        report.append(case)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2))
        print(section, "cited turns", sum(any(s["href"].endswith("#"+section) for s in t["sources"])
                                         for t in case["turns"]), "/ 2", flush=True)


if __name__ == "__main__":
    main()
