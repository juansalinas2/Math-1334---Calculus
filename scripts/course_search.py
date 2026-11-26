"""Build one searchable record per addressable heading in the rendered book."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin


def compact(parts):
    return " ".join("".join(parts).split())


class BookPage(HTMLParser):
    def __init__(self, href):
        super().__init__()
        self.href = href
        self.inside = False
        self.hidden = 0
        self.heading = None
        self.sections = []
        self.records = {}
        self.pdfs = {}
        self.pdf = None
        self.row = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "main":
            self.inside = True
            self.sections.append(self.href)
            self.records[self.href] = {"title": [], "text": [], "classes": ""}
        if not self.inside:
            return
        if tag in ("script", "style", "svg", "nav"):
            self.hidden += 1
        if self.hidden:
            return
        if tag == "section":
            anchor = attrs.get("id")
            dest = self.href + "#" + anchor if anchor else self.sections[-1]
            self.sections.append(dest)
            self.records.setdefault(dest, {"title": [], "text": [], "classes": attrs.get("class", "")})
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.heading = tag
        if tag in ("p", "li", "tr", "td", "br", "summary", "div"):
            self.handle_data(" ")
        if tag == "tr":
            self.row = []
        if tag == "a" and self.href in ("lecture-pdfs.html", "supplements/worksheets.html", "index.html"):
            path = urljoin(self.href, attrs.get("href", ""))
            if path.startswith("downloads/") and path.endswith(".pdf"):
                self.pdf = path
                self.pdfs[path] = {"title": [], "row": self.row}

    def handle_data(self, data):
        if not self.inside or self.hidden:
            return
        record = self.records[self.sections[-1]]
        record["title" if self.heading else "text"].append(data)
        if self.pdf:
            self.pdfs[self.pdf]["title"].append(data)
        if self.row is not None:
            self.row.append(data)

    def handle_endtag(self, tag):
        if not self.inside:
            return
        if tag in ("script", "style", "svg", "nav"):
            self.hidden -= 1
            return
        if self.hidden:
            return
        if tag == self.heading:
            self.heading = None
        if tag == "section":
            self.sections.pop()
        if tag == "a":
            self.pdf = None
        if tag == "tr":
            self.row = None
        if tag == "main":
            self.inside = False

    def entries(self):
        page = compact(self.records[self.href]["title"])
        for href, record in self.records.items():
            title = compact(record["title"])
            if not title:
                continue
            if "lookup-definition" in record["classes"] and self.href.endswith("/theorems.html"):
                continue  # This entry also occurs on the definitions page.
            if self.href.endswith("/definitions.html"):
                kind = "Definition"
            elif self.href.endswith("/theorems.html"):
                kind = "Theorems and rules"
            elif self.href.startswith("lectures/"):
                kind = "Lecture"
                if re.match(r"^(Example|Practice)\b", title):
                    kind = title.split()[0].strip(".")
                elif "review" in page.lower():
                    kind = "Review"
            else:
                kind = "Course material"
            yield dict(href=href, title=title, context=page, kind=kind, text=compact(record["text"]))
        for href, record in self.pdfs.items():
            yield dict(href=href, title=compact(record["title"]), context=page, kind="PDF",
                       text=compact(record["row"] or []) + " " + Path(href).stem.replace("-", " "))


def write_search_index(site):
    entries = []
    pages = [site / "index.html", site / "lecture-pdfs.html"]
    for folder in ("lectures", "supplements"):
        pages.extend(sorted((site / folder).glob("*.html")))
    for page in pages:
        if page.name == "glossary.html":
            continue
        parser = BookPage(page.relative_to(site).as_posix())
        parser.feed(page.read_text())
        if parser.records:
            entries.extend(parser.entries())
    titles = {e["href"]: e["title"] for e in entries if "#" not in e["href"]}
    notes = json.loads(Path("assets/course-map/notes.json").read_text())
    for topic in notes.values():
        for note in [topic, *topic["parts"]]:
            href = urljoin("map/index.html", note.get("href", topic["href"]))
            page = href.split("#")[0]
            if page not in titles:
                continue
            entries.append(dict(href=href, title=note["title"], kind=note["kind"],
                                context=titles[page], aliases=[note.get("aliases", "")],
                                text=" ".join(note.get(k, "") for k in ("definition", "idea", "example", "formula", "symbol"))))
    data = json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
    (site / "assets/course-search-index.js").write_text("window.courseSearchIndex=" + data + ";\n")
    return sorted({tex for entry in entries for tex in re.findall(r"\\\((.*?)\\\)", entry["title"])})
