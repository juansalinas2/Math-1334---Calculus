#!/usr/bin/env python3
"""Keep rendered pages free of an unnecessary third-party polyfill request."""
from pathlib import Path
import os
import hashlib
import json
import re
import shutil
import subprocess
from book_navigation import rebuild_sidebar
from course_search import write_search_index

site = Path(os.environ.get('QUARTO_PROJECT_OUTPUT_DIR', '_site'))
# Older cached HTML still points at its original, hashed stylesheet.
for css in Path('assets/legacy-styles').glob('*.css'):
    shutil.copy2(css, site / 'site_libs/bootstrap' / css.name)
# A stable fallback protects new pages if a later deploy retires their CSS hash.
index = (site / 'index.html').read_text()
style = re.search(r'<link href="([^\"]+)"[^>]+id="quarto-bootstrap"', index).group(1)
shutil.copy2(site / style, site / 'site_libs/bootstrap/reading-theme.css')
# New HTML must request the matching layout CSS, not an older cached version.
layout_version = hashlib.sha256(Path('assets/reading-layout.css').read_bytes()).hexdigest()[:12]
for page in site.rglob('*.html'):
    if page in (site / 'supplements/glossary.html', site / 'map/index.html'):
        continue
    html = page.read_text()
    html = re.sub(r'\s*<script src="https://cdnjs.cloudflare.com/polyfill/[^\"]+"></script>', '', html)
    html = re.sub(r'(href="[^"?]*assets/reading-layout\.css)(?:\?[^" ]*)?"',
                  lambda match: match.group(1) + '?v=' + layout_version + '"', html)
    html = rebuild_sidebar(html, page.name)
    page.write_text(html)
# Preserve the old glossary URL without keeping a competing reference page.
shutil.copy2('assets/glossary-redirect.html', site / 'supplements/glossary.html')

# The full-page map has its own layout and is deployed alongside the book.
map_source = Path('assets/course-map')
map_output = site / 'map'
shutil.copytree(map_source, map_output, dirs_exist_ok=True, ignore=shutil.ignore_patterns('notes.json', 'theorems.json'))
node = shutil.which('node')
runner = [node] if node else ['quarto', 'run']
# Search results on the map use the lecture typography, including formulas in headings.
title_math = write_search_index(site)
subprocess.run([*runner, 'scripts/render-map-math.js', str(map_output), json.dumps(title_math)], check=True)
# Change asset URLs with their contents so returning students see a coherent release.
map_index = map_output / 'index.html'
marks = Path('scripts/figures/map-node-marks.svg').read_text()
map_html = map_index.read_text().replace('<!-- node marks -->', marks)
# Ship the shell and its interdependent scripts together so cached documents
# keep their matching controls, geometry, and typeset notation.
def inline_script(name):
    code = (map_output / name).read_text()
    code = re.sub(r'</script', lambda _: r'<\/script', code, flags=re.I)
    return '<script>\n' + code + '\n</script>'

script_tag = r'<script defer src="\./([^"]+)"></script>'
names = re.findall(script_tag, map_html)
map_html = re.sub(script_tag, '', map_html)
runtime = '\n'.join(inline_script(name) for name in names if name != 'search.js')
search_version = hashlib.sha256((map_output / 'search.js').read_bytes()).hexdigest()[:12]
map_html = map_html.replace('</body>', runtime + f'\n<script async src="./search.js?v={search_version}"></script>\n</body>')
for name in ('map.css', 'math.css'):
    css = (map_output / name).read_text()
    map_html = map_html.replace(f'<link rel="stylesheet" href="./{name}">', '<style>\n' + css + '\n</style>')
map_index.write_text(map_html)
# Earlier public shells requested map.js separately. Retain their deep links.
release = hashlib.sha256(map_html.encode()).hexdigest()[:12]
(map_output / 'map.js').write_text(
    "const mapEntry = new URL('index.html', location.href);\n"
    "mapEntry.search = location.search; mapEntry.hash = location.hash;\n"
    f"mapEntry.searchParams.set('v', '{release}');\n"
    "location.replace(mapEntry.href);\n")

guide = site / 'supplements/limits-map.html'
guide_html = guide.read_text()
for name in ('topics.js', 'math.css'):
    version = hashlib.sha256((map_output / name).read_bytes()).hexdigest()[:12]
    guide_html = re.sub(r'("\.\./map/' + re.escape(name) + r')(?:\?v=[^"]*)?"',
                        lambda m: m.group(1) + '?v=' + version + '"', guide_html)
guide.write_text(guide_html)

shutil.copy2('assets/reading-search.js', site / 'assets/reading-search.js')
search_assets = ('map/search.js', 'assets/reading-search.js')
versions = {path: hashlib.sha256((site / path).read_bytes()).hexdigest()[:12] for path in search_assets}
for page in [site / 'index.html', site / 'lecture-pdfs.html', *site.glob('lectures/*.html'), *site.glob('supplements/*.html')]:
    html = page.read_text()
    if 'id="quarto-search"' not in html:
        continue
    prefix = '../' if page.parent != site else './'
    scripts = [f'<script defer data-course-search src="{prefix}{path}?v={version}"></script>'
               for path, version in versions.items()]
    html = re.sub(r'<script defer data-course-search [^>]+></script>\n?', '', html)
    page.write_text(html.replace('</head>', '\n'.join(scripts) + '\n</head>', 1))
