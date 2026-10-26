#!/usr/bin/env python3
"""Keep rendered pages free of an unnecessary third-party polyfill request."""
from pathlib import Path
import os
import hashlib
import re
import shutil
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
    if page == site / 'supplements/glossary.html':
        continue
    html = page.read_text()
    html = re.sub(r'\s*<script src="https://cdnjs.cloudflare.com/polyfill/[^\"]+"></script>', '', html)
    html = re.sub(r'(href="[^"?]*assets/reading-layout\.css)(?:\?[^" ]*)?"',
                  lambda match: match.group(1) + '?v=' + layout_version + '"', html)
    html = rebuild_sidebar(html, page.name)
    page.write_text(html)
# Preserve the old glossary URL without keeping a competing reference page.
shutil.copy2('assets/glossary-redirect.html', site / 'supplements/glossary.html')
