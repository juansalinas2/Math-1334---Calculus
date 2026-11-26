"""Package the optional AWS deployment and its illustrated LaTeX guide."""
from pathlib import Path
import argparse
import shutil
import subprocess
from zipfile import ZipFile, ZIP_DEFLATED

from export import BUILD, HERE, ROOT, export


def build_guide():
    tectonic = shutil.which("tectonic") or ROOT / ".tools/tectonic/tectonic"
    if not Path(tectonic).is_file():
        raise SystemExit("Install Tectonic to build the LaTeX guide.")
    BUILD.mkdir(parents=True, exist_ok=True)
    subprocess.run([str(tectonic), "-X", "compile", str(HERE / "System-Guide.tex"),
                    "--outdir", str(BUILD)], check=True)
    pdf = BUILD / "Ask-the-Notes-System-Guide.pdf"
    (BUILD / "System-Guide.pdf").replace(pdf)
    return pdf


def bundle(site=ROOT / "_site"):
    export(site)
    target = BUILD / "math1334-cloudshell.zip"
    files = [HERE / name for name in ("template.yaml", "deploy.py", "export.py", "review.py",
             "evaluate.py", "responses.py", "README.md", "System-Guide.tex", "preview-search.js",
             "practice.py", "practice.js", "checks.json", "app.py", "course_index.py", "widget.js", "widget.css",
             "site_assets.py", "pilot-endpoint.txt", "preview.py", "bundle.py", "test_pilot.py", "test_walkthrough.py")]
    files.append(build_guide())
    files.extend(BUILD / "function" / name for name in ("app.py", "responses.py", "practice.py",
                                                          "checks.json", "passages.json", "course_index.py", "course.json"))
    with ZipFile(target, "w", compression=ZIP_DEFLATED) as archive:
        for file in files:
            archive.write(file, Path("math1334-cloudshell") / file.relative_to(HERE))
    print(target)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", type=Path, default=ROOT / "_site")
    bundle(parser.parse_args().site)
