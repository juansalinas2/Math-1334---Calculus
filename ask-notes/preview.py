"""Package the actual rendered lecture with its figures, mathematics and reading controls."""
import argparse
import base64
import mimetypes
from pathlib import Path
import re
import subprocess
from urllib.parse import urljoin, urlsplit

from practice import browser_script

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BUILD = HERE / "build"
PAGE = "lectures/related-rates.html"
PUBLIC = "https://juansalinas2.github.io/Math-1334---Calculus/"


def data_url(file):
    mime = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
    return "data:" + mime + ";base64," + base64.b64encode(file.read_bytes()).decode()


def embed_css(file, site):
    def replace(match):
        url = match.group(2)
        if not url or url.startswith(("data:", "#")):
            return match[0]
        asset = (file.parent / urlsplit(url).path).resolve()
        if not asset.is_relative_to(site.resolve()) or not asset.is_file():
            raise ValueError(f"Missing stylesheet asset {url} in {file.name}")
        return 'url("' + data_url(asset) + '")'
    return re.sub(r"""url\(\s*(["']?)([^()]*?)\1\s*\)""", replace, file.read_text())


def make_preview(site, destination, *, metered=False):
    # Only the optional packaging step needs Beautiful Soup. Publishing the course uses the standard library.
    from bs4 import BeautifulSoup
    lecture = site / PAGE
    document = BeautifulSoup(lecture.read_text(), "html.parser")

    def append_script(code, **attrs):
        tag = document.new_tag("script", attrs=attrs)
        tag.string = code.replace("</script", r"<\/script")
        document.body.append(tag)

    # The native reading controls and page contents are independent of Quarto's generic overlay.
    for script in document.find_all("script"):
        script.decompose()
    for link in document.find_all("link"):
        if "stylesheet" in link.get("rel", []) and "ask-notes/" not in link.get("href",""):
            path = lecture.parent / urlsplit(link["href"]).path
            style = document.new_tag("style")
            style.string = embed_css(path, site)
            link.replace_with(style)
        else:
            link.decompose()
    for img in document.select("img[src]"):
        img["src"] = data_url(lecture.parent / urlsplit(img["src"]).path)
    for anchor in document.select("a[href]"):
        href = anchor["href"]
        if not href.startswith("#"):
            absolute = urljoin(PUBLIC + PAGE, href)
            if absolute.split("#")[0] == PUBLIC + PAGE:
                anchor["href"] = "#" + (urlsplit(absolute).fragment or "title-block-header")
            else:
                anchor["href"] = absolute
    document.find("meta", attrs={"name":"quarto:offset"})["content"] = PUBLIC
    # Convert all lecture formulas in one Pandoc call. MathML works without a font CDN.
    spans = document.select("span.math")
    blocks = []
    for tag in spans:
        delim = "$$" if "display" in tag.get("class", []) else "$"
        blocks.append(delim + tag.get_text().strip()[2:-2] + delim)
    result = subprocess.run(["quarto", "pandoc", "-f", "markdown", "-t", "html5", "--mathml"],
                            input="\n\n".join(blocks), text=True, capture_output=True, check=True)
    maths = BeautifulSoup(result.stdout, "html.parser").find_all("math")
    for tag, math in zip(spans, maths, strict=True):
        tag.clear()
        tag.append(math)
    for fragment in ("reading-preferences.html", "page-contents.html"):
        script = BeautifulSoup((ROOT / "assets" / fragment).read_text(), "html.parser").script.string
        if fragment == "reading-preferences.html" and not metered:
            script = script[script.index("(() => {"):]
        append_script(script)
    if metered:
        # Load the site's typesetter for new model answers. The lecture itself is already MathML.
        document.body.append(document.new_tag("script", src=PUBLIC + "assets/mathjax-4.1.3/tex-chtml.js"))
    append_script((site / "assets/course-search-index.js").read_text())
    engine = (ROOT / "assets/course-map/search.js").read_text()
    append_script(engine, **{"data-source-url": PUBLIC + "map/search.js"})
    append_script((ROOT / "assets/reading-search.js").read_text(),
                  **{"data-source-url": PUBLIC + "assets/reading-search.js", "data-local-page": PAGE})
    style = document.new_tag("style")
    style.string = (HERE / "widget.css").read_text()
    document.head.append(style)
    if metered:
        append_script((HERE / "widget.js").read_text(),
                      **{"data-mode":"aws", "data-lecture":"yes", "data-endpoint":"/ask", "data-root":PUBLIC})
    append_script(browser_script(), **{"data-endpoint":"/ask" if metered else "", "data-page":PAGE})
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(str(document))
    return destination


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", type=Path, default=ROOT / "_site")
    parser.add_argument("--output", type=Path, default=BUILD / "try-the-pilot.html")
    args = parser.parse_args()
    print(make_preview(args.site.resolve(), args.output.resolve()))
