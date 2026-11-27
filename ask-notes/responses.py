"""Collect a single instructor response only when a student explicitly shares it."""
import hashlib
import json
import os
import re
import secrets
import time
from practice import checks

RATINGS = {"helped": "I can continue", "stuck": "I’m still stuck", "check": "Please check the explanation"}
OFFERING = "MATH 1334 · Fall 2026"


def fingerprint(receipt, value):
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256((receipt + encoded).encode()).hexdigest()


def exchange(question, section, result):
    answer = result["answer"]
    if detail := result.get("detail"):
        answer += "\n\n" + detail["title"] + "\n" + detail["text"]
    return {"question": question, "section": section, "answer": answer,
            "sources": [s["href"] for s in result["sources"]]}


def issue(db, content):
    # Until a student shares, the table has only an opaque receipt, digest, and expiry.
    receipt = secrets.token_hex(20)
    db.put_item(TableName=os.environ["RESPONSES_TABLE"], Item={
        "receipt": {"S": receipt}, "digest": {"S": fingerprint(receipt, content)},
        "expires_at": {"N": str(int(time.time()) + 7200)}},
        ConditionExpression="attribute_not_exists(receipt)")
    return receipt


def share(db, payload):
    if not isinstance(payload, dict) or payload.get("share") is not True:
        raise ValueError("Choose Share with instructor to send a response.")
    if payload.get("kind") == "practice":
        return share_practice(db, payload)
    receipt, content = payload.get("receipt"), payload.get("exchange")
    rating, note = payload.get("rating"), payload.get("note", "")
    if not isinstance(receipt, str) or not re.fullmatch("[0-9a-f]{40}", receipt):
        raise ValueError("Ask a new question to share a response.")
    if not isinstance(content, dict) or set(content) != {"question", "section", "answer", "sources"}:
        raise ValueError("The original question and answer are required.")
    if not isinstance(rating, str) or rating not in RATINGS or not isinstance(note, str) or len(note) > 600:
        raise ValueError("Choose a response and use at most 600 characters for your note.")
    # The conditional write verifies all client-returned content and prevents replacement.
    now = int(time.time())
    shared = {**content, "rating": rating, "note": note.strip(), "offering": OFFERING}
    signature = fingerprint(receipt, shared)
    try:
        db.update_item(TableName=os.environ["RESPONSES_TABLE"], Key={"receipt": {"S": receipt}},
            ConditionExpression="digest = :original AND expires_at > :now",
            UpdateExpression="SET response_json = :data, shared_digest = :sig, shared_at = :now, expires_at = :expiry REMOVE digest",
            ExpressionAttributeValues={
                ":original": {"S": fingerprint(receipt, content)}, ":sig": {"S": signature},
                ":data": {"S": json.dumps(shared, ensure_ascii=False)}, ":now": {"N": str(now)},
                ":expiry": {"N": str(now + 90 * 86400)}},
            ReturnValuesOnConditionCheckFailure="ALL_OLD")
    except db.exceptions.ConditionalCheckFailedException as exc:
        previous = exc.response.get("Item", {})
        if previous.get("shared_digest", {}).get("S") == signature and int(previous["expires_at"]["N"]) > now:
            return 200, {"saved": True}
        return 409, {"error": "This response has already been shared or the form has expired."}
    return 200, {"saved": True}


def share_practice(db, payload):
    section = payload.get("section")
    choice, attempt = payload.get("choice"), payload.get("attempt")
    note = payload.get("note", "")
    check = checks().get(section) if isinstance(section, str) else None
    if not check or type(choice) is not int or not 0 <= choice < len(check["choices"]):
        raise ValueError("Choose one of the answers to this self-check.")
    if payload.get("version") != check["version"]:
        return 409, {"error": "This question has been revised. Reload the page for the current self-check."}
    if not isinstance(attempt, str) or not re.fullmatch(r"[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}", attempt):
        raise ValueError("Reopen the self-check to share an attempt.")
    if not isinstance(note, str) or len(note) > 600:
        raise ValueError("Use at most 600 characters for your reasoning.")
    receipt = "practice-" + attempt
    shared = {"kind": "practice", "offering": OFFERING, "section": section, "version": check["version"],
              "question": check["question"], "first_choice": check["choices"][choice],
              "correct": choice == check["correct"], "feedback": check["feedback"][choice], "note": note.strip()}
    digest = fingerprint(receipt, shared)
    now = int(time.time())
    try:
        db.put_item(TableName=os.environ["RESPONSES_TABLE"],
            Item={"receipt": {"S": receipt}, "response_json": {"S": json.dumps(shared, ensure_ascii=False)},
                  "shared_digest": {"S": digest}, "shared_at": {"N": str(now)},
                  "expires_at": {"N": str(now + 90 * 86400)}},
            ConditionExpression="attribute_not_exists(receipt)", ReturnValuesOnConditionCheckFailure="ALL_OLD")
    except db.exceptions.ConditionalCheckFailedException as exc:
        previous = exc.response.get("Item", {})
        if previous.get("shared_digest", {}).get("S") != digest or int(previous["expires_at"]["N"]) <= now:
            return 409, {"error": "This attempt has already been submitted or expired."}
    return 200, {"saved": True}
