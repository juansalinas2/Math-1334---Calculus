# Calculus notes

A searchable Quarto book by Juan Salinas, with topic-based chapters and an archive of lecture PDFs.

## After each lecture

1. Finish and check the lecture PDF first.
2. Copy only that student-facing PDF into `downloads/`.
3. Adapt the corresponding material into the relevant files in `lectures/`. Keep equations as text and give diagrams meaningful alternative text. Preserve the PDF's examples and results; organize the web version by topic.
4. Add the date, PDF link, and topic links to `lecture-pdfs.qmd`.
5. Run `quarto render`, review the affected pages, and check the search and PDF links.
6. Commit the public files and push to `main`. The GitHub Actions workflow rebuilds and publishes the book once GitHub Pages is configured to use **GitHub Actions**.

Do not upload the entire local course folder. `input/`, `output/`, `tmp/`, `AGENTS.md`, and draft files are private working material and are excluded from Git. In particular, exams, teacher outlines, selected homework grading problems, and grader solutions do not belong in this repository.

## Local preview

On the original Mac, open `Preview.command`; it uses the existing local Quarto runtime. Elsewhere, install Quarto and run `quarto preview`. The project uses Quarto 1.10.18 in GitHub Actions and has no executable notebook dependencies.

## Structure

- `_quarto.yml`: chapter order, search, and book settings.
- `index.qmd`: book home.
- `lectures/`: topic chapters and their images.
- `lecture-pdfs.qmd`: chronological lecture archive.
- `downloads/`: explicitly selected student-facing PDFs.
- `custom.scss`: shared typography and styling.
- `assets/page-contents.html`: compact, expandable in-page navigation.
- `.github/workflows/publish.yml`: build and GitHub Pages deployment.

The PDF remains the source for each lecture. The web chapters are adapted after the PDF is finished; rendering this project does not recreate or overwrite the lecture PDFs.
