# MATH 1334 · Calculus I

Juan Salinas’s Calculus I notes for Seattle University. The Quarto book contains the lectures, original class PDFs, worksheets, and interactive study tools.

[Read the course notes](https://juansalinas2.github.io/Math-1334---Calculus/) · [Download the collected lecture notes (PDF)](https://juansalinas2.github.io/Math-1334---Calculus/downloads/math-1334-calculus-lecture-notes.pdf)

## Where to make a change

| To change | Start here |
| --- | --- |
| A lecture or its figures | [lectures/](lectures/) · [lecture template](_templates/lecture.qmd) |
| The latest class on the homepage | [index.qmd](index.qmd) |
| A student handout or the PDF archive | [downloads/](downloads/) · [lecture-pdfs.qmd](lecture-pdfs.qmd) |
| Definitions, theorems, worksheets, or practice | [supplements/](supplements/) |
| Chapter order or sidebar groups | [_quarto.yml](_quarto.yml) · [book_navigation.py](scripts/book_navigation.py) |
| The concept map or *Critical Point* game | [map and game sources](assets/course-map/) |
| The Ask panel, its backend, or its tests | [Ask the Notes guide](ask-notes/README.md) · [evaluation guide](ask-notes/benchmark/README.md) |
| Reading controls, layout, or typography | [assets/](assets/) · [custom.scss](custom.scss) |
| What runs after Quarto renders | [finish-site.py](scripts/finish-site.py) |

## Preview locally

With Quarto 1.10.18 and Python 3 available, run this from the repository root. On the course Mac, you can also open [Preview.command](Preview.command).

```sh
quarto preview
```

To build the full site, run `quarto render`. Quarto writes the result to `_site/`. GitHub Pages uses the same render command when changes reach `main`.

[Maintaining the course book](docs/maintaining.md) covers the PDF-first lecture workflow, the build, and the checks to run before publishing.
