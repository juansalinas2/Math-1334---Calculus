"""Prepare the map's LaTeX once so navigating the graph needs no typesetting."""
import json
import re
import subprocess


def write_topics(source, destination):
    notes = json.loads((source / 'notes.json').read_text())
    graph_strings = re.findall(r'"(?:\\.|[^"\\])*"', (source / 'graph.js').read_text())
    texts = [*iter_text(notes), *(json.loads(s) for s in graph_strings if '$' in s)]
    formulas = sorted({tex for text in texts for tex in re.findall(r'\$([^$\n]+)\$', text)})
    result = subprocess.run(
        ['quarto', 'pandoc', '--from=markdown', '--to=html5', '--mathml', '--wrap=none'],
        input='\n\n'.join('$' + tex + '$' for tex in formulas),
        text=True, capture_output=True, check=True,
    )
    equations = re.findall(r'<math\b.*?</math>', result.stdout, re.S)
    if len(equations) != len(formulas) or result.stderr.strip():
        raise ValueError('Map equation conversion failed: ' + result.stderr)
    # KaTeX/MathJax downloads and DOM-wide rerenders are unnecessary for this static material.
    content = 'const courseTopics = ' + json.dumps(notes, ensure_ascii=False) + ';\n'
    content += 'const mapEquations = ' + json.dumps(dict(zip(formulas, equations)), ensure_ascii=False) + ';\n'
    destination.write_text(content + (source / 'topics.js').read_text())


def iter_text(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for element in value:
            yield from iter_text(element)
    elif isinstance(value, dict):
        for element in value.values():
            yield from iter_text(element)
