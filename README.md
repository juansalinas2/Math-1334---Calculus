# Calculus notes

A searchable Quarto book by Juan Salinas, with topic-based chapters and an archive of lecture PDFs.

## After each lecture

1. Finish and check the lecture PDF first.
2. Identify the completed student-facing version from its contents and revision history, not its modification time alone. Exclude rough notes, teacher outlines, and superseded versions. Copy only that PDF into `downloads/` and verify the copy matches the original exactly.
3. Adapt the corresponding material into the relevant files in `lectures/`. Keep equations as text and give diagrams meaningful alternative text. Preserve the PDF's examples and results; organize the web version by topic.
4. Add the date, PDF link, and topic links to `lecture-pdfs.qmd`.
5. Run `quarto render`, review the affected pages, and check the search and PDF links.
6. Commit the public files and push to `main`. The GitHub Actions workflow rebuilds and publishes the book once GitHub Pages is configured to use **GitHub Actions**.

Do not upload the entire local course folder. `input/`, `output/`, `tmp/`, `AGENTS.md`, and draft files are private working material and are excluded from Git. In particular, exams, teacher outlines, selected homework grading problems, and grader solutions do not belong in this repository.

## Fidelity to the lecture PDFs

Treat each finished lecture PDF as the source of truth. Preserve its explanations, definitions, hypotheses, examples, numbers, solution steps, proofs, recaps, and diagrams. Keep worksheet-corresponding topic numbers and lettered subparts. Topic pages may split a lecture, but should retain its internal teaching sequence. Changes for the web should concern layout, navigation, accessibility, and replacing page references with links. Do not silently shorten repeated material, add new examples, or revise mathematics; flag any proposed substantive correction for the instructor.

## Supplements

The `supplements/` pages contain an instructor-approved glossary, optional self-checks with hints and answers, and interactive graphs. They are explicitly labeled as supplements, separate from the faithful lecture transcriptions. Keep new questions and explorations here; do not blend them into the PDF-derived content. The graphs use local JavaScript and SVG, with no account, API key, or paid service required.

## Local preview

The reading controls offer Light, Paper, and Dark themes, plus a System setting and larger text. Preferences are stored only in the reader's browser and persist between pages. Original figures retain their colors; printing uses a light background. The controls are in `assets/reading-preferences.html`, with colors in `custom.scss`.

MathJax 4.1.3 and its New Computer Modern fonts are hosted with the book under `assets/mathjax-4.1.3` (the upstream licenses are included). This follows [MathJax's self-hosting instructions](https://docs.mathjax.org/en/latest/web/hosting.html) and avoids third-party requests while reading. `scripts/finish-site.py` removes the obsolete external polyfill, retains the previous published stylesheet for cached pages, and creates a stable stylesheet fallback. When changing themes again, preserve the currently published hashed stylesheet in `assets/legacy-styles` before deployment.

Use blank lines between paragraphs and between an example's question and its solution. A single source newline is only a soft wrap in Markdown. Put independent items in lists, use display math for piecewise formulas, and use `aligned` with explicit `\\` row breaks for multi-line calculations. Do not rely on blank lines inside math to create visible spacing. Keep the original wording, formula order, numbering, and hypotheses when adjusting layout.

On the original Mac, open `Preview.command`; it uses the existing local Quarto runtime. Elsewhere, install Quarto and run `quarto preview`. The project uses Quarto 1.10.18 in GitHub Actions and has no executable notebook dependencies.

## Structure

Chapter 1 is the introduction. Chapter 2, Limits and continuity, has a short overview and six separate reading pages numbered 2.1–2.6. Their existing URLs and example numbering are preserved. Precalculus remains Appendix A. Section titles use Quarto's unnumbered title syntax with explicit 2.x prefixes so each page does not become another chapter.

After rendering, `scripts/book_navigation.py` groups the existing book links into native expandable sidebar groups, all initially closed. Quarto books generate their own sidebar contents, so the grouping is applied by `scripts/finish-site.py`. When adding a section or supplement, update both `_quarto.yml` and the corresponding navigation list.

The optional limits concept map lives in `supplements/limits-map.qmd`, with local controls in `assets/limits-map.js`. It connects concepts to the existing lecture sections. Its explanations remain readable without JavaScript; on phones, the map becomes a compact grid of selectable concepts.

- `_quarto.yml`: chapter order, search, and book settings.
- `index.qmd`: book home.
- `lectures/`: topic chapters and their images.
- `supplements/`: glossary, self-checks, and interactive explorations.
- `assets/explorers.js`: local interactive graph controls.
- `lecture-pdfs.qmd`: chronological lecture archive.
- `downloads/`: explicitly selected student-facing PDFs.
- `custom.scss`: shared typography and styling.
- `assets/page-contents.html`: compact, expandable in-page navigation.
- `.github/workflows/publish.yml`: build and GitHub Pages deployment.

The PDF remains the source for each lecture. The web chapters are adapted after the PDF is finished; rendering this project does not recreate or overwrite the lecture PDFs.
