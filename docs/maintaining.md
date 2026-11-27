# Maintaining the course book

## After a lecture

1. Finish the student-facing PDF. Identify the approved version by its contents and revision history. Copy it to [downloads/](../downloads/) and check that the copy matches the original.
2. Update the relevant [lecture pages](../lectures/). Keep the teaching sequence, wording, hypotheses, examples, numbers, solution steps, proofs, recaps, and diagrams. Retain worksheet numbering and lettered subparts. Flag mathematical corrections for the instructor.
3. Add the class date, PDF, and topic links to the [lecture archive](../lecture-pdfs.qmd). Update the [homepage](../index.qmd) to the latest class by meeting date, including a review or practice session.
4. For a new page, register its path in the [book configuration](../_quarto.yml) and its group in the [sidebar builder](../scripts/book_navigation.py). Keep existing public URLs and heading anchors. Check the corresponding [definitions](../supplements/definitions.qmd), [theorems](../supplements/theorems.qmd), and [concept map](../assets/course-map/).
5. Run a full render. Open the affected lecture, follow its PDF link, and look up one of its headings in search. Check the archive, latest-class link, and sidebar.

### Lecture conventions

- Keep formulas as text, give figures meaningful alternative text, and replace print page references with section links. Use a blank line between Markdown paragraphs and explicit row breaks in aligned calculations.
- Leave worked teaching examples visible. Keep the full practice question visible and put its solution and solution-only diagrams inside a collapsed “Show solution” control. Optional self-checks have separate hints and answers.
- Keep new explorations in [supplements/](../supplements/). Arrange reference entries by topic in teaching order. Preserve the lecture notation and complete hypotheses, collect differentiation rules together, and link to proofs and examples in the notes.

## How the site is built

[Quarto](../_quarto.yml) renders the listed chapters and copies public resources into `_site/`. Its [post-render script](../scripts/finish-site.py) then prepares the features shared across pages.

| Feature | Sources and build behavior |
| --- | --- |
| Book navigation and appearance | [book_navigation.py](../scripts/book_navigation.py) groups Quarto’s sidebar links. [reading-preferences.html](../assets/reading-preferences.html) and [page-contents.html](../assets/page-contents.html) supply the reading controls. [reading-layout.css](../assets/reading-layout.css) and [custom.scss](../custom.scss) style the book. When changing themes, preserve the previous published Bootstrap stylesheet in [legacy-styles/](../assets/legacy-styles/) for readers with cached pages. |
| Search | [course_search.py](../scripts/course_search.py) indexes rendered headings, PDF links, and map entries. The book and map use the resulting `_site/assets/course-search-index.js`. |
| Map and game | [assets/course-map/](../assets/course-map/) holds the map, topic notes, and game questions. [render-map-math.js](../scripts/render-map-math.js) typesets formulas and assembles the question bank. [course_map.py](../scripts/course_map.py) prepares the files served under `_site/map/`. |
| Ask the Notes | [site_assets.py](../ask-notes/site_assets.py) installs the panel and practice assets. The [Ask guide](../ask-notes/README.md) covers the backend, and the [benchmark guide](../ask-notes/benchmark/README.md) describes the evaluation. |

The book serves its fonts and MathJax from [assets/](../assets/). The published glossary address redirects to the reference pages. Preserve the redirect when editing the reference section.

## Build and check

From the repository root, run the offline tests **after** rendering. They read the course index from the built site. The map build uses Node.js when available and otherwise invokes Quarto’s JavaScript runner.

```sh
quarto render
python3 -m unittest discover -s ask-notes -p 'test_*.py'
```

[GitHub Actions](../.github/workflows/publish.yml) builds on pushes to `main` and publishes the rendered site to Pages. A local render only creates the website files. The original lecture PDFs are maintained separately.

## Instructor workspace

In the instructor’s checkout, `input/` holds source material, `output/` holds planning, grading, and publication records, `work/` holds experiments and previews, and `tmp/` holds scratch builds. These directories are excluded from Git. Only approved student-facing files belong in `downloads/`.
