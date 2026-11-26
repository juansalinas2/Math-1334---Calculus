"""Create or update the pilot, synchronize the notes, and run a live question."""
import argparse
import getpass
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import uuid

from export import BUILD, HERE, ROOT, PAGE, SEARCH_INDEX, export
from practice import checks

STACK = "math1334-ask-notes"
REGION = "us-west-2"


def aws(*args):
    cmd = ["aws", *args, "--region", REGION, "--output", "json", "--no-cli-pager"]
    result = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, text=True)
    return json.loads(result.stdout) if result.stdout.strip() else {}


def post(endpoint, code, payload):
    request = Request(endpoint, data=json.dumps(payload).encode(),
                      headers={"Content-Type": "application/json", "X-Class-Code": code})
    with urlopen(request, timeout=35) as response:
        return json.load(response)


def verify_submission(endpoint, code, table, key, payload):
    if post(endpoint, code, payload).get("saved") is not True:
        raise SystemExit("The synthetic feedback submission failed.")
    item_key = json.dumps({"receipt": {"S": key}})
    item = aws("dynamodb", "get-item", "--table-name", table, "--key", item_key, "--consistent-read")["Item"]
    record = json.loads(item["response_json"]["S"])
    if record["note"] != payload["note"]:
        raise SystemExit("Instructor read-back failed. Inspect the Responses table.")
    if payload.get("kind") == "practice" and (record["section"] != "ladder" or record["correct"] is not False):
        raise SystemExit("Check the self-check question version and recorded first choice.")
    aws("dynamodb", "delete-item", "--table-name", table, "--key", item_key,
        "--condition-expression", "shared_digest = :sig", "--expression-attribute-values",
        json.dumps({":sig": item["shared_digest"]}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", type=Path, default=ROOT / "_site")
    parser.add_argument("--prepared", action="store_true", help="Deploy the exported CloudShell bundle")
    parser.add_argument("--published-notes", action="store_true", help="Export the public course page in a repository checkout")
    parser.add_argument("--class-code-file", type=Path, help="Use a private local file; generate a code on first deployment")
    parser.add_argument("--verify-feedback", action="store_true", help="Submit, read and remove synthetic tutor and practice responses")
    parser.add_argument("--metered", action="store_true", help="Deploy AWS services with usage-based billing")
    args = parser.parse_args()
    if not args.metered:
        parser.exit(0, "Browser-only course mode. No AWS resources created. Use --metered only for a usage-billed deployment.\n")
    missing = [tool for tool in ("aws", "sam") if not shutil.which(tool)]
    if missing:
        raise SystemExit("Install the command-line tools listed in the guide: " + ", ".join(missing))
    aws("sts", "get-caller-identity")
    if not args.prepared:
        site = args.site
        if args.published_notes:
            site = BUILD / "public-course"
            for resource in (PAGE, SEARCH_INDEX):
                path = site / resource
                path.parent.mkdir(parents=True, exist_ok=True)
                with urlopen("https://juansalinas2.github.io/Math-1334---Calculus/" + resource, timeout=25) as response:
                    path.write_bytes(response.read())
        export(site)
    if args.class_code_file:
        path = args.class_code_file.expanduser()
        if not path.exists():
            with os.fdopen(os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600), "w") as f:
                f.write(secrets.token_urlsafe(18) + "\n")
        code = path.read_text().strip()
    else:
        code = getpass.getpass("Choose or re-enter your class code (12–120 characters): ")
    if not 12 <= len(code) <= 120 or not code.isascii() or not code.isprintable() or code != code.strip():
        raise SystemExit("Use 12–120 printable ASCII characters with no leading or trailing space.")
    if not args.class_code_file and code != getpass.getpass("Type the same code again: "):
        raise SystemExit("The two entries differ. Run the command again.")
    digest = hashlib.sha256(code.encode()).hexdigest()
    subprocess.run(["sam", "deploy", "--template-file", "template.yaml", "--stack-name", STACK,
                    "--region", REGION, "--resolve-s3", "--capabilities", "CAPABILITY_IAM",
                    "--no-confirm-changeset", "--no-fail-on-empty-changeset", "--parameter-overrides", "ClassCodeHash=" + digest],
                   cwd=HERE, check=True, env={**os.environ, "SAM_CLI_TELEMETRY": "0"})
    stack = aws("cloudformation", "describe-stacks", "--stack-name", STACK)["Stacks"][0]
    out = {item["OutputKey"]: item["OutputValue"] for item in stack["Outputs"]}
    question = {"question": "Why does the top of the ladder move down in part (a)?", "section": "ladder", "mode": "conversation"}
    print("Testing one live question…", flush=True)
    try:
        answer = post(out["Endpoint"], code, question)
    except HTTPError as exc:
        raise SystemExit(f"Live test returned HTTP {exc.code}. Check the guide's troubleshooting section.") from exc
    print(answer["answer"])
    if not any(s["href"].endswith("#ladder") for s in answer.get("sources", [])):
        raise SystemExit("The answer did not cite Example 5. Inspect the retrieval results before enabling the website.")
    if args.verify_feedback:
        note = "Synthetic deployment check. No student data."
        payload = {"share": True, "rating": "helped", "note": note,
                   "receipt": answer["receipt"], "exchange": answer["exchange"]}
        endpoint = out["Endpoint"].rsplit("/", 1)[0] + "/feedback"
        table = out["ResponseTable"]
        verify_submission(endpoint, code, table, answer["receipt"], payload)
        attempt = str(uuid.uuid4())
        ladder = checks()["ladder"]
        practice_payload = {"share": True, "kind": "practice", "attempt": attempt, "section": "ladder",
                            "choice": (ladder["correct"] + 1) % len(ladder["choices"]),
                            "version": ladder["version"], "note": note}
        verify_submission(endpoint, code, table, "practice-" + attempt, practice_payload)
        print("Verified voluntary tutor and self-check sharing and instructor read-back. Synthetic records removed.")
    print("Pilot:", out["Endpoint"].rsplit("/", 1)[0] + "/pilot")
    print("Verified the ladder citation. To connect the Pages build, put this public URL in pilot-endpoint.txt:")
    print(out["Endpoint"])



if __name__ == "__main__":
    main()
