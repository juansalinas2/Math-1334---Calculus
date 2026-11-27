"""Verify page-local routing against the rendered book and realistic conversations."""
import unittest
from unittest.mock import patch

import app
from course_index import Index
from export import ROOT, course_passages


class PageContext(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.book = course_passages(ROOT / "_site")
        cls.index = Index(cls.book)

    def setUp(self):
        self.enterContext(patch("course_index.corpus", return_value=self.book))
        self.enterContext(patch("course_index.index", return_value=self.index))
        self.model = self.enterContext(patch("app.generate", return_value={"answer": "Test hint", "sources": []}))

    def test_numbered_exercises_and_ambiguities_across_the_book(self):
        for (page, number), entries in self.index.numbered.items():
            with self.subTest(page=page, number=number):
                hits, message = self.index.search(f"Help with problem {number}", page, page)
                if len(entries) == 1:
                    self.assertEqual(hits, [entries[0][1]])
                    self.assertTrue(self.book[hits[0]]["text"].strip())
                else:
                    self.assertFalse(hits)
                    self.assertIn(self.book[page]["title"], message)
        for page in (k for k in self.book if "#" not in k):
            hits, message = self.index.search("Help with problem 99999", page, page)
            self.assertFalse(hits)
            self.assertIn(self.book[page]["title"], message)
        page = "lectures/lhopitals-rule.html"
        for number in (9, 10, 11):
            hits, _ = self.index.search(f"example {number}", page, page)
            self.assertEqual(len(hits), 1)
            self.assertTrue(self.book[hits[0]]["text"].startswith(f"Example {number} ("))
            self.assertNotIn(f"Example {number + 1} ", self.book[hits[0]]["text"])

    def test_visible_reading_and_previous_answer_are_independent(self):
        page = "lectures/exam-3-review.html"
        box = page + "#optimization-folding-a-box"
        limits = page + "#products-and-powers"
        old = {"question": "Help with problem 8", "answer": "Find the box dimensions.", "section": box}
        request = {"page": page, "section": limits, "view": limits, "previousView": box, "history": [old]}
        for question in ("How do I get started?", "What about (b)?", "Help with this one"):
            key, _ = app.course_reply(question, request)
            self.assertEqual(key, limits)
            self.assertEqual(self.model.call_args.args[3], [])
        key, _ = app.course_reply("What about (b)?", dict(request, previousView=limits))
        self.assertEqual(key, box)
        self.assertEqual(self.model.call_args.args[3], [old])
        key, _ = app.course_reply("Why did you use that in your previous answer?", request)
        self.assertEqual(key, box)
        key, _ = app.course_reply("Help with problem 8", dict(request, section=box))
        self.assertEqual(key, box)
        self.assertEqual(self.model.call_args.kwargs["open_reading"]["heading"], self.book[limits]["title"])
        key, _ = app.course_reply("What about (b)?", dict(request, view=box, previousView=box, section=box))
        self.assertEqual(key, box)

    def test_location_comes_from_the_validated_page_without_inference(self):
        page = "lectures/exam-3-review.html"
        box = page + "#optimization-folding-a-box"
        foreign = "lectures/exam-2-review.html#implicit-differentiation"
        for data, expected in (({"view": box, "section": foreign}, box),
                               ({"view": foreign, "section": foreign}, page),
                               ({"section": box}, box)):
            key, result = app.course_reply("What page am I on?", dict(data, page=page))
            self.assertEqual(key, expected)
            self.assertEqual(result["sources"][0]["href"], expected)
            self.assertIn("Exam 3 review", result["answer"])
        key, result = app.course_reply("How do I get started?", {"page": page, "section": page})
        self.assertEqual(key, page)
        self.assertFalse(result["sources"])
        self.assertIn("Exam 3 review", result["answer"])
        self.model.assert_not_called()
