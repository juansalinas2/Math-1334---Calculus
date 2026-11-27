#!/usr/bin/env python3
"""Finish the Quarto book's navigation, concept map, course search, and Ask panel."""

import hashlib
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

from book_navigation import rebuild_sidebar
from course_map import build_course_map
from course_search import write_search_index


def finish_book_pages(site):
    bootstrap = site / 'site_libs/bootstrap'
    for css in Path('assets/legacy-styles').glob('*.css'):
        shutil.copy2(css, bootstrap / css.name)

    # Cached pages use their original stylesheet. Newer pages also have a stable fallback.
    index = (site / 'index.html').read_text()
    style = re.search(r'<link href="([^"]+)"[^>]+id="quarto-bootstrap"', index)[1]
    shutil.copy2(site / style, bootstrap / 'reading-theme.css')
    layout_version = hashlib.sha256(Path('assets/reading-layout.css').read_bytes()).hexdigest()[:12]
    for page in site.rglob('*.html'):
        if page == site / 'supplements/glossary.html' or page.parent == site / 'map':
            continue
        html = page.read_text()
        html = re.sub(r'\s*<script src="https://cdnjs.cloudflare.com/polyfill/[^"]+"></script>', '', html)
        html = re.sub(
            r'(href="[^"?]*assets/reading-layout\.css)(?:\?[^" ]*)?"',
            lambda match: match[1] + '?v=' + layout_version + '"', html,
        )
        page.write_text(rebuild_sidebar(html, page.name))
    shutil.copy2('assets/glossary-redirect.html', site / 'supplements/glossary.html')


def install_search_controls(site):
    shutil.copy2('assets/reading-search.js', site / 'assets/reading-search.js')
    assets = ('map/search.js', 'assets/reading-search.js')
    versions = {path: hashlib.sha256((site / path).read_bytes()).hexdigest()[:12] for path in assets}
    pages = [site / 'index.html', site / 'lecture-pdfs.html', *site.glob('lectures/*.html'), *site.glob('supplements/*.html')]
    for page in pages:
        html = page.read_text()
        if 'id="quarto-search"' not in html:
            continue
        prefix = './' if page.parent == site else '../'
        scripts = [f'<script defer data-course-search src="{prefix}{path}?v={version}"></script>'
                   for path, version in versions.items()]
        html = re.sub(r'<script defer data-course-search [^>]+></script>\n?', '', html)
        page.write_text(html.replace('</head>', '\n'.join(scripts) + '\n</head>', 1))


def main():
    site = Path(os.environ.get('QUARTO_PROJECT_OUTPUT_DIR', '_site'))
    finish_book_pages(site)
    title_math = write_search_index(site)
    build_course_map(site, title_math)
    install_search_controls(site)
    subprocess.run([sys.executable, 'ask-notes/site_assets.py', str(site)], check=True)


if __name__ == '__main__':
    main()
