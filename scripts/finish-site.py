#!/usr/bin/env python3
"""Keep rendered pages free of an unnecessary third-party polyfill request."""
from pathlib import Path
import os
import re
import shutil

site = Path(os.environ.get('QUARTO_PROJECT_OUTPUT_DIR', '_site'))
# Older cached HTML still points at its original, hashed stylesheet.
for css in Path('assets/legacy-styles').glob('*.css'):
    shutil.copy2(css, site / 'site_libs/bootstrap' / css.name)
# A stable fallback protects new pages if a later deploy retires their CSS hash.
index = (site / 'index.html').read_text()
style = re.search(r'<link href="([^\"]+)"[^>]+id="quarto-bootstrap"', index).group(1)
shutil.copy2(site / style, site / 'site_libs/bootstrap/reading-theme.css')
for page in site.rglob('*.html'):
    html = page.read_text()
    html = re.sub(r'\s*<script src="https://cdnjs.cloudflare.com/polyfill/[^\"]+"></script>', '', html)
    page.write_text(html)
