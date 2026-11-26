"""The same fixed questions are delivered to the browser and verified on voluntary sharing."""
from functools import lru_cache
import re
import subprocess
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


@lru_cache()
def browser_script():
    # Render only the authored explanations at build time. Student inputs never enter HTML.
    items = checks()
    paragraphs = "\n\n".join(item["help"]["explanation"] for item in items.values())
    result = subprocess.run(["quarto", "pandoc", "-f", "markdown+tex_math_single_backslash-raw_html",
                             "-t", "html5", "--mathml", "--wrap=none"], input=paragraphs,
                            text=True, capture_output=True, check=True)
    rendered = re.findall(r"<p>(.*?)</p>", result.stdout, re.S)
    catalog = {key: {**item, "answerHtml": paragraph} for (key, item), paragraph
               in zip(items.items(), rendered, strict=True)}
    data = json.dumps(catalog, ensure_ascii=False).replace("<", r"\u003c")
    return (HERE / "practice.js").read_text().replace("/* COURSE_CHECKS */ null", data)
