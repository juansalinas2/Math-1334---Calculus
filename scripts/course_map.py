"""Build the concept map and Critical Point game under the rendered site's map/."""

import gzip
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess


def asset_version(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()[:12]


def prepare_game(map_dir):
    """Version the challenge page and return the question index for the map."""
    deck = (map_dir / 'challenge-bank.json').read_bytes()
    edition = hashlib.sha256(deck).hexdigest()[:12]
    bank_url = f'./challenge-bank.json?v={edition}'
    (map_dir / 'challenge-bank.json.gz').write_bytes(gzip.compress(deck, compresslevel=8, mtime=0))

    page = map_dir / 'challenge.html'
    html = page.read_text().replace('./challenge-bank.json', bank_url).replace('DECK_VERSION', edition)
    for name in (
        'math.css', 'challenge.css', 'runner.css', 'scores.js', 'theme.js', 'theme.css',
        'race-room.js', 'game-graphs.js', 'runner.js', 'challenge-rules.js', 'challenge.js', 'bonk.svg',
    ):
        html = html.replace(f'./{name}"', f'./{name}?v={asset_version(map_dir / name)}"')
    page.write_text(html)

    topics = {
        question['topic']: lecture['id']
        for lecture in json.loads(deck) if not lecture.get('review')
        for question in lecture['questions']
    }
    return {'bank': bank_url, 'topics': topics}


def bundle_map(map_dir, practice):
    """Keep the map's controls, diagram geometry, and typeset formulas in one page."""
    page = map_dir / 'index.html'
    marks = Path('scripts/figures/map-node-marks.svg').read_text()
    html = page.read_text().replace('<!-- node marks -->', marks)
    practice_tag = '<script type="application/json" id="practice-data">' + json.dumps(practice) + '</script>'
    html = html.replace('<!-- practice data -->', practice_tag)

    def inline_script(name):
        code = (map_dir / name).read_text()
        code = re.sub(r'</script', lambda _: r'<\/script', code, flags=re.I)
        return '<script>\n' + code + '\n</script>'

    script_tag = r'<script defer src="\./([^"]+)"></script>'
    names = re.findall(script_tag, html)
    html = re.sub(script_tag, '', html)
    runtime = '\n'.join(inline_script(name) for name in names if name != 'search.js')
    search_version = asset_version(map_dir / 'search.js')
    html = html.replace('</body>', runtime + f'\n<script async src="./search.js?v={search_version}"></script>\n</body>')
    html = html.replace('<script src="./theme.js"></script>', inline_script('theme.js'))
    for name in ('map.css', 'math.css', 'theme.css', 'systems.css', 'orbit.css'):
        css = (map_dir / name).read_text()
        html = html.replace(f'<link rel="stylesheet" href="./{name}">', '<style>\n' + css + '\n</style>')
    page.write_text(html)

    # Cached map pages request map.js separately. Carry their deep links to this edition.
    release = hashlib.sha256(html.encode()).hexdigest()[:12]
    (map_dir / 'map.js').write_text(
        "const mapEntry = new URL('index.html', location.href);\n"
        "mapEntry.search = location.search; mapEntry.hash = location.hash;\n"
        f"mapEntry.searchParams.set('v', '{release}');\n"
        "location.replace(mapEntry.href);\n"
    )


def build_course_map(site, title_math):
    map_dir = site / 'map'
    source_data = ('notes.json', 'theorems.json', 'challenge-questions.json', 'challenge-lectures', 'challenge-sections.json')
    shutil.copytree('assets/course-map', map_dir, dirs_exist_ok=True, ignore=shutil.ignore_patterns(*source_data))

    node = shutil.which('node')
    runner = [node] if node else ['quarto', 'run']
    subprocess.run([*runner, 'scripts/render-map-math.js', str(map_dir), json.dumps(title_math)], check=True)
    practice = prepare_game(map_dir)
    bundle_map(map_dir, practice)

    guide = site / 'supplements/limits-map.html'
    html = guide.read_text()
    for name in ('topics.js', 'math.css'):
        version = asset_version(map_dir / name)
        pattern = r'("\.\./map/' + re.escape(name) + r')(?:\?v=[^"]*)?"'
        html = re.sub(pattern, lambda match: match[1] + '?v=' + version + '"', html)
    guide.write_text(html)
