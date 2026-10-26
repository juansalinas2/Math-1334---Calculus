# Calculus notes

A searchable Quarto book by Juan Salinas, with topic-based chapters and an archive of lecture PDFs.

## After each lecture

1. Finish and check the lecture PDF first.
2. Identify the completed student-facing version from its contents and revision history, not its modification time alone. Exclude rough notes, teacher outlines, and superseded versions. Copy only that PDF into `downloads/` and verify the copy matches the original exactly.
3. Adapt the corresponding material into the relevant files in `lectures/`. Keep equations as text and give diagrams meaningful alternative text. Preserve the PDF's examples and results; organize the web version by topic.
4. Add the date, PDF link, and topic links to `lecture-pdfs.qmd`. Update the “Latest posted lecture” panel in `index.qmd` to the newest published class material, along with its displayed date and topic. A review or practice session counts as the latest class; use the class date, not a file's modification date.
5. Run `quarto render`, review the affected pages, and check the search and PDF links.
6. Commit the public files and push to `main`. The GitHub Actions workflow rebuilds and publishes the book once GitHub Pages is configured to use **GitHub Actions**.

Do not upload the entire local course folder. `input/`, `output/`, `tmp/`, `AGENTS.md`, and draft files are private working material and are excluded from Git. In particular, exams, teacher outlines, selected homework grading problems, and grader solutions do not belong in this repository.

## Fidelity to the lecture PDFs

Treat each finished lecture PDF as the source of truth. Preserve its explanations, definitions, hypotheses, examples, numbers, solution steps, proofs, recaps, and diagrams. Keep worksheet-corresponding topic numbers and lettered subparts. Topic pages may split a lecture, but should retain its internal teaching sequence. Changes for the web should concern layout, navigation, accessibility, and replacing page references with links. Do not silently shorten repeated material, add new examples, or revise mathematics; flag any proposed substantive correction for the instructor.

## Supplements

Practice and challenge solutions in the lecture pages start collapsed behind a native “Show solution” control. Keep each question and its given information visible; put all answer steps and solution-only diagrams inside the control. Preserve the original content and numbering. Worked teaching examples remain visible. Optional self-checks have separate collapsed hints and answers.

The `supplements/` pages contain optional self-checks with hints and answers, interactive graphs, and the course reference. They are separate from the faithful lecture transcriptions. Keep new questions and explorations here; do not blend them into the PDF-derived content. The graphs use local JavaScript and SVG, with no account, API key, or paid service required.

The visible Look up sidebar links lead to `definitions.qmd` and `theorems.qmd`. Organize entries by topic in teaching order, retain the lecture notation and complete hypotheses, and link back to the relevant explanation, proof, and examples. Statements stay visible; proofs and worked examples remain in the lectures. Keep differentiation rules together. When a canonical lecture changes or a new lecture is added, check the corresponding reference entries too. `assets/reference-pages.css` contains page-specific layout rules without changing the shared theme. The old glossary URL and its topic bookmarks redirect through `assets/glossary-redirect.html`, installed by the post-render script.

## Local preview

The reading controls offer Light, Paper, Dark, and Darker themes, plus a System setting and larger text. Theme, text size, and the desktop sidebar’s collapsed state are stored only in the reader's browser and persist between pages. The header’s contents icon collapses the desktop sidebar and opens the contents on phones. The header keeps Search available and groups theme and five text sizes (16–24 px, default 22 px) under Appearance. Longer pages have a collapsible right-hand On this page outline on wide screens, with its open/closed preference saved and an expandable outline on smaller screens. The fluid desktop layout uses available width up to 1680 px. Chapter headings toggle the entire group; each chapter has a separate overview link. Keyboard readers can skip directly to the notes, dismiss menus with Escape, and follow section links with focus moving to the heading. Next/previous cards and a Back to top link support longer reading sessions. Reduced-motion settings disable the transition. Original figures retain their colors; printing uses a light background. The controls are in `assets/reading-preferences.html`, with colors in `custom.scss` and the reading layout in `assets/reading-layout.css`. Latin Modern Roman text fonts are bundled in `assets/fonts/` with their license.

MathJax 4.1.3 and its New Computer Modern fonts are hosted with the book under `assets/mathjax-4.1.3` (the upstream licenses are included). This follows [MathJax's self-hosting instructions](https://docs.mathjax.org/en/latest/web/hosting.html) and avoids third-party requests while reading. `scripts/finish-site.py` removes the obsolete external polyfill, retains the previous published stylesheet for cached pages, and creates a stable stylesheet fallback. When changing themes again, preserve the currently published hashed stylesheet in `assets/legacy-styles` before deployment.

Use blank lines between paragraphs and between an example's question and its solution. A single source newline is only a soft wrap in Markdown. Put independent items in lists, use display math for piecewise formulas, and use `aligned` with explicit `\\` row breaks for multi-line calculations. Do not rely on blank lines inside math to create visible spacing. Keep the original wording, formula order, numbering, and hypotheses when adjusting layout.

On the original Mac, open `Preview.command`; it uses the existing local Quarto runtime. Elsewhere, install Quarto and run `quarto preview`. The project uses Quarto 1.10.18 in GitHub Actions and has no executable notebook dependencies.

## Structure

Chapter 1 is the introduction. Chapter 2, Limits and continuity, has a short overview, six separate reading pages numbered 2.1–2.6, and the October 5 exam practice in Section 2.7. The practice preserves all ten questions, their subparts, and both original diagrams; it includes the original PDF and no answers. Existing URLs and example numbering are preserved. Precalculus remains Appendix A. Section titles use Quarto's unnumbered title syntax with explicit 2.x prefixes so each page does not become another chapter.

After rendering, `scripts/book_navigation.py` groups the existing book links into native expandable sidebar groups, with the current chapter initially open. Quarto books generate their own sidebar contents, so the grouping is applied by `scripts/finish-site.py`. When adding a section or supplement, update both `_quarto.yml` and the corresponding navigation list.

Chapter 3, Derivatives, begins with the October 12 lecture in Sections 3.1–3.2: the derivative at a point and the derivative function. The complete lecture includes its original diagrams, higher-order derivatives, notation, the continuity theorem and proofs, and three practice problems with collapsed solutions. The four-page Week 4 worksheet is linked under Supplements and from the homepage.

The October 14 lecture adds Section 3.3, Differentiation rules, faithfully matching the final six-page PDF with Examples 1–11 and both original diagrams.

The October 16 lecture adds Sections 3.4–3.5, matching the revised eight-page PDF with Examples 1–13, four original diagrams, and three practice problems: motion at the end of Section 3.4 and trigonometric differentiation at the end of Section 3.5, preserving the shared PDF numbering. Practice solutions start collapsed. The force example and force practice problem were removed at the instructor’s request.

The October 19 lecture adds Section 3.6, The chain rule, matching the final six-page PDF with its complete examples, table, corollary proof, and practice solutions. Derivative factors retain the PDF’s colors from the outside inward; practice solutions start collapsed.

The October 21 lecture adds Sections 3.7–3.8, matching the revised eight-page PDF. It preserves the chain-rule inverse-function proof, the triangle before the inverse-sine cosine calculation, all eleven diagrams, and every coordinate-substitution case. Practice solutions start collapsed.

The October 23 lecture adds Section 3.9, matching the approved eight-page PDF. It preserves all five diagrams, the geometric sketch for F(a) with bases 2 and 10, every worked example and practice solution, and the real-exponent power rule at the end. Practice solutions start collapsed.

The optional calculus concept map remains at `supplements/limits-map.qmd` to preserve its URL. It covers the published material through Section 3.9: eleven optional question-based paths give a method, a class example, conditions, and lecture links. `assets/limits-map.js` highlights directed connections. All guides remain readable without JavaScript and when printing; phones show linked concepts and the relationships in words.

- `_quarto.yml`: chapter order, search, and book settings.
- `index.qmd`: book home.
- `lectures/`: topic chapters and their images.
- `supplements/`: definitions, theorems and rules, self-checks, and interactive explorations.
- `assets/explorers.js`: local interactive graph controls.
- `lecture-pdfs.qmd`: chronological lecture archive.
- `downloads/`: explicitly selected student-facing PDFs.
- `custom.scss`: shared typography and styling.
- `assets/page-contents.html`: desktop outline, mobile section menu, and lecture shortcuts.
- `.github/workflows/publish.yml`: build and GitHub Pages deployment.

The PDF remains the source for each lecture. The web chapters are adapted after the PDF is finished; rendering this project does not recreate or overwrite the lecture PDFs.
