"""Regenerate the graph's font-independent LaTeX symbols with tectonic and pdftocairo on PATH."""
import copy
import json
import os
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory
from xml.etree import ElementTree as ET

root = Path(__file__).resolve().parents[2]
notes = json.loads((root / 'assets/course-map/notes.json').read_text())
marks = sorted({note['mark'] for topic in notes.values() for note in [topic, *topic['parts']]})
svg_ns = '{http://www.w3.org/2000/svg}'
xlink_href = '{http://www.w3.org/1999/xlink}href'
tex = r"""
\documentclass{article}
\usepackage{amsmath,amssymb,lmodern}
\pagestyle{empty}
\newcommand{\markpage}[1]{\setbox0=\hbox{\kern1pt\Large$\displaystyle #1$\kern1pt}
  \pdfpagewidth=\wd0\pdfpageheight=\dimexpr\ht0+\dp0+2pt\relax
  \hoffset=-1in\voffset=-1in\shipout\vbox{\offinterlineskip\kern1pt\box0\kern1pt}}
\begin{document}
"""
sprite = ET.Element('defs', {'id': 'node-marks'})
glyphs = {}
def compact(match):
    return f'{float(match[0]):.3f}'.rstrip('0').rstrip('.')

with TemporaryDirectory() as temp:
    folder = Path(temp)
    (folder / 'marks.tex').write_text(tex + '\n'.join(r'\markpage{' + m + '}' for m in marks) + '\n' + r'\end{document}')
    bundle = os.environ.get('TECTONIC_BUNDLE')
    options = ['--bundle', bundle] if bundle else []
    subprocess.run(['tectonic', *options, 'marks.tex'], cwd=folder, check=True, stdout=subprocess.DEVNULL)
    for page, mark in enumerate(marks, 1):
        subprocess.run(['pdftocairo', '-f', str(page), '-l', str(page), '-svg', 'marks.pdf', 'mark.svg'], cwd=folder, check=True)
        drawing = ET.parse(folder / 'mark.svg').getroot()
        local = {}
        for group in drawing.findall('.//' + svg_ns + 'g[@id]'):
            path = group.find(svg_ns + 'path')
            if path is None:
                continue
            shape = re.sub(r'-?\d+\.\d+', compact, path.attrib['d'])
            if shape not in glyphs:
                glyphs[shape] = 'node-glyph-' + str(len(glyphs))
                ET.SubElement(sprite, 'path', {'id': glyphs[shape], 'd': shape})
            local['#' + group.attrib['id']] = '#' + glyphs[shape]
        symbol_id = 'mark-' + '-'.join(format(ord(c), 'x') for c in mark)
        symbol = ET.SubElement(sprite, 'symbol', {'id': symbol_id, 'viewBox': drawing.attrib['viewBox']})
        for child in drawing:
            if child.tag == svg_ns + 'defs':
                continue
            child = copy.deepcopy(child)
            for el in child.iter():
                el.tag = el.tag.removeprefix(svg_ns)
                el.attrib.pop('clip-path', None)
                if xlink_href in el.attrib:
                    el.set('href', local[el.attrib.pop(xlink_href)])
                for attr in ['fill', 'stroke']:
                    if el.get(attr, '').startswith('rgb('):
                        el.set(attr, 'currentColor')
            symbol.append(child)
        if symbol.find('.//use') is None and symbol.find('.//path') is None:
            raise ValueError('Empty graph symbol: ' + mark)

output = root / 'scripts/figures/map-node-marks.svg'
output.write_text(ET.tostring(sprite, encoding='unicode') + '\n')
print(f'{len(marks)} LaTeX marks, {len(glyphs)} shared outlines')
