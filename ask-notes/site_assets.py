"""Add the optional tutor and the offline self-checks to the rendered book."""
import hashlib
import html
import re
from pathlib import Path
from urllib.parse import urlsplit

from practice import browser_script

HERE = Path(__file__).resolve().parent


def asset(name):
    if name == "practice.js":
        return browser_script()
    return (HERE / name).read_text()


def add_widget(document, prefix, endpoint, with_practice=False):
    document = re.sub(r'<(?:script|link) data-course-ask [^>]*>(?:</script>)?\n?', '', document)
    if 'data-course-search' not in document or not (endpoint or with_practice):
        return document
    if endpoint and (urlsplit(endpoint).scheme != "https" or not urlsplit(endpoint).netloc):
        raise ValueError("COURSE_ASK_ENDPOINT must be the HTTPS /ask endpoint from the deployed stack.")
    files = ["widget.css"]
    if endpoint:
        files.append("widget.js")
    if with_practice:
        files.append("practice.js")
    tags = []
    for file in files:
        version = hashlib.sha256(asset(file).encode()).hexdigest()[:12]
        url = prefix + "assets/ask-notes/" + file + "?v=" + version
        if file.endswith(".js"):
            tags.append(f'<script data-course-ask defer src="{url}" data-endpoint="{html.escape(endpoint, quote=True)}" '
                        'data-mode="aws"></script>')
        else:
            tags.append(f'<link data-course-ask rel="stylesheet" href="{url}">')
    return document.replace("</head>", "\n".join(tags) + "\n</head>", 1)


def install(site, endpoint):
    lecture = site / "lectures/related-rates.html"
    target = site / "assets/ask-notes"
    if endpoint or lecture.exists():
        target.mkdir(parents=True, exist_ok=True)
        files = ["widget.css"]
        if endpoint:
            files.append("widget.js")
        if lecture.exists():
            files.append("practice.js")
        for name in files:
            (target / name).write_text(asset(name))
    for folder in (site, site / "lectures", site / "supplements"):
        for page in folder.glob("*.html"):
            document = page.read_text()
            updated = add_widget(document, "./" if folder == site else "../", endpoint, page == lecture)
            if updated != document:
                page.write_text(updated)


if __name__ == "__main__":
    import os
    import sys
    endpoint = os.environ.get("COURSE_ASK_ENDPOINT", "") if os.environ.get("COURSE_ASK_BILLING_MODE") == "metered" else ""
    install(Path(sys.argv[1]), endpoint)
