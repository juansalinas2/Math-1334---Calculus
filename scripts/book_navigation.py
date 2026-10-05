"""Group book sections without turning each reading page into a chapter.

Quarto books replace sidebar.contents with the chapter list. Keep native book
numbering and page navigation, then group its existing links in closed details.
"""
import html as html_lib
import re
from urllib.parse import urlsplit

SECTIONS = [
    '02-limits.html', '03-infinite-limits.html', '04-limit-laws.html',
    '05-squeeze-theorem.html', '06-continuity.html', '07-intermediate-value.html',
    '08-exam-practice.html',
]
SUPPLEMENTS = ['limits-map.html', 'worksheets.html', 'glossary.html', 'self-checks.html', 'explore.html']


def rebuild_sidebar(html, page_name):
    match = re.search(r'<div class="sidebar-menu-container">[\s\S]*?</nav>', html)
    if not match:
        raise ValueError(f'Book sidebar missing: {page_name}')
    if 'class="book-nav-group"' in match[0]:
        return html
    leaves = {}
    hrefs = {}
    for leaf in re.findall(r'<li class="sidebar-item">[\s\S]*?</li>', match[0]):
        href = re.search(r'<a href="([^"]+)"', leaf)[1]
        name = urlsplit(html_lib.unescape(href)).path.rsplit('/', 1)[-1]
        leaves[name] = leaf
        hrefs[name] = href

    def group(title, children, parent=None):
        if parent:
            label = re.search(r'<a\b[\s\S]*?</a>', leaves[parent])[0]
        else:
            label = f'<span class="sidebar-item-text">{html_lib.escape(title)}</span>'
        active = ' current-group' if page_name in children or page_name == parent else ''
        items = ''.join(leaves[name] for name in children)
        return (f'<li class="sidebar-item sidebar-item-section{active}">'
                f'<details class="book-nav-group"><summary aria-label="Expand or collapse {html_lib.escape(title)}">'
                f'{label}</summary><ul class="list-unstyled sidebar-section depth1">{items}</ul></details></li>')

    intro = '01-introduction.html'
    intro_children = []
    for anchor, title in [
        ('what-is-calculus', 'What is calculus?'),
        ('how-was-calculus-invented', 'How was calculus invented?'),
        ('how-do-we-use-calculus', 'How do we use calculus?'),
        ('what-will-we-learn-about-calculus', 'What will we learn?'),
    ]:
        key = 'intro-' + anchor
        leaves[key] = (f'<li class="sidebar-item"><a class="sidebar-item-text sidebar-link" '
                       f'href="{hrefs[intro]}#{anchor}">{title}</a></li>')
        intro_children.append(key)
    menu = (
        leaves['index.html']
        + group('Chapter 1', intro_children, intro)
        + group('Chapter 2', SECTIONS, 'limits-and-continuity.html')
        + group('Supplements', SUPPLEMENTS)
        + leaves['lecture-pdfs.html']
        + group('Appendices', ['00-functions.html'])
    )
    html = html[:match.start()] + '<div class="sidebar-menu-container"><ul class="list-unstyled mt-1">' + menu + '</ul></div></nav>' + html[match.end():]
    if page_name in SECTIONS:
        context = '<p class="chapter-context"><a href="' + hrefs['limits-and-continuity.html'] + '">Chapter 2 · Limits and continuity</a></p>'
        html = html.replace('<div class="quarto-title">', context + '<div class="quarto-title">', 1)
    return html
