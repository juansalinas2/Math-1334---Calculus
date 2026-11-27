"""Free regression gate on the frozen course snapshot."""
import unittest
from types import SimpleNamespace
from unittest.mock import patch
import json
import re
import app
from benchmark.run import APP, read_corpus, run_score
from course_index import Index, problem_reference, requested_part


class CourseBenchmark(unittest.TestCase):
    def test_same_help_request_follows_the_open_page(self):
        book = read_corpus()
        index = Index(book)
        for page, anchor in (("exam-3-review", "optimization-folding-a-box"),
                             ("exam-2-review", "implicit-differentiation"),
                             ("08-exam-practice", "problem-8")):
            page = "lectures/" + page + ".html"
            for question in ("Help with problem 8", "Can you help me on 8?", "Help on eight",
                             "How do I start 8?", "Can we try 8?", "8"):
                with self.subTest(page=page, question=question):
                    self.assertEqual(index.search(question, page, page), ([page + "#" + anchor], ""))
        page = "lectures/exam-3-review.html"
        current = page + "#products-and-powers"
        self.assertEqual(index.search("Help me on 8 in Exam 2 review", page, current),
                         (["lectures/exam-2-review.html#implicit-differentiation"], ""))
        self.assertEqual(index.search("8", page, current, followup=True), ([current], ""))
        for math in ("I got 8", "help with 8 + 2", "help with 8 cm", "help with 8.5"):
            self.assertIsNone(problem_reference(math, first_turn=True))
        missing = "lectures/related-rates.html"
        keys, message = index.search("Can you help me on 8?", missing, missing)
        self.assertFalse(keys)
        self.assertIn(book[missing]["title"], message)

    def test_visible_exercise_and_fallback_survive_old_conversation(self):
        book = read_corpus()
        index = Index(book)
        self.enterContext(patch("course_index.corpus", return_value=book))
        self.enterContext(patch("course_index.index", return_value=index))
        generate = self.enterContext(patch("app.generate", return_value={"answer":app.NO_EVIDENCE, "sources":[]}))
        page = "lectures/exam-3-review.html"
        box = page + "#optimization-folding-a-box"
        old = page + "#products-and-powers"
        data = {"page":page, "section":box, "history":[{"question":"Help with 12(a)", "answer":"Use a limit.", "section":old}]}
        section, _ = app.course_reply("How do I start this problem?", data)
        self.assertEqual(section, box)
        self.assertEqual(generate.call_args.args[3], [])
        self.assertEqual(generate.call_args.kwargs["open_reading"], {"page":"Exam 3 review", "heading":book[box]["title"]})
        data["section"] = page
        for unavailable in (app.NO_EVIDENCE, app.ASK_FOR_EXAMPLE):
            generate.return_value = {"answer":unavailable, "sources":[]}
            section, result = app.course_reply("Can you help me on 8?", data)
            self.assertEqual(section, box)
            self.assertTrue(generate.call_args.kwargs["starter"])
            self.assertEqual(generate.call_args.args[5], "a")
            self.assertIn("folding a box", result["answer"])
            self.assertEqual(result["sources"][0]["href"], box)
        app.course_reply("Show the full solution for problem 8", data)
        self.assertFalse(generate.call_args.kwargs["starter"])

    def test_numbered_reviews_use_the_open_page(self):
        book = read_corpus()
        index = Index(book)
        exam3 = "lectures/exam-3-review.html"
        exam2 = "lectures/exam-2-review.html"
        implicit = "lectures/16-implicit-differentiation.html"
        for question in ("help with 12 a", "12a", "12(a)", "#12a", "Problem 12 a", "Exercise 12(a)",
                         "I’m stuck on 12", "Can you help with 12a please?"):
            with self.subTest(question=question):
                self.assertEqual(index.search(question, exam3, exam3), ([exam3 + "#products-and-powers"], ""))
        for page, anchor in ((exam2, "differentiation"), (exam3, "related-rates-a-sliding-ladder")):
            self.assertEqual(index.search("problem 4", page, page), ([page + "#" + anchor], ""))
        for page in (exam2, exam3):
            for key, row in book.items():
                if key.startswith(page + "#"):
                    number = row["title"].split(".")[0]
                    for part in ["", *re.findall(r"(?<!\S)\(([a-z])\)(?=\s)", row["text"])]:
                        question = f"help with {number} {part}".strip()
                        self.assertEqual(index.search(question, page, page), ([key], ""), question)
        for page in (exam2, implicit):
            hits, message = index.search("help with 12 a", page, page)
            self.assertEqual(hits, [])
            self.assertIn(book[page]["title"], message)
        hits, message = index.search("12(z)", exam3, exam3)
        self.assertEqual(hits, [])
        self.assertIn("(a), (b), (c)", message)
        for question in ("I got 12", "is 12 a critical number?", "why is 12a + 1 positive?",
                         "12 cm", "help with 12.5", "when is x equal to 12?"):
            self.assertIsNone(problem_reference(question), question)

    def test_exam_reference_reaches_the_model_and_citation(self):
        book = read_corpus()
        review = "lectures/exam-3-review.html"
        problem = review + "#products-and-powers"
        previous = "lectures/16-implicit-differentiation.html#practice-the-curve-x2-xyy212"
        self.enterContext(patch("course_index.corpus", return_value=book))
        self.enterContext(patch("course_index.index", return_value=Index(book)))
        self.enterContext(patch("app.reserve_request", return_value="test"))
        self.enterContext(patch("app.settle_request"))
        cloud = self.enterContext(patch("app.client")).return_value
        cloud.converse.return_value = {"stopReason": "end_turn", "output": {"message": {
            "content": [{"text": "Rewrite the product as a quotient. [1]"}]}}}
        payload = {"page": review, "section": review + "#compare-the-tests",
                   "history": [{"section": previous, "question": "Earlier question", "answer": "Earlier reply"}]}
        section, reply = app.course_reply("help with 12 a", payload)
        self.assertEqual(section, problem)
        self.assertEqual([s["href"] for s in reply["sources"]], [problem])
        def prompt():
            return json.loads(cloud.converse.call_args.kwargs["messages"][0]["content"][0]["text"])
        self.assertEqual(prompt()["recent_exchange"], [])
        self.assertIn(r"x\ln", prompt()["requested_part"])
        self.assertNotIn("(b)", prompt()["requested_part"])
        payload["history"] = [{"section": section, "question": "help with 12 a", "answer": reply["answer"]}]
        for question in ("What about b?", "What about (b)? Give me just one hint.",
                         "(b), please show the computation.", "Can I get a hint for (b)?"):
            with self.subTest(question=question):
                section, reply = app.course_reply(question, payload)
                self.assertEqual(section, problem)
                self.assertEqual(reply["sources"][0]["href"], problem)
                self.assertIn(r"\cos x", prompt()["requested_part"])
                self.assertIn("Practice 3", prompt()["passages"][1]["title"])
                self.assertIn(r"0^+", prompt()["passages"][1]["text"])
                self.assertIn(r"\to0}", prompt()["requested_part"])
                self.assertEqual(prompt()["recent_exchange"], payload["history"])
        for question in ("What about a tangent line?", "What about (x) + 1?", "a = 5"):
            self.assertEqual(requested_part(question, None), "")
        cloud.converse.reset_mock()
        _, reply = app.course_reply("help with 15 a", payload)
        self.assertEqual(reply["sources"], [])
        cloud.converse.assert_not_called()

    def test_release_floor(self):
        result = run_score(SimpleNamespace(split="test", retriever=APP / "course_index.py"))
        metrics = result["metrics"]
        self.assertEqual((metrics["answerable"], metrics["must_clarify"]), (29, 6))
        self.assertGreaterEqual(metrics["hit1"], 25, "Inspect the first-ranked passage for each changed case.")
        self.assertGreaterEqual(metrics["hit2"], 25, "Inspect the top two passages for each changed case.")
        self.assertEqual(metrics["clarified"], 6, "A clarification now returns an unrelated passage.")

    def test_followup_competes_with_cross_lecture_search(self):
        index = Index(read_corpus())
        page = "lectures/optimization.html"
        box = page + "#optimization-problems::1"
        keys, _ = index.search("Why do two cuts come off each side?", page, box, followup=True)
        self.assertEqual(keys[0], box)
        keys, _ = index.search("Different topic: what does the IVT guarantee?", page, box, followup=True)
        self.assertNotEqual(keys[0], box)
        self.assertIn("intermediate-value", keys[0])
