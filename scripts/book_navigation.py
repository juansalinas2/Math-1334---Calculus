"""Group book sections without turning each reading page into a chapter.

Quarto books replace sidebar.contents with the chapter list. Keep native book
numbering and page navigation, then group its existing links in native details.
"""
import html as html_lib
import re
from urllib.parse import urlsplit

SECTIONS = [
    '02-limits.html', '03-infinite-limits.html', '04-limit-laws.html',
    '05-squeeze-theorem.html', '06-continuity.html', '07-intermediate-value.html',
    '08-exam-practice.html',
]
SUPPLEMENTS = ['limits-map.html', 'worksheets.html', 'self-checks.html', 'explore.html']
REFERENCE = ['definitions.html', 'theorems.html']
DERIVATIVE_SECTIONS = ['09-derivative-at-a-point.html', '10-derivative-function.html', '11-differentiation-rules.html', '12-rates-of-change.html', '13-trigonometric-derivatives.html', '14-chain-rule.html', '15-inverse-functions.html', '16-implicit-differentiation.html', '17-exponential-logarithmic.html']


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
        if name == 'theorems.html':
            leaf = leaf.replace('Theorems</span>', 'Theorems &amp; rules</span>')
        leaves[name] = leaf
        hrefs[name] = href
        if name == page_name:
            leaves[name] = leaf.replace('<a ', '<a aria-current="page" ', 1)

    def group(title, children, parent=None):
        if parent:
            # Give the entire summary one job: expanding its chapter.
            link = re.search(r'<a\b[^>]*>([\s\S]*?)</a>', leaves[parent])
            label = '<span class="sidebar-item-text">' + link[1] + '</span>'
        else:
            label = f'<span class="sidebar-item-text">{html_lib.escape(title)}</span>'
        active = ' current-group' if page_name in children or page_name == parent else ''
        items = ''.join(leaves[name] for name in children)
        if parent:
            overview = re.sub(r'(<a\b[^>]*>)[\s\S]*?(</a>)', r'\1Chapter overview\2', leaves[parent], count=1)
            items = overview + items
        expanded = ' open' if active else ''
        return (f'<li class="sidebar-item sidebar-item-section{active}">'
                f'<details class="book-nav-group"{expanded}><summary aria-label="Expand or collapse {html_lib.escape(title)}">'
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
        + group('Chapter 3', DERIVATIVE_SECTIONS, 'derivatives.html')
        + '<li class="book-nav-label">LOOK UP</li>'
        + ''.join(leaves[name] for name in REFERENCE)
        + group('Study aids', SUPPLEMENTS)
        + leaves['lecture-pdfs.html']
        + group('Appendices', ['00-functions.html'])
    )
    html = html[:match.start()] + '<div class="sidebar-menu-container"><ul class="list-unstyled mt-1">' + menu + '</ul></div></nav>' + html[match.end():]
    if page_name in SECTIONS:
        context = '<p class="chapter-context"><a href="' + hrefs['limits-and-continuity.html'] + '">Chapter 2 · Limits and continuity</a></p>'
        html = html.replace('<div class="quarto-title">', context + '<div class="quarto-title">', 1)
    if page_name in DERIVATIVE_SECTIONS:
        context = '<p class="chapter-context"><a href="' + hrefs['derivatives.html'] + '">Chapter 3 · Derivatives</a></p>'
        html = html.replace('<div class="quarto-title">', context + '<div class="quarto-title">', 1)
    return html
