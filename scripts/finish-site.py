#!/usr/bin/env python3
"""Keep rendered pages free of an unnecessary third-party polyfill request."""
from pathlib import Path
import os
import hashlib
import re
import shutil
import subprocess
from book_navigation import rebuild_sidebar

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
subprocess.run([*runner, 'scripts/render-map-math.js', str(map_output)], check=True)
# Change asset URLs with their contents so returning students see a coherent release.
map_index = map_output / 'index.html'
marks = Path('scripts/figures/map-node-marks.svg').read_text()
map_html = map_index.read_text().replace('<!-- node marks -->', marks)
for asset in map_source.rglob('*'):
    if asset.suffix in ('.css', '.js'):
        url = './' + asset.relative_to(map_source).as_posix()
        published_asset = map_output / asset.relative_to(map_source)
        version = hashlib.sha256(published_asset.read_bytes()).hexdigest()[:12]
        map_html = map_html.replace(f'"{url}"', f'"{url}?v={version}"')
map_index.write_text(map_html)
guide = site / 'supplements/limits-map.html'
guide_html = guide.read_text()
for name in ('topics.js', 'math.css'):
    version = hashlib.sha256((map_output / name).read_bytes()).hexdigest()[:12]
    guide_html = re.sub(r'("\.\./map/' + re.escape(name) + r')(?:\?v=[^"]*)?"',
                        lambda m: m.group(1) + '?v=' + version + '"', guide_html)
guide.write_text(guide_html)
