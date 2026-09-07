# Math 1334 — Calculus

Quarto lecture notes for Seattle University. The included limits lecture is a sample, not an assigned course lecture.

## Add a lecture

1. Copy `_templates/lecture.qmd` into `lectures/`, for example as `02-derivatives.qmd`.
2. Change its `title`, `description`, and `order` at the top. Use a different number for each lecture's order.
3. Write your notes. Use `$...$` for inline math and `$$...$$` for displayed equations.
4. Save and upload the changes to GitHub's `main` branch. Once Pages is set up, GitHub automatically rebuilds and publishes the website.

The lecture list and sidebar update automatically. You do not need to edit HTML or site configuration for each lecture. Files placed in `lectures/` are intended to be published; keep unfinished or private material outside that folder and out of the public repository.

You can also edit an existing lecture directly on GitHub using its pencil button, then choose **Commit changes**. To add one in the browser, use **Add file → Create new file**, enter a path such as `lectures/02-derivatives.qmd`, and paste the template contents. You do not need Quarto installed to publish this way.

## Preview on this Mac

Open `Preview.command` to start a local preview that updates as you save notes. Keep its Terminal window open while previewing; press Control-C there to stop it.

A project-local Quarto runtime is included in `.tools/quarto` on this Mac and is excluded from Git. On another computer, install [Quarto](https://quarto.org/docs/get-started/) and run `quarto preview` in the course folder.

## One-time GitHub Pages setup

1. Create a GitHub repository for this course. For free GitHub Pages hosting on a personal free account, use a public repository. Source files in a public repository are visible to everyone.
2. Upload the source files, including `.github/workflows/publish.yml`, to its `main` branch. Do not upload `.tools`, `.quarto`, `.git`, or `_site`.
3. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
4. Open **Actions → Publish course notes → Run workflow** if the first upload happened before Pages was enabled.
5. When the workflow succeeds, the Pages settings and deployment show your live course URL.

## Files you will use

- `index.qmd`: course homepage introduction.
- `lectures/`: one `.qmd` file per lecture.
- `_templates/lecture.qmd`: copy this to start a lecture.
- `_quarto.yml`: shared site settings; usually leave this alone.
- `custom.scss`: shared appearance; usually leave this alone.

There is no syllabus, schedule, or grading policy in the starter because those details have not been supplied. PDF generation can be added later; this starter publishes web pages.

