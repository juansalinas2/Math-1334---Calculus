"""The same fixed questions are delivered to the browser and verified on voluntary sharing."""
from functools import lru_cache
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


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


def browser_script():
    data = json.dumps(checks(), ensure_ascii=False).replace("<", r"\u003c")
    return (HERE / "practice.js").read_text().replace("/* COURSE_CHECKS */ null", data)
