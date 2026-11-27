"""Offline regressions for paid-call boundaries, course context, and citations."""
import hashlib
import json
import os
import subprocess
import sys
import unittest
import time
import responses
import practice
from review import report
from unittest.mock import Mock, patch
import app
import course_index
from export import ROOT, course_passages, read_passages
from site_assets import add_widget


class PilotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.book = read_passages(ROOT / "_site")

    def setUp(self):
        self.enterContext(patch.object(app, "passages", return_value=self.book))
        self.cloud = self.enterContext(patch.object(app, "client")).return_value
        self.enterContext(patch.dict(os.environ, CODE_HASH=hashlib.sha256(b"demo").hexdigest(),
                                     RESPONSES_TABLE="responses", KNOWLEDGE_BASE="kb", QUOTA_TABLE="table", MONTHLY_LIMIT="300"))

    def ask(self, question, code="demo", section=""):
        return app.handler({"headers": {"X-Class-Code": code}, "body": json.dumps(
            {"question": question, "section": section})}, None)

    def test_charge_boundary(self):
        self.assertEqual(self.ask("example", "wrong")["statusCode"], 403)
        self.assertEqual(self.ask("")["statusCode"], 400)
        self.cloud.update_item.assert_not_called()
        self.cloud.exceptions.ConditionalCheckFailedException = type("QuotaFull", (Exception,), {})
        self.cloud.update_item.side_effect = self.cloud.exceptions.ConditionalCheckFailedException()
        self.assertEqual(self.ask("question")["statusCode"], 429)
        self.cloud.retrieve.assert_not_called()
        self.cloud.converse.assert_not_called()

    def test_course_wide_retrieval_and_numbered_examples(self):
        book = course_passages(ROOT / "_site")
        idx = course_index.Index(book)
        page = "lectures/optimization.html"
        keys, message = idx.search("I'm stuck on example 4", page, page + "#primer")
        self.assertFalse(message)
        self.assertEqual(book[keys[0]]["href"], page + "#optimization-problems")
        self.assertIn("slope", book[keys[0]]["text"])
        self.assertNotIn("Example 5.", book[keys[0]]["text"])
        keys, _ = idx.search("When can I use the squeeze theorem?", page, page + "#primer")
        self.assertIn("squeeze-theorem.html", book[keys[0]]["href"])
        keys, message = idx.search("example 149", page, page)
        self.assertFalse(keys)
        self.assertIn("Optimization", message)
        self.assertNotIn("downloads/", " ".join(book))

    def test_course_uses_verified_sources_and_existing_allowance(self):
        book = course_passages(ROOT / "_site")
        page = "lectures/14-chain-rule.html"
        self.enterContext(patch.object(course_index, "corpus", return_value=book))
        self.enterContext(patch.object(course_index, "index", return_value=course_index.Index(book)))
        self.cloud.converse.return_value = {"stopReason":"end_turn", "output":{"message":{"content":[
            {"text":"Use the inside derivative too [1]."}]}}}
        body = {"page":page, "mode":"course", "section":page + "#the-chain-rule",
                "question":"How do I use the chain rule?", "history":[]}
        def send():
            return app.handler({"headers":{"x-class-code":"demo"}, "body":json.dumps(body)}, None)
        result = json.loads(send()["body"])
        self.assertEqual(result["sources"][0]["href"], page + "#the-chain-rule")
        self.assertTrue(self.cloud.update_item.called)
        self.assertIn("derivative", self.cloud.converse.call_args.kwargs["messages"][0]["content"][0]["text"])
        body["section"] = "foreign"
        body["question"] = "example 999"
        self.cloud.converse.reset_mock()
        self.assertFalse(json.loads(send()["body"])["sources"])
        self.cloud.converse.assert_not_called()

    def test_pilot_opens_the_course_page_without_a_model_call(self):
        result = app.handler({"routeKey": "GET /pilot"}, None)
        self.assertEqual(result["statusCode"], 302)
        self.assertTrue(result["headers"]["location"].endswith("/" + app.PAGE))
        self.cloud.converse.assert_not_called()

    def test_context_and_citation(self):
        self.cloud.retrieve.return_value = {"retrievalResults": [
            {"metadata": {"section": k}} for k in ("the-three-steps", "cone", "shadow", "ladder")]}
        self.cloud.converse.return_value = {"stopReason": "end_turn", "output": {"message":
            {"content": [{"text": "The height is decreasing [1]."}]}}}
        response = self.ask("How do I rearrange the equation?", section="ladder")
        self.assertEqual(response["statusCode"], 200)
        answer = json.loads(response["body"])
        self.assertEqual([s["href"] for s in answer["sources"]], [app.PAGE + "#ladder"])
        self.cloud.retrieve.assert_not_called()
        self.assertIn("A sliding ladder", self.cloud.converse.call_args.kwargs["messages"][0]["content"][0]["text"])
        self.assertEqual(self.cloud.converse.call_args.kwargs["inferenceConfig"]["maxTokens"], 350)

    def test_numbered_problems_override_scroll_and_starters_are_free(self):
        cases = [("I'm stuck on example 6", "cone"), ("hint for ex. six", "cone"),
                 ("practice problem #2", "cube"), ("Example 2", "circle"), ("help on ex6", "cone"), ("hint on the boat", "boat")]
        for question, expected in cases:
            with self.subTest(question=question):
                section, response = app.route_question(question, "ladder")
                self.assertEqual(section, expected)
                self.assertIsNotNone(response)
                self.assertEqual(response["sources"][0]["href"], app.PAGE + "#" + expected)
        body = json.loads(self.ask("I'm stuck on example 6", section="ladder")["body"])
        self.assertIn("vertical slice", body["answer"])
        self.assertNotIn("m/min", body["answer"])
        self.cloud.retrieve.assert_not_called()
        self.cloud.converse.assert_not_called()
        self.cloud.update_item.assert_not_called()

    def test_walkthrough_requests_across_the_lecture(self):
        import re
        for key, passage in self.book.items():
            heading = re.match(r"(example|practice) \d+", passage["title"], re.I)
            if not heading:
                continue
            q = "Lets walk through " + heading[0] + ":"
            with self.subTest(question=q):
                body = json.loads(self.ask(q, section="cone")["body"])
                self.assertIn(practice.checks()[key]["starter"], body["answer"])
                self.assertEqual(body["sources"][0]["href"], app.PAGE + "#" + key)
        for q, expected in [("Let's go over ex6b step by step", "inflow"),
                            ("Walk through example 4: why are there two terms?", "strip"),
                            ("A=LW", "product rule"), ("I got 7 cm²/s", "area is increasing"),
                            ("Can we go over #4?", "Which one"), ("Walk through example 84", "couldn’t find")]:
            with self.subTest(question=q):
                self.assertIn(expected, json.loads(self.ask(q, section="rectangle")["body"])["answer"])
        self.cloud.retrieve.assert_not_called()
        self.cloud.converse.assert_not_called()
        self.cloud.update_item.assert_not_called()

    def test_numbered_subparts_and_clarification(self):
        for shorthand in ("ex6b", "ex. 6(b)", "example six part b"):
            section, response = app.route_question("Give me a hint for " + shorthand, "circle")
            self.assertEqual(section, "cone")
            self.assertIn("inflow", response["answer"])
        for q, expected in [("I'm stuck on #2", "Which one"), ("Example 88", "couldn’t find"),
                            ("Example 6 part d", "no part (d)")]:
            self.assertIn(expected, app.route_question(q, "ladder")[1]["answer"])
        self.assertIn("cubic meters", app.route_question("What is dV/dt in example 6?", "circle")[1]["answer"])
        self.assertEqual(app.route_question("Can you explain the geometry in example 6?", "ladder"), ("cone", None))

    def test_no_grounding(self):
        self.assertEqual(app.generate("What is integration?", "", [])["sources"], [])
        self.cloud.converse.assert_not_called()
        for text, stop in [("Unsupported [9]", "end_turn"), ("NO_EVIDENCE", "end_turn"),
                           ("Truncated [1]", "max_tokens"), ("CLARIFY", "end_turn")]:
            self.cloud.converse.return_value = {"output": {"message": {"content": [{"text": text}]}}, "stopReason": stop}
            self.assertEqual(app.generate("question", "", ["ladder"])["sources"], [])

    def test_boat_distance_comparison_is_reviewed_before_inference(self):
        for question, phrase in (("If I reel in a foot of line, does my boat travel a foot?", "travels farther"),
                                 ("At the instant shown, which speed is bigger?", "boat moves faster")):
            event = {"headers": {"x-class-code": "demo"}, "body": json.dumps(
                {"mode": "conversation", "section": "boat", "question": question})}
            result = json.loads(app.handler(event, None)["body"])
            self.assertTrue(result["reviewed"])
            self.assertIn(phrase, result["answer"])
            self.assertTrue(result["sources"][0]["href"].endswith("#boat"))
        self.cloud.converse.assert_not_called()

    def test_rectangle_strip_keeps_area_and_rate_units_separate(self):
        request = {"mode":"conversation", "section":"rectangle", "question":"So why multiply by five?"}
        result = app.handler({"headers":{"x-class-code":"demo"}, "body":json.dumps(request)}, None)
        answer = json.loads(result["body"])
        self.assertTrue(answer["reviewed"])
        self.assertIn(r"5\,\mathrm{cm^2}", answer["answer"])
        self.assertIn(r"15\,\mathrm{cm^2/s}", answer["answer"])
        self.cloud.converse.assert_not_called()

    def test_server_attaches_the_single_grounding_source(self):
        self.cloud.converse.return_value = {"stopReason": "end_turn", "output": {"message":
            {"content": [{"text": "The units describe volume per second."}]}}}
        self.assertTrue(app.generate("Which rate?", "cube", ["cube"])["sources"][0]["href"].endswith("#cube"))

    def test_optional_detail_is_separate_signed_and_grounded(self):
        main = r"The volume is \(V=s^3\). [1]"
        explanation = r"Apply the chain rule to get \(3s^2\,ds/dt\). [1]"
        self.cloud.converse.return_value = {"stopReason": "end_turn", "output": {"message": {"content": [
            {"text": main + "\nDETAIL: Why does the side length rate appear?\n" + explanation}]}}}
        result = app.generate("Show the calculation.", "cube", ["cube"])
        self.assertEqual(result["answer"], main)
        self.assertEqual(result["detail"]["text"], explanation)
        self.assertIn(explanation, responses.exchange("Show the calculation.", "cube", result)["answer"])
        self.assertNotIn("detail", app.generate("Just a hint.", "cube", ["cube"]))
        self.cloud.converse.return_value["output"]["message"]["content"][0]["text"] += " [9]"
        self.assertFalse(app.generate("Show the calculation.", "cube", ["cube"])["sources"])

    def test_first_hint_and_unmarked_secondary_source(self):
        self.cloud.converse.return_value = {"stopReason": "end_turn", "output": {"message":
            {"content": [{"text": "Which two dimensions determine the area?"}]}}}
        result = app.generate("Just a hint, please", "rectangle", ["rectangle", "cube"])
        self.assertEqual([s["href"] for s in result["sources"]], [app.PAGE + "#rectangle"])
        self.assertEqual(self.cloud.converse.call_args.kwargs["system"][0]["text"], app.HINT_INSTRUCTIONS)
        app.generate("No hints please. Is my rate right?", "rectangle", ["rectangle"])
        self.assertEqual(self.cloud.converse.call_args.kwargs["system"][0]["text"], app.INSTRUCTIONS)

    def test_single_worked_passage_keeps_the_problem_separate_from_its_solution(self):
        book = {"limit": {"title": "Example 1", "text": "Evaluate the limit. Show solution Take logs."},
                "notes": {"title": "Worked examples", "text": "A Show solution B C Show solution D"}}
        self.cloud.converse.return_value = {"stopReason": "end_turn", "output": {"message":
            {"content": [{"text": "Try the first step. [1]"}]}}}
        for question, expected in (("One hint please", app.HINT_INSTRUCTIONS),
                                   ("Show me how to solve it", app.INSTRUCTIONS)):
            self.cloud.converse.reset_mock()
            app.generate(question, "limit", ["limit", "notes"], book=book)
            self.cloud.converse.assert_called_once()
            call = self.cloud.converse.call_args.kwargs
            self.assertEqual(call["system"][0]["text"], expected)
            self.assertTrue(expected.startswith(app.TEACHING))
            first, second = json.loads(call["messages"][0]["content"][0]["text"])["passages"]
            self.assertEqual((first["text"], first["worked_solution"]), ("Evaluate the limit.", "Take logs."))
            self.assertEqual(second["text"], book["notes"]["text"])
            self.assertNotIn("worked_solution", second)

    def test_symbolic_attempt_and_check_use_the_current_exercise(self):
        book = course_passages(ROOT / "_site")
        index = course_index.Index(book)
        page = "lectures/exam-3-review.html"
        box = page + "#optimization-folding-a-box"
        self.assertEqual(index.search("12-x?", page, box, followup=True), ([box], ""))
        page = "lectures/exam-2-review.html"
        implicit = page + "#implicit-differentiation"
        self.assertEqual(index.search("I got 2y. Is my derivative right?", page, implicit), ([implicit], ""))
        self.assertEqual(index.worked_example(implicit, book[implicit]["text"].partition("(a)")[0]),
                         "lectures/16-implicit-differentiation.html#example-the-curve-x2xyy23")
        self.assertFalse(course_index.MATH_REPLY.fullmatch("differentiate x^2"))

    def test_hint_with_a_bare_number_and_parenthesized_part(self):
        book = course_passages(ROOT / "_site")
        page = "lectures/exam-3-review.html"
        section = page + "#products-and-powers"
        self.enterContext(patch.object(course_index, "corpus", return_value=book))
        self.enterContext(patch.object(course_index, "index", return_value=course_index.Index(book)))
        generate = self.enterContext(patch("app.generate", return_value={"answer": "A hint", "sources": []}))
        key, _ = app.course_reply("Just a hint for 12(c).", {"page": page, "view": section, "section": section})
        self.assertEqual(key, section)
        self.assertEqual(generate.call_args.args[5], "c")

    def test_a_later_request_can_change_the_amount_of_help(self):
        self.cloud.converse.return_value = {"stopReason": "end_turn", "output": {"message":
            {"content": [{"text": "A response grounded in the exercise. [1]"}]}}}
        history = [{"question": "Give me a hint.", "answer": "Look at the edges.", "section": "cube"}]
        cases = [("After your hint, show the full solution.", app.INSTRUCTIONS, "complete worked answer"),
                 ("I still don’t get it.", app.INSTRUCTIONS, "different representation"),
                 ("I got zero. Does that make the rate zero?", app.INSTRUCTIONS, "corrected value"),
                 ("Just a hint, without the full solution.", app.HINT_INSTRUCTIONS, "")]
        for question, expected, task in cases:
            with self.subTest(question=question):
                app.generate(question, "cube", ["cube"], history)
                call = self.cloud.converse.call_args.kwargs
                self.assertEqual(call["system"][0]["text"], expected)
                self.assertIn(task, json.loads(call["messages"][0]["content"][0]["text"]).get("task", ""))

    def test_explicit_multipart_walkthrough_reserves_its_actual_output_allowance(self):
        reserve = self.enterContext(patch("app.reserve_request", return_value="month"))
        book = {"ex": {"title": "Exercise 1", "text": "(a) Find the limit. (b) Justify it."}}
        self.cloud.converse.return_value = {"stopReason": "end_turn", "output": {"message":
            {"content": [{"text": "A worked answer. [1]"}]}}}
        for question, part, limit in (("Full solution please", "", app.MAX_WORKED_OUTPUT),
                                      ("Full solution for part (a)", "a", app.MAX_OUTPUT),
                                      ("Just a hint", "", app.MAX_OUTPUT)):
            app.generate(question, "ex", ["ex"], book=book, part=part)
            call = self.cloud.converse.call_args.kwargs
            self.assertEqual(call["inferenceConfig"]["maxTokens"], limit)
            size = sum(len(s.encode()) for s in (call["system"][0]["text"],
                       call["messages"][0]["content"][0]["text"]))
            reserve.assert_called_with(app.cost_bound(1024 + size, limit))

    def test_failure_and_unknown_context(self):
        self.cloud.converse.side_effect = RuntimeError("offline")
        self.assertEqual(self.ask("What does this mean?", section="unlisted")["statusCode"], 503)
        self.cloud.retrieve.assert_not_called()

    def test_real_chat_history_and_budget(self):
        old = {"question": "What is A?", "answer": "It is the area. [1]", "section": "rectangle"}
        self.cloud.converse.return_value = {"stopReason":"end_turn", "usage":{"inputTokens":230,"outputTokens":22},
            "output":{"message":{"content":[{"text":"The width multiplies the length rate. [1]"}]}}}
        data = {"mode":"conversation", "question":"A=LW", "history":[old], "section":"rectangle"}
        event = {"headers":{"X-Class-Code":"demo"}, "body":json.dumps(data)}
        result = json.loads(app.handler(event, None)["body"])
        self.assertEqual(result["section"], "rectangle")
        model = self.cloud.converse.call_args.kwargs
        prompt = json.loads(model["messages"][0]["content"][0]["text"])
        self.assertEqual(prompt["recent_exchange"], [old])
        self.assertEqual(model["inferenceConfig"]["maxTokens"], app.MAX_OUTPUT)
        reserve, settle = [c.kwargs for c in self.cloud.update_item.call_args_list]
        reserved = int(reserve["ExpressionAttributeValues"][":amount"]["N"])
        self.assertEqual(int(reserve["ExpressionAttributeValues"][":room"]["N"])+reserved,2_000_000)
        self.assertEqual(reserved+int(settle["ExpressionAttributeValues"][":refund"]["N"]),app.cost_bound(230,22))
        self.assertEqual(reserve["Key"],settle["Key"])
        self.assertLess(app.cost_bound(1,app.MAX_OUTPUT),reserved)
        self.cloud.reset_mock()
        bad = {**data, "history":[old]*4}
        self.assertEqual(app.handler({**event,"body":json.dumps(bad)},None)["statusCode"],400)
        self.cloud.converse.assert_not_called()
        self.cloud.update_item.assert_not_called()

    def test_feedback_requires_opt_in_and_auth(self):
        body = json.dumps({"share": False})
        event = {"routeKey": "POST /feedback", "headers": {"x-class-code": "demo"}, "body": body}
        self.assertEqual(app.handler(event, None)["statusCode"], 400)
        self.assertEqual(app.handler({**event, "headers": {}}, None)["statusCode"], 403)
        self.cloud.update_item.assert_not_called()
        self.cloud.converse.assert_not_called()

    def test_feedback_and_private_report(self):
        content = responses.exchange("Why negative?", "ladder", {"answer": "Height decreases [1].",
                                     "sources": [{"href": "lectures/related-rates.html#ladder"}]})
        token = responses.issue(self.cloud, content)
        ticket = self.cloud.put_item.call_args.kwargs["Item"]
        self.assertEqual(set(ticket), {"receipt", "digest", "expires_at"})
        self.assertLess(abs(int(ticket["expires_at"]["N"]) - time.time() - 7200), 3)
        payload = {"share": True, "receipt": token, "exchange": content, "rating": "stuck", "note": "<script>my work</script>"}
        self.assertEqual(responses.share(self.cloud, payload)[0], 200)
        write = self.cloud.update_item.call_args.kwargs
        values = write["ExpressionAttributeValues"]
        self.assertEqual(values[":original"], ticket["digest"])
        self.assertIn("expires_at > :now", write["ConditionExpression"])
        row = json.loads(values[":data"]["S"])
        overview = report([(int(time.time()), row)])
        self.assertIn("I’m still stuck: 1", overview)
        self.assertIn("Why negative?", overview)
        self.assertIn("&lt;script&gt;my work", overview)
        self.assertNotIn("<script>", overview)
        self.assertEqual(int(values[":expiry"]["N"]) - int(values[":now"]["N"]), 90 * 86400)
        class AlreadyUsed(Exception):
            response = {"Item": {"shared_digest": values[":sig"], "expires_at": values[":expiry"]}}
        self.cloud.exceptions.ConditionalCheckFailedException = AlreadyUsed
        self.cloud.update_item.side_effect = AlreadyUsed()
        self.assertEqual(responses.share(self.cloud, payload)[0], 200)
        self.assertEqual(responses.share(self.cloud, {**payload, "note": "changed"})[0], 409)
        self.assertEqual(responses.share(self.cloud, {**payload, "exchange": {**content, "question": "swapped"}})[0], 409)
        self.cloud.retrieve.assert_not_called()
        self.cloud.converse.assert_not_called()

    def test_book_integration(self):
        original = (ROOT / "_site" / app.PAGE).read_text()
        enabled = add_widget(original, "../", "https://example.org/ask", True)
        self.assertIn('data-course-ask defer src="../assets/ask-notes/widget.js', enabled)
        self.assertEqual(enabled, add_widget(enabled, "../", "https://example.org/ask", True))
        self.assertNotIn("data-course-ask", add_widget(enabled, "../", ""))
        self.assertIn("data-course-search", add_widget(enabled, "../", ""))
        for k, v in self.book.items():
            self.assertIn(f'id="{k}"', original)
            self.assertTrue(v["text"])
        self.assertIn("fixed hypotenuse", self.book["ladder"]["text"])
        self.assertIn(r"\frac{dx}{dt}", self.book["ladder"]["text"])

    def test_course_checks_are_free_and_tied_to_the_notes(self):
        self.assertEqual(set(practice.checks()), set(self.book))
        original = (ROOT / "_site" / app.PAGE).read_text()
        free = add_widget(original, "../", "", with_practice=True)
        self.assertIn("assets/ask-notes/practice.js", free)
        self.assertNotIn("assets/ask-notes/widget.js", free)
        self.assertEqual(add_widget(free, "../", "", with_practice=True), free)
        for check in practice.checks().values():
            self.assertEqual(len(check["choices"]), 3)
            self.assertTrue(all(check["feedback"]))
            self.assertTrue(check["hint"])

    def test_public_suggested_answers_and_sources(self):
        from html.parser import HTMLParser

        class StepCounter(HTMLParser):
            def __init__(self):
                super().__init__()
                self.ancestors = []
                self.counts = {}

            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if tag == "section":
                    self.ancestors.append(attrs.get("id"))
                if self.ancestors and "rr-step-label" in attrs.get("class", "").split():
                    key = self.ancestors[-1]
                    self.counts[key] = self.counts.get(key, 0) + 1

            def handle_endtag(self, tag):
                if tag == "section" and self.ancestors:
                    self.ancestors.pop()

        anchors = StepCounter()
        anchors.feed((ROOT / "_site" / app.PAGE).read_text())
        catalog_line = next(line for line in practice.browser_script().splitlines() if "const checks =" in line)
        catalog = json.loads(catalog_line.split(" = ", 1)[1].removesuffix(";"))
        for key, item in catalog.items():
            with self.subTest(section=key):
                help_item = item["help"]
                self.assertRegex(help_item["question"].lower(), help_item["match"])
                self.assertNotRegex("what is the capital of france?", help_item["match"])
                self.assertIn("<math", item["answerHtml"])
                self.assertIn("<annotation", item["answerHtml"])
                self.assertLessEqual(help_item["step"], anchors.counts.get(key, 0))

    def test_every_suggestion_has_its_own_grounded_answer(self):
        for key, item in practice.checks().items():
            suggestions = [item["help"], *[a for a in item.get("answers", []) if "question" in a]]
            self.assertGreaterEqual(len(suggestions), 2)
            for answer in suggestions:
                with self.subTest(section=key, question=answer["question"]):
                    target, result = app.route_question(answer["question"], key)
                    self.assertEqual(target, key)
                    self.assertIn(answer.get("text") or answer["explanation"], result["answer"])
                    self.assertTrue(result["sources"][0]["href"].endswith("#" + key))

    def test_students_can_check_a_line_of_work(self):
        for section, question, phrase in [
            ("ladder", "In example 6 I wrote r/h = 6/2. Is my proportion right?", "18-m radius"),
            ("cone", "So r/h=2/6?", "equivalently"),
            ("cone", "dh/dt?", "meters per minute"),
            ("cone", "Is h/r = 6/2 right?", "equivalently"),
            ("ladder", "For part (a), I got +1.5 ft/s. Is my sign right?", "height falls"),
            ("rectangle", "Why are there two terms in the area rate?", "strip"),
            ("shadow", "I got 1 m/s for the shadow. Is that the tip?", "moving person"),
        ]:
            with self.subTest(question=question):
                result = json.loads(self.ask(question, section=section)["body"])
                self.assertIn(phrase, result["answer"])
        self.cloud.converse.assert_not_called()
        self.cloud.update_item.assert_not_called()

    def test_aws_deploy_defaults_to_free(self):
        cmd = [sys.executable, str(ROOT / "ask-notes/deploy.py"), "--prepared"]
        free = subprocess.run(cmd, capture_output=True, text=True)
        self.assertEqual(free.returncode, 0)
        self.assertIn("No AWS resources created", free.stderr)
    def test_truncated_clarification(self):
        self.cloud.converse.return_value = {"stopReason": "max_tokens", "output": {"message":
            {"content": [{"text": "CLARIFY"}]}}}
        self.assertEqual(app.generate("Which rate?", "", ["ladder"])["answer"], app.NO_EVIDENCE)

    def test_practice_sharing_and_retry(self):
        ladder = practice.checks()["ladder"]
        payload = {"kind": "practice", "share": True, "section": "ladder", "choice": 1,
                   "version": ladder["version"], "note": "I picked the foot.", "attempt": "10d4e598-4bdf-4554-ae6b-04bdaff938de"}
        def submit(data, code="demo"):
            return app.handler({"routeKey": "POST /feedback", "headers": {"X-Class-Code": code},
                                "body": json.dumps(data)}, None)["statusCode"]
        self.assertEqual(submit(payload, "bad"), 403)
        self.assertEqual(submit({**payload, "share": False}), 400)
        self.assertEqual(submit({**payload, "choice": -1}), 400)
        self.assertEqual(submit({**payload, "choice": True}), 400)
        self.assertEqual(submit({**payload, "version": "old"}), 409)
        self.cloud.put_item.assert_not_called()
        self.assertEqual(submit({**payload, "correct": True}), 200)
        item = self.cloud.put_item.call_args.kwargs["Item"]
        row = json.loads(item["response_json"]["S"])
        self.assertFalse(row["correct"])
        self.assertEqual(row["first_choice"], ladder["choices"][1])
        self.assertEqual(int(item["expires_at"]["N"]) - int(item["shared_at"]["N"]), 90 * 86400)
        self.assertIn("I picked the foot.", report([(int(time.time()), row)]))
        class AlreadyShared(Exception):
            response = {"Item": item}
        self.cloud.exceptions.ConditionalCheckFailedException = AlreadyShared
        self.cloud.put_item.side_effect = AlreadyShared()
        self.assertEqual(submit(payload), 200)
        self.assertEqual(submit({**payload, "choice": 0}), 409)
        self.cloud.update_item.assert_not_called()
        self.cloud.retrieve.assert_not_called()
        self.cloud.converse.assert_not_called()


if __name__ == "__main__":
    unittest.main()
